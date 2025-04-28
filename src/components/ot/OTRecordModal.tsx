"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

// Props for the modal - include booking data for editing
interface OTRecordModalProps {
  trigger: React.ReactNode;
  bookingId: string;
  existingRecord?: any; // Replace any with actual OTRecord type
  onSave: (recordData: any) => Promise<void>; // Function to handle saving
}

export default function OTRecordModal({ trigger, bookingId, existingRecord, onSave }: OTRecordModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("procedure");
  const [formData, setFormData] = useState({
    // Procedure details
    procedure_notes: existingRecord?.procedure_notes || "",
    procedure_start_time: existingRecord?.procedure_start_time ? new Date(existingRecord.procedure_start_time).toISOString().slice(0, 16) : "",
    procedure_end_time: existingRecord?.procedure_end_time ? new Date(existingRecord.procedure_end_time).toISOString().slice(0, 16) : "",
    anesthesia_type: existingRecord?.anesthesia_type || "",
    anesthesia_notes: existingRecord?.anesthesia_notes || "",
    
    // Vitals
    vitals: existingRecord?.vitals || {
      bp_readings: [],
      pulse_readings: [],
      o2_saturation_readings: [],
      temperature_readings: []
    },
    
    // Medications
    medications_administered: existingRecord?.medications_administered || [],
    
    // Complications
    complications: existingRecord?.complications || "",
    blood_loss_ml: existingRecord?.blood_loss_ml || "",
    
    // Post-op
    post_op_instructions: existingRecord?.post_op_instructions || "",
    recovery_notes: existingRecord?.recovery_notes || "",
  });
  
  // Mock data for checklist items
  const [checklistItems, setChecklistItems] = useState([
    { id: "1", text: "Surgical site marked", checked: false },
    { id: "2", text: "Patient identity confirmed", checked: false },
    { id: "3", text: "Consent verified", checked: false },
    { id: "4", text: "Allergies checked", checked: false },
    { id: "5", text: "Equipment checked", checked: false },
    { id: "6", text: "Team briefing completed", checked: false },
  ]);
  
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Reset form when existingRecord prop changes (for editing)
  useEffect(() => {
    if (existingRecord) {
      setFormData({
        procedure_notes: existingRecord.procedure_notes || "",
        procedure_start_time: existingRecord.procedure_start_time ? new Date(existingRecord.procedure_start_time).toISOString().slice(0, 16) : "",
        procedure_end_time: existingRecord.procedure_end_time ? new Date(existingRecord.procedure_end_time).toISOString().slice(0, 16) : "",
        anesthesia_type: existingRecord.anesthesia_type || "",
        anesthesia_notes: existingRecord.anesthesia_notes || "",
        vitals: existingRecord.vitals || {
          bp_readings: [],
          pulse_readings: [],
          o2_saturation_readings: [],
          temperature_readings: []
        },
        medications_administered: existingRecord.medications_administered || [],
        complications: existingRecord.complications || "",
        blood_loss_ml: existingRecord.blood_loss_ml || "",
        post_op_instructions: existingRecord.post_op_instructions || "",
        recovery_notes: existingRecord.recovery_notes || "",
      });
      
      // If we had actual checklist responses, we would load them here
      // setChecklistItems(existingRecord.checklist_responses || []);
    }
  }, [existingRecord, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleChecklistChange = (id: string, checked: boolean) => {
    setChecklistItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, checked } : item
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const apiData = {
        ...formData,
        booking_id: bookingId,
        procedure_start_time: formData.procedure_start_time ? new Date(formData.procedure_start_time).toISOString() : null,
        procedure_end_time: formData.procedure_end_time ? new Date(formData.procedure_end_time).toISOString() : null,
        blood_loss_ml: formData.blood_loss_ml ? parseInt(formData.blood_loss_ml.toString(), 10) : null,
        checklist_responses: checklistItems,
      };
      
      // Replace with actual API call
      // const url = existingRecord ? `/api/ot/bookings/${bookingId}/record/${existingRecord.id}` : `/api/ot/bookings/${bookingId}/record`;
      // const method = existingRecord ? "PUT" : "POST";
      // const response = await fetch(url, {
      //   method: method,
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(apiData),
      // });
      // if (!response.ok) {
      //   const errorData = await response.json();
      //   throw new Error(errorData.message || "Failed to save operation record");
      // }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log("Saving operation record:", apiData);
      
      await onSave(apiData); // Call parent callback to refresh data
      
      toast({
        title: "Success",
        description: `Operation record ${existingRecord ? "updated" : "created"} successfully.`,
      });
      setIsOpen(false);
    } catch (error: any) {
      console.error("Error saving operation record:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save operation record.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existingRecord ? "Edit Operation Record" : "Create Operation Record"}</DialogTitle>
          <DialogDescription>
            Document the details of the surgical procedure.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="procedure" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="procedure">Procedure</TabsTrigger>
              <TabsTrigger value="checklist">Checklist</TabsTrigger>
              <TabsTrigger value="vitals">Vitals & Meds</TabsTrigger>
              <TabsTrigger value="post-op">Post-Op</TabsTrigger>
            </TabsList>
            
            <TabsContent value="procedure" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="procedure_start_time">Start Time</Label>
                  <Input 
                    id="procedure_start_time" 
                    name="procedure_start_time" 
                    type="datetime-local" 
                    value={formData.procedure_start_time} 
                    onChange={handleChange} 
                    className="mt-1" 
                  />
                </div>
                <div>
                  <Label htmlFor="procedure_end_time">End Time</Label>
                  <Input 
                    id="procedure_end_time" 
                    name="procedure_end_time" 
                    type="datetime-local" 
                    value={formData.procedure_end_time} 
                    onChange={handleChange} 
                    className="mt-1" 
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="procedure_notes">Procedure Notes</Label>
                <Textarea 
                  id="procedure_notes" 
                  name="procedure_notes" 
                  value={formData.procedure_notes} 
                  onChange={handleChange} 
                  className="mt-1 h-32" 
                  placeholder="Detailed description of the procedure performed..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="anesthesia_type">Anesthesia Type</Label>
                  <Input 
                    id="anesthesia_type" 
                    name="anesthesia_type" 
                    value={formData.anesthesia_type} 
                    onChange={handleChange} 
                    className="mt-1" 
                    placeholder="e.g., General, Local, Regional"
                  />
                </div>
                <div>
                  <Label htmlFor="blood_loss_ml">Blood Loss (ml)</Label>
                  <Input 
                    id="blood_loss_ml" 
                    name="blood_loss_ml" 
                    type="number" 
                    value={formData.blood_loss_ml} 
                    onChange={handleChange} 
                    className="mt-1" 
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="anesthesia_notes">Anesthesia Notes</Label>
                <Textarea 
                  id="anesthesia_notes" 
                  name="anesthesia_notes" 
                  value={formData.anesthesia_notes} 
                  onChange={handleChange} 
                  className="mt-1 h-20" 
                  placeholder="Notes related to anesthesia administration..."
                />
              </div>
              
              <div>
                <Label htmlFor="complications">Complications</Label>
                <Textarea 
                  id="complications" 
                  name="complications" 
                  value={formData.complications} 
                  onChange={handleChange} 
                  className="mt-1 h-20" 
                  placeholder="Any complications encountered during the procedure..."
                />
              </div>
            </TabsContent>
            
            <TabsContent value="checklist" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Surgical Safety Checklist</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {checklistItems.map(item => (
                      <div key={item.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`checklist-${item.id}`} 
                          checked={item.checked} 
                          onCheckedChange={(checked) => handleChecklistChange(item.id, checked as boolean)} 
                        />
                        <Label htmlFor={`checklist-${item.id}`}>{item.text}</Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="vitals" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Vital Signs</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    This section would include vital sign monitoring during the procedure.
                    In a full implementation, this would be a dynamic form for recording multiple readings.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Blood Pressure</Label>
                      <Input placeholder="e.g., 120/80" disabled />
                    </div>
                    <div>
                      <Label>Pulse Rate</Label>
                      <Input placeholder="e.g., 72 bpm" disabled />
                    </div>
                    <div>
                      <Label>Oxygen Saturation</Label>
                      <Input placeholder="e.g., 98%" disabled />
                    </div>
                    <div>
                      <Label>Temperature</Label>
                      <Input placeholder="e.g., 36.8°C" disabled />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Medications Administered</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    This section would include medications administered during the procedure.
                    In a full implementation, this would be a dynamic form for recording multiple medications.
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Medication</Label>
                      <Input placeholder="e.g., Propofol" disabled />
                    </div>
                    <div>
                      <Label>Dosage</Label>
                      <Input placeholder="e.g., 200mg" disabled />
                    </div>
                    <div>
                      <Label>Time</Label>
                      <Input type="time" disabled />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="post-op" className="space-y-4">
              <div>
                <Label htmlFor="post_op_instructions">Post-Op Instructions</Label>
                <Textarea 
                  id="post_op_instructions" 
                  name="post_op_instructions" 
                  value={formData.post_op_instructions} 
                  onChange={handleChange} 
                  className="mt-1 h-32" 
                  placeholder="Instructions for post-operative care..."
                />
              </div>
              
              <div>
                <Label htmlFor="recovery_notes">Recovery Notes</Label>
                <Textarea 
                  id="recovery_notes" 
                  name="recovery_notes" 
                  value={formData.recovery_notes} 
                  onChange={handleChange} 
                  className="mt-1 h-32" 
                  placeholder="Notes on patient's immediate recovery..."
                />
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save Record"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
