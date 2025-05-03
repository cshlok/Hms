// src/components/er/ERTriageForm.tsx
"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
import { useToast } from "@/components/ui/use-toast";

// Define the schema for the triage form using Zod
const triageFormSchema = z.object({
  visitId: z.string().min(1, { message: "Visit ID is required." }), // Need a way to select/link the visit
  triageNurseId: z.string().min(1, { message: "Triage Nurse ID is required." }), // Should ideally come from logged-in user context
  esiLevel: z.coerce
    .number()
    .min(1)
    .max(5, { message: "ESI Level must be between 1 and 5." }),
  hr: z.coerce.number().optional(),
  bpSystolic: z.coerce.number().optional(),
  bpDiastolic: z.coerce.number().optional(),
  rr: z.coerce.number().optional(),
  temp: z.coerce.number().optional(),
  spo2: z.coerce.number().optional(),
  assessmentNotes: z.string().optional(),
});

type TriageFormValues = z.infer<typeof triageFormSchema>;

// FIX: Define type for API error response
interface ApiErrorResponse {
  error?: string;
}

// FIX: Define type for the Triage API success response
interface TriageResponse {
  visit_id: string;
  esi_level: number;
  // Add other relevant fields returned by the API
}

// Mock user ID - replace with actual logged-in user context
const MOCK_NURSE_ID = "nurse_456";

export default function ERTriageForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<TriageFormValues>({
    resolver: zodResolver(triageFormSchema),
    defaultValues: {
      visitId: "", // Needs a mechanism to set this (e.g., from tracking board selection)
      triageNurseId: MOCK_NURSE_ID,
      esiLevel: undefined,
      hr: undefined,
      bpSystolic: undefined,
      bpDiastolic: undefined,
      rr: undefined,
      temp: undefined,
      spo2: undefined,
      assessmentNotes: "",
    },
  });

  async function onSubmit(data: TriageFormValues) {
    setIsLoading(true);
    console.log("Submitting Triage Data:", data);

    const vitalSigns = {
      HR: data.hr,
      BP:
        data.bpSystolic && data.bpDiastolic
          ? `${data.bpSystolic}/${data.bpDiastolic}`
          : undefined,
      RR: data.rr,
      Temp: data.temp,
      SpO2: data.spo2,
    };

    // Filter out undefined vital signs
    const filteredVitalSigns = Object.fromEntries(
      Object.entries(vitalSigns)
        .filter(
          ([, value]) => value !== undefined && value !== undefined && value !== ""
        )
        .map(([key, value]) => [key, value])
    );

    try {
      // Replace with actual API call: POST /api/er/visits/[id]/triage
      const response = await fetch(`/api/er/visits/${data.visitId}/triage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          triage_nurse_id: data.triageNurseId,
          esi_level: data.esiLevel,
          vital_signs: filteredVitalSigns,
          assessment_notes: data.assessmentNotes,
        }),
      });

      if (!response.ok) {
        let errorMessage = "Failed to submit triage assessment";
        try {
          // FIX: Use defined type for errorData
          const errorData: ApiErrorResponse = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Ignore if response is not JSON
        }
        throw new Error(errorMessage);
      }

      // FIX: Use defined type for result
      const result: TriageResponse = await response.json();
      toast({
        title: "Triage Assessment Submitted",
        description: `ESI Level ${result.esi_level} assigned for visit ${result.visit_id}.`,
      });
      form.reset(); // Reset form after successful submission
      // TODO: Potentially trigger a refresh of the tracking board
    } catch (error: unknown) {
      // FIX: Use unknown for catch block
      console.error("Triage submission error:", error);
      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";
      toast({
        title: "Submission Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* TODO: Add a way to select the patient/visit ID, e.g., a search input or linking from tracking board */}
        <FormField
          control={form.control}
          name="visitId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Visit ID</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter Visit ID (e.g., visit_4)"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Select the patient visit to triage.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="esiLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ESI Level</FormLabel>
              {/* FIX: Ensure value passed to Select is string or undefined */}
              <Select
                onValueChange={field.onChange}
                value={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select ESI Level (1-5)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <SelectItem key={level} value={level.toString()}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="hr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Heart Rate (bpm)</FormLabel>
                <FormControl>
                  {/* FIX: Pass value as string or number, ensure onChange handles conversion if needed */}
                  <Input
                    type="number"
                    placeholder="e.g., 72"
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
            name="bpSystolic"
            render={({ field }) => (
              <FormItem>
                <FormLabel>BP Systolic (mmHg)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g., 120"
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
            name="bpDiastolic"
            render={({ field }) => (
              <FormItem>
                <FormLabel>BP Diastolic (mmHg)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g., 80"
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
            name="rr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Resp Rate (br/min)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g., 16"
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
            name="temp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Temperature (°C)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="e.g., 36.6"
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
            name="spo2"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SpO2 (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g., 98"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="assessmentNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assessment Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter triage assessment notes..."
                  className="resize-none"
                  {...field}
                  value={field.value ?? ""} // Ensure value is not undefined
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Submitting..." : "Submit Triage Assessment"}
        </Button>
      </form>
    </Form>
  );
}
