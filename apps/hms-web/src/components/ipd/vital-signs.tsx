import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

interface VitalSign {
  id: string;
  date: string;
  time: string;
  temperature: string;
  pulse: string;
  respiration: string;
  bloodPressure: string;
  oxygenSaturation: string;
  recordedBy: string;
}

interface VitalSignsProps {
  patientId: string;
  patientName: string;
  vitalSigns: VitalSign[];
}

/**
 * IPD Vital Signs component
 */
export function VitalSigns({ patientId, patientName, vitalSigns }: VitalSignsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vital Signs - {patientName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button>Record Vital Signs</Button>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Temp (°C)</TableHead>
                <TableHead>Pulse (bpm)</TableHead>
                <TableHead>Resp (/min)</TableHead>
                <TableHead>BP (mmHg)</TableHead>
                <TableHead>SpO2 (%)</TableHead>
                <TableHead>Recorded By</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vitalSigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">
                    No vital signs recorded
                  </TableCell>
                </TableRow>
              ) : (
                vitalSigns.map((vitalSign) => (
                  <TableRow key={vitalSign.id}>
                    <TableCell>{vitalSign.date}</TableCell>
                    <TableCell>{vitalSign.time}</TableCell>
                    <TableCell>{vitalSign.temperature}</TableCell>
                    <TableCell>{vitalSign.pulse}</TableCell>
                    <TableCell>{vitalSign.respiration}</TableCell>
                    <TableCell>{vitalSign.bloodPressure}</TableCell>
                    <TableCell>{vitalSign.oxygenSaturation}</TableCell>
                    <TableCell>{vitalSign.recordedBy}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">Edit</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
