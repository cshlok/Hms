/**
 * Inventory API Routes
 * 
 * This file implements the FHIR-compliant API endpoints for pharmacy inventory management
 * following enterprise-grade requirements for security, validation, and error handling.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateInventoryRequest } from '../../../../lib/validation/pharmacy-validation';
import { auditLog } from '../../../../lib/audit';
import { errorHandler } from '../../../../lib/error-handler';
import { encryptionService } from '../../../../lib/security.service';
import { PharmacyDomain } from '../../models/domain-models';
import { FHIRMapper } from '../../models/fhir-mappers';

// Initialize repositories (in production, use dependency injection)
const inventoryRepository = {
  findById: (id: string) => Promise.resolve(null),
  findByLocationId: (locationId: string) => Promise.resolve([]),
  findByMedicationId: (medicationId: string) => Promise.resolve([]),
  findAll: () => Promise.resolve([]),
  findExpiring: (daysThreshold: number) => Promise.resolve([]),
  save: (item: any) => Promise.resolve(item.id || 'new-id'),
  update: () => Promise.resolve(true),
  delete: () => Promise.resolve(true),
  adjustStock: () => Promise.resolve(true),
  transferStock: () => Promise.resolve(true)
};

/**
 * GET /api/pharmacy/inventory
 * List inventory with stock levels and filtering options
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
    const medicationId = url.searchParams.get('medicationId');
    const belowReorderLevel = url.searchParams.get('belowReorderLevel') === 'true';
    const includeZeroStock = url.searchParams.get('includeZeroStock') === 'true';
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);

    // Build filter criteria
    const filter: any = {};
    if (locationId) filter.locationId = locationId;
    if (medicationId) filter.medicationId = medicationId;
    if (belowReorderLevel) filter.belowReorderLevel = true;
    if (!includeZeroStock) filter.quantityOnHand = { gt: 0 };

    // Get inventory items (mock implementation)
    const inventoryItems = await inventoryRepository.findAll();
    const total = inventoryItems.length;

    // Apply pagination
    const paginatedItems = inventoryItems.slice((page - 1) * limit, page * limit);

    // Map to FHIR resources
    const fhirInventoryItems = paginatedItems.map(FHIRMapper.toFHIRInventoryItem);

    // Audit logging
    await auditLog('INVENTORY', {
      action: 'LIST',
      resourceType: 'Inventory',
      userId: userId,
      details: {
        filter,
        page,
        limit,
        resultCount: paginatedItems.length
      }
    });

    // Return response
    return NextResponse.json({ 
      items: fhirInventoryItems,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, { status: 200 });
  } catch (error) {
    return errorHandler(error, 'Error retrieving inventory');
  }
}

/**
 * POST /api/pharmacy/inventory
 * Add new inventory item
 */
export async function POST(req: NextRequest) {
  try {
    // Validate request
    const data = await req.json();
    const validationResult = validateInventoryRequest(data);
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

    // Create inventory item
    const inventoryItem = new PharmacyDomain.InventoryItem(
      data.id || crypto.randomUUID(),
      data.medicationId,
      data.locationId,
      data.batchNumber,
      data.expiryDate ? new Date(data.expiryDate) : null,
      data.quantityOnHand,
      data.reorderLevel || 0,
      data.unitCost || 0,
      data.supplier || '',
      data.notes || ''
    );

    // Special handling for controlled substances
    if (data.isControlled) {
      // Encrypt controlled substance data
      inventoryItem.controlledSubstanceData = await encryptionService.encrypt(
        JSON.stringify({
          scheduleClass: data.scheduleClass,
          lockboxNumber: data.lockboxNumber,
          lastAuditDate: data.lastAuditDate
        })
      );
    }

    // Save inventory item
    const inventoryItemId = await inventoryRepository.save(inventoryItem);

    // Audit logging
    await auditLog('INVENTORY', {
      action: 'CREATE',
      resourceType: 'Inventory',
      resourceId: inventoryItemId,
      userId: userId,
      details: {
        medicationId: data.medicationId,
        locationId: data.locationId,
        quantity: data.quantityOnHand,
        isControlled: data.isControlled || false
      }
    });

    // Return response
    return NextResponse.json(
      { 
        id: inventoryItemId,
        message: 'Inventory item created successfully' 
      }, 
      { status: 201 }
    );
  } catch (error) {
    return errorHandler(error, 'Error creating inventory item');
  }
}
