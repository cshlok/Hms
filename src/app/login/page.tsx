"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
} from "@/components/ui"; // Assuming Button is also from @/components/ui
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import Link from "next/link";

// --- INTERFACES for API Responses ---
interface OpdStatsResponse {
  totalPatients?: number;
  todayAppointments?: number;
}

interface IpdStatsResponse {
  activeAdmissions?: number;
  availableBeds?: number;
}

interface BillingStatsResponse {
  pendingBills?: number;
}

interface PharmacyStatsResponse {
  lowStockItems?: number;
}

// Interface for the combined stats state
interface DashboardStats {
  totalPatients: number;
  todayAppointments: number;
  activeAdmissions: number;
  availableBeds: number;
  pendingBills: number;
  lowStockItems: number;
}

function Dashboard() {
  // FIX: Initialize stats with default values matching the interface
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    todayAppointments: 0,
    activeAdmissions: 0,
    availableBeds: 0,
    pendingBills: 0,
    lowStockItems: 0,
  });
  const [loading, setLoading] = useState(true);
  // FIX: Explicitly type error state to allow string or null
  const [error, setError] = useState<string | null>();

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        setError(undefined); // Clear previous errors

        // Fetch stats from different endpoints (consider consolidating in a real API)
        const [opdResponse, ipdResponse, billingResponse, pharmacyResponse] =
          await Promise.all([
            fetch("/api/dashboard/opd-stats"),
            fetch("/api/dashboard/ipd-stats"),
            fetch("/api/dashboard/billing-stats"),
            fetch("/api/dashboard/pharmacy-stats"),
          ]);

        // Check all responses
        if (
          !opdResponse.ok ||
          !ipdResponse.ok ||
          !billingResponse.ok ||
          !pharmacyResponse.ok
        ) {
          // Find the first failed response for a more specific error
          const failedResponse = [
            opdResponse,
            ipdResponse,
            billingResponse,
            pharmacyResponse,
          ].find((_res) => !response.ok);
          throw new Error(
            `Failed to fetch dashboard data: ${failedResponse?.statusText || "Unknown error"} (status: ${failedResponse?.status || "N/A"})`
          );
        }

        // FIX: Cast JSON responses to defined types
        const opdData = (await opdResponse.json()) as OpdStatsResponse;
        const ipdData = (await ipdResponse.json()) as IpdStatsResponse;
        const billingData =
          (await billingResponse.json()) as BillingStatsResponse;
        const pharmacyData =
          (await pharmacyResponse.json()) as PharmacyStatsResponse;

        // FIX: Update state using data, providing defaults
        setStats({
          totalPatients: opdData?.totalPatients ?? 0,
          todayAppointments: opdData?.todayAppointments ?? 0,
          activeAdmissions: ipdData?.activeAdmissions ?? 0,
          availableBeds: ipdData?.availableBeds ?? 0,
          pendingBills: billingData?.pendingBills ?? 0,
          lowStockItems: pharmacyData?.lowStockItems ?? 0,
        });
      } catch (error_) {
        console.error("Error fetching dashboard stats:", error_);
        // FIX: setError now accepts a string
        setError(
          error_ instanceof Error
            ? error_.message
            : "Failed to load dashboard statistics. Please try again later."
        );

        // Keep stats at 0 or previous state on error, avoid setting dummy data here
        setStats({
          totalPatients: 0,
          todayAppointments: 0,
          activeAdmissions: 0,
          availableBeds: 0,
          pendingBills: 0,
          lowStockItems: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  // --- Stat Card Component (Optional Refactor) ---
  interface StatCardProperties {
    title: string;
    value: number;
    icon: React.ReactNode;
    link?: string;
    linkText?: string;
    colorClass?: string; // e.g., "blue", "green"
  }

  // FIX: Add display name
  const StatCard: React.FC<StatCardProperties> = ({
    title,
    value,
    icon,
    link,
    linkText,
    colorClass = "gray",
  }) => {
    // FIX: Use template literals for dynamic class names (ensure Tailwind recognizes these)
    // Note: Tailwind CSS needs to be configured to scan for these dynamic classes,
    // or you need to ensure the full class names exist elsewhere or are safelisted.
    // Example: bg-blue-100, text-blue-600, bg-green-100, text-green-600 etc.
    const bgClass = `bg-${colorClass}-100`;
    const textClass = `text-${colorClass}-600`;

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {title}
              </p>
              <h3 className="text-2xl font-bold">{value}</h3>
            </div>
            {/* FIX: Apply dynamic classes */}
            <div className={`p-3 ${bgClass} rounded-full`}>
              {React.cloneElement(icon as React.ReactElement, {
                className: `h-6 w-6 ${textClass}`,
              })}
            </div>
          </div>
          {link && linkText && (
            <div className="mt-4">
              <Link href={link} passHref>
                <Button variant="outline" size="sm" className="w-full">
                  {linkText}
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };
  // FIX: Add display name
  StatCard.displayName = "StatCard";

  // --- JSX ---
  return (
    <div className="space-y-6">
      {/* Removed redundant h1, assuming layout provides it */}
      {/* <h1 className="text-2xl font-bold">Dashboard</h1> */}
      {loading ? (
        // Skeleton Loading State
        (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-2/5" />
                  <Skeleton className="h-10 w-10 rounded-full" />
                </div>
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>)
      ) : error ? (
        // Error State
        (<Card className="bg-red-50 border-red-200">
          <CardContent className="p-6 text-center text-red-700">
            <p className="font-semibold">Error Loading Dashboard</p>
            <p className="text-sm">{error}</p>
            {/* Optional: Add a retry button */}
          </CardContent>
        </Card>)
      ) : (
        // Data Loaded State
        (<>
          {/* Stats Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              title="Total Patients"
              value={stats.totalPatients}
              icon={<UsersIcon />}
              link="/dashboard/patients"
              linkText="View Patients"
              colorClass="blue"
            />
            <StatCard
              title="Today's Appointments"
              value={stats.todayAppointments}
              icon={<CalendarIcon />}
              link="/dashboard/opd"
              linkText="View OPD"
              colorClass="green"
            />
            <StatCard
              title="Active Admissions"
              value={stats.activeAdmissions}
              icon={<BedIcon />}
              link="/dashboard/ipd"
              linkText="View IPD"
              colorClass="purple"
            />
            <StatCard
              title="Available Beds"
              value={stats.availableBeds}
              icon={<BedDoubleIcon />}
              link="/dashboard/ipd"
              linkText="Bed Management"
              colorClass="indigo"
            />
            <StatCard
              title="Pending Bills"
              value={stats.pendingBills}
              icon={<CreditCardIcon />}
              link="/dashboard/billing"
              linkText="View Billing"
              colorClass="red"
            />
            <StatCard
              title="Low Stock Items"
              value={stats.lowStockItems}
              icon={<PillIcon />}
              link="/dashboard/pharmacy"
              linkText="View Pharmacy"
              colorClass="amber"
            />
          </div>
          {/* Recent Activity Sections (Consider making these separate components) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Admissions Card */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Admissions</CardTitle>
                {/* Add link to view all */}
              </CardHeader>
              <CardContent>
                {/* Placeholder Content - Replace with actual data fetching */}
                <div className="space-y-3">
                  <ActivityItem
                    name="Rahul Sharma"
                    detail="Room 101 - General Ward"
                    time="Apr 25, 2025"
                    doctor="Dr. John Smith"
                  />
                  <ActivityItem
                    name="Priya Patel"
                    detail="Room 205 - Private"
                    time="Apr 26, 2025"
                    doctor="Dr. Sarah Johnson"
                  />
                  <ActivityItem
                    name="Amit Singh"
                    detail="Room 302 - ICU"
                    time="Apr 27, 2025"
                    doctor="Dr. Michael Chen"
                  />
                </div>
                <div className="mt-4 text-center">
                  <Link href="/dashboard/ipd" passHref>
                    <Button variant="ghost" size="sm">
                      View All Admissions
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Today's OPD Schedule Card */}
            <Card>
              <CardHeader>
                <CardTitle>Today&apos;s OPD Schedule</CardTitle>
                {/* Add link to view all */}
              </CardHeader>
              <CardContent>
                {/* Placeholder Content - Replace with actual data fetching */}
                <div className="space-y-3">
                  <ActivityItem
                    name="Neha Gupta"
                    detail="General Medicine"
                    time="10:00 AM"
                    doctor="Dr. John Smith"
                  />
                  <ActivityItem
                    name="Rajesh Kumar"
                    detail="Orthopedics"
                    time="11:30 AM"
                    doctor="Dr. Robert Williams"
                  />
                  <ActivityItem
                    name="Ananya Desai"
                    detail="Pediatrics"
                    time="2:15 PM"
                    doctor="Dr. Sarah Johnson"
                  />
                </div>
                <div className="mt-4 text-center">
                  <Link href="/dashboard/opd" passHref>
                    <Button variant="ghost" size="sm">
                      View Full Schedule
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </>)
      )}
    </div>
  );
}

// --- Helper Component for Activity Lists ---
interface ActivityItemProperties {
  name: string;
  detail: string;
  time: string;
  doctor: string;
}

const ActivityItem: React.FC<ActivityItemProperties> = ({
  name,
  detail,
  time,
  doctor,
}) => (
  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-100 dark:border-gray-700">
    <div>
      <p className="font-medium text-sm sm:text-base">{name}</p>
      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
        {detail}
      </p>
    </div>
    <div className="text-right flex-shrink-0 ml-2">
      <p className="text-xs sm:text-sm">{time}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{doctor}</p>
    </div>
  </div>
);

// FIX: Add display name
ActivityItem.displayName = "ActivityItem";

// --- Icon Components (Placeholder - use lucide-react or similar) ---
// Assuming these are imported or defined elsewhere as in layout.tsx
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
const BedDoubleIcon = (properties: React.SVGProps<SVGSVGElement>) => (
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
    <path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8" />
    <path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
    <path d="M12 4v6" />
    <path d="M2 18h20" />
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

export default Dashboard;
