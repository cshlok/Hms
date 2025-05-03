# IPD Module Testing Plan

This document outlines the testing plan for the Inpatient Department (IPD) module of the Hospital Management System (HMS).

## 1. Objectives

- Verify the correct functionality of all IPD API routes.
- Ensure all IPD UI components render correctly and interact as expected.
- Validate the seamless integration of the IPD module with the dashboard and other relevant modules.
- Confirm that Role-Based Access Control (RBAC) is enforced correctly within the IPD module.
- Identify and document any bugs or issues found during testing.

## 2. Scope

This testing plan covers the following components and functionalities of the IPD module:

- **API Routes**:
  - `/api/ipd/beds` (GET)
  - `/api/ipd/admissions` (POST, GET)
  - `/api/ipd/admissions/[id]/progress-notes` (POST, GET)
  - `/api/ipd/admissions/[id]/nursing-notes` (POST, GET)
  - `/api/ipd/admissions/[id]/vital-signs` (POST, GET)
  - `/api/ipd/admissions/[id]/medication-administration` (POST, GET)
  - `/api/ipd/admissions/[id]/discharge` (POST, GET)
  - `/api/dashboard/ipd-stats` (GET)
- **UI Components**:
  - `IPDPage` (Main IPD module page with tabs)
  - `BedManagementDashboard`
  - `IPDPatientList`
  - `AdmissionForm`
  - `PatientProgressNotes`
  - `NursingNotes`
  - `VitalSigns`
  - `MedicationAdministration`
  - `DischargeSummary`
- **Integration Points**:
  - Dashboard statistics (Active Admissions, Available Beds)
  - Dashboard recent admissions list
  - Navigation from Dashboard to IPD module
  - Navigation within the IPD module (tabs, patient details)
- **RBAC**: Access control for different roles (Doctor, Nurse, Admin) for viewing and creating/updating IPD records.

## 3. Testing Approach

Testing will involve a combination of automated and manual testing methods:

- **API Testing**: Use tools like `curl` or write simple test scripts to send requests to each API endpoint with valid and invalid data, different user roles (simulated via session/token), and check responses for status codes, data correctness, and error messages.
- **UI Testing (Manual)**: Manually interact with the IPD UI components in a browser, simulating different user roles. Test form submissions, data display, filtering, navigation, and error handling.
- **Integration Testing**: Verify data consistency between modules (e.g., dashboard stats reflecting IPD data) and smooth navigation flow.
- **RBAC Testing**: Log in as different user roles (Doctor, Nurse, Admin) and verify that permissions are correctly enforced (e.g., only doctors can create discharge summaries, nurses can create nursing notes, etc.).

## 4. Test Cases (High-Level)

### 4.1 API Tests

- **Beds API**: Test fetching beds with/without filters, check response structure.
- **Admissions API**: Test creating new admissions (valid/invalid data), fetching active/all admissions.
- **Progress Notes API**: Test creating notes, fetching notes for an admission, test permissions (only doctors/authorized users).
- **Nursing Notes API**: Test creating notes, fetching notes, test permissions (only nurses/authorized users).
- **Vital Signs API**: Test recording vitals, fetching vitals, test permissions.
- **Medication Admin API**: Test recording administration, fetching records, test permissions.
- **Discharge API**: Test creating discharge summary (valid/invalid data), fetching summary, test permissions (only doctors/authorized users), verify admission/bed status updates.
- **Dashboard Stats API**: Test fetching stats, verify data accuracy.

### 4.2 UI Tests

- **IPD Dashboard**: Verify bed stats display, filtering works, patient list displays correctly, navigation to patient details works.
- **Admission Form**: Test form validation, successful submission, error handling, bed selection reflects availability.
- **Patient Details Tabs**: Test navigation between tabs (Progress Notes, Nursing Notes, Vitals, Meds, Discharge).
- **Progress Notes**: Test SOAP form submission, history display, formatting.
- **Nursing Notes**: Test form submission (including JSON validation), history display, data rendering.
- **Vital Signs**: Test form submission, history display.
- **Medication Admin**: Test medication selection (fetches from pharmacy), form submission, history display.
- **Discharge Summary**: Test form submission, display of existing summary, print functionality (if implemented).

### 4.3 Integration Tests

- Verify dashboard stats update correctly after admission/discharge.
- Verify navigation links in the main layout work correctly for the IPD module.
- Check if patient data is consistent between Patient module and IPD module.

### 4.4 RBAC Tests

- Log in as Nurse: Verify access to Nursing Notes, Vital Signs, Medication Admin; restricted access to Progress Notes (view only?), Discharge Summary (view only?).
- Log in as Doctor: Verify access to Progress Notes, Discharge Summary, view access to other notes/vitals.
- Log in as Admin: Verify full access or appropriate administrative access.
- Test unauthorized access attempts for each role.

## 5. Execution & Reporting

- Execute test cases systematically.
- Document results, including steps to reproduce any bugs found.
- Report bugs and track their resolution.
- Perform regression testing after bug fixes.

## 6. Next Steps (Post-Testing)

- Fix identified bugs.
- Update the GitHub repository with the tested and fixed code.
- Document the IPD module implementation details.

_(Note: Due to limitations, automated API tests and comprehensive manual UI testing cannot be fully performed by the AI. This plan serves as a guide for manual testing or further development of automated tests.)_
