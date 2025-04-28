

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Input, Label } from '@/components/ui';

const VitalSigns = ({ admissionId }) => {
  const [vitalSigns, setVitalSigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    temperature: '',
    pulse: '',
    respiratory_rate: '',
    blood_pressure: '',
    oxygen_saturation: '',
    pain_level: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [patientInfo, setPatientInfo] = useState(null);

  // Fetch vital signs for the admission
  useEffect(() => {
    const fetchVitalSigns = async () => {
      if (!admissionId) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/ipd/admissions/${admissionId}/vital-signs`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch vital signs');
        }
        
        const data = await response.json();
        setVitalSigns(data.vital_signs || []);
        setPatientInfo(data.admission || null);
        setError(null);
      } catch (err) {
        console.error('Error fetching vital signs:', err);
        setError('Failed to load vital signs. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchVitalSigns();
  }, [admissionId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    
    try {
      const response = await fetch(`/api/ipd/admissions/${admissionId}/vital-signs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          record_time: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to record vital signs');
      }
      
      const newRecord = await response.json();
      
      // Update the vital signs list with the new record
      setVitalSigns(prev => [newRecord, ...prev]);
      
      // Reset form
      setFormData({
        temperature: '',
        pulse: '',
        respiratory_rate: '',
        blood_pressure: '',
        oxygen_saturation: '',
        pain_level: '',
        notes: ''
      });
      
      setSubmitSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error recording vital signs:', err);
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
          <CardTitle>Record Vital Signs</CardTitle>
        </CardHeader>
        <CardContent>
          {submitSuccess && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              Vital signs recorded successfully!
            </div>
          )}
          
          {submitError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {submitError}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="temperature">Temperature (°C)</Label>
                <Input
                  id="temperature"
                  name="temperature"
                  type="number"
                  step="0.1"
                  value={formData.temperature}
                  onChange={handleChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="pulse">Pulse (bpm)</Label>
                <Input
                  id="pulse"
                  name="pulse"
                  type="number"
                  value={formData.pulse}
                  onChange={handleChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="respiratory_rate">Resp. Rate (bpm)</Label>
                <Input
                  id="respiratory_rate"
                  name="respiratory_rate"
                  type="number"
                  value={formData.respiratory_rate}
                  onChange={handleChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="blood_pressure">Blood Pressure (mmHg)</Label>
                <Input
                  id="blood_pressure"
                  name="blood_pressure"
                  type="text"
                  placeholder="e.g., 120/80"
                  value={formData.blood_pressure}
                  onChange={handleChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="oxygen_saturation">Oxygen Saturation (%)</Label>
                <Input
                  id="oxygen_saturation"
                  name="oxygen_saturation"
                  type="number"
                  step="0.1"
                  value={formData.oxygen_saturation}
                  onChange={handleChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="pain_level">Pain Level (0-10)</Label>
                <Input
                  id="pain_level"
                  name="pain_level"
                  type="number"
                  min="0"
                  max="10"
                  value={formData.pain_level}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                name="notes"
                type="text"
                value={formData.notes}
                onChange={handleChange}
              />
            </div>
            
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Record Vitals'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Vital Signs History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 p-4 text-center">{error}</div>
          ) : vitalSigns.length === 0 ? (
            <div className="text-gray-500 p-4 text-center">No vital signs recorded</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Temp (°C)</TableHead>
                  <TableHead>Pulse</TableHead>
                  <TableHead>Resp Rate</TableHead>
                  <TableHead>BP</TableHead>
                  <TableHead>SpO2 (%)</TableHead>
                  <TableHead>Pain</TableHead>
                  <TableHead>Recorded By</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vitalSigns.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{formatDate(record.record_time)}</TableCell>
                    <TableCell>{record.temperature}</TableCell>
                    <TableCell>{record.pulse}</TableCell>
                    <TableCell>{record.respiratory_rate}</TableCell>
                    <TableCell>{record.blood_pressure}</TableCell>
                    <TableCell>{record.oxygen_saturation}</TableCell>
                    <TableCell>{record.pain_level}</TableCell>
                    <TableCell>{record.recorded_by_first_name} {record.recorded_by_last_name}</TableCell>
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

export default VitalSigns;
