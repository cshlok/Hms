
"use client";

import React, { useState, useEffect, ChangeEvent } from "react";
import { useRouter } from "next/navigation";

// Define interfaces for data structures
interface DispensingRecord {
  id: string;
  patient_id: string;
  medication_id: string;
  generic_name: string;
  brand_name?: string;
  strength: string;
  batch_number: string;
  quantity: number;
  selling_price: number;
  dispensed_at: string; // ISO date string
  billed: boolean;
  billed_at?: string; // ISO date string
}

// FIX: Define expected API response structure for dispensing records
interface DispensingApiResponse {
  dispensing_records?: DispensingRecord[];
  error?: string;
}

// FIX: Define expected API response structure for bill generation
interface BillGenerationResponse {
  invoiceId?: string; // Example property
  message?: string;
  error?: string;
}

interface UnbilledItem extends DispensingRecord {
  subtotal: number;
}

interface BillItem {
  dispensing_id: string;
  medication_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface BillingPharmacyIntegrationProps {
  patientId: string | null; // Allow null if patient might not be selected initially
}

// Component to integrate Pharmacy with Billing module
const BillingPharmacyIntegration: React.FC<BillingPharmacyIntegrationProps> = ({ patientId }) => {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [dispensingRecords, setDispensingRecords] = useState<DispensingRecord[]>([]);
  const [unbilledItems, setUnbilledItems] = useState<UnbilledItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<UnbilledItem[]>([]);
  const [billTotal, setBillTotal] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch dispensing records for the patient that haven't been billed
    const fetchUnbilledDispensing = async (): Promise<void> => {
      if (!patientId) {
        setLoading(false);
        setDispensingRecords([]);
        setUnbilledItems([]);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/pharmacy/dispensing?patient_id=${patientId}&billed=false`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch dispensing records: ${response.status}`);
        }
        
        // FIX: Use defined type for API response
        const data: DispensingApiResponse = await response.json();
        const records: DispensingRecord[] = data.dispensing_records || [];
        
        setDispensingRecords(records); // Store all records (for recently billed display)
        
        const calculatedUnbilledItems: UnbilledItem[] = records
          .filter(record => !record.billed) // Ensure we only process unbilled ones
          .map(record => ({
            ...record,
            subtotal: record.quantity * record.selling_price
          }));
        setUnbilledItems(calculatedUnbilledItems);

      } catch (err: unknown) { // FIX: Use unknown for catch block
        console.error("Error fetching unbilled dispensing records:", err);
        const message = err instanceof Error ? err.message : "An unknown error occurred";
        setError(`Failed to load pharmacy items: ${message}. Please try again.`);
        setDispensingRecords([]);
        setUnbilledItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUnbilledDispensing();
  }, [patientId]);

  // Handle item selection for billing
  const handleItemSelection = (item: UnbilledItem, isSelected: boolean): void => {
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
  const handleGenerateBill = async (): Promise<void> => {
    if (selectedItems.length === 0) {
      alert("Please select at least one item to bill");
      return;
    }
    
    setLoading(true);
    
    try {
      const billItems: BillItem[] = selectedItems.map(item => ({
        dispensing_id: item.id,
        medication_id: item.medication_id,
        quantity: item.quantity,
        unit_price: item.selling_price,
        subtotal: item.subtotal
      }));

      const response = await fetch("/api/billing/pharmacy-bill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patient_id: patientId,
          items: billItems,
          total_amount: billTotal
        }),
      });
      
      // FIX: Use defined type for error response
      if (!response.ok) {
        let errorMsg = `Failed to generate bill: ${response.status}`;
        try {
            const errorData: { error?: string } = await response.json();
            errorMsg = errorData.error || errorMsg;
        } catch (jsonError) {
            // Ignore if response is not JSON
        }
        throw new Error(errorMsg);
      }
      
      // FIX: Use defined type for success response
      const result: BillGenerationResponse = await response.json(); 
      
      // Update UI state after successful billing
      const billedIds = new Set(selectedItems.map(item => item.id));
      const now = new Date().toISOString();

      setDispensingRecords(prevRecords => 
        prevRecords.map(record => 
          billedIds.has(record.id)
            ? { ...record, billed: true, billed_at: now } 
            : record
        )
      );
      
      setUnbilledItems(prevItems => 
        prevItems.filter(item => !billedIds.has(item.id))
      );
      
      setSelectedItems([]);
      setBillTotal(0);
      
      alert(result.message || "Pharmacy bill generated successfully!");
      // Optionally navigate or show bill details: 
      // if (result.invoiceId) router.push(`/billing/invoices/${result.invoiceId}`);
      
    } catch (err: unknown) { // FIX: Use unknown for catch block
      console.error("Error generating pharmacy bill:", err);
      const message = err instanceof Error ? err.message : "An unknown error occurred";
      alert(`Failed to generate pharmacy bill: ${message}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // Handle selecting/deselecting all items
  const handleSelectAll = (event: ChangeEvent<HTMLInputElement>): void => {
    if (event.target.checked) {
      setSelectedItems([...unbilledItems]);
    } else {
      setSelectedItems([]);
    }
  };

  if (loading && unbilledItems.length === 0 && !error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
        <span className="ml-2">Loading pharmacy billing data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mt-6" role="alert">
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
        {unbilledItems.length === 0 && !loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No unbilled pharmacy items for this patient.</p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <h3 className="text-md font-medium text-gray-700 mb-2 sm:mb-0">Unbilled Pharmacy Items</h3>
              <div className="text-left sm:text-right w-full sm:w-auto">
                <div className="text-lg font-bold text-gray-900">Total Selected: ₹{billTotal.toFixed(2)}</div>
                <button
                  onClick={handleGenerateBill}
                  disabled={loading || selectedItems.length === 0}
                  className="mt-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 w-full sm:w-auto"
                >
                  {loading ? "Generating..." : "Generate Bill for Selected"}
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
                        aria-label="Select all unbilled items"
                        checked={selectedItems.length === unbilledItems.length && unbilledItems.length > 0}
                        onChange={handleSelectAll}
                        disabled={unbilledItems.length === 0}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medication</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dispensed On</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {unbilledItems.map((item) => (
                    <tr key={item.id} className={selectedItems.some(i => i.id === item.id) ? "bg-blue-50" : ""}>
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          aria-label={`Select item ${item.generic_name}`}
                          checked={selectedItems.some(i => i.id === item.id)}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => handleItemSelection(item, e.target.checked)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.generic_name} {item.strength}</div>
                        {item.brand_name && <div className="text-sm text-gray-500">({item.brand_name})</div>}
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
        
        {/* Recently Billed Items Section */}
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
                    .sort((a, b) => new Date(b.billed_at || 0).getTime() - new Date(a.billed_at || 0).getTime()) // Sort by billed date descending
                    .map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.generic_name} {item.strength}</div>
                          {item.brand_name && <div className="text-sm text-gray-500">({item.brand_name})</div>}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.quantity}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          ₹{(item.quantity * item.selling_price).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {item.billed_at ? new Date(item.billed_at).toLocaleDateString() : "N/A"}
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
};

export default BillingPharmacyIntegration;

