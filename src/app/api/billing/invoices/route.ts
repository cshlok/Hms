// src/app/api/billing/invoices/route.ts
import { NextRequest, NextResponse } from "next/server";
// import { getRequestContext } from "@cloudflare/next-on-pages"; // Import when ready to use D1

// Placeholder function to simulate database interaction
async function getInvoicesFromDB(filters: any) {
  console.log("Simulating fetching invoices with filters:", filters);
  // Replace with actual D1 query when DB is configured
  // const { env } = getRequestContext();
  // const { results } = await env.DB.prepare("SELECT * FROM invoices ORDER BY invoice_date DESC LIMIT 10").all();
  // return results;
  
  // Return mock data for now
  return [
    {
      id: 1,
      invoice_number: "INV-20250428-0001",
      patient_id: 101,
      patient_name: "Alice Smith", // Typically joined from patients table
      invoice_date: "2025-04-28T10:00:00Z",
      total_amount: 150.75,
      amount_due: 50.75,
      status: "partially_paid",
    },
    {
      id: 2,
      invoice_number: "INV-20250427-0002",
      patient_id: 102,
      patient_name: "Bob Johnson",
      invoice_date: "2025-04-27T14:30:00Z",
      total_amount: 320.00,
      amount_due: 320.00,
      status: "finalized",
    },
  ];
}

// Placeholder function to simulate creating an invoice
async function createInvoiceInDB(invoiceData: any) {
  console.log("Simulating creating invoice:", invoiceData);
  // Replace with actual D1 insert query when DB is configured
  // const { env } = getRequestContext();
  // const info = await env.DB.prepare(
  //   "INSERT INTO invoices (patient_id, total_amount, ...) VALUES (?, ?, ...)"
  // ).bind(invoiceData.patient_id, invoiceData.total_amount, ...).run();
  // return { id: info.meta.last_row_id, ...invoiceData };
  
  // Return mock success response
  const newId = Math.floor(Math.random() * 1000) + 10;
  return {
    id: newId,
    invoice_number: `INV-NEW-${newId}`,
    ...invoiceData,
    status: "draft",
    invoice_date: new Date().toISOString(),
  };
}

/**
 * GET /api/billing/invoices
 * Retrieves a list of invoices, potentially filtered.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const status = searchParams.get("status");
    // Add other filters as needed

    const filters = { patientId, status };
    
    // Simulate fetching data from the database
    const invoices = await getInvoicesFromDB(filters);

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/billing/invoices
 * Creates a new invoice.
 */
export async function POST(request: NextRequest) {
  try {
    const invoiceData = await request.json();

    // Basic validation (add more comprehensive validation)
    if (!invoiceData.patient_id || !invoiceData.items || invoiceData.items.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields (patient_id, items)" },
        { status: 400 }
      );
    }

    // Simulate creating the invoice in the database
    const newInvoice = await createInvoiceInDB(invoiceData);

    return NextResponse.json({ invoice: newInvoice }, { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      { error: "Failed to create invoice", details: error.message },
      { status: 500 }
    );
  }
}

