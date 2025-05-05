// src/types/pharmacy.ts

export interface MedicationAdministrationRecord {
  id: string;
  admission_id: string;
  prescription_item_id: string;
  medication_name: string;
  dosage: string;
  route: string;
  scheduled_time: string; // ISO 8601 format
  administration_time: string; // ISO 8601 format
  status: "Administered" | "Missed" | "Refused";
  administered_by_id: string;
  notes?: string;
  // Add other relevant fields as needed
}

