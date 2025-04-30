
"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; // Assuming this will be created
// Removed direct import: import { hasPermission } from "@/lib/session";

interface Patient {
  id: number;
  name: string;
  tokenNumber: number;
  checkInTime: string;
  waitingTime: number; // in minutes
  status: "waiting" | "in-progress" | "completed" | "cancelled";
  doctorName: string;
}

// FIX: Define API response types
interface PermissionApiResponse {
  hasPermission?: boolean;
  error?: string;
}

// Assuming the API returns an array directly, adjust if it returns { results: Patient[] }
type PatientQueueApiResponse = Patient[];

interface ApiErrorResponse {
  error?: string;
}

interface OPDPatientQueueProps {
  date: Date;
}

export default function OPDPatientQueue({ date }: OPDPatientQueueProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canCallPatient, setCanCallPatient] = useState(false);
  const [canMarkComplete, setCanMarkComplete] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(true);

  useEffect(() => {
    // Check permissions via API route
    const checkPermissions = async () => {
      setLoadingPermissions(true);
      try {
        const [callRes, completeRes] = await Promise.all([
          fetch("/api/auth/check-permission?permission=patient:call"),
          fetch("/api/auth/check-permission?permission=consultation:complete"),
        ]);

        if (!callRes.ok || !completeRes.ok) {
          console.error("Failed to fetch permissions");
          setCanCallPatient(false);
          setCanMarkComplete(false);
          return;
        }

        // FIX: Type the response data
        const callData: PermissionApiResponse = await callRes.json();
        const completeData: PermissionApiResponse = await completeRes.json();

        setCanCallPatient(callData.hasPermission || false);
        setCanMarkComplete(completeData.hasPermission || false);
      } catch (error) {
        console.error("Error fetching permissions:", error);
        setCanCallPatient(false);
        setCanMarkComplete(false);
      } finally {
        setLoadingPermissions(false);
      }
    };

    checkPermissions();
  }, []);

  useEffect(() => {
    const fetchPatientQueue = async () => {
      // Don't set loading to true on interval refresh to avoid flicker
      // setLoading(true);
      setError(null);

      try {
        const formattedDate = date.toISOString().split("T")[0];
        const response = await fetch(`/api/opd/queue?date=${formattedDate}`);

        if (!response.ok) {
          let errorMsg = "Failed to fetch patient queue";
          try {
            const errorData: ApiErrorResponse = await response.json();
            errorMsg = errorData.error || errorMsg;
          } catch (jsonError) { /* Ignore */ }
          throw new Error(errorMsg);
        }

        // FIX: Type the response data and ensure it's an array
        const data: PatientQueueApiResponse = await response.json();
        if (Array.isArray(data)) {
          setPatients(data);
        } else {
          console.warn("Unexpected API response format for patient queue:", data);
          setPatients([]);
        }
      } catch (err: unknown) { // FIX: Use unknown
        const messageText = err instanceof Error ? err.message : "An unknown error occurred";
        setError(messageText);
        console.error("Error fetching patient queue:", err);
      } finally {
        // Only set loading false on initial fetch
        if (loading) setLoading(false);
      }
    };

    fetchPatientQueue();

    // Set up polling to refresh the queue every minute
    const intervalId = setInterval(fetchPatientQueue, 60000);

    return () => clearInterval(intervalId);
  }, [date, loading]); // Added loading dependency to manage initial load state

  const handleCallPatient = async (patientId: number) => {
    try {
      const response = await fetch(`/api/opd/queue/${patientId}/call`, {
        method: "POST",
      });

      if (!response.ok) {
        let errorMsg = "Failed to call patient";
        try {
          const errorData: ApiErrorResponse = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (jsonError) { /* Ignore */ }
        throw new Error(errorMsg);
      }

      // Update the patient status in the local state
      setPatients(patients.map(patient => 
        patient.id === patientId 
          ? { ...patient, status: "in-progress" } 
          : patient
      ));

    } catch (err: unknown) { // FIX: Use unknown
      const messageText = err instanceof Error ? err.message : "An unknown error occurred";
      console.error("Error calling patient:", err);
      // TODO: Show error notification
      alert(`Error: ${messageText}`); // Placeholder alert
    }
  };

  const handleCompleteConsultation = async (patientId: number) => {
    try {
      const response = await fetch(`/api/opd/queue/${patientId}/complete`, {
        method: "POST",
      });

      if (!response.ok) {
        let errorMsg = "Failed to complete consultation";
        try {
          const errorData: ApiErrorResponse = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (jsonError) { /* Ignore */ }
        throw new Error(errorMsg);
      }

      // Update the patient status in the local state
      setPatients(patients.map(patient => 
        patient.id === patientId 
          ? { ...patient, status: "completed" } 
          : patient
      ));

    } catch (err: unknown) { // FIX: Use unknown
      const messageText = err instanceof Error ? err.message : "An unknown error occurred";
      console.error("Error completing consultation:", err);
      // TODO: Show error notification
      alert(`Error: ${messageText}`); // Placeholder alert
    }
  };

  const getStatusBadge = (status: Patient["status"]) => {
    switch (status) {
      case "waiting":
        return <Badge variant="outline">Waiting</Badge>;
      case "in-progress":
        return <Badge variant="default">In Progress</Badge>;
      case "completed":
        // Assuming a 'success' variant exists or is styled globally
        return <Badge variant="default" className="bg-green-500 text-white hover:bg-green-600">Completed</Badge>; 
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatWaitingTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return `${hours}h ${remainingMinutes}m`;
  };

  if (loading || loadingPermissions) {
    return <div className="flex justify-center p-4">Loading patient queue...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }

  if (patients.length === 0) {
    return <div className="text-center p-4">No patients in the queue.</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Current Queue</h3>
        {/* Removed logo from here as it's likely in the main layout */}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Token</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Check-in Time</TableHead>
            <TableHead>Waiting</TableHead>
            <TableHead>Doctor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.map((patient) => (
            <TableRow key={patient.id} className={patient.status === "waiting" && patient.waitingTime > 30 ? "bg-red-50 dark:bg-red-900/20" : ""}>
              <TableCell className="font-medium">{patient.tokenNumber}</TableCell>
              <TableCell>{patient.name}</TableCell>
              <TableCell>{new Date(patient.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</TableCell>
              <TableCell>{formatWaitingTime(patient.waitingTime)}</TableCell>
              <TableCell>{patient.doctorName}</TableCell>
              <TableCell>{getStatusBadge(patient.status)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {canCallPatient && patient.status === "waiting" && (
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => handleCallPatient(patient.id)}
                    >
                      Call
                    </Button>
                  )}

                  {canMarkComplete && patient.status === "in-progress" && (
                    <Button 
                      // Assuming a 'success' variant exists or is styled globally
                      variant="default" 
                      className="bg-green-500 hover:bg-green-600 text-white"
                      size="sm"
                      onClick={() => handleCompleteConsultation(patient.id)}
                    >
                      Complete
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


