# IPD Module Manual UI & Integration Test Cases

This document outlines manual test cases for the IPD module UI and its integration with other HMS components, based on the `ipd_testing_plan.md`.

**Testing Environment:** Browser (Chrome/Firefox recommended)
**User Roles:** Admin, Doctor, Nurse (Log in as each role for RBAC tests)

## 1. IPD Dashboard & Navigation (All Roles)

- **Test Case 1.1:** Navigate to Dashboard.
  - **Expected:** Dashboard loads, IPD stats (Active Admissions, Available Beds) are displayed.
  - **Expected:** Recent Admissions list shows IPD patients.
- **Test Case 1.2:** Click 'View IPD' or 'Bed Management' button on Dashboard.
  - **Expected:** User is navigated to the `/ipd` page.
- **Test Case 1.3:** Click 'IPD' in the sidebar navigation.
  - **Expected:** User is navigated to the `/ipd` page, IPD module is highlighted in the sidebar.
- **Test Case 1.4:** On `/ipd` page, verify default view.
  - **Expected:** 'Dashboard' tab is active, showing Bed Management and Current Inpatients sections.

## 2. Bed Management (Admin/Nurse Role)

- **Test Case 2.1:** View Bed Management dashboard.
  - **Expected:** Bed layout/list is displayed with correct status indicators (Available, Occupied, Maintenance).
- **Test Case 2.2:** Filter beds by status (Available, Occupied).
  - **Expected:** Bed list updates correctly based on the filter.
- **Test Case 2.3:** Filter beds by ward.
  - **Expected:** Bed list updates correctly based on the filter.

## 3. Admission Process (Admin/Receptionist/Nurse Role)

- **Test Case 3.1:** Navigate to 'New Admission' tab.
  - **Expected:** Admission form is displayed.
- **Test Case 3.2:** Fill admission form with invalid data (missing required fields).
  - **Expected:** Validation errors are shown, form submission fails.
- **Test Case 3.3:** Fill admission form with valid data.
  - **Expected:** Patient search works, available beds list is populated.
- **Test Case 3.4:** Select an available bed and submit the form.
  - **Expected:** Success message is shown, user is redirected or list updates.
- **Test Case 3.5:** Verify new admission appears in 'Current Inpatients' list.
  - **Expected:** Patient is listed with correct details.
- **Test Case 3.6:** Verify the selected bed status changes to 'Occupied' in Bed Management.
  - **Expected:** Bed status is updated.

## 4. Inpatient Details View (All Roles - Check RBAC)

- **Test Case 4.1:** Click 'View Details' for an inpatient in the list.
  - **Expected:** User is navigated to the 'Patient Details' tab, showing patient info and sub-tabs (Progress Notes, Nursing Notes, etc.).
- **Test Case 4.2:** Navigate between sub-tabs (Progress Notes, Nursing Notes, Vitals, Meds, Discharge).
  - **Expected:** Content updates correctly for each tab.

## 5. Progress Notes (Doctor Role)

- **Test Case 5.1:** View Progress Notes tab.
  - **Expected:** History of progress notes is displayed.
- **Test Case 5.2:** Fill SOAP note form with valid data.
  - **Expected:** Form submits successfully, new note appears in history.
- **Test Case 5.3:** Attempt to submit with missing required fields.
  - **Expected:** Validation errors are shown.
- **Test Case 5.4 (RBAC):** Log in as Nurse. Attempt to create Progress Note.
  - **Expected:** Creation form is disabled or submission fails with permission error.

## 6. Nursing Notes (Nurse Role)

- **Test Case 6.1:** View Nursing Notes tab.
  - **Expected:** History of nursing notes is displayed.
- **Test Case 6.2:** Fill nursing note form with valid data (including JSON structure if applicable).
  - **Expected:** Form submits successfully, new note appears in history.
- **Test Case 6.3:** Attempt to submit with invalid data.
  - **Expected:** Validation errors are shown.
- **Test Case 6.4 (RBAC):** Log in as Doctor. Attempt to create Nursing Note.
  - **Expected:** Creation form is disabled or submission fails with permission error.

## 7. Vital Signs (Nurse Role)

- **Test Case 7.1:** View Vital Signs tab.
  - **Expected:** History of vital signs is displayed (table/graph).
- **Test Case 7.2:** Record new vital signs with valid data.
  - **Expected:** Form submits successfully, new record appears in history.
- **Test Case 7.3:** Attempt to submit with invalid data (e.g., non-numeric values).
  - **Expected:** Validation errors are shown.

## 8. Medication Administration (Nurse Role)

- **Test Case 8.1:** View Medications tab.
  - **Expected:** History of administered medications is displayed.
- **Test Case 8.2:** Verify medication dropdown loads items from Pharmacy inventory.
  - **Expected:** Dropdown is populated with available medications.
- **Test Case 8.3:** Record medication administration with valid data.
  - **Expected:** Form submits successfully, new record appears in history.
- **Test Case 8.4:** Attempt to submit with missing required fields.
  - **Expected:** Validation errors are shown.

## 9. Discharge Summary (Doctor Role)

- **Test Case 9.1:** View Discharge tab for a patient not yet discharged.
  - **Expected:** Discharge summary creation form is displayed.
- **Test Case 9.2:** Fill discharge summary form with valid data.
  - **Expected:** Form submits successfully, success message shown, patient status updates to 'discharged'.
- **Test Case 9.3:** Attempt to submit with missing required fields.
  - **Expected:** Validation errors are shown.
- **Test Case 9.4:** View Discharge tab for a discharged patient.
  - **Expected:** Completed discharge summary is displayed (read-only view).
- **Test Case 9.5:** Verify discharged patient is removed from 'Current Inpatients' list.
  - **Expected:** Patient is no longer listed as active.
- **Test Case 9.6:** Verify the patient's bed status changes to 'Available' or 'Cleaning'.
  - **Expected:** Bed status is updated in Bed Management.
- **Test Case 9.7 (RBAC):** Log in as Nurse. Attempt to create Discharge Summary.
  - **Expected:** Creation form is disabled or submission fails with permission error.

## 10. Integration & Data Consistency

- **Test Case 10.1:** Admit a patient via IPD. Check if patient record exists/updates in the main Patient module.
  - **Expected:** Patient data is consistent.
- **Test Case 10.2:** Discharge a patient. Check if bed status updates correctly on the main dashboard IPD stats.
  - **Expected:** Available beds count updates.
- **Test Case 10.3:** Check if billing is triggered or updated upon admission/discharge (if Billing module integration is implemented).
  - **Expected:** Relevant billing entries are created/updated.

_(Note: These are manual test cases. Execution requires logging in with different user credentials and interacting with the application interface.)_
