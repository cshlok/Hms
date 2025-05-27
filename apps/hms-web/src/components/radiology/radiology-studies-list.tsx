import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface RadiologyStudy {
  id: string;
  patientName: string;
  patientId: string;
  studyDate: string;
  studyType: string;
  modality: string;
  bodyPart: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  technician: string;
}

interface RadiologyStudiesListProps {
  studies: RadiologyStudy[];
  onViewStudy: (studyId: string) => void;
}

/**
 * Radiology studies list component
 */
export function RadiologyStudiesList({ studies, onViewStudy }: RadiologyStudiesListProps) {
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
        <CardTitle>Radiology Studies</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Study Date</TableHead>
              <TableHead>Study Type</TableHead>
              <TableHead>Modality</TableHead>
              <TableHead>Body Part</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Technician</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {studies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  No radiology studies found
                </TableCell>
              </TableRow>
            ) : (
              studies.map((study) => (
                <TableRow key={study.id}>
                  <TableCell>
                    <div className="font-medium">{study.patientName}</div>
                    <div className="text-sm text-gray-500">ID: {study.patientId}</div>
                  </TableCell>
                  <TableCell>{study.studyDate}</TableCell>
                  <TableCell>{study.studyType}</TableCell>
                  <TableCell>{study.modality}</TableCell>
                  <TableCell>{study.bodyPart}</TableCell>
                  <TableCell>{getStatusBadge(study.status)}</TableCell>
                  <TableCell>{study.technician}</TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onViewStudy(study.id)}
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
