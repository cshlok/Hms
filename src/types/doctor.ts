// types/doctor.ts
import { User } from "./user";

export interface Doctor {
    doctor_id: number;
    user_id: number;
    specialty: string;
    qualifications?: string | null;
    license_number?: string | null;
    created_at: string; // ISO string or Date object
    updated_at: string; // ISO string or Date object
    // Optionally include user details if needed frequently
    user?: Pick<User, "userId" | "username" | "fullName" | "email">;
}

