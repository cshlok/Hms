// src/components/er/ERLabOrderModal.tsx
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
  // FIX: Import FormDescription
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
// FIX: Remove direct import of toast, use useToast hook instead
// import { toast } from "@/components/ui/use-toast";
import { useToast } from "@/components/ui/use-toast"; // Keep this

// --- INTERFACES ---

// Define the schema for the lab order form using Zod
const labOrderFormSchema = z.object({
  visitId: z.string().min(1, { message: "Visit ID is required." }),
  patientName: z.string().min(1, { message: "Patient name is required." }),
  orderingDoctorId: z
    .string()
    .min(1, { message: "Ordering doctor is required." }),
  selectedTests: z
    .array(z.string())
    .min(1, { message: "Select at least one test." }),
  priority: z.literal("STAT"), // Default to STAT for ER
  clinicalNotes: z.string().optional(),
});

type LabOrderFormValues = z.infer<typeof labOrderFormSchema>;

interface ERLabOrderModalProperties {
  isOpen: boolean;
  onClose: () => void;
  visitData?: {
    id: string;
    patientName: string;
    assignedDoctorId?: string; // Pass assigned doctor if available
  };
  onSuccess?: () => void;
}

// FIX: Define interface for expected API error response
interface ApiErrorResponse {
  error: string;
}

// FIX: Define interface for expected API success response
interface LabOrderSuccessResponse {
  id: string; // Assuming the API returns the new order ID
  // Add other properties returned by the API on success
}

// Mock data for available lab tests - replace with API fetch
const availableTests = [
  { id: "cbc", name: "Complete Blood Count (CBC)" },
  { id: "bmp", name: "Basic Metabolic Panel (BMP)" },
  { id: "cmp", name: "Comprehensive Metabolic Panel (CMP)" },
  { id: "troponin", name: "Troponin I/T" },
  { id: "lactate", name: "Lactate" },
  { id: "blood_gas", name: "Blood Gas (ABG/VBG)" },
  { id: "coag", name: "Coagulation Panel (PT/INR, PTT)" },
  { id: "ua", name: "Urinalysis (UA)" },
  { id: "blood_culture", name: "Blood Culture" },
];

export default function ERLabOrderModal({
  isOpen,
  onClose,
  visitData,
  onSuccess,
}: ERLabOrderModalProperties) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast(); // Use the hook to get the toast function

  const form = useForm<LabOrderFormValues>({
    resolver: zodResolver(labOrderFormSchema),
    defaultValues: {
      visitId: visitData?.id || "",
      patientName: visitData?.patientName || "",
      orderingDoctorId: visitData?.assignedDoctorId || "", // Pre-fill if available
      selectedTests: [],
      priority: "STAT",
      clinicalNotes: "",
    },
  });

  // Update form when visitData changes
  useEffect(() => {
    if (visitData) {
      form.reset({
        visitId: visitData.id,
        patientName: visitData.patientName,
        orderingDoctorId: visitData.assignedDoctorId || "",
        selectedTests: [], // Reset tests when visit changes
        priority: "STAT",
        clinicalNotes: "",
      });
    }
  }, [visitData, form]);

  async function onSubmit(data: LabOrderFormValues) {
    setIsLoading(true);
    console.log("Submitting Lab Order Data:", data);

    try {
      // TODO: Implement API call: POST /api/lab/orders
      const response = await fetch("/api/lab/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Ensure payload matches backend expectations
          patient_id: visitData?.id, // Assuming visit ID links to patient
          visit_id: data.visitId,
          ordering_doctor_id: data.orderingDoctorId,
          test_ids: data.selectedTests,
          priority: data.priority,
          clinical_notes: data.clinicalNotes || undefined,
          source: "ER", // Indicate order source
        }),
      });

      // Try parsing JSON regardless of status for error messages
      let responseData: unknown;
      try {
        responseData = await response.json();
      } catch {
        // Handle non-JSON responses or empty responses
        if (!response.ok) {
          throw new Error(
            `HTTP error ${response.status}: Failed to create lab order. Invalid response from server.`
          );
        }
        // If response is OK but not JSON (e.g., 204 No Content), treat as success
        responseData = {};
      }

      if (!response.ok) {
        // FIX: Cast errorData and access error message safely
        const errorData = responseData as ApiErrorResponse;
        throw new Error(
          errorData?.error ||
            `HTTP error ${response.status}: Failed to create lab order`
        );
      }

      // FIX: Cast newOrder to the success response type
      const newOrder = responseData as LabOrderSuccessResponse;

      // TODO: Update ER visit status/indicators (e.g., labPending = true)

      toast({
        title: "Lab Order Submitted",
        // FIX: Safely access newOrder.id
        description: `STAT order ${newOrder?.id || "(ID not returned)"} placed successfully.`,
      });

      if (onSuccess) {
        onSuccess(); // Trigger potential refresh of tracking board
      }
      form.reset({
        ...form.getValues(), // Keep visit/patient info
        selectedTests: [], // Clear selected tests
        clinicalNotes: "",
      });
      onClose();
    } catch (error: unknown) {
      // Use unknown for catch block error
      console.error("Lab order error:", error);
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {" "}
      {/* Ensure close on overlay click */}
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Place STAT Lab Order</DialogTitle>
          <DialogDescription>
            Patient: {visitData?.patientName || "N/A"} (Visit ID:{" "}
            {visitData?.id || "N/A"})
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Hidden fields for context */}
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

            {/* Ordering Doctor - Consider replacing with a Select dropdown fetching doctors */}
            <FormField
              control={form.control}
              name="orderingDoctorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ordering Doctor ID</FormLabel>
                  <FormControl>
                    {/* TODO: Replace with a Select component fetching doctors */}
                    <Input
                      placeholder="Enter Ordering Doctor ID (e.g., from logged in user)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Test Selection Checkboxes */}
            <FormField
              control={form.control}
              name="selectedTests"
              render={() => (
                <FormItem>
                  <div className="mb-2">
                    <FormLabel className="text-base">Available Tests</FormLabel>
                    {/* FIX: Use FormDescription component */}
                    <FormDescription>
                      Select one or more STAT tests to order.
                    </FormDescription>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 max-h-60 overflow-y-auto p-3 border rounded-md">
                    {availableTests.map((item) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name="selectedTests"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={item.id}
                              className="flex flex-row items-center space-x-3 space-y-0 py-1"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(item.id)}
                                  onCheckedChange={(checked) => {
                                    const currentValue = field.value || [];
                                    return checked
                                      ? field.onChange([
                                          ...currentValue,
                                          item.id,
                                        ])
                                      : field.onChange(
                                          currentValue.filter(
                                            (value) => value !== item.id
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal text-sm cursor-pointer">
                                {item.name}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Clinical Notes */}
            <FormField
              control={form.control}
              name="clinicalNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clinical Notes (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Rule out MI, Check electrolytes"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  {/* FIX: Use FormDescription component (Optional) */}
                  {/* <FormDescription>
                    Brief reason for order or relevant clinical info.
                  </FormDescription> */}
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
                {isLoading ? "Placing Order..." : "Place STAT Order"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
