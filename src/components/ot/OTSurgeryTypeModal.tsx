"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

// Props for the modal - include surgery type data for editing
interface OTSurgeryTypeModalProps {
  trigger: React.ReactNode;
  surgeryType?: any; // Replace any with actual SurgeryType type
  onSave: (surgeryTypeData: any) => Promise<void>; // Function to handle saving
}

export default function OTSurgeryTypeModal({ trigger, surgeryType, onSave }: OTSurgeryTypeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: surgeryType?.name || "",
    description: surgeryType?.description || "",
    specialty: surgeryType?.specialty || "",
    estimated_duration_minutes: surgeryType?.estimated_duration_minutes || "",
    // required_staff and required_equipment might be complex JSON, handle appropriately
    required_staff: surgeryType?.required_staff ? JSON.stringify(surgeryType.required_staff, null, 2) : "",
    required_equipment: surgeryType?.required_equipment ? JSON.stringify(surgeryType.required_equipment, null, 2) : "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Reset form when surgeryType prop changes (for editing)
  useEffect(() => {
    if (surgeryType) {
      setFormData({
        name: surgeryType.name || "",
        description: surgeryType.description || "",
        specialty: surgeryType.specialty || "",
        estimated_duration_minutes: surgeryType.estimated_duration_minutes || "",
        required_staff: surgeryType.required_staff ? JSON.stringify(surgeryType.required_staff, null, 2) : "",
        required_equipment: surgeryType.required_equipment ? JSON.stringify(surgeryType.required_equipment, null, 2) : "",
      });
    } else {
      // Reset for new surgery type
      setFormData({
        name: "", description: "", specialty: "", estimated_duration_minutes: "", required_staff: "", required_equipment: "",
      });
    }
  }, [surgeryType, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Parse JSON fields before sending
      let parsedStaff = null;
      let parsedEquipment = null;
      try {
        if (formData.required_staff) parsedStaff = JSON.parse(formData.required_staff);
      } catch { 
        toast({ title: "Error", description: "Invalid JSON format for Required Staff.", variant: "destructive" });
        setIsSaving(false);
        return;
      }
      try {
        if (formData.required_equipment) parsedEquipment = JSON.parse(formData.required_equipment);
      } catch { 
        toast({ title: "Error", description: "Invalid JSON format for Required Equipment.", variant: "destructive" });
        setIsSaving(false);
        return;
      }
      
      const apiData = {
        ...formData,
        estimated_duration_minutes: formData.estimated_duration_minutes ? parseInt(formData.estimated_duration_minutes, 10) : null,
        required_staff: parsedStaff,
        required_equipment: parsedEquipment,
      };
      
      // Replace with actual API call
      // const url = surgeryType ? `/api/ot/surgery-types/${surgeryType.id}` : `/api/ot/surgery-types`;
      // const method = surgeryType ? "PUT" : "POST";
      // const response = await fetch(url, {
      //   method: method,
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(apiData),
      // });
      // if (!response.ok) {
      //   const errorData = await response.json();
      //   throw new Error(errorData.message || "Failed to save surgery type");
      // }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log("Saving surgery type:", apiData);
      
      await onSave(apiData); // Call parent callback to refresh list
      
      toast({
        title: "Success",
        description: `Surgery Type ${surgeryType ? "updated" : "created"} successfully.`,
      });
      setIsOpen(false);
    } catch (error: any) {
      console.error("Error saving surgery type:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save surgery type.",
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
          <DialogTitle>{surgeryType ? "Edit Surgery Type" : "Add New Surgery Type"}</DialogTitle>
          <DialogDescription>
            Enter the details for the surgery type.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name *</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="specialty" className="text-right">Specialty</Label>
              <Input id="specialty" name="specialty" value={formData.specialty} onChange={handleChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="estimated_duration_minutes" className="text-right">Est. Duration (min)</Label>
              <Input id="estimated_duration_minutes" name="estimated_duration_minutes" type="number" value={formData.estimated_duration_minutes} onChange={handleChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">Description</Label>
              <Textarea id="description" name="description" value={formData.description} onChange={handleChange} className="col-span-3" placeholder="Brief description of the surgery..." />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="required_staff" className="text-right pt-2">Required Staff (JSON)</Label>
              <Textarea id="required_staff" name="required_staff" value={formData.required_staff} onChange={handleChange} className="col-span-3 h-24" placeholder='e.g., [{"role": "Surgeon", "count": 1}, {"role": "Scrub Nurse", "count": 1}]' />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="required_equipment" className="text-right pt-2">Required Equipment (JSON)</Label>
              <Textarea id="required_equipment" name="required_equipment" value={formData.required_equipment} onChange={handleChange} className="col-span-3 h-24" placeholder='e.g., [{"item": "Laparoscope", "count": 1}, {"item": "Electrocautery Unit", "count": 1}]' />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save Surgery Type"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
