/**
 * Emergency Department Triage API
 * 
 * This file implements the API endpoints for managing triage information for a specific
 * emergency department visit.
 * 
 * FHIR Compliance: Uses Encounter resource structure with extensions for triage data
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { logAuditEvent } from '@/lib/audit';
import { hasPermission } from '@/lib/permissions';
import { calculateESIScore } from '@/lib/triage/esi-algorithm';

// Validation schema for triage data
const triageSchema = z.object({
  triageCategory: z.string(), // ESI 1-5 or similar
  triageNotes: z.string().optional(),
  vitalSigns: z.object({
    temperature: z.number().optional(),
    temperatureUnit: z.string().optional().default('C'),
    heartRate: z.number().optional(),
    respiratoryRate: z.number().optional(),
    systolicBP: z.number().optional(),
    diastolicBP: z.number().optional(),
    oxygenSaturation: z.number().optional(),
    oxygenDevice: z.string().optional(),
    painScore: z.number().optional(),
    consciousness: z.string().optional(), // AVPU or GCS
  }).optional(),
  chiefComplaint: z.string().optional(),
  isHighRisk: z.boolean().optional(),
  resourcesNeeded: z.number().optional(), // Number of different resources needed
});

/**
 * POST /api/er/visits/[id]/triage
 * 
 * Records triage information for a specific emergency department visit.
 * 
 * @param request - The incoming request object
 * @param params - The route parameters containing the visit ID
 * @returns The updated emergency department visit with triage information
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'ER_PERFORM_TRIAGE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Check if the visit exists
    const existingVisit = await prisma.erVisit.findUnique({
      where: { id },
      include: {
        patient: true,
      },
    });

    if (!existingVisit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = triageSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data', details: validationResult.error.format() }, { status: 400 });
    }

    const { triageCategory, triageNotes, vitalSigns, chiefComplaint, isHighRisk, resourcesNeeded } = validationResult.data;

    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Update the visit with triage information
      const updatedVisit = await tx.erVisit.update({
        where: { id },
        data: {
          triageCategory,
          triageNotes,
          triageDateTime: new Date(),
          chiefComplaint: chiefComplaint || existingVisit.chiefComplaint,
          status: 'Triaged', // Update status to reflect triage completion
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              dateOfBirth: true,
            },
          },
        },
      });

      // Record vital signs if provided
      if (vitalSigns) {
        await tx.erVitalSign.create({
          data: {
            erVisitId: id,
            recordedById: session.user.id,
            ...vitalSigns,
          },
        });
      }

      // Check for critical conditions based on triage category and vital signs
      let alertCreated = null;
      if (triageCategory === 'ESI-1' || (vitalSigns && isVitalSignCritical(vitalSigns))) {
        // Create a critical alert
        alertCreated = await tx.criticalAlert.create({
          data: {
            erVisitId: id,
            patientId: existingVisit.patientId,
            alertTypeId: await getEmergencyAlertTypeId(tx),
            status: 'Active',
            location: 'Emergency Department',
            activatedById: session.user.id,
            reason: `Critical patient: ${triageCategory} triage category`,
            notes: triageNotes || '',
          },
        });

        // Notify the emergency response team
        await notifyEmergencyTeam(tx, alertCreated.id, existingVisit.patientId, session.user.id);
      }

      return { updatedVisit, alertCreated };
    });

    // Log audit event
    await logAuditEvent(
      session.user.id,
      'ER_TRIAGE_PERFORM',
      'ErVisit',
      id,
      { 
        visitId: id,
        triageCategory,
        vitalSigns: vitalSigns ? true : false,
        alertCreated: result.alertCreated ? result.alertCreated.id : null
      }
    );

    return NextResponse.json({
      visit: result.updatedVisit,
      alertCreated: result.alertCreated,
    });
  } catch (error) {
    console.error('Error performing triage:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/er/visits/[id]/triage
 * 
 * Retrieves triage information for a specific emergency department visit.
 * 
 * @param request - The incoming request object
 * @param params - The route parameters containing the visit ID
 * @returns Triage information for the emergency department visit
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'ER_VIEW_TRIAGE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Fetch the visit with triage information
    const visit = await prisma.erVisit.findUnique({
      where: { id },
      select: {
        id: true,
        triageCategory: true,
        triageNotes: true,
        triageDateTime: true,
        chiefComplaint: true,
        vitalSigns: {
          orderBy: {
            recordedAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    // Log audit event
    await logAuditEvent(
      session.user.id,
      'ER_TRIAGE_VIEW',
      'ErVisit',
      id,
      { visitId: id }
    );

    return NextResponse.json(visit);
  } catch (error) {
    console.error('Error fetching triage information:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/er/visits/[id]/triage
 * 
 * Updates triage information for a specific emergency department visit.
 * 
 * @param request - The incoming request object
 * @param params - The route parameters containing the visit ID
 * @returns The updated emergency department visit with triage information
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'ER_UPDATE_TRIAGE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Check if the visit exists
    const existingVisit = await prisma.erVisit.findUnique({
      where: { id },
    });

    if (!existingVisit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = triageSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data', details: validationResult.error.format() }, { status: 400 });
    }

    const { triageCategory, triageNotes, vitalSigns } = validationResult.data;

    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Update the visit with triage information
      const updatedVisit = await tx.erVisit.update({
        where: { id },
        data: {
          triageCategory,
          triageNotes,
          // Don't update triageDateTime as this is an update, not initial triage
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              dateOfBirth: true,
            },
          },
        },
      });

      // Record new vital signs if provided
      if (vitalSigns) {
        await tx.erVitalSign.create({
          data: {
            erVisitId: id,
            recordedById: session.user.id,
            ...vitalSigns,
          },
        });
      }

      return { updatedVisit };
    });

    // Log audit event
    await logAuditEvent(
      session.user.id,
      'ER_TRIAGE_UPDATE',
      'ErVisit',
      id,
      { 
        visitId: id,
        triageCategory,
        vitalSigns: vitalSigns ? true : false,
      }
    );

    return NextResponse.json(result.updatedVisit);
  } catch (error) {
    console.error('Error updating triage information:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Helper function to check if vital signs are critical
 * 
 * @param vitalSigns - The vital signs to check
 * @returns Whether the vital signs are critical
 */
function isVitalSignCritical(vitalSigns: any): boolean {
  // Check for critical vital signs based on medical guidelines
  if (vitalSigns.heartRate && (vitalSigns.heartRate > 130 || vitalSigns.heartRate < 50)) {
    return true;
  }
  
  if (vitalSigns.respiratoryRate && (vitalSigns.respiratoryRate > 30 || vitalSigns.respiratoryRate < 8)) {
    return true;
  }
  
  if (vitalSigns.systolicBP && (vitalSigns.systolicBP > 180 || vitalSigns.systolicBP < 90)) {
    return true;
  }
  
  if (vitalSigns.oxygenSaturation && vitalSigns.oxygenSaturation < 90) {
    return true;
  }
  
  if (vitalSigns.temperature && (vitalSigns.temperature > 39.5 || vitalSigns.temperature < 35)) {
    return true;
  }
  
  if (vitalSigns.consciousness && vitalSigns.consciousness !== 'A') { // Not alert (AVPU scale)
    return true;
  }
  
  return false;
}

/**
 * Helper function to get the emergency alert type ID
 * 
 * @param tx - The Prisma transaction
 * @returns The ID of the emergency alert type
 */
async function getEmergencyAlertTypeId(tx: any): Promise<string> {
  const alertType = await tx.alertType.findFirst({
    where: {
      code: 'EMERGENCY',
    },
  });
  
  if (!alertType) {
    // Create the alert type if it doesn't exist
    const newAlertType = await tx.alertType.create({
      data: {
        code: 'EMERGENCY',
        name: 'Emergency',
        description: 'Critical emergency requiring immediate attention',
        color: '#FF0000',
        responseTeam: 'Emergency Response Team',
        responseTimeTarget: 60, // 60 seconds
      },
    });
    
    return newAlertType.id;
  }
  
  return alertType.id;
}

/**
 * Helper function to notify the emergency team
 * 
 * @param tx - The Prisma transaction
 * @param alertId - The ID of the alert
 * @param patientId - The ID of the patient
 * @param userId - The ID of the user who activated the alert
 */
async function notifyEmergencyTeam(tx: any, alertId: string, patientId: string, userId: string): Promise<void> {
  // Get emergency team members
  const emergencyTeam = await tx.user.findMany({
    where: {
      roles: {
        some: {
          name: 'EMERGENCY_TEAM',
        },
      },
    },
  });
  
  // Create notifications for each team member
  for (const member of emergencyTeam) {
    await tx.alertNotification.create({
      data: {
        alertId,
        recipientId: member.id,
        medium: 'App', // App notification
        status: 'Sent',
      },
    });
    
    // Additional notifications could be sent via SMS, email, etc.
  }
}
