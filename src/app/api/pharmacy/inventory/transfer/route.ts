/**
 * Inventory Transfer API Routes
 * 
 * This file implements the API endpoints for transferring inventory between locations
 * with comprehensive tracking and audit logging.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateInventoryTransferRequest } from '../../../../../lib/validation/pharmacy-validation';
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
  adjustStock: () => Promise.resolve(true),
  transferStock: () => Promise.resolve(true)
};

const transferRepository = {
  findById: (id: string) => Promise.resolve(null),
  findBySourceLocationId: (locationId: string) => Promise.resolve([]),
  findByDestinationLocationId: (locationId: string) => Promise.resolve([]),
  findByMedicationId: (medicationId: string) => Promise.resolve([]),
  findAll: () => Promise.resolve([]),
  save: (transfer: any) => Promise.resolve(transfer.id || 'new-id')
};

/**
 * POST /api/pharmacy/inventory/transfer
 * Transfer inventory between locations
 */
export async function POST(req: NextRequest) {
  try {
    // Validate request
    const data = await req.json();
    const validationResult = validateInventoryTransferRequest(data);
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

    // Verify source inventory has sufficient stock
    const sourceInventory = await inventoryRepository.findById(data.sourceInventoryId);
    if (!sourceInventory) {
      return NextResponse.json({ error: 'Source inventory not found' }, { status: 404 });
    }

    if (sourceInventory.quantityOnHand < data.quantity) {
      return NextResponse.json(
        { error: 'Insufficient stock in source location' },
        { status: 400 }
      );
    }

    // Create transfer record
    const transfer = {
      id: crypto.randomUUID(),
      sourceInventoryId: data.sourceInventoryId,
      sourceLocationId: sourceInventory.locationId,
      destinationLocationId: data.destinationLocationId,
      medicationId: sourceInventory.medicationId,
      quantity: data.quantity,
      batchNumber: sourceInventory.batchNumber,
      expiryDate: sourceInventory.expiryDate,
      transferredBy: userId,
      transferredAt: new Date(),
      notes: data.notes || '',
      status: 'completed'
    };

    // Save transfer record
    const transferId = await transferRepository.save(transfer);

    // Update inventory quantities
    await inventoryRepository.transferStock(
      data.sourceInventoryId,
      data.destinationLocationId,
      data.quantity
    );

    // Special handling for controlled substances
    if (sourceInventory.isControlled) {
      // Additional logging for controlled substances
      await auditLog('CONTROLLED_SUBSTANCE', {
        action: 'TRANSFER',
        resourceType: 'Inventory',
        resourceId: data.sourceInventoryId,
        userId: userId,
        details: {
          transferId,
          medicationId: sourceInventory.medicationId,
          sourceLocationId: sourceInventory.locationId,
          destinationLocationId: data.destinationLocationId,
          quantity: data.quantity
        }
      });
    }

    // Regular audit logging
    await auditLog('INVENTORY', {
      action: 'TRANSFER',
      resourceType: 'Inventory',
      resourceId: transferId,
      userId: userId,
      details: {
        sourceInventoryId: data.sourceInventoryId,
        destinationLocationId: data.destinationLocationId,
        medicationId: sourceInventory.medicationId,
        quantity: data.quantity
      }
    });

    // Return response
    return NextResponse.json(
      { 
        id: transferId,
        message: 'Inventory transferred successfully' 
      }, 
      { status: 201 }
    );
  } catch (error) {
    return errorHandler(error, 'Error transferring inventory');
  }
}
