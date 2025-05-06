"use client";

import React, { useState, ChangeEvent, FormEvent } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner"; // Changed from useToast to sonner
import { Loader2 } from "lucide-react";

interface AdmissionFormData {
  patient_id: string;
  admission_date: string;
  admission_type: "planned" | "emergency" | "transfer";
  primary_doctor_id: string;
  bed_id: string;
  diagnosis: string;
  estimated_stay: string;
}

interface ApiErrorResponse {
  error?: string;
  message?: string;
}

interface AdmissionResponse {
  id: string;
}

interface MockPatient {
  id: string;
  name: string;
}
interface MockDoctor {
  id: string;
  name: string;
}
interface MockBed {
  id: string;
  number: string;
  room: string;
  ward: string;
}

const AdmissionForm = () => {
  const [formData, setFormData] = useState<AdmissionFormData>({
    patient_id: "",
    admission_date: new Date().toISOString().split("T")[0],
    admission_type: "planned",
    primary_doctor_id: "",
    bed_id: "",
    diagnosis: "",
    estimated_stay: "",
  });
  const [loading, setLoading] = useState(false);
  // Removed: const { toast } = useToast();

  const patients: MockPatient[] = [
    { id: "pat1", name: "Rahul Sharma" },
    { id: "pat2", name: "Priya Patel" },
    { id: "pat3", name: "Amit Singh" },
  ];

  const doctors: MockDoctor[] = [
    { id: "doc1", name: "Dr. Evelyn Reed" },
    { id: "doc2", name: "Dr. Kenji Tanaka" },
  ];

  const beds: MockBed[] = [
    { id: "bed1", number: "101-A", room: "101", ward: "General Ward" },
    { id: "bed2", number: "101-B", room: "101", ward: "General Ward" },
    { id: "bed3", number: "201-A", room: "201", ward: "Semi-Private" },
    { id: "bed4", number: "301", room: "301", ward: "Private" },
  ];

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSelectChange = (name: keyof AdmissionFormData, value: string) => {
    if (name === "admission_type") {
      setFormData((previous) => ({
        ...previous,
        [name]: value as AdmissionFormData["admission_type"],
      }));
    } else {
      setFormData((previous) => ({ ...previous, [name]: value }));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    if (
      !formData.patient_id ||
      !formData.primary_doctor_id ||
      !formData.bed_id ||
      !formData.diagnosis
    ) {
      toast.error("Missing Information", { // Changed to sonner toast.error
        description:
          "Please fill in all required fields (Patient, Doctor, Bed, Diagnosis).",
      });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/ipd/admissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        let errorMessage = "Failed to create admission";
        try {
          const errorData: ApiErrorResponse = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = `${errorMessage}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const newAdmission: AdmissionResponse = await response.json();

      toast.success("Admission Successful", { // Changed to sonner toast.success
        description: `Patient admitted successfully. Admission ID: ${newAdmission.id}`,
      });

      setFormData({
        patient_id: "",
        admission_date: new Date().toISOString().split("T")[0],
        admission_type: "planned",
        primary_doctor_id: "",
        bed_id: "",
        diagnosis: "",
        estimated_stay: "",
      });
    } catch (error: unknown) {
      console.error("Error creating admission:", error);
      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";
      toast.error("Admission Failed", { // Changed to sonner toast.error
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Patient Admission</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="patient_id">Patient *</Label>
              <Select
                value={formData.patient_id}
                onValueChange={(value) =>
                  handleSelectChange("patient_id", value)
                }
                required
                disabled={loading}
              >
                <SelectTrigger id="patient_id">
                  <SelectValue placeholder="Select Patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.length === 0 && (
                    <SelectItem value="" disabled>
                      No patients available
                    </SelectItem>
                  )}
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admission_date">Admission Date *</Label>
              <Input
                id="admission_date"
                name="admission_date"
                type="date"
                value={formData.admission_date}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admission_type">Admission Type *</Label>
              <Select
                value={formData.admission_type}
                onValueChange={(value) =>
                  handleSelectChange("admission_type", value)
                }
                required
                disabled={loading}
              >
                <SelectTrigger id="admission_type">
                  <SelectValue placeholder="Select Admission Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="primary_doctor_id">Primary Doctor *</Label>
              <Select
                value={formData.primary_doctor_id}
                onValueChange={(value) =>
                  handleSelectChange("primary_doctor_id", value)
                }
                required
                disabled={loading}
              >
                <SelectTrigger id="primary_doctor_id">
                  <SelectValue placeholder="Select Doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.length === 0 && (
                    <SelectItem value="" disabled>
                      No doctors available
                    </SelectItem>
                  )}
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      {doctor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bed_id">Assign Bed *</Label>
              <Select
                value={formData.bed_id}
                onValueChange={(value) => handleSelectChange("bed_id", value)}
                required
                disabled={loading}
              >
                <SelectTrigger id="bed_id">
                  <SelectValue placeholder="Select Bed" />
                </SelectTrigger>
                <SelectContent>
                  {beds.length === 0 && (
                    <SelectItem value="" disabled>
                      No beds available
                    </SelectItem>
                  )}
                  {beds.map((bed) => (
                    <SelectItem key={bed.id} value={bed.id}>
                      {bed.number} - {bed.room} ({bed.ward})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimated_stay">Estimated Stay (days)</Label>
              <Input
                id="estimated_stay"
                name="estimated_stay"
                type="number"
                min="1"
                value={formData.estimated_stay}
                onChange={handleChange}
                disabled={loading}
                placeholder="e.g., 5"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="diagnosis">Diagnosis *</Label>
            <Textarea
              id="diagnosis"
              name="diagnosis"
              value={formData.diagnosis}
              onChange={handleChange}
              required
              disabled={loading}
              placeholder="Enter primary diagnosis..."
              rows={4}
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : undefined}
              {loading ? "Processing..." : "Admit Patient"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AdmissionForm;

