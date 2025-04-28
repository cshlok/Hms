

import React, { useState, useEffect } from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Button, Badge } from '@/components/ui';

const IPDPatientList = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/ipd/admissions?status=active');
        
        if (!response.ok) {
          throw new Error('Failed to fetch inpatient list');
        }
        
        const data = await response.json();
        setPatients(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching inpatients:', err);
        setError('Failed to load inpatient list. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
        </div>
      ) : error ? (
        <div className="text-red-500 p-4 text-center">{error}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient Name</TableHead>
              <TableHead>Admission No.</TableHead>
              <TableHead>Bed</TableHead>
              <TableHead>Ward</TableHead>
              <TableHead>Primary Doctor</TableHead>
              <TableHead>Admission Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">No active inpatients found</TableCell>
              </TableRow>
            ) : (
              patients.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell>{patient.patient_first_name} {patient.patient_last_name}</TableCell>
                  <TableCell>{patient.admission_number}</TableCell>
                  <TableCell>{patient.bed_number} ({patient.room_number})</TableCell>
                  <TableCell>{patient.ward}</TableCell>
                  <TableCell>Dr. {patient.doctor_first_name} {patient.doctor_last_name}</TableCell>
                  <TableCell>{new Date(patient.admission_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default IPDPatientList;
