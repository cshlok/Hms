import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ERDashboardStatsProps {
  totalPatients: number;
  criticalCases: number;
  waitingPatients: number;
  averageWaitTime: string;
  occupiedBeds: number;
  totalBeds: number;
}

/**
 * Emergency Room dashboard statistics component
 */
export function ERDashboardStats({
  totalPatients,
  criticalCases,
  waitingPatients,
  averageWaitTime,
  occupiedBeds,
  totalBeds
}: ERDashboardStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="h-4 w-4 text-blue-600"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalPatients}</div>
          <p className="text-xs text-gray-500">
            {criticalCases > 0 && (
              <Badge variant="danger" className="ml-1">
                {criticalCases} Critical
              </Badge>
            )}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Waiting Patients</CardTitle>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="h-4 w-4 text-yellow-600"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{waitingPatients}</div>
          <p className="text-xs text-gray-500">Avg. wait: {averageWaitTime}</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Bed Occupancy</CardTitle>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="h-4 w-4 text-green-600"
          >
            <path d="M3 3v18h18" />
            <path d="M18 17V9" />
            <path d="M13 17V5" />
            <path d="M8 17v-3" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{occupiedBeds}/{totalBeds}</div>
          <p className="text-xs text-gray-500">
            {Math.round((occupiedBeds / totalBeds) * 100)}% occupancy rate
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
