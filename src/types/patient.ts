// types/patient.ts

export interface Patient {
    patient_id: number;
    user_id?: number | null; // Link to Users table
    first_name: string;
    last_name: string;
    date_of_birth: string; // Store as YYYY-MM-DD string or Date object
    gender: "Male" | "Female" | "Other" | "Prefer not to say";
    phone_number: string;
    email?: string | null;
    address_line1?: string | null;
    address_line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_relation?: string | null;
    emergency_contact_phone?: string | null;
    blood_group?: string | null;
    allergies?: string | null;
    past_medical_history?: string | null;
    current_medications?: string | null;
    insurance_provider?: string | null;
    insurance_policy_number?: string | null;
    registration_date: string; // ISO string or Date object
    registered_by_user_id?: number | null;
    is_active: boolean;
    updated_at: string; // ISO string or Date object
}

