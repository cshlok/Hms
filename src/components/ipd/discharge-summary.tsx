"use client";

import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Textarea,
  Input,
  Label,
} from "@/components/ui";
import { Loader2 } from "lucide-react";

// Define interfaces for data structures
interface DischargeSummaryData {
  id: string;
  admission_id: string;
  discharge_date: string;
  discharge_diagnosis: string;
  treatment_summary: string;
  medications: string;
  follow_up?: string;
  home_care_instructions?: string;
  discharged_by_doctor_id: string;
  created_at: string;
  // Assuming these come from a join or separate fetch
  doctor_first_name?: string;
  doctor_last_name?: string;
}

interface AdmissionInfo {
  admission_number: string;
  admission_date: string;
  patient_first_name: string;
  patient_last_name: string;
  diagnosis?: string; // Initial diagnosis
}

interface FormData {
  discharge_date: string;
  discharge_diagnosis: string;
  treatment_summary: string;
  medications: string;
  follow_up: string;
  home_care_instructions: string;
}

interface DischargeSummaryProperties {
  admissionId: string | null;
}

const DischargeSummary: React.FC<DischargeSummaryProperties> = ({
  admissionId,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>();
  const [dischargeSummary, setDischargeSummary] =
    useState<DischargeSummaryData | null>();
  const [formData, setFormData] = useState<FormData>({
    discharge_date: new Date().toISOString().split("T")[0],
    discharge_diagnosis: "",
    treatment_summary: "",
    medications: "",
    follow_up: "",
    home_care_instructions: "",
  });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>();
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [patientInfo, setPatientInfo] = useState<AdmissionInfo | null>();

  // Fetch discharge summary and admission info
  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      if (!admissionId) {
        setLoading(false);
        setError("Admission ID is missing.");
        return;
      }

      setLoading(true);
      setError(undefined);
      try {
        // Simulate API call
        // const response = await fetch(`/api/ipd/admissions/${admissionId}/discharge`);
        // if (!response.ok) {
        //   const errorData = await response.json().catch(() => ({}));
        //   throw new Error(errorData.error || "Failed to fetch discharge summary");
        // }
        // const data = await response.json();
        // setDischargeSummary(data.discharge_summary || null);
        // setPatientInfo(data.admission || null);

        // Mock data simulation
        await new Promise((resolve) => setTimeout(resolve, 600));
        const mockPatientInfo: AdmissionInfo = {
          admission_number: "ADM123456",
          admission_date: new Date(Date.now() - 86_400_000 * 3).toISOString(), // 3 days ago
          patient_first_name: "Jane",
          patient_last_name: "Doe",
          diagnosis: "Pneumonia",
        };
        // Simulate if summary already exists or not
        const summaryExists = Math.random() > 0.5;
        const mockSummary: DischargeSummaryData | null = summaryExists
          ? {
              id: "ds_001",
              admission_id: admissionId,
              discharge_date: new Date().toISOString(),
              discharge_diagnosis: "Resolved Community-Acquired Pneumonia",
              treatment_summary:
                "Patient admitted with fever, cough, and shortness of breath. Diagnosed with CAP. Treated with IV antibiotics (Ceftriaxone) followed by oral Amoxicillin-Clavulanate. Responded well to treatment. Oxygen saturation improved. Chest X-ray showed clearing infiltrates.",
              medications:
                "Amoxicillin-Clavulanate 875mg/125mg BID for 5 more days.\nParacetamol 500mg PRN for fever or pain.",
              follow_up: "Follow up with primary care physician in 1 week.",
              home_care_instructions:
                "Rest at home. Increase fluid intake. Monitor for worsening symptoms like increased shortness of breath or persistent fever.",
              discharged_by_doctor_id: "doc_101",
              created_at: new Date().toISOString(),
              doctor_first_name: "Alice",
              doctor_last_name: "Smith",
            }
          : undefined;

        setPatientInfo(mockPatientInfo);
        setDischargeSummary(mockSummary);
        if (mockSummary) {
          // Pre-fill form if editing? (Not implemented here)
        } else {
          // Pre-fill diagnosis if available from admission
          setFormData((previous) => ({
            ...previous,
            discharge_diagnosis: mockPatientInfo.diagnosis || "",
          }));
        }
      } catch (error_) {
        const message =
          error_ instanceof Error
            ? error_.message
            : "An unknown error occurred.";
        console.error("Error fetching discharge data:", error_);
        setError(`Failed to load discharge data: ${message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [admissionId]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ): void => {
    const { name, value } = e.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!admissionId) {
      setSubmitError("Admission ID is missing.");
      return;
    }
    setSubmitting(true);
    setSubmitError(undefined);
    setSubmitSuccess(false);

    try {
      // Basic validation
      if (
        !formData.discharge_diagnosis ||
        !formData.treatment_summary ||
        !formData.medications
      ) {
        throw new Error(
          "Discharge Diagnosis, Treatment Summary, and Discharge Medications are required."
        );
      }

      const _submissionData = {
        ...formData,
        // discharged_by_doctor_id: session?.user?.id // Get from session
      };

      // Simulate API call
      // const response = await fetch(`/api/ipd/admissions/${admissionId}/discharge`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(submissionData),
      // });
      // if (!response.ok) {
      //   const errorData = await response.json().catch(() => ({}));
      //   throw new Error(errorData.error || "Failed to create discharge summary");
      // }
      // const data = await response.json();

      // Mock response
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const newSummary: DischargeSummaryData = {
        id: `ds_${Date.now()}`,
        admission_id: admissionId,
        discharge_date: formData.discharge_date,
        discharge_diagnosis: formData.discharge_diagnosis,
        treatment_summary: formData.treatment_summary,
        medications: formData.medications,
        follow_up: formData.follow_up,
        home_care_instructions: formData.home_care_instructions,
        discharged_by_doctor_id: "doc_current", // Replace with actual user ID
        created_at: new Date().toISOString(),
        doctor_first_name: "Current", // Replace with actual user data
        doctor_last_name: "Doctor",
      };

      setDischargeSummary(newSummary);
      setSubmitSuccess(true);

      // Optionally clear form or redirect after success
      // setFormData({ ...initial empty state... });
    } catch (error_) {
      const message =
        error_ instanceof Error ? error_.message : "An unknown error occurred.";
      console.error("Error creating discharge summary:", error_);
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // Format date for display
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return "N/A";
  try {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };
    return new Intl.DateTimeFormat(undefined, options).format(
      new Date(dateString)
    );
  } catch {
    return "Invalid Date";
  }
};

// Basic print functionality moved outside the component
const handlePrint = (): void => {
  globalThis.print();
};

export default DischargeSummary;
