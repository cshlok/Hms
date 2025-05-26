/**
 * Dispensing API Routes
 * 
 * This file implements the FHIR-compliant API endpoints for medication dispensing
 * following enterprise-grade requirements for security, validation, and error handling.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateDispensingRequest } from '../../../../lib/validation/pharmacy-validation';
import { auditLog } from '../../../../lib/audit';
import { errorHandler } from '../../../../lib/error-handler';
import { encryptionService } from '../../../../lib/security.service';
import { PharmacyDomain } from '../../models/domain-models';
import { FHIRMapper } from '../../models/fhir-mappers';
import { getMedicationById, getPrescriptionById } from '../../../../lib/services/pharmacy/pharmacy.service';
import { getPatientById } from '../../../../lib/services/patient/patient.service';

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
  findAll: () => Promise.resolve([]),
  save: (dispensing: any) => Promise.resolve(dispensing.id || 'new-id'),
  update: () => Promise.resolve(true),
  delete: () => Promise.resolve(true)
};

const inventoryRepository = {
  findById: (id: string) => Promise.resolve(null),
  findByLocationId: (locationId: string) => Promise.resolve([]),
  findByMedicationId: (medicationId: string) => Promise.resolve([]),
  adjustStock: (inventoryId: string, newQuantity: number) => Promise.resolve(true)
};

/**
 * GET /api/pharmacy/dispensing
 * List medication dispensing records with filtering and pagination
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
    const prescriptionId = url.searchParams.get('prescriptionId');
    const status = url.searchParams.get('status');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);

    // Build filter criteria
    const filter: any = {};
    if (patientId) filter.patientId = patientId;
    if (prescriptionId) filter.prescriptionId = prescriptionId;
    if (status) filter.status = status;
    
    // Add date range if provided
    if (startDate || endDate) {
      filter.dispensedAt = {};
      if (startDate) filter.dispensedAt.gte = new Date(startDate);
      if (endDate) filter.dispensedAt.lte = new Date(endDate);
    }

    // Get dispensing records (mock implementation)
    const dispensingRecords = await dispensingRepository.findAll();
    
    // Apply filters
    let filteredRecords = dispensingRecords;
    if (patientId) {
      filteredRecords = filteredRecords.filter(d => d.patientId === patientId);
    }
    if (prescriptionId) {
      filteredRecords = filteredRecords.filter(d => d.prescriptionId === prescriptionId);
    }
    if (status) {
      filteredRecords = filteredRecords.filter(d => d.status === status);
    }
    
    const total = filteredRecords.length;

    // Apply pagination
    const paginatedRecords = filteredRecords.slice((page - 1) * limit, page * limit);

    // Map to FHIR resources
    const fhirDispensingRecords = paginatedRecords.map(FHIRMapper.toFHIRMedicationDispense);

    // Audit logging
    await auditLog('DISPENSING', {
      action: 'LIST',
      resourceType: 'MedicationDispense',
      userId: userId,
      details: {
        filter,
        page,
        limit,
        resultCount: paginatedRecords.length
      }
    });

    // Return response
    return NextResponse.json({ 
      dispensingRecords: fhirDispensingRecords,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, { status: 200 });
  } catch (error) {
    return errorHandler(error, 'Error retrieving dispensing records');
  }
}

/**
 * POST /api/pharmacy/dispensing
 * Create a new medication dispensing record
 */
export async function POST(req: NextRequest) {
  try {
    // Validate request
    const data = await req.json();
    const validationResult = validateDispensingRequest(data);
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

    // Verify patient exists
    const patient = await getPatientById(prescription.patientId);
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Check inventory availability
    const inventoryItems = await inventoryRepository.findByMedicationId(prescription.medicationId);
    const availableInventory = inventoryItems.find(item => 
      item.quantityOnHand >= data.quantityDispensed && 
      (!item.expiryDate || new Date(item.expiryDate) > new Date())
    );

    if (!availableInventory) {
      return NextResponse.json(
        { error: 'Insufficient inventory available' },
        { status: 400 }
      );
    }

    // Create dispensing record
    const dispensing = {
      id: data.id || crypto.randomUUID(),
      prescriptionId: data.prescriptionId,
      patientId: prescription.patientId,
      medicationId: prescription.medicationId,
      inventoryId: availableInventory.id,
      quantityDispensed: data.quantityDispensed,
      daysSupply: data.daysSupply,
      dispensedBy: userId,
      dispensedAt: new Date(),
      status: data.status || 'completed',
      notes: data.notes || '',
      location: data.location || 'main-pharmacy',
      dispensingType: data.dispensingType || 'outpatient'
    };

    // Special handling for controlled substances
    if (medication.isControlled) {
      // Encrypt controlled substance data
      dispensing.controlledSubstanceData = await encryptionService.encrypt(
        JSON.stringify({
          witnessId: data.witnessId,
          lockboxNumber: data.lockboxNumber,
          wastage: data.wastage || 0
        })
      );

      // Additional logging for controlled substances
      await auditLog('CONTROLLED_SUBSTANCE', {
        action: 'DISPENSE',
        resourceType: 'MedicationDispense',
        userId: userId,
        patientId: prescription.patientId,
        details: {
          medicationId: prescription.medicationId,
          prescriptionId: data.prescriptionId,
          quantity: data.quantityDispensed,
          witnessId: data.witnessId
        }
      });
    }

    // Save dispensing record
    const dispensingId = await dispensingRepository.save(dispensing);

    // Update inventory
    await inventoryRepository.adjustStock(
      availableInventory.id,
      availableInventory.quantityOnHand - data.quantityDispensed
    );

    // Regular audit logging
    await auditLog('DISPENSING', {
      action: 'CREATE',
      resourceType: 'MedicationDispense',
      resourceId: dispensingId,
      userId: userId,
      patientId: prescription.patientId,
      details: {
        medicationId: prescription.medicationId,
        prescriptionId: data.prescriptionId,
        quantity: data.quantityDispensed,
        location: data.location
      }
    });

    // Return response
    return NextResponse.json(
      { 
        id: dispensingId,
        message: 'Medication dispensed successfully' 
      }, 
      { status: 201 }
    );
  } catch (error) {
    return errorHandler(error, 'Error dispensing medication');
  }
}
