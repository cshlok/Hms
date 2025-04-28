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
    -- Add other doctor-specific details as needed
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

-- Add more tables and constraints as needed for other modules later

