'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import Link from 'next/link';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalPatients: 0,
    todayAppointments: 0,
    activeAdmissions: 0,
    availableBeds: 0,
    pendingBills: 0,
    lowStockItems: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        // In a real implementation, this would be a single API call
        // For now, we'll simulate the data
        
        // Fetch OPD stats
        const opdResponse = await fetch('/api/dashboard/opd-stats');
        const opdData = await opdResponse.json();
        
        // Fetch IPD stats
        const ipdResponse = await fetch('/api/dashboard/ipd-stats');
        const ipdData = await ipdResponse.json();
        
        // Fetch billing stats
        const billingResponse = await fetch('/api/dashboard/billing-stats');
        const billingData = await billingResponse.json();
        
        // Fetch pharmacy stats
        const pharmacyResponse = await fetch('/api/dashboard/pharmacy-stats');
        const pharmacyData = await pharmacyResponse.json();
        
        setStats({
          totalPatients: opdData.totalPatients || 0,
          todayAppointments: opdData.todayAppointments || 0,
          activeAdmissions: ipdData.activeAdmissions || 0,
          availableBeds: ipdData.availableBeds || 0,
          pendingBills: billingData.pendingBills || 0,
          lowStockItems: pharmacyData.lowStockItems || 0
        });
        
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError('Failed to load dashboard statistics. Please try again later.');
        
        // Set some dummy data for demonstration
        setStats({
          totalPatients: 1250,
          todayAppointments: 42,
          activeAdmissions: 18,
          availableBeds: 25,
          pendingBills: 37,
          lowStockItems: 12
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      
      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
        </div>
      ) : error ? (
        <div className="text-red-500 p-4 text-center">{error}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Patients</p>
                    <h3 className="text-2xl font-bold">{stats.totalPatients}</h3>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4">
                  <Link href="/patients">
                    <Button variant="outline" size="sm" className="w-full">View Patients</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Today's Appointments</p>
                    <h3 className="text-2xl font-bold">{stats.todayAppointments}</h3>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4">
                  <Link href="/opd">
                    <Button variant="outline" size="sm" className="w-full">View OPD</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Active Admissions</p>
                    <h3 className="text-2xl font-bold">{stats.activeAdmissions}</h3>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 4v12l-4-2-4 2V4M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4">
                  <Link href="/ipd">
                    <Button variant="outline" size="sm" className="w-full">View IPD</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Available Beds</p>
                    <h3 className="text-2xl font-bold">{stats.availableBeds}</h3>
                  </div>
                  <div className="p-3 bg-indigo-100 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4">
                  <Link href="/ipd">
                    <Button variant="outline" size="sm" className="w-full">Bed Management</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Pending Bills</p>
                    <h3 className="text-2xl font-bold">{stats.pendingBills}</h3>
                  </div>
                  <div className="p-3 bg-red-100 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4">
                  <Link href="/billing">
                    <Button variant="outline" size="sm" className="w-full">View Billing</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Low Stock Items</p>
                    <h3 className="text-2xl font-bold">{stats.lowStockItems}</h3>
                  </div>
                  <div className="p-3 bg-amber-100 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4">
                  <Link href="/pharmacy">
                    <Button variant="outline" size="sm" className="w-full">View Pharmacy</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Admissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                    <div>
                      <p className="font-medium">Rahul Sharma</p>
                      <p className="text-sm text-gray-500">Room 101 - General Ward</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">Admitted: Apr 25, 2025</p>
                      <p className="text-sm text-gray-500">Dr. John Smith</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                    <div>
                      <p className="font-medium">Priya Patel</p>
                      <p className="text-sm text-gray-500">Room 205 - Private</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">Admitted: Apr 26, 2025</p>
                      <p className="text-sm text-gray-500">Dr. Sarah Johnson</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                    <div>
                      <p className="font-medium">Amit Singh</p>
                      <p className="text-sm text-gray-500">Room 302 - ICU</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">Admitted: Apr 27, 2025</p>
                      <p className="text-sm text-gray-500">Dr. Michael Chen</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 text-center">
                  <Link href="/ipd">
                    <Button variant="link">View All Admissions</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Today's OPD Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                    <div>
                      <p className="font-medium">Neha Gupta</p>
                      <p className="text-sm text-gray-500">General Medicine</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">10:00 AM</p>
                      <p className="text-sm text-gray-500">Dr. John Smith</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                    <div>
                      <p className="font-medium">Rajesh Kumar</p>
                      <p className="text-sm text-gray-500">Orthopedics</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">11:30 AM</p>
                      <p className="text-sm text-gray-500">Dr. Robert Williams</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                    <div>
                      <p className="font-medium">Ananya Desai</p>
                      <p className="text-sm text-gray-500">Pediatrics</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">2:15 PM</p>
                      <p className="text-sm text-gray-500">Dr. Sarah Johnson</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 text-center">
                  <Link href="/opd">
                    <Button variant="link">View Full Schedule</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
