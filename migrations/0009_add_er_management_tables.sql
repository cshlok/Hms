-- Migration 0009: Add Emergency Department (ER) Management Tables
-- Description: Creates tables for managing ER visits, triage, patient status, and critical alerts.

-- Table to store information about each Emergency Department visit
CREATE TABLE er_visits (
    id TEXT PRIMARY KEY NOT NULL, -- Unique identifier for the ER visit (UUID)
    patient_id TEXT NOT NULL,      -- Foreign key referencing the patients table
    arrival_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Timestamp of patient arrival
    arrival_mode TEXT,             -- Mode of arrival (e.g., Ambulance, Walk-in, Wheelchair)
    chief_complaint TEXT,          -- Main reason for the visit
    presenting_illness_history TEXT, -- Detailed history of the current problem
    assigned_physician_id TEXT,    -- Foreign key referencing the users table (physician)
    assigned_nurse_id TEXT,        -- Foreign key referencing the users table (nurse)
    current_location TEXT,         -- Current location within the ER (e.g., Waiting Room, Triage, Room 1, Resus Bay)
    current_status TEXT,           -- Current clinical status (e.g., Triage, Assessment, Treatment, Awaiting Disposition, Discharged, Admitted)
    disposition TEXT,              -- Final disposition (e.g., Discharged Home, Admitted to IPD, Transferred, LWBS)
    discharge_timestamp DATETIME,  -- Timestamp of patient discharge or transfer from ER
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (assigned_physician_id) REFERENCES users(id),
    FOREIGN KEY (assigned_nurse_id) REFERENCES users(id)
);

-- Index for faster querying by patient_id
CREATE INDEX idx_er_visits_patient_id ON er_visits(patient_id);
-- Index for faster querying by status and location
CREATE INDEX idx_er_visits_status ON er_visits(current_status);
CREATE INDEX idx_er_visits_location ON er_visits(current_location);

-- Table to store triage assessment details for each ER visit
CREATE TABLE er_triage_assessments (
    id TEXT PRIMARY KEY NOT NULL, -- Unique identifier for the triage assessment (UUID)
    visit_id TEXT NOT NULL,        -- Foreign key referencing the er_visits table
    triage_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Timestamp of triage assessment
    triage_nurse_id TEXT NOT NULL, -- Foreign key referencing the users table (nurse)
    esi_level INTEGER NOT NULL CHECK (esi_level BETWEEN 1 AND 5), -- Emergency Severity Index (1-5)
    vital_signs TEXT,              -- JSON object storing vital signs (e.g., HR, BP, RR, Temp, SpO2)
    assessment_notes TEXT,         -- Nurse's notes during triage
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (visit_id) REFERENCES er_visits(id),
    FOREIGN KEY (triage_nurse_id) REFERENCES users(id)
);

-- Index for faster querying by visit_id
CREATE INDEX idx_er_triage_assessments_visit_id ON er_triage_assessments(visit_id);

-- Table to log changes in patient status and location within the ER
CREATE TABLE er_patient_status_logs (
    id TEXT PRIMARY KEY NOT NULL, -- Unique identifier for the log entry (UUID)
    visit_id TEXT NOT NULL,        -- Foreign key referencing the er_visits table
    log_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Timestamp of the status/location change
    status TEXT,                   -- The new clinical status (optional, if changed)
    location TEXT,                 -- The new location (optional, if changed)
    updated_by_id TEXT,            -- Foreign key referencing the users table (who made the change)
    notes TEXT,                    -- Optional notes about the change
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (visit_id) REFERENCES er_visits(id),
    FOREIGN KEY (updated_by_id) REFERENCES users(id)
);

-- Index for faster querying by visit_id and timestamp
CREATE INDEX idx_er_patient_status_logs_visit_id ON er_patient_status_logs(visit_id);
CREATE INDEX idx_er_patient_status_logs_timestamp ON er_patient_status_logs(log_timestamp);

-- Table to track critical alerts activated during an ER visit
CREATE TABLE er_critical_alerts (
    id TEXT PRIMARY KEY NOT NULL, -- Unique identifier for the alert (UUID)
    visit_id TEXT NOT NULL,        -- Foreign key referencing the er_visits table
    alert_type TEXT NOT NULL,      -- Type of alert (e.g., Sepsis, Stroke, STEMI, Trauma, Critical Lab)
    activation_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Timestamp when the alert was activated
    activated_by_id TEXT,          -- Foreign key referencing the users table (who activated it)
    acknowledgement_timestamp DATETIME, -- Timestamp when the alert was acknowledged
    acknowledged_by_id TEXT,       -- Foreign key referencing the users table (who acknowledged it)
    resolution_timestamp DATETIME, -- Timestamp when the alert was resolved or deactivated
    resolved_by_id TEXT,           -- Foreign key referencing the users table (who resolved it)
    details TEXT,                  -- Additional details or context about the alert
    status TEXT NOT NULL DEFAULT 'Active', -- Current status (e.g., Active, Acknowledged, Resolved, Cancelled)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (visit_id) REFERENCES er_visits(id),
    FOREIGN KEY (activated_by_id) REFERENCES users(id),
    FOREIGN KEY (acknowledged_by_id) REFERENCES users(id),
    FOREIGN KEY (resolved_by_id) REFERENCES users(id)
);

-- Index for faster querying by visit_id and alert_type
CREATE INDEX idx_er_critical_alerts_visit_id ON er_critical_alerts(visit_id);
CREATE INDEX idx_er_critical_alerts_alert_type ON er_critical_alerts(alert_type);
CREATE INDEX idx_er_critical_alerts_status ON er_critical_alerts(status);


