import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

interface RadiologyOrderListProps {
  orders: RadiologyOrder[];
  onViewOrder: (orderId: string) => void;
}

/**
 * Radiology order list component
 */
export function RadiologyOrderList({ orders, onViewOrder }: RadiologyOrderListProps) {
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
        <CardTitle>Radiology Orders</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Order Date</TableHead>
              <TableHead>Study Type</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  No radiology orders found
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="font-medium">{order.patientName}</div>
                    <div className="text-sm text-gray-500">ID: {order.patientId}</div>
                  </TableCell>
                  <TableCell>{order.orderDate}</TableCell>
                  <TableCell>{order.studyType}</TableCell>
                  <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell>{order.requestedBy}</TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onViewOrder(order.id)}
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
