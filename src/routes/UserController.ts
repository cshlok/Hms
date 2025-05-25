import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticationService } from '../services/AuthenticationService';
import { CreateUserDto, UpdateUserDto, UserStatus } from '../models/User';
import { SessionManager } from '../middleware/SessionManager';

// Mock database for now - will be replaced with actual database integration
const users: any[] = [];

export class UserController {
  private router: Router;
  private authService: AuthenticationService;
  private sessionManager: SessionManager;

  constructor() {
    this.router = Router();
    this.authService = new AuthenticationService();
    this.sessionManager = new SessionManager();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Public routes
    this.router.post('/login', this.login);
    this.router.post('/refresh-token', this.refreshToken);
    
    // Protected routes
    this.router.post('/users', this.sessionManager.authenticate, this.sessionManager.authorize(['admin']), this.createUser);
    this.router.get('/users', this.sessionManager.authenticate, this.sessionManager.authorize(['admin']), this.getAllUsers);
    this.router.get('/users/:id', this.sessionManager.authenticate, this.getUser);
    this.router.put('/users/:id', this.sessionManager.authenticate, this.updateUser);
    this.router.delete('/users/:id', this.sessionManager.authenticate, this.sessionManager.authorize(['admin']), this.deleteUser);
  }

  getRouter(): Router {
    return this.router;
  }

  /**
   * Login user and generate tokens
   */
  private login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        res.status(400).json({ message: 'Username and password are required' });
        return;
      }
      
      // Find user in mock database
      const user = users.find(u => u.username === username);
      
      if (!user) {
        res.status(401).json({ message: 'Invalid credentials' });
        return;
      }
      
      // Verify password
      const isPasswordValid = await this.authService.verifyPassword(password, user.password);
      
      if (!isPasswordValid) {
        res.status(401).json({ message: 'Invalid credentials' });
        return;
      }
      
      // Check if user is active
      if (user.status !== UserStatus.ACTIVE) {
        res.status(403).json({ message: `Account is ${user.status}` });
        return;
      }
      
      // Generate tokens
      const tokens = this.authService.generateTokens(user);
      
      // Update last login
      user.lastLogin = new Date();
      
      res.status(200).json({
        user: this.authService.prepareUserResponse(user),
        ...tokens
      });
    } catch (error) {
      res.status(500).json({ message: 'Login failed', error: (error as Error).message });
    }
  };

  /**
   * Refresh access token using refresh token
   */
  private refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken, userId } = req.body;
      
      if (!refreshToken || !userId) {
        res.status(400).json({ message: 'Refresh token and user ID are required' });
        return;
      }
      
      // Find user in mock database
      const user = users.find(u => u.id === userId);
      
      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }
      
      // Generate new tokens
      const tokens = this.authService.refreshTokens(refreshToken, user);
      
      if (!tokens) {
        res.status(401).json({ message: 'Invalid or expired refresh token' });
        return;
      }
      
      res.status(200).json(tokens);
    } catch (error) {
      res.status(500).json({ message: 'Token refresh failed', error: (error as Error).message });
    }
  };

  /**
   * Create a new user
   */
  private createUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const userData: CreateUserDto = req.body;
      
      // Validate required fields
      if (!userData.username || !userData.email || !userData.password || !userData.firstName || !userData.lastName) {
        res.status(400).json({ message: 'Missing required fields' });
        return;
      }
      
      // Check if username or email already exists
      const existingUser = users.find(u => u.username === userData.username || u.email === userData.email);
      
      if (existingUser) {
        res.status(409).json({ message: 'Username or email already exists' });
        return;
      }
      
      // Prepare new user
      const newUserData = await this.authService.prepareNewUser(userData);
      const newUser = {
        id: uuidv4(),
        ...newUserData
      };
      
      // Save to mock database
      users.push(newUser);
      
      res.status(201).json(this.authService.prepareUserResponse(newUser));
    } catch (error) {
      res.status(500).json({ message: 'User creation failed', error: (error as Error).message });
    }
  };

  /**
   * Get all users (admin only)
   */
  private getAllUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      // Return users without sensitive information
      const safeUsers = users.map(user => this.authService.prepareUserResponse(user));
      res.status(200).json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: 'Failed to retrieve users', error: (error as Error).message });
    }
  };

  /**
   * Get user by ID
   */
  private getUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      // Find user in mock database
      const user = users.find(u => u.id === id);
      
      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }
      
      // Check if requesting user has permission to view this user
      if (req.user!.id !== id && !req.user!.roles.includes('admin')) {
        res.status(403).json({ message: 'Insufficient permissions' });
        return;
      }
      
      res.status(200).json(this.authService.prepareUserResponse(user));
    } catch (error) {
      res.status(500).json({ message: 'Failed to retrieve user', error: (error as Error).message });
    }
  };

  /**
   * Update user by ID
   */
  private updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData: UpdateUserDto = req.body;
      
      // Find user in mock database
      const userIndex = users.findIndex(u => u.id === id);
      
      if (userIndex === -1) {
        res.status(404).json({ message: 'User not found' });
        return;
      }
      
      // Check if requesting user has permission to update this user
      const isAdmin = req.user!.roles.includes('admin');
      const isSelf = req.user!.id === id;
      
      if (!isAdmin && !isSelf) {
        res.status(403).json({ message: 'Insufficient permissions' });
        return;
      }
      
      // Non-admins can only update their own profile and cannot change roles or status
      if (!isAdmin && isSelf) {
        delete updateData.roles;
        delete updateData.status;
      }
      
      // Update user
      const updatedUser = {
        ...users[userIndex],
        ...updateData,
        updatedAt: new Date()
      };
      
      users[userIndex] = updatedUser;
      
      res.status(200).json(this.authService.prepareUserResponse(updatedUser));
    } catch (error) {
      res.status(500).json({ message: 'User update failed', error: (error as Error).message });
    }
  };

  /**
   * Delete user by ID (admin only)
   */
  private deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      // Find user in mock database
      const userIndex = users.findIndex(u => u.id === id);
      
      if (userIndex === -1) {
        res.status(404).json({ message: 'User not found' });
        return;
      }
      
      // Remove user from mock database
      users.splice(userIndex, 1);
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'User deletion failed', error: (error as Error).message });
    }
  };
}
