

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Component to integrate Pharmacy with IPD module (Medication Administration)
export default function IPDPharmacyIntegration({ admissionId, patientId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [prescriptions, setPrescriptions] = useState([]);
  const [medicationSchedule, setMedicationSchedule] = useState([]);
  const [administrationRecords, setAdministrationRecords] = useState([]);

  useEffect(() => {
    // Fetch active prescriptions for the patient
    const fetchPrescriptions = async () => {
      try {
        // API call to get prescriptions for the patient
        // const response = await fetch(`/api/pharmacy/prescriptions?patient_id=${patientId}&status=active`);
        // const data = await response.json();
        // setPrescriptions(data.prescriptions || []);
        
        // Mock data
        setPrescriptions([
          {
            id: 'presc_002',
            date: '2025-04-25',
            status: 'partially_dispensed',
            items: [
              { id: 'item_003', medication_id: 'med_002', medication_name: 'Amoxicillin 250mg', dosage: '1 capsule', frequency: 'BID', duration: '7 days', dispensed_quantity: 10, quantity: 14 },
              { id: 'item_004', medication_id: 'med_001', medication_name: 'Paracetamol 500mg', dosage: '1 tablet', frequency: 'PRN', duration: 'N/A', dispensed_quantity: 5, quantity: 10 }
            ]
          }
        ]);
      } catch (error) {
        console.error('Error fetching prescriptions:', error);
      }
    };

    // Fetch medication administration schedule for the admission
    const fetchSchedule = async () => {
      try {
        // API call to get medication schedule based on prescriptions
        // const response = await fetch(`/api/ipd/admissions/${admissionId}/medication-schedule`);
        // const data = await response.json();
        // setMedicationSchedule(data.schedule || []);
        
        // Mock data
        setMedicationSchedule([
          { id: 'sched_001', prescription_item_id: 'item_003', medication_name: 'Amoxicillin 250mg', scheduled_time: '08:00', status: 'pending' },
          { id: 'sched_002', prescription_item_id: 'item_003', medication_name: 'Amoxicillin 250mg', scheduled_time: '20:00', status: 'pending' },
          { id: 'sched_003', prescription_item_id: 'item_004', medication_name: 'Paracetamol 500mg', scheduled_time: '12:00', status: 'pending', condition: 'If fever > 101F' },
        ]);
      } catch (error) {
        console.error('Error fetching medication schedule:', error);
      }
    };

    // Fetch past administration records for the admission
    const fetchAdministrationRecords = async () => {
      try {
        // API call to get administration records
        // const response = await fetch(`/api/ipd/admissions/${admissionId}/medication-administration`);
        // const data = await response.json();
        // setAdministrationRecords(data.records || []);
        
        // Mock data
        setAdministrationRecords([
          { id: 'admin_001', schedule_id: 'sched_001', medication_name: 'Amoxicillin 250mg', administered_at: '2025-04-28 08:05', administered_by: 'Nurse Jane', notes: 'Patient took medication without issues.' },
        ]);
      } catch (error) {
        console.error('Error fetching administration records:', error);
      } finally {
        setLoading(false);
      }
    };

    if (admissionId && patientId) {
      fetchPrescriptions();
      fetchSchedule();
      fetchAdministrationRecords();
    } else {
      setLoading(false);
    }

  }, [admissionId, patientId]);

  const handleAdministerMedication = async (scheduleItem) => {
    setLoading(true);
    try {
      // In a real implementation, this would be an API call
      // POST /api/ipd/admissions/{admissionId}/medication-administration
      console.log('Administering medication:', scheduleItem);
      
      // Simulate successful administration
      const newRecord = {
        id: `admin_${Date.now()}`,
        schedule_id: scheduleItem.id,
        medication_name: scheduleItem.medication_name,
        administered_at: new Date().toISOString(),
        administered_by: 'Current Nurse', // Get logged-in nurse ID
        notes: 'Administered as scheduled.'
      };
      
      setAdministrationRecords([newRecord, ...administrationRecords]);
      
      // Update schedule item status
      setMedicationSchedule(prevSchedule => 
        prevSchedule.map(item => 
          item.id === scheduleItem.id ? { ...item, status: 'administered' } : item
        )
      );
      
      alert('Medication administered successfully!');
    } catch (error) {
      console.error('Error administering medication:', error);
      alert('Failed to record medication administration.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading medication schedule...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mt-6">
      <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
        <h2 className="text-lg font-semibold text-gray-800">Medication Administration Record (MAR)</h2>
      </div>
      
      <div className="p-6">
        {/* Medication Schedule */}
        <div className="mb-8">
          <h3 className="text-md font-medium text-gray-700 mb-2">Scheduled Medications</h3>
          {medicationSchedule.length === 0 ? (
            <p className="text-sm text-gray-500">No medications scheduled for this patient.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medication</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dosage</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Condition</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {medicationSchedule.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{item.scheduled_time}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.medication_name}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {/* Find dosage from prescription item */}
                        {prescriptions[0]?.items.find(pItem => pItem.id === item.prescription_item_id)?.dosage || 'N/A'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.condition || '-'}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          item.status === 'administered' 
                            ? 'bg-green-100 text-green-800' 
                            : item.status === 'skipped'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        {item.status === 'pending' && (
                          <button
                            onClick={() => handleAdministerMedication(item)}
                            disabled={loading}
                            className="px-3 py-1 bg-blue-500 text-white rounded-md text-xs hover:bg-blue-600 disabled:opacity-50"
                          >
                            Administer
                          </button>
                        )}
                        {/* Add buttons for Skip, Hold, etc. */}
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
          <h3 className="text-md font-medium text-gray-700 mb-2">Administration History</h3>
          {administrationRecords.length === 0 ? (
            <p className="text-sm text-gray-500">No administration records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medication</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Administered By</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {administrationRecords.map((record) => (
                    <tr key={record.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {new Date(record.administered_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{record.medication_name}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{record.administered_by}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{record.notes}</td>
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
}
