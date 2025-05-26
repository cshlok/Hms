/**
 * Missed Dose API for Medication Administration
 * 
 * This file implements the API endpoint for recording missed medication doses
 * with comprehensive documentation and audit logging.
 */

import { NextRequest, NextResponse } from 'next/server';
import { BarcodeAdministrationService } from '../../../services/barcode-administration-service';
import { validateMissedDoseRequest } from '../../../../../lib/validation/pharmacy-validation';
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

/**
 * POST /api/pharmacy/administration/missed
 * Record a missed medication dose with reason and documentation
 */
export async function POST(req: NextRequest) {
  try {
    // Validate request
    const data = await req.json();
    if (!data.patientId || !data.prescriptionId || !data.medicationId || !data.reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Create missed dose record
    const administration = new PharmacyDomain.MedicationAdministration(
      crypto.randomUUID(),
      data.patientId,
      data.medicationId,
      data.prescriptionId,
      data.dose || prescription.dosage.value,
      data.route || prescription.dosage.route,
      userId,
      new Date(),
      'not-done',
      data.reasonCode || 'patient-refused',
      data.reason,
      data.notes
    );

    // Save missed dose record
    const administrationId = await administrationRepository.save(administration);

    // For certain reason codes, create alerts or notifications
    if (data.reasonCode === 'medication-unavailable') {
      // In a real implementation, notify pharmacy about stock issue
      console.log('ALERT: Medication unavailable - notify pharmacy');
    } else if (data.reasonCode === 'adverse-reaction') {
      // In a real implementation, create alert for clinical staff
      console.log('ALERT: Missed dose due to adverse reaction');
    }

    // Audit logging
    await auditLog('MEDICATION_ADMINISTRATION', {
      action: 'MISSED_DOSE',
      resourceType: 'MedicationAdministration',
      resourceId: administrationId,
      userId: userId,
      patientId: data.patientId,
      details: {
        medicationId: data.medicationId,
        prescriptionId: data.prescriptionId,
        reasonCode: data.reasonCode,
        reason: data.reason
      }
    });

    // Return response
    return NextResponse.json(
      { 
        id: administrationId,
        message: 'Missed dose recorded successfully' 
      }, 
      { status: 201 }
    );
  } catch (error) {
    return errorHandler(error, 'Error recording missed dose');
  }
}
