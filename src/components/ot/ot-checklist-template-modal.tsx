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
import { useToast } from "@/components/ui/use-toast";
import { PlusCircle, Trash2 } from "lucide-react";

// Define ChecklistItem type
interface ChecklistItem {
  id: string;
  text: string;
}

// Define ChecklistTemplate type
interface ChecklistTemplate {
  id?: string; // Optional for new templates
  name: string;
  phase: string;
  items: ChecklistItem[];
  updated_at?: string; // Optional, may not be present on new/unsaved
}

// Define the type for data passed to onSave
interface ChecklistTemplateSaveData {
  name: string;
  phase: string;
  items: { id: string; text: string }[]; // Ensure ID is included if needed by backend
}

// Props for the modal - use defined types
interface OTChecklistTemplateModalProperties {
  trigger: React.ReactNode;
  template?: ChecklistTemplate; // Use ChecklistTemplate type
  onSave: (templateData: ChecklistTemplateSaveData) => Promise<void>; // Use specific save data type
}

export default function OTChecklistTemplateModal({
  trigger,
  template,
  onSave,
}: OTChecklistTemplateModalProperties) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState(() => ({
    name: template?.name || "",
    phase: template?.phase || "pre-op",
  }));
  const [items, setItems] = useState<ChecklistItem[]>(() =>
    template?.items && template.items.length > 0
      ? template.items.map((item) => ({ ...item })) // Deep copy items
      : [{ id: crypto.randomUUID(), text: "" }]
  );
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Reset form when template prop changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: template?.name || "",
        phase: template?.phase || "pre-op",
      });
      setItems(
        template?.items && template.items.length > 0
          ? template.items.map((item) => ({ ...item })) // Deep copy items
          : [{ id: crypto.randomUUID(), text: "" }]
      );
    } else {
      // Optionally clear form when closed
      // setFormData({ name: "", phase: "pre-op" });
      // setItems([{ id: crypto.randomUUID(), text: "" }]);
    }
  }, [template, isOpen]);

  const handleFormChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleItemChange = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index].text = value;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), text: "" }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      // Keep at least one item
      const newItems = items.filter((_, index_) => index_ !== index);
      setItems(newItems);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      // Validate items are not empty
      if (items.some((item) => !item.text.trim())) {
        toast({
          title: "Error",
          description: "Checklist item text cannot be empty.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      const apiData: ChecklistTemplateSaveData = {
        ...formData,
        items: items.map((item) => ({ id: item.id, text: item.text.trim() })), // Ensure IDs and trimmed text are sent
      };

      // Replace with actual API call
      // const url = template ? `/api/ot/checklist-templates/${template.id}` : `/api/ot/checklist-templates`;
      // const method = template ? "PUT" : "POST";
      // const response = await fetch(url, {
      //   method: method,
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(apiData),
      // });
      // if (!response.ok) {
      //   const errorData = await response.json();
      //   throw new Error(errorData.message || "Failed to save checklist template");
      // }

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("Saving checklist template:", apiData);

      await onSave(apiData); // Call parent callback to refresh list

      toast({
        title: "Success",
        description: `Checklist Template ${template ? "updated" : "created"} successfully.`,
      });
      setIsOpen(false);
    } catch (error: unknown) {
      // Use unknown for error type
      console.error("Error saving checklist template:", error);
      let errorMessage = "Failed to save checklist template.";
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
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>
            {template
              ? "Edit Checklist Template"
              : "Create New Checklist Template"}
          </DialogTitle>
          <DialogDescription>
            Define the items for this checklist template.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Template Name *
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phase" className="text-right">
                Phase *
              </Label>
              <Select
                name="phase"
                value={formData.phase}
                onValueChange={(value) => handleSelectChange("phase", value)}
                required
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pre-op">Pre-Op</SelectItem>
                  <SelectItem value="intra-op">Intra-Op</SelectItem>
                  <SelectItem value="post-op">Post-Op</SelectItem>
                  {/* Add more specific phases if needed */}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-4">
              <Label className="font-semibold">Checklist Items</Label>
              <div className="space-y-3 mt-2 max-h-60 overflow-y-auto pr-2">
                {items.map((item, index) => (
                  <div key={item.id} className="flex items-center space-x-2">
                    <Input
                      value={item.text}
                      onChange={(event) => handleItemChange(index, event.target.value)}
                      placeholder={`Item ${index + 1}`}
                      className="flex-grow"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      disabled={items.length <= 1}
                      title="Remove Item"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                className="mt-3"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Item
              </Button>
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
              {isSaving ? "Saving..." : "Save Template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
