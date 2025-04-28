// API route for IPD statistics
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    
    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const db = await getDB();
    
    // Get active admissions count
    const activeAdmissionsResult = await db.prepare(`
      SELECT COUNT(*) as count FROM admissions WHERE status = 'active'
    `).first();
    
    // Get available beds count
    const availableBedsResult = await db.prepare(`
      SELECT COUNT(*) as count FROM beds WHERE status = 'available'
    `).first();
    
    // Get bed occupancy rate
    const bedOccupancyResult = await db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM beds WHERE status = 'occupied') as occupied,
        (SELECT COUNT(*) FROM beds) as total
    `).first();
    
    const occupancyRate = bedOccupancyResult.total > 0 
      ? Math.round((bedOccupancyResult.occupied / bedOccupancyResult.total) * 100) 
      : 0;
    
    // Get recent admissions
    const recentAdmissions = await db.prepare(`
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
    `).all();
    
    return NextResponse.json({
      activeAdmissions: activeAdmissionsResult.count || 0,
      availableBeds: availableBedsResult.count || 0,
      occupancyRate: occupancyRate,
      recentAdmissions: recentAdmissions.results || []
    });
  } catch (error) {
    console.error('Error fetching IPD stats:', error);
    return NextResponse.json({ error: 'Failed to fetch IPD statistics' }, { status: 500 });
  }
}
