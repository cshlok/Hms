import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

interface ProgressNote {
  id: string;
  date: string;
  time: string;
  doctor: string;
  note: string;
}

interface PatientProgressNotesProps {
  patientId: string;
  patientName: string;
  notes: ProgressNote[];
}

/**
 * IPD Patient Progress Notes component
 */
export function PatientProgressNotes({ patientId, patientName, notes }: PatientProgressNotesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Progress Notes - {patientName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button>Add Progress Note</Button>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No progress notes available
                  </TableCell>
                </TableRow>
              ) : (
                notes.map((note) => (
                  <TableRow key={note.id}>
                    <TableCell>{note.date}</TableCell>
                    <TableCell>{note.time}</TableCell>
                    <TableCell>{note.doctor}</TableCell>
                    <TableCell>
                      <div className="max-w-md overflow-hidden text-ellipsis whitespace-nowrap">
                        {note.note}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">View</Button>
                        <Button variant="outline" size="sm">Edit</Button>
                      </div>
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
