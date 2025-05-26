/**
 * Prescription Renewal API Routes
 * 
 * This file implements the API endpoints for prescription renewal workflows
 * with approval processes and comprehensive tracking.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateRenewalRequest } from '../../../../../lib/validation/pharmacy-validation';
import { auditLog } from '../../../../../lib/audit';
import { errorHandler } from '../../../../../lib/error-handler';
import { PharmacyDomain } from '../../../models/domain-models';
import { FHIRMapper } from '../../../models/fhir-mappers';
import { getMedicationById, getPrescriptionById } from '../../../../../lib/services/pharmacy/pharmacy.service';
import { getPatientById } from '../../../../../lib/services/patient/patient.service';
import { DrugInteractionService } from '../../../services/drug-interaction-service';

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
  findByPatientId: (patientId: string) => Promise.resolve([]),
  findByPrescriberId: () => Promise.resolve([]),
  findByMedicationId: () => Promise.resolve([]),
  findByStatus: () => Promise.resolve([]),
  findExpiringWithinDays: (days: number) => Promise.resolve([]),
  save: () => Promise.resolve(''),
  update: () => Promise.resolve(true),
  delete: () => Promise.resolve(true)
};

const renewalRepository = {
  findById: (id: string) => Promise.resolve(null),
  findByPrescriptionId: (prescriptionId: string) => Promise.resolve([]),
  findByPatientId: (patientId: string) => Promise.resolve([]),
  findByStatus: (status: string) => Promise.resolve([]),
  save: (renewal: any) => Promise.resolve(renewal.id || 'new-id'),
  update: () => Promise.resolve(true),
  delete: () => Promise.resolve(true)
};

// Initialize services
const interactionService = new DrugInteractionService(
  medicationRepository,
  prescriptionRepository
);

/**
 * GET /api/pharmacy/prescriptions/renewal
 * List prescriptions eligible for renewal or pending renewal requests
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
    const status = url.searchParams.get('status') || 'eligible'; // eligible, pending, approved, denied
    const daysThreshold = parseInt(url.searchParams.get('daysThreshold') || '30', 10);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);

    let prescriptions = [];
    let renewalRequests = [];

    if (status === 'eligible') {
      // Get prescriptions expiring within the threshold
      prescriptions = await prescriptionRepository.findExpiringWithinDays(daysThreshold);
      
      // Filter by patient if provided
      if (patientId) {
        prescriptions = prescriptions.filter(p => p.patientId === patientId);
      }
      
      // Exclude prescriptions with pending renewal requests
      const pendingRenewals = await renewalRepository.findByStatus('pending');
      const pendingPrescriptionIds = pendingRenewals.map(r => r.prescriptionId);
      prescriptions = prescriptions.filter(p => !pendingPrescriptionIds.includes(p.id));
      
      // Enrich with medication details
      prescriptions = await Promise.all(prescriptions.map(async p => {
        const medication = await medicationRepository.findById(p.medicationId);
        return {
          ...p,
          medicationName: medication ? medication.name : 'Unknown',
          isControlled: medication ? medication.isControlled : false,
          daysUntilExpiry: getDaysUntilExpiry(p.endDate)
        };
      }));
      
      // Sort by days until expiry (ascending)
      prescriptions.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
    } else {
      // Get renewal requests by status
      renewalRequests = await renewalRepository.findByStatus(status);
      
      // Filter by patient if provided
      if (patientId) {
        renewalRequests = renewalRequests.filter(r => r.patientId === patientId);
      }
      
      // Enrich with prescription and medication details
      renewalRequests = await Promise.all(renewalRequests.map(async r => {
        const prescription = await prescriptionRepository.findById(r.prescriptionId);
        const medication = prescription ? 
          await medicationRepository.findById(prescription.medicationId) : null;
        
        return {
          ...r,
          prescriptionDetails: prescription,
          medicationName: medication ? medication.name : 'Unknown',
          isControlled: medication ? medication.isControlled : false
        };
      }));
      
      // Sort by request date (descending)
      renewalRequests.sort((a, b) => 
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
      );
    }

    // Apply pagination
    const items = status === 'eligible' ? prescriptions : renewalRequests;
    const total = items.length;
    const paginatedItems = items.slice((page - 1) * limit, page * limit);

    // Audit logging
    await auditLog('PRESCRIPTION', {
      action: 'LIST_RENEWALS',
      resourceType: 'MedicationRequest',
      userId: userId,
      details: {
        status,
        patientId,
        daysThreshold,
        resultCount: paginatedItems.length
      }
    });

    // Return response
    return NextResponse.json({ 
      items: paginatedItems,
      status,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, { status: 200 });
  } catch (error) {
    return errorHandler(error, 'Error retrieving prescription renewals');
  }
}

/**
 * POST /api/pharmacy/prescriptions/renewal
 * Request prescription renewal
 */
export async function POST(req: NextRequest) {
  try {
    // Validate request
    const data = await req.json();
    const validationResult = validateRenewalRequest(data);
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

    // Verify prescription exists
    const prescription = await prescriptionRepository.findById(data.prescriptionId);
    if (!prescription) {
      return NextResponse.json({ error: 'Prescription not found' }, { status: 404 });
    }

    // Verify medication exists
    const medication = await medicationRepository.findById(prescription.medicationId);
    if (!medication) {
      return NextResponse.json({ error: 'Medication not found' }, { status: 404 });
    }

    // Check for existing pending renewal request
    const existingRenewals = await renewalRepository.findByPrescriptionId(data.prescriptionId);
    const pendingRenewal = existingRenewals.find(r => r.status === 'pending');
    
    if (pendingRenewal) {
      return NextResponse.json(
        { 
          error: 'Pending renewal request already exists for this prescription',
          existingRenewalId: pendingRenewal.id
        },
        { status: 409 }
      );
    }

    // Create renewal request
    const renewal = {
      id: data.id || crypto.randomUUID(),
      prescriptionId: data.prescriptionId,
      patientId: prescription.patientId,
      requestedBy: userId,
      requestedAt: new Date(),
      status: 'pending',
      notes: data.notes || '',
      requestReason: data.requestReason || 'continuation',
      proposedChanges: data.proposedChanges || {},
      approvalRequired: medication.isControlled || data.proposedChanges.dosage !== undefined
    };

    // Save renewal request
    const renewalId = await renewalRepository.save(renewal);

    // Special handling for controlled substances
    if (medication.isControlled) {
      // Additional logging for controlled substances
      await auditLog('CONTROLLED_SUBSTANCE', {
        action: 'RENEWAL_REQUEST',
        resourceType: 'MedicationRequest',
        resourceId: data.prescriptionId,
        userId: userId,
        patientId: prescription.patientId,
        details: {
          renewalId,
          medicationId: prescription.medicationId,
          requestReason: data.requestReason
        }
      });
    }

    // Regular audit logging
    await auditLog('PRESCRIPTION', {
      action: 'REQUEST_RENEWAL',
      resourceType: 'MedicationRequest',
      resourceId: renewalId,
      userId: userId,
      patientId: prescription.patientId,
      details: {
        prescriptionId: data.prescriptionId,
        medicationId: prescription.medicationId,
        requestReason: data.requestReason,
        hasProposedChanges: Object.keys(data.proposedChanges || {}).length > 0
      }
    });

    // Return response
    return NextResponse.json(
      { 
        id: renewalId,
        message: 'Renewal request created successfully',
        approvalRequired: renewal.approvalRequired
      }, 
      { status: 201 }
    );
  } catch (error) {
    return errorHandler(error, 'Error creating renewal request');
  }
}

/**
 * PUT /api/pharmacy/prescriptions/renewal/[id]/approve
 * Approve a prescription renewal request
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get renewal ID from params
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Renewal ID is required' }, { status: 400 });
    }

    // Check authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from auth token (simplified for example)
    const userId = 'current-user-id'; // In production, extract from token

    // Verify renewal request exists
    const renewal = await renewalRepository.findById(id);
    if (!renewal) {
      return NextResponse.json({ error: 'Renewal request not found' }, { status: 404 });
    }

    // Check if already processed
    if (renewal.status !== 'pending') {
      return NextResponse.json(
        { error: `Renewal request already ${renewal.status}` },
        { status: 400 }
      );
    }

    // Get prescription
    const prescription = await prescriptionRepository.findById(renewal.prescriptionId);
    if (!prescription) {
      return NextResponse.json({ error: 'Prescription not found' }, { status: 404 });
    }

    // Get medication
    const medication = await medicationRepository.findById(prescription.medicationId);
    if (!medication) {
      return NextResponse.json({ error: 'Medication not found' }, { status: 404 });
    }

    // Get request body
    const data = await req.json();
    
    // Create new prescription based on the original with updated dates
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + (data.durationDays || 30)); // Default to 30 days
    
    // Apply any proposed changes from the renewal request
    const dosage = { ...prescription.dosage };
    if (renewal.proposedChanges.dosage) {
      Object.assign(dosage, renewal.proposedChanges.dosage);
    }
    
    const newPrescription = new PharmacyDomain.Prescription(
      crypto.randomUUID(),
      prescription.patientId,
      prescription.medicationId,
      userId, // Current user becomes the prescriber
      dosage,
      now, // Start date is now
      endDate,
      'active',
      data.priority || prescription.priority,
      data.notes || prescription.notes
    );

    // Special handling for controlled substances
    if (medication.isControlled) {
      // Copy controlled substance data
      newPrescription.controlledSubstanceData = prescription.controlledSubstanceData;
    }

    // Save new prescription
    const newPrescriptionId = await prescriptionRepository.save(newPrescription);

    // Update renewal request
    renewal.status = 'approved';
    renewal.approvedBy = userId;
    renewal.approvedAt = new Date();
    renewal.newPrescriptionId = newPrescriptionId;
    renewal.notes = data.notes || renewal.notes;
    
    await renewalRepository.update(renewal);

    // Update original prescription status to 'completed'
    prescription.status = 'completed';
    await prescriptionRepository.update(prescription);

    // Special handling for controlled substances
    if (medication.isControlled) {
      // Additional logging for controlled substances
      await auditLog('CONTROLLED_SUBSTANCE', {
        action: 'RENEWAL_APPROVED',
        resourceType: 'MedicationRequest',
        resourceId: renewal.prescriptionId,
        userId: userId,
        patientId: prescription.patientId,
        details: {
          renewalId: id,
          newPrescriptionId,
          medicationId: prescription.medicationId
        }
      });
    }

    // Regular audit logging
    await auditLog('PRESCRIPTION', {
      action: 'APPROVE_RENEWAL',
      resourceType: 'MedicationRequest',
      resourceId: id,
      userId: userId,
      patientId: prescription.patientId,
      details: {
        prescriptionId: renewal.prescriptionId,
        newPrescriptionId,
        medicationId: prescription.medicationId,
        durationDays: data.durationDays
      }
    });

    // Return response
    return NextResponse.json(
      { 
        id,
        newPrescriptionId,
        message: 'Renewal request approved successfully' 
      }, 
      { status: 200 }
    );
  } catch (error) {
    return errorHandler(error, 'Error approving renewal request');
  }
}

/**
 * Helper function to calculate days until expiry
 */
function getDaysUntilExpiry(endDate: Date | null): number {
  if (!endDate) return 0;
  
  const now = new Date();
  const end = new Date(endDate);
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}
