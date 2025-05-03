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
    -- FOREIGN KEY (opd_visit_id) REFERENCES OPDVisits(opd_visit_id), -- Need OPDVisits table definition
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
-- This table was mentioned in origin/master but not fully defined, adding basic structure
CREATE TABLE OPDVisits (
    opd_visit_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    appointment_id INTEGER UNIQUE, -- Link if visit originated from an appointment
    visit_datetime DATETIME DEFAULT CURRENT_TIMESTAMP,
    doctor_id INTEGER, -- Doctor seen during the visit
    status TEXT, -- e.g., Waiting, InProgress, Completed
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES Patients(patient_id),
    FOREIGN KEY (appointment_id) REFERENCES Appointments(appointment_id),
    FOREIGN KEY (doctor_id) REFERENCES Doctors(doctor_id)
);

-- Add FK constraint to Invoices now that OPDVisits is defined
-- Note: This requires altering the table, which might not be directly supported in all SQLite versions via simple CREATE statements.
-- For simplicity in this merge, we'll assume the FK was intended and keep the comment.
-- ALTER TABLE Invoices ADD CONSTRAINT fk_opd_visit FOREIGN KEY (opd_visit_id) REFERENCES OPDVisits(opd_visit_id);

-- Create opd_queue table (from HEAD branch, adjusted FK)
CREATE TABLE IF NOT EXISTS opd_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER, -- Can be NULL for walk-ins
  opd_visit_id INTEGER, -- Link to the specific visit
  patient_id INTEGER NOT NULL,
  token_number INTEGER NOT NULL,
  check_in_time TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'waiting', -- waiting, called, completed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (appointment_id) REFERENCES Appointments (appointment_id),
  FOREIGN KEY (opd_visit_id) REFERENCES OPDVisits (opd_visit_id),
  FOREIGN KEY (patient_id) REFERENCES Patients (patient_id)
);

-- Create consultations table (from HEAD branch, adjusted FKs)
CREATE TABLE IF NOT EXISTS consultations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER, -- Optional link to appointment
  opd_visit_id INTEGER NOT NULL, -- Link to the specific visit
  patient_id INTEGER NOT NULL,
  doctor_id INTEGER NOT NULL,
  chief_complaint TEXT NOT NULL,
  present_illness TEXT,
  diagnosis TEXT NOT NULL,
  treatment_plan TEXT NOT NULL,
  follow_up_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (appointment_id) REFERENCES Appointments (appointment_id),
  FOREIGN KEY (opd_visit_id) REFERENCES OPDVisits (opd_visit_id),
  FOREIGN KEY (patient_id) REFERENCES Patients (patient_id),
  FOREIGN KEY (doctor_id) REFERENCES Doctors (doctor_id)
);

-- Create vital_signs table (from HEAD branch, linked to consultations)
CREATE TABLE IF NOT EXISTS vital_signs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  consultation_id INTEGER NOT NULL,
  temperature REAL,
  pulse INTEGER,
  respiratory_rate INTEGER,
  blood_pressure TEXT,
  oxygen_saturation REAL,
  weight REAL,
  height REAL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (consultation_id) REFERENCES consultations (id)
);

-- Create medications table (from HEAD branch, linked to consultations)
-- Renamed to PrescribedMedications to avoid conflict if a general medication list exists
CREATE TABLE IF NOT EXISTS PrescribedMedications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  consultation_id INTEGER NOT NULL,
  medication_name TEXT NOT NULL, -- Consider linking to BillableItems/InventoryItems if pharmacy item
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration TEXT NOT NULL,
  instructions TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (consultation_id) REFERENCES consultations (id)
);

-- Create lab_tests table (from HEAD branch, linked to consultations)
-- Renamed to OrderedLabTests to be more specific
CREATE TABLE IF NOT EXISTS OrderedLabTests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  consultation_id INTEGER NOT NULL,
  test_name TEXT NOT NULL, -- Consider linking to BillableItems if lab test is a billable service
  status TEXT NOT NULL DEFAULT 'ordered', -- ordered, sample_collected, result_available, reported
  result TEXT,
  result_date TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (consultation_id) REFERENCES consultations (id)
);

-- Note: pharmacy_inventory table from HEAD is omitted as origin/master's InventoryItems/StockBatches is more comprehensive.
-- Note: Sample data insertions from HEAD are omitted to avoid conflicts with the merged schema.

