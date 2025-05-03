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

// Define interface for the report data
interface RadiologyReport {
  id: string;
  patient_name?: string;
  procedure_name?: string;
  accession_number?: string | null;
  radiologist_name?: string;
  report_datetime: string; // Or Date
  status: string; // Consider using a specific enum/literal type
  // Add other fields as needed
}

export default function RadiologyReportsList() {
  const [reports, setReports] = useState<RadiologyReport[]>([]); // FIX: Type the state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(); // FIX: Type the state
  const router = useRouter();

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/radiology/reports");
      if (!response.ok) {
        throw new Error("Failed to fetch radiology reports");
      }
      const data: RadiologyReport[] = await response.json(); // FIX: Assume API returns RadiologyReport[]
      setReports(data);
      setError(undefined);
    } catch (error_) {
      console.error("Error fetching radiology reports:", error_);
      setError("Failed to load radiology reports. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // FIX: Type the parameter
  const handleViewReport = (reportId: string) => {
    router.push(`/dashboard/radiology/reports/${reportId}`);
  };

  // FIX: Type the parameter
  const getStatusBadge = (status: string) => {
    const statusStyles: { [key: string]: string } = {
      // FIX: Add index signature
      preliminary: "bg-yellow-100 text-yellow-800",
      final: "bg-green-100 text-green-800",
      addendum: "bg-blue-100 text-blue-800",
    };

    return (
      <Badge className={statusStyles[status] || "bg-gray-100"}>
        {status?.charAt(0).toUpperCase() + status?.slice(1).replace("_", " ")}
      </Badge>
    );
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Radiology Reports</h2>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500 p-4">{error}</div>
        ) : reports.length === 0 ? (
          <div className="text-center text-gray-500 p-4">
            No radiology reports found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Procedure</TableHead>
                  <TableHead>Accession #</TableHead>
                  <TableHead>Radiologist</TableHead>
                  <TableHead>Report Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>{report.patient_name}</TableCell>
                    <TableCell>{report.procedure_name}</TableCell>
                    <TableCell>{report.accession_number || "N/A"}</TableCell>
                    <TableCell>{report.radiologist_name}</TableCell>
                    <TableCell>
                      {new Date(report.report_datetime).toLocaleString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(report.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewReport(report.id)}
                      >
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
    </Card>
  );
}
