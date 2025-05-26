import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticationService } from '../services/AuthenticationService';
import { MfaService } from '../services/MfaService';
import { AuditLogService, AuditEventType, AuditEventAction, AuditEventOutcome } from '../services/AuditLogService';
import { SessionManager } from '../middleware/SessionManager';
import { InputValidator } from '../middleware/InputValidator';
import Joi from 'joi';
import crypto from 'crypto';
import { DatabaseService } from '../lib/DatabaseService';

/**
 * Authentication Controller for the HMS System Infrastructure & Security module
 * Provides comprehensive authentication and authorization endpoints
 */
export class AuthController {
  private router: Router;
  private authService: AuthenticationService;
  private mfaService: MfaService;
  private auditLog: AuditLogService;
  private validator: InputValidator;
  private db: DatabaseService;

  constructor() {
    this.router = Router();
    this.authService = new AuthenticationService();
    this.mfaService = MfaService.getInstance();
    this.auditLog = AuditLogService.getInstance();
    this.validator = InputValidator.getInstance();
    this.db = DatabaseService.getInstance();
    
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Authentication routes
    this.router.post('/login', 
      this.validator.validateBody(this.loginSchema()),
      this.login
    );
    
    this.router.post('/logout', 
      SessionManager.authenticate,
      this.logout
    );
    
    this.router.post('/refresh-token', 
      this.validator.validateBody(this.refreshTokenSchema()),
      this.refreshToken
    );
    
    this.router.post('/register', 
      this.validator.validateBody(this.registerSchema()),
      this.register
    );
    
    // Password management routes
    this.router.post('/forgot-password', 
      this.validator.validateBody(this.forgotPasswordSchema()),
      this.forgotPassword
    );
    
    this.router.post('/reset-password', 
      this.validator.validateBody(this.resetPasswordSchema()),
      this.resetPassword
    );
    
    this.router.post('/change-password', 
      SessionManager.authenticate,
      this.validator.validateBody(this.changePasswordSchema()),
      this.changePassword
    );
    
    // MFA routes
    this.router.post('/mfa/enable', 
      SessionManager.authenticate,
      this.enableMfa
    );
    
    this.router.post('/mfa/verify', 
      SessionManager.authenticate,
      this.validator.validateBody(this.mfaVerifySchema()),
      this.verifyMfa
    );
    
    this.router.post('/mfa/disable', 
      SessionManager.authenticate,
      this.validator.validateBody(this.mfaDisableSchema()),
      this.disableMfa
    );
    
    this.router.post('/mfa/regenerate-backup-codes', 
      SessionManager.authenticate,
      this.regenerateBackupCodes
    );
    
    // User activity routes
    this.router.get('/login-history', 
      SessionManager.authenticate,
      this.getLoginHistory
    );
    
    this.router.get('/activity', 
      SessionManager.authenticate,
      this.getUserActivity
    );
  }

  getRouter(): Router {
    return this.router;
  }

  /**
   * Login schema validation
   */
  private loginSchema(): Joi.Schema {
    return Joi.object({
      username: Joi.string().required(),
      password: Joi.string().required(),
      mfaCode: Joi.string().optional()
    });
  }

  /**
   * Refresh token schema validation
   */
  private refreshTokenSchema(): Joi.Schema {
    return Joi.object({
      refreshToken: Joi.string().required(),
      userId: Joi.string().required()
    });
  }

  /**
   * Register schema validation
   */
  private registerSchema(): Joi.Schema {
    return Joi.object({
      username: Joi.string().required().min(3).max(50),
      email: Joi.string().required().email(),
      password: Joi.string().required().min(8).pattern(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
      ).message('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      phoneNumber: Joi.string().optional()
    });
  }

  /**
   * Forgot password schema validation
   */
  private forgotPasswordSchema(): Joi.Schema {
    return Joi.object({
      email: Joi.string().required().email()
    });
  }

  /**
   * Reset password schema validation
   */
  private resetPasswordSchema(): Joi.Schema {
    return Joi.object({
      token: Joi.string().required(),
      password: Joi.string().required().min(8).pattern(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
      ).message('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
      confirmPassword: Joi.string().required().valid(Joi.ref('password')).messages({
        'any.only': 'Passwords must match'
      })
    });
  }

  /**
   * Change password schema validation
   */
  private changePasswordSchema(): Joi.Schema {
    return Joi.object({
      currentPassword: Joi.string().required(),
      newPassword: Joi.string().required().min(8).pattern(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
      ).message('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
      confirmPassword: Joi.string().required().valid(Joi.ref('newPassword')).messages({
        'any.only': 'Passwords must match'
      })
    });
  }

  /**
   * MFA verify schema validation
   */
  private mfaVerifySchema(): Joi.Schema {
    return Joi.object({
      code: Joi.string().required().length(6).pattern(/^\d+$/).message('MFA code must be 6 digits')
    });
  }

  /**
   * MFA disable schema validation
   */
  private mfaDisableSchema(): Joi.Schema {
    return Joi.object({
      code: Joi.string().required().length(6).pattern(/^\d+$/).message('MFA code must be 6 digits')
    });
  }

  /**
   * Login user and generate tokens
   */
  private login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, password, mfaCode } = req.body;
      
      // Find user in database
      const userResult = await this.db.query(
        'SELECT * FROM users WHERE username = $1',
        [username]
      );
      
      if (userResult.rows.length === 0) {
        // Log failed login attempt
        await this.auditLog.logEvent({
          eventType: AuditEventType.AUTHENTICATION,
          eventAction: AuditEventAction.EXECUTE,
          eventOutcome: AuditEventOutcome.MINOR_FAILURE,
          eventOutcomeDesc: 'Invalid username',
          occurredAt: new Date(),
          agents: [
            {
              agentType: 'user',
              agentName: username,
              networkAddress: req.ip,
              userAgent: req.headers['user-agent'] as string
            }
          ],
          entities: [
            {
              entityType: 'user',
              entityId: 'unknown',
              entityDetail: {
                action: 'login',
                username
              }
            }
          ]
        });
        
        res.status(401).json({ 
          success: false,
          message: 'Invalid credentials' 
        });
        return;
      }
      
      const user = userResult.rows[0];
      
      // Verify password
      const isPasswordValid = await this.authService.verifyPassword(password, user.password);
      
      if (!isPasswordValid) {
        // Log failed login attempt
        await this.auditLog.logEvent({
          eventType: AuditEventType.AUTHENTICATION,
          eventAction: AuditEventAction.EXECUTE,
          eventOutcome: AuditEventOutcome.MINOR_FAILURE,
          eventOutcomeDesc: 'Invalid password',
          occurredAt: new Date(),
          agents: [
            {
              agentType: 'user',
              agentId: user.id,
              agentName: user.username,
              networkAddress: req.ip,
              userAgent: req.headers['user-agent'] as string
            }
          ],
          entities: [
            {
              entityType: 'user',
              entityId: user.id,
              entityDetail: {
                action: 'login'
              }
            }
          ]
        });
        
        res.status(401).json({ 
          success: false,
          message: 'Invalid credentials' 
        });
        return;
      }
      
      // Check if user is active
      if (user.status !== 'active') {
        // Log failed login attempt
        await this.auditLog.logEvent({
          eventType: AuditEventType.AUTHENTICATION,
          eventAction: AuditEventAction.EXECUTE,
          eventOutcome: AuditEventOutcome.MINOR_FAILURE,
          eventOutcomeDesc: `Account is ${user.status}`,
          occurredAt: new Date(),
          agents: [
            {
              agentType: 'user',
              agentId: user.id,
              agentName: user.username,
              networkAddress: req.ip,
              userAgent: req.headers['user-agent'] as string
            }
          ],
          entities: [
            {
              entityType: 'user',
              entityId: user.id,
              entityDetail: {
                action: 'login',
                status: user.status
              }
            }
          ]
        });
        
        res.status(403).json({ 
          success: false,
          message: `Account is ${user.status}` 
        });
        return;
      }
      
      // Check if MFA is enabled
      const mfaEnabled = await this.mfaService.isMfaEnabled(user.id);
      
      if (mfaEnabled && !mfaCode) {
        // MFA is required
        res.status(200).json({
          success: true,
          requireMfa: true,
          userId: user.id,
          message: 'MFA code required'
        });
        return;
      }
      
      if (mfaEnabled) {
        // Verify MFA code
        const isMfaValid = await this.mfaService.verifyMfaCode(user.id, mfaCode);
        
        if (!isMfaValid) {
          // Log failed MFA verification
          await this.auditLog.logEvent({
            eventType: AuditEventType.AUTHENTICATION,
            eventAction: AuditEventAction.EXECUTE,
            eventOutcome: AuditEventOutcome.MINOR_FAILURE,
            eventOutcomeDesc: 'Invalid MFA code',
            occurredAt: new Date(),
            agents: [
              {
                agentType: 'user',
                agentId: user.id,
                agentName: user.username,
                networkAddress: req.ip,
                userAgent: req.headers['user-agent'] as string
              }
            ],
            entities: [
              {
                entityType: 'user',
                entityId: user.id,
                entityDetail: {
                  action: 'mfa_verify'
                }
              }
            ]
          });
          
          res.status(401).json({ 
            success: false,
            message: 'Invalid MFA code' 
          });
          return;
        }
      }
      
      // Generate tokens
      const tokens = this.authService.generateTokens(user);
      
      // Update last login
      await this.db.query(
        'UPDATE users SET last_login = $1 WHERE id = $2',
        [new Date(), user.id]
      );
      
      // Log successful login
      await this.auditLog.logEvent({
        eventType: AuditEventType.AUTHENTICATION,
        eventAction: AuditEventAction.EXECUTE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'Login successful',
        occurredAt: new Date(),
        agents: [
          {
            agentType: 'user',
            agentId: user.id,
            agentName: user.username,
            networkAddress: req.ip,
            userAgent: req.headers['user-agent'] as string
          }
        ],
        entities: [
          {
            entityType: 'user',
            entityId: user.id,
            entityDetail: {
              action: 'login'
            }
          }
        ]
      });
      
      res.status(200).json({
        success: true,
        user: this.authService.prepareUserResponse(user),
        ...tokens
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Login failed', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Logout user
   */
  private logout = async (req: Request, res: Response): Promise<void> => {
    try {
      // In a real implementation, we would invalidate the token
      // For now, we just log the logout
      
      await this.auditLog.logEvent({
        eventType: AuditEventType.AUTHENTICATION,
        eventAction: AuditEventAction.EXECUTE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'Logout successful',
        occurredAt: new Date(),
        agents: [
          {
            agentType: 'user',
            agentId: req.user!.id,
            agentName: req.user!.username,
            networkAddress: req.ip,
            userAgent: req.headers['user-agent'] as string
          }
        ],
        entities: [
          {
            entityType: 'user',
            entityId: req.user!.id,
            entityDetail: {
              action: 'logout'
            }
          }
        ]
      });
      
      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Logout failed', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Refresh access token using refresh token
   */
  private refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken, userId } = req.body;
      
      // Find user in database
      const userResult = await this.db.query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );
      
      if (userResult.rows.length === 0) {
        res.status(404).json({ 
          success: false,
          message: 'User not found' 
        });
        return;
      }
      
      const user = userResult.rows[0];
      
      // Generate new tokens
      const tokens = this.authService.refreshTokens(refreshToken, user);
      
      if (!tokens) {
        res.status(401).json({ 
          success: false,
          message: 'Invalid or expired refresh token' 
        });
        return;
      }
      
      // Log token refresh
      await this.auditLog.logEvent({
        eventType: AuditEventType.AUTHENTICATION,
        eventAction: AuditEventAction.EXECUTE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'Token refresh successful',
        occurredAt: new Date(),
        agents: [
          {
            agentType: 'user',
            agentId: user.id,
            agentName: user.username,
            networkAddress: req.ip,
            userAgent: req.headers['user-agent'] as string
          }
        ],
        entities: [
          {
            entityType: 'user',
            entityId: user.id,
            entityDetail: {
              action: 'token_refresh'
            }
          }
        ]
      });
      
      res.status(200).json({
        success: true,
        ...tokens
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Token refresh failed', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Register a new user
   */
  private register = async (req: Request, res: Response): Promise<void> => {
    try {
      const userData = req.body;
      
      // Check if username or email already exists
      const existingUserResult = await this.db.query(
        'SELECT * FROM users WHERE username = $1 OR email = $2',
        [userData.username, userData.email]
      );
      
      if (existingUserResult.rows.length > 0) {
        res.status(409).json({ 
          success: false,
          message: 'Username or email already exists' 
        });
        return;
      }
      
      // Prepare new user
      const newUserData = await this.authService.prepareNewUser(userData);
      const userId = uuidv4();
      
      // Save to database
      await this.db.query(
        `INSERT INTO users (
          id, username, email, password, first_name, last_name, 
          phone_number, status, roles, mfa_enabled, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          userId,
          newUserData.username,
          newUserData.email,
          newUserData.password,
          newUserData.firstName,
          newUserData.lastName,
          newUserData.phoneNumber || null,
          newUserData.status,
          JSON.stringify(newUserData.roles),
          newUserData.mfaEnabled,
          newUserData.createdAt,
          newUserData.updatedAt
        ]
      );
      
      // Log user registration
      await this.auditLog.logEvent({
        eventType: AuditEventType.USER_MANAGEMENT,
        eventAction: AuditEventAction.CREATE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'User registration successful',
        occurredAt: new Date(),
        agents: [
          {
            agentType: 'user',
            agentId: userId,
            agentName: newUserData.username,
            networkAddress: req.ip,
            userAgent: req.headers['user-agent'] as string
          }
        ],
        entities: [
          {
            entityType: 'user',
            entityId: userId,
            entityDetail: {
              action: 'register',
              username: newUserData.username,
              email: newUserData.email
            }
          }
        ]
      });
      
      const newUser = {
        id: userId,
        ...newUserData
      };
      
      res.status(201).json({
        success: true,
        user: this.authService.prepareUserResponse(newUser)
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Registration failed', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Initiate password reset
   */
  private forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.body;
      
      // Find user by email
      const userResult = await this.db.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      
      if (userResult.rows.length === 0) {
        // Don't reveal that the email doesn't exist
        res.status(200).json({ 
          success: true,
          message: 'If your email is registered, you will receive a password reset link' 
        });
        return;
      }
      
      const user = userResult.rows[0];
      
      // Generate reset token
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date();
      expires.setHours(expires.getHours() + 1); // Token expires in 1 hour
      
      // Store reset token
      await this.db.query(
        `INSERT INTO password_reset_tokens (
          id, user_id, token, expires_at, created_at
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          uuidv4(),
          user.id,
          token,
          expires,
          new Date()
        ]
      );
      
      // In a real implementation, we would send an email with the reset link
      // For now, we just log it
      console.log(`Password reset token for ${email}: ${token}`);
      
      // Log password reset request
      await this.auditLog.logEvent({
        eventType: AuditEventType.USER_MANAGEMENT,
        eventAction: AuditEventAction.EXECUTE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'Password reset requested',
        occurredAt: new Date(),
        agents: [
          {
            agentType: 'user',
            agentId: user.id,
            agentName: user.username,
            networkAddress: req.ip,
            userAgent: req.headers['user-agent'] as string
          }
        ],
        entities: [
          {
            entityType: 'user',
            entityId: user.id,
            entityDetail: {
              action: 'password_reset_request',
              email: user.email
            }
          }
        ]
      });
      
      res.status(200).json({
        success: true,
        message: 'If your email is registered, you will receive a password reset link'
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Password reset request failed', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Reset password with token
   */
  private resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, password } = req.body;
      
      // Find valid reset token
      const tokenResult = await this.db.query(
        `SELECT * FROM password_reset_tokens 
         WHERE token = $1 AND expires_at > $2 AND used = FALSE`,
        [token, new Date()]
      );
      
      if (tokenResult.rows.length === 0) {
        res.status(400).json({ 
          success: false,
          message: 'Invalid or expired token' 
        });
        return;
      }
      
      const resetToken = tokenResult.rows[0];
      
      // Hash new password
      const hashedPassword = await this.authService.hashPassword(password);
      
      // Update user password
      await this.db.query(
        'UPDATE users SET password = $1, updated_at = $2 WHERE id = $3',
        [hashedPassword, new Date(), resetToken.user_id]
      );
      
      // Mark token as used
      await this.db.query(
        'UPDATE password_reset_tokens SET used = TRUE, used_at = $1 WHERE id = $2',
        [new Date(), resetToken.id]
      );
      
      // Log password reset
      await this.auditLog.logEvent({
        eventType: AuditEventType.USER_MANAGEMENT,
        eventAction: AuditEventAction.UPDATE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'Password reset successful',
        occurredAt: new Date(),
        agents: [
          {
            agentType: 'user',
            agentId: resetToken.user_id,
            networkAddress: req.ip,
            userAgent: req.headers['user-agent'] as string
          }
        ],
        entities: [
          {
            entityType: 'user',
            entityId: resetToken.user_id,
            entityDetail: {
              action: 'password_reset'
            }
          }
        ]
      });
      
      res.status(200).json({
        success: true,
        message: 'Password reset successful'
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Password reset failed', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Change password (authenticated)
   */
  private changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      // Get user from database
      const userResult = await this.db.query(
        'SELECT * FROM users WHERE id = $1',
        [req.user!.id]
      );
      
      if (userResult.rows.length === 0) {
        res.status(404).json({ 
          success: false,
          message: 'User not found' 
        });
        return;
      }
      
      const user = userResult.rows[0];
      
      // Verify current password
      const isPasswordValid = await this.authService.verifyPassword(currentPassword, user.password);
      
      if (!isPasswordValid) {
        // Log failed password change
        await this.auditLog.logEvent({
          eventType: AuditEventType.USER_MANAGEMENT,
          eventAction: AuditEventAction.UPDATE,
          eventOutcome: AuditEventOutcome.MINOR_FAILURE,
          eventOutcomeDesc: 'Current password is incorrect',
          occurredAt: new Date(),
          agents: [
            {
              agentType: 'user',
              agentId: user.id,
              agentName: user.username,
              networkAddress: req.ip,
              userAgent: req.headers['user-agent'] as string
            }
          ],
          entities: [
            {
              entityType: 'user',
              entityId: user.id,
              entityDetail: {
                action: 'change_password'
              }
            }
          ]
        });
        
        res.status(401).json({ 
          success: false,
          message: 'Current password is incorrect' 
        });
        return;
      }
      
      // Hash new password
      const hashedPassword = await this.authService.hashPassword(newPassword);
      
      // Update user password
      await this.db.query(
        'UPDATE users SET password = $1, updated_at = $2 WHERE id = $3',
        [hashedPassword, new Date(), user.id]
      );
      
      // Log password change
      await this.auditLog.logEvent({
        eventType: AuditEventType.USER_MANAGEMENT,
        eventAction: AuditEventAction.UPDATE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'Password changed successfully',
        occurredAt: new Date(),
        agents: [
          {
            agentType: 'user',
            agentId: user.id,
            agentName: user.username,
            networkAddress: req.ip,
            userAgent: req.headers['user-agent'] as string
          }
        ],
        entities: [
          {
            entityType: 'user',
            entityId: user.id,
            entityDetail: {
              action: 'change_password'
            }
          }
        ]
      });
      
      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Password change failed', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Enable MFA for user
   */
  private enableMfa = async (req: Request, res: Response): Promise<void> => {
    try {
      // Generate MFA secret
      const mfaSetup = await this.mfaService.generateMfaSecret(
        req.user!.id,
        req.user!.username
      );
      
      res.status(200).json({
        success: true,
        ...mfaSetup
      });
    } catch (error) {
      console.error('Enable MFA error:', error);
      res.status(500).json({ 
        success: false,
        message: 'MFA setup failed', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Verify MFA code and complete setup
   */
  private verifyMfa = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.body;
      
      // Verify MFA code
      const isValid = await this.mfaService.verifyMfaCode(req.user!.id, code);
      
      if (!isValid) {
        res.status(400).json({ 
          success: false,
          message: 'Invalid MFA code' 
        });
        return;
      }
      
      // Update user MFA status
      await this.db.query(
        'UPDATE users SET mfa_enabled = TRUE, updated_at = $1 WHERE id = $2',
        [new Date(), req.user!.id]
      );
      
      res.status(200).json({
        success: true,
        message: 'MFA enabled successfully'
      });
    } catch (error) {
      console.error('Verify MFA error:', error);
      res.status(500).json({ 
        success: false,
        message: 'MFA verification failed', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Disable MFA for user
   */
  private disableMfa = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.body;
      
      // Verify MFA code
      const isValid = await this.mfaService.verifyMfaCode(req.user!.id, code);
      
      if (!isValid) {
        res.status(400).json({ 
          success: false,
          message: 'Invalid MFA code' 
        });
        return;
      }
      
      // Disable MFA
      const isDisabled = await this.mfaService.disableMfa(req.user!.id);
      
      if (!isDisabled) {
        res.status(400).json({ 
          success: false,
          message: 'Failed to disable MFA' 
        });
        return;
      }
      
      // Update user MFA status
      await this.db.query(
        'UPDATE users SET mfa_enabled = FALSE, updated_at = $1 WHERE id = $2',
        [new Date(), req.user!.id]
      );
      
      res.status(200).json({
        success: true,
        message: 'MFA disabled successfully'
      });
    } catch (error) {
      console.error('Disable MFA error:', error);
      res.status(500).json({ 
        success: false,
        message: 'MFA disabling failed', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Regenerate backup codes
   */
  private regenerateBackupCodes = async (req: Request, res: Response): Promise<void> => {
    try {
      // Regenerate backup codes
      const backupCodes = await this.mfaService.regenerateBackupCodes(req.user!.id);
      
      res.status(200).json({
        success: true,
        backupCodes
      });
    } catch (error) {
      console.error('Regenerate backup codes error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to regenerate backup codes', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Get login history for user
   */
  private getLoginHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get login history from audit logs
      const loginHistoryResult = await this.db.query(
        `SELECT 
          ae.id, ae.event_outcome, ae.event_outcome_desc, ae.occurred_at,
          aa.network_address, aa.user_agent
        FROM audit_events ae
        JOIN audit_agents aa ON ae.id = aa.audit_event_id
        WHERE ae.event_type = $1 AND aa.agent_id = $2
        ORDER BY ae.occurred_at DESC
        LIMIT 50`,
        ['authentication', req.user!.id]
      );
      
      res.status(200).json({
        success: true,
        loginHistory: loginHistoryResult.rows
      });
    } catch (error) {
      console.error('Get login history error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to retrieve login history', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Get user activity
   */
  private getUserActivity = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get user activity from audit logs
      const activityResult = await this.db.query(
        `SELECT 
          ae.id, ae.event_type, ae.event_action, ae.event_outcome, 
          ae.event_outcome_desc, ae.occurred_at,
          aa.network_address, aa.user_agent,
          aent.entity_type, aent.entity_id, aent.entity_detail
        FROM audit_events ae
        JOIN audit_agents aa ON ae.id = aa.audit_event_id
        LEFT JOIN audit_entities aent ON ae.id = aent.audit_event_id
        WHERE aa.agent_id = $1
        ORDER BY ae.occurred_at DESC
        LIMIT 100`,
        [req.user!.id]
      );
      
      res.status(200).json({
        success: true,
        activity: activityResult.rows
      });
    } catch (error) {
      console.error('Get user activity error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to retrieve user activity', 
        error: (error as Error).message 
      });
    }
  };
}
