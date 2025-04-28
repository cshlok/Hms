// src/app/dashboard/page.tsx
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Users,
    CalendarCheck,
    DollarSign,
    AlertTriangle,
} from "lucide-react";

export default function DashboardPage() {
  // Mock data - replace with actual data fetched from APIs
  const stats = [
    { title: "Today's Appointments", value: "15", icon: CalendarCheck, color: "text-blue-500" },
    { title: "Total Patients", value: "1,260", icon: Users, color: "text-green-500" },
    { title: "Revenue Today", value: "₹7,500", icon: DollarSign, color: "text-yellow-500" },
    { title: "Stock Alerts", value: "3", icon: AlertTriangle, color: "text-red-500" },
  ];

  const recentAppointments = [
    { name: "John Fallbart", time: "34 min.", status: "Waiting" },
    { name: "John Stegar", time: "22 min.", status: "In Progress" },
    { name: "Mask Pascaan", time: "1 hr ago", status: "Completed" },
    { name: "Alexander Jancican", time: "1 Apr", status: "Scheduled" },
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className={cn("h-4 w-4 text-muted-foreground", stat.color)} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                {/* Optional: Add percentage change or description */}
                {/* <p className="text-xs text-muted-foreground">+20.1% from last month</p> */}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Appointments / Other Widgets */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
           <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Recent Appointments</CardTitle>
              </CardHeader>
              <CardContent>
                 {/* Placeholder for appointments list/table */}
                 <ul className="space-y-4">
                    {recentAppointments.map((appt, index) => (
                        <li key={index} className="flex items-center justify-between">
                            <span>{appt.name}</span>
                            <span className="text-sm text-muted-foreground">{appt.time}</span>
                            {/* Add status indicator if needed */}
                        </li>
                    ))}
                 </ul>
              </CardContent>
            </Card>
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Other Widget</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Placeholder for another widget like revenue chart or notifications */}
                <p className="text-muted-foreground">Placeholder content for another dashboard widget.</p>
              </CardContent>
            </Card>
        </div>

      </div>
    </DashboardLayout>
  );
}

// Helper function (already exists in utils usually)
function cn(...inputs: any[]) {
    // Simplified version for example
    return inputs.filter(Boolean).join(" ");
}

