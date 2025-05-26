/**
 * Interaction Override API Routes
 * 
 * This file implements the API endpoints for overriding interaction alerts
 * with documentation of reason and authorization.
 */

import { NextRequest, NextResponse } from 'next/server';
import { DrugInteractionService } from '../../../services/drug-interaction-service';
import { validateInteractionOverrideRequest } from '../../../../../lib/validation/pharmacy-validation';
import { auditLog } from '../../../../../lib/audit';
import { errorHandler } from '../../../../../lib/error-handler';
import { PharmacyDomain } from '../../../models/domain-models';

// Initialize interaction override repository (in production, use dependency injection)
const interactionOverrideRepository = {
  findById: (id: string) => Promise.resolve(null),
  findByInteractionId: (interactionId: string) => Promise.resolve([]),
  save: (override: any) => Promise.resolve(override.id || 'new-id'),
  update: () => Promise.resolve(true),
  delete: () => Promise.resolve(true)
};

/**
 * POST /api/pharmacy/interactions/[id]/override
 * Override an interaction alert with documented reason
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get interaction ID from params
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Interaction ID is required' }, { status: 400 });
    }

    // Validate request
    const data = await req.json();
    const validationResult = validateInteractionOverrideRequest(data);
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

    // Create override record
    const override = {
      id: crypto.randomUUID(),
      interactionId: id,
      overrideReason: data.reason,
      overrideNotes: data.notes,
      overriddenBy: userId,
      overriddenAt: new Date(),
      patientId: data.patientId,
      prescriptionId: data.prescriptionId
    };

    // Save override record
    const overrideId = await interactionOverrideRepository.save(override);

    // Audit logging (critical for controlled substances and high-risk medications)
    await auditLog('DRUG_INTERACTION', {
      action: 'OVERRIDE',
      resourceType: 'DrugInteraction',
      resourceId: id,
      userId: userId,
      patientId: data.patientId,
      details: {
        overrideId,
        reason: data.reason,
        prescriptionId: data.prescriptionId
      }
    });

    // Return response
    return NextResponse.json(
      { 
        id: overrideId,
        message: 'Interaction override recorded successfully' 
      }, 
      { status: 201 }
    );
  } catch (error) {
    return errorHandler(error, 'Error recording interaction override');
  }
}

/**
 * GET /api/pharmacy/interactions/overrides
 * List interaction overrides with filtering options
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
    const patientId = url.searchParams.get('patientId');
    const prescriptionId = url.searchParams.get('prescriptionId');
    const interactionId = url.searchParams.get('interactionId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);

    // Build filter criteria
    const filter: any = {};
    if (patientId) filter.patientId = patientId;
    if (prescriptionId) filter.prescriptionId = prescriptionId;
    if (interactionId) filter.interactionId = interactionId;
    
    // Add date range if provided
    if (startDate || endDate) {
      filter.overriddenAt = {};
      if (startDate) filter.overriddenAt.gte = new Date(startDate);
      if (endDate) filter.overriddenAt.lte = new Date(endDate);
    }

    // Get overrides (mock implementation)
    const overrides = []; // In production, query database with filter, pagination
    const total = 0; // In production, get total count

    // Audit logging
    await auditLog('DRUG_INTERACTION', {
      action: 'LIST_OVERRIDES',
      resourceType: 'DrugInteraction',
      userId: userId,
      details: {
        filter,
        page,
        limit,
        resultCount: overrides.length
      }
    });

    // Return response
    return NextResponse.json({ 
      overrides,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, { status: 200 });
  } catch (error) {
    return errorHandler(error, 'Error retrieving interaction overrides');
  }
}
