import React from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  chiefComplaint: string;
  triageLevel: 1 | 2 | 3 | 4 | 5;
  arrivalTime: string;
  waitTime: string;
  status: 'waiting' | 'in-progress' | 'ready-for-discharge' | 'discharged';
  assignedTo?: string;
  location?: string;
}

interface ERPatientTrackingBoardProps {
  patients: Patient[];
}

/**
 * Emergency Room patient tracking board component
 */
export function ERPatientTrackingBoard({ patients }: ERPatientTrackingBoardProps) {
  const getTriageBadge = (level: number) => {
    switch(level) {
      case 1: return <Badge variant="danger">Level 1</Badge>;
      case 2: return <Badge variant="danger">Level 2</Badge>;
      case 3: return <Badge variant="warning">Level 3</Badge>;
      case 4: return <Badge variant="secondary">Level 4</Badge>;
      case 5: return <Badge variant="secondary">Level 5</Badge>;
      default: return <Badge>Unknown</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'waiting': return <Badge variant="secondary">Waiting</Badge>;
      case 'in-progress': return <Badge variant="warning">In Progress</Badge>;
      case 'ready-for-discharge': return <Badge variant="success">Ready for Discharge</Badge>;
      case 'discharged': return <Badge>Discharged</Badge>;
      default: return <Badge>Unknown</Badge>;
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
            <TableHead>Chief Complaint</TableHead>
            <TableHead>Triage</TableHead>
            <TableHead>Wait Time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Provider</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center">
                No patients in the emergency department
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
                <TableCell>{patient.chiefComplaint}</TableCell>
                <TableCell>{getTriageBadge(patient.triageLevel)}</TableCell>
                <TableCell>{patient.waitTime}</TableCell>
                <TableCell>{getStatusBadge(patient.status)}</TableCell>
                <TableCell>{patient.location || 'Waiting Area'}</TableCell>
                <TableCell>{patient.assignedTo || 'Unassigned'}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
