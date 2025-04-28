-- Define Roles
CREATE TABLE Roles (
    role_id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_name TEXT NOT NULL UNIQUE -- Admin, Doctor, Nurse, Receptionist, Lab Technician, Pharmacist, Patient
);

-- Insert predefined roles
INSERT INTO Roles (role_name) VALUES
("Admin"),
("Doctor"),
("Nurse"),
("Receptionist"),
("Lab Technician"),
("Pharmacist"),
("Patient");

-- Define Users table
CREATE TABLE Users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    phone_number TEXT,
    role_id INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES Roles(role_id)
);

-- Define Patients table
CREATE TABLE Patients (
    patient_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE, 
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    gender TEXT CHECK(gender IN ("Male", "Female", "Other", "Prefer not to say")) NOT NULL,
    phone_number TEXT NOT NULL,
    email TEXT UNIQUE,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT,
    emergency_contact_name TEXT,
    emergency_contact_relation TEXT,
    emergency_contact_phone TEXT,
    blood_group TEXT,
    allergies TEXT,
    past_medical_history TEXT,
    current_medications TEXT,
    insurance_provider TEXT,
    insurance_policy_number TEXT,
    registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    registered_by_user_id INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (registered_by_user_id) REFERENCES Users(user_id)
);

-- Define Doctors table (linking to Users)
CREATE TABLE Doctors (
    doctor_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE, -- Link to the user account
    specialty TEXT NOT NULL,
    qualifications TEXT,
    license_number TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

-- Define Doctor Schedules table
CREATE TABLE DoctorSchedules (
    schedule_id INTEGER PRIMARY KEY AUTOINCREMENT,
    doctor_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday, ..., 6=Saturday
    start_time TIME NOT NULL, -- Format HH:MM
    end_time TIME NOT NULL, -- Format HH:MM
    slot_duration_minutes INTEGER DEFAULT 15, -- Default appointment slot duration
    is_available BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES Doctors(doctor_id),
    UNIQUE (doctor_id, day_of_week, start_time) -- Prevent overlapping base schedules
);

-- Define Appointments table
CREATE TABLE Appointments (
    appointment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    schedule_id INTEGER, -- Optional link to the base schedule slot if applicable
    appointment_datetime DATETIME NOT NULL, -- Specific date and time
    duration_minutes INTEGER DEFAULT 15,
    reason TEXT, -- Reason for visit
    status TEXT CHECK(status IN (
        "Scheduled", 
        "Confirmed", 
        "CheckedIn", 
        "InProgress", 
        "Completed", 
        "Cancelled", 
        "NoShow"
    )) DEFAULT "Scheduled",
    notes TEXT, -- Notes by receptionist or doctor
    booked_by_user_id INTEGER, -- User who booked it (receptionist, patient via portal)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES Patients(patient_id),
    FOREIGN KEY (doctor_id) REFERENCES Doctors(doctor_id),
    FOREIGN KEY (schedule_id) REFERENCES DoctorSchedules(schedule_id),
    FOREIGN KEY (booked_by_user_id) REFERENCES Users(user_id)
);

-- Billing & Inventory Modules --

-- Define Billable Items (Services, Procedures, Pharmacy Items, etc.)
CREATE TABLE BillableItems (
    item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_code TEXT UNIQUE, -- Optional code for quick lookup
    item_name TEXT NOT NULL,
    description TEXT,
    item_type TEXT NOT NULL CHECK(item_type IN ("Service", "Procedure", "Pharmacy", "Consumable", "EquipmentUsage", "Package")), -- Type of item
    unit_price REAL NOT NULL CHECK(unit_price >= 0),
    department TEXT, -- e.g., OPD, IPD, Lab, Radiology, Pharmacy
    is_taxable BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Define Inventory Items (link to BillableItems if applicable, e.g., Pharmacy type)
CREATE TABLE InventoryItems (
    inventory_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    billable_item_id INTEGER UNIQUE, -- Link to BillableItems if this is a sellable item
    item_name TEXT NOT NULL, -- Can be same as billable item name or different for internal tracking
    category TEXT, -- e.g., Medicine, Syringe, ECG Machine
    manufacturer TEXT,
    unit_of_measure TEXT, -- e.g., Box, Vial, Each, Tablet
    reorder_level INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (billable_item_id) REFERENCES BillableItems(item_id)
);

-- Define Stock Batches (for tracking expiry, batch numbers)
CREATE TABLE StockBatches (
    batch_id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventory_item_id INTEGER NOT NULL,
    batch_number TEXT,
    expiry_date DATE,
    quantity_received INTEGER NOT NULL,
    current_quantity INTEGER NOT NULL CHECK(current_quantity >= 0),
    cost_price_per_unit REAL, -- Purchase cost
    selling_price_per_unit REAL, -- Selling price (can override BillableItems price for this batch)
    supplier_id INTEGER, -- Optional: Link to supplier
    received_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (inventory_item_id) REFERENCES InventoryItems(inventory_item_id)
    -- FOREIGN KEY (supplier_id) REFERENCES Suppliers(supplier_id) -- Add Suppliers table later if needed
);

-- Define Invoices
CREATE TABLE Invoices (
    invoice_id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT UNIQUE NOT NULL, -- Generate unique invoice numbers
    patient_id INTEGER NOT NULL,
    appointment_id INTEGER, -- Optional link to appointment
    admission_id INTEGER, -- Optional link to IPD admission (Add Admissions table later)
    opd_visit_id INTEGER, -- Optional link to OPD visit
    invoice_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    due_date DATE,
    total_amount REAL NOT NULL DEFAULT 0,
    paid_amount REAL NOT NULL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    status TEXT CHECK(status IN ("Draft", "Issued", "Paid", "PartiallyPaid", "Overdue", "Cancelled")) DEFAULT "Draft",
    notes TEXT,
    created_by_user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES Patients(patient_id),
    FOREIGN KEY (appointment_id) REFERENCES Appointments(appointment_id),
    -- FOREIGN KEY (admission_id) REFERENCES Admissions(admission_id),
    FOREIGN KEY (opd_visit_id) REFERENCES OPDVisits(opd_visit_id),
    FOREIGN KEY (created_by_user_id) REFERENCES Users(user_id)
);

-- Define Invoice Items (line items for each invoice)
CREATE TABLE InvoiceItems (
    invoice_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    billable_item_id INTEGER NOT NULL,
    batch_id INTEGER, -- Optional: Link to specific stock batch if applicable (e.g., Pharmacy)
    description TEXT, -- Can override item description
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL, -- Price at the time of invoicing
    discount_amount REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    total_amount REAL NOT NULL, -- (quantity * unit_price) - discount + tax
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES Invoices(invoice_id),
    FOREIGN KEY (billable_item_id) REFERENCES BillableItems(item_id),
    FOREIGN KEY (batch_id) REFERENCES StockBatches(batch_id)
);

-- Define Payments
CREATE TABLE Payments (
    payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    amount_paid REAL NOT NULL,
    payment_method TEXT CHECK(payment_method IN ("Cash", "Card", "BankTransfer", "Insurance", "Online")), -- Add more as needed
    transaction_reference TEXT, -- Card transaction ID, cheque number, etc.
    notes TEXT,
    received_by_user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES Invoices(invoice_id),
    FOREIGN KEY (patient_id) REFERENCES Patients(patient_id),
    FOREIGN KEY (received_by_user_id) REFERENCES Users(user_id)
);

-- OPD Management Module --

-- Define OPD Visits (can be linked to an appointment or walk-in)
CREATE TABLE OPDVisits (
    opd_visit_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    appointment_id INTEGER UNIQUE, -- Link if visit originated from an appointment
    visit_datetime DATETIME DEFAULT CURRENT_TIMESTAMP,
    visit_type TEXT CHECK(visit_type IN ("New", "FollowUp", "WalkIn")) DEFAULT "New",
    doctor_id INTEGER NOT NULL, -- Doctor assigned to the visit
    department TEXT, -- e.g., General Medicine, Cardiology
    status TEXT CHECK(status IN ("Waiting", "WithDoctor", "Billing", "Pharmacy", "Lab", "Completed", "Cancelled")) DEFAULT "Waiting",
    notes TEXT, -- Receptionist notes
    created_by_user_id INTEGER, -- User who created the visit record (e.g., Receptionist)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES Patients(patient_id),
    FOREIGN KEY (appointment_id) REFERENCES Appointments(appointment_id),
    FOREIGN KEY (doctor_id) REFERENCES Doctors(doctor_id),
    FOREIGN KEY (created_by_user_id) REFERENCES Users(user_id)
);

-- Define Patient Vitals (recorded during visits)
CREATE TABLE PatientVitals (
    vital_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    opd_visit_id INTEGER, -- Link to OPD visit if applicable
    admission_id INTEGER, -- Link to IPD admission if applicable
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    height_cm REAL,
    weight_kg REAL,
    bmi REAL, -- Calculated Body Mass Index
    temperature_celsius REAL,
    systolic_bp INTEGER, -- Systolic Blood Pressure (mmHg)
    diastolic_bp INTEGER, -- Diastolic Blood Pressure (mmHg)
    heart_rate INTEGER, -- Beats per minute
    respiratory_rate INTEGER, -- Breaths per minute
    oxygen_saturation REAL, -- SpO2 (%)
    pain_scale INTEGER, -- e.g., 0-10
    notes TEXT,
    recorded_by_user_id INTEGER, -- User who recorded vitals (e.g., Nurse)
    FOREIGN KEY (patient_id) REFERENCES Patients(patient_id),
    FOREIGN KEY (opd_visit_id) REFERENCES OPDVisits(opd_visit_id),
    -- FOREIGN KEY (admission_id) REFERENCES Admissions(admission_id),
    FOREIGN KEY (recorded_by_user_id) REFERENCES Users(user_id)
);

-- Define Consultations (linked to OPD Visit or IPD Admission)
CREATE TABLE Consultations (
    consultation_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    opd_visit_id INTEGER, -- Link to OPD visit
    admission_id INTEGER, -- Link to IPD admission
    consultation_datetime DATETIME DEFAULT CURRENT_TIMESTAMP,
    chief_complaint TEXT,
    history_of_present_illness TEXT,
    physical_examination TEXT,
    diagnosis TEXT,
    treatment_plan TEXT,
    follow_up_instructions TEXT,
    notes TEXT, -- Doctor's private notes
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES Patients(patient_id),
    FOREIGN KEY (doctor_id) REFERENCES Doctors(doctor_id),
    FOREIGN KEY (opd_visit_id) REFERENCES OPDVisits(opd_visit_id)
    -- FOREIGN KEY (admission_id) REFERENCES Admissions(admission_id)
);

-- Define Prescriptions (linked to Consultation)
CREATE TABLE Prescriptions (
    prescription_id INTEGER PRIMARY KEY AUTOINCREMENT,
    consultation_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    prescription_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT, -- General notes for the prescription
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (consultation_id) REFERENCES Consultations(consultation_id),
    FOREIGN KEY (patient_id) REFERENCES Patients(patient_id),
    FOREIGN KEY (doctor_id) REFERENCES Doctors(doctor_id)
);

-- Define Prescription Items (medications within a prescription)
CREATE TABLE PrescriptionItems (
    prescription_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    prescription_id INTEGER NOT NULL,
    inventory_item_id INTEGER NOT NULL, -- Link to the specific drug/item in inventory
    drug_name TEXT NOT NULL, -- Store name at time of prescription for record
    dosage TEXT NOT NULL, -- e.g., "500mg", "1 tablet"
    frequency TEXT NOT NULL, -- e.g., "Twice a day", "Every 6 hours"
    duration TEXT NOT NULL, -- e.g., "7 days", "Until finished"
    route TEXT, -- e.g., "Oral", "IV"
    instructions TEXT, -- e.g., "Take with food"
    quantity_prescribed INTEGER, -- Optional: Calculated or specified quantity
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prescription_id) REFERENCES Prescriptions(prescription_id),
    FOREIGN KEY (inventory_item_id) REFERENCES InventoryItems(inventory_item_id)
);

-- Define Lab Orders (linked to Consultation)
CREATE TABLE LabOrders (
    lab_order_id INTEGER PRIMARY KEY AUTOINCREMENT,
    consultation_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    order_datetime DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT CHECK(status IN ("Ordered", "SampleCollected", "Processing", "Completed", "Cancelled")) DEFAULT "Ordered",
    notes TEXT, -- Doctor's notes for the lab
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (consultation_id) REFERENCES Consultations(consultation_id),
    FOREIGN KEY (patient_id) REFERENCES Patients(patient_id),
    FOREIGN KEY (doctor_id) REFERENCES Doctors(doctor_id)
);

-- Define Lab Order Items (specific tests within an order)
CREATE TABLE LabOrderItems (
    lab_order_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    lab_order_id INTEGER NOT NULL,
    billable_item_id INTEGER NOT NULL, -- Link to the lab test in BillableItems
    test_name TEXT NOT NULL, -- Store name at time of order
    sample_type TEXT, -- e.g., Blood, Urine
    sample_id TEXT UNIQUE, -- Barcode/Sample Identifier
    sample_collection_datetime DATETIME,
    sample_collected_by_user_id INTEGER,
    result_value TEXT,
    result_unit TEXT,
    reference_range TEXT,
    result_notes TEXT,
    result_datetime DATETIME,
    result_verified_by_user_id INTEGER,
    status TEXT CHECK(status IN ("Ordered", "SampleCollected", "Processing", "Completed", "Cancelled")) DEFAULT "Ordered",
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lab_order_id) REFERENCES LabOrders(lab_order_id),
    FOREIGN KEY (billable_item_id) REFERENCES BillableItems(item_id),
    FOREIGN KEY (sample_collected_by_user_id) REFERENCES Users(user_id),
    FOREIGN KEY (result_verified_by_user_id) REFERENCES Users(user_id)
);

-- Create indexes for faster lookups
CREATE INDEX idx_users_username ON Users (username);
CREATE INDEX idx_users_email ON Users (email);
CREATE INDEX idx_users_role_id ON Users (role_id);

CREATE INDEX idx_patients_name ON Patients (last_name, first_name);
CREATE INDEX idx_patients_phone ON Patients (phone_number);
CREATE INDEX idx_patients_email ON Patients (email);
CREATE INDEX idx_patients_user_id ON Patients (user_id);

CREATE INDEX idx_doctors_user_id ON Doctors (user_id);
CREATE INDEX idx_doctors_specialty ON Doctors (specialty);

CREATE INDEX idx_schedules_doctor_day ON DoctorSchedules (doctor_id, day_of_week);

CREATE INDEX idx_appointments_patient_id ON Appointments (patient_id);
CREATE INDEX idx_appointments_doctor_id ON Appointments (doctor_id);
CREATE INDEX idx_appointments_datetime ON Appointments (appointment_datetime);
CREATE INDEX idx_appointments_status ON Appointments (status);

CREATE INDEX idx_billableitems_name ON BillableItems (item_name);
CREATE INDEX idx_billableitems_type ON BillableItems (item_type);

CREATE INDEX idx_inventoryitems_name ON InventoryItems (item_name);
CREATE INDEX idx_inventoryitems_category ON InventoryItems (category);
CREATE INDEX idx_inventoryitems_billable_id ON InventoryItems (billable_item_id);

CREATE INDEX idx_stockbatches_item_id ON StockBatches (inventory_item_id);
CREATE INDEX idx_stockbatches_expiry ON StockBatches (expiry_date);

CREATE INDEX idx_invoices_patient_id ON Invoices (patient_id);
CREATE INDEX idx_invoices_status ON Invoices (status);
CREATE INDEX idx_invoices_date ON Invoices (invoice_date);
CREATE INDEX idx_invoices_opd_visit_id ON Invoices (opd_visit_id);

CREATE INDEX idx_invoiceitems_invoice_id ON InvoiceItems (invoice_id);
CREATE INDEX idx_invoiceitems_billable_id ON InvoiceItems (billable_item_id);

CREATE INDEX idx_payments_invoice_id ON Payments (invoice_id);
CREATE INDEX idx_payments_patient_id ON Payments (patient_id);
CREATE INDEX idx_payments_date ON Payments (payment_date);

CREATE INDEX idx_opdvisits_patient_id ON OPDVisits (patient_id);
CREATE INDEX idx_opdvisits_doctor_id ON OPDVisits (doctor_id);
CREATE INDEX idx_opdvisits_datetime ON OPDVisits (visit_datetime);
CREATE INDEX idx_opdvisits_status ON OPDVisits (status);

CREATE INDEX idx_vitals_patient_id ON PatientVitals (patient_id);
CREATE INDEX idx_vitals_visit_id ON PatientVitals (opd_visit_id);
CREATE INDEX idx_vitals_recorded_at ON PatientVitals (recorded_at);

CREATE INDEX idx_consultations_patient_id ON Consultations (patient_id);
CREATE INDEX idx_consultations_doctor_id ON Consultations (doctor_id);
CREATE INDEX idx_consultations_visit_id ON Consultations (opd_visit_id);

CREATE INDEX idx_prescriptions_consultation_id ON Prescriptions (consultation_id);
CREATE INDEX idx_prescriptions_patient_id ON Prescriptions (patient_id);

CREATE INDEX idx_prescriptionitems_prescription_id ON PrescriptionItems (prescription_id);
CREATE INDEX idx_prescriptionitems_inventory_id ON PrescriptionItems (inventory_item_id);

CREATE INDEX idx_laborders_consultation_id ON LabOrders (consultation_id);
CREATE INDEX idx_laborders_patient_id ON LabOrders (patient_id);
CREATE INDEX idx_laborders_status ON LabOrders (status);

CREATE INDEX idx_laborderitems_order_id ON LabOrderItems (lab_order_id);
CREATE INDEX idx_laborderitems_billable_id ON LabOrderItems (billable_item_id);
CREATE INDEX idx_laborderitems_status ON LabOrderItems (status);

-- Add more tables and constraints as needed for other modules later

