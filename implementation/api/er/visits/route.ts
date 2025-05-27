/**
 * Emergency Department Visits API
 * 
 * This file implements the API endpoints for managing emergency department visits,
 * including enhanced filtering, pagination, and comprehensive visit details.
 * 
 * FHIR Compliance: Uses Encounter resource structure for ED visits
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { logAuditEvent } from '@/lib/audit';
import { hasPermission } from '@/lib/permissions';

// Validation schema for query parameters
const querySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  status: z.string().optional(),
  triageCategory: z.string().optional(),
  fromDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  toDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  searchTerm: z.string().optional(),
});

/**
 * GET /api/er/visits
 * 
 * Retrieves a paginated list of emergency department visits with enhanced filtering options.
 * 
 * @param request - The incoming request object
 * @returns A paginated list of emergency department visits
 */
export async function GET(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'ER_VIEW_VISITS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryResult = querySchema.safeParse(Object.fromEntries(url.searchParams));
    
    if (!queryResult.success) {
      return NextResponse.json({ error: 'Invalid query parameters', details: queryResult.error.format() }, { status: 400 });
    }
    
    const { page, limit, status, triageCategory, fromDate, toDate, searchTerm } = queryResult.data;
    
    // Build filter conditions
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (triageCategory) {
      where.triageCategory = triageCategory;
    }
    
    if (fromDate || toDate) {
      where.arrivalDateTime = {};
      if (fromDate) {
        where.arrivalDateTime.gte = fromDate;
      }
      if (toDate) {
        where.arrivalDateTime.lte = toDate;
      }
    }
    
    if (searchTerm) {
      where.OR = [
        { visitNumber: { contains: searchTerm, mode: 'insensitive' } },
        { patient: { firstName: { contains: searchTerm, mode: 'insensitive' } } },
        { patient: { lastName: { contains: searchTerm, mode: 'insensitive' } } },
      ];
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Execute query with pagination and filtering
    const [visits, total] = await Promise.all([
      prisma.erVisit.findMany({
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
          attendingDoctor: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          arrivalDateTime: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.erVisit.count({ where }),
    ]);
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'ER_VISIT_LIST_VIEW',
      'ErVisit',
      null,
      { filters: { status, triageCategory, fromDate, toDate, searchTerm }, page, limit }
    );
    
    // Return paginated results
    return NextResponse.json({
      data: visits,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching ER visits:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Validation schema for creating a new ER visit
const createVisitSchema = z.object({
  patientId: z.string().uuid(),
  arrivalDateTime: z.string().transform(val => new Date(val)),
  arrivalMode: z.string().optional(),
  isTrauma: z.boolean().optional().default(false),
  chiefComplaint: z.string().optional(),
  presentingProblem: z.string().optional(),
  attendingDoctorId: z.string().uuid().optional(),
});

/**
 * POST /api/er/visits
 * 
 * Creates a new emergency department visit with enhanced data capture.
 * 
 * @param request - The incoming request object
 * @returns The newly created emergency department visit
 */
export async function POST(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'ER_CREATE_VISIT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = createVisitSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data', details: validationResult.error.format() }, { status: 400 });
    }
    
    const { patientId, arrivalDateTime, arrivalMode, isTrauma, chiefComplaint, presentingProblem, attendingDoctorId } = validationResult.data;
    
    // Generate a unique visit number
    const visitNumber = `ER-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    
    // Create the ER visit
    const visit = await prisma.erVisit.create({
      data: {
        patientId,
        visitNumber,
        arrivalDateTime,
        arrivalMode,
        isTrauma,
        chiefComplaint,
        presentingProblem,
        attendingDoctorId,
        status: 'Waiting', // Initial status
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
        attendingDoctor: {
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
      'ER_VISIT_CREATE',
      'ErVisit',
      visit.id,
      { visitData: { patientId, visitNumber, arrivalDateTime, arrivalMode, isTrauma } }
    );
    
    return NextResponse.json(visit, { status: 201 });
  } catch (error) {
    console.error('Error creating ER visit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
