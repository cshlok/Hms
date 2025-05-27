import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

interface NursingNote {
  id: string;
  date: string;
  time: string;
  nurse: string;
  note: string;
  category: 'assessment' | 'medication' | 'intervention' | 'observation';
}

interface NursingNotesProps {
  patientId: string;
  patientName: string;
  notes: NursingNote[];
}

/**
 * IPD Nursing Notes component
 */
export function NursingNotes({ patientId, patientName, notes }: NursingNotesProps) {
  const getCategoryLabel = (category: string) => {
    switch(category) {
      case 'assessment': return 'Assessment';
      case 'medication': return 'Medication';
      case 'intervention': return 'Intervention';
      case 'observation': return 'Observation';
      default: return 'Other';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nursing Notes - {patientName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button>Add Nursing Note</Button>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Nurse</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No nursing notes available
                  </TableCell>
                </TableRow>
              ) : (
                notes.map((note) => (
                  <TableRow key={note.id}>
                    <TableCell>{note.date}</TableCell>
                    <TableCell>{note.time}</TableCell>
                    <TableCell>{note.nurse}</TableCell>
                    <TableCell>{getCategoryLabel(note.category)}</TableCell>
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
