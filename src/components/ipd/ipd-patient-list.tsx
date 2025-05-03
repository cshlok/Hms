import React, { useState, useEffect } from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Button,
  // Badge, // FIX: Removed unused import
} from "@/components/ui";

// FIX: Define an interface for the patient data structure
interface Inpatient {
  id: string; // Assuming this is the admission ID (string)
  patient_id: string; // FIX: Add patient_id field
  patient_first_name: string;
  patient_last_name: string;
  admission_number: string;
  bed_number: string;
  room_number?: string | null;
  ward: string;
  doctor_first_name: string;
  doctor_last_name: string;
  admission_date: string; // Assuming ISO date string
  // Add other relevant fields if needed
}

// FIX: Define type for API response
// Assuming the API returns an array of Inpatient objects directly
// Adjust if the structure is different (e.g., { results: Inpatient[] })
type InpatientsApiResponse = Inpatient[];

// FIX: Define props for IPDPatientList
interface IPDPatientListProperties {
  // FIX: Ensure prop types match usage in parent (ipd/page.tsx)
  onViewPatient: (admissionId: number, patientId: number) => void;
}

// FIX: Update component to accept props
const IPDPatientList: React.FC<IPDPatientListProperties> = ({
  onViewPatient,
}) => {
  // FIX: Add type annotation for the patients state
  const [patients, setPatients] = useState<Inpatient[]>([]);
  const [loading, setLoading] = useState(true);
  // FIX: Add type annotation for the error state
  const [error, setError] = useState<string | null>();

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        setError(undefined); // Reset error on new fetch
        const response = await fetch("/api/ipd/admissions?status=active");

        if (!response.ok) {
          throw new Error("Failed to fetch inpatient list");
        }

        // FIX: Add type assertion for the API response data
        const data: InpatientsApiResponse = await response.json();
        // FIX: Ensure data is an array before setting state
        // FIX: Also ensure patient_id exists in the fetched data, otherwise filter/map
        const validData = Array.isArray(data)
          ? data.filter((p) => p.id && p.patient_id)
          : [];
        setPatients(validData);
      } catch (error_: unknown) {
        // FIX: Use unknown for catch block
        console.error("Error fetching inpatients:", error_);
        // FIX: Type check error before accessing message
        const message =
          error_ instanceof Error
            ? error_.message
            : "An unknown error occurred";
        setError(
          `Failed to load inpatient list: ${message}. Please try again later.`
        );
        setPatients([]); // Clear patients on error
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  // FIX: Handler for the button click
  const handleViewClick = (
    admissionIdString: string,
    patientIdString: string
  ) => {
    // FIX: Parse IDs as numbers before calling onViewPatient
    const admissionId = Number.parseInt(admissionIdString, 10);
    const patientId = Number.parseInt(patientIdString, 10);
    if (!Number.isNaN(admissionId) && !Number.isNaN(patientId)) {
      onViewPatient(admissionId, patientId);
    } else {
      console.error(
        "Invalid ID format for patient or admission:",
        admissionIdString,
        patientIdString
      );
      setError("Could not view patient details due to invalid data.");
    }
  };

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
        </div>
      ) : error ? (
        <div className="text-red-500 p-4 text-center">{error}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient Name</TableHead>
              <TableHead>Admission No.</TableHead>
              <TableHead>Bed</TableHead>
              <TableHead>Ward</TableHead>
              <TableHead>Primary Doctor</TableHead>
              <TableHead>Admission Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">
                  No active inpatients found
                </TableCell>
              </TableRow>
            ) : (
              // FIX: Use the correctly typed patients array
              (patients.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell>
                    {patient.patient_first_name} {patient.patient_last_name}
                  </TableCell>
                  <TableCell>{patient.admission_number}</TableCell>
                  <TableCell>
                    {patient.bed_number} ({patient.room_number || "N/A"})
                  </TableCell>
                  <TableCell>{patient.ward}</TableCell>
                  <TableCell>
                    Dr. {patient.doctor_first_name} {patient.doctor_last_name}
                  </TableCell>
                  <TableCell>
                    {new Date(patient.admission_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {/* FIX: Add onClick handler */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleViewClick(patient.id, patient.patient_id)
                      }
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              )))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default IPDPatientList;
