import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/session';

// GET /api/pharmacy/dispensing
// Query parameters:
// - prescription_id: Filter by prescription
// - patient_id: Filter by patient
// - date_from: Filter by dispensing date (from)
// - date_to: Filter by dispensing date (to)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(); // Fixed: Removed request argument
    
    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const prescription_id = searchParams.get('prescription_id');
    const patient_id = searchParams.get('patient_id');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');
    
    const db = await getDB();
    
    // Build the query
    let query = `
      SELECT 
        dr.id,
        dr.dispensed_at,
        dr.quantity,
        dr.billed,
        dr.billing_id,
        dr.notes,
        p.id as prescription_id,
        p.prescription_number,
        pi.id as prescription_item_id,
        pt.id as patient_id,
        pt.first_name as patient_first_name,
        pt.last_name as patient_last_name,
        m.id as medication_id,
        m.generic_name,
        m.brand_name,
        m.dosage_form,
        m.strength,
        m.unit_of_measure,
        ib.id as batch_id,
        ib.batch_number,
        ib.expiry_date,
        u.id as dispensed_by_id,
        u.first_name as dispensed_by_first_name,
        u.last_name as dispensed_by_last_name
      FROM dispensing_records dr
      JOIN prescriptions p ON dr.prescription_id = p.id
      JOIN prescription_items pi ON dr.prescription_item_id = pi.id
      JOIN patients pt ON p.patient_id = pt.id
      JOIN medications m ON pi.medication_id = m.id
      JOIN inventory_batches ib ON dr.batch_id = ib.id
      JOIN users u ON dr.dispensed_by = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    // Add filters
    if (prescription_id) {
      query += ` AND p.id = ?`;
      params.push(prescription_id);
    }
    
    if (patient_id) {
      query += ` AND pt.id = ?`;
      params.push(patient_id);
    }
    
    if (date_from) {
      query += ` AND dr.dispensed_at >= ?`;
      params.push(date_from);
    }
    
    if (date_to) {
      query += ` AND dr.dispensed_at <= ?`;
      params.push(date_to);
    }
    
    // Order by dispensing date (newest first)
    query += ` ORDER BY dr.dispensed_at DESC`;
    
    // Execute the query
    const result = await db.prepare(query).bind(...params).all();
    
    return NextResponse.json({
      dispensing_records: result.results || []
    });
  } catch (error) {
    console.error('Error fetching dispensing records:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Failed to fetch dispensing records', details: errorMessage }, { status: 500 });
  }
}

// POST /api/pharmacy/dispensing
// Dispense medications for a prescription
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(); // Fixed: Removed request argument
    
    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has pharmacist role
    // Assuming roleName is directly on user object based on session.ts
    const hasPermission = ['admin', 'pharmacy_admin', 'pharmacist'].includes(session.user.roleName);
    
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden: Only pharmacists can dispense medications' }, { status: 403 });
    }
    
    const data = await request.json();
    
    // Validate required fields
    const requiredFields = [
      'prescription_id', 'items'
    ];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }
    
    // Validate items array
    if (!Array.isArray(data.items) || data.items.length === 0) {
      return NextResponse.json({ error: 'Dispensing record must contain at least one item' }, { status: 400 });
    }
    
    for (const item of data.items) {
      const itemRequiredFields = ['prescription_item_id', 'batch_id', 'quantity'];
      for (const field of itemRequiredFields) {
        if (!item[field]) {
          return NextResponse.json({ error: `Missing required field in dispensing item: ${field}` }, { status: 400 });
        }
      }
      
      // Validate quantity is a positive number
      if (item.quantity <= 0) {
        return NextResponse.json({ error: 'Quantity must be a positive number' }, { status: 400 });
      }
    }
    
    const db = await getDB();
    
    // Check if prescription exists and is pending or partially dispensed
    const prescription = await db.prepare(`
      SELECT id, status, patient_id FROM prescriptions WHERE id = ?
    `).bind(data.prescription_id).first();
    
    if (!prescription) {
      return NextResponse.json({ error: 'Prescription not found' }, { status: 404 });
    }
    
    if (prescription.status === 'dispensed') {
      return NextResponse.json({ error: 'Prescription is already fully dispensed' }, { status: 400 });
    }
    
    if (prescription.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot dispense a cancelled prescription' }, { status: 400 });
    }
    
    // Start a transaction
    await db.exec('BEGIN TRANSACTION');
    
    try {
      const dispensingRecords = [];
      
      // Process each item
      for (const item of data.items) {
        // Check if prescription item exists and belongs to the prescription
        const prescriptionItem = await db.prepare(`
          SELECT id, medication_id, quantity, dispensed_quantity, status 
          FROM prescription_items 
          WHERE id = ? AND prescription_id = ?
        `).bind(item.prescription_item_id, data.prescription_id).first();
        
        if (!prescriptionItem) {
          throw new Error(`Prescription item not found or does not belong to the prescription: ${item.prescription_item_id}`);
        }
        
        if (prescriptionItem.status === 'dispensed') {
          throw new Error(`Prescription item is already fully dispensed: ${item.prescription_item_id}`);
        }
        
        if (prescriptionItem.status === 'cancelled') {
          throw new Error(`Cannot dispense a cancelled prescription item: ${item.prescription_item_id}`);
        }
        
        // Check if batch exists and has enough stock
        const batch = await db.prepare(`
          SELECT id, medication_id, current_quantity, expiry_date 
          FROM inventory_batches 
          WHERE id = ?
        `).bind(item.batch_id).first();
        
        if (!batch) {
          throw new Error(`Batch not found: ${item.batch_id}`);
        }
        
        if (batch.medication_id !== prescriptionItem.medication_id) {
          throw new Error(`Batch medication does not match prescription item medication`);
        }
        
        if (batch.current_quantity < item.quantity) {
          throw new Error(`Insufficient stock in batch ${item.batch_id}: requested ${item.quantity}, available ${batch.current_quantity}`);
        }
        
        // Check if batch is expired
        const today = new Date();
        const expiryDate = new Date(batch.expiry_date);
        if (expiryDate <= today) {
          throw new Error(`Cannot dispense from expired batch ${item.batch_id}`);
        }
        
        // Calculate remaining quantity to dispense for this item
        const remainingQuantity = prescriptionItem.quantity - (prescriptionItem.dispensed_quantity || 0);
        
        if (item.quantity > remainingQuantity) {
          throw new Error(`Dispensing quantity (${item.quantity}) exceeds remaining quantity to dispense (${remainingQuantity}) for item ${item.prescription_item_id}`);
        }
        
        // Create dispensing record
        const dispensingId = `disp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        
        await db.prepare(`
          INSERT INTO dispensing_records (
            id, prescription_id, prescription_item_id, batch_id,
            quantity, dispensed_by, notes, billed
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          dispensingId,
          data.prescription_id,
          item.prescription_item_id,
          item.batch_id,
          item.quantity,
          session.user.userId, // Use userId from session
          item.notes || null,
          false // Not billed yet
        ).run();
        
        // Update batch quantity
        await db.prepare(`
          UPDATE inventory_batches
          SET current_quantity = current_quantity - ?
          WHERE id = ?
        `).bind(item.quantity, item.batch_id).run();
        
        // Record inventory transaction
        const transactionId = `trans_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        await db.prepare(`
          INSERT INTO inventory_transactions (
            id, batch_id, transaction_type, quantity, reference_type,
            reference_id, user_id, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          transactionId,
          item.batch_id,
          'dispense',
          item.quantity,
          'dispensing',
          dispensingId,
          session.user.userId, // Use userId from session
          `Dispensed for prescription ${data.prescription_id}`
        ).run();
        
        // Update prescription item
        const newDispensedQuantity = (prescriptionItem.dispensed_quantity || 0) + item.quantity;
        const newStatus = newDispensedQuantity >= prescriptionItem.quantity ? 'dispensed' : 'partially_dispensed';
        
        await db.prepare(`
          UPDATE prescription_items
          SET dispensed_quantity = ?, status = ?
          WHERE id = ?
        `).bind(newDispensedQuantity, newStatus, item.prescription_item_id).run();
        
        // Add to result
        dispensingRecords.push(dispensingId);
      }
      
      // Check if all items in the prescription are now dispensed
      const prescriptionItems = await db.prepare(`
        SELECT id, status FROM prescription_items WHERE prescription_id = ?
      `).bind(data.prescription_id).all();
      
      const allItemsDispensed = prescriptionItems.results.every(item => item.status === 'dispensed');
      const anyItemPartiallyDispensed = prescriptionItems.results.some(item => item.status === 'partially_dispensed');
      
      // Update prescription status
      const newPrescriptionStatus = allItemsDispensed ? 'dispensed' : (anyItemPartiallyDispensed ? 'partially_dispensed' : 'pending');
      
      await db.prepare(`
        UPDATE prescriptions
        SET status = ?
        WHERE id = ?
      `).bind(newPrescriptionStatus, data.prescription_id).run();
      
      // If billing is enabled, create billing entry
      if (data.create_billing === true) {
        // This would integrate with the billing module
        // For now, just mark the dispensing records as billed
        for (const dispensingId of dispensingRecords) {
          await db.prepare(`
            UPDATE dispensing_records
            SET billed = true
            WHERE id = ?
          `).bind(dispensingId).run();
        }
      }
      
      // Commit the transaction
      await db.exec('COMMIT');
      
      // Fetch the updated prescription with items
      const updatedPrescription = await db.prepare(`
        SELECT 
          p.id,
          p.prescription_number,
          p.prescription_date,
          p.source,
          p.source_id,
          p.status,
          p.notes,
          pt.id as patient_id,
          pt.first_name as patient_first_name,
          pt.last_name as patient_last_name,
          u.id as doctor_id,
          u.first_name as doctor_first_name,
          u.last_name as doctor_last_name
        FROM prescriptions p
        JOIN patients pt ON p.patient_id = pt.id
        JOIN users u ON p.doctor_id = u.id
        WHERE p.id = ?
      `).bind(data.prescription_id).first();
      
      // Fetch prescription items
      const updatedPrescriptionItems = await db.prepare(`
        SELECT 
          pi.id,
          pi.dosage,
          pi.frequency,
          pi.duration,
          pi.quantity,
          pi.dispensed_quantity,
          pi.instructions,
          pi.status,
          m.id as medication_id,
          m.generic_name,
          m.brand_name,
          m.dosage_form,
          m.strength,
          m.unit_of_measure
        FROM prescription_items pi
        JOIN medications m ON pi.medication_id = m.id
        WHERE pi.prescription_id = ?
      `).bind(data.prescription_id).all();
      
      // Fetch dispensing records
      const dispensingRecordsResult = await db.prepare(`
        SELECT 
          dr.id,
          dr.dispensed_at,
          dr.quantity,
          dr.billed,
          dr.notes,
          pi.id as prescription_item_id,
          m.id as medication_id,
          m.generic_name,
          m.brand_name,
          ib.id as batch_id,
          ib.batch_number,
          u.id as dispensed_by_id,
          u.first_name as dispensed_by_first_name,
          u.last_name as dispensed_by_last_name
        FROM dispensing_records dr
        JOIN prescription_items pi ON dr.prescription_item_id = pi.id
        JOIN medications m ON pi.medication_id = m.id
        JOIN inventory_batches ib ON dr.batch_id = ib.id
        JOIN users u ON dr.dispensed_by = u.id
        WHERE dr.prescription_id = ?
        ORDER BY dr.dispensed_at DESC
      `).bind(data.prescription_id).all();
      
      return NextResponse.json({
        prescription: {
          ...updatedPrescription,
          items: updatedPrescriptionItems.results || []
        },
        dispensing_records: dispensingRecordsResult.results || []
      }, { status: 200 });
    } catch (error) {
      // Rollback the transaction in case of error
      await db.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error dispensing medications:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Failed to dispense medications: ' + errorMessage }, { status: 500 });
  }
}

