import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

/**
 * Emergency Room triage form component
 */
export function ERTriageForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Patient Triage</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="chiefComplaint">Chief Complaint</Label>
              <Input id="chiefComplaint" placeholder="Patient's main complaint" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="triageLevel">Triage Level</Label>
              <Select 
                id="triageLevel"
                options={[
                  { value: "1", label: "Level 1 - Resuscitation" },
                  { value: "2", label: "Level 2 - Emergency" },
                  { value: "3", label: "Level 3 - Urgent" },
                  { value: "4", label: "Level 4 - Semi-urgent" },
                  { value: "5", label: "Level 5 - Non-urgent" },
                ]}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="vitalSigns">Vital Signs</Label>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <Label htmlFor="temperature" className="text-xs">Temperature</Label>
                <Input id="temperature" placeholder="°C" />
              </div>
              <div>
                <Label htmlFor="heartRate" className="text-xs">Heart Rate</Label>
                <Input id="heartRate" placeholder="bpm" />
              </div>
              <div>
                <Label htmlFor="respRate" className="text-xs">Resp. Rate</Label>
                <Input id="respRate" placeholder="/min" />
              </div>
              <div>
                <Label htmlFor="bloodPressure" className="text-xs">Blood Pressure</Label>
                <Input id="bloodPressure" placeholder="mmHg" />
              </div>
              <div>
                <Label htmlFor="oxygenSat" className="text-xs">O2 Saturation</Label>
                <Input id="oxygenSat" placeholder="%" />
              </div>
              <div>
                <Label htmlFor="painScore" className="text-xs">Pain Score</Label>
                <Input id="painScore" placeholder="0-10" />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="symptoms">Symptoms & Observations</Label>
            <Textarea id="symptoms" placeholder="Detailed description of symptoms and observations" />
          </div>
          
          <div className="space-y-2">
            <Label>Critical Indicators</Label>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="difficultyBreathing" />
                <Label htmlFor="difficultyBreathing" className="text-sm">Difficulty Breathing</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="chestPain" />
                <Label htmlFor="chestPain" className="text-sm">Chest Pain</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="alteredMentalStatus" />
                <Label htmlFor="alteredMentalStatus" className="text-sm">Altered Mental Status</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="severeTrauma" />
                <Label htmlFor="severeTrauma" className="text-sm">Severe Trauma</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="uncontrolledBleeding" />
                <Label htmlFor="uncontrolledBleeding" className="text-sm">Uncontrolled Bleeding</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="stroke" />
                <Label htmlFor="stroke" className="text-sm">Stroke Symptoms</Label>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline">Reset</Button>
            <Button>Submit Triage</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
