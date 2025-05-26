import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/middleware/error-handling.middleware';
import { SecurityService } from '@/lib/security.service';
import { MaintenanceService } from '@/lib/services/support-services/maintenance/maintenance.service';
import { z } from 'zod';

// Initialize service
const maintenanceService = new MaintenanceService();

// Request validation schemas
const createRequestSchema = z.object({
  assetId: z.string().uuid(),
  requestType: z.enum(['PREVENTIVE', 'CORRECTIVE', 'EMERGENCY', 'INSPECTION', 'INSTALLATION', 'OTHER']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  description: z.string().min(5).max(500),
  scheduledTime: z.string().transform(val => new Date(val)),
  notes: z.string().max(1000).optional(),
  requestedById: z.string().uuid(),
  departmentId: z.string().uuid().optional(),
  estimatedDuration: z.number().min(1).optional(), // in minutes
});

const updateRequestSchema = z.object({
  requestType: z.enum(['PREVENTIVE', 'CORRECTIVE', 'EMERGENCY', 'INSPECTION', 'INSTALLATION', 'OTHER']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  description: z.string().min(5).max(500).optional(),
  scheduledTime: z.string().transform(val => new Date(val)).optional(),
  notes: z.string().max(1000).optional(),
  status: z.enum(['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
  assignedToId: z.string().uuid().optional(),
  estimatedDuration: z.number().min(1).optional(),
  partsRequired: z.array(z.object({
    partId: z.string().uuid(),
    quantity: z.number().min(1),
  })).optional(),
});

// GET /api/support-services/maintenance/requests
export async function GET(request: NextRequest) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse query parameters
      const searchParams = req.nextUrl.searchParams;
      const filters = {
        status: searchParams.get('status') || undefined,
        priority: searchParams.get('priority') || undefined,
        assetId: searchParams.get('assetId') || undefined,
        requestType: searchParams.get('requestType') || undefined,
        departmentId: searchParams.get('departmentId') || undefined,
        fromDate: searchParams.get('fromDate') ? new Date(searchParams.get('fromDate')!) : undefined,
        toDate: searchParams.get('toDate') ? new Date(searchParams.get('toDate')!) : undefined,
        assignedToId: searchParams.get('assignedToId') || undefined,
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '10'),
      };

      // Get maintenance requests with filters
      const result = await maintenanceService.getMaintenanceRequests(filters);
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'maintenance:read',
      auditAction: 'MAINTENANCE_REQUESTS_VIEW',
    }
  );
}

// POST /api/support-services/maintenance/requests
export async function POST(request: NextRequest) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse and validate request body
      const body = await req.json();
      const validatedData = createRequestSchema.parse(body);
      
      // Sanitize input data
      const sanitizedData = SecurityService.sanitizeObject(validatedData);
      
      // Create maintenance request
      const result = await maintenanceService.createMaintenanceRequest(sanitizedData);
      
      return NextResponse.json(result, { status: 201 });
    },
    {
      requiredPermission: 'maintenance:create',
      auditAction: 'MAINTENANCE_REQUEST_CREATE',
    }
  );
}

// GET /api/support-services/maintenance/requests/:id
export async function GET_BY_ID(request: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(
    request,
    async (req) => {
      // Get maintenance request by ID
      const includeFHIR = req.nextUrl.searchParams.get('fhir') === 'true';
      const result = await maintenanceService.getMaintenanceRequestById(params.id, includeFHIR);
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'maintenance:read',
      auditAction: 'MAINTENANCE_REQUEST_VIEW',
    }
  );
}

// PATCH /api/support-services/maintenance/requests/:id
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse and validate request body
      const body = await req.json();
      const validatedData = updateRequestSchema.parse(body);
      
      // Sanitize input data
      const sanitizedData = SecurityService.sanitizeObject(validatedData);
      
      // Update maintenance request
      const result = await maintenanceService.updateMaintenanceRequest(params.id, sanitizedData);
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'maintenance:update',
      auditAction: 'MAINTENANCE_REQUEST_UPDATE',
    }
  );
}

// DELETE /api/support-services/maintenance/requests/:id
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(
    request,
    async (req) => {
      // Delete maintenance request
      await maintenanceService.deleteMaintenanceRequest(params.id);
      
      return NextResponse.json({ success: true });
    },
    {
      requiredPermission: 'maintenance:delete',
      auditAction: 'MAINTENANCE_REQUEST_DELETE',
    }
  );
}

// POST /api/support-services/maintenance/requests/:id/assign
export async function ASSIGN(request: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse request body
      const body = await req.json();
      const { technicianId } = body;
      
      if (!technicianId) {
        return NextResponse.json({ error: 'Technician ID is required' }, { status: 400 });
      }
      
      // Assign maintenance request
      const result = await maintenanceService.assignMaintenanceRequest(params.id, technicianId);
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'maintenance:assign',
      auditAction: 'MAINTENANCE_REQUEST_ASSIGN',
    }
  );
}

// POST /api/support-services/maintenance/requests/:id/start
export async function START(request: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse request body
      const body = await req.json();
      const { technicianId, notes } = body;
      
      if (!technicianId) {
        return NextResponse.json({ error: 'Technician ID is required' }, { status: 400 });
      }
      
      // Start maintenance work
      const result = await maintenanceService.startMaintenanceWork(
        params.id,
        technicianId,
        SecurityService.sanitizeInput(notes || '')
      );
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'maintenance:update',
      auditAction: 'MAINTENANCE_WORK_START',
    }
  );
}

// POST /api/support-services/maintenance/requests/:id/complete
export async function COMPLETE(request: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse request body
      const body = await req.json();
      const { technicianId, notes, partsUsed, laborHours } = body;
      
      if (!technicianId) {
        return NextResponse.json({ error: 'Technician ID is required' }, { status: 400 });
      }
      
      // Complete maintenance request
      const result = await maintenanceService.completeMaintenanceRequest(
        params.id,
        technicianId,
        SecurityService.sanitizeInput(notes || ''),
        partsUsed || [],
        laborHours || 0
      );
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'maintenance:update',
      auditAction: 'MAINTENANCE_REQUEST_COMPLETE',
    }
  );
}

// GET /api/support-services/maintenance/assets
export async function GET_ASSETS(request: NextRequest) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse query parameters
      const searchParams = req.nextUrl.searchParams;
      const filters = {
        type: searchParams.get('type') || undefined,
        status: searchParams.get('status') || undefined,
        locationId: searchParams.get('locationId') || undefined,
        departmentId: searchParams.get('departmentId') || undefined,
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '10'),
      };

      // Get maintenance assets with filters
      const result = await maintenanceService.getMaintenanceAssets(filters);
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'maintenance:read',
      auditAction: 'MAINTENANCE_ASSETS_VIEW',
    }
  );
}

// GET /api/support-services/maintenance/analytics
export async function GET_ANALYTICS(request: NextRequest) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse query parameters
      const searchParams = req.nextUrl.searchParams;
      const fromDate = searchParams.get('fromDate') ? new Date(searchParams.get('fromDate')!) : undefined;
      const toDate = searchParams.get('toDate') ? new Date(searchParams.get('toDate')!) : undefined;
      
      // Get maintenance analytics
      const result = await maintenanceService.getMaintenanceAnalytics(fromDate, toDate);
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'maintenance:analytics',
      auditAction: 'MAINTENANCE_ANALYTICS_VIEW',
    }
  );
}
