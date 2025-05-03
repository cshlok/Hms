// types/schedule.ts

export interface DoctorSchedule {
    schedule_id: number;
    doctor_id: number;
    day_of_week: number; // 0-6
    start_time: string; // HH:MM
    end_time: string; // HH:MM
    slot_duration_minutes: number;
    is_available: boolean;
    created_at: string; // ISO string or Date object
    updated_at: string; // ISO string or Date object
}

