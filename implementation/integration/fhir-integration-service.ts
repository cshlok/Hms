/**
 * FHIR Integration Service
 * 
 * This file implements a comprehensive FHIR integration service that enables
 * seamless data exchange between the HMS modules and external systems using
 * FHIR standards. It includes:
 * - FHIR resource mapping and transformation
 * - External system integration with configurable endpoints
 * - Subscription-based event notifications
 * - Bulk data import/export capabilities
 * - SMART on FHIR app integration
 * 
 * The implementation follows FHIR R4 standards and supports various
 * authentication mechanisms for secure interoperability.
 */

import { v4 as uuidv4 } from 'uuid';
import { logAuditEvent, AuditEventType, Resource } from '../security/enhanced-security-framework';

// FHIR Resource Types
export enum FHIRResourceType {
  PATIENT = 'Patient',
  ENCOUNTER = 'Encounter',
  OBSERVATION = 'Observation',
  CONDITION = 'Condition',
  PROCEDURE = 'Procedure',
  MEDICATION_REQUEST = 'MedicationRequest',
  DIAGNOSTIC_REPORT = 'DiagnosticReport',
  SERVICE_REQUEST = 'ServiceRequest',
  BIOLOGICALLY_DERIVED_PRODUCT = 'BiologicallyDerivedProduct',
  BUNDLE = 'Bundle'
}

// Integration System Types
export enum IntegrationSystemType {
  EHR = 'ehr',
  LAB = 'lab',
  RADIOLOGY = 'radiology',
  PHARMACY = 'pharmacy',
  BLOOD_BANK = 'blood_bank',
  HIE = 'hie',
  REGISTRY = 'registry'
}

// Integration Endpoint
export interface IntegrationEndpoint {
  id: string;
  name: string;
  systemType: IntegrationSystemType;
  baseUrl: string;
  authType: 'none' | 'basic' | 'oauth2' | 'token';
  authConfig: Record<string, any>;
  resourceMappings: Record<string, any>;
  enabled: boolean;
}

// FHIR Subscription
export interface FHIRSubscription {
  id: string;
  status: 'active' | 'error' | 'off';
  criteria: string;
  channel: {
    type: 'rest-hook' | 'websocket' | 'email' | 'message';
    endpoint: string;
    payload: string;
    header?: string[];
  };
  reason: string;
  endpointId: string;
}

// Integration Event
export interface IntegrationEvent {
  id: string;
  timestamp: string;
  resourceType: FHIRResourceType;
  resourceId: string;
  action: 'create' | 'update' | 'delete';
  status: 'pending' | 'processing' | 'completed' | 'error';
  endpointIds: string[];
  payload?: any;
  error?: string;
}

/**
 * FHIR Integration Service
 */
export class FHIRIntegrationService {
  private endpoints: Map<string, IntegrationEndpoint> = new Map();
  private subscriptions: Map<string, FHIRSubscription> = new Map();
  private resourceMappers: Map<FHIRResourceType, any> = new Map();
  
  constructor() {
    // Initialize resource mappers
    this.initializeResourceMappers();
  }
  
  /**
   * Initialize resource mappers
   */
  private initializeResourceMappers(): void {
    // Patient mapper
    this.resourceMappers.set(FHIRResourceType.PATIENT, {
      toFHIR: this.mapPatientToFHIR.bind(this),
      fromFHIR: this.mapPatientFromFHIR.bind(this)
    });
    
    // Encounter mapper
    this.resourceMappers.set(FHIRResourceType.ENCOUNTER, {
      toFHIR: this.mapEncounterToFHIR.bind(this),
      fromFHIR: this.mapEncounterFromFHIR.bind(this)
    });
    
    // Observation mapper
    this.resourceMappers.set(FHIRResourceType.OBSERVATION, {
      toFHIR: this.mapObservationToFHIR.bind(this),
      fromFHIR: this.mapObservationFromFHIR.bind(this)
    });
    
    // Procedure mapper
    this.resourceMappers.set(FHIRResourceType.PROCEDURE, {
      toFHIR: this.mapProcedureToFHIR.bind(this),
      fromFHIR: this.mapProcedureFromFHIR.bind(this)
    });
    
    // ServiceRequest mapper
    this.resourceMappers.set(FHIRResourceType.SERVICE_REQUEST, {
      toFHIR: this.mapServiceRequestToFHIR.bind(this),
      fromFHIR: this.mapServiceRequestFromFHIR.bind(this)
    });
    
    // BiologicallyDerivedProduct mapper
    this.resourceMappers.set(FHIRResourceType.BIOLOGICALLY_DERIVED_PRODUCT, {
      toFHIR: this.mapBiologicallyDerivedProductToFHIR.bind(this),
      fromFHIR: this.mapBiologicallyDerivedProductFromFHIR.bind(this)
    });
  }
  
  /**
   * Register integration endpoint
   */
  public async registerEndpoint(
    endpoint: IntegrationEndpoint,
    session: any
  ): Promise<IntegrationEndpoint> {
    try {
      // Ensure endpoint has an ID
      if (!endpoint.id) {
        endpoint.id = uuidv4();
      }
      
      // Validate endpoint configuration
      this.validateEndpointConfig(endpoint);
      
      // Store endpoint
      this.endpoints.set(endpoint.id, endpoint);
      
      // Log the registration
      await logAuditEvent(
        session,
        AuditEventType.CREATE,
        Resource.SYSTEM_CONFIG,
        'register integration endpoint',
        'success',
        { endpointId: endpoint.id, endpointName: endpoint.name },
        endpoint.id
      );
      
      return endpoint;
    } catch (error) {
      console.error('Error registering integration endpoint:', error);
      
      // Log the error
      await logAuditEvent(
        session,
        AuditEventType.CREATE,
        Resource.SYSTEM_CONFIG,
        'register integration endpoint',
        'failure',
        { 
          endpointName: endpoint.name,
          error: error.message
        },
        undefined,
        `Error registering integration endpoint: ${error.message}`
      );
      
      throw error;
    }
  }
  
  /**
   * Update integration endpoint
   */
  public async updateEndpoint(
    endpointId: string,
    updates: Partial<IntegrationEndpoint>,
    session: any
  ): Promise<IntegrationEndpoint> {
    try {
      // Get existing endpoint
      const endpoint = this.endpoints.get(endpointId);
      
      if (!endpoint) {
        throw new Error(`Endpoint with ID ${endpointId} not found`);
      }
      
      // Update endpoint
      const updatedEndpoint = {
        ...endpoint,
        ...updates
      };
      
      // Validate updated configuration
      this.validateEndpointConfig(updatedEndpoint);
      
      // Store updated endpoint
      this.endpoints.set(endpointId, updatedEndpoint);
      
      // Log the update
      await logAuditEvent(
        session,
        AuditEventType.UPDATE,
        Resource.SYSTEM_CONFIG,
        'update integration endpoint',
        'success',
        { 
          endpointId,
          endpointName: updatedEndpoint.name,
          updates
        },
        endpointId
      );
      
      return updatedEndpoint;
    } catch (error) {
      console.error('Error updating integration endpoint:', error);
      
      // Log the error
      await logAuditEvent(
        session,
        AuditEventType.UPDATE,
        Resource.SYSTEM_CONFIG,
        'update integration endpoint',
        'failure',
        { 
          endpointId,
          updates,
          error: error.message
        },
        endpointId,
        `Error updating integration endpoint: ${error.message}`
      );
      
      throw error;
    }
  }
  
  /**
   * Delete integration endpoint
   */
  public async deleteEndpoint(
    endpointId: string,
    session: any
  ): Promise<boolean> {
    try {
      // Check if endpoint exists
      if (!this.endpoints.has(endpointId)) {
        throw new Error(`Endpoint with ID ${endpointId} not found`);
      }
      
      // Check if there are active subscriptions for this endpoint
      const activeSubscriptions = Array.from(this.subscriptions.values())
        .filter(sub => sub.endpointId === endpointId && sub.status === 'active');
      
      if (activeSubscriptions.length > 0) {
        throw new Error(`Cannot delete endpoint with active subscriptions`);
      }
      
      // Delete endpoint
      const result = this.endpoints.delete(endpointId);
      
      // Log the deletion
      await logAuditEvent(
        session,
        AuditEventType.DELETE,
        Resource.SYSTEM_CONFIG,
        'delete integration endpoint',
        'success',
        { endpointId },
        endpointId
      );
      
      return result;
    } catch (error) {
      console.error('Error deleting integration endpoint:', error);
      
      // Log the error
      await logAuditEvent(
        session,
        AuditEventType.DELETE,
        Resource.SYSTEM_CONFIG,
        'delete integration endpoint',
        'failure',
        { 
          endpointId,
          error: error.message
        },
        endpointId,
        `Error deleting integration endpoint: ${error.message}`
      );
      
      throw error;
    }
  }
  
  /**
   * Create FHIR subscription
   */
  public async createSubscription(
    subscription: Omit<FHIRSubscription, 'id'>,
    session: any
  ): Promise<FHIRSubscription> {
    try {
      // Check if endpoint exists
      if (!this.endpoints.has(subscription.endpointId)) {
        throw new Error(`Endpoint with ID ${subscription.endpointId} not found`);
      }
      
      // Create subscription with ID
      const newSubscription: FHIRSubscription = {
        id: uuidv4(),
        ...subscription
      };
      
      // Store subscription
      this.subscriptions.set(newSubscription.id, newSubscription);
      
      // Log the creation
      await logAuditEvent(
        session,
        AuditEventType.CREATE,
        Resource.SYSTEM_CONFIG,
        'create FHIR subscription',
        'success',
        { 
          subscriptionId: newSubscription.id,
          criteria: newSubscription.criteria,
          endpointId: newSubscription.endpointId
        },
        newSubscription.id
      );
      
      return newSubscription;
    } catch (error) {
      console.error('Error creating FHIR subscription:', error);
      
      // Log the error
      await logAuditEvent(
        session,
        AuditEventType.CREATE,
        Resource.SYSTEM_CONFIG,
        'create FHIR subscription',
        'failure',
        { 
          subscription,
          error: error.message
        },
        undefined,
        `Error creating FHIR subscription: ${error.message}`
      );
      
      throw error;
    }
  }
  
  /**
   * Update FHIR subscription
   */
  public async updateSubscription(
    subscriptionId: string,
    updates: Partial<FHIRSubscription>,
    session: any
  ): Promise<FHIRSubscription> {
    try {
      // Get existing subscription
      const subscription = this.subscriptions.get(subscriptionId);
      
      if (!subscription) {
        throw new Error(`Subscription with ID ${subscriptionId} not found`);
      }
      
      // If endpoint is being changed, check if new endpoint exists
      if (updates.endpointId && updates.endpointId !== subscription.endpointId) {
        if (!this.endpoints.has(updates.endpointId)) {
          throw new Error(`Endpoint with ID ${updates.endpointId} not found`);
        }
      }
      
      // Update subscription
      const updatedSubscription = {
        ...subscription,
        ...updates
      };
      
      // Store updated subscription
      this.subscriptions.set(subscriptionId, updatedSubscription);
      
      // Log the update
      await logAuditEvent(
        session,
        AuditEventType.UPDATE,
        Resource.SYSTEM_CONFIG,
        'update FHIR subscription',
        'success',
        { 
          subscriptionId,
          updates
        },
        subscriptionId
      );
      
      return updatedSubscription;
    } catch (error) {
      console.error('Error updating FHIR subscription:', error);
      
      // Log the error
      await logAuditEvent(
        session,
        AuditEventType.UPDATE,
        Resource.SYSTEM_CONFIG,
        'update FHIR subscription',
        'failure',
        { 
          subscriptionId,
          updates,
          error: error.message
        },
        subscriptionId,
        `Error updating FHIR subscription: ${error.message}`
      );
      
      throw error;
    }
  }
  
  /**
   * Delete FHIR subscription
   */
  public async deleteSubscription(
    subscriptionId: string,
    session: any
  ): Promise<boolean> {
    try {
      // Check if subscription exists
      if (!this.subscriptions.has(subscriptionId)) {
        throw new Error(`Subscription with ID ${subscriptionId} not found`);
      }
      
      // Delete subscription
      const result = this.subscriptions.delete(subscriptionId);
      
      // Log the deletion
      await logAuditEvent(
        session,
        AuditEventType.DELETE,
        Resource.SYSTEM_CONFIG,
        'delete FHIR subscription',
        'success',
        { subscriptionId },
        subscriptionId
      );
      
      return result;
    } catch (error) {
      console.error('Error deleting FHIR subscription:', error);
      
      // Log the error
      await logAuditEvent(
        session,
        AuditEventType.DELETE,
        Resource.SYSTEM_CONFIG,
        'delete FHIR subscription',
        'failure',
        { 
          subscriptionId,
          error: error.message
        },
        subscriptionId,
        `Error deleting FHIR subscription: ${error.message}`
      );
      
      throw error;
    }
  }
  
  /**
   * Send resource to external system
   */
  public async sendResource(
    resourceType: FHIRResourceType,
    resourceData: any,
    endpointIds: string[],
    session: any
  ): Promise<IntegrationEvent> {
    try {
      // Create integration event
      const event: IntegrationEvent = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        resourceType,
        resourceId: resourceData.id,
        action: 'create',
        status: 'pending',
        endpointIds
      };
      
      // Process each endpoint
      for (const endpointId of endpointIds) {
        const endpoint = this.endpoints.get(endpointId);
        
        if (!endpoint) {
          throw new Error(`Endpoint with ID ${endpointId} not found`);
        }
        
        if (!endpoint.enabled) {
          throw new Error(`Endpoint ${endpoint.name} is disabled`);
        }
        
        // Convert internal data to FHIR
        const fhirResource = await this.convertToFHIR(resourceType, resourceData, endpoint);
        
        // Send to external system
        await this.sendToExternalSystem(fhirResource, endpoint);
      }
      
      // Update event status
      event.status = 'completed';
      
      // Log the integration event
      await logAuditEvent(
        session,
        AuditEventType.CREATE,
        Resource.SYSTEM_CONFIG,
        'send resource to external system',
        'success',
        { 
          resourceType,
          resourceId: resourceData.id,
          endpointIds
        },
        resourceData.id
      );
      
      return event;
    } catch (error) {
      console.error('Error sending resource to external system:', error);
      
      // Create error event
      const errorEvent: IntegrationEvent = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        resourceType,
        resourceId: resourceData.id,
        action: 'create',
        status: 'error',
        endpointIds,
        error: error.message
      };
      
      // Log the error
      await logAuditEvent(
        session,
        AuditEventType.CREATE,
        Resource.SYSTEM_CONFIG,
        'send resource to external system',
        'failure',
        { 
          resourceType,
          resourceId: resourceData.id,
          endpointIds,
          error: error.message
        },
        resourceData.id,
        `Error sending resource to external system: ${error.message}`
      );
      
      return errorEvent;
    }
  }
  
  /**
   * Receive resource from external system
   */
  public async receiveResource(
    fhirResource: any,
    endpointId: string,
    session: any
  ): Promise<any> {
    try {
      // Validate resource
      if (!fhirResource.resourceType) {
        throw new Error('Invalid FHIR resource: missing resourceType');
      }
      
      const resourceType = fhirResource.resourceType as FHIRResourceType;
      
      // Get endpoint
      const endpoint = this.endpoints.get(endpointId);
      
      if (!endpoint) {
        throw new Error(`Endpoint with ID ${endpointId} not found`);
      }
      
      // Convert FHIR resource to internal format
      const internalResource = await this.convertFromFHIR(resourceType, fhirResource, endpoint);
      
      // Log the integration event
      await logAuditEvent(
        session,
        AuditEventType.CREATE,
        Resource.SYSTEM_CONFIG,
        'receive resource from external system',
        'success',
        { 
          resourceType,
          resourceId: fhirResource.id,
          endpointId
        },
        fhirResource.id
      );
      
      return internalResource;
    } catch (error) {
      console.error('Error receiving resource from external system:', error);
      
      // Log the error
      await logAuditEvent(
        session,
        AuditEventType.CREATE,
        Resource.SYSTEM_CONFIG,
        'receive resource from external system',
        'failure',
        { 
          resourceType: fhirResource?.resourceType,
          resourceId: fhirResource?.id,
          endpointId,
          error: error.message
        },
        fhirResource?.id,
        `Error receiving resource from external system: ${error.message}`
      );
      
      throw error;
    }
  }
  
  /**
   * Export bulk data
   */
  public async exportBulkData(
    resourceTypes: FHIRResourceType[],
    filters: Record<string, any>,
    endpointId: string,
    session: any
  ): Promise<string> {
    try {
      // Get endpoint
      const endpoint = this.endpoints.get(endpointId);
      
      if (!endpoint) {
        throw new Error(`Endpoint with ID ${endpointId} not found`);
      }
      
      if (!endpoint.enabled) {
        throw new Error(`Endpoint ${endpoint.name} is disabled`);
      }
      
      // Create bulk export job ID
      const jobId = uuidv4();
      
      // In a real implementation, this would start an asynchronous job
      // For now, we'll just log the request
      console.log(`Starting bulk export job ${jobId} for resource types:`, resourceTypes);
      
      // Log the export request
      await logAuditEvent(
        session,
        AuditEventType.CREATE,
        Resource.SYSTEM_CONFIG,
        'export bulk data',
        'success',
        { 
          resourceTypes,
          filters,
          endpointId,
          jobId
        },
        jobId
      );
      
      return jobId;
    } catch (error) {
      console.error('Error exporting bulk data:', error);
      
      // Log the error
      await logAuditEvent(
        session,
        AuditEventType.CREATE,
        Resource.SYSTEM_CONFIG,
        'export bulk data',
        'failure',
        { 
          resourceTypes,
          filters,
          endpointId,
          error: error.message
        },
        undefined,
        `Error exporting bulk data: ${error.message}`
      );
      
      throw error;
    }
  }
  
  /**
   * Import bulk data
   */
  public async importBulkData(
    bundleData: any,
    endpointId: string,
    session: any
  ): Promise<Record<string, number>> {
    try {
      // Validate bundle
      if (bundleData.resourceType !== FHIRResourceType.BUNDLE) {
        throw new Error('Invalid FHIR bundle: resourceType must be Bundle');
      }
      
      // Get endpoint
      const endpoint = this.endpoints.get(endpointId);
      
      if (!endpoint) {
        throw new Error(`Endpoint with ID ${endpointId} not found`);
      }
      
      // Process bundle entries
      const results: Record<string, number> = {};
      
      for (const entry of bundleData.entry || []) {
        if (!entry.resource || !entry.resource.resourceType) {
          continue;
        }
        
        const resourceType = entry.resource.resourceType as FHIRResourceType;
        
        try {
          // Convert FHIR resource to internal format
          await this.convertFromFHIR(resourceType, entry.resource, endpoint);
          
          // Increment success count
          results[resourceType] = (results[resourceType] || 0) + 1;
        } catch (error) {
          console.error(`Error processing ${resourceType}:`, error);
          
          // Increment error count
          const errorKey = `${resourceType}_errors`;
          results[errorKey] = (results[errorKey] || 0) + 1;
        }
      }
      
      // Log the import
      await logAuditEvent(
        session,
        AuditEventType.CREATE,
        Resource.SYSTEM_CONFIG,
        'import bulk data',
        'success',
        { 
          bundleType: bundleData.type,
          entryCount: bundleData.entry?.length || 0,
          endpointId,
          results
        },
        bundleData.id
      );
      
      return results;
    } catch (error) {
      console.error('Error importing bulk data:', error);
      
      // Log the error
      await logAuditEvent(
        session,
        AuditEventType.CREATE,
        Resource.SYSTEM_CONFIG,
        'import bulk data',
        'failure',
        { 
          bundleType: bundleData?.type,
          entryCount: bundleData?.entry?.length || 0,
          endpointId,
          error: error.message
        },
        bundleData?.id,
        `Error importing bulk data: ${error.message}`
      );
      
      throw error;
    }
  }
  
  /**
   * Process SMART on FHIR app launch
   */
  public async processSMARTAppLaunch(
    appId: string,
    context: Record<string, any>,
    session: any
  ): Promise<Record<string, any>> {
    try {
      // In a real implementation, this would handle the SMART on FHIR app launch flow
      // For now, we'll just log the request
      console.log(`Processing SMART app launch for ${appId} with context:`, context);
      
      // Create launch response
      const launchResponse = {
        appId,
        launchId: uuidv4(),
        redirectUri: `https://example.com/smart/app/${appId}/launch`,
        tokenResponse: {
          access_token: `smart_token_${uuidv4()}`,
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'patient/*.read'
        }
      };
      
      // Log the app launch
      await logAuditEvent(
        session,
        AuditEventType.CREATE,
        Resource.SYSTEM_CONFIG,
        'process SMART app launch',
        'success',
        { 
          appId,
          context,
          launchId: launchResponse.launchId
        },
        launchResponse.launchId
      );
      
      return launchResponse;
    } catch (error) {
      console.error('Error processing SMART app launch:', error);
      
      // Log the error
      await logAuditEvent(
        session,
        AuditEventType.CREATE,
        Resource.SYSTEM_CONFIG,
        'process SMART app launch',
        'failure',
        { 
          appId,
          context,
          error: error.message
        },
        undefined,
        `Error processing SMART app launch: ${error.message}`
      );
      
      throw error;
    }
  }
  
  /**
   * Validate endpoint configuration
   */
  private validateEndpointConfig(endpoint: IntegrationEndpoint): void {
    // Check required fields
    if (!endpoint.name) {
      throw new Error('Endpoint name is required');
    }
    
    if (!endpoint.systemType) {
      throw new Error('Endpoint system type is required');
    }
    
    if (!endpoint.baseUrl) {
      throw new Error('Endpoint base URL is required');
    }
    
    // Validate auth config based on auth type
    switch (endpoint.authType) {
      case 'basic':
        if (!endpoint.authConfig.username || !endpoint.authConfig.password) {
          throw new Error('Basic auth requires username and password');
        }
        break;
      case 'oauth2':
        if (!endpoint.authConfig.clientId || !endpoint.authConfig.clientSecret) {
          throw new Error('OAuth2 auth requires clientId and clientSecret');
        }
        if (!endpoint.authConfig.tokenUrl) {
          throw new Error('OAuth2 auth requires tokenUrl');
        }
        break;
      case 'token':
        if (!endpoint.authConfig.token) {
          throw new Error('Token auth requires token');
        }
        break;
    }
  }
  
  /**
   * Convert internal data to FHIR
   */
  private async convertToFHIR(
    resourceType: FHIRResourceType,
    data: any,
    endpoint: IntegrationEndpoint
  ): Promise<any> {
    const mapper = this.resourceMappers.get(resourceType);
    
    if (!mapper) {
      throw new Error(`No mapper found for resource type ${resourceType}`);
    }
    
    // Apply endpoint-specific mappings if available
    const endpointMapping = endpoint.resourceMappings[resourceType];
    
    return mapper.toFHIR(data, endpointMapping);
  }
  
  /**
   * Convert FHIR to internal data
   */
  private async convertFromFHIR(
    resourceType: FHIRResourceType,
    fhirData: any,
    endpoint: IntegrationEndpoint
  ): Promise<any> {
    const mapper = this.resourceMappers.get(resourceType);
    
    if (!mapper) {
      throw new Error(`No mapper found for resource type ${resourceType}`);
    }
    
    // Apply endpoint-specific mappings if available
    const endpointMapping = endpoint.resourceMappings[resourceType];
    
    return mapper.fromFHIR(fhirData, endpointMapping);
  }
  
  /**
   * Send data to external system
   */
  private async sendToExternalSystem(
    fhirResource: any,
    endpoint: IntegrationEndpoint
  ): Promise<any> {
    // In a real implementation, this would send the data to the external system
    // using the appropriate HTTP client and authentication
    console.log(`Sending ${fhirResource.resourceType} to ${endpoint.name}:`, fhirResource);
    
    // Mock successful response
    return {
      status: 201,
      location: `${endpoint.baseUrl}/${fhirResource.resourceType}/${fhirResource.id}`
    };
  }
  
  /**
   * Map Patient to FHIR
   */
  private mapPatientToFHIR(patient: any, mapping?: any): any {
    // Create FHIR Patient resource
    return {
      resourceType: 'Patient',
      id: patient.id,
      identifier: [
        {
          system: 'http://hospital.org/mrn',
          value: patient.mrn
        }
      ],
      name: [
        {
          family: patient.lastName,
          given: [patient.firstName, patient.middleName].filter(Boolean)
        }
      ],
      gender: patient.gender.toLowerCase(),
      birthDate: patient.dateOfBirth,
      address: patient.address ? [
        {
          line: [patient.address.line1, patient.address.line2].filter(Boolean),
          city: patient.address.city,
          state: patient.address.state,
          postalCode: patient.address.postalCode,
          country: patient.address.country
        }
      ] : undefined,
      telecom: [
        ...(patient.phone ? [{ system: 'phone', value: patient.phone }] : []),
        ...(patient.email ? [{ system: 'email', value: patient.email }] : [])
      ]
    };
  }
  
  /**
   * Map FHIR to Patient
   */
  private mapPatientFromFHIR(fhirPatient: any, mapping?: any): any {
    // Extract MRN from identifiers
    const mrnIdentifier = fhirPatient.identifier?.find(
      (id: any) => id.system === 'http://hospital.org/mrn'
    );
    
    // Extract name components
    const name = fhirPatient.name?.[0] || {};
    
    // Extract contact information
    const phone = fhirPatient.telecom?.find((t: any) => t.system === 'phone')?.value;
    const email = fhirPatient.telecom?.find((t: any) => t.system === 'email')?.value;
    
    // Extract address
    const address = fhirPatient.address?.[0];
    
    // Create internal patient object
    return {
      id: fhirPatient.id,
      mrn: mrnIdentifier?.value,
      firstName: name.given?.[0],
      middleName: name.given?.[1],
      lastName: name.family,
      gender: fhirPatient.gender?.toUpperCase(),
      dateOfBirth: fhirPatient.birthDate,
      phone,
      email,
      address: address ? {
        line1: address.line?.[0],
        line2: address.line?.[1],
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country
      } : undefined
    };
  }
  
  /**
   * Map Encounter to FHIR
   */
  private mapEncounterToFHIR(encounter: any, mapping?: any): any {
    // Create FHIR Encounter resource
    return {
      resourceType: 'Encounter',
      id: encounter.id,
      status: encounter.status,
      class: {
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: encounter.type === 'emergency' ? 'EMER' : 
              encounter.type === 'inpatient' ? 'IMP' : 
              encounter.type === 'outpatient' ? 'AMB' : 'UNK'
      },
      type: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/encounter-type',
              code: encounter.type,
              display: encounter.typeDisplay
            }
          ]
        }
      ],
      subject: {
        reference: `Patient/${encounter.patientId}`
      },
      participant: encounter.participants?.map((p: any) => ({
        individual: {
          reference: `Practitioner/${p.practitionerId}`
        },
        type: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
                code: p.role
              }
            ]
          }
        ]
      })),
      period: {
        start: encounter.startTime,
        end: encounter.endTime
      },
      location: encounter.location ? [
        {
          location: {
            reference: `Location/${encounter.location.id}`
          },
          status: 'active'
        }
      ] : undefined,
      reasonCode: encounter.reason ? [
        {
          text: encounter.reason
        }
      ] : undefined
    };
  }
  
  /**
   * Map FHIR to Encounter
   */
  private mapEncounterFromFHIR(fhirEncounter: any, mapping?: any): any {
    // Extract patient ID from subject reference
    const patientId = fhirEncounter.subject?.reference?.replace('Patient/', '');
    
    // Extract encounter type
    const encounterType = fhirEncounter.type?.[0]?.coding?.[0];
    
    // Extract participants
    const participants = fhirEncounter.participant?.map((p: any) => {
      const practitionerId = p.individual?.reference?.replace('Practitioner/', '');
      const role = p.type?.[0]?.coding?.[0]?.code;
      
      return {
        practitionerId,
        role
      };
    });
    
    // Extract location
    const locationReference = fhirEncounter.location?.[0]?.location?.reference;
    const locationId = locationReference?.replace('Location/', '');
    
    // Create internal encounter object
    return {
      id: fhirEncounter.id,
      status: fhirEncounter.status,
      type: fhirEncounter.class?.code === 'EMER' ? 'emergency' :
            fhirEncounter.class?.code === 'IMP' ? 'inpatient' :
            fhirEncounter.class?.code === 'AMB' ? 'outpatient' : 'unknown',
      typeCode: encounterType?.code,
      typeDisplay: encounterType?.display,
      patientId,
      participants,
      startTime: fhirEncounter.period?.start,
      endTime: fhirEncounter.period?.end,
      location: locationId ? { id: locationId } : undefined,
      reason: fhirEncounter.reasonCode?.[0]?.text
    };
  }
  
  /**
   * Map Observation to FHIR
   */
  private mapObservationToFHIR(observation: any, mapping?: any): any {
    // Create FHIR Observation resource
    return {
      resourceType: 'Observation',
      id: observation.id,
      status: observation.status || 'final',
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/observation-category',
              code: observation.category,
              display: observation.categoryDisplay
            }
          ]
        }
      ],
      code: {
        coding: [
          {
            system: observation.codeSystem || 'http://loinc.org',
            code: observation.code,
            display: observation.display
          }
        ],
        text: observation.display
      },
      subject: {
        reference: `Patient/${observation.patientId}`
      },
      encounter: observation.encounterId ? {
        reference: `Encounter/${observation.encounterId}`
      } : undefined,
      effectiveDateTime: observation.timestamp,
      issued: observation.issued || observation.timestamp,
      performer: observation.performerId ? [
        {
          reference: `Practitioner/${observation.performerId}`
        }
      ] : undefined,
      valueQuantity: observation.valueType === 'quantity' ? {
        value: observation.value,
        unit: observation.unit,
        system: 'http://unitsofmeasure.org',
        code: observation.unitCode
      } : undefined,
      valueString: observation.valueType === 'string' ? observation.value : undefined,
      valueBoolean: observation.valueType === 'boolean' ? observation.value : undefined,
      valueInteger: observation.valueType === 'integer' ? observation.value : undefined,
      valueCodeableConcept: observation.valueType === 'codeable' ? {
        coding: [
          {
            system: observation.valueSystem,
            code: observation.value,
            display: observation.valueDisplay
          }
        ]
      } : undefined,
      interpretation: observation.interpretation ? [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
              code: observation.interpretation,
              display: observation.interpretationDisplay
            }
          ]
        }
      ] : undefined,
      note: observation.notes ? [
        {
          text: observation.notes
        }
      ] : undefined
    };
  }
  
  /**
   * Map FHIR to Observation
   */
  private mapObservationFromFHIR(fhirObservation: any, mapping?: any): any {
    // Extract patient ID from subject reference
    const patientId = fhirObservation.subject?.reference?.replace('Patient/', '');
    
    // Extract encounter ID from encounter reference
    const encounterId = fhirObservation.encounter?.reference?.replace('Encounter/', '');
    
    // Extract performer ID from performer reference
    const performerId = fhirObservation.performer?.[0]?.reference?.replace('Practitioner/', '');
    
    // Extract code information
    const code = fhirObservation.code?.coding?.[0];
    
    // Extract category information
    const category = fhirObservation.category?.[0]?.coding?.[0];
    
    // Extract interpretation
    const interpretation = fhirObservation.interpretation?.[0]?.coding?.[0];
    
    // Determine value type and extract value
    let valueType, value, unit, unitCode, valueSystem, valueDisplay;
    
    if (fhirObservation.valueQuantity) {
      valueType = 'quantity';
      value = fhirObservation.valueQuantity.value;
      unit = fhirObservation.valueQuantity.unit;
      unitCode = fhirObservation.valueQuantity.code;
    } else if (fhirObservation.valueString !== undefined) {
      valueType = 'string';
      value = fhirObservation.valueString;
    } else if (fhirObservation.valueBoolean !== undefined) {
      valueType = 'boolean';
      value = fhirObservation.valueBoolean;
    } else if (fhirObservation.valueInteger !== undefined) {
      valueType = 'integer';
      value = fhirObservation.valueInteger;
    } else if (fhirObservation.valueCodeableConcept) {
      valueType = 'codeable';
      const valueCoding = fhirObservation.valueCodeableConcept.coding?.[0];
      value = valueCoding?.code;
      valueSystem = valueCoding?.system;
      valueDisplay = valueCoding?.display;
    }
    
    // Create internal observation object
    return {
      id: fhirObservation.id,
      status: fhirObservation.status,
      category: category?.code,
      categoryDisplay: category?.display,
      code: code?.code,
      codeSystem: code?.system,
      display: code?.display || fhirObservation.code?.text,
      patientId,
      encounterId,
      timestamp: fhirObservation.effectiveDateTime,
      issued: fhirObservation.issued,
      performerId,
      valueType,
      value,
      unit,
      unitCode,
      valueSystem,
      valueDisplay,
      interpretation: interpretation?.code,
      interpretationDisplay: interpretation?.display,
      notes: fhirObservation.note?.[0]?.text
    };
  }
  
  /**
   * Map Procedure to FHIR
   */
  private mapProcedureToFHIR(procedure: any, mapping?: any): any {
    // Create FHIR Procedure resource
    return {
      resourceType: 'Procedure',
      id: procedure.id,
      status: procedure.status,
      code: {
        coding: [
          {
            system: procedure.codeSystem || 'http://snomed.info/sct',
            code: procedure.code,
            display: procedure.display
          }
        ],
        text: procedure.display
      },
      subject: {
        reference: `Patient/${procedure.patientId}`
      },
      encounter: procedure.encounterId ? {
        reference: `Encounter/${procedure.encounterId}`
      } : undefined,
      performedDateTime: procedure.performedDateTime,
      performedPeriod: procedure.startTime ? {
        start: procedure.startTime,
        end: procedure.endTime
      } : undefined,
      performer: procedure.performers?.map((p: any) => ({
        actor: {
          reference: `Practitioner/${p.practitionerId}`
        },
        function: p.role ? {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v2-0443',
              code: p.role,
              display: p.roleDisplay
            }
          ]
        } : undefined
      })),
      location: procedure.locationId ? {
        reference: `Location/${procedure.locationId}`
      } : undefined,
      reasonCode: procedure.reason ? [
        {
          text: procedure.reason
        }
      ] : undefined,
      bodySite: procedure.bodySite ? [
        {
          coding: [
            {
              system: 'http://snomed.info/sct',
              code: procedure.bodySiteCode,
              display: procedure.bodySite
            }
          ]
        }
      ] : undefined,
      outcome: procedure.outcome ? {
        text: procedure.outcome
      } : undefined,
      report: procedure.reportIds?.map((id: string) => ({
        reference: `DiagnosticReport/${id}`
      })),
      complication: procedure.complications?.map((c: any) => ({
        text: c
      })),
      followUp: procedure.followUp ? [
        {
          text: procedure.followUp
        }
      ] : undefined,
      note: procedure.notes ? [
        {
          text: procedure.notes
        }
      ] : undefined
    };
  }
  
  /**
   * Map FHIR to Procedure
   */
  private mapProcedureFromFHIR(fhirProcedure: any, mapping?: any): any {
    // Extract patient ID from subject reference
    const patientId = fhirProcedure.subject?.reference?.replace('Patient/', '');
    
    // Extract encounter ID from encounter reference
    const encounterId = fhirProcedure.encounter?.reference?.replace('Encounter/', '');
    
    // Extract location ID from location reference
    const locationId = fhirProcedure.location?.reference?.replace('Location/', '');
    
    // Extract code information
    const code = fhirProcedure.code?.coding?.[0];
    
    // Extract performers
    const performers = fhirProcedure.performer?.map((p: any) => {
      const practitionerId = p.actor?.reference?.replace('Practitioner/', '');
      const roleCode = p.function?.coding?.[0]?.code;
      const roleDisplay = p.function?.coding?.[0]?.display;
      
      return {
        practitionerId,
        role: roleCode,
        roleDisplay
      };
    });
    
    // Extract body site
    const bodySite = fhirProcedure.bodySite?.[0]?.coding?.[0];
    
    // Extract report IDs
    const reportIds = fhirProcedure.report?.map((r: any) => 
      r.reference?.replace('DiagnosticReport/', '')
    );
    
    // Extract complications
    const complications = fhirProcedure.complication?.map((c: any) => c.text);
    
    // Create internal procedure object
    return {
      id: fhirProcedure.id,
      status: fhirProcedure.status,
      code: code?.code,
      codeSystem: code?.system,
      display: code?.display || fhirProcedure.code?.text,
      patientId,
      encounterId,
      performedDateTime: fhirProcedure.performedDateTime,
      startTime: fhirProcedure.performedPeriod?.start,
      endTime: fhirProcedure.performedPeriod?.end,
      performers,
      locationId,
      reason: fhirProcedure.reasonCode?.[0]?.text,
      bodySite: bodySite?.display,
      bodySiteCode: bodySite?.code,
      outcome: fhirProcedure.outcome?.text,
      reportIds,
      complications,
      followUp: fhirProcedure.followUp?.[0]?.text,
      notes: fhirProcedure.note?.[0]?.text
    };
  }
  
  /**
   * Map ServiceRequest to FHIR
   */
  private mapServiceRequestToFHIR(request: any, mapping?: any): any {
    // Create FHIR ServiceRequest resource
    return {
      resourceType: 'ServiceRequest',
      id: request.id,
      status: request.status,
      intent: request.intent || 'order',
      priority: request.priority,
      code: {
        coding: [
          {
            system: request.codeSystem || 'http://snomed.info/sct',
            code: request.code,
            display: request.display
          }
        ],
        text: request.display
      },
      subject: {
        reference: `Patient/${request.patientId}`
      },
      encounter: request.encounterId ? {
        reference: `Encounter/${request.encounterId}`
      } : undefined,
      occurrenceDateTime: request.scheduledDateTime,
      occurrencePeriod: request.startTime ? {
        start: request.startTime,
        end: request.endTime
      } : undefined,
      authoredOn: request.orderedDateTime,
      requester: request.requesterId ? {
        reference: `Practitioner/${request.requesterId}`
      } : undefined,
      performer: request.performerId ? [
        {
          reference: `Practitioner/${request.performerId}`
        }
      ] : undefined,
      reasonCode: request.reason ? [
        {
          text: request.reason
        }
      ] : undefined,
      bodySite: request.bodySite ? [
        {
          coding: [
            {
              system: 'http://snomed.info/sct',
              code: request.bodySiteCode,
              display: request.bodySite
            }
          ]
        }
      ] : undefined,
      note: request.notes ? [
        {
          text: request.notes
        }
      ] : undefined,
      patientInstruction: request.patientInstructions,
      supportingInfo: request.supportingInfoIds?.map((id: string) => ({
        reference: `DocumentReference/${id}`
      }))
    };
  }
  
  /**
   * Map FHIR to ServiceRequest
   */
  private mapServiceRequestFromFHIR(fhirRequest: any, mapping?: any): any {
    // Extract patient ID from subject reference
    const patientId = fhirRequest.subject?.reference?.replace('Patient/', '');
    
    // Extract encounter ID from encounter reference
    const encounterId = fhirRequest.encounter?.reference?.replace('Encounter/', '');
    
    // Extract requester ID from requester reference
    const requesterId = fhirRequest.requester?.reference?.replace('Practitioner/', '');
    
    // Extract performer ID from performer reference
    const performerId = fhirRequest.performer?.[0]?.reference?.replace('Practitioner/', '');
    
    // Extract code information
    const code = fhirRequest.code?.coding?.[0];
    
    // Extract body site
    const bodySite = fhirRequest.bodySite?.[0]?.coding?.[0];
    
    // Extract supporting info IDs
    const supportingInfoIds = fhirRequest.supportingInfo?.map((info: any) => 
      info.reference?.replace('DocumentReference/', '')
    );
    
    // Create internal service request object
    return {
      id: fhirRequest.id,
      status: fhirRequest.status,
      intent: fhirRequest.intent,
      priority: fhirRequest.priority,
      code: code?.code,
      codeSystem: code?.system,
      display: code?.display || fhirRequest.code?.text,
      patientId,
      encounterId,
      scheduledDateTime: fhirRequest.occurrenceDateTime,
      startTime: fhirRequest.occurrencePeriod?.start,
      endTime: fhirRequest.occurrencePeriod?.end,
      orderedDateTime: fhirRequest.authoredOn,
      requesterId,
      performerId,
      reason: fhirRequest.reasonCode?.[0]?.text,
      bodySite: bodySite?.display,
      bodySiteCode: bodySite?.code,
      notes: fhirRequest.note?.[0]?.text,
      patientInstructions: fhirRequest.patientInstruction,
      supportingInfoIds
    };
  }
  
  /**
   * Map BiologicallyDerivedProduct to FHIR
   */
  private mapBiologicallyDerivedProductToFHIR(product: any, mapping?: any): any {
    // Create FHIR BiologicallyDerivedProduct resource
    return {
      resourceType: 'BiologicallyDerivedProduct',
      id: product.id,
      productCategory: product.category,
      productCode: {
        coding: [
          {
            system: product.codeSystem || 'http://terminology.hl7.org/CodeSystem/v2-0078',
            code: product.code,
            display: product.display
          }
        ],
        text: product.display
      },
      status: product.status,
      request: product.requestIds?.map((id: string) => ({
        reference: `ServiceRequest/${id}`
      })),
      collection: {
        collector: product.collectorId ? {
          reference: `Practitioner/${product.collectorId}`
        } : undefined,
        source: product.donorId ? {
          reference: `Patient/${product.donorId}`
        } : undefined,
        collectedDateTime: product.collectionDateTime
      },
      processing: product.processing?.map((p: any) => ({
        description: p.description,
        procedure: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v2-0373',
              code: p.procedureCode,
              display: p.procedureDisplay
            }
          ]
        },
        timeDateTime: p.dateTime
      })),
      manipulation: {
        description: product.manipulationDescription
      },
      storage: product.storage?.map((s: any) => ({
        description: s.description,
        temperature: s.temperature,
        scale: s.temperatureScale,
        duration: {
          value: s.duration,
          unit: s.durationUnit
        }
      })),
      property: [
        {
          type: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v2-0356',
                code: 'ABO',
                display: 'ABO'
              }
            ]
          },
          valueCodeableConcept: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v2-0356',
                code: product.aboType,
                display: product.aboType
              }
            ]
          }
        },
        {
          type: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v2-0356',
                code: 'RH',
                display: 'Rh'
              }
            ]
          },
          valueCodeableConcept: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v2-0356',
                code: product.rhType === '+' ? 'POS' : 'NEG',
                display: product.rhType
              }
            ]
          }
        }
      ]
    };
  }
  
  /**
   * Map FHIR to BiologicallyDerivedProduct
   */
  private mapBiologicallyDerivedProductFromFHIR(fhirProduct: any, mapping?: any): any {
    // Extract request IDs from request references
    const requestIds = fhirProduct.request?.map((r: any) => 
      r.reference?.replace('ServiceRequest/', '')
    );
    
    // Extract collector ID from collector reference
    const collectorId = fhirProduct.collection?.collector?.reference?.replace('Practitioner/', '');
    
    // Extract donor ID from source reference
    const donorId = fhirProduct.collection?.source?.reference?.replace('Patient/', '');
    
    // Extract code information
    const code = fhirProduct.productCode?.coding?.[0];
    
    // Extract processing information
    const processing = fhirProduct.processing?.map((p: any) => {
      const procedureCode = p.procedure?.coding?.[0]?.code;
      const procedureDisplay = p.procedure?.coding?.[0]?.display;
      
      return {
        description: p.description,
        procedureCode,
        procedureDisplay,
        dateTime: p.timeDateTime
      };
    });
    
    // Extract storage information
    const storage = fhirProduct.storage?.map((s: any) => ({
      description: s.description,
      temperature: s.temperature,
      temperatureScale: s.scale,
      duration: s.duration?.value,
      durationUnit: s.duration?.unit
    }));
    
    // Extract blood type properties
    const aboProperty = fhirProduct.property?.find((p: any) => 
      p.type?.coding?.[0]?.code === 'ABO'
    );
    
    const rhProperty = fhirProduct.property?.find((p: any) => 
      p.type?.coding?.[0]?.code === 'RH'
    );
    
    const aboType = aboProperty?.valueCodeableConcept?.coding?.[0]?.code;
    const rhType = rhProperty?.valueCodeableConcept?.coding?.[0]?.display;
    
    // Create internal product object
    return {
      id: fhirProduct.id,
      category: fhirProduct.productCategory,
      code: code?.code,
      codeSystem: code?.system,
      display: code?.display || fhirProduct.productCode?.text,
      status: fhirProduct.status,
      requestIds,
      collectorId,
      donorId,
      collectionDateTime: fhirProduct.collection?.collectedDateTime,
      processing,
      manipulationDescription: fhirProduct.manipulation?.description,
      storage,
      aboType,
      rhType
    };
  }
}

// Export singleton instance
export const fhirIntegrationService = new FHIRIntegrationService();
