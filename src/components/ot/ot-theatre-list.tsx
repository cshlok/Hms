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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card"; // FIX: Add missing imports
import { Edit, Trash2, Activity, WifiOff } from "lucide-react";

// Mock data structure - replace with actual API response type
interface Theatre {
  id: string;
  name: string;
  location: string | null;
  specialty: string | null;
  status: string;
  updated_at: string;
}

export default function OTTheatreList() {
  const [theatres, setTheatres] = useState<Theatre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>();

  useEffect(() => {
    const fetchTheatres = async () => {
      try {
        setLoading(true);
        setError(undefined);

        // Replace with actual API call
        // const response = await fetch("/api/ot/theatres");
        // if (!response.ok) {
        //   throw new Error("Failed to fetch theatres");
        // }
        // const data = await response.json();
        // setTheatres(data);

        // Mock data for demonstration
        await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate delay
        const mockData: Theatre[] = [
          {
            id: "theatre-1",
            name: "OT-1",
            location: "Floor 2, Wing A",
            specialty: "General Surgery",
            status: "available",
            updated_at: "2025-04-28T10:00:00Z",
          },
          {
            id: "theatre-2",
            name: "OT-2",
            location: "Floor 2, Wing A",
            specialty: "Orthopedics",
            status: "in_use",
            updated_at: "2025-04-28T09:30:00Z",
          },
          {
            id: "theatre-3",
            name: "OT-3",
            location: "Floor 2, Wing B",
            specialty: "Cardiology",
            status: "maintenance",
            updated_at: "2025-04-27T15:00:00Z",
          },
          {
            id: "theatre-4",
            name: "OT-4 (Hybrid)",
            location: "Floor 3, Wing C",
            specialty: "Neurosurgery",
            status: "available",
            updated_at: "2025-04-28T11:00:00Z",
          },
        ];
        setTheatres(mockData);

        setLoading(false);
      } catch (error_: unknown) {
        if (error_ instanceof Error) {
          setError(error_.message);
        } else {
          setError("An unknown error occurred while fetching theatres");
        }
        setLoading(false);
      }
    };

    fetchTheatres();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "available": {
        return <Activity className="h-4 w-4 text-green-500" />;
      }
      case "in_use": {
        return <WifiOff className="h-4 w-4 text-red-500" />;
      }
      case "maintenance": {
        return <Badge variant="secondary">Maintenance</Badge>;
      }
      default: {
        return <Badge>{status}</Badge>;
      }
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        {loading && <div>Loading theatres...</div>}
        {error && <div className="text-red-500">Error: {error}</div>}
        {!loading && !error && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Specialty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {theatres.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No theatres found.
                  </TableCell>
                </TableRow>
              ) : (
                theatres.map((theatre) => (
                  <TableRow key={theatre.id}>
                    <TableCell>{theatre.name}</TableCell>
                    <TableCell>{theatre.location || "N/A"}</TableCell>
                    <TableCell>{theatre.specialty || "N/A"}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(theatre.status)}
                        <span>
                          {theatre.status.charAt(0).toUpperCase() +
                            theatre.status.slice(1)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          title="Edit Theatre"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          title="Delete Theatre"
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
