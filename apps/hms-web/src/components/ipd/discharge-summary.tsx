import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface DischargeSummaryProps {
  patientId: string;
  patientName: string;
}

/**
 * IPD Discharge Summary component
 */
export function DischargeSummary({ patientId, patientName }: DischargeSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Discharge Summary - {patientName}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="admissionDate">Admission Date</Label>
              <Input id="admissionDate" type="date" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dischargeDate">Discharge Date</Label>
              <Input id="dischargeDate" type="date" />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="admittingDiagnosis">Admitting Diagnosis</Label>
            <Textarea id="admittingDiagnosis" placeholder="Enter admitting diagnosis" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="dischargeDiagnosis">Discharge Diagnosis</Label>
            <Textarea id="dischargeDiagnosis" placeholder="Enter discharge diagnosis" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="briefHistory">Brief History</Label>
            <Textarea id="briefHistory" placeholder="Enter brief history" rows={3} />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="significantFindings">Significant Findings</Label>
            <Textarea id="significantFindings" placeholder="Enter significant findings" rows={3} />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="proceduresPerformed">Procedures Performed</Label>
            <Textarea id="proceduresPerformed" placeholder="Enter procedures performed" rows={3} />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="treatmentGiven">Treatment Given</Label>
            <Textarea id="treatmentGiven" placeholder="Enter treatment given" rows={3} />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="conditionAtDischarge">Condition at Discharge</Label>
            <Select 
              id="conditionAtDischarge"
              options={[
                { value: "improved", label: "Improved" },
                { value: "stable", label: "Stable" },
                { value: "unchanged", label: "Unchanged" },
                { value: "deteriorated", label: "Deteriorated" },
                { value: "expired", label: "Expired" },
              ]}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="dischargeMedications">Discharge Medications</Label>
            <Textarea id="dischargeMedications" placeholder="Enter discharge medications" rows={3} />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="followUpInstructions">Follow-up Instructions</Label>
            <Textarea id="followUpInstructions" placeholder="Enter follow-up instructions" rows={3} />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="dischargingPhysician">Discharging Physician</Label>
            <Select 
              id="dischargingPhysician"
              options={[
                { value: "", label: "Select physician" },
              ]}
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline">Cancel</Button>
            <Button>Generate Discharge Summary</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
