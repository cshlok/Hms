- **Description:** Adds a new type of item to the inventory master list.
- **Authorization:** Admin, Pharmacist.
- **Request Body:** `InventoryItem` object (excluding `inventory_item_id`, `current_stock`).
- **Response (Success 201):** `{ "message": "Inventory item created successfully", "inventory_item_id": 303 }`
- **Response (Error 400/401/500):** `{ "error": "...", "details": "..." }`

### 5. Add Inventory Batch (Stock Entry)

- **Endpoint:** `POST /api/inventory-items/{itemId}/batches`
- **Description:** Adds a new batch of stock for an existing inventory item.
- **Authorization:** Admin, Pharmacist, Inventory Staff.
- **Request Body:** `InventoryBatch` object (excluding `batch_id`, `current_quantity`).
- **Response (Success 201):** `{ "message": "Inventory batch added successfully", "batch_id": 404 }`
- **Response (Error 400/401/404/500):** `{ "error": "...", "details": "..." }`

### 6. List Invoices

- **Endpoint:** `GET /api/invoices`
- **Description:** Retrieves a list of invoices.
- **Authorization:** Admin, Receptionist, Billing Staff.
- **Query Parameters:** `patientId`, `status`, `dateFrom`, `dateTo`, `limit`, `offset`.
- **Response (Success 200):** `Invoice[]`.
- **Response (Error 401/500):** `{ "error": "...", "details": "..." }`

### 7. Create Invoice

- **Endpoint:** `POST /api/invoices`
- **Description:** Creates a new invoice shell.
- **Authorization:** Admin, Receptionist, Billing Staff.
- **Request Body:** `{ patient_id: number, invoice_date?: string, due_date?: string, notes?: string }`.
- **Response (Success 201):** `{ "message": "Invoice created successfully", "invoice_id": 505 }`
- **Response (Error 400/401/404/500):** `{ "error": "...", "details": "..." }`

### 8. Get Invoice Details

- **Endpoint:** `GET /api/invoices/{invoiceId}`
- **Description:** Retrieves details for a specific invoice, including items and payments.
- **Authorization:** Admin, Receptionist, Billing Staff, Patient (own invoice).
- **Response (Success 200):** `Invoice` object (with `items: InvoiceItem[]` and `payments: InvoicePayment[]`).
- **Response (Error 400/401/403/404/500):** `{ "error": "...", "details": "..." }`

### 9. Update Invoice

- **Endpoint:** `PUT /api/invoices/{invoiceId}`
- **Description:** Updates invoice details (e.g., status, notes, due date).
- **Authorization:** Admin, Billing Staff.
- **Request Body:** Partial `Invoice` object with fields to update.
- **Response (Success 200):** `{ "message": "Invoice updated successfully" }`
- **Response (Error 400/401/404/500):** `{ "error": "...", "details": "..." }`

### 10. Add Invoice Item

- **Endpoint:** `POST /api/invoices/{invoiceId}/items`
- **Description:** Adds one or more billable items to an invoice.
- **Authorization:** Admin, Receptionist, Billing Staff.
- **Request Body:** `InvoiceItem` object or array `InvoiceItem[]` (excluding `invoice_item_id`). Requires `billable_item_id`, `quantity`, `unit_price`.
- **Response (Success 201):** `{ "message": "Item(s) added to invoice successfully" }`
- **Response (Error 400/401/404/500):** `{ "error": "...", "details": "..." }`

### 11. Add Invoice Payment

- **Endpoint:** `POST /api/invoices/{invoiceId}/payments`
- **Description:** Records a payment received for an invoice.
- **Authorization:** Admin, Receptionist, Billing Staff.
- **Request Body:** `InvoicePayment` object (excluding `payment_id`). Requires `amount_paid`, `payment_method`.
- **Response (Success 201):** `{ "message": "Payment recorded successfully", "payment_id": 606 }`
- **Response (Error 400/401/404/500):** `{ "error": "...", "details": "..." }`

---

## OPD Management (`/api/...`)

### 1. List OPD Visits

- **Endpoint:** `GET /api/opd-visits`
- **Description:** Retrieves a list of OPD visits.
- **Authorization:** Admin, Receptionist, Doctor, Nurse.
- **Query Parameters:** `patientId`, `doctorId`, `status`, `dateFrom`, `dateTo`, `search` (patient name), `limit`, `offset`.
- **Response (Success 200):** `OPDVisit[]`.
- **Response (Error 400/401/500):** `{ "error": "...", "details": "..." }`

### 2. Create OPD Visit

- **Endpoint:** `POST /api/opd-visits`
- **Description:** Creates a new OPD visit record.
- **Authorization:** Admin, Receptionist.
- **Request Body:** `OPDVisit` object (excluding `opd_visit_id`, `created_at`, `updated_at`). Requires `patient_id`, `doctor_id`.
- **Response (Success 201):** `{ "message": "OPD Visit created successfully", "opd_visit_id": 707 }`
- **Response (Error 400/401/404/500):** `{ "error": "...", "details": "..." }`

### 3. Get OPD Visit Details

- **Endpoint:** `GET /api/opd-visits/{visitId}`
- **Description:** Retrieves details for a specific OPD visit.
- **Authorization:** Admin, Receptionist, Doctor, Nurse.
- **Response (Success 200):** `OPDVisit` object.
- **Response (Error 400/401/404/500):** `{ "error": "...", "details": "..." }`

### 4. Update OPD Visit

- **Endpoint:** `PUT /api/opd-visits/{visitId}`
- **Description:** Updates the status or notes for an OPD visit.
- **Authorization:** Admin, Receptionist, Doctor, Nurse.
- **Request Body:** `{ status?: OPDVisitStatus, notes?: string }`.
- **Response (Success 200):** `{ "message": "OPD Visit updated successfully" }`
- **Response (Error 400/401/404/500):** `{ "error": "...", "details": "..." }`

### 5. List Consultations

- **Endpoint:** `GET /api/consultations`
- **Description:** Retrieves a list of consultations.
- **Authorization:** Admin, Doctor (own), Nurse.
- **Query Parameters:** `patientId`, `doctorId`, `opdVisitId`, `admissionId`, `dateFrom`, `dateTo`, `limit`, `offset`.
- **Response (Success 200):** `Consultation[]` (partial details).
- **Response (Error 400/401/403/500):** `{ "error": "...", "details": "..." }`

### 6. Create Consultation

- **Endpoint:** `POST /api/consultations`
- **Description:** Creates a new consultation record.
- **Authorization:** Doctor.
- **Request Body:** `Consultation` object (excluding `consultation_id`, `doctor_id`, `created_at`, `updated_at`). Requires `patient_id` and either `opd_visit_id` or `admission_id`.
- **Response (Success 201):** `{ "message": "Consultation created successfully", "consultation_id": 808 }`
- **Response (Error 400/401/404/500):** `{ "error": "...", "details": "..." }`

### 7. Get Consultation Details

- **Endpoint:** `GET /api/consultations/{consultationId}`
- **Description:** Retrieves full details for a specific consultation.
- **Authorization:** Admin, Doctor (own), Nurse.
- **Response (Success 200):** `Consultation` object.
- **Response (Error 400/401/403/404/500):** `{ "error": "...", "details": "..." }`

### 8. Update Consultation

- **Endpoint:** `PUT /api/consultations/{consultationId}`
- **Description:** Updates consultation details (notes, diagnosis, etc.).
- **Authorization:** Doctor (own consultation).
- **Request Body:** Partial `Consultation` object with updatable fields.
- **Response (Success 200):** `{ "message": "Consultation updated successfully" }`
- **Response (Error 400/401/403/404/500):** `{ "error": "...", "details": "..." }`

### 9. List Prescriptions

- **Endpoint:** `GET /api/prescriptions`
- **Description:** Retrieves a list of prescriptions.
- **Authorization:** Admin, Doctor (own), Nurse, Pharmacist, Patient (own).
- **Query Parameters:** `patientId`, `doctorId`, `consultationId`, `dateFrom`, `dateTo`, `limit`, `offset`.
- **Response (Success 200):** `Prescription[]` (partial details).
- **Response (Error 400/401/403/500):** `{ "error": "...", "details": "..." }`

### 10. Create Prescription

- **Endpoint:** `POST /api/prescriptions`
- **Description:** Creates a new prescription shell (items added separately).
- **Authorization:** Doctor.
- **Request Body:** `{ consultation_id: number, prescription_date?: string, notes?: string }`.
- **Response (Success 201):** `{ "message": "Prescription created successfully", "prescription_id": 909 }`
- **Response (Error 400/401/403/404/500):** `{ "error": "...", "details": "..." }`

### 11. Get Prescription Details

- **Endpoint:** `GET /api/prescriptions/{prescriptionId}`
- **Description:** Retrieves details for a specific prescription, including items.
- **Authorization:** Admin, Doctor (own), Nurse, Pharmacist, Patient (own).
- **Response (Success 200):** `Prescription` object (with `items: PrescriptionItem[]`).
- **Response (Error 400/401/403/404/500):** `{ "error": "...", "details": "..." }`

### 12. Add Prescription Item(s)

- **Endpoint:** `POST /api/prescriptions/{prescriptionId}/items`
- **Description:** Adds one or more medication items to a prescription.
- **Authorization:** Doctor (own prescription).
- **Request Body:** `PrescriptionItem` object or array `PrescriptionItem[]` (excluding `prescription_item_id`, `drug_name`). Requires `inventory_item_id`, `dosage`, `frequency`, `duration`.
- **Response (Success 201):** `{ "message": "Item(s) added to prescription successfully" }`
- **Response (Error 400/401/403/404/500):** `{ "error": "...", "details": "..." }`

### 13. List Lab Orders

- **Endpoint:** `GET /api/lab-orders`
- **Description:** Retrieves a list of lab orders.
- **Authorization:** Admin, Doctor (own), Nurse, LabTechnician, Patient (own).
- **Query Parameters:** `patientId`, `doctorId`, `consultationId`, `status`, `dateFrom`, `dateTo`, `limit`, `offset`.
- **Response (Success 200):** `LabOrder[]` (partial details).
- **Response (Error 400/401/403/500):** `{ "error": "...", "details": "..." }`

### 14. Create Lab Order

- **Endpoint:** `POST /api/lab-orders`
- **Description:** Creates a new lab order shell (items added separately).
- **Authorization:** Doctor.
- **Request Body:** `{ consultation_id: number, order_datetime?: string, notes?: string }`.
- **Response (Success 201):** `{ "message": "Lab Order created successfully", "lab_order_id": 1010 }`
- **Response (Error 400/401/403/404/500):** `{ "error": "...", "details": "..." }`

### 15. Get Lab Order Details

- **Endpoint:** `GET /api/lab-orders/{labOrderId}`
- **Description:** Retrieves details for a specific lab order, including items.
- **Authorization:** Admin, Doctor (own), Nurse, LabTechnician, Patient (own).
- **Response (Success 200):** `LabOrder` object (with `items: LabOrderItem[]`).
- **Response (Error 400/401/403/404/500):** `{ "error": "...", "details": "..." }`

### 16. Update Lab Order

- **Endpoint:** `PUT /api/lab-orders/{labOrderId}`
- **Description:** Updates the overall status or notes for a lab order.
- **Authorization:** Admin, Doctor, Nurse, LabTechnician.
- **Request Body:** `{ status?: LabOrderStatus, notes?: string }`.
- **Response (Success 200):** `{ "message": "Lab Order updated successfully" }`
- **Response (Error 400/401/404/500):** `{ "error": "...", "details": "..." }`

### 17. Add Lab Order Item(s)

- **Endpoint:** `POST /api/lab-orders/{labOrderId}/items`
- **Description:** Adds one or more tests to a lab order.
- **Authorization:** Doctor (own lab order).
- **Request Body:** `LabOrderItem` object or array `LabOrderItem[]` (excluding IDs, status, results, etc.). Requires `billable_item_id`.
- **Response (Success 201):** `{ "message": "Test(s) added to lab order successfully" }`
- **Response (Error 400/401/403/404/500):** `{ "error": "...", "details": "..." }`

---

_(Note: Further endpoints for updating specific lab order items (e.g., adding results by LabTechnician) would typically reside under `/api/lab-orders/{labOrderId}/items/{itemId}`)_
