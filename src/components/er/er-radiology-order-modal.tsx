// src/components/er/ERRadiologyOrderModal.tsx
"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast"; // FIX: Import useToast hook

// Define the schema for the radiology order form using Zod
const radiologyOrderFormSchema = z.object({
  visitId: z.string().min(1, { message: "Visit ID is required." }),
  patientName: z.string().min(1, { message: "Patient name is required." }),
  orderingDoctorId: z
    .string()
    .min(1, { message: "Ordering doctor is required." }),
  procedureTypeId: z.string().min(1, { message: "Select a procedure type." }),
  priority: z.literal("STAT"), // Default to STAT for ER
  clinicalNotes: z.string().optional(),
});

type RadiologyOrderFormValues = z.infer<typeof radiologyOrderFormSchema>;

interface ERRadiologyOrderModalProperties {
  isOpen: boolean;
  onClose: () => void;
  visitData?: {
    id: string;
    patientName: string;
    assignedDoctorId?: string; // Pass assigned doctor if available
  };
  onSuccess?: () => void;
}

// Mock data for available radiology procedure types - replace with API fetch
const availableProcedureTypes = [
  { id: "proc_xray_chest", name: "X-Ray Chest (PA/Lat)" },
  { id: "proc_ct_head_wo", name: "CT Head w/o Contrast" },
  { id: "proc_us_abd", name: "Ultrasound Abdomen Complete" },
  { id: "proc_xray_kub", name: "X-Ray KUB" },
  { id: "proc_ct_abd_pel_w", name: "CT Abdomen/Pelvis w/ Contrast" },
  { id: "proc_mri_brain_wo", name: "MRI Brain w/o Contrast" },
];

export default function ERRadiologyOrderModal({
  isOpen,
  onClose,
  visitData,
  onSuccess,
}: ERRadiologyOrderModalProperties) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast(); // FIX: Get toast function from hook

  const form = useForm<RadiologyOrderFormValues>({
    resolver: zodResolver(radiologyOrderFormSchema),
    defaultValues: {
      visitId: visitData?.id || "",
      patientName: visitData?.patientName || "",
      orderingDoctorId: visitData?.assignedDoctorId || "", // Pre-fill if available
      procedureTypeId: "",
      priority: "STAT",
      clinicalNotes: "",
    },
  });

  // Update form when visitData changes
  useEffect(() => {
    if (visitData) {
      form.setValue("visitId", visitData.id);
      form.setValue("patientName", visitData.patientName);
      form.setValue("orderingDoctorId", visitData.assignedDoctorId || "");
    }
  }, [visitData, form]);

  async function onSubmit(data: RadiologyOrderFormValues) {
    setIsLoading(true);
    console.log("Submitting Radiology Order Data:", data);

    try {
      // TODO: Implement API call: POST /api/radiology/orders
      const response = await fetch("/api/radiology/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: visitData?.id, // Assuming visit ID links to patient in backend
          visit_id: data.visitId,
          ordering_doctor_id: data.orderingDoctorId,
          procedure_type_id: data.procedureTypeId,
          priority: data.priority,
          clinical_notes: data.clinicalNotes || undefined,
          order_source: "ER", // Indicate order source
        }),
      });

      if (!response.ok) {
        let errorMessage = "Failed to create radiology order";
        try {
          const errorData: { error?: string } = await response.json(); // FIX: Add type for errorData
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Ignore if response is not JSON
        }
        throw new Error(errorMessage);
      }

      const newOrder: { id: string } = await response.json(); // FIX: Add basic type for newOrder

      // TODO: Update ER visit status/indicators (e.g., radPending = true)
      // This might require another API call or be handled by backend logic

      toast({
        title: "Radiology Order Submitted",
        description: `STAT order ${newOrder.id} placed successfully.`,
      });

      if (onSuccess) {
        onSuccess(); // Trigger potential refresh of tracking board
      }
      form.reset({
        ...form.getValues(), // Keep visit/patient info
        procedureTypeId: "", // Clear selected procedure
        clinicalNotes: "",
      });
      onClose();
    } catch (error: unknown) {
      console.error("Radiology order error:", error);
      toast({
        title: "Order Failed",
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Place STAT Radiology Order</DialogTitle>
          <DialogDescription>
            Select procedure for patient: {visitData?.patientName || "N/A"}{" "}
            (Visit: {visitData?.id || "N/A"})
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Hidden or disabled fields for context */}
            <FormField
              control={form.control}
              name="visitId"
              render={({ field }) => <Input type="hidden" {...field} />}
            />
            <FormField
              control={form.control}
              name="patientName"
              render={({ field }) => <Input type="hidden" {...field} />}
            />
            {/* TODO: Need a way to select the ordering doctor, ideally from logged-in user or list */}
            <FormField
              control={form.control}
              name="orderingDoctorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ordering Doctor ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter Ordering Doctor ID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="procedureTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Procedure Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Procedure Type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableProcedureTypes.map((proc) => (
                        <SelectItem key={proc.id} value={proc.id}>
                          {proc.name}
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
              name="clinicalNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Clinical Notes / Reason for Exam (Optional)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., R/O Pneumonia, Trauma assessment"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Placing Order..." : "Place STAT Order"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
