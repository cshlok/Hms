
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Define interfaces for simulated data
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

interface PrescriptionItem {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
}

interface Prescription {
  id: string;
  date: string;
  status: 'pending' | 'dispensed' | 'cancelled';
  items: PrescriptionItem[];
}

interface SelectedMedication extends Medication {
  dosage: string;
  frequency: string;
  duration: string;
  quantity: string; // Keep as string for input, parse on submit
  instructions: string;
}

interface FormData {
  patient_id: string;
  doctor_id: string;
  notes: string;
  items: {
    medication_id: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
    instructions: string;
  }[];
}

// Component to integrate Pharmacy with OPD module
export default function OPDPharmacyIntegration() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [selectedMedications, setSelectedMedications] = useState<SelectedMedication[]>([]);
  const [formData, setFormData] = useState<FormData>({
    patient_id: '',
    doctor_id: '',
    notes: '',
    items: []
  });

  useEffect(() => {
    // Fetch active patient from OPD context
    const fetchActivePatient = async () => {
      try {
        // In a real implementation, this would come from a context or API
        // For now, we'll simulate the data
        const patientData: Patient = {
          id: 'pat_12345',
          first_name: 'John',
          last_name: 'Smith',
          gender: 'Male',
          age: 45,
          phone: '555-1234'
        };
        setActivePatient(patientData);
        
        setFormData(prev => ({
          ...prev,
          patient_id: patientData.id,
          doctor_id: 'doc_67890' // Current logged in doctor (simulated)
        }));
      } catch (error) {
        console.error('Error fetching active patient:', error);
      }
    };

    // Fetch medications for prescribing
    const fetchMedications = async () => {
      try {
        // In a real implementation, this would be an API call
        // For now, we'll simulate the data
        const medicationData: Medication[] = [
          { id: 'med_001', generic_name: 'Paracetamol', brand_name: 'Calpol', strength: '500mg', dosage_form: 'Tablet' },
          { id: 'med_002', generic_name: 'Amoxicillin', brand_name: 'Amoxil', strength: '250mg', dosage_form: 'Capsule' },
          { id: 'med_003', generic_name: 'Cetirizine', brand_name: 'Zyrtec', strength: '10mg', dosage_form: 'Tablet' },
          { id: 'med_004', generic_name: 'Ibuprofen', brand_name: 'Brufen', strength: '400mg', dosage_form: 'Tablet' },
          { id: 'med_005', generic_name: 'Omeprazole', brand_name: 'Prilosec', strength: '20mg', dosage_form: 'Capsule' }
        ];
        setMedications(medicationData);
      } catch (error) {
        console.error('Error fetching medications:', error);
      }
    };

    // Fetch existing prescriptions for this patient
    const fetchPrescriptions = async () => {
      try {
        // In a real implementation, this would be an API call
        // For now, we'll simulate the data
        const prescriptionData: Prescription[] = [
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
        setPrescriptions(prescriptionData);
      } catch (error) {
        console.error('Error fetching prescriptions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivePatient();
    fetchMedications();
    fetchPrescriptions();
  }, []);

  const handleAddMedication = (medication: Medication) => {
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

  const handleRemoveMedication = (index: number) => {
    const updatedMeds = [...selectedMedications];
    updatedMeds.splice(index, 1);
    setSelectedMedications(updatedMeds);
  };

  const handleMedicationChange = (index: number, field: keyof SelectedMedication, value: string) => {
    const updatedMeds = [...selectedMedications];
    // Ensure the field exists before assigning
    if (field in updatedMeds[index]) {
        // Type assertion needed because field is a keyof SelectedMedication
        (updatedMeds[index] as any)[field] = value;
        setSelectedMedications(updatedMeds);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (selectedMedications.length === 0) {
      alert('Please add at least one medication to the prescription');
      return;
    }
    
    setLoading(true);
    
    try {
      // Prepare prescription items, validate quantity
      const items = selectedMedications.map(med => {
        const quantity = parseInt(med.quantity);
        if (isNaN(quantity) || quantity <= 0) {
          throw new Error(`Invalid quantity for ${med.generic_name}`);
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
      
      const prescriptionData: FormData = {
        ...formData,
        items,
        // In a real app, get these from context/session
        patient_id: activePatient?.id || '', 
        doctor_id: 'doc_67890', // Simulated doctor ID
        source: 'opd',
        source_id: 'opd_visit_12345' // This would be the actual OPD visit ID
      };
      
      // In a real implementation, this would be an API call
      console.log('Submitting prescription:', prescriptionData);
      
      // Simulate successful submission
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay

      alert('Prescription created successfully!');
      
      // Add the new prescription to the list (client-side update)
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
      setFormData(prev => ({ ...prev, notes: '', items: [] }));
      
    } catch (error) {
      console.error('Error creating prescription:', error);
      alert(`Failed to create prescription: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
          
          {/* Selected Medications */}
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
                            onChange={(e) => handleMedicationChange(index, 'dosage', e.target.value)}
                            placeholder="e.g., 1 tablet"
                            className="w-full p-1 text-sm border border-gray-300 rounded-md"
                          />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <select
                            value={med.frequency}
                            onChange={(e) => handleMedicationChange(index, 'frequency', e.target.value)}
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
                            onChange={(e) => handleMedicationChange(index, 'duration', e.target.value)}
                            placeholder="e.g., 7 days"
                            className="w-full p-1 text-sm border border-gray-300 rounded-md"
                          />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <input
                            type="number"
                            value={med.quantity}
                            onChange={(e) => handleMedicationChange(index, 'quantity', e.target.value)}
                            placeholder="Qty"
                            min="1"
                            className="w-full p-1 text-sm border border-gray-300 rounded-md"
                          />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <input
                            type="text"
                            value={med.instructions}
                            onChange={(e) => handleMedicationChange(index, 'instructions', e.target.value)}
                            placeholder="Special instructions"
                            className="w-full p-1 text-sm border border-gray-300 rounded-md"
                          />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleRemoveMedication(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Notes */}
          <div className="mb-6">
            <label htmlFor="prescriptionNotes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              id="prescriptionNotes"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={2}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="Any additional notes for the pharmacist"
            ></textarea>
          </div>
          
          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || selectedMedications.length === 0}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Creating Prescription...' : 'Create Prescription'}
            </button>
          </div>
        </form>
        
        {/* Previous Prescriptions */}
        {prescriptions.length > 0 && (
          <div className="mt-8">
            <h3 className="text-md font-medium text-gray-700 mb-2">Previous Prescriptions</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medications</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {prescriptions.map((prescription) => (
                    <tr key={prescription.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{prescription.date}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {/* Fixed JSX syntax for status badge */}
                        <span className={`px-2 py-1 text-xs rounded-full ${ 
                          prescription.status === 'dispensed' ? 'bg-green-100 text-green-800' : 
                          prescription.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800' 
                        }`}>
                          {prescription.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {prescription.items.map((item, idx) => (
                          <div key={idx}>{item.medication} ({item.dosage}, {item.frequency}, {item.duration})</div>
                        ))}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                        {/* Add actions like view details or repeat prescription if needed */}
                        <button className="text-blue-600 hover:text-blue-900">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div> {/* Closing tag for p-6 div */}
    </div> /* Closing tag for main component div */
  );
}

