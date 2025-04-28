'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Component to integrate Pharmacy with Billing module
export default function BillingPharmacyIntegration({ patientId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dispensingRecords, setDispensingRecords] = useState([]);
  const [unbilledItems, setUnbilledItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [billTotal, setBillTotal] = useState(0);

  useEffect(() => {
    // Fetch dispensing records for the patient that haven't been billed
    const fetchUnbilledDispensing = async () => {
      try {
        // In a real implementation, this would be an API call
        // const response = await fetch(`/api/pharmacy/dispensing?patient_id=${patientId}&billed=false`);
        // const data = await response.json();
        // setDispensingRecords(data.dispensing_records || []);
        
        // Mock data
        const mockRecords = [
          {
            id: 'disp_001',
            prescription_id: 'presc_001',
            prescription_item_id: 'item_001',
            medication_id: 'med_001',
            generic_name: 'Paracetamol',
            brand_name: 'Calpol',
            strength: '500mg',
            dosage_form: 'Tablet',
            batch_id: 'batch_001',
            batch_number: 'PCM2023001',
            quantity: 10,
            selling_price: 2.50,
            dispensed_at: '2025-04-28T10:15:00Z',
            billed: false
          },
          {
            id: 'disp_002',
            prescription_id: 'presc_001',
            prescription_item_id: 'item_002',
            medication_id: 'med_003',
            generic_name: 'Cetirizine',
            brand_name: 'Zyrtec',
            strength: '10mg',
            dosage_form: 'Tablet',
            batch_id: 'batch_002',
            batch_number: 'CET2023001',
            quantity: 7,
            selling_price: 5.00,
            dispensed_at: '2025-04-28T10:15:00Z',
            billed: false
          }
        ];
        
        setDispensingRecords(mockRecords);
        setUnbilledItems(mockRecords.map(record => ({
          ...record,
          subtotal: record.quantity * record.selling_price
        })));
      } catch (error) {
        console.error('Error fetching unbilled dispensing records:', error);
      } finally {
        setLoading(false);
      }
    };

    if (patientId) {
      fetchUnbilledDispensing();
    } else {
      setLoading(false);
    }
  }, [patientId]);

  // Handle item selection for billing
  const handleItemSelection = (item, isSelected) => {
    if (isSelected) {
      setSelectedItems([...selectedItems, item]);
    } else {
      setSelectedItems(selectedItems.filter(i => i.id !== item.id));
    }
  };

  // Calculate bill total whenever selected items change
  useEffect(() => {
    const total = selectedItems.reduce((sum, item) => sum + item.subtotal, 0);
    setBillTotal(total);
  }, [selectedItems]);

  // Generate pharmacy bill
  const handleGenerateBill = async () => {
    if (selectedItems.length === 0) {
      alert('Please select at least one item to bill');
      return;
    }
    
    setLoading(true);
    
    try {
      // In a real implementation, this would be an API call to create a bill
      // const response = await fetch('/api/billing/pharmacy-bill', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     patient_id: patientId,
      //     items: selectedItems.map(item => ({
      //       dispensing_id: item.id,
      //       medication_id: item.medication_id,
      //       quantity: item.quantity,
      //       unit_price: item.selling_price,
      //       subtotal: item.subtotal
      //     })),
      //     total_amount: billTotal
      //   }),
      // });
      
      // Simulate successful bill creation
      console.log('Generating pharmacy bill for:', selectedItems);
      
      setTimeout(() => {
        // Update UI to reflect billed items
        setDispensingRecords(prevRecords => 
          prevRecords.map(record => 
            selectedItems.some(item => item.id === record.id) 
              ? { ...record, billed: true } 
              : record
          )
        );
        
        setUnbilledItems(prevItems => 
          prevItems.filter(item => !selectedItems.some(selected => selected.id === item.id))
        );
        
        setSelectedItems([]);
        setBillTotal(0);
        
        alert('Pharmacy bill generated successfully!');
        setLoading(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error generating pharmacy bill:', error);
      alert('Failed to generate pharmacy bill. Please try again.');
      setLoading(false);
    }
  };

  if (loading && dispensingRecords.length === 0) {
    return <div className="flex justify-center items-center h-64">Loading pharmacy billing data...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mt-6">
      <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
        <h2 className="text-lg font-semibold text-gray-800">Pharmacy Billing</h2>
      </div>
      
      <div className="p-6">
        {unbilledItems.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No unbilled pharmacy items for this patient.</p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex justify-between items-center">
              <h3 className="text-md font-medium text-gray-700">Unbilled Pharmacy Items</h3>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">Total: ₹{billTotal.toFixed(2)}</div>
                <button
                  onClick={handleGenerateBill}
                  disabled={loading || selectedItems.length === 0}
                  className="mt-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
                >
                  Generate Bill
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 w-12">
                      <input
                        type="checkbox"
                        checked={selectedItems.length === unbilledItems.length && unbilledItems.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems([...unbilledItems]);
                          } else {
                            setSelectedItems([]);
                          }
                        }}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medication</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dispensed On</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {unbilledItems.map((item) => (
                    <tr key={item.id} className={selectedItems.some(i => i.id === item.id) ? 'bg-blue-50' : ''}>
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={selectedItems.some(i => i.id === item.id)}
                          onChange={(e) => handleItemSelection(item, e.target.checked)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.generic_name} {item.strength}</div>
                        {item.brand_name && <div className="text-sm text-gray-500">{item.brand_name}</div>}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.batch_number}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.quantity}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">₹{item.selling_price.toFixed(2)}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">₹{item.subtotal.toFixed(2)}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.dispensed_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        
        {/* Recently Billed Items */}
        {dispensingRecords.some(record => record.billed) && (
          <div className="mt-8">
            <h3 className="text-md font-medium text-gray-700 mb-2">Recently Billed Items</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medication</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Billed On</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dispensingRecords
                    .filter(record => record.billed)
                    .map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.generic_name} {item.strength}</div>
                          {item.brand_name && <div className="text-sm text-gray-500">{item.brand_name}</div>}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.quantity}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          ₹{(item.quantity * item.selling_price).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {new Date().toLocaleDateString()} {/* In a real app, this would be the actual billing date */}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
