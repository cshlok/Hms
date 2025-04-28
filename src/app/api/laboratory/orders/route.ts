// src/app/api/laboratory/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
// import { getRequestContext } from "@cloudflare/next-on-pages"; // Import when ready to use D1

// Placeholder function to simulate database interaction
async function getLabOrdersFromDB(filters: any) {
  console.log("Simulating fetching lab orders with filters:", filters);
  // Replace with actual D1 query when DB is configured
  // const { env } = getRequestContext();
  // const { results } = await env.DB.prepare(
  //   "SELECT o.*, p.name as patient_name, d.name as doctor_name " +
  //   "FROM lab_orders o " +
  //   "JOIN patients p ON o.patient_id = p.id " +
  //   "JOIN doctors d ON o.ordering_doctor_id = d.id " +
  //   "WHERE (? IS NULL OR o.status = ?) " +
  //   "ORDER BY o.order_date DESC"
  // ).bind(
  //   filters.status || null,
  //   filters.status || null
  // ).all();
  // return results;
  
  // Return mock data for now
  const mockLabOrders = [
    {
      id: 1,
      order_number: "LAB-20250428-001",
      patient_id: 101,
      patient_name: "Alice Smith",
      ordering_doctor_id: 5,
      ordering_doctor_name: "Dr. Robert Johnson",
      order_date: "2025-04-28T09:15:00Z",
      priority: "routine", // routine, urgent, stat
      status: "pending", // pending, collected, processing, completed, cancelled
      sample_collected_at: null,
      sample_collected_by: null,
      result_entry_at: null,
      result_verified_at: null,
      notes: "Fasting blood sample required",
      tests: [
        { id: 101, name: "Complete Blood Count (CBC)", status: "pending" },
        { id: 102, name: "Liver Function Test (LFT)", status: "pending" },
        { id: 103, name: "Lipid Profile", status: "pending" }
      ]
    },
    {
      id: 2,
      order_number: "LAB-20250428-002",
      patient_id: 102,
      patient_name: "Bob Johnson",
      ordering_doctor_id: 8,
      ordering_doctor_name: "Dr. Sarah Williams",
      order_date: "2025-04-28T10:30:00Z",
      priority: "urgent",
      status: "collected",
      sample_collected_at: "2025-04-28T10:45:00Z",
      sample_collected_by: "Nurse David Wilson",
      result_entry_at: null,
      result_verified_at: null,
      notes: "Patient on anticoagulants",
      tests: [
        { id: 104, name: "Prothrombin Time (PT)", status: "collected" },
        { id: 105, name: "International Normalized Ratio (INR)", status: "collected" }
      ]
    },
    {
      id: 3,
      order_number: "LAB-20250427-003",
      patient_id: 103,
      patient_name: "Charlie Brown",
      ordering_doctor_id: 3,
      ordering_doctor_name: "Dr. Emily Chen",
      order_date: "2025-04-27T14:00:00Z",
      priority: "routine",
      status: "completed",
      sample_collected_at: "2025-04-27T14:30:00Z",
      sample_collected_by: "Nurse Maria Garcia",
      result_entry_at: "2025-04-27T16:45:00Z",
      result_verified_at: "2025-04-27T17:15:00Z",
      notes: "",
      tests: [
        { id: 106, name: "Blood Culture", status: "completed" },
        { id: 107, name: "C-Reactive Protein", status: "completed" }
      ]
    }
  ];
  
  return mockLabOrders.filter(order => {
    // Apply status filter
    if (filters.status && order.status !== filters.status) return false;
    
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
    if (filters.doctorId && order.ordering_doctor_id.toString() !== filters.doctorId) return false;
    
    // Apply patient filter
    if (filters.patientId && order.patient_id.toString() !== filters.patientId) return false;
    
    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      return (
        order.patient_name.toLowerCase().includes(searchTerm) ||
        order.ordering_doctor_name.toLowerCase().includes(searchTerm) ||
        order.order_number.toLowerCase().includes(searchTerm) ||
        order.tests.some(test => test.name.toLowerCase().includes(searchTerm))
      );
    }
    
    return true;
  });
}

// Placeholder function to simulate creating a lab order
async function createLabOrderInDB(orderData: any) {
  console.log("Simulating creating lab order:", orderData);
  // Replace with actual D1 insert query when DB is configured
  // const { env } = getRequestContext();
  // const info = await env.DB.prepare(
  //   "INSERT INTO lab_orders (patient_id, ordering_doctor_id, order_date, priority, status, notes) VALUES (?, ?, ?, ?, ?, ?)"
  // ).bind(
  //   orderData.patient_id,
  //   orderData.ordering_doctor_id,
  //   orderData.order_date || new Date().toISOString(),
  //   orderData.priority || "routine",
  //   "pending",
  //   orderData.notes || ""
  // ).run();
  // 
  // // Insert tests for this order
  // for (const test of orderData.tests) {
  //   await env.DB.prepare(
  //     "INSERT INTO lab_order_tests (order_id, test_id, status) VALUES (?, ?, ?)"
  //   ).bind(
  //     info.meta.last_row_id,
  //     test.id,
  //     "pending"
  //   ).run();
  // }
  // 
  // return { id: info.meta.last_row_id, ...orderData };
  
  // Return mock success response
  const newId = Math.floor(Math.random() * 1000) + 10;
  const orderNumber = `LAB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${newId.toString().padStart(3, '0')}`;
  return {
    id: newId,
    order_number: orderNumber,
    ...orderData,
    order_date: orderData.order_date || new Date().toISOString(),
    priority: orderData.priority || "routine",
    status: "pending",
    sample_collected_at: null,
    sample_collected_by: null,
    result_entry_at: null,
    result_verified_at: null,
    created_at: new Date().toISOString(),
    tests: (orderData.tests || []).map(test => ({
      ...test,
      status: "pending"
    }))
  };
}

// Placeholder function to simulate getting a single lab order
async function getLabOrderByIdFromDB(id: number) {
  console.log("Simulating fetching lab order by ID:", id);
  // Replace with actual D1 query when DB is configured
  // const { env } = getRequestContext();
  // const { results } = await env.DB.prepare(
  //   "SELECT o.*, p.name as patient_name, d.name as ordering_doctor_name " +
  //   "FROM lab_orders o " +
  //   "JOIN patients p ON o.patient_id = p.id " +
  //   "JOIN doctors d ON o.ordering_doctor_id = d.id " +
  //   "WHERE o.id = ?"
  // ).bind(id).all();
  // 
  // if (results.length === 0) return null;
  // 
  // const order = results[0];
  // 
  // // Get tests for this order
  // const { results: testResults } = await env.DB.prepare(
  //   "SELECT ot.*, t.name as test_name " +
  //   "FROM lab_order_tests ot " +
  //   "JOIN lab_tests t ON ot.test_id = t.id " +
  //   "WHERE ot.order_id = ?"
  // ).bind(id).all();
  // 
  // order.tests = testResults;
  // 
  // // Get results if available
  // if (order.status === "completed" || order.status === "verified") {
  //   const { results: resultValues } = await env.DB.prepare(
  //     "SELECT * FROM lab_results WHERE order_id = ?"
  //   ).bind(id).all();
  //   order.results = resultValues;
  // }
  // 
  // return order;
  
  // Return mock data for now
  const mockLabOrders = [
    {
      id: 1,
      order_number: "LAB-20250428-001",
      patient_id: 101,
      patient_name: "Alice Smith",
      ordering_doctor_id: 5,
      ordering_doctor_name: "Dr. Robert Johnson",
      order_date: "2025-04-28T09:15:00Z",
      priority: "routine",
      status: "pending",
      sample_collected_at: null,
      sample_collected_by: null,
      result_entry_at: null,
      result_verified_at: null,
      notes: "Fasting blood sample required",
      tests: [
        { id: 101, name: "Complete Blood Count (CBC)", status: "pending" },
        { id: 102, name: "Liver Function Test (LFT)", status: "pending" },
        { id: 103, name: "Lipid Profile", status: "pending" }
      ],
      patient_details: {
        age: 35,
        gender: "Female",
        contact: "+91-9876543210",
        medical_record_number: "MRN00101"
      }
    },
    {
      id: 3,
      order_number: "LAB-20250427-003",
      patient_id: 103,
      patient_name: "Charlie Brown",
      ordering_doctor_id: 3,
      ordering_doctor_name: "Dr. Emily Chen",
      order_date: "2025-04-27T14:00:00Z",
      priority: "routine",
      status: "completed",
      sample_collected_at: "2025-04-27T14:30:00Z",
      sample_collected_by: "Nurse Maria Garcia",
      result_entry_at: "2025-04-27T16:45:00Z",
      result_verified_at: "2025-04-27T17:15:00Z",
      notes: "",
      tests: [
        { id: 106, name: "Blood Culture", status: "completed" },
        { id: 107, name: "C-Reactive Protein", status: "completed" }
      ],
      patient_details: {
        age: 28,
        gender: "Male",
        contact: "+91-9876543212",
        medical_record_number: "MRN00103"
      },
      results: [
        {
          test_id: 106,
          test_name: "Blood Culture",
          result_value: "No growth after 48 hours",
          reference_range: "No growth",
          unit: "",
          is_abnormal: false
        },
        {
          test_id: 107,
          test_name: "C-Reactive Protein",
          result_value: "12.5",
          reference_range: "< 10.0",
          unit: "mg/L",
          is_abnormal: true
        }
      ]
    }
  ];
  
  return mockLabOrders.find(order => order.id === id) || null;
}

// Placeholder function to simulate updating a lab order
async function updateLabOrderInDB(id: number, updateData: any) {
  console.log("Simulating updating lab order:", id, updateData);
  // Replace with actual D1 update query when DB is configured
  // const { env } = getRequestContext();
  // const updateFields = Object.entries(updateData)
  //   .filter(([key, _]) => key !== 'tests' && key !== 'results') // Handle tests and results separately
  //   .map(([key, _]) => `${key} = ?`)
  //   .join(", ");
  // const updateValues = Object.entries(updateData)
  //   .filter(([key, _]) => key !== 'tests' && key !== 'results')
  //   .map(([_, value]) => value);
  // 
  // await env.DB.prepare(
  //   `UPDATE lab_orders SET ${updateFields} WHERE id = ?`
  // ).bind(...updateValues, id).run();
  // 
  // // Update tests if provided
  // if (updateData.tests) {
  //   for (const test of updateData.tests) {
  //     await env.DB.prepare(
  //       "UPDATE lab_order_tests SET status = ? WHERE order_id = ? AND test_id = ?"
  //     ).bind(test.status, id, test.id).run();
  //   }
  // }
  // 
  // // Add results if provided
  // if (updateData.results) {
  //   for (const result of updateData.results) {
  //     // Check if result already exists
  //     const { results: existingResults } = await env.DB.prepare(
  //       "SELECT id FROM lab_results WHERE order_id = ? AND test_id = ?"
  //     ).bind(id, result.test_id).all();
  //     
  //     if (existingResults.length > 0) {
  //       // Update existing result
  //       await env.DB.prepare(
  //         "UPDATE lab_results SET result_value = ?, reference_range = ?, unit = ?, is_abnormal = ? WHERE id = ?"
  //       ).bind(
  //         result.result_value,
  //         result.reference_range,
  //         result.unit,
  //         result.is_abnormal,
  //         existingResults[0].id
  //       ).run();
  //     } else {
  //       // Insert new result
  //       await env.DB.prepare(
  //         "INSERT INTO lab_results (order_id, test_id, result_value, reference_range, unit, is_abnormal) VALUES (?, ?, ?, ?, ?, ?)"
  //       ).bind(
  //         id,
  //         result.test_id,
  //         result.result_value,
  //         result.reference_range,
  //         result.unit,
  //         result.is_abnormal
  //       ).run();
  //     }
  //   }
  // }
  // 
  // return { id, ...updateData };
  
  // Return mock success response
  return {
    id,
    ...updateData,
    updated_at: new Date().toISOString()
  };
}

/**
 * GET /api/laboratory/orders
 * Retrieves a list of lab orders, potentially filtered.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const doctorId = searchParams.get("doctorId");
    const patientId = searchParams.get("patientId");
    const search = searchParams.get("search");
    // Add other filters as needed

    const filters = { status, priority, startDate, endDate, doctorId, patientId, search };
    
    // Check if this is a request for a specific lab order
    const path = request.nextUrl.pathname;
    if (path.match(/\/api\/laboratory\/orders\/\d+$/)) {
      const id = parseInt(path.split('/').pop() || '0');
      if (id > 0) {
        const order = await getLabOrderByIdFromDB(id);
        if (!order) {
          return NextResponse.json({ error: "Lab order not found" }, { status: 404 });
        }
        return NextResponse.json({ order });
      }
    }
    
    // Otherwise, return filtered list
    const orders = await getLabOrdersFromDB(filters);

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Error fetching lab orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch lab orders", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/laboratory/orders
 * Creates a new lab order.
 */
export async function POST(request: NextRequest) {
  try {
    const orderData = await request.json();

    // Basic validation (add more comprehensive validation)
    if (!orderData.patient_id || !orderData.ordering_doctor_id || !orderData.tests || orderData.tests.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields (patient_id, ordering_doctor_id, tests)" },
        { status: 400 }
      );
    }

    // Simulate creating the lab order in the database
    const newOrder = await createLabOrderInDB(orderData);

    return NextResponse.json({ order: newOrder }, { status: 201 });
  } catch (error) {
    console.error("Error creating lab order:", error);
    return NextResponse.json(
      { error: "Failed to create lab order", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/laboratory/orders/[id]
 * Updates an existing lab order.
 */
export async function PUT(request: NextRequest) {
  try {
    const path = request.nextUrl.pathname;
    const id = parseInt(path.split('/').pop() || '0');
    
    if (id <= 0) {
      return NextResponse.json({ error: "Invalid lab order ID" }, { status: 400 });
    }
    
    const updateData = await request.json();
    
    // Simulate updating the lab order in the database
    const updatedOrder = await updateLabOrderInDB(id, updateData);

    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    console.error("Error updating lab order:", error);
    return NextResponse.json(
      { error: "Failed to update lab order", details: error.message },
      { status: 500 }
    );
  }
}
