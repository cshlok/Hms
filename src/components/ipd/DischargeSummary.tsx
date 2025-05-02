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

interface DischargeSummaryProps {
  admissionId: string | null;
}

const DischargeSummary: React.FC<DischargeSummaryProps> = ({ admissionId }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dischargeSummary, setDischargeSummary] = useState<DischargeSummaryData | null>(null);
  const [formData, setFormData] = useState<FormData>({
    discharge_date: new Date().toISOString().split("T")[0],
    discharge_diagnosis: "",
    treatment_summary: "",
    medications: "",
    follow_up: "",
    home_care_instructions: "",
  });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [patientInfo, setPatientInfo] = useState<AdmissionInfo | null>(null);

  // Fetch discharge summary and admission info
  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      if (!admissionId) {
        setLoading(false);
        setError("Admission ID is missing.");
        return;
      }

      setLoading(true);
      setError(null);
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
        await new Promise(resolve => setTimeout(resolve, 600));
        const mockPatientInfo: AdmissionInfo = {
          admission_number: "ADM123456",
          admission_date: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
          patient_first_name: "Jane",
          patient_last_name: "Doe",
          diagnosis: "Pneumonia",
        };
        // Simulate if summary already exists or not
        const summaryExists = Math.random() > 0.5;
        const mockSummary: DischargeSummaryData | null = summaryExists ? {
          id: "ds_001",
          admission_id: admissionId,
          discharge_date: new Date().toISOString(),
          discharge_diagnosis: "Resolved Community-Acquired Pneumonia",
          treatment_summary: "Patient admitted with fever, cough, and shortness of breath. Diagnosed with CAP. Treated with IV antibiotics (Ceftriaxone) followed by oral Amoxicillin-Clavulanate. Responded well to treatment. Oxygen saturation improved. Chest X-ray showed clearing infiltrates.",
          medications: "Amoxicillin-Clavulanate 875mg/125mg BID for 5 more days.\nParacetamol 500mg PRN for fever or pain.",
          follow_up: "Follow up with primary care physician in 1 week.",
          home_care_instructions: "Rest at home. Increase fluid intake. Monitor for worsening symptoms like increased shortness of breath or persistent fever.",
          discharged_by_doctor_id: "doc_101",
          created_at: new Date().toISOString(),
          doctor_first_name: "Alice",
          doctor_last_name: "Smith",
        } : null;

        setPatientInfo(mockPatientInfo);
        setDischargeSummary(mockSummary);
        if (mockSummary) {
            // Pre-fill form if editing? (Not implemented here)
        } else {
            // Pre-fill diagnosis if available from admission
            setFormData(prev => ({ ...prev, discharge_diagnosis: mockPatientInfo.diagnosis || "" }));
        }

      } catch (err) {
        const message = err instanceof Error ? err.message : "An unknown error occurred.";
        console.error("Error fetching discharge data:", err);
        setError(`Failed to load discharge data: ${message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [admissionId]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!admissionId) {
      setSubmitError("Admission ID is missing.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      // Basic validation
      if (!formData.discharge_diagnosis || !formData.treatment_summary || !formData.medications) {
        throw new Error("Discharge Diagnosis, Treatment Summary, and Discharge Medications are required.");
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
      await new Promise(resolve => setTimeout(resolve, 1000));
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

    } catch (err) {
      const message = err instanceof Error ? err.message : "An unknown error occurred.";
      console.error("Error creating discharge summary:", err);
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
      return new Intl.DateTimeFormat(undefined, options).format(new Date(dateString));
    } catch (e) {
      return "Invalid Date";
    }
  };

  const handlePrint = (): void => {
    // Basic print functionality
    window.print();
  };

  return (
    <div className="space-y-6">
      {patientInfo && (
        <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
          <h3 className="font-semibold text-lg text-blue-900">
            {patientInfo.patient_first_name} {patientInfo.patient_last_name}
          </h3>
          <p className="text-sm text-gray-700">
            Admission: {patientInfo.admission_number} | Date: {formatDate(patientInfo.admission_date)}
            {patientInfo.diagnosis && ` | Admission Diagnosis: ${patientInfo.diagnosis}`}
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-red-500 p-4 text-center" role="alert">{error}</div>
      ) : dischargeSummary ? (
        // Display existing summary
        <Card className="print:shadow-none print:border-none">
          <CardHeader className="flex flex-row justify-between items-center print:hidden">
            <CardTitle>Discharge Summary</CardTitle>
            <Button variant="outline" onClick={handlePrint}>Print Summary</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Header for printed version */}
            <div className="hidden print:block mb-6 text-center">
                <h1 className="text-xl font-bold">Discharge Summary</h1>
                <p>{patientInfo?.patient_first_name} {patientInfo?.patient_last_name} (Admission: {patientInfo?.admission_number})</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b pb-4">
              <div>
                <Label className="text-xs text-gray-500">Admission Date</Label>
                <p className="font-medium">{formatDate(patientInfo?.admission_date)}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Discharge Date</Label>
                <p className="font-medium">{formatDate(dischargeSummary.discharge_date)}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-sm font-semibold">Discharge Diagnosis</Label>
                <p className="text-sm whitespace-pre-wrap bg-gray-50 p-2 rounded border">{dischargeSummary.discharge_diagnosis}</p>
              </div>

              <div>
                <Label className="text-sm font-semibold">Treatment Summary</Label>
                <p className="text-sm whitespace-pre-wrap bg-gray-50 p-2 rounded border">{dischargeSummary.treatment_summary}</p>
              </div>

              <div>
                <Label className="text-sm font-semibold">Discharge Medications</Label>
                <p className="text-sm whitespace-pre-wrap bg-gray-50 p-2 rounded border">{dischargeSummary.medications}</p>
              </div>

              {dischargeSummary.follow_up && (
                <div>
                  <Label className="text-sm font-semibold">Follow-up Instructions</Label>
                  <p className="text-sm whitespace-pre-wrap bg-gray-50 p-2 rounded border">{dischargeSummary.follow_up}</p>
                </div>
              )}

              {dischargeSummary.home_care_instructions && (
                <div>
                  <Label className="text-sm font-semibold">Home Care Instructions</Label>
                  <p className="text-sm whitespace-pre-wrap bg-gray-50 p-2 rounded border">{dischargeSummary.home_care_instructions}</p>
                </div>
              )}

              <div className="pt-2">
                <Label className="text-xs text-gray-500">Discharged By</Label>
                <p className="font-medium">Dr. {dischargeSummary.doctor_first_name || "N/A"} {dischargeSummary.doctor_last_name || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        // Show form to create summary
        <Card>
          <CardHeader>
            <CardTitle>Create Discharge Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {submitSuccess && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4" role="alert">
                Patient discharged successfully! Discharge summary created.
              </div>
            )}

            {submitError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
                Error: {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="discharge_date">Discharge Date <span className="text-red-500">*</span></Label>
                <Input
                  id="discharge_date"
                  name="discharge_date"
                  type="date"
                  value={formData.discharge_date}
                  onChange={handleChange}
                  required
                  disabled={submitting}
                  aria-required="true"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discharge_diagnosis">Discharge Diagnosis <span className="text-red-500">*</span></Label>
                <Textarea
                  id="discharge_diagnosis"
                  name="discharge_diagnosis"
                  value={formData.discharge_diagnosis}
                  onChange={handleChange}
                  required
                  placeholder="Enter final diagnosis at discharge"
                  className="min-h-[100px]"
                  disabled={submitting}
                  aria-required="true"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="treatment_summary">Treatment Summary <span className="text-red-500">*</span></Label>
                <Textarea
                  id="treatment_summary"
                  name="treatment_summary"
                  value={formData.treatment_summary}
                  onChange={handleChange}
                  required
                  placeholder="Summarize treatments, procedures, and interventions performed during hospitalization"
                  className="min-h-[120px]"
                  disabled={submitting}
                  aria-required="true"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="medications">Discharge Medications <span className="text-red-500">*</span></Label>
                <Textarea
                  id="medications"
                  name="medications"
                  value={formData.medications}
                  onChange={handleChange}
                  required
                  placeholder="List medications to be continued after discharge (name, dosage, frequency, duration)"
                  className="min-h-[120px]"
                  disabled={submitting}
                  aria-required="true"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="follow_up">Follow-up Instructions</Label>
                <Textarea
                  id="follow_up"
                  name="follow_up"
                  value={formData.follow_up}
                  onChange={handleChange}
                  placeholder="Specify follow-up appointments, tests, or consultations needed (optional)"
                  className="min-h-[100px]"
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="home_care_instructions">Home Care Instructions</Label>
                <Textarea
                  id="home_care_instructions"
                  name="home_care_instructions"
                  value={formData.home_care_instructions}
                  onChange={handleChange}
                  placeholder="Provide instructions for wound care, activity restrictions, diet, etc. (optional)"
                  className="min-h-[100px]"
                  disabled={submitting}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                  ) : (
                    "Save Discharge Summary"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DischargeSummary;
