import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { 
  withErrorHandling, 
  validateBody, 
  checkPermission, 
  createSuccessResponse 
} from '@/lib/core/middleware';
import { ValidationError, NotFoundError } from '@/lib/core/errors';
import { logger } from '@/lib/core/logging';
import { convertToFHIRCoverage } from '@/lib/core/fhir';

// Schema for insurance policy update
const updatePolicySchema = z.object({
  insuranceProviderId: z.string().uuid().optional(),
  policyNumber: z.string().optional(),
  groupNumber: z.string().optional(),
  groupName: z.string().optional(),
  subscriberId: z.string().uuid().optional(),
  relationship: z.enum(['self', 'spouse', 'child', 'other']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  coverageType: z.enum(['primary', 'secondary', 'tertiary']).optional(),
  planType: z.enum(['HMO', 'PPO', 'EPO', 'POS', 'HDHP', 'other']).optional(),
  copayAmount: z.number().optional(),
  coinsurancePercentage: z.number().optional(),
  deductibleAmount: z.number().optional(),
  deductibleMet: z.number().optional(),
  outOfPocketMax: z.number().optional(),
  outOfPocketMet: z.number().optional(),
  status: z.enum(['active', 'inactive', 'expired']).optional(),
  notes: z.string().optional(),
});

// Schema for policy verification
const verifyPolicySchema = z.object({
  verificationMethod: z.enum(['phone', 'portal', 'api', 'fax', 'email']),
  verificationReference: z.string().optional(),
  verifiedBy: z.string(),
  eligibilityStatus: z.enum(['eligible', 'ineligible', 'pending']),
  coverageDetails: z.string().optional(),
  notes: z.string().optional(),
});

// GET handler for retrieving a specific insurance policy
export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: { id: string } }) => {
  // Check permissions
  await checkPermission(permissionService, 'read', 'insurancePolicy')(req);
  
  // Get format from query parameters
  const url = new URL(req.url);
  const format = url.searchParams.get('format') || 'json';
  
  // Retrieve policy from database
  const policy = await prisma.insurancePolicy.findUnique({
    where: { id: params.id },
    include: {
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          mrn: true,
          dateOfBirth: true,
          gender: true,
          address: true,
          phone: true,
          email: true,
        },
      },
      subscriber: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          gender: true,
          address: true,
          phone: true,
          email: true,
        },
      },
      insuranceProvider: true,
      verifications: {
        orderBy: {
          verifiedAt: 'desc',
        },
      },
    },
  });
  
  if (!policy) {
    throw new NotFoundError(`Insurance policy with ID ${params.id} not found`);
  }
  
  // Convert to FHIR format if requested
  if (format === 'fhir') {
    const fhirCoverage = convertToFHIRCoverage(policy);
    return createSuccessResponse(fhirCoverage);
  }
  
  // Return standard JSON response
  return createSuccessResponse(policy);
});

// PUT handler for updating an insurance policy
export const PUT = withErrorHandling(async (req: NextRequest, { params }: { params: { id: string } }) => {
  // Validate request body
  const data = await validateBody(updatePolicySchema)(req);
  
  // Check permissions
  await checkPermission(permissionService, 'update', 'insurancePolicy')(req);
  
  // Retrieve existing policy
  const existingPolicy = await prisma.insurancePolicy.findUnique({
    where: { id: params.id },
  });
  
  if (!existingPolicy) {
    throw new NotFoundError(`Insurance policy with ID ${params.id} not found`);
  }
  
  // Check if insurance provider exists if provided
  if (data.insuranceProviderId) {
    const provider = await prisma.insuranceProvider.findUnique({
      where: { id: data.insuranceProviderId },
    });
    
    if (!provider) {
      throw new NotFoundError(`Insurance provider with ID ${data.insuranceProviderId} not found`);
    }
  }
  
  // Check if subscriber exists if provided
  if (data.subscriberId) {
    const subscriber = await prisma.patient.findUnique({
      where: { id: data.subscriberId },
    });
    
    if (!subscriber) {
      throw new NotFoundError(`Subscriber with ID ${data.subscriberId} not found`);
    }
  }
  
  // Determine policy status if dates are updated
  let status = data.status || existingPolicy.status;
  
  if (data.startDate || data.endDate) {
    const today = new Date();
    const startDate = data.startDate || existingPolicy.startDate;
    const endDate = data.endDate || existingPolicy.endDate;
    
    if (startDate <= today && (!endDate || endDate >= today)) {
      status = 'active';
    } else if (endDate && endDate < today) {
      status = 'expired';
    }
  }
  
  // Update policy in database
  const updatedPolicy = await prisma.insurancePolicy.update({
    where: { id: params.id },
    data: {
      insuranceProviderId: data.insuranceProviderId,
      policyNumber: data.policyNumber,
      groupNumber: data.groupNumber,
      groupName: data.groupName,
      subscriberId: data.subscriberId,
      relationship: data.relationship,
      startDate: data.startDate,
      endDate: data.endDate,
      coverageType: data.coverageType,
      planType: data.planType,
      copayAmount: data.copayAmount,
      coinsurancePercentage: data.coinsurancePercentage,
      deductibleAmount: data.deductibleAmount,
      deductibleMet: data.deductibleMet,
      outOfPocketMax: data.outOfPocketMax,
      outOfPocketMet: data.outOfPocketMet,
      status,
      notes: data.notes,
    },
    include: {
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          mrn: true,
        },
      },
      subscriber: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      insuranceProvider: true,
    },
  });
  
  logger.info('Insurance policy updated', { policyId: updatedPolicy.id });
  
  return createSuccessResponse(updatedPolicy);
});

// DELETE handler for deleting an insurance policy
export const DELETE = withErrorHandling(async (req: NextRequest, { params }: { params: { id: string } }) => {
  // Check permissions
  await checkPermission(permissionService, 'delete', 'insurancePolicy')(req);
  
  // Retrieve existing policy
  const existingPolicy = await prisma.insurancePolicy.findUnique({
    where: { id: params.id },
    include: {
      verifications: true,
    },
  });
  
  if (!existingPolicy) {
    throw new NotFoundError(`Insurance policy with ID ${params.id} not found`);
  }
  
  // Check if policy is used in any claims
  const claimsCount = await prisma.insuranceClaim.count({
    where: { insurancePolicyId: params.id },
  });
  
  if (claimsCount > 0) {
    throw new ValidationError(
      'Cannot delete policy that is used in claims',
      'POLICY_IN_USE',
      { claimsCount }
    );
  }
  
  // Delete policy in a transaction
  await prisma.$transaction(async (prisma) => {
    // Delete policy verifications
    await prisma.policyVerification.deleteMany({
      where: { policyId: params.id },
    });
    
    // Delete policy
    await prisma.insurancePolicy.delete({
      where: { id: params.id },
    });
  });
  
  logger.info('Insurance policy deleted', { policyId: params.id });
  
  return createSuccessResponse({ success: true, message: 'Insurance policy deleted successfully' });
});

// PATCH handler for policy operations (verify)
export const PATCH = withErrorHandling(async (req: NextRequest, { params }: { params: { id: string } }) => {
  // Get operation from query parameters
  const url = new URL(req.url);
  const operation = url.searchParams.get('operation');
  
  if (!operation) {
    throw new ValidationError('Operation parameter is required', 'MISSING_OPERATION');
  }
  
  // Retrieve existing policy
  const existingPolicy = await prisma.insurancePolicy.findUnique({
    where: { id: params.id },
  });
  
  if (!existingPolicy) {
    throw new NotFoundError(`Insurance policy with ID ${params.id} not found`);
  }
  
  // Handle different operations
  switch (operation) {
    case 'verify':
      return verifyPolicy(req, params.id, existingPolicy);
    default:
      throw new ValidationError(`Unknown operation: ${operation}`, 'INVALID_OPERATION');
  }
});

// Helper function to verify a policy
async function verifyPolicy(req: NextRequest, policyId: string, existingPolicy: any) {
  // Check permissions
  await checkPermission(permissionService, 'verify', 'insurancePolicy')(req);
  
  // Validate request body
  const data = await validateBody(verifyPolicySchema)(req);
  
  // Create verification record
  const verification = await prisma.policyVerification.create({
    data: {
      policyId,
      verificationMethod: data.verificationMethod,
      verificationReference: data.verificationReference,
      verifiedBy: data.verifiedBy,
      verifiedAt: new Date(),
      eligibilityStatus: data.eligibilityStatus,
      coverageDetails: data.coverageDetails,
      notes: data.notes,
    },
  });
  
  // Update policy with latest verification
  const updatedPolicy = await prisma.insurancePolicy.update({
    where: { id: policyId },
    data: {
      lastVerificationId: verification.id,
      lastVerifiedAt: verification.verifiedAt,
      lastEligibilityStatus: verification.eligibilityStatus,
    },
    include: {
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          mrn: true,
        },
      },
      subscriber: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      insuranceProvider: true,
      verifications: {
        orderBy: {
          verifiedAt: 'desc',
        },
        take: 5,
      },
    },
  });
  
  logger.info('Insurance policy verified', { 
    policyId, 
    verificationId: verification.id,
    status: data.eligibilityStatus,
    method: data.verificationMethod
  });
  
  return createSuccessResponse(updatedPolicy);
}
