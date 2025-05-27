/**
 * Operation Theatre Resource Tracking API
 * 
 * This file implements the API endpoints for tracking equipment, instruments, and implants
 * used in surgical procedures, ensuring accurate inventory management and traceability.
 * 
 * FHIR Compliance: Uses Device and DeviceUseStatement resources for resource tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { logAuditEvent } from '@/lib/audit';
import { hasPermission } from '@/lib/permissions';
import { scanBarcodeData } from '@/lib/ot/barcode-scanner';

// Validation schema for tracking resource usage
const resourceUsageSchema = z.object({
  scheduleId: z.string().uuid(),
  resources: z.array(z.object({
    resourceId: z.string().uuid(),
    resourceType: z.enum(['Equipment', 'Instrument', 'Implant']),
    quantity: z.number().int().positive(),
    serialNumber: z.string().optional(),
    lotNumber: z.string().optional(),
    expiryDate: z.string().transform(val => new Date(val)).optional(),
    notes: z.string().optional(),
  })),
  recordedById: z.string().uuid().optional(),
});

/**
 * POST /api/ot/resource-tracking
 * 
 * Records the usage of resources (equipment, instruments, implants) in a surgical procedure.
 * 
 * @param request - The incoming request object
 * @returns The resource usage records
 */
export async function POST(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'OT_TRACK_RESOURCES')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = resourceUsageSchema.safeParse({
      ...body,
      recordedById: body.recordedById || session.user.id,
    });
    
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data', details: validationResult.error.format() }, { status: 400 });
    }
    
    const usageData = validationResult.data;
    
    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Check if the schedule exists
      const schedule = await tx.otSchedule.findUnique({
        where: { id: usageData.scheduleId },
        include: {
          patient: true,
          surgeryType: true,
        },
      });
      
      if (!schedule) {
        throw new Error('Schedule not found');
      }
      
      // Record each resource usage
      const usageRecords = [];
      
      for (const resource of usageData.resources) {
        // Check if the resource exists
        const resourceItem = await tx.otResource.findUnique({
          where: { id: resource.resourceId },
        });
        
        if (!resourceItem) {
          throw new Error(`Resource with ID ${resource.resourceId} not found`);
        }
        
        // For implants, check if they're available and not expired
        if (resource.resourceType === 'Implant') {
          if (resourceItem.currentStock < resource.quantity) {
            throw new Error(`Insufficient stock for implant ${resourceItem.name}`);
          }
          
          if (resource.expiryDate && resource.expiryDate < new Date()) {
            throw new Error(`Implant ${resourceItem.name} has expired`);
          }
          
          // Update implant stock
          await tx.otResource.update({
            where: { id: resource.resourceId },
            data: {
              currentStock: {
                decrement: resource.quantity,
              },
            },
          });
        }
        
        // Create usage record
        const usageRecord = await tx.resourceUsage.create({
          data: {
            scheduleId: usageData.scheduleId,
            resourceId: resource.resourceId,
            resourceType: resource.resourceType,
            quantity: resource.quantity,
            serialNumber: resource.serialNumber,
            lotNumber: resource.lotNumber,
            expiryDate: resource.expiryDate,
            notes: resource.notes,
            recordedById: usageData.recordedById,
          },
          include: {
            resource: true,
            recordedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
        
        usageRecords.push(usageRecord);
        
        // For implants, create patient implant record for traceability
        if (resource.resourceType === 'Implant') {
          await tx.patientImplant.create({
            data: {
              patientId: schedule.patientId,
              implantId: resource.resourceId,
              implantDate: new Date(),
              surgeryId: usageData.scheduleId,
              serialNumber: resource.serialNumber,
              lotNumber: resource.lotNumber,
              expiryDate: resource.expiryDate,
              notes: resource.notes,
              recordedById: usageData.recordedById,
            },
          });
        }
      }
      
      return usageRecords;
    });
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'OT_RESOURCE_USAGE_RECORD',
      'ResourceUsage',
      null,
      { 
        scheduleId: usageData.scheduleId,
        resourceCount: usageData.resources.length,
      }
    );
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error recording resource usage:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/ot/resource-tracking/[scheduleId]
 * 
 * Retrieves all resources used in a specific surgical procedure.
 * 
 * @param request - The incoming request object
 * @param params - The route parameters containing the schedule ID
 * @returns List of resources used in the surgical procedure
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { scheduleId: string } }
) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'OT_VIEW_RESOURCE_USAGE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { scheduleId } = params;
    
    // Check if the schedule exists
    const schedule = await prisma.otSchedule.findUnique({
      where: { id: scheduleId },
    });
    
    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }
    
    // Fetch all resources used in the procedure
    const resourceUsage = await prisma.resourceUsage.findMany({
      where: { scheduleId },
      include: {
        resource: true,
        recordedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    
    // Group resources by type
    const groupedResources = {
      Equipment: resourceUsage.filter(r => r.resourceType === 'Equipment'),
      Instruments: resourceUsage.filter(r => r.resourceType === 'Instrument'),
      Implants: resourceUsage.filter(r => r.resourceType === 'Implant'),
    };
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'OT_RESOURCE_USAGE_VIEW',
      'OtSchedule',
      scheduleId,
      { scheduleId }
    );
    
    return NextResponse.json(groupedResources);
  } catch (error) {
    console.error('Error fetching resource usage:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/ot/resource-tracking/scan
 * 
 * Processes a barcode scan for resource tracking.
 * 
 * @param request - The incoming request object
 * @returns The resource information from the barcode
 */
export async function POST_scan(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'OT_SCAN_RESOURCES')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const body = await request.json();
    const { barcodeData } = body;
    
    if (!barcodeData) {
      return NextResponse.json({ error: 'Barcode data is required' }, { status: 400 });
    }
    
    // Process the barcode data
    const resourceData = await scanBarcodeData(barcodeData);
    
    if (!resourceData) {
      return NextResponse.json({ error: 'Invalid barcode format or resource not found' }, { status: 400 });
    }
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'OT_RESOURCE_BARCODE_SCAN',
      'OtResource',
      resourceData.id,
      { resourceId: resourceData.id }
    );
    
    return NextResponse.json(resourceData);
  } catch (error) {
    console.error('Error processing barcode scan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/ot/resource-tracking/inventory
 * 
 * Retrieves the current inventory of resources.
 * 
 * @param request - The incoming request object
 * @returns List of resources in inventory
 */
export async function GET_inventory(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'OT_VIEW_INVENTORY')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse query parameters
    const url = new URL(request.url);
    const resourceType = url.searchParams.get('type');
    const lowStock = url.searchParams.get('lowStock') === 'true';
    const searchTerm = url.searchParams.get('search');
    
    // Build filter conditions
    const where: any = {};
    
    if (resourceType) {
      where.resourceType = resourceType;
    }
    
    if (lowStock) {
      where.currentStock = {
        lte: prisma.otResource.fields.minStockLevel,
      };
    }
    
    if (searchTerm) {
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { manufacturer: { contains: searchTerm, mode: 'insensitive' } },
        { catalogNumber: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }
    
    // Fetch inventory
    const inventory = await prisma.otResource.findMany({
      where,
      orderBy: [
        { resourceType: 'asc' },
        { name: 'asc' },
      ],
    });
    
    // Group by resource type
    const groupedInventory = {
      Equipment: inventory.filter(r => r.resourceType === 'Equipment'),
      Instruments: inventory.filter(r => r.resourceType === 'Instrument'),
      Implants: inventory.filter(r => r.resourceType === 'Implant'),
    };
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'OT_INVENTORY_VIEW',
      'OtResource',
      null,
      { filters: { resourceType, lowStock, searchTerm } }
    );
    
    return NextResponse.json(groupedInventory);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/ot/resource-tracking/implant/[patientId]
 * 
 * Retrieves all implants for a specific patient.
 * 
 * @param request - The incoming request object
 * @param params - The route parameters containing the patient ID
 * @returns List of implants for the patient
 */
export async function GET_patient_implants(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'OT_VIEW_PATIENT_IMPLANTS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { patientId } = params;
    
    // Check if the patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });
    
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    
    // Fetch all implants for the patient
    const implants = await prisma.patientImplant.findMany({
      where: { patientId },
      include: {
        implant: true,
        surgery: {
          select: {
            id: true,
            surgeryType: true,
            scheduledStart: true,
          },
        },
        recordedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        implantDate: 'desc',
      },
    });
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'OT_PATIENT_IMPLANTS_VIEW',
      'Patient',
      patientId,
      { patientId }
    );
    
    return NextResponse.json(implants);
  } catch (error) {
    console.error('Error fetching patient implants:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/ot/resource-tracking/usage-report
 * 
 * Generates a report of resource usage over a specified period.
 * 
 * @param request - The incoming request object
 * @returns Resource usage report
 */
export async function GET_usage_report(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'OT_VIEW_USAGE_REPORTS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse query parameters
    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate') ? new Date(url.searchParams.get('startDate')) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
    const endDate = url.searchParams.get('endDate') ? new Date(url.searchParams.get('endDate')) : new Date();
    const resourceType = url.searchParams.get('type');
    
    // Build filter conditions
    const where: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };
    
    if (resourceType) {
      where.resourceType = resourceType;
    }
    
    // Fetch usage data
    const usageData = await prisma.resourceUsage.findMany({
      where,
      include: {
        resource: true,
        schedule: {
          select: {
            id: true,
            surgeryType: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    // Aggregate usage by resource
    const resourceUsageSummary = usageData.reduce((acc, usage) => {
      const resourceId = usage.resourceId;
      
      if (!acc[resourceId]) {
        acc[resourceId] = {
          resource: usage.resource,
          totalUsage: 0,
          surgeryTypes: {},
        };
      }
      
      acc[resourceId].totalUsage += usage.quantity;
      
      const surgeryTypeId = usage.schedule.surgeryType.id;
      const surgeryTypeName = usage.schedule.surgeryType.name;
      
      if (!acc[resourceId].surgeryTypes[surgeryTypeId]) {
        acc[resourceId].surgeryTypes[surgeryTypeId] = {
          name: surgeryTypeName,
          count: 0,
        };
      }
      
      acc[resourceId].surgeryTypes[surgeryTypeId].count += usage.quantity;
      
      return acc;
    }, {});
    
    // Convert to array and sort by usage
    const sortedUsageSummary = Object.values(resourceUsageSummary).sort((a, b) => b.totalUsage - a.totalUsage);
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'OT_USAGE_REPORT_VIEW',
      'ResourceUsage',
      null,
      { dateRange: { startDate, endDate }, resourceType }
    );
    
    return NextResponse.json({
      period: {
        startDate,
        endDate,
      },
      resourceType: resourceType || 'All',
      totalRecords: usageData.length,
      usageSummary: sortedUsageSummary,
    });
  } catch (error) {
    console.error('Error generating usage report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
