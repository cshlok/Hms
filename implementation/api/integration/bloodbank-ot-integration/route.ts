/**
 * Blood Bank to Operation Theatre Integration API
 * 
 * This file implements the API endpoints for integrating Blood Bank and Operation Theatre modules,
 * enabling seamless blood product requests and tracking for surgical procedures.
 * 
 * FHIR Compliance: Uses ServiceRequest and BiologicallyDerivedProduct resources
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { logAuditEvent } from '@/lib/audit';
import { hasPermission } from '@/lib/permissions';
import { notifyBloodBankTeam } from '@/lib/notifications';
import { checkCompatibility } from '@/lib/bloodbank/compatibility-testing';

// Validation schema for surgical blood request
const surgicalBloodRequestSchema = z.object({
  scheduleId: z.string().uuid(),
  patientId: z.string().uuid(),
  productType: z.string(),
  bloodGroup: z.string().optional(),
  quantity: z.number().int().positive(),
  urgency: z.enum(['Routine', 'Urgent', 'Emergency']),
  requiredBy: z.string().transform(val => new Date(val)),
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
 * POST /api/integration/bloodbank-ot/request
 * 
 * Creates a new blood product request for a surgical procedure.
 * 
 * @param request - The incoming request object
 * @returns The newly created blood request with availability information
 */
export async function POST(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'OT_REQUEST_BLOOD')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = surgicalBloodRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data', details: validationResult.error.format() }, { status: 400 });
    }
    
    const requestData = validationResult.data;
    
    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Check if the schedule exists
      const schedule = await tx.otSchedule.findUnique({
        where: { id: requestData.scheduleId },
        include: {
          patient: true,
          surgeryType: true,
        },
      });
      
      if (!schedule) {
        throw new Error('Schedule not found');
      }
      
      // Verify patient ID matches schedule
      if (schedule.patientId !== requestData.patientId) {
        throw new Error('Patient ID does not match schedule');
      }
      
      // Get patient blood group if not provided
      const bloodGroup = requestData.bloodGroup || schedule.patient.bloodGroup;
      
      if (!bloodGroup) {
        throw new Error('Patient blood group is required');
      }
      
      // Check blood product availability
      const availableProducts = await tx.bloodInventory.findMany({
        where: {
          productType: requestData.productType,
          bloodGroup: {
            in: getCompatibleBloodGroups(bloodGroup, requestData.productType),
          },
          status: 'Available',
          expiryDate: {
            gt: new Date(),
          },
        },
      });
      
      const isAvailable = availableProducts.length >= requestData.quantity;
      
      // Create the blood request
      const bloodRequest = await tx.bloodTransfusionRequest.create({
        data: {
          patientId: requestData.patientId,
          requestingDepartment: 'Operation Theatre',
          requestingPhysicianId: session.user.id,
          productType: requestData.productType,
          bloodGroup: bloodGroup,
          quantity: requestData.quantity,
          urgency: requestData.urgency,
          requiredBy: requestData.requiredBy,
          clinicalIndication: requestData.clinicalIndication,
          specialRequirements: requestData.specialRequirements ? JSON.stringify(requestData.specialRequirements) : null,
          notes: requestData.notes,
          status: 'Pending',
          requestedById: session.user.id,
          otScheduleId: requestData.scheduleId,
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
          otSchedule: {
            select: {
              id: true,
              scheduledStart: true,
              surgeryType: true,
            },
          },
        },
      });
      
      // Link request to OT schedule
      await tx.otSchedule.update({
        where: { id: requestData.scheduleId },
        data: {
          bloodRequestId: bloodRequest.id,
        },
      });
      
      // Notify blood bank team based on urgency
      if (requestData.urgency === 'Emergency' || requestData.urgency === 'Urgent') {
        await notifyBloodBankTeam({
          requestId: bloodRequest.id,
          patientId: requestData.patientId,
          urgency: requestData.urgency,
          productType: requestData.productType,
          quantity: requestData.quantity,
          department: 'Operation Theatre',
          surgeryId: requestData.scheduleId,
        });
      }
      
      return {
        bloodRequest,
        availability: {
          isAvailable,
          availableCount: availableProducts.length,
          compatibleGroups: getCompatibleBloodGroups(bloodGroup, requestData.productType),
        },
      };
    });
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'OT_BLOOD_REQUEST_CREATE',
      'BloodTransfusionRequest',
      result.bloodRequest.id,
      { 
        requestId: result.bloodRequest.id,
        scheduleId: requestData.scheduleId,
        productType: requestData.productType,
        quantity: requestData.quantity,
        urgency: requestData.urgency,
      }
    );
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating blood request:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/integration/bloodbank-ot/requests
 * 
 * Retrieves blood product requests for surgical procedures.
 * 
 * @param request - The incoming request object
 * @returns List of blood requests for surgical procedures
 */
export async function GET(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'OT_VIEW_BLOOD_REQUESTS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse query parameters
    const url = new URL(request.url);
    const scheduleId = url.searchParams.get('scheduleId');
    const status = url.searchParams.get('status');
    
    // Build filter conditions
    const where: any = {
      requestingDepartment: 'Operation Theatre',
    };
    
    if (scheduleId) {
      where.otScheduleId = scheduleId;
    }
    
    if (status) {
      where.status = status;
    }
    
    // Fetch blood requests
    const bloodRequests = await prisma.bloodTransfusionRequest.findMany({
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
        otSchedule: {
          select: {
            id: true,
            scheduledStart: true,
            surgeryType: true,
          },
        },
      },
      orderBy: [
        { urgency: 'desc' },
        { requiredBy: 'asc' },
      ],
    });
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'OT_BLOOD_REQUESTS_VIEW',
      'BloodTransfusionRequest',
      null,
      { filters: { scheduleId, status } }
    );
    
    return NextResponse.json(bloodRequests);
  } catch (error) {
    console.error('Error fetching blood requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/integration/bloodbank-ot/request/[id]
 * 
 * Retrieves a specific blood product request for a surgical procedure.
 * 
 * @param request - The incoming request object
 * @param params - The route parameters containing the request ID
 * @returns The blood request with detailed information
 */
export async function GET_detail(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'OT_VIEW_BLOOD_REQUEST_DETAILS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = params;
    
    // Fetch blood request with detailed information
    const bloodRequest = await prisma.bloodTransfusionRequest.findUnique({
      where: { id },
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
        otSchedule: {
          select: {
            id: true,
            scheduledStart: true,
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
        },
        issues: {
          include: {
            products: true,
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
          },
        },
      },
    });
    
    if (!bloodRequest) {
      return NextResponse.json({ error: 'Blood request not found' }, { status: 404 });
    }
    
    // Check blood product availability
    const availableProducts = await prisma.bloodInventory.findMany({
      where: {
        productType: bloodRequest.productType,
        bloodGroup: {
          in: getCompatibleBloodGroups(bloodRequest.bloodGroup, bloodRequest.productType),
        },
        status: 'Available',
        expiryDate: {
          gt: new Date(),
        },
      },
    });
    
    const isAvailable = availableProducts.length >= bloodRequest.quantity;
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'OT_BLOOD_REQUEST_DETAIL_VIEW',
      'BloodTransfusionRequest',
      bloodRequest.id,
      { requestId: bloodRequest.id }
    );
    
    return NextResponse.json({
      bloodRequest,
      availability: {
        isAvailable,
        availableCount: availableProducts.length,
        compatibleGroups: getCompatibleBloodGroups(bloodRequest.bloodGroup, bloodRequest.productType),
      },
    });
  } catch (error) {
    console.error('Error fetching blood request details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Validation schema for blood product receipt confirmation
const bloodReceiptSchema = z.object({
  issueId: z.string().uuid(),
  receivedById: z.string().uuid(),
  notes: z.string().optional(),
  verificationCode: z.string(),
});

/**
 * POST /api/integration/bloodbank-ot/receipt
 * 
 * Confirms receipt of blood products in the operating theatre.
 * 
 * @param request - The incoming request object
 * @returns The updated blood issue record
 */
export async function POST_receipt(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'OT_CONFIRM_BLOOD_RECEIPT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = bloodReceiptSchema.safeParse({
      ...body,
      receivedById: body.receivedById || session.user.id,
    });
    
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data', details: validationResult.error.format() }, { status: 400 });
    }
    
    const receiptData = validationResult.data;
    
    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Check if the issue exists
      const issue = await tx.bloodIssue.findUnique({
        where: { id: receiptData.issueId },
        include: {
          request: true,
          products: true,
        },
      });
      
      if (!issue) {
        throw new Error('Blood issue not found');
      }
      
      // Verify the verification code
      if (issue.verificationCode !== receiptData.verificationCode) {
        throw new Error('Invalid verification code');
      }
      
      // Update the issue record
      const updatedIssue = await tx.bloodIssue.update({
        where: { id: receiptData.issueId },
        data: {
          receivedById: receiptData.receivedById,
          receivedAt: new Date(),
          receiptNotes: receiptData.notes,
          status: 'Received',
        },
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
              otSchedule: true,
            },
          },
          products: true,
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
        },
      });
      
      // Update the request status
      await tx.bloodTransfusionRequest.update({
        where: { id: issue.requestId },
        data: {
          status: 'Delivered',
        },
      });
      
      return updatedIssue;
    });
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'OT_BLOOD_RECEIPT_CONFIRM',
      'BloodIssue',
      result.id,
      { 
        issueId: result.id,
        requestId: result.request.id,
        productCount: result.products.length,
      }
    );
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error confirming blood receipt:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/integration/bloodbank-ot/transfusion-record
 * 
 * Records a blood transfusion performed during surgery.
 * 
 * @param request - The incoming request object
 * @returns The transfusion record
 */
export async function POST_transfusion_record(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'OT_RECORD_TRANSFUSION')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const body = await request.json();
    const { 
      scheduleId, 
      patientId, 
      productId, 
      startTime, 
      endTime, 
      administeredById, 
      verifiedById,
      vitalSigns,
      notes 
    } = body;
    
    if (!scheduleId || !patientId || !productId || !startTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Check if the schedule exists
      const schedule = await tx.otSchedule.findUnique({
        where: { id: scheduleId },
      });
      
      if (!schedule) {
        throw new Error('Schedule not found');
      }
      
      // Check if the patient matches the schedule
      if (schedule.patientId !== patientId) {
        throw new Error('Patient ID does not match schedule');
      }
      
      // Check if the product exists and is issued
      const product = await tx.bloodInventory.findUnique({
        where: { id: productId },
      });
      
      if (!product) {
        throw new Error('Blood product not found');
      }
      
      if (product.status !== 'Issued') {
        throw new Error(`Blood product is not issued (current status: ${product.status})`);
      }
      
      // Create the transfusion record
      const transfusionRecord = await tx.bloodTransfusion.create({
        data: {
          patientId,
          productId,
          scheduleId,
          startTime: new Date(startTime),
          endTime: endTime ? new Date(endTime) : undefined,
          administeredById: administeredById || session.user.id,
          verifiedById: verifiedById,
          vitalSigns: vitalSigns ? JSON.stringify(vitalSigns) : null,
          notes,
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
          product: true,
          schedule: {
            select: {
              id: true,
              surgeryType: true,
            },
          },
          administeredBy: {
            select: {
              id: true,
              name: true,
            },
          },
          verifiedBy: verifiedById ? {
            select: {
              id: true,
              name: true,
            },
          } : undefined,
        },
      });
      
      // Update product status if transfusion is complete
      if (endTime) {
        await tx.bloodInventory.update({
          where: { id: productId },
          data: {
            status: 'Transfused',
          },
        });
      }
      
      return transfusionRecord;
    });
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'OT_TRANSFUSION_RECORD',
      'BloodTransfusion',
      result.id,
      { 
        transfusionId: result.id,
        patientId,
        productId,
        scheduleId,
      }
    );
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error recording transfusion:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

/**
 * Helper function to get compatible blood groups
 * 
 * @param bloodGroup - The patient's blood group
 * @param productType - The type of blood product
 * @returns Array of compatible blood groups
 */
function getCompatibleBloodGroups(bloodGroup: string, productType: string): string[] {
  // For red blood cells
  if (productType === 'Red Blood Cells' || productType === 'Whole Blood') {
    switch (bloodGroup) {
      case 'A+': return ['A+', 'A-', 'O+', 'O-'];
      case 'A-': return ['A-', 'O-'];
      case 'B+': return ['B+', 'B-', 'O+', 'O-'];
      case 'B-': return ['B-', 'O-'];
      case 'AB+': return ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
      case 'AB-': return ['A-', 'B-', 'AB-', 'O-'];
      case 'O+': return ['O+', 'O-'];
      case 'O-': return ['O-'];
      default: return [bloodGroup];
    }
  }
  
  // For plasma
  if (productType === 'Fresh Frozen Plasma' || productType === 'Plasma') {
    switch (bloodGroup) {
      case 'A+': return ['A+', 'A-', 'AB+', 'AB-'];
      case 'A-': return ['A-', 'AB-'];
      case 'B+': return ['B+', 'B-', 'AB+', 'AB-'];
      case 'B-': return ['B-', 'AB-'];
      case 'AB+': return ['AB+', 'AB-'];
      case 'AB-': return ['AB-'];
      case 'O+': return ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
      case 'O-': return ['O-', 'A-', 'B-', 'AB-'];
      default: return [bloodGroup];
    }
  }
  
  // For platelets and cryoprecipitate (less stringent matching)
  return [bloodGroup];
}
