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
} from "@/components/ui";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast"; // FIX: Import useToast

// Define interfaces for data structures
interface VitalSignRecord {
  id: string;
  admission_id: string;
  record_time: string;
  temperature?: number | string | null;
  pulse?: number | string | null;
  respiratory_rate?: number | string | null;
  blood_pressure?: string | null;
  oxygen_saturation?: number | string | null;
  pain_level?: number | string | null;
  notes?: string | null;
  recorded_by_user_id: string;
  // Assuming these come from a join or separate fetch
  recorded_by_first_name?: string;
  recorded_by_last_name?: string;
}

interface AdmissionInfo {
  admission_number: string;
  admission_date: string;
  patient_first_name: string;
  patient_last_name: string;
  diagnosis?: string;
}

interface FormData {
  temperature: string;
  pulse: string;
  respiratory_rate: string;
  blood_pressure: string;
  oxygen_saturation: string;
  pain_level: string;
  notes: string;
}

// FIX: Define type for API success response (new record)
type NewVitalSignResponse = VitalSignRecord;

// FIX: Define type for submission data
interface VitalSignSubmissionData {
  record_time: string;
  temperature: number | null;
  pulse: number | null;
  respiratory_rate: number | null;
  blood_pressure: string | null;
  oxygen_saturation: number | null;
  pain_level: number | null;
  notes: string | null;
  // recorded_by_user_id will be added on the server or from session
}

interface VitalSignsProperties {
  admissionId: string | null;
}

const VitalSigns: React.FC<VitalSignsProperties> = ({ admissionId }) => {
  const [vitalSigns, setVitalSigns] = useState<VitalSignRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>();
  const [formData, setFormData] = useState<FormData>({
    temperature: "",
    pulse: "",
    respiratory_rate: "",
    blood_pressure: "",
    oxygen_saturation: "",
    pain_level: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [patientInfo, setPatientInfo] = useState<AdmissionInfo | null>();
  const { toast } = useToast(); // FIX: Initialize toast

  // Fetch vital signs and admission info
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
        // const response = await fetch(`/api/ipd/admissions/${admissionId}/vital-signs`);
        // if (!response.ok) {
        //   let errorMsg = "Failed to fetch vital signs";
        //   try {
        //       const errorData: ApiErrorResponse = await response.json();
        //       errorMsg = errorData.error || errorMsg;
        //   } catch (jsonError) { /* Ignore */ }
        //   throw new Error(errorMsg);
        // }
        // const data = await response.json(); // Assuming { admission: AdmissionInfo, vital_signs: VitalSignRecord[] }
        // setVitalSigns(data.vital_signs?.sort((a, b) => new Date(b.record_time).getTime() - new Date(a.record_time).getTime()) || []);
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
        const mockVitalSigns: VitalSignRecord[] = [
          {
            id: "vs_001",
            admission_id: admissionId,
            record_time: new Date(Date.now() - 3_600_000 * 4).toISOString(), // 4 hours ago
            temperature: 37.8,
            pulse: 88,
            respiratory_rate: 18,
            blood_pressure: "122/78",
            oxygen_saturation: 97,
            pain_level: 2,
            recorded_by_user_id: "nurse_01",
            recorded_by_first_name: "Nurse",
            recorded_by_last_name: "Joy",
            notes: "Patient comfortable",
          },
          {
            id: "vs_002",
            admission_id: admissionId,
            record_time: new Date(Date.now() - 3_600_000 * 8).toISOString(), // 8 hours ago
            temperature: 38.1,
            pulse: 92,
            respiratory_rate: 20,
            blood_pressure: "125/80",
            oxygen_saturation: 96,
            pain_level: 3,
            recorded_by_user_id: "nurse_02",
            recorded_by_first_name: "Nurse",
            recorded_by_last_name: "Mike",
          },
        ];

        setPatientInfo(mockPatientInfo);
        setVitalSigns(
          mockVitalSigns.sort(
            (a, b) =>
              new Date(b.record_time).getTime() -
              new Date(a.record_time).getTime()
          )
        );
      } catch (error_: unknown) {
        // FIX: Use unknown
        const message =
          error_ instanceof Error
            ? error_.message
            : "An unknown error occurred.";
        console.error("Error fetching vital signs data:", error_);
        setError(`Failed to load vital signs: ${message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [admissionId]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!admissionId) {
      toast({
        title: "Error",
        description: "Admission ID is missing.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);

    try {
      // Prepare data, converting empty strings to null and numbers where appropriate
      // FIX: Use the defined submission data type
      const submissionData: VitalSignSubmissionData = {
        record_time: new Date().toISOString(),
        temperature: formData.temperature
          ? Number.parseFloat(formData.temperature)
          : null,
        pulse: formData.pulse ? Number.parseInt(formData.pulse, 10) : null,
        respiratory_rate: formData.respiratory_rate
          ? Number.parseInt(formData.respiratory_rate, 10)
          : null,
        blood_pressure: formData.blood_pressure || null,
        oxygen_saturation: formData.oxygen_saturation
          ? Number.parseFloat(formData.oxygen_saturation)
          : null,
        pain_level: formData.pain_level
          ? Number.parseInt(formData.pain_level, 10)
          : null,
        notes: formData.notes || null,
      };

      // Basic validation
      // FIX: Check for null and range for pain_level
      if (
        submissionData.pain_level !== null &&
        (submissionData.pain_level < 0 || submissionData.pain_level > 10)
      ) {
        throw new Error("Pain level must be a number between 0 and 10.");
      }
      // Add other validations as needed (e.g., for temperature, pulse ranges)

      // Simulate API call
      // const response = await fetch(`/api/ipd/admissions/${admissionId}/vital-signs`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(submissionData),
      // });
      // if (!response.ok) {
      //   let errorMsg = "Failed to record vital signs";
      //   try {
      //       const errorData: ApiErrorResponse = await response.json();
      //       errorMsg = errorData.error || errorMsg;
      //   } catch (jsonError) { /* Ignore */ }
      //   throw new Error(errorMsg);
      // }
      // const newRecord: NewVitalSignResponse = await response.json();

      // Mock response
      await new Promise((resolve) => setTimeout(resolve, 800));
      const newRecord: NewVitalSignResponse = {
        id: `vs_${Date.now()}`,
        admission_id: admissionId,
        recorded_by_user_id: "nurse_current", // Replace with actual user ID
        recorded_by_first_name: "Current", // Replace with actual user data
        recorded_by_last_name: "Nurse",
        ...submissionData,
      } as NewVitalSignResponse; // Assert type after merging

      // Update the vital signs list (prepend new record)
      setVitalSigns((previous) => [newRecord, ...previous]);

      // Reset form
      setFormData({
        temperature: "",
        pulse: "",
        respiratory_rate: "",
        blood_pressure: "",
        oxygen_saturation: "",
        pain_level: "",
        notes: "",
      });

      toast({
        title: "Success",
        description: "Vital signs recorded successfully!",
      });
    } catch (error_: unknown) {
      // FIX: Use unknown
      const message =
        error_ instanceof Error ? error_.message : "An unknown error occurred.";
      console.error("Error recording vital signs:", error_);
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Format date for display
  const formatDateTime = (dateString: string | undefined): string => {
    if (!dateString) return "N/A";
    try {
      const options: Intl.DateTimeFormatOptions = {
        // year: "numeric",
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

  return (
    <div className="space-y-6">
      {patientInfo && (
        <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
          <h3 className="font-semibold text-lg text-blue-900">
            {patientInfo.patient_first_name} {patientInfo.patient_last_name}
          </h3>
          <p className="text-sm text-gray-700">
            Admission: {patientInfo.admission_number} | Date:{" "}
            {formatDateTime(patientInfo.admission_date)}
            {patientInfo.diagnosis &&
              ` | Admission Diagnosis: ${patientInfo.diagnosis}`}
          </p>
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Record Vital Signs</CardTitle>
        </CardHeader>
        <CardContent>
          {/* FIX: Removed manual success/error messages, relying on toast */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="temperature">Temperature (°C)</Label>
                <Input
                  id="temperature"
                  name="temperature"
                  type="number"
                  step="0.1"
                  value={formData.temperature}
                  onChange={handleChange}
                  disabled={submitting}
                  placeholder="e.g., 37.5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pulse">Pulse (bpm)</Label>
                <Input
                  id="pulse"
                  name="pulse"
                  type="number"
                  value={formData.pulse}
                  onChange={handleChange}
                  disabled={submitting}
                  placeholder="e.g., 80"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="respiratory_rate">Resp. Rate (bpm)</Label>
                <Input
                  id="respiratory_rate"
                  name="respiratory_rate"
                  type="number"
                  value={formData.respiratory_rate}
                  onChange={handleChange}
                  disabled={submitting}
                  placeholder="e.g., 16"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="blood_pressure">Blood Pressure (mmHg)</Label>
                <Input
                  id="blood_pressure"
                  name="blood_pressure"
                  type="text"
                  placeholder="e.g., 120/80"
                  value={formData.blood_pressure}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="oxygen_saturation">Oxygen Saturation (%)</Label>
                <Input
                  id="oxygen_saturation"
                  name="oxygen_saturation"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.oxygen_saturation}
                  onChange={handleChange}
                  disabled={submitting}
                  placeholder="e.g., 98"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pain_level">Pain Level (0-10)</Label>
                <Input
                  id="pain_level"
                  name="pain_level"
                  type="number"
                  min="0"
                  max="10"
                  value={formData.pain_level}
                  onChange={handleChange}
                  disabled={submitting}
                  placeholder="e.g., 3"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                name="notes"
                type="text"
                value={formData.notes}
                onChange={handleChange}
                disabled={submitting}
                placeholder="Optional notes (e.g., patient position, activity)"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : undefined}
                {submitting ? "Saving..." : "Record Vitals"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Vital Signs History</CardTitle>
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
          ) : vitalSigns.length === 0 ? (
            <div className="text-gray-500 p-4 text-center">
              No vital signs recorded for this admission yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-center">Temp (°C)</TableHead>
                    <TableHead className="text-center">Pulse</TableHead>
                    <TableHead className="text-center">Resp Rate</TableHead>
                    <TableHead className="text-center">BP</TableHead>
                    <TableHead className="text-center">SpO2 (%)</TableHead>
                    <TableHead className="text-center">Pain</TableHead>
                    <TableHead>Recorded By</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vitalSigns.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(record.record_time)}
                      </TableCell>
                      <TableCell className="text-center">
                        {record.temperature ?? "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {record.pulse ?? "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {record.respiratory_rate ?? "-"}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {record.blood_pressure ?? "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {record.oxygen_saturation ?? "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {record.pain_level ?? "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {record.recorded_by_first_name}{" "}
                        {record.recorded_by_last_name?.charAt(0)}.
                      </TableCell>
                      <TableCell
                        className="max-w-[150px] truncate"
                        title={record.notes ?? ""}
                      >
                        {record.notes ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VitalSigns;
