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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle, // For Critical Alerts
  FlaskConical, // For Lab Pending/Ready
  Radiation, // For Radiology Pending/Ready
  Pill, // For Meds Pending
  UserCheck, // For Consult Pending
  TriangleAlert, // For Fall Risk
  Biohazard, // For Isolation
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton for loading state
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Import Tooltip

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
  try {
    const start = new Date(startTime).getTime();
    if (Number.isNaN(start)) return "Invalid Date";
    const now = Date.now();
    const diffMinutes = Math.round((now - start) / (1000 * 60));

    if (diffMinutes < 0) return "0 min"; // Handle future times if necessary
    if (diffMinutes < 60) {
      return `${diffMinutes} min`;
    }
    const diffHours = Math.floor(diffMinutes / 60);
    const remainingMinutes = diffMinutes % 60;
    return `${diffHours}h ${remainingMinutes}m`;
  } catch {
    return "Error";
  }
};

// FIX: Adjust return type and values to match allowed Badge variants
const getEsiBadgeVariant = (
  esi: number
): "destructive" | "secondary" | "default" | "outline" => {
  switch (esi) {
    case 1: {
      return "destructive";
    } // Highest urgency
    case 2: {
      return "secondary";
    } // High urgency (mapped from warning)
    case 3: {
      return "default";
    } // Moderate urgency (mapped from success)
    case 4: {
      return "outline";
    } // Low urgency (mapped from info)
    case 5: {
      return "outline";
    } // Lowest urgency (mapped from secondary)
    default: {
      return "outline";
    }
  }
};

export default function ERPatientTrackingBoard() {
  const [patients, setPatients] = useState<ERPatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>();
  const [filterName, setFilterName] = useState("");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterEsi, setFilterEsi] = useState("all");

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(undefined);
      try {
        // TODO: Replace with actual API endpoint
        // Simulating API fetch with mock data for now
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate network delay
        const mockData: ERPatient[] = [
          {
            id: "visit_1",
            patient_id: "p1",
            patient_name: "John Doe",
            mrn: "MRN001",
            age: 45,
            sex: "M",
            chief_complaint: "Chest Pain",
            arrival_time: new Date(Date.now() - 125 * 60 * 1000).toISOString(),
            location: "Room 3",
            esi: 2,
            assigned_physician: "Dr. Smith",
            assigned_nurse: "Nurse Joy",
            status: "Treatment",
            indicators: {
              lab_pending: true,
              rad_pending: true,
              critical_alert: "STEMI",
            },
          },
          {
            id: "visit_2",
            patient_id: "p2",
            patient_name: "Jane Smith",
            mrn: "MRN002",
            age: 68,
            sex: "F",
            chief_complaint: "Shortness of Breath",
            arrival_time: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            location: "Room 5",
            esi: 3,
            assigned_physician: "Dr. Jones",
            assigned_nurse: "Nurse Kim",
            status: "Assessment",
            indicators: { lab_ready: true, fall_risk: true },
          },
          {
            id: "visit_3",
            patient_id: "p3",
            patient_name: "Peter Pan",
            mrn: "MRN003",
            age: 32,
            sex: "M",
            chief_complaint: "Abdominal Pain",
            arrival_time: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
            location: "Hallway Bed 1",
            esi: 4,
            assigned_physician: null,
            assigned_nurse: "Nurse Lee",
            status: "Awaiting Disposition",
            indicators: { rad_ready: true, consult_pending: true },
          },
          {
            id: "visit_4",
            patient_id: "p4",
            patient_name: "Alice Wonderland",
            mrn: "MRN004",
            age: 75,
            sex: "F",
            chief_complaint: "Weakness",
            arrival_time: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            location: "Triage Room 2",
            esi: 2,
            assigned_physician: null,
            assigned_nurse: null,
            status: "Triage",
            indicators: { critical_alert: "Stroke" },
          },
          {
            id: "visit_5",
            patient_id: "p5",
            patient_name: "Bob Builder",
            mrn: "MRN005",
            age: 50,
            sex: "M",
            chief_complaint: "Laceration",
            arrival_time: new Date(Date.now() - 200 * 60 * 1000).toISOString(),
            location: "Room 1",
            esi: 5,
            assigned_physician: "Dr. Smith",
            assigned_nurse: "Nurse Joy",
            status: "Discharged",
            indicators: {},
          }, // Example discharged patient (might be filtered out by API)
        ];
        // Filter out discharged patients for the active board view
        setPatients(mockData.filter((p) => p.status !== "Discharged"));
        // const response = await fetch("/api/er/visits?status=active");
        // if (!response.ok) {
        //   throw new Error(`HTTP error! status: ${response.status}`);
        // }
        // const data: ERPatient[] = await response.json();
        // setPatients(data);
      } catch (error_) {
        console.error("Failed to fetch ER patients:", error_);
        setError(
          error_ instanceof Error ? error_.message : "An unknown error occurred"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Optional: Set up polling or WebSocket for real-time updates
    // const intervalId = setInterval(fetchData, 30000); // Poll every 30 seconds
    // return () => clearInterval(intervalId);
  }, []);

  const filteredPatients = patients.filter((p) => {
    const nameMatch =
      filterName === "" ||
      p.patient_name.toLowerCase().includes(filterName.toLowerCase()) ||
      p.mrn.includes(filterName);
    const locationMatch =
      filterLocation === "all" || p.location === filterLocation;
    const esiMatch =
      filterEsi === "all" || p.esi === Number.parseInt(filterEsi);
    return nameMatch && locationMatch && esiMatch;
  });

  // Get unique locations for filter dropdown from fetched data
  const locations = ["all", ...new Set(patients.map((p) => p.location))];

  return (
    <TooltipProvider>
      {" "}
      {/* Wrap with TooltipProvider */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          <Input
            placeholder="Filter by Name/MRN..."
            value={filterName}
            onChange={(_event_) => setFilterName(_event_.target.value)}
            className="max-w-full sm:max-w-sm"
          />
          <Select value={filterLocation} onValueChange={setFilterLocation}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by Location" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc} value={loc}>
                  {loc === "all" ? "All Locations" : loc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterEsi} onValueChange={setFilterEsi}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Filter by ESI" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ESI Levels</SelectItem>
              {[1, 2, 3, 4, 5].map((level) => (
                <SelectItem key={level} value={level.toString()}>
                  ESI {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div className="text-red-600 dark:text-red-400 border border-red-600 dark:border-red-400 p-3 rounded-md bg-red-50 dark:bg-red-900/30">
            Error fetching data: {error}
          </div>
        )}

        <div className="rounded-md border dark:border-gray-700">
          <Table>
            <TableHeader>
              <TableRow className="border-b dark:border-gray-700">
                <TableHead className="text-gray-700 dark:text-gray-300">
                  Patient (MRN)
                </TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">
                  Complaint
                </TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">
                  Location
                </TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">
                  ESI
                </TableHead>
                {/* <TableHead>Wait</TableHead> */}{" "}
                {/* Wait time might be complex, removing for now */}
                <TableHead className="text-gray-700 dark:text-gray-300">
                  LOS
                </TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">
                  Staff
                </TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">
                  Status
                </TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">
                  Indicators
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Loading Skeleton Rows
                (Array.from({ length: 5 }).map((_, index) => (
                  <TableRow
                    key={`skeleton-${index}`}
                    className="border-b dark:border-gray-700 last:border-b-0"
                  >
                    <TableCell>
                      <Skeleton className="h-4 w-3/4" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-1/2" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-12" />
                    </TableCell>
                    {/* <TableCell><Skeleton className="h-4 w-10" /></TableCell> */}
                    <TableCell>
                      <Skeleton className="h-4 w-10" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-3/4" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-1/2" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-1/2" />
                    </TableCell>
                  </TableRow>
                )))
              ) : filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => (
                  <TableRow
                    key={patient.id}
                    className="border-b dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <TableCell>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {patient.patient_name}
                      </div>
                      <div className="text-sm text-muted-foreground dark:text-gray-400">
                        {patient.mrn} ({patient.age}
                        {patient.sex})
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-gray-700 dark:text-gray-300">
                      {patient.chief_complaint}
                    </TableCell>
                    <TableCell className="text-gray-700 dark:text-gray-300">
                      {patient.location}
                    </TableCell>
                    <TableCell>
                      {/* FIX: Ensure variant is valid */}
                      <Badge variant={getEsiBadgeVariant(patient.esi)}>
                        ESI {patient.esi}
                      </Badge>
                    </TableCell>
                    {/* <TableCell>{calculateTimeDiff(patient.arrival_time)}</TableCell> */}
                    <TableCell className="text-gray-700 dark:text-gray-300">
                      {calculateTimeDiff(patient.arrival_time)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        MD: {patient.assigned_physician || "N/A"}
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        RN: {patient.assigned_nurse || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-700 dark:text-gray-300">
                      {patient.status}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1.5">
                        {/* FIX: Remove title prop, wrap with Tooltip */}
                        {patient.indicators.critical_alert && (
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Alert: {patient.indicators.critical_alert}
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {patient.indicators.lab_pending && (
                          <Tooltip>
                            <TooltipTrigger>
                              <FlaskConical className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                            </TooltipTrigger>
                            <TooltipContent>Lab Pending</TooltipContent>
                          </Tooltip>
                        )}
                        {patient.indicators.lab_ready && (
                          <Tooltip>
                            <TooltipTrigger>
                              <FlaskConical className="h-4 w-4 text-green-500 dark:text-green-400" />
                            </TooltipTrigger>
                            <TooltipContent>Lab Ready</TooltipContent>
                          </Tooltip>
                        )}
                        {patient.indicators.rad_pending && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Radiation className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                            </TooltipTrigger>
                            <TooltipContent>Radiology Pending</TooltipContent>
                          </Tooltip>
                        )}
                        {patient.indicators.rad_ready && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Radiation className="h-4 w-4 text-green-500 dark:text-green-400" />
                            </TooltipTrigger>
                            <TooltipContent>Radiology Ready</TooltipContent>
                          </Tooltip>
                        )}
                        {patient.indicators.meds_pending && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Pill className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                            </TooltipTrigger>
                            <TooltipContent>Meds Pending</TooltipContent>
                          </Tooltip>
                        )}
                        {patient.indicators.consult_pending && (
                          <Tooltip>
                            <TooltipTrigger>
                              <UserCheck className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                            </TooltipTrigger>
                            <TooltipContent>Consult Pending</TooltipContent>
                          </Tooltip>
                        )}
                        {patient.indicators.isolation && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Biohazard className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Isolation: {patient.indicators.isolation}
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {patient.indicators.fall_risk && (
                          <Tooltip>
                            <TooltipTrigger>
                              <TriangleAlert className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                            </TooltipTrigger>
                            <TooltipContent>Fall Risk</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-24 text-center text-gray-500 dark:text-gray-400"
                  >
                    No active patients found matching the criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </TooltipProvider>
  );
}
