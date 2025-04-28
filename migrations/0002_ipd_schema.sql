-- IPD Module Database Schema Extensions

-- Create beds table
CREATE TABLE IF NOT EXISTS beds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bed_number TEXT NOT NULL,
  room_number TEXT NOT NULL,
  ward TEXT NOT NULL,
  category TEXT NOT NULL, -- general, semi-private, private, ICU, etc.
  status TEXT NOT NULL DEFAULT 'available', -- available, occupied, reserved, maintenance
  price_per_day REAL NOT NULL,
  features TEXT, -- comma-separated list of features
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create admissions table
CREATE TABLE IF NOT EXISTS admissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  admission_number TEXT NOT NULL UNIQUE,
  admission_date TIMESTAMP NOT NULL,
  admission_type TEXT NOT NULL, -- emergency, planned, transfer
  primary_doctor_id INTEGER NOT NULL,
  bed_id INTEGER NOT NULL,
  diagnosis TEXT NOT NULL,
  estimated_stay INTEGER, -- in days
  status TEXT NOT NULL DEFAULT 'active', -- active, discharged
  discharge_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients (id),
  FOREIGN KEY (primary_doctor_id) REFERENCES users (id),
  FOREIGN KEY (bed_id) REFERENCES beds (id)
);

-- Create bed_transfers table
CREATE TABLE IF NOT EXISTS bed_transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admission_id INTEGER NOT NULL,
  from_bed_id INTEGER NOT NULL,
  to_bed_id INTEGER NOT NULL,
  transfer_date TIMESTAMP NOT NULL,
  reason TEXT,
  authorized_by INTEGER NOT NULL, -- user_id
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admission_id) REFERENCES admissions (id),
  FOREIGN KEY (from_bed_id) REFERENCES beds (id),
  FOREIGN KEY (to_bed_id) REFERENCES beds (id),
  FOREIGN KEY (authorized_by) REFERENCES users (id)
);

-- Create progress_notes table
CREATE TABLE IF NOT EXISTS progress_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admission_id INTEGER NOT NULL,
  doctor_id INTEGER NOT NULL,
  note_date TIMESTAMP NOT NULL,
  subjective TEXT, -- patient's symptoms and complaints
  objective TEXT, -- examination findings
  assessment TEXT, -- diagnosis and assessment
  plan TEXT, -- treatment plan
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admission_id) REFERENCES admissions (id),
  FOREIGN KEY (doctor_id) REFERENCES users (id)
);

-- Create nursing_notes table
CREATE TABLE IF NOT EXISTS nursing_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admission_id INTEGER NOT NULL,
  nurse_id INTEGER NOT NULL,
  note_date TIMESTAMP NOT NULL,
  vital_signs TEXT, -- JSON format for temperature, pulse, BP, etc.
  intake_output TEXT, -- JSON format for fluid intake and output
  medication_given TEXT, -- JSON format for medications administered
  procedures TEXT, -- procedures performed
  notes TEXT, -- general nursing observations
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admission_id) REFERENCES admissions (id),
  FOREIGN KEY (nurse_id) REFERENCES users (id)
);

-- Create vital_signs_records table
CREATE TABLE IF NOT EXISTS vital_signs_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admission_id INTEGER NOT NULL,
  recorded_by INTEGER NOT NULL, -- user_id
  record_time TIMESTAMP NOT NULL,
  temperature REAL,
  pulse INTEGER,
  respiratory_rate INTEGER,
  blood_pressure TEXT,
  oxygen_saturation REAL,
  pain_level INTEGER, -- 0-10 scale
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admission_id) REFERENCES admissions (id),
  FOREIGN KEY (recorded_by) REFERENCES users (id)
);

-- Create medication_administration table
CREATE TABLE IF NOT EXISTS medication_administration (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admission_id INTEGER NOT NULL,
  medication_id INTEGER NOT NULL, -- from pharmacy_inventory
  administered_by INTEGER NOT NULL, -- user_id
  administered_time TIMESTAMP NOT NULL,
  dosage TEXT NOT NULL,
  route TEXT NOT NULL, -- oral, IV, IM, etc.
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admission_id) REFERENCES admissions (id),
  FOREIGN KEY (medication_id) REFERENCES pharmacy_inventory (id),
  FOREIGN KEY (administered_by) REFERENCES users (id)
);

-- Create discharge_summaries table
CREATE TABLE IF NOT EXISTS discharge_summaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admission_id INTEGER NOT NULL UNIQUE,
  discharge_date TIMESTAMP NOT NULL,
  discharge_diagnosis TEXT NOT NULL,
  treatment_summary TEXT NOT NULL,
  medications TEXT NOT NULL, -- JSON format for discharge medications
  follow_up TEXT,
  home_care_instructions TEXT,
  doctor_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admission_id) REFERENCES admissions (id),
  FOREIGN KEY (doctor_id) REFERENCES users (id)
);

-- Insert sample data for beds
INSERT INTO beds (bed_number, room_number, ward, category, status, price_per_day, features)
VALUES 
  ('101-A', '101', 'General Ward', 'general', 'available', 1000.00, 'oxygen,call button'),
  ('101-B', '101', 'General Ward', 'general', 'available', 1000.00, 'oxygen,call button'),
  ('102-A', '102', 'General Ward', 'general', 'available', 1000.00, 'oxygen,call button'),
  ('201-A', '201', 'Semi-Private', 'semi-private', 'available', 2000.00, 'oxygen,call button,television'),
  ('301-A', '301', 'Private', 'private', 'available', 3500.00, 'oxygen,call button,television,attached bathroom'),
  ('ICU-01', 'ICU', 'Intensive Care', 'icu', 'available', 5000.00, 'ventilator,monitoring equipment,isolation');
