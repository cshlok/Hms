import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { 
  withErrorHandling, 
  validateBody, 
  checkPermission, 
  createSuccessResponse 
} from '@/lib/core/middleware';
import { ValidationError, NotFoundError, BusinessLogicError } from '@/lib/core/errors';
import { claimStatusSchema } from '@/lib/core/validation';
import { convertToFHIRClaim } from '@/lib/core/fhir';
import { logger } from '@/lib/core/logging';

// Schema for claim update
const updateClaimSchema = z.object({
  status: claimStatusSchema.optional(),
  notes: z.string().optional(),
  preAuthorizationNumber: z.string().optional(),
});

// Schema for claim submission
const submitClaimSchema = z.object({
  submittedBy: z.string(),
  submissionMethod: z.enum(['electronic', 'paper', 'fax', 'portal']),
  submissionReference: z.string().optional(),
  notes: z.string().optional(),
});

// Schema for claim response
const claimResponseSchema = z.object({
  responseDate: z.coerce.date(),
  responseReference: z.string(),
  status: z.enum(['approved', 'partially_approved', 'denied', 'pending_additional_info']),
  approvedAmount: z.number().optional(),
  deniedAmount: z.number().optional(),
  denialReason: z.string().optional(),
  notes: z.string().optional(),
  paymentExpectedDate: z.coerce.date().optional(),
  additionalInfoRequested: z.string().optional(),
});

// GET handler for retrieving a specific claim
export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: { id: string } }) => {
  // Check permissions
  await checkPermission(permissionService, 'read', 'claim')(req);
  
  // Get format from query parameters
  const url = new URL(req.url);
  const format = url.searchParams.get('format') || 'json';
  
  // Retrieve claim from database
  const claim = await prisma.insuranceClaim.findUnique({
    where: { id: params.id },
    include: {
      invoice: {
        select: {
          id: true,
          billNumber: true,
          patientId: true,
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              mrn: true,
            },
          },
        },
      },
      insurancePolicy: {
        select: {
          id: true,
          policyNumber: true,
          insuranceProvider: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      diagnoses: true,
      items: {
        include: {
          serviceItem: true,
        },
      },
      followUps: true,
      responses: true,
    },
  });
  
  if (!claim) {
    throw new NotFoundError(`Claim with ID ${params.id} not found`);
  }
  
  // Convert to FHIR format if requested
  if (format === 'fhir') {
    const fhirClaim = convertToFHIRClaim(claim);
    return createSuccessResponse(fhirClaim);
  }
  
  // Return standard JSON response
  return createSuccessResponse(claim);
});

// PUT handler for updating a claim
export const PUT = withErrorHandling(async (req: NextRequest, { params }: { params: { id: string } }) => {
  // Validate request body
  const data = await validateBody(updateClaimSchema)(req);
  
  // Check permissions
  await checkPermission(permissionService, 'update', 'claim')(req);
  
  // Retrieve existing claim
  const existingClaim = await prisma.insuranceClaim.findUnique({
    where: { id: params.id },
  });
  
  if (!existingClaim) {
    throw new NotFoundError(`Claim with ID ${params.id} not found`);
  }
  
  // Check if claim can be updated (only draft claims can be updated)
  if (existingClaim.status !== 'draft') {
    throw new ValidationError(
      'Only draft claims can be updated',
      'CLAIM_UPDATE_FORBIDDEN',
      { currentStatus: existingClaim.status }
    );
  }
  
  // Prepare update data
  const updateData: any = {};
  
  if (data.status) updateData.status = data.status;
  if (data.notes) updateData.notes = data.notes;
  if (data.preAuthorizationNumber) updateData.preAuthorizationNumber = data.preAuthorizationNumber;
  
  // Update claim
  const updatedClaim = await prisma.insuranceClaim.update({
    where: { id: params.id },
    data: updateData,
    include: {
      invoice: {
        select: {
          id: true,
          billNumber: true,
          patientId: true,
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              mrn: true,
            },
          },
        },
      },
      insurancePolicy: {
        select: {
          id: true,
          policyNumber: true,
          insuranceProvider: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      diagnoses: true,
      items: {
        include: {
          serviceItem: true,
        },
      },
    },
  });
  
  logger.info('Claim updated', { claimId: updatedClaim.id });
  
  return createSuccessResponse(updatedClaim);
});

// DELETE handler for deleting a claim
export const DELETE = withErrorHandling(async (req: NextRequest, { params }: { params: { id: string } }) => {
  // Check permissions
  await checkPermission(permissionService, 'delete', 'claim')(req);
  
  // Retrieve existing claim
  const existingClaim = await prisma.insuranceClaim.findUnique({
    where: { id: params.id },
  });
  
  if (!existingClaim) {
    throw new NotFoundError(`Claim with ID ${params.id} not found`);
  }
  
  // Check if claim can be deleted (only draft claims can be deleted)
  if (existingClaim.status !== 'draft') {
    throw new ValidationError(
      'Only draft claims can be deleted',
      'CLAIM_DELETE_FORBIDDEN',
      { currentStatus: existingClaim.status }
    );
  }
  
  // Delete claim in a transaction
  await prisma.$transaction(async (prisma) => {
    // Delete claim items
    await prisma.claimItem.deleteMany({
      where: { claimId: params.id },
    });
    
    // Delete claim diagnoses
    await prisma.claimDiagnosis.deleteMany({
      where: { claimId: params.id },
    });
    
    // Delete claim follow-ups
    await prisma.claimFollowUp.deleteMany({
      where: { claimId: params.id },
    });
    
    // Delete claim responses
    await prisma.claimResponse.deleteMany({
      where: { claimId: params.id },
    });
    
    // Update invoice to remove claim reference
    await prisma.bill.updateMany({
      where: { insuranceClaimId: params.id },
      data: { insuranceClaimId: null },
    });
    
    // Delete claim
    await prisma.insuranceClaim.delete({
      where: { id: params.id },
    });
  });
  
  logger.info('Claim deleted', { claimId: params.id });
  
  return createSuccessResponse({ success: true, message: 'Claim deleted successfully' });
});

// PATCH handler for claim operations (submit, respond)
export const PATCH = withErrorHandling(async (req: NextRequest, { params }: { params: { id: string } }) => {
  // Get operation from query parameters
  const url = new URL(req.url);
  const operation = url.searchParams.get('operation');
  
  if (!operation) {
    throw new ValidationError('Operation parameter is required', 'MISSING_OPERATION');
  }
  
  // Retrieve existing claim
  const existingClaim = await prisma.insuranceClaim.findUnique({
    where: { id: params.id },
  });
  
  if (!existingClaim) {
    throw new NotFoundError(`Claim with ID ${params.id} not found`);
  }
  
  // Handle different operations
  switch (operation) {
    case 'submit':
      return submitClaim(req, params.id, existingClaim);
    case 'respond':
      return recordClaimResponse(req, params.id, existingClaim);
    default:
      throw new ValidationError(`Unknown operation: ${operation}`, 'INVALID_OPERATION');
  }
});

// Helper function to submit a claim
async function submitClaim(req: NextRequest, claimId: string, existingClaim: any) {
  // Check permissions
  await checkPermission(permissionService, 'submit', 'claim')(req);
  
  // Validate request body
  const data = await validateBody(submitClaimSchema)(req);
  
  // Check if claim can be submitted
  if (existingClaim.status !== 'draft') {
    throw new ValidationError(
      'Only draft claims can be submitted',
      'CLAIM_SUBMIT_FORBIDDEN',
      { currentStatus: existingClaim.status }
    );
  }
  
  // Update claim
  const updatedClaim = await prisma.insuranceClaim.update({
    where: { id: claimId },
    data: {
      status: 'submitted',
      submittedBy: data.submittedBy,
      submittedAt: new Date(),
      submissionMethod: data.submissionMethod,
      submissionReference: data.submissionReference,
      notes: data.notes,
    },
    include: {
      invoice: {
        select: {
          id: true,
          billNumber: true,
          patientId: true,
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              mrn: true,
            },
          },
        },
      },
      insurancePolicy: {
        select: {
          id: true,
          policyNumber: true,
          insuranceProvider: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      diagnoses: true,
      items: {
        include: {
          serviceItem: true,
        },
      },
    },
  });
  
  logger.info('Claim submitted', { 
    claimId, 
    submittedBy: data.submittedBy,
    method: data.submissionMethod
  });
  
  return createSuccessResponse(updatedClaim);
}

// Helper function to record a claim response
async function recordClaimResponse(req: NextRequest, claimId: string, existingClaim: any) {
  // Check permissions
  await checkPermission(permissionService, 'respond', 'claim')(req);
  
  // Validate request body
  const data = await validateBody(claimResponseSchema)(req);
  
  // Check if claim can receive a response
  if (existingClaim.status !== 'submitted' && existingClaim.status !== 'in_progress') {
    throw new ValidationError(
      'Only submitted or in-progress claims can receive responses',
      'CLAIM_RESPONSE_FORBIDDEN',
      { currentStatus: existingClaim.status }
    );
  }
  
  // Determine new claim status based on response
  let newClaimStatus;
  switch (data.status) {
    case 'approved':
      newClaimStatus = 'approved';
      break;
    case 'partially_approved':
      newClaimStatus = 'partially_approved';
      break;
    case 'denied':
      newClaimStatus = 'denied';
      break;
    case 'pending_additional_info':
      newClaimStatus = 'additional_info_needed';
      break;
    default:
      newClaimStatus = existingClaim.status;
  }
  
  // Create response and update claim in a transaction
  const result = await prisma.$transaction(async (prisma) => {
    // Create claim response
    const response = await prisma.claimResponse.create({
      data: {
        claimId,
        responseDate: data.responseDate,
        responseReference: data.responseReference,
        status: data.status,
        approvedAmount: data.approvedAmount,
        deniedAmount: data.deniedAmount,
        denialReason: data.denialReason,
        notes: data.notes,
        paymentExpectedDate: data.paymentExpectedDate,
        additionalInfoRequested: data.additionalInfoRequested,
      },
    });
    
    // Update claim status
    const updatedClaim = await prisma.insuranceClaim.update({
      where: { id: claimId },
      data: {
        status: newClaimStatus,
        lastResponseId: response.id,
        lastResponseDate: data.responseDate,
      },
      include: {
        invoice: {
          select: {
            id: true,
            billNumber: true,
            patientId: true,
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                mrn: true,
              },
            },
          },
        },
        insurancePolicy: {
          select: {
            id: true,
            policyNumber: true,
            insuranceProvider: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        diagnoses: true,
        items: {
          include: {
            serviceItem: true,
          },
        },
        responses: true,
      },
    });
    
    return { response, updatedClaim };
  });
  
  logger.info('Claim response recorded', { 
    claimId, 
    responseId: result.response.id,
    status: data.status
  });
  
  return createSuccessResponse(result.updatedClaim);
}
