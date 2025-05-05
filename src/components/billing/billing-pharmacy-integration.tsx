"use client";

import React, { useState, useEffect, ChangeEvent } from "react";

// Define interfaces for data structures
interface DispensingRecord {
  id: string;
  prescription_id: string;
  prescription_item_id: string;
  medication_id: string;
  generic_name: string;
  brand_name?: string;
  strength: string;
  dosage_form: string;
  batch_id: string;
  batch_number: string;
  quantity: number;
  selling_price: number;
  dispensed_at: string;
  billed: boolean;
}

interface UnbilledItem extends DispensingRecord {
  subtotal: number;
}

interface BillingPharmacyIntegrationProperties {
  patientId: string | null; // Allow null if patientId might not be available initially
}

const BillingPharmacyIntegration: React.FC<
  BillingPharmacyIntegrationProperties
> = ({ patientId }) => {
  // const _router = useRouter(); // Commented out as unused
  const [loading, setLoading] = useState<boolean>(true);
  const [dispensingRecords, setDispensingRecords] = useState<
    DispensingRecord[]
  >([]);
  const [unbilledItems, setUnbilledItems] = useState<UnbilledItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<UnbilledItem[]>([]);
  const [billTotal, setBillTotal] = useState<number>(0);

  useEffect(() => {
    // Fetch dispensing records for the patient that haven't been billed
    const fetchUnbilledDispensing = async (): Promise<void> => {
      if (!patientId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // Simulate API call
        // const response = await fetch(`/api/pharmacy/dispensing?patient_id=${patientId}&billed=false`);
        // if (!response.ok) {
        //   throw new Error('Failed to fetch unbilled items');
        // }
        // const data = await response.json();
        // const records: DispensingRecord[] = data.dispensing_records || [];

        // Mock data
        const mockRecords: DispensingRecord[] = [
          {
            id: "disp_001",
            prescription_id: "presc_001",
            prescription_item_id: "item_001",
            medication_id: "med_001",
            generic_name: "Paracetamol",
            brand_name: "Calpol",
            strength: "500mg",
            dosage_form: "Tablet",
            batch_id: "batch_001",
            batch_number: "PCM2023001",
            quantity: 10,
            selling_price: 2.5,
            dispensed_at: "2025-04-28T10:15:00Z",
            billed: false,
          },
          {
            id: "disp_002",
            prescription_id: "presc_001",
            prescription_item_id: "item_002",
            medication_id: "med_003",
            generic_name: "Cetirizine",
            brand_name: "Zyrtec",
            strength: "10mg",
            dosage_form: "Tablet",
            batch_id: "batch_002",
            batch_number: "CET2023001",
            quantity: 7,
            selling_price: 5,
            dispensed_at: "2025-04-28T10:15:00Z",
            billed: false,
          },
        ];
        const records = mockRecords.filter((r) => !r.billed); // Ensure only unbilled are processed initially

        setDispensingRecords(mockRecords); // Store all records for display later
        setUnbilledItems(
          records.map((record) => ({
            ...record,
            subtotal: record.quantity * record.selling_price,
          }))
        );
      } catch (error) {
        console.error("Error fetching unbilled dispensing records:", error);
        // Handle error appropriately, e.g., show an error message
      } finally {
        setLoading(false);
      }
    };

    fetchUnbilledDispensing();
  }, [patientId]);

  // Handle item selection for billing
  const handleItemSelection = (
    item: UnbilledItem,
    isSelected: boolean
  ): void => {
    if (isSelected) {
      setSelectedItems((previous) => [...previous, item]);
    } else {
      setSelectedItems((previous) =>
        previous.filter((index) => index.id !== item.id)
      );
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
      // Simulate API call to create a bill
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
      // if (!response.ok) {
      //   const errorData = await response.json().catch(() => ({}));
      //   throw new Error(errorData.error || 'Failed to generate bill');
      // }

      console.log("Simulating pharmacy bill generation for:", selectedItems);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate delay

      // Update UI to reflect billed items
      const billedItemIds = new Set(selectedItems.map((item) => item.id));
      setDispensingRecords((previousRecords) =>
        previousRecords.map((record) =>
          billedItemIds.has(record.id) ? { ...record, billed: true } : record
        )
      );

      setUnbilledItems((previousItems) =>
        previousItems.filter((item) => !billedItemIds.has(item.id))
      );

      setSelectedItems([]);
      // Bill total is recalculated by useEffect, no need to set here

      alert("Pharmacy bill generated successfully!");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unknown error occurred.";
      console.error("Error generating pharmacy bill:", error);
      alert(`Failed to generate pharmacy bill: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAllChange = (event: ChangeEvent<HTMLInputElement>): void => {
    if (event.target.checked) {
      setSelectedItems([...unbilledItems]);
    } else {
      setSelectedItems([]);
    }
  };

  if (loading && unbilledItems.length === 0 && selectedItems.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        Loading pharmacy billing data...
      </div>
    );
  }

  const recentlyBilledItems = dispensingRecords.filter(
    (record) => record.billed
  );

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mt-6">
      <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
        <h2 className="text-lg font-semibold text-gray-800">
          Pharmacy Billing
        </h2>
      </div>

      <div className="p-6">
        {unbilledItems.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">
              No unbilled pharmacy items for this patient.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <h3 className="text-md font-medium text-gray-700 mb-2 sm:mb-0">
                Unbilled Pharmacy Items
              </h3>
              <div className="text-right w-full sm:w-auto">
                <div className="text-lg font-bold text-gray-900">
                  Total Selected: ₹{billTotal.toFixed(2)}
                </div>
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
                        checked={
                          selectedItems.length === unbilledItems.length &&
                          unbilledItems.length > 0
                        }
                        onChange={handleSelectAllChange}
                        disabled={unbilledItems.length === 0}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        aria-label="Select all unbilled items"
                      />
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Medication
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Batch
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subtotal
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dispensed On
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {unbilledItems.map((item) => (
                    <tr
                      key={item.id}
                      className={
                        selectedItems.some((index) => index.id === item.id)
                          ? "bg-blue-50"
                          : ""
                      }
                    >
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={selectedItems.some(
                            (index) => index.id === item.id
                          )}
                          onChange={(event: ChangeEvent<HTMLInputElement>) =>
                            handleItemSelection(item, event.target.checked)
                          }
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          aria-label={`Select item ${item.generic_name}`}
                        />
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {item.generic_name} {item.strength}
                        </div>
                        {item.brand_name && (
                          <div className="text-sm text-gray-500">
                            ({item.brand_name})
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {item.batch_number}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                        ₹{item.selling_price.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        ₹{item.subtotal.toFixed(2)}
                      </td>
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
        {recentlyBilledItems.length > 0 && (
          <div className="mt-8">
            <h3 className="text-md font-medium text-gray-700 mb-2">
              Recently Billed Items
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Medication
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Billed On
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentlyBilledItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {item.generic_name} {item.strength}
                        </div>
                        {item.brand_name && (
                          <div className="text-sm text-gray-500">
                            ({item.brand_name})
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                        ₹{(item.quantity * item.selling_price).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {/* In a real app, this would be the actual billing date from the bill record */}
                        {new Date().toLocaleDateString()}
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
