import React from 'react';
import DashboardClientLayout from './dashboard-client-layout'; // Import the renamed client layout

// This is a server component. Metadata or generateViewport for /dashboard routes can be defined here.
// For example:
// export const metadata = {
//   title: 'Dashboard - HMS',
// };

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardClientLayout>{children}</DashboardClientLayout>;
}

