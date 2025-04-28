// src/app/dashboard/billing/page.tsx
"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Search } from "lucide-react";
import { Invoice, InvoiceStatus } from "@/types/billing";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { format } from "date-fns";

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(""); // Search by patient name or invoice number
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "">("");
  const { toast } = useToast();

  useEffect(() => {
    const fetchInvoices = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (searchTerm) {
            // Backend needs to support searching multiple fields
            // For now, let's assume it searches patient name or invoice number
            params.append("search", searchTerm); // Add a generic search param
        }
        if (statusFilter) {
            params.append("status", statusFilter);
        }
        // TODO: Add date range filters

        const response = await fetch(`/api/invoices?${params.toString()}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch invoices");
        }
        const data: Invoice[] = await response.json();
        setInvoices(data);
      } catch (err: any) {
        setError(err.message);
        toast({
          title: "Error Fetching Invoices",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce search or fetch on filter change
    const debounceTimer = setTimeout(() => {
        fetchInvoices();
    }, 300); // Fetch after 300ms of inactivity

    return () => clearTimeout(debounceTimer);

  }, [toast, searchTerm, statusFilter]);

  const getStatusVariant = (status: InvoiceStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case "Paid": return "default"; // Greenish
        case "PartiallyPaid": return "secondary"; // Yellowish
        case "Overdue": return "destructive"; // Reddish
        case "Draft":
        case "Issued":
        case "Cancelled":
        default: return "outline"; // Greyish
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Billing & Invoices</h1>
          <Link href="/dashboard/billing/new">
             <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Create Invoice
             </Button>
          </Link>
        </div>

        {/* Filters: Search and Status */}
        <div className="flex flex-wrap gap-4 items-center">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search Patient or Invoice #..."
                    className="pl-8 w-full sm:w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            {/* TODO: Replace with Select component */}
            <div>
                <Label htmlFor="status-filter">Status</Label>
                <select
                    id="status-filter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | "")}
                    className="mt-1 block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                    <option value="">All Statuses</option>
                    {Object.values(InvoiceStatus).map(status => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </select>
            </div>
            {/* TODO: Add Date Range Filter */}
        </div>

        {/* Invoices Table */}
        {isLoading && <p>Loading invoices...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}
        {!isLoading && !error && (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length > 0 ? (
                  invoices.map((inv) => {
                    const balance = inv.total_amount - inv.paid_amount;
                    return (
                        <TableRow key={inv.invoice_id}>
                        <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                        <TableCell>{inv.patient?.first_name} {inv.patient?.last_name}</TableCell>
                        <TableCell>{format(new Date(inv.invoice_date), "yyyy-MM-dd")}</TableCell>
                        <TableCell>{inv.due_date ? format(new Date(inv.due_date), "yyyy-MM-dd") : "N/A"}</TableCell>
                        <TableCell>{inv.total_amount.toFixed(2)}</TableCell>
                        <TableCell>{inv.paid_amount.toFixed(2)}</TableCell>
                        <TableCell>{balance.toFixed(2)}</TableCell>
                        <TableCell>
                            <Badge variant={getStatusVariant(inv.status)}>{inv.status}</Badge>
                        </TableCell>
                        <TableCell>
                            <Link href={`/dashboard/billing/${inv.invoice_id}`}>
                            <Button variant="outline" size="sm">View</Button>
                            </Link>
                            {/* Add more actions like Record Payment, Edit (if Draft) */}
                        </TableCell>
                        </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">
                      No invoices found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// Add Label component import if not globally available
import { Label } from "@/components/ui/label";
// Add InvoiceStatus enum if not globally available
// import { InvoiceStatus } from "@/types/billing"; // Already imported

