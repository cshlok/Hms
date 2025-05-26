/**
 * Patient Medication Schedule API
 * 
 * This file implements the API endpoint for retrieving a patient's medication
 * administration schedule with comprehensive timing and status information.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auditLog } from '../../../../../../lib/audit';
import { errorHandler } from '../../../../../../lib/error-handler';
import { getMedicationById, getPrescriptionById } from '../../../../../../lib/services/pharmacy/pharmacy.service';
import { PharmacyDomain } from '../../../../models/domain-models';

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
 * GET /api/pharmacy/administration/schedule/[patientId]
 * Get medication administration schedule for a patient
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { patientId: string } }
) {
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
    const startDate = url.searchParams.get('startDate') 
      ? new Date(url.searchParams.get('startDate') as string) 
      : new Date();
    const endDate = url.searchParams.get('endDate')
      ? new Date(url.searchParams.get('endDate') as string)
      : new Date(startDate.getTime() + 24 * 60 * 60 * 1000); // Default to 24 hours from start
    const includeCompleted = url.searchParams.get('includeCompleted') === 'true';

    // Get active prescriptions for patient
    const prescriptions = await prescriptionRepository.findByPatientId(patientId);
    const activePrescriptions = prescriptions.filter(p => p.isActive());

    // Generate schedule
    const schedule = [];
    
    for (const prescription of activePrescriptions) {
      const medication = await medicationRepository.findById(prescription.medicationId);
      if (!medication) continue;

      // Parse frequency to generate schedule times
      const frequency = prescription.dosage.frequency;
      const scheduleTimes = generateScheduleTimes(frequency, startDate, endDate);

      // Get administrations for this prescription in the date range
      const administrations = await administrationRepository.findByPrescriptionId(prescription.id);
      const administrationsInRange = administrations.filter(a => {
        const adminTime = new Date(a.administeredAt);
        return adminTime >= startDate && adminTime <= endDate;
      });

      // Create schedule entries
      for (const scheduleTime of scheduleTimes) {
        // Check if this dose has already been administered
        const matchingAdministration = administrationsInRange.find(a => {
          const adminTime = new Date(a.administeredAt);
          // Consider it a match if within 30 minutes of scheduled time
          return Math.abs(adminTime.getTime() - scheduleTime.getTime()) < 30 * 60 * 1000;
        });

        // Skip completed administrations if not requested
        if (matchingAdministration && matchingAdministration.status === 'completed' && !includeCompleted) {
          continue;
        }

        // Determine status
        let status = 'scheduled';
        if (matchingAdministration) {
          status = matchingAdministration.status;
        } else if (scheduleTime < new Date()) {
          status = 'overdue';
        }

        schedule.push({
          prescriptionId: prescription.id,
          medicationId: medication.id,
          medicationName: medication.name,
          dose: prescription.dosage.value,
          unit: prescription.dosage.unit,
          route: prescription.dosage.route,
          scheduledTime: scheduleTime,
          status,
          administrationId: matchingAdministration?.id,
          administeredAt: matchingAdministration?.administeredAt,
          administeredBy: matchingAdministration?.administeredBy,
          notes: matchingAdministration?.notes
        });
      }
    }

    // Sort by scheduled time
    schedule.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());

    // Audit logging
    await auditLog('MEDICATION_ADMINISTRATION', {
      action: 'SCHEDULE_VIEW',
      resourceType: 'MedicationAdministration',
      userId: userId,
      patientId: patientId,
      details: {
        count: schedule.length,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
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
