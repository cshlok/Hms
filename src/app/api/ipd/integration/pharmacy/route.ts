import { NextRequest, NextResponse } from 'next/server';
import { PharmacyService, MedicationOrderSchema, MedicationReconciliationSchema, MedicationAdministrationSchema, MedicationDiscontinueSchema } from '@/services/integration/PharmacyService';
import { handleApiError } from '@/lib/api/errorHandler';
import { logger } from '@/lib/logger';
import { ipdMiddleware } from '../../middleware/auth';

/**
 * Integration endpoint for Pharmacy Module
 * This endpoint handles medication orders and reconciliation
 * POST /api/ipd/integration/pharmacy
 */
export async function POST(req: NextRequest) {
  // Check authentication and authorization
  const authResult = await ipdMiddleware(req, 'ORDER_MEDICATIONS');
  if (authResult instanceof NextResponse) {
    return authResult; // This is an error response
  }

  try {
    const body = await req.json();
    logger.info({ route: 'POST /api/ipd/integration/pharmacy', actionType: body.actionType }, 'Processing pharmacy request');
    
    // Validate request body
    if (!body.actionType || !body.encounterId) {
      return NextResponse.json(
        { error: 'Missing required fields: actionType, encounterId' },
        { status: 400 }
      );
    }

    // Create pharmacy service instance
    const pharmacyService = new PharmacyService();

    // Process different pharmacy action types
    switch (body.actionType) {
      case 'ORDER':
        try {
          const validatedData = MedicationOrderSchema.parse(body);
          const result = await pharmacyService.createMedicationOrder(validatedData, authResult.user.id);
          
          // Check if there's a warning about allergies
          if (result.warning) {
            return NextResponse.json(result, { status: 409 });
          }
          
          return NextResponse.json(result, { status: 201 });
        } catch (error) {
          return handleApiError(error);
        }
        
      case 'RECONCILIATION':
        try {
          const validatedData = MedicationReconciliationSchema.parse(body);
          const result = await pharmacyService.performMedicationReconciliation(validatedData, authResult.user.id);
          return NextResponse.json(result, { status: 200 });
        } catch (error) {
          return handleApiError(error);
        }
        
      case 'ADMINISTRATION':
        try {
          const validatedData = MedicationAdministrationSchema.parse(body);
          const result = await pharmacyService.recordMedicationAdministration(validatedData, authResult.user.id);
          return NextResponse.json(result, { status: 200 });
        } catch (error) {
          return handleApiError(error);
        }
        
      case 'DISCONTINUE':
        try {
          const validatedData = MedicationDiscontinueSchema.parse(body);
          const result = await pharmacyService.discontinueMedication(validatedData, authResult.user.id);
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
 * Get active medications for a patient
 * GET /api/ipd/integration/pharmacy/active-medications/:patientId
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
    
    logger.info({ route: 'GET /api/ipd/integration/pharmacy', patientId }, 'Getting patient medications');
    
    // Create pharmacy service instance
    const pharmacyService = new PharmacyService();
    
    // Get active medications
    const activeMedications = await pharmacyService.getActiveMedications(patientId);
    
    return NextResponse.json(activeMedications);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Get medication history for a patient
 * GET /api/ipd/integration/pharmacy/medication-history
 */
export async function getMedicationHistory(req: NextRequest) {
  // Check authentication and authorization
  const authResult = await ipdMiddleware(req, 'VIEW');
  if (authResult instanceof NextResponse) {
    return authResult; // This is an error response
  }

  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    if (!patientId) {
      return NextResponse.json(
        { error: 'Missing patientId parameter' },
        { status: 400 }
      );
    }
    
    logger.info({ route: 'GET /api/ipd/integration/pharmacy/medication-history', patientId, limit }, 'Getting medication history');
    
    // Create pharmacy service instance
    const pharmacyService = new PharmacyService();
    
    // Get medication history
    const medicationHistory = await pharmacyService.getMedicationHistory(patientId, limit);
    
    return NextResponse.json(medicationHistory);
  } catch (error) {
    return handleApiError(error);
  }
}
