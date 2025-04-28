"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function RadiologyStudiesList() {
  const [studies, setStudies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchStudies();
  }, []);

  const fetchStudies = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/radiology/studies');
      if (!response.ok) {
        throw new Error('Failed to fetch radiology studies');
      }
      const data = await response.json();
      setStudies(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching radiology studies:', err);
      setError('Failed to load radiology studies. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewStudy = (studyId) => {
    router.push(`/dashboard/radiology/studies/${studyId}`);
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      scheduled: "bg-yellow-100 text-yellow-800",
      acquired: "bg-blue-100 text-blue-800",
      reported: "bg-purple-100 text-purple-800",
      verified: "bg-green-100 text-green-800"
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
          <h2 className="text-xl font-semibold">Radiology Studies</h2>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500 p-4">{error}</div>
        ) : studies.length === 0 ? (
          <div className="text-center text-gray-500 p-4">No radiology studies found.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Procedure</TableHead>
                  <TableHead>Accession #</TableHead>
                  <TableHead>Study Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studies.map((study) => (
                  <TableRow key={study.id}>
                    <TableCell>{study.patient_name}</TableCell>
                    <TableCell>{study.procedure_name}</TableCell>
                    <TableCell>{study.accession_number || 'N/A'}</TableCell>
                    <TableCell>{new Date(study.study_datetime).toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(study.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleViewStudy(study.id)}>
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
