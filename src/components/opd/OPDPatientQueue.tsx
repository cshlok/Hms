'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { hasPermission } from '@/lib/session';

interface Patient {
  id: number;
  name: string;
  tokenNumber: number;
  checkInTime: string;
  waitingTime: number; // in minutes
  status: 'waiting' | 'in-progress' | 'completed' | 'cancelled';
  doctorName: string;
}

interface OPDPatientQueueProps {
  date: Date;
}

export default function OPDPatientQueue({ date }: OPDPatientQueueProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canCallPatient, setCanCallPatient] = useState(false);
  const [canMarkComplete, setCanMarkComplete] = useState(false);
  
  useEffect(() => {
    // Check permissions
    const checkPermissions = async () => {
      const callPatientPerm = await hasPermission('patient:call');
      const markCompletePerm = await hasPermission('consultation:complete');
      
      setCanCallPatient(callPatientPerm);
      setCanMarkComplete(markCompletePerm);
    };
    
    checkPermissions();
  }, []);
  
  useEffect(() => {
    const fetchPatientQueue = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const formattedDate = date.toISOString().split('T')[0];
        const response = await fetch(`/api/opd/queue?date=${formattedDate}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch patient queue');
        }
        
        const data = await response.json();
        setPatients(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching patient queue:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPatientQueue();
    
    // Set up polling to refresh the queue every minute
    const intervalId = setInterval(fetchPatientQueue, 60000);
    
    return () => clearInterval(intervalId);
  }, [date]);
  
  const handleCallPatient = async (patientId: number) => {
    try {
      const response = await fetch(`/api/opd/queue/${patientId}/call`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to call patient');
      }
      
      // Update the patient status in the local state
      setPatients(patients.map(patient => 
        patient.id === patientId 
          ? { ...patient, status: 'in-progress' } 
          : patient
      ));
      
    } catch (err) {
      console.error('Error calling patient:', err);
      // Show error notification
    }
  };
  
  const handleCompleteConsultation = async (patientId: number) => {
    try {
      const response = await fetch(`/api/opd/queue/${patientId}/complete`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to complete consultation');
      }
      
      // Update the patient status in the local state
      setPatients(patients.map(patient => 
        patient.id === patientId 
          ? { ...patient, status: 'completed' } 
          : patient
      ));
      
    } catch (err) {
      console.error('Error completing consultation:', err);
      // Show error notification
    }
  };
  
  const getStatusBadge = (status: Patient['status']) => {
    switch (status) {
      case 'waiting':
        return <Badge variant="outline">Waiting</Badge>;
      case 'in-progress':
        return <Badge variant="default">In Progress</Badge>;
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const formatWaitingTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return `${hours}h ${remainingMinutes}m`;
  };
  
  if (loading) {
    return <div className="flex justify-center p-4">Loading patient queue...</div>;
  }
  
  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }
  
  if (patients.length === 0) {
    return <div className="text-center p-4">No patients in the queue.</div>;
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Current Queue</h3>
        <div className="flex items-center">
          <div className="mr-2">
            <Image 
              src="/logo.png" 
              alt="Shlokam Logo" 
              width={40} 
              height={40} 
              className="rounded-full"
            />
          </div>
          <span className="text-sm font-medium">Shlokam Healthcare</span>
        </div>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Token</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Check-in Time</TableHead>
            <TableHead>Waiting</TableHead>
            <TableHead>Doctor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.map((patient) => (
            <TableRow key={patient.id} className={patient.status === 'waiting' && patient.waitingTime > 30 ? 'bg-red-50' : ''}>
              <TableCell className="font-medium">{patient.tokenNumber}</TableCell>
              <TableCell>{patient.name}</TableCell>
              <TableCell>{new Date(patient.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
              <TableCell>{formatWaitingTime(patient.waitingTime)}</TableCell>
              <TableCell>{patient.doctorName}</TableCell>
              <TableCell>{getStatusBadge(patient.status)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {canCallPatient && patient.status === 'waiting' && (
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => handleCallPatient(patient.id)}
                    >
                      Call
                    </Button>
                  )}
                  
                  {canMarkComplete && patient.status === 'in-progress' && (
                    <Button 
                      variant="success" 
                      size="sm"
                      onClick={() => handleCompleteConsultation(patient.id)}
                    >
                      Complete
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
