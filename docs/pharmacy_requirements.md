# Pharmacy Management Module Requirements

This document outlines the requirements for the Pharmacy Management module (Iteration 3) of the Shlokam Hospital Management System (HMS), based on the initial project scope and common hospital pharmacy practices.

## 1. Core Functionality

The Pharmacy module should manage the hospital's pharmacy operations, including medication inventory, dispensing, billing integration, and regulatory compliance.

**Key Features based on Initial Requirements:**

1.  **Inventory Management:**
    - Track medication stock levels (both generic and branded drugs).
    - Manage batches, including expiry dates and batch numbers.
    - Record stock additions (purchases, transfers) and deductions (dispensing, expiry, adjustments).
    - Set reorder levels and generate low-stock alerts/reports.
    - Support for different storage locations (e.g., main pharmacy, satellite pharmacies).
    - Ability to categorize drugs (e.g., by therapeutic class, schedule).
2.  **Dispensing:**
    - Process prescriptions from OPD and IPD.
    - Verify prescriptions against patient records and potential drug interactions (requires integration with E-Prescription module - future iteration).
    - Record dispensed medications against patient bills.
    - Handle medication returns.
3.  **Billing Integration:**
    - Automatically add dispensed medication charges to patient bills (OPD & IPD).
    - Support for different pricing models (e.g., based on insurance, patient type).
    - Generate pharmacy-specific billing reports.
4.  **Expiry Management:**
    - Track medication expiry dates by batch.
    - Generate reports for near-expiry and expired medications.
    - Facilitate the process for handling expired stock (e.g., return to supplier, disposal).
5.  **Drug Information:**
    - Maintain a database of generic and branded drugs.
    - Store details like dosage form, strength, manufacturer, composition.
    - (Future) Integration with drug interaction databases.
6.  **Reporting:**
    - Generate reports on stock levels, consumption patterns, expiry, sales, and purchasing.

## 2. User Roles & Access Control (RBAC)

- **Pharmacist:** Manage inventory, dispense medications, process prescriptions, view reports.
- **Pharmacy Technician:** Assist with dispensing and inventory management under supervision.
- **Pharmacy Manager/Admin:** Full access to manage inventory, settings, pricing, reports, and user access within the pharmacy module.
- **Doctor:** View medication availability (potentially prescribe - future E-Prescription module).
- **Nurse:** View medication administration records (linked from IPD), potentially request stock for wards.

## 3. Integration Points

- **OPD Module:** Receive prescriptions, send billing information.
- **IPD Module:** Receive prescriptions/medication orders, send billing information, provide medication availability for administration records.
- **Billing Module:** Send charges for dispensed medications.
- **E-Prescription Module (Future):** Receive electronic prescriptions, provide data for drug interaction checks.
- **Inventory/Procurement Module (If separate):** Link purchase orders and goods received notes.

## 4. Technical Considerations

- Use the existing tech stack (Next.js, TypeScript, Cloudflare Workers/D1).
- Ensure data consistency, especially for stock levels.
- Implement proper logging for all inventory transactions.
- Design APIs for fetching inventory, processing prescriptions, and billing.
- Develop UI components for inventory management, dispensing workflow, and reporting.

## 5. Iteration Scope (Iteration 3)

- Focus on core inventory management (add, deduct, view stock, expiry tracking).
- Implement basic dispensing workflow linked to patient records.
- Integrate with the Billing module for charging dispensed items.
- Develop API endpoints and UI for these core functions.
- Establish the database schema for pharmacy inventory and dispensing.
