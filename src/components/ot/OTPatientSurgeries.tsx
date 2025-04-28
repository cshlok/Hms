"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Clock, User, FileText, ArrowRight } from "lucide-react";
import Link from "next/link";

// This component integrates OT module with IPD module
// It shows upcoming surgeries for an admitted patient

interface OTPatientSurgeriesProps {
  patientId: string;
}

export default function OTPatientSurgeries({ patientId }: OTPatientSurgeriesProps) {
  const [surgeries, setSurgeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatientSurgeries = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Replace with actual API call
        // const response = await fetch(`/api/ot/bookings?patientId=${patientId}`);
        // if (!response.ok) {
        //   throw new Error("Failed to fetch patient surgeries");
        // }
        // const data = await response.json();
        // setSurgeries(data);

        // Mock data for demonstration
        const mockData = [
          {
            id: "booking-1",
            scheduled_start_time: "2025-05-02T09:00:00Z",
            scheduled_end_time: "2025-05-02T11:30:00Z",
            status: "scheduled",
            surgery_name: "Appendectomy",
            theatre_name: "OT-1",
            surgeon_name: "Dr. Alice Brown"
          },
          {
            id: "booking-2",
            scheduled_start_time: "2025-04-28T14:00:00Z",
            scheduled_end_time: "2025-04-28T16:00:00Z",
            status: "completed",
            surgery_name: "Wound Debridement",
            theatre_name: "OT-3",
            surgeon_name: "Dr. Bob White"
          }
        ];
        setSurgeries(mockData);

        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    if (patientId) {
      fetchPatientSurgeries();
    }
  }, [patientId]);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "scheduled": return <Badge variant="secondary">Scheduled</Badge>;
      case "confirmed": return <Badge className="bg-blue-100 text-blue-800">Confirmed</Badge>;
      case "in_progress": return <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>;
      case "completed": return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case "cancelled": return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <Calendar className="mr-2 h-5 w-5" />
          Surgeries & Procedures
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <div>Loading surgeries...</div>}
        {error && <div className="text-red-500">Error: {error}</div>}
        {!loading && !error && surgeries.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            No surgeries scheduled for this patient.
          </div>
        )}
        {!loading && !error && surgeries.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Procedure</TableHead>
                <TableHead>Theatre</TableHead>
                <TableHead>Surgeon</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {surgeries.map((surgery: any) => (
                <TableRow key={surgery.id}>
                  <TableCell>
                    <div className="font-medium">{formatDate(surgery.scheduled_start_time)}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatTime(surgery.scheduled_start_time)} - {formatTime(surgery.scheduled_end_time)}
                    </div>
                  </TableCell>
                  <TableCell>{surgery.surgery_name}</TableCell>
                  <TableCell>{surgery.theatre_name}</TableCell>
                  <TableCell>{surgery.surgeon_name}</TableCell>
                  <TableCell>{getStatusBadge(surgery.status)}</TableCell>
                  <TableCell>
                    <Link href={`/dashboard/ot/bookings/${surgery.id}`}>
                      <Button variant="ghost" size="sm">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="mt-4 flex justify-end">
          <Link href={`/dashboard/ot?patientId=${patientId}`}>
            <Button variant="outline" size="sm">
              View All Surgeries
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
