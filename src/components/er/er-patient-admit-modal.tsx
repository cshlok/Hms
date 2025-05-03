// src/components/er/ERPatientAdmitModal.tsx
"use client";

import { useState, useEffect } from "react"; // FIX: Added useEffect
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// FIX: Remove direct import of toast
// import { toast } from "@/components/ui/use-toast";
import { useToast } from "@/components/ui/use-toast"; // FIX: Use the hook

// --- INTERFACES ---

// Define the schema for the admission form using Zod
const admitFormSchema = z.object({
  visitId: z.string().min(1, { message: "Visit ID is required." }),
  patientName: z.string().min(1, { message: "Patient name is required." }),
  admittingDoctorId: z
    .string()
    .min(1, { message: "Admitting doctor is required." }),
  admissionNotes: z.string().optional(),
  wardType: z.string().min(1, { message: "Ward type is required." }),
  bedPreference: z.string().optional(),
  admissionReason: z
    .string()
    .min(1, { message: "Admission reason is required." }),
});

type AdmitFormValues = z.infer<typeof admitFormSchema>;

interface ERPatientAdmitModalProperties {
  isOpen: boolean;
  onClose: () => void;
  visitData?: {
    id: string;
    patientName: string;
    chiefComplaint: string;
  };
  onSuccess?: () => void;
}

// FIX: Define interface for expected API error response
interface ApiErrorResponse {
  error: string;
}

// FIX: Define interface for expected admission success response
interface AdmissionSuccessResponse {
  id: string; // Assuming the API returns the new admission ID
  // Add other properties returned by the API on success
}

export default function ERPatientAdmitModal({
  isOpen,
  onClose,
  visitData,
  onSuccess,
}: ERPatientAdmitModalProperties) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast(); // FIX: Use the hook

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
  useEffect(() => {
    // FIX: Changed useState to useEffect
    if (visitData) {
      form.reset({
        visitId: visitData.id,
        patientName: visitData.patientName,
        admittingDoctorId: "", // Keep doctor selection empty
        admissionNotes: "",
        wardType: "",
        bedPreference: "",
        admissionReason: visitData.chiefComplaint || "",
      });
    }
  }, [visitData, form]); // FIX: Added dependencies

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
          bed_preference: data.bedPreference || undefined,
          admission_reason: data.admissionReason,
          admission_notes: data.admissionNotes || undefined,
          source: "ER",
        }),
      });

      // Try parsing JSON regardless of status for error messages
      let admissionResponseData: unknown;
      try {
        admissionResponseData = await admissionResponse.json();
      } catch {
        if (!admissionResponse.ok) {
          throw new Error(
            `HTTP error ${admissionResponse.status}: Failed to create admission. Invalid response from server.`
          );
        }
        admissionResponseData = {}; // OK but no JSON body
      }

      if (!admissionResponse.ok) {
        // FIX: Cast errorData and access error message safely
        const errorData = admissionResponseData as ApiErrorResponse;
        throw new Error(
          errorData?.error ||
            `HTTP error ${admissionResponse.status}: Failed to create admission`
        );
      }

      // FIX: Cast newAdmission to the success response type
      const newAdmission = admissionResponseData as AdmissionSuccessResponse;
      console.log("Admission created:", newAdmission);

      // Step 2: Update ER visit status
      // TODO: Implement API call: PUT /api/er/visits/[id]
      const visitResponse = await fetch(`/api/er/visits/${data.visitId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_status: "Admitted",
          disposition: "Admitted to IPD",
          // Optionally link admission_id if backend supports it
          // admission_id: newAdmission?.id
        }),
      });

      let visitResponseData: unknown;
      try {
        visitResponseData = await visitResponse.json();
      } catch {
        if (!visitResponse.ok) {
          throw new Error(
            `HTTP error ${visitResponse.status}: Failed to update ER visit status. Invalid response from server.`
          );
        }
        visitResponseData = {}; // OK but no JSON body
      }

      if (!visitResponse.ok) {
        // FIX: Cast errorData and access error message safely
        const errorData = visitResponseData as ApiErrorResponse;
        throw new Error(
          errorData?.error ||
            `HTTP error ${visitResponse.status}: Failed to update ER visit status`
        );
      }

      console.log("ER Visit status updated");

      toast({
        title: "Patient Admitted",
        description: `Admission ${newAdmission?.id || "(ID not returned)"} created. Awaiting bed assignment.`,
      });

      if (onSuccess) {
        onSuccess();
      }
      form.reset();
      onClose();
    } catch (error: unknown) {
      // FIX: Use unknown for catch block error
      console.error("Admission error:", error);
      toast({
        title: "Admission Failed",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Mock data for doctors and ward types - Replace with API fetches
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {" "}
      {/* Ensure close on overlay click */}
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Admit Patient to IPD</DialogTitle>
          <DialogDescription>
            Create an inpatient admission for ER patient:{" "}
            {visitData?.patientName || "N/A"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="patientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled
                        className="bg-gray-100 dark:bg-gray-700"
                      />
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
                      <Input
                        {...field}
                        disabled
                        className="bg-gray-100 dark:bg-gray-700"
                      />
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
                  {/* TODO: Replace mock data with API fetch for doctors */}
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Admitting Doctor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {doctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          {doctor.name}
                        </SelectItem>
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
                  <FormLabel>Requested Ward Type</FormLabel>
                  {/* TODO: Replace mock data with API fetch for ward types */}
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Ward Type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {wardTypes.map((ward) => (
                        <SelectItem key={ward.id} value={ward.id}>
                          {ward.name}
                        </SelectItem>
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
                    <Input
                      placeholder="e.g., Near window, ground floor"
                      {...field}
                      value={field.value ?? ""}
                    />
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
                  <FormLabel>Admission Reason / Diagnosis</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Primary reason for admission..."
                      className="resize-none"
                      {...field}
                      rows={3}
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
                      placeholder="Any additional notes for the admission team..."
                      className="resize-none"
                      {...field}
                      value={field.value ?? ""}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !form.formState.isValid}
              >
                {isLoading ? "Processing Admission..." : "Admit Patient"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
