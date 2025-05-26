'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, MapPinIcon, ClockIcon, AlertCircleIcon } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function AmbulanceTripRequestForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ambulances, setAmbulances] = useState([]);
  const [locations, setLocations] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [formData, setFormData] = useState({
    tripType: 'NON_EMERGENCY',
    priority: 'MEDIUM',
    ambulanceId: '',
    patientId: '',
    pickupLocationId: '',
    dropLocationId: '',
    notes: '',
    medicalDetails: {}
  });
  const [medicalDetails, setMedicalDetails] = useState({
    chiefComplaint: '',
    vitalSigns: {
      bloodPressure: '',
      heartRate: '',
      respiratoryRate: '',
      temperature: '',
      oxygenSaturation: ''
    },
    requiresOxygen: false,
    requiresIV: false,
    requiresMonitoring: false,
    additionalNotes: ''
  });

  useEffect(() => {
    fetchAmbulances();
    fetchLocations();
    fetchPatients();
  }, []);

  const fetchAmbulances = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/support-services/ambulance?status=AVAILABLE&status=ON_DUTY&page=1&limit=50');
      const data = await response.json();
      
      if (data.success) {
        setAmbulances(data.data);
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to fetch ambulances",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error fetching ambulances:", error);
      toast({
        title: "Error",
        description: "Failed to fetch ambulances",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/locations?page=1&limit=100');
      const data = await response.json();
      
      if (data.success) {
        setLocations(data.data);
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to fetch locations",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
      toast({
        title: "Error",
        description: "Failed to fetch locations",
        variant: "destructive"
      });
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await fetch('/api/patients?page=1&limit=100');
      const data = await response.json();
      
      if (data.success) {
        setPatients(data.data);
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to fetch patients",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error fetching patients:", error);
      toast({
        title: "Error",
        description: "Failed to fetch patients",
        variant: "destructive"
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleMedicalDetailsChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setMedicalDetails({
        ...medicalDetails,
        [parent]: {
          ...medicalDetails[parent],
          [child]: value
        }
      });
    } else {
      setMedicalDetails({
        ...medicalDetails,
        [name]: type === 'checkbox' ? checked : value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.ambulanceId) {
      toast({
        title: "Error",
        description: "Please select an ambulance",
        variant: "destructive"
      });
      return;
    }
    
    if (!formData.pickupLocationId) {
      toast({
        title: "Error",
        description: "Please select a pickup location",
        variant: "destructive"
      });
      return;
    }
    
    if (!formData.dropLocationId) {
      toast({
        title: "Error",
        description: "Please select a destination location",
        variant: "destructive"
      });
      return;
    }
    
    if (!selectedTime) {
      toast({
        title: "Error",
        description: "Please select a time",
        variant: "destructive"
      });
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Combine date and time
      const [hours, minutes] = selectedTime.split(':');
      const scheduledTime = new Date(selectedDate);
      scheduledTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));
      
      const payload = {
        ...formData,
        scheduledTime,
        medicalDetails: formData.tripType === 'EMERGENCY' || formData.tripType === 'NON_EMERGENCY' ? medicalDetails : {}
      };
      
      const response = await fetch('/api/support-services/ambulance/trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Ambulance trip scheduled successfully",
        });
        router.push('/support-services/ambulance');
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to schedule ambulance trip",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error scheduling ambulance trip:", error);
      toast({
        title: "Error",
        description: "Failed to schedule ambulance trip",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFindAvailableAmbulances = async () => {
    if (!selectedDate || !selectedTime || !formData.tripType || !formData.pickupLocationId) {
      toast({
        title: "Error",
        description: "Please select date, time, trip type, and pickup location",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Combine date and time
      const [hours, minutes] = selectedTime.split(':');
      const scheduledTime = new Date(selectedDate);
      scheduledTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));
      
      const response = await fetch(`/api/support-services/ambulance/available?tripType=${formData.tripType}&scheduledTime=${scheduledTime.toISOString()}&pickupLocationId=${formData.pickupLocationId}`);
      const data = await response.json();
      
      if (data.success) {
        setAmbulances(data.data);
        
        if (data.data.length === 0) {
          toast({
            title: "No Ambulances Available",
            description: "No suitable ambulances are available for the selected time and trip type",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Success",
            description: `Found ${data.data.length} available ambulance(s)`,
          });
        }
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to find available ambulances",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error finding available ambulances:", error);
      toast({
        title: "Error",
        description: "Failed to find available ambulances",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Schedule Ambulance Trip</h1>
        <Button variant="outline" onClick={() => router.push('/support-services/ambulance')}>
          Back to Dashboard
        </Button>
      </div>
      
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Trip Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tripType">Trip Type</Label>
                <Select 
                  name="tripType" 
                  value={formData.tripType} 
                  onValueChange={(value) => setFormData({...formData, tripType: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Trip Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMERGENCY">Emergency</SelectItem>
                    <SelectItem value="NON_EMERGENCY">Non-Emergency</SelectItem>
                    <SelectItem value="TRANSFER">Transfer</SelectItem>
                    <SelectItem value="RETURN">Return</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select 
                  name="priority" 
                  value={formData.priority} 
                  onValueChange={(value) => setFormData({...formData, priority: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="pickupLocationId">Pickup Location</Label>
                <Select 
                  name="pickupLocationId" 
                  value={formData.pickupLocationId} 
                  onValueChange={(value) => setFormData({...formData, pickupLocationId: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Pickup Location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(location => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dropLocationId">Destination</Label>
                <Select 
                  name="dropLocationId" 
                  value={formData.dropLocationId} 
                  onValueChange={(value) => setFormData({...formData, dropLocationId: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(location => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="patientId">Patient (Optional)</Label>
                <Select 
                  name="patientId" 
                  value={formData.patientId} 
                  onValueChange={(value) => setFormData({...formData, patientId: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Patient" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Patient</SelectItem>
                    {patients.map(patient => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="md:col-span-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleFindAvailableAmbulances}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Finding Available Ambulances..." : "Find Available Ambulances"}
                </Button>
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="ambulanceId">Ambulance</Label>
                <Select 
                  name="ambulanceId" 
                  value={formData.ambulanceId} 
                  onValueChange={(value) => setFormData({...formData, ambulanceId: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Ambulance" />
                  </SelectTrigger>
                  <SelectContent>
                    {ambulances.map(ambulance => (
                      <SelectItem key={ambulance.id} value={ambulance.id}>
                        {ambulance.registrationNumber} - {ambulance.vehicleType.replace(/_/g, ' ')}
                        {ambulance.eta && ` (ETA: ${Math.round(ambulance.eta.minutes)} min)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Enter any additional notes"
                  className="min-h-[100px]"
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {(formData.tripType === 'EMERGENCY' || formData.tripType === 'NON_EMERGENCY') && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Medical Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="chiefComplaint">Chief Complaint</Label>
                  <Textarea
                    name="chiefComplaint"
                    value={medicalDetails.chiefComplaint}
                    onChange={handleMedicalDetailsChange}
                    placeholder="Enter chief complaint"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Vital Signs</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="vitalSigns.bloodPressure" className="text-sm">Blood Pressure</Label>
                      <Input
                        name="vitalSigns.bloodPressure"
                        value={medicalDetails.vitalSigns.bloodPressure}
                        onChange={handleMedicalDetailsChange}
                        placeholder="e.g., 120/80"
                      />
                    </div>
                    <div>
                      <Label htmlFor="vitalSigns.heartRate" className="text-sm">Heart Rate</Label>
                      <Input
                        name="vitalSigns.heartRate"
                        value={medicalDetails.vitalSigns.heartRate}
                        onChange={handleMedicalDetailsChange}
                        placeholder="e.g., 80 bpm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="vitalSigns.respiratoryRate" className="text-sm">Respiratory Rate</Label>
                      <Input
                        name="vitalSigns.respiratoryRate"
                        value={medicalDetails.vitalSigns.respiratoryRate}
                        onChange={handleMedicalDetailsChange}
                        placeholder="e.g., 16/min"
                      />
                    </div>
                    <div>
                      <Label htmlFor="vitalSigns.temperature" className="text-sm">Temperature</Label>
                      <Input
                        name="vitalSigns.temperature"
                        value={medicalDetails.vitalSigns.temperature}
                        onChange={handleMedicalDetailsChange}
                        placeholder="e.g., 98.6°F"
                      />
                    </div>
                    <div>
                      <Label htmlFor="vitalSigns.oxygenSaturation" className="text-sm">O2 Saturation</Label>
                      <Input
                        name="vitalSigns.oxygenSaturation"
                        value={medicalDetails.vitalSigns.oxygenSaturation}
                        onChange={handleMedicalDetailsChange}
                        placeholder="e.g., 98%"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Required Support</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="requiresOxygen"
                        name="requiresOxygen"
                        checked={medicalDetails.requiresOxygen}
                        onChange={handleMedicalDetailsChange}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="requiresOxygen" className="text-sm">Requires Oxygen</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="requiresIV"
                        name="requiresIV"
                        checked={medicalDetails.requiresIV}
                        onChange={handleMedicalDetailsChange}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="requiresIV" className="text-sm">Requires IV</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="requiresMonitoring"
                        name="requiresMonitoring"
                        checked={medicalDetails.requiresMonitoring}
                        onChange={handleMedicalDetailsChange}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="requiresMonitoring" className="text-sm">Requires Monitoring</Label>
                    </div>
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <Label htmlFor="additionalNotes">Additional Medical Notes</Label>
                  <Textarea
                    name="additionalNotes"
                    value={medicalDetails.additionalNotes}
                    onChange={handleMedicalDetailsChange}
                    placeholder="Enter any additional medical notes"
                    className="min-h-[100px]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        <div className="mt-6 flex justify-end space-x-2">
          <Button 
            variant="outline" 
            type="button" 
            onClick={() => router.push('/support-services/ambulance')}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={submitting}
          >
            {submitting ? "Scheduling..." : "Schedule Trip"}
          </Button>
        </div>
      </form>
    </div>
  );
}
