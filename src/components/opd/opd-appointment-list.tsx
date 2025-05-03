"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Assuming these will be created
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; // Assuming this exists or will be created
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"; // Assuming this exists or will be created
// Removed direct import: import { hasPermission } from "@/lib/session";

interface Appointment {
  id: number;
  patientId: number;
  patientName: string;
  doctorId: number;
  doctorName: string;
  appointmentTime: string;
  status:
    | "scheduled"
    | "checked-in"
    | "in-progress"
    | "completed"
    | "cancelled";
  appointmentType: string;
  reason: string;
}

// FIX: Define API response types
interface PermissionApiResponse {
  hasPermission?: boolean;
  error?: string;
}

// Assuming the API returns an array directly, adjust if it returns { results: Appointment[] }
type AppointmentsApiResponse = Appointment[];

interface ApiErrorResponse {
  error?: string;
}

interface OPDAppointmentListProperties {
  date: Date;
}

export default function OPDAppointmentList({
  date,
}: OPDAppointmentListProperties) {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>();
  const [canCheckIn, setCanCheckIn] = useState(false);
  const [canCancel, setCanCancel] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(true);

  useEffect(() => {
    // Check permissions via API route
    const checkPermissions = async () => {
      setLoadingPermissions(true);
      try {
        const [checkInResponse, cancelResponse] = await Promise.all([
          fetch("/api/auth/check-permission?permission=appointment:check-in"),
          fetch("/api/auth/check-permission?permission=appointment:cancel"),
        ]);

        if (!checkInResponse.ok || !cancelResponse.ok) {
          console.error("Failed to fetch permissions");
          setCanCheckIn(false);
          setCanCancel(false);
          return;
        }

        // FIX: Type the response data
        const checkInData: PermissionApiResponse = await checkInResponse.json();
        const cancelData: PermissionApiResponse = await cancelResponse.json();

        setCanCheckIn(checkInData.hasPermission || false);
        setCanCancel(cancelData.hasPermission || false);
      } catch (err) { // Declare error variable for the catch block
        console.error("Error fetching permissions:", err); // Log the caught error
        setCanCheckIn(false);
        setCanCancel(false);
      } finally {
        setLoadingPermissions(false);
      }
    };

    checkPermissions();
  }, []);

  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      setError(undefined);

      try {
        const formattedDate = date.toISOString().split("T")[0];
        const response = await fetch(`/api/appointments?date=${formattedDate}`);

        if (!response.ok) {
          let errorMessage = "Failed to fetch appointments";
          try {
            const errorData: ApiErrorResponse = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            /* Ignore */
          }
          throw new Error(errorMessage);
        }

        // FIX: Type the response data
        const data: AppointmentsApiResponse = await response.json();
        // Ensure data is an array before setting state
        if (Array.isArray(data)) {
          setAppointments(data);
        } else {
          // Handle cases where API might return { results: [...] } or other formats
          console.warn(
            "Unexpected API response format for appointments:",
            data
          );
          setAppointments([]); // Default to empty array on unexpected format
        }
      } catch (error_: unknown) {
        // FIX: Use unknown
        const messageText =
          error_ instanceof Error
            ? error_.message
            : "An unknown error occurred";
        setError(messageText);
        console.error("Error fetching appointments:", error_);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
     
  }, [date]);

  const handleCheckIn = async (appointmentId: number) => {
    try {
      const response = await fetch(
        `/api/appointments/${appointmentId}/check-in`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        let errorMessage = "Failed to check in patient";
        try {
          const errorData: ApiErrorResponse = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          /* Ignore */
        }
        throw new Error(errorMessage);
      }

      // Update the appointment status in the local state
      setAppointments(
        appointments.map((appointment) =>
          appointment.id === appointmentId
            ? { ...appointment, status: "checked-in" }
            : appointment
        )
      );
    } catch (error_: unknown) {
      // FIX: Use unknown
      const messageText =
        error_ instanceof Error ? error_.message : "An unknown error occurred";
      console.error("Error checking in patient:", error_);
      // TODO: Show error notification to user (e.g., using toast)
      alert(`Error: ${messageText}`); // Placeholder alert
    }
  };

  const handleCancel = async (appointmentId: number) => {
    try {
      const response = await fetch(
        `/api/appointments/${appointmentId}/cancel`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        let errorMessage = "Failed to cancel appointment";
        try {
          const errorData: ApiErrorResponse = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          /* Ignore */
        }
        throw new Error(errorMessage);
      }

      // Update the appointment status in the local state
      setAppointments(
        appointments.map((appointment) =>
          appointment.id === appointmentId
            ? { ...appointment, status: "cancelled" }
            : appointment
        )
      );
    } catch (error_: unknown) {
      // FIX: Use unknown
      const messageText =
        error_ instanceof Error ? error_.message : "An unknown error occurred";
      console.error("Error cancelling appointment:", error_);
      // TODO: Show error notification to user
      alert(`Error: ${messageText}`); // Placeholder alert
    }
  };

  const handleViewDetails = (appointmentId: number) => {
    router.push(`/opd/appointments/${appointmentId}`);
  };

  const getStatusBadge = (status: Appointment["status"]) => {
    switch (status) {
      case "scheduled": {
        return <Badge variant="outline">Scheduled</Badge>;
      }
      case "checked-in": {
        return <Badge variant="secondary">Checked In</Badge>;
      }
      case "in-progress": {
        return <Badge variant="default">In Progress</Badge>;
      }
      case "completed": {
        // Assuming a 'success' variant exists for Badge
        return (
          <Badge
            variant="default"
            className="bg-green-500 text-white hover:bg-green-600"
          >
            Completed
          </Badge>
        );
      }
      case "cancelled": {
        return <Badge variant="destructive">Cancelled</Badge>;
      }
      default: {
        return <Badge variant="outline">{status}</Badge>;
      }
    }
  };

  if (loading || loadingPermissions) {
    return <div className="flex justify-center p-4">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }

  if (appointments.length === 0) {
    return (
      <div className="text-center p-4">
        No appointments scheduled for this date.
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Doctor</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.map((appointment) => (
            <TableRow key={appointment.id}>
              <TableCell>
                {new Date(appointment.appointmentTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </TableCell>
              <TableCell>{appointment.patientName}</TableCell>
              <TableCell>{appointment.doctorName}</TableCell>
              <TableCell>{appointment.appointmentType}</TableCell>
              <TableCell>{getStatusBadge(appointment.status)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Appointment Details</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-2">
                          <span className="font-medium">Patient:</span>
                          <span>{appointment.patientName}</span>

                          <span className="font-medium">Doctor:</span>
                          <span>{appointment.doctorName}</span>

                          <span className="font-medium">Time:</span>
                          <span>
                            {new Date(
                              appointment.appointmentTime
                            ).toLocaleString()}
                          </span>

                          <span className="font-medium">Type:</span>
                          <span>{appointment.appointmentType}</span>

                          <span className="font-medium">Status:</span>
                          <span>{getStatusBadge(appointment.status)}</span>

                          <span className="font-medium">Reason:</span>
                          <span>{appointment.reason}</span>
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                          <Button
                            variant="outline"
                            onClick={() => handleViewDetails(appointment.id)}
                          >
                            Full Details
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {canCheckIn && appointment.status === "scheduled" && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleCheckIn(appointment.id)}
                    >
                      Check In
                    </Button>
                  )}

                  {canCancel &&
                    (appointment.status === "scheduled" ||
                      appointment.status === "checked-in") && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancel(appointment.id)}
                      >
                        Cancel
                      </Button>
                    )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
