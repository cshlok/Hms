"use client";

import React, { useState, useEffect } from "react"; // Added useState, useEffect
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast"; // Added useToast

// Define Patient interface (assuming structure based on usage)
interface Patient {
  id: string; // Changed to string based on usage in handlers
  name: string;
  tokenNumber: number;
  checkInTime: string; // Keep as string, format on display
  waitingTime: number; // in minutes
  status: "waiting" | "in-progress" | "completed" | "cancelled";
  doctorName: string; // Assuming this comes from API
}

// Define API response types
// interface PermissionApiResponse {
//   hasPermission?: boolean;
//   error?: string;
// }

// Assuming the API returns an array directly, adjust if it returns { results: Patient[] }
// type PatientsQueueApiResponse = Patient[];

// interface ApiErrorResponse {
//   error?: string;
// }

interface OPDPatientQueueProperties {
  date: Date; // Keep date prop if needed, though unused in current logic
}

// Mock permission check function (replace with actual API call)
const checkPermission = async (permission: string): Promise<boolean> => {
  console.log(`Checking permission: ${permission}`);
  // Replace with actual API call to /api/session/check-permission
  await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay
  // For now, grant permissions for testing
  if (permission === "opd.call_patient" || permission === "opd.mark_complete") {
      return true;
  }
  return false;
};

// Mock fetch patients function (replace with actual API call)
const fetchPatientsQueue = async (): Promise<Patient[]> => {
  console.log("Fetching patients queue...");
  // Replace with actual API call to /api/opd-visits?status=waiting,in-progress or similar
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  // Return mock data for testing
  const now = new Date();
  return [
    { id: "pat1", name: "John Doe", tokenNumber: 101, checkInTime: new Date(now.getTime() - 45 * 60000).toISOString(), waitingTime: 45, status: "waiting", doctorName: "Dr. Smith" },
    { id: "pat2", name: "Jane Smith", tokenNumber: 102, checkInTime: new Date(now.getTime() - 20 * 60000).toISOString(), waitingTime: 20, status: "in-progress", doctorName: "Dr. Jones" },
    { id: "pat3", name: "Peter Pan", tokenNumber: 103, checkInTime: new Date(now.getTime() - 5 * 60000).toISOString(), waitingTime: 5, status: "waiting", doctorName: "Dr. Smith" },
  ];
};

// Mock API call function (replace with actual fetch calls)
const callPatientApi = async (patientId: string): Promise<{ success: boolean; error?: string }> => {
    console.log(`Calling patient ${patientId}...`);
    // Replace with actual API call, e.g., POST /api/opd-visits/${patientId}/call
    await new Promise(resolve => setTimeout(resolve, 300));
    return { success: true };
};

const completeConsultationApi = async (patientId: string): Promise<{ success: boolean; error?: string }> => {
    console.log(`Completing consultation for patient ${patientId}...`);
    // Replace with actual API call, e.g., POST /api/opd-visits/${patientId}/complete
    await new Promise(resolve => setTimeout(resolve, 300));
    return { success: true };
};


// Helper function to format waiting time
const formatWaitingTime = (minutes: number) => {
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

// Helper function to get status badge
const getStatusBadge = (status: Patient["status"]) => {
  switch (status) {
    case "waiting": return <Badge variant="outline">Waiting</Badge>;
    case "in-progress": return <Badge variant="default">In Progress</Badge>;
    case "completed": return <Badge variant="default" className="bg-green-500 text-white hover:bg-green-600">Completed</Badge>;
    case "cancelled": return <Badge variant="destructive">Cancelled</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
};

export default function OPDPatientQueue(_props: OPDPatientQueueProperties) {
  const { toast } = useToast(); // Initialize toast

  // State variables
  const [loading, setLoading] = useState<boolean>(true); // Combined loading state
  // const [loadingPermissions, setLoadingPermissions] = useState<boolean>(true); // Removed unused state
  const [patients, setPatients] = useState<Patient[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [canCallPatient, setCanCallPatient] = useState<boolean>(false);
  const [canMarkComplete, setCanMarkComplete] = useState<boolean>(false);

  // Fetch permissions and patient queue
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // setLoadingPermissions(true); // FIX: Removed call to undefined function
      setError(null);
      try {
        // Fetch permissions first
        const [callPerm, completePerm] = await Promise.all([
          checkPermission("opd.call_patient"),
          checkPermission("opd.mark_complete"),
        ]);
        setCanCallPatient(callPerm);
        setCanMarkComplete(completePerm);
        // setLoadingPermissions(false); // FIX: Removed call to undefined function

        // Fetch patients
        const patientsData = await fetchPatientsQueue();
        setPatients(patientsData);

      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "An unknown error occurred";
        console.error("Error fetching OPD queue data:", err);
        setError(message);
        toast({ title: "Error", description: `Failed to load patient queue: ${message}`, variant: "destructive" });
      } finally {
        setLoading(false); // Overall loading finished
        // setLoadingPermissions(false); // Ensure this is false even on error if needed
      }
    };
    fetchData();

    // Optional: Set up interval polling to refresh the queue
    const intervalId = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(intervalId); // Cleanup interval on unmount

  }, [toast]); // Added toast dependency

  // Handler functions
  const handleCallPatient = async (patientId: string) => {
    console.log(`Attempting to call patient: ${patientId}`);
    try {
        const result = await callPatientApi(patientId);
        if (result.success) {
            toast({ title: "Success", description: `Patient ${patientId} called.` });
            // Refresh queue or update patient status locally
            setPatients(prev => prev.map(p => p.id === patientId ? { ...p, status: 'in-progress' } : p));
        } else {
            throw new Error(result.error || "Failed to call patient");
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "An unknown error occurred";
        console.error("Error calling patient:", err);
        toast({ title: "Error", description: `Could not call patient: ${message}`, variant: "destructive" });
    }
  };

  const handleCompleteConsultation = async (patientId: string) => {
    console.log(`Attempting to complete consultation for patient: ${patientId}`);
     try {
        const result = await completeConsultationApi(patientId);
        if (result.success) {
            toast({ title: "Success", description: `Consultation for patient ${patientId} completed.` });
            // Refresh queue or update patient status locally
            setPatients(prev => prev.map(p => p.id === patientId ? { ...p, status: 'completed' } : p));
             // Optionally filter out completed patients after a delay or on next refresh
        } else {
            throw new Error(result.error || "Failed to complete consultation");
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "An unknown error occurred";
        console.error("Error completing consultation:", err);
        toast({ title: "Error", description: `Could not complete consultation: ${message}`, variant: "destructive" });
    }
  };

  // Render logic
  if (loading) { // Use combined loading state
    return (
      <div className="flex justify-center p-4">Loading patient queue...</div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">Error loading queue: {error}</div>;
  }

  if (patients.length === 0) {
    return <div className="text-center p-4 text-muted-foreground">No patients currently in the queue.</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Current OPD Queue</h3>
        {/* Add refresh button? */}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Token</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Check-in</TableHead>
            <TableHead>Waiting</TableHead>
            <TableHead>Doctor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.map((patient) => (
            <TableRow
              key={patient.id}
              className={
                patient.status === "waiting" && patient.waitingTime > 30
                  ? "bg-red-50 dark:bg-red-900/20" // Highlight long waits
                  : ""
              }
            >
              <TableCell className="font-medium">{patient.tokenNumber}</TableCell>
              <TableCell>{patient.name}</TableCell>
              <TableCell>
                {new Date(patient.checkInTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </TableCell>
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
                      disabled={loading} // Disable buttons during actions if needed
                    >
                      Call
                    </Button>
                  )}
                  {canMarkComplete && patient.status === "in-progress" && (
                    <Button
                      variant="default"
                      className="bg-green-500 hover:bg-green-600 text-white"
                      size="sm"
                      onClick={() => handleCompleteConsultation(patient.id)}
                      disabled={loading} // Disable buttons during actions if needed
                    >
                      Complete
                    </Button>
                  )}
                  {/* Add other actions like 'View Details' if needed */}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

