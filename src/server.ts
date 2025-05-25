import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { UserController } from './routes/UserController';
import { SessionManager } from './middleware/SessionManager';
import { errorHandler } from './middleware/ErrorHandler';

// Load environment variables
dotenv.config();

/**
 * Core API framework for the HMS System Infrastructure & Security module
 */
export class ApiServer {
  private app: express.Application;
  private port: number;
  private sessionManager: SessionManager;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3000', 10);
    this.sessionManager = new SessionManager();
    this.configureMiddleware();
    this.configureRoutes();
  }

  /**
   * Configure middleware for the API server
   */
  private configureMiddleware(): void {
    // Basic middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Emergency-Access']
    }));
    
    // Logging middleware
    this.app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
    
    // Session management middleware
    this.app.use(this.sessionManager.handleEmergencyAccess);
    
    // Error handling middleware (applied after routes)
  }

  /**
   * Configure routes for the API server
   */
  private configureRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    
    // API version prefix
    const apiPrefix = '/api/v1';
    
    // User and authentication routes
    const userController = new UserController();
    this.app.use(`${apiPrefix}/auth`, userController.getRouter());
    
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({ message: 'Resource not found' });
    });
    
    // Error handler (must be last)
    this.app.use(errorHandler);
  }

  /**
   * Start the API server
   */
  public start(): void {
    this.app.listen(this.port, () => {
      console.log(`Server running on port ${this.port}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  }

  /**
   * Get the Express application instance
   */
  public getApp(): express.Application {
    return this.app;
  }
}

// Start server if this file is executed directly
if (require.main === module) {
  const server = new ApiServer();
  server.start();
}

export default ApiServer;
