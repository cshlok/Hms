'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { hasPermission } from '@/lib/session';

export default function Dashboard() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    appointments: 0,
    patients: 0,
    revenue: 0,
    occupancy: 0
  });
  
  useEffect(() => {
    // Fetch user info and stats
    const fetchUserInfo = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setUserName(data.user.username);
          setUserRole(data.user.roleName);
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    };
    
    const fetchDashboardStats = async () => {
      try {
        const response = await fetch('/api/dashboard/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserInfo();
    fetchDashboardStats();
  }, []);
  
  const handleModuleClick = (module: string) => {
    switch (module) {
      case 'appointments':
        router.push('/opd');
        break;
      case 'patients':
        router.push('/patients');
        break;
      case 'billing':
        router.push('/billing');
        break;
      case 'pharmacy':
        router.push('/pharmacy');
        break;
      case 'lab':
        router.push('/laboratory');
        break;
      case 'ipd':
        router.push('/ipd');
        break;
      case 'reports':
        router.push('/reports');
        break;
      case 'settings':
        router.push('/settings');
        break;
      default:
        break;
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <header className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <div className="mr-4">
            <Image 
              src="/logo.png" 
              alt="Shlokam Logo" 
              width={50} 
              height={50} 
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-teal-600">SHLOKAM HEALTHCARE</h1>
            <p className="text-gray-500">Hospital Management System</p>
          </div>
        </div>
        
        <div className="flex items-center">
          <div className="mr-4 text-right">
            <p className="font-medium">{userName}</p>
            <p className="text-sm text-gray-500">{userRole}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => router.push('/profile')}>
            <Image 
              src="/user-avatar.png" 
              alt="User Avatar" 
              width={40} 
              height={40} 
              className="rounded-full"
            />
          </Button>
        </div>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.appointments}</div>
            <p className="text-xs text-gray-500">Today</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.patients}</div>
            <p className="text-xs text-gray-500">Active</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.revenue.toLocaleString()}</div>
            <p className="text-xs text-gray-500">This month</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Bed Occupancy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.occupancy}%</div>
            <p className="text-xs text-gray-500">Current</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleModuleClick('appointments')}
        >
          <CardContent className="p-6 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-medium text-center">Appointments</h3>
          </CardContent>
        </Card>
        
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleModuleClick('patients')}
        >
          <CardContent className="p-6 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="font-medium text-center">Patients</h3>
          </CardContent>
        </Card>
        
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleModuleClick('billing')}
        >
          <CardContent className="p-6 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="font-medium text-center">Billing</h3>
          </CardContent>
        </Card>
        
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleModuleClick('pharmacy')}
        >
          <CardContent className="p-6 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="font-medium text-center">Pharmacy</h3>
          </CardContent>
        </Card>
        
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleModuleClick('lab')}
        >
          <CardContent className="p-6 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h3 className="font-medium text-center">Laboratory</h3>
          </CardContent>
        </Card>
        
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleModuleClick('ipd')}
        >
          <CardContent className="p-6 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 4v12l-4-2-4 2V4M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-medium text-center">IPD</h3>
          </CardContent>
        </Card>
        
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleModuleClick('reports')}
        >
          <CardContent className="p-6 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="font-medium text-center">Reports</h3>
          </CardContent>
        </Card>
        
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleModuleClick('settings')}
        >
          <CardContent className="p-6 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="font-medium text-center">Settings</h3>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
