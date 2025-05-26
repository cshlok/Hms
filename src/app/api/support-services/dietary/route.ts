import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/middleware/error-handling.middleware';
import { SecurityService } from '@/lib/security.service';
import { DietaryService } from '@/lib/services/support-services/dietary/dietary.service';
import { z } from 'zod';

// Initialize service
const dietaryService = new DietaryService();

// Request validation schemas
const createDietaryRequestSchema = z.object({
  patientId: z.string().uuid(),
  mealType: z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']),
  dietType: z.enum(['REGULAR', 'VEGETARIAN', 'VEGAN', 'GLUTEN_FREE', 'DIABETIC', 'LOW_SODIUM', 'LIQUID', 'SOFT', 'CUSTOM']),
  customDietDetails: z.string().max(500).optional(),
  allergies: z.array(z.string()).optional(),
  preferences: z.array(z.string()).optional(),
  scheduledTime: z.string().transform(val => new Date(val)),
  notes: z.string().max(1000).optional(),
  requestedById: z.string().uuid(),
  locationId: z.string().uuid(),
});

const updateDietaryRequestSchema = z.object({
  mealType: z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']).optional(),
  dietType: z.enum(['REGULAR', 'VEGETARIAN', 'VEGAN', 'GLUTEN_FREE', 'DIABETIC', 'LOW_SODIUM', 'LIQUID', 'SOFT', 'CUSTOM']).optional(),
  customDietDetails: z.string().max(500).optional(),
  allergies: z.array(z.string()).optional(),
  preferences: z.array(z.string()).optional(),
  scheduledTime: z.string().transform(val => new Date(val)).optional(),
  notes: z.string().max(1000).optional(),
  status: z.enum(['PENDING', 'PREPARING', 'READY', 'DELIVERED', 'COMPLETED', 'CANCELLED']).optional(),
  locationId: z.string().uuid().optional(),
});

// GET /api/support-services/dietary/requests
export async function GET(request: NextRequest) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse query parameters
      const searchParams = req.nextUrl.searchParams;
      const filters = {
        status: searchParams.get('status') || undefined,
        patientId: searchParams.get('patientId') || undefined,
        mealType: searchParams.get('mealType') || undefined,
        dietType: searchParams.get('dietType') || undefined,
        fromDate: searchParams.get('fromDate') ? new Date(searchParams.get('fromDate')!) : undefined,
        toDate: searchParams.get('toDate') ? new Date(searchParams.get('toDate')!) : undefined,
        locationId: searchParams.get('locationId') || undefined,
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '10'),
      };

      // Get dietary requests with filters
      const result = await dietaryService.getDietaryRequests(filters);
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'dietary:read',
      auditAction: 'DIETARY_REQUESTS_VIEW',
    }
  );
}

// POST /api/support-services/dietary/requests
export async function POST(request: NextRequest) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse and validate request body
      const body = await req.json();
      const validatedData = createDietaryRequestSchema.parse(body);
      
      // Sanitize input data
      const sanitizedData = SecurityService.sanitizeObject(validatedData);
      
      // Create dietary request
      const result = await dietaryService.createDietaryRequest(sanitizedData);
      
      return NextResponse.json(result, { status: 201 });
    },
    {
      requiredPermission: 'dietary:create',
      auditAction: 'DIETARY_REQUEST_CREATE',
    }
  );
}

// GET /api/support-services/dietary/requests/:id
export async function GET_BY_ID(request: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(
    request,
    async (req) => {
      // Get dietary request by ID
      const includeFHIR = req.nextUrl.searchParams.get('fhir') === 'true';
      const result = await dietaryService.getDietaryRequestById(params.id, includeFHIR);
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'dietary:read',
      auditAction: 'DIETARY_REQUEST_VIEW',
    }
  );
}

// PATCH /api/support-services/dietary/requests/:id
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse and validate request body
      const body = await req.json();
      const validatedData = updateDietaryRequestSchema.parse(body);
      
      // Sanitize input data
      const sanitizedData = SecurityService.sanitizeObject(validatedData);
      
      // Update dietary request
      const result = await dietaryService.updateDietaryRequest(params.id, sanitizedData);
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'dietary:update',
      auditAction: 'DIETARY_REQUEST_UPDATE',
    }
  );
}

// DELETE /api/support-services/dietary/requests/:id
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(
    request,
    async (req) => {
      // Delete dietary request
      await dietaryService.deleteDietaryRequest(params.id);
      
      return NextResponse.json({ success: true });
    },
    {
      requiredPermission: 'dietary:delete',
      auditAction: 'DIETARY_REQUEST_DELETE',
    }
  );
}

// POST /api/support-services/dietary/requests/:id/prepare
export async function PREPARE(request: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse request body
      const body = await req.json();
      const { staffId, notes } = body;
      
      if (!staffId) {
        return NextResponse.json({ error: 'Staff ID is required' }, { status: 400 });
      }
      
      // Mark dietary request as preparing
      const result = await dietaryService.prepareDietaryRequest(
        params.id,
        staffId,
        SecurityService.sanitizeInput(notes || '')
      );
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'dietary:update',
      auditAction: 'DIETARY_REQUEST_PREPARE',
    }
  );
}

// POST /api/support-services/dietary/requests/:id/deliver
export async function DELIVER(request: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse request body
      const body = await req.json();
      const { staffId, notes } = body;
      
      if (!staffId) {
        return NextResponse.json({ error: 'Staff ID is required' }, { status: 400 });
      }
      
      // Mark dietary request as delivered
      const result = await dietaryService.deliverDietaryRequest(
        params.id,
        staffId,
        SecurityService.sanitizeInput(notes || '')
      );
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'dietary:update',
      auditAction: 'DIETARY_REQUEST_DELIVER',
    }
  );
}

// GET /api/support-services/dietary/menus
export async function GET_MENUS(request: NextRequest) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse query parameters
      const searchParams = req.nextUrl.searchParams;
      const filters = {
        dietType: searchParams.get('dietType') || undefined,
        mealType: searchParams.get('mealType') || undefined,
        isActive: searchParams.get('isActive') === 'true',
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '10'),
      };

      // Get dietary menus with filters
      const result = await dietaryService.getDietaryMenus(filters);
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'dietary:read',
      auditAction: 'DIETARY_MENUS_VIEW',
    }
  );
}

// GET /api/support-services/dietary/analytics
export async function GET_ANALYTICS(request: NextRequest) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse query parameters
      const searchParams = req.nextUrl.searchParams;
      const fromDate = searchParams.get('fromDate') ? new Date(searchParams.get('fromDate')!) : undefined;
      const toDate = searchParams.get('toDate') ? new Date(searchParams.get('toDate')!) : undefined;
      
      // Get dietary analytics
      const result = await dietaryService.getDietaryAnalytics(fromDate, toDate);
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'dietary:analytics',
      auditAction: 'DIETARY_ANALYTICS_VIEW',
    }
  );
}
