"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Edit, Printer, CheckCircle } from "lucide-react";
import { useSession } from "next-auth/react"; // Assuming next-auth for session

// Placeholder for a potential EditReportModal
// import EditRadiologyReportModal from "./EditRadiologyReportModal";

export default function RadiologyReportDetail() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id;
  const { data: session } = useSession();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false); // For future edit functionality

  useEffect(() => {
    if (reportId) {
      fetchReportDetails();
    }
  }, [reportId]);

  const fetchReportDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/radiology/reports/${reportId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError("Radiology report not found.");
        } else {
          throw new Error("Failed to fetch report details");
        }
      } else {
        const data = await response.json();
        setReport(data);
        setError(null);
      }
    } catch (err) {
      console.error("Error fetching report details:", err);
      setError("Failed to load report details. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyReport = async () => {
    if (!confirm("Are you sure you want to verify and finalize this report?")) {
      return;
    }
    try {
      const response = await fetch(`/api/radiology/reports/${reportId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'final',
          verified_by_id: session?.user?.id, // Pass the verifier's ID
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify report');
      }
      alert("Report verified successfully.");
      fetchReportDetails(); // Refresh details
    } catch (err) {
      console.error("Error verifying report:", err);
      alert(`Failed to verify report: ${err.message}`);
    }
  };

  // Placeholder for edit functionality
  const handleUpdateReport = async (updatedData) => {
    // Implementation for PUT request to update report
    console.log("Updating report with:", updatedData);
    // try { ... fetch PUT ... } catch { ... } finally { setShowEditModal(false); fetchReportDetails(); }
    setShowEditModal(false);
    alert("Edit functionality not fully implemented yet.");
  };

  const handlePrintReport = () => {
    // Basic browser print functionality
    window.print();
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      preliminary: "bg-yellow-100 text-yellow-800",
      final: "bg-green-100 text-green-800",
      addendum: "bg-blue-100 text-blue-800"
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

  if (!report) {
    return <div className="text-center text-gray-500 p-4">Report details could not be loaded.</div>;
  }

  const canEdit = session?.user?.role === 'Admin' || (session?.user?.role === 'Radiologist' && session?.user?.id === report.radiologist_id && report.status !== 'final');
  const canVerify = session?.user?.role === 'Admin' || (session?.user?.role === 'Radiologist'); // Adjust verification logic as needed

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-4 print:hidden">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <Card className="print:shadow-none print:border-none">
        <CardHeader className="print:border-b print:pb-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">Radiology Report</CardTitle>
              <CardDescription>Report ID: {report.id}</CardDescription>
            </div>
            <div className="flex space-x-2 print:hidden">
              {canEdit && (
                <Button variant="outline" size="icon" onClick={() => setShowEditModal(true)} title="Edit Report">
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {report.status === 'preliminary' && canVerify && (
                <Button variant="outline" size="icon" onClick={handleVerifyReport} title="Verify Report">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </Button>
              )}
              <Button variant="outline" size="icon" onClick={handlePrintReport} title="Print Report">
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {/* Patient and Study Info */} 
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 border-b pb-4 mb-4">
            <div><strong>Patient:</strong> {report.patient_name} (ID: {report.patient_id.substring(0,6)})</div>
            <div><strong>Procedure:</strong> {report.procedure_name}</div>
            <div><strong>Study ID:</strong> <Button variant="link" className="p-0 h-auto print:text-black print:no-underline" onClick={() => router.push(`/dashboard/radiology/studies/${report.study_id}`)}>{report.study_id}</Button></div>
            <div><strong>Accession #:</strong> {report.accession_number || 'N/A'}</div>
          </div>

          {/* Report Details */} 
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mb-4">
            <div><strong>Report Date:</strong> {new Date(report.report_datetime).toLocaleString()}</div>
            <div><strong>Status:</strong> {getStatusBadge(report.status)}</div>
            <div><strong>Reporting Radiologist:</strong> {report.radiologist_name}</div>
            {report.status === 'final' && (
              <div><strong>Verified By:</strong> {report.verified_by_name || 'N/A'} {report.verified_datetime ? `on ${new Date(report.verified_datetime).toLocaleString()}` : ''}</div>
            )}
          </div>

          {/* Findings */} 
          <div className="space-y-2">
            <h3 className="font-semibold text-lg border-b pb-1">Findings</h3>
            <p className="whitespace-pre-wrap">{report.findings || "No findings recorded."}</p>
          </div>

          {/* Impression */} 
          <div className="space-y-2">
            <h3 className="font-semibold text-lg border-b pb-1">Impression</h3>
            <p className="whitespace-pre-wrap font-medium">{report.impression}</p>
          </div>

          {/* Recommendations */} 
          <div className="space-y-2">
            <h3 className="font-semibold text-lg border-b pb-1">Recommendations</h3>
            <p className="whitespace-pre-wrap">{report.recommendations || "No recommendations."}</p>
          </div>

        </CardContent>
      </Card>

      {/* Placeholder for Edit Modal */}
      {/* {showEditModal && (
        <EditRadiologyReportModal
          report={report}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleUpdateReport}
        />
      )} */}
    </div>
  );
}

