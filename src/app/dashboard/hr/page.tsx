'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  ClipboardCheck, 
  DollarSign, 
  Boxes, 
  Stethoscope,
  BarChart
} from 'lucide-react';

export default function HRDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Human Resources & Asset Management</h1>
        <p className="text-muted-foreground">
          Manage staff, attendance, payroll, assets, and biomedical equipment
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="biomedical">Biomedical</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Link href="/dashboard/hr/staff">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Staff Management</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">124</div>
                  <p className="text-xs text-muted-foreground">Active employees</p>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/dashboard/hr/attendance">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Attendance</CardTitle>
                  <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">98%</div>
                  <p className="text-xs text-muted-foreground">Current attendance rate</p>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/dashboard/hr/payroll">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Payroll</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">May 30</div>
                  <p className="text-xs text-muted-foreground">Next payroll date</p>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/dashboard/hr/assets">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Assets</CardTitle>
                  <Boxes className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1,284</div>
                  <p className="text-xs text-muted-foreground">Total assets tracked</p>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/dashboard/hr/biomedical">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Biomedical Equipment</CardTitle>
                  <Stethoscope className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">328</div>
                  <p className="text-xs text-muted-foreground">Medical devices</p>
                </CardContent>
              </Card>
            </Link>
            
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Analytics</CardTitle>
                <BarChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Reports</div>
                <p className="text-xs text-muted-foreground">HR & Asset analytics</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activities</CardTitle>
                <CardDescription>Latest HR and asset management activities</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Activity feed will appear here</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Events</CardTitle>
                <CardDescription>Scheduled maintenance and HR events</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Calendar events will appear here</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="staff" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Staff Management</CardTitle>
              <CardDescription>Manage employee profiles, departments, and roles</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Staff management content will be implemented here</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="attendance" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Management</CardTitle>
              <CardDescription>Track attendance, manage leaves, and view reports</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Attendance management content will be implemented here</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="payroll" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Payroll Processing</CardTitle>
              <CardDescription>Manage salary structures, process payroll, and generate payslips</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Payroll processing content will be implemented here</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="assets" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Asset Management</CardTitle>
              <CardDescription>Track assets, manage lifecycle, and schedule maintenance</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Asset management content will be implemented here</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="biomedical" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Biomedical Equipment</CardTitle>
              <CardDescription>Manage medical devices, track calibration, and ensure compliance</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Biomedical equipment management content will be implemented here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
