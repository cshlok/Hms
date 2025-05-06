"use client";

import React, { useState, useEffect, useCallback } from "react"; // FIX: Add useCallback
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
import { Loader2, ArrowLeft, Edit, Printer, CheckCircle } from "lucide-react";
import { useSession } from "next-auth/react";

// Define interfaces for data structures
interface RadiologyReport {
  id: string;
  patient_id: string;
  patient_name: string; // Assuming this comes from a join or is added
  study_id: string;
  procedure_name: string; // Assuming this comes from a join or is added
  accession_number?: string;
  report_datetime: string;
  status: "preliminary" | "final" | "addendum";
  radiologist_id: string;
  radiologist_name: string; // Assuming this comes from a join or is added
  verified_by_id?: string;
  verified_by_name?: string; // Assuming this comes from a join or is added
  verified_datetime?: string;
  findings?: string;
  impression: string;
  recommendations?: string;
}

interface SessionUser {
  id: string;
  role: string; // Define specific roles if possible, e.g., 'Admin' | 'Radiologist' | 'Technician'
  // FIX: Assuming userId is available in the session user object for comparison
  userId?: string | number;
  roleName?: string; // Assuming roleName is used for checks
}

// Placeholder for EditReportModal props if it were implemented
// interface EditRadiologyReportModalProps {
//   report: RadiologyReport;
//   onClose: () => void;
//   onSubmit: (updatedData: Partial<RadiologyReport>) => Promise<void>;
// }

// Placeholder for EditReportModal component
// const EditRadiologyReportModal: React.FC<EditRadiologyReportModalProps> = ({ report, onClose, onSubmit }) => {
//   // Modal implementation would go here
//   return <div>Edit Modal Placeholder</div>;
// };

const RadiologyReportDetail: React.FC = () => {
  const parameters = useParams();
  const router = useRouter();
  const reportId = parameters.id as string; // Assuming id is always a string
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;

  const [report, setReport] = useState<RadiologyReport | null>();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>();
  const [/*showEditModal*/, setShowEditModal] = useState<boolean>(false); // Added state for edit modal - RE-ADDED

  // FIX: Wrap fetchReportDetails in useCallback
  const fetchReportDetails = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(undefined);
    try {
      // Simulate API call
      // const response = await fetch(`/api/radiology/reports/${reportId}`);
      // if (!response.ok) {
      //   if (response.status === 404) {
      //     setError("Radiology report not found.");
      //   } else {
      //     const errorData = await response.json().catch(() => ({}));
      //     throw new Error(errorData.error || "Failed to fetch report details");
      //   }
      // } else {
      //   const data: RadiologyReport = await response.json();
      //   setReport(data);
      // }

      // Mock data
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate delay
      const mockReport: RadiologyReport = {
        id: reportId,
        patient_id: "PAT12345",
        patient_name: "John Doe",
        study_id: "STUDY9876",
        procedure_name: "Chest X-Ray, 2 Views",
        accession_number: "ACC00123",
        report_datetime: new Date().toISOString(),
        status: "preliminary",
        radiologist_id: "RAD001",
        radiologist_name: "Dr. Emily Carter",
        findings:
          "Lungs are clear. No acute cardiopulmonary process identified. Mild degenerative changes in the thoracic spine.",
        impression: "No acute findings.",
        recommendations: "Clinical correlation recommended.",
      };
      setReport(mockReport);
    } catch (error_) {
      const message =
        error_ instanceof Error ? error_.message : "An unknown error occurred.";
      console.error("Error fetching report details:", error_);
      setError(`Failed to load report details: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [reportId]); // Add reportId as dependency

  useEffect(() => {
    if (reportId) {
      fetchReportDetails();
    }
    // FIX: Add fetchReportDetails to dependency array
  }, [reportId, fetchReportDetails]);

  const handleVerifyReport = async (): Promise<void> => {
    if (!report || !user) return;
    if (!confirm("Are you sure you want to verify and finalize this report?")) {
      return;
    }
    setLoading(true); // Indicate processing
    try {
      // Simulate API call
      // const response = await fetch(`/api/radiology/reports/${reportId}`, {
      //   method: 'PUT',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     status: 'final',
      //     verified_by_id: user.id, // Assuming user.id exists
      //   }),
      // });
      // if (!response.ok) {
      //   const errorData = await response.json().catch(() => ({}));
      //   throw new Error(errorData.error || 'Failed to verify report');
      // }

      console.log(
        `Simulating verification of report ${reportId} by user ${user.id}`
      );
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate delay

      alert("Report verified successfully.");
      fetchReportDetails(); // Refresh details
    } catch (error_) {
      const message =
        error_ instanceof Error ? error_.message : "An unknown error occurred.";
      console.error("Error verifying report:", error_);
      alert(`Failed to verify report: ${message}`);
      setLoading(false); // Stop loading indicator on error
    }
    // No finally setLoading(false) here, as fetchReportDetails will handle it on success
  };

  const handlePrintReport = (): void => {
    globalThis.print();
  };

  const getStatusBadge = (
    status: RadiologyReport["status"] | undefined
  ): React.ReactNode => {
    if (!status) return undefined;
    const statusStyles: Record<RadiologyReport["status"], string> = {
      preliminary: "bg-yellow-100 text-yellow-800",
      final: "bg-green-100 text-green-800",
      addendum: "bg-blue-100 text-blue-800",
    };
    return (
      <Badge
        className={`${statusStyles[status] || "bg-gray-100 text-gray-800"} hover:bg-opacity-80`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
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
    return <div className="text-center text-red-500 p-4">{error}</div>;
  }

  if (!report) {
    return (
      <div className="text-center text-gray-500 p-4">
        Report details could not be loaded.
      </div>
    );
  }

  // Determine permissions based on user role and report status/ownership
  // FIX: Use roleName and userId from SessionUser type
  const canEdit =
    user &&
    (user.roleName === "Admin" ||
      (user.roleName === "Radiologist" &&
        String(user.userId) === report.radiologist_id &&
        report.status !== "final"));
  const canVerify =
    user && (user.roleName === "Admin" || user.roleName === "Radiologist"); // Adjust verification logic as needed

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Button
        variant="outline"
        onClick={() => router.back()}
        className="mb-4 print:hidden"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <Card className="print:shadow-none print:border-none">
        <CardHeader className="print:border-b print:pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start">
            <div className="mb-2 sm:mb-0">
              <CardTitle className="text-2xl">Radiology Report</CardTitle>
              <CardDescription>Report ID: {report.id}</CardDescription>
            </div>
            <div className="flex space-x-2 print:hidden">
              {canEdit && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowEditModal(true)}
                  title="Edit Report"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {report.status === "preliminary" && canVerify && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleVerifyReport}
                  title="Verify Report"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrintReport}
                title="Print Report"
              >
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {/* Patient and Study Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 border-b pb-4 mb-4">
            <div>
              <strong>Patient:</strong> {report.patient_name} (ID:{" "}
              {report.patient_id.slice(0, 8)})
            </div>
            <div>
              <strong>Procedure:</strong> {report.procedure_name}
            </div>
            <div>
              <strong>Study ID:</strong>{" "}
              <Button
                variant="link"
                className="p-0 h-auto text-base print:text-black print:no-underline"
                onClick={() =>
                  router.push(`/dashboard/radiology/studies/${report.study_id}`)
                }
              >
                {report.study_id}
              </Button>
            </div>
            <div>
              <strong>Accession #:</strong> {report.accession_number || "N/A"}
            </div>
          </div>

          {/* Report Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mb-4">
            <div>
              <strong>Report Date:</strong>{" "}
              {new Date(report.report_datetime).toLocaleString()}
            </div>
            <div>
              <strong>Status:</strong> {getStatusBadge(report.status)}
            </div>
            <div>
              <strong>Reporting Radiologist:</strong> {report.radiologist_name}
            </div>
            {report.status === "final" && (
              <div>
                <strong>Verified By:</strong> {report.verified_by_name || "N/A"}{" "}
                {report.verified_datetime
                  ? `on ${new Date(report.verified_datetime).toLocaleString()}`
                  : ""}
              </div>
            )}
          </div>

          {/* Findings */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg border-b pb-1">Findings</h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {report.findings || "No findings recorded."}
            </p>
          </div>

          {/* Impression */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg border-b pb-1">Impression</h3>
            <p className="whitespace-pre-wrap font-medium text-sm leading-relaxed">
              {report.impression}
            </p>
          </div>

          {/* Recommendations */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg border-b pb-1">
              Recommendations
            </h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {report.recommendations || "No recommendations."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder for Edit Modal */}
      {/* {showEditModal && report && (
        <EditRadiologyReportModal
          report={report}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleUpdateReport}
        />
      )} */}
    </div>
  );
};

export default RadiologyReportDetail;
