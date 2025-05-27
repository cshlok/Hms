/**
 * Blood Bank Inventory API
 * 
 * This file implements the API endpoints for managing blood bank inventory,
 * including enhanced filtering, pagination, and comprehensive inventory details.
 * 
 * FHIR Compliance: Uses BiologicallyDerivedProduct resource for blood products
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { logAuditEvent } from '@/lib/audit';
import { hasPermission } from '@/lib/permissions';
import { encryptSensitiveData } from '@/lib/encryption';

// Validation schema for query parameters
const querySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  productType: z.string().optional(),
  bloodGroup: z.string().optional(),
  status: z.string().optional(),
  expirationBefore: z.string().optional().transform(val => val ? new Date(val) : undefined),
  expirationAfter: z.string().optional().transform(val => val ? new Date(val) : undefined),
  location: z.string().optional(),
  isIrradiated: z.string().optional().transform(val => val === 'true'),
  isLeukoreduced: z.string().optional().transform(val => val === 'true'),
  isCMVNegative: z.string().optional().transform(val => val === 'true'),
  searchTerm: z.string().optional(),
});

/**
 * GET /api/bloodbank/inventory
 * 
 * Retrieves a paginated list of blood inventory items with enhanced filtering options.
 * 
 * @param request - The incoming request object
 * @returns A paginated list of blood inventory items
 */
export async function GET(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'BLOODBANK_VIEW_INVENTORY')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryResult = querySchema.safeParse(Object.fromEntries(url.searchParams));
    
    if (!queryResult.success) {
      return NextResponse.json({ error: 'Invalid query parameters', details: queryResult.error.format() }, { status: 400 });
    }
    
    const { 
      page, limit, productType, bloodGroup, status, 
      expirationBefore, expirationAfter, location,
      isIrradiated, isLeukoreduced, isCMVNegative, searchTerm 
    } = queryResult.data;
    
    // Build filter conditions
    const where: any = {};
    
    if (productType) {
      where.productType = productType;
    }
    
    if (bloodGroup) {
      where.bloodGroup = bloodGroup;
    }
    
    if (status) {
      where.status = status;
    }
    
    if (location) {
      where.location = location;
    }
    
    if (isIrradiated !== undefined) {
      where.isIrradiated = isIrradiated;
    }
    
    if (isLeukoreduced !== undefined) {
      where.isLeukoreduced = isLeukoreduced;
    }
    
    if (isCMVNegative !== undefined) {
      where.isCMVNegative = isCMVNegative;
    }
    
    if (expirationBefore || expirationAfter) {
      where.expirationDate = {};
      if (expirationBefore) {
        where.expirationDate.lte = expirationBefore;
      }
      if (expirationAfter) {
        where.expirationDate.gte = expirationAfter;
      }
    }
    
    if (searchTerm) {
      where.OR = [
        { productId: { contains: searchTerm, mode: 'insensitive' } },
        { location: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Execute query with pagination and filtering
    const [inventory, total] = await Promise.all([
      prisma.bloodInventory.findMany({
        where,
        include: {
          collection: {
            include: {
              donor: {
                select: {
                  id: true,
                  donorNumber: true,
                  bloodGroup: true,
                },
              },
            },
          },
        },
        orderBy: [
          { expirationDate: 'asc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.bloodInventory.count({ where }),
    ]);
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'BLOODBANK_INVENTORY_LIST_VIEW',
      'BloodInventory',
      null,
      { 
        filters: { 
          productType, bloodGroup, status, expirationBefore, 
          expirationAfter, location, isIrradiated, isLeukoreduced, 
          isCMVNegative, searchTerm 
        }, 
        page, 
        limit 
      }
    );
    
    // Return paginated results
    return NextResponse.json({
      data: inventory,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching blood inventory:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Validation schema for creating a new blood inventory item
const createInventorySchema = z.object({
  productId: z.string(),
  productType: z.string(),
  bloodGroup: z.string(),
  collectionId: z.string().uuid().optional(),
  volume: z.number().positive(),
  expirationDate: z.string().transform(val => new Date(val)),
  status: z.string().default('Available'),
  location: z.string(),
  temperature: z.number().optional(),
  isIrradiated: z.boolean().optional().default(false),
  isLeukoreduced: z.boolean().optional().default(false),
  isCMVNegative: z.boolean().optional().default(false),
  specialNotes: z.string().optional(),
});

/**
 * POST /api/bloodbank/inventory
 * 
 * Creates a new blood inventory item.
 * 
 * @param request - The incoming request object
 * @returns The newly created blood inventory item
 */
export async function POST(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'BLOODBANK_CREATE_INVENTORY')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = createInventorySchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data', details: validationResult.error.format() }, { status: 400 });
    }
    
    const inventoryData = validationResult.data;
    
    // Check if product ID already exists
    const existingProduct = await prisma.bloodInventory.findUnique({
      where: { productId: inventoryData.productId },
    });
    
    if (existingProduct) {
      return NextResponse.json({ error: 'Product ID already exists' }, { status: 409 });
    }
    
    // Encrypt sensitive data if needed
    const encryptedData = await encryptSensitiveData(inventoryData);
    
    // Create the blood inventory item
    const inventoryItem = await prisma.bloodInventory.create({
      data: encryptedData,
      include: {
        collection: {
          include: {
            donor: {
              select: {
                id: true,
                donorNumber: true,
                bloodGroup: true,
              },
            },
          },
        },
      },
    });
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'BLOODBANK_INVENTORY_CREATE',
      'BloodInventory',
      inventoryItem.id,
      { 
        productId: inventoryItem.productId,
        productType: inventoryItem.productType,
        bloodGroup: inventoryItem.bloodGroup,
        expirationDate: inventoryItem.expirationDate,
      }
    );
    
    return NextResponse.json(inventoryItem, { status: 201 });
  } catch (error) {
    console.error('Error creating blood inventory item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/bloodbank/inventory/stats
 * 
 * Retrieves statistics about the blood inventory.
 * 
 * @param request - The incoming request object
 * @returns Statistics about the blood inventory
 */
export async function GET_stats(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'BLOODBANK_VIEW_INVENTORY')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get blood group counts
    const bloodGroupCounts = await prisma.bloodInventory.groupBy({
      by: ['bloodGroup', 'status'],
      _count: {
        id: true,
      },
    });

    // Get product type counts
    const productTypeCounts = await prisma.bloodInventory.groupBy({
      by: ['productType', 'status'],
      _count: {
        id: true,
      },
    });

    // Get expiring soon counts (within 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const expiringSoonCount = await prisma.bloodInventory.count({
      where: {
        expirationDate: {
          lte: sevenDaysFromNow,
          gt: new Date(),
        },
        status: 'Available',
      },
    });

    // Get expired counts
    const expiredCount = await prisma.bloodInventory.count({
      where: {
        expirationDate: {
          lt: new Date(),
        },
        status: {
          not: 'Discarded',
        },
      },
    });

    // Format the results
    const bloodGroupStats = bloodGroupCounts.reduce((acc: any, item) => {
      if (!acc[item.bloodGroup]) {
        acc[item.bloodGroup] = {};
      }
      acc[item.bloodGroup][item.status] = item._count.id;
      return acc;
    }, {});

    const productTypeStats = productTypeCounts.reduce((acc: any, item) => {
      if (!acc[item.productType]) {
        acc[item.productType] = {};
      }
      acc[item.productType][item.status] = item._count.id;
      return acc;
    }, {});

    // Log audit event
    await logAuditEvent(
      session.user.id,
      'BLOODBANK_INVENTORY_STATS_VIEW',
      'BloodInventory',
      null,
      {}
    );

    return NextResponse.json({
      bloodGroupStats,
      productTypeStats,
      expiringSoon: expiringSoonCount,
      expired: expiredCount,
    });
  } catch (error) {
    console.error('Error fetching blood inventory statistics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/bloodbank/inventory/forecast
 * 
 * Retrieves a forecast of blood inventory needs based on historical usage.
 * 
 * @param request - The incoming request object
 * @returns Forecast of blood inventory needs
 */
export async function GET_forecast(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'BLOODBANK_VIEW_FORECAST')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current inventory levels
    const currentInventory = await prisma.bloodInventory.groupBy({
      by: ['bloodGroup', 'productType'],
      where: {
        status: 'Available',
        expirationDate: {
          gt: new Date(),
        },
      },
      _count: {
        id: true,
      },
    });

    // Get historical usage (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const historicalUsage = await prisma.bloodIssue.groupBy({
      by: ['product.bloodGroup', 'product.productType'],
      where: {
        issuedAt: {
          gte: thirtyDaysAgo,
        },
      },
      _count: {
        id: true,
      },
    });

    // Calculate daily usage rate and days of supply remaining
    const forecast = currentInventory.map(item => {
      const usage = historicalUsage.find(
        u => u.product.bloodGroup === item.bloodGroup && u.product.productType === item.productType
      );
      
      const dailyUsage = usage ? usage._count.id / 30 : 0;
      const daysRemaining = dailyUsage > 0 ? item._count.id / dailyUsage : null;
      
      return {
        bloodGroup: item.bloodGroup,
        productType: item.productType,
        currentStock: item._count.id,
        dailyUsage: parseFloat(dailyUsage.toFixed(2)),
        daysRemaining: daysRemaining ? parseFloat(daysRemaining.toFixed(1)) : 'N/A',
        status: daysRemaining === null ? 'Unknown' : 
                daysRemaining < 3 ? 'Critical' :
                daysRemaining < 7 ? 'Low' : 'Adequate',
      };
    });

    // Log audit event
    await logAuditEvent(
      session.user.id,
      'BLOODBANK_INVENTORY_FORECAST_VIEW',
      'BloodInventory',
      null,
      {}
    );

    return NextResponse.json({
      forecast,
      generatedAt: new Date(),
      forecastPeriod: '30 days',
    });
  } catch (error) {
    console.error('Error generating blood inventory forecast:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
