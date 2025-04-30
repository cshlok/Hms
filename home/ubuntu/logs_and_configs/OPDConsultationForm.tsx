"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
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
  medications: z.array(z.object({
    name: z.string().min(1, { message: "Medication name is required" }),
    dosage: z.string().min(1, { message: "Dosage is required" }),
    frequency: z.string().min(1, { message: "Frequency is required" }),
    duration: z.string().min(1, { message: "Duration is required" }),
    instructions: z.string().optional(),
  })).optional(),
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

export default function OPDConsultationForm() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [canPrescribe, setCanPrescribe] = useState(false);
  const [canOrderTests, setCanOrderTests] = useState(false);
  
  // Initialize form
  const form = useForm<ConsultationFormValues>({
    resolver: zodResolver(consultationFormSchema),
    defaultValues: {
      patientId: "",
      chiefComplaint: "",
      presentIllness: "",
      vitalSigns: {
        temperature: "",
        pulse: "",
        respiratoryRate: "",
        bloodPressure: "",
        oxygenSaturation: "",
        weight: "",
        height: "",
      },
      diagnosis: "",
      treatmentPlan: "",
      medications: [{ name: "", dosage: "", frequency: "", duration: "", instructions: "" }],
      labTests: [],
      followUpDate: "",
      notes: "",
    },
  });
  
  useEffect(() => {
    // Check permissions via API route
    const checkPermissions = async () => {
      setLoadingPermissions(true);
      try {
        const [prescribeRes, orderRes] = await Promise.all([
          fetch("/api/auth/check-permission?permission=medication:prescribe"),
          fetch("/api/auth/check-permission?permission=lab:order"),
        ]);

        if (!prescribeRes.ok || !orderRes.ok) {
          console.error("Failed to fetch permissions");
          setCanPrescribe(false);
          setCanOrderTests(false);
          return;
        }

        // FIX: Type the response data
        const prescribeData: PermissionApiResponse = await prescribeRes.json();
        const orderData: PermissionApiResponse = await orderRes.json();

        setCanPrescribe(prescribeData.hasPermission || false);
        setCanOrderTests(orderData.hasPermission || false);
      } catch (error) {
        console.error("Error fetching permissions:", error);
        setCanPrescribe(false);
        setCanOrderTests(false);
      } finally {
        setLoadingPermissions(false);
      }
    };
    
    checkPermissions();
    
    // Fetch patients in queue
    const fetchPatientsInQueue = async () => {
      try {
        const response = await fetch("/api/opd/queue?status=in-progress");
        
        if (!response.ok) {
          let errorMsg = "Failed to fetch patients in queue";
          try {
            const errorData: ApiErrorResponse = await response.json();
            errorMsg = errorData.error || errorMsg;
          } catch (jsonError) { /* Ignore */ }
          throw new Error(errorMsg);
        }
        
        // FIX: Type the response data and ensure it's an array
        const data: PatientsQueueApiResponse = await response.json();
        if (Array.isArray(data)) {
          setPatients(data);
        } else {
          console.warn("Unexpected API response format for patient queue:", data);
          setPatients([]);
        }
      } catch (err: unknown) { // FIX: Use unknown
        const messageText = err instanceof Error ? err.message : "An unknown error occurred";
        console.error("Error fetching patients:", err);
        // TODO: Show error notification to user
      }
    };
    
    fetchPatientsInQueue();
  }, []);
  
  // Handle patient selection
  const handlePatientChange = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    setSelectedPatient(patient || null);
    
    // Reset form when patient changes
    form.reset({
      ...form.getValues(),
      patientId,
    });
    
    // Fetch patient history if available
    if (patientId) {
      fetchPatientHistory(patientId);
    }
  };
  
  // Fetch patient history
  const fetchPatientHistory = async (patientId: string) => {
    try {
      const response = await fetch(`/api/patients/${patientId}/history`);
      
      if (!response.ok) {
        let errorMsg = "Failed to fetch patient history";
        try {
          const errorData: ApiErrorResponse = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (jsonError) { /* Ignore */ }
        throw new Error(errorMsg);
      }
      
      // TODO: Process patient history data if needed
      // const historyData = await response.json();
      // console.log("Patient History:", historyData);

    } catch (err: unknown) { // FIX: Use unknown
      const messageText = err instanceof Error ? err.message : "An unknown error occurred";
      console.error("Error fetching patient history:", err);
      // TODO: Show error notification to user
    }
  };
  
  // Add medication field
  const addMedication = () => {
    const currentMedications = form.getValues().medications || [];
    form.setValue("medications", [
      ...currentMedications,
      { name: "", dosage: "", frequency: "", duration: "", instructions: "" }
    ]);
  };
  
  // Remove medication field
  const removeMedication = (index: number) => {
    const currentMedications = form.getValues().medications || [];
    form.setValue("medications", currentMedications.filter((_, i) => i !== index));
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
        let errorMsg = "Failed to save consultation";
        try {
          const errorData: ApiErrorResponse = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (jsonError) { /* Ignore */ }
        throw new Error(errorMsg);
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
    } catch (err: unknown) { // FIX: Use unknown
      const messageText = err instanceof Error ? err.message : "An unknown error occurred";
      console.error("Error saving consultation:", err);
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
        <Select onValueChange={handlePatientChange} value={form.getValues().patientId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a patient" />
          </SelectTrigger>
          <SelectContent>
            {patients.map((patient) => (
              <SelectItem key={patient.id} value={patient.id}>
                {patient.tokenNumber} - {patient.name} ({patient.age}/{patient.gender})
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
                <TabsTrigger value="medications" disabled={!canPrescribe}>Medications</TabsTrigger>
                <TabsTrigger value="labTests" disabled={!canOrderTests}>Lab Tests</TabsTrigger>
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
                      <div key={index} className="grid gap-4 mb-6 p-4 border rounded-md">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">Medication {index + 1}</h4>
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
                        
                        <div className="grid gr
(Content truncated due to size limit. Use line ranges to read in chunks)