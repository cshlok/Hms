// OPD Dashboard Page
"use client";
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import OPDAppointmentList from "@/components/opd/opd-appointment-list";
import OPDPatientQueue from "@/components/opd/opd-patient-queue";
import OPDConsultationForm from "@/components/opd/opd-consultation-form";
import OPDStatistics from "@/components/opd/opd-statistics";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton for loading states
// import { hasPermission } from "@/lib/session"; // Direct permission check might be better done server-side or via dedicated hook

// --- INTERFACES ---
// FIX: Define interface for the permission check API response
interface PermissionCheckResponse {
  hasPermission: boolean;
  // Add other potential properties if the API returns more
}

export default function OPDDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("appointments");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  ); // Allow undefined for calendar
  const [permissions, setPermissions] = useState({
    canCreateAppointment: false,
    canViewStatistics: false,
  });
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>();

  useEffect(() => {
    // Check permissions via API
    const checkPermissions = async () => {
      setLoadingPermissions(true);
      setPermissionError(undefined);
      try {
        const [createResponse, statsResponse] = await Promise.all([
          fetch("/api/session/check-permission?permission=appointment:create"),
          fetch("/api/session/check-permission?permission=statistics:view"),
        ]);

        // Check responses before parsing JSON
        if (!createResponse.ok || !statsResponse.ok) {
          const failedResponse = createResponse.ok ? statsResponse : createResponse;
          throw new Error(
            `Failed to fetch permissions: ${failedResponse.statusText} (${failedResponse.status})`
          );
        }

        // FIX: Cast JSON responses to the defined type
        const createData = (await createResponse.json()) as PermissionCheckResponse;
        const statsData = (await statsResponse.json()) as PermissionCheckResponse;

        // FIX: Safely access hasPermission property
        setPermissions({
          canCreateAppointment: createData?.hasPermission ?? false,
          canViewStatistics: statsData?.hasPermission ?? false,
        });
      } catch (error) {
        console.error("Error fetching permissions:", error);
        setPermissionError(
          error instanceof Error ? error.message : "Failed to load permissions."
        );
        // Set permissions to false on error
        setPermissions({
          canCreateAppointment: false,
          canViewStatistics: false,
        });
      } finally {
        setLoadingPermissions(false);
      }
    };

    checkPermissions();
  }, []);

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date); // Update state with selected date (or undefined)
  };

  const handleNewAppointment = () => {
    // Navigate to the new appointment page (adjust path if needed)
    router.push("/dashboard/opd/appointments/new");
  };

  // Use optional chaining for selectedDate in case it's undefined initially
  const formattedDate = selectedDate
    ? selectedDate.toLocaleDateString()
    : "Selected Date";

  return (
    <div className="container mx-auto p-4">
      {/* Title might be provided by layout, remove if redundant */}
      {/* <h1 className="text-2xl font-bold mb-6">OPD Management</h1> */}
      {permissionError && (
        <Card className="mb-4 bg-red-50 border-red-200">
          <CardContent className="p-4 text-center text-red-700">
            <p className="font-semibold">Permission Error</p>
            <p className="text-sm">{permissionError}</p>
          </CardContent>
        </Card>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {" "}
        {/* Adjusted grid for responsiveness */}
        {/* Left sidebar with calendar and quick actions */}
        <div className="lg:col-span-1 space-y-6">
          {" "}
          {/* Use space-y for consistent spacing */}
          <Card>
            <CardHeader>
              <CardTitle>Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateChange}
                className="rounded-md border p-0" // Remove default padding if needed
                // initialFocus // Add if you want calendar focused on load
              />

              {loadingPermissions ? (
                <Skeleton className="h-10 w-full mt-4" />
              ) : permissions.canCreateAppointment ? (
                <Button className="w-full mt-4" onClick={handleNewAppointment}>
                  New Appointment
                </Button>
              ) : undefined}
            </CardContent>
          </Card>
          {loadingPermissions ? (
            <Card className="mt-6">
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ) : permissions.canViewStatistics ? (
            <Card className="mt-6">
              {" "}
              {/* Ensure consistent margin */}
              <CardHeader>
                <CardTitle>Today&apos;s Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Pass selectedDate only if it's defined */}
                {selectedDate && <OPDStatistics date={selectedDate} />}
                {!selectedDate && (
                  <p className="text-sm text-muted-foreground">
                    Select a date to view summary.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : undefined}
        </div>
        {/* Main content area */}
        <div className="lg:col-span-3">
          {" "}
          {/* Adjusted grid span */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            defaultValue="appointments"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="appointments">Appointments</TabsTrigger>
              <TabsTrigger value="queue">Patient Queue</TabsTrigger>
              <TabsTrigger value="consultation">Consultation</TabsTrigger>
            </TabsList>

            <TabsContent value="appointments" className="mt-4">
              <Card>
                <CardHeader>
                  {/* Ensure selectedDate is defined before using methods */}
                  <CardTitle>Appointments for {formattedDate}</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedDate ? (
                    <OPDAppointmentList date={selectedDate} />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Select a date to view appointments.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="queue" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Patient Queue for {formattedDate}</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedDate ? (
                    <OPDPatientQueue date={selectedDate} />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Select a date to view the queue.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="consultation" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Patient Consultation</CardTitle>
                  {/* Add description or patient selector if needed */}
                </CardHeader>
                <CardContent>
                  {/* Pass necessary props like patientId or appointmentId if required */}
                  <OPDConsultationForm />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
