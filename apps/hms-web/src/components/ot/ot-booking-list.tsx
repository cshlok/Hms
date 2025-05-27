import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Booking {
  id: string;
  patientName: string;
  patientId: string;
  surgeryType: string;
  surgeon: string;
  theatre: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
}

interface OTBookingListProps {
  bookings: Booking[];
}

/**
 * Operation Theatre booking list component
 */
export function OTBookingList({ bookings }: OTBookingListProps) {
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'scheduled': return <Badge variant="secondary">Scheduled</Badge>;
      case 'in-progress': return <Badge variant="warning">In Progress</Badge>;
      case 'completed': return <Badge variant="success">Completed</Badge>;
      case 'cancelled': return <Badge variant="danger">Cancelled</Badge>;
      default: return <Badge>Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Surgeries</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Surgery</TableHead>
              <TableHead>Surgeon</TableHead>
              <TableHead>Theatre</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  No surgeries scheduled
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>
                    <div className="font-medium">{booking.patientName}</div>
                    <div className="text-sm text-gray-500">ID: {booking.patientId}</div>
                  </TableCell>
                  <TableCell>{booking.surgeryType}</TableCell>
                  <TableCell>{booking.surgeon}</TableCell>
                  <TableCell>{booking.theatre}</TableCell>
                  <TableCell>
                    <div>{booking.scheduledDate}</div>
                    <div className="text-sm text-gray-500">{booking.scheduledTime}</div>
                  </TableCell>
                  <TableCell>{booking.duration}</TableCell>
                  <TableCell>{getStatusBadge(booking.status)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
