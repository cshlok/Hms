
"use client";

import React, { useState, ChangeEvent, FormEvent } from "react"; // FIX: Import necessary event types
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui";
import { useToast } from "@/components/ui/use-toast"; // FIX: Import useToast

// FIX: Define type for form data
interface AdmissionFormData {
  patient_id: string;
  admission_date: string;
  admission_type: "planned" | "emergency" | "transfer";
  primary_doctor_id: string;
  bed_id: string;
  diagnosis: string;
  estimated_stay: string;
}

// FIX: Define type for API error response
interface ApiErrorResponse {
  error?: string;
}

// FIX: Define type for API success response
interface AdmissionResponse {
  id: string; // Assuming admission ID is returned
  // Add other relevant fields
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
  const { toast } = useToast(); // FIX: Initialize toast

  // Mock data for dropdowns - in a real app, these would be fetched from the API
  const patients = [
    { id: "1", name: "Rahul Sharma" }, // FIX: Use string IDs if form state uses string
    { id: "2", name: "Priya Patel" },
    { id: "3", name: "Amit Singh" },
  ];

  const doctors = [
    { id: "2", name: "Dr. John Smith" }, // FIX: Use string IDs
  ];

  const beds = [
    { id: "1", number: "101-A", room: "101", ward: "General Ward" }, // FIX: Use string IDs
    { id: "2", number: "101-B", room: "101", ward: "General Ward" },
    { id: "3", number: "102-A", room: "102", ward: "General Ward" },
    { id: "4", number: "201-A", room: "201", ward: "Semi-Private" },
    { id: "5", number: "301-A", room: "301", ward: "Private" },
  ];

  // FIX: Add types for event and element
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // FIX: Add types for name and value (assuming value is string from Select)
  const handleSelectChange = (name: keyof AdmissionFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // FIX: Add type for event
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

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
          // FIX: Add type for errorData
          const errorData: ApiErrorResponse = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (jsonError) {
          // Ignore if response is not JSON
        }
        throw new Error(errorMsg);
      }

      // FIX: Type the success response
      const newAdmission: AdmissionResponse = await response.json();

      toast({ // FIX: Use toast for success
        title: "Admission Successful",
        description: `Patient admitted successfully with Admission ID: ${newAdmission.id}`,
      });

      // Reset form
      setFormData({
        patient_id: "",
        admission_date: new Date().toISOString().split("T")[0],
        admission_type: "planned",
        primary_doctor_id: "",
        bed_id: "",
        diagnosis: "",
        estimated_stay: "",
      });
    } catch (err: unknown) { // FIX: Use unknown for catch block
      console.error("Error creating admission:", err);
      // FIX: Type check error before accessing message
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast({ // FIX: Use toast for error
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
        {/* FIX: Removed manual success/error messages, relying on toast */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="patient_id">Patient</Label>
              {/* FIX: Use shadcn Select component for consistency */}
              <Select
                name="patient_id"
                value={formData.patient_id}
                onValueChange={(value) => handleSelectChange("patient_id", value)}
                required
              >
                <SelectTrigger id="patient_id">
                  <SelectValue placeholder="Select Patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admission_date">Admission Date</Label>
              <Input
                id="admission_date"
                name="admission_date"
                type="date"
                value={formData.admission_date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admission_type">Admission Type</Label>
              {/* FIX: Use shadcn Select component */}
              <Select
                name="admission_type"
                value={formData.admission_type}
                // FIX: Ensure value type matches expected enum
                onValueChange={(value: string) => handleSelectChange("admission_type", value as AdmissionFormData["admission_type"])}
                required
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
              <Label htmlFor="primary_doctor_id">Primary Doctor</Label>
              {/* FIX: Use shadcn Select component */}
              <Select
                name="primary_doctor_id"
                value={formData.primary_doctor_id}
                onValueChange={(value) => handleSelectChange("primary_doctor_id", value)}
                required
              >
                <SelectTrigger id="primary_doctor_id">
                  <SelectValue placeholder="Select Doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      {doctor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bed_id">Bed</Label>
              {/* FIX: Use shadcn Select component */}
              <Select
                name="bed_id"
                value={formData.bed_id}
                onValueChange={(value) => handleSelectChange("bed_id", value)}
                required
              >
                <SelectTrigger id="bed_id">
                  <SelectValue placeholder="Select Bed" />
                </SelectTrigger>
                <SelectContent>
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
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="diagnosis">Diagnosis</Label>
            <Textarea
              id="diagnosis"
              name="diagnosis"
              value={formData.diagnosis}
              onChange={handleChange}
              required
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? "Processing..." : "Admit Patient"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AdmissionForm;

