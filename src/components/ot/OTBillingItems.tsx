"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { Calculator } from "lucide-react";

// This component integrates OT module with Billing module
// It shows surgery-related billing items for a patient

interface OTBillingItemsProps {
  patientId: string;
  invoiceId?: string; // Optional: if creating/editing a specific invoice
  onAddToBill?: (items: any[]) => void; // Callback for adding selected items to bill
  readOnly?: boolean; // If true, just displays items without selection capability
}

export default function OTBillingItems({ patientId, invoiceId, onAddToBill, readOnly = false }: OTBillingItemsProps) {
  const [billingItems, setBillingItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOTBillingItems = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Replace with actual API call
        // const response = await fetch(`/api/ot/billing-items?patientId=${patientId}${invoiceId ? `&invoiceId=${invoiceId}` : ''}`);
        // if (!response.ok) {
        //   throw new Error("Failed to fetch OT billing items");
        // }
        // const data = await response.json();
        // setBillingItems(data);

        // Mock data for demonstration
        const mockData = [
          {
            id: "bill-item-1",
            date: "2025-04-28T09:00:00Z",
            description: "Appendectomy - Surgical Procedure",
            category: "Surgery",
            amount: 25000,
            status: "unbilled",
            surgery_id: "booking-1"
          },
          {
            id: "bill-item-2",
            date: "2025-04-28T09:00:00Z",
            description: "Operation Theatre Charges (OT-1)",
            category: "Facility",
            amount: 10000,
            status: "unbilled",
            surgery_id: "booking-1"
          },
          {
            id: "bill-item-3",
            date: "2025-04-28T09:00:00Z",
            description: "Anesthesia Charges",
            category: "Anesthesia",
            amount: 8000,
            status: "unbilled",
            surgery_id: "booking-1"
          },
          {
            id: "bill-item-4",
            date: "2025-04-28T09:00:00Z",
            description: "Surgical Consumables",
            category: "Consumables",
            amount: 5000,
            status: "billed",
            surgery_id: "booking-1",
            invoice_id: "INV-001"
          }
        ];
        setBillingItems(mockData);

        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    if (patientId) {
      fetchOTBillingItems();
    }
  }, [patientId, invoiceId]);

  const handleSelectItem = (itemId: string) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  const handleAddToBill = () => {
    if (onAddToBill && selectedItems.length > 0) {
      const itemsToAdd = billingItems.filter((item: any) => selectedItems.includes(item.id));
      onAddToBill(itemsToAdd);
      // Reset selection after adding
      setSelectedItems([]);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "billed": return <Badge className="bg-green-100 text-green-800">Billed</Badge>;
      case "unbilled": return <Badge variant="secondary">Unbilled</Badge>;
      case "cancelled": return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <Calculator className="mr-2 h-5 w-5" />
          Operation Theatre Charges
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <div>Loading billing items...</div>}
        {error && <div className="text-red-500">Error: {error}</div>}
        {!loading && !error && billingItems.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            No operation theatre charges found for this patient.
          </div>
        )}
        {!loading && !error && billingItems.length > 0 && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  {!readOnly && <TableHead className="w-[50px]"></TableHead>}
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingItems.map((item: any) => (
                  <TableRow key={item.id}>
                    {!readOnly && (
                      <TableCell>
                        <input 
                          type="checkbox" 
                          checked={selectedItems.includes(item.id)} 
                          onChange={() => handleSelectItem(item.id)}
                          disabled={item.status !== 'unbilled'}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </TableCell>
                    )}
                    <TableCell>{format(new Date(item.date), 'dd MMM yyyy')}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.amount)}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {!readOnly && onAddToBill && (
              <div className="mt-4 flex justify-between items-center">
                <div>
                  {selectedItems.length > 0 ? (
                    <span className="text-sm">
                      {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Select items to add to bill
                    </span>
                  )}
                </div>
                <Button 
                  onClick={handleAddToBill} 
                  disabled={selectedItems.length === 0}
                >
                  Add to Bill
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
