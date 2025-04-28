"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

// Props for the modal - include theatre data for editing
interface OTTheatreModalProps {
  trigger: React.ReactNode;
  theatre?: any; // Replace any with actual Theatre type
  onSave: (theatreData: any) => Promise<void>; // Function to handle saving
}

export default function OTTheatreModal({ trigger, theatre, onSave }: OTTheatreModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: theatre?.name || "",
    location: theatre?.location || "",
    specialty: theatre?.specialty || "",
    status: theatre?.status || "available",
    equipment: theatre?.equipment || "", // Assuming equipment is a simple text field for now
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Reset form when theatre prop changes (for editing)
  useEffect(() => {
    if (theatre) {
      setFormData({
        name: theatre.name || "",
        location: theatre.location || "",
        specialty: theatre.specialty || "",
        status: theatre.status || "available",
        equipment: theatre.equipment || "",
      });
    } else {
      // Reset for new theatre
      setFormData({
        name: "", location: "", specialty: "", status: "available", equipment: "",
      });
    }
  }, [theatre, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Replace with actual API call
      // const url = theatre ? `/api/ot/theatres/${theatre.id}` : `/api/ot/theatres`;
      // const method = theatre ? "PUT" : "POST";
      // const response = await fetch(url, {
      //   method: method,
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(formData),
      // });
      // if (!response.ok) {
      //   const errorData = await response.json();
      //   throw new Error(errorData.message || "Failed to save theatre");
      // }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log("Saving theatre:", formData);
      
      await onSave(formData); // Call parent callback to refresh list
      
      toast({
        title: "Success",
        description: `Theatre ${theatre ? "updated" : "created"} successfully.`,
      });
      setIsOpen(false);
    } catch (error: any) {
      console.error("Error saving theatre:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save theatre.",
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
          <DialogTitle>{theatre ? "Edit Operation Theatre" : "Add New Operation Theatre"}</DialogTitle>
          <DialogDescription>
            Enter the details for the operation theatre.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name *</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="location" className="text-right">Location</Label>
              <Input id="location" name="location" value={formData.location} onChange={handleChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="specialty" className="text-right">Specialty</Label>
              <Input id="specialty" name="specialty" value={formData.specialty} onChange={handleChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">Status</Label>
              <Select name="status" value={formData.status} onValueChange={(value) => handleSelectChange("status", value)}>
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
              <Label htmlFor="equipment" className="text-right pt-2">Equipment</Label>
              <Textarea id="equipment" name="equipment" value={formData.equipment} onChange={handleChange} className="col-span-3" placeholder="List key equipment available..." />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save Theatre"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
