"use client";

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RadiologyOrderList from "@/components/radiology/RadiologyOrderList";
import RadiologyStudiesList from "@/components/radiology/RadiologyStudiesList";
import RadiologyReportsList from "@/components/radiology/RadiologyReportsList";
import RadiologySettings from "@/components/radiology/RadiologySettings";

export default function RadiologyPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Radiology Management</h1>
      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="studies">Studies</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="orders">
          <RadiologyOrderList />
        </TabsContent>
        <TabsContent value="studies">
          <RadiologyStudiesList />
        </TabsContent>
        <TabsContent value="reports">
          <RadiologyReportsList />
        </TabsContent>
        <TabsContent value="settings">
          <RadiologySettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

