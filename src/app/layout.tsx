
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
import './globals.css'; // Ensure globals.css is imported

// Layout component for all authenticated pages
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [activeModule, setActiveModule] = useState('dashboard');
  
  useEffect(() => {
    // Fetch user info
    const fetchUserInfo = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setUserName(data.user.username);
          setUserRole(data.user.roleName);
        } else {
          // If not authenticated, redirect to login
          router.push('/login');
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
        router.push('/login');
      }
    };
    
    fetchUserInfo();
    
    // Determine active module from URL
    const path = window.location.pathname;
    const currentModule = path.split('/')[1] || 'dashboard'; // Get first part of path
    setActiveModule(currentModule);

  }, [router]);
  
  const handleModuleClick = (module: string) => {
    router.push(`/${module}`);
  };
  
  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      
      if (response.ok) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const sidebarModules = [
    { name: 'dashboard', label: 'Dashboard', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
    { name: 'opd', label: 'OPD', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /> },
    { name: 'ipd', label: 'IPD', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 4v12l-4-2-4 2V4M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /> },
    { name: 'patients', label: 'Patients', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /> },
    { name: 'billing', label: 'Billing', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /> },
    { name: 'pharmacy', label: 'Pharmacy', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /> },
    { name: 'laboratory', label: 'Laboratory', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /> },
    { name: 'radiology', label: 'Radiology', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /> }, // Added Radiology
    { name: 'ot', label: 'OT', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /> }, // Added OT
    { name: 'er', label: 'ER', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /> }, // Added ER
    { name: 'reports', label: 'Reports', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
    { name: 'settings', label: 'Settings', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /> },
  ];
  
  return (
    <div className="min-h-screen bg-gray-100 flex"> {/* Changed background slightly */} 
      {/* Sidebar */}
      <div className="w-64 shlokam-sidebar flex flex-col flex-shrink-0"> {/* Applied shlokam-sidebar class */}
        <div className="p-4 border-b border-gray-700 flex items-center"> {/* Adjusted border color */}
          <div className="mr-3 flex-shrink-0">
            <Image 
              src="/shlokam_logo.jpg" // Updated logo path
              alt="Shlokam Logo" 
              width={40} 
              height={40} 
            />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">SHLOKAM</h1> {/* Updated text color */}
            <p className="text-xs text-gray-300">HEALTHCARE</p> {/* Updated text color */}
          </div>
        </div>
        
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {sidebarModules.map((mod) => (
              <li key={mod.name}>
                <Button
                  variant="ghost" // Use ghost variant for custom styling
                  className={`w-full justify-start sidebar-item ${activeModule === mod.name ? 'active' : ''}`} // Apply sidebar-item and active classes
                  onClick={() => handleModuleClick(mod.name)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {mod.icon}
                  </svg>
                  {mod.label}
                </Button>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-gray-700"> {/* Adjusted border color */}
          <div className="flex items-center mb-4">
            <div className="mr-3 flex-shrink-0">
              <Image 
                src="/user-avatar.png" 
                alt="User Avatar" 
                width={40} 
                height={40} 
                className="rounded-full"
              />
            </div>
            <div>
              <p className="font-medium text-sm text-white">{userName}</p> {/* Updated text color */}
              <p className="text-xs text-gray-300">{userRole}</p> {/* Updated text color */}
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full border-gray-500 text-gray-300 hover:bg-gray-700 hover:text-white" // Adjusted styles for dark sidebar
            onClick={handleLogout}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </Button>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-4 flex items-center justify-between flex-shrink-0">
          <h1 className="text-xl font-bold text-gray-800"> {/* Adjusted text color */} 
            {activeModule.charAt(0).toUpperCase() + activeModule.slice(1)}
          </h1>
          
          <div className="flex items-center">
            <Input
              type="search"
              placeholder="Search..."
              className="w-64 mr-4"
            />
            <Button variant="ghost" size="icon" className="text-gray-600 hover:text-gray-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </Button>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-6 bg-gray-100">
          {children}
        </main>
        
        <footer className="bg-white border-t border-gray-200 p-4 text-center text-sm text-gray-500 flex-shrink-0">
          © {new Date().getFullYear()} Shlokam Healthcare. All rights reserved.
        </footer>
      </div>
    </div>
  );
}

