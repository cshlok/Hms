import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/middleware/error-handling.middleware';
import { SecurityService } from '@/lib/security.service';
import { FeedbackService } from '@/lib/services/support-services/feedback/feedback.service';
import { z } from 'zod';

// Initialize service
const feedbackService = new FeedbackService();

// Validation schemas
const createFeedbackSchema = z.object({
  type: z.enum(['GENERAL', 'SERVICE', 'STAFF', 'FACILITY', 'CARE', 'OTHER']),
  subject: z.string().min(3).max(100),
  description: z.string().min(10).max(2000),
  rating: z.number().min(1).max(5).optional(),
  submittedById: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  staffId: z.string().uuid().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(20).optional(),
  isAnonymous: z.boolean().default(false),
});

const createComplaintSchema = z.object({
  category: z.enum(['CARE_QUALITY', 'STAFF_BEHAVIOR', 'BILLING', 'FACILITY', 'SAFETY', 'PRIVACY', 'OTHER']),
  subject: z.string().min(3).max(100),
  description: z.string().min(10).max(2000),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  submittedById: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  staffId: z.string().uuid().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(20).optional(),
  isAnonymous: z.boolean().default(false),
  desiredResolution: z.string().max(1000).optional(),
});

const updateFeedbackSchema = z.object({
  status: z.enum(['NEW', 'UNDER_REVIEW', 'ACKNOWLEDGED', 'RESOLVED', 'CLOSED']).optional(),
  response: z.string().max(2000).optional(),
  assignedToId: z.string().uuid().optional(),
  internalNotes: z.string().max(1000).optional(),
});

const updateComplaintSchema = z.object({
  status: z.enum(['NEW', 'UNDER_INVESTIGATION', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  response: z.string().max(2000).optional(),
  assignedToId: z.string().uuid().optional(),
  internalNotes: z.string().max(1000).optional(),
  resolutionDetails: z.string().max(2000).optional(),
  escalationLevel: z.enum(['DEPARTMENT', 'MANAGEMENT', 'EXECUTIVE', 'EXTERNAL']).optional(),
});

// GET /api/support-services/feedback
export async function GET(request: NextRequest) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse query parameters
      const searchParams = req.nextUrl.searchParams;
      const filters = {
        type: searchParams.get('type') || undefined,
        status: searchParams.get('status') || undefined,
        fromDate: searchParams.get('fromDate') ? new Date(searchParams.get('fromDate')!) : undefined,
        toDate: searchParams.get('toDate') ? new Date(searchParams.get('toDate')!) : undefined,
        departmentId: searchParams.get('departmentId') || undefined,
        staffId: searchParams.get('staffId') || undefined,
        patientId: searchParams.get('patientId') || undefined,
        minRating: searchParams.get('minRating') ? parseInt(searchParams.get('minRating')!) : undefined,
        maxRating: searchParams.get('maxRating') ? parseInt(searchParams.get('maxRating')!) : undefined,
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '10'),
      };

      // Get feedback with filters
      const result = await feedbackService.getFeedback(filters);
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'feedback:read',
      auditAction: 'FEEDBACK_VIEW',
    }
  );
}

// POST /api/support-services/feedback
export async function POST(request: NextRequest) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse and validate request body
      const body = await req.json();
      const validatedData = createFeedbackSchema.parse(body);
      
      // Sanitize input data
      const sanitizedData = SecurityService.sanitizeObject(validatedData);
      
      // Create feedback
      const result = await feedbackService.createFeedback(sanitizedData);
      
      return NextResponse.json(result, { status: 201 });
    },
    {
      // Allow anonymous feedback submission
      skipAuth: true,
      auditAction: 'FEEDBACK_CREATE',
    }
  );
}

// GET /api/support-services/feedback/:id
export async function GET_BY_ID(request: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(
    request,
    async (req) => {
      // Get feedback by ID
      const includeFHIR = req.nextUrl.searchParams.get('fhir') === 'true';
      const result = await feedbackService.getFeedbackById(params.id, includeFHIR);
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'feedback:read',
      auditAction: 'FEEDBACK_DETAIL_VIEW',
    }
  );
}

// PATCH /api/support-services/feedback/:id
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse and validate request body
      const body = await req.json();
      const validatedData = updateFeedbackSchema.parse(body);
      
      // Sanitize input data
      const sanitizedData = SecurityService.sanitizeObject(validatedData);
      
      // Update feedback
      const result = await feedbackService.updateFeedback(params.id, sanitizedData);
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'feedback:update',
      auditAction: 'FEEDBACK_UPDATE',
    }
  );
}

// GET /api/support-services/complaints
export async function GET_COMPLAINTS(request: NextRequest) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse query parameters
      const searchParams = req.nextUrl.searchParams;
      const filters = {
        category: searchParams.get('category') || undefined,
        status: searchParams.get('status') || undefined,
        severity: searchParams.get('severity') || undefined,
        fromDate: searchParams.get('fromDate') ? new Date(searchParams.get('fromDate')!) : undefined,
        toDate: searchParams.get('toDate') ? new Date(searchParams.get('toDate')!) : undefined,
        departmentId: searchParams.get('departmentId') || undefined,
        staffId: searchParams.get('staffId') || undefined,
        patientId: searchParams.get('patientId') || undefined,
        escalationLevel: searchParams.get('escalationLevel') || undefined,
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '10'),
      };

      // Get complaints with filters
      const result = await feedbackService.getComplaints(filters);
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'complaints:read',
      auditAction: 'COMPLAINTS_VIEW',
    }
  );
}

// POST /api/support-services/complaints
export async function POST_COMPLAINT(request: NextRequest) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse and validate request body
      const body = await req.json();
      const validatedData = createComplaintSchema.parse(body);
      
      // Sanitize input data
      const sanitizedData = SecurityService.sanitizeObject(validatedData);
      
      // Create complaint
      const result = await feedbackService.createComplaint(sanitizedData);
      
      return NextResponse.json(result, { status: 201 });
    },
    {
      // Allow anonymous complaint submission
      skipAuth: true,
      auditAction: 'COMPLAINT_CREATE',
    }
  );
}

// GET /api/support-services/complaints/:id
export async function GET_COMPLAINT_BY_ID(request: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(
    request,
    async (req) => {
      // Get complaint by ID
      const includeFHIR = req.nextUrl.searchParams.get('fhir') === 'true';
      const result = await feedbackService.getComplaintById(params.id, includeFHIR);
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'complaints:read',
      auditAction: 'COMPLAINT_DETAIL_VIEW',
    }
  );
}

// PATCH /api/support-services/complaints/:id
export async function PATCH_COMPLAINT(request: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse and validate request body
      const body = await req.json();
      const validatedData = updateComplaintSchema.parse(body);
      
      // Sanitize input data
      const sanitizedData = SecurityService.sanitizeObject(validatedData);
      
      // Update complaint
      const result = await feedbackService.updateComplaint(params.id, sanitizedData);
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'complaints:update',
      auditAction: 'COMPLAINT_UPDATE',
    }
  );
}

// POST /api/support-services/complaints/:id/escalate
export async function ESCALATE_COMPLAINT(request: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse request body
      const body = await req.json();
      const { escalationLevel, reason, escalatedById } = body;
      
      if (!escalationLevel) {
        return NextResponse.json({ error: 'Escalation level is required' }, { status: 400 });
      }
      
      // Escalate complaint
      const result = await feedbackService.escalateComplaint(
        params.id,
        escalationLevel,
        SecurityService.sanitizeInput(reason || ''),
        escalatedById
      );
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'complaints:escalate',
      auditAction: 'COMPLAINT_ESCALATE',
    }
  );
}

// GET /api/support-services/feedback/analytics
export async function GET_ANALYTICS(request: NextRequest) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse query parameters
      const searchParams = req.nextUrl.searchParams;
      const fromDate = searchParams.get('fromDate') ? new Date(searchParams.get('fromDate')!) : undefined;
      const toDate = searchParams.get('toDate') ? new Date(searchParams.get('toDate')!) : undefined;
      const departmentId = searchParams.get('departmentId') || undefined;
      
      // Get feedback analytics
      const result = await feedbackService.getFeedbackAnalytics(fromDate, toDate, departmentId);
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'feedback:analytics',
      auditAction: 'FEEDBACK_ANALYTICS_VIEW',
    }
  );
}
