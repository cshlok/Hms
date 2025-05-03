# Pharmacy Module Manual UI & Integration Tests

This document outlines the manual test cases for the Pharmacy Management module UI components and integration points.

## UI Component Tests

### 1. Pharmacy Dashboard

- **Test Case PD-01**: Navigate to Pharmacy Dashboard
  - **Steps**:
    1. Log in as a Pharmacy user
    2. Navigate to `/pharmacy`
  - **Expected Result**:
    - Dashboard displays with summary cards showing:
      - Pending prescriptions count
      - Low stock items count
      - Expiring items count
      - Recent dispensing activities
    - Navigation menu shows all pharmacy sub-modules

### 2. Inventory Management

- **Test Case IM-01**: View Inventory List

  - **Steps**:
    1. Navigate to `/pharmacy/inventory`
  - **Expected Result**:
    - List of inventory items displays with columns for:
      - Medication name
      - Batch number
      - Expiry date
      - Quantity
      - Status (normal, low, out of stock)
    - Search and filter options are available

- **Test Case IM-02**: Add New Inventory Batch

  - **Steps**:
    1. Navigate to `/pharmacy/inventory/add`
    2. Fill in all required fields:
       - Select medication
       - Enter batch number
       - Enter expiry date
       - Enter quantity
       - Enter cost price
       - Enter selling price
       - Enter supplier
       - Enter location
    3. Click "Save"
  - **Expected Result**:
    - Form submits successfully
    - New batch appears in inventory list
    - Success message displays

- **Test Case IM-03**: Filter Inventory
  - **Steps**:
    1. Navigate to `/pharmacy/inventory`
    2. Use filter options (e.g., low stock, expiring soon)
  - **Expected Result**:
    - List updates to show only items matching filter criteria

### 3. Medication Management

- **Test Case MM-01**: View Medications List

  - **Steps**:
    1. Navigate to `/pharmacy/medications`
  - **Expected Result**:
    - List of medications displays with columns for:
      - Generic name
      - Brand name
      - Dosage form
      - Strength
      - Category
    - Search and filter options are available

- **Test Case MM-02**: Add New Medication
  - **Steps**:
    1. Navigate to `/pharmacy/medications/add`
    2. Fill in all required fields:
       - Generic name
       - Brand name (optional)
       - Dosage form
       - Strength
       - Unit of measure
       - Route (optional)
       - Category (optional)
       - Manufacturer (optional)
       - Prescription required (checkbox)
       - Narcotic (checkbox)
       - Description (optional)
    3. Click "Save Medication"
  - **Expected Result**:
    - Form submits successfully
    - New medication appears in medications list
    - Success message displays

## Integration Tests

### 4. OPD Integration

- **Test Case OI-01**: Prescribe Medications from OPD

  - **Steps**:
    1. Log in as a Doctor
    2. Navigate to OPD module
    3. Select a patient
    4. Open the prescription section
    5. Add medications from the available list
    6. Enter dosage, frequency, duration for each
    7. Add any special instructions
    8. Click "Create Prescription"
  - **Expected Result**:
    - Prescription is created successfully
    - Success message displays
    - Prescription appears in the patient's history
    - Prescription appears in the Pharmacy module's pending prescriptions

- **Test Case OI-02**: View Previous Prescriptions in OPD
  - **Steps**:
    1. Log in as a Doctor
    2. Navigate to OPD module
    3. Select a patient with existing prescriptions
    4. View the prescription section
  - **Expected Result**:
    - Previous prescriptions are listed with:
      - Date
      - Status (pending, dispensed, etc.)
      - Medications with dosage details

### 5. IPD Integration (MAR)

- **Test Case II-01**: View Medication Schedule in IPD

  - **Steps**:
    1. Log in as a Nurse
    2. Navigate to IPD module
    3. Select a patient with active medication orders
    4. View the MAR section
  - **Expected Result**:
    - Medication schedule displays with:
      - Scheduled times
      - Medication details
      - Status (pending, administered, etc.)

- **Test Case II-02**: Record Medication Administration
  - **Steps**:
    1. Log in as a Nurse
    2. Navigate to IPD module
    3. Select a patient with pending medications
    4. Click "Administer" for a scheduled medication
    5. Confirm administration
  - **Expected Result**:
    - Administration is recorded successfully
    - Status updates to "administered"
    - Record appears in administration history

### 6. Billing Integration

- **Test Case BI-01**: View Unbilled Pharmacy Items

  - **Steps**:
    1. Log in as a Billing user
    2. Navigate to Billing module
    3. Select a patient with dispensed medications
    4. View the pharmacy billing section
  - **Expected Result**:
    - Unbilled pharmacy items display with:
      - Medication details
      - Quantity
      - Unit price
      - Subtotal
    - Checkboxes to select items for billing

- **Test Case BI-02**: Generate Pharmacy Bill
  - **Steps**:
    1. Log in as a Billing user
    2. Navigate to Billing module
    3. Select a patient with unbilled pharmacy items
    4. Select items to bill
    5. Click "Generate Bill"
  - **Expected Result**:
    - Bill is generated successfully
    - Selected items are marked as billed
    - Bill total is calculated correctly
    - Success message displays

## Test Results

| Test ID | Date | Tester | Result | Notes |
| ------- | ---- | ------ | ------ | ----- |
| PD-01   |      |        |        |       |
| IM-01   |      |        |        |       |
| IM-02   |      |        |        |       |
| IM-03   |      |        |        |       |
| MM-01   |      |        |        |       |
| MM-02   |      |        |        |       |
| OI-01   |      |        |        |       |
| OI-02   |      |        |        |       |
| II-01   |      |        |        |       |
| II-02   |      |        |        |       |
| BI-01   |      |        |        |       |
| BI-02   |      |        |        |       |
