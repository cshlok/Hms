import express from 'express';
import dotenv from 'dotenv';
import { UserController } from './routes/UserController';
import { SessionManager } from './middleware/SessionManager';

// Load environment variables
dotenv.config();

// Create Express application
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add session manager middleware for emergency access
const sessionManager = new SessionManager();
app.use(sessionManager.handleEmergencyAccess);

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Emergency-Access');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Routes
const userController = new UserController();
app.use('/api/auth', userController.getRouter());

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'An unexpected error occurred',
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app;
