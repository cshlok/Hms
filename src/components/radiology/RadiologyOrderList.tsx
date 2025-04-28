"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import CreateRadiologyOrderModal from "./CreateRadiologyOrderModal";

export default function RadiologyOrderList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/radiology/orders');
      if (!response.ok) {
        throw new Error('Failed to fetch radiology orders');
      }
      const data = await response.json();
      setOrders(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching radiology orders:', err);
      setError('Failed to load radiology orders. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrder = (orderId) => {
    router.push(`/dashboard/radiology/orders/${orderId}`);
  };

  const handleCreateOrder = async (orderData) => {
    try {
      const response = await fetch('/api/radiology/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create radiology order');
      }
      
      setShowCreateModal(false);
      fetchOrders(); // Refresh the list
    } catch (err) {
      console.error('Error creating radiology order:', err);
      alert(err.message);
    }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      pending: "bg-yellow-100 text-yellow-800",
      scheduled: "bg-blue-100 text-blue-800",
      in_progress: "bg-purple-100 text-purple-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800"
    };
    
    return (
      <Badge className={statusStyles[status] || "bg-gray-100"}>
        {status?.charAt(0).toUpperCase() + status?.slice(1).replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Radiology Orders</h2>
          <Button onClick={() => setShowCreateModal(true)}>
            Create New Order
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500 p-4">{error}</div>
        ) : orders.length === 0 ? (
          <div className="text-center text-gray-500 p-4">No radiology orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Procedure</TableHead>
                  <TableHead>Date Ordered</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{order.patient_name}</TableCell>
                    <TableCell>{order.procedure_name}</TableCell>
                    <TableCell>{new Date(order.order_datetime).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={order.priority === 'stat' ? 'destructive' : 'outline'}>
                        {order.priority?.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleViewOrder(order.id)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {showCreateModal && (
        <CreateRadiologyOrderModal 
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateOrder}
        />
      )}
    </Card>
  );
}
