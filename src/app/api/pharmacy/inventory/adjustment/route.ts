/**
 * Inventory Adjustment API Routes
 * 
 * This file implements the API endpoints for adjusting inventory quantities
 * with comprehensive tracking and audit logging.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateInventoryAdjustmentRequest } from '../../../../../lib/validation/pharmacy-validation';
import { auditLog } from '../../../../../lib/audit';
import { errorHandler } from '../../../../../lib/error-handler';
import { PharmacyDomain } from '../../../models/domain-models';

// Initialize repositories (in production, use dependency injection)
const inventoryRepository = {
  findById: (id: string) => Promise.resolve(null),
  findByLocationId: (locationId: string) => Promise.resolve([]),
  findByMedicationId: (medicationId: string) => Promise.resolve([]),
  findAll: () => Promise.resolve([]),
  save: (item: any) => Promise.resolve(item.id || 'new-id'),
  update: () => Promise.resolve(true),
  delete: () => Promise.resolve(true),
  adjustStock: () => Promise.resolve(true)
};

const adjustmentRepository = {
  findById: (id: string) => Promise.resolve(null),
  findByInventoryId: (inventoryId: string) => Promise.resolve([]),
  findByLocationId: (locationId: string) => Promise.resolve([]),
  findByMedicationId: (medicationId: string) => Promise.resolve([]),
  findAll: () => Promise.resolve([]),
  save: (adjustment: any) => Promise.resolve(adjustment.id || 'new-id')
};

/**
 * POST /api/pharmacy/inventory/adjustment
 * Adjust inventory quantity with reason documentation
 */
export async function POST(req: NextRequest) {
  try {
    // Validate request
    const data = await req.json();
    const validationResult = validateInventoryAdjustmentRequest(data);
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

    // Verify inventory exists
    const inventory = await inventoryRepository.findById(data.inventoryId);
    if (!inventory) {
      return NextResponse.json({ error: 'Inventory not found' }, { status: 404 });
    }

    // Calculate adjustment quantity
    const adjustmentQuantity = data.newQuantity - inventory.quantityOnHand;

    // Create adjustment record
    const adjustment = {
      id: crypto.randomUUID(),
      inventoryId: data.inventoryId,
      locationId: inventory.locationId,
      medicationId: inventory.medicationId,
      previousQuantity: inventory.quantityOnHand,
      newQuantity: data.newQuantity,
      adjustmentQuantity,
      reason: data.reason,
      adjustedBy: userId,
      adjustedAt: new Date(),
      notes: data.notes || ''
    };

    // Save adjustment record
    const adjustmentId = await adjustmentRepository.save(adjustment);

    // Update inventory quantity
    await inventoryRepository.adjustStock(data.inventoryId, data.newQuantity);

    // Special handling for controlled substances
    if (inventory.isControlled) {
      // Additional logging for controlled substances
      await auditLog('CONTROLLED_SUBSTANCE', {
        action: 'ADJUST',
        resourceType: 'Inventory',
        resourceId: data.inventoryId,
        userId: userId,
        details: {
          adjustmentId,
          medicationId: inventory.medicationId,
          previousQuantity: inventory.quantityOnHand,
          newQuantity: data.newQuantity,
          adjustmentQuantity,
          reason: data.reason
        }
      });
    }

    // Regular audit logging
    await auditLog('INVENTORY', {
      action: 'ADJUST',
      resourceType: 'Inventory',
      resourceId: adjustmentId,
      userId: userId,
      details: {
        inventoryId: data.inventoryId,
        medicationId: inventory.medicationId,
        previousQuantity: inventory.quantityOnHand,
        newQuantity: data.newQuantity,
        adjustmentQuantity,
        reason: data.reason
      }
    });

    // Return response
    return NextResponse.json(
      { 
        id: adjustmentId,
        message: 'Inventory adjusted successfully' 
      }, 
      { status: 201 }
    );
  } catch (error) {
    return errorHandler(error, 'Error adjusting inventory');
  }
}

/**
 * GET /api/pharmacy/inventory/adjustments
 * List inventory adjustments with filtering options
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
    const inventoryId = url.searchParams.get('inventoryId');
    const locationId = url.searchParams.get('locationId');
    const medicationId = url.searchParams.get('medicationId');
    const reason = url.searchParams.get('reason');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);

    // Build filter criteria
    const filter: any = {};
    if (inventoryId) filter.inventoryId = inventoryId;
    if (locationId) filter.locationId = locationId;
    if (medicationId) filter.medicationId = medicationId;
    if (reason) filter.reason = reason;
    
    // Add date range if provided
    if (startDate || endDate) {
      filter.adjustedAt = {};
      if (startDate) filter.adjustedAt.gte = new Date(startDate);
      if (endDate) filter.adjustedAt.lte = new Date(endDate);
    }

    // Get adjustments (mock implementation)
    const adjustments = []; // In production, query database with filter, pagination
    const total = 0; // In production, get total count

    // Audit logging
    await auditLog('INVENTORY', {
      action: 'LIST_ADJUSTMENTS',
      resourceType: 'Inventory',
      userId: userId,
      details: {
        filter,
        page,
        limit,
        resultCount: adjustments.length
      }
    });

    // Return response
    return NextResponse.json({ 
      adjustments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, { status: 200 });
  } catch (error) {
    return errorHandler(error, 'Error retrieving inventory adjustments');
  }
}
