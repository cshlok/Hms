import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface RadiologyReport {
  id: string;
  patientName: string;
  patientId: string;
  reportDate: string;
  studyType: string;
  modality: string;
  status: 'draft' | 'preliminary' | 'final' | 'amended';
  radiologist: string;
  findings: string;
  impression: string;
  recommendations: string;
}

interface RadiologyReportDetailProps {
  report: RadiologyReport;
}

/**
 * Radiology report detail component
 */
export function RadiologyReportDetail({ report }: RadiologyReportDetailProps) {
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
        <CardTitle>Radiology Report</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Patient Information</h3>
              <div className="mt-2 space-y-1">
                <p className="text-base font-medium">{report.patientName}</p>
                <p className="text-sm text-gray-500">ID: {report.patientId}</p>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Report Information</h3>
              <div className="mt-2 space-y-1">
                <p className="text-base font-medium">Report #{report.id}</p>
                <p className="text-sm text-gray-500">Date: {report.reportDate}</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Study Type</h3>
              <p className="mt-2 text-base">{report.studyType}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Modality</h3>
              <p className="mt-2 text-base">{report.modality}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Status</h3>
              <div className="mt-2">{getStatusBadge(report.status)}</div>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Radiologist</h3>
            <p className="mt-2 text-base">{report.radiologist}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Findings</h3>
            <p className="mt-2 text-base whitespace-pre-line">{report.findings}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Impression</h3>
            <p className="mt-2 text-base whitespace-pre-line">{report.impression}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Recommendations</h3>
            <p className="mt-2 text-base whitespace-pre-line">{report.recommendations}</p>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline">Print Report</Button>
            {report.status !== 'final' && (
              <Button>Finalize Report</Button>
            )}
            {report.status === 'final' && (
              <Button>Amend Report</Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
