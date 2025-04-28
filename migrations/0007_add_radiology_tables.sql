-- Migration file for Radiology Management Module

-- Table for Radiology Procedure Types
CREATE TABLE IF NOT EXISTS RadiologyProcedureTypes (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    modality_type TEXT, -- e.g., 'XRAY', 'CT', 'MRI', 'ULTRASOUND'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for Radiology Modalities (optional, could be linked from ProcedureTypes or Studies)
CREATE TABLE IF NOT EXISTS RadiologyModalities (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE, -- e.g., 'CT Scanner 1', 'MRI Unit A'
    description TEXT,
    location TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for Radiology Orders/Requests
CREATE TABLE IF NOT EXISTS RadiologyOrders (
    id TEXT PRIMARY KEY NOT NULL,
    patient_id TEXT NOT NULL,
    referring_doctor_id TEXT, -- Can be null if ordered internally without specific referrer
    procedure_type_id TEXT NOT NULL,
    order_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    clinical_indication TEXT NOT NULL,
    priority TEXT DEFAULT 'routine', -- e.g., 'routine', 'stat'
    status TEXT DEFAULT 'pending', -- e.g., 'pending', 'scheduled', 'in_progress', 'completed', 'cancelled'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES Patients(id),
    FOREIGN KEY (referring_doctor_id) REFERENCES Users(id),
    FOREIGN KEY (procedure_type_id) REFERENCES RadiologyProcedureTypes(id)
);

-- Table for Radiology Studies (representing a performed examination)
CREATE TABLE IF NOT EXISTS RadiologyStudies (
    id TEXT PRIMARY KEY NOT NULL,
    order_id TEXT NOT NULL,
    accession_number TEXT UNIQUE, -- Unique identifier for the study
    study_datetime TIMESTAMP,
    modality_id TEXT, -- Link to the specific machine used
    technician_id TEXT, -- User ID of the technician performing the study
    protocol TEXT, -- Details of the study protocol used
    series_description TEXT,
    number_of_images INTEGER,
    status TEXT DEFAULT 'scheduled', -- e.g., 'scheduled', 'acquired', 'reported', 'verified'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES RadiologyOrders(id),
    FOREIGN KEY (modality_id) REFERENCES RadiologyModalities(id),
    FOREIGN KEY (technician_id) REFERENCES Users(id)
);

-- Table for Radiology Reports
CREATE TABLE IF NOT EXISTS RadiologyReports (
    id TEXT PRIMARY KEY NOT NULL,
    study_id TEXT NOT NULL,
    radiologist_id TEXT NOT NULL, -- User ID of the reporting radiologist
    report_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    findings TEXT,
    impression TEXT NOT NULL,
    recommendations TEXT,
    status TEXT DEFAULT 'preliminary', -- e.g., 'preliminary', 'final', 'addendum'
    verified_by_id TEXT, -- User ID of verifier if needed
    verified_datetime TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (study_id) REFERENCES RadiologyStudies(id),
    FOREIGN KEY (radiologist_id) REFERENCES Users(id),
    FOREIGN KEY (verified_by_id) REFERENCES Users(id)
);

