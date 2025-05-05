"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
import { Loader2 } from "lucide-react";

// Define interfaces
interface Modality {
  id: string;
  name: string;
}

interface Technician {
  id: string;
  name: string;
}

// FIX: Export StudyPayload interface
export interface StudyPayload {
  order_id: string;
  accession_number: string | null;
  study_datetime: string;
  modality_id: string | null;
  technician_id: string;
  protocol: string | null;
  series_description: string | null;
  number_of_images: number | null;
  status: string; // e.g., "acquired"
}

interface CreateRadiologyStudyModalProperties {
  onClose: () => void;
  onSubmit: (payload: StudyPayload) => Promise<void>;
  orderId: string;
}

export default function CreateRadiologyStudyModal({
  onClose,
  onSubmit,
  orderId,
}: CreateRadiologyStudyModalProperties) {
  // FIX: Type props
  const [accessionNumber, setAccessionNumber] = useState("");
  const [studyDatetime, setStudyDatetime] = useState("");
  const [modalityId, setModalityId] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [protocol, setProtocol] = useState("");
  const [seriesDescription, setSeriesDescription] = useState("");
  const [numberOfImages, setNumberOfImages] = useState("");

  const [modalities, setModalities] = useState<Modality[]>([]); // FIX: Type state
  const [technicians, setTechnicians] = useState<Technician[]>([]); // FIX: Type state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(); // FIX: Type state
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(undefined);
      try {
        const [modalitiesResponse, techniciansResponse] = await Promise.all([
          fetch("/api/radiology/modalities"),
          fetch("/api/users?role=Technician"), // Assuming API endpoint exists to fetch technicians
        ]);

        if (!modalitiesResponse.ok) throw new Error("Failed to fetch modalities");
        if (!techniciansResponse.ok) throw new Error("Failed to fetch technicians");

        // FIX: Type the fetched data before setting state
        const modalitiesData: Modality[] = await modalitiesResponse.json();
        const techniciansData: Technician[] = await techniciansResponse.json();

        // Assuming API returns array directly, adjust if it returns { results: [...] }
        setModalities(modalitiesData);
        setTechnicians(techniciansData);

        // Set default study datetime to now
        setStudyDatetime(new Date().toISOString().slice(0, 16)); // Format: YYYY-MM-DDTHH:MM
      } catch (error_) {
        console.error("Error fetching data for modal:", error_);
        setError("Failed to load necessary data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // FIX: Type the event parameter
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!studyDatetime || !technicianId) {
      alert(
        "Please fill in all required fields (Study Date/Time, Technician)."
      );
      return;
    }
    setIsSubmitting(true);
    await onSubmit({
      order_id: orderId,
      accession_number: accessionNumber || null,
      study_datetime: studyDatetime,
      modality_id: modalityId || null,
      technician_id: technicianId,
      protocol: protocol || null,
      series_description: seriesDescription || null,
      number_of_images: numberOfImages
        ? Number.parseInt(numberOfImages, 10)
        : null,
      status: "acquired", // Default status for new study
    });
    setIsSubmitting(false);
  };

  return (
    <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Radiology Study</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500 p-4">{error}</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="accessionNumber" className="text-right">
                  Accession #
                </Label>
                <Input
                  id="accessionNumber"
                  value={accessionNumber}
                  onChange={(e) => setAccessionNumber(e.target.value)}
                  className="col-span-3"
                  placeholder="Auto-generated if left blank"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="studyDatetime" className="text-right">
                  Study Date/Time *
                </Label>
                <Input
                  id="studyDatetime"
                  type="datetime-local"
                  value={studyDatetime}
                  onChange={(e) => setStudyDatetime(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="modality" className="text-right">
                  Modality
                </Label>
                <Select value={modalityId} onValueChange={setModalityId}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select Modality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {modalities.map((modality) => (
                      <SelectItem key={modality.id} value={modality.id}>
                        {modality.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="technician" className="text-right">
                  Technician *
                </Label>
                <Select
                  value={technicianId}
                  onValueChange={setTechnicianId}
                  required
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select Technician" />
                  </SelectTrigger>
                  <SelectContent>
                    {technicians.map((tech) => (
                      <SelectItem key={tech.id} value={tech.id}>
                        {tech.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="protocol" className="text-right">
                  Protocol
                </Label>
                <Input
                  id="protocol"
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value)}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="seriesDescription" className="text-right">
                  Series Description
                </Label>
                <Textarea
                  id="seriesDescription"
                  value={seriesDescription}
                  onChange={(e) => setSeriesDescription(e.target.value)}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="numberOfImages" className="text-right">
                  Number of Images
                </Label>
                <Input
                  id="numberOfImages"
                  type="number"
                  min="1"
                  value={numberOfImages}
                  onChange={(e) => setNumberOfImages(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : undefined}
                Create Study
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
