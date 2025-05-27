/**
 * Emergency Department Visit Detail API
 * 
 * This file implements the API endpoints for managing a specific emergency department visit,
 * including comprehensive visit details and updates.
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

/**
 * GET /api/er/visits/[id]
 * 
 * Retrieves comprehensive details for a specific emergency department visit.
 * 
 * @param request - The incoming request object
 * @param params - The route parameters containing the visit ID
 * @returns Detailed information about the emergency department visit
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'ER_VIEW_VISIT_DETAILS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Fetch the visit with comprehensive details
    const visit = await prisma.erVisit.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            // Add other relevant patient fields
          },
        },
        attendingDoctor: {
          select: {
            id: true,
            name: true,
            // Add other relevant doctor fields
          },
        },
        vitalSigns: {
          orderBy: {
            recordedAt: 'desc',
          },
        },
        treatments: {
          orderBy: {
            performedAt: 'desc',
          },
          include: {
            performedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        orders: {
          orderBy: {
            orderedAt: 'desc',
          },
          include: {
            orderedBy: {
              select: {
                id: true,
                name: true,
              },
            },
            completedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        notes: {
          orderBy: {
            recordedAt: 'desc',
          },
          include: {
            author: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        initialAssessment: {
          include: {
            assessedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        alerts: {
          orderBy: {
            activatedAt: 'desc',
          },
          include: {
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
          },
        },
      },
    });

    if (!visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    // Log audit event
    await logAuditEvent(
      session.user.id,
      'ER_VISIT_DETAIL_VIEW',
      'ErVisit',
      visit.id,
      { visitId: visit.id }
    );

    return NextResponse.json(visit);
  } catch (error) {
    console.error('Error fetching ER visit details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Validation schema for updating an ER visit
const updateVisitSchema = z.object({
  chiefComplaint: z.string().optional(),
  presentingProblem: z.string().optional(),
  isTrauma: z.boolean().optional(),
  arrivalMode: z.string().optional(),
  status: z.string().optional(),
  attendingDoctorId: z.string().uuid().optional(),
  triageCategory: z.string().optional(),
  triageNotes: z.string().optional(),
  disposition: z.string().optional(),
  dispositionNotes: z.string().optional(),
  dispositionDateTime: z.string().transform(val => val ? new Date(val) : undefined).optional(),
});

/**
 * PUT /api/er/visits/[id]
 * 
 * Updates a specific emergency department visit with comprehensive data.
 * 
 * @param request - The incoming request object
 * @param params - The route parameters containing the visit ID
 * @returns The updated emergency department visit
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'ER_UPDATE_VISIT')) {
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
    const validationResult = updateVisitSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data', details: validationResult.error.format() }, { status: 400 });
    }

    const updateData = validationResult.data;

    // Update the visit
    const updatedVisit = await prisma.erVisit.update({
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
      'ER_VISIT_UPDATE',
      'ErVisit',
      updatedVisit.id,
      { 
        visitId: updatedVisit.id,
        updatedFields: Object.keys(updateData),
        previousValues: {
          chiefComplaint: existingVisit.chiefComplaint,
          presentingProblem: existingVisit.presentingProblem,
          isTrauma: existingVisit.isTrauma,
          arrivalMode: existingVisit.arrivalMode,
          status: existingVisit.status,
          attendingDoctorId: existingVisit.attendingDoctorId,
          triageCategory: existingVisit.triageCategory,
          triageNotes: existingVisit.triageNotes,
          disposition: existingVisit.disposition,
          dispositionNotes: existingVisit.dispositionNotes,
          dispositionDateTime: existingVisit.dispositionDateTime,
        }
      }
    );

    return NextResponse.json(updatedVisit);
  } catch (error) {
    console.error('Error updating ER visit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/er/visits/[id]
 * 
 * Deletes a specific emergency department visit.
 * 
 * @param request - The incoming request object
 * @param params - The route parameters containing the visit ID
 * @returns A success message
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'ER_DELETE_VISIT')) {
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

    // Delete the visit
    await prisma.erVisit.delete({
      where: { id },
    });

    // Log audit event
    await logAuditEvent(
      session.user.id,
      'ER_VISIT_DELETE',
      'ErVisit',
      id,
      { visitId: id }
    );

    return NextResponse.json({ message: 'Visit deleted successfully' });
  } catch (error) {
    console.error('Error deleting ER visit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
