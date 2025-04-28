"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Edit, Trash2, FilePlus, Eye } from "lucide-react";
import CreateRadiologyStudyModal from "./CreateRadiologyStudyModal";
import RadiologyStudiesList from "./RadiologyStudiesList"; // Assuming this can be filtered by orderId
import RadiologyReportsList from "./RadiologyReportsList"; // Assuming this can be filtered by orderId

export default function RadiologyOrderDetail() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateStudyModal, setShowCreateStudyModal] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/radiology/orders/${orderId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError("Radiology order not found.");
        } else {
          throw new Error("Failed to fetch order details");
        }
      } else {
        const data = await response.json();
        setOrder(data);
        setError(null);
      }
    } catch (err) {
      console.error("Error fetching order details:", err);
      setError("Failed to load order details. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStudy = async (studyData) => {
    try {
      const response = await fetch("/api/radiology/studies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(studyData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create radiology study");
      }

      setShowCreateStudyModal(false);
      // Optionally refresh studies list or navigate to the new study
      fetchOrderDetails(); // Refresh order details which might implicitly refresh related studies/reports lists if they are part of this component

    } catch (err) {
      console.error("Error creating radiology study:", err);
      alert(err.message);
    }
  };

  const handleCancelOrder = async () => {
    if (!confirm("Are you sure you want to cancel this radiology order?")) {
      return;
    }
    try {
      const response = await fetch(`/api/radiology/orders/${orderId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel order');
      }
      alert("Order cancelled successfully.");
      router.push("/dashboard/radiology"); // Go back to the list
    } catch (err) {
      console.error("Error cancelling order:", err);
      alert(`Failed to cancel order: ${err.message}`);
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
        {status?.charAt(0).toUpperCase() + status?.slice(1).replace("_", " ")}
      </Badge>
    );
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  if (error) {
    return <div className="text-center text-red-500 p-4">{error}</div>;
  }

  if (!order) {
    return <div className="text-center text-gray-500 p-4">Order details could not be loaded.</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Radiology Order Details</CardTitle>
              <CardDescription>Order ID: {order.id}</CardDescription>
            </div>
            <div className="flex space-x-2">
              {/* Add Edit button if needed, requires an Edit Modal */} 
              {/* <Button variant="outline" size="icon"><Edit className="h-4 w-4" /></Button> */} 
              {order.status !== 'cancelled' && order.status !== 'completed' && (
                <Button variant="destructive" size="icon" onClick={handleCancelOrder} title="Cancel Order">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><strong>Patient:</strong> {order.patient_name} (ID: {order.patient_id.substring(0,6)})</div>
            <div><strong>Procedure:</strong> {order.procedure_name}</div>
            <div><strong>Date Ordered:</strong> {new Date(order.order_datetime).toLocaleString()}</div>
            <div><strong>Status:</strong> {getStatusBadge(order.status)}</div>
            <div><strong>Priority:</strong> <Badge variant={order.priority === 'stat' ? 'destructive' : 'outline'}>{order.priority?.toUpperCase()}</Badge></div>
            <div><strong>Referring Doctor:</strong> {order.referring_doctor_name || 'N/A'}</div>
            <div className="md:col-span-2"><strong>Clinical Indication:</strong> {order.clinical_indication}</div>
          </div>
        </CardContent>
      </Card>

      {/* Section for Associated Studies */} 
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Associated Studies</CardTitle>
            {/* Allow creating study only if order is pending/scheduled */} 
            {(order.status === 'pending' || order.status === 'scheduled') && (
              <Button onClick={() => setShowCreateStudyModal(true)}>
                <FilePlus className="mr-2 h-4 w-4" /> Create Study
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Embed or link to RadiologyStudiesList filtered by order.id */} 
          {/* For now, just a placeholder message */} 
          <p className="text-gray-500">Studies associated with this order will appear here.</p>
          {/* Example: <RadiologyStudiesList filter={{ orderId: order.id }} /> */} 
        </CardContent>
      </Card>

      {/* Section for Associated Reports */} 
      <Card>
        <CardHeader>
          <CardTitle>Associated Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Embed or link to RadiologyReportsList filtered by order.id (via studies) */} 
          <p className="text-gray-500">Reports associated with this order will appear here.</p>
          {/* Example: <RadiologyReportsList filter={{ orderId: order.id }} /> */} 
        </CardContent>
      </Card>

      {showCreateStudyModal && (
        <CreateRadiologyStudyModal
          onClose={() => setShowCreateStudyModal(false)}
          onSubmit={handleCreateStudy}
          orderId={order.id}
        />
      )}
    </div>
  );
}

