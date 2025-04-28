'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Input, Label, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Textarea } from '@/components/ui';

const MedicationAdministration = ({ admissionId }) => {
  const [medicationRecords, setMedicationRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [medications, setMedications] = useState([]);
  const [loadingMedications, setLoadingMedications] = useState(true);
  const [formData, setFormData] = useState({
    medication_id: '',
    dosage: '',
    route: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [patientInfo, setPatientInfo] = useState(null);

  // Fetch medication administration records for the admission
  useEffect(() => {
    const fetchMedicationRecords = async () => {
      if (!admissionId) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/ipd/admissions/${admissionId}/medication-administration`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch medication administration records');
        }
        
        const data = await response.json();
        setMedicationRecords(data.medication_administration || []);
        setPatientInfo(data.admission || null);
        setError(null);
      } catch (err) {
        console.error('Error fetching medication records:', err);
        setError('Failed to load medication records. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchMedicationRecords();
  }, [admissionId]);

  // Fetch available medications from pharmacy inventory
  useEffect(() => {
    const fetchMedications = async () => {
      try {
        setLoadingMedications(true);
        const response = await fetch('/api/pharmacy/inventory?in_stock=true');
        
        if (!response.ok) {
          throw new Error('Failed to fetch medications');
        }
        
        const data = await response.json();
        setMedications(data || []);
      } catch (err) {
        console.error('Error fetching medications:', err);
        // Just log the error but don't show it to the user
      } finally {
        setLoadingMedications(false);
      }
    };

    fetchMedications();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    
    try {
      // Validate required fields
      if (!formData.medication_id || !formData.dosage || !formData.route) {
        throw new Error('Please fill in all required fields');
      }
      
      const response = await fetch(`/api/ipd/admissions/${admissionId}/medication-administration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          administered_time: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to record medication administration');
      }
      
      const newRecord = await response.json();
      
      // Update the medication records list with the new record
      setMedicationRecords(prev => [newRecord, ...prev]);
      
      // Reset form
      setFormData({
        medication_id: '',
        dosage: '',
        route: '',
        notes: ''
      });
      
      setSubmitSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error recording medication administration:', err);
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Route options for medication administration
  const routeOptions = [
    { value: 'oral', label: 'Oral' },
    { value: 'iv', label: 'Intravenous (IV)' },
    { value: 'im', label: 'Intramuscular (IM)' },
    { value: 'sc', label: 'Subcutaneous' },
    { value: 'topical', label: 'Topical' },
    { value: 'rectal', label: 'Rectal' },
    { value: 'inhaled', label: 'Inhaled' },
    { value: 'sublingual', label: 'Sublingual' },
    { value: 'ng', label: 'Nasogastric (NG)' }
  ];

  return (
    <div className="space-y-6">
      {patientInfo && (
        <div className="bg-blue-50 p-4 rounded-md">
          <h3 className="font-semibold text-lg">
            {patientInfo.patient_first_name} {patientInfo.patient_last_name}
          </h3>
          <p className="text-sm text-gray-600">
            Admission: {patientInfo.admission_number} | 
            Date: {formatDate(patientInfo.admission_date)} | 
            Diagnosis: {patientInfo.diagnosis}
          </p>
        </div>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Record Medication Administration</CardTitle>
        </CardHeader>
        <CardContent>
          {submitSuccess && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              Medication administration recorded successfully!
            </div>
          )}
          
          {submitError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {submitError}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="medication_id">Medication</Label>
                <select
                  id="medication_id"
                  name="medication_id"
                  value={formData.medication_id}
                  onChange={handleChange}
                  className="w-full h-10 rounded-md border border-gray-300 px-3"
                  required
                  disabled={loadingMedications}
                >
                  <option value="">Select Medication</option>
                  {medications.map(med => (
                    <option key={med.id} value={med.id}>
                      {med.item_name} ({med.dosage_form} - {med.strength})
                    </option>
                  ))}
                </select>
                {loadingMedications && (
                  <p className="text-xs text-gray-500">Loading medications...</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dosage">Dosage</Label>
                <Input
                  id="dosage"
                  name="dosage"
                  type="text"
                  placeholder="e.g., 500mg, 2 tablets, 10ml"
                  value={formData.dosage}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="route">Administration Route</Label>
                <select
                  id="route"
                  name="route"
                  value={formData.route}
                  onChange={handleChange}
                  className="w-full h-10 rounded-md border border-gray-300 px-3"
                  required
                >
                  <option value="">Select Route</option>
                  {routeOptions.map(route => (
                    <option key={route.value} value={route.value}>
                      {route.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  name="notes"
                  type="text"
                  placeholder="Any additional information"
                  value={formData.notes}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Recording...' : 'Record Administration'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Medication Administration History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 p-4 text-center">{error}</div>
          ) : medicationRecords.length === 0 ? (
            <div className="text-gray-500 p-4 text-center">No medication administration records found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Medication</TableHead>
                  <TableHead>Dosage</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Administered By</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {medicationRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{formatDate(record.administered_time)}</TableCell>
                    <TableCell>{record.medication_name}</TableCell>
                    <TableCell>{record.dosage}</TableCell>
                    <TableCell className="capitalize">{record.route}</TableCell>
                    <TableCell>{record.administered_by_first_name} {record.administered_by_last_name}</TableCell>
                    <TableCell>{record.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MedicationAdministration;
