// src/components/layout/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ReceiptText,
  Boxes,
  Settings,
  LogOut,
} from "lucide-react";
import Image from "next/image";

// Define navigation items
const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/patients", label: "Patients", icon: Users },
  { href: "/dashboard/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/dashboard/billing", label: "Billing", icon: ReceiptText },
  { href: "/dashboard/inventory", label: "Inventory", icon: Boxes },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  const handleLogout = async () => {
    // TODO: Implement actual logout logic (call API, clear session)
    console.log("Logout clicked");
    // Redirect to login page after logout
    // router.push("/login");
  };

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 border-r bg-gray-100/40 dark:bg-gray-800/40 p-4">
      <div className="flex h-[60px] items-center px-6 mb-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Image src="/images/shlokam_logo.jpg" alt="Shlokam Logo" width={100} height={30} />
          {/* <span className="">Shlokam HMS</span> */}
        </Link>
      </div>
      <nav className="flex-1 flex flex-col gap-2 px-4 text-sm font-medium">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50",
                isActive && "bg-gray-200/50 text-gray-900 dark:bg-gray-800 dark:text-gray-50"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto p-4">
         {/* Optional: Add user profile section here */}
         <Button variant="ghost" className="w-full justify-start gap-3" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Logout
         </Button>
      </div>
    </aside>
  );
}

