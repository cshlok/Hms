"use client";

import React, { useState, useEffect } from "react";
// import Image from "next/image";
import { useRouter } from "next/navigation";
import {} from // Card,
// CardContent,
// CardHeader,
// CardTitle
"@/components/ui/card";
import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { hasPermission, deleteSession } from "@/lib/session";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton

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
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(); // Allow null for loading state
  const [userRole, setUserRole] = useState<string | null>(); // Allow null for loading state
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
      setUserName(undefined);
      setUserRole(undefined);
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
          const data = (await response.json()) as UserInfoApiResponse;
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
      const path = globalThis.location.pathname;
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
      } else if (path.startsWith("/dashboard/radiology")) {
        // Added Radiology
        setActiveModule("radiology");
      } else if (path.startsWith("/dashboard/ot")) {
        // Added OT
        setActiveModule("ot");
      } else if (path.startsWith("/dashboard/er")) {
        // Added ER
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
              {Array.from({ length: 10 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full bg-gray-200" />
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
    return; // Or a message indicating redirection
  }

  // --- Sidebar Navigation Items ---
  // Define navigation items based on potential roles/permissions if needed
  const navItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <HomeIcon className="h-5 w-5 mr-2" />,
    },
    {
      id: "opd",
      label: "OPD",
      icon: <CalendarIcon className="h-5 w-5 mr-2" />,
    },
    { id: "ipd", label: "IPD", icon: <BedIcon className="h-5 w-5 mr-2" /> },
    {
      id: "er",
      label: "ER",
      icon: <AlertTriangleIcon className="h-5 w-5 mr-2" />,
    }, // Added ER
    { id: "ot", label: "OT", icon: <ScissorsIcon className="h-5 w-5 mr-2" /> }, // Added OT
    {
      id: "patients",
      label: "Patients",
      icon: <UsersIcon className="h-5 w-5 mr-2" />,
    },
    {
      id: "billing",
      label: "Billing",
      icon: <CreditCardIcon className="h-5 w-5 mr-2" />,
    },
    {
      id: "pharmacy",
      label: "Pharmacy",
      icon: <PillIcon className="h-5 w-5 mr-2" />,
    },
    {
      id: "laboratory",
      label: "Laboratory",
      icon: <FlaskConicalIcon className="h-5 w-5 mr-2" />,
    },
    {
      id: "radiology",
      label: "Radiology",
      icon: <RadioIcon className="h-5 w-5 mr-2" />,
    }, // Added Radiology
    {
      id: "reports",
      label: "Reports",
      icon: <BarChartIcon className="h-5 w-5 mr-2" />,
    },
    {
      id: "settings",
      label: "Settings",
      icon: <SettingsIcon className="h-5 w-5 mr-2" />,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {" "}
      {/* Responsive layout */}
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        {" "}
        {/* Fixed width on larger screens */}
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
              (<li key={item.id}>
                <Button
                  variant={activeModule === item.id ? "secondary" : "ghost"} // Use secondary for active
                  className="w-full justify-start"
                  onClick={() => handleModuleClick(item.id)}
                >
                  {item.icon}
                  {item.label}
                </Button>
              </li>)
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
            <div className="overflow-hidden">
              {" "}
              {/* Prevent long names/roles from breaking layout */}
              <p className="font-medium text-sm truncate">{userName}</p>
              <p className="text-xs text-gray-500 truncate">{userRole}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={handleLogout}>
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
            {navItems.find((item) => item.id === activeModule)?.label ||
              "Dashboard"}
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

// --- Icon Components (Placeholder - use lucide-react or similar) ---
// FIX: Add missing icon definitions
const AlertTriangleIcon = (properties: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...properties}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

const ScissorsIcon = (properties: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...properties}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="6" cy="6" r="3" />
    <path d="M8.12 8.12 12 12" />
    <path d="M20 4 8.12 15.88" />
    <circle cx="6" cy="18" r="3" />
    <path d="M14.8 14.8 20 20" />
    <path d="M8.12 8.12 12 12" />
  </svg>
);

const RadioIcon = (properties: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...properties}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
    <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
    <circle cx="12" cy="12" r="2" />
    <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
    <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
  </svg>
);

const HomeIcon = (properties: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...properties}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const CalendarIcon = (properties: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...properties}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </svg>
);

const BedIcon = (properties: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...properties}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 4v16" />
    <path d="M7 21v-2" />
    <path d="M17 21v-2" />
    <path d="M22 8v8" />
    <path d="M7 16h10" />
    <path d="M7 8h10" />
    <path d="M17 16h5" />
    <path d="M17 8h5" />
    <path d="M7 12h10" />
  </svg>
);

const UsersIcon = (properties: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...properties}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const CreditCardIcon = (properties: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...properties}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <line x1="2" x2="22" y1="10" y2="10" />
  </svg>
);

const PillIcon = (properties: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...properties}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
    <path d="m8.5 8.5 7 7" />
  </svg>
);

const FlaskConicalIcon = (properties: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...properties}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M8.5 2h7" />
    <path d="M14 9h-4" />
    <path d="M16.5 16.5 22 22" />
    <path d="M10 14 5 22" />
    <path d="M17 14 19 9l-1-7H6l-1 7 2 5" />
  </svg>
);

const BarChartIcon = (properties: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...properties}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" x2="12" y1="20" y2="10" />
    <line x1="18" x2="18" y1="20" y2="4" />
    <line x1="6" x2="6" y1="20" y2="16" />
  </svg>
);

const SettingsIcon = (properties: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...properties}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const LogOutIcon = (properties: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...properties}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" x2="9" y1="12" y2="12" />
  </svg>
);

const BellIcon = (properties: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...properties}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const HospitalIcon = (properties: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...properties}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 6v4" />
    <path d="M14 14h-4" />
    <path d="M14 18h-4" />
    <path d="M14 8h-4" />
    <path d="M18 12h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2" />
    <path d="M12 14v4" />
    <path d="M10 12h4" />
  </svg>
);
