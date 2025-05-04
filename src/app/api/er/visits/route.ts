import { NextRequest, NextResponse } from "next/server"; // Import uuid

// Define interface for ER Visit data
interface ERVisit {
  id: string | number;
  patient_id: string | number;
  patient_name?: string; // Denormalized
  mrn?: string; // Denormalized, added based on mock data
  arrival_timestamp: string; // ISO string
  chief_complaint: string;
  mode_of_arrival?: string; // Added based on mock data
  triage_level?: number | undefined; // Added based on mock data, allow undefined
  // FIX: Allow undefined for optional fields based on usage
  assigned_physician_id?: string | number | undefined;
  assigned_nurse_id?: string | number | undefined;
  current_location?: string | undefined;
  current_status?: string | undefined;
  disposition?: string | undefined;
  discharge_timestamp?: string | undefined;
  created_at?: string; // ISO string
  updated_at?: string; // ISO string
  // Add other relevant fields based on your schema
}

// Mock data store for ER visits (replace with actual DB interaction)
const mockVisits: ERVisit[] = [
  {
    id: 1,
    patient_id: 101,
    patient_name: "John Doe", // Denormalized for easier display
    mrn: "MRN001", // Denormalized
    arrival_timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
    chief_complaint: "Chest pain",
    mode_of_arrival: "Ambulance",
    triage_level: 2, // ESI level (if available early)
    current_status: "Pending Triage",
    current_location: "Waiting Room",
    assigned_physician_id: undefined,
    assigned_nurse_id: undefined,
    disposition: undefined,
    discharge_timestamp: undefined,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    patient_id: 102,
    patient_name: "Jane Smith",
    mrn: "MRN002",
    arrival_timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
    chief_complaint: "Shortness of breath",
    mode_of_arrival: "Walk-in",
    triage_level: 3,
    current_status: "Under Assessment",
    current_location: "Triage Room 1",
    assigned_physician_id: 201, // Example physician ID
    assigned_nurse_id: 301, // Example nurse ID
    disposition: undefined,
    discharge_timestamp: undefined,
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // Updated 30 mins ago
  },
];
let nextVisitId = 3;

// Define interface for ER Visit creation input
interface ERVisitInput {
  patient_id: number | string;
  chief_complaint: string;
  mode_of_arrival?: string;
  arrival_timestamp?: string; // Optional, defaults to now
  // Other initial fields might be relevant depending on workflow
}

// Define interface for ER Visit update input (used in PUT) - Belongs in [id]/route.ts
// interface ERVisitUpdateInput {
//   assigned_physician_id?: number | string | null;
//   assigned_nurse_id?: number | string | null;
//   current_location?: string | null;
//   current_status?: string | null;
//   disposition?: string | null;
//   discharge_timestamp?: string | null;
//   triage_level?: number | null; // Might be updated post-triage
//   // Add other updatable fields as needed
// }

// Define interface for ER Visit filters
interface ERVisitFilters {
  status?: string | undefined;
  location?: string | undefined;
  date?: string | undefined;
}

// Helper function to simulate DB interaction (GET)
async function getERVisitsFromDB(filters: ERVisitFilters = {}) {
  console.log("Simulating DB fetch for ER visits with filters:", filters);
  // Apply filters if implemented (example)
  let filtered = [...mockVisits];
  if (filters.status) {
    filtered = filtered.filter(
      (v) => v.current_status?.toLowerCase() === filters.status!.toLowerCase()
    );
  }
  if (filters.location) {
    filtered = filtered.filter(
      (v) =>
        v.current_location?.toLowerCase() === filters.location!.toLowerCase()
    );
  }
  // Add date filtering if needed

  return filtered.sort(
    (a, b) =>
      new Date(b.arrival_timestamp).getTime() -
      new Date(a.arrival_timestamp).getTime()
  );
}

// Helper function to simulate DB interaction (POST)
async function createERVisitInDB(data: ERVisitInput): Promise<ERVisit> {
  // Added return type
  console.log("Simulating DB create for ER visit:", data);
  const now = new Date().toISOString();
  // FIX: Ensure newVisit matches the ERVisit interface
  const newVisit: ERVisit = {
    id: nextVisitId++,
    patient_id: data.patient_id,
    patient_name: `Patient ${data.patient_id}`, // Fetch or pass patient name
    mrn: `MRN${String(data.patient_id).padStart(3, "0")}`, // Fetch or pass MRN
    arrival_timestamp: data.arrival_timestamp || now,
    chief_complaint: data.chief_complaint,
    mode_of_arrival: data.mode_of_arrival || "Unknown",
    triage_level: undefined,
    current_status: "Pending Triage",
    current_location: "Waiting Room",
    assigned_physician_id: undefined,
    assigned_nurse_id: undefined,
    disposition: undefined,
    discharge_timestamp: undefined,
    created_at: now,
    updated_at: now,
  };
  mockVisits.push(newVisit); // This should now be type-compatible
  return newVisit;
}

/**
 * GET /api/er/visits
 * Retrieves a list of ER visits, potentially filtered.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filters: ERVisitFilters = {       status: searchParams.get("status") ?? undefined,
      location: searchParams.get("location") ?? undefined,
      date: searchParams.get("date") ?? undefined,
    };

    const visits = await getERVisitsFromDB(filters);
    return NextResponse.json({ visits });
  } catch (error: unknown) {
    console.error("Error fetching ER visits:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: "Failed to fetch ER visits", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/er/visits
 * Creates a new ER visit record (patient arrival).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Apply type assertion
    const visitData = body as ERVisitInput;

    // Basic validation (add more comprehensive validation)
    if (!visitData.patient_id || !visitData.chief_complaint) {
      return NextResponse.json(
        { error: "Missing required fields (patient_id, chief_complaint)" },
        { status: 400 }
      );
    }

    // Simulate creating the ER visit in the database
    const newVisit = await createERVisitInDB(visitData);

    return NextResponse.json({ visit: newVisit }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating ER visit:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: "Failed to create ER visit", details: errorMessage },
      { status: 500 }
    );
  }
}

// Note: GET by ID, PUT, and DELETE handlers should be in the [id]/route.ts file.
