// types/billing.ts

export enum ItemType {
    Service = "Service",
    Procedure = "Procedure",
    Pharmacy = "Pharmacy",
    Consumable = "Consumable",
    EquipmentUsage = "EquipmentUsage",
    Package = "Package",
}

export interface BillableItem {
    item_id: number;
    item_code?: string | null;
    item_name: string;
    description?: string | null;
    item_type: ItemType; // Use enum
    unit_price: number;
    department?: string | null;
    is_taxable: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export enum InvoiceStatus {
    Draft = "Draft",
    Issued = "Issued",
    Paid = "Paid",
    PartiallyPaid = "PartiallyPaid",
    Overdue = "Overdue",
    Cancelled = "Cancelled",
}

export interface Invoice {
    invoice_id: number;
    invoice_number: string;
    patient_id: number;
    appointment_id?: number | null;
    admission_id?: number | null;
    invoice_date: string;
    due_date?: string | null;
    total_amount: number;
    paid_amount: number;
    discount_amount: number;
    tax_amount: number;
    status: InvoiceStatus; // Use enum
    notes?: string | null;
    created_by_user_id?: number | null;
    created_at: string;
    updated_at: string;
    // Optional expanded details
    patient?: { patient_id: number; first_name: string; last_name: string };
    items?: InvoiceItem[];
    payments?: Payment[];
}

export interface InvoiceItem {
    invoice_item_id: number;
    invoice_id: number;
    billable_item_id: number;
    batch_id?: number | null;
    description?: string | null;
    quantity: number;
    unit_price: number;
    discount_amount: number;
    tax_amount: number;
    total_amount: number;
    created_at: string;
    // Optional expanded details
    billable_item?: Pick<BillableItem, "item_id" | "item_name" | "item_type">;
}

export enum PaymentMethod {
    Cash = "Cash",
    Card = "Card",
    BankTransfer = "BankTransfer",
    Insurance = "Insurance",
    Online = "Online",
}

export interface Payment {
    payment_id: number;
    invoice_id: number;
    patient_id: number;
    payment_date: string;
    amount_paid: number;
    payment_method: PaymentMethod; // Use enum
    transaction_reference?: string | null;
    notes?: string | null;
    received_by_user_id?: number | null;
    created_at: string;
}

