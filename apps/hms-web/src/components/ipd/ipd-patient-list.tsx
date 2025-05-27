import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface IPDPatient {
  id: string;
  name: string;
  age: number;
  gender: string;
  admissionDate: string;
  diagnosis: string;
  ward: string;
  bedNumber: string;
  attendingDoctor: string;
  status: 'stable' | 'critical' | 'improving' | 'deteriorating';
}

interface IPDPatientListProps {
  patients: IPDPatient[];
  onViewPatient: (patientId: string) => void;
}

/**
 * IPD Patient List component
 */
export function IPDPatientList({ patients, onViewPatient }: IPDPatientListProps) {
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'stable': return <Badge variant="success">Stable</Badge>;
      case 'critical': return <Badge variant="danger">Critical</Badge>;
      case 'improving': return <Badge variant="info">Improving</Badge>;
      case 'deteriorating': return <Badge variant="warning">Deteriorating</Badge>;
      default: return <Badge>Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inpatient List</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Admission Date</TableHead>
              <TableHead>Diagnosis</TableHead>
              <TableHead>Ward/Bed</TableHead>
              <TableHead>Attending Doctor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  No inpatients found
                </TableCell>
              </TableRow>
            ) : (
              patients.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell>
                    <div className="font-medium">{patient.name}</div>
                    <div className="text-sm text-gray-500">
                      {patient.age} yrs, {patient.gender}
                    </div>
                  </TableCell>
                  <TableCell>{patient.admissionDate}</TableCell>
                  <TableCell>{patient.diagnosis}</TableCell>
                  <TableCell>{patient.ward} / {patient.bedNumber}</TableCell>
                  <TableCell>{patient.attendingDoctor}</TableCell>
                  <TableCell>{getStatusBadge(patient.status)}</TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onViewPatient(patient.id)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
