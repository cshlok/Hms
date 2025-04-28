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

// Mock data structure - replace with API data
interface ERPatient {
  id: string;
  name: string;
  mrn: string;
  age: number;
  sex: string;
  chiefComplaint: string;
  arrivalTime: string;
  location: string;
  esi: number;
  waitTime: string; // Calculated: Now - ArrivalTime
  los: string; // Calculated: Now - ArrivalTime
  physician: string | null;
  nurse: string | null;
  status: string; // Triage, Assessment, Treatment, Awaiting Disposition, Discharged, Admitted
  indicators: {
    labPending?: boolean;
    labReady?: boolean;
    radPending?: boolean;
    radReady?: boolean;
    medsPending?: boolean;
    consultPending?: boolean;
    criticalAlert?: string; // e.g., Sepsis, Stroke
    isolation?: string; // e.g., Contact, Droplet
    fallRisk?: boolean;
  };
}

// Mock data - replace with API fetch
const mockPatients: ERPatient[] = [
  {
    id: "visit_1", name: "John Doe", mrn: "MRN001", age: 65, sex: "M", chiefComplaint: "Chest Pain", arrivalTime: new Date(Date.now() - 65 * 60 * 1000).toISOString(), location: "Room 3", esi: 2, waitTime: "5 min", los: "65 min", physician: "Dr. Smith", nurse: "Nurse Joy", status: "Treatment",
    indicators: { labPending: true, radPending: true, criticalAlert: "STEMI" }
  },
  {
    id: "visit_2", name: "Jane Smith", mrn: "MRN002", age: 42, sex: "F", chiefComplaint: "Abdominal Pain", arrivalTime: new Date(Date.now() - 120 * 60 * 1000).toISOString(), location: "Room 5", esi: 3, waitTime: "15 min", los: "120 min", physician: "Dr. Jones", nurse: "Nurse Kim", status: "Assessment",
    indicators: { labReady: true, radPending: true, isolation: "Contact" }
  },
  {
    id: "visit_3", name: "Peter Pan", mrn: "MRN003", age: 28, sex: "M", chiefComplaint: "Laceration", arrivalTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(), location: "Fast Track 1", esi: 4, waitTime: "8 min", los: "30 min", physician: null, nurse: "Nurse Lee", status: "Treatment",
    indicators: { medsPending: true }
  },
  {
    id: "visit_4", name: "Alice Wonderland", mrn: "MRN004", age: 78, sex: "F", chiefComplaint: "Weakness", arrivalTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(), location: "Triage Room 2", esi: 3, waitTime: "15 min", los: "15 min", physician: null, nurse: "Nurse Ben", status: "Triage",
    indicators: { fallRisk: true, criticalAlert: "Stroke" }
  },
  {
    id: "visit_5", name: "Bob Builder", mrn: "MRN005", age: 50, sex: "M", chiefComplaint: "Fever, Cough", arrivalTime: new Date(Date.now() - 240 * 60 * 1000).toISOString(), location: "Room 1", esi: 3, waitTime: "20 min", los: "240 min", physician: "Dr. Smith", nurse: "Nurse Joy", status: "Awaiting Disposition",
    indicators: { labReady: true, radReady: true, consultPending: true }
  },
];

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
  const [patients, setPatients] = useState<ERPatient[]>(mockPatients);
  const [filterName, setFilterName] = useState("");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterEsi, setFilterEsi] = useState("all");

  // TODO: Fetch data from API: GET /api/er/visits
  // useEffect(() => {
  //   fetch("/api/er/visits?status=active") // Example: fetch only active patients
  //     .then(res => res.json())
  //     .then(data => setPatients(data));
  // }, []);

  // TODO: Implement real-time updates via WebSockets or polling

  const filteredPatients = patients.filter(p => {
    const nameMatch = p.name.toLowerCase().includes(filterName.toLowerCase()) || p.mrn.includes(filterName);
    const locationMatch = filterLocation === "all" || p.location === filterLocation;
    const esiMatch = filterEsi === "all" || p.esi === parseInt(filterEsi);
    return nameMatch && locationMatch && esiMatch;
  });

  // Get unique locations for filter dropdown
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
            {filteredPatients.length > 0 ? (
              filteredPatients.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell>
                    <div className="font-medium">{patient.name}</div>
                    <div className="text-sm text-muted-foreground">{patient.mrn} ({patient.age}{patient.sex})</div>
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">{patient.chiefComplaint}</TableCell>
                  <TableCell>{patient.location}</TableCell>
                  <TableCell>
                    <Badge variant={getEsiBadgeVariant(patient.esi)}>ESI {patient.esi}</Badge>
                  </TableCell>
                  <TableCell>{patient.waitTime}</TableCell>
                  <TableCell>{patient.los}</TableCell>
                  <TableCell>
                    <div className="text-sm">MD: {patient.physician || "N/A"}</div>
                    <div className="text-sm">RN: {patient.nurse || "N/A"}</div>
                  </TableCell>
                  <TableCell>{patient.status}</TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      {patient.indicators.criticalAlert && <AlertCircle className="h-4 w-4 text-red-600" title={`Alert: ${patient.indicators.criticalAlert}`} />}
                      {patient.indicators.labPending && <FlaskConical className="h-4 w-4 text-blue-500" title="Lab Pending" />}
                      {patient.indicators.labReady && <FlaskConical className="h-4 w-4 text-green-500" title="Lab Ready" />}
                      {patient.indicators.radPending && <Radiation className="h-4 w-4 text-blue-500" title="Radiology Pending" />}
                      {patient.indicators.radReady && <Radiation className="h-4 w-4 text-green-500" title="Radiology Ready" />}
                      {patient.indicators.medsPending && <Pill className="h-4 w-4 text-orange-500" title="Meds Pending" />}
                      {patient.indicators.consultPending && <UserCheck className="h-4 w-4 text-purple-500" title="Consult Pending" />}
                      {patient.indicators.isolation && <Biohazard className="h-4 w-4 text-yellow-600" title={`Isolation: ${patient.indicators.isolation}`} />}
                      {patient.indicators.fallRisk && <TriangleAlert className="h-4 w-4 text-yellow-500" title="Fall Risk" />}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  No patients found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
