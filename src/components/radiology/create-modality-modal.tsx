"use client";

import React, { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// FIX: Define and export interface for form data
export interface ModalityFormData {
  name: string;
  description?: string | null;
  location?: string | null;
}

// FIX: Define interface for props, including isOpen
interface CreateModalityModalProperties {
  isOpen: boolean; // Add isOpen prop
  onClose: () => void;
  onSubmit: (data: ModalityFormData) => Promise<void> | void;
}

// FIX: Apply props interface
export default function CreateModalityModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateModalityModalProperties) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // FIX: Type event parameter
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name) {
      alert("Please enter a modality name.");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({
        name,
        description,
        location,
      });
      // Assuming onSubmit handles success/error reporting
      // onClose(); // Optionally close on successful submit
    } catch (error) { // FIX: Added error parameter
      console.error("Failed to submit modality:", error);
      // Optionally show an error message to the user
      alert(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(openState) => !openState && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Modality</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name *
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="col-span-3"
                placeholder="e.g., CT Scanner 1, MRI Unit A"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="location" className="text-right">
                Location
              </Label>
              <Input
                id="location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="col-span-3"
                placeholder="e.g., Room 203, Radiology Wing"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
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
              Add Modality
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
