/**
 * Emergency Department Alerts API
 * 
 * This file implements the API endpoints for managing critical alerts for emergency department visits.
 * 
 * FHIR Compliance: Uses Communication and Flag resources for alerts
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { logAuditEvent } from '@/lib/audit';
import { hasPermission } from '@/lib/permissions';
import { sendNotification } from '@/lib/notifications';

// Validation schema for creating an alert
const createAlertSchema = z.object({
  erVisitId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  alertTypeId: z.string().uuid(),
  location: z.string(),
  reason: z.string(),
  notes: z.string().optional(),
  isDrill: z.boolean().optional().default(false),
  recipientIds: z.array(z.string().uuid()).optional(),
});

/**
 * POST /api/er/visits/[id]/alerts
 * 
 * Creates a new critical alert for a specific emergency department visit.
 * 
 * @param request - The incoming request object
 * @param params - The route parameters containing the visit ID
 * @returns The newly created critical alert
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'ER_CREATE_ALERT')) {
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
    const validationResult = createAlertSchema.safeParse({
      ...body,
      erVisitId: id,
      patientId: existingVisit.patientId,
    });

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data', details: validationResult.error.format() }, { status: 400 });
    }

    const { erVisitId, patientId, alertTypeId, location, reason, notes, isDrill, recipientIds } = validationResult.data;

    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Get alert type details
      const alertType = await tx.alertType.findUnique({
        where: { id: alertTypeId },
      });

      if (!alertType) {
        throw new Error('Alert type not found');
      }

      // Create the alert
      const alert = await tx.criticalAlert.create({
        data: {
          erVisitId,
          patientId,
          alertTypeId,
          status: 'Active',
          location,
          activatedById: session.user.id,
          reason,
          notes,
          isDrill,
        },
        include: {
          alertTypeRef: true,
          activatedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Determine recipients based on alert type and provided recipients
      let recipients = [];
      
      if (recipientIds && recipientIds.length > 0) {
        // Use provided recipients
        recipients = await tx.user.findMany({
          where: {
            id: {
              in: recipientIds,
            },
          },
        });
      } else {
        // Use default recipients based on alert type
        recipients = await tx.user.findMany({
          where: {
            roles: {
              some: {
                name: alertType.responseTeam,
              },
            },
          },
        });
      }

      // Create notifications for each recipient
      const notifications = [];
      for (const recipient of recipients) {
        const notification = await tx.alertNotification.create({
          data: {
            alertId: alert.id,
            recipientId: recipient.id,
            medium: 'App', // Default to app notification
            status: 'Sent',
          },
        });
        
        notifications.push(notification);
        
        // Send actual notification through notification service
        await sendNotification({
          userId: recipient.id,
          title: `${alertType.name} Alert`,
          body: `${alertType.name} alert activated for patient in ${location}. Reason: ${reason}`,
          data: {
            alertId: alert.id,
            erVisitId,
            patientId,
          },
          priority: 'high',
        });
      }

      return { alert, notifications };
    });

    // Log audit event
    await logAuditEvent(
      session.user.id,
      'ER_ALERT_CREATE',
      'CriticalAlert',
      result.alert.id,
      { 
        alertId: result.alert.id,
        erVisitId: id,
        patientId: existingVisit.patientId,
        alertType: result.alert.alertTypeRef.name,
        isDrill,
        notificationCount: result.notifications.length,
      }
    );

    return NextResponse.json(result.alert, { status: 201 });
  } catch (error) {
    console.error('Error creating critical alert:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/er/visits/[id]/alerts
 * 
 * Retrieves all critical alerts for a specific emergency department visit.
 * 
 * @param request - The incoming request object
 * @param params - The route parameters containing the visit ID
 * @returns A list of critical alerts for the emergency department visit
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'ER_VIEW_ALERTS')) {
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

    // Fetch alerts for the visit
    const alerts = await prisma.criticalAlert.findMany({
      where: {
        erVisitId: id,
      },
      include: {
        alertTypeRef: true,
        activatedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        respondedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        resolvedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        notifications: {
          include: {
            recipient: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        escalations: {
          include: {
            escalatedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        activatedAt: 'desc',
      },
    });

    // Log audit event
    await logAuditEvent(
      session.user.id,
      'ER_ALERTS_VIEW',
      'ErVisit',
      id,
      { visitId: id }
    );

    return NextResponse.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Validation schema for updating an alert
const updateAlertSchema = z.object({
  status: z.enum(['Active', 'Responded', 'Resolved', 'Cancelled']).optional(),
  notes: z.string().optional(),
  outcome: z.string().optional(),
});

/**
 * PUT /api/er/visits/[id]/alerts/[alertId]
 * 
 * Updates a specific critical alert for an emergency department visit.
 * 
 * @param request - The incoming request object
 * @param params - The route parameters containing the visit ID and alert ID
 * @returns The updated critical alert
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; alertId: string } }
) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'ER_UPDATE_ALERT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, alertId } = params;

    // Check if the visit exists
    const existingVisit = await prisma.erVisit.findUnique({
      where: { id },
    });

    if (!existingVisit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    // Check if the alert exists and belongs to the visit
    const existingAlert = await prisma.criticalAlert.findFirst({
      where: {
        id: alertId,
        erVisitId: id,
      },
    });

    if (!existingAlert) {
      return NextResponse.json({ error: 'Alert not found for this visit' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateAlertSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data', details: validationResult.error.format() }, { status: 400 });
    }

    const { status, notes, outcome } = validationResult.data;

    // Prepare update data
    const updateData: any = {};
    
    if (notes !== undefined) {
      updateData.notes = notes;
    }
    
    if (outcome !== undefined) {
      updateData.outcome = outcome;
    }
    
    if (status !== undefined) {
      updateData.status = status;
      
      // Add status-specific fields
      if (status === 'Responded' && existingAlert.status === 'Active') {
        updateData.respondedAt = new Date();
        updateData.respondedById = session.user.id;
        updateData.responseTime = Math.floor((Date.now() - existingAlert.activatedAt.getTime()) / 1000); // Response time in seconds
      } else if (status === 'Resolved' && (existingAlert.status === 'Active' || existingAlert.status === 'Responded')) {
        updateData.resolvedAt = new Date();
        updateData.resolvedById = session.user.id;
      }
    }

    // Update the alert
    const updatedAlert = await prisma.criticalAlert.update({
      where: { id: alertId },
      data: updateData,
      include: {
        alertTypeRef: true,
        activatedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        respondedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        resolvedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Log audit event
    await logAuditEvent(
      session.user.id,
      'ER_ALERT_UPDATE',
      'CriticalAlert',
      alertId,
      { 
        alertId,
        erVisitId: id,
        previousStatus: existingAlert.status,
        newStatus: updatedAlert.status,
      }
    );

    return NextResponse.json(updatedAlert);
  } catch (error) {
    console.error('Error updating alert:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Validation schema for escalating an alert
const escalateAlertSchema = z.object({
  reason: z.string(),
  escalationLevel: z.number().int().min(1),
  recipientIds: z.array(z.string().uuid()),
});

/**
 * POST /api/er/visits/[id]/alerts/[alertId]/escalate
 * 
 * Escalates a specific critical alert for an emergency department visit.
 * 
 * @param request - The incoming request object
 * @param params - The route parameters containing the visit ID and alert ID
 * @returns The escalation details
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; alertId: string; action: string } }
) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'ER_ESCALATE_ALERT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, alertId, action } = params;

    // Check if the action is supported
    if (action !== 'escalate') {
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
    }

    // Check if the visit exists
    const existingVisit = await prisma.erVisit.findUnique({
      where: { id },
    });

    if (!existingVisit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    // Check if the alert exists and belongs to the visit
    const existingAlert = await prisma.criticalAlert.findFirst({
      where: {
        id: alertId,
        erVisitId: id,
      },
    });

    if (!existingAlert) {
      return NextResponse.json({ error: 'Alert not found for this visit' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = escalateAlertSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data', details: validationResult.error.format() }, { status: 400 });
    }

    const { reason, escalationLevel, recipientIds } = validationResult.data;

    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create the escalation
      const escalation = await tx.alertEscalation.create({
        data: {
          alertId,
          escalatedById: session.user.id,
          escalationLevel,
          reason,
        },
        include: {
          escalatedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Get recipients
      const recipients = await tx.user.findMany({
        where: {
          id: {
            in: recipientIds,
          },
        },
      });

      // Create notifications for each recipient
      const notifications = [];
      for (const recipient of recipients) {
        const notification = await tx.alertNotification.create({
          data: {
            alertId,
            recipientId: recipient.id,
            medium: 'App', // Default to app notification
            status: 'Sent',
          },
        });
        
        notifications.push(notification);
        
        // Send actual notification through notification service
        await sendNotification({
          userId: recipient.id,
          title: `ESCALATED: ${existingAlert.alertTypeRef?.name || 'Critical'} Alert`,
          body: `Escalated alert (Level ${escalationLevel}) for patient in ${existingAlert.location}. Reason: ${reason}`,
          data: {
            alertId,
            erVisitId: id,
            patientId: existingAlert.patientId,
            escalationId: escalation.id,
          },
          priority: 'high',
        });
      }

      // Connect recipients to escalation
      await tx.alertEscalation.update({
        where: { id: escalation.id },
        data: {
          newRecipients: {
            connect: recipientIds.map(id => ({ id })),
          },
        },
      });

      return { escalation, notifications };
    });

    // Log audit event
    await logAuditEvent(
      session.user.id,
      'ER_ALERT_ESCALATE',
      'CriticalAlert',
      alertId,
      { 
        alertId,
        erVisitId: id,
        escalationId: result.escalation.id,
        escalationLevel,
        recipientCount: recipientIds.length,
      }
    );

    return NextResponse.json(result.escalation, { status: 201 });
  } catch (error) {
    console.error('Error escalating alert:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
