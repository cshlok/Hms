"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Edit, Trash2, FileText } from "lucide-react";
import CreateRadiologyReportModal from "./CreateRadiologyReportModal"; // To be created
import RadiologyReportsList from "./RadiologyReportsList"; // Assuming this can be filtered by studyId

export default function RadiologyStudyDetail() {
  const params = useParams();
  const router = useRouter();
  const studyId = params.id;

  const [study, setStudy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateReportModal, setShowCreateReportModal] = useState(false);

  useEffect(() => {
    if (studyId) {
      fetchStudyDetails();
    }
  }, [studyId]);

  const fetchStudyDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/radiology/studies/${studyId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError("Radiology study not found.");
        } else {
          throw new Error("Failed to fetch study details");
        }
      } else {
        const data = await response.json();
        setStudy(data);
        setError(null);
      }
    } catch (err) {
      console.error("Error fetching study details:", err);
      setError("Failed to load study details. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = async (reportData) => {
    try {
      const response = await fetch("/api/radiology/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reportData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create radiology report");
      }

      setShowCreateReportModal(false);
      // Optionally refresh reports list or navigate to the new report
      fetchStudyDetails(); // Refresh study details which might implicitly refresh related reports list

    } catch (err) {
      console.error("Error creating radiology report:", err);
      alert(err.message);
    }
  };

  // Add handleDeleteStudy if needed (use with caution)

  const getStatusBadge = (status) => {
    const statusStyles = {
      scheduled: "bg-yellow-100 text-yellow-800",
      acquired: "bg-blue-100 text-blue-800",
      reported: "bg-purple-100 text-purple-800",
      verified: "bg-green-100 text-green-800"
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

  if (!study) {
    return <div className="text-center text-gray-500 p-4">Study details could not be loaded.</div>;
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
              <CardTitle>Radiology Study Details</CardTitle>
              <CardDescription>Study ID: {study.id}</CardDescription>
            </div>
            <div className="flex space-x-2">
              {/* Add Edit button if needed, requires an Edit Modal */} 
              {/* <Button variant="outline" size="icon"><Edit className="h-4 w-4" /></Button> */} 
              {/* Add Delete button if needed (use with caution) */} 
              {/* <Button variant="destructive" size="icon" onClick={handleDeleteStudy} title="Delete Study"><Trash2 className="h-4 w-4" /></Button> */} 
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><strong>Patient:</strong> {study.patient_name} (ID: {study.patient_id.substring(0,6)})</div>
            <div><strong>Procedure:</strong> {study.procedure_name}</div>
            <div><strong>Order ID:</strong> <Button variant="link" className="p-0 h-auto" onClick={() => router.push(`/dashboard/radiology/orders/${study.order_id}`)}>{study.order_id}</Button></div>
            <div><strong>Accession #:</strong> {study.accession_number || 'N/A'}</div>
            <div><strong>Study Date/Time:</strong> {new Date(study.study_datetime).toLocaleString()}</div>
            <div><strong>Status:</strong> {getStatusBadge(study.status)}</div>
            <div><strong>Modality:</strong> {study.modality_name || 'N/A'}</div>
            <div><strong>Technician:</strong> {study.technician_name || 'N/A'}</div>
            <div className="md:col-span-2"><strong>Protocol:</strong> {study.protocol || 'N/A'}</div>
            <div className="md:col-span-2"><strong>Series Description:</strong> {study.series_description || 'N/A'}</div>
            <div><strong>Number of Images:</strong> {study.number_of_images || 'N/A'}</div>
          </div>
        </CardContent>
      </Card>

      {/* Section for Associated Reports */} 
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Associated Reports</CardTitle>
            {/* Allow creating report only if study is acquired/reported (and user is Radiologist/Admin) */} 
            {(study.status === 'acquired' || study.status === 'reported') && (
              <Button onClick={() => setShowCreateReportModal(true)}>
                <FileText className="mr-2 h-4 w-4" /> Create Report
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Embed or link to RadiologyReportsList filtered by study.id */} 
          <p className="text-gray-500">Reports associated with this study will appear here.</p>
          {/* Example: <RadiologyReportsList filter={{ studyId: study.id }} /> */} 
        </CardContent>
      </Card>

      {showCreateReportModal && (
        <CreateRadiologyReportModal
          onClose={() => setShowCreateReportModal(false)}
          onSubmit={handleCreateReport}
          studyId={study.id}
        />
      )}
    </div>
  );
}

