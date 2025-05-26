/**
 * Adverse Reaction API Routes
 * 
 * This file implements the API endpoints for recording adverse medication reactions
 * with comprehensive documentation, alerting, and tracking.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateReactionRequest } from '../../../../../lib/validation/pharmacy-validation';
import { auditLog } from '../../../../../lib/audit';
import { errorHandler } from '../../../../../lib/error-handler';
import { PharmacyDomain } from '../../../models/domain-models';
import { getMedicationById, getPrescriptionById } from '../../../../../lib/services/pharmacy/pharmacy.service';
import { getPatientById } from '../../../../../lib/services/patient/patient.service';

// Initialize repositories (in production, use dependency injection)
const medicationRepository: PharmacyDomain.MedicationRepository = {
  findById: getMedicationById,
  findAll: () => Promise.resolve([]),
  search: () => Promise.resolve([]),
  save: () => Promise.resolve(''),
  update: () => Promise.resolve(true),
  delete: () => Promise.resolve(true)
};

const prescriptionRepository = {
  findById: getPrescriptionById,
  findByPatientId: () => Promise.resolve([]),
  findByPrescriberId: () => Promise.resolve([]),
  findByMedicationId: () => Promise.resolve([]),
  findByStatus: () => Promise.resolve([]),
  save: () => Promise.resolve(''),
  update: () => Promise.resolve(true),
  delete: () => Promise.resolve(true)
};

const reactionRepository = {
  findById: (id: string) => Promise.resolve(null),
  findByPatientId: (patientId: string) => Promise.resolve([]),
  findByMedicationId: (medicationId: string) => Promise.resolve([]),
  save: (reaction: any) => Promise.resolve(reaction.id || 'new-id'),
  update: () => Promise.resolve(true),
  delete: () => Promise.resolve(true)
};

/**
 * POST /api/pharmacy/administration/reaction
 * Record adverse medication reaction
 */
export async function POST(req: NextRequest) {
  try {
    // Validate request
    const data = await req.json();
    const validationResult = validateReactionRequest(data);
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

    // Verify patient exists
    const patient = await getPatientById(data.patientId);
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Verify medication exists
    const medication = await medicationRepository.findById(data.medicationId);
    if (!medication) {
      return NextResponse.json({ error: 'Medication not found' }, { status: 404 });
    }

    // Verify prescription exists if provided
    if (data.prescriptionId) {
      const prescription = await prescriptionRepository.findById(data.prescriptionId);
      if (!prescription) {
        return NextResponse.json({ error: 'Prescription not found' }, { status: 404 });
      }
    }

    // Create reaction record
    const reaction = {
      id: data.id || crypto.randomUUID(),
      patientId: data.patientId,
      medicationId: data.medicationId,
      prescriptionId: data.prescriptionId,
      reactionType: data.reactionType,
      severity: data.severity || 'moderate',
      symptoms: data.symptoms || [],
      onset: data.onset ? new Date(data.onset) : new Date(),
      duration: data.duration,
      actionTaken: data.actionTaken || [],
      outcome: data.outcome,
      notes: data.notes || '',
      reportedBy: userId,
      reportedAt: new Date(),
      isSerious: data.isSerious || false,
      requiresFollowUp: data.requiresFollowUp || false,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : null
    };

    // Save reaction record
    const reactionId = await reactionRepository.save(reaction);

    // Create alert for serious reactions
    if (data.severity === 'severe' || data.isSerious) {
      // In a real implementation, create alert for clinical staff
      console.log('ALERT: Severe adverse reaction reported');
      
      // In a real implementation, update patient allergies if needed
      if (data.updateAllergies) {
        console.log('Updating patient allergies with new medication allergy');
      }
    }

    // Audit logging
    await auditLog('MEDICATION_REACTION', {
      action: 'CREATE',
      resourceType: 'MedicationReaction',
      resourceId: reactionId,
      userId: userId,
      patientId: data.patientId,
      details: {
        medicationId: data.medicationId,
        prescriptionId: data.prescriptionId,
        severity: data.severity,
        isSerious: data.isSerious
      }
    });

    // Return response
    return NextResponse.json(
      { 
        id: reactionId,
        message: 'Adverse reaction recorded successfully',
        requiresImmediateAttention: data.severity === 'severe' || data.isSerious
      }, 
      { status: 201 }
    );
  } catch (error) {
    return errorHandler(error, 'Error recording adverse reaction');
  }
}

/**
 * GET /api/pharmacy/administration/reaction/patient/[patientId]
 * Get adverse reactions for a specific patient
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

    // Get query parameters
    const url = new URL(req.url);
    const medicationId = url.searchParams.get('medicationId');
    const severity = url.searchParams.get('severity');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);

    // Get reaction records
    const reactionRecords = await reactionRepository.findByPatientId(patientId);
    
    // Apply filters
    let filteredRecords = reactionRecords;
    if (medicationId) {
      filteredRecords = filteredRecords.filter(r => r.medicationId === medicationId);
    }
    if (severity) {
      filteredRecords = filteredRecords.filter(r => r.severity === severity);
    }
    if (startDate) {
      const startDateTime = new Date(startDate).getTime();
      filteredRecords = filteredRecords.filter(r => new Date(r.onset).getTime() >= startDateTime);
    }
    if (endDate) {
      const endDateTime = new Date(endDate).getTime();
      filteredRecords = filteredRecords.filter(r => new Date(r.onset).getTime() <= endDateTime);
    }
    
    const total = filteredRecords.length;

    // Apply pagination
    const paginatedRecords = filteredRecords.slice((page - 1) * limit, page * limit);

    // Group by severity for reporting
    const severityCounts = {
      mild: filteredRecords.filter(r => r.severity === 'mild').length,
      moderate: filteredRecords.filter(r => r.severity === 'moderate').length,
      severe: filteredRecords.filter(r => r.severity === 'severe').length
    };

    // Audit logging
    await auditLog('MEDICATION_REACTION', {
      action: 'LIST',
      resourceType: 'MedicationReaction',
      userId: userId,
      patientId: patientId,
      details: {
        medicationId,
        severity,
        resultCount: paginatedRecords.length,
        severityCounts
      }
    });

    // Return response
    return NextResponse.json({ 
      reactionRecords: paginatedRecords,
      severityCounts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, { status: 200 });
  } catch (error) {
    return errorHandler(error, 'Error retrieving adverse reactions');
  }
}
