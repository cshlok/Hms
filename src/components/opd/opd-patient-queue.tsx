"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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

// Assuming the API returns an array directly, adjust if it returns { results: Patient[] }

interface ApiErrorResponse {
  error?: string;
}

interface OPDPatientQueueProperties {
  date: Date;
}

// Helper function to format waiting time
const formatWaitingTime = (minutes: number) => {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
};

// Helper function to get status badge
const getStatusBadge = (status: Patient["status"]) => {
  switch (status) {
    case "waiting": {
      return <Badge variant="outline">Waiting</Badge>;
    }
    case "in-progress": {
      return <Badge variant="default">In Progress</Badge>;
    }
    case "completed": {
      // Assuming a 'success' variant exists or is styled globally
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

export default function OPDPatientQueue({ date: _date }: OPDPatientQueueProperties) {
  if (loading || loadingPermissions) {
    return (
      <div className="flex justify-center p-4">Loading patient queue...</div>
    );
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
            <TableRow
              key={patient.id}
              className={
                patient.status === "waiting" && patient.waitingTime > 30
                  ? "bg-red-50 dark:bg-red-900/20"
                  : ""
              }
            >
              <TableCell className="font-medium">
                {patient.tokenNumber}
              </TableCell>
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
