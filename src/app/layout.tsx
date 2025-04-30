"use client";

import React, { useState, useEffect } from "react";
// import Image from "next/image"; // Unused
import { useRouter } from "next/navigation";
// import { 
//   Card, 
//   CardContent, 
//   CardHeader, 
//   CardTitle 
// } from "@/components/ui/card"; // Unused
// import { Button } from "@/components/ui/button"; // Unused
// import { Input } from "@/components/ui/input"; // Unused
// import { Label } from "@/components/ui/label"; // Unused
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Unused
// FIX: hasPermission is available, but might not be needed in root layout
// import { hasPermission } from "@/lib/session"; 
// import Logo from "@/components/ui/logo"; // Unused
import "./globals.css"; // Ensure global styles are imported
import { Toaster } from "@/components/ui/toaster"; // Import Toaster for notifications

// FIX: Define interface for the user info API response (similar to dashboard layout)
interface UserInfo {
  userId: number;
  username: string;
  email: string;
  roleName: string;
}

interface UserInfoApiResponse {
  user: UserInfo;
}

// Root layout component
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Note: State like userName, userRole, activeModule, darkMode typically belongs 
  // in a more specific layout (like DashboardLayout) or context provider, 
  // not usually in the root layout unless it applies to *all* pages (including login).
  // The fetchUserInfo logic here seems misplaced if this layout wraps the login page too.
  // Assuming this layout *should* only wrap authenticated routes, but the structure 
  // implies it wraps everything. Let's keep the fetch logic for now but acknowledge it's unusual.

  const router = useRouter();
  const [_userName, setUserName] = useState<string | null>(null); // Prefixed as unused
  const [_userRole, setUserRole] = useState<string | null>(null); // Prefixed as unused
  const [_isLoadingUser, setIsLoadingUser] = useState(true); // Prefixed as unused, Track loading state
  const [darkMode, setDarkMode] = useState(true); // Default to dark mode

  useEffect(() => {
    // Fetch user info - This might run on pages where user isn't logged in (like /login)
    const fetchUserInfo = async () => {
      // Don't fetch if on login page to avoid redirect loop
      if (window.location.pathname === 
"/login") {
        setIsLoadingUser(false);
        return;
      }
      
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
            // Handle case where API returns OK but no user data
            console.warn("User data not found in /api/auth/me response.");
            // Depending on app logic, might redirect to login here
            // router.push("/login");
          }
        } else {
          // If not authenticated (e.g., 401), don't necessarily redirect immediately
          // Allow child pages (like login page) to render
          console.log("User not authenticated (checked in root layout).");
          // router.push("/login"); // Avoid redirecting from root layout, let pages handle it
        }
      } catch (error) {
        console.error("Error fetching user info in root layout:", error);
        // Avoid redirecting from root layout on error
        // router.push("/login");
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchUserInfo();

  }, [router]); // Dependency on router

  const _toggleDarkMode = () => { // Prefixed as unused
    setDarkMode(!darkMode);
    // Add logic to apply dark mode class to HTML element if needed
    // document.documentElement.classList.toggle("dark", !darkMode);
  };

  // The sidebar and header structure from the previous file content seems 
  // more appropriate for a DashboardLayout, not the root layout which 
  // should typically be simpler.
  // We will render children directly and add Toaster.

  return (
    <html lang="en" className={darkMode ? "dark" : ""}> {/* Apply dark mode class */} 
      <head>
        {/* Add meta tags, title etc. here */}
        <title>Shlokam HMS</title>
        <meta name="description" content="Hospital Management System" />
        {/* Link fonts, etc. */}
      </head>
      <body className="bg-background text-text-primary">
        {/* Render children directly, assuming specific layouts handle sidebar/header */}
        {children}
        {/* Add Toaster component for global notifications */}
        <Toaster /> 
      </body>
    </html>
  );
}

// Removed the extensive sidebar/header/footer structure from here as it likely belongs 
// in a nested layout (e.g., DashboardLayout) rather than the root layout.
// The original file content seemed to mix RootLayout and DashboardLayout concepts.
// The `hasPermission` import error was likely from the DashboardLayout, not this file.

