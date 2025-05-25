import { DatabaseService } from '../lib/DatabaseService';
import { AuditLogService, AuditEventType, AuditEventAction, AuditEventOutcome } from './AuditLogService';
import crypto from 'crypto';

/**
 * Analytics and Reporting Service for the HMS System Infrastructure & Security module
 * Provides security metrics, compliance reporting, and data aggregation
 */
export class AnalyticsService {
  private static instance: AnalyticsService;
  private db: DatabaseService;
  private auditLog: AuditLogService;

  private constructor() {
    this.db = DatabaseService.getInstance();
    this.auditLog = AuditLogService.getInstance();
  }

  /**
   * Get singleton instance of AnalyticsService
   * @returns AnalyticsService instance
   */
  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Initialize the analytics service
   * Creates necessary tables if they don't exist
   */
  public async initialize(): Promise<void> {
    try {
      // Create analytics_reports table if it doesn't exist
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS analytics_reports (
          id UUID PRIMARY KEY,
          report_type VARCHAR(100) NOT NULL,
          report_name VARCHAR(255) NOT NULL,
          report_description TEXT,
          parameters JSONB,
          created_at TIMESTAMP NOT NULL,
          created_by UUID,
          last_run_at TIMESTAMP,
          schedule VARCHAR(100),
          next_run_at TIMESTAMP,
          status VARCHAR(50),
          metadata JSONB
        );
      `);

      // Create analytics_report_results table if it doesn't exist
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS analytics_report_results (
          id UUID PRIMARY KEY,
          report_id UUID REFERENCES analytics_reports(id),
          result_data JSONB NOT NULL,
          created_at TIMESTAMP NOT NULL,
          expires_at TIMESTAMP,
          status VARCHAR(50) NOT NULL,
          error_message TEXT
        );
      `);

      // Create analytics_dashboards table if it doesn't exist
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS analytics_dashboards (
          id UUID PRIMARY KEY,
          dashboard_name VARCHAR(255) NOT NULL,
          dashboard_description TEXT,
          layout JSONB NOT NULL,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP NOT NULL,
          created_by UUID,
          updated_by UUID,
          is_public BOOLEAN DEFAULT FALSE,
          metadata JSONB
        );
      `);

      // Create analytics_widgets table if it doesn't exist
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS analytics_widgets (
          id UUID PRIMARY KEY,
          dashboard_id UUID REFERENCES analytics_dashboards(id),
          widget_type VARCHAR(100) NOT NULL,
          widget_name VARCHAR(255) NOT NULL,
          widget_description TEXT,
          data_source VARCHAR(255) NOT NULL,
          query JSONB NOT NULL,
          visualization_config JSONB NOT NULL,
          position JSONB NOT NULL,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP NOT NULL,
          refresh_interval INTEGER,
          metadata JSONB
        );
      `);

      // Create analytics_metrics table if it doesn't exist
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS analytics_metrics (
          id UUID PRIMARY KEY,
          metric_name VARCHAR(255) NOT NULL,
          metric_description TEXT,
          metric_type VARCHAR(50) NOT NULL,
          data_source VARCHAR(255) NOT NULL,
          aggregation_method VARCHAR(50) NOT NULL,
          calculation_query TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP NOT NULL,
          metadata JSONB
        );
      `);

      // Create analytics_metric_values table if it doesn't exist
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS analytics_metric_values (
          id UUID PRIMARY KEY,
          metric_id UUID REFERENCES analytics_metrics(id),
          timestamp TIMESTAMP NOT NULL,
          value NUMERIC NOT NULL,
          dimensions JSONB,
          metadata JSONB
        );
      `);

      console.log('Analytics service initialized');
    } catch (error) {
      console.error('Error initializing analytics service:', error);
      throw error;
    }
  }

  /**
   * Create a new analytics report
   * @param reportData Report configuration data
   * @param createdBy ID of the user creating the report
   * @returns ID of the created report
   */
  public async createReport(
    reportData: {
      reportType: string;
      reportName: string;
      reportDescription?: string;
      parameters?: Record<string, any>;
      schedule?: string;
      metadata?: Record<string, any>;
    },
    createdBy: string
  ): Promise<string> {
    try {
      const reportId = crypto.randomUUID();
      const now = new Date();
      
      await this.db.query(
        `INSERT INTO analytics_reports (
          id, report_type, report_name, report_description, parameters,
          created_at, created_by, schedule, status, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          reportId,
          reportData.reportType,
          reportData.reportName,
          reportData.reportDescription || null,
          reportData.parameters ? JSON.stringify(reportData.parameters) : null,
          now,
          createdBy,
          reportData.schedule || null,
          'active',
          reportData.metadata ? JSON.stringify(reportData.metadata) : null
        ]
      );
      
      return reportId;
    } catch (error) {
      console.error('Error creating analytics report:', error);
      throw error;
    }
  }

  /**
   * Run a report and store the results
   * @param reportId ID of the report to run
   * @returns ID of the report result
   */
  public async runReport(reportId: string): Promise<string> {
    try {
      // Get the report configuration
      const reportResult = await this.db.query(
        'SELECT * FROM analytics_reports WHERE id = $1',
        [reportId]
      );
      
      if (reportResult.rows.length === 0) {
        throw new Error(`Report not found: ${reportId}`);
      }
      
      const report = reportResult.rows[0];
      const now = new Date();
      const resultId = crypto.randomUUID();
      
      // Execute the report based on its type
      let reportData;
      try {
        switch (report.report_type) {
          case 'security_audit':
            reportData = await this.generateSecurityAuditReport(
              report.parameters ? JSON.parse(report.parameters) : {}
            );
            break;
            
          case 'user_activity':
            reportData = await this.generateUserActivityReport(
              report.parameters ? JSON.parse(report.parameters) : {}
            );
            break;
            
          case 'compliance':
            reportData = await this.generateComplianceReport(
              report.parameters ? JSON.parse(report.parameters) : {}
            );
            break;
            
          case 'system_health':
            reportData = await this.generateSystemHealthReport(
              report.parameters ? JSON.parse(report.parameters) : {}
            );
            break;
            
          default:
            throw new Error(`Unsupported report type: ${report.report_type}`);
        }
        
        // Store the report result
        await this.db.query(
          `INSERT INTO analytics_report_results (
            id, report_id, result_data, created_at, status
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            resultId,
            reportId,
            JSON.stringify(reportData),
            now,
            'completed'
          ]
        );
        
        // Update the report's last run time
        await this.db.query(
          `UPDATE analytics_reports 
           SET last_run_at = $1, status = $2
           WHERE id = $3`,
          [now, 'active', reportId]
        );
        
        return resultId;
      } catch (error) {
        // Store the error in the report result
        await this.db.query(
          `INSERT INTO analytics_report_results (
            id, report_id, result_data, created_at, status, error_message
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            resultId,
            reportId,
            JSON.stringify({}),
            now,
            'error',
            (error as Error).message
          ]
        );
        
        console.error('Error running report:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in runReport:', error);
      throw error;
    }
  }

  /**
   * Generate a security audit report
   * @param parameters Report parameters
   * @returns Report data
   */
  private async generateSecurityAuditReport(
    parameters: {
      startDate?: string;
      endDate?: string;
      eventTypes?: string[];
    }
  ): Promise<any> {
    try {
      const startDate = parameters.startDate ? new Date(parameters.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
      const endDate = parameters.endDate ? new Date(parameters.endDate) : new Date();
      const eventTypes = parameters.eventTypes || [];
      
      // Build the query
      let query = `
        SELECT 
          ae.event_type, 
          ae.event_action, 
          ae.event_outcome, 
          COUNT(*) as event_count,
          MIN(ae.occurred_at) as first_occurrence,
          MAX(ae.occurred_at) as last_occurrence
        FROM audit_events ae
        WHERE ae.occurred_at BETWEEN $1 AND $2
      `;
      
      const queryParams: any[] = [startDate, endDate];
      
      if (eventTypes.length > 0) {
        query += ` AND ae.event_type = ANY($3)`;
        queryParams.push(eventTypes);
      }
      
      query += `
        GROUP BY ae.event_type, ae.event_action, ae.event_outcome
        ORDER BY event_count DESC
      `;
      
      const eventSummaryResult = await this.db.query(query, queryParams);
      
      // Get failed authentication attempts
      const failedAuthQuery = `
        SELECT 
          aa.agent_id, 
          COUNT(*) as failure_count,
          MIN(ae.occurred_at) as first_attempt,
          MAX(ae.occurred_at) as last_attempt
        FROM audit_events ae
        JOIN audit_agents aa ON ae.id = aa.audit_event_id
        WHERE ae.occurred_at BETWEEN $1 AND $2
        AND ae.event_type = 'authentication'
        AND ae.event_outcome != '0'
        GROUP BY aa.agent_id
        ORDER BY failure_count DESC
        LIMIT 10
      `;
      
      const failedAuthResult = await this.db.query(failedAuthQuery, [startDate, endDate]);
      
      // Get most active users
      const activeUsersQuery = `
        SELECT 
          aa.agent_id, 
          COUNT(*) as action_count
        FROM audit_events ae
        JOIN audit_agents aa ON ae.id = aa.audit_event_id
        WHERE ae.occurred_at BETWEEN $1 AND $2
        AND aa.agent_type = 'user'
        GROUP BY aa.agent_id
        ORDER BY action_count DESC
        LIMIT 10
      `;
      
      const activeUsersResult = await this.db.query(activeUsersQuery, [startDate, endDate]);
      
      // Get most accessed resources
      const accessedResourcesQuery = `
        SELECT 
          aent.entity_type,
          aent.entity_id,
          COUNT(*) as access_count
        FROM audit_events ae
        JOIN audit_entities aent ON ae.id = aent.audit_event_id
        WHERE ae.occurred_at BETWEEN $1 AND $2
        AND ae.event_action = 'R'
        GROUP BY aent.entity_type, aent.entity_id
        ORDER BY access_count DESC
        LIMIT 10
      `;
      
      const accessedResourcesResult = await this.db.query(accessedResourcesQuery, [startDate, endDate]);
      
      // Get emergency access events
      const emergencyAccessQuery = `
        SELECT 
          ae.*,
          aa.agent_id,
          aa.agent_name
        FROM audit_events ae
        JOIN audit_agents aa ON ae.id = aa.audit_event_id
        WHERE ae.occurred_at BETWEEN $1 AND $2
        AND (ae.event_type = 'break-glass' OR ae.event_type = 'emergency-access')
        ORDER BY ae.occurred_at DESC
      `;
      
      const emergencyAccessResult = await this.db.query(emergencyAccessQuery, [startDate, endDate]);
      
      // Compile the report
      return {
        reportType: 'security_audit',
        generatedAt: new Date(),
        period: {
          startDate,
          endDate
        },
        summary: {
          totalEvents: eventSummaryResult.rows.reduce((sum: number, row: any) => sum + parseInt(row.event_count, 10), 0),
          eventsByType: this.groupByField(eventSummaryResult.rows, 'event_type', 'event_count'),
          eventsByOutcome: this.groupByField(eventSummaryResult.rows, 'event_outcome', 'event_count'),
          eventsByAction: this.groupByField(eventSummaryResult.rows, 'event_action', 'event_count')
        },
        failedAuthentications: {
          total: failedAuthResult.rows.reduce((sum: number, row: any) => sum + parseInt(row.failure_count, 10), 0),
          topUsers: failedAuthResult.rows
        },
        userActivity: {
          mostActiveUsers: activeUsersResult.rows
        },
        resourceAccess: {
          mostAccessedResources: accessedResourcesResult.rows
        },
        emergencyAccess: {
          events: emergencyAccessResult.rows,
          count: emergencyAccessResult.rowCount
        }
      };
    } catch (error) {
      console.error('Error generating security audit report:', error);
      throw error;
    }
  }

  /**
   * Generate a user activity report
   * @param parameters Report parameters
   * @returns Report data
   */
  private async generateUserActivityReport(
    parameters: {
      startDate?: string;
      endDate?: string;
      userId?: string;
    }
  ): Promise<any> {
    try {
      const startDate = parameters.startDate ? new Date(parameters.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
      const endDate = parameters.endDate ? new Date(parameters.endDate) : new Date();
      const userId = parameters.userId;
      
      // Build the query
      let query = `
        SELECT 
          ae.id,
          ae.event_type,
          ae.event_action,
          ae.event_outcome,
          ae.occurred_at,
          aa.agent_id,
          aa.agent_name,
          aa.network_address,
          aa.user_agent
        FROM audit_events ae
        JOIN audit_agents aa ON ae.id = aa.audit_event_id
        WHERE ae.occurred_at BETWEEN $1 AND $2
        AND aa.agent_type = 'user'
      `;
      
      const queryParams: any[] = [startDate, endDate];
      
      if (userId) {
        query += ` AND aa.agent_id = $3`;
        queryParams.push(userId);
      }
      
      query += ` ORDER BY ae.occurred_at DESC`;
      
      const userEventsResult = await this.db.query(query, queryParams);
      
      // Get login history
      let loginQuery = `
        SELECT 
          ae.id,
          ae.event_outcome,
          ae.occurred_at,
          aa.agent_id,
          aa.network_address,
          aa.user_agent
        FROM audit_events ae
        JOIN audit_agents aa ON ae.id = aa.audit_event_id
        WHERE ae.occurred_at BETWEEN $1 AND $2
        AND ae.event_type = 'login'
        AND aa.agent_type = 'user'
      `;
      
      const loginQueryParams: any[] = [startDate, endDate];
      
      if (userId) {
        loginQuery += ` AND aa.agent_id = $3`;
        loginQueryParams.push(userId);
      }
      
      loginQuery += ` ORDER BY ae.occurred_at DESC`;
      
      const loginHistoryResult = await this.db.query(loginQuery, loginQueryParams);
      
      // Get resource access history
      let resourceQuery = `
        SELECT 
          ae.id,
          ae.event_action,
          ae.occurred_at,
          aa.agent_id,
          aent.entity_type,
          aent.entity_id,
          aent.entity_name
        FROM audit_events ae
        JOIN audit_agents aa ON ae.id = aa.audit_event_id
        JOIN audit_entities aent ON ae.id = aent.audit_event_id
        WHERE ae.occurred_at BETWEEN $1 AND $2
        AND aa.agent_type = 'user'
      `;
      
      const resourceQueryParams: any[] = [startDate, endDate];
      
      if (userId) {
        resourceQuery += ` AND aa.agent_id = $3`;
        resourceQueryParams.push(userId);
      }
      
      resourceQuery += ` ORDER BY ae.occurred_at DESC`;
      
      const resourceAccessResult = await this.db.query(resourceQuery, resourceQueryParams);
      
      // Compile the report
      return {
        reportType: 'user_activity',
        generatedAt: new Date(),
        period: {
          startDate,
          endDate
        },
        user: userId ? { id: userId } : { id: 'all' },
        summary: {
          totalEvents: userEventsResult.rowCount,
          eventsByType: this.groupByField(userEventsResult.rows, 'event_type'),
          eventsByAction: this.groupByField(userEventsResult.rows, 'event_action'),
          eventsByOutcome: this.groupByField(userEventsResult.rows, 'event_outcome'),
          eventsByDay: this.groupByDate(userEventsResult.rows, 'occurred_at', 'day')
        },
        loginHistory: {
          successful: loginHistoryResult.rows.filter((row: any) => row.event_outcome === '0'),
          failed: loginHistoryResult.rows.filter((row: any) => row.event_outcome !== '0'),
          byIpAddress: this.groupByField(loginHistoryResult.rows, 'network_address')
        },
        resourceAccess: {
          byEntityType: this.groupByField(resourceAccessResult.rows, 'entity_type'),
          byAction: this.groupByField(resourceAccessResult.rows, 'event_action'),
          details: resourceAccessResult.rows
        },
        timeline: userEventsResult.rows
      };
    } catch (error) {
      console.error('Error generating user activity report:', error);
      throw error;
    }
  }

  /**
   * Generate a compliance report
   * @param parameters Report parameters
   * @returns Report data
   */
  private async generateComplianceReport(
    parameters: {
      standard?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<any> {
    try {
      const startDate = parameters.startDate ? new Date(parameters.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
      const endDate = parameters.endDate ? new Date(parameters.endDate) : new Date();
      const standard = parameters.standard || 'hipaa';
      
      // HIPAA compliance checks
      if (standard === 'hipaa') {
        // Check for audit logging compliance
        const auditLoggingQuery = `
          SELECT COUNT(*) as event_count
          FROM audit_events
          WHERE occurred_at BETWEEN $1 AND $2
        `;
        
        const auditLoggingResult = await this.db.query(auditLoggingQuery, [startDate, endDate]);
        const auditLoggingCount = parseInt(auditLoggingResult.rows[0].event_count, 10);
        
        // Check for emergency access events
        const emergencyAccessQuery = `
          SELECT COUNT(*) as event_count
          FROM audit_events
          WHERE occurred_at BETWEEN $1 AND $2
          AND (event_type = 'break-glass' OR event_type = 'emergency-access')
        `;
        
        const emergencyAccessResult = await this.db.query(emergencyAccessQuery, [startDate, endDate]);
        const emergencyAccessCount = parseInt(emergencyAccessResult.rows[0].event_count, 10);
        
        // Check for failed authentication attempts
        const failedAuthQuery = `
          SELECT COUNT(*) as event_count
          FROM audit_events
          WHERE occurred_at BETWEEN $1 AND $2
          AND event_type = 'authentication'
          AND event_outcome != '0'
        `;
        
        const failedAuthResult = await this.db.query(failedAuthQuery, [startDate, endDate]);
        const failedAuthCount = parseInt(failedAuthResult.rows[0].event_count, 10);
        
        // Check for user account management
        const userManagementQuery = `
          SELECT 
            event_action,
            COUNT(*) as event_count
          FROM audit_events
          WHERE occurred_at BETWEEN $1 AND $2
          AND event_type = 'user'
          GROUP BY event_action
        `;
        
        const userManagementResult = await this.db.query(userManagementQuery, [startDate, endDate]);
        
        // Compile the HIPAA compliance report
        return {
          reportType: 'compliance',
          standard: 'HIPAA',
          generatedAt: new Date(),
          period: {
            startDate,
            endDate
          },
          summary: {
            overallCompliance: this.calculateHipaaCompliance({
              auditLoggingCount,
              emergencyAccessCount,
              failedAuthCount,
              userManagementResult: userManagementResult.rows
            })
          },
          sections: {
            accessControls: {
              title: '§164.312(a)(1) Access Control',
              requirements: [
                {
                  id: 'unique_user_identification',
                  description: 'Assign a unique name and/or number for identifying and tracking user identity',
                  status: 'compliant',
                  evidence: 'User authentication system implemented with unique identifiers'
                },
                {
                  id: 'emergency_access',
                  description: 'Establish procedures for obtaining necessary ePHI during an emergency',
                  status: emergencyAccessCount > 0 ? 'attention' : 'compliant',
                  evidence: `${emergencyAccessCount} emergency access events recorded in the audit period`
                },
                {
                  id: 'automatic_logoff',
                  description: 'Implement electronic procedures that terminate an electronic session after a predetermined time of inactivity',
                  status: 'compliant',
                  evidence: 'Session timeout mechanisms implemented'
                },
                {
                  id: 'encryption_decryption',
                  description: 'Implement a mechanism to encrypt and decrypt ePHI',
                  status: 'compliant',
                  evidence: 'Field-level encryption implemented for sensitive data'
                }
              ]
            },
            auditControls: {
              title: '§164.312(b) Audit Controls',
              requirements: [
                {
                  id: 'audit_controls',
                  description: 'Implement hardware, software, and/or procedural mechanisms that record and examine activity in information systems that contain or use ePHI',
                  status: auditLoggingCount > 0 ? 'compliant' : 'non_compliant',
                  evidence: `${auditLoggingCount} audit events recorded in the audit period`
                }
              ]
            },
            integrityControls: {
              title: '§164.312(c)(1) Integrity',
              requirements: [
                {
                  id: 'integrity_controls',
                  description: 'Implement electronic mechanisms to corroborate that ePHI has not been altered or destroyed in an unauthorized manner',
                  status: 'compliant',
                  evidence: 'Data integrity controls implemented'
                }
              ]
            },
            personOrEntityAuthentication: {
              title: '§164.312(d) Person or Entity Authentication',
              requirements: [
                {
                  id: 'authentication',
                  description: 'Implement procedures to verify that a person or entity seeking access to ePHI is the one claimed',
                  status: 'compliant',
                  evidence: 'Multi-factor authentication implemented'
                }
              ]
            },
            transmissionSecurity: {
              title: '§164.312(e)(1) Transmission Security',
              requirements: [
                {
                  id: 'integrity_controls',
                  description: 'Implement security measures to ensure that electronically transmitted ePHI is not improperly modified without detection until disposed of',
                  status: 'compliant',
                  evidence: 'TLS encryption implemented for all data transmissions'
                },
                {
                  id: 'encryption',
                  description: 'Implement a mechanism to encrypt ePHI whenever deemed appropriate',
                  status: 'compliant',
                  evidence: 'End-to-end encryption implemented for sensitive data'
                }
              ]
            }
          },
          recommendations: this.generateHipaaRecommendations({
            auditLoggingCount,
            emergencyAccessCount,
            failedAuthCount
          })
        };
      } else if (standard === 'hitrust') {
        // HITRUST compliance report would be implemented here
        return {
          reportType: 'compliance',
          standard: 'HITRUST',
          generatedAt: new Date(),
          period: {
            startDate,
            endDate
          },
          message: 'HITRUST compliance reporting is not fully implemented yet'
        };
      } else {
        throw new Error(`Unsupported compliance standard: ${standard}`);
      }
    } catch (error) {
      console.error('Error generating compliance report:', error);
      throw error;
    }
  }

  /**
   * Calculate HIPAA compliance score
   * @param data Compliance data
   * @returns Compliance score and status
   */
  private calculateHipaaCompliance(data: any): any {
    // This would be a more sophisticated calculation in a real implementation
    const hasAuditLogs = data.auditLoggingCount > 0;
    const hasHighEmergencyAccess = data.emergencyAccessCount > 5;
    const hasHighFailedAuth = data.failedAuthCount > 100;
    
    let score = 100;
    let status = 'compliant';
    const issues = [];
    
    if (!hasAuditLogs) {
      score -= 40;
      status = 'non_compliant';
      issues.push('No audit logs recorded in the period');
    }
    
    if (hasHighEmergencyAccess) {
      score -= 10;
      status = score < 70 ? 'non_compliant' : 'attention';
      issues.push('High number of emergency access events');
    }
    
    if (hasHighFailedAuth) {
      score -= 10;
      status = score < 70 ? 'non_compliant' : 'attention';
      issues.push('High number of failed authentication attempts');
    }
    
    return {
      score,
      status,
      issues
    };
  }

  /**
   * Generate HIPAA compliance recommendations
   * @param data Compliance data
   * @returns Array of recommendations
   */
  private generateHipaaRecommendations(data: any): any[] {
    const recommendations = [];
    
    if (data.auditLoggingCount === 0) {
      recommendations.push({
        priority: 'critical',
        description: 'Implement comprehensive audit logging for all systems containing ePHI',
        standard: '§164.312(b) Audit Controls'
      });
    }
    
    if (data.emergencyAccessCount > 5) {
      recommendations.push({
        priority: 'high',
        description: 'Review emergency access procedures and usage patterns',
        standard: '§164.312(a)(1) Access Control'
      });
    }
    
    if (data.failedAuthCount > 100) {
      recommendations.push({
        priority: 'high',
        description: 'Review authentication policies and implement additional security controls',
        standard: '§164.312(d) Person or Entity Authentication'
      });
    }
    
    // Add general recommendations
    recommendations.push({
      priority: 'medium',
      description: 'Conduct regular security risk assessments',
      standard: '§164.308(a)(1)(ii)(A) Risk Analysis'
    });
    
    recommendations.push({
      priority: 'medium',
      description: 'Provide regular security awareness training to all staff',
      standard: '§164.308(a)(5) Security Awareness and Training'
    });
    
    return recommendations;
  }

  /**
   * Generate a system health report
   * @param parameters Report parameters
   * @returns Report data
   */
  private async generateSystemHealthReport(
    parameters: {
      startDate?: string;
      endDate?: string;
    }
  ): Promise<any> {
    try {
      const startDate = parameters.startDate ? new Date(parameters.startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default to last 7 days
      const endDate = parameters.endDate ? new Date(parameters.endDate) : new Date();
      
      // Get database statistics
      const dbStatsQuery = `
        SELECT
          (SELECT COUNT(*) FROM users) as user_count,
          (SELECT COUNT(*) FROM audit_events WHERE occurred_at BETWEEN $1 AND $2) as audit_event_count,
          (SELECT COUNT(*) FROM notifications WHERE created_at BETWEEN $1 AND $2) as notification_count,
          (SELECT COUNT(*) FROM refresh_tokens WHERE created_at BETWEEN $1 AND $2) as token_count
      `;
      
      const dbStatsResult = await this.db.query(dbStatsQuery, [startDate, endDate]);
      
      // Get system errors
      const errorsQuery = `
        SELECT 
          event_type,
          event_outcome_desc,
          occurred_at
        FROM audit_events
        WHERE occurred_at BETWEEN $1 AND $2
        AND event_outcome = $3
        ORDER BY occurred_at DESC
      `;
      
      const errorsResult = await this.db.query(errorsQuery, [startDate, endDate, AuditEventOutcome.MAJOR_FAILURE]);
      
      // Get authentication statistics
      const authStatsQuery = `
        SELECT
          event_outcome,
          COUNT(*) as count
        FROM audit_events
        WHERE occurred_at BETWEEN $1 AND $2
        AND event_type = 'authentication'
        GROUP BY event_outcome
      `;
      
      const authStatsResult = await this.db.query(authStatsQuery, [startDate, endDate]);
      
      // Get API usage statistics
      const apiUsageQuery = `
        SELECT
          entity_id as endpoint,
          COUNT(*) as request_count
        FROM audit_events ae
        JOIN audit_entities aent ON ae.id = aent.audit_event_id
        WHERE ae.occurred_at BETWEEN $1 AND $2
        AND aent.entity_type = 'api'
        GROUP BY entity_id
        ORDER BY request_count DESC
        LIMIT 10
      `;
      
      const apiUsageResult = await this.db.query(apiUsageQuery, [startDate, endDate]);
      
      // Compile the report
      return {
        reportType: 'system_health',
        generatedAt: new Date(),
        period: {
          startDate,
          endDate
        },
        summary: {
          userCount: parseInt(dbStatsResult.rows[0].user_count, 10),
          auditEventCount: parseInt(dbStatsResult.rows[0].audit_event_count, 10),
          notificationCount: parseInt(dbStatsResult.rows[0].notification_count, 10),
          tokenCount: parseInt(dbStatsResult.rows[0].token_count, 10)
        },
        errors: {
          count: errorsResult.rowCount,
          details: errorsResult.rows
        },
        authentication: {
          successful: this.findCountByOutcome(authStatsResult.rows, AuditEventOutcome.SUCCESS),
          failed: this.findCountByOutcome(authStatsResult.rows, AuditEventOutcome.MAJOR_FAILURE) +
                 this.findCountByOutcome(authStatsResult.rows, AuditEventOutcome.SERIOUS_FAILURE) +
                 this.findCountByOutcome(authStatsResult.rows, AuditEventOutcome.MINOR_FAILURE),
          successRate: this.calculateSuccessRate(authStatsResult.rows)
        },
        apiUsage: {
          topEndpoints: apiUsageResult.rows
        }
      };
    } catch (error) {
      console.error('Error generating system health report:', error);
      throw error;
    }
  }

  /**
   * Find count by outcome in authentication statistics
   * @param rows Authentication statistics rows
   * @param outcome Outcome to find
   * @returns Count for the outcome
   */
  private findCountByOutcome(rows: any[], outcome: string): number {
    const row = rows.find(r => r.event_outcome === outcome);
    return row ? parseInt(row.count, 10) : 0;
  }

  /**
   * Calculate authentication success rate
   * @param rows Authentication statistics rows
   * @returns Success rate as a percentage
   */
  private calculateSuccessRate(rows: any[]): number {
    const successful = this.findCountByOutcome(rows, AuditEventOutcome.SUCCESS);
    const total = rows.reduce((sum, row) => sum + parseInt(row.count, 10), 0);
    
    if (total === 0) {
      return 100;
    }
    
    return Math.round((successful / total) * 100);
  }

  /**
   * Group data by a field
   * @param data Array of data objects
   * @param field Field to group by
   * @param countField Optional field to sum for counts
   * @returns Grouped data
   */
  private groupByField(data: any[], field: string, countField?: string): Record<string, number> {
    return data.reduce((groups: Record<string, number>, item: any) => {
      const key = item[field];
      if (!key) return groups;
      
      if (!groups[key]) {
        groups[key] = countField ? parseInt(item[countField], 10) : 1;
      } else {
        groups[key] += countField ? parseInt(item[countField], 10) : 1;
      }
      
      return groups;
    }, {});
  }

  /**
   * Group data by date
   * @param data Array of data objects
   * @param dateField Field containing the date
   * @param interval Grouping interval (day, week, month)
   * @returns Grouped data
   */
  private groupByDate(data: any[], dateField: string, interval: 'day' | 'week' | 'month'): Record<string, number> {
    return data.reduce((groups: Record<string, number>, item: any) => {
      const date = new Date(item[dateField]);
      let key: string;
      
      switch (interval) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }
      
      if (!groups[key]) {
        groups[key] = 1;
      } else {
        groups[key] += 1;
      }
      
      return groups;
    }, {});
  }

  /**
   * Create a dashboard
   * @param dashboardData Dashboard configuration
   * @param createdBy ID of the user creating the dashboard
   * @returns ID of the created dashboard
   */
  public async createDashboard(
    dashboardData: {
      dashboardName: string;
      dashboardDescription?: string;
      layout: any;
      isPublic?: boolean;
      metadata?: Record<string, any>;
    },
    createdBy: string
  ): Promise<string> {
    try {
      const dashboardId = crypto.randomUUID();
      const now = new Date();
      
      await this.db.query(
        `INSERT INTO analytics_dashboards (
          id, dashboard_name, dashboard_description, layout,
          created_at, updated_at, created_by, updated_by,
          is_public, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          dashboardId,
          dashboardData.dashboardName,
          dashboardData.dashboardDescription || null,
          JSON.stringify(dashboardData.layout),
          now,
          now,
          createdBy,
          createdBy,
          dashboardData.isPublic || false,
          dashboardData.metadata ? JSON.stringify(dashboardData.metadata) : null
        ]
      );
      
      return dashboardId;
    } catch (error) {
      console.error('Error creating dashboard:', error);
      throw error;
    }
  }

  /**
   * Add a widget to a dashboard
   * @param dashboardId Dashboard ID
   * @param widgetData Widget configuration
   * @param updatedBy ID of the user adding the widget
   * @returns ID of the created widget
   */
  public async addWidget(
    dashboardId: string,
    widgetData: {
      widgetType: string;
      widgetName: string;
      widgetDescription?: string;
      dataSource: string;
      query: any;
      visualizationConfig: any;
      position: any;
      refreshInterval?: number;
      metadata?: Record<string, any>;
    },
    updatedBy: string
  ): Promise<string> {
    try {
      const widgetId = crypto.randomUUID();
      const now = new Date();
      
      await this.db.query(
        `INSERT INTO analytics_widgets (
          id, dashboard_id, widget_type, widget_name, widget_description,
          data_source, query, visualization_config, position,
          created_at, updated_at, refresh_interval, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          widgetId,
          dashboardId,
          widgetData.widgetType,
          widgetData.widgetName,
          widgetData.widgetDescription || null,
          widgetData.dataSource,
          JSON.stringify(widgetData.query),
          JSON.stringify(widgetData.visualizationConfig),
          JSON.stringify(widgetData.position),
          now,
          now,
          widgetData.refreshInterval || null,
          widgetData.metadata ? JSON.stringify(widgetData.metadata) : null
        ]
      );
      
      // Update the dashboard's updated_at and updated_by
      await this.db.query(
        `UPDATE analytics_dashboards 
         SET updated_at = $1, updated_by = $2
         WHERE id = $3`,
        [now, updatedBy, dashboardId]
      );
      
      return widgetId;
    } catch (error) {
      console.error('Error adding widget to dashboard:', error);
      throw error;
    }
  }

  /**
   * Get a dashboard with its widgets
   * @param dashboardId Dashboard ID
   * @returns Dashboard with widgets
   */
  public async getDashboard(dashboardId: string): Promise<any> {
    try {
      // Get the dashboard
      const dashboardResult = await this.db.query(
        'SELECT * FROM analytics_dashboards WHERE id = $1',
        [dashboardId]
      );
      
      if (dashboardResult.rows.length === 0) {
        throw new Error(`Dashboard not found: ${dashboardId}`);
      }
      
      const dashboard = dashboardResult.rows[0];
      
      // Get the widgets
      const widgetsResult = await this.db.query(
        'SELECT * FROM analytics_widgets WHERE dashboard_id = $1',
        [dashboardId]
      );
      
      // Format the response
      return {
        id: dashboard.id,
        name: dashboard.dashboard_name,
        description: dashboard.dashboard_description,
        layout: JSON.parse(dashboard.layout),
        isPublic: dashboard.is_public,
        createdAt: dashboard.created_at,
        updatedAt: dashboard.updated_at,
        createdBy: dashboard.created_by,
        updatedBy: dashboard.updated_by,
        metadata: dashboard.metadata ? JSON.parse(dashboard.metadata) : undefined,
        widgets: widgetsResult.rows.map((widget: any) => ({
          id: widget.id,
          type: widget.widget_type,
          name: widget.widget_name,
          description: widget.widget_description,
          dataSource: widget.data_source,
          query: JSON.parse(widget.query),
          visualizationConfig: JSON.parse(widget.visualization_config),
          position: JSON.parse(widget.position),
          refreshInterval: widget.refresh_interval,
          metadata: widget.metadata ? JSON.parse(widget.metadata) : undefined
        }))
      };
    } catch (error) {
      console.error('Error getting dashboard:', error);
      throw error;
    }
  }

  /**
   * Define a metric
   * @param metricData Metric configuration
   * @returns ID of the created metric
   */
  public async defineMetric(
    metricData: {
      metricName: string;
      metricDescription?: string;
      metricType: string;
      dataSource: string;
      aggregationMethod: string;
      calculationQuery: string;
      metadata?: Record<string, any>;
    }
  ): Promise<string> {
    try {
      const metricId = crypto.randomUUID();
      const now = new Date();
      
      await this.db.query(
        `INSERT INTO analytics_metrics (
          id, metric_name, metric_description, metric_type,
          data_source, aggregation_method, calculation_query,
          created_at, updated_at, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          metricId,
          metricData.metricName,
          metricData.metricDescription || null,
          metricData.metricType,
          metricData.dataSource,
          metricData.aggregationMethod,
          metricData.calculationQuery,
          now,
          now,
          metricData.metadata ? JSON.stringify(metricData.metadata) : null
        ]
      );
      
      return metricId;
    } catch (error) {
      console.error('Error defining metric:', error);
      throw error;
    }
  }

  /**
   * Calculate and store a metric value
   * @param metricId Metric ID
   * @param dimensions Optional dimensions for the metric
   * @returns Calculated metric value
   */
  public async calculateMetric(
    metricId: string,
    dimensions?: Record<string, any>
  ): Promise<number> {
    try {
      // Get the metric definition
      const metricResult = await this.db.query(
        'SELECT * FROM analytics_metrics WHERE id = $1',
        [metricId]
      );
      
      if (metricResult.rows.length === 0) {
        throw new Error(`Metric not found: ${metricId}`);
      }
      
      const metric = metricResult.rows[0];
      
      // Execute the calculation query
      const calculationResult = await this.db.query(metric.calculation_query);
      
      if (calculationResult.rows.length === 0) {
        throw new Error('Calculation query returned no results');
      }
      
      // Extract the value from the result
      const value = parseFloat(Object.values(calculationResult.rows[0])[0] as string);
      
      if (isNaN(value)) {
        throw new Error('Calculation result is not a number');
      }
      
      // Store the metric value
      const now = new Date();
      const valueId = crypto.randomUUID();
      
      await this.db.query(
        `INSERT INTO analytics_metric_values (
          id, metric_id, timestamp, value, dimensions
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          valueId,
          metricId,
          now,
          value,
          dimensions ? JSON.stringify(dimensions) : null
        ]
      );
      
      return value;
    } catch (error) {
      console.error('Error calculating metric:', error);
      throw error;
    }
  }

  /**
   * Get metric values
   * @param metricId Metric ID
   * @param startDate Start date for the query
   * @param endDate End date for the query
   * @param dimensions Optional dimensions to filter by
   * @returns Array of metric values
   */
  public async getMetricValues(
    metricId: string,
    startDate: Date,
    endDate: Date,
    dimensions?: Record<string, any>
  ): Promise<any[]> {
    try {
      let query = `
        SELECT * FROM analytics_metric_values
        WHERE metric_id = $1
        AND timestamp BETWEEN $2 AND $3
      `;
      
      const queryParams: any[] = [metricId, startDate, endDate];
      
      if (dimensions) {
        // This is a simplified approach; in a real implementation,
        // you would need more sophisticated JSONB querying
        query += ` AND dimensions @> $4`;
        queryParams.push(JSON.stringify(dimensions));
      }
      
      query += ` ORDER BY timestamp ASC`;
      
      const result = await this.db.query(query, queryParams);
      
      return result.rows.map((row: any) => ({
        id: row.id,
        metricId: row.metric_id,
        timestamp: row.timestamp,
        value: parseFloat(row.value),
        dimensions: row.dimensions ? JSON.parse(row.dimensions) : undefined
      }));
    } catch (error) {
      console.error('Error getting metric values:', error);
      throw error;
    }
  }
}
