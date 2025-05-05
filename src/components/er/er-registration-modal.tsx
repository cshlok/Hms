// src/components/er/ERRegistrationModal.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { useToast } from "@/components/ui/use-toast";

// Define Zod schema for form validation
const registrationSchema = z
  .object({
    searchMrn: z.string().optional(), // MRN for searching existing patient
    firstName: z.string().min(1, "First name is required").optional(),
    lastName: z.string().min(1, "Last name is required").optional(),
    dob: z.string().optional(), // Consider using a date type if input is date picker
    sex: z.enum(["Male", "Female", "Other"]).optional(),
    chiefComplaint: z.string().min(1, "Chief complaint is required"),
    arrivalMode: z.string().optional(),
  })
  .refine(
    (data) =>
      !!data.searchMrn ||
      (!!data.firstName && !!data.lastName && !!data.dob && !!data.sex),
    {
      message:
        "Either search for an existing patient or provide full details for a new patient.",
      path: ["firstName"], // Attach error to a relevant field
    }
  );

type RegistrationFormValues = z.infer<typeof registrationSchema>;

// Define interfaces for API responses (adjust based on actual API)
interface PatientResponse {
  id: string;
  mrn: string;
  first_name: string;
  last_name: string;
  dob: string;
  sex: string;
}

interface ERVisitResponse {
  id: string;
  visit_number?: string; // Optional visit number
  patient_id: string;
  status: string;
}

interface ApiErrorResponse {
  error: string;
}

interface ERRegistrationModalProperties {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (visit: ERVisitResponse) => void; // Optional callback on successful registration
}

export default function ERRegistrationModal({
  isOpen,
  onClose,
  onSuccess,
}: ERRegistrationModalProperties) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [foundPatient, setFoundPatient] = useState<PatientResponse | null>(
    
  );

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      searchMrn: "",
      firstName: "",
      lastName: "",
      dob: "",
      sex: undefined,
      chiefComplaint: "",
      arrivalMode: "",
    },
  });

  // Reset form and found patient state when modal closes or opens
  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setFoundPatient(undefined);
      setIsLoading(false);
      setIsSearching(false);
    }
  }, [isOpen, form]);

  // Populate form if a patient is found
  useEffect(() => {
    if (foundPatient) {
      form.setValue("firstName", foundPatient.first_name);
      form.setValue("lastName", foundPatient.last_name);
      form.setValue("dob", foundPatient.dob); // Assuming dob format matches input
      form.setValue("sex", foundPatient.sex as "Male" | "Female" | "Other");
      // Disable fields
      form.control.getFieldState("firstName").isDirty = false;
      form.control.getFieldState("lastName").isDirty = false;
      form.control.getFieldState("dob").isDirty = false;
      form.control.getFieldState("sex").isDirty = false;
    }
  }, [foundPatient, form]);

  const handleSearchPatient = async () => {
    const mrn = form.getValues("searchMrn");
    if (!mrn) {
      toast({
        title: "MRN Required",
        description: "Please enter an MRN to search.",
        variant: "destructive",
      });
      return;
    }
    setIsSearching(true);
    setFoundPatient(undefined);
    console.log(`Searching for patient with MRN: ${mrn}`);
    try {
      // TODO: Implement actual API call: GET /api/patients?mrn={mrn}
      // const response = await fetch(`/api/patients?mrn=${encodeURIComponent(mrn)}`);
      // if (!response.ok) { ... handle not found or other errors ... }
      // const patientData: PatientResponse = await response.json();

      // Mock search result
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (mrn === "MRN001") {
        // Simulate finding a patient
        const mockPatient: PatientResponse = {
          id: "p1",
          mrn: "MRN001",
          first_name: "John",
          last_name: "Doe",
          dob: "1979-01-15", // Example format
          sex: "Male",
        };
        setFoundPatient(mockPatient);
        toast({
          title: "Patient Found",
          description: `Found ${mockPatient.first_name} ${mockPatient.last_name}.`,
        });
      } else {
        toast({
          title: "Patient Not Found",
          description: `No patient found with MRN ${mrn}.`,
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Patient search error:", error);
      toast({
        title: "Search Failed",
        description: "Could not search for patient.",
        variant: "destructive",
      });
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
          await new Promise((resolve) => setTimeout(resolve, 500));
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
        let errorMessage = "Failed to create ER visit";
        try {
          // FIX: Use defined type for errorData
          const errorData: ApiErrorResponse = await visitResponse.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Ignore if response is not JSON
        }
        throw new Error(errorMessage);
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
      setFoundPatient(undefined);
      onClose(); // Close modal on success
    } catch (error: unknown) {
      // FIX: Use unknown for catch block
      console.error("Registration submission error:", error);
      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";
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
            Search for an existing patient by MRN or enter details for a new
            patient.
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
                        <Input
                          placeholder="Enter MRN to search..."
                          {...field}
                          disabled={!!foundPatient}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  onClick={handleSearchPatient}
                  disabled={isSearching || !!foundPatient}
                >
                  {isSearching ? "Searching..." : "Search"}
                </Button>
              </div>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              OR Enter New Patient Details Below
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., John"
                        {...field}
                        disabled={!!foundPatient}
                      />
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
                      <Input
                        placeholder="e.g., Doe"
                        {...field}
                        disabled={!!foundPatient}
                      />
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
                      <Input
                        type="date"
                        placeholder="YYYY-MM-DD"
                        {...field}
                        disabled={!!foundPatient}
                      />
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
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!!foundPatient}
                    >
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
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
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
