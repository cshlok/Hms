// OPD Dashboard Page
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import OPDAppointmentList from '@/components/opd/OPDAppointmentList';
import OPDPatientQueue from '@/components/opd/OPDPatientQueue';
import OPDConsultationForm from '@/components/opd/OPDConsultationForm';
import OPDStatistics from '@/components/opd/OPDStatistics';
// import { hasPermission } from '@/lib/session';

export default function OPDDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('appointments');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [canCreateAppointment, setCanCreateAppointment] = useState(false);
  const [canViewStatistics, setCanViewStatistics] = useState(false);
  
  useEffect(() => {
    // Check permissions via API
    const checkPermissions = async () => {
      try {
        const [createRes, statsRes] = await Promise.all([
          fetch("/api/session/check-permission?permission=appointment:create"),
          fetch("/api/session/check-permission?permission=statistics:view")
        ]);

        const createData = await createRes.json();
        const statsData = await statsRes.json();

        setCanCreateAppointment(createData.hasPermission || false);
        setCanViewStatistics(statsData.hasPermission || false);
      } catch (error) {
        console.error("Error fetching permissions:", error);
        // Optionally set state to false or show an error message
        setCanCreateAppointment(false);
        setCanViewStatistics(false);
      }
    };
    
    checkPermissions();
  }, []);
  
  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };
  
  const handleNewAppointment = () => {
    router.push('/opd/appointments/new');
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">OPD Management</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left sidebar with calendar and quick actions */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateChange}
                className="rounded-md border"
              />
              
              {canCreateAppointment && (
                <Button 
                  className="w-full mt-4" 
                  onClick={handleNewAppointment}
                >
                  New Appointment
                </Button>
              )}
            </CardContent>
          </Card>
          
          {canViewStatistics && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Today's Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <OPDStatistics date={selectedDate} />
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Main content area */}
        <div className="md:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="appointments">Appointments</TabsTrigger>
              <TabsTrigger value="queue">Patient Queue</TabsTrigger>
              <TabsTrigger value="consultation">Consultation</TabsTrigger>
            </TabsList>
            
            <TabsContent value="appointments" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Appointments for {selectedDate.toLocaleDateString()}</CardTitle>
                </CardHeader>
                <CardContent>
                  <OPDAppointmentList date={selectedDate} />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="queue" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Patient Queue</CardTitle>
                </CardHeader>
                <CardContent>
                  <OPDPatientQueue date={selectedDate} />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="consultation" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Patient Consultation</CardTitle>
                </CardHeader>
                <CardContent>
                  <OPDConsultationForm />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
