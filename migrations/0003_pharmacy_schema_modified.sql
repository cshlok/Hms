-- Pharmacy Module Database Schema (Migration 0003)

-- Medication Categories table
CREATE TABLE IF NOT EXISTS medication_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Manufacturers table
CREATE TABLE IF NOT EXISTS manufacturers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Drop existing medications table if it exists
DROP TABLE IF EXISTS medications;

-- Medications table (drug catalog)
CREATE TABLE IF NOT EXISTS medications (
  id TEXT PRIMARY KEY,
  item_code TEXT UNIQUE,
  generic_name TEXT NOT NULL,
  brand_name TEXT,
  category_id TEXT REFERENCES medication_categories(id),
  manufacturer_id TEXT REFERENCES manufacturers(id),
  dosage_form TEXT NOT NULL, -- tablet, capsule, syrup, injection, etc.
  strength TEXT NOT NULL, -- 500mg, 10ml, etc.
  route TEXT, -- oral, intravenous, etc.
  unit_of_measure TEXT NOT NULL, -- tablet, bottle, vial, etc.
  prescription_required BOOLEAN DEFAULT FALSE,
  narcotic BOOLEAN DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Batches table
CREATE TABLE IF NOT EXISTS inventory_batches (
  id TEXT PRIMARY KEY,
  medication_id TEXT NOT NULL REFERENCES medications(id),
  batch_number TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  manufacturing_date DATE,
  purchase_date DATE NOT NULL,
  purchase_price REAL NOT NULL,
  selling_price REAL NOT NULL,
  initial_quantity INTEGER NOT NULL,
  current_quantity INTEGER NOT NULL,
  supplier TEXT,
  invoice_number TEXT,
  storage_location TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(medication_id, batch_number)
);

-- Inventory Transactions table
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL REFERENCES inventory_batches(id),
  transaction_type TEXT NOT NULL, -- purchase, dispense, return, adjustment, expired
  quantity INTEGER NOT NULL,
  transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reference_id TEXT, -- can reference prescription_id, adjustment_id, etc.
  reference_type TEXT, -- prescription, adjustment, etc.
  user_id TEXT NOT NULL REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prescriptions table
CREATE TABLE IF NOT EXISTS prescriptions (
  id TEXT PRIMARY KEY,
  prescription_number TEXT UNIQUE NOT NULL,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  doctor_id TEXT NOT NULL REFERENCES users(id),
  prescription_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  source TEXT NOT NULL, -- OPD, IPD
  source_id TEXT, -- appointment_id or admission_id
  status TEXT DEFAULT 'pending', -- pending, dispensed, partially_dispensed, cancelled
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prescription Items table
CREATE TABLE IF NOT EXISTS prescription_items (
  id TEXT PRIMARY KEY,
  prescription_id TEXT NOT NULL REFERENCES prescriptions(id),
  medication_id TEXT NOT NULL REFERENCES medications(id),
  dosage TEXT NOT NULL, -- e.g., "1 tablet"
  frequency TEXT NOT NULL, -- e.g., "twice daily"
  duration TEXT NOT NULL, -- e.g., "7 days"
  quantity INTEGER NOT NULL,
  dispensed_quantity INTEGER DEFAULT 0,
  instructions TEXT,
  status TEXT DEFAULT 'pending', -- pending, dispensed, partially_dispensed, cancelled
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dispensing Records table
CREATE TABLE IF NOT EXISTS dispensing_records (
  id TEXT PRIMARY KEY,
  prescription_id TEXT NOT NULL REFERENCES prescriptions(id),
  prescription_item_id TEXT NOT NULL REFERENCES prescription_items(id),
  batch_id TEXT NOT NULL REFERENCES inventory_batches(id),
  quantity INTEGER NOT NULL,
  dispensed_by TEXT NOT NULL REFERENCES users(id),
  dispensed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  billed BOOLEAN DEFAULT FALSE,
  billing_id TEXT, -- reference to billing entry
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert some initial medication categories
INSERT INTO medication_categories (id, name, description)
VALUES 
  ('cat_001', 'Antibiotics', 'Medications used to treat bacterial infections'),
  ('cat_002', 'Analgesics', 'Pain relieving medications'),
  ('cat_003', 'Antipyretics', 'Fever reducing medications'),
  ('cat_004', 'Antihypertensives', 'Medications for high blood pressure'),
  ('cat_005', 'Antidiabetics', 'Medications for diabetes management'),
  ('cat_006', 'Antihistamines', 'Medications for allergies'),
  ('cat_007', 'Antacids', 'Medications for acid reflux and heartburn'),
  ('cat_008', 'Vitamins & Supplements', 'Nutritional supplements');

-- Insert some sample manufacturers
INSERT INTO manufacturers (id, name, contact_person, phone, email)
VALUES
  ('mfr_001', 'Cipla Ltd.', 'Rajesh Kumar', '+91-9876543210', 'contact@cipla.com'),
  ('mfr_002', 'Sun Pharmaceutical Industries Ltd.', 'Priya Sharma', '+91-9876543211', 'contact@sunpharma.com'),
  ('mfr_003', 'Lupin Limited', 'Amit Patel', '+91-9876543212', 'contact@lupin.com'),
  ('mfr_004', 'Dr. Reddy''s Laboratories', 'Sanjay Reddy', '+91-9876543213', 'contact@drreddys.com'),
  ('mfr_005', 'Zydus Cadila', 'Meera Desai', '+91-9876543214', 'contact@zyduscadila.com');

-- Insert some sample medications (fixed duplicate item_code)
INSERT INTO medications (id, item_code, generic_name, brand_name, category_id, manufacturer_id, dosage_form, strength, route, unit_of_measure, prescription_required)
VALUES
  ('med_001', 'AB001', 'Amoxicillin', 'Amoxil', 'cat_001', 'mfr_001', 'Capsule', '500mg', 'Oral', 'Capsule', TRUE),
  ('med_002', 'AB002', 'Azithromycin', 'Zithromax', 'cat_001', 'mfr_002', 'Tablet', '250mg', 'Oral', 'Tablet', TRUE),
  ('med_003', 'AN001', 'Paracetamol', 'Crocin', 'cat_002', 'mfr_003', 'Tablet', '500mg', 'Oral', 'Tablet', FALSE),
  ('med_004', 'AN002', 'Ibuprofen', 'Brufen', 'cat_002', 'mfr_004', 'Tablet', '400mg', 'Oral', 'Tablet', FALSE),
  ('med_005', 'AH001', 'Amlodipine', 'Norvasc', 'cat_004', 'mfr_005', 'Tablet', '5mg', 'Oral', 'Tablet', TRUE),
  ('med_006', 'AD001', 'Metformin', 'Glucophage', 'cat_005', 'mfr_001', 'Tablet', '500mg', 'Oral', 'Tablet', TRUE),
  ('med_007', 'AH002', 'Cetirizine', 'Zyrtec', 'cat_006', 'mfr_002', 'Tablet', '10mg', 'Oral', 'Tablet', FALSE),
  ('med_008', 'AA001', 'Pantoprazole', 'Pantocid', 'cat_007', 'mfr_003', 'Tablet', '40mg', 'Oral', 'Tablet', FALSE),
  ('med_009', 'VS001', 'Multivitamin', 'Supradyn', 'cat_008', 'mfr_004', 'Tablet', 'NA', 'Oral', 'Tablet', FALSE),
  ('med_010', 'AB003', 'Ceftriaxone', 'Rocephin', 'cat_001', 'mfr_005', 'Injection', '1g', 'Intravenous', 'Vial', TRUE);

-- Insert some sample inventory batches
INSERT INTO inventory_batches (id, medication_id, batch_number, expiry_date, purchase_date, purchase_price, selling_price, initial_quantity, current_quantity, storage_location)
VALUES
  ('batch_001', 'med_001', 'AMX2023001', '2025-12-31', '2023-01-15', 5.00, 7.50, 1000, 850, 'Main Pharmacy'),
  ('batch_002', 'med_002', 'AZT2023001', '2025-10-31', '2023-02-10', 8.00, 12.00, 500, 320, 'Main Pharmacy'),
  ('batch_003', 'med_003', 'PCM2023001', '2025-08-31', '2023-03-05', 1.00, 2.00, 2000, 1200, 'Main Pharmacy'),
  ('batch_004', 'med_004', 'IBU2023001', '2025-09-30', '2023-03-15', 2.00, 3.50, 1500, 900, 'Main Pharmacy'),
  ('batch_005', 'med_005', 'AML2023001', '2025-11-30', '2023-04-10', 3.00, 5.00, 1000, 780, 'Main Pharmacy'),
  ('batch_006', 'med_006', 'MET2023001', '2025-07-31', '2023-05-05', 2.50, 4.00, 1200, 950, 'Main Pharmacy'),
  ('batch_007', 'med_007', 'CET2023001', '2025-06-30', '2023-06-10', 1.50, 3.00, 800, 650, 'Main Pharmacy'),
  ('batch_008', 'med_008', 'PAN2023001', '2025-05-31', '2023-07-15', 4.00, 6.50, 600, 480, 'Main Pharmacy'),
  ('batch_009', 'med_009', 'MVT2023001', '2025-04-30', '2023-08-10', 6.00, 9.00, 400, 320, 'Main Pharmacy'),
  ('batch_010', 'med_010', 'CFT2023001', '2025-03-31', '2023-09-05', 15.00, 22.50, 200, 180, 'Main Pharmacy');
