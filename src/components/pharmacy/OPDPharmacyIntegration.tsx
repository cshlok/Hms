
'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

// Define interfaces for data structures
interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  gender: string;
  age: number;
  phone: string;
}

interface Medication {
  id: string;
  generic_name: string;
  brand_name: string;
  strength: string;
  dosage_form: string;
}

interface PrescriptionItemInput {
  medication_id: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number | string; // Allow string for input, parse later
  instructions: string;
}

interface SelectedMedication extends Medication {
  dosage: string;
  frequency: string;
  duration: string;
  quantity: string; // Keep as string for input state
  instructions: string;
}

interface PrescriptionItemDisplay {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
}

interface Prescription {
  id: string;
  date: string;
  status: 'pending' | 'dispensed' | 'cancelled';
  items: PrescriptionItemDisplay[];
}

interface PrescriptionFormData {
  patient_id: string;
  doctor_id: string;
  notes: string;
  items: PrescriptionItemInput[];
}

// Component to integrate Pharmacy with OPD module
const OPDPharmacyIntegration: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [selectedMedications, setSelectedMedications] = useState<SelectedMedication[]>([]);
  const [formData, setFormData] = useState<Omit<PrescriptionFormData, 'items'>>({
    patient_id: '',
    doctor_id: '', // This should ideally come from auth context
    notes: '',
  });

  useEffect(() => {
    // Fetch active patient from OPD context
    const fetchActivePatient = async (): Promise<void> => {
      try {
        // Simulate fetching active patient
        const simulatedPatient: Patient = {
          id: 'pat_12345',
          first_name: 'John',
          last_name: 'Smith',
          gender: 'Male',
          age: 45,
          phone: '555-1234'
        };
        setActivePatient(simulatedPatient);
        
        setFormData(prev => ({
          ...prev,
          patient_id: simulatedPatient.id,
          doctor_id: 'doc_67890' // Simulate logged-in doctor ID
        }));
      } catch (error) {
        console.error('Error fetching active patient:', error);
        // Handle error appropriately (e.g., show message)
      }
    };

    // Fetch medications for prescribing
    const fetchMedications = async (): Promise<void> => {
      try {
        // Simulate fetching medications
        const simulatedMedications: Medication[] = [
          { id: 'med_001', generic_name: 'Paracetamol', brand_name: 'Calpol', strength: '500mg', dosage_form: 'Tablet' },
          { id: 'med_002', generic_name: 'Amoxicillin', brand_name: 'Amoxil', strength: '250mg', dosage_form: 'Capsule' },
          { id: 'med_003', generic_name: 'Cetirizine', brand_name: 'Zyrtec', strength: '10mg', dosage_form: 'Tablet' },
          { id: 'med_004', generic_name: 'Ibuprofen', brand_name: 'Brufen', strength: '400mg', dosage_form: 'Tablet' },
          { id: 'med_005', generic_name: 'Omeprazole', brand_name: 'Prilosec', strength: '20mg', dosage_form: 'Capsule' }
        ];
        setMedications(simulatedMedications);
      } catch (error) {
        console.error('Error fetching medications:', error);
        // Handle error appropriately
      }
    };

    // Fetch existing prescriptions for this patient
    const fetchPrescriptions = async (): Promise<void> => {
      // Guard clause if patient ID isn't set yet
      if (!formData.patient_id) {
        // setLoading(false); // Might need adjustment based on dependency flow
        // return;
      }
      try {
        // Simulate fetching prescriptions for the active patient
        // const response = await fetch(`/api/pharmacy/prescriptions?patientId=${formData.patient_id}`);
        // if (!response.ok) throw new Error('Failed to fetch prescriptions');
        // const data = await response.json();
        // setPrescriptions(data.prescriptions || []);
        
        const simulatedPrescriptions: Prescription[] = [
          { 
            id: 'presc_001', 
            date: '2025-04-20', 
            status: 'dispensed',
            items: [
              { medication: 'Paracetamol 500mg', dosage: '1 tablet', frequency: 'TID', duration: '5 days' },
              { medication: 'Cetirizine 10mg', dosage: '1 tablet', frequency: 'OD', duration: '7 days' }
            ]
          },
          { 
            id: 'presc_002', 
            date: '2025-04-25', 
            status: 'pending',
            items: [
              { medication: 'Amoxicillin 250mg', dosage: '1 capsule', frequency: 'BID', duration: '7 days' }
            ]
          }
        ];
        setPrescriptions(simulatedPrescriptions);
      } catch (error) {
        console.error('Error fetching prescriptions:', error);
        // Handle error appropriately
      } finally {
        setLoading(false);
      }
    };

    fetchActivePatient();
    fetchMedications();
    // Fetch prescriptions depends on activePatient being set first
    if (activePatient) {
        fetchPrescriptions();
    } else {
        // If activePatient is fetched async, fetchPrescriptions might need to be called in its .then() or based on state change
        setLoading(false); // Set loading false if no patient yet
    }

  // Dependency array needs careful consideration. Fetching prescriptions depends on activePatient.id
  }, [activePatient]); // Re-run if activePatient changes

  const handleAddMedication = (medication: Medication): void => {
    if (!selectedMedications.some(med => med.id === medication.id)) {
      const newMed: SelectedMedication = {
        ...medication,
        dosage: '',
        frequency: '',
        duration: '',
        quantity: '',
        instructions: ''
      };
      setSelectedMedications([...selectedMedications, newMed]);
    }
  };

  const handleRemoveMedication = (index: number): void => {
    const updatedMeds = [...selectedMedications];
    updatedMeds.splice(index, 1);
    setSelectedMedications(updatedMeds);
  };

  const handleMedicationChange = (index: number, field: keyof SelectedMedication, value: string): void => {
    const updatedMeds = [...selectedMedications];
    // Ensure the field exists on the object before assignment (though TS should catch this)
    if (field in updatedMeds[index]) {
      updatedMeds[index][field] = value;
    }
    setSelectedMedications(updatedMeds);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    if (selectedMedications.length === 0) {
      alert('Please add at least one medication to the prescription');
      return;
    }
    
    setLoading(true);
    
    try {
      // Prepare prescription items with proper types
      const items: PrescriptionItemInput[] = selectedMedications.map(med => {
        const quantity = parseInt(med.quantity);
        if (isNaN(quantity) || quantity <= 0) {
          throw new Error(`Invalid quantity for ${med.generic_name}. Please enter a positive number.`);
        }
        return {
          medication_id: med.id,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration,
          quantity: quantity,
          instructions: med.instructions
        };
      });
      
      const prescriptionData: PrescriptionFormData = {
        ...formData,
        items,
        // source: 'opd', // Add if API expects it
        // source_id: 'opd_visit_12345' // Add actual OPD visit ID if API expects it
      };
      
      console.log('Submitting prescription:', prescriptionData);
      
      // Simulate API call
      // const response = await fetch('/api/pharmacy/prescriptions', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(prescriptionData),
      // });
      // if (!response.ok) {
      //   const errorData = await response.json().catch(() => ({}));
      //   throw new Error(errorData.error || 'Failed to create prescription');
      // }
      
      // Simulate successful submission
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

      alert('Prescription created successfully!');
      
      // Add the new prescription to the local state for display
      const newPrescription: Prescription = {
        id: `presc_${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        items: selectedMedications.map(med => ({
          medication: `${med.generic_name} ${med.strength}`,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration
        }))
      };
      setPrescriptions([newPrescription, ...prescriptions]);
      
      // Reset form state
      setSelectedMedications([]);
      setFormData(prev => ({ ...prev, notes: '' }));
      
    } catch (error) {
      console.error('Error creating prescription:', error);
      const message = error instanceof Error ? error.message : 'An unknown error occurred.';
      alert(`Failed to create prescription: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !activePatient) {
    return <div className="flex justify-center items-center h-64">Loading patient data...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
        <h2 className="text-lg font-semibold text-gray-800">Prescribe Medications</h2>
      </div>
      
      {activePatient && (
        <div className="p-4 bg-gray-50 border-b">
          <div className="flex flex-wrap">
            <div className="w-full md:w-1/3 px-2 mb-2">
              <span className="text-sm font-medium text-gray-500">Patient:</span>
              <span className="ml-2 text-sm text-gray-900">{activePatient.first_name} {activePatient.last_name}</span>
            </div>
            <div className="w-full md:w-1/3 px-2 mb-2">
              <span className="text-sm font-medium text-gray-500">Age/Gender:</span>
              <span className="ml-2 text-sm text-gray-900">{activePatient.age} / {activePatient.gender}</span>
            </div>
            <div className="w-full md:w-1/3 px-2 mb-2">
              <span className="text-sm font-medium text-gray-500">Phone:</span>
              <span className="ml-2 text-sm text-gray-900">{activePatient.phone}</span>
            </div>
          </div>
        </div>
      )}
      
      <div className="p-6">
        <form onSubmit={handleSubmit}>
          {/* Medication Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Medications
            </label>
            <div className="flex flex-wrap gap-2">
              {medications.map(med => (
                <button
                  key={med.id}
                  type="button"
                  onClick={() => handleAddMedication(med)}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm hover:bg-blue-200"
                >
                  {med.generic_name} {med.strength}
                </button>
              ))}
            </div>
          </div>
          
          {/* Selected Medications Table */}
          {selectedMedications.length > 0 && (
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-700 mb-2">Prescription Details</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medication</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dosage</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Instructions</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedMedications.map((med, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {med.generic_name} {med.strength} {med.dosage_form}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <input
                            type="text"
                            value={med.dosage}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => handleMedicationChange(index, 'dosage', e.target.value)}
                            placeholder="e.g., 1 tablet"
                            className="w-full p-1 text-sm border border-gray-300 rounded-md"
                          />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <select
                            value={med.frequency}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => handleMedicationChange(index, 'frequency', e.target.value)}
                            className="w-full p-1 text-sm border border-gray-300 rounded-md"
                          >
                            <option value="">Select</option>
                            <option value="OD">Once daily (OD)</option>
                            <option value="BID">Twice daily (BID)</option>
                            <option value="TID">Three times daily (TID)</option>
                            <option value="QID">Four times daily (QID)</option>
                            <option value="QHS">At bedtime (QHS)</option>
                            <option value="PRN">As needed (PRN)</option>
                            <option value="STAT">Immediately (STAT)</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <input
                            type="text"
                            value={med.duration}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => handleMedicationChange(index, 'duration', e.target.value)}
                            placeholder="e.g., 7 days"
                            className="w-full p-1 text-sm border border-gray-300 rounded-md"
                          />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <input
                            type="number"
                            value={med.quantity}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => handleMedicationChange(index, 'quantity', e.target.value)}
                            placeholder="Qty"
  
(Content truncated due to size limit. Use line ranges to read in chunks)