import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { SessionManager } from '../middleware/SessionManager';
import { InputValidator } from '../middleware/InputValidator';
import { AuditLogService, AuditEventType, AuditEventAction, AuditEventOutcome } from '../services/AuditLogService';
import { DatabaseService } from '../lib/DatabaseService';
import Joi from 'joi';

/**
 * Role and Permission Controller for the HMS System Infrastructure & Security module
 * Provides comprehensive role-based and attribute-based access control
 */
export class RbacController {
  private router: Router;
  private auditLog: AuditLogService;
  private validator: InputValidator;
  private db: DatabaseService;

  constructor() {
    this.router = Router();
    this.auditLog = AuditLogService.getInstance();
    this.validator = InputValidator.getInstance();
    this.db = DatabaseService.getInstance();
    
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Role management routes
    this.router.get('/roles', 
      SessionManager.authenticate,
      this.getRoles
    );
    
    this.router.post('/roles', 
      SessionManager.authenticate,
      SessionManager.authorize(['admin']),
      this.validator.validateBody(this.createRoleSchema()),
      this.createRole
    );
    
    this.router.get('/roles/:id', 
      SessionManager.authenticate,
      this.validator.validateParams(this.idParamSchema()),
      this.getRole
    );
    
    this.router.put('/roles/:id', 
      SessionManager.authenticate,
      SessionManager.authorize(['admin']),
      this.validator.validateParams(this.idParamSchema()),
      this.validator.validateBody(this.updateRoleSchema()),
      this.updateRole
    );
    
    this.router.delete('/roles/:id', 
      SessionManager.authenticate,
      SessionManager.authorize(['admin']),
      this.validator.validateParams(this.idParamSchema()),
      this.deleteRole
    );
    
    // Permission management routes
    this.router.get('/permissions', 
      SessionManager.authenticate,
      this.getPermissions
    );
    
    this.router.post('/permissions', 
      SessionManager.authenticate,
      SessionManager.authorize(['admin']),
      this.validator.validateBody(this.createPermissionSchema()),
      this.createPermission
    );
    
    this.router.get('/permissions/:id', 
      SessionManager.authenticate,
      this.validator.validateParams(this.idParamSchema()),
      this.getPermission
    );
    
    this.router.put('/permissions/:id', 
      SessionManager.authenticate,
      SessionManager.authorize(['admin']),
      this.validator.validateParams(this.idParamSchema()),
      this.validator.validateBody(this.updatePermissionSchema()),
      this.updatePermission
    );
    
    this.router.delete('/permissions/:id', 
      SessionManager.authenticate,
      SessionManager.authorize(['admin']),
      this.validator.validateParams(this.idParamSchema()),
      this.deletePermission
    );
    
    // Role-Permission assignment routes
    this.router.post('/roles/:roleId/permissions', 
      SessionManager.authenticate,
      SessionManager.authorize(['admin']),
      this.validator.validateParams(this.roleIdParamSchema()),
      this.validator.validateBody(this.assignPermissionsSchema()),
      this.assignPermissionsToRole
    );
    
    this.router.delete('/roles/:roleId/permissions/:permissionId', 
      SessionManager.authenticate,
      SessionManager.authorize(['admin']),
      this.validator.validateParams(this.rolePermissionParamSchema()),
      this.removePermissionFromRole
    );
    
    // User-Role assignment routes
    this.router.put('/users/:userId/roles', 
      SessionManager.authenticate,
      SessionManager.authorize(['admin']),
      this.validator.validateParams(this.userIdParamSchema()),
      this.validator.validateBody(this.assignRolesSchema()),
      this.assignRolesToUser
    );
    
    // User permissions routes
    this.router.get('/users/:userId/permissions', 
      SessionManager.authenticate,
      this.validator.validateParams(this.userIdParamSchema()),
      this.getUserPermissions
    );
    
    // Delegation routes
    this.router.post('/delegate', 
      SessionManager.authenticate,
      this.validator.validateBody(this.delegateAuthoritySchema()),
      this.delegateAuthority
    );
    
    this.router.get('/delegations', 
      SessionManager.authenticate,
      this.getDelegations
    );
    
    this.router.delete('/delegations/:id', 
      SessionManager.authenticate,
      this.validator.validateParams(this.idParamSchema()),
      this.revokeDelegation
    );
  }

  getRouter(): Router {
    return this.router;
  }

  /**
   * ID parameter schema validation
   */
  private idParamSchema(): Joi.Schema {
    return Joi.object({
      id: Joi.string().uuid().required()
    });
  }

  /**
   * Role ID parameter schema validation
   */
  private roleIdParamSchema(): Joi.Schema {
    return Joi.object({
      roleId: Joi.string().uuid().required()
    });
  }

  /**
   * User ID parameter schema validation
   */
  private userIdParamSchema(): Joi.Schema {
    return Joi.object({
      userId: Joi.string().uuid().required()
    });
  }

  /**
   * Role-Permission parameter schema validation
   */
  private rolePermissionParamSchema(): Joi.Schema {
    return Joi.object({
      roleId: Joi.string().uuid().required(),
      permissionId: Joi.string().uuid().required()
    });
  }

  /**
   * Create role schema validation
   */
  private createRoleSchema(): Joi.Schema {
    return Joi.object({
      name: Joi.string().required().min(3).max(50),
      description: Joi.string().optional(),
      isSystem: Joi.boolean().optional().default(false),
      parentRoleId: Joi.string().uuid().optional()
    });
  }

  /**
   * Update role schema validation
   */
  private updateRoleSchema(): Joi.Schema {
    return Joi.object({
      name: Joi.string().optional().min(3).max(50),
      description: Joi.string().optional(),
      isActive: Joi.boolean().optional(),
      parentRoleId: Joi.string().uuid().optional().allow(null)
    });
  }

  /**
   * Create permission schema validation
   */
  private createPermissionSchema(): Joi.Schema {
    return Joi.object({
      name: Joi.string().required().min(3).max(100),
      description: Joi.string().optional(),
      resource: Joi.string().required(),
      action: Joi.string().required(),
      conditions: Joi.object().optional()
    });
  }

  /**
   * Update permission schema validation
   */
  private updatePermissionSchema(): Joi.Schema {
    return Joi.object({
      name: Joi.string().optional().min(3).max(100),
      description: Joi.string().optional(),
      resource: Joi.string().optional(),
      action: Joi.string().optional(),
      conditions: Joi.object().optional(),
      isActive: Joi.boolean().optional()
    });
  }

  /**
   * Assign permissions schema validation
   */
  private assignPermissionsSchema(): Joi.Schema {
    return Joi.object({
      permissionIds: Joi.array().items(Joi.string().uuid()).required()
    });
  }

  /**
   * Assign roles schema validation
   */
  private assignRolesSchema(): Joi.Schema {
    return Joi.object({
      roleIds: Joi.array().items(Joi.string().uuid()).required()
    });
  }

  /**
   * Delegate authority schema validation
   */
  private delegateAuthoritySchema(): Joi.Schema {
    return Joi.object({
      delegateToUserId: Joi.string().uuid().required(),
      permissions: Joi.array().items(Joi.string()).required(),
      startTime: Joi.date().optional(),
      endTime: Joi.date().optional(),
      reason: Joi.string().required()
    });
  }

  /**
   * Get all roles
   */
  private getRoles = async (req: Request, res: Response): Promise<void> => {
    try {
      const rolesResult = await this.db.query(
        `SELECT r.*, pr.name as parent_role_name
         FROM roles r
         LEFT JOIN roles pr ON r.parent_role_id = pr.id
         ORDER BY r.name`
      );
      
      res.status(200).json({
        success: true,
        roles: rolesResult.rows
      });
    } catch (error) {
      console.error('Get roles error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to retrieve roles', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Create a new role
   */
  private createRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, description, isSystem, parentRoleId } = req.body;
      
      // Check if role name already exists
      const existingRoleResult = await this.db.query(
        'SELECT * FROM roles WHERE name = $1',
        [name]
      );
      
      if (existingRoleResult.rows.length > 0) {
        res.status(409).json({ 
          success: false,
          message: 'Role name already exists' 
        });
        return;
      }
      
      // If parent role specified, check if it exists
      if (parentRoleId) {
        const parentRoleResult = await this.db.query(
          'SELECT * FROM roles WHERE id = $1',
          [parentRoleId]
        );
        
        if (parentRoleResult.rows.length === 0) {
          res.status(404).json({ 
            success: false,
            message: 'Parent role not found' 
          });
          return;
        }
      }
      
      // Create role
      const roleId = uuidv4();
      const now = new Date();
      
      await this.db.query(
        `INSERT INTO roles (
          id, name, description, is_system, is_active, 
          parent_role_id, created_at, updated_at, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          roleId,
          name,
          description || null,
          isSystem || false,
          true,
          parentRoleId || null,
          now,
          now,
          req.user!.id
        ]
      );
      
      // Log role creation
      await this.auditLog.logEvent({
        eventType: AuditEventType.ROLE_MANAGEMENT,
        eventAction: AuditEventAction.CREATE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'Role created successfully',
        occurredAt: now,
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
            entityType: 'role',
            entityId: roleId,
            entityDetail: {
              name,
              description,
              isSystem,
              parentRoleId
            }
          }
        ]
      });
      
      res.status(201).json({
        success: true,
        role: {
          id: roleId,
          name,
          description,
          isSystem: isSystem || false,
          isActive: true,
          parentRoleId: parentRoleId || null,
          createdAt: now,
          updatedAt: now,
          createdBy: req.user!.id
        }
      });
    } catch (error) {
      console.error('Create role error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to create role', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Get role by ID
   */
  private getRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      // Get role
      const roleResult = await this.db.query(
        `SELECT r.*, pr.name as parent_role_name
         FROM roles r
         LEFT JOIN roles pr ON r.parent_role_id = pr.id
         WHERE r.id = $1`,
        [id]
      );
      
      if (roleResult.rows.length === 0) {
        res.status(404).json({ 
          success: false,
          message: 'Role not found' 
        });
        return;
      }
      
      // Get role permissions
      const permissionsResult = await this.db.query(
        `SELECT p.*
         FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         WHERE rp.role_id = $1`,
        [id]
      );
      
      res.status(200).json({
        success: true,
        role: {
          ...roleResult.rows[0],
          permissions: permissionsResult.rows
        }
      });
    } catch (error) {
      console.error('Get role error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to retrieve role', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Update role
   */
  private updateRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, description, isActive, parentRoleId } = req.body;
      
      // Check if role exists
      const roleResult = await this.db.query(
        'SELECT * FROM roles WHERE id = $1',
        [id]
      );
      
      if (roleResult.rows.length === 0) {
        res.status(404).json({ 
          success: false,
          message: 'Role not found' 
        });
        return;
      }
      
      const role = roleResult.rows[0];
      
      // Cannot modify system roles
      if (role.is_system) {
        res.status(403).json({ 
          success: false,
          message: 'Cannot modify system roles' 
        });
        return;
      }
      
      // If name is being changed, check if it already exists
      if (name && name !== role.name) {
        const existingRoleResult = await this.db.query(
          'SELECT * FROM roles WHERE name = $1 AND id != $2',
          [name, id]
        );
        
        if (existingRoleResult.rows.length > 0) {
          res.status(409).json({ 
            success: false,
            message: 'Role name already exists' 
          });
          return;
        }
      }
      
      // If parent role specified, check if it exists and prevent circular references
      if (parentRoleId !== undefined) {
        if (parentRoleId === id) {
          res.status(400).json({ 
            success: false,
            message: 'Role cannot be its own parent' 
          });
          return;
        }
        
        if (parentRoleId !== null) {
          const parentRoleResult = await this.db.query(
            'SELECT * FROM roles WHERE id = $1',
            [parentRoleId]
          );
          
          if (parentRoleResult.rows.length === 0) {
            res.status(404).json({ 
              success: false,
              message: 'Parent role not found' 
            });
            return;
          }
          
          // Check for circular references
          const isCircular = await this.checkCircularRoleReference(parentRoleId, id);
          if (isCircular) {
            res.status(400).json({ 
              success: false,
              message: 'Circular role reference detected' 
            });
            return;
          }
        }
      }
      
      // Update role
      const now = new Date();
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;
      
      if (name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(name);
      }
      
      if (description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(description);
      }
      
      if (isActive !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        updateValues.push(isActive);
      }
      
      if (parentRoleId !== undefined) {
        updateFields.push(`parent_role_id = $${paramIndex++}`);
        updateValues.push(parentRoleId);
      }
      
      updateFields.push(`updated_at = $${paramIndex++}`);
      updateValues.push(now);
      
      updateFields.push(`updated_by = $${paramIndex++}`);
      updateValues.push(req.user!.id);
      
      await this.db.query(
        `UPDATE roles SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
        [...updateValues, id]
      );
      
      // Log role update
      await this.auditLog.logEvent({
        eventType: AuditEventType.ROLE_MANAGEMENT,
        eventAction: AuditEventAction.UPDATE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'Role updated successfully',
        occurredAt: now,
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
            entityType: 'role',
            entityId: id,
            entityDetail: {
              name,
              description,
              isActive,
              parentRoleId
            }
          }
        ]
      });
      
      // Get updated role
      const updatedRoleResult = await this.db.query(
        `SELECT r.*, pr.name as parent_role_name
         FROM roles r
         LEFT JOIN roles pr ON r.parent_role_id = pr.id
         WHERE r.id = $1`,
        [id]
      );
      
      res.status(200).json({
        success: true,
        role: updatedRoleResult.rows[0]
      });
    } catch (error) {
      console.error('Update role error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to update role', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Delete role
   */
  private deleteRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      // Check if role exists
      const roleResult = await this.db.query(
        'SELECT * FROM roles WHERE id = $1',
        [id]
      );
      
      if (roleResult.rows.length === 0) {
        res.status(404).json({ 
          success: false,
          message: 'Role not found' 
        });
        return;
      }
      
      const role = roleResult.rows[0];
      
      // Cannot delete system roles
      if (role.is_system) {
        res.status(403).json({ 
          success: false,
          message: 'Cannot delete system roles' 
        });
        return;
      }
      
      // Check if role is used as parent role
      const childRolesResult = await this.db.query(
        'SELECT * FROM roles WHERE parent_role_id = $1',
        [id]
      );
      
      if (childRolesResult.rows.length > 0) {
        res.status(400).json({ 
          success: false,
          message: 'Role is used as parent role and cannot be deleted' 
        });
        return;
      }
      
      // Delete role permissions
      await this.db.query(
        'DELETE FROM role_permissions WHERE role_id = $1',
        [id]
      );
      
      // Delete user roles
      await this.db.query(
        'DELETE FROM user_roles WHERE role_id = $1',
        [id]
      );
      
      // Delete role
      await this.db.query(
        'DELETE FROM roles WHERE id = $1',
        [id]
      );
      
      // Log role deletion
      await this.auditLog.logEvent({
        eventType: AuditEventType.ROLE_MANAGEMENT,
        eventAction: AuditEventAction.DELETE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'Role deleted successfully',
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
            entityType: 'role',
            entityId: id,
            entityDetail: {
              name: role.name
            }
          }
        ]
      });
      
      res.status(200).json({
        success: true,
        message: 'Role deleted successfully'
      });
    } catch (error) {
      console.error('Delete role error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to delete role', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Get all permissions
   */
  private getPermissions = async (req: Request, res: Response): Promise<void> => {
    try {
      const permissionsResult = await this.db.query(
        'SELECT * FROM permissions ORDER BY resource, action'
      );
      
      res.status(200).json({
        success: true,
        permissions: permissionsResult.rows
      });
    } catch (error) {
      console.error('Get permissions error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to retrieve permissions', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Create a new permission
   */
  private createPermission = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, description, resource, action, conditions } = req.body;
      
      // Check if permission already exists
      const existingPermissionResult = await this.db.query(
        'SELECT * FROM permissions WHERE resource = $1 AND action = $2',
        [resource, action]
      );
      
      if (existingPermissionResult.rows.length > 0) {
        res.status(409).json({ 
          success: false,
          message: 'Permission already exists for this resource and action' 
        });
        return;
      }
      
      // Create permission
      const permissionId = uuidv4();
      const now = new Date();
      
      await this.db.query(
        `INSERT INTO permissions (
          id, name, description, resource, action, 
          conditions, is_active, created_at, updated_at, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          permissionId,
          name,
          description || null,
          resource,
          action,
          conditions ? JSON.stringify(conditions) : null,
          true,
          now,
          now,
          req.user!.id
        ]
      );
      
      // Log permission creation
      await this.auditLog.logEvent({
        eventType: AuditEventType.PERMISSION_MANAGEMENT,
        eventAction: AuditEventAction.CREATE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'Permission created successfully',
        occurredAt: now,
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
            entityType: 'permission',
            entityId: permissionId,
            entityDetail: {
              name,
              resource,
              action
            }
          }
        ]
      });
      
      res.status(201).json({
        success: true,
        permission: {
          id: permissionId,
          name,
          description,
          resource,
          action,
          conditions,
          isActive: true,
          createdAt: now,
          updatedAt: now,
          createdBy: req.user!.id
        }
      });
    } catch (error) {
      console.error('Create permission error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to create permission', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Get permission by ID
   */
  private getPermission = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      // Get permission
      const permissionResult = await this.db.query(
        'SELECT * FROM permissions WHERE id = $1',
        [id]
      );
      
      if (permissionResult.rows.length === 0) {
        res.status(404).json({ 
          success: false,
          message: 'Permission not found' 
        });
        return;
      }
      
      // Get roles with this permission
      const rolesResult = await this.db.query(
        `SELECT r.*
         FROM roles r
         JOIN role_permissions rp ON r.id = rp.role_id
         WHERE rp.permission_id = $1`,
        [id]
      );
      
      res.status(200).json({
        success: true,
        permission: {
          ...permissionResult.rows[0],
          roles: rolesResult.rows
        }
      });
    } catch (error) {
      console.error('Get permission error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to retrieve permission', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Update permission
   */
  private updatePermission = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, description, resource, action, conditions, isActive } = req.body;
      
      // Check if permission exists
      const permissionResult = await this.db.query(
        'SELECT * FROM permissions WHERE id = $1',
        [id]
      );
      
      if (permissionResult.rows.length === 0) {
        res.status(404).json({ 
          success: false,
          message: 'Permission not found' 
        });
        return;
      }
      
      const permission = permissionResult.rows[0];
      
      // If resource or action is being changed, check if it already exists
      if ((resource && resource !== permission.resource) || 
          (action && action !== permission.action)) {
        const existingPermissionResult = await this.db.query(
          'SELECT * FROM permissions WHERE resource = $1 AND action = $2 AND id != $3',
          [
            resource || permission.resource, 
            action || permission.action, 
            id
          ]
        );
        
        if (existingPermissionResult.rows.length > 0) {
          res.status(409).json({ 
            success: false,
            message: 'Permission already exists for this resource and action' 
          });
          return;
        }
      }
      
      // Update permission
      const now = new Date();
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;
      
      if (name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(name);
      }
      
      if (description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(description);
      }
      
      if (resource !== undefined) {
        updateFields.push(`resource = $${paramIndex++}`);
        updateValues.push(resource);
      }
      
      if (action !== undefined) {
        updateFields.push(`action = $${paramIndex++}`);
        updateValues.push(action);
      }
      
      if (conditions !== undefined) {
        updateFields.push(`conditions = $${paramIndex++}`);
        updateValues.push(conditions ? JSON.stringify(conditions) : null);
      }
      
      if (isActive !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        updateValues.push(isActive);
      }
      
      updateFields.push(`updated_at = $${paramIndex++}`);
      updateValues.push(now);
      
      updateFields.push(`updated_by = $${paramIndex++}`);
      updateValues.push(req.user!.id);
      
      await this.db.query(
        `UPDATE permissions SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
        [...updateValues, id]
      );
      
      // Log permission update
      await this.auditLog.logEvent({
        eventType: AuditEventType.PERMISSION_MANAGEMENT,
        eventAction: AuditEventAction.UPDATE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'Permission updated successfully',
        occurredAt: now,
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
            entityType: 'permission',
            entityId: id,
            entityDetail: {
              name,
              resource,
              action,
              isActive
            }
          }
        ]
      });
      
      // Get updated permission
      const updatedPermissionResult = await this.db.query(
        'SELECT * FROM permissions WHERE id = $1',
        [id]
      );
      
      res.status(200).json({
        success: true,
        permission: updatedPermissionResult.rows[0]
      });
    } catch (error) {
      console.error('Update permission error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to update permission', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Delete permission
   */
  private deletePermission = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      // Check if permission exists
      const permissionResult = await this.db.query(
        'SELECT * FROM permissions WHERE id = $1',
        [id]
      );
      
      if (permissionResult.rows.length === 0) {
        res.status(404).json({ 
          success: false,
          message: 'Permission not found' 
        });
        return;
      }
      
      const permission = permissionResult.rows[0];
      
      // Delete role permissions
      await this.db.query(
        'DELETE FROM role_permissions WHERE permission_id = $1',
        [id]
      );
      
      // Delete permission
      await this.db.query(
        'DELETE FROM permissions WHERE id = $1',
        [id]
      );
      
      // Log permission deletion
      await this.auditLog.logEvent({
        eventType: AuditEventType.PERMISSION_MANAGEMENT,
        eventAction: AuditEventAction.DELETE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'Permission deleted successfully',
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
            entityType: 'permission',
            entityId: id,
            entityDetail: {
              name: permission.name,
              resource: permission.resource,
              action: permission.action
            }
          }
        ]
      });
      
      res.status(200).json({
        success: true,
        message: 'Permission deleted successfully'
      });
    } catch (error) {
      console.error('Delete permission error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to delete permission', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Assign permissions to role
   */
  private assignPermissionsToRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const { roleId } = req.params;
      const { permissionIds } = req.body;
      
      // Check if role exists
      const roleResult = await this.db.query(
        'SELECT * FROM roles WHERE id = $1',
        [roleId]
      );
      
      if (roleResult.rows.length === 0) {
        res.status(404).json({ 
          success: false,
          message: 'Role not found' 
        });
        return;
      }
      
      // Check if all permissions exist
      const permissionsResult = await this.db.query(
        'SELECT * FROM permissions WHERE id = ANY($1)',
        [permissionIds]
      );
      
      if (permissionsResult.rows.length !== permissionIds.length) {
        res.status(400).json({ 
          success: false,
          message: 'One or more permissions not found' 
        });
        return;
      }
      
      // Get existing role permissions
      const existingPermissionsResult = await this.db.query(
        'SELECT permission_id FROM role_permissions WHERE role_id = $1',
        [roleId]
      );
      
      const existingPermissionIds = existingPermissionsResult.rows.map(
        (row: any) => row.permission_id
      );
      
      // Filter out permissions that are already assigned
      const newPermissionIds = permissionIds.filter(
        (id: string) => !existingPermissionIds.includes(id)
      );
      
      if (newPermissionIds.length === 0) {
        res.status(200).json({
          success: true,
          message: 'All permissions are already assigned to the role'
        });
        return;
      }
      
      // Assign permissions to role
      const now = new Date();
      
      for (const permissionId of newPermissionIds) {
        await this.db.query(
          `INSERT INTO role_permissions (
            id, role_id, permission_id, created_at, created_by
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            uuidv4(),
            roleId,
            permissionId,
            now,
            req.user!.id
          ]
        );
      }
      
      // Log permission assignment
      await this.auditLog.logEvent({
        eventType: AuditEventType.ROLE_MANAGEMENT,
        eventAction: AuditEventAction.UPDATE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'Permissions assigned to role successfully',
        occurredAt: now,
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
            entityType: 'role',
            entityId: roleId,
            entityDetail: {
              action: 'assign_permissions',
              permissionIds: newPermissionIds
            }
          }
        ]
      });
      
      res.status(200).json({
        success: true,
        message: 'Permissions assigned to role successfully',
        assignedPermissions: newPermissionIds
      });
    } catch (error) {
      console.error('Assign permissions error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to assign permissions to role', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Remove permission from role
   */
  private removePermissionFromRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const { roleId, permissionId } = req.params;
      
      // Check if role exists
      const roleResult = await this.db.query(
        'SELECT * FROM roles WHERE id = $1',
        [roleId]
      );
      
      if (roleResult.rows.length === 0) {
        res.status(404).json({ 
          success: false,
          message: 'Role not found' 
        });
        return;
      }
      
      // Check if permission exists
      const permissionResult = await this.db.query(
        'SELECT * FROM permissions WHERE id = $1',
        [permissionId]
      );
      
      if (permissionResult.rows.length === 0) {
        res.status(404).json({ 
          success: false,
          message: 'Permission not found' 
        });
        return;
      }
      
      // Check if permission is assigned to role
      const rolePermissionResult = await this.db.query(
        'SELECT * FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
        [roleId, permissionId]
      );
      
      if (rolePermissionResult.rows.length === 0) {
        res.status(404).json({ 
          success: false,
          message: 'Permission is not assigned to role' 
        });
        return;
      }
      
      // Remove permission from role
      await this.db.query(
        'DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
        [roleId, permissionId]
      );
      
      // Log permission removal
      await this.auditLog.logEvent({
        eventType: AuditEventType.ROLE_MANAGEMENT,
        eventAction: AuditEventAction.UPDATE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'Permission removed from role successfully',
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
            entityType: 'role',
            entityId: roleId,
            entityDetail: {
              action: 'remove_permission',
              permissionId
            }
          }
        ]
      });
      
      res.status(200).json({
        success: true,
        message: 'Permission removed from role successfully'
      });
    } catch (error) {
      console.error('Remove permission error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to remove permission from role', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Assign roles to user
   */
  private assignRolesToUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { roleIds } = req.body;
      
      // Check if user exists
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
      
      // Check if all roles exist
      const rolesResult = await this.db.query(
        'SELECT * FROM roles WHERE id = ANY($1)',
        [roleIds]
      );
      
      if (rolesResult.rows.length !== roleIds.length) {
        res.status(400).json({ 
          success: false,
          message: 'One or more roles not found' 
        });
        return;
      }
      
      // Get existing user roles
      const existingRolesResult = await this.db.query(
        'SELECT role_id FROM user_roles WHERE user_id = $1',
        [userId]
      );
      
      const existingRoleIds = existingRolesResult.rows.map(
        (row: any) => row.role_id
      );
      
      // Delete existing user roles
      await this.db.query(
        'DELETE FROM user_roles WHERE user_id = $1',
        [userId]
      );
      
      // Assign roles to user
      const now = new Date();
      
      for (const roleId of roleIds) {
        await this.db.query(
          `INSERT INTO user_roles (
            id, user_id, role_id, created_at, created_by
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            uuidv4(),
            userId,
            roleId,
            now,
            req.user!.id
          ]
        );
      }
      
      // Log role assignment
      await this.auditLog.logEvent({
        eventType: AuditEventType.USER_MANAGEMENT,
        eventAction: AuditEventAction.UPDATE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'Roles assigned to user successfully',
        occurredAt: now,
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
            entityId: userId,
            entityDetail: {
              action: 'assign_roles',
              roleIds,
              previousRoleIds: existingRoleIds
            }
          }
        ]
      });
      
      res.status(200).json({
        success: true,
        message: 'Roles assigned to user successfully',
        assignedRoles: roleIds
      });
    } catch (error) {
      console.error('Assign roles error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to assign roles to user', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Get user permissions
   */
  private getUserPermissions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      
      // Check if user exists
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
      
      // Get user roles
      const userRolesResult = await this.db.query(
        `SELECT r.*
         FROM roles r
         JOIN user_roles ur ON r.id = ur.role_id
         WHERE ur.user_id = $1`,
        [userId]
      );
      
      const roleIds = userRolesResult.rows.map((role: any) => role.id);
      
      // Get permissions from user roles
      const permissionsResult = await this.db.query(
        `SELECT DISTINCT p.*
         FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         WHERE rp.role_id = ANY($1)`,
        [roleIds]
      );
      
      // Get delegated permissions
      const delegatedPermissionsResult = await this.db.query(
        `SELECT d.*, p.name, p.resource, p.action
         FROM delegations d
         JOIN permissions p ON d.permission_id = p.id
         WHERE d.delegate_to_user_id = $1
         AND d.start_time <= $2
         AND (d.end_time IS NULL OR d.end_time >= $2)`,
        [userId, new Date()]
      );
      
      res.status(200).json({
        success: true,
        roles: userRolesResult.rows,
        permissions: permissionsResult.rows,
        delegatedPermissions: delegatedPermissionsResult.rows
      });
    } catch (error) {
      console.error('Get user permissions error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to retrieve user permissions', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Delegate authority
   */
  private delegateAuthority = async (req: Request, res: Response): Promise<void> => {
    try {
      const { delegateToUserId, permissions, startTime, endTime, reason } = req.body;
      
      // Check if delegate user exists
      const delegateUserResult = await this.db.query(
        'SELECT * FROM users WHERE id = $1',
        [delegateToUserId]
      );
      
      if (delegateUserResult.rows.length === 0) {
        res.status(404).json({ 
          success: false,
          message: 'Delegate user not found' 
        });
        return;
      }
      
      // Check if permissions exist
      const permissionsResult = await this.db.query(
        'SELECT * FROM permissions WHERE name = ANY($1)',
        [permissions]
      );
      
      if (permissionsResult.rows.length !== permissions.length) {
        res.status(400).json({ 
          success: false,
          message: 'One or more permissions not found' 
        });
        return;
      }
      
      // Create delegations
      const now = new Date();
      const delegationIds = [];
      
      for (const permission of permissionsResult.rows) {
        const delegationId = uuidv4();
        
        await this.db.query(
          `INSERT INTO delegations (
            id, delegated_by_user_id, delegate_to_user_id, permission_id,
            start_time, end_time, reason, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            delegationId,
            req.user!.id,
            delegateToUserId,
            permission.id,
            startTime ? new Date(startTime) : now,
            endTime ? new Date(endTime) : null,
            reason,
            now
          ]
        );
        
        delegationIds.push(delegationId);
      }
      
      // Log delegation
      await this.auditLog.logEvent({
        eventType: AuditEventType.DELEGATION,
        eventAction: AuditEventAction.CREATE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'Authority delegated successfully',
        occurredAt: now,
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
            entityId: delegateToUserId,
            entityDetail: {
              action: 'delegate_authority',
              permissions,
              startTime,
              endTime,
              reason
            }
          }
        ]
      });
      
      res.status(201).json({
        success: true,
        message: 'Authority delegated successfully',
        delegationIds
      });
    } catch (error) {
      console.error('Delegate authority error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to delegate authority', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Get delegations
   */
  private getDelegations = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get delegations by user
      const delegationsResult = await this.db.query(
        `SELECT d.*, 
         p.name as permission_name, p.resource, p.action,
         u1.username as delegated_by_username,
         u2.username as delegate_to_username
         FROM delegations d
         JOIN permissions p ON d.permission_id = p.id
         JOIN users u1 ON d.delegated_by_user_id = u1.id
         JOIN users u2 ON d.delegate_to_user_id = u2.id
         WHERE d.delegated_by_user_id = $1 OR d.delegate_to_user_id = $1
         ORDER BY d.created_at DESC`,
        [req.user!.id]
      );
      
      res.status(200).json({
        success: true,
        delegations: delegationsResult.rows
      });
    } catch (error) {
      console.error('Get delegations error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to retrieve delegations', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Revoke delegation
   */
  private revokeDelegation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      // Check if delegation exists
      const delegationResult = await this.db.query(
        'SELECT * FROM delegations WHERE id = $1',
        [id]
      );
      
      if (delegationResult.rows.length === 0) {
        res.status(404).json({ 
          success: false,
          message: 'Delegation not found' 
        });
        return;
      }
      
      const delegation = delegationResult.rows[0];
      
      // Check if user has permission to revoke
      if (delegation.delegated_by_user_id !== req.user!.id && !req.user!.roles.includes('admin')) {
        res.status(403).json({ 
          success: false,
          message: 'You do not have permission to revoke this delegation' 
        });
        return;
      }
      
      // Revoke delegation
      await this.db.query(
        'DELETE FROM delegations WHERE id = $1',
        [id]
      );
      
      // Log revocation
      await this.auditLog.logEvent({
        eventType: AuditEventType.DELEGATION,
        eventAction: AuditEventAction.DELETE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'Delegation revoked successfully',
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
            entityType: 'delegation',
            entityId: id,
            entityDetail: {
              action: 'revoke_delegation',
              delegatedByUserId: delegation.delegated_by_user_id,
              delegateToUserId: delegation.delegate_to_user_id,
              permissionId: delegation.permission_id
            }
          }
        ]
      });
      
      res.status(200).json({
        success: true,
        message: 'Delegation revoked successfully'
      });
    } catch (error) {
      console.error('Revoke delegation error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to revoke delegation', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Check for circular role references
   * @param parentRoleId Parent role ID
   * @param childRoleId Child role ID
   * @returns Whether there is a circular reference
   */
  private async checkCircularRoleReference(
    parentRoleId: string, 
    childRoleId: string
  ): Promise<boolean> {
    // Check if parent role has the child role as ancestor
    const visited = new Set<string>();
    const queue = [parentRoleId];
    
    while (queue.length > 0) {
      const currentRoleId = queue.shift()!;
      
      if (currentRoleId === childRoleId) {
        return true; // Circular reference detected
      }
      
      if (visited.has(currentRoleId)) {
        continue;
      }
      
      visited.add(currentRoleId);
      
      // Get parent role of current role
      const parentRoleResult = await this.db.query(
        'SELECT parent_role_id FROM roles WHERE id = $1',
        [currentRoleId]
      );
      
      if (parentRoleResult.rows.length > 0 && parentRoleResult.rows[0].parent_role_id) {
        queue.push(parentRoleResult.rows[0].parent_role_id);
      }
    }
    
    return false; // No circular reference
  }
}
