import { NextRequest } from 'next/server';
import { getSession } from '@/lib/session';
import { DB } from '@/lib/db';
import { z } from 'zod';

// Schema for IPD Progress Notes
const ProgressNoteSchema = z.object({
  admission_id: z.number(),
  note_date: z.string().optional().default(() => new Date().toISOString().split('T')[0]),
  note_time: z.string().optional().default(() => new Date().toISOString().split('T')[1].substring(0, 5)),
  note_type: z.enum(['Doctor', 'Nurse', 'Consultant']),
  note_content: z.string(),
  vital_signs: z.object({
    temperature: z.number().optional(),
    pulse: z.number().optional(),
    respiration: z.number().optional(),
    blood_pressure: z.string().optional(),
    spo2: z.number().optional(),
    pain_level: z.number().optional(),
  }).optional(),
  medication_given: z.array(z.object({
    medication_id: z.number(),
    dose: z.string(),
    route: z.string(),
    time_given: z.string(),
  })).optional(),
});

// GET handler for listing progress notes for a specific admission
export async function GET(request: NextRequest, { params }: { params: { admissionId: string } }) {
  try {
    const session = await getSession();
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401 
      });
    }
    
    // Check if user has appropriate role
    const allowedRoles = ['Admin', 'Doctor', 'Nurse', 'Consultant'];
    if (!allowedRoles.includes(session.user.roleName)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { 
        status: 403 
      });
    }
    
    const admissionId = params.admissionId;
    
    // Verify admission exists and user has access
    let admissionCheck;
    
    if (session.user.roleName === 'Doctor') {
      // Doctors can only see their patients' notes
      admissionCheck = await DB.prepare(`
        SELECT a.admission_id 
        FROM IPDAdmissions a
        WHERE a.admission_id = ? AND a.doctor_id = ?
      `).bind(admissionId, session.user.userId).first();
    } else {
      // Admin and Nurse can see all notes
      admissionCheck = await DB.prepare(`
        SELECT admission_id 
        FROM IPDAdmissions
        WHERE admission_id = ?
      `).bind(admissionId).first();
    }
    
    if (!admissionCheck) {
      return new Response(JSON.stringify({ 
        error: 'Admission not found or access denied' 
      }), { 
        status: 404 
      });
    }
    
    const { searchParams } = new URL(request.url);
    const noteType = searchParams.get('noteType');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Build query conditions
    let conditions = ['admission_id = ?'];
    let params: any[] = [admissionId];
    
    if (noteType) {
      conditions.push('note_type = ?');
      params.push(noteType);
    }
    
    if (dateFrom) {
      conditions.push('note_date >= ?');
      params.push(dateFrom);
    }
    
    if (dateTo) {
      conditions.push('note_date <= ?');
      params.push(dateTo);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Query to get progress notes
    const query = `
      SELECT 
        pn.progress_note_id,
        pn.admission_id,
        pn.note_date,
        pn.note_time,
        pn.note_type,
        pn.note_content,
        pn.vital_signs,
        pn.medication_given,
        pn.created_at,
        u.full_name as created_by_name
      FROM 
        IPDProgressNotes pn
      JOIN 
        Users u ON pn.created_by = u.user_id
      ${whereClause}
      ORDER BY 
        pn.note_date DESC, pn.note_time DESC
      LIMIT ? OFFSET ?
    `;
    
    params.push(limit, offset);
    
    const progressNotes = await DB.prepare(query).bind(...params).all();
    
    return new Response(JSON.stringify(progressNotes.results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error fetching IPD progress notes:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch IPD progress notes', 
      details: error instanceof Error ? error.message : String(error) 
    }), { 
      status: 500 
    });
  }
}

// POST handler for creating a new progress note
export async function POST(request: NextRequest, { params }: { params: { admissionId: string } }) {
  try {
    const session = await getSession();
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401 
      });
    }
    
    // Check if user has appropriate role
    const allowedRoles = ['Doctor', 'Nurse', 'Consultant'];
    if (!allowedRoles.includes(session.user.roleName)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { 
        status: 403 
      });
    }
    
    const admissionId = params.admissionId;
    
    // Verify admission exists and is active
    const admissionCheck = await DB.prepare(`
      SELECT admission_id, status 
      FROM IPDAdmissions
      WHERE admission_id = ?
    `).bind(admissionId).first();
    
    if (!admissionCheck) {
      return new Response(JSON.stringify({ 
        error: 'Admission not found' 
      }), { 
        status: 404 
      });
    }
    
    if (admissionCheck.status !== 'Active') {
      return new Response(JSON.stringify({ 
        error: 'Cannot add progress notes to a non-active admission' 
      }), { 
        status: 400 
      });
    }
    
    // If user is a doctor, verify they are assigned to this patient
    if (session.user.roleName === 'Doctor') {
      const doctorCheck = await DB.prepare(`
        SELECT admission_id 
        FROM IPDAdmissions
        WHERE admission_id = ? AND doctor_id = ?
      `).bind(admissionId, session.user.userId).first();
      
      if (!doctorCheck) {
        return new Response(JSON.stringify({ 
          error: 'You are not authorized to add notes for this patient' 
        }), { 
          status: 403 
        });
      }
    }
    
    const data = await request.json();
    
    // Add admission_id from path parameter
    data.admission_id = parseInt(admissionId);
    
    // Validate input data
    const validationResult = ProgressNoteSchema.safeParse(data);
    if (!validationResult.success) {
      return new Response(JSON.stringify({ 
        error: 'Invalid input data', 
        details: validationResult.error.format() 
      }), { 
        status: 400 
      });
    }
    
    const noteData = validationResult.data;
    
    // Set note_type based on user role if not specified
    if (!noteData.note_type) {
      noteData.note_type = session.user.roleName === 'Doctor' ? 'Doctor' : 
                          session.user.roleName === 'Nurse' ? 'Nurse' : 'Consultant';
    }
    
    // Insert progress note
    const result = await DB.prepare(`
      INSERT INTO IPDProgressNotes (
        admission_id,
        note_date,
        note_time,
        note_type,
        note_content,
        vital_signs,
        medication_given,
        created_by,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      noteData.admission_id,
      noteData.note_date,
      noteData.note_time,
      noteData.note_type,
      noteData.note_content,
      noteData.vital_signs ? JSON.stringify(noteData.vital_signs) : null,
      noteData.medication_given ? JSON.stringify(noteData.medication_given) : null,
      session.user.userId
    ).run();
    
    const progressNoteId = result.meta.last_row_id;
    
    return new Response(JSON.stringify({ 
      message: 'Progress note created successfully', 
      progress_note_id: progressNoteId 
    }), { 
      status: 201 
    });
    
  } catch (error) {
    console.error('Error creating IPD progress note:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to create IPD progress note', 
      details: error instanceof Error ? error.message : String(error) 
    }), { 
      status: 500 
    });
  }
}
