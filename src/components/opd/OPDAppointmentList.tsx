
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"; // Assuming these will be created
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; // Assuming this exists or will be created
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"; // Assuming this exists or will be created
// Removed direct import: import { hasPermission } from "@/lib/session";

interface Appointment {
  id: number;
  patientId: number;
  patientName: string;
  doctorId: number;
  doctorName: string;
  appointmentTime: string;
  status: "scheduled" | "checked-in" | "in-progress" | "completed" | "cancelled";
  appointmentType: string;
  reason: string;
}

interface OPDAppointmentListProps {
  date: Date;
}

export default function OPDAppointmentList({ date }: OPDAppointmentListProps) {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canCheckIn, setCanCheckIn] = useState(false);
  const [canCancel, setCanCancel] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(true);

  useEffect(() => {
    // Check permissions via API route
    const checkPermissions = async () => {
      setLoadingPermissions(true);
      try {
        const [checkInRes, cancelRes] = await Promise.all([
          fetch("/api/auth/check-permission?permission=appointment:check-in"),
          fetch("/api/auth/check-permission?permission=appointment:cancel"),
        ]);

        if (!checkInRes.ok || !cancelRes.ok) {
          console.error("Failed to fetch permissions");
          setCanCheckIn(false);
          setCanCancel(false);
          return;
        }

        const checkInData = await checkInRes.json();
        const cancelData = await cancelRes.json();

        setCanCheckIn(checkInData.hasPermission || false);
        setCanCancel(cancelData.hasPermission || false);
      } catch (error) {
        console.error("Error fetching permissions:", error);
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
      setError(null);

      try {
        const formattedDate = date.toISOString().split("T")[0];
        const response = await fetch(`/api/appointments?date=${formattedDate}`);

        if (!response.ok) {
          throw new Error("Failed to fetch appointments");
        }

        const data = await response.json();
        setAppointments(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        console.error("Error fetching appointments:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [date]);

  const handleCheckIn = async (appointmentId: number) => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}/check-in`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to check in patient");
      }

      // Update the appointment status in the local state
      setAppointments(appointments.map(appointment => 
        appointment.id === appointmentId 
          ? { ...appointment, status: "checked-in" } 
          : appointment
      ));

    } catch (err) {
      console.error("Error checking in patient:", err);
      // Show error notification
    }
  };

  const handleCancel = async (appointmentId: number) => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}/cancel`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to cancel appointment");
      }

      // Update the appointment status in the local state
      setAppointments(appointments.map(appointment => 
        appointment.id === appointmentId 
          ? { ...appointment, status: "cancelled" } 
          : appointment
      ));

    } catch (err) {
      console.error("Error cancelling appointment:", err);
      // Show error notification
    }
  };

  const handleViewDetails = (appointmentId: number) => {
    router.push(`/opd/appointments/${appointmentId}`);
  };

  const getStatusBadge = (status: Appointment["status"]) => {
    switch (status) {
      case "scheduled":
        return <Badge variant="outline">Scheduled</Badge>;
      case "checked-in":
        return <Badge variant="secondary">Checked In</Badge>;
      case "in-progress":
        return <Badge variant="default">In Progress</Badge>;
      case "completed":
        // Assuming a 'success' variant exists for Badge
        return <Badge variant="default" className="bg-green-500 text-white">Completed</Badge>; 
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading || loadingPermissions) {
    return <div className="flex justify-center p-4">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }

  if (appointments.length === 0) {
    return <div className="text-center p-4">No appointments scheduled for this date.</div>;
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
              <TableCell>{new Date(appointment.appointmentTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</TableCell>
              <TableCell>{appointment.patientName}</TableCell>
              <TableCell>{appointment.doctorName}</TableCell>
              <TableCell>{appointment.appointmentType}</TableCell>
              <TableCell>{getStatusBadge(appointment.status)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">View</Button>
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
                          <span>{new Date(appointment.appointmentTime).toLocaleString()}</span>
                          
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
                  
                  {canCancel && (appointment.status === "scheduled" || appointment.status === "checked-in") && (
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

