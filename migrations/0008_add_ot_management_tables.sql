-- Migration file for Operation Theatre Management Module

-- Table for Operation Theatres
CREATE TABLE IF NOT EXISTS OperationTheatres (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL UNIQUE,
    location TEXT,
    specialty TEXT, -- e.g., General, Cardiac, Neuro
    status TEXT DEFAULT 'available', -- available, occupied, maintenance, unavailable
    equipment TEXT, -- JSON or TEXT field listing key equipment
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for Surgery Types
CREATE TABLE IF NOT EXISTS SurgeryTypes (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    specialty TEXT, -- Link to department or specialty
    estimated_duration_minutes INTEGER, -- Average duration
    required_staff TEXT, -- JSON or TEXT (e.g., {"surgeon": 1, "anesthesiologist": 1, "nurse": 2})
    required_equipment TEXT, -- JSON or TEXT
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for OT Bookings (Scheduled Surgeries)
CREATE TABLE IF NOT EXISTS OTBookings (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    patient_id TEXT NOT NULL,
    surgery_type_id TEXT NOT NULL,
    theatre_id TEXT NOT NULL,
    lead_surgeon_id TEXT NOT NULL, -- User ID of the lead surgeon
    anesthesiologist_id TEXT, -- User ID of the anesthesiologist
    scheduled_start_time TIMESTAMP NOT NULL,
    scheduled_end_time TIMESTAMP NOT NULL,
    booking_type TEXT DEFAULT 'elective', -- elective, emergency
    priority TEXT DEFAULT 'routine', -- routine, urgent, stat
    status TEXT DEFAULT 'scheduled', -- scheduled, confirmed, cancelled, completed, in_progress, postponed
    pre_op_assessment_notes TEXT,
    consent_obtained BOOLEAN DEFAULT FALSE,
    booking_notes TEXT,
    created_by_id TEXT, -- User ID who created the booking
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES Patients(id),
    FOREIGN KEY (surgery_type_id) REFERENCES SurgeryTypes(id),
    FOREIGN KEY (theatre_id) REFERENCES OperationTheatres(id),
    FOREIGN KEY (lead_surgeon_id) REFERENCES Users(id),
    FOREIGN KEY (anesthesiologist_id) REFERENCES Users(id),
    FOREIGN KEY (created_by_id) REFERENCES Users(id)
);

-- Table for OT Staff Assignments (linking staff to bookings)
CREATE TABLE IF NOT EXISTS OTStaffAssignments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    booking_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL, -- e.g., Surgeon, Assistant Surgeon, Anesthesiologist, Scrub Nurse, Circulating Nurse, Technician
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES OTBookings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(id)
);

-- Table for OT Checklists (Templates)
CREATE TABLE IF NOT EXISTS OTChecklistTemplates (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL UNIQUE, -- e.g., WHO Surgical Safety Checklist
    phase TEXT NOT NULL, -- pre-op, intra-op (sign-in, time-out, sign-out), post-op
    items TEXT NOT NULL, -- JSON array of checklist items [{ "id": "item1", "text": "Confirm patient identity?" }]
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for OT Checklist Responses (Specific to a booking)
CREATE TABLE IF NOT EXISTS OTChecklistResponses (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    booking_id TEXT NOT NULL,
    checklist_template_id TEXT NOT NULL,
    phase TEXT NOT NULL,
    responses TEXT NOT NULL, -- JSON object mapping item IDs to responses { "item1": true, "item2": "N/A" }
    completed_by_id TEXT, -- User ID who completed the checklist phase
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES OTBookings(id) ON DELETE CASCADE,
    FOREIGN KEY (checklist_template_id) REFERENCES OTChecklistTemplates(id),
    FOREIGN KEY (completed_by_id) REFERENCES Users(id)
);

-- Table for OT Records (Intra-operative details)
CREATE TABLE IF NOT EXISTS OTRecords (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    booking_id TEXT NOT NULL UNIQUE,
    actual_start_time TIMESTAMP,
    actual_end_time TIMESTAMP,
    anesthesia_start_time TIMESTAMP,
    anesthesia_end_time TIMESTAMP,
    anesthesia_type TEXT,
    anesthesia_notes TEXT,
    surgical_procedure_notes TEXT,
    implants_used TEXT, -- JSON or TEXT
    specimens_collected TEXT, -- JSON or TEXT
    blood_loss_ml INTEGER,
    complications TEXT,
    instrument_count_correct BOOLEAN,
    sponge_count_correct BOOLEAN,
    recorded_by_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES OTBookings(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by_id) REFERENCES Users(id)
);

-- Table for OT Inventory Usage (Consumables, Instruments)
CREATE TABLE IF NOT EXISTS OTInventoryUsage (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    record_id TEXT NOT NULL, -- Link to OTRecords
    item_id TEXT NOT NULL, -- Link to a central inventory/item master table (to be created if not exists)
    item_type TEXT NOT NULL, -- Consumable, Instrument, Implant
    quantity_used INTEGER NOT NULL,
    batch_number TEXT, -- For implants/trackable items
    expiry_date DATE,
    notes TEXT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (record_id) REFERENCES OTRecords(id) ON DELETE CASCADE
    -- FOREIGN KEY (item_id) REFERENCES InventoryItems(id) -- Assuming an InventoryItems table exists
);

-- Table for OT Recovery Records (Post-operative recovery phase)
CREATE TABLE IF NOT EXISTS OTRecoveryRecords (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    record_id TEXT NOT NULL UNIQUE, -- Link to OTRecords
    recovery_start_time TIMESTAMP,
    recovery_end_time TIMESTAMP,
    vital_signs TEXT, -- JSON storing periodic vital signs
    pain_score INTEGER,
    medication_given TEXT, -- JSON or TEXT
    recovery_notes TEXT,
    discharge_criteria_met BOOLEAN DEFAULT FALSE,
    discharged_to TEXT, -- Ward, ICU, Home
    recorded_by_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (record_id) REFERENCES OTRecords(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by_id) REFERENCES Users(id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_otbookings_patient_id ON OTBookings(patient_id);
CREATE INDEX IF NOT EXISTS idx_otbookings_theatre_id_time ON OTBookings(theatre_id, scheduled_start_time, scheduled_end_time);
CREATE INDEX IF NOT EXISTS idx_otbookings_status ON OTBookings(status);
CREATE INDEX IF NOT EXISTS idx_otstaffassignments_booking_id ON OTStaffAssignments(booking_id);
CREATE INDEX IF NOT EXISTS idx_otchecklistresponses_booking_id ON OTChecklistResponses(booking_id);
CREATE INDEX IF NOT EXISTS idx_otrecords_booking_id ON OTRecords(booking_id);
CREATE INDEX IF NOT EXISTS idx_otinventoryusage_record_id ON OTInventoryUsage(record_id);
CREATE INDEX IF NOT EXISTS idx_otrecoveryrecords_record_id ON OTRecoveryRecords(record_id);

-- Update existing tables if necessary (e.g., add OT roles to Users table)
-- ALTER TABLE Users ADD COLUMN ot_role TEXT;

