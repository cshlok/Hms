"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, ArrowRight, Loader2 } from "lucide-react"; // Added Loader2
import Link from "next/link";
import { toast } from "@/components/ui/use-toast"; // Import toast

// Define the structure for a surgery booking
interface Surgery {
  id: string;
  scheduled_start_time: string; // ISO string or Date object
  scheduled_end_time: string; // ISO string or Date object
  status: "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled";
  surgery_name: string;
  theatre_name: string;
  surgeon_name: string;
}

interface OTPatientSurgeriesProperties {
  patientId: string;
}

export default function OTPatientSurgeries({
  patientId,
}: OTPatientSurgeriesProperties) {
  // FIX: Use the Surgery interface for state typing
  const [surgeries, setSurgeries] = useState<Surgery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>();

  useEffect(() => {
    const fetchPatientSurgeries = async () => {
      try {
        setLoading(true);
        setError(undefined);

        // TODO: Replace with actual API call
        // const response = await fetch(`/api/ot/bookings?patientId=${patientId}&status=upcoming`); // Example: Fetch only upcoming
        // if (!response.ok) {
        //   throw new Error(`Failed to fetch patient surgeries: ${response.statusText}`);
        // }
        // const data: { results: Surgery[] } | Surgery[] = await response.json();
        // const fetchedSurgeries = Array.isArray(data) ? data : data.results || [];
        // setSurgeries(fetchedSurgeries);

        // Mock data for demonstration - Ensure it matches the Surgery interface
        const mockData: Surgery[] = [
          {
            id: "booking-1",
            scheduled_start_time: "2025-05-02T09:00:00Z",
            scheduled_end_time: "2025-05-02T11:30:00Z",
            status: "scheduled",
            surgery_name: "Appendectomy",
            theatre_name: "OT-1",
            surgeon_name: "Dr. Alice Brown",
          },
          {
            id: "booking-2",
            scheduled_start_time: "2025-04-28T14:00:00Z",
            scheduled_end_time: "2025-04-28T16:00:00Z",
            status: "completed", // Example of a past surgery
            surgery_name: "Wound Debridement",
            theatre_name: "OT-3",
            surgeon_name: "Dr. Bob White",
          },
        ];
        // Example: Filter mock data to show only upcoming/scheduled
        setSurgeries(
          mockData.filter(
            (s) => s.status === "scheduled" || s.status === "confirmed"
          )
        );
      } catch (error_: unknown) {
        // FIX: Use unknown for error type
        const message =
          error_ instanceof Error
            ? error_.message
            : "An unknown error occurred";
        console.error("Error fetching patient surgeries:", message);
        setError(message);
        toast({
          title: "Error",
          description: `Failed to load surgeries: ${message}`,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (patientId) {
      fetchPatientSurgeries();
    }
  }, [patientId]);

  // FIX: Type the status parameter using the Surgery interface
  const getStatusBadge = (status: Surgery["status"]) => {
    switch (status) {
      case "scheduled": {
        return <Badge variant="secondary">Scheduled</Badge>;
      }
      case "confirmed": {
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            Confirmed
          </Badge>
        );
      }
      case "in_progress": {
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            In Progress
          </Badge>
        );
      }
      case "completed": {
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Completed
          </Badge>
        );
      }
      case "cancelled": {
        return <Badge variant="destructive">Cancelled</Badge>;
      }
      default: {
        return <Badge>{status}</Badge>;
      } // Fallback for unexpected statuses
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Invalid Date";
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "Invalid Time";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Calendar className="mr-2 h-5 w-5 text-primary" />
          Upcoming Surgeries & Procedures
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex justify-center items-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2">Loading surgeries...</span>
          </div>
        )}
        {error && (
          <div className="text-center py-4 text-red-600 border border-red-200 bg-red-50 rounded-md">
            Error loading surgeries: {error}
          </div>
        )}
        {!loading && !error && surgeries.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            No upcoming surgeries scheduled for this patient.
          </div>
        )}
        {!loading && !error && surgeries.length > 0 && (
          <div className="overflow-x-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Procedure</TableHead>
                  <TableHead>Theatre</TableHead>
                  <TableHead>Surgeon</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* FIX: Explicitly type the surgery parameter */}
                {surgeries.map((surgery: Surgery) => (
                  <TableRow key={surgery.id}>
                    <TableCell>
                      <div className="font-medium">
                        {formatDate(surgery.scheduled_start_time)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatTime(surgery.scheduled_start_time)} -{" "}
                        {formatTime(surgery.scheduled_end_time)}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {surgery.surgery_name}
                    </TableCell>
                    <TableCell>{surgery.theatre_name}</TableCell>
                    <TableCell>{surgery.surgeon_name}</TableCell>
                    <TableCell>{getStatusBadge(surgery.status)}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/dashboard/ot/bookings/${surgery.id}`}
                        passHref
                      >
                        <Button variant="outline" size="sm">
                          View <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {/* Link to view all surgeries (past and future) */}
        <div className="mt-4 flex justify-end">
          <Link href={`/dashboard/ot?patientId=${patientId}`} passHref>
            <Button variant="outline" size="sm">
              View Full OT Schedule
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
