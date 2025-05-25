import { DatabaseService } from '../lib/DatabaseService';
import { User, CreateUserDto, UpdateUserDto, UserStatus } from '../models/User';
import { v4 as uuidv4 } from 'uuid';

/**
 * User repository for database operations related to users
 */
export class UserRepository {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  /**
   * Find a user by ID
   * @param id User ID
   * @returns User object or null if not found
   */
  async findById(id: string): Promise<User | null> {
    try {
      const userResult = await this.db.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );

      if (userResult.rows.length === 0) {
        return null;
      }

      const user = userResult.rows[0];

      // Get user roles
      const rolesResult = await this.db.query(
        'SELECT r.name FROM roles r ' +
        'JOIN user_roles ur ON r.id = ur.role_id ' +
        'WHERE ur.user_id = $1',
        [id]
      );

      const roles = rolesResult.rows.map((row: any) => row.name);

      return {
        ...user,
        roles,
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at),
        lastLogin: user.last_login ? new Date(user.last_login) : undefined
      } as User;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  /**
   * Find a user by username
   * @param username Username
   * @returns User object or null if not found
   */
  async findByUsername(username: string): Promise<User | null> {
    try {
      const userResult = await this.db.query(
        'SELECT * FROM users WHERE username = $1',
        [username]
      );

      if (userResult.rows.length === 0) {
        return null;
      }

      const user = userResult.rows[0];

      // Get user roles
      const rolesResult = await this.db.query(
        'SELECT r.name FROM roles r ' +
        'JOIN user_roles ur ON r.id = ur.role_id ' +
        'WHERE ur.user_id = $1',
        [user.id]
      );

      const roles = rolesResult.rows.map((row: any) => row.name);

      return {
        ...user,
        roles,
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at),
        lastLogin: user.last_login ? new Date(user.last_login) : undefined
      } as User;
    } catch (error) {
      console.error('Error finding user by username:', error);
      throw error;
    }
  }

  /**
   * Find a user by email
   * @param email Email address
   * @returns User object or null if not found
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const userResult = await this.db.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      if (userResult.rows.length === 0) {
        return null;
      }

      const user = userResult.rows[0];

      // Get user roles
      const rolesResult = await this.db.query(
        'SELECT r.name FROM roles r ' +
        'JOIN user_roles ur ON r.id = ur.role_id ' +
        'WHERE ur.user_id = $1',
        [user.id]
      );

      const roles = rolesResult.rows.map((row: any) => row.name);

      return {
        ...user,
        roles,
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at),
        lastLogin: user.last_login ? new Date(user.last_login) : undefined
      } as User;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Get all users
   * @returns Array of user objects
   */
  async findAll(): Promise<User[]> {
    try {
      const usersResult = await this.db.query('SELECT * FROM users');
      
      const users = await Promise.all(
        usersResult.rows.map(async (user: any) => {
          // Get user roles
          const rolesResult = await this.db.query(
            'SELECT r.name FROM roles r ' +
            'JOIN user_roles ur ON r.id = ur.role_id ' +
            'WHERE ur.user_id = $1',
            [user.id]
          );

          const roles = rolesResult.rows.map((row: any) => row.name);

          return {
            ...user,
            roles,
            createdAt: new Date(user.created_at),
            updatedAt: new Date(user.updated_at),
            lastLogin: user.last_login ? new Date(user.last_login) : undefined
          } as User;
        })
      );

      return users;
    } catch (error) {
      console.error('Error finding all users:', error);
      throw error;
    }
  }

  /**
   * Create a new user
   * @param userData User data
   * @returns Created user
   */
  async create(userData: CreateUserDto, hashedPassword: string): Promise<User> {
    return this.db.transaction(async (client) => {
      try {
        const userId = uuidv4();
        const now = new Date();

        // Insert user
        const userResult = await client.query(
          `INSERT INTO users (
            id, username, email, password, first_name, last_name, 
            phone_number, status, mfa_enabled, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
          [
            userId,
            userData.username,
            userData.email,
            hashedPassword,
            userData.firstName,
            userData.lastName,
            userData.phoneNumber || null,
            UserStatus.ACTIVE,
            false,
            now,
            now
          ]
        );

        const user = userResult.rows[0];

        // Get role IDs
        const roles = userData.roles || ['user'];
        const roleIds = [];

        for (const roleName of roles) {
          const roleResult = await client.query(
            'SELECT id FROM roles WHERE name = $1',
            [roleName]
          );

          if (roleResult.rows.length === 0) {
            // Create role if it doesn't exist
            const newRoleResult = await client.query(
              'INSERT INTO roles (id, name, description, created_at, updated_at) VALUES ($1, $2, $3, $4, $5) RETURNING id',
              [uuidv4(), roleName, `${roleName} role`, now, now]
            );
            roleIds.push(newRoleResult.rows[0].id);
          } else {
            roleIds.push(roleResult.rows[0].id);
          }
        }

        // Assign roles to user
        for (const roleId of roleIds) {
          await client.query(
            'INSERT INTO user_roles (user_id, role_id, created_at, created_by) VALUES ($1, $2, $3, $4)',
            [userId, roleId, now, userId]
          );
        }

        return {
          ...user,
          roles,
          createdAt: now,
          updatedAt: now
        } as User;
      } catch (error) {
        console.error('Error creating user:', error);
        throw error;
      }
    });
  }

  /**
   * Update a user
   * @param id User ID
   * @param updateData Update data
   * @returns Updated user
   */
  async update(id: string, updateData: UpdateUserDto): Promise<User | null> {
    return this.db.transaction(async (client) => {
      try {
        // Check if user exists
        const existingUser = await this.findById(id);
        if (!existingUser) {
          return null;
        }

        const now = new Date();
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;

        // Build dynamic update query
        if (updateData.email !== undefined) {
          updateFields.push(`email = $${paramIndex}`);
          updateValues.push(updateData.email);
          paramIndex++;
        }

        if (updateData.firstName !== undefined) {
          updateFields.push(`first_name = $${paramIndex}`);
          updateValues.push(updateData.firstName);
          paramIndex++;
        }

        if (updateData.lastName !== undefined) {
          updateFields.push(`last_name = $${paramIndex}`);
          updateValues.push(updateData.lastName);
          paramIndex++;
        }

        if (updateData.phoneNumber !== undefined) {
          updateFields.push(`phone_number = $${paramIndex}`);
          updateValues.push(updateData.phoneNumber);
          paramIndex++;
        }

        if (updateData.status !== undefined) {
          updateFields.push(`status = $${paramIndex}`);
          updateValues.push(updateData.status);
          paramIndex++;
        }

        if (updateData.mfaEnabled !== undefined) {
          updateFields.push(`mfa_enabled = $${paramIndex}`);
          updateValues.push(updateData.mfaEnabled);
          paramIndex++;
        }

        // Add updated_at field
        updateFields.push(`updated_at = $${paramIndex}`);
        updateValues.push(now);
        paramIndex++;

        // Add user ID as the last parameter
        updateValues.push(id);

        // Update user if there are fields to update
        if (updateFields.length > 0) {
          await client.query(
            `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
            updateValues
          );
        }

        // Update roles if provided
        if (updateData.roles !== undefined) {
          // Delete existing roles
          await client.query(
            'DELETE FROM user_roles WHERE user_id = $1',
            [id]
          );

          // Get role IDs
          for (const roleName of updateData.roles) {
            const roleResult = await client.query(
              'SELECT id FROM roles WHERE name = $1',
              [roleName]
            );

            let roleId;
            if (roleResult.rows.length === 0) {
              // Create role if it doesn't exist
              const newRoleResult = await client.query(
                'INSERT INTO roles (id, name, description, created_at, updated_at) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                [uuidv4(), roleName, `${roleName} role`, now, now]
              );
              roleId = newRoleResult.rows[0].id;
            } else {
              roleId = roleResult.rows[0].id;
            }

            // Assign role to user
            await client.query(
              'INSERT INTO user_roles (user_id, role_id, created_at, created_by) VALUES ($1, $2, $3, $4)',
              [id, roleId, now, id]
            );
          }
        }

        // Get updated user
        return this.findById(id);
      } catch (error) {
        console.error('Error updating user:', error);
        throw error;
      }
    });
  }

  /**
   * Update user's last login time
   * @param id User ID
   * @returns Updated user
   */
  async updateLastLogin(id: string): Promise<User | null> {
    try {
      const now = new Date();
      
      await this.db.query(
        'UPDATE users SET last_login = $1 WHERE id = $2',
        [now, id]
      );

      return this.findById(id);
    } catch (error) {
      console.error('Error updating last login:', error);
      throw error;
    }
  }

  /**
   * Delete a user
   * @param id User ID
   * @returns True if user was deleted, false if not found
   */
  async delete(id: string): Promise<boolean> {
    return this.db.transaction(async (client) => {
      try {
        // Delete user roles first (foreign key constraint)
        await client.query(
          'DELETE FROM user_roles WHERE user_id = $1',
          [id]
        );

        // Delete user
        const result = await client.query(
          'DELETE FROM users WHERE id = $1',
          [id]
        );

        return result.rowCount > 0;
      } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
      }
    });
  }
}
