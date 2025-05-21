# HMS Technical Documentation

**Version:** 1.0
**Date:** May 13, 2025

## 1. Introduction

This document provides comprehensive technical documentation for the Hospital Management System (HMS) modules, specifically focusing on the Billing and Insurance features. It covers the system architecture, module details, API contracts, testing procedures, automation strategies, and security measures implemented.

This documentation is intended for developers, QA engineers, system administrators, and other technical stakeholders involved in the development, deployment, and maintenance of the HMS.

## 2. System Architecture

The HMS is designed with a modular architecture to ensure scalability, maintainability, and separation of concerns. The core components relevant to this document are the Billing and Insurance modules.

For a detailed overview of the Billing and Insurance module architecture, please refer to the [Billing and Insurance Architecture Document](./billing_insurance_architecture.md).

Key architectural principles include:
*   **Service-Oriented Design:** Functionality is encapsulated within services.
*   **API-Driven:** Modules interact through well-defined APIs.
*   **Enterprise-Grade Standards:** Adherence to best practices for coding, security, and testing.

## 3. Module Details

This section details the implementation of the Billing and Insurance modules.

### 3.1. Billing Module

The Billing module handles all financial transactions related to patient services, including charge capture, invoice generation, payment processing, and accounts receivable management.

**Services Implemented:**
*   `ChargeCaptureService.ts`: Manages the creation, retrieval, and validation of service charges.
*   `InvoiceService.ts`: Responsible for generating patient invoices from outstanding charges.
*   `PaymentService.ts`: Handles processing of payments against invoices and managing refunds.
*   `AccountsReceivableService.ts`: Manages outstanding balances, aging reports, and follow-ups on delinquent accounts.

**API Endpoints:**
*   `/api/billing/charges`: Endpoints for managing charges (CRUD operations).
*   `/api/billing/invoices`: Endpoints for managing invoices (generation, retrieval).
*   `/api/billing/payments`: Endpoints for processing payments and refunds.
*   `/api/billing/accounts`: Endpoints for accounts receivable information (outstanding balances, aging reports).

*(Detailed API contracts, including request/response schemas and authentication requirements, will be provided in a separate OpenAPI/Swagger specification or a dedicated API documentation section below.)*

### 3.2. Insurance Module

The Insurance module manages patient insurance policies, eligibility checks, and claim processing with Third-Party Administrators (TPAs).

**Services Implemented:**
*   `InsurancePolicyService.ts`: Manages patient insurance policy information (CRUD operations).
*   `EligibilityCheckService.ts`: Handles real-time or batch eligibility verification with payers/TPAs.
*   `ClaimProcessingService.ts`: Manages the submission of claims to payers/TPAs and tracks their status.

**API Endpoints:**
*   `/api/insurance/policies`: Endpoints for managing insurance policies.
*   `/api/insurance/eligibility`: Endpoints for checking patient eligibility.
*   `/api/insurance/claims`: Endpoints for submitting and tracking claims.

*(Detailed API contracts will be provided separately or below.)*

## 4. Testing Strategy and Implementation

A comprehensive testing strategy has been implemented to ensure the quality, reliability, and robustness of the HMS modules. This aligns with the [Enterprise-Grade Testing, Automation, and Security Plan (Updated 2025)](./testing_automation_security_plan.md).

**Key Aspects:**
*   **Testing Framework:** Jest is used as the primary testing framework, with `ts-jest` for TypeScript support.
*   **Test Types:** Unit tests, integration tests. (E2E, Performance tests are planned as per the strategy document).
*   **Test Location:** Unit tests for services are located in `__tests__` subdirectories within the respective service folders (e.g., `src/features/billing/services/__tests__/`).

**Running Tests:**
To execute all tests and generate a coverage report, navigate to the `apps/hms-web/` directory and run:
```bash
npm test
# or
npx jest --coverage
```
Coverage reports are generated in the `coverage/` directory within `apps/hms-web/`.

**Test Suites Implemented (Examples):**
*   `ChargeCaptureService.test.ts`
*   `InvoiceService.test.ts`
*   `PaymentService.test.ts`
*   `AccountsReceivableService.test.ts`
*   `InsurancePolicyService.test.ts`
*   `EligibilityCheckService.test.ts`
*   `ClaimProcessingService.test.ts`

These test suites provide foundational coverage for the core service logic. Further expansion will cover more edge cases and integration scenarios.

## 5. Automation

Automation is a key component of the development and deployment lifecycle, as outlined in the [Enterprise-Grade Testing, Automation, and Security Plan (Updated 2025)](./testing_automation_security_plan.md).

**Current Automation:**
*   **Automated Testing:** Unit and integration tests are designed to be run automatically (e.g., via npm scripts, and intended for CI/CD pipelines).
*   **Linting and Formatting:** (Assumed to be set up with Prettier/ESLint as per enterprise standards - to be confirmed and documented if specific setup exists).

**Planned Automation (CI/CD):**
The strategy includes setting up a full CI/CD pipeline with stages for linting, static analysis, automated testing (unit, integration, security), building artifacts, and deployment to various environments.

## 6. Security Measures

Security is integral to the HMS, with measures implemented according to the [Enterprise-Grade Testing, Automation, and Security Plan (Updated 2025)](./testing_automation_security_plan.md).

**Key Security Practices Implemented/Planned:**
*   **Authentication and Authorization:** Robust mechanisms are planned (e.g., OAuth 2.0, JWT, RBAC).
*   **Data Protection:** Encryption of sensitive data at rest and in transit.
*   **Input Validation:** Server-side validation for all API inputs.
*   **Dependency Management:** Regular scanning for vulnerabilities (e.g., using `npm audit`). To run a manual check:
    ```bash
    npm audit
    ```
*   **Secure Coding Practices:** Adherence to OWASP guidelines.
*   **API Security:** Use of API gateways, secure API keys (planned).

## 7. API Contract Details (Placeholder)

*(This section will be expanded with detailed API endpoint specifications. For now, refer to the route files in `apps/hms-web/src/pages/api/` and `apps/hms-web/src/features/*/api/` for implementation details.)*

**Example: Charge Creation**
*   **Endpoint:** `POST /api/billing/charges`
*   **Request Body:**
    ```json
    {
      "patientId": "string",
      "serviceId": "string",
      "amount": "number",
      "dateOfService": "ISO8601_Date_String",
      "providerId": "string",
      "notes": "string (optional)"
    }
    ```
*   **Response (Success 201):**
    ```json
    {
      "id": "string (charge_id)",
      "patientId": "string",
      "serviceId": "string",
      "amount": "number",
      "dateOfService": "ISO8601_Date_String",
      "providerId": "string",
      "status": "string (e.g., 'pending_invoice')",
      "createdAt": "ISO8601_Date_String",
      "updatedAt": "ISO8601_Date_String"
    }
    ```
*   **Response (Error 400/500):** Standard error object.

## 8. Future Enhancements

This section will outline planned future enhancements, including the adoption of more advanced AI in testing, full CI/CD implementation, and expanded module functionalities.

## 9. Document History

| Version | Date       | Author      | Changes                                     |
|---------|------------|-------------|---------------------------------------------|
| 1.0     | 2025-05-13 | Manus Agent | Initial draft of technical documentation.   |


