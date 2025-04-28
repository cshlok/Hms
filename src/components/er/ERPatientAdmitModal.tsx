// src/components/er/ERPatientAdmitModal.tsx
"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

// Define the schema for the admission form using Zod
const admitFormSchema = z.object({
  visitId: z.string().min(1, { message: "Visit ID is required." }),
  patientName: z.string().min(1, { message: "Patient name is required." }),
  admittingDoctorId: z.string().min(1, { message: "Admitting doctor is required." }),
  admissionNotes: z.string().optional(),
  wardType: z.string().min(1, { message: "Ward type is required." }),
  bedPreference: z.string().optional(),
  admissionReason: z.string().min(1, { message: "Admission reason is required." }),
});

type AdmitFormValues = z.infer<typeof admitFormSchema>;

interface ERPatientAdmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitData?: {
    id: string;
    patientName: string;
    chiefComplaint: string;
  };
  onSuccess?: () => void;
}

export default function ERPatientAdmitModal({ 
  isOpen, 
  onClose, 
  visitData,
  onSuccess 
}: ERPatientAdmitModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<AdmitFormValues>({
    resolver: zodResolver(admitFormSchema),
    defaultValues: {
      visitId: visitData?.id || "",
      patientName: visitData?.patientName || "",
      admittingDoctorId: "",
      admissionNotes: "",
      wardType: "",
      bedPreference: "",
      admissionReason: visitData?.chiefComplaint || "",
    },
  });

  // Update form when visitData changes
  useState(() => {
    if (visitData) {
      form.setValue("visitId", visitData.id);
      form.setValue("patientName", visitData.patientName);
      form.setValue("admissionReason", visitData.chiefComplaint);
    }
  });

  async function onSubmit(data: AdmitFormValues) {
    setIsLoading(true);
    console.log("Submitting Admission Data:", data);

    try {
      // Step 1: Create IPD admission
      // TODO: Implement API call: POST /api/ipd/admissions
      const admissionResponse = await fetch("/api/ipd/admissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visit_id: data.visitId,
          admitting_doctor_id: data.admittingDoctorId,
          ward_type: data.wardType,
          bed_preference: data.bedPreference || null,
          admission_reason: data.admissionReason,
          admission_notes: data.admissionNotes || null,
          source: "ER",
        }),
      });

      if (!admissionResponse.ok) {
        const errorData = await admissionResponse.json();
        throw new Error(errorData.error || "Failed to create admission");
      }

      const newAdmission = await admissionResponse.json();

      // Step 2: Update ER visit status
      // TODO: Implement API call: PUT /api/er/visits/[id]
      const visitResponse = await fetch(`/api/er/visits/${data.visitId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_status: "Admitted",
          disposition: "Admitted to IPD",
        }),
      });

      if (!visitResponse.ok) {
        const errorData = await visitResponse.json();
        throw new Error(errorData.error || "Failed to update ER visit status");
      }

      toast({
        title: "Patient Admitted",
        description: `Admission created successfully. Awaiting bed assignment.`,
      });
      
      if (onSuccess) {
        onSuccess();
      }
      form.reset();
      onClose();

    } catch (error: any) {
      console.error("Admission error:", error);
      toast({
        title: "Admission Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Mock data for doctors and ward types
  const doctors = [
    { id: "doctor_1", name: "Dr. Smith" },
    { id: "doctor_2", name: "Dr. Jones" },
    { id: "doctor_3", name: "Dr. Williams" },
  ];

  const wardTypes = [
    { id: "general", name: "General Ward" },
    { id: "semi_private", name: "Semi-Private" },
    { id: "private", name: "Private Room" },
    { id: "icu", name: "Intensive Care Unit" },
    { id: "hdu", name: "High Dependency Unit" },
    { id: "isolation", name: "Isolation Room" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Admit Patient to IPD</DialogTitle>
          <DialogDescription>
            Create an inpatient admission for this ER patient.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="patientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient Name</FormLabel>
                    <FormControl>
                      <Input {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="visitId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ER Visit ID</FormLabel>
                    <FormControl>
                      <Input {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="admittingDoctorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Admitting Doctor</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Admitting Doctor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {doctors.map(doctor => (
                        <SelectItem key={doctor.id} value={doctor.id}>{doctor.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="wardType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ward Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Ward Type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {wardTypes.map(ward => (
                        <SelectItem key={ward.id} value={ward.id}>{ward.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bedPreference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bed Preference (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Near window, ground floor" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="admissionReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Admission Reason</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Reason for admission..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="admissionNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional notes for the admission..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Processing..." : "Admit Patient"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
