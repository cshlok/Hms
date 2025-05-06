"use client";
export const dynamic = 'force-dynamic';

import React, { useState } from "react"; // Added useState
import { useRouter } from "next/navigation"; // Added useRouter

// Removed unused Image import
// import Image from 'next/image';

// Define interfaces for component props and data structures
// Removed unused StatCardProperties interface

interface RecentPrescription {
  id: string;
  number: string;
  patient: string;
  date: string;
  status: "pending" | "dispensed" | "partially_dispensed" | string; // Allow other statuses
}

interface ExpiringMedication {
  id: string;
  medication: string;
  batch: string;
  expiry: string;
  stock: number;
}

// Main Pharmacy Dashboard Page
export default function PharmacyPage() {
  const router = useRouter(); // Initialize router
  const [activeTab, setActiveTab] = useState("dashboard"); // Initialize activeTab state
  const [loading, /*setLoading*/] = useState(false); // Initialize loading state - RE-ADDED

  // Placeholder for tab content rendering logic
  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <div>Pharmacy Dashboard Content</div>; // Placeholder content
      // Add cases for other tabs if needed
      default:
        return <div>Select a tab</div>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">
          Pharmacy Management
        </h1>
        <div className="flex space-x-2">
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
            onClick={() => router.push("/pharmacy/inventory/add")}
          >
            Add Inventory
          </button>
          <button
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md"
            onClick={() => router.push("/pharmacy/medications/add")}
          >
            Add Medication
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div className="flex border-b">
          {/* Simplified tab buttons - consider making this dynamic */}
          <button
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === "dashboard"
                ? "bg-blue-50 text-blue-600 border-b-2 border-blue-500"
                : "text-gray-600 hover:text-gray-800"
            }`}
            onClick={() => setActiveTab("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-800`}
            onClick={() => router.push("/pharmacy/inventory")}
          >
            Inventory
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-800`}
            onClick={() => router.push("/pharmacy/medications")}
          >
            Medications
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-800`}
            onClick={() => router.push("/pharmacy/prescriptions")}
          >
            Prescriptions
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-800`}
            onClick={() => router.push("/pharmacy/dispensing")}
          >
            Dispensing
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            renderTabContent()
          )}
        </div>
      </div>

      {/* Placeholder sections for Recent Prescriptions and Expiring Medications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
            <h2 className="text-lg font-semibold text-gray-800">
              Recent Prescriptions
            </h2>
          </div>
          <div className="p-6">
            <RecentPrescriptionsList />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
            <h2 className="text-lg font-semibold text-gray-800">
              Expiring Medications
            </h2>
          </div>
          <div className="p-6">
            <ExpiringMedicationsList />
          </div>
        </div>
      </div>
    </div>
  );
}

// Recent Prescriptions List Component
function RecentPrescriptionsList() {
  // Mock data for recent prescriptions - Typed
  const recentPrescriptions: RecentPrescription[] = [
    {
      id: "presc_1",
      number: "PRSC-20250428-1234",
      patient: "John Smith",
      date: "2025-04-28",
      status: "pending",
    },
    {
      id: "presc_2",
      number: "PRSC-20250427-5678",
      patient: "Jane Doe",
      date: "2025-04-27",
      status: "dispensed",
    },
    {
      id: "presc_3",
      number: "PRSC-20250426-9012",
      patient: "Robert Johnson",
      date: "2025-04-26",
      status: "partially_dispensed",
    },
  ];

  // Typed the status parameter
  const getStatusBadge = (
    status: RecentPrescription["status"]
  ): React.ReactElement => { // Changed JSX.Element to React.ReactElement
    switch (status) {
      case "pending": {
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
            Pending
          </span>
        );
      }
      case "dispensed": {
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
            Dispensed
          </span>
        );
      }
      case "partially_dispensed": {
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
            Partial
          </span>
        );
      }
      default: {
        // Handle unknown statuses gracefully
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
            {status}
          </span>
        );
      }
    }
  };

  // TODO: Replace mock data with actual data fetching
  if (recentPrescriptions.length === 0) {
    return <p className="text-gray-500">No recent prescriptions found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Prescription
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Patient
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {recentPrescriptions.map((prescription) => (
            <tr
              key={prescription.id}
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => {
                /* TODO: Navigate to prescription detail */
              }}
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                {prescription.number}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {prescription.patient}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {prescription.date}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getStatusBadge(prescription.status)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Expiring Medications List Component
function ExpiringMedicationsList() {
  // Mock data for expiring medications - Typed
  const expiringMedications: ExpiringMedication[] = [
    {
      id: "batch_1",
      medication: "Amoxicillin 500mg",
      batch: "AMX2023001",
      expiry: "2025-05-15",
      stock: 120,
    },
    {
      id: "batch_2",
      medication: "Paracetamol 500mg",
      batch: "PCM2023001",
      expiry: "2025-05-20",
      stock: 85,
    },
    {
      id: "batch_3",
      medication: "Cetirizine 10mg",
      batch: "CET2023001",
      expiry: "2025-05-30",
      stock: 42,
    },
  ];

  // TODO: Replace mock data with actual data fetching
  if (expiringMedications.length === 0) {
    return <p className="text-gray-500">No medications expiring soon.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Medication
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Batch
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Expiry
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Stock
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {expiringMedications.map((item) => (
            <tr
              key={item.id}
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => {
                /* TODO: Navigate to inventory detail */
              }}
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {item.medication}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {item.batch}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500 font-medium">
                {item.expiry}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {item.stock}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

