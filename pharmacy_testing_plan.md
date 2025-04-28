# Pharmacy Module Testing Plan

This document outlines the testing strategy for the Pharmacy Management module of the Shlokam Hospital Management System.

## 1. Objectives

- Verify the correctness and completeness of the Pharmacy module API routes.
- Ensure the Pharmacy UI components function as expected and match the design.
- Validate the integration points between the Pharmacy module and OPD, IPD, and Billing modules.
- Confirm that data flows correctly between modules (e.g., prescriptions from OPD/IPD to Pharmacy, dispensing records to Billing).
- Ensure Role-Based Access Control (RBAC) is correctly applied within the Pharmacy module.

## 2. Scope

### In Scope:

- **API Routes:**
  - `/api/pharmacy/inventory`: CRUD operations for inventory items (batches).
  - `/api/pharmacy/medications`: CRUD operations for medication definitions.
  - `/api/pharmacy/prescriptions`: Fetching and potentially creating/updating prescriptions.
  - `/api/pharmacy/dispensing`: Recording medication dispensing events.
- **UI Components:**
  - Pharmacy Dashboard (`/pharmacy`)
  - Inventory Management (`/pharmacy/inventory`, `/pharmacy/inventory/add`)
  - Medication Management (`/pharmacy/medications`, `/pharmacy/medications/add`)
  - Prescription Processing (View, Dispense)
  - Dispensing Workflow
- **Integrations:**
  - OPD Prescribing (`OPDPharmacyIntegration`)
  - IPD Medication Administration (`IPDPharmacyIntegration` - MAR)
  - Billing Integration (`BillingPharmacyIntegration`)

### Out of Scope (for this iteration):

- Advanced inventory features (e.g., stock alerts, expiry management automation).
- Complex drug interaction checks (beyond basic flags).
- Direct integration with external suppliers.
- Performance and load testing.

## 3. Testing Approach

- **API Testing:** Use automated tests (e.g., using Jest or a similar framework) to verify the functionality of each API endpoint. Focus on CRUD operations, input validation, and error handling.
- **UI Testing:** Primarily manual testing based on defined test cases. Focus on user workflows, usability, and visual consistency.
- **Integration Testing:** Manual testing focusing on the data flow and interactions between the Pharmacy module and OPD, IPD, and Billing modules.

## 4. Test Cases

### 4.1 API Test Cases (Automated - See `tests/api/pharmacy-api-tests.js`)

- **Inventory:** Create, Read, Update, Delete inventory batches. Test validation (e.g., required fields, quantity checks).
- **Medications:** Create, Read, Update, Delete medication definitions. Test validation.
- **Prescriptions:** Fetch prescriptions by patient ID, status. Test filtering.
- **Dispensing:** Create dispensing records. Test validation (e.g., sufficient stock, valid prescription).

### 4.2 UI Test Cases (Manual - See `tests/ui/pharmacy-manual-tests.md`)

- **Inventory Management:**
  - Add new inventory batch (GRN).
  - View inventory list (search, filter, sort).
  - View batch details.
  - Adjust stock levels (manual adjustment - if implemented).
- **Medication Management:**
  - Add new medication definition.
  - View medication list (search, filter, sort).
  - View medication details.
- **Prescription Processing:**
  - View pending prescriptions.
  - Select prescription for dispensing.
  - Verify medication details and availability.
- **Dispensing Workflow:**
  - Select batch for dispensing.
  - Enter quantity dispensed.
  - Confirm dispensing.
  - Verify stock deduction.
  - Verify dispensing record creation.
- **OPD Integration:**
  - Open prescription section in OPD consultation.
  - Search and add medications.
  - Enter dosage, frequency, duration.
  - Create prescription.
  - Verify prescription appears in Pharmacy module.
- **IPD Integration (MAR):**
  - View scheduled medications in MAR.
  - Record medication administration.
  - Verify administration record creation.
  - Verify status update in MAR.
- **Billing Integration:**
  - View unbilled pharmacy items in Billing module.
  - Select items for billing.
  - Generate pharmacy bill.
  - Verify items are marked as billed.
  - Verify bill details.

## 5. Test Environment

- Local development environment using `wrangler dev`.
- Cloudflare D1 database (local).
- Browser: Latest Chrome/Firefox.

## 6. Reporting

- Automated test results will be logged.
- Manual test results will be documented in `tests/ui/pharmacy-manual-tests.md`.
