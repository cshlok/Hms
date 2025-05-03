// src/components/er/ERDashboardStats.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  Clock,
  Users,
  AlertTriangle,
  BedDouble,
  Ambulance,
} from "lucide-react";

export default function ERDashboardStats() {
  // In a real implementation, this data would come from API calls
  const stats = {
    totalPatients: 24,
    waitingRoom: 8,
    avgWaitTime: "42 min",
    criticalAlerts: 3,
    occupiedBeds: "18/25",
    incomingAmbulances: 2,
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalPatients}</div>
          <p className="text-xs text-muted-foreground">
            {stats.waitingRoom} in waiting room
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Average Wait Time
          </CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.avgWaitTime}</div>
          <p className="text-xs text-muted-foreground">
            For ESI Level 3 patients
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.criticalAlerts}</div>
          <p className="text-xs text-muted-foreground">
            Requiring immediate attention
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Bed Occupancy</CardTitle>
          <BedDouble className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.occupiedBeds}</div>
          <p className="text-xs text-muted-foreground">72% occupancy rate</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Incoming Ambulances
          </CardTitle>
          <Ambulance className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.incomingAmbulances}</div>
          <p className="text-xs text-muted-foreground">ETA: 5-10 minutes</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Department Activity
          </CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">High</div>
          <p className="text-xs text-muted-foreground">
            Peak hours (14:00 - 20:00)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
