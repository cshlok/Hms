// src/components/er/ERRegistrationModal.tsx
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

// Define the schema for the registration form using Zod
const registrationFormSchema = z.object({
  // Option 1: Search existing patient by MRN or Name/DOB
  searchMrn: z.string().optional(),
  // Option 2: Register new patient
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  dob: z.string().optional(), // Consider using a date picker
  sex: z.enum(["Male", "Female", "Other"]).optional(),
  // Required for ER Visit
  chiefComplaint: z.string().min(1, { message: "Chief complaint is required." }),
  arrivalMode: z.enum(["Walk-in", "Ambulance", "Wheelchair", "Other"]).optional(),
}).refine(data => data.searchMrn || (data.firstName && data.lastName && data.dob && data.sex), {
    message: "Either search for an existing patient (MRN) or provide full details for a new patient (First Name, Last Name, DOB, Sex).",
    path: ["searchMrn"], // Attach error to a relevant field
});

type RegistrationFormValues = z.infer<typeof registrationFormSchema>;

// FIX: Define type for API error response
interface ApiErrorResponse {
  error?: string;
}

// FIX: Define type for the ER Visit API response
interface ERVisitResponse {
  id: string; // Assuming visit ID is a string
  patient_id: string;
  visit_number: string;
  // Add other relevant fields returned by the API
}

// FIX: Define type for the Patient API response (if creating new)
interface PatientResponse {
  id: string; // Assuming patient ID is a string
  // Add other relevant fields
}

// FIX: Define type for the found patient data
interface FoundPatient {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  sex: "Male" | "Female" | "Other";
}

interface ERRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  // FIX: Use defined type for onSuccess callback
  onSuccess?: (newVisit: ERVisitResponse) => void; 
}

export default function ERRegistrationModal({ isOpen, onClose, onSuccess }: ERRegistrationModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  // FIX: Use defined type for foundPatient state
  const [foundPatient, setFoundPatient] = useState<FoundPatient | null>(null);
  const { toast } = useToast();

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationFormSchema),
    defaultValues: {
      searchMrn: "",
      firstName: "",
      lastName: "",
      dob: "",
      sex: undefined,
      chiefComplaint: "",
      arrivalMode: "Walk-in",
    },
  });

  const handleSearchPatient = async () => {
    const mrn = form.getValues("searchMrn");
    if (!mrn) {
        toast({ title: "Search Error", description: "Please enter an MRN to search.", variant: "destructive" });
        return;
    }
    setIsSearching(true);
    setFoundPatient(null);
    console.log(`Searching for patient with MRN: ${mrn}`);
    // TODO: Implement API call: GET /api/patients?mrn=[mrn]
    try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 700));
        // Mock finding a patient
        if (mrn === "MRN001") { 
            // FIX: Use defined type for patientData
            const patientData: FoundPatient = { id: "patient_123", firstName: "John", lastName: "Doe", dob: "1959-01-15", sex: "Male" };
            setFoundPatient(patientData);
            form.setValue("firstName", patientData.firstName);
            form.setValue("lastName", patientData.lastName);
            form.setValue("dob", patientData.dob);
            form.setValue("sex", patientData.sex);
            toast({ title: "Patient Found", description: `Found ${patientData.firstName} ${patientData.lastName}.` });
        } else {
            toast({ title: "Patient Not Found", description: `No patient found with MRN ${mrn}. Please enter details manually.`, variant: "destructive" });
        }
    } catch (error) {
        toast({ title: "Search Failed", description: "Could not search for patient.", variant: "destructive" });
    } finally {
        setIsSearching(false);
    }
  };

  async function onSubmit(data: RegistrationFormValues) {
    setIsLoading(true);
    console.log("Submitting Registration Data:", data);

    let patientId = foundPatient?.id;

    try {
      // Step 1: Create/Verify Patient
      if (!patientId) {
        // Create new patient if details are provided
        if (data.firstName && data.lastName && data.dob && data.sex) {
          console.log("Creating new patient...");
          // TODO: Implement API call: POST /api/patients
          // const patientResponse = await fetch("/api/patients", { ... });
          // if (!patientResponse.ok) { ... handle error ... }
          // const newPatient: PatientResponse = await patientResponse.json();
          // patientId = newPatient.id;
          
          // Mock new patient creation
          await new Promise(resolve => setTimeout(resolve, 500));
          patientId = `new_patient_${Date.now()}`;
          console.log(`Mock patient created with ID: ${patientId}`);
        } else {
          // This case should ideally be prevented by the form validation (refine)
          throw new Error("Patient details incomplete for new registration.");
        }
      }

      // Step 2: Create ER Visit
      console.log(`Creating ER visit for patient ID: ${patientId}`);
      // TODO: Implement API call: POST /api/er/visits
      const visitResponse = await fetch("/api/er/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          chief_complaint: data.chiefComplaint,
          arrival_mode: data.arrivalMode || "Walk-in",
          initial_location: "Waiting Room", // Or Triage if direct
          initial_status: "Triage",
        }),
      });

      if (!visitResponse.ok) {
        let errorMsg = "Failed to create ER visit";
        try {
            // FIX: Use defined type for errorData
            const errorData: ApiErrorResponse = await visitResponse.json();
            errorMsg = errorData.error || errorMsg;
        } catch (jsonError) {
            // Ignore if response is not JSON
        }
        throw new Error(errorMsg);
      }

      // FIX: Use defined type for newVisit
      const newVisit: ERVisitResponse = await visitResponse.json();
      toast({
        title: "ER Visit Registered",
        description: `Visit ${newVisit.visit_number || newVisit.id} created for patient ${patientId}.`,
      });
      
      if (onSuccess) {
        onSuccess(newVisit);
      }
      form.reset();
      setFoundPatient(null);
      onClose(); // Close modal on success

    } catch (error: unknown) { // FIX: Use unknown for catch block
      console.error("Registration submission error:", error);
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      toast({
        title: "Registration Failed",
        description: message,
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
          <DialogTitle>Register New ER Patient Visit</DialogTitle>
          <DialogDescription>
            Search for an existing patient by MRN or enter details for a new patient.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <div className="space-y-2">
                <FormLabel>Existing Patient Search</FormLabel>
                <div className="flex space-x-2">
                    <FormField
                      control={form.control}
                      name="searchMrn"
                      render={({ field }) => (
                        <FormItem className="flex-grow">
                          <FormControl>
                            <Input placeholder="Enter MRN to search..." {...field} disabled={!!foundPatient} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="button" onClick={handleSearchPatient} disabled={isSearching || !!foundPatient}>
                        {isSearching ? "Searching..." : "Search"}
                    </Button>
                </div>
            </div>

            <div className="text-center text-sm text-muted-foreground">OR Enter New Patient Details Below</div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., John" {...field} disabled={!!foundPatient} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Doe" {...field} disabled={!!foundPatient} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dob"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      {/* TODO: Replace with a Date Picker component */}
                      <Input type="date" placeholder="YYYY-MM-DD" {...field} disabled={!!foundPatient} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sex</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!!foundPatient}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Sex" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="chiefComplaint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chief Complaint</FormLabel>
                  <FormControl>
                    <Input placeholder="Reason for visit..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="arrivalMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Arrival Mode</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Arrival Mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Walk-in">Walk-in</SelectItem>
                      <SelectItem value="Ambulance">Ambulance</SelectItem>
                      <SelectItem value="Wheelchair">Wheelchair</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Registering..." : "Register Visit"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

