-- Migration for Insurance & TPA Management Module

-- Table for Insurance Providers / TPAs
CREATE TABLE insurance_providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    is_tpa BOOLEAN DEFAULT FALSE, -- True if it's a Third Party Administrator
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Table for Patient Insurance Policies
CREATE TABLE patient_insurance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    provider_id INTEGER NOT NULL,
    policy_number TEXT NOT NULL,
    plan_name TEXT,
    subscriber_name TEXT, -- Usually the primary holder
    relationship_to_subscriber TEXT, -- Self, Spouse, Child, etc.
    effective_date TEXT NOT NULL,
    expiry_date TEXT NOT NULL,
    coverage_details TEXT, -- Details about what's covered, limits, co-pay etc.
    is_active BOOLEAN DEFAULT TRUE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients (id),
    FOREIGN KEY (provider_id) REFERENCES insurance_providers (id)
);

-- Table for Pre-Authorization Requests
CREATE TABLE pre_authorizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_insurance_id INTEGER NOT NULL,
    request_date TEXT DEFAULT CURRENT_TIMESTAMP,
    requested_procedure TEXT NOT NULL,
    estimated_cost REAL,
    requesting_doctor_id INTEGER,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, more_info_required
    provider_reference_number TEXT, -- Number given by insurance provider
    approval_date TEXT,
    rejection_reason TEXT,
    approved_amount REAL,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_insurance_id) REFERENCES patient_insurance (id),
    FOREIGN KEY (requesting_doctor_id) REFERENCES doctors (id)
);

-- Table for Insurance Claims
CREATE TABLE insurance_claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_insurance_id INTEGER NOT NULL,
    invoice_id INTEGER NOT NULL UNIQUE, -- Link to the main hospital invoice
    claim_submission_date TEXT DEFAULT CURRENT_TIMESTAMP,
    claim_amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'submitted', -- submitted, processing, approved, partially_approved, rejected, paid
    provider_claim_number TEXT, -- Claim number assigned by provider
    approved_amount REAL,
    paid_amount REAL,
    rejection_reason TEXT,
    payment_date TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_insurance_id) REFERENCES patient_insurance (id),
    FOREIGN KEY (invoice_id) REFERENCES invoices (id) -- Assuming an 'invoices' table exists from Billing module
);

-- Indexes for performance
CREATE INDEX idx_patient_insurance_patient_id ON patient_insurance (patient_id);
CREATE INDEX idx_patient_insurance_provider_id ON patient_insurance (provider_id);
CREATE INDEX idx_pre_auth_patient_insurance_id ON pre_authorizations (patient_insurance_id);
CREATE INDEX idx_pre_auth_status ON pre_authorizations (status);
CREATE INDEX idx_claims_patient_insurance_id ON insurance_claims (patient_insurance_id);
CREATE INDEX idx_claims_invoice_id ON insurance_claims (invoice_id);
CREATE INDEX idx_claims_status ON insurance_claims (status);

