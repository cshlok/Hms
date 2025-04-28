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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Search, Eye } from "lucide-react";
import { format } from "date-fns"; // For date formatting

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

export default function InvoicesListPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Construct query parameters based on filters (e.g., searchTerm)
      const queryParams = new URLSearchParams();
      if (searchTerm) {
        queryParams.append("search", searchTerm); // Assuming API supports search
      }
      
      const response = await fetch(`/api/billing/invoices?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setInvoices(data.invoices || []);
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm]); // Refetch when searchTerm changes

  useEffect(() => {
    // Debounce fetch or fetch directly
    const handler = setTimeout(() => {
      fetchInvoices();
    }, 300); // Debounce search
    return () => clearTimeout(handler);
  }, [fetchInvoices]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "success";
      case "partially_paid":
        return "warning";
      case "finalized":
      case "draft":
        return "secondary";
      case "void":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <h1 className="text-2xl font-semibold mb-6">Invoice Management</h1>

      <div className="flex justify-between items-center mb-4 gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            type="search"
            placeholder="Search by Invoice #, Patient Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Link href="/dashboard/billing/create-invoice" passHref>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Invoice
          </Button>
        </Link>
      </div>

      {error && (
        <div className="mb-4 text-red-600 border border-red-600 p-3 rounded-md">
          Error: {error}
        </div>
      )}

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Total Amount (₹)</TableHead>
              <TableHead className="text-right">Amount Due (₹)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-10 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : invoices.length > 0 ? (
              invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono text-sm">{invoice.invoice_number}</TableCell>
                  <TableCell className="font-medium">{invoice.patient_name || `Patient ID: ${invoice.patient_id}`}</TableCell>
                  <TableCell>{format(new Date(invoice.invoice_date), "dd MMM yyyy")}</TableCell>
                  <TableCell className="text-right">{invoice.total_amount.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{invoice.amount_due.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(invoice.status)}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1).replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/dashboard/billing/invoices/${invoice.id}`} passHref> 
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    {/* Add Edit/Payment buttons if needed */}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No invoices found matching your criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Add Pagination if needed */}
    </div>
  );
}

