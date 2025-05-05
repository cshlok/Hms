"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Activity, AlertTriangle } from "lucide-react";

export default function OTDashboardStats() {
  const [stats, setStats] = useState({
    todayBookings: 0,
    upcomingBookings: 0,
    availableTheatres: 0,
    inProgressSurgeries: 0,
    pendingChecklists: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);

        // In a real implementation, these would be actual API calls
        // For now, we'll simulate with mock data

        // Fetch today's bookings count
        // const todayBookingsRes = await fetch('/api/ot/bookings?startDate=today&endDate=today');
        // const todayBookingsData = await todayBookingsRes.json();

        // Fetch upcoming bookings (next 7 days)
        // const upcomingBookingsRes = await fetch('/api/ot/bookings?startDate=tomorrow&endDate=7days');
        // const upcomingBookingsData = await upcomingBookingsRes.json();

        // Fetch available theatres
        // const theatresRes = await fetch('/api/ot/theatres?status=available');
        // const theatresData = await theatresRes.json();

        // Fetch in-progress surgeries
        // const inProgressRes = await fetch('/api/ot/bookings?status=in_progress');
        // const inProgressData = await inProgressRes.json();

        // Fetch pending checklists
        // const checklistsRes = await fetch('/api/ot/checklist-responses?status=pending');
        // const checklistsData = await checklistsRes.json();

        // Mock data for demonstration
        setStats({
          todayBookings: 5,
          upcomingBookings: 12,
          availableTheatres: 3,
          inProgressSurgeries: 2,
          pendingChecklists: 4,
        });

        setLoading(false);
      } catch (error) { // FIX: Added error parameter to catch block
        console.error("Error fetching OT dashboard stats:", error);
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">
        Operation Theatre Dashboard
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Today&apos;s Surgeries
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "Loading..." : stats.todayBookings}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.inProgressSurgeries} currently in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Upcoming Bookings
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "Loading..." : stats.upcomingBookings}
            </div>
            <p className="text-xs text-muted-foreground">Next 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Available Theatres
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "Loading..." : stats.availableTheatres}
            </div>
            <p className="text-xs text-muted-foreground">
              Out of 5 total theatres
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Checklists
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "Loading..." : stats.pendingChecklists}
            </div>
            <p className="text-xs text-muted-foreground">
              Requiring completion
            </p>
          </CardContent>
        </Card>
      </div>

      <h3 className="text-xl font-semibold mt-8 mb-4">Today&apos;s Schedule</h3>
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <div className="grid grid-cols-5 p-4 text-sm font-medium">
              <div>Time</div>
              <div>Patient</div>
              <div>Surgery</div>
              <div>Theatre</div>
              <div>Status</div>
            </div>

            {loading ? (
              <div className="p-4 text-center">Loading schedule...</div>
            ) : (
              <>
                <div className="grid grid-cols-5 p-4 text-sm items-center border-t">
                  <div>08:00 - 10:30</div>
                  <div>John Smith</div>
                  <div>Appendectomy</div>
                  <div>OT-1</div>
                  <div>
                    <Badge className="bg-green-500">Completed</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-5 p-4 text-sm items-center border-t">
                  <div>09:30 - 12:00</div>
                  <div>Sarah Johnson</div>
                  <div>Cholecystectomy</div>
                  <div>OT-2</div>
                  <div>
                    <Badge className="bg-blue-500">In Progress</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-5 p-4 text-sm items-center border-t">
                  <div>11:00 - 13:30</div>
                  <div>Michael Brown</div>
                  <div>Hernia Repair</div>
                  <div>OT-3</div>
                  <div>
                    <Badge className="bg-blue-500">In Progress</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-5 p-4 text-sm items-center border-t">
                  <div>14:00 - 16:00</div>
                  <div>Emily Davis</div>
                  <div>Thyroidectomy</div>
                  <div>OT-1</div>
                  <div>
                    <Badge className="bg-yellow-500">Scheduled</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-5 p-4 text-sm items-center border-t">
                  <div>15:30 - 17:30</div>
                  <div>Robert Wilson</div>
                  <div>Knee Arthroscopy</div>
                  <div>OT-2</div>
                  <div>
                    <Badge className="bg-yellow-500">Scheduled</Badge>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
