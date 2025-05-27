import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface SurgeryType {
  id: string;
  name: string;
  category: string;
  averageDuration: string;
  specialEquipment: string[];
  specialistRequired: string;
  riskLevel: 'low' | 'medium' | 'high';
}

interface OTSurgeryTypeListProps {
  surgeryTypes: SurgeryType[];
}

/**
 * Operation Theatre surgery type list component
 */
export function OTSurgeryTypeList({ surgeryTypes }: OTSurgeryTypeListProps) {
  const getRiskBadge = (risk: string) => {
    switch(risk) {
      case 'low': return <Badge variant="secondary">Low Risk</Badge>;
      case 'medium': return <Badge variant="warning">Medium Risk</Badge>;
      case 'high': return <Badge variant="danger">High Risk</Badge>;
      default: return <Badge>Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Surgery Types</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Surgery</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Specialist</TableHead>
              <TableHead>Risk Level</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {surgeryTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  No surgery types defined
                </TableCell>
              </TableRow>
            ) : (
              surgeryTypes.map((surgeryType) => (
                <TableRow key={surgeryType.id}>
                  <TableCell className="font-medium">{surgeryType.name}</TableCell>
                  <TableCell>{surgeryType.category}</TableCell>
                  <TableCell>{surgeryType.averageDuration}</TableCell>
                  <TableCell>{surgeryType.specialistRequired}</TableCell>
                  <TableCell>{getRiskBadge(surgeryType.riskLevel)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
