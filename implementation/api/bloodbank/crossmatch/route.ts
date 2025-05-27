/**
 * Blood Bank Crossmatch API
 * 
 * This file implements the API endpoints for managing blood crossmatching,
 * including electronic and serological compatibility testing.
 * 
 * FHIR Compliance: Uses BiologicallyDerivedProduct and ServiceRequest resources
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { logAuditEvent } from '@/lib/audit';
import { hasPermission } from '@/lib/permissions';
import { checkCompatibility } from '@/lib/bloodbank/compatibility-testing-system';

// Validation schema for creating a new crossmatch
const createCrossmatchSchema = z.object({
  productId: z.string().uuid(),
  patientId: z.string().uuid(),
  requestId: z.string().uuid().optional(),
  crossmatchType: z.enum(['Electronic', 'Serological']),
  notes: z.string().optional(),
});

/**
 * POST /api/bloodbank/crossmatch
 * 
 * Creates a new blood crossmatch record and performs compatibility testing.
 * 
 * @param request - The incoming request object
 * @returns The crossmatch result with compatibility information
 */
export async function POST(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'BLOODBANK_PERFORM_CROSSMATCH')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = createCrossmatchSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data', details: validationResult.error.format() }, { status: 400 });
    }
    
    const { productId, patientId, requestId, crossmatchType, notes } = validationResult.data;
    
    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Get blood product details
      const product = await tx.bloodInventory.findUnique({
        where: { id: productId },
        include: {
          collection: {
            include: {
              donor: true,
            },
          },
        },
      });
      
      if (!product) {
        throw new Error('Blood product not found');
      }
      
      if (product.status !== 'Available') {
        throw new Error(`Blood product is not available (current status: ${product.status})`);
      }
      
      // Get patient details
      const patient = await tx.patient.findUnique({
        where: { id: patientId },
      });
      
      if (!patient) {
        throw new Error('Patient not found');
      }
      
      // Perform compatibility check
      const compatibilityResult = await checkCompatibility({
        productBloodGroup: product.bloodGroup,
        patientBloodGroup: patient.bloodGroup || 'Unknown',
        crossmatchType,
        productId,
        patientId,
      });
      
      // Create crossmatch record
      const crossmatch = await tx.bloodCrossmatch.create({
        data: {
          productId,
          patientId,
          requestId,
          performedById: session.user.id,
          crossmatchType,
          result: compatibilityResult.isCompatible ? 'Compatible' : 'Incompatible',
          incompatibilityReason: compatibilityResult.isCompatible ? null : compatibilityResult.reason,
          notes: notes || compatibilityResult.notes,
        },
        include: {
          product: true,
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              dateOfBirth: true,
              bloodGroup: true,
            },
          },
          performedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      
      // If request ID is provided, update the request status
      if (requestId) {
        await tx.bloodReservation.update({
          where: { id: requestId },
          data: {
            status: compatibilityResult.isCompatible ? 'Approved' : 'Denied',
          },
        });
      }
      
      return { crossmatch, compatibilityDetails: compatibilityResult };
    });
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'BLOODBANK_CROSSMATCH_PERFORM',
      'BloodCrossmatch',
      result.crossmatch.id,
      { 
        productId,
        patientId,
        requestId,
        crossmatchType,
        result: result.crossmatch.result,
      }
    );
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error performing blood crossmatch:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/bloodbank/crossmatch
 * 
 * Retrieves a list of blood crossmatches with filtering options.
 * 
 * @param request - The incoming request object
 * @returns A list of blood crossmatches
 */
export async function GET(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'BLOODBANK_VIEW_CROSSMATCH')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse query parameters
    const url = new URL(request.url);
    const patientId = url.searchParams.get('patientId');
    const productId = url.searchParams.get('productId');
    const result = url.searchParams.get('result');
    const crossmatchType = url.searchParams.get('crossmatchType');
    
    // Build filter conditions
    const where: any = {};
    
    if (patientId) {
      where.patientId = patientId;
    }
    
    if (productId) {
      where.productId = productId;
    }
    
    if (result) {
      where.result = result;
    }
    
    if (crossmatchType) {
      where.crossmatchType = crossmatchType;
    }
    
    // Execute query
    const crossmatches = await prisma.bloodCrossmatch.findMany({
      where,
      include: {
        product: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            bloodGroup: true,
          },
        },
        performedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        performedAt: 'desc',
      },
    });
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'BLOODBANK_CROSSMATCH_LIST_VIEW',
      'BloodCrossmatch',
      null,
      { filters: { patientId, productId, result, crossmatchType } }
    );
    
    return NextResponse.json(crossmatches);
  } catch (error) {
    console.error('Error fetching blood crossmatches:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/bloodbank/crossmatch/[id]
 * 
 * Retrieves details of a specific blood crossmatch.
 * 
 * @param request - The incoming request object
 * @param params - The route parameters containing the crossmatch ID
 * @returns Detailed information about the blood crossmatch
 */
export async function GET_detail(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'BLOODBANK_VIEW_CROSSMATCH')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = params;
    
    // Fetch the crossmatch with detailed information
    const crossmatch = await prisma.bloodCrossmatch.findUnique({
      where: { id },
      include: {
        product: {
          include: {
            collection: {
              include: {
                donor: {
                  select: {
                    id: true,
                    donorNumber: true,
                    bloodGroup: true,
                  },
                },
              },
            },
          },
        },
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            bloodGroup: true,
          },
        },
        performedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    if (!crossmatch) {
      return NextResponse.json({ error: 'Crossmatch not found' }, { status: 404 });
    }
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'BLOODBANK_CROSSMATCH_DETAIL_VIEW',
      'BloodCrossmatch',
      crossmatch.id,
      { crossmatchId: crossmatch.id }
    );
    
    return NextResponse.json(crossmatch);
  } catch (error) {
    console.error('Error fetching blood crossmatch details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/bloodbank/crossmatch/patient/[patientId]
 * 
 * Retrieves all crossmatches for a specific patient.
 * 
 * @param request - The incoming request object
 * @param params - The route parameters containing the patient ID
 * @returns List of crossmatches for the patient
 */
export async function GET_patient(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'BLOODBANK_VIEW_CROSSMATCH')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { patientId } = params;
    
    // Check if the patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });
    
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    
    // Fetch all crossmatches for the patient
    const crossmatches = await prisma.bloodCrossmatch.findMany({
      where: { patientId },
      include: {
        product: true,
        performedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        performedAt: 'desc',
      },
    });
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'BLOODBANK_PATIENT_CROSSMATCH_VIEW',
      'Patient',
      patientId,
      { patientId }
    );
    
    return NextResponse.json(crossmatches);
  } catch (error) {
    console.error('Error fetching patient crossmatches:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
