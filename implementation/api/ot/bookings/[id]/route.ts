/**
 * Operation Theatre Booking Detail API
 * 
 * This file implements the API endpoints for managing a specific operation theatre booking,
 * including comprehensive booking details and updates.
 * 
 * FHIR Compliance: Uses Appointment and Schedule resources for OT bookings
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { logAuditEvent } from '@/lib/audit';
import { hasPermission } from '@/lib/permissions';
import { checkScheduleConflicts } from '@/lib/ot/scheduling';

/**
 * GET /api/ot/bookings/[id]
 * 
 * Retrieves comprehensive details for a specific operation theatre booking.
 * 
 * @param request - The incoming request object
 * @param params - The route parameters containing the booking ID
 * @returns Detailed information about the operation theatre booking
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'OT_VIEW_BOOKING_DETAILS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Fetch the booking with comprehensive details
    const booking = await prisma.otSchedule.findUnique({
      where: { id },
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
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        preOpChecklist: true,
        caseCart: {
          include: {
            items: true,
            preparedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        surgicalNotes: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
              },
            },
            template: true,
          },
        },
        consent: {
          include: {
            obtainedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        riskAssessment: {
          include: {
            assessedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        safetyChecklist: true,
        timeOut: {
          include: {
            performedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        diagrams: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        complications: {
          include: {
            recordedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        postOpInstructions: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        specimens: {
          include: {
            collectedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Log audit event
    await logAuditEvent(
      session.user.id,
      'OT_BOOKING_DETAIL_VIEW',
      'OtSchedule',
      booking.id,
      { bookingId: booking.id }
    );

    return NextResponse.json(booking);
  } catch (error) {
    console.error('Error fetching OT booking details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Validation schema for updating an OT booking
const updateBookingSchema = z.object({
  surgeryTypeId: z.string().uuid().optional(),
  roomId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  scheduledStart: z.string().transform(val => new Date(val)).optional(),
  scheduledEnd: z.string().transform(val => new Date(val)).optional(),
  actualStart: z.string().transform(val => new Date(val)).optional().nullable(),
  actualEnd: z.string().transform(val => new Date(val)).optional().nullable(),
  status: z.enum(['Scheduled', 'In-Progress', 'Completed', 'Cancelled', 'Rescheduled']).optional(),
  priority: z.enum(['Elective', 'Urgent', 'Emergency']).optional(),
  notes: z.string().optional(),
});

/**
 * PUT /api/ot/bookings/[id]
 * 
 * Updates a specific operation theatre booking with comprehensive data.
 * 
 * @param request - The incoming request object
 * @param params - The route parameters containing the booking ID
 * @returns The updated operation theatre booking
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'OT_UPDATE_BOOKING')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Check if the booking exists
    const existingBooking = await prisma.otSchedule.findUnique({
      where: { id },
    });

    if (!existingBooking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateBookingSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data', details: validationResult.error.format() }, { status: 400 });
    }

    const updateData = validationResult.data;

    // Check for scheduling conflicts if schedule is being changed
    if ((updateData.scheduledStart || updateData.scheduledEnd || updateData.roomId || updateData.teamId) && 
        updateData.status !== 'Cancelled') {
      
      const conflicts = await checkScheduleConflicts({
        bookingId: id, // Exclude current booking from conflict check
        roomId: updateData.roomId || existingBooking.roomId,
        teamId: updateData.teamId || existingBooking.teamId,
        scheduledStart: updateData.scheduledStart || existingBooking.scheduledStart,
        scheduledEnd: updateData.scheduledEnd || existingBooking.scheduledEnd,
        priority: updateData.priority || existingBooking.priority,
      });
      
      if (conflicts.hasConflicts && (updateData.priority || existingBooking.priority) !== 'Emergency') {
        return NextResponse.json({ 
          error: 'Scheduling conflict detected', 
          conflicts: conflicts.details 
        }, { status: 409 });
      }
    }

    // Update the booking
    const updatedBooking = await prisma.otSchedule.update({
      where: { id },
      data: updateData,
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
      },
    });

    // Log audit event
    await logAuditEvent(
      session.user.id,
      'OT_BOOKING_UPDATE',
      'OtSchedule',
      updatedBooking.id,
      { 
        bookingId: updatedBooking.id,
        updatedFields: Object.keys(updateData),
        previousValues: {
          surgeryTypeId: existingBooking.surgeryTypeId,
          roomId: existingBooking.roomId,
          teamId: existingBooking.teamId,
          scheduledStart: existingBooking.scheduledStart,
          scheduledEnd: existingBooking.scheduledEnd,
          actualStart: existingBooking.actualStart,
          actualEnd: existingBooking.actualEnd,
          status: existingBooking.status,
          priority: existingBooking.priority,
          notes: existingBooking.notes,
        }
      }
    );

    return NextResponse.json(updatedBooking);
  } catch (error) {
    console.error('Error updating OT booking:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/ot/bookings/[id]
 * 
 * Deletes a specific operation theatre booking.
 * 
 * @param request - The incoming request object
 * @param params - The route parameters containing the booking ID
 * @returns A success message
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'OT_DELETE_BOOKING')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Check if the booking exists
    const existingBooking = await prisma.otSchedule.findUnique({
      where: { id },
    });

    if (!existingBooking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Delete the booking
    await prisma.otSchedule.delete({
      where: { id },
    });

    // Log audit event
    await logAuditEvent(
      session.user.id,
      'OT_BOOKING_DELETE',
      'OtSchedule',
      id,
      { bookingId: id }
    );

    return NextResponse.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Error deleting OT booking:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
