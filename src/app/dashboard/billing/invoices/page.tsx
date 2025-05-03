// src/app/dashboard/billing/invoices/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge, BadgeProps } from "@/components/ui/badge"; // Import BadgeProps
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Search, Eye } from "lucide-react";
import { format } from "date-fns"; // For date formatting

// --- INTERFACES ---
interface Invoice {
  id: number;
  invoice_number: string;
  patient_id: number;
  patient_name: string; // Assuming joined data or fetched separately
  invoice_date: string;
  total_amount: number;
  amount_due: number;
  status: string; // e.g., draft, finalized, paid, partially_paid, void
}

// FIX: Define interface for API response
interface InvoicesApiResponse {
  invoices: Invoice[];
  // Add other potential properties if the API returns more data
}

// FIX: Define allowed badge variants type based on BadgeProps
type AllowedBadgeVariant = BadgeProps["variant"];

// --- COMPONENT ---
export default function InvoicesListPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>();
  const [searchTerm, setSearchTerm] = useState("");

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      const queryParameters = new URLSearchParams();
      if (searchTerm) {
        queryParameters.append("search", searchTerm);
      }

      const response = await fetch(
        `/api/billing/invoices?${queryParameters.toString()}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // FIX: Cast response JSON to defined type
      const data = (await response.json()) as InvoicesApiResponse;
      // Ensure data.invoices is an array before setting state
      setInvoices(Array.isArray(data?.invoices) ? data.invoices : []);
    } catch (error_) {
      console.error("Failed to fetch invoices:", error_);
      setError(
        error_ instanceof Error ? error_.message : "An unknown error occurred"
      );
      setInvoices([]); // Clear invoices on error
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchInvoices();
    }, 300); // Debounce search
    return () => clearTimeout(handler);
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
      case "finalized":
      case "draft": {
        return "secondary";
      }
      case "void": {
        return "destructive";
      }
      default: {
        return "secondary";
      } // Default to secondary for unknown statuses
    }
  };

  // --- JSX ---
  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      {" "}
      {/* Added lg:px-8 */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        {" "}
        {/* Responsive layout */}
        <h1 className="text-2xl font-semibold">Invoice Management</h1>
        <Link href="/dashboard/billing/create-invoice" passHref>
          <Button className="w-full sm:w-auto">
            {" "}
            {/* Full width on small screens */}
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Invoice
          </Button>
        </Link>
      </div>
      <div className="mb-4">
        <div className="relative w-full max-w-md">
          {" "}
          {/* Adjusted max-width */}
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by Invoice #, Patient Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10" // Increased padding for icon
          />
        </div>
      </div>
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
              <TableHead className="text-right">Total (₹)</TableHead>{" "}
              {/* Shortened label */}
              <TableHead className="text-right">Due (₹)</TableHead>{" "}
              {/* Shortened label */}
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
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
                  </TableCell>{" "}
                  {/* Rounded skeleton for badge */}
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-10 ml-auto rounded" />
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
                    {invoice.patient_name ||
                      `Patient ID: ${invoice.patient_id}`}
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
                  </TableCell>{" "}
                  {/* Show dash if 0 due */}
                  <TableCell>
                    <Badge
                      variant={getStatusBadgeVariant(invoice.status)}
                      className="capitalize"
                    >
                      {invoice.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {/* Link to a potential invoice detail page */}
                    {/* <Link href={`/dashboard/billing/invoices/${invoice.id}`} passHref> */}
                    <Button
                      variant="ghost"
                      size="icon"
                      title="View Invoice Details"
                    >
                      {" "}
                      {/* Added title */}
                      <Eye className="h-4 w-4" />
                    </Button>
                    {/* </Link> */}
                    {/* Add Edit/Payment buttons here if functionality exists */}
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
                  {searchTerm
                    ? `No invoices found matching "${searchTerm}".`
                    : "No invoices available."}
                </TableCell>
              </TableRow>)
            )}
          </TableBody>
        </Table>
      </div>
      {/* Consider adding Pagination component here if the API supports it */}
    </div>
  );
}
