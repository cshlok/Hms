import { NextRequest, NextResponse } from 'next/server';
import { LaboratoryService, LabOrderSchema, LabCancelSchema, LabResultNotificationSchema } from '@/services/integration/LaboratoryService';
import { handleApiError } from '@/lib/api/errorHandler';
import { logger } from '@/lib/logger';
import { ipdMiddleware } from '../../middleware/auth';

/**
 * Integration endpoint for Laboratory Module
 * This endpoint handles lab test orders and results
 * POST /api/ipd/integration/laboratory
 */
export async function POST(req: NextRequest) {
  // Check authentication and authorization
  const authResult = await ipdMiddleware(req, 'ORDER_LABS');
  if (authResult instanceof NextResponse) {
    return authResult; // This is an error response
  }

  try {
    const body = await req.json();
    logger.info({ route: 'POST /api/ipd/integration/laboratory', actionType: body.actionType }, 'Processing laboratory request');
    
    // Validate request body
    if (!body.actionType || !body.encounterId) {
      return NextResponse.json(
        { error: 'Missing required fields: actionType, encounterId' },
        { status: 400 }
      );
    }

    // Create laboratory service instance
    const laboratoryService = new LaboratoryService();

    // Process different laboratory action types
    switch (body.actionType) {
      case 'ORDER':
        try {
          const validatedData = LabOrderSchema.parse(body);
          const result = await laboratoryService.createLabOrder(validatedData, authResult.user.id);
          return NextResponse.json(result, { status: 201 });
        } catch (error) {
          return handleApiError(error);
        }
        
      case 'CANCEL':
        try {
          const validatedData = LabCancelSchema.parse(body);
          const result = await laboratoryService.cancelLabOrder(validatedData, authResult.user.id);
          return NextResponse.json(result, { status: 200 });
        } catch (error) {
          return handleApiError(error);
        }
        
      case 'RESULT_NOTIFICATION':
        try {
          const validatedData = LabResultNotificationSchema.parse(body);
          const result = await laboratoryService.sendLabResultNotification(validatedData, authResult.user.id);
          return NextResponse.json(result, { status: 200 });
        } catch (error) {
          return handleApiError(error);
        }
        
      default:
        return NextResponse.json(
          { error: `Unsupported action type: ${body.actionType}` },
          { status: 400 }
        );
    }
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Get pending lab orders for a patient
 * GET /api/ipd/integration/laboratory/pending-orders
 */
export async function GET(req: NextRequest) {
  // Check authentication and authorization
  const authResult = await ipdMiddleware(req, 'VIEW');
  if (authResult instanceof NextResponse) {
    return authResult; // This is an error response
  }

  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId');
    
    if (!patientId) {
      return NextResponse.json(
        { error: 'Missing patientId parameter' },
        { status: 400 }
      );
    }
    
    logger.info({ route: 'GET /api/ipd/integration/laboratory', patientId }, 'Getting pending laboratory orders');
    
    // Create laboratory service instance
    const laboratoryService = new LaboratoryService();
    
    // Get pending lab orders
    const pendingOrders = await laboratoryService.getPendingLabOrders(patientId);
    
    return NextResponse.json(pendingOrders);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Get lab results for a patient
 * GET /api/ipd/integration/laboratory/results
 */
export async function getLabResults(req: NextRequest) {
  // Check authentication and authorization
  const authResult = await ipdMiddleware(req, 'VIEW');
  if (authResult instanceof NextResponse) {
    return authResult; // This is an error response
  }

  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId');
    const encounterId = searchParams.get('encounterId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const includeDetails = searchParams.get('includeDetails') === 'true';
    
    if (!patientId) {
      return NextResponse.json(
        { error: 'Missing patientId parameter' },
        { status: 400 }
      );
    }
    
    logger.info({ 
      route: 'GET /api/ipd/integration/laboratory/results', 
      patientId, 
      encounterId, 
      limit, 
      includeDetails 
    }, 'Getting laboratory results');
    
    // Create laboratory service instance
    const laboratoryService = new LaboratoryService();
    
    // Get lab results
    const labResults = await laboratoryService.getLabResults(patientId, encounterId, limit, includeDetails);
    
    return NextResponse.json(labResults);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Get detailed lab result
 * GET /api/ipd/integration/laboratory/results/details
 */
export async function getLabResultDetails(req: NextRequest) {
  // Check authentication and authorization
  const authResult = await ipdMiddleware(req, 'VIEW');
  if (authResult instanceof NextResponse) {
    return authResult; // This is an error response
  }

  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');
    
    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing orderId parameter' },
        { status: 400 }
      );
    }
    
    logger.info({ route: 'GET /api/ipd/integration/laboratory/results/details', orderId }, 'Getting laboratory result details');
    
    // Create laboratory service instance
    const laboratoryService = new LaboratoryService();
    
    // Get lab result details
    const resultDetails = await laboratoryService.getLabResultDetails(orderId, authResult.user.id);
    
    return NextResponse.json(resultDetails);
  } catch (error) {
    return handleApiError(error);
  }
}
