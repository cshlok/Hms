"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export default function CreateRadiologyOrderModal({ onClose, onSubmit }) {
  const [patientId, setPatientId] = useState("");
  const [procedureTypeId, setProcedureTypeId] = useState("");
  const [clinicalIndication, setClinicalIndication] = useState("");
  const [priority, setPriority] = useState("routine");
  const [referringDoctorId, setReferringDoctorId] = useState(""); // Optional

  const [patients, setPatients] = useState([]);
  const [procedureTypes, setProcedureTypes] = useState([]);
  const [doctors, setDoctors] = useState([]); // Assuming a way to fetch doctors
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [patientsRes, proceduresRes, doctorsRes] = await Promise.all([
          fetch("/api/patients"), // Assuming API endpoint exists
          fetch("/api/radiology/procedure-types"),
          fetch("/api/users?role=Doctor") // Assuming API endpoint exists to fetch doctors
        ]);

        if (!patientsRes.ok) throw new Error("Failed to fetch patients");
        if (!proceduresRes.ok) throw new Error("Failed to fetch procedure types");
        if (!doctorsRes.ok) throw new Error("Failed to fetch doctors");

        const patientsData = await patientsRes.json();
        const proceduresData = await proceduresRes.json();
        const doctorsData = await doctorsRes.json();

        setPatients(patientsData);
        setProcedureTypes(proceduresData);
        setDoctors(doctorsData);

      } catch (err) {
        console.error("Error fetching data for modal:", err);
        setError("Failed to load necessary data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patientId || !procedureTypeId || !clinicalIndication) {
      alert("Please fill in all required fields (Patient, Procedure Type, Clinical Indication).");
      return;
    }
    setIsSubmitting(true);
    await onSubmit({
      patient_id: patientId,
      procedure_type_id: procedureTypeId,
      clinical_indication: clinicalIndication,
      priority: priority,
      referring_doctor_id: referringDoctorId || null,
    });
    setIsSubmitting(false);
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
                  onChange={(e) => setClinicalIndication(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="priority" className="text-right">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
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
                    <SelectItem value="">None</SelectItem>
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
              <Button type="submit" disabled={isSubmitting}>
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

