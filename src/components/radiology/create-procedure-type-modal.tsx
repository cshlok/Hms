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

// Define the type for the form data
export interface ProcedureTypeFormData {
  name: string;
  description?: string | null;
  modality_type?: string | null;
}

// Define the type for the component props
interface CreateProcedureTypeModalProperties {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProcedureTypeFormData) => Promise<void>;
}

export default function CreateProcedureTypeModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateProcedureTypeModalProperties) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [modalityType, setModalityType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name) {
      alert("Please enter a procedure type name.");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({
        name,
        description,
        modality_type: modalityType || undefined, // Ensure null if empty
      });
      // Reset form on successful submission
      setName("");
      setDescription("");
      setModalityType("");
      // onClose(); // Keep modal open or close based on parent logic after onSubmit completes
    } catch (error) { // FIX: Added error parameter
      console.error("Failed to submit procedure type:", error);
      // Optionally show an error message to the user
      alert("Failed to add procedure type. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Use the isOpen prop to control the dialog's open state
  return (
    <Dialog open={isOpen} onOpenChange={(openState) => !openState && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Procedure Type</DialogTitle>
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
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="modalityType" className="text-right">
                Modality Type
              </Label>
              <Input
                id="modalityType"
                value={modalityType}
                onChange={(e) => setModalityType(e.target.value)}
                className="col-span-3"
                placeholder="e.g., XRAY, CT, MRI, ULTRASOUND"
                disabled={isSubmitting}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
                disabled={isSubmitting}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : undefined}
              Add Procedure Type
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
