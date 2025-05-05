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

// Define Theatre interface
interface Theatre {
  id?: string; // Optional for new theatres
  name: string;
  location: string | null;
  specialty: string | null;
  status: string;
  equipment?: string | null; // Assuming simple text for now
  updated_at?: string; // Optional
}

// Define the type for data passed to onSave
interface TheatreSaveData {
  name: string;
  location: string | null;
  specialty: string | null;
  status: string;
  equipment: string | null;
}

// Props for the modal - use defined types
interface OTTheatreModalProperties {
  trigger: React.ReactNode;
  theatre?: Theatre; // Use Theatre type
  onSave: (theatreData: TheatreSaveData) => Promise<void>; // Use TheatreSaveData type
}

export default function OTTheatreModal({
  trigger,
  theatre,
  onSave,
}: OTTheatreModalProperties) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState(() => ({
    name: theatre?.name || "",
    location: theatre?.location || "",
    specialty: theatre?.specialty || "",
    status: theatre?.status || "available",
    equipment: theatre?.equipment || "",
  }));
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Reset form when theatre prop changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: theatre?.name || "",
        location: theatre?.location || "",
        specialty: theatre?.specialty || "",
        status: theatre?.status || "available",
        equipment: theatre?.equipment || "",
      });
    } else {
      // Optionally clear form when closed
      // setFormData({ name: "", ... });
    }
  }, [theatre, isOpen]);

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
      const apiData: TheatreSaveData = {
        name: formData.name,
        location: formData.location || null,
        specialty: formData.specialty || null,
        status: formData.status,
        equipment: formData.equipment || null,
      };

      // Replace with actual API call
      // const url = theatre?.id ? `/api/ot/theatres/${theatre.id}` : `/api/ot/theatres`;
      // const method = theatre?.id ? "PUT" : "POST";
      // const response = await fetch(url, {
      //   method: method,
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(apiData),
      // });
      // if (!response.ok) {
      //   const errorData = await response.json();
      //   throw new Error(errorData.message || "Failed to save theatre");
      // }

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("Saving theatre:", apiData);

      await onSave(apiData); // Call parent callback to refresh list

      toast({
        title: "Success",
        description: `Theatre ${theatre ? "updated" : "created"} successfully.`,
      });
      setIsOpen(false);
    } catch (error: unknown) {
      // Use unknown for error type
      console.error("Error saving theatre:", error);
      let errorMessage = "Failed to save theatre.";
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {theatre ? "Edit Operation Theatre" : "Add New Operation Theatre"}
          </DialogTitle>
          <DialogDescription>
            Enter the details for the operation theatre.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name *
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="location" className="text-right">
                Location
              </Label>
              <Input
                id="location"
                name="location"
                value={formData.location || ""}
                onChange={handleChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="specialty" className="text-right">
                Specialty
              </Label>
              <Input
                id="specialty"
                name="specialty"
                value={formData.specialty || ""}
                onChange={handleChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select
                name="status"
                value={formData.status}
                onValueChange={(value) => handleSelectChange("status", value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="in_use">In Use</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="unavailable">Unavailable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="equipment" className="text-right pt-2">
                Equipment
              </Label>
              <Textarea
                id="equipment"
                name="equipment"
                value={formData.equipment || ""}
                onChange={handleChange}
                className="col-span-3"
                placeholder="List key equipment available..."
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
              {isSaving ? "Saving..." : "Save Theatre"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
