// types/opd.ts
import { Patient } from "./patient";
// import { Doctor } from "./doctor"; // FIX: Removed unused import
import { Appointment } from "./appointment";
import { InventoryItem } from "./inventory";
import { BillableItem } from "./billing";

export enum OPDVisitStatus {
    Waiting = "Waiting",
    WithDoctor = "WithDoctor",
    Billing = "Billing",
    Pharmacy = "Pharmacy",
    Lab = "Lab",
    Completed = "Completed",
    Cancelled = "Cancelled",
}
export enum OPDVisitType {
    New = "New",
    FollowUp = "FollowUp",
    WalkIn = "WalkIn",
}

export interface OPDVisit {
    opd_visit_id: number;
    patient_id: number;
    appointment_id?: number | null;
    visit_datetime: string;
    visit_type: OPDVisitType; // Use enum
    doctor_id: number;
    department?: string | null;
    status: OPDVisitStatus; // Use enum
    notes?: string | null;
    created_by_user_id?: number | null;
    created_at: string;
    updated_at: string;
    // Optional expanded details
    patient?: Pick<Patient, "patient_id" | "first_name" | "last_name">;
    doctor?: { doctor_id: number; user?: { fullName?: string | null } };
    appointment?: Pick<Appointment, "appointment_id" | "appointment_datetime" | "reason">;
}

export interface PatientVital {
    vital_id: number;
    patient_id: number;
    opd_visit_id?: number | null;
    admission_id?: number | null;
    recorded_at: string;
    height_cm?: number | null;
    weight_kg?: number | null;
    bmi?: number | null;
    temperature_celsius?: number | null;
    systolic_bp?: number | null;
    diastolic_bp?: number | null;
    heart_rate?: number | null;
    respiratory_rate?: number | null;
    oxygen_saturation?: number | null;
    pain_scale?: number | null;
    notes?: string | null;
    recorded_by_user_id?: number | null;
    // Optional expanded details
    recorded_by_user?: { user_id: number; full_name?: string | null };
}

export interface Consultation {
    consultation_id: number;
    patient_id: number;
    doctor_id: number;
    opd_visit_id?: number | null;
    admission_id?: number | null;
    consultation_datetime: string;
    chief_complaint?: string | null;
    history_of_present_illness?: string | null;
    physical_examination?: string | null;
    diagnosis?: string | null;
    treatment_plan?: string | null;
    follow_up_instructions?: string | null;
    notes?: string | null; // Doctor's private notes
    created_at: string;
    updated_at: string;
    // Optional expanded details
    patient?: Pick<Patient, "patient_id" | "first_name" | "last_name">;
    doctor?: { doctor_id: number; user?: { fullName?: string | null } };
    opd_visit?: Pick<OPDVisit, "opd_visit_id" | "visit_datetime">;
    prescriptions?: Prescription[];
    lab_orders?: LabOrder[];
}

export interface Prescription {
    prescription_id: number;
    consultation_id: number | null; // FIX: Allow null
    patient_id: number;
    doctor_id: number;
    prescription_date: string;
    notes?: string | null;
    created_at: string;
    updated_at: string;
    // Optional expanded details
    items?: PrescriptionItem[];
    consultation?: Pick<Consultation, "consultation_id" | "consultation_datetime">;
}

export interface PrescriptionItem {
    prescription_item_id: number;
    prescription_id: number;
    inventory_item_id: number;
    drug_name: string;
    dosage: string;
    frequency: string;
    duration: string;
    route?: string | null;
    instructions?: string | null;
    quantity_prescribed?: number | null;
    created_at: string;
    // Optional expanded details
    inventory_item?: Pick<InventoryItem, "inventory_item_id" | "unit_of_measure">;
}

export enum LabOrderStatus {
    Ordered = "Ordered",
    SampleCollected = "SampleCollected",
    Processing = "Processing",
    Completed = "Completed",
    Cancelled = "Cancelled",
}
export enum LabOrderItemStatus {
    Ordered = "Ordered",
    SampleCollected = "SampleCollected",
    Processing = "Processing",
    Completed = "Completed",
    Cancelled = "Cancelled",
}

export interface LabOrder {
    lab_order_id: number;
    consultation_id: number;
    patient_id: number;
    doctor_id: number;
    order_datetime: string;
    status: LabOrderStatus; // Use enum
    notes?: string | null;
    created_at: string;
    updated_at: string;
    // Optional expanded details
    items?: LabOrderItem[];
    consultation?: Pick<Consultation, "consultation_id" | "consultation_datetime">;
    patient?: Pick<Patient, "patient_id" | "first_name" | "last_name">;
    doctor?: { doctor_id: number; user?: { fullName?: string | null } };
}

export interface LabOrderItem {
    lab_order_item_id: number;
    lab_order_id: number;
    billable_item_id: number;
    test_name: string;
    sample_type?: string | null;
    sample_id?: string | null;
    sample_collection_datetime?: string | null;
    sample_collected_by_user_id?: number | null;
    result_value?: string | null;
    result_unit?: string | null;
    reference_range?: string | null;
    result_notes?: string | null;
    result_datetime?: string | null;
    result_verified_by_user_id?: number | null;
    status: LabOrderItemStatus; // Use enum
    created_at: string;
    updated_at: string;
    // Optional expanded details
    billable_item?: Pick<BillableItem, "item_id" | "item_code">;
    sample_collected_by_user?: { user_id: number; full_name?: string | null };
    result_verified_by_user?: { user_id: number; full_name?: string | null };
}
