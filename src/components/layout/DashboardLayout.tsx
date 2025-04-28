// src/components/layout/DashboardLayout.tsx
import React from "react";
import { Sidebar } from "./Sidebar";
// Import Header component if/when created
// import { Header } from "./Header";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex flex-col flex-1">
        {/* Optional Header component can go here */}
        {/* <Header /> */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900/40">
          {children}
        </main>
      </div>
    </div>
  );
}

