// src/app/api/radiology/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
// import { getRequestContext } from "@cloudflare/next-on-pages"; // Import when ready to use D1

// Define interfaces
interface RadiologyOrderFilters {
  status?: string | null;
  modality?: string | null;
  priority?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  doctorId?: string | null;
  patientId?: string | null;
  search?: string | null;
}

interface RadiologyOrderInput {
  patient_id: number;
  ordering_doctor_id: number;
  modality: string;
  body_part: string;
  order_date?: string;
  priority?: string;
  clinical_history?: string;
  notes?: string;
}

interface RadiologyOrderUpdateInput {
  status?: string;
  priority?: string;
  scheduled_date?: string | null;
  performed_date?: string | null;
  performed_by?: string | null;
  report_date?: string | null;
  reported_by?: string | null;
  clinical_history?: string;
  notes?: string;
  report?: {
    findings?: string;
    impression?: string;
    recommendations?: string;
  };
}

// Placeholder function to simulate database interaction
async function getRadiologyOrdersFromDB(filters: RadiologyOrderFilters) {
  // Use interface
  console.log("Simulating fetching radiology orders with filters:", filters);
  // Replace with actual D1 query when DB is configured
  // ... (D1 query logic)

  // Return mock data for now
  const mockRadiologyOrders = [
    {
      id: 1,
      order_number: "RAD-20250428-001",
      patient_id: 101,
      patient_name: "Alice Smith",
      ordering_doctor_id: 5,
      ordering_doctor_name: "Dr. Robert Johnson",
      order_date: "2025-04-28T09:15:00Z",
      modality: "X-Ray", // X-Ray, CT, MRI, Ultrasound, etc.
      body_part: "Chest",
      priority: "routine", // routine, urgent, stat
      status: "scheduled", // ordered, scheduled, completed, reported, cancelled
      scheduled_date: "2025-04-29T10:30:00Z",
      performed_date: undefined,
      performed_by: undefined,
      report_date: undefined,
      reported_by: undefined,
      clinical_history: "Persistent cough for 2 weeks",
      notes: "Patient has history of tuberculosis",
      created_at: "2025-04-28T09:15:00Z",
      updated_at: "2025-04-28T09:30:00Z",
    },
    {
      id: 2,
      order_number: "RAD-20250428-002",
      patient_id: 102,
      patient_name: "Bob Johnson",
      ordering_doctor_id: 8,
      ordering_doctor_name: "Dr. Sarah Williams",
      order_date: "2025-04-28T10:30:00Z",
      modality: "CT",
      body_part: "Head",
      priority: "urgent",
      status: "completed",
      scheduled_date: "2025-04-28T13:45:00Z",
      performed_date: "2025-04-28T14:00:00Z",
      performed_by: "Dr. James Wilson",
      report_date: undefined,
      reported_by: undefined,
      clinical_history: "Headache and dizziness following fall",
      notes: "Check for intracranial hemorrhage",
      created_at: "2025-04-28T10:30:00Z",
      updated_at: "2025-04-28T14:15:00Z",
    },
    {
      id: 3,
      order_number: "RAD-20250427-003",
      patient_id: 103,
      patient_name: "Charlie Brown",
      ordering_doctor_id: 3,
      ordering_doctor_name: "Dr. Emily Chen",
      order_date: "2025-04-27T14:00:00Z",
      modality: "MRI",
      body_part: "Lumbar Spine",
      priority: "routine",
      status: "reported",
      scheduled_date: "2025-04-27T16:30:00Z",
      performed_date: "2025-04-27T16:45:00Z",
      performed_by: "Dr. Michael Thompson",
      report_date: "2025-04-28T09:00:00Z",
      reported_by: "Dr. Lisa Rodriguez",
      clinical_history: "Lower back pain radiating to left leg",
      notes: "Suspected disc herniation",
      created_at: "2025-04-27T14:00:00Z",
      updated_at: "2025-04-28T09:15:00Z",
    },
  ];

  return mockRadiologyOrders.filter((order) => {
    // Apply status filter
    if (filters.status && order.status !== filters.status) return false;

    // Apply modality filter
    if (filters.modality && order.modality !== filters.modality) return false;

    // Apply priority filter
    if (filters.priority && order.priority !== filters.priority) return false;

    // Apply date range filter
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      const orderDate = new Date(order.order_date);
      if (orderDate < startDate) return false;
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      const orderDate = new Date(order.order_date);
      if (orderDate > endDate) return false;
    }

    // Apply doctor filter
    if (
      filters.doctorId &&
      order.ordering_doctor_id.toString() !== filters.doctorId
    )
      return false;

    // Apply patient filter
    if (filters.patientId && order.patient_id.toString() !== filters.patientId)
      return false;

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      return (
        // Add null check
        (order.patient_name.toLowerCase().includes(searchTerm) ||
        order.ordering_doctor_name.toLowerCase().includes(searchTerm) ||
        order.order_number.toLowerCase().includes(searchTerm) ||
        order.modality.toLowerCase().includes(searchTerm) ||
        order.body_part.toLowerCase().includes(searchTerm) || (order.clinical_history && order.clinical_history.toLowerCase().includes(searchTerm)))
      );
    }

    return true;
  });
}

// Placeholder function to simulate creating a radiology order
async function createRadiologyOrderInDB(orderData: RadiologyOrderInput) {
  // Use interface
  console.log("Simulating creating radiology order:", orderData);
  // Replace with actual D1 insert query when DB is configured
  // ... (D1 query logic)

  // Return mock success response
  const newId = Math.floor(Math.random() * 1000) + 10;
  const orderNumber = `RAD-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${newId.toString().padStart(3, "0")}`;
  return {
    id: newId,
    order_number: orderNumber,
    ...orderData,
    order_date: orderData.order_date || new Date().toISOString(),
    priority: orderData.priority || "routine",
    status: "ordered",
    scheduled_date: undefined,
    performed_date: undefined,
    performed_by: undefined,
    report_date: undefined,
    reported_by: undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// Placeholder function to simulate getting a single radiology order
// FIX: Commented out unused function
/*
async function getRadiologyOrderByIdFromDB(id: number) {
  console.log("Simulating fetching radiology order by ID:", id);
  // Replace with actual D1 query when DB is configured
  // ... (D1 query logic)
  
  // Return mock data for now
  const mockRadiologyOrders = [
    {
      id: 1,
      order_number: "RAD-20250428-001",
      patient_id: 101,
      patient_name: "Alice Smith",
      ordering_doctor_id: 5,
      ordering_doctor_name: "Dr. Robert Johnson",
      order_date: "2025-04-28T09:15:00Z",
      modality: "X-Ray",
      body_part: "Chest",
      priority: "routine",
      status: "scheduled",
      scheduled_date: "2025-04-29T10:30:00Z",
      performed_date: null,
      performed_by: null,
      report_date: null,
      reported_by: null,
      clinical_history: "Persistent cough for 2 weeks",
      notes: "Patient has history of tuberculosis",
      created_at: "2025-04-28T09:15:00Z",
      updated_at: "2025-04-28T09:30:00Z",
      patient_details: {
        age: 35,
        gender: "Female",
        contact: "+91-9876543210",
        medical_record_number: "MRN00101"
      }
    },
    {
      id: 3,
      order_number: "RAD-20250427-003",
      patient_id: 103,
      patient_name: "Charlie Brown",
      ordering_doctor_id: 3,
      ordering_doctor_name: "Dr. Emily Chen",
      order_date: "2025-04-27T14:00:00Z",
      modality: "MRI",
      body_part: "Lumbar Spine",
      priority: "routine",
      status: "reported",
      scheduled_date: "2025-04-27T16:30:00Z",
      performed_date: "2025-04-27T16:45:00Z",
      performed_by: "Dr. Michael Thompson",
      report_date: "2025-04-28T09:00:00Z",
      reported_by: "Dr. Lisa Rodriguez",
      clinical_history: "Lower back pain radiating to left leg",
      notes: "Suspected disc herniation",
      created_at: "2025-04-27T14:00:00Z",
      updated_at: "2025-04-28T09:15:00Z",
      patient_details: {
        age: 28,
        gender: "Male",
        contact: "+91-9876543212",
        medical_record_number: "MRN00103"
      },
      report: {
        findings: "L4-L5 disc herniation with compression of left L5 nerve root. Mild degenerative changes at L3-L4 and L5-S1 levels.",
        impression: "L4-L5 disc herniation with left-sided radiculopathy.",
        recommendations: "Neurosurgical consultation recommended. Consider conservative management with physical therapy and pain management initially."
      }
    }
  ];
  
  return mockRadiologyOrders.find(order => order.id === id) || null;
}
*/

// Placeholder function to simulate updating a radiology order
async function updateRadiologyOrderInDB(
  id: number,
  updateData: RadiologyOrderUpdateInput
) {
  // Use interface
  console.log("Simulating updating radiology order:", id, updateData);
  // Replace with actual D1 update query when DB is configured
  // ... (D1 query logic)

  // Return mock success response
  return {
    id,
    ...updateData,
    updated_at: new Date().toISOString(),
  };
}

/**
 * GET /api/radiology/orders
 * Retrieves a list of radiology orders, potentially filtered.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const modality = searchParams.get("modality");
    const priority = searchParams.get("priority");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const doctorId = searchParams.get("doctorId");
    const patientId = searchParams.get("patientId");
    const search = searchParams.get("search");
    // Add other filters as needed

    const filters: RadiologyOrderFilters = {
      status,
      modality,
      priority,
      startDate,
      endDate,
      doctorId,
      patientId,
      search,
    }; // Use interface

    // Check if this is a request for a specific radiology order
    // This logic seems misplaced in the general /orders route.
    // Specific order fetching should be handled by /orders/[id]/route.ts
    // Commenting out for now.
    /*
    const path = request.nextUrl.pathname;
    if (path.match(/\/api\/radiology\/orders\/\d+$/)) {
      const id = parseInt(path.split("/").pop() || "0");
      if (id > 0) {
        const order = await getRadiologyOrderByIdFromDB(id);
        if (!order) {
          return NextResponse.json({ error: "Radiology order not found" }, { status: 404 });
        }
        return NextResponse.json({ order });
      }
    }
    */

    // Return filtered list
    const orders = await getRadiologyOrdersFromDB(filters);

    return NextResponse.json({ orders });
  } catch (error: unknown) {
    // Add type annotation
    console.error("Error fetching radiology orders:", error);
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: "Failed to fetch radiology orders", details: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/radiology/orders
 * Creates a new radiology order.
 */
export async function POST(request: NextRequest) {
  try {
    const orderData = (await request.json()) as RadiologyOrderInput; // Cast to interface

    // Basic validation (add more comprehensive validation)
    if (
      !orderData.patient_id ||
      !orderData.ordering_doctor_id ||
      !orderData.modality ||
      !orderData.body_part
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields (patient_id, ordering_doctor_id, modality, body_part)",
        },
        { status: 400 }
      );
    }

    // Simulate creating the radiology order in the database
    const newOrder = await createRadiologyOrderInDB(orderData);

    return NextResponse.json({ order: newOrder }, { status: 201 });
  } catch (error: unknown) {
    // Add type annotation
    console.error("Error creating radiology order:", error);
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: "Failed to create radiology order", details: message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/radiology/orders/[id]
 * Updates an existing radiology order.
 * NOTE: This PUT handler seems misplaced in the general /orders route.
 * It should likely be in /orders/[id]/route.ts.
 * Keeping it here for now to fix TS errors, but should be refactored.
 */
export async function PUT(request: NextRequest) {
  try {
    const path = request.nextUrl.pathname;
    // This parsing logic is fragile and assumes the ID is the last segment.
    // It's better handled by the [id] route parameter.
    const idString = path.split("/").pop();
    const id = idString ? Number.parseInt(idString) : 0;

    if (id <= 0 || Number.isNaN(id)) {
      // Check for NaN
      return NextResponse.json(
        { error: "Invalid or missing radiology order ID in URL path" },
        { status: 400 }
      );
    }

    const updateData = (await request.json()) as RadiologyOrderUpdateInput; // Cast to interface

    // Simulate updating the radiology order in the database
    const updatedOrder = await updateRadiologyOrderInDB(id, updateData);

    return NextResponse.json({ order: updatedOrder });
  } catch (error: unknown) {
    // Add type annotation
    console.error("Error updating radiology order:", error);
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: "Failed to update radiology order", details: message },
      { status: 500 }
    );
  }
}
