// src/components/er/ERCriticalAlerts.tsx
"use client";

import { useState, useEffect } from "react";
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
import { AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast"; // Changed import

// Mock data structure - replace with API data
interface CriticalAlert {
  id: string;
  visit_id: string;
  patient_name: string; // Need to join with visits/patients table
  mrn: string; // Need to join
  location: string; // Need to join
  alert_type: string; // Sepsis, Stroke, STEMI, Critical Lab, etc.
  activation_timestamp: string;
  status: string; // Active, Acknowledged, Resolved
  details?: string;
}

// Mock data - replace with API fetch
const mockAlerts: CriticalAlert[] = [
  {
    id: "alert_uuid_1", visit_id: "visit_1", patient_name: "John Doe", mrn: "MRN001", location: "Room 3", alert_type: "STEMI", activation_timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), status: "Active", details: "ECG shows ST elevation."
  },
  {
    id: "alert_uuid_2", visit_id: "visit_4", patient_name: "Alice Wonderland", mrn: "MRN004", location: "Triage Room 2", alert_type: "Stroke", activation_timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), status: "Active", details: "FAST positive, right-sided weakness."
  },
  {
    id: "alert_uuid_3", visit_id: "visit_5", patient_name: "Bob Builder", mrn: "MRN005", location: "Room 1", alert_type: "Sepsis", activation_timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), status: "Acknowledged", details: "Meets SIRS criteria, lactate elevated."
  },
  {
    id: "alert_uuid_4", visit_id: "visit_2", patient_name: "Jane Smith", mrn: "MRN002", location: "Room 5", alert_type: "Critical Lab", activation_timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), status: "Active", details: "Potassium: 6.8 mmol/L"
  },
];

const getAlertBadgeVariant = (status: string): "destructive" | "warning" | "default" => {
  switch (status) {
    case "Active": return "destructive";
    case "Acknowledged": return "warning";
    default: return "default";
  }
};

export default function ERCriticalAlerts() {
  const [alerts, setAlerts] = useState<CriticalAlert[]>(mockAlerts);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast(); // Added hook call

  // TODO: Fetch data from API: GET /api/er/alerts?status=active (or similar endpoint)
  // useEffect(() => {
  //   fetch("/api/er/alerts?status=active") // Example: fetch only active alerts
  //     .then(res => res.json())
  //     .then(data => setAlerts(data));
  // }, []);

  // TODO: Implement real-time updates via WebSockets or polling

  const handleAcknowledge = async (alertId: string) => {
    setIsLoading(true);
    console.log(`Acknowledging alert: ${alertId}`);
    // TODO: Implement API call: PUT /api/er/visits/[visitId]/alerts/[alertId] { status: "Acknowledged" }
    try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500)); 
        setAlerts(prevAlerts => 
            prevAlerts.map(alert => 
                alert.id === alertId ? { ...alert, status: "Acknowledged" } : alert
            )
        );
        toast({ title: "Alert Acknowledged", description: `Alert ${alertId} marked as acknowledged.` });
    } catch (error: any) { 
        toast({ title: "Error", description: "Failed to acknowledge alert.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  const handleResolve = async (alertId: string) => {
    setIsLoading(true);
    console.log(`Resolving alert: ${alertId}`);
    // TODO: Implement API call: PUT /api/er/visits/[visitId]/alerts/[alertId] { status: "Resolved" }
     try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500)); 
        setAlerts(prevAlerts => 
            prevAlerts.filter(alert => alert.id !== alertId) // Remove resolved alerts from view
        );
        toast({ title: "Alert Resolved", description: `Alert ${alertId} marked as resolved.` });
    } catch (error: any) { 
        toast({ title: "Error", description: "Failed to resolve alert.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  const activeAlerts = alerts.filter(a => a.status === "Active" || a.status === "Acknowledged");

  return (
    <div className="space-y-4">
       <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient (MRN)</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Alert Type</TableHead>
              <TableHead>Activated</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeAlerts.length > 0 ? (
              activeAlerts.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell>
                    <div className="font-medium">{alert.patient_name}</div>
                    <div className="text-sm text-muted-foreground">{alert.mrn}</div>
                  </TableCell>
                  <TableCell>{alert.location}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-1 text-red-600" />
                      {alert.alert_type}
                    </div>
                  </TableCell>
                  <TableCell>{new Date(alert.activation_timestamp).toLocaleTimeString()}</TableCell>
                  <TableCell className="max-w-[250px] truncate">{alert.details || "N/A"}</TableCell>
                  <TableCell>
                    <Badge variant={getAlertBadgeVariant(alert.status)}>{alert.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {alert.status === "Active" && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleAcknowledge(alert.id)}
                          disabled={isLoading}
                        >
                          Ack
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleResolve(alert.id)}
                        disabled={isLoading}
                      >
                        Resolve
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No active critical alerts.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

