# HMS Repository Architecture Analysis

## Repository Structure Overview

The Hospital Management System (HMS) repository follows a well-organized modular structure that aligns with modern Next.js application development practices. The repository is structured to support a comprehensive enterprise-grade healthcare system with clear separation of concerns and modular components.

### Top-Level Structure

The repository contains the following key directories and files:

- **src/**: Contains the main application code
- **apps/**: Contains additional applications or services
- **prisma/**: Contains database schema and migration files
- **public/**: Contains static assets
- **tests/**: Contains test files
- **.github/**: Contains GitHub workflows and CI/CD configurations
- **Configuration files**: Various configuration files for TypeScript, ESLint, Prettier, Jest, and Next.js

### Source Code Organization

The `src` directory follows a well-structured organization:

- **app/**: Contains Next.js App Router pages and API routes
- **components/**: Contains reusable UI components
- **hooks/**: Contains custom React hooks
- **lib/**: Contains utility functions and libraries
- **repositories/**: Contains data access layer implementations
- **services/**: Contains business logic implementations
- **types/**: Contains TypeScript type definitions
- **billing/**: Contains billing-specific implementations
- **middleware.ts**: Contains Next.js middleware configurations

### API Structure

The API routes are organized in a RESTful manner under `src/app/api/` with separate directories for each functional module:

- **appointments/**: Appointment management endpoints
- **auth/**: Authentication and authorization endpoints
- **billing/**: Billing and financial endpoints
- **consultations/**: Consultation management endpoints
- **dashboard/**: Dashboard data endpoints
- **doctors/**: Doctor management endpoints
- **er/**: Emergency room management endpoints
- **insurance/**: Insurance management endpoints
- **ipd/**: Inpatient department endpoints
- **laboratory/**: Laboratory management endpoints
- **opd/**: Outpatient department endpoints
- **ot/**: Operation theater endpoints
- **patients/**: Patient management endpoints
- **pharmacy/**: Pharmacy management endpoints
- **radiology/**: Radiology management endpoints
- **session/**: Session management endpoints

This structure indicates that our new Support Services Management module should be placed under `src/app/api/support/` with appropriate submodules for housekeeping, maintenance, dietary, ambulance, feedback, and marketing.

### Database Schema

The database schema is defined using Prisma ORM in the `prisma/schema.prisma` file. The schema follows a well-structured approach with:

- **Clear model definitions**: Each entity is defined as a Prisma model with appropriate fields and relationships
- **Enum types**: Used for status fields and other enumerated values
- **Relationships**: Defined using Prisma's relation fields
- **Timestamps**: Consistent use of `createdAt` and `updatedAt` fields
- **IDs**: Consistent use of CUID as the primary key generator

The existing models include:
- User and authentication models (User, Role, Permission)
- Patient model
- Laboratory models (LabTestItem, LabOrder, LabReport)
- Radiology models (RadiologyProcedure, RadiologyRequest, RadiologyReport)
- Audit logging model (AuditLog)

Our Support Services Management module will need to extend this schema with new models for housekeeping, maintenance, dietary, ambulance, feedback, and marketing CRM functionalities.

### Architectural Patterns

Based on the repository structure and code organization, the following architectural patterns are evident:

1. **Modular Architecture**: The codebase is organized into functional modules, each with its own set of components, services, and API endpoints.

2. **Repository Pattern**: The presence of a `repositories` directory suggests the use of the repository pattern for data access, separating business logic from data access concerns.

3. **Service Layer Pattern**: The `services` directory indicates a service layer that encapsulates business logic and orchestrates operations across repositories.

4. **API-First Design**: The structured API directories suggest an API-first approach, with well-defined endpoints for each functional area.

5. **Role-Based Access Control**: The User, Role, and Permission models indicate a role-based access control system for security.

6. **Audit Logging**: The AuditLog model suggests a comprehensive audit logging system for tracking changes and actions.

7. **Status-Based Workflow**: The use of status enums in various models indicates status-based workflow management for processes like lab orders and radiology requests.

### Technology Stack

The repository uses a modern technology stack:

- **Frontend**: Next.js 15 with App Router, React 19, TypeScript
- **UI Components**: shadcn/ui components with Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: PostgreSQL (configured for SQLite in development) with Prisma ORM
- **Authentication**: Likely JWT-based with role-based access control
- **Testing**: Jest for unit and integration testing

### Coding Standards

The repository enforces coding standards through:

- **TypeScript**: Strong typing with TypeScript
- **ESLint**: Code quality and style enforcement
- **Prettier**: Code formatting
- **Jest**: Testing framework
- **GitHub Actions**: CI/CD workflows

## Implementation Considerations for Support Services Management

Based on the architectural analysis, the Support Services Management module should:

1. **Follow Modular Structure**: Create a dedicated directory under `src/app/api/support/` with submodules for each functional area.

2. **Extend Database Schema**: Add new models to the Prisma schema for housekeeping, maintenance, dietary, ambulance, feedback, and marketing CRM.

3. **Implement Repository Pattern**: Create repositories for data access in the `repositories` directory.

4. **Implement Service Layer**: Create services for business logic in the `services` directory.

5. **Define API Endpoints**: Implement RESTful API endpoints following the existing patterns.

6. **Ensure Security**: Implement role-based access control and audit logging.

7. **Add Comprehensive Testing**: Write unit, integration, and end-to-end tests.

8. **Document API**: Create OpenAPI/Swagger documentation for all endpoints.

This architectural analysis provides a solid foundation for implementing the Support Services Management module in a way that is consistent with the existing codebase and meets the enterprise-grade requirements specified in the project brief.
