
"use client";

import React, { useState, useEffect } from "react";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";



// import { hasPermission, deleteSession } from "@/lib/session"; 
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import {
  HomeIcon,
  CalendarIcon,
  BedIcon,
  AlertTriangleIcon,
  ScissorsIcon,
  UsersIcon,
  CreditCardIcon,
  PillIcon,
  FlaskConicalIcon,
  RadioIcon,
  BarChartIcon,
  SettingsIcon,
  HospitalIcon,
  LogOutIcon,
  BellIcon
} from "lucide-react";

// FIX: Define interface for the user info API response
interface UserInfo {
  userId: number;
  username: string;
  email: string;
  roleName: string;
  // Add other fields if available
}

interface UserInfoApiResponse {
  user: UserInfo;
  // Add other potential top-level properties if needed
}

// Layout component for all authenticated pages
function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null); // Allow null for loading state
  const [userRole, setUserRole] = useState<string | null>(null); // Allow null for loading state
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [activeModule, setActiveModule] = useState("dashboard");

  // FIX: Wrap async function for useEffect
  const handleLogout = React.useCallback(async () => {
    try {
      // Call the API endpoint to clear the server-side session/cookie
      await fetch("/api/auth/logout", {
        method: "POST",
      });
      
      // Regardless of API response, clear client-side indicators and redirect
      setUserName(null);
      setUserRole(null);
      router.push("/login");

    } catch (error) {
      console.error("Error logging out:", error);
      // Force redirect even if API call fails
      router.push("/login"); 
    }
  }, [router]);

  useEffect(() => {
    // Fetch user info
    const fetchUserInfo = async () => {
      setIsLoadingUser(true);
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          // FIX: Cast response JSON to defined type
          const data = await response.json() as UserInfoApiResponse;
          // FIX: Safely access user data
          if (data?.user) {
            setUserName(data.user.username);
            setUserRole(data.user.roleName);
          } else {
            console.error("User data not found in response, logging out.");
            await handleLogout(); // Logout if user data is missing
          }
        } else {
          // If not authenticated (e.g., 401 Unauthorized), redirect to login
          console.log("User not authenticated, redirecting to login.");
          router.push("/login");
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
        router.push("/login"); // Redirect on any fetch error
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchUserInfo();

    // Determine active module from URL on initial load and route changes
    const updateActiveModule = () => {
      const path = window.location.pathname;
      if (path.startsWith("/dashboard/opd")) {
        setActiveModule("opd");
      } else if (path.startsWith("/dashboard/ipd")) {
        setActiveModule("ipd");
      } else if (path.startsWith("/dashboard/patients")) {
        setActiveModule("patients");
      } else if (path.startsWith("/dashboard/billing")) {
        setActiveModule("billing");
      } else if (path.startsWith("/dashboard/pharmacy")) {
        setActiveModule("pharmacy");
      } else if (path.startsWith("/dashboard/laboratory")) {
        setActiveModule("laboratory");
      } else if (path.startsWith("/dashboard/radiology")) { // Added Radiology
        setActiveModule("radiology");
      } else if (path.startsWith("/dashboard/ot")) { // Added OT
        setActiveModule("ot");
      } else if (path.startsWith("/dashboard/er")) { // Added ER
        setActiveModule("er");
      } else if (path.startsWith("/dashboard/reports")) {
        setActiveModule("reports");
      } else if (path.startsWith("/dashboard/settings")) {
        setActiveModule("settings");
      } else {
        setActiveModule("dashboard");
      }
    };

    updateActiveModule(); // Initial check
    // Consider using Next.js router events for more robust updates if needed

  // FIX: Add handleLogout to dependency array
  }, [router, handleLogout]); 

  const handleModuleClick = (module: string) => {
    // Navigate to the corresponding dashboard sub-route
    router.push(`/dashboard/${module}`);
    setActiveModule(module); // Update state immediately for responsiveness
  };

  // Render skeleton or loading state while fetching user info
  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        {/* FIX: Use Skeleton components for better loading state */}
        <div className="flex flex-col md:flex-row w-full h-screen">
          {/* Skeleton Sidebar */}
          <div className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 p-4 space-y-4">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-10 w-10 rounded-md bg-gray-200" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-20 bg-gray-200" />
                <Skeleton className="h-3 w-32 bg-gray-200" />
              </div>
            </div>
            <div className="flex-1 space-y-2">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full bg-gray-200" />
              ))}
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                 <Skeleton className="h-10 w-10 rounded-full bg-gray-200" />
                 <div className="space-y-1">
                   <Skeleton className="h-4 w-24 bg-gray-200" />
                   <Skeleton className="h-3 w-16 bg-gray-200" />
                 </div>
              </div>
              <Skeleton className="h-10 w-full bg-gray-200" />
            </div>
          </div>
          {/* Skeleton Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <Skeleton className="h-16 w-full border-b border-gray-200 bg-white" />
            <div className="flex-1 p-6 bg-gray-100">
              <Skeleton className="h-full w-full bg-gray-200" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If user info failed to load (e.g., not authenticated), this component might unmount 
  // due to redirection, but this check adds robustness.
  if (!userName) {
    return null; // Or a message indicating redirection
  }

  // --- Sidebar Navigation Items --- 
  // Define navigation items based on potential roles/permissions if needed
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: <HomeIcon className="h-5 w-5 mr-2" /> },
    { id: "opd", label: "OPD", icon: <CalendarIcon className="h-5 w-5 mr-2" /> },
    { id: "ipd", label: "IPD", icon: <BedIcon className="h-5 w-5 mr-2" /> },
    { id: "er", label: "ER", icon: <AlertTriangleIcon className="h-5 w-5 mr-2" /> }, // Added ER
    { id: "ot", label: "OT", icon: <ScissorsIcon className="h-5 w-5 mr-2" /> }, // Added OT
    { id: "patients", label: "Patients", icon: <UsersIcon className="h-5 w-5 mr-2" /> },
    { id: "billing", label: "Billing", icon: <CreditCardIcon className="h-5 w-5 mr-2" /> },
    { id: "pharmacy", label: "Pharmacy", icon: <PillIcon className="h-5 w-5 mr-2" /> },
    { id: "laboratory", label: "Laboratory", icon: <FlaskConicalIcon className="h-5 w-5 mr-2" /> },
    { id: "radiology", label: "Radiology", icon: <RadioIcon className="h-5 w-5 mr-2" /> }, // Added Radiology
    { id: "reports", label: "Reports", icon: <BarChartIcon className="h-5 w-5 mr-2" /> },
    { id: "settings", label: "Settings", icon: <SettingsIcon className="h-5 w-5 mr-2" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row"> {/* Responsive layout */}
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0"> {/* Fixed width on larger screens */}
        {/* Logo and Hospital Name */}
        <div className="p-4 border-b border-gray-200 flex items-center">
          {/* Replace with actual logo if available */}
          <div className="mr-3 bg-teal-600 p-2 rounded">
            <HospitalIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-teal-700">HMS</h1>
            <p className="text-xs text-gray-500">Hospital Management</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => (
              // TODO: Add permission checks here if needed using hasPermission(item.permissionRequired)
              <li key={item.id}>
                <Button
                  variant={activeModule === item.id ? "secondary" : "ghost"} // Use secondary for active
                  className="w-full justify-start"
                  onClick={() => handleModuleClick(item.id)}
                >
                  {item.icon}
                  {item.label}
                </Button>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Info and Logout */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center mb-4">
            <div className="mr-3">
              {/* Placeholder Avatar */} 
              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-medium">
                {userName ? userName.charAt(0).toUpperCase() : "?"}
              </div>
            </div>
            <div className="overflow-hidden"> {/* Prevent long names/roles from breaking layout */}
              <p className="font-medium text-sm truncate">{userName}</p>
              <p className="text-xs text-gray-500 truncate">{userRole}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleLogout}
          >
            <LogOutIcon className="h-5 w-5 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Bar (Optional) */}
        <header className="bg-white border-b border-gray-200 p-4 flex items-center justify-between flex-shrink-0">
          {/* Can add breadcrumbs or module-specific actions here */}
          <h1 className="text-xl font-semibold">
            {/* Find the label corresponding to the active module */}
            {navItems.find(item => item.id === activeModule)?.label || "Dashboard"}
          </h1>
          
          {/* Global Search / Notifications (Optional) */}
          <div className="flex items-center">
            {/* <Input
              type="search"
              placeholder="Global Search..."
              className="w-64 mr-4 hidden sm:block" // Hide on small screens
            /> */}
            <Button variant="ghost" size="icon">
              <BellIcon className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-100">
          {children}
        </main>

        {/* Footer (Optional) */}
        {/* <footer className="bg-white border-t border-gray-200 p-4 text-center text-sm text-gray-500 flex-shrink-0">
          © {new Date().getFullYear()} Your Hospital Name. All rights reserved.
        </footer> */}
      </div>
    </div>
  );
}

// FIX: Add display name
DashboardLayout.displayName = "DashboardLayout";

// --- Icon Components removed as they are now imported from lucide-react ---