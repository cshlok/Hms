import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface RadiologyReport {
  id: string;
  patientName: string;
  patientId: string;
  reportDate: string;
  studyType: string;
  status: 'draft' | 'preliminary' | 'final' | 'amended';
  radiologist: string;
}

interface RadiologyReportsListProps {
  reports: RadiologyReport[];
  onViewReport: (reportId: string) => void;
}

/**
 * Radiology reports list component
 */
export function RadiologyReportsList({ reports, onViewReport }: RadiologyReportsListProps) {
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'draft': return <Badge variant="secondary">Draft</Badge>;
      case 'preliminary': return <Badge variant="warning">Preliminary</Badge>;
      case 'final': return <Badge variant="success">Final</Badge>;
      case 'amended': return <Badge variant="info">Amended</Badge>;
      default: return <Badge>Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Radiology Reports</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Report Date</TableHead>
              <TableHead>Study Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Radiologist</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  No radiology reports found
                </TableCell>
              </TableRow>
            ) : (
              reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>
                    <div className="font-medium">{report.patientName}</div>
                    <div className="text-sm text-gray-500">ID: {report.patientId}</div>
                  </TableCell>
                  <TableCell>{report.reportDate}</TableCell>
                  <TableCell>{report.studyType}</TableCell>
                  <TableCell>{getStatusBadge(report.status)}</TableCell>
                  <TableCell>{report.radiologist}</TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onViewReport(report.id)}
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
