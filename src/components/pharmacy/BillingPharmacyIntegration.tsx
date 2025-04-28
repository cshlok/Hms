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
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch dispensing records for the patient that haven't been billed
    const fetchUnbilledDispensing = async () => {
      if (!patientId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/pharmacy/dispensing?patient_id=${patientId}&billed=false`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch dispensing records: ${response.status}`);
        }
        
        const data = await response.json();
        const records = data.dispensing_records || [];
        
        setDispensingRecords(records);
        setUnbilledItems(records.map(record => ({
          ...record,
          subtotal: record.quantity * record.selling_price
        })));
      } catch (error) {
        console.error('Error fetching unbilled dispensing records:', error);
        setError('Failed to load pharmacy items. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchUnbilledDispensing();
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
      const response = await fetch('/api/billing/pharmacy-bill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_id: patientId,
          items: selectedItems.map(item => ({
            dispensing_id: item.id,
            medication_id: item.medication_id,
            quantity: item.quantity,
            unit_price: item.selling_price,
            subtotal: item.subtotal
          })),
          total_amount: billTotal
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate bill: ${response.status}`);
      }
      
      const result = await response.json();
      
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
      
    } catch (error) {
      console.error('Error generating pharmacy bill:', error);
      alert('Failed to generate pharmacy bill. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && dispensingRecords.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
        <span className="ml-2">Loading pharmacy billing data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
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
                          {item.billed_at ? new Date(item.billed_at).toLocaleDateString() : new Date().toLocaleDateString()}
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
