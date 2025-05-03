"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import CreateRadiologyOrderModal, {
  OrderPayload,
} from "./create-radiology-order-modal"; // Import OrderPayload
import { toast } from "@/components/ui/use-toast"; // Import toast for notifications

// Define interface for the order data
interface RadiologyOrder {
  id: string;
  patient_name?: string; // Make optional if not always present
  procedure_name?: string; // Make optional if not always present
  order_datetime: string; // Or Date if API returns Date object
  priority: "routine" | "stat"; // Use specific types
  status: "pending" | "scheduled" | "in_progress" | "completed" | "cancelled"; // Use specific types
  // Add other fields returned by the API as needed
}

export default function RadiologyOrderList() {
  const [orders, setOrders] = useState<RadiologyOrder[]>([]); // Correctly typed state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(); // Correctly typed state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    setError(undefined); // Clear previous errors
    try {
      const response = await fetch("/api/radiology/orders");
      if (!response.ok) {
        throw new Error(
          `Failed to fetch radiology orders: ${response.statusText}`
        );
      }
      // Assume API returns an object with a 'results' array or the array directly
      const data: { results: RadiologyOrder[] } | RadiologyOrder[] =
        await response.json();
      const fetchedOrders = Array.isArray(data) ? data : data.results || [];
      setOrders(fetchedOrders);
    } catch (error_) {
      const message =
        error_ instanceof Error ? error_.message : "An unknown error occurred";
      console.error("Error fetching radiology orders:", message);
      setError(
        `Failed to load radiology orders: ${message}. Please try again later.`
      );
      toast({
        title: "Error Loading Orders",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Correctly type the parameter
  const handleViewOrder = (orderId: string) => {
    router.push(`/dashboard/radiology/orders/${orderId}`);
  };

  // Correctly type the parameter using the imported OrderPayload
  const handleCreateOrder = async (orderData: OrderPayload) => {
    try {
      const response = await fetch("/api/radiology/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        let errorMessage = "Failed to create radiology order";
        try {
          // Attempt to parse error message from response body
          const errorData: { error?: string; message?: string } =
            await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If response is not JSON or doesn't contain error details, use the status text
          errorMessage = `${errorMessage}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      toast({
        title: "Success",
        description: "Radiology order created successfully.",
      });
      setShowCreateModal(false);
      fetchOrders(); // Refresh the list
    } catch (error_) {
      const message =
        error_ instanceof Error ? error_.message : "An unknown error occurred";
      console.error("Error creating radiology order:", message);
      toast({
        title: "Error Creating Order",
        description: message,
        variant: "destructive",
      });
      // Keep the modal open on error so the user can retry or correct input
    }
  };

  // Type the parameter and add index signature to statusStyles
  const getStatusBadge = (status: RadiologyOrder["status"]) => {
    // Define styles for specific statuses
    const statusStyles: { [key in RadiologyOrder["status"]]: string } = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      scheduled: "bg-blue-100 text-blue-800 border-blue-200",
      in_progress: "bg-purple-100 text-purple-800 border-purple-200",
      completed: "bg-green-100 text-green-800 border-green-200",
      cancelled: "bg-red-100 text-red-800 border-red-200",
    };

    // Format status text (capitalize first letter, replace underscores)
    const formattedStatus =
      status?.charAt(0).toUpperCase() + status?.slice(1).replace("_", " ");

    return (
      <Badge
        variant="outline"
        className={
          statusStyles[status] || "bg-gray-100 text-gray-800 border-gray-200"
        }
      >
        {formattedStatus}
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
          <div className="text-center text-red-500 p-4 border border-red-200 rounded bg-red-50">
            {error}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center text-gray-500 p-4">
            No radiology orders found.
          </div>
        ) : (
          <div className="overflow-x-auto border rounded-md">
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
                    <TableCell className="font-medium">
                      {order.patient_name || "N/A"}
                    </TableCell>
                    <TableCell>{order.procedure_name || "N/A"}</TableCell>
                    <TableCell>
                      {new Date(order.order_datetime).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          order.priority === "stat"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {order.priority?.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewOrder(order.id)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Pass the required isOpen prop */}
      <CreateRadiologyOrderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateOrder}
      />
    </Card>
  );
}
