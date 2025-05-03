# Radiology Management Module Documentation

This document provides an overview of the Radiology Management module implemented within the Shlokam Hospital Management System.

## 1. Overview

The Radiology Management module handles the workflow for radiology orders, studies, and reports within the hospital. It integrates with Patient Management, User Management, and potentially other modules like Billing and EMR.

## 2. Research & Design

Research was conducted on Radiology Information Systems (RIS), Picture Archiving and Communication Systems (PACS), and their integration with Hospital Information Systems (HIS). Key findings include:

- **RIS Functions:** Patient scheduling, resource management, examination performance tracking, reporting, results distribution, and billing.
- **PACS Functions:** Image acquisition, storage, retrieval, and display.
- **Integration:** Seamless integration between RIS, PACS, and HIS is crucial for efficient workflow, typically using standards like HL7 (for textual data) and DICOM (for imaging data).
- **Workflow:** Order entry -> Scheduling -> Image Acquisition (Modality) -> Image Storage/Review (PACS) -> Reporting (RIS/PACS) -> Results Distribution -> Billing.

Based on this research, the module was designed with the following components.

## 3. Database Schema

A new migration file (`migrations/0007_add_radiology_tables.sql`) was created to add the necessary tables to the D1 database:

- `RadiologyProcedureTypes`: Stores types of radiology procedures (e.g., Chest X-Ray, Brain MRI).
- `RadiologyModalities`: Stores imaging equipment details (e.g., CT Scanner 1, MRI Unit A).
- `RadiologyOrders`: Tracks requests for radiology procedures, linking patients, referring doctors, and procedure types.
- `RadiologyStudies`: Records the actual performance of a study, linking orders, modalities, technicians, and storing metadata like accession number and study date/time.
- `RadiologyReports`: Stores the radiologist's findings, impression, and recommendations, linking to the corresponding study.

Relationships and appropriate fields (IDs, timestamps, status fields, text fields) were defined to support the workflow.

## 4. API Routes

API routes were implemented under `src/app/api/radiology/` to handle CRUD operations for:

- **Orders:** `orders/route.ts`, `orders/[id]/route.ts` (GET, POST, PUT, DELETE - cancel)
- **Procedure Types:** `procedure-types/route.ts` (GET, POST - Admin only)
- **Modalities:** `modalities/route.ts` (GET, POST - Admin only)
- **Studies:** `studies/route.ts`, `studies/[id]/route.ts` (GET, POST, PUT, DELETE - use with caution)
- **Reports:** `reports/route.ts`, `reports/[id]/route.ts` (GET, POST, PUT - including verification)

These routes include role-based authorization checks, data validation, and interaction with the D1 database (`process.env.DB`).

## 5. UI Components

React components were developed under `src/components/radiology/`:

- `RadiologyOrderList.tsx`: Displays a list of orders with filtering/sorting capabilities (basic implementation).
- `CreateRadiologyOrderModal.tsx`: Modal form for creating new orders, fetching patients, procedure types, and doctors.
- `RadiologyOrderDetail.tsx`: Displays details of a specific order, including links/sections for associated studies and reports.
- `RadiologyStudiesList.tsx`: Displays a list of studies.
- `CreateRadiologyStudyModal.tsx`: Modal form for creating new studies linked to an order, fetching modalities and technicians.
- `RadiologyStudyDetail.tsx`: Displays details of a specific study, including links to the order and associated reports.
- `RadiologyReportsList.tsx`: Displays a list of reports.
- `CreateRadiologyReportModal.tsx`: Modal form for creating new reports linked to a study, fetching radiologists.
- `RadiologyReportDetail.tsx`: Displays the full report details, including findings, impression, and recommendations, with options for verification and printing.
- `RadiologySettings.tsx`: Tabbed interface for managing Procedure Types and Modalities.
- `CreateProcedureTypeModal.tsx`: Modal form for adding new procedure types.
- `CreateModalityModal.tsx`: Modal form for adding new modalities.

## 6. Integration & Routing

- The main entry point for the module is `/dashboard/radiology`, implemented in `src/app/dashboard/radiology/page.tsx`, using tabs to navigate between Orders, Studies, Reports, and Settings.
- Detail pages for orders, studies, and reports are implemented using dynamic routes:
  - `src/app/dashboard/radiology/orders/[id]/page.tsx`
  - `src/app/dashboard/radiology/studies/[id]/page.tsx`
  - `src/app/dashboard/radiology/reports/[id]/page.tsx`
- Modals fetch data from existing API endpoints (e.g., `/api/patients`, `/api/users`) for integration.
- Status updates in one part of the workflow (e.g., creating a report updates study status) are handled in the API routes.

## 7. Testing & Configuration Notes

- **Database Configuration:** Attempts to test database interactions locally using `wrangler d1 execute` and `wrangler d1 migrations apply` failed due to persistent configuration issues in recognizing the D1 database binding, even after creating `wrangler.toml`. **Resolution Required:** The Cloudflare D1 database needs to be properly set up and configured in the deployment environment (or a local development environment with correctly initialized Wrangler/D1) for the module to function correctly.
- **Testing Approach:** Due to database limitations, testing was primarily done via code review of API routes and UI components to verify logic, data flow, and integration points.
- **Further Testing:** Once the database is configured, thorough functional testing is required, including creating orders, studies, reports, verifying status changes, and checking role-based access.

## 8. Future Enhancements (Potential)

- DICOM/PACS integration (requires external services/libraries).
- Integration with Billing module.
- Scheduling functionality.
- Advanced reporting and analytics.
- Addendum functionality for reports.
- Image viewing capabilities (requires PACS integration or dedicated viewer).
