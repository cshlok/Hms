/**
 * FHIR Encounter API Implementation
 * 
 * This file implements a FHIR-compliant API for the Encounter resource,
 * which is used to represent Emergency Department visits in the HMS system.
 * 
 * The implementation follows FHIR R4 standards and includes:
 * - Full CRUD operations
 * - Search functionality with standard parameters
 * - FHIR-compliant response formatting
 * - Error handling according to FHIR specifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { FHIREncounterRepository } from '../repositories/fhir-encounter-repository';
import { validateResource } from '../utils/fhir-validator';
import { hasPermission, logAuditEvent, AuditEventType, Resource, Permission } from '../security/security-framework';
import { OperationOutcome, Bundle, Encounter } from '../types/fhir-types';

const repository = new FHIREncounterRepository();

/**
 * Search for Encounters
 * 
 * Implements the FHIR search operation for Encounters with standard search parameters
 */
export async function searchEncounters(req: NextRequest): Promise<NextResponse> {
  try {
    // Extract search parameters from URL
    const url = new URL(req.url);
    const searchParams: Record<string, string | string[]> = {};
    
    // Process all search parameters
    url.searchParams.forEach((value, key) => {
      if (key.startsWith('_')) {
        // Handle FHIR-specific parameters (_include, _revinclude, etc.)
        searchParams[key] = value;
      } else {
        // Handle resource-specific parameters
        if (searchParams[key]) {
          // If parameter already exists, convert to array or add to array
          if (Array.isArray(searchParams[key])) {
            (searchParams[key] as string[]).push(value);
          } else {
            searchParams[key] = [searchParams[key] as string, value];
          }
        } else {
          searchParams[key] = value;
        }
      }
    });
    
    // Get user session from request
    const session = req.headers.get('x-user-session') 
      ? JSON.parse(req.headers.get('x-user-session') || '{}')
      : null;
    
    // Check permissions
    if (!session || !hasPermission(session, Resource.ER_VISIT, Permission.READ)) {
      // Log unauthorized access attempt
      if (session) {
        await logAuditEvent(
          session,
          AuditEventType.ACCESS,
          Resource.ER_VISIT,
          'search encounters',
          'failure',
          { searchParams },
          undefined,
          'Permission denied'
        );
      }
      
      return NextResponse.json(
        createOperationOutcome('error', 'access-denied', 'Insufficient permissions to search encounters'),
        { status: 403 }
      );
    }
    
    // Log successful access
    await logAuditEvent(
      session,
      AuditEventType.ACCESS,
      Resource.ER_VISIT,
      'search encounters',
      'success',
      { searchParams }
    );
    
    // Extract pagination parameters
    const _count = searchParams._count ? parseInt(searchParams._count as string) : 10;
    const _page = searchParams._page ? parseInt(searchParams._page as string) : 1;
    
    // Remove FHIR-specific parameters before passing to repository
    const resourceParams = { ...searchParams };
    delete resourceParams._count;
    delete resourceParams._page;
    delete resourceParams._include;
    delete resourceParams._revinclude;
    delete resourceParams._sort;
    
    // Search encounters
    const result = await repository.search(resourceParams, {
      count: _count,
      page: _page,
      include: searchParams._include as string | string[] | undefined,
      revinclude: searchParams._revinclude as string | string[] | undefined,
      sort: searchParams._sort as string | string[] | undefined
    });
    
    // Create FHIR Bundle
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      total: result.total,
      link: [
        {
          relation: 'self',
          url: req.url
        }
      ],
      entry: result.resources.map(resource => ({
        fullUrl: `${url.origin}/fhir/Encounter/${resource.id}`,
        resource: resource
      }))
    };
    
    // Add pagination links if needed
    if (_page > 1) {
      const prevUrl = new URL(req.url);
      prevUrl.searchParams.set('_page', (_page - 1).toString());
      bundle.link.push({
        relation: 'prev',
        url: prevUrl.toString()
      });
    }
    
    if (_page * _count < result.total) {
      const nextUrl = new URL(req.url);
      nextUrl.searchParams.set('_page', (_page + 1).toString());
      bundle.link.push({
        relation: 'next',
        url: nextUrl.toString()
      });
    }
    
    return NextResponse.json(bundle);
  } catch (error) {
    console.error('Error searching encounters:', error);
    return NextResponse.json(
      createOperationOutcome('error', 'exception', `Error searching encounters: ${error.message}`),
      { status: 500 }
    );
  }
}

/**
 * Get a specific Encounter by ID
 * 
 * Implements the FHIR read operation for a single Encounter resource
 */
export async function getEncounter(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  try {
    const id = params.id;
    
    // Get user session from request
    const session = req.headers.get('x-user-session') 
      ? JSON.parse(req.headers.get('x-user-session') || '{}')
      : null;
    
    // Check permissions
    if (!session || !hasPermission(session, Resource.ER_VISIT, Permission.READ)) {
      // Log unauthorized access attempt
      if (session) {
        await logAuditEvent(
          session,
          AuditEventType.ACCESS,
          Resource.ER_VISIT,
          'read encounter',
          'failure',
          { id },
          id,
          'Permission denied'
        );
      }
      
      return NextResponse.json(
        createOperationOutcome('error', 'access-denied', 'Insufficient permissions to read encounter'),
        { status: 403 }
      );
    }
    
    // Extract _include parameter if present
    const url = new URL(req.url);
    const include = url.searchParams.get('_include');
    
    // Get encounter
    const encounter = await repository.findById(id, include ? [include] : undefined);
    
    if (!encounter) {
      return NextResponse.json(
        createOperationOutcome('error', 'not-found', `Encounter with ID ${id} not found`),
        { status: 404 }
      );
    }
    
    // Log successful access
    await logAuditEvent(
      session,
      AuditEventType.ACCESS,
      Resource.ER_VISIT,
      'read encounter',
      'success',
      { id },
      id
    );
    
    return NextResponse.json(encounter);
  } catch (error) {
    console.error(`Error getting encounter:`, error);
    return NextResponse.json(
      createOperationOutcome('error', 'exception', `Error getting encounter: ${error.message}`),
      { status: 500 }
    );
  }
}

/**
 * Create a new Encounter
 * 
 * Implements the FHIR create operation for Encounter resources
 */
export async function createEncounter(req: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    const encounter = await req.json() as Encounter;
    
    // Get user session from request
    const session = req.headers.get('x-user-session') 
      ? JSON.parse(req.headers.get('x-user-session') || '{}')
      : null;
    
    // Check permissions
    if (!session || !hasPermission(session, Resource.ER_VISIT, Permission.CREATE)) {
      // Log unauthorized access attempt
      if (session) {
        await logAuditEvent(
          session,
          AuditEventType.CREATE,
          Resource.ER_VISIT,
          'create encounter',
          'failure',
          { encounter },
          undefined,
          'Permission denied'
        );
      }
      
      return NextResponse.json(
        createOperationOutcome('error', 'access-denied', 'Insufficient permissions to create encounter'),
        { status: 403 }
      );
    }
    
    // Validate resource
    if (encounter.resourceType !== 'Encounter') {
      return NextResponse.json(
        createOperationOutcome('error', 'invalid', 'Resource type must be Encounter'),
        { status: 400 }
      );
    }
    
    // Validate against FHIR schema
    const validationResult = await validateResource(encounter);
    if (!validationResult.valid) {
      return NextResponse.json(
        createOperationOutcome('error', 'invalid', 'Invalid Encounter resource', validationResult.issues),
        { status: 400 }
      );
    }
    
    // Ensure ID is set
    if (!encounter.id) {
      encounter.id = uuidv4();
    }
    
    // Create encounter
    const createdEncounter = await repository.create(encounter);
    
    // Log successful creation
    await logAuditEvent(
      session,
      AuditEventType.CREATE,
      Resource.ER_VISIT,
      'create encounter',
      'success',
      { encounter },
      createdEncounter.id
    );
    
    // Return created resource with 201 status
    return NextResponse.json(createdEncounter, { 
      status: 201,
      headers: {
        'Location': `/fhir/Encounter/${createdEncounter.id}`
      }
    });
  } catch (error) {
    console.error('Error creating encounter:', error);
    return NextResponse.json(
      createOperationOutcome('error', 'exception', `Error creating encounter: ${error.message}`),
      { status: 500 }
    );
  }
}

/**
 * Update an existing Encounter
 * 
 * Implements the FHIR update operation for Encounter resources
 */
export async function updateEncounter(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  try {
    const id = params.id;
    
    // Parse request body
    const encounter = await req.json() as Encounter;
    
    // Get user session from request
    const session = req.headers.get('x-user-session') 
      ? JSON.parse(req.headers.get('x-user-session') || '{}')
      : null;
    
    // Check permissions
    if (!session || !hasPermission(session, Resource.ER_VISIT, Permission.UPDATE)) {
      // Log unauthorized access attempt
      if (session) {
        await logAuditEvent(
          session,
          AuditEventType.UPDATE,
          Resource.ER_VISIT,
          'update encounter',
          'failure',
          { encounter },
          id,
          'Permission denied'
        );
      }
      
      return NextResponse.json(
        createOperationOutcome('error', 'access-denied', 'Insufficient permissions to update encounter'),
        { status: 403 }
      );
    }
    
    // Validate resource
    if (encounter.resourceType !== 'Encounter') {
      return NextResponse.json(
        createOperationOutcome('error', 'invalid', 'Resource type must be Encounter'),
        { status: 400 }
      );
    }
    
    // Ensure ID in body matches URL
    if (encounter.id && encounter.id !== id) {
      return NextResponse.json(
        createOperationOutcome('error', 'invalid', 'ID in body does not match ID in URL'),
        { status: 400 }
      );
    }
    
    // Set ID from URL
    encounter.id = id;
    
    // Validate against FHIR schema
    const validationResult = await validateResource(encounter);
    if (!validationResult.valid) {
      return NextResponse.json(
        createOperationOutcome('error', 'invalid', 'Invalid Encounter resource', validationResult.issues),
        { status: 400 }
      );
    }
    
    // Check if resource exists
    const existingEncounter = await repository.findById(id);
    if (!existingEncounter) {
      return NextResponse.json(
        createOperationOutcome('error', 'not-found', `Encounter with ID ${id} not found`),
        { status: 404 }
      );
    }
    
    // Update encounter
    const updatedEncounter = await repository.update(id, encounter);
    
    // Log successful update
    await logAuditEvent(
      session,
      AuditEventType.UPDATE,
      Resource.ER_VISIT,
      'update encounter',
      'success',
      { 
        before: existingEncounter,
        after: updatedEncounter
      },
      id
    );
    
    return NextResponse.json(updatedEncounter);
  } catch (error) {
    console.error(`Error updating encounter:`, error);
    return NextResponse.json(
      createOperationOutcome('error', 'exception', `Error updating encounter: ${error.message}`),
      { status: 500 }
    );
  }
}

/**
 * Delete an Encounter
 * 
 * Implements the FHIR delete operation for Encounter resources
 */
export async function deleteEncounter(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  try {
    const id = params.id;
    
    // Get user session from request
    const session = req.headers.get('x-user-session') 
      ? JSON.parse(req.headers.get('x-user-session') || '{}')
      : null;
    
    // Check permissions
    if (!session || !hasPermission(session, Resource.ER_VISIT, Permission.DELETE)) {
      // Log unauthorized access attempt
      if (session) {
        await logAuditEvent(
          session,
          AuditEventType.DELETE,
          Resource.ER_VISIT,
          'delete encounter',
          'failure',
          { id },
          id,
          'Permission denied'
        );
      }
      
      return NextResponse.json(
        createOperationOutcome('error', 'access-denied', 'Insufficient permissions to delete encounter'),
        { status: 403 }
      );
    }
    
    // Check if resource exists
    const existingEncounter = await repository.findById(id);
    if (!existingEncounter) {
      return NextResponse.json(
        createOperationOutcome('error', 'not-found', `Encounter with ID ${id} not found`),
        { status: 404 }
      );
    }
    
    // Delete encounter
    await repository.delete(id);
    
    // Log successful deletion
    await logAuditEvent(
      session,
      AuditEventType.DELETE,
      Resource.ER_VISIT,
      'delete encounter',
      'success',
      { encounter: existingEncounter },
      id
    );
    
    // Return 204 No Content for successful deletion
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`Error deleting encounter:`, error);
    return NextResponse.json(
      createOperationOutcome('error', 'exception', `Error deleting encounter: ${error.message}`),
      { status: 500 }
    );
  }
}

/**
 * Helper function to create FHIR OperationOutcome resources
 */
function createOperationOutcome(
  severity: 'fatal' | 'error' | 'warning' | 'information',
  code: string,
  diagnostics: string,
  details?: any[]
): OperationOutcome {
  return {
    resourceType: 'OperationOutcome',
    issue: [
      {
        severity,
        code,
        diagnostics,
        ...(details && { details })
      }
    ]
  };
}

/**
 * Route handler for Encounter API
 */
export async function handleEncounterRequest(req: NextRequest, { params }: { params?: { id?: string } } = {}): Promise<NextResponse> {
  const method = req.method;
  
  // Collection endpoints
  if (!params?.id) {
    switch (method) {
      case 'GET':
        return searchEncounters(req);
      case 'POST':
        return createEncounter(req);
      default:
        return NextResponse.json(
          createOperationOutcome('error', 'not-supported', `Method ${method} not supported`),
          { status: 405 }
        );
    }
  }
  
  // Instance endpoints
  switch (method) {
    case 'GET':
      return getEncounter(req, { params: { id: params.id } });
    case 'PUT':
      return updateEncounter(req, { params: { id: params.id } });
    case 'DELETE':
      return deleteEncounter(req, { params: { id: params.id } });
    default:
      return NextResponse.json(
        createOperationOutcome('error', 'not-supported', `Method ${method} not supported`),
        { status: 405 }
      );
  }
}
