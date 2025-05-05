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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

// Define the Booking type based on usage
interface Booking {
  id?: string; // Optional ID for existing bookings
  patient_id: string;
  surgery_type_id: string;
  theatre_id: string;
  lead_surgeon_id: string;
  anesthesiologist_id: string;
  scheduled_start_time: string | Date; // Can be string or Date
  scheduled_end_time: string | Date; // Can be string or Date
  booking_type: string;
  priority: string;
  booking_notes: string;
}

// Define the type for data passed to onSave
interface BookingSaveData {
  patient_id: string;
  surgery_type_id: string;
  theatre_id: string;
  lead_surgeon_id: string;
  anesthesiologist_id: string;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  booking_type: string;
  priority: string;
  booking_notes: string;
}

// Props for the modal - use defined types
interface OTBookingModalProperties {
  trigger: React.ReactNode;
  booking?: Booking; // Use Booking type
  onSave: (bookingData: BookingSaveData) => Promise<void>; // Use BookingSaveData type
}

// Mock data for dropdowns - replace with API calls
const mockPatients = [
  { id: "patient-1", name: "John Smith (MRN001)" },
  { id: "patient-2", name: "Sarah Johnson (MRN002)" },
  { id: "patient-3", name: "Michael Brown (MRN003)" },
];

const mockSurgeryTypes = [
  { id: "st-1", name: "Appendectomy" },
  { id: "st-2", name: "Cholecystectomy (Laparoscopic)" },
  { id: "st-3", name: "Knee Arthroscopy" },
];

const mockTheatres = [
  { id: "theatre-1", name: "OT-1" },
  { id: "theatre-2", name: "OT-2" },
  { id: "theatre-3", name: "OT-3" },
];

const mockSurgeons = [
  { id: "user-1", name: "Dr. Alice Brown" },
  { id: "user-2", name: "Dr. Bob White" },
];

const mockAnesthesiologists = [
  { id: "user-3", name: "Dr. Charlie Green" },
  { id: "user-4", name: "Dr. Diana Black" },
];

export default function OTBookingModal({
  trigger,
  booking,
  onSave,
}: OTBookingModalProperties) {
  const [isOpen, setIsOpen] = useState(false);
  // Initialize form data state, handling potential Date objects for time
  const [formData, setFormData] = useState(() => ({
    patient_id: booking?.patient_id || "",
    surgery_type_id: booking?.surgery_type_id || "",
    theatre_id: booking?.theatre_id || "",
    lead_surgeon_id: booking?.lead_surgeon_id || "",
    anesthesiologist_id: booking?.anesthesiologist_id || "",
    scheduled_start_time: booking?.scheduled_start_time
      ? new Date(booking.scheduled_start_time).toISOString().slice(0, 16)
      : "",
    scheduled_end_time: booking?.scheduled_end_time
      ? new Date(booking.scheduled_end_time).toISOString().slice(0, 16)
      : "",
    booking_type: booking?.booking_type || "elective",
    priority: booking?.priority || "routine",
    booking_notes: booking?.booking_notes || "",
  }));
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Reset form when booking prop changes (for editing) or modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        patient_id: booking?.patient_id || "",
        surgery_type_id: booking?.surgery_type_id || "",
        theatre_id: booking?.theatre_id || "",
        lead_surgeon_id: booking?.lead_surgeon_id || "",
        anesthesiologist_id: booking?.anesthesiologist_id || "",
        scheduled_start_time: booking?.scheduled_start_time
          ? new Date(booking.scheduled_start_time).toISOString().slice(0, 16)
          : "",
        scheduled_end_time: booking?.scheduled_end_time
          ? new Date(booking.scheduled_end_time).toISOString().slice(0, 16)
          : "",
        booking_type: booking?.booking_type || "elective",
        priority: booking?.priority || "routine",
        booking_notes: booking?.booking_notes || "",
      });
    } else {
      // Optionally clear form when closed, or keep last state
      // setFormData({ patient_id: "", ... });
    }
  }, [booking, isOpen]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      // Convert datetime-local strings back to ISO strings for API
      const apiData: BookingSaveData = {
        ...formData,
        scheduled_start_time: formData.scheduled_start_time
          ? new Date(formData.scheduled_start_time).toISOString()
          : null,
        scheduled_end_time: formData.scheduled_end_time
          ? new Date(formData.scheduled_end_time).toISOString()
          : null,
      };

      // Replace with actual API call
      // const url = booking ? `/api/ot/bookings/${booking.id}` :
      // const method = booking ? "PUT" : "POST";
      // const response = await fetch(url, {
      //   method: method,
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(apiData),
      // });
      // if (!response.ok) {
      //   const errorData = await response.json();
      //   throw new Error(errorData.message || "Failed to save booking");
      // }

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("Saving booking:", apiData);

      await onSave(apiData); // Call parent callback to refresh list

      toast({
        title: "Success",
        description: `Booking ${booking ? "updated" : "created"} successfully.`,
      });
      setIsOpen(false);
    } catch (error: unknown) {
      // Use unknown for error type
      console.error("Error saving booking:", error);
      let errorMessage = "Failed to save booking.";
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {booking ? "Edit OT Booking" : "Create New OT Booking"}
          </DialogTitle>
          <DialogDescription>
            Fill in the details for the operation theatre booking.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Patient Selection */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="patient_id" className="text-right">
                Patient *
              </Label>
              <Select
                name="patient_id"
                value={formData.patient_id}
                onValueChange={(value) =>
                  handleSelectChange("patient_id", value)
                }
                required
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select Patient" />
                </SelectTrigger>
                <SelectContent>
                  {mockPatients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Surgery Type Selection */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="surgery_type_id" className="text-right">
                Surgery Type *
              </Label>
              <Select
                name="surgery_type_id"
                value={formData.surgery_type_id}
                onValueChange={(value) =>
                  handleSelectChange("surgery_type_id", value)
                }
                required
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select Surgery Type" />
                </SelectTrigger>
                <SelectContent>
                  {mockSurgeryTypes.map((st) => (
                    <SelectItem key={st.id} value={st.id}>
                      {st.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Theatre Selection */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="theatre_id" className="text-right">
                Theatre *
              </Label>
              <Select
                name="theatre_id"
                value={formData.theatre_id}
                onValueChange={(value) =>
                  handleSelectChange("theatre_id", value)
                }
                required
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select Theatre" />
                </SelectTrigger>
                <SelectContent>
                  {mockTheatres.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Surgeon Selection */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="lead_surgeon_id" className="text-right">
                Lead Surgeon *
              </Label>
              <Select
                name="lead_surgeon_id"
                value={formData.lead_surgeon_id}
                onValueChange={(value) =>
                  handleSelectChange("lead_surgeon_id", value)
                }
                required
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select Lead Surgeon" />
                </SelectTrigger>
                <SelectContent>
                  {mockSurgeons.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Anesthesiologist Selection */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="anesthesiologist_id" className="text-right">
                Anesthesiologist
              </Label>
              <Select
                name="anesthesiologist_id"
                value={formData.anesthesiologist_id}
                onValueChange={(value) =>
                  handleSelectChange("anesthesiologist_id", value)
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select Anesthesiologist (Optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {mockAnesthesiologists.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Scheduled Times */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="scheduled_start_time" className="text-right">
                Start Time *
              </Label>
              <Input
                id="scheduled_start_time"
                name="scheduled_start_time"
                type="datetime-local"
                value={formData.scheduled_start_time}
                onChange={handleChange}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="scheduled_end_time" className="text-right">
                End Time *
              </Label>
              <Input
                id="scheduled_end_time"
                name="scheduled_end_time"
                type="datetime-local"
                value={formData.scheduled_end_time}
                onChange={handleChange}
                className="col-span-3"
                required
              />
            </div>
            {/* Booking Type & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-2 items-center gap-4">
                <Label htmlFor="booking_type" className="text-right">
                  Type
                </Label>
                <Select
                  name="booking_type"
                  value={formData.booking_type}
                  onValueChange={(value) =>
                    handleSelectChange("booking_type", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="elective">Elective</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <Label htmlFor="priority" className="text-right">
                  Priority
                </Label>
                <Select
                  name="priority"
                  value={formData.priority}
                  onValueChange={(value) =>
                    handleSelectChange("priority", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Notes */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="booking_notes" className="text-right pt-2">
                Notes
              </Label>
              <Textarea
                id="booking_notes"
                name="booking_notes"
                value={formData.booking_notes}
                onChange={handleChange}
                className="col-span-3"
                placeholder="Any specific requirements or notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
