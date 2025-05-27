/**
 * Emergency Department to Operation Theatre Integration API
 * 
 * This file implements the API endpoints for integrating Emergency Department
 * and Operation Theatre modules, enabling seamless patient transfers and
 * emergency surgical scheduling.
 * 
 * FHIR Compliance: Uses Encounter, ServiceRequest, and Appointment resources
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { logAuditEvent } from '@/lib/audit';
import { hasPermission } from '@/lib/permissions';
import { checkScheduleConflicts } from '@/lib/ot/scheduling';
import { notifyTeam } from '@/lib/notifications';

// Validation schema for emergency surgical booking
const emergencySurgicalBookingSchema = z.object({
  erVisitId: z.string().uuid(),
  surgeryTypeId: z.string().uuid(),
  roomId: z.string().uuid(),
  teamId: z.string().uuid(),
  scheduledStart: z.string().transform(val => new Date(val)),
  estimatedDuration: z.number().int().positive(),
  priority: z.enum(['Urgent', 'Emergency']).default('Emergency'),
  clinicalJustification: z.string(),
  notes: z.string().optional(),
});

/**
 * POST /api/integration/er-ot/emergency-booking
 * 
 * Creates an emergency surgical booking from the Emergency Department.
 * 
 * @param request - The incoming request object
 * @returns The newly created operation theatre booking with conflict information
 */
export async function POST(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'ER_OT_CREATE_EMERGENCY_BOOKING')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = emergencySurgicalBookingSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data', details: validationResult.error.format() }, { status: 400 });
    }
    
    const bookingData = validationResult.data;
    
    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Check if the ER visit exists
      const erVisit = await tx.erVisit.findUnique({
        where: { id: bookingData.erVisitId },
        include: {
          patient: true,
        },
      });
      
      if (!erVisit) {
        throw new Error('ER visit not found');
      }
      
      // Calculate scheduled end time
      const scheduledEnd = new Date(bookingData.scheduledStart);
      scheduledEnd.setMinutes(scheduledEnd.getMinutes() + bookingData.estimatedDuration);
      
      // Check for scheduling conflicts
      const conflicts = await checkScheduleConflicts({
        roomId: bookingData.roomId,
        teamId: bookingData.teamId,
        scheduledStart: bookingData.scheduledStart,
        scheduledEnd,
        priority: bookingData.priority,
      });
      
      // Create the OT booking
      const booking = await tx.otSchedule.create({
        data: {
          patientId: erVisit.patientId,
          surgeryTypeId: bookingData.surgeryTypeId,
          roomId: bookingData.roomId,
          teamId: bookingData.teamId,
          scheduledStart: bookingData.scheduledStart,
          scheduledEnd,
          priority: bookingData.priority,
          notes: bookingData.notes,
          status: 'Scheduled',
          erVisitId: bookingData.erVisitId,
          clinicalJustification: bookingData.clinicalJustification,
          requestedById: session.user.id,
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
          surgeryType: true,
          room: true,
          team: {
            include: {
              leadSurgeon: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          erVisit: {
            select: {
              id: true,
              chiefComplaint: true,
              triageCategory: true,
            },
          },
        },
      });
      
      // Update ER visit status
      await tx.erVisit.update({
        where: { id: bookingData.erVisitId },
        data: {
          status: 'Pending Surgery',
          disposition: 'Surgery',
        },
      });
      
      // If there are conflicts, handle them based on priority
      if (conflicts.hasConflicts) {
        // For emergency cases, reschedule affected bookings
        if (bookingData.priority === 'Emergency') {
          for (const conflict of conflicts.details) {
            // Update affected booking status
            await tx.otSchedule.update({
              where: { id: conflict.bookingId },
              data: {
                status: 'Rescheduled',
                notes: `${conflict.booking.notes || ''}\nRescheduled due to emergency case.`,
              },
            });
            
            // Notify affected teams
            await notifyTeam({
              teamId: conflict.booking.teamId,
              title: 'Booking Rescheduled',
              message: `Booking for ${conflict.booking.patient.firstName} ${conflict.booking.patient.lastName} has been rescheduled due to an emergency case.`,
              priority: 'high',
              data: {
                bookingId: conflict.bookingId,
                patientId: conflict.booking.patientId,
              },
            });
          }
        }
      }
      
      // Notify OT team about the emergency booking
      await notifyTeam({
        teamId: bookingData.teamId,
        title: 'Emergency Surgical Booking',
        message: `Emergency surgery scheduled for patient from ER. Chief complaint: ${erVisit.chiefComplaint}`,
        priority: 'high',
        data: {
          bookingId: booking.id,
          patientId: erVisit.patientId,
          erVisitId: bookingData.erVisitId,
        },
      });
      
      return { booking, conflicts };
    });
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'ER_OT_EMERGENCY_BOOKING_CREATE',
      'OtSchedule',
      result.booking.id,
      { 
        bookingId: result.booking.id,
        erVisitId: bookingData.erVisitId,
        priority: bookingData.priority,
        hasConflicts: result.conflicts.hasConflicts,
      }
    );
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating emergency surgical booking:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/integration/er-ot/pending-transfers
 * 
 * Retrieves a list of ER patients pending transfer to OT.
 * 
 * @param request - The incoming request object
 * @returns A list of ER patients pending transfer to OT
 */
export async function GET(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'ER_OT_VIEW_PENDING_TRANSFERS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Fetch ER visits pending surgery
    const pendingTransfers = await prisma.erVisit.findMany({
      where: {
        status: 'Pending Surgery',
        disposition: 'Surgery',
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
            bloodGroup: true,
          },
        },
        otSchedule: {
          include: {
            room: true,
            team: {
              include: {
                leadSurgeon: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            surgeryType: true,
          },
        },
      },
      orderBy: {
        otSchedule: {
          scheduledStart: 'asc',
        },
      },
    });
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'ER_OT_PENDING_TRANSFERS_VIEW',
      'ErVisit',
      null,
      {}
    );
    
    return NextResponse.json(pendingTransfers);
  } catch (error) {
    console.error('Error fetching pending transfers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Validation schema for completing a transfer
const completeTransferSchema = z.object({
  erVisitId: z.string().uuid(),
  otScheduleId: z.string().uuid(),
  transferNotes: z.string().optional(),
  handoverDetails: z.object({
    handoverTime: z.string().transform(val => new Date(val)),
    handoverById: z.string().uuid(),
    receivedById: z.string().uuid(),
    patientCondition: z.string(),
    vitalSigns: z.object({
      temperature: z.number().optional(),
      heartRate: z.number().optional(),
      respiratoryRate: z.number().optional(),
      systolicBP: z.number().optional(),
      diastolicBP: z.number().optional(),
      oxygenSaturation: z.number().optional(),
    }).optional(),
    medications: z.array(z.object({
      name: z.string(),
      dose: z.string(),
      time: z.string().transform(val => new Date(val)),
    })).optional(),
    allergies: z.array(z.string()).optional(),
    specialInstructions: z.string().optional(),
  }),
});

/**
 * POST /api/integration/er-ot/complete-transfer
 * 
 * Completes the transfer of a patient from ER to OT.
 * 
 * @param request - The incoming request object
 * @returns The updated ER visit and OT schedule
 */
export async function POST_complete_transfer(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'ER_OT_COMPLETE_TRANSFER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = completeTransferSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data', details: validationResult.error.format() }, { status: 400 });
    }
    
    const transferData = validationResult.data;
    
    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Check if the ER visit exists and is pending surgery
      const erVisit = await tx.erVisit.findUnique({
        where: { id: transferData.erVisitId },
      });
      
      if (!erVisit) {
        throw new Error('ER visit not found');
      }
      
      if (erVisit.status !== 'Pending Surgery' || erVisit.disposition !== 'Surgery') {
        throw new Error(`ER visit is not pending surgery (current status: ${erVisit.status}, disposition: ${erVisit.disposition})`);
      }
      
      // Check if the OT schedule exists
      const otSchedule = await tx.otSchedule.findUnique({
        where: { id: transferData.otScheduleId },
      });
      
      if (!otSchedule) {
        throw new Error('OT schedule not found');
      }
      
      if (otSchedule.erVisitId !== transferData.erVisitId) {
        throw new Error('OT schedule is not associated with this ER visit');
      }
      
      // Create handover record
      const handover = await tx.patientHandover.create({
        data: {
          fromDepartment: 'Emergency',
          toDepartment: 'Operation Theatre',
          patientId: erVisit.patientId,
          erVisitId: transferData.erVisitId,
          otScheduleId: transferData.otScheduleId,
          handoverTime: transferData.handoverDetails.handoverTime,
          handoverById: transferData.handoverDetails.handoverById,
          receivedById: transferData.handoverDetails.receivedById,
          patientCondition: transferData.handoverDetails.patientCondition,
          vitalSigns: transferData.handoverDetails.vitalSigns ? JSON.stringify(transferData.handoverDetails.vitalSigns) : null,
          medications: transferData.handoverDetails.medications ? JSON.stringify(transferData.handoverDetails.medications) : null,
          allergies: transferData.handoverDetails.allergies ? JSON.stringify(transferData.handoverDetails.allergies) : null,
          specialInstructions: transferData.handoverDetails.specialInstructions,
        },
      });
      
      // Update ER visit status
      const updatedErVisit = await tx.erVisit.update({
        where: { id: transferData.erVisitId },
        data: {
          status: 'Transferred',
          transferNotes: transferData.transferNotes,
          transferTime: new Date(),
          transferredById: session.user.id,
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
      
      // Update OT schedule status
      const updatedOtSchedule = await tx.otSchedule.update({
        where: { id: transferData.otScheduleId },
        data: {
          status: 'In-Progress',
          actualStart: new Date(),
        },
        include: {
          room: true,
          team: {
            include: {
              leadSurgeon: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
      
      return { erVisit: updatedErVisit, otSchedule: updatedOtSchedule, handover };
    });
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'ER_OT_TRANSFER_COMPLETE',
      'PatientHandover',
      result.handover.id,
      { 
        handoverId: result.handover.id,
        erVisitId: transferData.erVisitId,
        otScheduleId: transferData.otScheduleId,
        patientId: result.erVisit.patientId,
      }
    );
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error completing transfer:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/integration/er-ot/transfer-history
 * 
 * Retrieves the history of patient transfers from ER to OT.
 * 
 * @param request - The incoming request object
 * @returns A list of patient transfers from ER to OT
 */
export async function GET_transfer_history(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'ER_OT_VIEW_TRANSFER_HISTORY')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse query parameters
    const url = new URL(request.url);
    const patientId = url.searchParams.get('patientId');
    const fromDate = url.searchParams.get('fromDate') ? new Date(url.searchParams.get('fromDate')) : undefined;
    const toDate = url.searchParams.get('toDate') ? new Date(url.searchParams.get('toDate')) : undefined;
    
    // Build filter conditions
    const where: any = {
      fromDepartment: 'Emergency',
      toDepartment: 'Operation Theatre',
    };
    
    if (patientId) {
      where.patientId = patientId;
    }
    
    if (fromDate || toDate) {
      where.handoverTime = {};
      if (fromDate) {
        where.handoverTime.gte = fromDate;
      }
      if (toDate) {
        where.handoverTime.lte = toDate;
      }
    }
    
    // Fetch transfer history
    const transferHistory = await prisma.patientHandover.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
          },
        },
        erVisit: {
          select: {
            id: true,
            chiefComplaint: true,
            triageCategory: true,
          },
        },
        otSchedule: {
          include: {
            surgeryType: true,
            room: true,
          },
        },
        handoverBy: {
          select: {
            id: true,
            name: true,
          },
        },
        receivedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        handoverTime: 'desc',
      },
    });
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'ER_OT_TRANSFER_HISTORY_VIEW',
      'PatientHandover',
      null,
      { filters: { patientId, fromDate, toDate } }
    );
    
    return NextResponse.json(transferHistory);
  } catch (error) {
    console.error('Error fetching transfer history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
