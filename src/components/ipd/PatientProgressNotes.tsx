'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Textarea, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';

const PatientProgressNotes = ({ admissionId }) => {
  const [progressNotes, setProgressNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [patientInfo, setPatientInfo] = useState(null);

  // Fetch progress notes for the admission
  useEffect(() => {
    const fetchProgressNotes = async () => {
      if (!admissionId) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/ipd/admissions/${admissionId}/progress-notes`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch progress notes');
        }
        
        const data = await response.json();
        setProgressNotes(data.progress_notes || []);
        setPatientInfo(data.admission || null);
        setError(null);
      } catch (err) {
        console.error('Error fetching progress notes:', err);
        setError('Failed to load progress notes. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchProgressNotes();
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
      const response = await fetch(`/api/ipd/admissions/${admissionId}/progress-notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          note_date: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create progress note');
      }
      
      const newNote = await response.json();
      
      // Update the progress notes list with the new note
      setProgressNotes(prev => [newNote, ...prev]);
      
      // Reset form
      setFormData({
        subjective: '',
        objective: '',
        assessment: '',
        plan: ''
      });
      
      setSubmitSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error creating progress note:', err);
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
          <CardTitle>Add Progress Note</CardTitle>
        </CardHeader>
        <CardContent>
          {submitSuccess && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              Progress note added successfully!
            </div>
          )}
          
          {submitError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {submitError}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="font-medium">Subjective (Patient's symptoms and complaints)</label>
              <Textarea
                name="subjective"
                value={formData.subjective}
                onChange={handleChange}
                required
                placeholder="Enter patient's reported symptoms and complaints"
                className="min-h-[100px]"
              />
            </div>
            
            <div className="space-y-2">
              <label className="font-medium">Objective (Examination findings)</label>
              <Textarea
                name="objective"
                value={formData.objective}
                onChange={handleChange}
                required
                placeholder="Enter examination findings and observations"
                className="min-h-[100px]"
              />
            </div>
            
            <div className="space-y-2">
              <label className="font-medium">Assessment (Diagnosis and assessment)</label>
              <Textarea
                name="assessment"
                value={formData.assessment}
                onChange={handleChange}
                required
                placeholder="Enter diagnosis and assessment"
                className="min-h-[100px]"
              />
            </div>
            
            <div className="space-y-2">
              <label className="font-medium">Plan (Treatment plan)</label>
              <Textarea
                name="plan"
                value={formData.plan}
                onChange={handleChange}
                required
                placeholder="Enter treatment plan and recommendations"
                className="min-h-[100px]"
              />
            </div>
            
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Progress Note'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Progress Notes History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 p-4 text-center">{error}</div>
          ) : progressNotes.length === 0 ? (
            <div className="text-gray-500 p-4 text-center">No progress notes found</div>
          ) : (
            <div className="space-y-6">
              {progressNotes.map((note) => (
                <div key={note.id} className="border rounded-md p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">
                      Dr. {note.doctor_first_name} {note.doctor_last_name}
                    </h3>
                    <span className="text-sm text-gray-500">
                      {formatDate(note.note_date)}
                    </span>
                  </div>
                  
                  <Tabs defaultValue="subjective">
                    <TabsList className="mb-2">
                      <TabsTrigger value="subjective">Subjective</TabsTrigger>
                      <TabsTrigger value="objective">Objective</TabsTrigger>
                      <TabsTrigger value="assessment">Assessment</TabsTrigger>
                      <TabsTrigger value="plan">Plan</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="subjective" className="p-2 bg-gray-50 rounded">
                      <p className="whitespace-pre-wrap">{note.subjective}</p>
                    </TabsContent>
                    
                    <TabsContent value="objective" className="p-2 bg-gray-50 rounded">
                      <p className="whitespace-pre-wrap">{note.objective}</p>
                    </TabsContent>
                    
                    <TabsContent value="assessment" className="p-2 bg-gray-50 rounded">
                      <p className="whitespace-pre-wrap">{note.assessment}</p>
                    </TabsContent>
                    
                    <TabsContent value="plan" className="p-2 bg-gray-50 rounded">
                      <p className="whitespace-pre-wrap">{note.plan}</p>
                    </TabsContent>
                  </Tabs>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientProgressNotes;
