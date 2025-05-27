/**
 * Operation Theatre Bookings API
 * 
 * This file implements the API endpoints for managing operation theatre bookings,
 * including enhanced filtering, pagination, and comprehensive booking details.
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

// Validation schema for query parameters
const querySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  status: z.string().optional(),
  roomId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  surgeryTypeId: z.string().uuid().optional(),
  fromDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  toDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  patientId: z.string().uuid().optional(),
  priority: z.string().optional(),
  searchTerm: z.string().optional(),
});

/**
 * GET /api/ot/bookings
 * 
 * Retrieves a paginated list of operation theatre bookings with enhanced filtering options.
 * 
 * @param request - The incoming request object
 * @returns A paginated list of operation theatre bookings
 */
export async function GET(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'OT_VIEW_BOOKINGS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryResult = querySchema.safeParse(Object.fromEntries(url.searchParams));
    
    if (!queryResult.success) {
      return NextResponse.json({ error: 'Invalid query parameters', details: queryResult.error.format() }, { status: 400 });
    }
    
    const { page, limit, status, roomId, teamId, surgeryTypeId, fromDate, toDate, patientId, priority, searchTerm } = queryResult.data;
    
    // Build filter conditions
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (roomId) {
      where.roomId = roomId;
    }
    
    if (teamId) {
      where.teamId = teamId;
    }
    
    if (surgeryTypeId) {
      where.surgeryTypeId = surgeryTypeId;
    }
    
    if (patientId) {
      where.patientId = patientId;
    }
    
    if (priority) {
      where.priority = priority;
    }
    
    if (fromDate || toDate) {
      where.scheduledStart = {};
      if (fromDate) {
        where.scheduledStart.gte = fromDate;
      }
      if (toDate) {
        where.scheduledStart.lte = toDate;
      }
    }
    
    if (searchTerm) {
      where.OR = [
        { patient: { firstName: { contains: searchTerm, mode: 'insensitive' } } },
        { patient: { lastName: { contains: searchTerm, mode: 'insensitive' } } },
        { surgeryType: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { room: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { team: { name: { contains: searchTerm, mode: 'insensitive' } } },
      ];
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Execute query with pagination and filtering
    const [bookings, total] = await Promise.all([
      prisma.otSchedule.findMany({
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
        orderBy: {
          scheduledStart: 'asc',
        },
        skip,
        take: limit,
      }),
      prisma.otSchedule.count({ where }),
    ]);
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'OT_BOOKING_LIST_VIEW',
      'OtSchedule',
      null,
      { filters: { status, roomId, teamId, surgeryTypeId, fromDate, toDate, patientId, priority, searchTerm }, page, limit }
    );
    
    // Return paginated results
    return NextResponse.json({
      data: bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching OT bookings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Validation schema for creating a new OT booking
const createBookingSchema = z.object({
  patientId: z.string().uuid(),
  surgeryTypeId: z.string().uuid(),
  roomId: z.string().uuid(),
  teamId: z.string().uuid(),
  scheduledStart: z.string().transform(val => new Date(val)),
  scheduledEnd: z.string().transform(val => new Date(val)),
  priority: z.enum(['Elective', 'Urgent', 'Emergency']),
  notes: z.string().optional(),
});

/**
 * POST /api/ot/bookings
 * 
 * Creates a new operation theatre booking with conflict detection.
 * 
 * @param request - The incoming request object
 * @returns The newly created operation theatre booking
 */
export async function POST(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'OT_CREATE_BOOKING')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = createBookingSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data', details: validationResult.error.format() }, { status: 400 });
    }
    
    const { patientId, surgeryTypeId, roomId, teamId, scheduledStart, scheduledEnd, priority, notes } = validationResult.data;
    
    // Check for scheduling conflicts
    const conflicts = await checkScheduleConflicts({
      roomId,
      teamId,
      scheduledStart,
      scheduledEnd,
      priority,
    });
    
    if (conflicts.hasConflicts && priority !== 'Emergency') {
      return NextResponse.json({ 
        error: 'Scheduling conflict detected', 
        conflicts: conflicts.details 
      }, { status: 409 });
    }
    
    // For emergency cases, we may need to reschedule other bookings
    if (conflicts.hasConflicts && priority === 'Emergency') {
      // Handle emergency booking by rescheduling or notifying about conflicts
      // This would be implemented in a real system
      console.log('Emergency booking with conflicts - would handle rescheduling');
    }
    
    // Create the OT booking
    const booking = await prisma.otSchedule.create({
      data: {
        patientId,
        surgeryTypeId,
        roomId,
        teamId,
        scheduledStart,
        scheduledEnd,
        priority,
        notes,
        status: 'Scheduled', // Initial status
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
      },
    });
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'OT_BOOKING_CREATE',
      'OtSchedule',
      booking.id,
      { bookingData: { patientId, surgeryTypeId, roomId, teamId, scheduledStart, scheduledEnd, priority } }
    );
    
    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error('Error creating OT booking:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
