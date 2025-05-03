"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Trash2, FilePlus } from "lucide-react";
import CreateRadiologyStudyModal, {
  StudyPayload,
} from "./create-radiology-study-modal"; // FIX: Import StudyPayload
// Import list components if they are to be embedded and filtered
// import RadiologyStudiesList from "./RadiologyStudiesList";
// import RadiologyReportsList from "./RadiologyReportsList";

// Define interface for Radiology Order data
interface RadiologyOrder {
  id: string;
  patient_name: string;
  patient_id: string;
  procedure_name: string;
  order_datetime: string; // Assuming ISO string format
  status: "pending" | "scheduled" | "in_progress" | "completed" | "cancelled";
  priority: "routine" | "urgent" | "stat";
  referring_doctor_name: string | null;
  clinical_indication: string;
}

// FIX: Remove unused CreateStudyData interface
// interface CreateStudyData {
//   orderId: string;
//   modality_id: string;
//   scheduled_datetime: string;
//   notes?: string;
// }

export default function RadiologyOrderDetail() {
  const parameters = useParams();
  const router = useRouter();
  const orderId = parameters.id as string; // Assume id is always a string

  const [order, setOrder] = useState<RadiologyOrder | null>();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>();
  const [showCreateStudyModal, setShowCreateStudyModal] =
    useState<boolean>(false);

  const fetchOrderDetails = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(undefined); // Reset error state
    try {
      const response = await fetch(`/api/radiology/orders/${orderId}`);
      if (response.ok) {
        const data: RadiologyOrder = await response.json();
        setOrder(data);
        setError(undefined);
      } else {
        if (response.status === 404) {
          setError("Radiology order not found.");
          setOrder(undefined); // Ensure order is null if not found
        } else {
          // FIX: Type the error data using type assertion
          const errorData = (await response
            .json()
            .catch(() => ({ error: "Failed to parse error response" }))) as {
            error?: string;
          };
          throw new Error(errorData.error || "Failed to fetch order details");
        }
      }
    } catch (error_) {
      console.error("Error fetching order details:", error_);
      const errorMessage =
        error_ instanceof Error ? error_.message : "An unknown error occurred";
      setError(
        `Failed to load order details: ${errorMessage}. Please try again later.`
      );
      setOrder(undefined); // Ensure order is null on error
    } finally {
      setLoading(false);
    }
  }, [orderId]); // Added orderId dependency for useCallback

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId, fetchOrderDetails]); // Added fetchOrderDetails dependency

  // FIX: Use imported StudyPayload type
  const handleCreateStudy = async (studyData: StudyPayload): Promise<void> => {
    try {
      const response = await fetch("/api/radiology/studies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // Ensure studyData includes the orderId
        body: JSON.stringify({ ...studyData, orderId: orderId }),
      });

      if (!response.ok) {
        // FIX: Type the error data using type assertion
        const errorData = (await response
          .json()
          .catch(() => ({ error: "Failed to parse error response" }))) as {
          error?: string;
        };
        throw new Error(errorData.error || "Failed to create radiology study");
      }

      setShowCreateStudyModal(false);
      // Refresh order details which might implicitly refresh related studies/reports lists
      fetchOrderDetails();
      // Consider adding a success message
      alert("Radiology study created successfully.");
    } catch (error_) {
      console.error("Error creating radiology study:", error_);
      const errorMessage =
        error_ instanceof Error ? error_.message : "An unknown error occurred";
      alert(`Error creating study: ${errorMessage}`);
    }
  };

  const handleCancelOrder = async (): Promise<void> => {
    if (!confirm("Are you sure you want to cancel this radiology order?")) {
      return;
    }
    try {
      const response = await fetch(`/api/radiology/orders/${orderId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        // FIX: Type the error data using type assertion
        const errorData = (await response
          .json()
          .catch(() => ({ error: "Failed to parse error response" }))) as {
          error?: string;
        };
        throw new Error(errorData.error || "Failed to cancel order");
      }
      alert("Order cancelled successfully.");
      router.push("/dashboard/radiology"); // Go back to the list
    } catch (error_) {
      console.error("Error cancelling order:", error_);
      const errorMessage =
        error_ instanceof Error ? error_.message : "An unknown error occurred";
      alert(`Failed to cancel order: ${errorMessage}`);
    }
  };

  const getStatusBadge = (
    status: RadiologyOrder["status"]
  ): React.ReactNode => {
    const statusStyles: { [key in RadiologyOrder["status"]]: string } = {
      pending: "bg-yellow-100 text-yellow-800",
      scheduled: "bg-blue-100 text-blue-800",
      in_progress: "bg-purple-100 text-purple-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    const statusText =
      status?.charAt(0).toUpperCase() + status?.slice(1).replace("_", " ");
    return (
      <Badge className={statusStyles[status] || "bg-gray-100"}>
        {statusText}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  // Separate check for error after loading
  if (error) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="text-center text-red-500 p-4">{error}</div>
      </div>
    );
  }

  // If not loading and no error, but order is still null (e.g., 404 handled)
  if (!order) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="text-center text-gray-500 p-4">
          Order details could not be loaded or order not found.
        </div>
      </div>
    );
  }

  // If order exists, render the details
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
              {order.status !== "cancelled" && order.status !== "completed" && (
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={handleCancelOrder}
                  title="Cancel Order"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <strong>Patient:</strong> {order.patient_name} (ID:{" "}
              {order.patient_id?.slice(0, 6)})
            </div>
            <div>
              <strong>Procedure:</strong> {order.procedure_name}
            </div>
            <div>
              <strong>Date Ordered:</strong>{" "}
              {new Date(order.order_datetime).toLocaleString()}
            </div>
            <div>
              <strong>Status:</strong> {getStatusBadge(order.status)}
            </div>
            <div>
              <strong>Priority:</strong>{" "}
              <Badge
                variant={order.priority === "stat" ? "destructive" : "outline"}
              >
                {order.priority?.toUpperCase()}
              </Badge>
            </div>
            <div>
              <strong>Referring Doctor:</strong>{" "}
              {order.referring_doctor_name || "N/A"}
            </div>
            <div className="md:col-span-2">
              <strong>Clinical Indication:</strong> {order.clinical_indication}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section for Associated Studies */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Associated Studies</CardTitle>
            {(order.status === "pending" || order.status === "scheduled") && (
              <Button onClick={() => setShowCreateStudyModal(true)}>
                <FilePlus className="mr-2 h-4 w-4" /> Create Study
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* TODO: Embed or link to RadiologyStudiesList filtered by order.id */}
          <p className="text-gray-500">
            Studies associated with this order will appear here.
          </p>
          {/* Example: <RadiologyStudiesList filter={{ orderId: order.id }} /> */}
        </CardContent>
      </Card>

      {/* Section for Associated Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Associated Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {/* TODO: Embed or link to RadiologyReportsList filtered by order.id (via studies) */}
          <p className="text-gray-500">
            Reports associated with this order will appear here.
          </p>
          {/* Example: <RadiologyReportsList filter={{ orderId: order.id }} /> */}
        </CardContent>
      </Card>

      {showCreateStudyModal && (
        <CreateRadiologyStudyModal
          onClose={() => setShowCreateStudyModal(false)}
          onSubmit={handleCreateStudy} // Pass the typed handler
          orderId={order.id}
          // Pass any other required props to the modal
        />
      )}
    </div>
  );
}
