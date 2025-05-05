// src/types/ipd.ts

export interface IPDPrescriptionItem {
  id: string;
  medication_name: string;
  dosage: string;
  route: string;
  frequency: string;
  // Add other relevant fields as needed
}

export interface IPDPrescription {
  id: string;
  start_date: string; // Assuming ISO string format
  items: IPDPrescriptionItem[];
  // Add other relevant fields like patient_id, doctor_id, etc.
}

