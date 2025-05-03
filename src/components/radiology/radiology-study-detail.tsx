"use client";

import React, { useState, useEffect, ReactNode, useCallback } from "react"; // FIX: Add useCallback
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
// FIX: Remove unused Edit, Trash2
import { Loader2, ArrowLeft, FileText } from "lucide-react";
import CreateRadiologyReportModal, {
  ReportFormData as ModalReportFormData,
} from "./create-radiology-report-modal"; // Import the form data type
// import RadiologyReportsList from "./RadiologyReportsList"; // Assuming this exists

// Define interfaces
interface StudyDetails {
  id: string;
  patient_id: string;
  patient_name?: string; // Assuming joined
  order_id: string;
  procedure_name?: string; // Assuming joined
  accession_number?: string | null;
  study_datetime: string;
  status: "scheduled" | "acquired" | "reported" | "verified" | string; // Allow string for flexibility
  modality_name?: string; // Assuming joined
  technician_name?: string; // Assuming joined
  protocol?: string | null;
  series_description?: string | null;
  number_of_images?: number | null;
  // Add other relevant fields
}

// FIX: Remove unused ReportData interface
// interface ReportData {
//   study_id: string;
//   report_text: string;
//   findings?: string;
//   impression: string;
//   radiologist_id: string; // Should come from session
//   // Add other report fields
// }

// Define props if needed, though useParams covers the ID
// interface RadiologyStudyDetailProps {}

export default function RadiologyStudyDetail() {
  const parameters = useParams();
  const router = useRouter();
  const studyId = typeof parameters.id === "string" ? parameters.id : undefined;

  const [study, setStudy] = useState<StudyDetails | null>();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>();
  const [showCreateReportModal, setShowCreateReportModal] =
    useState<boolean>(false);

  // FIX: Wrap fetchStudyDetails in useCallback
  const fetchStudyDetails = useCallback(async (): Promise<void> => {
    if (!studyId) {
      setError("Study ID is missing.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      // Simulate API call
      // const response = await fetch(`/api/radiology/studies/${studyId}`);
      // if (!response.ok) {
      //   if (response.status === 404) {
      //     setError("Radiology study not found.");
      //   } else {
      //     const errorData = await response.json().catch(() => ({}));
      //     throw new Error(errorData.error || "Failed to fetch study details");
      //   }
      // } else {
      //   const data: StudyDetails = await response.json();
      //   setStudy(data);
      // }

      // Mock Data
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (studyId === "study_123") {
        // Example ID
        const mockStudy: StudyDetails = {
          id: studyId,
          patient_id: "p001",
          patient_name: "John Doe",
          order_id: "ord_001",
          procedure_name: "Chest X-Ray, 2 Views",
          accession_number: "ACC123456",
          study_datetime: new Date(Date.now() - 86_400_000).toISOString(), // Yesterday
          status: "acquired",
          modality_name: "X-Ray",
          technician_name: "Tech Sarah",
          protocol: "Standard Chest Protocol",
          series_description: "PA and Lateral views",
          number_of_images: 2,
        };
        setStudy(mockStudy);
      } else {
        setError("Radiology study not found.");
        setStudy(undefined);
      }
    } catch (error_) {
      const message =
        error_ instanceof Error ? error_.message : "An unknown error occurred.";
      console.error("Error fetching study details:", error_);
      setError(`Failed to load study details: ${message}`);
      setStudy(undefined);
    } finally {
      setLoading(false);
    }
  }, [studyId]); // Add studyId dependency

  useEffect(() => {
    if (studyId) {
      fetchStudyDetails();
    }
    // FIX: Add fetchStudyDetails to dependency array
  }, [studyId, fetchStudyDetails]);

  // FIX: Adjust function signature to match the onSubmit prop type expected by the modal
  const handleCreateReport = async (
    formData: ModalReportFormData
  ): Promise<void> => {
    if (!studyId) {
      alert("Study ID is missing.");
      return;
    }
    try {
      // formData already contains study_id and radiologist_id from the modal
      // const reportData: ReportData = {
      //   ...formData,
      //   study_id: studyId,
      //   radiologist_id: "rad_current", // Replace with actual ID from session
      // };

      // Simulate API call
      const response = await fetch("/api/radiology/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData), // Use the formData directly
      });
      if (!response.ok) {
        let errorMessage = "Failed to create radiology report";
        try {
          const errorData: { error?: string } = await response.json();
          errorMessage = errorData.error || errorMessage;
          // FIX: Prefix unused variable with underscore
        } catch {
          /* Ignore if response is not JSON */
        }
        throw new Error(errorMessage);
      }

      // await new Promise(resolve => setTimeout(resolve, 600)); // Simulate delay

      alert("Report created successfully (simulated).");
      setShowCreateReportModal(false);
      // Refresh study details or associated reports list
      fetchStudyDetails();
    } catch (error_) {
      const message =
        error_ instanceof Error ? error_.message : "An unknown error occurred.";
      console.error("Error creating radiology report:", error_);
      alert(`Error creating report: ${message}`);
    }
  };

  // Add handleDeleteStudy if needed
  // const handleDeleteStudy = async (): Promise<void> => {
  //   if (!studyId || !confirm("Are you sure you want to delete this study?")) return;
  //   try {
  //     // API call to delete
  //     router.push('/dashboard/radiology/studies'); // Redirect after delete
  //   } catch (err) { /* ... */ }
  // };

  const getStatusBadge = (status: string | undefined): ReactNode => {
    if (!status) return <Badge className="bg-gray-100">Unknown</Badge>;

    const statusStyles: { [key: string]: string } = {
      scheduled: "bg-yellow-100 text-yellow-800 border-yellow-200",
      acquired: "bg-blue-100 text-blue-800 border-blue-200",
      reported: "bg-purple-100 text-purple-800 border-purple-200",
      verified: "bg-green-100 text-green-800 border-green-200",
    };
    const displayText =
      status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ");

    return (
      <Badge
        variant="outline"
        className={`${statusStyles[status] || "bg-gray-100 border-gray-200"} font-medium`}
      >
        {displayText}
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

  if (error) {
    return (
      <div className="text-center text-red-500 p-4 bg-red-50 border border-red-200 rounded-md">
        {error}
      </div>
    );
  }

  if (!study) {
    // This case might be covered by error state if fetch fails, but good to have
    return (
      <div className="text-center text-gray-500 p-4">
        Study details could not be loaded or found.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Studies
      </Button>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl">Radiology Study Details</CardTitle>
              <CardDescription>Study ID: {study.id}</CardDescription>
            </div>
            <div className="flex space-x-2">
              {/* <Button variant="outline" size="icon" title="Edit Study"><Edit className="h-4 w-4" /></Button> */}
              {/* <Button variant="destructive" size="icon" onClick={handleDeleteStudy} title="Delete Study"><Trash2 className="h-4 w-4" /></Button> */}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div>
              <strong>Patient:</strong> {study.patient_name || "N/A"} (ID:{" "}
              {study.patient_id?.slice(0, 8) || "N/A"})
            </div>
            <div>
              <strong>Procedure:</strong> {study.procedure_name || "N/A"}
            </div>
            <div>
              <strong>Order ID:</strong>
              <Button
                variant="link"
                className="p-0 h-auto ml-1 text-sm"
                onClick={() =>
                  router.push(`/dashboard/radiology/orders/${study.order_id}`)
                }
              >
                {study.order_id}
              </Button>
            </div>
            <div>
              <strong>Accession #:</strong> {study.accession_number || "N/A"}
            </div>
            <div>
              <strong>Study Date/Time:</strong>{" "}
              {study.study_datetime
                ? new Date(study.study_datetime).toLocaleString()
                : "N/A"}
            </div>
            <div>
              <strong>Status:</strong> {getStatusBadge(study.status)}
            </div>
            <div>
              <strong>Modality:</strong> {study.modality_name || "N/A"}
            </div>
            <div>
              <strong>Technician:</strong> {study.technician_name || "N/A"}
            </div>
            <div className="md:col-span-2">
              <strong>Protocol:</strong> {study.protocol || "N/A"}
            </div>
            <div className="md:col-span-2">
              <strong>Series Description:</strong>{" "}
              {study.series_description || "N/A"}
            </div>
            <div>
              <strong>Number of Images:</strong>{" "}
              {study.number_of_images ?? "N/A"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section for Associated Reports */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Associated Reports</CardTitle>
            {(study.status === "acquired" || study.status === "reported") && (
              <Button onClick={() => setShowCreateReportModal(true)}>
                <FileText className="mr-2 h-4 w-4" /> Create Report
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* TODO: Embed RadiologyReportsList filtered by study.id */}
          <p className="text-gray-500 italic">
            Report list component to be integrated here, filtered for Study ID:{" "}
            {study.id}
          </p>
          {/* Example: <RadiologyReportsList filter={{ studyId: study.id }} /> */}
        </CardContent>
      </Card>

      {showCreateReportModal && studyId && (
        <CreateRadiologyReportModal
          isOpen={showCreateReportModal} // Assuming modal uses isOpen prop
          onClose={() => setShowCreateReportModal(false)}
          onSubmit={handleCreateReport}
          studyId={studyId}
          patientName={study.patient_name || "N/A"} // Pass necessary info
          procedureName={study.procedure_name || "N/A"}
        />
      )}
    </div>
  );
}
