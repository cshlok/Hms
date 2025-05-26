/**
 * Drug-Condition Interaction API Routes
 * 
 * This file implements the API endpoints for checking drug-condition contraindications
 * with severity classification and detailed interaction information.
 */

import { NextRequest, NextResponse } from 'next/server';
import { DrugInteractionService } from '../../../services/drug-interaction-service';
import { validateDrugConditionInteractionRequest } from '../../../../../lib/validation/pharmacy-validation';
import { auditLog } from '../../../../../lib/audit';
import { errorHandler } from '../../../../../lib/error-handler';
import { getMedicationById } from '../../../../../lib/services/pharmacy/pharmacy.service';
import { getPatientConditions } from '../../../../../lib/services/patient/patient.service';
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
 * POST /api/pharmacy/interactions/drug-condition
 * Check for drug-condition contraindications
 */
export async function POST(req: NextRequest) {
  try {
    // Validate request
    const data = await req.json();
    const validationResult = validateDrugConditionInteractionRequest(data);
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

    // Get patient conditions
    let conditions = data.conditions || [];
    
    // If patientId is provided, fetch conditions from patient record
    if (data.patientId && conditions.length === 0) {
      const patientConditions = await getPatientConditions(data.patientId);
      conditions = patientConditions.map(c => c.code);
    }

    // Check for drug-condition contraindications
    const contraindications = await interactionService.checkDrugConditionContraindications(
      data.medicationIds,
      conditions
    );

    // Audit logging
    await auditLog('DRUG_INTERACTION', {
      action: 'CHECK_DRUG_CONDITION',
      resourceType: 'DrugInteraction',
      userId: userId,
      patientId: data.patientId,
      details: {
        medicationIds: data.medicationIds,
        conditionCount: conditions.length,
        contraindicationCount: contraindications.length
      }
    });

    // Return response
    return NextResponse.json({ 
      contraindications,
      metadata: {
        totalCount: contraindications.length,
        severityCounts: {
          absolute: contraindications.filter(c => c.contraindicationType === 'absolute').length,
          relative: contraindications.filter(c => c.contraindicationType === 'relative').length,
          caution: contraindications.filter(c => c.contraindicationType === 'caution').length
        }
      }
    }, { status: 200 });
  } catch (error) {
    return errorHandler(error, 'Error checking drug-condition contraindications');
  }
}
