// src/app/dashboard/er/page.tsx
"use client";
export const dynamic = 'force-dynamic';

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import ERDashboardStats from "@/components/er/er-dashboard-stats";
import ERPatientTrackingBoard from "@/components/er/er-patient-tracking-board";
import ERTriageForm from "@/components/er/er-triage-form";
import ERCriticalAlerts from "@/components/er/er-critical-alerts";
import ERRegistrationModal from "@/components/er/er-registration-modal";
import { Button } from "@/components/ui/button";

export default function ERDashboardPage() {
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Emergency Department</h1>
        <Button onClick={() => setIsRegistrationModalOpen(true)}>
          Register New Patient
        </Button>
      </div>

      <ERDashboardStats />

      <Tabs defaultValue="tracking" className="mt-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tracking">Patient Tracking</TabsTrigger>
          <TabsTrigger value="triage">Triage</TabsTrigger>
          <TabsTrigger value="alerts">Critical Alerts</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="tracking" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Patient Tracking Board</CardTitle>
              <CardDescription>
                Real-time view of all patients in the Emergency Department
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ERPatientTrackingBoard />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="triage" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Triage Assessment</CardTitle>
              <CardDescription>
                Perform triage assessment for patients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ERTriageForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Critical Alerts</CardTitle>
              <CardDescription>
                Active critical alerts requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ERCriticalAlerts />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>ER Reports</CardTitle>
              <CardDescription>
                Analytics and operational reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                Reports functionality will be implemented in a future iteration.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ERRegistrationModal
        isOpen={isRegistrationModalOpen}
        onClose={() => setIsRegistrationModalOpen(false)}
      />
    </div>
  );
}
