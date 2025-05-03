"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card"; // FIX: Add missing imports
import { Edit, Trash2 } from "lucide-react";

// Mock data structure - replace with actual API response type
interface SurgeryType {
  id: string;
  name: string;
  description: string | null;
  specialty: string | null;
  estimated_duration_minutes: number | null;
  updated_at: string;
}

export default function OTSurgeryTypeList() {
  const [surgeryTypes, setSurgeryTypes] = useState<SurgeryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>();

  useEffect(() => {
    const fetchSurgeryTypes = async () => {
      try {
        setLoading(true);
        setError(undefined);

        // Replace with actual API call
        // const response = await fetch("/api/ot/surgery-types");
        // if (!response.ok) {
        //   throw new Error("Failed to fetch surgery types");
        // }
        // const data = await response.json();
        // setSurgeryTypes(data);

        // Mock data for demonstration
        await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate delay
        const mockData: SurgeryType[] = [
          {
            id: "st-1",
            name: "Appendectomy",
            description: "Surgical removal of the appendix.",
            specialty: "General Surgery",
            estimated_duration_minutes: 60,
            updated_at: "2025-04-27T10:00:00Z",
          },
          {
            id: "st-2",
            name: "Cholecystectomy (Laparoscopic)",
            description: "Surgical removal of the gallbladder via laparoscopy.",
            specialty: "General Surgery",
            estimated_duration_minutes: 90,
            updated_at: "2025-04-27T11:00:00Z",
          },
          {
            id: "st-3",
            name: "Knee Arthroscopy",
            description: "Minimally invasive surgical procedure on a joint.",
            specialty: "Orthopedics",
            estimated_duration_minutes: 120,
            updated_at: "2025-04-28T08:00:00Z",
          },
          {
            id: "st-4",
            name: "Coronary Artery Bypass Graft (CABG)",
            description:
              "Surgical procedure to restore normal blood flow to an obstructed coronary artery.",
            specialty: "Cardiology",
            estimated_duration_minutes: 240,
            updated_at: "2025-04-26T14:00:00Z",
          },
        ];
        setSurgeryTypes(mockData);

        setLoading(false);
      } catch (error_: unknown) {
        if (error_ instanceof Error) {
          setError(error_.message);
        } else {
          setError("An unknown error occurred while fetching surgery types");
        }
        setLoading(false);
      }
    };

    fetchSurgeryTypes();
  }, []);

  return (
    <Card>
      <CardContent className="pt-6">
        {loading && <div>Loading surgery types...</div>}
        {error && <div className="text-red-500">Error: {error}</div>}
        {!loading && !error && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Specialty</TableHead>
                <TableHead>Est. Duration (min)</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {surgeryTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No surgery types found.
                  </TableCell>
                </TableRow>
              ) : (
                surgeryTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell>{type.name}</TableCell>
                    <TableCell>{type.specialty || "N/A"}</TableCell>
                    <TableCell>
                      {type.estimated_duration_minutes || "N/A"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {type.description || "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          title="Edit Surgery Type"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          title="Delete Surgery Type"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
