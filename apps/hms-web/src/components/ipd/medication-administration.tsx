import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Medication {
  id: string;
  name: string;
  dose: string;
  route: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'discontinued' | 'completed';
}

interface MedicationAdministration {
  id: string;
  medicationId: string;
  medicationName: string;
  dose: string;
  route: string;
  scheduledTime: string;
  administeredTime?: string;
  administeredBy?: string;
  status: 'scheduled' | 'administered' | 'missed' | 'delayed';
  notes?: string;
}

interface MedicationAdministrationProps {
  patientId: string;
  patientName: string;
  medications: Medication[];
  administrations: MedicationAdministration[];
}

/**
 * IPD Medication Administration component
 */
export function MedicationAdministration({ 
  patientId, 
  patientName, 
  medications, 
  administrations 
}: MedicationAdministrationProps) {
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'scheduled': return <Badge variant="secondary">Scheduled</Badge>;
      case 'administered': return <Badge variant="success">Administered</Badge>;
      case 'missed': return <Badge variant="danger">Missed</Badge>;
      case 'delayed': return <Badge variant="warning">Delayed</Badge>;
      default: return <Badge>Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Medication Administration - {patientName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Current Medications</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medication</TableHead>
                  <TableHead>Dose</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {medications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      No medications prescribed
                    </TableCell>
                  </TableRow>
                ) : (
                  medications.map((medication) => (
                    <TableRow key={medication.id}>
                      <TableCell className="font-medium">{medication.name}</TableCell>
                      <TableCell>{medication.dose}</TableCell>
                      <TableCell>{medication.route}</TableCell>
                      <TableCell>{medication.frequency}</TableCell>
                      <TableCell>{medication.startDate}</TableCell>
                      <TableCell>{medication.endDate || '-'}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            medication.status === 'active' ? 'success' : 
                            medication.status === 'discontinued' ? 'danger' : 
                            'secondary'
                          }
                        >
                          {medication.status.charAt(0).toUpperCase() + medication.status.slice(1)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">Administration Schedule</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medication</TableHead>
                  <TableHead>Dose</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Scheduled Time</TableHead>
                  <TableHead>Administered Time</TableHead>
                  <TableHead>Administered By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {administrations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      No medication administrations scheduled
                    </TableCell>
                  </TableRow>
                ) : (
                  administrations.map((administration) => (
                    <TableRow key={administration.id}>
                      <TableCell className="font-medium">{administration.medicationName}</TableCell>
                      <TableCell>{administration.dose}</TableCell>
                      <TableCell>{administration.route}</TableCell>
                      <TableCell>{administration.scheduledTime}</TableCell>
                      <TableCell>{administration.administeredTime || '-'}</TableCell>
                      <TableCell>{administration.administeredBy || '-'}</TableCell>
                      <TableCell>{getStatusBadge(administration.status)}</TableCell>
                      <TableCell>
                        {administration.status === 'scheduled' && (
                          <Button size="sm">Administer</Button>
                        )}
                        {administration.status !== 'scheduled' && (
                          <Button variant="outline" size="sm">View</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
