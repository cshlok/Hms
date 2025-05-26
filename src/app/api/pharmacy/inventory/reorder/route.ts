/**
 * Automated Reordering API Routes
 * 
 * This file implements the API endpoints for automated inventory reordering
 * with threshold-based triggers and approval workflows.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateReorderRequest } from '../../../../../lib/validation/pharmacy-validation';
import { auditLog } from '../../../../../lib/audit';
import { errorHandler } from '../../../../../lib/error-handler';
import { PharmacyDomain } from '../../../models/domain-models';
import { getMedicationById } from '../../../../../lib/services/pharmacy/pharmacy.service';

// Initialize repositories (in production, use dependency injection)
const medicationRepository: PharmacyDomain.MedicationRepository = {
  findById: getMedicationById,
  findAll: () => Promise.resolve([]),
  search: () => Promise.resolve([]),
  save: () => Promise.resolve(''),
  update: () => Promise.resolve(true),
  delete: () => Promise.resolve(true)
};

const inventoryRepository = {
  findById: (id: string) => Promise.resolve(null),
  findByLocationId: (locationId: string) => Promise.resolve([]),
  findByMedicationId: (medicationId: string) => Promise.resolve([]),
  findBelowReorderLevel: () => Promise.resolve([]),
  findAll: () => Promise.resolve([]),
  save: (item: any) => Promise.resolve(item.id || 'new-id'),
  update: () => Promise.resolve(true),
  delete: () => Promise.resolve(true)
};

const reorderRepository = {
  findById: (id: string) => Promise.resolve(null),
  findByStatus: (status: string) => Promise.resolve([]),
  findByMedicationId: (medicationId: string) => Promise.resolve([]),
  findByLocationId: (locationId: string) => Promise.resolve([]),
  findAll: () => Promise.resolve([]),
  save: (reorder: any) => Promise.resolve(reorder.id || 'new-id'),
  update: () => Promise.resolve(true),
  delete: () => Promise.resolve(true)
};

const supplierRepository = {
  findById: (id: string) => Promise.resolve(null),
  findByMedicationId: (medicationId: string) => Promise.resolve([]),
  findAll: () => Promise.resolve([]),
  save: (supplier: any) => Promise.resolve(supplier.id || 'new-id'),
  update: () => Promise.resolve(true),
  delete: () => Promise.resolve(true)
};

/**
 * GET /api/pharmacy/inventory/reorder
 * List items that need reordering based on threshold levels
 */
export async function GET(req: NextRequest) {
  try {
    // Check authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from auth token (simplified for example)
    const userId = 'current-user-id'; // In production, extract from token

    // Get query parameters
    const url = new URL(req.url);
    const locationId = url.searchParams.get('locationId');
    const includeOnOrder = url.searchParams.get('includeOnOrder') === 'true';
    const criticalOnly = url.searchParams.get('criticalOnly') === 'true';
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);

    // Get inventory items below reorder level
    const itemsBelowReorderLevel = await inventoryRepository.findBelowReorderLevel();
    
    // Apply filters
    let filteredItems = itemsBelowReorderLevel;
    if (locationId) {
      filteredItems = filteredItems.filter(item => item.locationId === locationId);
    }
    
    // Get existing reorders
    const existingReorders = await reorderRepository.findByStatus('pending');
    const medicationsOnOrder = existingReorders.map(reorder => reorder.medicationId);
    
    // Filter out items already on order if not including them
    if (!includeOnOrder) {
      filteredItems = filteredItems.filter(item => !medicationsOnOrder.includes(item.medicationId));
    }
    
    // Filter for critical items only if requested
    if (criticalOnly) {
      filteredItems = filteredItems.filter(item => {
        const stockRatio = item.quantityOnHand / item.reorderLevel;
        return stockRatio < 0.5; // Consider critical if less than 50% of reorder level
      });
    }
    
    // Enrich with medication details and calculate reorder quantities
    const reorderItems = await Promise.all(filteredItems.map(async item => {
      const medication = await medicationRepository.findById(item.medicationId);
      const suppliers = await supplierRepository.findByMedicationId(item.medicationId);
      const preferredSupplier = suppliers.length > 0 ? suppliers[0] : null;
      
      // Calculate suggested reorder quantity based on usage patterns
      // In a real implementation, this would use historical usage data
      const suggestedQuantity = Math.max(
        item.reorderLevel * 2 - item.quantityOnHand,
        item.reorderLevel
      );
      
      return {
        inventoryId: item.id,
        medicationId: item.medicationId,
        medicationName: medication ? medication.name : 'Unknown',
        locationId: item.locationId,
        currentStock: item.quantityOnHand,
        reorderLevel: item.reorderLevel,
        suggestedQuantity,
        estimatedCost: suggestedQuantity * (item.unitCost || 0),
        isControlled: medication ? medication.isControlled : false,
        isHighAlert: medication ? medication.isHighAlert : false,
        preferredSupplierId: preferredSupplier ? preferredSupplier.id : null,
        preferredSupplierName: preferredSupplier ? preferredSupplier.name : null,
        isOnOrder: medicationsOnOrder.includes(item.medicationId),
        stockStatus: getStockStatus(item.quantityOnHand, item.reorderLevel)
      };
    }));
    
    // Sort by stock status (critical first)
    reorderItems.sort((a, b) => {
      const statusOrder = { critical: 0, low: 1, normal: 2 };
      return statusOrder[a.stockStatus] - statusOrder[b.stockStatus];
    });
    
    const total = reorderItems.length;
    
    // Apply pagination
    const paginatedItems = reorderItems.slice((page - 1) * limit, page * limit);

    // Group by status for reporting
    const statusCounts = {
      critical: reorderItems.filter(item => item.stockStatus === 'critical').length,
      low: reorderItems.filter(item => item.stockStatus === 'low').length,
      normal: reorderItems.filter(item => item.stockStatus === 'normal').length
    };

    // Audit logging
    await auditLog('INVENTORY', {
      action: 'LIST_REORDER',
      resourceType: 'Inventory',
      userId: userId,
      details: {
        locationId,
        includeOnOrder,
        criticalOnly,
        resultCount: paginatedItems.length,
        statusCounts
      }
    });

    // Return response
    return NextResponse.json({ 
      reorderItems: paginatedItems,
      statusCounts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, { status: 200 });
  } catch (error) {
    return errorHandler(error, 'Error retrieving reorder items');
  }
}

/**
 * POST /api/pharmacy/inventory/reorder
 * Create a new reorder request
 */
export async function POST(req: NextRequest) {
  try {
    // Validate request
    const data = await req.json();
    const validationResult = validateReorderRequest(data);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.errors },
        { status: 400 }
      );
    }

    // Check authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from auth token (simplified for example)
    const userId = 'current-user-id'; // In production, extract from token

    // Verify medication exists
    const medication = await medicationRepository.findById(data.medicationId);
    if (!medication) {
      return NextResponse.json({ error: 'Medication not found' }, { status: 404 });
    }

    // Check for existing pending reorder for this medication
    const existingReorders = await reorderRepository.findByMedicationId(data.medicationId);
    const pendingReorder = existingReorders.find(r => r.status === 'pending');
    
    if (pendingReorder && !data.force) {
      return NextResponse.json(
        { 
          error: 'Pending reorder already exists for this medication',
          existingReorderId: pendingReorder.id
        },
        { status: 409 }
      );
    }

    // Create reorder record
    const reorder = {
      id: data.id || crypto.randomUUID(),
      medicationId: data.medicationId,
      locationId: data.locationId,
      quantity: data.quantity,
      supplierId: data.supplierId,
      unitCost: data.unitCost,
      totalCost: data.quantity * (data.unitCost || 0),
      requestedBy: userId,
      requestedAt: new Date(),
      status: 'pending',
      notes: data.notes || '',
      priority: data.priority || 'normal',
      expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
      purchaseOrderNumber: generatePurchaseOrderNumber()
    };

    // Special handling for controlled substances
    if (medication.isControlled) {
      reorder.requiresApproval = true;
      reorder.approvalStatus = 'pending';
      
      // Additional logging for controlled substances
      await auditLog('CONTROLLED_SUBSTANCE', {
        action: 'REORDER_REQUEST',
        resourceType: 'Inventory',
        userId: userId,
        details: {
          medicationId: data.medicationId,
          quantity: data.quantity,
          supplierId: data.supplierId,
          purchaseOrderNumber: reorder.purchaseOrderNumber
        }
      });
    }

    // Save reorder record
    const reorderId = await reorderRepository.save(reorder);

    // Regular audit logging
    await auditLog('INVENTORY', {
      action: 'CREATE_REORDER',
      resourceType: 'Inventory',
      resourceId: reorderId,
      userId: userId,
      details: {
        medicationId: data.medicationId,
        quantity: data.quantity,
        supplierId: data.supplierId,
        purchaseOrderNumber: reorder.purchaseOrderNumber
      }
    });

    // Return response
    return NextResponse.json(
      { 
        id: reorderId,
        purchaseOrderNumber: reorder.purchaseOrderNumber,
        requiresApproval: reorder.requiresApproval,
        message: 'Reorder request created successfully' 
      }, 
      { status: 201 }
    );
  } catch (error) {
    return errorHandler(error, 'Error creating reorder request');
  }
}

/**
 * Helper function to determine stock status based on quantity and reorder level
 */
function getStockStatus(quantity: number, reorderLevel: number): 'critical' | 'low' | 'normal' {
  const ratio = quantity / reorderLevel;
  
  if (ratio <= 0.25) {
    return 'critical';
  } else if (ratio <= 0.75) {
    return 'low';
  } else {
    return 'normal';
  }
}

/**
 * Helper function to generate a purchase order number
 */
function generatePurchaseOrderNumber(): string {
  const prefix = 'PO';
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${timestamp}-${random}`;
}
