'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { hasPermission } from '@/lib/session';

// Define the form schema
const consultationFormSchema = z.object({
  patientId: z.string().min(1, { message: "Please select a patient" }),
  chiefComplaint: z.string().min(3, { message: "Chief complaint is required" }),
  presentIllness: z.string().optional(),
  vitalSigns: z.object({
    temperature: z.string().optional(),
    pulse: z.string().optional(),
    respiratoryRate: z.string().optional(),
    bloodPressure: z.string().optional(),
    oxygenSaturation: z.string().optional(),
    weight: z.string().optional(),
    height: z.string().optional(),
  }),
  diagnosis: z.string().min(3, { message: "Diagnosis is required" }),
  treatmentPlan: z.string().min(3, { message: "Treatment plan is required" }),
  medications: z.array(z.object({
    name: z.string().min(1, { message: "Medication name is required" }),
    dosage: z.string().min(1, { message: "Dosage is required" }),
    frequency: z.string().min(1, { message: "Frequency is required" }),
    duration: z.string().min(1, { message: "Duration is required" }),
    instructions: z.string().optional(),
  })).optional(),
  labTests: z.array(z.string()).optional(),
  followUpDate: z.string().optional(),
  notes: z.string().optional(),
});

type ConsultationFormValues = z.infer<typeof consultationFormSchema>;

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  tokenNumber: number;
}

export default function OPDConsultationForm() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);
  const [canPrescribe, setCanPrescribe] = useState(false);
  const [canOrderTests, setCanOrderTests] = useState(false);
  
  // Initialize form
  const form = useForm<ConsultationFormValues>({
    resolver: zodResolver(consultationFormSchema),
    defaultValues: {
      patientId: '',
      chiefComplaint: '',
      presentIllness: '',
      vitalSigns: {
        temperature: '',
        pulse: '',
        respiratoryRate: '',
        bloodPressure: '',
        oxygenSaturation: '',
        weight: '',
        height: '',
      },
      diagnosis: '',
      treatmentPlan: '',
      medications: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
      labTests: [],
      followUpDate: '',
      notes: '',
    },
  });
  
  useEffect(() => {
    // Check permissions
    const checkPermissions = async () => {
      const prescribePerm = await hasPermission('medication:prescribe');
      const orderTestsPerm = await hasPermission('lab:order');
      
      setCanPrescribe(prescribePerm);
      setCanOrderTests(orderTestsPerm);
    };
    
    checkPermissions();
    
    // Fetch patients in queue
    const fetchPatientsInQueue = async () => {
      try {
        const response = await fetch('/api/opd/queue?status=in-progress');
        
        if (!response.ok) {
          throw new Error('Failed to fetch patients in queue');
        }
        
        const data = await response.json();
        setPatients(data);
      } catch (error) {
        console.error('Error fetching patients:', error);
      }
    };
    
    fetchPatientsInQueue();
  }, []);
  
  // Handle patient selection
  const handlePatientChange = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    setSelectedPatient(patient || null);
    
    // Reset form when patient changes
    form.reset({
      ...form.getValues(),
      patientId,
    });
    
    // Fetch patient history if available
    if (patientId) {
      fetchPatientHistory(patientId);
    }
  };
  
  // Fetch patient history
  const fetchPatientHistory = async (patientId: string) => {
    try {
      const response = await fetch(`/api/patients/${patientId}/history`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch patient history');
      }
      
      // Process patient history data if needed
    } catch (error) {
      console.error('Error fetching patient history:', error);
    }
  };
  
  // Add medication field
  const addMedication = () => {
    const currentMedications = form.getValues().medications || [];
    form.setValue('medications', [
      ...currentMedications,
      { name: '', dosage: '', frequency: '', duration: '', instructions: '' }
    ]);
  };
  
  // Remove medication field
  const removeMedication = (index: number) => {
    const currentMedications = form.getValues().medications || [];
    form.setValue('medications', currentMedications.filter((_, i) => i !== index));
  };
  
  // Form submission handler
  const onSubmit = async (data: ConsultationFormValues) => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/opd/consultations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save consultation');
      }
      
      const result = await response.json();
      
      // Redirect to consultation details or reset form
      router.push(`/opd/consultations/${result.consultationId}`);
    } catch (error) {
      console.error('Error saving consultation:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <div className="mb-6">
        <Select onValueChange={handlePatientChange} value={form.getValues().patientId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a patient" />
          </SelectTrigger>
          <SelectContent>
            {patients.map((patient) => (
              <SelectItem key={patient.id} value={patient.id}>
                {patient.tokenNumber} - {patient.name} ({patient.age}/{patient.gender})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {selectedPatient && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Tabs defaultValue="consultation">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="consultation">Consultation</TabsTrigger>
                <TabsTrigger value="medications" disabled={!canPrescribe}>Medications</TabsTrigger>
                <TabsTrigger value="labTests" disabled={!canOrderTests}>Lab Tests</TabsTrigger>
                <TabsTrigger value="followUp">Follow Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="consultation">
                <Card>
                  <CardContent className="pt-6">
                    <div className="grid gap-4">
                      <FormField
                        control={form.control}
                        name="chiefComplaint"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Chief Complaint</FormLabel>
                            <FormControl>
                              <Textarea {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="presentIllness"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>History of Present Illness</FormLabel>
                            <FormControl>
                              <Textarea {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="vitalSigns.temperature"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Temperature (°C)</FormLabel>
                              <FormControl>
                                <Input {...field} type="text" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="vitalSigns.pulse"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Pulse (bpm)</FormLabel>
                              <FormControl>
                                <Input {...field} type="text" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="vitalSigns.respiratoryRate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Respiratory Rate</FormLabel>
                              <FormControl>
                                <Input {...field} type="text" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="vitalSigns.bloodPressure"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Blood Pressure</FormLabel>
                              <FormControl>
                                <Input {...field} type="text" placeholder="120/80" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="diagnosis"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Diagnosis</FormLabel>
                            <FormControl>
                              <Textarea {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="treatmentPlan"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Treatment Plan</FormLabel>
                            <FormControl>
                              <Textarea {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="medications">
                <Card>
                  <CardContent className="pt-6">
                    {form.getValues().medications?.map((_, index) => (
                      <div key={index} className="grid gap-4 mb-6 p-4 border rounded-md">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">Medication {index + 1}</h4>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => removeMedication(index)}
                          >
                            Remove
                          </Button>
                        </div>
                        
                        <FormField
                          control={form.control}
                          name={`medications.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Medication Name</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`medications.${index}.dosage`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Dosage</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name={`medications.${index}.frequency`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Frequency</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={form.control}
                          name={`medications.${index}.duration`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Duration</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
               
(Content truncated due to size limit. Use line ranges to read in chunks)