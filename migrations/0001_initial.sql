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
    -- Link to Users table if patient is also a user (for patient portal access)
    user_id INTEGER UNIQUE, 
    -- Basic Demographics
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    gender TEXT CHECK(gender IN (
        "Male", 
        "Female", 
        "Other", 
        "Prefer not to say"
    )) NOT NULL,
    -- Contact Information
    phone_number TEXT NOT NULL,
    email TEXT UNIQUE, -- Optional, but unique if provided
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT,
    -- Emergency Contact
    emergency_contact_name TEXT,
    emergency_contact_relation TEXT,
    emergency_contact_phone TEXT,
    -- Medical Information
    blood_group TEXT, -- e.g., A+, O-
    allergies TEXT, -- Store as comma-separated string or JSON
    past_medical_history TEXT, -- Store as text, consider separate table for structured history
    current_medications TEXT, -- Store as text or JSON
    -- Insurance Information
    insurance_provider TEXT,
    insurance_policy_number TEXT,
    -- Other
    registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    registered_by_user_id INTEGER, -- Link to the user (e.g., receptionist) who registered the patient
    is_active BOOLEAN DEFAULT TRUE,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (registered_by_user_id) REFERENCES Users(user_id)
);

-- Create indexes for faster lookups
CREATE INDEX idx_users_username ON Users (username);
CREATE INDEX idx_users_email ON Users (email);
CREATE INDEX idx_users_role_id ON Users (role_id);

CREATE INDEX idx_patients_name ON Patients (last_name, first_name);
CREATE INDEX idx_patients_phone ON Patients (phone_number);
CREATE INDEX idx_patients_email ON Patients (email);
CREATE INDEX idx_patients_user_id ON Patients (user_id);

-- Add more tables and constraints as needed for other modules later

