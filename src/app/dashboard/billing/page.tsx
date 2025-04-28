// src/app/dashboard/billing/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";

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

export default function BillingDashboardPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  // Add pagination state if needed: const [page, setPage] = useState(1); const [limit, setLimit] = useState(10);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Add pagination params if implemented: ?limit=${limit}&offset=${(page - 1) * limit}
      const response = await fetch("/api/billing/invoices"); 
      if (!response.ok) {
        throw new Error("Failed to fetch invoices");
      }
      const data = await response.json();
      setInvoices(data.invoices || []);
      setTotalCount(data.totalCount || 0);
    } catch (err) {
      console.error("Error fetching invoices:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
      setInvoices([]); // Clear invoices on error
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, []); // Add page, limit dependencies if pagination is added

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "success";
      case "partially_paid":
        return "warning";
      case "draft":
        return "secondary";
      case "void":
        return "destructive";
      case "finalized":
      default:
        return "default";
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Billing Dashboard</h1>
        <Link href="/dashboard/billing/create-invoice" passHref>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
          <CardDescription>List of recently generated invoices.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 text-red-600 border border-red-600 p-3 rounded-md">
              Error fetching invoices: {error}
            </div>
          )}
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total (₹)</TableHead>
                  <TableHead className="text-right">Due (₹)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                    </TableRow>
                  ))
                ) : invoices.length > 0 ? (
                  invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>{invoice.patient_name} (ID: {invoice.patient_id})</TableCell>
                      <TableCell>{new Date(invoice.invoice_date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">{invoice.total_amount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{invoice.amount_due.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(invoice.status)}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1).replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {/* Add View/Edit/Pay buttons here */}
                        <Link href={`/dashboard/billing/invoices/${invoice.id}`} passHref>
                           <Button variant="outline" size="sm">View</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No invoices found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {/* Add Pagination controls here if implemented */}
        </CardContent>
      </Card>
    </div>
  );
}

