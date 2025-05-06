// src/app/dashboard/patients/page.tsx
"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search } from "lucide-react";
import { Patient } from "@/types/patient"; // Assuming Patient type exists
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

// Define interface for error response
interface ErrorResponse {
  error?: string;
  message?: string;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const fetchPatients = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/patients"); // Use the GET endpoint created earlier
        if (!response.ok) {
          // FIX: Cast error response JSON to defined type
          const errorData = (await response.json()) as ErrorResponse;
          throw new Error(errorData?.error || errorData?.message || "Failed to fetch patients");
        }
        const data: Patient[] = await response.json();
        setPatients(data);
      } catch (err: unknown) { // Use unknown
        const message = err instanceof Error ? err.message : "An unknown error occurred";
        setError(message);
        toast({
          title: "Error Fetching Patients",
          description: message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatients();
  }, [toast]);

  const filteredPatients = patients.filter((patient) =>
    `${patient.first_name} ${patient.last_name}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
    patient.phone_number.includes(searchTerm) ||
    (patient.email && patient.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Patients</h1>
          <Link href="/dashboard/patients/new">
             <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Patient
             </Button>
          </Link>
        </div>

        {/* Search Bar */}
        <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                type="search"
                placeholder="Search by name, phone, or email..."
                className="pl-8 w-full md:w-1/3 lg:w-1/4"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        {/* Patients Table */}
        {isLoading && <p>Loading patients...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}
        {!isLoading && !error && (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>DOB</TableHead>
                  <TableHead>Registered On</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.length > 0 ? (
                  filteredPatients.map((patient) => (
                    <TableRow key={patient.patient_id}>
                      <TableCell className="font-medium">
                        {patient.first_name} {patient.last_name}
                      </TableCell>
                      <TableCell>{patient.phone_number}</TableCell>
                      <TableCell>{patient.email || "N/A"}</TableCell>
                      <TableCell>{patient.gender}</TableCell>
                      <TableCell>{patient.date_of_birth}</TableCell>
                      <TableCell>{new Date(patient.registration_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {/* Add action buttons like View, Edit */}
                        <Link href={`/dashboard/patients/${patient.patient_id}`}>
                           <Button variant="outline" size="sm">View</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      No patients found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

