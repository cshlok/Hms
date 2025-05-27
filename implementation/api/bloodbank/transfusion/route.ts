/**
 * Blood Bank Transfusion Management API
 * 
 * This file implements the API endpoints for managing blood transfusions,
 * including transfusion requests, issue tracking, and reaction monitoring.
 * 
 * FHIR Compliance: Uses ServiceRequest and Procedure resources for transfusion management
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { logAuditEvent } from '@/lib/audit';
import { hasPermission } from '@/lib/permissions';
import { encryptSensitiveData } from '@/lib/encryption';
import { notifyTransfusionTeam } from '@/lib/notifications';

// Validation schema for creating a new transfusion request
const createTransfusionRequestSchema = z.object({
  patientId: z.string().uuid(),
  requestingDepartment: z.string(),
  requestingPhysicianId: z.string().uuid(),
  productType: z.string(),
  bloodGroup: z.string().optional(),
  quantity: z.number().int().positive(),
  urgency: z.enum(['Routine', 'Urgent', 'Emergency']),
  requiredBy: z.string().transform(val => new Date(val)).optional(),
  clinicalIndication: z.string(),
  specialRequirements: z.object({
    isIrradiated: z.boolean().optional(),
    isLeukoreduced: z.boolean().optional(),
    isCMVNegative: z.boolean().optional(),
    isWashed: z.boolean().optional(),
    other: z.string().optional(),
  }).optional(),
  notes: z.string().optional(),
});

/**
 * POST /api/bloodbank/transfusion/request
 * 
 * Creates a new blood transfusion request.
 * 
 * @param request - The incoming request object
 * @returns The newly created transfusion request
 */
export async function POST(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'BLOODBANK_REQUEST_TRANSFUSION')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = createTransfusionRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data', details: validationResult.error.format() }, { status: 400 });
    }
    
    const requestData = validationResult.data;
    
    // Check if the patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: requestData.patientId },
    });
    
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    
    // Check if the requesting physician exists
    const physician = await prisma.user.findUnique({
      where: { id: requestData.requestingPhysicianId },
    });
    
    if (!physician) {
      return NextResponse.json({ error: 'Requesting physician not found' }, { status: 404 });
    }
    
    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create the transfusion request
      const transfusionRequest = await tx.bloodTransfusionRequest.create({
        data: {
          patientId: requestData.patientId,
          requestingDepartment: requestData.requestingDepartment,
          requestingPhysicianId: requestData.requestingPhysicianId,
          productType: requestData.productType,
          bloodGroup: requestData.bloodGroup || patient.bloodGroup || 'Unknown',
          quantity: requestData.quantity,
          urgency: requestData.urgency,
          requiredBy: requestData.requiredBy,
          clinicalIndication: requestData.clinicalIndication,
          specialRequirements: requestData.specialRequirements ? JSON.stringify(requestData.specialRequirements) : null,
          notes: requestData.notes,
          status: 'Pending',
          requestedById: session.user.id,
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              dateOfBirth: true,
              bloodGroup: true,
            },
          },
          requestingPhysician: {
            select: {
              id: true,
              name: true,
            },
          },
          requestedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      
      // Notify the blood bank team based on urgency
      if (requestData.urgency === 'Emergency' || requestData.urgency === 'Urgent') {
        await notifyTransfusionTeam({
          requestId: transfusionRequest.id,
          patientId: requestData.patientId,
          urgency: requestData.urgency,
          productType: requestData.productType,
          quantity: requestData.quantity,
          department: requestData.requestingDepartment,
        });
      }
      
      return transfusionRequest;
    });
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'BLOODBANK_TRANSFUSION_REQUEST_CREATE',
      'BloodTransfusionRequest',
      result.id,
      { 
        patientId: requestData.patientId,
        productType: requestData.productType,
        quantity: requestData.quantity,
        urgency: requestData.urgency,
      }
    );
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating transfusion request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/bloodbank/transfusion/request
 * 
 * Retrieves a list of blood transfusion requests with filtering options.
 * 
 * @param request - The incoming request object
 * @returns A list of blood transfusion requests
 */
export async function GET(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'BLOODBANK_VIEW_TRANSFUSION_REQUESTS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse query parameters
    const url = new URL(request.url);
    const patientId = url.searchParams.get('patientId');
    const status = url.searchParams.get('status');
    const urgency = url.searchParams.get('urgency');
    const department = url.searchParams.get('department');
    const productType = url.searchParams.get('productType');
    
    // Build filter conditions
    const where: any = {};
    
    if (patientId) {
      where.patientId = patientId;
    }
    
    if (status) {
      where.status = status;
    }
    
    if (urgency) {
      where.urgency = urgency;
    }
    
    if (department) {
      where.requestingDepartment = department;
    }
    
    if (productType) {
      where.productType = productType;
    }
    
    // Execute query
    const transfusionRequests = await prisma.bloodTransfusionRequest.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            bloodGroup: true,
          },
        },
        requestingPhysician: {
          select: {
            id: true,
            name: true,
          },
        },
        requestedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { urgency: 'desc' },
        { createdAt: 'desc' },
      ],
    });
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'BLOODBANK_TRANSFUSION_REQUESTS_VIEW',
      'BloodTransfusionRequest',
      null,
      { filters: { patientId, status, urgency, department, productType } }
    );
    
    return NextResponse.json(transfusionRequests);
  } catch (error) {
    console.error('Error fetching transfusion requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Validation schema for updating a transfusion request
const updateTransfusionRequestSchema = z.object({
  status: z.enum(['Pending', 'Processing', 'Approved', 'Denied', 'Cancelled', 'Completed']).optional(),
  notes: z.string().optional(),
  reviewedById: z.string().uuid().optional(),
  reviewNotes: z.string().optional(),
});

/**
 * PUT /api/bloodbank/transfusion/request/[id]
 * 
 * Updates a specific blood transfusion request.
 * 
 * @param request - The incoming request object
 * @param params - The route parameters containing the request ID
 * @returns The updated transfusion request
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'BLOODBANK_UPDATE_TRANSFUSION_REQUEST')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = params;
    
    // Check if the request exists
    const existingRequest = await prisma.bloodTransfusionRequest.findUnique({
      where: { id },
    });
    
    if (!existingRequest) {
      return NextResponse.json({ error: 'Transfusion request not found' }, { status: 404 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateTransfusionRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data', details: validationResult.error.format() }, { status: 400 });
    }
    
    const updateData = validationResult.data;
    
    // Update the transfusion request
    const updatedRequest = await prisma.bloodTransfusionRequest.update({
      where: { id },
      data: {
        ...updateData,
        reviewedAt: updateData.reviewedById ? new Date() : undefined,
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            bloodGroup: true,
          },
        },
        requestingPhysician: {
          select: {
            id: true,
            name: true,
          },
        },
        requestedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        reviewedBy: {
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
      'BLOODBANK_TRANSFUSION_REQUEST_UPDATE',
      'BloodTransfusionRequest',
      updatedRequest.id,
      { 
        requestId: updatedRequest.id,
        previousStatus: existingRequest.status,
        newStatus: updateData.status || existingRequest.status,
      }
    );
    
    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Error updating transfusion request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Validation schema for issuing blood products
const issueBloodProductSchema = z.object({
  requestId: z.string().uuid(),
  productIds: z.array(z.string().uuid()),
  issuedById: z.string().uuid(),
  receivedById: z.string().uuid(),
  notes: z.string().optional(),
});

/**
 * POST /api/bloodbank/transfusion/issue
 * 
 * Issues blood products for a transfusion request.
 * 
 * @param request - The incoming request object
 * @returns The blood issue record
 */
export async function POST_issue(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'BLOODBANK_ISSUE_BLOOD')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = issueBloodProductSchema.safeParse({
      ...body,
      issuedById: session.user.id,
    });
    
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data', details: validationResult.error.format() }, { status: 400 });
    }
    
    const { requestId, productIds, issuedById, receivedById, notes } = validationResult.data;
    
    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Check if the request exists and is approved
      const transfusionRequest = await tx.bloodTransfusionRequest.findUnique({
        where: { id: requestId },
      });
      
      if (!transfusionRequest) {
        throw new Error('Transfusion request not found');
      }
      
      if (transfusionRequest.status !== 'Approved') {
        throw new Error(`Transfusion request is not approved (current status: ${transfusionRequest.status})`);
      }
      
      // Check if all products exist and are available
      const products = await tx.bloodInventory.findMany({
        where: {
          id: {
            in: productIds,
          },
        },
      });
      
      if (products.length !== productIds.length) {
        throw new Error('One or more blood products not found');
      }
      
      const unavailableProducts = products.filter(p => p.status !== 'Available');
      if (unavailableProducts.length > 0) {
        throw new Error(`Products not available: ${unavailableProducts.map(p => p.productId).join(', ')}`);
      }
      
      // Create the blood issue record
      const bloodIssue = await tx.bloodIssue.create({
        data: {
          requestId,
          issuedById,
          receivedById,
          notes,
        },
      });
      
      // Update product status and link to issue
      for (const productId of productIds) {
        await tx.bloodInventory.update({
          where: { id: productId },
          data: {
            status: 'Issued',
            issueId: bloodIssue.id,
          },
        });
      }
      
      // Update request status
      await tx.bloodTransfusionRequest.update({
        where: { id: requestId },
        data: {
          status: 'Completed',
        },
      });
      
      // Get complete issue record with related data
      return await tx.bloodIssue.findUnique({
        where: { id: bloodIssue.id },
        include: {
          request: {
            include: {
              patient: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  dateOfBirth: true,
                  bloodGroup: true,
                },
              },
            },
          },
          issuedBy: {
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
          products: true,
        },
      });
    });
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'BLOODBANK_BLOOD_ISSUE',
      'BloodIssue',
      result.id,
      { 
        issueId: result.id,
        requestId,
        productCount: productIds.length,
        productIds,
      }
    );
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error issuing blood products:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

// Validation schema for recording a transfusion reaction
const transfusionReactionSchema = z.object({
  patientId: z.string().uuid(),
  issueId: z.string().uuid(),
  reactionType: z.string(),
  severity: z.enum(['Mild', 'Moderate', 'Severe', 'Life-threatening']),
  symptoms: z.array(z.string()),
  onsetTime: z.string().transform(val => new Date(val)),
  interventions: z.array(z.string()).optional(),
  outcome: z.string().optional(),
  reportedById: z.string().uuid(),
  notes: z.string().optional(),
});

/**
 * POST /api/bloodbank/transfusion/reaction
 * 
 * Records a transfusion reaction.
 * 
 * @param request - The incoming request object
 * @returns The transfusion reaction record
 */
export async function POST_reaction(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'BLOODBANK_RECORD_REACTION')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = transfusionReactionSchema.safeParse({
      ...body,
      reportedById: session.user.id,
    });
    
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data', details: validationResult.error.format() }, { status: 400 });
    }
    
    const reactionData = validationResult.data;
    
    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Check if the patient exists
      const patient = await tx.patient.findUnique({
        where: { id: reactionData.patientId },
      });
      
      if (!patient) {
        throw new Error('Patient not found');
      }
      
      // Check if the issue exists
      const issue = await tx.bloodIssue.findUnique({
        where: { id: reactionData.issueId },
        include: {
          products: true,
        },
      });
      
      if (!issue) {
        throw new Error('Blood issue not found');
      }
      
      // Create the transfusion reaction record
      const reaction = await tx.transfusionReaction.create({
        data: {
          patientId: reactionData.patientId,
          issueId: reactionData.issueId,
          reactionType: reactionData.reactionType,
          severity: reactionData.severity,
          symptoms: JSON.stringify(reactionData.symptoms),
          onsetTime: reactionData.onsetTime,
          interventions: reactionData.interventions ? JSON.stringify(reactionData.interventions) : null,
          outcome: reactionData.outcome,
          reportedById: reactionData.reportedById,
          notes: reactionData.notes,
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              dateOfBirth: true,
              bloodGroup: true,
            },
          },
          issue: {
            include: {
              products: true,
            },
          },
          reportedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      
      // Update product status for severe reactions
      if (reactionData.severity === 'Severe' || reactionData.severity === 'Life-threatening') {
        for (const product of issue.products) {
          await tx.bloodInventory.update({
            where: { id: product.id },
            data: {
              status: 'Quarantined',
              notes: `${product.notes || ''}\nQuarantined due to ${reactionData.severity} transfusion reaction.`,
            },
          });
        }
      }
      
      return reaction;
    });
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'BLOODBANK_REACTION_RECORD',
      'TransfusionReaction',
      result.id,
      { 
        reactionId: result.id,
        patientId: reactionData.patientId,
        issueId: reactionData.issueId,
        reactionType: reactionData.reactionType,
        severity: reactionData.severity,
      }
    );
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error recording transfusion reaction:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}
