import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface RadiologyOrder {
  id: string;
  patientName: string;
  patientId: string;
  orderDate: string;
  studyType: string;
  priority: 'routine' | 'urgent' | 'stat';
  status: 'ordered' | 'scheduled' | 'in-progress' | 'completed' | 'reported';
  requestedBy: string;
}

interface RadiologyOrderDetailProps {
  order: RadiologyOrder;
}

/**
 * Radiology order detail component
 */
export function RadiologyOrderDetail({ order }: RadiologyOrderDetailProps) {
  const getPriorityBadge = (priority: string) => {
    switch(priority) {
      case 'routine': return <Badge variant="secondary">Routine</Badge>;
      case 'urgent': return <Badge variant="warning">Urgent</Badge>;
      case 'stat': return <Badge variant="danger">STAT</Badge>;
      default: return <Badge>Unknown</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'ordered': return <Badge variant="secondary">Ordered</Badge>;
      case 'scheduled': return <Badge variant="secondary">Scheduled</Badge>;
      case 'in-progress': return <Badge variant="warning">In Progress</Badge>;
      case 'completed': return <Badge variant="success">Completed</Badge>;
      case 'reported': return <Badge variant="success">Reported</Badge>;
      default: return <Badge>Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Radiology Order Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Patient Information</h3>
              <div className="mt-2 space-y-1">
                <p className="text-base font-medium">{order.patientName}</p>
                <p className="text-sm text-gray-500">ID: {order.patientId}</p>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Order Information</h3>
              <div className="mt-2 space-y-1">
                <p className="text-base font-medium">Order #{order.id}</p>
                <p className="text-sm text-gray-500">Date: {order.orderDate}</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Study Type</h3>
              <p className="mt-2 text-base">{order.studyType}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Priority</h3>
              <div className="mt-2">{getPriorityBadge(order.priority)}</div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Status</h3>
              <div className="mt-2">{getStatusBadge(order.status)}</div>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Requested By</h3>
            <p className="mt-2 text-base">{order.requestedBy}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Clinical Information</h3>
            <p className="mt-2 text-base">
              Patient presented with symptoms requiring radiological investigation.
              Further clinical details available in patient record.
            </p>
          </div>
          
          <div className="flex justify-end space-x-2">
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              Print Order
            </button>
            <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
              Update Status
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
