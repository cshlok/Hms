"use client";

import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Textarea,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Label, // Assuming Label is imported from ui
} from "@/components/ui";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast"; // FIX: Import useToast

// Define interfaces for data structures
interface ProgressNote {
  id: string;
  admission_id: string;
  note_date: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  doctor_id: string;
  created_at: string;
  // Assuming these come from a join or separate fetch
  doctor_first_name?: string;
  doctor_last_name?: string;
}

interface AdmissionInfo {
  admission_number: string;
  admission_date: string;
  patient_first_name: string;
  patient_last_name: string;
  diagnosis?: string;
}

interface FormData {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

// FIX: Define type for API error response
// interface ApiErrorResponse { // FIX: Removed unused interface
//   error?: string;
// }

// FIX: Define type for API success response (new note)
type NewNoteResponse = ProgressNote;

interface PatientProgressNotesProperties {
  admissionId: string | null;
}

// FIX: Create a sub-component to manage individual note tabs state
interface NoteDisplayProperties {
  note: ProgressNote;
  formatDateTime: (dateString: string | undefined) => string;
}

const NoteDisplay: React.FC<NoteDisplayProperties> = ({
  note,
  formatDateTime,
}) => {
  // FIX: Add state for the inner Tabs component
  const [activeNoteTab, setActiveNoteTab] = useState("subjective");

  return (
    <div key={note.id} className="border rounded-md p-4 bg-white shadow-sm">
      <div className="flex justify-between items-center mb-3 border-b pb-2">
        <h3 className="font-semibold text-base">
          Dr. {note.doctor_first_name || "N/A"} {note.doctor_last_name || "N/A"}
        </h3>
        <span className="text-sm text-gray-500">
          {formatDateTime(note.note_date)}
        </span>
      </div>

      {/* FIX: Add value and onValueChange to Tabs */}
      <Tabs
        value={activeNoteTab}
        onValueChange={setActiveNoteTab}
        className="w-full"
      >
        <TabsList className="mb-2 grid w-full grid-cols-4">
          <TabsTrigger value="subjective">Subjective</TabsTrigger>
          <TabsTrigger value="objective">Objective</TabsTrigger>
          <TabsTrigger value="assessment">Assessment</TabsTrigger>
          <TabsTrigger value="plan">Plan</TabsTrigger>
        </TabsList>

        <TabsContent
          value="subjective"
          className="mt-2 p-3 bg-gray-50 rounded border text-sm"
        >
          <p className="whitespace-pre-wrap">{note.subjective || "-"}</p>
        </TabsContent>

        <TabsContent
          value="objective"
          className="mt-2 p-3 bg-gray-50 rounded border text-sm"
        >
          <p className="whitespace-pre-wrap">{note.objective || "-"}</p>
        </TabsContent>

        <TabsContent
          value="assessment"
          className="mt-2 p-3 bg-gray-50 rounded border text-sm"
        >
          <p className="whitespace-pre-wrap">{note.assessment || "-"}</p>
        </TabsContent>

        <TabsContent
          value="plan"
          className="mt-2 p-3 bg-gray-50 rounded border text-sm"
        >
          <p className="whitespace-pre-wrap">{note.plan || "-"}</p>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const PatientProgressNotes: React.FC<PatientProgressNotesProperties> = ({
  admissionId,
}) => {
  const [progressNotes, setProgressNotes] = useState<ProgressNote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>();
  const [formData, setFormData] = useState<FormData>({
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
  });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [patientInfo, setPatientInfo] = useState<AdmissionInfo | null>();
  const { toast } = useToast(); // FIX: Use toast for notifications

  // Fetch progress notes and admission info
  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      if (!admissionId) {
        setLoading(false);
        setError("Admission ID is missing.");
        return;
      }

      setLoading(true);
      setError(undefined);
      try {
        // Simulate API call
        // const response = await fetch(`/api/ipd/admissions/${admissionId}/progress-notes`);
        // if (!response.ok) {
        //   let errorMsg = "Failed to fetch progress notes";
        //   try {
        //       const errorData: ApiErrorResponse = await response.json();
        //       errorMsg = errorData.error || errorMsg;
        //   } catch (jsonError) { /* Ignore */ }
        //   throw new Error(errorMsg);
        // }
        // const data = await response.json(); // Assuming { admission: AdmissionInfo, progress_notes: ProgressNote[] }
        // setProgressNotes(data.progress_notes?.sort((a, b) => new Date(b.note_date).getTime() - new Date(a.note_date).getTime()) || []);
        // setPatientInfo(data.admission || null);

        // Mock data simulation
        await new Promise((resolve) => setTimeout(resolve, 700));
        const mockPatientInfo: AdmissionInfo = {
          admission_number: "ADM123456",
          admission_date: new Date(Date.now() - 86_400_000 * 3).toISOString(), // 3 days ago
          patient_first_name: "Jane",
          patient_last_name: "Doe",
          diagnosis: "Pneumonia",
        };
        const mockProgressNotes: ProgressNote[] = [
          {
            id: "pn_001",
            admission_id: admissionId,
            note_date: new Date(Date.now() - 3_600_000 * 6).toISOString(), // 6 hours ago
            subjective:
              "Patient reports feeling slightly better. Cough less frequent.",
            objective:
              "Temp 37.2C, HR 85, RR 18, SpO2 98% on RA. Lungs clearer on auscultation.",
            assessment: "Improving pneumonia.",
            plan: "Continue current antibiotics. Monitor respiratory status. Encourage ambulation.",
            doctor_id: "doc_101",
            doctor_first_name: "Alice",
            doctor_last_name: "Smith",
            created_at: new Date().toISOString(),
          },
          {
            id: "pn_002",
            admission_id: admissionId,
            note_date: new Date(Date.now() - 86_400_000).toISOString(), // 1 day ago
            subjective:
              "Patient complaining of persistent cough and mild shortness of breath.",
            objective:
              "Temp 37.8C, HR 90, RR 22, SpO2 95% on 2L NC. Crackles heard in right lower lobe.",
            assessment: "Community-acquired pneumonia.",
            plan: "Continue IV Ceftriaxone. Monitor O2 saturation. Chest physiotherapy.",
            doctor_id: "doc_102",
            doctor_first_name: "Bob",
            doctor_last_name: "Johnson",
            created_at: new Date(Date.now() - 86_400_000).toISOString(),
          },
        ];

        setPatientInfo(mockPatientInfo);
        setProgressNotes(
          mockProgressNotes.sort(
            (a, b) =>
              new Date(b.note_date).getTime() - new Date(a.note_date).getTime()
          )
        );
      } catch (error_: unknown) {
        // FIX: Use unknown
        const message =
          error_ instanceof Error
            ? error_.message
            : "An unknown error occurred.";
        console.error("Error fetching progress notes data:", error_);
        setError(`Failed to load progress notes: ${message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [admissionId]);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!admissionId) {
      toast({
        title: "Error",
        description: "Admission ID is missing.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);

    try {
      // Basic validation
      if (
        !formData.subjective &&
        !formData.objective &&
        !formData.assessment &&
        !formData.plan
      ) {
        throw new Error(
          "At least one section (Subjective, Objective, Assessment, Plan) must be filled."
        );
      }

      const submissionData = {
        ...formData,
        note_date: new Date().toISOString(),
        // doctor_id: session?.user?.id // Get from session
      };

      // Simulate API call
      // const response = await fetch(`/api/ipd/admissions/${admissionId}/progress-notes`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(submissionData),
      // });
      // if (!response.ok) {
      //   let errorMsg = "Failed to create progress note";
      //   try {
      //       const errorData: ApiErrorResponse = await response.json();
      //       errorMsg = errorData.error || errorMsg;
      //   } catch (jsonError) { /* Ignore */ }
      //   throw new Error(errorMsg);
      // }
      // const newNote: NewNoteResponse = await response.json();

      // Mock response
      await new Promise((resolve) => setTimeout(resolve, 800));
      const newNote: NewNoteResponse = {
        id: `pn_${Date.now()}`,
        admission_id: admissionId,
        doctor_id: "doc_current", // Replace with actual user ID
        doctor_first_name: "Current", // Replace with actual user data
        doctor_last_name: "Doctor",
        created_at: new Date().toISOString(),
        ...submissionData,
      };

      // Update the progress notes list (prepend new note)
      setProgressNotes((previous) => [newNote, ...previous]);

      // Reset form
      setFormData({
        subjective: "",
        objective: "",
        assessment: "",
        plan: "",
      });

      toast({
        title: "Success",
        description: "Progress note added successfully!",
      });
    } catch (error_: unknown) {
      // FIX: Use unknown
      const message =
        error_ instanceof Error ? error_.message : "An unknown error occurred.";
      console.error("Error creating progress note:", error_);
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Format date for display
  const formatDateTime = (dateString: string | undefined): string => {
    if (!dateString) return "N/A";
    try {
      const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      };
      return new Intl.DateTimeFormat(undefined, options).format(
        new Date(dateString)
      );
    } catch {
      return "Invalid Date";
    }
  };

  return (
    <div className="space-y-6">
      {patientInfo && (
        <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
          <h3 className="font-semibold text-lg text-blue-900">
            {patientInfo.patient_first_name} {patientInfo.patient_last_name}
          </h3>
          <p className="text-sm text-gray-700">
            Admission: {patientInfo.admission_number} | Date:{" "}
            {formatDateTime(patientInfo.admission_date)}
            {patientInfo.diagnosis &&
              ` | Admission Diagnosis: ${patientInfo.diagnosis}`}
          </p>
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Add Progress Note (SOAP)</CardTitle>
        </CardHeader>
        <CardContent>
          {/* FIX: Removed manual success/error messages, relying on toast */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subjective" className="font-medium">
                Subjective (Patient reported)
              </Label>
              <Textarea
                id="subjective"
                name="subjective"
                value={formData.subjective}
                onChange={handleChange}
                // required - Removed, allow partial notes
                placeholder="Enter patient's reported symptoms and complaints"
                className="min-h-[80px]"
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="objective" className="font-medium">
                Objective (Findings)
              </Label>
              <Textarea
                id="objective"
                name="objective"
                value={formData.objective}
                onChange={handleChange}
                // required
                placeholder="Enter examination findings, vital signs, lab results, etc."
                className="min-h-[80px]"
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assessment" className="font-medium">
                Assessment (Diagnosis/Impression)
              </Label>
              <Textarea
                id="assessment"
                name="assessment"
                value={formData.assessment}
                onChange={handleChange}
                // required
                placeholder="Enter clinical assessment, diagnosis, or differential diagnosis"
                className="min-h-[80px]"
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan" className="font-medium">
                Plan (Treatment/Management)
              </Label>
              <Textarea
                id="plan"
                name="plan"
                value={formData.plan}
                onChange={handleChange}
                // required
                placeholder="Enter treatment plan, orders, consultations, follow-up"
                className="min-h-[80px]"
                disabled={submitting}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : undefined}
                {submitting ? "Saving..." : "Save Progress Note"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Progress Notes History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-red-500 p-4 text-center" role="alert">
              {error}
            </div>
          ) : progressNotes.length === 0 ? (
            <div className="text-gray-500 p-4 text-center">
              No progress notes found for this admission.
            </div>
          ) : (
            <div className="space-y-6">
              {/* FIX: Use the NoteDisplay sub-component */}
              {progressNotes.map((note) => (
                <NoteDisplay
                  key={note.id}
                  note={note}
                  formatDateTime={formatDateTime}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientProgressNotes;
