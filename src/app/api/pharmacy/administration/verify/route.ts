/**
 * Barcode Verification API for Medication Administration
 * 
 * This file implements the API endpoint for verifying medication administration
 * using barcode scanning, following the "Five Rights" verification process.
 */

import { NextRequest, NextResponse } from 'next/server';
import { BarcodeAdministrationService } from '../../../services/barcode-administration-service';
import { validateBarcodeVerificationRequest } from '../../../../../lib/validation/pharmacy-validation';
import { auditLog } from '../../../../../lib/audit';
import { errorHandler } from '../../../../../lib/error-handler';
import { getMedicationById, getPrescriptionById } from '../../../../../lib/services/pharmacy/pharmacy.service';
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

const administrationRepository: PharmacyDomain.MedicationAdministrationRepository = {
  findById: () => Promise.resolve(null),
  findByPatientId: () => Promise.resolve([]),
  findByPrescriptionId: () => Promise.resolve([]),
  findByMedicationId: () => Promise.resolve([]),
  findByStatus: () => Promise.resolve([]),
  save: (administration) => Promise.resolve(administration.id || 'new-id'),
  update: () => Promise.resolve(true),
  delete: () => Promise.resolve(true)
};

// Initialize services
const barcodeService = new BarcodeAdministrationService(
  medicationRepository,
  prescriptionRepository,
  administrationRepository
);

/**
 * POST /api/pharmacy/administration/verify
 * Verify medication administration with barcode scanning
 */
export async function POST(req: NextRequest) {
  try {
    // Validate request
    const data = await req.json();
    const validationResult = validateBarcodeVerificationRequest(data);
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

    // Verify the "Five Rights" of medication administration
    const verificationResult = await barcodeService.verifyAdministration(
      data.patientBarcode,
      data.medicationBarcode,
      data.prescriptionId,
      data.administeredDose,
      data.administeredRoute
    );

    // If verification failed, return error
    if (!verificationResult.success) {
      return NextResponse.json(
        { 
          error: 'Verification failed', 
          details: verificationResult.errors,
          verificationResult 
        }, 
        { status: 400 }
      );
    }

    // If verification succeeded but with warnings, include them in response
    const response: any = { 
      success: true,
      verificationResult
    };

    if (verificationResult.warnings && verificationResult.warnings.length > 0) {
      response.warnings = verificationResult.warnings;
    }

    // Audit logging
    await auditLog('MEDICATION_ADMINISTRATION', {
      action: 'VERIFY',
      resourceType: 'MedicationAdministration',
      userId: userId,
      patientId: verificationResult.patientId,
      details: {
        medicationId: verificationResult.medicationId,
        prescriptionId: data.prescriptionId,
        success: verificationResult.success,
        warningCount: verificationResult.warnings?.length || 0
      }
    });

    // Return response
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return errorHandler(error, 'Error verifying medication administration');
  }
}
