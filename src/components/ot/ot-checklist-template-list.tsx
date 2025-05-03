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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card"; // FIX: Add missing imports
import { Edit, Trash2 } from "lucide-react";

// Mock data structure - replace with actual API response type
interface ChecklistItem {
  id: string;
  text: string;
}

interface ChecklistTemplate {
  id: string;
  name: string;
  phase: string;
  items: ChecklistItem[];
  updated_at: string;
}

export default function OTChecklistTemplateList() {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>();

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        setError(undefined);

        // Replace with actual API call
        // const response = await fetch("/api/ot/checklist-templates");
        // if (!response.ok) {
        //   throw new Error("Failed to fetch checklist templates");
        // }
        // const data = await response.json();
        // setTemplates(data);

        // Mock data for demonstration
        await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate delay
        const mockData: ChecklistTemplate[] = [
          {
            id: "clt-1",
            name: "WHO Surgical Safety Checklist (Pre-Op)",
            phase: "pre-op",
            items: [
              {
                id: "item-1",
                text: "Patient confirmed identity, site, procedure, consent?",
              },
              { id: "item-2", text: "Site marked?" },
              { id: "item-3", text: "Anesthesia safety check completed?" },
              {
                id: "item-4",
                text: "Pulse oximeter on patient and functioning?",
              },
              { id: "item-5", text: "Does patient have known allergies?" },
            ],
            updated_at: "2025-04-25T10:00:00Z",
          },
          {
            id: "clt-2",
            name: "WHO Surgical Safety Checklist (Intra-Op - Before Skin Incision)",
            phase: "intra-op",
            items: [
              {
                id: "item-1",
                text: "Confirm all team members introduced by name and role?",
              },
              {
                id: "item-2",
                text: "Confirm patient name, procedure, incision site?",
              },
              {
                id: "item-3",
                text: "Antibiotic prophylaxis given within last 60 minutes?",
              },
              { id: "item-4", text: "Anticipated critical events reviewed?" },
            ],
            updated_at: "2025-04-25T11:00:00Z",
          },
          {
            id: "clt-3",
            name: "WHO Surgical Safety Checklist (Post-Op - Before Patient Leaves OR)",
            phase: "post-op",
            items: [
              {
                id: "item-1",
                text: "Nurse confirms name of procedure recorded?",
              },
              {
                id: "item-2",
                text: "Instrument, sponge, needle counts correct?",
              },
              { id: "item-3", text: "Specimen labelling correct?" },
              { id: "item-4", text: "Equipment problems identified?" },
              {
                id: "item-5",
                text: "Key concerns for recovery and management reviewed?",
              },
            ],
            updated_at: "2025-04-26T09:00:00Z",
          },
        ];
        setTemplates(mockData);

        setLoading(false);
      } catch (error_: unknown) {
        if (error_ instanceof Error) {
          setError(error_.message);
        } else {
          setError("An unknown error occurred");
        }
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const getPhaseBadge = (phase: string) => {
    switch (phase.toLowerCase()) {
      case "pre-op": {
        return <Badge className="bg-blue-100 text-blue-800">Pre-Op</Badge>;
      }
      case "intra-op": {
        return (
          <Badge className="bg-yellow-100 text-yellow-800">Intra-Op</Badge>
        );
      }
      case "post-op": {
        return <Badge className="bg-green-100 text-green-800">Post-Op</Badge>;
      }
      default: {
        return <Badge>{phase}</Badge>;
      }
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        {loading && <div>Loading checklist templates...</div>}
        {error && <div className="text-red-500">Error: {error}</div>}
        {!loading && !error && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phase</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    No checklist templates found.
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>{template.name}</TableCell>
                    <TableCell>{getPhaseBadge(template.phase)}</TableCell>
                    <TableCell>{template.items.length}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          title="View/Edit Template"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          title="Delete Template"
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
