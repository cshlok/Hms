"use client";

import React, { useState, ChangeEvent, FormEvent } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"; // Corrected import path
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
} from "@/components/ui/select"; // Corrected import path
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react"; // Import Loader2 for loading state

// Define type for form data
interface AdmissionFormData {
  patient_id: string;
  admission_date: string;
  admission_type: "planned" | "emergency" | "transfer";
  primary_doctor_id: string;
  bed_id: string;
  diagnosis: string;
  estimated_stay: string; // Keep as string for input, parse if needed
}

// Define type for API error response
interface ApiErrorResponse {
  error?: string;
  message?: string; // Include message as potential error key
}

// Define type for API success response
interface AdmissionResponse {
  id: string; // Assuming admission ID is returned
  // Add other relevant fields returned by the API
}

// Mock data types (replace with actual types if fetched from API)
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
    admission_date: new Date().toISOString().split("T")[0], // Default to today
    admission_type: "planned",
    primary_doctor_id: "",
    bed_id: "",
    diagnosis: "",
    estimated_stay: "",
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Mock data for dropdowns - replace with API calls in a real app
  // Ensure IDs are strings to match form state
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

  // Handler for standard input/textarea changes
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handler for Select component changes
  const handleSelectChange = (name: keyof AdmissionFormData, value: string) => {
    // Special handling for admission_type to ensure type safety
    if (name === "admission_type") {
      setFormData((prev) => ({ ...prev, [name]: value as AdmissionFormData["admission_type"] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Handler for form submission
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    // Basic validation (consider more robust validation)
    if (!formData.patient_id || !formData.primary_doctor_id || !formData.bed_id || !formData.diagnosis) {
        toast({
            title: "Missing Information",
            description: "Please fill in all required fields (Patient, Doctor, Bed, Diagnosis).",
            variant: "destructive",
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
        let errorMsg = "Failed to create admission";
        try {
          const errorData: ApiErrorResponse = await response.json();
          errorMsg = errorData.error || errorData.message || errorMsg;
        } catch {
          errorMsg = `${errorMsg}: ${response.statusText}`;
        }
        throw new Error(errorMsg);
      }

      const newAdmission: AdmissionResponse = await response.json();

      toast({
        title: "Admission Successful",
        description: `Patient admitted successfully. Admission ID: ${newAdmission.id}`,
      });

      // Reset form to initial state
      setFormData({
        patient_id: "",
        admission_date: new Date().toISOString().split("T")[0],
        admission_type: "planned",
        primary_doctor_id: "",
        bed_id: "",
        diagnosis: "",
        estimated_stay: "",
      });
    } catch (err: unknown) {
      console.error("Error creating admission:", err);
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast({
        title: "Admission Failed",
        description: message,
        variant: "destructive",
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
            {/* Patient Select */}
            <div className="space-y-2">
              <Label htmlFor="patient_id">Patient *</Label>
              <Select
                value={formData.patient_id}
                onValueChange={(value) => handleSelectChange("patient_id", value)}
                required
                disabled={loading}
              >
                <SelectTrigger id="patient_id">
                  <SelectValue placeholder="Select Patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.length === 0 && <SelectItem value="" disabled>No patients available</SelectItem>}
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Admission Date */}
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

            {/* Admission Type Select */}
            <div className="space-y-2">
              <Label htmlFor="admission_type">Admission Type *</Label>
              <Select
                value={formData.admission_type}
                onValueChange={(value) => handleSelectChange("admission_type", value)}
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

            {/* Primary Doctor Select */}
            <div className="space-y-2">
              <Label htmlFor="primary_doctor_id">Primary Doctor *</Label>
              <Select
                value={formData.primary_doctor_id}
                onValueChange={(value) => handleSelectChange("primary_doctor_id", value)}
                required
                disabled={loading}
              >
                <SelectTrigger id="primary_doctor_id">
                  <SelectValue placeholder="Select Doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.length === 0 && <SelectItem value="" disabled>No doctors available</SelectItem>}
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      {doctor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bed Select */}
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
                  {beds.length === 0 && <SelectItem value="" disabled>No beds available</SelectItem>}
                  {beds.map((bed) => (
                    <SelectItem key={bed.id} value={bed.id}>
                      {bed.number} - {bed.room} ({bed.ward})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Estimated Stay */}
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

          {/* Diagnosis Textarea */}
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

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? "Processing..." : "Admit Patient"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AdmissionForm;

