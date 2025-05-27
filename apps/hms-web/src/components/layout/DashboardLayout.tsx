import React, { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}

/**
 * Dashboard layout component that provides consistent structure for dashboard pages
 * @param children Content to be rendered within the dashboard layout
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow pt-5 overflow-y-auto bg-white border-r">
          <div className="px-4 py-4">
            <h1 className="text-xl font-semibold text-gray-800">HMS Dashboard</h1>
          </div>
          <nav className="flex-1 px-2 pb-4 space-y-1">
            {/* Navigation items would go here */}
          </nav>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="w-full">
          <div className="relative z-10 flex-shrink-0 h-16 bg-white border-b flex items-center justify-between px-4">
            <div>
              {/* Mobile menu button would go here */}
            </div>
            <div className="flex items-center space-x-4">
              {/* User profile, notifications, etc. would go here */}
            </div>
          </div>
        </header>
        
        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
