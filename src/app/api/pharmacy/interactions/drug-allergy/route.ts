/**
 * Drug-Allergy Interaction API Routes
 * 
 * This file implements the API endpoints for checking drug-allergy interactions
 * with severity classification and detailed interaction information.
 */

import { NextRequest, NextResponse } from 'next/server';
import { DrugInteractionService } from '../../../services/drug-interaction-service';
import { validateDrugAllergyInteractionRequest } from '../../../../../lib/validation/pharmacy-validation';
import { auditLog } from '../../../../../lib/audit';
import { errorHandler } from '../../../../../lib/error-handler';
import { getMedicationById } from '../../../../../lib/services/pharmacy/pharmacy.service';
import { getPatientAllergies } from '../../../../../lib/services/patient/patient.service';
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
 * POST /api/pharmacy/interactions/drug-allergy
 * Check for drug-allergy interactions for a patient
 */
export async function POST(req: NextRequest) {
  try {
    // Validate request
    const data = await req.json();
    const validationResult = validateDrugAllergyInteractionRequest(data);
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

    // Get patient allergies
    let allergies = data.allergies || [];
    
    // If patientId is provided, fetch allergies from patient record
    if (data.patientId && allergies.length === 0) {
      const patientAllergies = await getPatientAllergies(data.patientId);
      allergies = patientAllergies.map(a => a.allergen);
    }

    // Check for drug-allergy interactions
    const interactions = await interactionService.checkDrugAllergyInteractions(
      data.medicationIds,
      allergies
    );

    // Audit logging
    await auditLog('DRUG_INTERACTION', {
      action: 'CHECK_DRUG_ALLERGY',
      resourceType: 'DrugInteraction',
      userId: userId,
      patientId: data.patientId,
      details: {
        medicationIds: data.medicationIds,
        allergyCount: allergies.length,
        interactionCount: interactions.length
      }
    });

    // Return response
    return NextResponse.json({ 
      interactions,
      metadata: {
        totalCount: interactions.length,
        severityCounts: {
          contraindicated: interactions.filter(i => i.severity === 'contraindicated').length,
          severe: interactions.filter(i => i.severity === 'severe').length,
          moderate: interactions.filter(i => i.severity === 'moderate').length,
          mild: interactions.filter(i => i.severity === 'mild').length,
          unknown: interactions.filter(i => i.severity === 'unknown').length
        }
      }
    }, { status: 200 });
  } catch (error) {
    return errorHandler(error, 'Error checking drug-allergy interactions');
  }
}
