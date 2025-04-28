# Emergency Department (ER) Module Documentation

## 1. Overview

The Emergency Department (ER) module is designed to manage patient flow, triage, assessment, treatment, and disposition within the hospital's emergency services. It aims to improve efficiency, patient safety, and communication during emergency care.

## 2. Key Features

*   **Patient Registration:** Integration with the main patient registration system allows searching for existing patients or registering new ones directly within the ER workflow.
*   **Triage:** Implements the 5-level Emergency Severity Index (ESI) protocol for rapid patient acuity assessment.
*   **Patient Tracking Board:** Real-time, dynamic visualization of all ER patients, including location, status, acuity (ESI level), wait times, assigned staff, and key clinical indicators (labs, radiology, alerts).
*   **Clinical Documentation:** (Partially implemented - requires further development for full charting) Basic triage notes capture.
*   **Order Entry:** STAT order placement for Laboratory tests and Radiology procedures via dedicated modals, integrating with the respective modules.
*   **Critical Alerts:** System for identifying and managing time-sensitive conditions like STEMI, Stroke, Sepsis, and critical lab results. Includes activation, acknowledgment, and resolution tracking.
*   **Status & Location Tracking:** Logs changes in patient status (Triage, Assessment, Treatment, Awaiting Disposition, Admitted, Discharged) and location within the ER.
*   **IPD Admission:** Seamless workflow to initiate inpatient admission requests directly from the ER module, integrating with the IPD module.
*   **Dashboard & Stats:** Overview of key ER metrics like census, wait times, bed occupancy, and active alerts.

## 3. Database Schema

The ER module introduces the following tables (defined in `migrations/0009_add_er_management_tables.sql`):

*   `er_visits`: Stores core information about each ER visit, including patient linkage, arrival details, assigned staff, current status, location, and disposition.
*   `er_triage_assessments`: Records details of the triage process, including ESI level, vital signs, and assessment notes.
*   `er_patient_status_logs`: Logs historical changes in a patient's status and location during their ER visit.
*   `er_critical_alerts`: Tracks the activation, acknowledgment, and resolution of critical alerts (Sepsis, Stroke, STEMI, etc.) associated with an ER visit.

## 4. API Endpoints

The following API routes support the ER module's functionality:

*   `GET /api/er/visits`: List ER visits (supports filtering).
*   `POST /api/er/visits`: Create a new ER visit.
*   `GET /api/er/visits/[id]`: Get details of a specific ER visit.
*   `PUT /api/er/visits/[id]`: Update details of a specific ER visit (e.g., status, location, assigned staff, disposition).
*   `DELETE /api/er/visits/[id]`: Delete an ER visit (use with caution).
*   `GET /api/er/visits/[id]/triage`: Get the triage assessment for a visit.
*   `POST /api/er/visits/[id]/triage`: Create a triage assessment for a visit.
*   `GET /api/er/visits/[id]/statuses`: Get the status/location history logs for a visit.
*   `GET /api/er/visits/[id]/alerts`: Get critical alerts associated with a visit.
*   `POST /api/er/visits/[id]/alerts`: Create a new critical alert for a visit.
*   *(Future)* `PUT /api/er/visits/[visitId]/alerts/[alertId]`: Update the status of a specific alert (Acknowledge/Resolve).

## 5. UI Components

The ER module utilizes the following UI components:

*   **Dashboard Page (`/src/app/dashboard/er/page.tsx`):** The main entry point for the ER module, featuring tabs for different functions.
*   **`ERDashboardStats`:** Displays key real-time statistics for the ER.
*   **`ERPatientTrackingBoard`:** The core visual component showing all active ER patients, their status, acuity, location, and indicators.
*   **`ERTriageForm`:** Form used by nurses to input triage assessment data (ESI, vitals, notes).
*   **`ERCriticalAlerts`:** Table displaying active critical alerts, allowing acknowledgment and resolution.
*   **`ERRegistrationModal`:** Modal dialog for registering new ER visits, including searching for existing patients or creating new ones.
*   **`ERPatientAdmitModal`:** Modal dialog for initiating an inpatient admission request from the ER, integrating with the IPD module.
*   **`ERLabOrderModal`:** Modal dialog for placing STAT lab orders, integrating with the Laboratory module.
*   **`ERRadiologyOrderModal`:** Modal dialog for placing STAT radiology orders, integrating with the Radiology module.

## 6. Integration Points

The ER module integrates with several other HMS modules:

*   **Patient Registration:** Uses patient search/creation APIs.
*   **IPD:** Creates admission requests via IPD API.
*   **Laboratory:** Creates lab orders via LIS API.
*   **Radiology:** Creates radiology orders via RIS API.
*   **User Management:** Relies on user authentication and roles for access control (implicit).
*   **Notification System:** (Planned) Critical alerts should trigger notifications.

## 7. Future Enhancements

*   Full clinical documentation features (physician notes, nursing notes).
*   Detailed reporting and analytics.
*   Integration with Ambulance Management for pre-arrival data.
*   Real-time updates via WebSockets.
*   Bed management integration for visualizing ER bed status.
*   Discharge workflow implementation.

