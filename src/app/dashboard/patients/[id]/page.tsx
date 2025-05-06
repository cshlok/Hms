// src/app/dashboard/patients/[id]/page.tsx
"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label"; // Added import for Label
import { useToast } from "@/hooks/use-toast";
import { Patient } from "@/types/patient";
import { Edit, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const patientId = params.id as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!patientId) return;

    const fetchPatient = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/patients/${patientId}`);
        if (!response.ok) {
          const errorData: { error?: string } = await response.json();
          throw new Error(errorData.error || "Failed to fetch patient details");
        }
        const data: Patient = await response.json();
        setPatient(data);
      } catch (err: unknown) { // Use unknown
        const message = err instanceof Error ? err.message : "An unknown error occurred";
        setError(message);
        toast({
          title: "Error Fetching Patient",
          description: message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatient();
  }, [patientId, toast]);

  const handleDeactivate = async () => {
    setIsDeleting(true);
    try {
        const response = await fetch(`/api/patients/${patientId}`, {
            method: "DELETE",
        });
        const result: { error?: string } = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Failed to deactivate patient");
        }
        toast({
            title: "Patient Deactivated",
            description: `${patient?.first_name} ${patient?.last_name} has been deactivated.`,
        });
        router.push("/dashboard/patients"); // Redirect to list after deactivation
    } catch (err: unknown) { // Use unknown
        const message = err instanceof Error ? err.message : "An unknown error occurred";
        toast({
            title: "Deactivation Failed",
            description: message,
            variant: "destructive",
        });
    } finally {
        setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <DashboardLayout><p>Loading patient details...</p></DashboardLayout>;
  }

  if (error) {
    return <DashboardLayout><p className="text-red-500">Error: {error}</p></DashboardLayout>;
  }

  if (!patient) {
    return <DashboardLayout><p>Patient not found.</p></DashboardLayout>;
  }

  // Helper to display data or N/A
  const displayData = (data: string | null | undefined) => data || <span className="text-muted-foreground italic">N/A</span>;

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Patient Details</h1>
          <div className="flex gap-2">
            {/* TODO: Link to edit page or enable inline editing */}
            <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/patients/${patientId}/edit`)}>
                <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isDeleting}>
                  <Trash2 className="mr-2 h-4 w-4" /> {isDeleting ? "Deactivating..." : "Deactivate"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action will mark the patient as inactive. They will no longer appear in active searches or be available for new appointments/admissions. This action can usually be reversed by an administrator.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeactivate} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Deactivate Patient
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{patient.first_name} {patient.last_name}</CardTitle>
            <CardDescription>Patient ID: {patient.patient_id}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><Label>Date of Birth:</Label> <p>{patient.date_of_birth}</p></div>
                <div><Label>Gender:</Label> <p>{patient.gender}</p></div>
                <div><Label>Blood Group:</Label> <p>{displayData(patient.blood_group)}</p></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Phone:</Label> <p>{patient.phone_number}</p></div>
            <div><Label>Email:</Label> <p>{displayData(patient.email)}</p></div>
            <div className="md:col-span-2"><Label>Address:</Label>
                <p>{displayData(patient.address_line1)}</p>
                {patient.address_line2 && <p>{patient.address_line2}</p>}
                <p>{[patient.city, patient.state, patient.postal_code].filter(Boolean).join(", ")}</p>
                <p>{displayData(patient.country)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Emergency Contact</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label>Name:</Label> <p>{displayData(patient.emergency_contact_name)}</p></div>
            <div><Label>Relation:</Label> <p>{displayData(patient.emergency_contact_relation)}</p></div>
            <div><Label>Phone:</Label> <p>{displayData(patient.emergency_contact_phone)}</p></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Medical Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Allergies:</Label> <p className="whitespace-pre-wrap">{displayData(patient.allergies)}</p></div>
            <div><Label>Past Medical History:</Label> <p className="whitespace-pre-wrap">{displayData(patient.past_medical_history)}</p></div>
            <div><Label>Current Medications:</Label> <p className="whitespace-pre-wrap">{displayData(patient.current_medications)}</p></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Insurance Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Provider:</Label> <p>{displayData(patient.insurance_provider)}</p></div>
            <div><Label>Policy Number:</Label> <p>{displayData(patient.insurance_policy_number)}</p></div>
          </CardContent>
        </Card>

         <Card>
          <CardHeader><CardTitle>Registration Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Registered On:</Label> <p>{new Date(patient.registration_date).toLocaleString()}</p></div>
            {/* TODO: Fetch and display name of user who registered the patient */}
            <div><Label>Registered By User ID:</Label> <p>{displayData(patient.registered_by_user_id?.toString())}</p></div>
            <div><Label>Last Updated:</Label> <p>{new Date(patient.updated_at).toLocaleString()}</p></div>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}

