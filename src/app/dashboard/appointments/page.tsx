"use client";

// export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search } from "lucide-react";
import { Appointment } from "@/types/appointment";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { format } from "date-fns"; // For date formatting

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(""); // Basic search, could be expanded
  const [dateFilter, setDateFilter] = useState(format(new Date(), "yyyy-MM-dd")); // Default to today
  const { toast } = useToast();

  useEffect(() => {
    const fetchAppointments = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Build query params for filtering
        const params = new URLSearchParams();
        if (dateFilter) {
            params.append("startDate", dateFilter);
            params.append("endDate", dateFilter); // Filter for a single day for now
        }
        // TODO: Add more filters based on role (patientId, doctorId) or UI inputs

        const response = await fetch(`/api/appointments?${params.toString()}`);
        if (!response.ok) {
          const errorData: { error?: string } = await response.json(); // Add type annotation
          throw new Error(errorData.error || "Failed to fetch appointments");
        }
        const data: Appointment[] = await response.json();
        setAppointments(data);
      } catch (err: unknown) { // Use unknown
        const message = err instanceof Error ? err.message : "An unknown error occurred";
        setError(message);
        toast({
          title: "Error Fetching Appointments",
          description: message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppointments();
  }, [toast, dateFilter]); // Re-fetch when dateFilter changes

  // Simple client-side filtering (can be combined with backend filtering)
  const filteredAppointments = appointments.filter((appt) =>
    `${appt.patient?.first_name} ${appt.patient?.last_name}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
    appt.doctor?.user?.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Appointments</h1>
          <Link href="/dashboard/appointments/new">
             <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Book Appointment
             </Button>
          </Link>
        </div>

        {/* Filters: Date and Search */}
        <div className="flex flex-wrap gap-4 items-center">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search Patient or Doctor..."
                    className="pl-8 w-full sm:w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div>
                <Label htmlFor="date-filter">Date</Label>
                <Input
                    id="date-filter"
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full sm:w-auto mt-1"
                />
            </div>
            {/* TODO: Add Status Filter Dropdown */}
        </div>

        {/* Appointments Table */}
        {isLoading && <p>Loading appointments...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}
        {!isLoading && !error && (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAppointments.length > 0 ? (
                  filteredAppointments.map((appt) => (
                    <TableRow key={appt.appointment_id}>
                      <TableCell className="font-medium">
                        {format(new Date(appt.appointment_datetime), "HH:mm")}
                      </TableCell>
                      <TableCell>{appt.patient?.first_name} {appt.patient?.last_name}</TableCell>
                      <TableCell>{appt.doctor?.user?.fullName}</TableCell>
                      <TableCell>{appt.doctor?.specialty}</TableCell>
                      <TableCell>{appt.reason || "N/A"}</TableCell>
                      <TableCell>
                        {/* TODO: Add badge component for status */} 
                        {appt.status}
                      </TableCell>
                      <TableCell>
                        {/* Add action buttons like View, Edit Status */}
                        <Link href={`/dashboard/appointments/${appt.appointment_id}`}>
                           <Button variant="outline" size="sm">View</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      No appointments found for the selected date.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// Add Label component import if not globally available
import { Label } from "@/components/ui/label";



