import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { 
  withErrorHandling, 
  validateBody, 
  validateQuery, 
  checkPermission, 
  createSuccessResponse,
  createPaginatedResponse
} from '@/lib/core/middleware';
import { ValidationError, NotFoundError } from '@/lib/core/errors';
import { logger } from '@/lib/core/logging';
import { convertToFHIRCoverage } from '@/lib/core/fhir';

// Schema for insurance policy creation
const createPolicySchema = z.object({
  patientId: z.string().uuid(),
  insuranceProviderId: z.string().uuid(),
  policyNumber: z.string(),
  groupNumber: z.string().optional(),
  groupName: z.string().optional(),
  subscriberId: z.string().uuid().optional(),
  relationship: z.enum(['self', 'spouse', 'child', 'other']).default('self'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  coverageType: z.enum(['primary', 'secondary', 'tertiary']).default('primary'),
  planType: z.enum(['HMO', 'PPO', 'EPO', 'POS', 'HDHP', 'other']),
  copayAmount: z.number().optional(),
  coinsurancePercentage: z.number().optional(),
  deductibleAmount: z.number().optional(),
  deductibleMet: z.number().optional(),
  outOfPocketMax: z.number().optional(),
  outOfPocketMet: z.number().optional(),
  notes: z.string().optional(),
});

// Schema for insurance policy query parameters
const policyQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  patientId: z.string().uuid().optional(),
  insuranceProviderId: z.string().uuid().optional(),
  status: z.enum(['active', 'inactive', 'expired']).optional(),
  coverageType: z.enum(['primary', 'secondary', 'tertiary']).optional(),
  planType: z.enum(['HMO', 'PPO', 'EPO', 'POS', 'HDHP', 'other']).optional(),
  sortBy: z.enum(['startDate', 'endDate', 'createdAt']).optional().default('startDate'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  format: z.enum(['json', 'fhir']).optional().default('json'),
});

// GET handler for retrieving all insurance policies with filtering and pagination
export const GET = withErrorHandling(async (req: NextRequest) => {
  // Validate query parameters
  const query = validateQuery(policyQuerySchema)(req);
  
  // Check permissions
  await checkPermission(permissionService, 'read', 'insurancePolicy')(req);
  
  // Build filter conditions
  const where: any = {};
  
  if (query.patientId) {
    where.patientId = query.patientId;
  }
  
  if (query.insuranceProviderId) {
    where.insuranceProviderId = query.insuranceProviderId;
  }
  
  if (query.status) {
    if (query.status === 'active') {
      const today = new Date();
      where.startDate = { lte: today };
      where.OR = [
        { endDate: null },
        { endDate: { gte: today } }
      ];
    } else if (query.status === 'expired') {
      const today = new Date();
      where.endDate = { lt: today };
    } else if (query.status === 'inactive') {
      where.status = 'inactive';
    }
  }
  
  if (query.coverageType) {
    where.coverageType = query.coverageType;
  }
  
  if (query.planType) {
    where.planType = query.planType;
  }
  
  // Execute query with pagination
  const [policies, total] = await Promise.all([
    prisma.insurancePolicy.findMany({
      where,
      orderBy: {
        [query.sortBy]: query.sortOrder,
      },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            mrn: true,
            dateOfBirth: true,
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
    }),
    prisma.insurancePolicy.count({ where }),
  ]);
  
  // Convert to FHIR format if requested
  if (query.format === 'fhir') {
    const fhirCoverages = policies.map(policy => convertToFHIRCoverage(policy));
    return createPaginatedResponse(fhirCoverages, query.page, query.pageSize, total);
  }
  
  // Return standard JSON response
  return createPaginatedResponse(policies, query.page, query.pageSize, total);
});

// POST handler for creating a new insurance policy
export const POST = withErrorHandling(async (req: NextRequest) => {
  // Validate request body
  const data = await validateBody(createPolicySchema)(req);
  
  // Check permissions
  await checkPermission(permissionService, 'create', 'insurancePolicy')(req);
  
  // Check if patient exists
  const patient = await prisma.patient.findUnique({
    where: { id: data.patientId },
  });
  
  if (!patient) {
    throw new NotFoundError(`Patient with ID ${data.patientId} not found`);
  }
  
  // Check if insurance provider exists
  const provider = await prisma.insuranceProvider.findUnique({
    where: { id: data.insuranceProviderId },
  });
  
  if (!provider) {
    throw new NotFoundError(`Insurance provider with ID ${data.insuranceProviderId} not found`);
  }
  
  // Check if subscriber exists if provided
  if (data.subscriberId && data.subscriberId !== data.patientId) {
    const subscriber = await prisma.patient.findUnique({
      where: { id: data.subscriberId },
    });
    
    if (!subscriber) {
      throw new NotFoundError(`Subscriber with ID ${data.subscriberId} not found`);
    }
  } else {
    // If subscriber is not provided, use patient as subscriber
    data.subscriberId = data.patientId;
    data.relationship = 'self';
  }
  
  // Determine policy status
  const today = new Date();
  let status = 'inactive';
  
  if (data.startDate <= today && (!data.endDate || data.endDate >= today)) {
    status = 'active';
  } else if (data.endDate && data.endDate < today) {
    status = 'expired';
  }
  
  // Create policy in database
  const policy = await prisma.insurancePolicy.create({
    data: {
      patientId: data.patientId,
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
  
  logger.info('Insurance policy created', { 
    policyId: policy.id, 
    policyNumber: policy.policyNumber,
    patientId: policy.patientId,
    providerId: policy.insuranceProviderId
  });
  
  return createSuccessResponse(policy);
});
