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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/use-toast";

// Define the schema for the lab order form using Zod
const labOrderFormSchema = z.object({
  visitId: z.string().min(1, { message: "Visit ID is required." }),
  patientName: z.string().min(1, { message: "Patient name is required." }),
  orderingDoctorId: z.string().min(1, { message: "Ordering doctor is required." }),
  selectedTests: z.array(z.string()).min(1, { message: "Select at least one test." }),
  priority: z.literal("STAT").default("STAT"), // Default to STAT for ER
  clinicalNotes: z.string().optional(),
});

type LabOrderFormValues = z.infer<typeof labOrderFormSchema>;

interface ERLabOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitData?: {
    id: string;
    patientName: string;
    assignedDoctorId?: string; // Pass assigned doctor if available
  };
  onSuccess?: () => void;
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
  onSuccess 
}: ERLabOrderModalProps) {
  const [isLoading, setIsLoading] = useState(false);

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
      form.setValue("visitId", visitData.id);
      form.setValue("patientName", visitData.patientName);
      form.setValue("orderingDoctorId", visitData.assignedDoctorId || "");
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
          patient_id: visitData?.id, // Assuming visit ID links to patient in backend
          visit_id: data.visitId,
          ordering_doctor_id: data.orderingDoctorId,
          test_ids: data.selectedTests,
          priority: data.priority,
          clinical_notes: data.clinicalNotes || null,
          source: "ER", // Indicate order source
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create lab order");
      }

      const newOrder = await response.json();

      // TODO: Update ER visit status/indicators (e.g., labPending = true)
      // This might require another API call or be handled by backend logic

      toast({
        title: "Lab Order Submitted",
        description: `STAT order ${newOrder.id} placed successfully.`,
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

    } catch (error: any) {
      console.error("Lab order error:", error);
      toast({
        title: "Order Failed",
        description: error.message || "An unexpected error occurred.",
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
          <DialogTitle>Place STAT Lab Order</DialogTitle>
          <DialogDescription>
            Select tests for patient: {visitData?.patientName || "N/A"} (Visit: {visitData?.id || "N/A"})
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
              name="selectedTests"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Available Tests</FormLabel>
                    <FormDescription>
                      Select one or more STAT tests to order.
                    </FormDescription>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 border rounded-md">
                    {availableTests.map((item) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name="selectedTests"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={item.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(item.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...(field.value || []), item.id])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== item.id
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
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

            <FormField
              control={form.control}
              name="clinicalNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clinical Notes (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Rule out MI, Check electrolytes" {...field} />
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
                {isLoading ? "Placing Order..." : "Place STAT Order"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
