import crypto from 'crypto';
import { DatabaseService } from '../lib/DatabaseService';
import { AuditLogService, AuditEventType, AuditEventAction, AuditEventOutcome, AuditAgentType, AuditEntityType } from './AuditLogService';
import * as OTPAuth from 'otpauth';

/**
 * MFA Service for the HMS System Infrastructure & Security module
 * Provides multi-factor authentication capabilities
 */
export class MfaService {
  private static instance: MfaService;
  private db: DatabaseService;
  private auditLog: AuditLogService;
  private issuer: string;

  private constructor() {
    this.db = DatabaseService.getInstance();
    this.auditLog = AuditLogService.getInstance();
    this.issuer = process.env.MFA_ISSUER || 'HMS';
  }

  /**
   * Get singleton instance of MfaService
   * @returns MfaService instance
   */
  public static getInstance(): MfaService {
    if (!MfaService.instance) {
      MfaService.instance = new MfaService();
    }
    return MfaService.instance;
  }

  /**
   * Initialize the MFA service
   * Creates necessary tables if they don't exist
   */
  public async initialize(): Promise<void> {
    try {
      // Create mfa_secrets table if it doesn't exist
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS mfa_secrets (
          id UUID PRIMARY KEY,
          user_id UUID NOT NULL UNIQUE,
          secret VARCHAR(255) NOT NULL,
          backup_codes JSONB,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP NOT NULL,
          verified BOOLEAN DEFAULT FALSE,
          last_used_at TIMESTAMP
        );
      `);

      console.log('MFA service initialized');
    } catch (error) {
      console.error('Error initializing MFA service:', error);
      throw error;
    }
  }

  /**
   * Generate a new MFA secret for a user
   * @param userId User ID
   * @param username Username for TOTP label
   * @returns MFA setup information
   */
  public async generateMfaSecret(userId: string, username: string): Promise<{
    secret: string;
    uri: string;
    qrCodeUrl: string;
    backupCodes: string[];
  }> {
    try {
      // Generate a random secret
      const secret = this.generateSecret();
      
      // Generate backup codes
      const backupCodes = this.generateBackupCodes();
      
      // Create TOTP object
      const totp = new OTPAuth.TOTP({
        issuer: this.issuer,
        label: username,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret)
      });
      
      // Generate URI for QR code
      const uri = totp.toString();
      
      // Generate QR code URL (in a real implementation, this would generate an actual QR code)
      const qrCodeUrl = `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(uri)}`;
      
      // Store the secret in the database
      const id = crypto.randomUUID();
      const now = new Date();
      
      await this.db.query(
        `INSERT INTO mfa_secrets (
          id, user_id, secret, backup_codes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          secret = $3, 
          backup_codes = $4, 
          updated_at = $6,
          verified = FALSE`,
        [
          id,
          userId,
          secret,
          JSON.stringify(backupCodes),
          now,
          now
        ]
      );
      
      // Log the MFA setup
      await this.auditLog.logEvent({
        eventType: AuditEventType.AUTHENTICATION,
        eventAction: AuditEventAction.CREATE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'MFA setup initiated',
        occurredAt: now,
        agents: [
          {
            agentType: AuditAgentType.USER,
            agentId: userId
          }
        ],
        entities: [
          {
            entityType: AuditEntityType.PERSON,
            entityId: userId,
            entityDetail: {
              action: 'mfa_setup'
            }
          }
        ]
      });
      
      return {
        secret,
        uri,
        qrCodeUrl,
        backupCodes
      };
    } catch (error) {
      console.error('Error generating MFA secret:', error);
      throw error;
    }
  }

  /**
   * Verify a TOTP code for a user
   * @param userId User ID
   * @param code TOTP code or backup code
   * @returns Whether the code is valid
   */
  public async verifyMfaCode(userId: string, code: string): Promise<boolean> {
    try {
      // Get the user's MFA secret
      const result = await this.db.query(
        'SELECT secret, backup_codes, verified FROM mfa_secrets WHERE user_id = $1',
        [userId]
      );
      
      if (result.rows.length === 0) {
        return false;
      }
      
      const { secret, backup_codes: backupCodesJson, verified } = result.rows[0];
      const backupCodes = JSON.parse(backupCodesJson);
      
      // Check if it's a backup code
      const backupCodeIndex = backupCodes.indexOf(code);
      if (backupCodeIndex !== -1) {
        // Remove the used backup code
        backupCodes.splice(backupCodeIndex, 1);
        
        // Update the backup codes in the database
        const now = new Date();
        await this.db.query(
          `UPDATE mfa_secrets 
           SET backup_codes = $1, last_used_at = $2, verified = TRUE
           WHERE user_id = $3`,
          [JSON.stringify(backupCodes), now, userId]
        );
        
        // Log the backup code usage
        await this.auditLog.logEvent({
          eventType: AuditEventType.AUTHENTICATION,
          eventAction: AuditEventAction.EXECUTE,
          eventOutcome: AuditEventOutcome.SUCCESS,
          eventOutcomeDesc: 'MFA backup code used',
          occurredAt: now,
          agents: [
            {
              agentType: AuditAgentType.USER,
              agentId: userId
            }
          ],
          entities: [
            {
              entityType: AuditEntityType.PERSON,
              entityId: userId,
              entityDetail: {
                action: 'mfa_backup_code'
              }
            }
          ]
        });
        
        return true;
      }
      
      // Verify TOTP code
      const totp = new OTPAuth.TOTP({
        issuer: this.issuer,
        label: 'user',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret)
      });
      
      const delta = totp.validate({ token: code, window: 1 });
      
      if (delta === null) {
        // Log failed verification
        await this.auditLog.logEvent({
          eventType: AuditEventType.AUTHENTICATION,
          eventAction: AuditEventAction.EXECUTE,
          eventOutcome: AuditEventOutcome.MINOR_FAILURE,
          eventOutcomeDesc: 'MFA code verification failed',
          occurredAt: new Date(),
          agents: [
            {
              agentType: AuditAgentType.USER,
              agentId: userId
            }
          ],
          entities: [
            {
              entityType: AuditEntityType.PERSON,
              entityId: userId,
              entityDetail: {
                action: 'mfa_verify'
              }
            }
          ]
        });
        
        return false;
      }
      
      // Update the last used time and set verified to true if not already
      const now = new Date();
      await this.db.query(
        `UPDATE mfa_secrets 
         SET last_used_at = $1, verified = TRUE
         WHERE user_id = $2`,
        [now, userId]
      );
      
      // Log successful verification
      await this.auditLog.logEvent({
        eventType: AuditEventType.AUTHENTICATION,
        eventAction: AuditEventAction.EXECUTE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: verified ? 'MFA code verified' : 'MFA setup completed',
        occurredAt: now,
        agents: [
          {
            agentType: AuditAgentType.USER,
            agentId: userId
          }
        ],
        entities: [
          {
            entityType: AuditEntityType.PERSON,
            entityId: userId,
            entityDetail: {
              action: verified ? 'mfa_verify' : 'mfa_setup_complete'
            }
          }
        ]
      });
      
      return true;
    } catch (error) {
      console.error('Error verifying MFA code:', error);
      throw error;
    }
  }

  /**
   * Disable MFA for a user
   * @param userId User ID
   * @returns Whether MFA was successfully disabled
   */
  public async disableMfa(userId: string): Promise<boolean> {
    try {
      // Delete the MFA secret
      const result = await this.db.query(
        'DELETE FROM mfa_secrets WHERE user_id = $1 RETURNING id',
        [userId]
      );
      
      if (result.rows.length === 0) {
        return false;
      }
      
      // Log MFA disabling
      await this.auditLog.logEvent({
        eventType: AuditEventType.AUTHENTICATION,
        eventAction: AuditEventAction.DELETE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'MFA disabled',
        occurredAt: new Date(),
        agents: [
          {
            agentType: AuditAgentType.USER,
            agentId: userId
          }
        ],
        entities: [
          {
            entityType: AuditEntityType.PERSON,
            entityId: userId,
            entityDetail: {
              action: 'mfa_disable'
            }
          }
        ]
      });
      
      return true;
    } catch (error) {
      console.error('Error disabling MFA:', error);
      throw error;
    }
  }

  /**
   * Check if a user has MFA enabled and verified
   * @param userId User ID
   * @returns Whether MFA is enabled and verified
   */
  public async isMfaEnabled(userId: string): Promise<boolean> {
    try {
      const result = await this.db.query(
        'SELECT verified FROM mfa_secrets WHERE user_id = $1',
        [userId]
      );
      
      return result.rows.length > 0 && result.rows[0].verified;
    } catch (error) {
      console.error('Error checking MFA status:', error);
      throw error;
    }
  }

  /**
   * Generate a new set of backup codes for a user
   * @param userId User ID
   * @returns New backup codes
   */
  public async regenerateBackupCodes(userId: string): Promise<string[]> {
    try {
      // Generate new backup codes
      const backupCodes = this.generateBackupCodes();
      
      // Update the backup codes in the database
      const now = new Date();
      const result = await this.db.query(
        `UPDATE mfa_secrets 
         SET backup_codes = $1, updated_at = $2
         WHERE user_id = $3
         RETURNING id`,
        [JSON.stringify(backupCodes), now, userId]
      );
      
      if (result.rows.length === 0) {
        throw new Error('User does not have MFA enabled');
      }
      
      // Log backup codes regeneration
      await this.auditLog.logEvent({
        eventType: AuditEventType.AUTHENTICATION,
        eventAction: AuditEventAction.UPDATE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'MFA backup codes regenerated',
        occurredAt: now,
        agents: [
          {
            agentType: AuditAgentType.USER,
            agentId: userId
          }
        ],
        entities: [
          {
            entityType: AuditEntityType.PERSON,
            entityId: userId,
            entityDetail: {
              action: 'mfa_backup_regenerate'
            }
          }
        ]
      });
      
      return backupCodes;
    } catch (error) {
      console.error('Error regenerating backup codes:', error);
      throw error;
    }
  }

  /**
   * Generate a random secret for TOTP
   * @returns Base32 encoded secret
   */
  private generateSecret(): string {
    const buffer = crypto.randomBytes(20);
    return this.base32Encode(buffer);
  }

  /**
   * Generate backup codes
   * @param count Number of backup codes to generate
   * @returns Array of backup codes
   */
  private generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      // Generate a 8-character alphanumeric code
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Base32 encode a buffer
   * @param buffer Buffer to encode
   * @returns Base32 encoded string
   */
  private base32Encode(buffer: Buffer): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    let bits = 0;
    let value = 0;
    
    for (let i = 0; i < buffer.length; i++) {
      value = (value << 8) | buffer[i];
      bits += 8;
      
      while (bits >= 5) {
        result += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    
    if (bits > 0) {
      result += alphabet[(value << (5 - bits)) & 31];
    }
    
    return result;
  }
}
