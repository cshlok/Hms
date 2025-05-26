/**
 * Patient Education API Routes
 * 
 * This file implements the API endpoints for recording patient education related to medications
 * with comprehensive documentation and tracking.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateEducationRequest } from '../../../../../lib/validation/pharmacy-validation';
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

const educationRepository = {
  findById: (id: string) => Promise.resolve(null),
  findByPatientId: (patientId: string) => Promise.resolve([]),
  findByMedicationId: (medicationId: string) => Promise.resolve([]),
  save: (education: any) => Promise.resolve(education.id || 'new-id'),
  update: () => Promise.resolve(true),
  delete: () => Promise.resolve(true)
};

/**
 * POST /api/pharmacy/administration/education
 * Record patient education for medication
 */
export async function POST(req: NextRequest) {
  try {
    // Validate request
    const data = await req.json();
    const validationResult = validateEducationRequest(data);
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

    // Verify medication exists if provided
    if (data.medicationId) {
      const medication = await medicationRepository.findById(data.medicationId);
      if (!medication) {
        return NextResponse.json({ error: 'Medication not found' }, { status: 404 });
      }
    }

    // Verify prescription exists if provided
    if (data.prescriptionId) {
      const prescription = await prescriptionRepository.findById(data.prescriptionId);
      if (!prescription) {
        return NextResponse.json({ error: 'Prescription not found' }, { status: 404 });
      }
    }

    // Create education record
    const education = {
      id: data.id || crypto.randomUUID(),
      patientId: data.patientId,
      medicationId: data.medicationId,
      prescriptionId: data.prescriptionId,
      educationType: data.educationType || 'verbal',
      topics: data.topics || [],
      materials: data.materials || [],
      notes: data.notes || '',
      patientUnderstanding: data.patientUnderstanding || 'good',
      educatedBy: userId,
      educatedAt: new Date(),
      followUpRequired: data.followUpRequired || false,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      language: data.language || 'English',
      interpreter: data.interpreter || false,
      interpreterName: data.interpreterName
    };

    // Save education record
    const educationId = await educationRepository.save(education);

    // Audit logging
    await auditLog('MEDICATION_EDUCATION', {
      action: 'CREATE',
      resourceType: 'MedicationEducation',
      resourceId: educationId,
      userId: userId,
      patientId: data.patientId,
      details: {
        medicationId: data.medicationId,
        prescriptionId: data.prescriptionId,
        educationType: data.educationType,
        topics: data.topics
      }
    });

    // Return response
    return NextResponse.json(
      { 
        id: educationId,
        message: 'Patient education recorded successfully' 
      }, 
      { status: 201 }
    );
  } catch (error) {
    return errorHandler(error, 'Error recording patient education');
  }
}

/**
 * GET /api/pharmacy/administration/education
 * Get patient education records with filtering options
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
    const medicationId = url.searchParams.get('medicationId');
    const prescriptionId = url.searchParams.get('prescriptionId');
    const educationType = url.searchParams.get('educationType');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);

    // Require at least patientId filter
    if (!patientId) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    // Build filter criteria
    const filter: any = { patientId };
    if (medicationId) filter.medicationId = medicationId;
    if (prescriptionId) filter.prescriptionId = prescriptionId;
    if (educationType) filter.educationType = educationType;
    
    // Add date range if provided
    if (startDate || endDate) {
      filter.educatedAt = {};
      if (startDate) filter.educatedAt.gte = new Date(startDate);
      if (endDate) filter.educatedAt.lte = new Date(endDate);
    }

    // Get education records (mock implementation)
    const educationRecords = await educationRepository.findByPatientId(patientId);
    
    // Apply additional filters
    let filteredRecords = educationRecords;
    if (medicationId) {
      filteredRecords = filteredRecords.filter(e => e.medicationId === medicationId);
    }
    if (prescriptionId) {
      filteredRecords = filteredRecords.filter(e => e.prescriptionId === prescriptionId);
    }
    if (educationType) {
      filteredRecords = filteredRecords.filter(e => e.educationType === educationType);
    }
    if (startDate) {
      const startDateTime = new Date(startDate).getTime();
      filteredRecords = filteredRecords.filter(e => new Date(e.educatedAt).getTime() >= startDateTime);
    }
    if (endDate) {
      const endDateTime = new Date(endDate).getTime();
      filteredRecords = filteredRecords.filter(e => new Date(e.educatedAt).getTime() <= endDateTime);
    }
    
    const total = filteredRecords.length;

    // Apply pagination
    const paginatedRecords = filteredRecords.slice((page - 1) * limit, page * limit);

    // Audit logging
    await auditLog('MEDICATION_EDUCATION', {
      action: 'LIST',
      resourceType: 'MedicationEducation',
      userId: userId,
      patientId: patientId,
      details: {
        filter,
        page,
        limit,
        resultCount: paginatedRecords.length
      }
    });

    // Return response
    return NextResponse.json({ 
      educationRecords: paginatedRecords,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, { status: 200 });
  } catch (error) {
    return errorHandler(error, 'Error retrieving patient education records');
  }
}
