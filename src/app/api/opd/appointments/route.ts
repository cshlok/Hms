// src/app/api/opd/appointments/route.ts
import { NextRequest, NextResponse } from "next/server";
// import { getRequestContext } from "@cloudflare/next-on-pages"; // Import when ready to use D1

// Interface for the POST request body
interface AppointmentCreateBody {
  patient_id: number;
  doctor_id: number;
  department?: string; // Assuming department might be derived or optional
  appointment_date: string; // Assuming ISO string format
  appointment_type: string;
  reason?: string;
  notes?: string;
}

// Interface for the PUT request body
interface AppointmentUpdateBody {
  patient_id?: number;
  doctor_id?: number;
  department?: string;
  appointment_date?: string;
  appointment_type?: string;
  status?: string; // Allow updating status
  reason?: string;
  notes?: string;
}

// FIX: Define interface for filters
interface AppointmentFilters {
  startDate?: string | null;
  endDate?: string | null;
  status?: string | null;
  doctorId?: string | null;
  patientId?: string | null;
  search?: string | null;
}

// Placeholder function to simulate database interaction
async function getAppointmentsFromDB(filters: AppointmentFilters) {
  console.log("Simulating fetching appointments with filters:", filters);
  // Replace with actual D1 query when DB is configured
  // const { env } = getRequestContext();
  // const { results } = await env.DB.prepare(
  //   "SELECT a.*, p.name as patient_name, d.name as doctor_name " +
  //   "FROM appointments a " +
  //   "JOIN patients p ON a.patient_id = p.id " +
  //   "JOIN doctors d ON a.doctor_id = d.id " +
  //   "WHERE (a.appointment_date >= ? AND a.appointment_date <= ?) " +
  //   "AND (? IS NULL OR a.status = ?) " +
  //   "ORDER BY a.appointment_date ASC"
  // ).bind(
  //   filters.startDate || new Date().toISOString().split("T")[0],
  //   filters.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  //   filters.status || null,
  //   filters.status || null
  // ).all();
  // return results;

  // Return mock data for now
  const mockAppointments = [
    {
      id: 1,
      appointment_number: "OPD-20250428-001",
      patient_id: 101,
      patient_name: "Alice Smith",
      doctor_id: 5,
      doctor_name: "Dr. Robert Johnson",
      department: "General Medicine",
      appointment_date: "2025-04-28T10:30:00Z",
      appointment_type: "New Visit",
      status: "scheduled",
      reason: "Fever and cough for 3 days",
      notes: "Patient has history of asthma",
      created_at: "2025-04-25T14:20:00Z",
    },
    {
      id: 2,
      appointment_number: "OPD-20250428-002",
      patient_id: 102,
      patient_name: "Bob Johnson",
      doctor_id: 8,
      doctor_name: "Dr. Sarah Williams",
      department: "Orthopedics",
      appointment_date: "2025-04-28T11:15:00Z",
      appointment_type: "Follow-up",
      status: "checked_in",
      reason: "Follow-up for fracture treatment",
      notes: "Check X-ray results",
      created_at: "2025-04-26T09:45:00Z",
    },
    {
      id: 3,
      appointment_number: "OPD-20250429-003",
      patient_id: 103,
      patient_name: "Charlie Brown",
      doctor_id: 3,
      doctor_name: "Dr. Emily Chen",
      department: "Cardiology",
      appointment_date: "2025-04-29T09:00:00Z",
      appointment_type: "New Visit",
      status: "scheduled",
      reason: "Chest pain and shortness of breath",
      notes: "Patient has family history of heart disease",
      created_at: "2025-04-27T16:30:00Z",
    },
    {
      id: 4,
      appointment_number: "OPD-20250427-004",
      patient_id: 104,
      patient_name: "Diana Prince",
      doctor_id: 5,
      doctor_name: "Dr. Robert Johnson",
      department: "General Medicine",
      appointment_date: "2025-04-27T14:30:00Z",
      appointment_type: "Follow-up",
      status: "completed",
      reason: "Follow-up for hypertension",
      notes: "BP well controlled with current medication",
      created_at: "2025-04-24T11:20:00Z",
    },
  ];

  return mockAppointments.filter((appointment) => {
    // Apply date range filter
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      const appointmentDate = new Date(appointment.appointment_date);
      if (appointmentDate < startDate) return false;
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      const appointmentDate = new Date(appointment.appointment_date);
      if (appointmentDate > endDate) return false;
    }

    // Apply status filter
    if (filters.status && appointment.status !== filters.status) return false;

    // Apply doctor filter
    if (
      filters.doctorId &&
      appointment.doctor_id.toString() !== filters.doctorId
    )
      return false;

    // Apply patient filter
    if (
      filters.patientId &&
      appointment.patient_id.toString() !== filters.patientId
    )
      return false;

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      return (
        appointment.patient_name.toLowerCase().includes(searchTerm) ||
        appointment.doctor_name.toLowerCase().includes(searchTerm) ||
        appointment.appointment_number.toLowerCase().includes(searchTerm) ||
        appointment.reason.toLowerCase().includes(searchTerm)
      );
    }

    return true;
  });
}

// Placeholder function to simulate creating an appointment
async function createAppointmentInDB(appointmentData: AppointmentCreateBody) {
  console.log("Simulating creating appointment:", appointmentData);
  // Replace with actual D1 insert query when DB is configured
  // const { env } = getRequestContext();
  // const info = await env.DB.prepare(
  //   "INSERT INTO appointments (patient_id, doctor_id, department, appointment_date, appointment_type, status, reason, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  // ).bind(
  //   appointmentData.patient_id,
  //   appointmentData.doctor_id,
  //   appointmentData.department,
  //   appointmentData.appointment_date,
  //   appointmentData.appointment_type,
  //   "scheduled",
  //   appointmentData.reason,
  //   appointmentData.notes
  // ).run();
  // return { id: info.meta.last_row_id, ...appointmentData };

  // Return mock success response
  const newId = Math.floor(Math.random() * 1000) + 10;
  const appointmentNumber = `OPD-${new Date()
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "")}-${newId.toString().padStart(3, "0")}`;
  return {
    id: newId,
    appointment_number: appointmentNumber,
    ...appointmentData,
    status: "scheduled",
    created_at: new Date().toISOString(),
  };
}

// Placeholder function to simulate getting a single appointment
async function getAppointmentByIdFromDB(id: number) {
  console.log("Simulating fetching appointment by ID:", id);
  // Replace with actual D1 query when DB is configured
  // const { env } = getRequestContext();
  // const { results } = await env.DB.prepare(
  //   "SELECT a.*, p.name as patient_name, d.name as doctor_name " +
  //   "FROM appointments a " +
  //   "JOIN patients p ON a.patient_id = p.id " +
  //   "JOIN doctors d ON a.doctor_id = d.id " +
  //   "WHERE a.id = ?"
  // ).bind(id).all();
  // return results[0];

  // Return mock data for now
  const mockAppointments = [
    {
      id: 1,
      appointment_number: "OPD-20250428-001",
      patient_id: 101,
      patient_name: "Alice Smith",
      doctor_id: 5,
      doctor_name: "Dr. Robert Johnson",
      department: "General Medicine",
      appointment_date: "2025-04-28T10:30:00Z",
      appointment_type: "New Visit",
      status: "scheduled",
      reason: "Fever and cough for 3 days",
      notes: "Patient has history of asthma",
      created_at: "2025-04-25T14:20:00Z",
      patient_details: {
        age: 35,
        gender: "Female",
        contact: "+91-9876543210",
        medical_record_number: "MRN00101",
      },
    },
    {
      id: 2,
      appointment_number: "OPD-20250428-002",
      patient_id: 102,
      patient_name: "Bob Johnson",
      doctor_id: 8,
      doctor_name: "Dr. Sarah Williams",
      department: "Orthopedics",
      appointment_date: "2025-04-28T11:15:00Z",
      appointment_type: "Follow-up",
      status: "checked_in",
      reason: "Follow-up for fracture treatment",
      notes: "Check X-ray results",
      created_at: "2025-04-26T09:45:00Z",
      patient_details: {
        age: 42,
        gender: "Male",
        contact: "+91-9876543211",
        medical_record_number: "MRN00102",
      },
    },
  ];

  return mockAppointments.find((appointment) => appointment.id === id) || undefined;
}

// Placeholder function to simulate updating an appointment
async function updateAppointmentInDB(
  id: number,
  updateData: AppointmentUpdateBody
) {
  console.log("Simulating updating appointment:", id, updateData);
  // Replace with actual D1 update query when DB is configured
  // const { env } = getRequestContext();
  // const updateFields = Object.entries(updateData)
  //   .map(([key, _]) => `${key} = ?`)
  //   .join(", ");
  // const updateValues = Object.values(updateData);
  // await env.DB.prepare(
  //   `UPDATE appointments SET ${updateFields} WHERE id = ?`
  // ).bind(...updateValues, id).run();
  // return { id, ...updateData };

  // Return mock success response
  return {
    id,
    ...updateData,
    updated_at: new Date().toISOString(),
  };
}

/**
 * GET /api/opd/appointments
 * Retrieves a list of appointments, potentially filtered.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status");
    const doctorId = searchParams.get("doctorId");
    const patientId = searchParams.get("patientId");
    const search = searchParams.get("search");
    // Add other filters as needed

    const filters: AppointmentFilters = {
      startDate,
      endDate,
      status,
      doctorId,
      patientId,
      search,
    };

    // Check if this is a request for a specific appointment
    const path = request.nextUrl.pathname;
    if (/\/api\/opd\/appointments\/\d+$/.test(path)) {
      const id = Number.parseInt(path.split("/").pop() || "0");
      if (id > 0) {
        const appointment = await getAppointmentByIdFromDB(id);
        if (!appointment) {
          return NextResponse.json(
            { error: "Appointment not found" },
            { status: 404 }
          );
        }
        return NextResponse.json({ appointment });
      }
    }

    // Otherwise, return filtered list
    const appointments = await getAppointmentsFromDB(filters);

    return NextResponse.json({ appointments });
  } catch (error: unknown) {
    console.error("Error fetching appointments:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: "Failed to fetch appointments",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/opd/appointments
 * Creates a new appointment.
 */
export async function POST(request: NextRequest) {
  try {
    const appointmentData = (await request.json()) as AppointmentCreateBody;

    // Basic validation (add more comprehensive validation)
    if (
      !appointmentData.patient_id ||
      !appointmentData.doctor_id ||
      !appointmentData.appointment_date ||
      !appointmentData.appointment_type
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields (patient_id, doctor_id, appointment_date, appointment_type)",
        },
        { status: 400 }
      );
    }

    // Simulate creating the appointment in the database
    const newAppointment = await createAppointmentInDB(appointmentData);

    return NextResponse.json({ appointment: newAppointment }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating appointment:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: "Failed to create appointment",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/opd/appointments/[id]
 * Updates an existing appointment.
 */
export async function PUT(request: NextRequest) {
  try {
    const path = request.nextUrl.pathname;
    const id = Number.parseInt(path.split("/").pop() || "0");

    if (id <= 0) {
      return NextResponse.json(
        { error: "Invalid appointment ID" },
        { status: 400 }
      );
    }

    const updateData = (await request.json()) as AppointmentUpdateBody;

    // Simulate updating the appointment in the database
    const updatedAppointment = await updateAppointmentInDB(id, updateData);

    return NextResponse.json({ appointment: updatedAppointment });
  } catch (error: unknown) {
    console.error("Error updating appointment:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: "Failed to update appointment",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
