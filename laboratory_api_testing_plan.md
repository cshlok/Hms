# Laboratory Management (LIS) API Testing Plan

## Overview
This document outlines the testing plan for the API endpoints of the Laboratory Management System (LIS) module. The goal is to ensure the backend functionality is correct, secure, and performs as expected before implementing the UI components.

## Testing Scope

### In Scope
- API endpoints for LIS module:
  - `/api/laboratory/categories` (GET, POST)
  - `/api/laboratory/tests` (GET, POST)
  - `/api/laboratory/orders` (GET, POST)
  - `/api/laboratory/samples` (GET, POST - create/update)
  - `/api/laboratory/results` (GET, POST - create/update)
- Authentication and Authorization (Role-Based Access Control)
- Data validation for request bodies
- Correct database interactions (CRUD operations)
- Transaction handling in complex operations (e.g., order creation)
- Error handling and appropriate status codes

### Out of Scope
- UI component testing (will be covered separately)
- Performance/Load testing
- Security vulnerability scanning (beyond basic RBAC checks)
- Integration testing with external systems (e.g., HL7 interfaces)

## Testing Approach
- **Automated Testing**: Use a testing framework (e.g., Jest, Mocha with Supertest) to write automated API tests.
- **Test Data**: Prepare seed data or use dynamic data creation within tests.
- **Authentication**: Simulate different user roles (admin, lab_manager, lab_technician, doctor, patient) to test RBAC.
- **Assertions**: Verify response status codes, response body structure, and data correctness against the database.

## Test Cases

### 1. Categories API (`/api/laboratory/categories`)
  - **GET /**
    - Test fetching all categories (authenticated user).
    - Test unauthorized access (unauthenticated user).
  - **POST /**
    - Test creating a new category (admin/lab_manager).
    - Test creating a category with missing name (expect 400).
    - Test creating a category with unauthorized role (e.g., doctor, expect 403).
    - Test creating a category with valid data (expect 201 and correct response body).

### 2. Tests API (`/api/laboratory/tests`)
  - **GET /**
    - Test fetching all tests (authenticated user).
    - Test filtering by category ID.
    - Test filtering by `isActive` status.
    - Test unauthorized access (unauthenticated user).
  - **POST /**
    - Test creating a new test (admin/lab_manager).
    - Test creating a test with missing required fields (expect 400).
    - Test creating a test with unauthorized role (e.g., technician, expect 403).
    - Test creating a test with valid data (expect 201 and correct response body).

### 3. Orders API (`/api/laboratory/orders`)
  - **GET /**
    - Test fetching all orders (admin/lab_manager).
    - Test fetching orders for a specific patient.
    - Test filtering by status, source, date range.
    - Test fetching orders for a specific doctor (doctor role).
    - Test unauthorized access (unauthenticated user).
    - Test forbidden access (patient trying to access other patient's orders).
  - **POST /**
    - Test creating a new order with a single test (doctor/lab staff).
    - Test creating a new order with a panel.
    - Test creating an order with multiple items.
    - Test creating an order with missing required fields (patient_id, source, items, expect 400).
    - Test creating an order with invalid item structure (expect 400/500).
    - Test creating an order with unauthorized role (e.g., patient, expect 403).
    - Test creating an order with `create_sample` flag (verify sample creation).
    - Test transaction rollback on item error (e.g., invalid test_id).
    - Test creating an order with valid data (expect 201 and correct response body).

### 4. Samples API (`/api/laboratory/samples`)
  - **GET /**
    - Test fetching all samples (lab staff/admin).
    - Test filtering by order ID, barcode, status.
    - Test unauthorized access (unauthenticated user).
    - Test forbidden access (e.g., doctor).
  - **POST /** (Create/Update)
    - Test creating a new sample (lab staff/admin, expect 201).
    - Test updating sample status (e.g., pending -> collected -> received).
    - Test updating status to 'collected' (verify collector/timestamp).
    - Test updating status to 'received' (verify receiver/timestamp).
    - Test updating status to 'rejected' without reason (expect 400).
    - Test updating status to 'rejected' with reason.
    - Test updating non-existent sample (expect 404).
    - Test updating sample with unauthorized role (e.g., doctor, expect 403).
    - Test creating/updating with valid data (expect 200/201 and correct response body).

### 5. Results API (`/api/laboratory/results`)
  - **GET /**
    - Test fetching results for an order (lab staff/admin/doctor).
    - Test fetching results for a specific order item.
    - Test fetching results for a patient (patient role, verify only own results).
    - Test unauthorized access (unauthenticated user).
    - Test forbidden access (patient trying to access other patient's results).
  - **POST /** (Create/Update)
    - Test creating a new result (lab staff/admin).
    - Test creating a result for a test with parameters.
    - Test creating a result for a test without parameters.
    - Test creating a result with missing required fields (expect 400).
    - Test creating a result for non-existent order item (expect 404).
    - Test creating a result with invalid parameter ID (expect 400).
    - Test creating a result that completes an order item (verify item status update).
    - Test creating the last result for an order (verify order status update and report creation).
    - Test updating an existing result (value, notes, is_abnormal).
    - Test verifying a result (pathologist/lab_manager, verify verifier/timestamp).
    - Test verifying a result with unauthorized role (e.g., technician, expect 403).
    - Test updating non-existent result (expect 404).
    - Test creating/updating with unauthorized role (e.g., doctor, expect 403).
    - Test creating/updating with valid data (expect 200/201 and correct response body).

## Test Environment
- **Database**: Use a separate test database or ensure proper data cleanup after tests.
- **Framework**: Node.js with Jest and Supertest.
- **Authentication**: Mock session data for different user roles.

## Reporting
- Test execution results will be logged.
- A summary report will be generated detailing passed/failed tests and any identified defects.
- Defects will be tracked in an issue tracker (if applicable).
