// types/appointment.ts
import { Patient } from "./patient";
import { Doctor } from "./doctor";

export enum AppointmentStatus {
    Scheduled = "Scheduled",
    Confirmed = "Confirmed",
    CheckedIn = "CheckedIn",
    InProgress = "InProgress",
    Completed = "Completed",
    Cancelled = "Cancelled",
    NoShow = "NoShow",
}

export interface Appointment {
    appointment_id: number;
    patient_id: number;
    doctor_id: number;
    schedule_id?: number | null;
    appointment_datetime: string; // ISO string or Date object
    duration_minutes: number;
    reason?: string | null;
    status: AppointmentStatus; // Use enum
    notes?: string | null;
    booked_by_user_id?: number | null;
    created_at: string; // ISO string or Date object
    updated_at: string; // ISO string or Date object

    // Optional expanded details for easier frontend use
    patient?: Pick<Patient, "patient_id" | "first_name" | "last_name">;
    doctor?: Pick<Doctor, "doctor_id" | "specialty"> & { user?: Pick<User, "fullName"> }; // Include doctor's name
}

// Need User type if not already globally available
interface User {
    userId: number;
    username: string;
    fullName?: string | null;
    email: string;
}

