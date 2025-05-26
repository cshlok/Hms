import { NextRequest, NextResponse } from 'next/server';
import { HMSIntegrationService } from '@/lib/services/integration/hms-integration.service';
import { errorHandlingMiddleware } from '@/lib/middleware/error-handling.middleware';
import { RBACService, Resource, Action } from '@/lib/rbac.service';

/**
 * Integration API for Support Services
 * 
 * This API provides endpoints for integrating support services with core HMS systems.
 */

/**
 * GET /api/integration/support-services/patient/:patientId
 * Retrieves patient information for support services
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  return errorHandlingMiddleware(request, async (req) => {
    // Extract user information from request context
    const userId = req.userId || 'anonymous';
    const userRoles = req.userRoles || [];
    
    // Get patient information
    const patientInfo = await HMSIntegrationService.getPatientInfo(
      params.patientId,
      userId,
      userRoles
    );
    
    return NextResponse.json({
      success: true,
      data: patientInfo
    });
  });
}

/**
 * GET /api/integration/support-services/location/:locationId
 * Retrieves location information for support services
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { locationId: string } }
) {
  return errorHandlingMiddleware(request, async (req) => {
    // Extract user information from request context
    const userId = req.userId || 'anonymous';
    const userRoles = req.userRoles || [];
    
    // Get location information
    const locationInfo = await HMSIntegrationService.getLocationInfo(
      params.locationId,
      userId,
      userRoles
    );
    
    return NextResponse.json({
      success: true,
      data: locationInfo
    });
  });
}

/**
 * POST /api/integration/support-services/notification
 * Sends a notification through the HMS Notification System
 */
export async function POST(request: NextRequest) {
  return errorHandlingMiddleware(request, async (req) => {
    // Extract user information from request context
    const userId = req.userId || 'anonymous';
    const userRoles = req.userRoles || [];
    
    // Parse request body
    const body = await request.json();
    const { recipientId, type, title, message, metadata } = body;
    
    // Validate required fields
    if (!recipientId || !type || !title || !message) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields',
            details: {
              required: ['recipientId', 'type', 'title', 'message']
            }
          }
        },
        { status: 400 }
      );
    }
    
    // Send notification
    const notification = await HMSIntegrationService.sendNotification(
      recipientId,
      type,
      title,
      message,
      metadata || {},
      userId,
      userRoles
    );
    
    return NextResponse.json({
      success: true,
      data: notification
    });
  });
}

/**
 * POST /api/integration/support-services/report
 * Submits data to the HMS Reporting System
 */
export async function POST(request: NextRequest) {
  return errorHandlingMiddleware(request, async (req) => {
    // Extract user information from request context
    const userId = req.userId || 'anonymous';
    const userRoles = req.userRoles || [];
    
    // Parse request body
    const body = await request.json();
    const { reportType, reportData } = body;
    
    // Validate required fields
    if (!reportType || !reportData) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields',
            details: {
              required: ['reportType', 'reportData']
            }
          }
        },
        { status: 400 }
      );
    }
    
    // Submit report data
    const report = await HMSIntegrationService.submitReportData(
      reportType,
      reportData,
      userId,
      userRoles
    );
    
    return NextResponse.json({
      success: true,
      data: report
    });
  });
}

/**
 * POST /api/integration/support-services/:serviceType/:requestId/link-patient
 * Links a support service request to a patient record
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { serviceType: string; requestId: string } }
) {
  return errorHandlingMiddleware(request, async (req) => {
    // Extract user information from request context
    const userId = req.userId || 'anonymous';
    const userRoles = req.userRoles || [];
    
    // Parse request body
    const body = await request.json();
    const { patientId } = body;
    
    // Validate required fields
    if (!patientId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields',
            details: {
              required: ['patientId']
            }
          }
        },
        { status: 400 }
      );
    }
    
    // Validate service type
    const validServiceTypes = ['HOUSEKEEPING', 'MAINTENANCE', 'DIETARY', 'AMBULANCE', 'FEEDBACK'];
    const serviceType = params.serviceType.toUpperCase();
    
    if (!validServiceTypes.includes(serviceType)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid service type',
            details: {
              validServiceTypes
            }
          }
        },
        { status: 400 }
      );
    }
    
    // Link request to patient
    const request = await HMSIntegrationService.linkRequestToPatient(
      serviceType as any,
      params.requestId,
      patientId,
      userId,
      userRoles
    );
    
    return NextResponse.json({
      success: true,
      data: request
    });
  });
}

/**
 * POST /api/integration/support-services/:serviceType/:requestId/link-location
 * Links a support service request to a location
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { serviceType: string; requestId: string } }
) {
  return errorHandlingMiddleware(request, async (req) => {
    // Extract user information from request context
    const userId = req.userId || 'anonymous';
    const userRoles = req.userRoles || [];
    
    // Parse request body
    const body = await request.json();
    const { locationId } = body;
    
    // Validate required fields
    if (!locationId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields',
            details: {
              required: ['locationId']
            }
          }
        },
        { status: 400 }
      );
    }
    
    // Validate service type
    const validServiceTypes = ['HOUSEKEEPING', 'MAINTENANCE', 'DIETARY', 'AMBULANCE'];
    const serviceType = params.serviceType.toUpperCase();
    
    if (!validServiceTypes.includes(serviceType)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid service type',
            details: {
              validServiceTypes
            }
          }
        },
        { status: 400 }
      );
    }
    
    // Link request to location
    const request = await HMSIntegrationService.linkRequestToLocation(
      serviceType as any,
      params.requestId,
      locationId,
      userId,
      userRoles
    );
    
    return NextResponse.json({
      success: true,
      data: request
    });
  });
}
