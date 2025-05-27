import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  images: string[];
  notes: string;
}

interface RadiologyStudyDetailProps {
  study: RadiologyStudy;
}

/**
 * Radiology study detail component
 */
export function RadiologyStudyDetail({ study }: RadiologyStudyDetailProps) {
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
        <CardTitle>Radiology Study</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Patient Information</h3>
              <div className="mt-2 space-y-1">
                <p className="text-base font-medium">{study.patientName}</p>
                <p className="text-sm text-gray-500">ID: {study.patientId}</p>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Study Information</h3>
              <div className="mt-2 space-y-1">
                <p className="text-base font-medium">Study #{study.id}</p>
                <p className="text-sm text-gray-500">Date: {study.studyDate}</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Study Type</h3>
              <p className="mt-2 text-base">{study.studyType}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Modality</h3>
              <p className="mt-2 text-base">{study.modality}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Body Part</h3>
              <p className="mt-2 text-base">{study.bodyPart}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Status</h3>
              <div className="mt-2">{getStatusBadge(study.status)}</div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Technician</h3>
              <p className="mt-2 text-base">{study.technician}</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Images</h3>
            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
              {study.images.length === 0 ? (
                <p>No images available</p>
              ) : (
                study.images.map((image, index) => (
                  <div key={index} className="border rounded-md p-2">
                    <div className="aspect-square bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-500">Image {index + 1}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Notes</h3>
            <p className="mt-2 text-base whitespace-pre-line">{study.notes}</p>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline">Print Study</Button>
            {study.status !== 'completed' && (
              <Button>Complete Study</Button>
            )}
            {study.status === 'completed' && (
              <Button>Create Report</Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
