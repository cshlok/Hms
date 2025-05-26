/**
 * Due Medications API Routes
 * 
 * This file implements the API endpoints for retrieving medications due for administration
 * with filtering and alerting capabilities.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auditLog } from '../../../../../lib/audit';
import { errorHandler } from '../../../../../lib/error-handler';
import { PharmacyDomain } from '../../../models/domain-models';
import { FHIRMapper } from '../../../models/fhir-mappers';
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
  findByPatientId: (patientId: string) => Promise.resolve([]),
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
  findDue: (timeWindow: number) => Promise.resolve([]),
  save: (administration) => Promise.resolve(administration.id || 'new-id'),
  update: () => Promise.resolve(true),
  delete: () => Promise.resolve(true)
};

/**
 * GET /api/pharmacy/administration/due
 * List medications due for administration within a specified time window
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
    const timeWindow = parseInt(url.searchParams.get('timeWindow') || '60', 10); // Default to 60 minutes
    const locationId = url.searchParams.get('locationId');
    const patientId = url.searchParams.get('patientId');
    const unitId = url.searchParams.get('unitId');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);

    // Get current time
    const now = new Date();
    
    // Calculate time window boundaries
    const startTime = new Date(now);
    const endTime = new Date(now);
    endTime.setMinutes(endTime.getMinutes() + timeWindow);

    // Get active prescriptions
    let activePrescriptions = [];
    if (patientId) {
      // If patient ID is provided, get prescriptions for that patient
      activePrescriptions = await prescriptionRepository.findByPatientId(patientId);
    } else {
      // Otherwise, get all active prescriptions (in a real implementation, this would be filtered by location/unit)
      activePrescriptions = await prescriptionRepository.findByStatus('active');
    }

    // Filter active prescriptions
    activePrescriptions = activePrescriptions.filter(p => p.isActive());

    // Generate due administrations
    const dueAdministrations = [];
    
    for (const prescription of activePrescriptions) {
      // Skip PRN medications
      if (prescription.dosage.frequency.includes('PRN') || prescription.dosage.frequency.includes('as needed')) {
        continue;
      }
      
      // Get medication
      const medication = await medicationRepository.findById(prescription.medicationId);
      if (!medication) continue;
      
      // Get previous administrations for this prescription
      const previousAdministrations = await administrationRepository.findByPrescriptionId(prescription.id);
      
      // Generate schedule times
      const frequency = prescription.dosage.frequency;
      const scheduleTimes = generateScheduleTimes(frequency, startTime, endTime);
      
      for (const scheduleTime of scheduleTimes) {
        // Check if this dose has already been administered
        const isAdministered = previousAdministrations.some(a => {
          const adminTime = new Date(a.administeredAt);
          // Consider it administered if within 30 minutes of scheduled time
          return Math.abs(adminTime.getTime() - scheduleTime.getTime()) < 30 * 60 * 1000;
        });
        
        // Skip if already administered
        if (isAdministered) continue;
        
        // Add to due administrations
        dueAdministrations.push({
          prescriptionId: prescription.id,
          patientId: prescription.patientId,
          medicationId: medication.id,
          medicationName: medication.name,
          dose: prescription.dosage.value,
          unit: prescription.dosage.unit,
          route: prescription.dosage.route,
          scheduledTime: scheduleTime,
          status: 'due'
        });
      }
    }
    
    // Sort by scheduled time
    dueAdministrations.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
    
    // Apply pagination
    const total = dueAdministrations.length;
    const paginatedAdministrations = dueAdministrations.slice((page - 1) * limit, page * limit);

    // Map to FHIR resources (in a real implementation)
    // const fhirAdministrations = paginatedAdministrations.map(FHIRMapper.toFHIRMedicationAdministration);

    // Audit logging
    await auditLog('MEDICATION_ADMINISTRATION', {
      action: 'LIST_DUE',
      resourceType: 'MedicationAdministration',
      userId: userId,
      details: {
        timeWindow,
        locationId,
        patientId,
        unitId,
        resultCount: paginatedAdministrations.length
      }
    });

    // Return response
    return NextResponse.json({ 
      dueAdministrations: paginatedAdministrations,
      timeWindow: {
        start: startTime,
        end: endTime
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, { status: 200 });
  } catch (error) {
    return errorHandler(error, 'Error retrieving due medications');
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
    if (time >= start && time <= end) {
      times.push(time);
    }
  } else if (frequency.includes('twice daily') || frequency.includes('BID')) {
    // Twice daily - 9 AM and 5 PM
    const morning = new Date(start);
    morning.setHours(9, 0, 0, 0);
    if (morning >= start && morning <= end) {
      times.push(morning);
    }
    
    const evening = new Date(start);
    evening.setHours(17, 0, 0, 0);
    if (evening >= start && evening <= end) {
      times.push(evening);
    }
  } else if (frequency.includes('three times daily') || frequency.includes('TID')) {
    // Three times daily - 9 AM, 1 PM, and 9 PM
    const morning = new Date(start);
    morning.setHours(9, 0, 0, 0);
    if (morning >= start && morning <= end) {
      times.push(morning);
    }
    
    const afternoon = new Date(start);
    afternoon.setHours(13, 0, 0, 0);
    if (afternoon >= start && afternoon <= end) {
      times.push(afternoon);
    }
    
    const evening = new Date(start);
    evening.setHours(21, 0, 0, 0);
    if (evening >= start && evening <= end) {
      times.push(evening);
    }
  } else if (frequency.includes('four times daily') || frequency.includes('QID')) {
    // Four times daily - 9 AM, 1 PM, 5 PM, and 9 PM
    const morning = new Date(start);
    morning.setHours(9, 0, 0, 0);
    if (morning >= start && morning <= end) {
      times.push(morning);
    }
    
    const noon = new Date(start);
    noon.setHours(13, 0, 0, 0);
    if (noon >= start && noon <= end) {
      times.push(noon);
    }
    
    const afternoon = new Date(start);
    afternoon.setHours(17, 0, 0, 0);
    if (afternoon >= start && afternoon <= end) {
      times.push(afternoon);
    }
    
    const evening = new Date(start);
    evening.setHours(21, 0, 0, 0);
    if (evening >= start && evening <= end) {
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
      
      while (time <= end) {
        if (time >= start) {
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
    if (time >= start && time <= end) {
      times.push(time);
    }
  }
  
  return times;
}
