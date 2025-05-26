import { Router } from 'express';
import { AuthController } from './AuthController';
import { RbacController } from './RbacController';
import { SecurityController } from './SecurityController';
import { UserController } from './UserController';

/**
 * Main Router for the HMS System Infrastructure & Security module
 * Integrates all security-related controllers
 */
export class SecurityRouter {
  private router: Router;
  private authController: AuthController;
  private rbacController: RbacController;
  private securityController: SecurityController;
  private userController: UserController;

  constructor() {
    this.router = Router();
    this.authController = new AuthController();
    this.rbacController = new RbacController();
    this.securityController = new SecurityController();
    this.userController = new UserController();
    
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Mount controllers
    this.router.use('/auth', this.authController.getRouter());
    this.router.use('/rbac', this.rbacController.getRouter());
    this.router.use('/security', this.securityController.getRouter());
    this.router.use('/users', this.userController.getRouter());
  }

  getRouter(): Router {
    return this.router;
  }
}
