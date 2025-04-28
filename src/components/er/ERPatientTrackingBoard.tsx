// src/components/er/ERPatientTrackingBoard.tsx
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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertCircle, // For Critical Alerts
  FlaskConical, // For Lab Pending/Ready
  Radiation, // For Radiology Pending/Ready
  Pill, // For Meds Pending
  UserCheck, // For Consult Pending
  TriangleAlert, // For Fall Risk
  Biohazard // For Isolation
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton for loading state

// Interface for API data
interface ERPatient {
  id: string; // visit_id
  patient_id: string;
  patient_name: string;
  mrn: string;
  age: number;
  sex: string;
  chief_complaint: string;
  arrival_time: string;
  location: string;
  esi: number;
  assigned_physician: string | null;
  assigned_nurse: string | null;
  status: string; // Triage, Assessment, Treatment, Awaiting Disposition, Discharged, Admitted
  indicators: {
    lab_pending?: boolean;
    lab_ready?: boolean;
    rad_pending?: boolean;
    rad_ready?: boolean;
    meds_pending?: boolean;
    consult_pending?: boolean;
    critical_alert?: string; // e.g., Sepsis, Stroke
    isolation?: string; // e.g., Contact, Droplet
    fall_risk?: boolean;
  };
}

// Helper function to calculate time difference
const calculateTimeDiff = (startTime: string): string => {
  const start = new Date(startTime).getTime();
  const now = Date.now();
  const diffMinutes = Math.round((now - start) / (1000 * 60));
  
  if (diffMinutes < 60) {
    return `${diffMinutes} min`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  const remainingMinutes = diffMinutes % 60;
  return `${diffHours}h ${remainingMinutes}m`;
};

const getEsiBadgeVariant = (esi: number): "destructive" | "warning" | "success" | "info" | "secondary" => {
  switch (esi) {
    case 1: return "destructive";
    case 2: return "warning";
    case 3: return "success";
    case 4: return "info";
    case 5: return "secondary";
    default: return "secondary";
  }
};

export default function ERPatientTrackingBoard() {
  const [patients, setPatients] = useState<ERPatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterName, setFilterName] = useState("");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterEsi, setFilterEsi] = useState("all");

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Assuming an API endpoint exists at /api/er/visits that returns active patients
        const response = await fetch("/api/er/visits?status=active"); 
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: ERPatient[] = await response.json();
        setPatients(data);
      } catch (err) {
        console.error("Failed to fetch ER patients:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    
    // Optional: Set up polling or WebSocket for real-time updates
    // const intervalId = setInterval(fetchData, 30000); // Poll every 30 seconds
    // return () => clearInterval(intervalId);

  }, []);

  const filteredPatients = patients.filter(p => {
    const nameMatch = p.patient_name.toLowerCase().includes(filterName.toLowerCase()) || p.mrn.includes(filterName);
    const locationMatch = filterLocation === "all" || p.location === filterLocation;
    const esiMatch = filterEsi === "all" || p.esi === parseInt(filterEsi);
    return nameMatch && locationMatch && esiMatch;
  });

  // Get unique locations for filter dropdown from fetched data
  const locations = ["all", ...Array.from(new Set(patients.map(p => p.location)))];

  return (
    <div className="space-y-4">
      <div className="flex space-x-4">
        <Input 
          placeholder="Filter by Name/MRN..." 
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
          className="max-w-sm"
        />
        <Select value={filterLocation} onValueChange={setFilterLocation}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Location" />
          </SelectTrigger>
          <SelectContent>
            {locations.map(loc => (
              <SelectItem key={loc} value={loc}>{loc === "all" ? "All Locations" : loc}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterEsi} onValueChange={setFilterEsi}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by ESI" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ESI Levels</SelectItem>
            {[1, 2, 3, 4, 5].map(level => (
              <SelectItem key={level} value={level.toString()}>ESI {level}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {error && (
        <div className="text-red-600 border border-red-600 p-3 rounded-md">
          Error fetching data: {error}
        </div>
      )}
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient (MRN)</TableHead>
              <TableHead>Complaint</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>ESI</TableHead>
              <TableHead>Wait</TableHead>
              <TableHead>LOS</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Indicators</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading Skeleton Rows
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-1/2" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-1/2" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-1/2" /></TableCell>
                </TableRow>
              ))
            ) : filteredPatients.length > 0 ? (
              filteredPatients.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell>
                    <div className="font-medium">{patient.patient_name}</div>
                    <div className="text-sm text-muted-foreground">{patient.mrn} ({patient.age}{patient.sex})</div>
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">{patient.chief_complaint}</TableCell>
                  <TableCell>{patient.location}</TableCell>
                  <TableCell>
                    <Badge variant={getEsiBadgeVariant(patient.esi)}>ESI {patient.esi}</Badge>
                  </TableCell>
                  <TableCell>{calculateTimeDiff(patient.arrival_time)}</TableCell> {/* Calculate Wait Time dynamically */} 
                  <TableCell>{calculateTimeDiff(patient.arrival_time)}</TableCell> {/* Calculate LOS dynamically */} 
                  <TableCell>
                    <div className="text-sm">MD: {patient.assigned_physician || "N/A"}</div>
                    <div className="text-sm">RN: {patient.assigned_nurse || "N/A"}</div>
                  </TableCell>
                  <TableCell>{patient.status}</TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      {patient.indicators.critical_alert && <AlertCircle className="h-4 w-4 text-red-600" title={`Alert: ${patient.indicators.critical_alert}`} />}
                      {patient.indicators.lab_pending && <FlaskConical className="h-4 w-4 text-blue-500" title="Lab Pending" />}
                      {patient.indicators.lab_ready && <FlaskConical className="h-4 w-4 text-green-500" title="Lab Ready" />}
                      {patient.indicators.rad_pending && <Radiation className="h-4 w-4 text-blue-500" title="Radiology Pending" />}
                      {patient.indicators.rad_ready && <Radiation className="h-4 w-4 text-green-500" title="Radiology Ready" />}
                      {patient.indicators.meds_pending && <Pill className="h-4 w-4 text-orange-500" title="Meds Pending" />}
                      {patient.indicators.consult_pending && <UserCheck className="h-4 w-4 text-purple-500" title="Consult Pending" />}
                      {patient.indicators.isolation && <Biohazard className="h-4 w-4 text-yellow-600" title={`Isolation: ${patient.indicators.isolation}`} />}
                      {patient.indicators.fall_risk && <TriangleAlert className="h-4 w-4 text-yellow-500" title="Fall Risk" />}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  No active patients found matching criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

