"use client";

import React, { useState, /* useEffect, */ useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import OTTheatreList from "@/components/ot/OTTheatreList";
import OTBookingList from "@/components/ot/OTBookingList";
import OTSurgeryTypeList from "@/components/ot/OTSurgeryTypeList";
import OTChecklistTemplateList from "@/components/ot/OTChecklistTemplateList";
import OTDashboardStats from "@/components/ot/OTDashboardStats";
import OTBookingModal from "@/components/ot/OTBookingModal";
import OTTheatreModal from "@/components/ot/OTTheatreModal";
import OTSurgeryTypeModal from "@/components/ot/OTSurgeryTypeModal";
import OTChecklistTemplateModal from "@/components/ot/OTChecklistTemplateModal";

export default function OTDashboardPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  // State to trigger list refreshes after modal saves
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSave = useCallback(async (data: unknown) => {
    // In a real app, this might involve re-fetching data or updating state
    console.log("Saved data, triggering refresh:", data);
    setRefreshKey(prev => prev + 1); // Increment key to trigger re-render/re-fetch in lists
  }, []);

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Operation Theatre Management</h1>
      </div>

      <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-5 mb-8">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="theatres">Theatres</TabsTrigger>
          <TabsTrigger value="surgery-types">Surgery Types</TabsTrigger>
          <TabsTrigger value="checklists">Checklists</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          {/* Pass refreshKey if stats need refreshing */}
          <OTDashboardStats key={`stats-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="bookings" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">OT Bookings</h2>
            <OTBookingModal 
              trigger={
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Booking
                </Button>
              }
              onSave={handleSave}
            />
          </div>
          {/* Pass refreshKey to OTBookingList to trigger re-fetch */}
          <OTBookingList key={`bookings-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="theatres" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Operation Theatres</h2>
            <OTTheatreModal 
              trigger={
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Theatre
                </Button>
              }
              onSave={handleSave}
            />
          </div>
          {/* Pass refreshKey to OTTheatreList */}
          <OTTheatreList key={`theatres-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="surgery-types" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Surgery Types</h2>
            <OTSurgeryTypeModal 
              trigger={
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Surgery Type
                </Button>
              }
              onSave={handleSave}
            />
          </div>
          {/* Pass refreshKey to OTSurgeryTypeList */}
          <OTSurgeryTypeList key={`surgery-types-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="checklists" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Checklist Templates</h2>
            <OTChecklistTemplateModal 
              trigger={
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Template
                </Button>
              }
              onSave={handleSave}
            />
          </div>
          {/* Pass refreshKey to OTChecklistTemplateList */}
          <OTChecklistTemplateList key={`checklists-${refreshKey}`} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
