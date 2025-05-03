// src/app/dashboard/billing/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge, BadgeProps } from "@/components/ui/badge"; // Import BadgeProps
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { format } from "date-fns"; // Import date-fns for formatting

// --- INTERFACES ---
interface Invoice {
  id: number;
  invoice_number: string;
  patient_id: number;
  patient_name: string;
  invoice_date: string;
  total_amount: number;
  amount_due: number;
  status: string;
}

// FIX: Define interface for API response
interface BillingDashboardApiResponse {
  invoices: Invoice[];
  totalCount?: number; // Make totalCount optional as it might not always be present
  // Add other potential properties if the API returns more data
}

// FIX: Define allowed badge variants type based on BadgeProps
type AllowedBadgeVariant = BadgeProps["variant"];

// --- COMPONENT ---
export default function BillingDashboardPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>();
  const [totalCount, setTotalCount] = useState(0);
  // Add pagination state if needed: const [page, setPage] = useState(1); const [limit, setLimit] = useState(10);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      // Add pagination params if implemented: ?limit=${limit}&offset=${(page - 1) * limit}
      const response = await fetch("/api/billing/invoices?limit=10"); // Fetch only recent 10 for dashboard
      if (!response.ok) {
        throw new Error(`Failed to fetch invoices: ${response.statusText}`);
      }
      // FIX: Cast response JSON to defined type
      const data = (await response.json()) as BillingDashboardApiResponse;
      // FIX: Safely access data properties and ensure invoices is an array
      setInvoices(Array.isArray(data?.invoices) ? data.invoices : []);
      setTotalCount(
        data?.totalCount ??
          (Array.isArray(data?.invoices) ? data.invoices.length : 0)
      ); // Use length as fallback if totalCount missing
    } catch (error_) {
      console.error("Error fetching invoices:", error_);
      setError(
        error_ instanceof Error ? error_.message : "An unknown error occurred."
      );
      setInvoices([]); // Clear invoices on error
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, []); // Add page, limit dependencies if pagination is added

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // FIX: Ensure returned variant is one of the allowed types
  const getStatusBadgeVariant = (status: string): AllowedBadgeVariant => {
    switch (status.toLowerCase()) {
      case "paid": {
        return "default";
      } // Map "success" to "default"
      case "partially_paid": {
        return "secondary";
      } // Map "warning" to "secondary"
      case "draft": {
        return "secondary";
      }
      case "void": {
        return "destructive";
      }
      case "finalized": {
        // Assuming finalized is a valid status
        return "outline";
      } // Map "finalized" to "outline"
      default: {
        return "secondary";
      } // Default for unknown statuses
    }
  };

  // --- JSX ---
  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 space-y-6">
      {" "}
      {/* Added lg:px-8 */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        {" "}
        {/* Responsive layout */}
        <h1 className="text-2xl font-semibold">Billing Dashboard</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          {" "}
          {/* Button group */}
          <Link href="/dashboard/billing/service-items" passHref>
            <Button variant="outline" className="flex-1 sm:flex-none">
              Manage Services
            </Button>
          </Link>
          <Link href="/dashboard/billing/create-invoice" passHref>
            <Button className="flex-1 sm:flex-none">
              {" "}
              {/* Full width on small screens */}
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </Link>
        </div>
      </div>
      {/* Optional: Add Summary Cards here (e.g., Total Revenue, Overdue Invoices) */}
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          {" "}
          {/* Flex layout for header */}
          <div>
            <CardTitle>Recent Invoices</CardTitle>
            <CardDescription>
              Showing the latest {invoices.length} invoices.
            </CardDescription>{" "}
            {/* Dynamic description */}
          </div>
          <Link href="/dashboard/billing/invoices" passHref>
            <Button variant="outline" size="sm">
              View All Invoices
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 text-red-700 border border-red-300 bg-red-50 p-3 rounded-md">
              {" "}
              {/* Adjusted colors */}
              Error fetching invoices: {error}
            </div>
          )}
          <div className="rounded-md border overflow-x-auto">
            {" "}
            {/* Added overflow-x-auto */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Invoice #</TableHead>{" "}
                  {/* Added min-width */}
                  <TableHead className="min-w-[150px]">Patient</TableHead>{" "}
                  {/* Added min-width */}
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total (₹)</TableHead>
                  <TableHead className="text-right">Due (₹)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>{" "}
                  {/* Right align actions */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  // Skeleton Loader Rows
                  (Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-4 w-16 ml-auto" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-4 w-16 ml-auto" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-8 w-16 ml-auto rounded" />
                      </TableCell>{" "}
                      {/* Rounded skeleton for button */}
                    </TableRow>
                  )))
                ) : invoices.length > 0 ? (
                  // Invoice Data Rows
                  (invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono text-sm">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell className="font-medium">
                        {invoice.patient_name || `ID: ${invoice.patient_id}`}
                      </TableCell>
                      <TableCell>
                        {format(new Date(invoice.invoice_date), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        {invoice.total_amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {invoice.amount_due > 0
                          ? invoice.amount_due.toFixed(2)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getStatusBadgeVariant(invoice.status)}
                          className="capitalize"
                        >
                          {invoice.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {" "}
                        {/* Right align actions */}
                        {/* Link to the specific invoice detail page */}
                        {/* <Link href={`/dashboard/billing/invoices/${invoice.id}`} passHref> */}
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                        {/* </Link> */}
                      </TableCell>
                    </TableRow>
                  )))
                ) : (
                  // No Invoices Found Row
                  (<TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No recent invoices found.
                    </TableCell>
                  </TableRow>)
                )}
              </TableBody>
            </Table>
          </div>
          {/* Add simple pagination info or link if needed */}
          {totalCount > invoices.length && !loading && (
            <div className="text-sm text-muted-foreground mt-4">
              Showing {invoices.length} of {totalCount} total invoices.{" "}
              <Link href="/dashboard/billing/invoices" className="underline">
                View all
              </Link>
              .
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
