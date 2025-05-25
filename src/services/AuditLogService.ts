import { DatabaseService } from '../lib/DatabaseService';
import crypto from 'crypto';

/**
 * Audit event types based on FHIR R4 AuditEvent resource
 */
export enum AuditEventType {
  // Security events
  LOGIN = 'login',
  LOGOUT = 'logout',
  ACCESS = 'access',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  
  // Data events
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  
  // System events
  SYSTEM_START = 'system-start',
  SYSTEM_STOP = 'system-stop',
  BACKUP = 'backup',
  RESTORE = 'restore',
  
  // Emergency events
  BREAK_GLASS = 'break-glass',
  EMERGENCY_ACCESS = 'emergency-access'
}

/**
 * Audit event outcomes based on FHIR R4 AuditEvent resource
 */
export enum AuditEventOutcome {
  SUCCESS = '0', // Operation completed successfully
  MINOR_FAILURE = '4', // Operation completed with minor issues
  SERIOUS_FAILURE = '8', // Operation failed due to a serious issue
  MAJOR_FAILURE = '12' // Operation failed due to a major issue
}

/**
 * Audit event action based on FHIR R4 AuditEvent resource
 */
export enum AuditEventAction {
  CREATE = 'C',
  READ = 'R',
  UPDATE = 'U',
  DELETE = 'D',
  EXECUTE = 'E'
}

/**
 * Agent type for audit events
 */
export enum AuditAgentType {
  USER = 'user',
  SYSTEM = 'system',
  DEVICE = 'device'
}

/**
 * Entity type for audit events
 */
export enum AuditEntityType {
  PERSON = 'person',
  SYSTEM = 'system',
  ORGANIZATION = 'organization',
  DEVICE = 'device',
  PATIENT = 'patient',
  PRACTITIONER = 'practitioner',
  LOCATION = 'location',
  DATA = 'data'
}

/**
 * Interface for audit event agent
 */
export interface AuditAgent {
  agentType: AuditAgentType;
  agentId?: string;
  agentName?: string;
  agentRole?: string;
  networkAddress?: string;
  userAgent?: string;
}

/**
 * Interface for audit event entity
 */
export interface AuditEntity {
  entityType: AuditEntityType;
  entityId: string;
  entityName?: string;
  entityRole?: string;
  entityLifecycle?: string;
  entityDetail?: Record<string, any>;
}

/**
 * Interface for audit event data
 */
export interface AuditEventData {
  eventType: AuditEventType;
  eventSubtype?: string;
  eventAction: AuditEventAction;
  eventOutcome: AuditEventOutcome;
  eventOutcomeDesc?: string;
  occurredAt: Date;
  agents: AuditAgent[];
  entities: AuditEntity[];
}

/**
 * Enhanced audit logging service for the HMS System Infrastructure & Security module
 * Implements FHIR R4 AuditEvent resource for healthcare compliance
 */
export class AuditLogService {
  private static instance: AuditLogService;
  private db: DatabaseService;
  private immutableStorage: boolean;

  private constructor() {
    this.db = DatabaseService.getInstance();
    this.immutableStorage = process.env.AUDIT_IMMUTABLE_STORAGE === 'true';
  }

  /**
   * Get singleton instance of AuditLogService
   * @returns AuditLogService instance
   */
  public static getInstance(): AuditLogService {
    if (!AuditLogService.instance) {
      AuditLogService.instance = new AuditLogService();
    }
    return AuditLogService.instance;
  }

  /**
   * Initialize the audit logging service
   * Creates necessary tables if they don't exist
   */
  public async initialize(): Promise<void> {
    try {
      // Create audit_events table if it doesn't exist
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS audit_events (
          id UUID PRIMARY KEY,
          event_type VARCHAR(100) NOT NULL,
          event_subtype VARCHAR(100),
          event_action VARCHAR(20) NOT NULL,
          event_outcome VARCHAR(20) NOT NULL,
          event_outcome_desc TEXT,
          recorded_at TIMESTAMP NOT NULL,
          occurred_at TIMESTAMP NOT NULL,
          hash VARCHAR(128),
          previous_hash VARCHAR(128)
        );
      `);

      // Create audit_agents table if it doesn't exist
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS audit_agents (
          id UUID PRIMARY KEY,
          audit_event_id UUID REFERENCES audit_events(id),
          agent_type VARCHAR(50) NOT NULL,
          agent_id VARCHAR(255),
          agent_name VARCHAR(255),
          agent_role VARCHAR(100),
          network_address VARCHAR(45),
          user_agent TEXT,
          created_at TIMESTAMP NOT NULL
        );
      `);

      // Create audit_entities table if it doesn't exist
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS audit_entities (
          id UUID PRIMARY KEY,
          audit_event_id UUID REFERENCES audit_events(id),
          entity_type VARCHAR(100) NOT NULL,
          entity_id VARCHAR(255) NOT NULL,
          entity_name VARCHAR(255),
          entity_role VARCHAR(100),
          entity_lifecycle VARCHAR(50),
          entity_detail JSONB,
          created_at TIMESTAMP NOT NULL
        );
      `);

      // Create audit_alerts table if it doesn't exist
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS audit_alerts (
          id UUID PRIMARY KEY,
          audit_event_id UUID REFERENCES audit_events(id),
          alert_type VARCHAR(100) NOT NULL,
          alert_severity VARCHAR(50) NOT NULL,
          alert_message TEXT NOT NULL,
          alert_status VARCHAR(50) NOT NULL,
          created_at TIMESTAMP NOT NULL,
          resolved_at TIMESTAMP,
          resolved_by UUID,
          resolution_notes TEXT
        );
      `);

      console.log('Audit logging service initialized');
    } catch (error) {
      console.error('Error initializing audit logging service:', error);
      throw error;
    }
  }

  /**
   * Log an audit event
   * @param eventData Audit event data
   * @returns ID of the created audit event
   */
  public async logEvent(eventData: AuditEventData): Promise<string> {
    return this.db.transaction(async (client) => {
      try {
        const eventId = crypto.randomUUID();
        const recordedAt = new Date();
        
        // Get the previous hash for blockchain-like immutability
        let previousHash: string | null = null;
        
        if (this.immutableStorage) {
          const lastEventResult = await client.query(
            'SELECT hash FROM audit_events ORDER BY recorded_at DESC LIMIT 1'
          );
          
          if (lastEventResult.rows.length > 0) {
            previousHash = lastEventResult.rows[0].hash;
          }
        }
        
        // Create a hash of the current event
        let hash: string | null = null;
        
        if (this.immutableStorage) {
          const dataToHash = JSON.stringify({
            id: eventId,
            eventType: eventData.eventType,
            eventSubtype: eventData.eventSubtype,
            eventAction: eventData.eventAction,
            eventOutcome: eventData.eventOutcome,
            eventOutcomeDesc: eventData.eventOutcomeDesc,
            recordedAt: recordedAt.toISOString(),
            occurredAt: eventData.occurredAt.toISOString(),
            previousHash: previousHash,
            agents: eventData.agents,
            entities: eventData.entities
          });
          
          hash = crypto
            .createHash('sha512')
            .update(dataToHash)
            .digest('hex');
        }
        
        // Insert the audit event
        await client.query(
          `INSERT INTO audit_events (
            id, event_type, event_subtype, event_action, event_outcome, 
            event_outcome_desc, recorded_at, occurred_at, hash, previous_hash
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            eventId,
            eventData.eventType,
            eventData.eventSubtype,
            eventData.eventAction,
            eventData.eventOutcome,
            eventData.eventOutcomeDesc,
            recordedAt,
            eventData.occurredAt,
            hash,
            previousHash
          ]
        );
        
        // Insert audit agents
        for (const agent of eventData.agents) {
          await client.query(
            `INSERT INTO audit_agents (
              id, audit_event_id, agent_type, agent_id, agent_name, 
              agent_role, network_address, user_agent, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              crypto.randomUUID(),
              eventId,
              agent.agentType,
              agent.agentId,
              agent.agentName,
              agent.agentRole,
              agent.networkAddress,
              agent.userAgent,
              recordedAt
            ]
          );
        }
        
        // Insert audit entities
        for (const entity of eventData.entities) {
          await client.query(
            `INSERT INTO audit_entities (
              id, audit_event_id, entity_type, entity_id, entity_name, 
              entity_role, entity_lifecycle, entity_detail, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              crypto.randomUUID(),
              eventId,
              entity.entityType,
              entity.entityId,
              entity.entityName,
              entity.entityRole,
              entity.entityLifecycle,
              entity.entityDetail ? JSON.stringify(entity.entityDetail) : null,
              recordedAt
            ]
          );
        }
        
        // Check if this event should trigger an alert
        await this.checkForAlerts(client, eventId, eventData);
        
        return eventId;
      } catch (error) {
        console.error('Error logging audit event:', error);
        throw error;
      }
    });
  }

  /**
   * Check if an audit event should trigger alerts
   * @param client Database client
   * @param eventId Audit event ID
   * @param eventData Audit event data
   */
  private async checkForAlerts(
    client: any,
    eventId: string,
    eventData: AuditEventData
  ): Promise<void> {
    try {
      // Check for failed authentication attempts
      if (
        eventData.eventType === AuditEventType.AUTHENTICATION &&
        eventData.eventOutcome !== AuditEventOutcome.SUCCESS
      ) {
        // Check for multiple failed authentication attempts from the same user or IP
        const agent = eventData.agents.find(a => a.agentType === AuditAgentType.USER);
        
        if (agent && agent.agentId) {
          const failedAttemptsResult = await client.query(
            `SELECT COUNT(*) FROM audit_events ae
             JOIN audit_agents aa ON ae.id = aa.audit_event_id
             WHERE ae.event_type = $1 AND ae.event_outcome != $2
             AND aa.agent_id = $3 AND ae.occurred_at > $4`,
            [
              AuditEventType.AUTHENTICATION,
              AuditEventOutcome.SUCCESS,
              agent.agentId,
              new Date(Date.now() - 30 * 60 * 1000) // Last 30 minutes
            ]
          );
          
          const failedAttempts = parseInt(failedAttemptsResult.rows[0].count, 10);
          
          if (failedAttempts >= 5) {
            // Create an alert for multiple failed authentication attempts
            await client.query(
              `INSERT INTO audit_alerts (
                id, audit_event_id, alert_type, alert_severity, 
                alert_message, alert_status, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                crypto.randomUUID(),
                eventId,
                'multiple_failed_auth',
                'high',
                `Multiple failed authentication attempts (${failedAttempts}) for user ${agent.agentId}`,
                'open',
                new Date()
              ]
            );
          }
        }
      }
      
      // Check for emergency access events
      if (
        eventData.eventType === AuditEventType.BREAK_GLASS ||
        eventData.eventType === AuditEventType.EMERGENCY_ACCESS
      ) {
        // Always create an alert for emergency access
        await client.query(
          `INSERT INTO audit_alerts (
            id, audit_event_id, alert_type, alert_severity, 
            alert_message, alert_status, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            crypto.randomUUID(),
            eventId,
            'emergency_access',
            'critical',
            `Emergency access event: ${eventData.eventType}`,
            'open',
            new Date()
          ]
        );
      }
      
      // Check for suspicious activity patterns
      // This would involve more complex logic in a real implementation
    } catch (error) {
      console.error('Error checking for alerts:', error);
      throw error;
    }
  }

  /**
   * Get audit events by criteria
   * @param criteria Search criteria
   * @param limit Maximum number of events to return
   * @param offset Offset for pagination
   * @returns Array of audit events
   */
  public async getEvents(
    criteria: {
      eventType?: AuditEventType;
      eventAction?: AuditEventAction;
      eventOutcome?: AuditEventOutcome;
      startDate?: Date;
      endDate?: Date;
      agentId?: string;
      entityId?: string;
      entityType?: AuditEntityType;
    },
    limit: number = 100,
    offset: number = 0
  ): Promise<any[]> {
    try {
      let query = `
        SELECT 
          ae.id, ae.event_type, ae.event_subtype, ae.event_action, 
          ae.event_outcome, ae.event_outcome_desc, ae.recorded_at, ae.occurred_at
        FROM audit_events ae
      `;
      
      const queryParams: any[] = [];
      const conditions: string[] = [];
      let paramIndex = 1;
      
      // Add join conditions if filtering by agent or entity
      if (criteria.agentId) {
        query += ` JOIN audit_agents aa ON ae.id = aa.audit_event_id`;
        conditions.push(`aa.agent_id = $${paramIndex++}`);
        queryParams.push(criteria.agentId);
      }
      
      if (criteria.entityId || criteria.entityType) {
        query += ` JOIN audit_entities aent ON ae.id = aent.audit_event_id`;
        
        if (criteria.entityId) {
          conditions.push(`aent.entity_id = $${paramIndex++}`);
          queryParams.push(criteria.entityId);
        }
        
        if (criteria.entityType) {
          conditions.push(`aent.entity_type = $${paramIndex++}`);
          queryParams.push(criteria.entityType);
        }
      }
      
      // Add filter conditions
      if (criteria.eventType) {
        conditions.push(`ae.event_type = $${paramIndex++}`);
        queryParams.push(criteria.eventType);
      }
      
      if (criteria.eventAction) {
        conditions.push(`ae.event_action = $${paramIndex++}`);
        queryParams.push(criteria.eventAction);
      }
      
      if (criteria.eventOutcome) {
        conditions.push(`ae.event_outcome = $${paramIndex++}`);
        queryParams.push(criteria.eventOutcome);
      }
      
      if (criteria.startDate) {
        conditions.push(`ae.occurred_at >= $${paramIndex++}`);
        queryParams.push(criteria.startDate);
      }
      
      if (criteria.endDate) {
        conditions.push(`ae.occurred_at <= $${paramIndex++}`);
        queryParams.push(criteria.endDate);
      }
      
      // Add WHERE clause if there are conditions
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      // Add ORDER BY, LIMIT, and OFFSET
      query += ` ORDER BY ae.occurred_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      queryParams.push(limit, offset);
      
      const result = await this.db.query(query, queryParams);
      
      // For each event, get its agents and entities
      const events = await Promise.all(
        result.rows.map(async (event: any) => {
          const agentsResult = await this.db.query(
            `SELECT * FROM audit_agents WHERE audit_event_id = $1`,
            [event.id]
          );
          
          const entitiesResult = await this.db.query(
            `SELECT * FROM audit_entities WHERE audit_event_id = $1`,
            [event.id]
          );
          
          return {
            ...event,
            agents: agentsResult.rows,
            entities: entitiesResult.rows
          };
        })
      );
      
      return events;
    } catch (error) {
      console.error('Error getting audit events:', error);
      throw error;
    }
  }

  /**
   * Verify the integrity of the audit log chain
   * @returns Object with verification result and any issues found
   */
  public async verifyIntegrity(): Promise<{ valid: boolean; issues: string[] }> {
    if (!this.immutableStorage) {
      return { valid: true, issues: ['Immutable storage is not enabled'] };
    }
    
    try {
      const result = await this.db.query(
        'SELECT id, hash, previous_hash, recorded_at FROM audit_events ORDER BY recorded_at ASC'
      );
      
      const events = result.rows;
      const issues: string[] = [];
      
      if (events.length === 0) {
        return { valid: true, issues: [] };
      }
      
      let previousHash: string | null = null;
      
      for (const event of events) {
        // Check if previous_hash matches the hash of the previous event
        if (previousHash !== event.previous_hash) {
          issues.push(`Event ${event.id} has invalid previous_hash`);
        }
        
        // Set current hash as previous for next iteration
        previousHash = event.hash;
      }
      
      return {
        valid: issues.length === 0,
        issues
      };
    } catch (error) {
      console.error('Error verifying audit log integrity:', error);
      throw error;
    }
  }

  /**
   * Export audit logs to FHIR R4 AuditEvent format
   * @param eventIds Array of event IDs to export
   * @returns Array of FHIR AuditEvent resources
   */
  public async exportToFHIR(eventIds: string[]): Promise<any[]> {
    try {
      const fhirAuditEvents = [];
      
      for (const eventId of eventIds) {
        // Get the audit event
        const eventResult = await this.db.query(
          `SELECT * FROM audit_events WHERE id = $1`,
          [eventId]
        );
        
        if (eventResult.rows.length === 0) {
          continue;
        }
        
        const event = eventResult.rows[0];
        
        // Get agents
        const agentsResult = await this.db.query(
          `SELECT * FROM audit_agents WHERE audit_event_id = $1`,
          [eventId]
        );
        
        // Get entities
        const entitiesResult = await this.db.query(
          `SELECT * FROM audit_entities WHERE audit_event_id = $1`,
          [eventId]
        );
        
        // Map to FHIR AuditEvent format
        const fhirAuditEvent = {
          resourceType: 'AuditEvent',
          id: event.id,
          type: {
            system: 'http://terminology.hl7.org/CodeSystem/audit-event-type',
            code: event.event_type,
            display: this.getFHIRDisplayForEventType(event.event_type)
          },
          subtype: event.event_subtype ? [
            {
              system: 'http://terminology.hl7.org/CodeSystem/audit-event-sub-type',
              code: event.event_subtype,
              display: event.event_subtype
            }
          ] : undefined,
          action: event.event_action,
          recorded: event.recorded_at,
          outcome: event.event_outcome,
          outcomeDesc: event.event_outcome_desc,
          agent: agentsResult.rows.map((agent: any) => ({
            type: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/security-role-type',
                  code: agent.agent_type,
                  display: this.getFHIRDisplayForAgentType(agent.agent_type)
                }
              ]
            },
            who: agent.agent_id ? {
              identifier: {
                value: agent.agent_id
              },
              display: agent.agent_name
            } : undefined,
            role: agent.agent_role ? [
              {
                coding: [
                  {
                    system: 'http://terminology.hl7.org/CodeSystem/v3-RoleCode',
                    code: agent.agent_role,
                    display: agent.agent_role
                  }
                ]
              }
            ] : undefined,
            network: agent.network_address ? {
              address: agent.network_address,
              type: '2' // 2 = IP Address
            } : undefined
          })),
          entity: entitiesResult.rows.map((entity: any) => ({
            what: {
              identifier: {
                value: entity.entity_id
              },
              display: entity.entity_name
            },
            type: {
              system: 'http://terminology.hl7.org/CodeSystem/audit-entity-type',
              code: entity.entity_type,
              display: this.getFHIRDisplayForEntityType(entity.entity_type)
            },
            role: entity.entity_role ? {
              system: 'http://terminology.hl7.org/CodeSystem/object-role',
              code: entity.entity_role,
              display: entity.entity_role
            } : undefined,
            lifecycle: entity.entity_lifecycle ? {
              system: 'http://terminology.hl7.org/CodeSystem/dicom-audit-lifecycle',
              code: entity.entity_lifecycle,
              display: entity.entity_lifecycle
            } : undefined,
            detail: entity.entity_detail ? Object.entries(entity.entity_detail).map(([key, value]) => ({
              type: key,
              valueString: typeof value === 'object' ? JSON.stringify(value) : String(value)
            })) : undefined
          }))
        };
        
        fhirAuditEvents.push(fhirAuditEvent);
      }
      
      return fhirAuditEvents;
    } catch (error) {
      console.error('Error exporting audit events to FHIR:', error);
      throw error;
    }
  }

  /**
   * Get FHIR display value for event type
   * @param eventType Audit event type
   * @returns Display value for FHIR
   */
  private getFHIRDisplayForEventType(eventType: string): string {
    const displayMap: Record<string, string> = {
      [AuditEventType.LOGIN]: 'User Login',
      [AuditEventType.LOGOUT]: 'User Logout',
      [AuditEventType.ACCESS]: 'Data Access',
      [AuditEventType.AUTHENTICATION]: 'Authentication',
      [AuditEventType.AUTHORIZATION]: 'Authorization',
      [AuditEventType.CREATE]: 'Create',
      [AuditEventType.READ]: 'Read',
      [AuditEventType.UPDATE]: 'Update',
      [AuditEventType.DELETE]: 'Delete',
      [AuditEventType.SYSTEM_START]: 'System Start',
      [AuditEventType.SYSTEM_STOP]: 'System Stop',
      [AuditEventType.BACKUP]: 'Backup',
      [AuditEventType.RESTORE]: 'Restore',
      [AuditEventType.BREAK_GLASS]: 'Break Glass',
      [AuditEventType.EMERGENCY_ACCESS]: 'Emergency Access'
    };
    
    return displayMap[eventType] || eventType;
  }

  /**
   * Get FHIR display value for agent type
   * @param agentType Audit agent type
   * @returns Display value for FHIR
   */
  private getFHIRDisplayForAgentType(agentType: string): string {
    const displayMap: Record<string, string> = {
      [AuditAgentType.USER]: 'Human User',
      [AuditAgentType.SYSTEM]: 'System',
      [AuditAgentType.DEVICE]: 'Device'
    };
    
    return displayMap[agentType] || agentType;
  }

  /**
   * Get FHIR display value for entity type
   * @param entityType Audit entity type
   * @returns Display value for FHIR
   */
  private getFHIRDisplayForEntityType(entityType: string): string {
    const displayMap: Record<string, string> = {
      [AuditEntityType.PERSON]: 'Person',
      [AuditEntityType.SYSTEM]: 'System',
      [AuditEntityType.ORGANIZATION]: 'Organization',
      [AuditEntityType.DEVICE]: 'Device',
      [AuditEntityType.PATIENT]: 'Patient',
      [AuditEntityType.PRACTITIONER]: 'Practitioner',
      [AuditEntityType.LOCATION]: 'Location',
      [AuditEntityType.DATA]: 'Data'
    };
    
    return displayMap[entityType] || entityType;
  }

  /**
   * Get open alerts
   * @param limit Maximum number of alerts to return
   * @param offset Offset for pagination
   * @returns Array of open alerts
   */
  public async getOpenAlerts(limit: number = 100, offset: number = 0): Promise<any[]> {
    try {
      const result = await this.db.query(
        `SELECT * FROM audit_alerts 
         WHERE alert_status = 'open' 
         ORDER BY created_at DESC 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Error getting open alerts:', error);
      throw error;
    }
  }

  /**
   * Resolve an alert
   * @param alertId Alert ID
   * @param resolvedBy ID of the user resolving the alert
   * @param resolutionNotes Notes about the resolution
   * @returns True if the alert was resolved
   */
  public async resolveAlert(
    alertId: string,
    resolvedBy: string,
    resolutionNotes: string
  ): Promise<boolean> {
    try {
      const result = await this.db.query(
        `UPDATE audit_alerts 
         SET alert_status = 'resolved', resolved_at = $1, 
         resolved_by = $2, resolution_notes = $3
         WHERE id = $4 AND alert_status = 'open'`,
        [new Date(), resolvedBy, resolutionNotes, alertId]
      );
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error resolving alert:', error);
      throw error;
    }
  }
}
