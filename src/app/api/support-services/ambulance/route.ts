import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/middleware/error-handling.middleware';
import { SecurityService } from '@/lib/security.service';
import { AmbulanceService } from '@/lib/services/support-services/ambulance/ambulance.service';
import { z } from 'zod';

// Initialize service
const ambulanceService = new AmbulanceService();

// Request validation schemas
const createTripRequestSchema = z.object({
  requestType: z.enum(['EMERGENCY', 'NON_EMERGENCY', 'TRANSFER', 'DISCHARGE', 'SCHEDULED']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  pickupLocation: z.string().min(3).max(200),
  dropoffLocation: z.string().min(3).max(200),
  patientId: z.string().uuid().optional(),
  scheduledTime: z.string().transform(val => new Date(val)),
  notes: z.string().max(1000).optional(),
  requestedById: z.string().uuid(),
  contactName: z.string().min(2).max(100).optional(),
  contactPhone: z.string().min(5).max(20).optional(),
  medicalEquipmentNeeded: z.array(z.string()).optional(),
  specialInstructions: z.string().max(500).optional(),
});

const updateTripRequestSchema = z.object({
  requestType: z.enum(['EMERGENCY', 'NON_EMERGENCY', 'TRANSFER', 'DISCHARGE', 'SCHEDULED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  pickupLocation: z.string().min(3).max(200).optional(),
  dropoffLocation: z.string().min(3).max(200).optional(),
  patientId: z.string().uuid().optional(),
  scheduledTime: z.string().transform(val => new Date(val)).optional(),
  notes: z.string().max(1000).optional(),
  status: z.enum(['PENDING', 'ASSIGNED', 'EN_ROUTE_TO_PICKUP', 'AT_PICKUP', 'EN_ROUTE_TO_DROPOFF', 'COMPLETED', 'CANCELLED']).optional(),
  contactName: z.string().min(2).max(100).optional(),
  contactPhone: z.string().min(5).max(20).optional(),
  medicalEquipmentNeeded: z.array(z.string()).optional(),
  specialInstructions: z.string().max(500).optional(),
});

// GET /api/support-services/ambulance/trips
export async function GET(request: NextRequest) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse query parameters
      const searchParams = req.nextUrl.searchParams;
      const filters = {
        status: searchParams.get('status') || undefined,
        priority: searchParams.get('priority') || undefined,
        requestType: searchParams.get('requestType') || undefined,
        ambulanceId: searchParams.get('ambulanceId') || undefined,
        fromDate: searchParams.get('fromDate') ? new Date(searchParams.get('fromDate')!) : undefined,
        toDate: searchParams.get('toDate') ? new Date(searchParams.get('toDate')!) : undefined,
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '10'),
      };

      // Get ambulance trips with filters
      const result = await ambulanceService.getAmbulanceTrips(filters);
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'ambulance:read',
      auditAction: 'AMBULANCE_TRIPS_VIEW',
    }
  );
}

// POST /api/support-services/ambulance/trips
export async function POST(request: NextRequest) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse and validate request body
      const body = await req.json();
      const validatedData = createTripRequestSchema.parse(body);
      
      // Sanitize input data
      const sanitizedData = SecurityService.sanitizeObject(validatedData);
      
      // Create ambulance trip request
      const result = await ambulanceService.createAmbulanceTrip(sanitizedData);
      
      return NextResponse.json(result, { status: 201 });
    },
    {
      requiredPermission: 'ambulance:create',
      auditAction: 'AMBULANCE_TRIP_CREATE',
    }
  );
}

// GET /api/support-services/ambulance/trips/:id
export async function GET_BY_ID(request: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(
    request,
    async (req) => {
      // Get ambulance trip by ID
      const includeFHIR = req.nextUrl.searchParams.get('fhir') === 'true';
      const result = await ambulanceService.getAmbulanceTripById(params.id, includeFHIR);
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'ambulance:read',
      auditAction: 'AMBULANCE_TRIP_VIEW',
    }
  );
}

// PATCH /api/support-services/ambulance/trips/:id
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse and validate request body
      const body = await req.json();
      const validatedData = updateTripRequestSchema.parse(body);
      
      // Sanitize input data
      const sanitizedData = SecurityService.sanitizeObject(validatedData);
      
      // Update ambulance trip
      const result = await ambulanceService.updateAmbulanceTrip(params.id, sanitizedData);
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'ambulance:update',
      auditAction: 'AMBULANCE_TRIP_UPDATE',
    }
  );
}

// DELETE /api/support-services/ambulance/trips/:id
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(
    request,
    async (req) => {
      // Delete ambulance trip
      await ambulanceService.deleteAmbulanceTrip(params.id);
      
      return NextResponse.json({ success: true });
    },
    {
      requiredPermission: 'ambulance:delete',
      auditAction: 'AMBULANCE_TRIP_DELETE',
    }
  );
}

// POST /api/support-services/ambulance/trips/:id/assign
export async function ASSIGN(request: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse request body
      const body = await req.json();
      const { ambulanceId, crewIds } = body;
      
      if (!ambulanceId) {
        return NextResponse.json({ error: 'Ambulance ID is required' }, { status: 400 });
      }
      
      // Assign ambulance and crew to trip
      const result = await ambulanceService.assignAmbulanceTrip(
        params.id,
        ambulanceId,
        crewIds || []
      );
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'ambulance:assign',
      auditAction: 'AMBULANCE_TRIP_ASSIGN',
    }
  );
}

// POST /api/support-services/ambulance/trips/:id/status
export async function UPDATE_STATUS(request: NextRequest, { params }: { params: { id: string } }) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse request body
      const body = await req.json();
      const { status, notes, latitude, longitude } = body;
      
      if (!status) {
        return NextResponse.json({ error: 'Status is required' }, { status: 400 });
      }
      
      // Update ambulance trip status
      const result = await ambulanceService.updateAmbulanceTripStatus(
        params.id,
        status,
        SecurityService.sanitizeInput(notes || ''),
        latitude,
        longitude
      );
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'ambulance:update',
      auditAction: 'AMBULANCE_TRIP_STATUS_UPDATE',
    }
  );
}

// GET /api/support-services/ambulance/vehicles
export async function GET_VEHICLES(request: NextRequest) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse query parameters
      const searchParams = req.nextUrl.searchParams;
      const filters = {
        status: searchParams.get('status') || undefined,
        type: searchParams.get('type') || undefined,
        available: searchParams.get('available') === 'true',
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '10'),
      };

      // Get ambulance vehicles with filters
      const result = await ambulanceService.getAmbulanceVehicles(filters);
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'ambulance:read',
      auditAction: 'AMBULANCE_VEHICLES_VIEW',
    }
  );
}

// GET /api/support-services/ambulance/crews
export async function GET_CREWS(request: NextRequest) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse query parameters
      const searchParams = req.nextUrl.searchParams;
      const filters = {
        status: searchParams.get('status') || undefined,
        role: searchParams.get('role') || undefined,
        available: searchParams.get('available') === 'true',
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '10'),
      };

      // Get ambulance crews with filters
      const result = await ambulanceService.getAmbulanceCrews(filters);
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'ambulance:read',
      auditAction: 'AMBULANCE_CREWS_VIEW',
    }
  );
}

// GET /api/support-services/ambulance/analytics
export async function GET_ANALYTICS(request: NextRequest) {
  return withErrorHandling(
    request,
    async (req) => {
      // Parse query parameters
      const searchParams = req.nextUrl.searchParams;
      const fromDate = searchParams.get('fromDate') ? new Date(searchParams.get('fromDate')!) : undefined;
      const toDate = searchParams.get('toDate') ? new Date(searchParams.get('toDate')!) : undefined;
      
      // Get ambulance analytics
      const result = await ambulanceService.getAmbulanceAnalytics(fromDate, toDate);
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'ambulance:analytics',
      auditAction: 'AMBULANCE_ANALYTICS_VIEW',
    }
  );
}
