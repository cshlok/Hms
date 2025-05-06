// API route for IPD statistics
import { /* NextRequest, */ NextResponse } from "next/server"; // Commented out unused NextRequest
import { getDB } from "@/lib/database";
import { getSession } from "@/lib/session";

// Define expected structure for query results where needed
interface CountResult {
  count?: number | string; // DB might return count as string
}

interface OccupancyResult {
  occupied?: number | string; // DB might return numbers as strings
  total?: number | string;
}

// Define structure for recent admissions row
interface RecentAdmission {
  id: number | string;
  admission_number: string;
  admission_date: string; // Assuming ISO string or similar
  status: string;
  patient_first_name: string;
  patient_last_name: string;
  bed_number: string;
  room_number: string;
  ward: string;
  doctor_first_name: string;
  doctor_last_name: string;
}

// FIX: Renamed request to _request as it's unused
export async function GET(/* _request: unknown */) { // Removed unused parameter
  try {
    const session = await getSession();
    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const database = await getDB();

    // Get active admissions count
    // FIX: Removed generic type argument from db.query
    // FIX: Use type assertion on the result results
    const activeAdmissionsResult = await database.query(`
      SELECT COUNT(*) as count FROM admissions WHERE status = 'active'
    `);
    const activeAdmissionsCount = Number.parseInt(
      String(
        (activeAdmissionsResult.results?.[0] as CountResult | undefined)?.count ?? // Changed .rows to .results
          0
      ),
      10
    );

    // Get available beds count
    // FIX: Removed generic type argument from db.query
    // FIX: Use type assertion on the result results
    const availableBedsResult = await database.query(`
      SELECT COUNT(*) as count FROM beds WHERE status = 'available'
    `);
    const availableBedsCount = Number.parseInt(
      String(
        (availableBedsResult.results?.[0] as CountResult | undefined)?.count ?? 0 // Changed .rows to .results
      ),
      10
    );

    // Get bed occupancy rate
    // FIX: Removed generic type argument from db.query
    // FIX: Use type assertion on the result results
    const bedOccupancyResult = await database.query(`
      SELECT 
        (SELECT COUNT(*) FROM beds WHERE status = 'occupied') as occupied,
        (SELECT COUNT(*) FROM beds) as total
    `);

    let occupancyRate = 0;
    const occupancyRow = bedOccupancyResult.results?.[0] as // Changed .rows to .results
      | OccupancyResult
      | undefined;
    if (occupancyRow) {
      const occupied = Number.parseInt(String(occupancyRow.occupied ?? 0), 10);
      const total = Number.parseInt(String(occupancyRow.total ?? 0), 10);
      occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;
    }

    // Get recent admissions
    // FIX: Removed generic type argument from db.query
    // FIX: Use type assertion for results
    const recentAdmissionsResult = await database.query(`
      SELECT 
        a.id, a.admission_number, a.admission_date, a.status,
        p.first_name as patient_first_name, p.last_name as patient_last_name,
        b.bed_number, b.room_number, b.ward,
        u.first_name as doctor_first_name, u.last_name as doctor_last_name
      FROM admissions a
      JOIN patients p ON a.patient_id = p.id
      JOIN beds b ON a.bed_id = b.id
      JOIN users u ON a.primary_doctor_id = u.id
      ORDER BY a.admission_date DESC
      LIMIT 5
    `);

    // Assert the type of the results array
    const recentAdmissions =
      (recentAdmissionsResult.results as RecentAdmission[] | undefined) ?? []; // Changed .rows to .results

    return NextResponse.json({
      activeAdmissions: activeAdmissionsCount,
      availableBeds: availableBedsCount,
      occupancyRate: occupancyRate,
      recentAdmissions: recentAdmissions, // Use the correctly typed variable
    });
  } catch (error: unknown) {
    console.error("Error fetching IPD stats:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: "Failed to fetch IPD statistics", details: errorMessage },
      { status: 500 }
    );
  }
}

