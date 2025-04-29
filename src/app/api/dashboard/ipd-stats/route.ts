// API route for IPD statistics
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {    const session = await getSession();    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Assuming getDB returns an object with a query method
    const db = await getDB(); 
    
    // Get active admissions count - using type assertion to handle the 'never' type issue
    const activeAdmissionsResult = await db.query(`
      SELECT COUNT(*) as count FROM admissions WHERE status = 'active'
    `);
    const activeAdmissionsCount = activeAdmissionsResult.rows && activeAdmissionsResult.rows.length > 0 
      ? (activeAdmissionsResult.rows[0] as any).count || 0 
      : 0;

    // Get available beds count
    const availableBedsResult = await db.query(`
      SELECT COUNT(*) as count FROM beds WHERE status = 'available'
    `);
    const availableBedsCount = availableBedsResult.rows && availableBedsResult.rows.length > 0 
      ? (availableBedsResult.rows[0] as any).count || 0 
      : 0;
    
    // Get bed occupancy rate
    const bedOccupancyResult = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM beds WHERE status = 'occupied') as occupied,
        (SELECT COUNT(*) FROM beds) as total
    `);
    
    let occupancyRate = 0;
    if (bedOccupancyResult.rows && bedOccupancyResult.rows.length > 0) {
        const row = bedOccupancyResult.rows[0] as any;
        const occupied = row.occupied || 0;
        const total = row.total || 0;
        occupancyRate = total > 0 
          ? Math.round((occupied / total) * 100) 
          : 0;
    }
    
    // Get recent admissions
    const recentAdmissionsResult = await db.query(`
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
    
    return NextResponse.json({
      activeAdmissions: activeAdmissionsCount,
      availableBeds: availableBedsCount,
      occupancyRate: occupancyRate,
      recentAdmissions: recentAdmissionsResult.rows || []
    });
  } catch (error) {
    console.error('Error fetching IPD stats:', error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: 'Failed to fetch IPD statistics', details: errorMessage }, { status: 500 });
  }
}
