"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Define the form schema
const consultationFormSchema = z.object({
  patientId: z.string().min(1, { message: "Please select a patient" }),
  chiefComplaint: z.string().min(3, { message: "Chief complaint is required" }),
  presentIllness: z.string().optional(),
  vitalSigns: z.object({
    temperature: z.string().optional(),
    pulse: z.string().optional(),
    respiratoryRate: z.string().optional(),
    bloodPressure: z.string().optional(),
    oxygenSaturation: z.string().optional(),
    weight: z.string().optional(),
    height: z.string().optional(),
  }),
  diagnosis: z.string().min(3, { message: "Diagnosis is required" }),
  treatmentPlan: z.string().min(3, { message: "Treatment plan is required" }),
  medications: z
    .array(
      z.object({
        name: z.string().min(1, { message: "Medication name is required" }),
        dosage: z.string().min(1, { message: "Dosage is required" }),
        frequency: z.string().min(1, { message: "Frequency is required" }),
        duration: z.string().min(1, { message: "Duration is required" }),
        instructions: z.string().optional(),
      })
    )
    .optional(),
  labTests: z.array(z.string()).optional(),
  followUpDate: z.string().optional(),
  notes: z.string().optional(),
});

type ConsultationFormValues = z.infer<typeof consultationFormSchema>;

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  tokenNumber: number;
}

// FIX: Define API response types
interface PermissionApiResponse {
  hasPermission?: boolean;
  error?: string;
}

// Assuming the API returns an array directly, adjust if it returns { results: Patient[] }
type PatientsQueueApiResponse = Patient[];

interface ConsultationApiResponse {
  consultationId: string; // Assuming the API returns the ID of the created consultation
  error?: string;
}

interface ApiErrorResponse {
  error?: string;
}

// Fetch patient history - moved outside component
const fetchPatientHistory = async (patientId: string) => {
  try {
    const response = await fetch(`/api/patients/${patientId}/history`);

    if (!response.ok) {
      let errorMessage = "Failed to fetch patient history";
      try {
        const errorData: ApiErrorResponse = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        /* Ignore */
      }
      throw new Error(errorMessage);
    }

    // TODO: Process patient history data if needed
    // const historyData = await response.json();
    // console.log("Patient History:", historyData);
  } catch (error_: unknown) {
    // FIX: Use unknown
    const messageText =
      error_ instanceof Error ? error_.message : "An unknown error occurred";
    console.error("Error fetching patient history:", error_);
    // TODO: Show error notification to user
  }
};

export default function OPDConsultationForm() {
  const addMedication = () => {
    const currentMedications = form.getValues().medications || [];
    form.setValue("medications", [
      ...currentMedications,
      { name: "", dosage: "", frequency: "", duration: "", instructions: "" },
    ]);
  };

  // Remove medication field
  const removeMedication = (index: number) => {
    const currentMedications = form.getValues().medications || [];
    form.setValue(
      "medications",
      currentMedications.filter((_, index_) => index_ !== index)
    );
  };

  // Form submission handler
  const onSubmit = async (data: ConsultationFormValues) => {
    setLoading(true);

    try {
      const response = await fetch("/api/opd/consultations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        let errorMessage = "Failed to save consultation";
        try {
          const errorData: ApiErrorResponse = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          /* Ignore */
        }
        throw new Error(errorMessage);
      }

      // FIX: Type the response data
      const result: ConsultationApiResponse = await response.json();

      // Redirect to consultation details or reset form
      if (result.consultationId) {
        router.push(`/opd/consultations/${result.consultationId}`);
      } else {
        // Handle case where ID might not be returned (though unlikely if successful)
        form.reset(); // Reset form as a fallback
        // TODO: Show success message
      }
    } catch (error: unknown) {
      // FIX: Use unknown
      const messageText =
        error instanceof Error ? error.message : "An unknown error occurred";
      console.error("Error saving consultation:", error);
      // TODO: Show error notification to user
    } finally {
      setLoading(false);
    }
  };

  if (loadingPermissions) {
    return <div className="flex justify-center p-4">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <Select
          onValueChange={handlePatientChange}
          value={form.getValues().patientId}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a patient" />
          </SelectTrigger>
          <SelectContent>
            {patients.map((patient) => (
              <SelectItem key={patient.id} value={patient.id}>
                {patient.tokenNumber} - {patient.name} ({patient.age}/
                {patient.gender})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedPatient && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Tabs defaultValue="consultation">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="consultation">Consultation</TabsTrigger>
                <TabsTrigger value="medications" disabled={!canPrescribe}>
                  Medications
                </TabsTrigger>
                <TabsTrigger value="labTests" disabled={!canOrderTests}>
                  Lab Tests
                </TabsTrigger>
                <TabsTrigger value="followUp">Follow Up</TabsTrigger>
              </TabsList>

              <TabsContent value="consultation">
                <Card>
                  <CardContent className="pt-6">
                    <div className="grid gap-4">
                      <FormField
                        control={form.control}
                        name="chiefComplaint"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Chief Complaint</FormLabel>
                            <FormControl>
                              <Textarea {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="presentIllness"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>History of Present Illness</FormLabel>
                            <FormControl>
                              <Textarea {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="vitalSigns.temperature"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Temperature (°C)</FormLabel>
                              <FormControl>
                                <Input {...field} type="text" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="vitalSigns.pulse"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Pulse (bpm)</FormLabel>
                              <FormControl>
                                <Input {...field} type="text" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      {/* Add other vital signs fields similarly */}

                      <FormField
                        control={form.control}
                        name="diagnosis"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Diagnosis</FormLabel>
                            <FormControl>
                              <Textarea {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="treatmentPlan"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Treatment Plan</FormLabel>
                            <FormControl>
                              <Textarea {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="medications">
                <Card>
                  <CardContent className="pt-6">
                    {form.getValues().medications?.map((_, index) => (
                      <div
                        key={index}
                        className="grid gap-4 mb-6 p-4 border rounded-md"
                      >
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">
                            Medication {index + 1}
                          </h4>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeMedication(index)}
                          >
                            Remove
                          </Button>
                        </div>

                        <FormField
                          control={form.control}
                          name={`medications.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Medication Name</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`medications.${index}.dosage`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Dosage</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`medications.${index}.frequency`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Frequency</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`medications.${index}.duration`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Duration</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`medications.${index}.instructions`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Instructions</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addMedication}
                    >
                      Add Medication
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="labTests">
                <Card>
                  <CardContent className="pt-6">
                    {/* TODO: Implement Lab Test Selection UI */}
                    <p>Lab Test Ordering UI (Placeholder)</p>
                    {/* Example: Checkbox group or multi-select */}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="followUp">
                <Card>
                  <CardContent className="pt-6">
                    <FormField
                      control={form.control}
                      name="followUpDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Follow Up Date</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Notes</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="mt-6 flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Consultation"}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}
