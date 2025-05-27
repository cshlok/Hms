/**
 * Mobile Emergency Interface API
 * 
 * This file implements the API endpoints for the mobile-friendly emergency interface,
 * providing optimized access to critical emergency department functions for mobile devices.
 * 
 * Features include offline capabilities, emergency mode, and barcode scanning integration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { logAuditEvent } from '@/lib/audit';
import { hasPermission } from '@/lib/permissions';
import { encryptSensitiveData } from '@/lib/encryption';
import { applyESIAlgorithm } from '@/lib/er/triage-algorithm';

// Validation schema for emergency patient registration
const emergencyRegistrationSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  dateOfBirth: z.string().transform(val => new Date(val)).optional(),
  gender: z.string().optional(),
  mrnNumber: z.string().optional(),
  unidentifiedPatient: z.boolean().optional(),
  chiefComplaint: z.string(),
  arrivalMode: z.string().optional(),
  contactNumber: z.string().optional(),
  emergencyContact: z.object({
    name: z.string(),
    relationship: z.string(),
    contactNumber: z.string(),
  }).optional(),
  vitalSigns: z.object({
    temperature: z.number().optional(),
    heartRate: z.number().optional(),
    respiratoryRate: z.number().optional(),
    systolicBP: z.number().optional(),
    diastolicBP: z.number().optional(),
    oxygenSaturation: z.number().optional(),
    painScore: z.number().min(0).max(10).optional(),
    glucoseLevel: z.number().optional(),
  }).optional(),
  isOfflineEntry: z.boolean().default(false),
  offlineEntryId: z.string().optional(),
  offlineTimestamp: z.string().transform(val => new Date(val)).optional(),
});

/**
 * POST /api/mobile/er/register
 * 
 * Registers a new emergency patient through the mobile interface.
 * Supports offline entry synchronization.
 * 
 * @param request - The incoming request object
 * @returns The newly registered ER visit
 */
export async function POST(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'ER_REGISTER_PATIENT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = emergencyRegistrationSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data', details: validationResult.error.format() }, { status: 400 });
    }
    
    const registrationData = validationResult.data;
    
    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      let patientId;
      
      // Handle unidentified patient
      if (registrationData.unidentifiedPatient) {
        // Generate a temporary MRN for unidentified patient
        const tempMrn = `UNKNOWN-${Date.now().toString().slice(-8)}`;
        
        // Create a new patient record
        const patient = await tx.patient.create({
          data: {
            firstName: 'Unknown',
            lastName: 'Patient',
            mrnNumber: tempMrn,
            isUnidentified: true,
            registeredById: session.user.id,
          },
        });
        
        patientId = patient.id;
      } 
      // Handle identified patient
      else {
        // Check if patient exists by MRN
        let patient = null;
        
        if (registrationData.mrnNumber) {
          patient = await tx.patient.findFirst({
            where: { mrnNumber: registrationData.mrnNumber },
          });
        }
        
        // If patient doesn't exist, create a new one
        if (!patient) {
          if (!registrationData.firstName || !registrationData.lastName) {
            throw new Error('First name and last name are required for new patients');
          }
          
          // Encrypt sensitive data
          const encryptedData = await encryptSensitiveData({
            contactNumber: registrationData.contactNumber,
            emergencyContact: registrationData.emergencyContact ? JSON.stringify(registrationData.emergencyContact) : undefined,
          });
          
          // Create a new patient record
          patient = await tx.patient.create({
            data: {
              firstName: registrationData.firstName,
              lastName: registrationData.lastName,
              dateOfBirth: registrationData.dateOfBirth,
              gender: registrationData.gender,
              mrnNumber: registrationData.mrnNumber || `ER-${Date.now().toString().slice(-8)}`,
              contactNumber: encryptedData.contactNumber,
              emergencyContact: encryptedData.emergencyContact,
              registeredById: session.user.id,
            },
          });
        }
        
        patientId = patient.id;
      }
      
      // Calculate triage category if vital signs are provided
      let triageCategory = 'Pending';
      let triageScore = null;
      
      if (registrationData.vitalSigns) {
        const triageResult = applyESIAlgorithm({
          vitalSigns: registrationData.vitalSigns,
          chiefComplaint: registrationData.chiefComplaint,
        });
        
        triageCategory = triageResult.category;
        triageScore = triageResult.score;
      }
      
      // Create the ER visit
      const erVisit = await tx.erVisit.create({
        data: {
          patientId,
          chiefComplaint: registrationData.chiefComplaint,
          arrivalMode: registrationData.arrivalMode || 'Unknown',
          triageCategory,
          triageScore,
          status: 'Registered',
          registeredById: session.user.id,
          vitalSigns: registrationData.vitalSigns ? JSON.stringify(registrationData.vitalSigns) : null,
          isOfflineEntry: registrationData.isOfflineEntry,
          offlineEntryId: registrationData.offlineEntryId,
          offlineTimestamp: registrationData.offlineTimestamp,
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              dateOfBirth: true,
              gender: true,
              mrnNumber: true,
              isUnidentified: true,
            },
          },
          registeredBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      
      return erVisit;
    });
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'ER_PATIENT_REGISTER_MOBILE',
      'ErVisit',
      result.id,
      { 
        visitId: result.id,
        patientId: result.patientId,
        isOfflineEntry: registrationData.isOfflineEntry,
      }
    );
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error registering emergency patient:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/mobile/er/dashboard
 * 
 * Retrieves the emergency department dashboard data optimized for mobile devices.
 * Includes critical patients, pending triage, and recent arrivals.
 * 
 * @param request - The incoming request object
 * @returns The emergency department dashboard data
 */
export async function GET_dashboard(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'ER_VIEW_DASHBOARD')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get current date for filtering
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get critical patients (ESI 1-2)
    const criticalPatients = await prisma.erVisit.findMany({
      where: {
        triageCategory: {
          in: ['ESI-1', 'ESI-2'],
        },
        status: {
          notIn: ['Discharged', 'Transferred', 'LWBS', 'Expired'],
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
            mrnNumber: true,
            isUnidentified: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { triageCategory: 'asc' },
        { registeredAt: 'asc' },
      ],
    });
    
    // Get patients pending triage
    const pendingTriage = await prisma.erVisit.findMany({
      where: {
        triageCategory: 'Pending',
        status: 'Registered',
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
            mrnNumber: true,
            isUnidentified: true,
          },
        },
      },
      orderBy: {
        registeredAt: 'asc',
      },
    });
    
    // Get recent arrivals (last 4 hours)
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const recentArrivals = await prisma.erVisit.findMany({
      where: {
        registeredAt: {
          gte: fourHoursAgo,
        },
        status: {
          notIn: ['Discharged', 'Transferred', 'LWBS', 'Expired'],
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
            mrnNumber: true,
            isUnidentified: true,
          },
        },
      },
      orderBy: {
        registeredAt: 'desc',
      },
      take: 10,
    });
    
    // Get department statistics
    const totalActive = await prisma.erVisit.count({
      where: {
        status: {
          notIn: ['Discharged', 'Transferred', 'LWBS', 'Expired'],
        },
      },
    });
    
    const todayTotal = await prisma.erVisit.count({
      where: {
        registeredAt: {
          gte: today,
        },
      },
    });
    
    const waitingForBed = await prisma.erVisit.count({
      where: {
        status: 'Pending Admission',
      },
    });
    
    const byCategory = await prisma.erVisit.groupBy({
      by: ['triageCategory'],
      where: {
        status: {
          notIn: ['Discharged', 'Transferred', 'LWBS', 'Expired'],
        },
      },
      _count: {
        id: true,
      },
    });
    
    const categoryStats = byCategory.reduce((acc, curr) => {
      acc[curr.triageCategory] = curr._count.id;
      return acc;
    }, {});
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'ER_DASHBOARD_VIEW_MOBILE',
      'ErVisit',
      null,
      {}
    );
    
    return NextResponse.json({
      criticalPatients,
      pendingTriage,
      recentArrivals,
      stats: {
        totalActive,
        todayTotal,
        waitingForBed,
        byCategory: categoryStats,
      },
      lastUpdated: new Date(),
    });
  } catch (error) {
    console.error('Error fetching ER dashboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Validation schema for rapid triage
const rapidTriageSchema = z.object({
  visitId: z.string().uuid(),
  triageCategory: z.string(),
  vitalSigns: z.object({
    temperature: z.number().optional(),
    heartRate: z.number().optional(),
    respiratoryRate: z.number().optional(),
    systolicBP: z.number().optional(),
    diastolicBP: z.number().optional(),
    oxygenSaturation: z.number().optional(),
    painScore: z.number().min(0).max(10).optional(),
    glucoseLevel: z.number().optional(),
  }).optional(),
  notes: z.string().optional(),
  isOfflineEntry: z.boolean().default(false),
  offlineEntryId: z.string().optional(),
  offlineTimestamp: z.string().transform(val => new Date(val)).optional(),
});

/**
 * POST /api/mobile/er/rapid-triage
 * 
 * Performs rapid triage for an emergency patient through the mobile interface.
 * Supports offline entry synchronization.
 * 
 * @param request - The incoming request object
 * @returns The updated ER visit with triage information
 */
export async function POST_rapid_triage(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'ER_PERFORM_TRIAGE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = rapidTriageSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data', details: validationResult.error.format() }, { status: 400 });
    }
    
    const triageData = validationResult.data;
    
    // Check if the visit exists
    const visit = await prisma.erVisit.findUnique({
      where: { id: triageData.visitId },
    });
    
    if (!visit) {
      return NextResponse.json({ error: 'ER visit not found' }, { status: 404 });
    }
    
    // Update the visit with triage information
    const updatedVisit = await prisma.erVisit.update({
      where: { id: triageData.visitId },
      data: {
        triageCategory: triageData.triageCategory,
        vitalSigns: triageData.vitalSigns ? JSON.stringify(triageData.vitalSigns) : visit.vitalSigns,
        triageNotes: triageData.notes,
        triageTime: new Date(),
        triagedById: session.user.id,
        status: 'Triaged',
        isOfflineEntry: triageData.isOfflineEntry,
        offlineEntryId: triageData.offlineEntryId,
        offlineTimestamp: triageData.offlineTimestamp,
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
            mrnNumber: true,
            isUnidentified: true,
          },
        },
        triagedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    // Create triage record
    await prisma.erTriageRecord.create({
      data: {
        visitId: triageData.visitId,
        triageCategory: triageData.triageCategory,
        vitalSigns: triageData.vitalSigns ? JSON.stringify(triageData.vitalSigns) : null,
        notes: triageData.notes,
        triagedById: session.user.id,
        isOfflineEntry: triageData.isOfflineEntry,
      },
    });
    
    // Check if critical alert is needed
    if (triageData.triageCategory === 'ESI-1' || triageData.triageCategory === 'ESI-2') {
      await prisma.erAlert.create({
        data: {
          visitId: triageData.visitId,
          patientId: visit.patientId,
          alertType: 'Critical Patient',
          alertLevel: 'High',
          message: `Critical patient triaged as ${triageData.triageCategory}`,
          status: 'Active',
          createdById: session.user.id,
        },
      });
    }
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'ER_RAPID_TRIAGE_MOBILE',
      'ErVisit',
      updatedVisit.id,
      { 
        visitId: updatedVisit.id,
        triageCategory: triageData.triageCategory,
        isOfflineEntry: triageData.isOfflineEntry,
      }
    );
    
    return NextResponse.json(updatedVisit);
  } catch (error) {
    console.error('Error performing rapid triage:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/mobile/er/sync-offline-data
 * 
 * Synchronizes offline data collected during network outages.
 * 
 * @param request - The incoming request object
 * @returns Summary of synchronized data
 */
export async function POST_sync_offline(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'ER_SYNC_OFFLINE_DATA')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const body = await request.json();
    const { registrations, triageRecords, vitalSigns } = body;
    
    if (!registrations && !triageRecords && !vitalSigns) {
      return NextResponse.json({ error: 'No data to synchronize' }, { status: 400 });
    }
    
    const results = {
      registrations: {
        total: registrations?.length || 0,
        processed: 0,
        errors: [],
      },
      triageRecords: {
        total: triageRecords?.length || 0,
        processed: 0,
        errors: [],
      },
      vitalSigns: {
        total: vitalSigns?.length || 0,
        processed: 0,
        errors: [],
      },
    };
    
    // Process registrations
    if (registrations && registrations.length > 0) {
      for (const registration of registrations) {
        try {
          // Add offline metadata
          registration.isOfflineEntry = true;
          registration.offlineEntryId = registration.id || registration.offlineId;
          registration.offlineTimestamp = registration.timestamp || new Date();
          
          // Create a new request with this data
          const req = {
            json: () => Promise.resolve(registration),
          } as NextRequest;
          
          await POST(req);
          results.registrations.processed++;
        } catch (error) {
          console.error('Error processing offline registration:', error);
          results.registrations.errors.push({
            id: registration.id || registration.offlineId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }
    
    // Process triage records
    if (triageRecords && triageRecords.length > 0) {
      for (const triage of triageRecords) {
        try {
          // Add offline metadata
          triage.isOfflineEntry = true;
          triage.offlineEntryId = triage.id || triage.offlineId;
          triage.offlineTimestamp = triage.timestamp || new Date();
          
          // Create a new request with this data
          const req = {
            json: () => Promise.resolve(triage),
          } as NextRequest;
          
          await POST_rapid_triage(req);
          results.triageRecords.processed++;
        } catch (error) {
          console.error('Error processing offline triage record:', error);
          results.triageRecords.errors.push({
            id: triage.id || triage.offlineId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }
    
    // Process vital signs
    if (vitalSigns && vitalSigns.length > 0) {
      for (const vitals of vitalSigns) {
        try {
          // Get the visit
          const visit = await prisma.erVisit.findUnique({
            where: { id: vitals.visitId },
          });
          
          if (!visit) {
            throw new Error('ER visit not found');
          }
          
          // Create vital signs record
          await prisma.erVitalSigns.create({
            data: {
              visitId: vitals.visitId,
              vitalSigns: JSON.stringify(vitals.vitalSigns),
              recordedById: session.user.id,
              isOfflineEntry: true,
              offlineEntryId: vitals.id || vitals.offlineId,
              offlineTimestamp: vitals.timestamp ? new Date(vitals.timestamp) : new Date(),
            },
          });
          
          // Update the visit with latest vital signs
          await prisma.erVisit.update({
            where: { id: vitals.visitId },
            data: {
              vitalSigns: JSON.stringify(vitals.vitalSigns),
              lastVitalSignsTime: new Date(),
            },
          });
          
          results.vitalSigns.processed++;
        } catch (error) {
          console.error('Error processing offline vital signs:', error);
          results.vitalSigns.errors.push({
            id: vitals.id || vitals.offlineId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'ER_OFFLINE_DATA_SYNC',
      'System',
      null,
      { 
        registrations: {
          total: results.registrations.total,
          processed: results.registrations.processed,
        },
        triageRecords: {
          total: results.triageRecords.total,
          processed: results.triageRecords.processed,
        },
        vitalSigns: {
          total: results.vitalSigns.total,
          processed: results.vitalSigns.processed,
        },
      }
    );
    
    return NextResponse.json({
      success: true,
      results,
      syncTime: new Date(),
    });
  } catch (error) {
    console.error('Error synchronizing offline data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/mobile/er/barcode-scan
 * 
 * Processes a barcode scan for patient identification or medication verification.
 * 
 * @param request - The incoming request object
 * @returns The scanned data with associated information
 */
export async function POST_barcode_scan(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'ER_SCAN_BARCODES')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const body = await request.json();
    const { barcodeData, scanType } = body;
    
    if (!barcodeData) {
      return NextResponse.json({ error: 'Barcode data is required' }, { status: 400 });
    }
    
    let result;
    
    // Process based on scan type
    switch (scanType) {
      case 'patient':
        // Try to find patient by MRN (assuming barcode contains MRN)
        const patient = await prisma.patient.findFirst({
          where: { mrnNumber: barcodeData },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
            mrnNumber: true,
            isUnidentified: true,
          },
        });
        
        if (!patient) {
          return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
        }
        
        // Get active ER visit if exists
        const activeVisit = await prisma.erVisit.findFirst({
          where: {
            patientId: patient.id,
            status: {
              notIn: ['Discharged', 'Transferred', 'LWBS', 'Expired'],
            },
          },
          orderBy: {
            registeredAt: 'desc',
          },
        });
        
        result = {
          scanType: 'patient',
          patient,
          activeVisit,
        };
        break;
        
      case 'medication':
        // Try to find medication by barcode
        const medication = await prisma.medication.findFirst({
          where: { barcode: barcodeData },
        });
        
        if (!medication) {
          return NextResponse.json({ error: 'Medication not found' }, { status: 404 });
        }
        
        result = {
          scanType: 'medication',
          medication,
        };
        break;
        
      case 'wristband':
        // Process wristband which may contain encoded patient info
        // Format: WB-{patientId}-{visitId}
        const parts = barcodeData.split('-');
        if (parts.length !== 3 || parts[0] !== 'WB') {
          return NextResponse.json({ error: 'Invalid wristband format' }, { status: 400 });
        }
        
        const patientId = parts[1];
        const visitId = parts[2];
        
        const wristbandPatient = await prisma.patient.findUnique({
          where: { id: patientId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
            mrnNumber: true,
            isUnidentified: true,
          },
        });
        
        const wristbandVisit = await prisma.erVisit.findUnique({
          where: { id: visitId },
        });
        
        if (!wristbandPatient || !wristbandVisit) {
          return NextResponse.json({ error: 'Patient or visit not found' }, { status: 404 });
        }
        
        result = {
          scanType: 'wristband',
          patient: wristbandPatient,
          visit: wristbandVisit,
        };
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid scan type' }, { status: 400 });
    }
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'ER_BARCODE_SCAN_MOBILE',
      'System',
      null,
      { 
        scanType,
        patientId: result.patient?.id,
        visitId: result.activeVisit?.id || result.visit?.id,
        medicationId: result.medication?.id,
      }
    );
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing barcode scan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
