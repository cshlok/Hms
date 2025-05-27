import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface OTSurgeryTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

/**
 * Operation Theatre surgery type modal component
 */
export function OTSurgeryTypeModal({ isOpen, onClose, onSubmit }: OTSurgeryTypeModalProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real implementation, we would collect form data here
    onSubmit({});
  };

  return (
    <Dialog>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add/Edit Surgery Type</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Surgery Name</Label>
              <Input id="name" placeholder="e.g., Appendectomy" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select 
                id="category"
                options={[
                  { value: "general", label: "General Surgery" },
                  { value: "cardiac", label: "Cardiac Surgery" },
                  { value: "orthopedic", label: "Orthopedic Surgery" },
                  { value: "neurosurgery", label: "Neurosurgery" },
                  { value: "ophthalmic", label: "Ophthalmic Surgery" },
                ]}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="duration">Average Duration</Label>
              <Input id="duration" placeholder="e.g., 2 hours" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="equipment">Special Equipment</Label>
              <Textarea id="equipment" placeholder="List of required equipment" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="specialist">Specialist Required</Label>
              <Input id="specialist" placeholder="e.g., General Surgeon" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="riskLevel">Risk Level</Label>
              <Select 
                id="riskLevel"
                options={[
                  { value: "low", label: "Low Risk" },
                  { value: "medium", label: "Medium Risk" },
                  { value: "high", label: "High Risk" },
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
