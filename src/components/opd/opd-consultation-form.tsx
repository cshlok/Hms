"use client";

import React, { useState, useEffect } from "react"; // Added useState, useEffect
import { useRouter } from 'next/navigation'; // Added useRouter
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
import { zodResolver } from "@hookform/resolvers/zod"; // Uncommented
import { useForm } from "react-hook-form"; // Uncommented
import * as z from "zod"; // Uncommented
import { useToast } from "@/hooks/use-toast"; // Added useToast for notifications

// Define the form schema
const consultationFormSchema = z.object({ // Uncommented
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
  }).optional(), // Made optional to avoid issues if not filled initially
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
  labTests: z.array(z.string()).optional(), // Assuming lab tests are selected by ID
  followUpDate: z.string().optional(),
  notes: z.string().optional(),
});

type ConsultationFormValues = z.infer<typeof consultationFormSchema>; // Uncommented

// Define necessary interfaces based on usage
interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  tokenNumber: number;
  // Add other relevant patient fields if needed
}

// interface PermissionApiResponse {
//   hasPermission?: boolean;
//   error?: string;
// }

// Assuming the API returns an array directly, adjust if it returns { results: Patient[] }
// type PatientsQueueApiResponse = Patient[];

interface ConsultationApiResponse {
  consultationId: string; // Assuming the API returns the ID of the created consultation
  error?: string;
}

interface ApiErrorResponse {
  error?: string;
}

// Mock permission check function (replace with actual API call)
const checkPermission = async (permission: string): Promise<boolean> => {
  console.log(`Checking permission: ${permission}`);
  // Replace with actual API call to /api/session/check-permission
  // Example: const response = await fetch(`/api/session/check-permission?permission=${permission}`);
  // const data: PermissionApiResponse = await response.json();
  // return data.hasPermission ?? false;
  await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay
  // For now, grant all permissions for testing
  return true;
};

// Mock fetch patients function (replace with actual API call)
const fetchPatientsQueue = async (): Promise<Patient[]> => {
  console.log("Fetching patients queue...");
  // Replace with actual API call to /api/opd/queue or similar
  // Example: const response = await fetch('/api/opd/queue');
  // const data: PatientsQueueApiResponse = await response.json();
  // return data;
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  // Return mock data for testing
  return [
    { id: "pat1", name: "John Doe", age: 45, gender: "Male", tokenNumber: 101 },
    { id: "pat2", name: "Jane Smith", age: 32, gender: "Female", tokenNumber: 102 },
  ];
};

export default function OPDConsultationForm() {
  const router = useRouter(); // Initialize router
  const { toast } = useToast(); // Initialize toast

  // State variables
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingPermissions, setLoadingPermissions] = useState<boolean>(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [canPrescribe, setCanPrescribe] = useState<boolean>(false);
  const [canOrderTests, setCanOrderTests] = useState<boolean>(false);

  // Initialize the form
  const form = useForm<ConsultationFormValues>({
    resolver: zodResolver(consultationFormSchema),
    defaultValues: {
      patientId: "",
      chiefComplaint: "",
      presentIllness: "",
      vitalSigns: {},
      diagnosis: "",
      treatmentPlan: "",
      medications: [],
      labTests: [],
      followUpDate: "",
      notes: "",
    },
  });

  // Fetch permissions and patient queue on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoadingPermissions(true);
      try {
        const [prescribePerm, orderTestsPerm, patientsData] = await Promise.all([
          checkPermission("opd.prescribe"),
          checkPermission("opd.order_tests"),
          fetchPatientsQueue(),
        ]);
        setCanPrescribe(prescribePerm);
        setCanOrderTests(orderTestsPerm);
        setPatients(patientsData);
      } catch (error) {
        console.error("Error fetching initial data:", error);
        toast({ title: "Error", description: "Failed to load initial data.", variant: "destructive" });
      } finally {
        setLoadingPermissions(false);
      }
    };
    fetchData();
  }, [toast]); // Added toast dependency

  // Handle patient selection change
  const handlePatientChange = (patientId: string) => {
    const patient = patients.find((p) => p.id === patientId) || null;
    setSelectedPatient(patient);
    form.setValue("patientId", patientId); // Update form value
    // Reset other fields when patient changes, or fetch history
    form.reset({
        ...form.getValues(), // Keep existing values if needed, or reset specific fields
        patientId: patientId, // Ensure patientId is set
        chiefComplaint: "", // Example reset
        // ... reset other fields
    });
    console.log("Selected Patient:", patient);
    // Optionally fetch patient history here
    // if (patient) fetchPatientHistory(patient.id);
  };

  // Add medication field
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
    console.log("Submitting Consultation Data:", data);

    try {
      const response = await fetch("/api/opd-visits", { // Updated API endpoint based on file structure
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

      const result: ConsultationApiResponse = await response.json(); // Assuming API returns { consultationId: string }

      toast({ title: "Success", description: "Consultation saved successfully." });

      // Redirect to consultation details or reset form
      if (result.consultationId) {
        // Assuming the API returns the visit ID as consultationId
        router.push(`/dashboard/opd-visits/${result.consultationId}`); // Adjusted route
      } else {
        form.reset();
        setSelectedPatient(null); // Clear selected patient
      }
    } catch (error: unknown) {
      const messageText =
        error instanceof Error ? error.message : "An unknown error occurred";
      console.error("Error saving consultation:", error);
      toast({ title: "Error", description: messageText, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (loadingPermissions) {
    return <div className="flex justify-center p-4">Loading permissions...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <Select
          onValueChange={handlePatientChange}
          value={form.watch("patientId")} // Use watch to reactively update Select value
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a patient from the queue" />
          </SelectTrigger>
          <SelectContent>
            {patients.length === 0 && !loadingPermissions ? (
                <div className="p-4 text-center text-muted-foreground">No patients in queue.</div>
            ) : (
                patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.tokenNumber} - {patient.name} ({patient.age}/
                    {patient.gender})
                  </SelectItem>
                ))
            )}
          </SelectContent>
        </Select>
        {/* Display form validation error for patientId if needed */}
        {form.formState.errors.patientId && (
            <p className="text-sm font-medium text-destructive mt-2">{form.formState.errors.patientId.message}</p>
        )}
      </div>

      {selectedPatient && (
        <Form {...form}>
          {/* Added key to reset form state when patient changes */}
          <form key={selectedPatient.id} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

              {/* Consultation Tab */}
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
                              <Textarea {...field} placeholder="Enter chief complaint" />
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
                              <Textarea {...field} placeholder="Enter history of present illness" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Vital Signs Section (Example) */}
                      <h3 className="font-medium mt-4">Vital Signs</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="vitalSigns.temperature"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Temperature (°C)</FormLabel>
                              <FormControl>
                                <Input {...field} type="text" placeholder="e.g., 37.0" />
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
                                <Input {...field} type="text" placeholder="e.g., 72" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {/* Add other vital signs fields similarly */}
                      </div>

                      <FormField
                        control={form.control}
                        name="diagnosis"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Diagnosis</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Enter diagnosis" />
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
                              <Textarea {...field} placeholder="Enter treatment plan" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Medications Tab */}
              <TabsContent value="medications">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    {(form.watch("medications") || []).map((_, index) => (
                      <div
                        key={index} // Consider using a more stable key if available
                        className="grid gap-4 p-4 border rounded-md relative"
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2 text-destructive hover:bg-destructive/10"
                          onClick={() => removeMedication(index)}
                        >
                          Remove
                        </Button>
                        <h4 className="font-medium">
                          Medication {index + 1}
                        </h4>

                        <FormField
                          control={form.control}
                          name={`medications.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Medication Name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g., Paracetamol 500mg" />
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
                                  <Input {...field} placeholder="e.g., 1 tablet" />
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
                                  <Input {...field} placeholder="e.g., TID" />
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
                                  <Input {...field} placeholder="e.g., 5 days" />
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
                                  <Input {...field} placeholder="e.g., After food" />
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

              {/* Lab Tests Tab */}
              <TabsContent value="labTests">
                <Card>
                  <CardContent className="pt-6">
                    {/* TODO: Implement Lab Test Selection UI */}
                    <p>Lab Test Ordering UI (Placeholder)</p>
                    {/* Example: Could use checkboxes or a multi-select component */}
                    {/* <FormField control={form.control} name="labTests" render={...} /> */}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Follow Up Tab */}
              <TabsContent value="followUp">
                <Card>
                  <CardContent className="pt-6 grid gap-4">
                    <FormField
                      control={form.control}
                      name="followUpDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Follow Up Date</FormLabel>
                          <FormControl>
                            {/* TODO: Replace with a Calendar/DatePicker component */}
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
                            <Textarea {...field} placeholder="Enter any additional notes" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end mt-6">
              <Button type="submit" disabled={loading || !selectedPatient}>
                {loading ? "Saving..." : "Save Consultation"}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}

