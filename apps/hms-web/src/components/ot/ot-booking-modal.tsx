import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface OTBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

/**
 * Operation Theatre booking modal component
 */
export function OTBookingModal({ isOpen, onClose, onSubmit }: OTBookingModalProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real implementation, we would collect form data here
    onSubmit({});
  };

  return (
    <Dialog>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Schedule Surgery</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="patientId">Patient</Label>
              <Select 
                id="patientId"
                options={[
                  { value: "", label: "Select patient" },
                ]}
              />
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
              <Label htmlFor="surgeon">Surgeon</Label>
              <Select 
                id="surgeon"
                options={[
                  { value: "", label: "Select surgeon" },
                ]}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="theatre">Theatre</Label>
              <Select 
                id="theatre"
                options={[
                  { value: "", label: "Select theatre" },
                ]}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input id="time" type="time" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="duration">Estimated Duration</Label>
              <Input id="duration" placeholder="e.g., 2 hours" />
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
            <Button type="submit">Schedule</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
