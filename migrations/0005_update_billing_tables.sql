-- Migration to update billing tables to match API implementation

-- Rename tables to match API implementation
ALTER TABLE service_items RENAME TO billing_service_items;
ALTER TABLE invoices RENAME TO billing_invoices;
ALTER TABLE invoice_items RENAME TO billing_items;
ALTER TABLE payments RENAME TO billing_payments;

-- Update billing_invoices table to match API implementation
ALTER TABLE billing_invoices RENAME COLUMN amount_paid TO paid_amount;

-- Add service_item_id column to billing_items if not exists
ALTER TABLE billing_items ADD COLUMN IF NOT EXISTS service_item_id INTEGER REFERENCES billing_service_items(id);

-- Update indexes for renamed tables
DROP INDEX IF EXISTS idx_invoices_patient_id;
DROP INDEX IF EXISTS idx_invoices_status;
DROP INDEX IF EXISTS idx_invoice_items_invoice_id;
DROP INDEX IF EXISTS idx_payments_invoice_id;
DROP INDEX IF EXISTS idx_service_items_category;

CREATE INDEX idx_billing_invoices_patient_id ON billing_invoices(patient_id);
CREATE INDEX idx_billing_invoices_status ON billing_invoices(status);
CREATE INDEX idx_billing_items_invoice_id ON billing_items(invoice_id);
CREATE INDEX idx_billing_payments_invoice_id ON billing_payments(invoice_id);
CREATE INDEX idx_billing_service_items_category ON billing_service_items(category);
