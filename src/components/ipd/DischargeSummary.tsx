'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Textarea, Input, Label } from '@/components/ui';

const DischargeSummary = ({ admissionId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dischargeSummary, setDischargeSummary] = useState(null);
  const [formData, setFormData] = useState({
    discharge_date: new Date().toISOString().split('T')[0],
    discharge_diagnosis: '',
    treatment_summary: '',
    medications: '',
    follow_up: '',
    home_care_instructions: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [patientInfo, setPatientInfo] = useState(null);

  // Fetch discharge summary for the admission
  useEffect(() => {
    const fetchDischargeSummary = async () => {
      if (!admissionId) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/ipd/admissions/${admissionId}/discharge`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch discharge summary');
        }
        
        const data = await response.json();
        setDischargeSummary(data.discharge_summary || null);
        setPatientInfo(data.admission || null);
        setError(null);
      } catch (err) {
        console.error('Error fetching discharge summary:', err);
        setError('Failed to load discharge summary. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchDischargeSummary();
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
      // Validate required fields
      const requiredFields = ['discharge_diagnosis', 'treatment_summary', 'medications'];
      for (const field of requiredFields) {
        if (!formData[field]) {
          throw new Error(`${field.replace('_', ' ')} is required`);
        }
      }
      
      const response = await fetch(`/api/ipd/admissions/${admissionId}/discharge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create discharge summary');
      }
      
      const data = await response.json();
      
      // Update the discharge summary
      setDischargeSummary(data.discharge_summary);
      
      setSubmitSuccess(true);
    } catch (err) {
      console.error('Error creating discharge summary:', err);
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
      day: 'numeric'
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
      
      {dischargeSummary ? (
        <Card>
          <CardHeader>
            <CardTitle>Discharge Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Admission Date</p>
                  <p>{formatDate(patientInfo?.admission_date)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Discharge Date</p>
                  <p>{formatDate(dischargeSummary.discharge_date)}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Discharge Diagnosis</p>
                <p className="whitespace-pre-wrap">{dischargeSummary.discharge_diagnosis}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Treatment Summary</p>
                <p className="whitespace-pre-wrap">{dischargeSummary.treatment_summary}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Medications</p>
                <p className="whitespace-pre-wrap">{dischargeSummary.medications}</p>
              </div>
              
              {dischargeSummary.follow_up && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Follow-up Instructions</p>
                  <p className="whitespace-pre-wrap">{dischargeSummary.follow_up}</p>
                </div>
              )}
              
              {dischargeSummary.home_care_instructions && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Home Care Instructions</p>
                  <p className="whitespace-pre-wrap">{dischargeSummary.home_care_instructions}</p>
                </div>
              )}
              
              <div>
                <p className="text-sm font-medium text-gray-500">Discharged By</p>
                <p>Dr. {dischargeSummary.doctor_first_name} {dischargeSummary.doctor_last_name}</p>
              </div>
            </div>
            
            <div className="mt-6">
              <Button variant="outline">Print Discharge Summary</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Create Discharge Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
              </div>
            ) : error ? (
              <div className="text-red-500 p-4 text-center">{error}</div>
            ) : (
              <>
                {submitSuccess && (
                  <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                    Patient discharged successfully!
                  </div>
                )}
                
                {submitError && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {submitError}
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="discharge_date">Discharge Date</Label>
                    <Input
                      id="discharge_date"
                      name="discharge_date"
                      type="date"
                      value={formData.discharge_date}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="discharge_diagnosis">Discharge Diagnosis</Label>
                    <Textarea
                      id="discharge_diagnosis"
                      name="discharge_diagnosis"
                      value={formData.discharge_diagnosis}
                      onChange={handleChange}
                      required
                      placeholder="Enter final diagnosis at discharge"
                      className="min-h-[100px]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="treatment_summary">Treatment Summary</Label>
                    <Textarea
                      id="treatment_summary"
                      name="treatment_summary"
                      value={formData.treatment_summary}
                      onChange={handleChange}
                      required
                      placeholder="Summarize treatments, procedures, and interventions performed during hospitalization"
                      className="min-h-[100px]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="medications">Discharge Medications</Label>
                    <Textarea
                      id="medications"
                      name="medications"
                      value={formData.medications}
                      onChange={handleChange}
                      required
                      placeholder="List medications to be continued after discharge, including dosage and duration"
                      className="min-h-[100px]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="follow_up">Follow-up Instructions</Label>
                    <Textarea
                      id="follow_up"
                      name="follow_up"
                      value={formData.follow_up}
                      onChange={handleChange}
                      placeholder="Specify follow-up appointments, tests, or consultations needed"
                      className="min-h-[100px]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="home_care_instructions">Home Care Instructions</Label>
                    <Textarea
                      id="home_care_instructions"
                      name="home_care_instructions"
                      value={formData.home_care_instructions}
                      onChange={handleChange}
                      placeholder="Provide instructions for care at home, activity restrictions, diet, etc."
                      className="min-h-[100px]"
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <Button type="submit" disabled={submitting}>
                      {submitting ? 'Processing...' : 'Discharge Patient'}
                    </Button>
                  </div>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DischargeSummary;
