/**
 * Expiring Medications API Routes
 * 
 * This file implements the API endpoints for retrieving medications approaching expiry
 * with filtering and alerting capabilities.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auditLog } from '../../../../../lib/audit';
import { errorHandler } from '../../../../../lib/error-handler';
import { PharmacyDomain } from '../../../models/domain-models';
import { FHIRMapper } from '../../../models/fhir-mappers';

// Initialize repositories (in production, use dependency injection)
const inventoryRepository = {
  findById: (id: string) => Promise.resolve(null),
  findByLocationId: (locationId: string) => Promise.resolve([]),
  findByMedicationId: (medicationId: string) => Promise.resolve([]),
  findAll: () => Promise.resolve([]),
  findExpiring: (daysThreshold: number) => Promise.resolve([]),
  save: (item: any) => Promise.resolve(item.id || 'new-id'),
  update: () => Promise.resolve(true),
  delete: () => Promise.resolve(true)
};

/**
 * GET /api/pharmacy/inventory/expiring
 * List medications approaching expiry date
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
    const daysThreshold = parseInt(url.searchParams.get('daysThreshold') || '90', 10);
    const locationId = url.searchParams.get('locationId');
    const medicationId = url.searchParams.get('medicationId');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);

    // Build filter criteria
    const filter: any = { daysThreshold };
    if (locationId) filter.locationId = locationId;
    if (medicationId) filter.medicationId = medicationId;

    // Get expiring inventory items
    const expiringItems = await inventoryRepository.findExpiring(daysThreshold);
    
    // Apply additional filters
    let filteredItems = expiringItems;
    if (locationId) {
      filteredItems = filteredItems.filter(item => item.locationId === locationId);
    }
    if (medicationId) {
      filteredItems = filteredItems.filter(item => item.medicationId === medicationId);
    }
    
    const total = filteredItems.length;

    // Apply pagination
    const paginatedItems = filteredItems.slice((page - 1) * limit, page * limit);

    // Map to FHIR resources
    const fhirInventoryItems = paginatedItems.map(FHIRMapper.toFHIRInventoryItem);

    // Group by expiry timeframe for reporting
    const expiryGroups = {
      expired: filteredItems.filter(item => new Date(item.expiryDate) < new Date()).length,
      next30Days: filteredItems.filter(item => {
        const expiryDate = new Date(item.expiryDate);
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        return expiryDate >= new Date() && expiryDate <= thirtyDaysFromNow;
      }).length,
      next90Days: filteredItems.filter(item => {
        const expiryDate = new Date(item.expiryDate);
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        const ninetyDaysFromNow = new Date();
        ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
        return expiryDate > thirtyDaysFromNow && expiryDate <= ninetyDaysFromNow;
      }).length
    };

    // Audit logging
    await auditLog('INVENTORY', {
      action: 'LIST_EXPIRING',
      resourceType: 'Inventory',
      userId: userId,
      details: {
        daysThreshold,
        filter,
        page,
        limit,
        resultCount: paginatedItems.length,
        expiryGroups
      }
    });

    // Return response
    return NextResponse.json({ 
      items: fhirInventoryItems,
      expiryGroups,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, { status: 200 });
  } catch (error) {
    return errorHandler(error, 'Error retrieving expiring medications');
  }
}
