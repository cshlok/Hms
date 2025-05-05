"use client";

import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Textarea,
  Table,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui"; // Assuming Input, Label are also here
import { Loader2 } from "lucide-react";

// Define interfaces for data structures
interface VitalSigns {
  temperature?: string;
  pulse?: string;
  respiratory_rate?: string;
  blood_pressure?: string;
  oxygen_saturation?: string;
  pain_level?: string;
}

interface IntakeOutput {
  oral_intake?: string;
  iv_fluids?: string;
  urine_output?: string;
  other_output?: string;
}

interface NursingNote {
  id: string;
  note_date: string;
  nurse_first_name: string; // Assuming this comes from a join
  nurse_last_name: string; // Assuming this comes from a join
  vital_signs?: string; // JSON string
  intake_output?: string; // JSON string
  medication_given?: string;
  procedures?: string;
  notes: string;
}

interface AdmissionInfo {
  admission_number: string;
  admission_date: string;
  patient_first_name: string;
  patient_last_name: string;
  diagnosis?: string;
}

interface FormData {
  vital_signs: string; // JSON string
  intake_output: string; // JSON string
  medication_given: string;
  procedures: string;
  notes: string;
}

interface NursingNotesProperties {
  admissionId: string | null;
}

const defaultVitalSigns: VitalSigns = {
  temperature: "",
  pulse: "",
  respiratory_rate: "",
  blood_pressure: "",
  oxygen_saturation: "",
  pain_level: "",
};

const defaultIntakeOutput: IntakeOutput = {
  oral_intake: "",
  iv_fluids: "",
  urine_output: "",
  other_output: "",
};

const NursingNotes: React.FC<NursingNotesProperties> = ({ admissionId }) => {
  const [nursingNotes, setNursingNotes] = useState<NursingNote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>();
  const [formData, setFormData] = useState<FormData>({
    vital_signs: JSON.stringify(defaultVitalSigns, undefined, 2),
    intake_output: JSON.stringify(defaultIntakeOutput, undefined, 2),
    medication_given: "",
    procedures: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>();
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [patientInfo, setPatientInfo] = useState<AdmissionInfo | null>();

  // Fetch nursing notes for the admission
  useEffect(() => {
    const fetchNursingNotes = async (): Promise<void> => {
      if (!admissionId) {
        setLoading(false);
        setError("Admission ID is missing.");
        return;
      }

      try {
        setLoading(true);
        setError(undefined);
        // Simulate API call
        // const response = await fetch(`/api/ipd/admissions/${admissionId}/nursing-notes`);
        // if (!response.ok) {
        //   const errorData = await response.json().catch(() => ({}));
        //   throw new Error(errorData.error || "Failed to fetch nursing notes");
        // }
        // const data = await response.json();
        // setNursingNotes(data.nursing_notes || []);
        // setPatientInfo(data.admission || null);

        // Mock data
        await new Promise((resolve) => setTimeout(resolve, 500));
        const mockNotes: NursingNote[] = [
          {
            id: "nn_001",
            note_date: new Date(Date.now() - 7_200_000).toISOString(), // 2 hours ago
            nurse_first_name: "Bob",
            nurse_last_name: "Johnson",
            vital_signs: JSON.stringify({
              temperature: "37.1 C",
              pulse: "78 bpm",
              blood_pressure: "122/78 mmHg",
              oxygen_saturation: "98%",
            }),
            intake_output: JSON.stringify({
              oral_intake: "500ml water",
              iv_fluids: "100ml NS",
              urine_output: "300ml",
            }),
            medication_given: "Paracetamol 500mg PO",
            procedures: "Wound dressing changed on left arm.",
            notes: "Patient resting comfortably. No complaints of pain.",
          },
        ];
        const mockPatientInfo: AdmissionInfo = {
          admission_number: "ADM123456",
          admission_date: new Date(Date.now() - 86_400_000).toISOString(), // Yesterday
          patient_first_name: "Jane",
          patient_last_name: "Doe",
          diagnosis: "Pneumonia",
        };
        setNursingNotes(mockNotes);
        setPatientInfo(mockPatientInfo);
      } catch (error_) {
        const message =
          error_ instanceof Error
            ? error_.message
            : "An unknown error occurred.";
        console.error("Error fetching nursing notes:", error_);
        setError(`Failed to load nursing notes: ${message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchNursingNotes();
  }, [admissionId]);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!admissionId) {
      setSubmitError("Admission ID is missing.");
      return;
    }
    setSubmitting(true);
    setSubmitError(undefined);
    setSubmitSuccess(false);

    try {
      // Validate JSON fields before submitting
      try {
        JSON.parse(formData.vital_signs); // Just parse to validate, don't assign
      } catch {
        throw new Error(
          "Invalid JSON format in Vital Signs field. Please check the structure."
        );
      }
      try {
        JSON.parse(formData.intake_output); // Just parse to validate, don't assign
      } catch {
        throw new Error(
          "Invalid JSON format in Intake/Output field. Please check the structure."
        );
      }

      if (!formData.notes) {
        throw new Error("Nursing notes cannot be empty.");
      }

      const submissionData = {
        ...formData,
        note_date: new Date().toISOString(),
        // nurse_id: session?.user?.id // Get from session in real app
      };

      // Simulate API call
      // const response = await fetch(`/api/ipd/admissions/${admissionId}/nursing-notes`, {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify(submissionData),
      // });
      // if (!response.ok) {
      //   const errorData = await response.json().catch(() => ({}));
      //   throw new Error(errorData.error || "Failed to create nursing note");
      // }
      // const newNote: NursingNote = await response.json();

      // Mock response
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const newNote: NursingNote = {
        id: `nn_${Date.now()}`,
        note_date: submissionData.note_date,
        nurse_first_name: "Current", // Replace with actual user data
        nurse_last_name: "Nurse",
        vital_signs: formData.vital_signs,
        intake_output: formData.intake_output,
        medication_given: formData.medication_given,
        procedures: formData.procedures,
        notes: formData.notes,
      };

      // Update the nursing notes list with the new note
      setNursingNotes((previous) => [newNote, ...previous]);

      // Reset form
      setFormData({
        vital_signs: JSON.stringify(defaultVitalSigns, undefined, 2),
        intake_output: JSON.stringify(defaultIntakeOutput, undefined, 2),
        medication_given: "",
        procedures: "",
        notes: "",
      });

      setSubmitSuccess(true);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
    } catch (error_) {
      const message =
        error_ instanceof Error ? error_.message : "An unknown error occurred.";
      console.error("Error creating nursing note:", error_);
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
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

  // Parse JSON safely and return a specific type or null
  const safeParseJSON = <T,>(jsonString: string | undefined): T | null => {
    if (!jsonString) return null;
    try {
      return JSON.parse(jsonString) as T;
    } catch (error_) {
      console.error("Failed to parse JSON string:", jsonString, error_);
      return null;
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
            {formatDate(patientInfo.admission_date)}
            {patientInfo.diagnosis && ` | Diagnosis: ${patientInfo.diagnosis}`}
          </p>
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Add Nursing Note</CardTitle>
        </CardHeader>
        <CardContent>
          {submitSuccess && (
            <div
              className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4"
              role="alert"
            >
              Nursing note added successfully!
            </div>
          )}

          {submitError && (
            <div
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
              role="alert"
            >
              Error: {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="vital_signs" className="font-medium text-sm">
                  Vital Signs (JSON)
                </label>
                <Textarea
                  id="vital_signs"
                  name="vital_signs"
                  value={formData.vital_signs}
                  onChange={handleChange}
                  placeholder="Enter vital signs in JSON format"
                  className="font-mono text-sm min-h-[150px] bg-gray-50"
                  disabled={submitting}
                />
                <p className="text-xs text-gray-500">
                  Edit values for temp, pulse, resp rate, BP, SpO2, pain.
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="intake_output" className="font-medium text-sm">
                  Intake/Output (JSON)
                </label>
                <Textarea
                  id="intake_output"
                  name="intake_output"
                  value={formData.intake_output}
                  onChange={handleChange}
                  placeholder="Enter intake/output in JSON format"
                  className="font-mono text-sm min-h-[150px] bg-gray-50"
                  disabled={submitting}
                />
                <p className="text-xs text-gray-500">
                  Edit values for oral intake, IV fluids, urine, other output.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="medication_given" className="font-medium text-sm">
                Medications Given
              </label>
              <Textarea
                id="medication_given"
                name="medication_given"
                value={formData.medication_given}
                onChange={handleChange}
                placeholder="List medications administered during shift (optional)"
                className="min-h-[80px]"
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="procedures" className="font-medium text-sm">
                Procedures Performed
              </label>
              <Textarea
                id="procedures"
                name="procedures"
                value={formData.procedures}
                onChange={handleChange}
                placeholder="List procedures performed during shift (optional)"
                className="min-h-[80px]"
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="notes" className="font-medium text-sm">
                Notes <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                required
                placeholder="Enter nursing observations, interventions, and patient response"
                className="min-h-[120px]"
                disabled={submitting}
                aria-required="true"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : undefined}
                {submitting ? "Saving..." : "Save Nursing Note"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Nursing Notes History</CardTitle>
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
          ) : nursingNotes.length === 0 ? (
            <div className="text-gray-500 p-4 text-center">
              No nursing notes found for this admission.
            </div>
          ) : (
            <div className="space-y-6">
              {nursingNotes.map((note) => {
                const vitals = safeParseJSON<VitalSigns>(note.vital_signs);
                const io = safeParseJSON<IntakeOutput>(note.intake_output);

                return (
                  <div
                    key={note.id}
                    className="border rounded-md p-4 shadow-sm bg-white"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b pb-2">
                      <h3 className="font-semibold text-base">
                        Nurse: {note.nurse_first_name} {note.nurse_last_name}
                      </h3>
                      <span className="text-sm text-gray-500 mt-1 sm:mt-0">
                        {formatDate(note.note_date)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {vitals && Object.values(vitals).some(Boolean) && (
                        <div className="bg-gray-50 p-3 rounded border">
                          <h4 className="font-medium mb-2 text-sm">
                            Vital Signs
                          </h4>
                          <Table className="text-xs">
                            <TableBody>
                              {Object.entries(vitals)
                                .filter(([, value]) => value) // Only show entries with a value
                                .map(([key, value]) => (
                                  <TableRow key={key}>
                                    <TableCell className="font-medium capitalize pr-2 py-1">
                                      {key.replaceAll("_", " ")}
                                    </TableCell>
                                    <TableCell className="py-1">
                                      {value}
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                      {io && Object.values(io).some(Boolean) && (
                        <div className="bg-gray-50 p-3 rounded border">
                          <h4 className="font-medium mb-2 text-sm">
                            Intake/Output
                          </h4>
                          <Table className="text-xs">
                            <TableBody>
                              {Object.entries(io)
                                .filter(([, value]) => value)
                                .map(([key, value]) => (
                                  <TableRow key={key}>
                                    <TableCell className="font-medium capitalize pr-2 py-1">
                                      {key.replaceAll("_", " ")}
                                    </TableCell>
                                    <TableCell className="py-1">
                                      {value}
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>

                    {note.medication_given && (
                      <div className="mb-3">
                        <h4 className="font-medium text-sm">
                          Medications Given:
                        </h4>
                        <p className="text-sm whitespace-pre-wrap">
                          {note.medication_given}
                        </p>
                      </div>
                    )}

                    {note.procedures && (
                      <div className="mb-3">
                        <h4 className="font-medium text-sm">Procedures:</h4>
                        <p className="text-sm whitespace-pre-wrap">
                          {note.procedures}
                        </p>
                      </div>
                    )}

                    <div className="mb-3">
                      <h4 className="font-medium text-sm">Notes:</h4>
                      <p className="text-sm whitespace-pre-wrap">
                        {note.notes}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NursingNotes;
