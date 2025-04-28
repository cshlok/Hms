'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Textarea, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Input, Badge } from '@/components/ui';

const NursingNotes = ({ admissionId }) => {
  const [nursingNotes, setNursingNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    vital_signs: JSON.stringify({
      temperature: '',
      pulse: '',
      respiratory_rate: '',
      blood_pressure: '',
      oxygen_saturation: '',
      pain_level: ''
    }, null, 2),
    intake_output: JSON.stringify({
      oral_intake: '',
      iv_fluids: '',
      urine_output: '',
      other_output: ''
    }, null, 2),
    medication_given: '',
    procedures: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [patientInfo, setPatientInfo] = useState(null);

  // Fetch nursing notes for the admission
  useEffect(() => {
    const fetchNursingNotes = async () => {
      if (!admissionId) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/ipd/admissions/${admissionId}/nursing-notes`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch nursing notes');
        }
        
        const data = await response.json();
        setNursingNotes(data.nursing_notes || []);
        setPatientInfo(data.admission || null);
        setError(null);
      } catch (err) {
        console.error('Error fetching nursing notes:', err);
        setError('Failed to load nursing notes. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchNursingNotes();
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
      // Validate JSON fields
      try {
        JSON.parse(formData.vital_signs);
        JSON.parse(formData.intake_output);
      } catch (err) {
        throw new Error('Invalid JSON format in vital signs or intake/output fields');
      }
      
      const response = await fetch(`/api/ipd/admissions/${admissionId}/nursing-notes`, {
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
        throw new Error(errorData.error || 'Failed to create nursing note');
      }
      
      const newNote = await response.json();
      
      // Update the nursing notes list with the new note
      setNursingNotes(prev => [newNote, ...prev]);
      
      // Reset form
      setFormData({
        vital_signs: JSON.stringify({
          temperature: '',
          pulse: '',
          respiratory_rate: '',
          blood_pressure: '',
          oxygen_saturation: '',
          pain_level: ''
        }, null, 2),
        intake_output: JSON.stringify({
          oral_intake: '',
          iv_fluids: '',
          urine_output: '',
          other_output: ''
        }, null, 2),
        medication_given: '',
        procedures: '',
        notes: ''
      });
      
      setSubmitSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error creating nursing note:', err);
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

  // Parse JSON safely
  const safeParseJSON = (jsonString) => {
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      return null;
    }
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
          <CardTitle>Add Nursing Note</CardTitle>
        </CardHeader>
        <CardContent>
          {submitSuccess && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              Nursing note added successfully!
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
                <label className="font-medium">Vital Signs (JSON format)</label>
                <Textarea
                  name="vital_signs"
                  value={formData.vital_signs}
                  onChange={handleChange}
                  placeholder="Enter vital signs in JSON format"
                  className="font-mono text-sm min-h-[150px]"
                />
                <p className="text-xs text-gray-500">
                  Include temperature, pulse, respiratory rate, blood pressure, oxygen saturation, pain level
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="font-medium">Intake/Output (JSON format)</label>
                <Textarea
                  name="intake_output"
                  value={formData.intake_output}
                  onChange={handleChange}
                  placeholder="Enter intake/output in JSON format"
                  className="font-mono text-sm min-h-[150px]"
                />
                <p className="text-xs text-gray-500">
                  Include oral intake, IV fluids, urine output, other output
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="font-medium">Medications Given</label>
              <Textarea
                name="medication_given"
                value={formData.medication_given}
                onChange={handleChange}
                placeholder="Enter medications administered"
                className="min-h-[80px]"
              />
            </div>
            
            <div className="space-y-2">
              <label className="font-medium">Procedures Performed</label>
              <Textarea
                name="procedures"
                value={formData.procedures}
                onChange={handleChange}
                placeholder="Enter procedures performed"
                className="min-h-[80px]"
              />
            </div>
            
            <div className="space-y-2">
              <label className="font-medium">Notes</label>
              <Textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                required
                placeholder="Enter nursing observations and notes"
                className="min-h-[100px]"
              />
            </div>
            
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Nursing Note'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Nursing Notes History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 p-4 text-center">{error}</div>
          ) : nursingNotes.length === 0 ? (
            <div className="text-gray-500 p-4 text-center">No nursing notes found</div>
          ) : (
            <div className="space-y-6">
              {nursingNotes.map((note) => (
                <div key={note.id} className="border rounded-md p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">
                      Nurse: {note.nurse_first_name} {note.nurse_last_name}
                    </h3>
                    <span className="text-sm text-gray-500">
                      {formatDate(note.note_date)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {note.vital_signs && (
                      <div className="bg-gray-50 p-3 rounded">
                        <h4 className="font-medium mb-2">Vital Signs</h4>
                        <div className="text-sm">
                          {(() => {
                            const vitals = safeParseJSON(note.vital_signs);
                            if (!vitals) return <p>No data available</p>;
                            
                            return (
                              <Table>
                                <TableBody>
                                  {Object.entries(vitals).map(([key, value]) => (
                                    value && (
                                      <TableRow key={key}>
                                        <TableCell className="font-medium capitalize">{key.replace(/_/g, ' ')}</TableCell>
                                        <TableCell>{value}</TableCell>
                                      </TableRow>
                                    )
                                  ))}
                                </TableBody>
                              </Table>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                    
                    {note.intake_output && (
                      <div className="bg-gray-50 p-3 rounded">
                        <h4 className="font-medium mb-2">Intake/Output</h4>
                        <div className="text-sm">
                          {(() => {
                            const io = safeParseJSON(note.intake_output);
                            if (!io) return <p>No data available</p>;
                            
                            return (
                              <Table>
                                <TableBody>
                                  {Object.entries(io).map(([key, value]) => (
                                    value && (
                                      <TableRow key={key}>
                                        <TableCell className="font-medium capitalize">{key.replace(/_/g, ' ')}</TableCell>
                                        <TableCell>{value}</TableCell>
                                      </TableRow>
                                    )
                                  ))}
                                </TableBody>
                              </Table>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {note.medication_given && (
                    <div className="mb-3">
                      <h4 className="font-medium mb-1">Medications Given</h4>
                      <p className="text-sm whitespace-pre-wrap">{note.medication_given}</p>
                    </div>
                  )}
                  
                  {note.procedures && (
                    <div className="mb-3">
                      <h4 className="font-medium mb-1">Procedures</h4>
                      <p className="text-sm whitespace-pre-wrap">{note.procedures}</p>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="font-medium mb-1">Notes</h4>
                    <p className="text-sm whitespace-pre-wrap">{note.notes}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NursingNotes;
