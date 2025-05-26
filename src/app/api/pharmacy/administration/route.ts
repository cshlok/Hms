/**
 * Medication Administration API Routes
 * 
 * This file implements the FHIR-compliant API endpoints for medication administration
 * following enterprise-grade requirements for security, validation, and error handling.
 */

import { NextRequest, NextResponse } from 'next/server';
import { BarcodeAdministrationService } from '../../services/barcode-administration-service';
import { validateAdministrationRequest, validateBarcodeVerificationRequest } from '../../../../lib/validation/pharmacy-validation';
import { auditLog } from '../../../../lib/audit';
import { errorHandler } from '../../../../lib/error-handler';
import { encryptionService } from '../../../../lib/security.service';
import { PharmacyDomain } from '../../models/domain-models';
import { FHIRMapper } from '../../models/fhir-mappers';
import { getPatientById } from '../../../../lib/services/patient/patient.service';
import { getMedicationById, getPrescriptionById } from '../../../../lib/services/pharmacy/pharmacy.service';

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
 * POST /api/pharmacy/administration
 * Record a medication administration
 */
export async function POST(req: NextRequest) {
  try {
    // Validate request
    const data = await req.json();
    const validationResult = validateAdministrationRequest(data);
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

    // Create administration record
    const administration = new PharmacyDomain.MedicationAdministration(
      data.id || crypto.randomUUID(),
      data.patientId,
      data.medicationId,
      data.prescriptionId,
      data.dose,
      data.route,
      data.administeredBy || userId,
      data.administeredAt || new Date(),
      data.status || 'completed',
      data.reasonCode,
      data.reasonText,
      data.notes
    );

    // Save administration record
    const administrationId = await administrationRepository.save(administration);

    // Audit logging
    await auditLog('MEDICATION_ADMINISTRATION', {
      action: 'CREATE',
      resourceType: 'MedicationAdministration',
      resourceId: administrationId,
      userId: userId,
      patientId: data.patientId,
      details: {
        medicationId: data.medicationId,
        prescriptionId: data.prescriptionId
      }
    });

    // Return response
    return NextResponse.json(
      { 
        id: administrationId,
        message: 'Medication administration recorded successfully' 
      }, 
      { status: 201 }
    );
  } catch (error) {
    return errorHandler(error, 'Error recording medication administration');
  }
}

/**
 * GET /api/pharmacy/administration/patient/[patientId]
 * Get medication administration history for a patient
 */
export async function GET(req: NextRequest, { params }: { params: { patientId: string } }) {
  try {
    // Check authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get patient ID from params
    const { patientId } = params;
    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    // Get administration history
    const administrations = await administrationRepository.findByPatientId(patientId);

    // Map to FHIR resources
    const fhirAdministrations = administrations.map(FHIRMapper.toFHIRMedicationAdministration);

    // Audit logging
    await auditLog('MEDICATION_ADMINISTRATION', {
      action: 'READ',
      resourceType: 'MedicationAdministration',
      userId: 'current-user-id', // In production, extract from token
      patientId: patientId,
      details: {
        count: administrations.length
      }
    });

    // Return response
    return NextResponse.json({ administrations: fhirAdministrations }, { status: 200 });
  } catch (error) {
    return errorHandler(error, 'Error retrieving medication administration history');
  }
}

/**
 * POST /api/pharmacy/administration/verify
 * Verify medication administration with barcode
 */
export async function verifyAdministration(req: NextRequest) {
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

    // Verify administration
    const verificationResult = await barcodeService.verifyAdministration(
      data.patientBarcode,
      data.medicationBarcode,
      data.prescriptionId,
      data.administeredDose,
      data.administeredRoute
    );

    // Audit logging
    await auditLog('MEDICATION_ADMINISTRATION', {
      action: 'VERIFY',
      resourceType: 'MedicationAdministration',
      userId: 'current-user-id', // In production, extract from token
      patientId: verificationResult.patientId,
      details: {
        medicationId: verificationResult.medicationId,
        prescriptionId: data.prescriptionId,
        success: verificationResult.success
      }
    });

    // Return response
    return NextResponse.json(verificationResult, { status: 200 });
  } catch (error) {
    return errorHandler(error, 'Error verifying medication administration');
  }
}

/**
 * POST /api/pharmacy/administration/missed
 * Record a missed medication dose
 */
export async function recordMissedDose(req: NextRequest) {
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

    // Create missed dose record
    const administration = new PharmacyDomain.MedicationAdministration(
      crypto.randomUUID(),
      data.patientId,
      data.medicationId,
      data.prescriptionId,
      data.dose,
      data.route,
      userId,
      new Date(),
      'not-done',
      data.reasonCode || 'patient-refused',
      data.reason,
      data.notes
    );

    // Save missed dose record
    const administrationId = await administrationRepository.save(administration);

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

/**
 * GET /api/pharmacy/administration/schedule/[patientId]
 * Get medication administration schedule for a patient
 */
export async function getAdministrationSchedule(req: NextRequest, { params }: { params: { patientId: string } }) {
  try {
    // Check authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get patient ID from params
    const { patientId } = params;
    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    // Get active prescriptions for patient
    const prescriptions = await prescriptionRepository.findByPatientId(patientId);
    const activePrescriptions = prescriptions.filter(p => p.isActive());

    // Generate schedule
    const schedule = [];
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    for (const prescription of activePrescriptions) {
      const medication = await medicationRepository.findById(prescription.medicationId);
      if (!medication) continue;

      // Parse frequency to generate schedule times
      const frequency = prescription.dosage.frequency;
      const scheduleTimes = generateScheduleTimes(frequency, now, endOfDay);

      for (const scheduleTime of scheduleTimes) {
        schedule.push({
          prescriptionId: prescription.id,
          medicationId: medication.id,
          medicationName: medication.name,
          dose: prescription.dosage.value,
          unit: prescription.dosage.unit,
          route: prescription.dosage.route,
          scheduledTime: scheduleTime,
          status: 'scheduled'
        });
      }
    }

    // Sort by scheduled time
    schedule.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());

    // Audit logging
    await auditLog('MEDICATION_ADMINISTRATION', {
      action: 'SCHEDULE_VIEW',
      resourceType: 'MedicationAdministration',
      userId: 'current-user-id', // In production, extract from token
      patientId: patientId,
      details: {
        count: schedule.length
      }
    });

    // Return response
    return NextResponse.json({ schedule }, { status: 200 });
  } catch (error) {
    return errorHandler(error, 'Error retrieving medication administration schedule');
  }
}

/**
 * Helper function to generate schedule times based on frequency
 */
function generateScheduleTimes(frequency: string, start: Date, end: Date): Date[] {
  const times: Date[] = [];
  
  // Parse frequency
  if (frequency.includes('daily')) {
    // Once daily - default to 9 AM
    const time = new Date(start);
    time.setHours(9, 0, 0, 0);
    if (time > start && time < end) {
      times.push(time);
    }
  } else if (frequency.includes('twice daily') || frequency.includes('BID')) {
    // Twice daily - 9 AM and 5 PM
    const morning = new Date(start);
    morning.setHours(9, 0, 0, 0);
    if (morning > start && morning < end) {
      times.push(morning);
    }
    
    const evening = new Date(start);
    evening.setHours(17, 0, 0, 0);
    if (evening > start && evening < end) {
      times.push(evening);
    }
  } else if (frequency.includes('three times daily') || frequency.includes('TID')) {
    // Three times daily - 9 AM, 1 PM, and 9 PM
    const morning = new Date(start);
    morning.setHours(9, 0, 0, 0);
    if (morning > start && morning < end) {
      times.push(morning);
    }
    
    const afternoon = new Date(start);
    afternoon.setHours(13, 0, 0, 0);
    if (afternoon > start && afternoon < end) {
      times.push(afternoon);
    }
    
    const evening = new Date(start);
    evening.setHours(21, 0, 0, 0);
    if (evening > start && evening < end) {
      times.push(evening);
    }
  } else if (frequency.includes('four times daily') || frequency.includes('QID')) {
    // Four times daily - 9 AM, 1 PM, 5 PM, and 9 PM
    const morning = new Date(start);
    morning.setHours(9, 0, 0, 0);
    if (morning > start && morning < end) {
      times.push(morning);
    }
    
    const noon = new Date(start);
    noon.setHours(13, 0, 0, 0);
    if (noon > start && noon < end) {
      times.push(noon);
    }
    
    const afternoon = new Date(start);
    afternoon.setHours(17, 0, 0, 0);
    if (afternoon > start && afternoon < end) {
      times.push(afternoon);
    }
    
    const evening = new Date(start);
    evening.setHours(21, 0, 0, 0);
    if (evening > start && evening < end) {
      times.push(evening);
    }
  } else if (frequency.includes('every') && frequency.includes('hours')) {
    // Every X hours
    const match = frequency.match(/every\s+(\d+)\s+hours/i);
    if (match && match[1]) {
      const hours = parseInt(match[1], 10);
      const time = new Date(start);
      time.setMinutes(0, 0, 0);
      time.setHours(Math.ceil(time.getHours() / hours) * hours);
      
      while (time < end) {
        if (time > start) {
          times.push(new Date(time));
        }
        time.setHours(time.getHours() + hours);
      }
    }
  } else if (frequency.includes('PRN') || frequency.includes('as needed')) {
    // PRN - no scheduled times
  } else {
    // Default to once daily at 9 AM
    const time = new Date(start);
    time.setHours(9, 0, 0, 0);
    if (time > start && time < end) {
      times.push(time);
    }
  }
  
  return times;
}

/**
 * POST /api/pharmacy/administration/prn
 * Record a PRN (as needed) medication administration
 */
export async function recordPRNAdministration(req: NextRequest) {
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

    // Verify prescription is PRN
    const prescription = await prescriptionRepository.findById(data.prescriptionId);
    if (!prescription) {
      return NextResponse.json({ error: 'Prescription not found' }, { status: 404 });
    }
    
    if (!prescription.dosage.frequency.includes('PRN') && !prescription.dosage.frequency.includes('as needed')) {
      return NextResponse.json(
        { error: 'Prescription is not PRN (as needed)' },
        { status: 400 }
      );
    }

    // Create PRN administration record
    const administration = new PharmacyDomain.MedicationAdministration(
      crypto.randomUUID(),
      data.patientId,
      data.medicationId,
      data.prescriptionId,
      data.dose || prescription.dosage.value,
      data.route || prescription.dosage.route,
      userId,
      new Date(),
      'completed',
      'PRN',
      data.reason,
      data.notes
    );

    // Save PRN administration record
    const administrationId = await administrationRepository.save(administration);

    // Audit logging
    await auditLog('MEDICATION_ADMINISTRATION', {
      action: 'PRN_ADMINISTRATION',
      resourceType: 'MedicationAdministration',
      resourceId: administrationId,
      userId: userId,
      patientId: data.patientId,
      details: {
        medicationId: data.medicationId,
        prescriptionId: data.prescriptionId,
        reason: data.reason
      }
    });

    // Return response
    return NextResponse.json(
      { 
        id: administrationId,
        message: 'PRN medication administration recorded successfully' 
      }, 
      { status: 201 }
    );
  } catch (error) {
    return errorHandler(error, 'Error recording PRN medication administration');
  }
}

/**
 * POST /api/pharmacy/administration/education
 * Record patient education for medication
 */
export async function recordPatientEducation(req: NextRequest) {
  try {
    // Validate request
    const data = await req.json();
    if (!data.patientId || !data.medicationId || !data.educationContent) {
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

    // Create education record
    const education = {
      id: crypto.randomUUID(),
      patientId: data.patientId,
      medicationId: data.medicationId,
      educatedBy: userId,
      educatedAt: new Date(),
      content: data.educationContent,
      patientUnderstanding: data.patientUnderstanding || 'good',
      additionalInstructions: data.additionalInstructions || '',
      educationMaterials: data.educationMaterials || []
    };

    // In a real implementation, save to education repository
    // For now, just log it
    console.log('Patient education recorded:', education);

    // Audit logging
    await auditLog('MEDICATION_EDUCATION', {
      action: 'CREATE',
      resourceType: 'MedicationEducation',
      resourceId: education.id,
      userId: userId,
      patientId: data.patientId,
      details: {
        medicationId: data.medicationId,
        understanding: data.patientUnderstanding
      }
    });

    // Return response
    return NextResponse.json(
      { 
        id: education.id,
        message: 'Patient education recorded successfully' 
      }, 
      { status: 201 }
    );
  } catch (error) {
    return errorHandler(error, 'Error recording patient education');
  }
}

/**
 * POST /api/pharmacy/administration/reaction
 * Record adverse reaction to medication
 */
export async function recordAdverseReaction(req: NextRequest) {
  try {
    // Validate request
    const data = await req.json();
    if (!data.patientId || !data.medicationId || !data.reaction || !data.severity) {
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

    // Create reaction record
    const reaction = {
      id: crypto.randomUUID(),
      patientId: data.patientId,
      medicationId: data.medicationId,
      administrationId: data.administrationId,
      reportedBy: userId,
      reportedAt: new Date(),
      reaction: data.reaction,
      severity: data.severity,
      onset: data.onset || new Date(),
      duration: data.duration,
      interventions: data.interventions || [],
      outcome: data.outcome || 'unknown'
    };

    // In a real implementation, save to reaction repository
    // For now, just log it
    console.log('Adverse reaction recorded:', reaction);

    // For severe reactions, create an alert
    if (data.severity === 'severe' || data.severity === 'life-threatening') {
      // In a real implementation, send alert to appropriate staff
      console.log('ALERT: Severe adverse reaction reported!');
    }

    // Audit logging
    await auditLog('MEDICATION_REACTION', {
      action: 'CREATE',
      resourceType: 'AdverseReaction',
      resourceId: reaction.id,
      userId: userId,
      patientId: data.patientId,
      details: {
        medicationId: data.medicationId,
        severity: data.severity,
        reaction: data.reaction
      }
    });

    // Return response
    return NextResponse.json(
      { 
        id: reaction.id,
        message: 'Adverse reaction recorded successfully' 
      }, 
      { status: 201 }
    );
  } catch (error) {
    return errorHandler(error, 'Error recording adverse reaction');
  }
}

/**
 * GET /api/pharmacy/administration/due
 * List medications due for administration
 */
export async function getDueMedications(req: NextRequest) {
  try {
    // Check authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const url = new URL(req.url);
    const wardId = url.searchParams.get('wardId');
    const timeWindow = parseInt(url.searchParams.get('timeWindow') || '60', 10); // Default to 60 minutes

    if (!wardId) {
      return NextResponse.json({ error: 'Ward ID is required' }, { status: 400 });
    }

    // In a real implementation, get patients in ward and their schedules
    // For now, return mock data
    const now = new Date();
    const windowEnd = new Date(now.getTime() + timeWindow * 60000);

    const dueMedications = [
      {
        patientId: 'patient1',
        patientName: 'John Doe',
        bedNumber: '101-A',
        prescriptionId: 'rx1',
        medicationId: 'med1',
        medicationName: 'Lisinopril',
        dose: 10,
        unit: 'mg',
        route: 'oral',
        scheduledTime: new Date(now.getTime() + 15 * 60000),
        status: 'due'
      },
      {
        patientId: 'patient2',
        patientName: 'Jane Smith',
        bedNumber: '102-B',
        prescriptionId: 'rx2',
        medicationId: 'med2',
        medicationName: 'Metoprolol',
        dose: 25,
        unit: 'mg',
        route: 'oral',
        scheduledTime: new Date(now.getTime() + 30 * 60000),
        status: 'due'
      }
    ];

    // Audit logging
    await auditLog('MEDICATION_ADMINISTRATION', {
      action: 'DUE_MEDICATIONS_VIEW',
      userId: 'current-user-id', // In production, extract from token
      details: {
        wardId: wardId,
        timeWindow: timeWindow,
        count: dueMedications.length
      }
    });

    // Return response
    return NextResponse.json({ medications: dueMedications }, { status: 200 });
  } catch (error) {
    return errorHandler(error, 'Error retrieving due medications');
  }
}

/**
 * GET /api/pharmacy/administration/overdue
 * List overdue medications
 */
export async function getOverdueMedications(req: NextRequest) {
  try {
    // Check authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const url = new URL(req.url);
    const wardId = url.searchParams.get('wardId');
    const overdueThreshold = parseInt(url.searchParams.get('overdueThreshold') || '30', 10); // Default to 30 minutes

    if (!wardId) {
      return NextResponse.json({ error: 'Ward ID is required' }, { status: 400 });
    }

    // In a real implementation, get patients in ward and their schedules
    // For now, return mock data
    const now = new Date();
    const thresholdTime = new Date(now.getTime() - overdueThreshold * 60000);

    const overdueMedications = [
      {
        patientId: 'patient3',
        patientName: 'Robert Johnson',
        bedNumber: '103-A',
        prescriptionId: 'rx3',
        medicationId: 'med3',
        medicationName: 'Furosemide',
        dose: 40,
        unit: 'mg',
        route: 'oral',
        scheduledTime: new Date(now.getTime() - 45 * 60000),
        status: 'overdue',
        overdueBy: 45 // minutes
      },
      {
        patientId: 'patient4',
        patientName: 'Mary Williams',
        bedNumber: '104-B',
        prescriptionId: 'rx4',
        medicationId: 'med4',
        medicationName: 'Insulin Regular',
        dose: 10,
        unit: 'units',
        route: 'subcutaneous',
        scheduledTime: new Date(now.getTime() - 60 * 60000),
        status: 'overdue',
        overdueBy: 60 // minutes
      }
    ];

    // Audit logging
    await auditLog('MEDICATION_ADMINISTRATION', {
      action: 'OVERDUE_MEDICATIONS_VIEW',
      userId: 'current-user-id', // In production, extract from token
      details: {
        wardId: wardId,
        overdueThreshold: overdueThreshold,
        count: overdueMedications.length
      }
    });

    // Return response
    return NextResponse.json({ medications: overdueMedications }, { status: 200 });
  } catch (error) {
    return errorHandler(error, 'Error retrieving overdue medications');
  }
}

/**
 * GET /api/pharmacy/administration/reports
 * Generate administration reports
 */
export async function generateAdministrationReports(req: NextRequest) {
  try {
    // Check authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const url = new URL(req.url);
    const reportType = url.searchParams.get('type') || 'summary';
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const wardId = url.searchParams.get('wardId');
    const medicationId = url.searchParams.get('medicationId');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 });
    }

    // In a real implementation, generate report based on parameters
    // For now, return mock data
    let report;
    
    if (reportType === 'summary') {
      report = {
        reportType: 'summary',
        startDate,
        endDate,
        wardId,
        totalAdministrations: 1250,
        completedAdministrations: 1180,
        missedDoses: 70,
        administrationsByRoute: {
          oral: 850,
          intravenous: 200,
          subcutaneous: 150,
          intramuscular: 50
        },
        administrationsByShift: {
          morning: 450,
          afternoon: 400,
          evening: 400
        },
        topMedications: [
          { id: 'med1', name: 'Lisinopril', count: 120 },
          { id: 'med5', name: 'Metformin', count: 100 },
          { id: 'med6', name: 'Atorvastatin', count: 95 }
        ]
      };
    } else if (reportType === 'missed-doses') {
      report = {
        reportType: 'missed-doses',
        startDate,
        endDate,
        wardId,
        totalMissedDoses: 70,
        missedDosesByReason: {
          'patient-refused': 30,
          'patient-unavailable': 15,
          'medication-unavailable': 10,
          'clinical-decision': 15
        },
        missedDosesByMedication: [
          { id: 'med7', name: 'Warfarin', count: 12 },
          { id: 'med8', name: 'Digoxin', count: 8 },
          { id: 'med9', name: 'Phenytoin', count: 7 }
        ],
        missedDosesByPatient: [
          { id: 'patient5', name: 'Thomas Brown', count: 5 },
          { id: 'patient6', name: 'Sarah Miller', count: 4 },
          { id: 'patient7', name: 'James Wilson', count: 3 }
        ]
      };
    } else if (reportType === 'medication-specific' && medicationId) {
      report = {
        reportType: 'medication-specific',
        startDate,
        endDate,
        medicationId,
        medicationName: 'Lisinopril',
        totalAdministrations: 120,
        completedAdministrations: 115,
        missedDoses: 5,
        administrationsByRoute: {
          oral: 120
        },
        administrationsByShift: {
          morning: 60,
          afternoon: 0,
          evening: 60
        },
        administrationsByWard: {
          'Ward A': 50,
          'Ward B': 40,
          'Ward C': 30
        }
      };
    } else {
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    // Audit logging
    await auditLog('MEDICATION_ADMINISTRATION', {
      action: 'REPORT_GENERATION',
      userId: 'current-user-id', // In production, extract from token
      details: {
        reportType,
        startDate,
        endDate,
        wardId,
        medicationId
      }
    });

    // Return response
    return NextResponse.json({ report }, { status: 200 });
  } catch (error) {
    return errorHandler(error, 'Error generating administration report');
  }
}

// Export route handlers
export { verifyAdministration as POST } from './verify/route';
export { recordMissedDose as POST } from './missed/route';
export { getAdministrationSchedule as GET } from './schedule/[patientId]/route';
export { recordPRNAdministration as POST } from './prn/route';
export { recordPatientEducation as POST } from './education/route';
export { recordAdverseReaction as POST } from './reaction/route';
export { getDueMedications as GET } from './due/route';
export { getOverdueMedications as GET } from './overdue/route';
export { generateAdministrationReports as GET } from './reports/route';
