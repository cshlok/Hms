import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Theatre {
  id: string;
  name: string;
  type: string;
  status: 'available' | 'occupied' | 'maintenance';
  currentProcedure?: string;
  nextAvailable?: string;
}

interface OTTheatreListProps {
  theatres: Theatre[];
}

/**
 * Operation Theatre list component
 */
export function OTTheatreList({ theatres }: OTTheatreListProps) {
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'available': return <Badge variant="success">Available</Badge>;
      case 'occupied': return <Badge variant="danger">Occupied</Badge>;
      case 'maintenance': return <Badge variant="warning">Maintenance</Badge>;
      default: return <Badge>Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Operation Theatres</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Theatre</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Current Procedure</TableHead>
              <TableHead>Next Available</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {theatres.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  No theatres available
                </TableCell>
              </TableRow>
            ) : (
              theatres.map((theatre) => (
                <TableRow key={theatre.id}>
                  <TableCell className="font-medium">{theatre.name}</TableCell>
                  <TableCell>{theatre.type}</TableCell>
                  <TableCell>{getStatusBadge(theatre.status)}</TableCell>
                  <TableCell>{theatre.currentProcedure || 'None'}</TableCell>
                  <TableCell>{theatre.nextAvailable || 'Now'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
