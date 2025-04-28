-- Laboratory Management System (LIS) Schema
-- Migration: 0004_laboratory_schema.sql

-- Test Categories
CREATE TABLE IF NOT EXISTS lab_test_categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Test Catalog
CREATE TABLE IF NOT EXISTS lab_tests (
  id INTEGER PRIMARY KEY,
  category_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sample_type TEXT NOT NULL,
  sample_volume TEXT,
  processing_time INTEGER, -- in minutes
  price REAL NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES lab_test_categories(id)
);

-- Test Parameters (for tests with multiple parameters/components)
CREATE TABLE IF NOT EXISTS lab_test_parameters (
  id INTEGER PRIMARY KEY,
  test_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  unit TEXT,
  reference_range_male TEXT,
  reference_range_female TEXT,
  reference_range_child TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (test_id) REFERENCES lab_tests(id)
);

-- Test Panels (groups of tests)
CREATE TABLE IF NOT EXISTS lab_test_panels (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Panel-Test Mapping
CREATE TABLE IF NOT EXISTS lab_panel_tests (
  id INTEGER PRIMARY KEY,
  panel_id INTEGER NOT NULL,
  test_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (panel_id) REFERENCES lab_test_panels(id),
  FOREIGN KEY (test_id) REFERENCES lab_tests(id),
  UNIQUE(panel_id, test_id)
);

-- Test Orders
CREATE TABLE IF NOT EXISTS lab_orders (
  id INTEGER PRIMARY KEY,
  patient_id INTEGER NOT NULL,
  ordering_doctor_id INTEGER,
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, collected, processing, completed, canceled
  priority TEXT DEFAULT 'routine', -- routine, urgent, stat
  source TEXT NOT NULL, -- opd, ipd, er, external
  source_reference TEXT, -- appointment_id, admission_id, etc.
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (ordering_doctor_id) REFERENCES users(id)
);

-- Order Items (individual tests or panels in an order)
CREATE TABLE IF NOT EXISTS lab_order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  test_id INTEGER,
  panel_id INTEGER,
  price REAL NOT NULL,
  discount REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, collected, processing, completed, canceled
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES lab_orders(id),
  FOREIGN KEY (test_id) REFERENCES lab_tests(id),
  FOREIGN KEY (panel_id) REFERENCES lab_test_panels(id),
  CHECK ((test_id IS NULL AND panel_id IS NOT NULL) OR (test_id IS NOT NULL AND panel_id IS NULL))
);

-- Sample Collection
CREATE TABLE IF NOT EXISTS lab_samples (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  barcode TEXT NOT NULL UNIQUE,
  sample_type TEXT NOT NULL,
  collected_by INTEGER,
  collected_at TIMESTAMP,
  received_by INTEGER,
  received_at TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, collected, received, rejected, processed
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES lab_orders(id),
  FOREIGN KEY (collected_by) REFERENCES users(id),
  FOREIGN KEY (received_by) REFERENCES users(id)
);

-- Test Results
CREATE TABLE IF NOT EXISTS lab_results (
  id INTEGER PRIMARY KEY,
  order_item_id INTEGER NOT NULL,
  parameter_id INTEGER,
  result_value TEXT,
  is_abnormal BOOLEAN DEFAULT false,
  notes TEXT,
  performed_by INTEGER,
  performed_at TIMESTAMP,
  verified_by INTEGER,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_item_id) REFERENCES lab_order_items(id),
  FOREIGN KEY (parameter_id) REFERENCES lab_test_parameters(id),
  FOREIGN KEY (performed_by) REFERENCES users(id),
  FOREIGN KEY (verified_by) REFERENCES users(id)
);

-- Reports
CREATE TABLE IF NOT EXISTS lab_reports (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL UNIQUE,
  report_number TEXT NOT NULL UNIQUE,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'preliminary', -- preliminary, final, amended
  generated_by INTEGER,
  verified_by INTEGER,
  verified_at TIMESTAMP,
  pdf_path TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES lab_orders(id),
  FOREIGN KEY (generated_by) REFERENCES users(id),
  FOREIGN KEY (verified_by) REFERENCES users(id)
);

-- Report Delivery
CREATE TABLE IF NOT EXISTS lab_report_delivery (
  id INTEGER PRIMARY KEY,
  report_id INTEGER NOT NULL,
  delivery_method TEXT NOT NULL, -- email, sms, print, portal
  recipient TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed, viewed
  delivered_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES lab_reports(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lab_tests_category ON lab_tests(category_id);
CREATE INDEX IF NOT EXISTS idx_lab_test_parameters_test ON lab_test_parameters(test_id);
CREATE INDEX IF NOT EXISTS idx_lab_panel_tests_panel ON lab_panel_tests(panel_id);
CREATE INDEX IF NOT EXISTS idx_lab_panel_tests_test ON lab_panel_tests(test_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON lab_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_status ON lab_orders(status);
CREATE INDEX IF NOT EXISTS idx_lab_order_items_order ON lab_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_lab_samples_order ON lab_samples(order_id);
CREATE INDEX IF NOT EXISTS idx_lab_samples_barcode ON lab_samples(barcode);
CREATE INDEX IF NOT EXISTS idx_lab_results_order_item ON lab_results(order_item_id);
CREATE INDEX IF NOT EXISTS idx_lab_reports_order ON lab_reports(order_id);
CREATE INDEX IF NOT EXISTS idx_lab_report_delivery_report ON lab_report_delivery(report_id);

-- Insert default test categories
INSERT INTO lab_test_categories (name, description) VALUES
('Hematology', 'Blood cell studies and related tests'),
('Biochemistry', 'Chemical analysis of body fluids'),
('Microbiology', 'Study of microorganisms'),
('Serology', 'Study of serum for antibody detection'),
('Pathology', 'Study of disease processes'),
('Immunology', 'Study of immune system'),
('Molecular Diagnostics', 'DNA/RNA based tests');
