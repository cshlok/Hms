import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface OTTheatreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

/**
 * Operation Theatre management modal component
 */
export function OTTheatreModal({ isOpen, onClose, onSubmit }: OTTheatreModalProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real implementation, we would collect form data here
    onSubmit({});
  };

  return (
    <Dialog>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add/Edit Theatre</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Theatre Name</Label>
              <Input id="name" placeholder="e.g., OT-1" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">Theatre Type</Label>
              <Select 
                id="type"
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
              <Label htmlFor="capacity">Capacity</Label>
              <Input id="capacity" type="number" placeholder="Number of staff" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="equipment">Equipment</Label>
              <Textarea id="equipment" placeholder="List of available equipment" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                id="status"
                options={[
                  { value: "available", label: "Available" },
                  { value: "occupied", label: "Occupied" },
                  { value: "maintenance", label: "Under Maintenance" },
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
