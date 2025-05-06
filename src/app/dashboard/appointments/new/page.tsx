"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Patient } from "@/types/patient";
import { Doctor } from "@/types/doctor";
import { format } from "date-fns";

// Schema for booking validation
const BookAppointmentSchema = z.object({
  patient_id: z.string().min(1, "Patient selection is required"), // Use string initially from select
  doctor_id: z.string().min(1, "Doctor selection is required"),   // Use string initially from select
  appointment_date: z.string().min(1, "Date is required"), // YYYY-MM-DD
  appointment_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in HH:MM format"),
  duration_minutes: z.number().int().positive().optional().default(15),
  reason: z.string().optional(),
});

type FormData = z.infer<typeof BookAppointmentSchema>;

export default function BookAppointmentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<FormData>>({
      appointment_date: format(new Date(), "yyyy-MM-dd"), // Default to today
      appointment_time: "09:00", // Default time
  });
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [errors, setErrors] = useState<z.ZodIssue[]>([]);

  // Fetch patients and doctors for dropdowns
  useEffect(() => {
    const fetchData = async () => {
      setIsFetchingData(true);
      try {
        const [patientsRes, doctorsRes] = await Promise.all([
          fetch("/api/patients"),
          fetch("/api/doctors"),
        ]);

        if (!patientsRes.ok) throw new Error("Failed to fetch patients");
        if (!doctorsRes.ok) throw new Error("Failed to fetch doctors");

        const patientsData: Patient[] = await patientsRes.json();
        const doctorsData: Doctor[] = await doctorsRes.json();

        setPatients(patientsData.filter(p => p.is_active)); // Only show active patients
        setDoctors(doctorsData); // Assuming API returns doctors linked to active users

      } catch (err: unknown) { // Use unknown
        const message = err instanceof Error ? err.message : "Could not load patients or doctors.";
        toast({
          title: "Error Fetching Data",
          description: message,
          variant: "destructive",
        });
        setErrors([{ code: z.ZodIssueCode.custom, path: ["form"], message: "Could not load required data." }]);
      } finally {
        setIsFetchingData(false);
      }
    };
    fetchData();
  }, [toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setErrors([]);

    const validation = BookAppointmentSchema.safeParse(formData);

    if (!validation.success) {
      setErrors(validation.error.errors);
      setIsLoading(false);
      toast({
        title: "Validation Error",
        description: "Please check the form for errors.",
        variant: "destructive",
      });
      return;
    }

    // Combine date and time into ISO string
    const appointmentDateTimeISO = `${validation.data.appointment_date}T${validation.data.appointment_time}:00`; // Assuming local timezone, add Z or offset if needed

    const dataToSend = {
        patient_id: parseInt(validation.data.patient_id, 10),
        doctor_id: parseInt(validation.data.doctor_id, 10),
        appointment_datetime: appointmentDateTimeISO,
        duration_minutes: validation.data.duration_minutes,
        reason: validation.data.reason,
    };

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      });

      const result: { error?: string } = await response.json(); // Add type annotation

      if (!response.ok) {
        throw new Error(result.error || "Failed to book appointment");
      }

      toast({
        title: "Appointment Booked",
        description: `Appointment scheduled successfully.`,
      });

      router.push("/dashboard/appointments"); // Redirect to appointment list

    } catch (err: unknown) { // Use unknown
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrors([{ code: z.ZodIssueCode.custom, path: ["form"], message: message }]);
      toast({
        title: "Booking Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getError = (fieldName: keyof FormData | "form") => {
    return errors.find((err) => err.path[0] === fieldName)?.message;
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold">Book New Appointment</h1>
        {isFetchingData ? (
            <p>Loading patient and doctor data...</p>
        ) : (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Appointment Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="patient_id">Patient *</Label>
                <Select name="patient_id" onValueChange={(value) => handleSelectChange("patient_id", value)} required disabled={isLoading}>
                  <SelectTrigger id="patient_id">
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map(p => (
                        <SelectItem key={p.patient_id} value={String(p.patient_id)}>
                            {p.first_name} {p.last_name} (ID: {p.patient_id})
                        </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {getError("patient_id") && <p className="text-sm text-red-500 mt-1">{getError("patient_id")}</p>}
              </div>

              <div>
                <Label htmlFor="doctor_id">Doctor *</Label>
                <Select name="doctor_id" onValueChange={(value) => handleSelectChange("doctor_id", value)} required disabled={isLoading}>
                  <SelectTrigger id="doctor_id">
                    <SelectValue placeholder="Select doctor" />
                  </SelectTrigger>
                  <SelectContent>
                     {doctors.map(d => (
                        <SelectItem key={d.doctor_id} value={String(d.doctor_id)}>
                            {d.user?.fullName} ({d.specialty})
                        </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {getError("doctor_id") && <p className="text-sm text-red-500 mt-1">{getError("doctor_id")}</p>}
              </div>

              <div>
                <Label htmlFor="appointment_date">Date *</Label>
                <Input id="appointment_date" name="appointment_date" type="date" value={formData.appointment_date || ""} onChange={handleChange} required disabled={isLoading} />
                {getError("appointment_date") && <p className="text-sm text-red-500 mt-1">{getError("appointment_date")}</p>}
              </div>

              <div>
                <Label htmlFor="appointment_time">Time *</Label>
                <Input id="appointment_time" name="appointment_time" type="time" value={formData.appointment_time || ""} onChange={handleChange} required disabled={isLoading} />
                 {getError("appointment_time") && <p className="text-sm text-red-500 mt-1">{getError("appointment_time")}</p>}
             </div>

              <div className="md:col-span-2">
                <Label htmlFor="reason">Reason for Visit</Label>
                <Textarea id="reason" name="reason" value={formData.reason || ""} onChange={handleChange} disabled={isLoading} />
                {getError("reason") && <p className="text-sm text-red-500 mt-1">{getError("reason")}</p>}
              </div>
            </CardContent>
          </Card>

          {getError("form") && <p className="text-sm text-red-500 mt-4">{getError("form")}</p>}

          <div className="mt-6 flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || isFetchingData}>
              {isLoading ? "Booking..." : "Book Appointment"}
            </Button>
          </div>
        </form>
        )}
      </div>
    </DashboardLayout>
  );
}


