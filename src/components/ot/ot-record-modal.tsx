"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

// Define types for Vitals and Medications (example structure)
interface VitalReadings {
  bp_readings: { time: string; value: string }[];
  pulse_readings: { time: string; value: number }[];
  o2_saturation_readings: { time: string; value: number }[];
  temperature_readings: { time: string; value: number }[];
}

interface MedicationAdministered {
  medication_name: string;
  dosage: string;
  time: string;
}

interface ChecklistResponse {
  id: string;
  text: string;
  checked: boolean;
}

// Define the OTRecord type
interface OTRecord {
  id?: string; // Optional ID for existing records
  procedure_notes: string;
  procedure_start_time: string | Date | null;
  procedure_end_time: string | Date | null;
  anesthesia_type: string;
  anesthesia_notes: string;
  vitals: VitalReadings;
  medications_administered: MedicationAdministered[];
  complications: string;
  blood_loss_ml: number | string | null; // Allow string for input
  post_op_instructions: string;
  recovery_notes: string;
  checklist_responses?: ChecklistResponse[]; // Optional checklist responses
}

// Define the type for data passed to onSave
interface OTRecordSaveData
  extends Omit<
    OTRecord,
    "id" | "vitals" | "medications_administered" | "checklist_responses"
  > {
  booking_id: string;
  procedure_start_time: string | null;
  procedure_end_time: string | null;
  blood_loss_ml: number | null;
  checklist_responses: ChecklistResponse[];
  // Include vitals and meds if they are saved separately or structured differently for API
}

// Props for the modal - use defined types
interface OTRecordModalProperties {
  trigger: React.ReactNode;
  bookingId: string;
  existingRecord?: OTRecord; // Use OTRecord type
  onSave: (recordData: OTRecordSaveData) => Promise<void>; // Use OTRecordSaveData type
}

export default function OTRecordModal({
  trigger,
  bookingId,
  existingRecord,
  onSave,
}: OTRecordModalProperties) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("procedure");
  const [formData, setFormData] = useState(() => ({
    procedure_notes: existingRecord?.procedure_notes || "",
    procedure_start_time: existingRecord?.procedure_start_time
      ? new Date(existingRecord.procedure_start_time).toISOString().slice(0, 16)
      : "",
    procedure_end_time: existingRecord?.procedure_end_time
      ? new Date(existingRecord.procedure_end_time).toISOString().slice(0, 16)
      : "",
    anesthesia_type: existingRecord?.anesthesia_type || "",
    anesthesia_notes: existingRecord?.anesthesia_notes || "",
    vitals: existingRecord?.vitals || {
      bp_readings: [],
      pulse_readings: [],
      o2_saturation_readings: [],
      temperature_readings: [],
    },
    medications_administered: existingRecord?.medications_administered || [],
    complications: existingRecord?.complications || "",
    blood_loss_ml: existingRecord?.blood_loss_ml || "",
    post_op_instructions: existingRecord?.post_op_instructions || "",
    recovery_notes: existingRecord?.recovery_notes || "",
  }));

  // Mock data for checklist items - replace with fetched template if applicable
  const [checklistItems, setChecklistItems] = useState<ChecklistResponse[]>(
    () =>
      existingRecord?.checklist_responses || [
        { id: "1", text: "Surgical site marked", checked: false },
        { id: "2", text: "Patient identity confirmed", checked: false },
        { id: "3", text: "Consent verified", checked: false },
        { id: "4", text: "Allergies checked", checked: false },
        { id: "5", text: "Equipment checked", checked: false },
        { id: "6", text: "Team briefing completed", checked: false },
      ]
  );

  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Reset form when existingRecord prop changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        procedure_notes: existingRecord?.procedure_notes || "",
        procedure_start_time: existingRecord?.procedure_start_time
          ? new Date(existingRecord.procedure_start_time)
              .toISOString()
              .slice(0, 16)
          : "",
        procedure_end_time: existingRecord?.procedure_end_time
          ? new Date(existingRecord.procedure_end_time)
              .toISOString()
              .slice(0, 16)
          : "",
        anesthesia_type: existingRecord?.anesthesia_type || "",
        anesthesia_notes: existingRecord?.anesthesia_notes || "",
        vitals: existingRecord?.vitals || {
          bp_readings: [],
          pulse_readings: [],
          o2_saturation_readings: [],
          temperature_readings: [],
        },
        medications_administered:
          existingRecord?.medications_administered || [],
        complications: existingRecord?.complications || "",
        blood_loss_ml: existingRecord?.blood_loss_ml || "",
        post_op_instructions: existingRecord?.post_op_instructions || "",
        recovery_notes: existingRecord?.recovery_notes || "",
      });

      setChecklistItems(
        existingRecord?.checklist_responses || [
          { id: "1", text: "Surgical site marked", checked: false },
          { id: "2", text: "Patient identity confirmed", checked: false },
          { id: "3", text: "Consent verified", checked: false },
          { id: "4", text: "Allergies checked", checked: false },
          { id: "5", text: "Equipment checked", checked: false },
          { id: "6", text: "Team briefing completed", checked: false },
        ]
      );
    }
  }, [existingRecord, isOpen]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleChecklistChange = (id: string, checked: boolean) => {
    setChecklistItems((previous) =>
      previous.map((item) => (item.id === id ? { ...item, checked } : item))
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const bloodLoss = formData.blood_loss_ml
        ? Number.parseInt(formData.blood_loss_ml.toString(), 10)
        : undefined;
      if (
        formData.blood_loss_ml &&
        (Number.isNaN(bloodLoss as number) || (bloodLoss as number) < 0)
      ) {
        toast({
          title: "Error",
          description: "Blood loss must be a non-negative number.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      const apiData: OTRecordSaveData = {
        procedure_notes: formData.procedure_notes,
        anesthesia_type: formData.anesthesia_type,
        anesthesia_notes: formData.anesthesia_notes,
        complications: formData.complications,
        post_op_instructions: formData.post_op_instructions,
        recovery_notes: formData.recovery_notes,
        booking_id: bookingId,
        procedure_start_time: formData.procedure_start_time
          ? new Date(formData.procedure_start_time).toISOString()
          : null,
        procedure_end_time: formData.procedure_end_time
          ? new Date(formData.procedure_end_time).toISOString()
          : null,
        blood_loss_ml: bloodLoss ?? null,
        checklist_responses: checklistItems,
      };

      // Replace with actual API call
      // const url = existingRecord?.id ? `/api/ot/bookings/${bookingId}/record/${existingRecord.id}` : `/api/ot/bookings/${bookingId}/record`;
      // const method = existingRecord?.id ? "PUT" : "POST";
      // const response = await fetch(url, {
      //   method: method,
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(apiData),
      // });
      // if (!response.ok) {
      //   const errorData = await response.json();
      //   throw new Error(errorData.message || "Failed to save operation record");
      // }

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("Saving operation record:", apiData);

      await onSave(apiData); // Call parent callback to refresh data

      toast({
        title: "Success",
        description: `Operation record ${existingRecord ? "updated" : "created"} successfully.`,
      });
      setIsOpen(false);
    } catch (error: unknown) {
      // Use unknown for error type
      console.error("Error saving operation record:", error);
      let errorMessage = "Failed to save operation record.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingRecord
              ? "Edit Operation Record"
              : "Create Operation Record"}
          </DialogTitle>
          <DialogDescription>
            Document the details of the surgical procedure.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs
            defaultValue="procedure"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="procedure">Procedure</TabsTrigger>
              <TabsTrigger value="checklist">Checklist</TabsTrigger>
              <TabsTrigger value="vitals">Vitals & Meds</TabsTrigger>
              <TabsTrigger value="post-op">Post-Op</TabsTrigger>
            </TabsList>

            <TabsContent value="procedure" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="procedure_start_time">Start Time</Label>
                  <Input
                    id="procedure_start_time"
                    name="procedure_start_time"
                    type="datetime-local"
                    value={formData.procedure_start_time}
                    onChange={handleChange}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="procedure_end_time">End Time</Label>
                  <Input
                    id="procedure_end_time"
                    name="procedure_end_time"
                    type="datetime-local"
                    value={formData.procedure_end_time}
                    onChange={handleChange}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="procedure_notes">Procedure Notes</Label>
                <Textarea
                  id="procedure_notes"
                  name="procedure_notes"
                  value={formData.procedure_notes}
                  onChange={handleChange}
                  className="mt-1 h-32"
                  placeholder="Detailed description of the procedure performed..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="anesthesia_type">Anesthesia Type</Label>
                  <Input
                    id="anesthesia_type"
                    name="anesthesia_type"
                    value={formData.anesthesia_type}
                    onChange={handleChange}
                    className="mt-1"
                    placeholder="e.g., General, Local, Regional"
                  />
                </div>
                <div>
                  <Label htmlFor="blood_loss_ml">Blood Loss (ml)</Label>
                  <Input
                    id="blood_loss_ml"
                    name="blood_loss_ml"
                    type="number"
                    value={formData.blood_loss_ml}
                    onChange={handleChange}
                    className="mt-1"
                    min="0" // Add min attribute for validation
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="anesthesia_notes">Anesthesia Notes</Label>
                <Textarea
                  id="anesthesia_notes"
                  name="anesthesia_notes"
                  value={formData.anesthesia_notes}
                  onChange={handleChange}
                  className="mt-1 h-20"
                  placeholder="Notes related to anesthesia administration..."
                />
              </div>

              <div>
                <Label htmlFor="complications">Complications</Label>
                <Textarea
                  id="complications"
                  name="complications"
                  value={formData.complications}
                  onChange={handleChange}
                  className="mt-1 h-20"
                  placeholder="Any complications encountered during the procedure..."
                />
              </div>
            </TabsContent>

            <TabsContent value="checklist" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Surgical Safety Checklist</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {checklistItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`checklist-${item.id}`}
                          checked={item.checked}
                          onCheckedChange={(checked) =>
                            handleChecklistChange(item.id, checked as boolean)
                          }
                        />
                        <Label htmlFor={`checklist-${item.id}`}>
                          {item.text}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vitals" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Vital Signs</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    This section would include vital sign monitoring during the
                    procedure. In a full implementation, this would be a dynamic
                    form for recording multiple readings.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Blood Pressure</Label>
                      <Input placeholder="e.g., 120/80" disabled />
                    </div>
                    <div>
                      <Label>Pulse Rate</Label>
                      <Input placeholder="e.g., 72 bpm" disabled />
                    </div>
                    <div>
                      <Label>Oxygen Saturation</Label>
                      <Input placeholder="e.g., 98%" disabled />
                    </div>
                    <div>
                      <Label>Temperature</Label>
                      <Input placeholder="e.g., 36.8°C" disabled />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>
                    Medications Ad (Content truncated due to size limit. Use
                    line ranges to read in chunks)ministered
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    This section would list medications administered during the
                    procedure. In a full implementation, this would allow
                    adding/editing medication records.
                  </p>
                  <Input placeholder="e.g., Propofol 100mg IV" disabled />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="post-op" className="space-y-4">
              <div>
                <Label htmlFor="post_op_instructions">
                  Post-Op Instructions
                </Label>
                <Textarea
                  id="post_op_instructions"
                  name="post_op_instructions"
                  value={formData.post_op_instructions}
                  onChange={handleChange}
                  className="mt-1 h-24"
                  placeholder="Instructions for post-operative care..."
                />
              </div>
              <div>
                <Label htmlFor="recovery_notes">Recovery Notes</Label>
                <Textarea
                  id="recovery_notes"
                  name="recovery_notes"
                  value={formData.recovery_notes}
                  onChange={handleChange}
                  className="mt-1 h-24"
                  placeholder="Notes on patient's recovery status..."
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving
                ? "Saving..."
                : existingRecord
                  ? "Update Record"
                  : "Save Record"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
