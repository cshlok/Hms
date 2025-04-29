"use client";

import React, { useState, useEffect, FormEvent } from 'react'; // Added FormEvent
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface OrderPayload {
  patient_id: string;
  procedure_type_id: string;
  clinical_indication: string;
  priority: "routine" | "stat";
  referring_doctor_id: string | null;
}

interface CreateRadiologyOrderModalProps {
  onClose: () => void;
  onSubmit: (payload: OrderPayload) => Promise<void>;
}

export default function CreateRadiologyOrderModal({ onClose, onSubmit }: CreateRadiologyOrderModalProps) {
  const [patientId, setPatientId] = useState<string>("");
  const [procedureTypeId, setProcedureTypeId] = useState<string>("");
  const [clinicalIndication, setClinicalIndication] = useState<string>("");
  const [priority, setPriority] = useState<"routine" | "stat">("routine");
  const [referringDoctorId, setReferringDoctorId] = useState<string>(""); // Store as string, convert to null on submit if empty

  const [patients, setPatients] = useState<Patient[]>([]);
  const [procedureTypes, setProcedureTypes] = useState<ProcedureType[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Assuming API endpoints return { results: [...] } or just [...] directly
        const [patientsRes, proceduresRes, doctorsRes] = await Promise.all([
          fetch("/api/patients"), // Adjust if endpoint differs
          fetch("/api/radiology/procedure-types"),
          fetch("/api/users?role=Doctor") // Adjust if endpoint differs
        ]);

        if (!patientsRes.ok) throw new Error(`Failed to fetch patients: ${patientsRes.statusText}`);
        if (!proceduresRes.ok) throw new Error(`Failed to fetch procedure types: ${proceduresRes.statusText}`);
        if (!doctorsRes.ok) throw new Error(`Failed to fetch doctors: ${doctorsRes.statusText}`);

        const patientsData = await patientsRes.json();
        const proceduresData = await proceduresRes.json();
        const doctorsData = await doctorsRes.json();

        // Handle potential API response structures (e.g., { results: [...] })
        setPatients(patientsData.results || (Array.isArray(patientsData) ? patientsData : []));
        setProcedureTypes(proceduresData.results || (Array.isArray(proceduresData) ? proceduresData : []));
        setDoctors(doctorsData.results || (Array.isArray(doctorsData) ? doctorsData : []));

      } catch (err) {
        const message = err instanceof Error ? err.message : "An unknown error occurred";
        console.error("Error fetching data for modal:", message);
        setError(`Failed to load necessary data: ${message}. Please try again.`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!patientId || !procedureTypeId || !clinicalIndication) {
      // Consider using a toast notification instead of alert
      alert("Please fill in all required fields (Patient, Procedure Type, Clinical Indication).");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({
        patient_id: patientId,
        procedure_type_id: procedureTypeId,
        clinical_indication: clinicalIndication,
        priority: priority,
        referring_doctor_id: referringDoctorId || null, // Convert empty string to null
      });
      // onClose(); // Optionally close modal on successful submit, handled by parent
    } catch (submitError) {
        const message = submitError instanceof Error ? submitError.message : "An unknown error occurred during submission";
        console.error("Error submitting order:", message);
        setError(`Submission failed: ${message}`); // Show error to user
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Radiology Order</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500 p-4">{error}</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="patient" className="text-right">Patient *</Label>
                <Select value={patientId} onValueChange={setPatientId} required>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select Patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name} (ID: {patient.id.substring(0, 6)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="procedureType" className="text-right">Procedure Type *</Label>
                <Select value={procedureTypeId} onValueChange={setProcedureTypeId} required>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select Procedure Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {procedureTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="clinicalIndication" className="text-right">Clinical Indication *</Label>
                <Textarea
                  id="clinicalIndication"
                  value={clinicalIndication}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setClinicalIndication(e.target.value)}
                  className="col-span-3"
                  required
                  placeholder="Enter reason for the study..."
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="priority" className="text-right">Priority</Label>
                <Select value={priority} onValueChange={(value: "routine" | "stat") => setPriority(value)}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="stat">STAT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="referringDoctor" className="text-right">Referring Doctor</Label>
                <Select value={referringDoctorId} onValueChange={setReferringDoctorId}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select Referring Doctor (Optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem> {/* Use empty string for no selection */}
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
                <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting || loading}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Order
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

