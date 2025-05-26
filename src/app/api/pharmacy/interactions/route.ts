/**
 * Drug Interaction API Routes
 * 
 * This file implements the FHIR-compliant API endpoints for drug interaction checking
 * following enterprise-grade requirements for security, validation, and error handling.
 */

import { NextRequest, NextResponse } from 'next/server';
import { DrugInteractionService } from '../../services/drug-interaction-service';
import { validateInteractionCheckRequest } from '../../../../lib/validation/pharmacy-validation';
import { auditLog } from '../../../../lib/audit';
import { errorHandler } from '../../../../lib/error-handler';
import { getMedicationById, getPrescriptionById } from '../../../../lib/services/pharmacy/pharmacy.service';
import { getPatientById } from '../../../../lib/services/patient/patient.service';
import { PharmacyDomain } from '../../models/domain-models';

// Initialize repositories (in production, use dependency injection)
const medicationRepository: PharmacyDomain.MedicationRepository = {
  findById: getMedicationById,
  findAll: () => Promise.resolve([]),
  search: () => Promise.resolve([]),
  save: () => Promise.resolve(''),
  update: () => Promise.resolve(true),
  delete: () => Promise.resolve(true)
};

const prescriptionRepository: PharmacyDomain.PrescriptionRepository = {
  findById: getPrescriptionById,
  findByPatientId: () => Promise.resolve([]),
  findByPrescriberId: () => Promise.resolve([]),
  findByMedicationId: () => Promise.resolve([]),
  findByStatus: () => Promise.resolve([]),
  save: () => Promise.resolve(''),
  update: () => Promise.resolve(true),
  delete: () => Promise.resolve(true)
};

// Initialize services
const interactionService = new DrugInteractionService(
  medicationRepository,
  prescriptionRepository
);

/**
 * POST /api/pharmacy/interactions/check
 * Check for drug interactions between medications
 */
export async function POST(req: NextRequest) {
  try {
    // Validate request
    const data = await req.json();
    const validationResult = validateInteractionCheckRequest(data);
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

    // Check for interactions
    const interactions = await interactionService.checkInteractions(data.medicationIds);

    // Audit logging
    await auditLog('DRUG_INTERACTION', {
      action: 'CHECK',
      resourceType: 'DrugInteraction',
      userId: userId,
      details: {
        medicationIds: data.medicationIds,
        interactionCount: interactions.length
      }
    });

    // Return response
    return NextResponse.json({ interactions }, { status: 200 });
  } catch (error) {
    return errorHandler(error, 'Error checking drug interactions');
  }
}

/**
 * GET /api/pharmacy/interactions/patient/[patientId]
 * Check for drug interactions among a patient's active medications
 */
export async function GET(req: NextRequest, { params }: { params: { patientId: string } }) {
  try {
    // Check authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from auth token (simplified for example)
    const userId = 'current-user-id'; // In production, extract from token

    // Get patient ID from params
    const { patientId } = params;
    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    // Verify patient exists
    const patient = await getPatientById(patientId);
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Get active prescriptions for patient
    const prescriptions = await prescriptionRepository.findByPatientId(patientId);
    const activePrescriptions = prescriptions.filter(p => p.isActive());
    
    // Extract medication IDs
    const medicationIds = activePrescriptions.map(p => p.medicationId);
    
    // Check for interactions
    const interactions = await interactionService.checkInteractions(medicationIds);

    // Audit logging
    await auditLog('DRUG_INTERACTION', {
      action: 'CHECK_PATIENT',
      resourceType: 'DrugInteraction',
      userId: userId,
      patientId: patientId,
      details: {
        medicationCount: medicationIds.length,
        interactionCount: interactions.length
      }
    });

    // Return response
    return NextResponse.json({ 
      patientId,
      medicationIds,
      interactions 
    }, { status: 200 });
  } catch (error) {
    return errorHandler(error, 'Error checking patient drug interactions');
  }
}
