"use client";

import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Input,
  Label,
  // Textarea, // FIX: Removed unused import
} from "@/components/ui"; // Assuming Select components are also here or adjust import
import { Loader2 } from "lucide-react";

// Define interfaces for data structures
interface MedicationRecord {
  id: string;
  administered_time: string;
  medication_name: string; // Assuming this comes from a join
  dosage: string;
  route: string;
  administered_by_first_name: string; // Assuming this comes from a join
  administered_by_last_name: string; // Assuming this comes from a join
  notes?: string;
}

interface Medication {
  id: string;
  item_name: string; // Assuming this is the display name
  dosage_form: string;
  strength: string;
}

interface AdmissionInfo {
  admission_number: string;
  admission_date: string;
  patient_first_name: string;
  patient_last_name: string;
  diagnosis?: string;
}

interface FormData {
  medication_id: string;
  dosage: string;
  route: string;
  notes: string;
}

interface MedicationAdministrationProperties {
  admissionId: string | null;
}

const MedicationAdministration: React.FC<
  MedicationAdministrationProperties
> = ({ admissionId }) => {
  const [medicationRecords, setMedicationRecords] = useState<
    MedicationRecord[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loadingMedications, setLoadingMedications] = useState<boolean>(true);
  const [formData, setFormData] = useState<FormData>({
    medication_id: "",
    dosage: "",
    route: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>();
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [patientInfo, setPatientInfo] = useState<AdmissionInfo | null>();

  // Fetch medication administration records for the admission
  useEffect(() => {
    const fetchMedicationRecords = async (): Promise<void> => {
      if (!admissionId) {
        setLoading(false);
        setError("Admission ID is missing.");
        return;
      }

      try {
        setLoading(true);
        setError(undefined);
        // Simulate API call
        // const response = await fetch(`/api/ipd/admissions/${admissionId}/medication-administration`);
        // if (!response.ok) {
        //   const errorData = await response.json().catch(() => ({}));
        //   throw new Error(errorData.error || "Failed to fetch medication administration records");
        // }
        // const data = await response.json();
        // setMedicationRecords(data.medication_administration || []);
        // setPatientInfo(data.admission || null);

        // Mock data
        await new Promise((resolve) => setTimeout(resolve, 500));
        const mockRecords: MedicationRecord[] = [
          {
            id: "mar_001",
            administered_time: new Date(Date.now() - 3_600_000).toISOString(), // 1 hour ago
            medication_name: "Paracetamol 500mg Tablet",
            dosage: "1 tablet",
            route: "oral",
            administered_by_first_name: "Alice",
            administered_by_last_name: "Smith",
            notes: "Patient tolerated well.",
          },
          {
            id: "mar_002",
            administered_time: new Date(Date.now() - 14_400_000).toISOString(), // 4 hours ago
            medication_name: "Amoxicillin 250mg Capsule",
            dosage: "1 capsule",
            route: "oral",
            administered_by_first_name: "Alice",
            administered_by_last_name: "Smith",
          },
        ];
        const mockPatientInfo: AdmissionInfo = {
          admission_number: "ADM123456",
          admission_date: new Date(Date.now() - 86_400_000).toISOString(), // Yesterday
          patient_first_name: "Jane",
          patient_last_name: "Doe",
          diagnosis: "Pneumonia",
        };
        setMedicationRecords(mockRecords);
        setPatientInfo(mockPatientInfo);
      } catch (error_) {
        const message =
          error_ instanceof Error
            ? error_.message
            : "An unknown error occurred.";
        console.error("Error fetching medication records:", error_);
        setError(`Failed to load medication records: ${message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchMedicationRecords();
  }, [admissionId]);

  // Fetch available medications from pharmacy inventory
  useEffect(() => {
    const fetchMedications = async (): Promise<void> => {
      try {
        setLoadingMedications(true);
        // Simulate API call
        // const response = await fetch("/api/pharmacy/inventory?in_stock=true");
        // if (!response.ok) {
        //   throw new Error("Failed to fetch medications");
        // }
        // const data = await response.json();
        // setMedications(data || []); // Assuming API returns Medication[]

        // Mock data
        await new Promise((resolve) => setTimeout(resolve, 300));
        const mockMeds: Medication[] = [
          {
            id: "med_001",
            item_name: "Paracetamol",
            dosage_form: "Tablet",
            strength: "500mg",
          },
          {
            id: "med_002",
            item_name: "Amoxicillin",
            dosage_form: "Capsule",
            strength: "250mg",
          },
          {
            id: "med_003",
            item_name: "Ibuprofen",
            dosage_form: "Tablet",
            strength: "200mg",
          },
        ];
        setMedications(mockMeds);
      } catch (error_) {
        console.error("Error fetching medications:", error_);
        // Optionally set an error state for medication loading
      } finally {
        setLoadingMedications(false);
      }
    };

    fetchMedications();
  }, []);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ): void => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  // Note: If using shadcn/ui Select, the onChange is handled differently (onValueChange)
  // This example assumes standard HTML select or a compatible custom component

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!admissionId) {
      setSubmitError("Admission ID is missing.");
      return;
    }
    setSubmitting(true);
    setSubmitError(undefined);
    setSubmitSuccess(false);

    try {
      // Validate required fields
      if (!formData.medication_id || !formData.dosage || !formData.route) {
        throw new Error("Please fill in Medication, Dosage, and Route");
      }

      const submissionData = {
        ...formData,
        administered_time: new Date().toISOString(),
        // administered_by_id: session?.user?.id // Get from session in real app
      };

      // Simulate API call
      // const response = await fetch(`/api/ipd/admissions/${admissionId}/medication-administration`, {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify(submissionData),
      // });
      // if (!response.ok) {
      //   const errorData = await response.json().catch(() => ({}));
      //   throw new Error(errorData.error || "Failed to record medication administration");
      // }
      // const newRecord: MedicationRecord = await response.json();

      // Mock response
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const selectedMed = medications.find(
        (m) => m.id === formData.medication_id
      );
      const newRecord: MedicationRecord = {
        id: `mar_${Date.now()}`,
        administered_time: submissionData.administered_time,
        medication_name: selectedMed
          ? `${selectedMed.item_name} ${selectedMed.strength} ${selectedMed.dosage_form}`
          : "Unknown Medication",
        dosage: formData.dosage,
        route: formData.route,
        administered_by_first_name: "Current", // Replace with actual user data
        administered_by_last_name: "User",
        notes: formData.notes,
      };

      // Update the medication records list with the new record
      setMedicationRecords((previous) => [newRecord, ...previous]);

      // Reset form
      setFormData({
        medication_id: "",
        dosage: "",
        route: "",
        notes: "",
      });

      setSubmitSuccess(true);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
    } catch (error_) {
      const message =
        error_ instanceof Error ? error_.message : "An unknown error occurred.";
      console.error("Error recording medication administration:", error_);
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    try {
      const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      };
      return new Intl.DateTimeFormat(undefined, options).format(
        new Date(dateString)
      );
    } catch {
      return "Invalid Date";
    }
  };

  // Route options for medication administration
  const routeOptions: { value: string; label: string }[] = [
    { value: "oral", label: "Oral" },
    { value: "iv", label: "Intravenous (IV)" },
    { value: "im", label: "Intramuscular (IM)" },
    { value: "sc", label: "Subcutaneous (SC)" },
    { value: "topical", label: "Topical" },
    { value: "rectal", label: "Rectal" },
    { value: "inhaled", label: "Inhaled" },
    { value: "sublingual", label: "Sublingual" },
    { value: "ng", label: "Nasogastric (NG)" },
    { value: "other", label: "Other" },
  ];

  return (
    <div className="space-y-6">
      {patientInfo && (
        <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
          <h3 className="font-semibold text-lg text-blue-900">
            {patientInfo.patient_first_name} {patientInfo.patient_last_name}
          </h3>
          <p className="text-sm text-gray-700">
            Admission: {patientInfo.admission_number} | Date:{" "}
            {formatDate(patientInfo.admission_date)}
            {patientInfo.diagnosis && ` | Diagnosis: ${patientInfo.diagnosis}`}
          </p>
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Record Medication Administration</CardTitle>
        </CardHeader>
        <CardContent>
          {submitSuccess && (
            <div
              className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4"
              role="alert"
            >
              Medication administration recorded successfully!
            </div>
          )}

          {submitError && (
            <div
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
              role="alert"
            >
              Error: {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="medication_id">
                  Medication <span className="text-red-500">*</span>
                </Label>
                <select
                  id="medication_id"
                  name="medication_id"
                  value={formData.medication_id}
                  onChange={handleChange}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                  disabled={loadingMedications || submitting}
                  aria-required="true"
                >
                  <option value="">
                    {loadingMedications ? "Loading..." : "Select Medication"}
                  </option>
                  {medications.map((med) => (
                    <option key={med.id} value={med.id}>
                      {med.item_name} ({med.strength} {med.dosage_form})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dosage">
                  Dosage <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="dosage"
                  name="dosage"
                  type="text"
                  placeholder="e.g., 500mg, 1 tablet, 10ml"
                  value={formData.dosage}
                  onChange={handleChange}
                  required
                  disabled={submitting}
                  aria-required="true"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="route">
                  Administration Route <span className="text-red-500">*</span>
                </Label>
                <select
                  id="route"
                  name="route"
                  value={formData.route}
                  onChange={handleChange}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                  disabled={submitting}
                  aria-required="true"
                >
                  <option value="">Select Route</option>
                  {routeOptions.map((route) => (
                    <option key={route.value} value={route.value}>
                      {route.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input // Changed to Input, use Textarea if multi-line is needed
                  id="notes"
                  name="notes"
                  type="text"
                  placeholder="Any additional information (optional)"
                  value={formData.notes}
                  onChange={handleChange}
                  disabled={submitting}
                />
                {/* <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Any additional information (optional)"
                  value={formData.notes}
                  onChange={handleChange}
                  disabled={submitting}
                /> */}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={submitting || loadingMedications}>
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : undefined}
                {submitting ? "Recording..." : "Record Administration"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Medication Administration History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-red-500 p-4 text-center" role="alert">
              {error}
            </div>
          ) : medicationRecords.length === 0 ? (
            <div className="text-gray-500 p-4 text-center">
              No medication administration records found for this admission.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Medication</TableHead>
                  <TableHead>Dosage</TableHead>
                  <TableHead>Route</TableHead>
                  (Content truncated due to size limit. Use line ranges to read
                  in chunks) <TableHead>Administered By</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {medicationRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {formatDate(record.administered_time)}
                    </TableCell>
                    <TableCell>{record.medication_name}</TableCell>
                    <TableCell>{record.dosage}</TableCell>
                    <TableCell>{record.route}</TableCell>
                    <TableCell>
                      {record.administered_by_first_name}{" "}
                      {record.administered_by_last_name}
                    </TableCell>
                    <TableCell>{record.notes || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MedicationAdministration;
