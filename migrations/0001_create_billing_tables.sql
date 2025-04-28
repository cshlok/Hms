-- Migration for Billing & Invoicing Module

-- Drop existing tables if they exist (optional, for development)
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS invoice_items;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS billing_packages;
DROP TABLE IF EXISTS service_items;

-- Service Items Table (Master list of billable services/items)
CREATE TABLE service_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_code TEXT UNIQUE NOT NULL, -- e.g., LAB001, RAD002, CONS001, MED001
    item_name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- e.g., Consultation, Lab Test, Radiology, Procedure, Medication, Room Charge, Other
    unit_price REAL NOT NULL CHECK (unit_price >= 0),
    is_taxable BOOLEAN DEFAULT 1,
    is_discountable BOOLEAN DEFAULT 1,
    is_active BOOLEAN DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Billing Packages Table
CREATE TABLE billing_packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    package_code TEXT UNIQUE NOT NULL,
    package_name TEXT NOT NULL,
    description TEXT,
    total_price REAL NOT NULL CHECK (total_price >= 0),
    is_active BOOLEAN DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    -- Consider a separate table for package items if packages contain multiple service_items
);

-- Invoices Table
CREATE TABLE invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT UNIQUE NOT NULL, -- e.g., INV-YYYYMMDD-XXXX
    patient_id INTEGER NOT NULL, -- Foreign key to patients table (assuming it exists)
    visit_id INTEGER, -- Foreign key to visits/admissions table (optional, depends on context)
    invoice_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    due_date TEXT,
    sub_total REAL NOT NULL DEFAULT 0 CHECK (sub_total >= 0),
    discount_percentage REAL DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    discount_amount REAL DEFAULT 0 CHECK (discount_amount >= 0),
    tax_percentage REAL DEFAULT 0 CHECK (tax_percentage >= 0),
    tax_amount REAL DEFAULT 0 CHECK (tax_amount >= 0),
    total_amount REAL NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    amount_paid REAL NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
    amount_due REAL NOT NULL DEFAULT 0 CHECK (amount_due >= 0),
    status TEXT NOT NULL DEFAULT 'draft', -- draft, finalized, paid, partially_paid, void
    notes TEXT,
    created_by INTEGER, -- Foreign key to users table
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) -- Adjust if patient table name/key is different
    -- FOREIGN KEY (visit_id) REFERENCES admissions(id) -- Adjust if visit table name/key is different
    -- FOREIGN KEY (created_by) REFERENCES users(id) -- Adjust if user table name/key is different
);

-- Invoice Items Table
CREATE TABLE invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    service_item_id INTEGER NOT NULL,
    billing_package_id INTEGER, -- Nullable, use if item is part of a package
    item_description TEXT NOT NULL, -- Can be copied from service_items or customized
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price REAL NOT NULL CHECK (unit_price >= 0),
    sub_total REAL NOT NULL CHECK (sub_total >= 0), -- quantity * unit_price
    discount_percentage REAL DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    discount_amount REAL DEFAULT 0 CHECK (discount_amount >= 0),
    tax_percentage REAL DEFAULT 0 CHECK (tax_percentage >= 0),
    tax_amount REAL DEFAULT 0 CHECK (tax_amount >= 0),
    total_amount REAL NOT NULL CHECK (total_amount >= 0), -- sub_total - discount_amount + tax_amount
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (service_item_id) REFERENCES service_items(id),
    FOREIGN KEY (billing_package_id) REFERENCES billing_packages(id)
);

-- Payments Table
CREATE TABLE payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    payment_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    amount_paid REAL NOT NULL CHECK (amount_paid > 0),
    payment_method TEXT NOT NULL, -- e.g., Cash, Credit Card, Bank Transfer, Insurance, TPA
    reference_number TEXT, -- e.g., Transaction ID, Cheque Number
    notes TEXT,
    received_by INTEGER, -- Foreign key to users table
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (received_by) REFERENCES users(id) -- Adjust if user table name/key is different
);

-- Indexes for performance
CREATE INDEX idx_invoices_patient_id ON invoices(patient_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_service_items_category ON service_items(category);

