'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import BedManagementDashboard from '@/components/ipd/BedManagementDashboard';
import IPDPatientList from '@/components/ipd/IPDPatientList';
import AdmissionForm from '@/components/ipd/AdmissionForm';
import PatientProgressNotes from '@/components/ipd/PatientProgressNotes';
import NursingNotes from '@/components/ipd/NursingNotes';
import VitalSigns from '@/components/ipd/VitalSigns';
import MedicationAdministration from '@/components/ipd/MedicationAdministration';
import DischargeSummary from '@/components/ipd/DischargeSummary';

const IPDPatientDetails = ({ patientId, admissionId }) => {
  return (
    <Tabs defaultValue="progress-notes" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="progress-notes">Progress Notes</TabsTrigger>
        <TabsTrigger value="nursing-notes">Nursing Notes</TabsTrigger>
        <TabsTrigger value="vital-signs">Vital Signs</TabsTrigger>
        <TabsTrigger value="medications">Medications</TabsTrigger>
        <TabsTrigger value="discharge">Discharge</TabsTrigger>
      </TabsList>
      
      <TabsContent value="progress-notes">
        <PatientProgressNotes admissionId={admissionId} />
      </TabsContent>
      
      <TabsContent value="nursing-notes">
        <NursingNotes admissionId={admissionId} />
      </TabsContent>
      
      <TabsContent value="vital-signs">
        <VitalSigns admissionId={admissionId} />
      </TabsContent>
      
      <TabsContent value="medications">
        <MedicationAdministration admissionId={admissionId} />
      </TabsContent>
      
      <TabsContent value="discharge">
        <DischargeSummary admissionId={admissionId} />
      </TabsContent>
    </Tabs>
  );
};

const IPDPage = () => {
  const [selectedAdmission, setSelectedAdmission] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const handleViewPatient = (admissionId, patientId) => {
    setSelectedAdmission({ admissionId, patientId });
    setActiveTab('patient-details');
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Inpatient Department (IPD)</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="new-admission">New Admission</TabsTrigger>
          {selectedAdmission && (
            <TabsTrigger value="patient-details">Patient Details</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="dashboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bed Management</CardTitle>
            </CardHeader>
            <CardContent>
              <BedManagementDashboard />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Current Inpatients</CardTitle>
            </CardHeader>
            <CardContent>
              <IPDPatientList onViewPatient={handleViewPatient} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="new-admission">
          <AdmissionForm />
        </TabsContent>
        
        {selectedAdmission && (
          <TabsContent value="patient-details">
            <IPDPatientDetails 
              patientId={selectedAdmission.patientId} 
              admissionId={selectedAdmission.admissionId} 
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default IPDPage;
