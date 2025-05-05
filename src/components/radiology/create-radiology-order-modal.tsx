"use client";

import React, { useState, useEffect, FormEvent } from "react"; // Added FormEvent
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
// import { Input } from "@/components/ui/input"; // Unused
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

// Define interfaces for data types
interface Patient {
  id: string;
  name: string; // Assuming patient object has a name property
  // Add other relevant patient fields if needed
}

interface ProcedureType {
  id: string;
  name: string;
  // Add other relevant procedure type fields if needed
}

interface Doctor {
  id: string;
  name: string; // Assuming user/doctor object has a name property
  // Add other relevant doctor fields if needed
}

// FIX: Export the payload type
export interface OrderPayload {
  patient_id: string;
  procedure_type_id: string;
  clinical_indication: string;
  priority: "routine" | "stat";
  referring_doctor_id: string | null;
}

interface CreateRadiologyOrderModalProperties {
  isOpen: boolean; // Add isOpen prop to control visibility from parent
  onClose: () => void;
  onSubmit: (payload: OrderPayload) => Promise<void>;
}

export default function CreateRadiologyOrderModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateRadiologyOrderModalProperties) {
  const [patientId, setPatientId] = useState<string>("");
  const [procedureTypeId, setProcedureTypeId] = useState<string>("");
  const [clinicalIndication, setClinicalIndication] = useState<string>("");
  const [priority, setPriority] = useState<"routine" | "stat">("routine");
  const [referringDoctorId, setReferringDoctorId] = useState<string>(""); // Store as string, convert to null on submit if empty

  const [patients, setPatients] = useState<Patient[]>([]);
  const [procedureTypes, setProcedureTypes] = useState<ProcedureType[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    // Only fetch data if the modal is open
    if (!isOpen) return;

    const fetchData = async () => {
      setLoading(true);
      setError(undefined);
      try {
        // Assuming API endpoints return { results: [...] } or just [...] directly
        const [patientsResponse, proceduresResponse, doctorsResponse] = await Promise.all([
          fetch("/api/patients"), // Adjust if endpoint differs
          fetch("/api/radiology/procedure-types"),
          fetch("/api/users?role=Doctor"), // Adjust if endpoint differs
        ]);

        if (!patientsResponse.ok)
          throw new Error(
            `Failed to fetch patients: ${patientsResponse.statusText}`
          );
        if (!proceduresResponse.ok)
          throw new Error(
            `Failed to fetch procedure types: ${proceduresResponse.statusText}`
          );
        if (!doctorsResponse.ok)
          throw new Error(`Failed to fetch doctors: ${doctorsResponse.statusText}`);

        // Explicitly type the JSON response
        const patientsData: { results: Patient[] } | Patient[] =
          await patientsResponse.json();
        const proceduresData: { results: ProcedureType[] } | ProcedureType[] =
          await proceduresResponse.json();
        const doctorsData: { results: Doctor[] } | Doctor[] =
          await doctorsResponse.json();

        // Handle potential API response structures (e.g., { results: [...] })
        setPatients(
          Array.isArray(patientsData)
            ? patientsData
            : patientsData.results || []
        );
        setProcedureTypes(
          Array.isArray(proceduresData)
            ? proceduresData
            : proceduresData.results || []
        );
        setDoctors(
          Array.isArray(doctorsData) ? doctorsData : doctorsData.results || []
        );
      } catch (error_) {
        const message =
          error_ instanceof Error
            ? error_.message
            : "An unknown error occurred";
        console.error("Error fetching data for modal:", message);
        setError(
          `Failed to load necessary data: ${message}. Please try again.`
        );
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isOpen]); // Re-fetch when modal opens

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!patientId || !procedureTypeId || !clinicalIndication) {
      // Consider using a toast notification instead of alert
      alert(
        "Please fill in all required fields (Patient, Procedure Type, Clinical Indication)."
      );
      return;
    }
    setIsSubmitting(true);
    setError(undefined); // Clear previous errors
    try {
      await onSubmit({
        patient_id: patientId,
        procedure_type_id: procedureTypeId,
        clinical_indication: clinicalIndication,
        priority: priority,
        referring_doctor_id: referringDoctorId || null, // Convert empty string to null
      });
      // Reset form state after successful submission
      setPatientId("");
      setProcedureTypeId("");
      setClinicalIndication("");
      setPriority("routine");
      setReferringDoctorId("");
      // onClose(); // Parent component should handle closing the modal
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "An unknown error occurred during submission";
      console.error("Error submitting order:", message);
      setError(`Submission failed: ${message}`); // Show error to user
    } finally {
      setIsSubmitting(false);
    }
  };

  // Use the isOpen prop passed from the parent to control the dialog
  return (
    <Dialog open={isOpen} onOpenChange={(openState) => !openState && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Radiology Order</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500 p-4 border border-red-200 rounded bg-red-50">
            {error}
          </div>
        ) : undefined}
        {/* Render form only when not loading, even if there was an error during fetch */}
        {!loading && (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {/* Patient Select */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="patient" className="text-right">
                  Patient *
                </Label>
                <Select
                  value={patientId}
                  onValueChange={setPatientId}
                  required
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select Patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.length === 0 && (
                      <SelectItem value="" disabled>
                        No patients found
                      </SelectItem>
                    )}
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name} (ID: {patient.id.slice(0, 6)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Procedure Type Select */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="procedureType" className="text-right">
                  Procedure Type *
                </Label>
                <Select
                  value={procedureTypeId}
                  onValueChange={setProcedureTypeId}
                  required
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select Procedure Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {procedureTypes.length === 0 && (
                      <SelectItem value="" disabled>
                        No procedure types found
                      </SelectItem>
                    )}
                    {procedureTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Clinical Indication Textarea */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="clinicalIndication" className="text-right">
                  Clinical Indication *
                </Label>
                <Textarea
                  id="clinicalIndication"
                  value={clinicalIndication}
                  onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setClinicalIndication(event.target.value)
                  }
                  className="col-span-3"
                  required
                  placeholder="Enter reason for the study..."
                  disabled={isSubmitting}
                />
              </div>

              {/* Priority Select */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="priority" className="text-right">
                  Priority
                </Label>
                <Select
                  value={priority}
                  onValueChange={(value: "routine" | "stat") =>
                    setPriority(value)
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="stat">STAT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Referring Doctor Select */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="referringDoctor" className="text-right">
                  Referring Doctor
                </Label>
                <Select
                  value={referringDoctorId}
                  onValueChange={setReferringDoctorId}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select Referring Doctor (Optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>{" "}
                    {/* Use empty string for no selection */}
                    {doctors.length === 0 && (
                      <SelectItem value="" disabled>
                        No doctors found
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
            </div>
            <DialogFooter>
              <DialogClose asChild>
                {/* Ensure Cancel button calls onClose */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting || loading}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : undefined}
                Create Order
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
