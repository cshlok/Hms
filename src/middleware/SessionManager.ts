import { Request, Response, NextFunction } from 'express';
import { AuthenticationService } from '../services/AuthenticationService';

/**
 * Session management middleware for the HMS System Infrastructure & Security module
 */
export class SessionManager {
  private authService: AuthenticationService;

  constructor() {
    this.authService = new AuthenticationService();
  }

  /**
   * Middleware to authenticate requests using JWT
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }
      
      const token = authHeader.split(' ')[1];
      const payload = this.authService.verifyToken(token);
      
      if (!payload) {
        res.status(401).json({ message: 'Invalid or expired token' });
        return;
      }
      
      // Attach user information to request for use in route handlers
      req.user = {
        id: payload.userId,
        username: payload.username,
        roles: payload.roles
      };
      
      next();
    } catch (error) {
      res.status(500).json({ message: 'Authentication error', error: (error as Error).message });
    }
  };

  /**
   * Middleware to check if user has required roles
   * @param requiredRoles Roles required to access the resource
   */
  authorize = (requiredRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }
      
      const hasRequiredRole = requiredRoles.some(role => req.user!.roles.includes(role));
      
      if (!hasRequiredRole) {
        res.status(403).json({ message: 'Insufficient permissions' });
        return;
      }
      
      next();
    };
  };

  /**
   * Middleware to handle emergency access ("break-glass")
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  handleEmergencyAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const emergencyToken = req.headers['x-emergency-access'] as string;
      
      if (!emergencyToken) {
        next();
        return;
      }
      
      // In a real implementation, validate emergency token against database
      // and check if emergency access is justified
      
      // For now, just log the emergency access attempt
      console.log(`Emergency access attempt: ${new Date().toISOString()}`);
      
      // Attach emergency flag to request
      req.emergencyAccess = true;
      
      next();
    } catch (error) {
      res.status(500).json({ message: 'Emergency access error', error: (error as Error).message });
    }
  };
}

// Extend Express Request interface to include user and emergency access
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        roles: string[];
      };
      emergencyAccess?: boolean;
    }
  }
}
