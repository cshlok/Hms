"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";

interface OPDStatisticsProperties {
  date: Date;
}

interface StatisticsData {
  totalAppointments: number;
  checkedIn: number;
  completed: number;
  cancelled: number;
  averageWaitTime: number; // in minutes
  doctorPerformance: {
    doctorName: string;
    patientsServed: number;
    averageConsultationTime: number; // in minutes
  }[];
}

// FIX: Define API response types
// Assuming the API returns the StatisticsData object directly
type StatisticsApiResponse = StatisticsData;

interface ApiErrorResponse {
  error?: string;
}

export default function OPDStatistics({ date }: OPDStatisticsProperties) {
  const [statistics, setStatistics] = useState<StatisticsData | null>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>();

  useEffect(() => {
    const fetchStatistics = async () => {
      setLoading(true);
      setError(undefined);

      try {
        const formattedDate = date.toISOString().split("T")[0];
        const response = await fetch(
          `/api/opd/statistics?date=${formattedDate}`
        );

        if (!response.ok) {
          let errorMessage = "Failed to fetch statistics";
          try {
            const errorData: ApiErrorResponse = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            /* Ignore */
          }
          throw new Error(errorMessage);
        }

        // FIX: Type the response data
        const data: StatisticsApiResponse = await response.json();
        // Validate the structure if necessary before setting state
        if (data && typeof data === "object" && "totalAppointments" in data) {
          setStatistics(data);
        } else {
          console.warn("Unexpected API response format for statistics:", data);
          setStatistics(undefined); // Set to null or handle appropriately
        }
      } catch (error_: unknown) {
        // FIX: Use unknown
        const messageText =
          error_ instanceof Error
            ? error_.message
            : "An unknown error occurred";
        setError(messageText);
        console.error("Error fetching statistics:", error_);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [date]);

  if (loading) {
    return <div className="text-center p-4">Loading statistics...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }

  if (!statistics) {
    return (
      <div className="text-center p-4">
        No statistics available for this date.
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">OPD Statistics</h3>
        <div className="flex items-center">
          <div className="mr-2">
            <Image
              src="/logo.png"
              alt="Shlokam Logo"
              width={30}
              height={30}
              className="rounded-full"
            />
          </div>
          <span className="text-xs font-medium">Shlokam</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-blue-50 p-2 rounded-md text-center">
          <div className="text-sm text-gray-500">Total</div>
          <div className="text-xl font-bold text-blue-600">
            {statistics.totalAppointments}
          </div>
        </div>

        <div className="bg-green-50 p-2 rounded-md text-center">
          <div className="text-sm text-gray-500">Completed</div>
          <div className="text-xl font-bold text-green-600">
            {statistics.completed}
          </div>
        </div>

        <div className="bg-yellow-50 p-2 rounded-md text-center">
          <div className="text-sm text-gray-500">Checked In</div>
          <div className="text-xl font-bold text-yellow-600">
            {statistics.checkedIn}
          </div>
        </div>

        <div className="bg-red-50 p-2 rounded-md text-center">
          <div className="text-sm text-gray-500">Cancelled</div>
          <div className="text-xl font-bold text-red-600">
            {statistics.cancelled}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-sm text-gray-500 mb-1">Average Wait Time</div>
        <div className="flex items-center">
          <div className="h-2 bg-gray-200 rounded-full flex-grow">
            <div
              className={`h-2 rounded-full ${
                statistics.averageWaitTime < 15
                  ? "bg-green-500"
                  : statistics.averageWaitTime < 30
                    ? "bg-yellow-500"
                    : "bg-red-500"
              }`}
              style={{
                width: `${Math.min(100, (statistics.averageWaitTime / 60) * 100)}%`,
              }}
            ></div>
          </div>
          <span className="ml-2 text-sm font-medium">
            {Math.floor(statistics.averageWaitTime / 60)}h{" "}
            {statistics.averageWaitTime % 60}m
          </span>
        </div>
      </div>

      <div>
        <div className="text-sm text-gray-500 mb-2">Doctor Performance</div>
        {statistics.doctorPerformance.map((doctor, index) => (
          <div key={index} className="mb-2 last:mb-0">
            <div className="flex justify-between text-xs mb-1">
              <span>{doctor.doctorName}</span>
              <span>{doctor.patientsServed} patients</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full">
              <div
                className="h-1.5 bg-blue-500 rounded-full"
                // FIX: Ensure divisor is not zero if doctorPerformance can be empty
                style={{
                  width: `${Math.min(100, (doctor.patientsServed / Math.max(...statistics.doctorPerformance.map((d) => d.patientsServed), 1)) * 100)}%`,
                }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
