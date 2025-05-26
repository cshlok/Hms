/**
 * Batch Interaction Check API Routes
 * 
 * This file implements the API endpoints for batch checking interactions
 * across multiple medications, allergies, conditions, and lab results.
 */

import { NextRequest, NextResponse } from 'next/server';
import { DrugInteractionService } from '../../../services/drug-interaction-service';
import { validateBatchInteractionCheckRequest } from '../../../../../lib/validation/pharmacy-validation';
import { auditLog } from '../../../../../lib/audit';
import { errorHandler } from '../../../../../lib/error-handler';
import { getMedicationById } from '../../../../../lib/services/pharmacy/pharmacy.service';
import { getPatientById, getPatientAllergies, getPatientConditions } from '../../../../../lib/services/patient/patient.service';
import { getPatientLabResults } from '../../../../../lib/services/laboratory/laboratory.service';
import { PharmacyDomain } from '../../../models/domain-models';

// Initialize repositories (in production, use dependency injection)
const medicationRepository: PharmacyDomain.MedicationRepository = {
  findById: getMedicationById,
  findAll: () => Promise.resolve([]),
  search: () => Promise.resolve([]),
  save: () => Promise.resolve(''),
  update: () => Promise.resolve(true),
  delete: () => Promise.resolve(true)
};

// Initialize services
const interactionService = new DrugInteractionService(
  medicationRepository,
  null // No need for prescription repository in this endpoint
);

/**
 * POST /api/pharmacy/interactions/batch-check
 * Perform comprehensive batch interaction checking
 */
export async function POST(req: NextRequest) {
  try {
    // Validate request
    const data = await req.json();
    const validationResult = validateBatchInteractionCheckRequest(data);
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

    // Get patient data if patientId is provided
    let allergies = data.allergies || [];
    let conditions = data.conditions || [];
    let labResults = data.labResults || [];
    
    if (data.patientId) {
      // Fetch patient allergies if not provided
      if (allergies.length === 0) {
        const patientAllergies = await getPatientAllergies(data.patientId);
        allergies = patientAllergies.map(a => a.allergen);
      }
      
      // Fetch patient conditions if not provided
      if (conditions.length === 0) {
        const patientConditions = await getPatientConditions(data.patientId);
        conditions = patientConditions.map(c => c.code);
      }
      
      // Fetch patient lab results if not provided
      if (labResults.length === 0) {
        const patientLabResults = await getPatientLabResults(data.patientId);
        labResults = patientLabResults.map(lr => ({
          code: lr.code,
          value: lr.value,
          unit: lr.unit,
          referenceRange: lr.referenceRange,
          abnormalFlag: lr.abnormalFlag
        }));
      }
    }

    // Perform batch interaction checks
    const results = await interactionService.batchCheckInteractions({
      medicationIds: data.medicationIds,
      allergies,
      conditions,
      labResults,
      includeMonographs: data.includeMonographs || false
    });

    // Audit logging
    await auditLog('DRUG_INTERACTION', {
      action: 'BATCH_CHECK',
      resourceType: 'DrugInteraction',
      userId: userId,
      patientId: data.patientId,
      details: {
        medicationCount: data.medicationIds.length,
        allergyCount: allergies.length,
        conditionCount: conditions.length,
        labResultCount: labResults.length,
        interactionCount: results.totalInteractionCount
      }
    });

    // Return response
    return NextResponse.json({ 
      results,
      metadata: {
        medicationCount: data.medicationIds.length,
        allergyCount: allergies.length,
        conditionCount: conditions.length,
        labResultCount: labResults.length,
        totalInteractionCount: results.totalInteractionCount,
        criticalInteractionCount: results.criticalInteractionCount
      }
    }, { status: 200 });
  } catch (error) {
    return errorHandler(error, 'Error performing batch interaction check');
  }
}
