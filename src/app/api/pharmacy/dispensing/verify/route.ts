/**
 * Dispensing Verification API Routes
 * 
 * This file implements the API endpoints for verifying medication dispensing
 * with barcode scanning and safety checks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateDispensingVerificationRequest } from '../../../../../lib/validation/pharmacy-validation';
import { auditLog } from '../../../../../lib/audit';
import { errorHandler } from '../../../../../lib/error-handler';
import { PharmacyDomain } from '../../../models/domain-models';
import { getMedicationById, getPrescriptionById } from '../../../../../lib/services/pharmacy/pharmacy.service';

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

const dispensingRepository = {
  findById: (id: string) => Promise.resolve(null),
  findByPrescriptionId: (prescriptionId: string) => Promise.resolve([]),
  findByPatientId: (patientId: string) => Promise.resolve([]),
  findByStatus: (status: string) => Promise.resolve([]),
  save: (dispensing: any) => Promise.resolve(dispensing.id || 'new-id'),
  update: () => Promise.resolve(true),
  delete: () => Promise.resolve(true)
};

/**
 * POST /api/pharmacy/dispensing/verify
 * Verify medication dispensing with barcode scanning
 */
export async function POST(req: NextRequest) {
  try {
    // Validate request
    const data = await req.json();
    const validationResult = validateDispensingVerificationRequest(data);
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

    // Verify medication barcode matches prescription
    if (data.medicationBarcode !== medication.barcode) {
      return NextResponse.json(
        { 
          error: 'Medication barcode does not match prescription',
          expected: medication.barcode,
          received: data.medicationBarcode
        },
        { status: 400 }
      );
    }

    // Verify patient barcode matches prescription
    if (data.patientBarcode && data.patientBarcode !== prescription.patientId) {
      return NextResponse.json(
        { 
          error: 'Patient barcode does not match prescription',
          expected: prescription.patientId,
          received: data.patientBarcode
        },
        { status: 400 }
      );
    }

    // Create verification record
    const verification = {
      id: crypto.randomUUID(),
      prescriptionId: data.prescriptionId,
      medicationBarcode: data.medicationBarcode,
      patientBarcode: data.patientBarcode,
      verifiedBy: userId,
      verifiedAt: new Date(),
      status: 'verified',
      notes: data.notes || ''
    };

    // In a real implementation, save verification record
    // const verificationId = await verificationRepository.save(verification);

    // Update dispensing status if dispensingId is provided
    if (data.dispensingId) {
      const dispensing = await dispensingRepository.findById(data.dispensingId);
      if (dispensing) {
        dispensing.status = 'verified';
        dispensing.verifiedBy = userId;
        dispensing.verifiedAt = new Date();
        await dispensingRepository.update(dispensing);
      }
    }

    // Audit logging
    await auditLog('DISPENSING', {
      action: 'VERIFY',
      resourceType: 'MedicationDispense',
      userId: userId,
      patientId: prescription.patientId,
      details: {
        medicationId: prescription.medicationId,
        prescriptionId: data.prescriptionId,
        dispensingId: data.dispensingId
      }
    });

    // Return response
    return NextResponse.json(
      { 
        success: true,
        message: 'Dispensing verification successful',
        verification: {
          id: verification.id,
          verifiedAt: verification.verifiedAt
        }
      }, 
      { status: 200 }
    );
  } catch (error) {
    return errorHandler(error, 'Error verifying medication dispensing');
  }
}
