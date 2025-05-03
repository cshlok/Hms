"use client";

import React, { useState, useEffect } from "react";
// import { useRouter } from "next/navigation"; // FIX: Removed unused import
import { Loader2 } from "lucide-react";

// Define interfaces for data structures
interface PrescriptionItem {
  id: string;
  medication_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  dispensed_quantity: number;
  quantity: number;
}

interface Prescription {
  id: string;
  date: string;
  status: string; // e.g., 'active', 'partially_dispensed', 'completed'
  items: PrescriptionItem[];
}

interface MedicationScheduleItem {
  id: string;
  prescription_item_id: string;
  medication_name: string;
  scheduled_time: string;
  status: "pending" | "administered" | "skipped" | "held";
  condition?: string;
}

interface AdministrationRecord {
  id: string;
  schedule_id?: string; // Link to schedule if applicable
  prescription_item_id?: string; // Link to prescription item
  medication_name: string;
  administered_at: string;
  administered_by: string; // Name or ID of the nurse
  notes?: string;
}

interface IPDPharmacyIntegrationProperties {
  admissionId: string | null;
  patientId: string | null;
}

const IPDPharmacyIntegration: React.FC<IPDPharmacyIntegrationProperties> = ({
  admissionId,
  patientId,
}) => {
  // const router = useRouter(); // FIX: Removed unused router
  const [loading, setLoading] = useState<boolean>(true);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [medicationSchedule, setMedicationSchedule] = useState<
    MedicationScheduleItem[]
  >([]);
  const [administrationRecords, setAdministrationRecords] = useState<
    AdministrationRecord[]
  >([]);
  const [error, setError] = useState<string | null>();

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      if (!admissionId || !patientId) {
        setLoading(false);
        setError("Admission ID or Patient ID is missing.");
        return;
      }

      setLoading(true);
      setError(undefined);
      try {
        // Simulate fetching all data concurrently
        // In a real app, you might have separate endpoints or a combined one
        // const [prescriptionsRes, scheduleRes, recordsRes] = await Promise.all([
        //   fetch(`/api/pharmacy/prescriptions?patient_id=${patientId}&status=active`),
        //   fetch(`/api/ipd/admissions/${admissionId}/medication-schedule`),
        //   fetch(`/api/ipd/admissions/${admissionId}/medication-administration`)
        // ]);

        // // Check responses
        // if (!prescriptionsRes.ok) throw new Error("Failed to fetch prescriptions");
        // if (!scheduleRes.ok) throw new Error("Failed to fetch medication schedule");
        // if (!recordsRes.ok) throw new Error("Failed to fetch administration records");

        // const prescriptionsData = await prescriptionsRes.json();
        // const scheduleData = await scheduleRes.json();
        // const recordsData = await recordsRes.json();

        // setPrescriptions(prescriptionsData.prescriptions || []);
        // setMedicationSchedule(scheduleData.schedule || []);
        // setAdministrationRecords(recordsData.records || []);

        // Mock data simulation
        await new Promise((resolve) => setTimeout(resolve, 700));
        const mockPrescriptions: Prescription[] = [
          {
            id: "presc_002",
            date: "2025-04-25",
            status: "partially_dispensed",
            items: [
              {
                id: "item_003",
                medication_id: "med_002",
                medication_name: "Amoxicillin 250mg",
                dosage: "1 capsule",
                frequency: "BID",
                duration: "7 days",
                dispensed_quantity: 10,
                quantity: 14,
              },
              {
                id: "item_004",
                medication_id: "med_001",
                medication_name: "Paracetamol 500mg",
                dosage: "1 tablet",
                frequency: "PRN",
                duration: "N/A",
                dispensed_quantity: 5,
                quantity: 10,
              },
            ],
          },
        ];
        const mockSchedule: MedicationScheduleItem[] = [
          {
            id: "sched_001",
            prescription_item_id: "item_003",
            medication_name: "Amoxicillin 250mg",
            scheduled_time: "08:00",
            status: "pending",
          },
          {
            id: "sched_002",
            prescription_item_id: "item_003",
            medication_name: "Amoxicillin 250mg",
            scheduled_time: "20:00",
            status: "pending",
          },
          {
            id: "sched_003",
            prescription_item_id: "item_004",
            medication_name: "Paracetamol 500mg",
            scheduled_time: "12:00",
            status: "pending",
            condition: "If fever > 101F",
          },
        ];
        const mockRecords: AdministrationRecord[] = [
          {
            id: "admin_001",
            schedule_id: "sched_001",
            prescription_item_id: "item_003",
            medication_name: "Amoxicillin 250mg",
            administered_at: new Date(Date.now() - 7_200_000).toISOString(),
            administered_by: "Nurse Jane",
            notes: "Patient took medication without issues.",
          },
        ];

        setPrescriptions(mockPrescriptions);
        setMedicationSchedule(mockSchedule);
        setAdministrationRecords(mockRecords);
      } catch (error_) {
        const message =
          error_ instanceof Error
            ? error_.message
            : "An unknown error occurred.";
        console.error("Error fetching IPD pharmacy data:", error_);
        setError(`Failed to load data: ${message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [admissionId, patientId]);

  const handleAdministerMedication = async (
    scheduleItem: MedicationScheduleItem
  ): Promise<void> => {
    if (!admissionId) {
      alert("Admission ID is missing.");
      return;
    }
    setLoading(true); // Use a specific loading state for this action if needed
    try {
      // Simulate API call
      // const response = await fetch(`/api/ipd/admissions/${admissionId}/medication-administration`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     schedule_id: scheduleItem.id,
      //     prescription_item_id: scheduleItem.prescription_item_id,
      //     medication_name: scheduleItem.medication_name,
      //     administered_time: new Date().toISOString(),
      //     // administered_by_id: Get current user ID from session
      //     notes: "Administered as scheduled.",
      //   }),
      // });
      // if (!response.ok) {
      //   const errorData = await response.json().catch(() => ({}));
      //   throw new Error(errorData.error || "Failed to record administration");
      // }
      // const newRecord: AdministrationRecord = await response.json();

      // Mock response
      await new Promise((resolve) => setTimeout(resolve, 500));
      const newRecord: AdministrationRecord = {
        id: `admin_${Date.now()}`,
        schedule_id: scheduleItem.id,
        prescription_item_id: scheduleItem.prescription_item_id,
        medication_name: scheduleItem.medication_name,
        administered_at: new Date().toISOString(),
        administered_by: "Current Nurse", // Replace with actual user data
        notes: "Administered as scheduled.",
      };

      setAdministrationRecords((previousRecords) => [
        newRecord,
        ...previousRecords,
      ]);

      // Update schedule item status
      setMedicationSchedule((previousSchedule) =>
        previousSchedule.map((item) =>
          item.id === scheduleItem.id
            ? { ...item, status: "administered" }
            : item
        )
      );

      alert("Medication administered successfully!");
    } catch (error_) {
      const message =
        error_ instanceof Error ? error_.message : "An unknown error occurred.";
      console.error("Error administering medication:", error_);
      alert(`Failed to record medication administration: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const getDosageForScheduleItem = (prescriptionItemId: string): string => {
    for (const prescription of prescriptions) {
      const item = prescription.items.find(
        (pItem) => pItem.id === prescriptionItemId
      );
      if (item) {
        return item.dosage;
      }
    }
    return "N/A";
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    try {
      const options: Intl.DateTimeFormatOptions = {
        // year: "numeric",
        // month: "short",
        // day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      };
      return new Intl.DateTimeFormat(undefined, options).format(
        new Date(dateString)
      );
    } catch {
      return "Invalid Date";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading
        medication schedule...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4" role="alert">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mt-6">
      <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
        <h2 className="text-lg font-semibold text-gray-800">
          Medication Administration Record (MAR)
        </h2>
      </div>
      <div className="p-6 space-y-8">
        {/* Medication Schedule */}
        <div>
          <h3 className="text-md font-medium text-gray-700 mb-3">
            Scheduled Medications
          </h3>
          {medicationSchedule.length === 0 ? (
            <p className="text-sm text-gray-500">
              No medications scheduled for this patient.
            </p>
          ) : (
            <div className="overflow-x-auto border rounded-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Medication
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dosage
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Condition
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {medicationSchedule.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.scheduled_time}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {item.medication_name}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {getDosageForScheduleItem(item.prescription_item_id)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {item.condition || "-"}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            item.status === "administered"
                              ? "bg-green-100 text-green-800"
                              : item.status === "skipped" ||
                                  item.status === "held"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {item.status.charAt(0).toUpperCase() +
                            item.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        {item.status === "pending" && (
                          <button
                            onClick={() => handleAdministerMedication(item)}
                            disabled={loading} // Consider a more specific loading state
                            className="px-3 py-1 bg-blue-500 text-white rounded-md text-xs hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loading ? (
                              <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                            ) : undefined}
                            Administer
                          </button>
                        )}
                        {/* Add buttons for Skip, Hold, etc. with appropriate logic */}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Administration History */}
        <div>
          <h3 className="text-md font-medium text-gray-700 mb-3">
            Administration History
          </h3>
          {administrationRecords.length === 0 ? (
            <p className="text-sm text-gray-500">
              No administration records found.
            </p>
          ) : (
            <div className="overflow-x-auto border rounded-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Medication
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Administered By
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {administrationRecords.map((record) => (
                    <tr key={record.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(record.administered_at)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {record.medication_name}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {record.administered_by}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {record.notes || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IPDPharmacyIntegration;
