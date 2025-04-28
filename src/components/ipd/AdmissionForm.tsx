'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Label, Textarea, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';

const AdmissionForm = () => {
  const [formData, setFormData] = useState({
    patient_id: '',
    admission_date: new Date().toISOString().split('T')[0],
    admission_type: 'planned',
    primary_doctor_id: '',
    bed_id: '',
    diagnosis: '',
    estimated_stay: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Mock data for dropdowns - in a real app, these would be fetched from the API
  const patients = [
    { id: 1, name: 'Rahul Sharma' },
    { id: 2, name: 'Priya Patel' },
    { id: 3, name: 'Amit Singh' }
  ];
  
  const doctors = [
    { id: 2, name: 'Dr. John Smith' }
  ];
  
  const beds = [
    { id: 1, number: '101-A', room: '101', ward: 'General Ward' },
    { id: 2, number: '101-B', room: '101', ward: 'General Ward' },
    { id: 3, number: '102-A', room: '102', ward: 'General Ward' },
    { id: 4, number: '201-A', room: '201', ward: 'Semi-Private' },
    { id: 5, number: '301-A', room: '301', ward: 'Private' }
  ];
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const response = await fetch('/api/ipd/admissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create admission');
      }
      
      setSuccess(true);
      // Reset form
      setFormData({
        patient_id: '',
        admission_date: new Date().toISOString().split('T')[0],
        admission_type: 'planned',
        primary_doctor_id: '',
        bed_id: '',
        diagnosis: '',
        estimated_stay: ''
      });
    } catch (err) {
      console.error('Error creating admission:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>New Patient Admission</CardTitle>
      </CardHeader>
      <CardContent>
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            Patient admitted successfully!
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="patient_id">Patient</Label>
              <select
                id="patient_id"
                name="patient_id"
                value={formData.patient_id}
                onChange={handleChange}
                className="w-full h-10 rounded-md border border-gray-300 px-3"
                required
              >
                <option value="">Select Patient</option>
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>{patient.name}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="admission_date">Admission Date</Label>
              <Input
                id="admission_date"
                name="admission_date"
                type="date"
                value={formData.admission_date}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="admission_type">Admission Type</Label>
              <select
                id="admission_type"
                name="admission_type"
                value={formData.admission_type}
                onChange={handleChange}
                className="w-full h-10 rounded-md border border-gray-300 px-3"
                required
              >
                <option value="planned">Planned</option>
                <option value="emergency">Emergency</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="primary_doctor_id">Primary Doctor</Label>
              <select
                id="primary_doctor_id"
                name="primary_doctor_id"
                value={formData.primary_doctor_id}
                onChange={handleChange}
                className="w-full h-10 rounded-md border border-gray-300 px-3"
                required
              >
                <option value="">Select Doctor</option>
                {doctors.map(doctor => (
                  <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bed_id">Bed</Label>
              <select
                id="bed_id"
                name="bed_id"
                value={formData.bed_id}
                onChange={handleChange}
                className="w-full h-10 rounded-md border border-gray-300 px-3"
                required
              >
                <option value="">Select Bed</option>
                {beds.map(bed => (
                  <option key={bed.id} value={bed.id}>
                    {bed.number} - {bed.room} ({bed.ward})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="estimated_stay">Estimated Stay (days)</Label>
              <Input
                id="estimated_stay"
                name="estimated_stay"
                type="number"
                min="1"
                value={formData.estimated_stay}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="diagnosis">Diagnosis</Label>
            <Textarea
              id="diagnosis"
              name="diagnosis"
              value={formData.diagnosis}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? 'Processing...' : 'Admit Patient'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AdmissionForm;
