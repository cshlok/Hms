"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card"; // FIX: Add missing imports
import { Eye, Edit, Trash2, Filter } from "lucide-react";
import { format } from "date-fns";

// Mock data structure - replace with actual API response type
interface Booking {
  id: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  status: string;
  priority: string;
  patient_name: string;
  patient_mrn: string;
  surgery_name: string;
  theatre_name: string;
  surgeon_name: string;
}

export default function OTBookingList() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>();
  const [filters, setFilters] = useState({
    status: "",
    theatreId: "",
    surgeonId: "",
    date: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError(undefined);

        // Construct query parameters based on filters
        const queryParameters = new URLSearchParams();
        if (filters.status) queryParameters.append("status", filters.status);
        if (filters.theatreId)
          queryParameters.append("theatreId", filters.theatreId);
        if (filters.surgeonId)
          queryParameters.append("surgeonId", filters.surgeonId);
        if (filters.date) {
          queryParameters.append("startDate", filters.date);
          queryParameters.append("endDate", filters.date);
        }

        // Replace with actual API call
        // const response = await fetch(`/api/ot/bookings?${queryParams.toString()}`);
        // if (!response.ok) {
        //   throw new Error("Failed to fetch bookings");
        // }
        // const data = await response.json();
        // setBookings(data);

        // Mock data for demonstration
        await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate delay
        const mockData: Booking[] = [
          {
            id: "booking-1",
            scheduled_start_time: "2025-04-28T08:00:00Z",
            scheduled_end_time: "2025-04-28T10:30:00Z",
            status: "completed",
            priority: "routine",
            patient_name: "John Smith",
            patient_mrn: "MRN001",
            surgery_name: "Appendectomy",
            theatre_name: "OT-1",
            surgeon_name: "Dr. Alice Brown",
          },
          {
            id: "booking-2",
            scheduled_start_time: "2025-04-28T09:30:00Z",
            scheduled_end_time: "2025-04-28T12:00:00Z",
            status: "in_progress",
            priority: "urgent",
            patient_name: "Sarah Johnson",
            patient_mrn: "MRN002",
            surgery_name: "Cholecystectomy",
            theatre_name: "OT-2",
            surgeon_name: "Dr. Bob White",
          },
          {
            id: "booking-3",
            scheduled_start_time: "2025-04-28T14:00:00Z",
            scheduled_end_time: "2025-04-28T16:00:00Z",
            status: "scheduled",
            priority: "routine",
            patient_name: "Emily Davis",
            patient_mrn: "MRN004",
            surgery_name: "Thyroidectomy",
            theatre_name: "OT-1",
            surgeon_name: "Dr. Alice Brown",
          },
        ];
        setBookings(
          mockData.filter(
            (b) =>
              (!filters.status || b.status === filters.status) &&
              (!filters.date ||
                format(new Date(b.scheduled_start_time), "yyyy-MM-dd") ===
                  filters.date)
            // Add filtering for theatreId and surgeonId if needed
          )
        );

        setLoading(false);
      } catch (error_: unknown) {
        if (error_ instanceof Error) {
          setError(error_.message);
        } else {
          setError("An unknown error occurred");
        }
        setLoading(false);
      }
    };

    fetchBookings();
  }, [filters]);

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "scheduled": {
        return <Badge variant="secondary">Scheduled</Badge>;
      }
      case "confirmed": {
        return <Badge className="bg-blue-100 text-blue-800">Confirmed</Badge>;
      }
      case "in_progress": {
        return (
          <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>
        );
      }
      case "completed": {
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      }
      case "cancelled": {
        return <Badge variant="destructive">Cancelled</Badge>;
      }
      case "postponed": {
        return (
          <Badge className="bg-purple-100 text-purple-800">Postponed</Badge>
        );
      }
      default: {
        return <Badge>{status}</Badge>;
      }
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Booking List</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" /> Filters
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 border rounded-md bg-muted/40">
            <Input
              type="date"
              value={filters.date}
              onChange={(event) => handleFilterChange("date", event.target.value)}
            />
            <Select
              value={filters.status}
              onValueChange={(value) => handleFilterChange("status", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="postponed">Postponed</SelectItem>
              </SelectContent>
            </Select>
            {/* TODO: Add Selects for Theatre and Surgeon (fetch options from API) */}
            <Input placeholder="Filter by Theatre..." disabled />
            <Input placeholder="Filter by Surgeon..." disabled />
          </div>
        )}

        {loading && <div>Loading bookings...</div>}
        {error && <div className="text-red-500">Error: {error}</div>}
        {!loading && !error && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Surgery</TableHead>
                <TableHead>Theatre</TableHead>
                <TableHead>Surgeon</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No bookings found.
                  </TableCell>
                </TableRow>
              ) : (
                bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      {format(new Date(booking.scheduled_start_time), "HH:mm")}{" "}
                      - {format(new Date(booking.scheduled_end_time), "HH:mm")}
                    </TableCell>
                    <TableCell>
                      {booking.patient_name} ({booking.patient_mrn})
                    </TableCell>
                    <TableCell>{booking.surgery_name}</TableCell>
                    <TableCell>{booking.theatre_name}</TableCell>
                    <TableCell>{booking.surgeon_name}</TableCell>
                    <TableCell>{getStatusBadge(booking.status)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          title="Edit Booking"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {booking.status !== "completed" &&
                          booking.status !== "cancelled" && (
                            <Button
                              variant="destructive"
                              size="icon"
                              title="Cancel Booking"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
