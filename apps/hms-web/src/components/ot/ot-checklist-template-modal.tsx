import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface OTChecklistTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

/**
 * Operation Theatre checklist template modal component
 */
export function OTChecklistTemplateModal({ isOpen, onClose, onSubmit }: OTChecklistTemplateModalProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real implementation, we would collect form data here
    onSubmit({});
  };

  return (
    <Dialog>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add/Edit Checklist Template</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Checklist Name</Label>
              <Input id="name" placeholder="e.g., Pre-operative Checklist" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="surgeryType">Surgery Type</Label>
              <Select 
                id="surgeryType"
                options={[
                  { value: "", label: "Select surgery type" },
                ]}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="items">Checklist Items</Label>
              <Textarea id="items" placeholder="Enter each item on a new line" rows={6} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                id="status"
                options={[
                  { value: "active", label: "Active" },
                  { value: "draft", label: "Draft" },
                  { value: "archived", label: "Archived" },
                ]}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" placeholder="Additional information" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
