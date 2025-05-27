import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface ChecklistTemplate {
  id: string;
  name: string;
  surgeryType: string;
  itemCount: number;
  lastUpdated: string;
  status: 'active' | 'draft' | 'archived';
}

interface OTChecklistTemplateListProps {
  templates: ChecklistTemplate[];
}

/**
 * Operation Theatre checklist template list component
 */
export function OTChecklistTemplateList({ templates }: OTChecklistTemplateListProps) {
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'active': return <Badge variant="success">Active</Badge>;
      case 'draft': return <Badge variant="secondary">Draft</Badge>;
      case 'archived': return <Badge>Archived</Badge>;
      default: return <Badge>Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Surgical Checklists</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Checklist Name</TableHead>
              <TableHead>Surgery Type</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  No checklist templates available
                </TableCell>
              </TableRow>
            ) : (
              templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>{template.surgeryType}</TableCell>
                  <TableCell>{template.itemCount}</TableCell>
                  <TableCell>{template.lastUpdated}</TableCell>
                  <TableCell>{getStatusBadge(template.status)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
