import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/middleware/error-handling.middleware';
import { SecurityService } from '@/lib/security.service';
import { HousekeepingService } from '@/lib/services/support-services/housekeeping/housekeeping.service';
import { z } from 'zod';

// Initialize service
const housekeepingService = new HousekeepingService();

// Request validation schemas
const createRequestSchema = z.object({
  locationId: z.string().uuid(),
  requestType: z.enum(['CLEANING', 'DISINFECTION', 'LINEN_CHANGE', 'WASTE_DISPOSAL', 'OTHER']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  description: z.string().min(5).max(500),
  scheduledTime: z.string().transform(val => new Date(val)),
  notes: z.string().max(1000).optional(),
  requestedById: z.string().uuid(),
});

const updateRequestSchema = z.object({
  requestType: z.enum(['CLEANING', 'DISINFECTION', 'LINEN_CHANGE', 'WASTE_DISPOSAL', 'OTHER']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  description: z.string().min(5).max(500).optional(),
  scheduledTime: z.string().transform(val => new Date(val)).optional(),
  notes: z.string().max(1000).optional(),
  status: z.enum(['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  assignedToId: z.string().uuid().optional(),
});

// GET /api/support-services/housekeeping/requests
export async function GET(request: NextRequest) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse query parameters
      const searchParams = req.nextUrl.searchParams;
      const filters = {
        status: searchParams.get('status') || undefined,
        priority: searchParams.get('priority') || undefined,
        locationId: searchParams.get('locationId') || undefined,
        requestType: searchParams.get('requestType') || undefined,
        fromDate: searchParams.get('fromDate') ? new Date(searchParams.get('fromDate')!) : undefined,
        toDate: searchParams.get('toDate') ? new Date(searchParams.get('toDate')!) : undefined,
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '10'),
      };

      // Get housekeeping requests with filters
      const result = await housekeepingService.getHousekeepingRequests(filters);
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'housekeeping:read',
      auditAction: 'HOUSEKEEPING_REQUESTS_VIEW',
    }
  );
}

// POST /api/support-services/housekeeping/requests
export async function POST(request: NextRequest) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse and validate request body
      const body = await req.json();
      const validatedData = createRequestSchema.parse(body);
      
      // Sanitize input data
      const sanitizedData = SecurityService.sanitizeObject(validatedData);
      
      // Create housekeeping request
      const result = await housekeepingService.createHousekeepingRequest(sanitizedData);
      
      return NextResponse.json(result, { status: 201 });
    },
    {
      requiredPermission: 'housekeeping:create',
      auditAction: 'HOUSEKEEPING_REQUEST_CREATE',
    }
  );
}

// GET /api/support-services/housekeeping/requests/:id
export async function GET_BY_ID(request: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(
    request,
    async (req) => {
      // Get housekeeping request by ID
      const includeFHIR = req.nextUrl.searchParams.get('fhir') === 'true';
      const result = await housekeepingService.getHousekeepingRequestById(params.id, includeFHIR);
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'housekeeping:read',
      auditAction: 'HOUSEKEEPING_REQUEST_VIEW',
    }
  );
}

// PATCH /api/support-services/housekeeping/requests/:id
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse and validate request body
      const body = await req.json();
      const validatedData = updateRequestSchema.parse(body);
      
      // Sanitize input data
      const sanitizedData = SecurityService.sanitizeObject(validatedData);
      
      // Update housekeeping request
      const result = await housekeepingService.updateHousekeepingRequest(params.id, sanitizedData);
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'housekeeping:update',
      auditAction: 'HOUSEKEEPING_REQUEST_UPDATE',
    }
  );
}

// DELETE /api/support-services/housekeeping/requests/:id
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(
    request,
    async (req) => {
      // Delete housekeeping request
      await housekeepingService.deleteHousekeepingRequest(params.id);
      
      return NextResponse.json({ success: true });
    },
    {
      requiredPermission: 'housekeeping:delete',
      auditAction: 'HOUSEKEEPING_REQUEST_DELETE',
    }
  );
}

// POST /api/support-services/housekeeping/requests/:id/assign
export async function ASSIGN(request: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse request body
      const body = await req.json();
      const { staffId } = body;
      
      if (!staffId) {
        return NextResponse.json({ error: 'Staff ID is required' }, { status: 400 });
      }
      
      // Assign housekeeping request
      const result = await housekeepingService.assignHousekeepingRequest(params.id, staffId);
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'housekeeping:assign',
      auditAction: 'HOUSEKEEPING_REQUEST_ASSIGN',
    }
  );
}

// POST /api/support-services/housekeeping/requests/:id/complete
export async function COMPLETE(request: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse request body
      const body = await req.json();
      const { notes, completedById } = body;
      
      // Complete housekeeping request
      const result = await housekeepingService.completeHousekeepingRequest(
        params.id,
        completedById,
        SecurityService.sanitizeInput(notes || '')
      );
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'housekeeping:update',
      auditAction: 'HOUSEKEEPING_REQUEST_COMPLETE',
    }
  );
}

// GET /api/support-services/housekeeping/analytics
export async function GET_ANALYTICS(request: NextRequest) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse query parameters
      const searchParams = req.nextUrl.searchParams;
      const fromDate = searchParams.get('fromDate') ? new Date(searchParams.get('fromDate')!) : undefined;
      const toDate = searchParams.get('toDate') ? new Date(searchParams.get('toDate')!) : undefined;
      
      // Get housekeeping analytics
      const result = await housekeepingService.getHousekeepingAnalytics(fromDate, toDate);
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'housekeeping:analytics',
      auditAction: 'HOUSEKEEPING_ANALYTICS_VIEW',
    }
  );
}
