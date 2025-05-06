"use client";
export const dynamic = 'force-dynamic';

import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui"; // Assuming all these are from @/components/ui
import { Button } from "@/components/ui/button"; // FIX: Add missing Button import
import BedManagementDashboard from "@/components/ipd/bed-management-dashboard";
import IPDPatientList from "@/components/ipd/ipd-patient-list";
import AdmissionForm from "@/components/ipd/admission-form";
import PatientProgressNotes from "@/components/ipd/patient-progress-notes";
import NursingNotes from "@/components/ipd/nursing-notes";
import VitalSigns from "@/components/ipd/vital-signs";
import MedicationAdministration from "@/components/ipd/medication-administration";
import DischargeSummary from "@/components/ipd/discharge-summary";

// --- INTERFACES ---

// FIX: Define props type for IPDPatientDetails
interface IPDPatientDetailsProperties {
  patientId: number; // Assuming ID is a number
  admissionId: number; // Assuming ID is a number
}

// FIX: Define type for selected admission state
interface SelectedAdmission {
  admissionId: number;
  patientId: number;
}

// --- COMPONENTS ---

// FIX: Add explicit types for props and manage internal tab state
const IPDPatientDetails: React.FC<IPDPatientDetailsProperties> = ({
  /* _patientId, */ admissionId,
}) => {
  // FIX: Add state to control the inner Tabs component
  const [activeDetailTab, setActiveDetailTab] = useState("progress-notes");

  // FIX: Convert number IDs to strings for child components if they expect strings
  const admissionIdString = admissionId.toString();
  // const patientIdStr = patientId.toString(); // If needed by children

  return (
    // FIX: Provide value and onValueChange to control the Tabs component
    <Tabs
      value={activeDetailTab}
      onValueChange={setActiveDetailTab}
      className="w-full"
    >
      <TabsList className="mb-4 grid w-full grid-cols-3 sm:grid-cols-5">
        {" "}
        {/* Responsive grid */}
        <TabsTrigger value="progress-notes">Progress Notes</TabsTrigger>
        <TabsTrigger value="nursing-notes">Nursing Notes</TabsTrigger>
        <TabsTrigger value="vital-signs">Vital Signs</TabsTrigger>
        <TabsTrigger value="medications">Medications</TabsTrigger>
        <TabsTrigger value="discharge">Discharge</TabsTrigger>
      </TabsList>
      <TabsContent value="progress-notes">
        {/* FIX: Pass admissionId as string */}
        <PatientProgressNotes admissionId={admissionIdString} />
      </TabsContent>
      <TabsContent value="nursing-notes">
        {/* FIX: Pass admissionId as string */}
        <NursingNotes admissionId={admissionIdString} />
      </TabsContent>
      <TabsContent value="vital-signs">
        {/* FIX: Pass admissionId as string */}
        <VitalSigns admissionId={admissionIdString} />
      </TabsContent>
      <TabsContent value="medications">
        {/* FIX: Pass admissionId as string */}
        <MedicationAdministration admissionId={admissionIdString} />
      </TabsContent>
      <TabsContent value="discharge">
        {/* FIX: Pass admissionId as string */}
        <DischargeSummary admissionId={admissionIdString} />
      </TabsContent>
    </Tabs>
  );
};

const IPDPage = () => {
  // FIX: Use the defined type for state, initialize to null
  const [selectedAdmission, setSelectedAdmission] =
    useState<SelectedAdmission | null>();
  const [activeTab, setActiveTab] = useState("dashboard");

  // FIX: Add explicit types for parameters
  const handleViewPatient = (admissionId: number, patientId: number) => {
    // FIX: Correct state update logic
    setSelectedAdmission({ admissionId, patientId });
    setActiveTab("patient-details"); // Switch to the patient details tab
  };

  const handleClosePatientDetails = () => {
    setSelectedAdmission(undefined);
    setActiveTab("dashboard"); // Go back to dashboard when closing details
  };

  return (
    <div className="space-y-6">
      {/* Title might be provided by layout, remove if redundant */}
      {/* <h1 className="text-2xl font-bold">Inpatient Department (IPD)</h1> */}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4 grid w-full grid-cols-2 sm:grid-cols-3">
          {" "}
          {/* Responsive grid */}
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="new-admission">New Admission</TabsTrigger>
          {/* Only show Patient Details tab when an admission is selected */}
          {selectedAdmission && (
            <TabsTrigger value="patient-details">Patient Details</TabsTrigger>
          )}
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bed Management</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Assuming BedManagementDashboard doesn't need props */}
              <BedManagementDashboard />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Inpatients</CardTitle>
            </CardHeader>
            <CardContent>
              {/* FIX: Pass onViewPatient prop */}
              <IPDPatientList onViewPatient={handleViewPatient} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* New Admission Tab */}
        <TabsContent value="new-admission">
          {/* Assuming AdmissionForm doesn't need props or handles its own state */}
          <AdmissionForm />
        </TabsContent>

        {/* Patient Details Tab - Conditionally Rendered */}
        {selectedAdmission && (
          <TabsContent value="patient-details">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                {/* FIX: Add check for selectedAdmission before accessing properties */}
                <CardTitle>
                  Details for Admission ID: {selectedAdmission.admissionId}
                </CardTitle>
                {/* FIX: Use imported Button component */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClosePatientDetails}
                >
                  Back to List
                </Button>
              </CardHeader>
              <CardContent>
                <IPDPatientDetails
                  // FIX: Add check for selectedAdmission before accessing properties
                  patientId={selectedAdmission.patientId}
                  admissionId={selectedAdmission.admissionId}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default IPDPage;
