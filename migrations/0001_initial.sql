-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create patients table
CREATE TABLE IF NOT EXISTS patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mrn TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  emergency_contact TEXT,
  blood_group TEXT,
  allergies TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  doctor_id INTEGER NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients (id),
  FOREIGN KEY (doctor_id) REFERENCES users (id)
);

-- Create opd_queue table
CREATE TABLE IF NOT EXISTS opd_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER NOT NULL,
  token_number INTEGER NOT NULL,
  check_in_time TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (appointment_id) REFERENCES appointments (id)
);

-- Create consultations table
CREATE TABLE IF NOT EXISTS consultations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER NOT NULL,
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
  FOREIGN KEY (appointment_id) REFERENCES appointments (id),
  FOREIGN KEY (patient_id) REFERENCES patients (id),
  FOREIGN KEY (doctor_id) REFERENCES users (id)
);

-- Create vital_signs table
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

-- Create medications table
CREATE TABLE IF NOT EXISTS medications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  consultation_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration TEXT NOT NULL,
  instructions TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (consultation_id) REFERENCES consultations (id)
);

-- Create lab_tests table
CREATE TABLE IF NOT EXISTS lab_tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  consultation_id INTEGER NOT NULL,
  test_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ordered',
  result TEXT,
  result_date TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (consultation_id) REFERENCES consultations (id)
);

-- Create pharmacy_inventory table
CREATE TABLE IF NOT EXISTS pharmacy_inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  unit_price REAL NOT NULL,
  expiry_date DATE,
  manufacturer TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create billing_invoices table
CREATE TABLE IF NOT EXISTS billing_invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_date DATE NOT NULL,
  total_amount REAL NOT NULL,
  paid_amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  payment_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients (id)
);

-- Create billing_items table
CREATE TABLE IF NOT EXISTS billing_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL,
  total_price REAL NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES billing_invoices (id)
);

-- Insert sample users
INSERT INTO users (username, password_hash, email, role, first_name, last_name)
VALUES 
  ('admin', '$2a$12$1234567890123456789012uGZACxF9RMGIDODVSULMOIQXzrZpZK6', 'admin@shlokam.care', 'Admin', 'Admin', 'User'),
  ('doctor', '$2a$12$1234567890123456789012uGZACxF9RMGIDODVSULMOIQXzrZpZK6', 'doctor@shlokam.care', 'Doctor', 'John', 'Smith'),
  ('receptionist', '$2a$12$1234567890123456789012uGZACxF9RMGIDODVSULMOIQXzrZpZK6', 'receptionist@shlokam.care', 'Receptionist', 'Sarah', 'Johnson');

-- Insert sample patients
INSERT INTO patients (mrn, first_name, last_name, date_of_birth, gender, phone, email)
VALUES 
  ('P0001', 'Rahul', 'Sharma', '1985-05-15', 'Male', '9876543210', 'rahul@example.com'),
  ('P0002', 'Priya', 'Patel', '1990-08-22', 'Female', '8765432109', 'priya@example.com'),
  ('P0003', 'Amit', 'Singh', '1978-12-10', 'Male', '7654321098', 'amit@example.com');

-- Insert sample appointments
INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, reason, status)
VALUES 
  (1, 2, CURRENT_DATE, '10:00', 'Fever and cough', 'scheduled'),
  (2, 2, CURRENT_DATE, '11:30', 'Regular checkup', 'scheduled'),
  (3, 2, CURRENT_DATE, '14:00', 'Headache', 'scheduled');

-- Insert sample pharmacy inventory
INSERT INTO pharmacy_inventory (item_name, category, stock, unit, unit_price, manufacturer)
VALUES 
  ('Paracetamol', 'Medicine', 100, 'tablet', 2.50, 'Generic Pharma'),
  ('Amoxicillin', 'Antibiotic', 50, 'capsule', 5.75, 'MediCorp'),
  ('Syringes', 'Equipment', 200, 'piece', 10.00, 'MedSupplies');
