// src/app/dashboard/billing/create-invoice/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { X, Plus, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils"; // Assuming you have this utility

interface Patient {
  id: number;
  name: string;
  mrn: string;
}

interface ServiceItem {
  id: number;
  item_code: string;
  item_name: string;
  category: string;
  unit_price: number;
}

interface InvoiceItem extends ServiceItem {
  quantity: number;
  subtotal: number;
}

export default function CreateInvoicePage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [isPatientPopoverOpen, setIsPatientPopoverOpen] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(false);

  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);
  const [selectedServiceItem, setSelectedServiceItem] = useState<ServiceItem | null>(null);
  const [serviceSearchTerm, setServiceSearchTerm] = useState("");
  const [isServicePopoverOpen, setIsServicePopoverOpen] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);

  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Patients (Placeholder)
  const fetchPatients = useCallback(async (search: string) => {
    setLoadingPatients(true);
    try {
      // Replace with actual API call: /api/patients?search=...
      console.log("Simulating fetch patients with search:", search);
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
      const mockPatients: Patient[] = [
        { id: 101, name: "Alice Smith", mrn: "MRN00101" },
        { id: 102, name: "Bob Johnson", mrn: "MRN00102" },
        { id: 103, name: "Charlie Brown", mrn: "MRN00103" },
      ].filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) || 
        p.mrn.toLowerCase().includes(search.toLowerCase())
      );
      setPatients(mockPatients);
    } catch (err) {
      console.error("Failed to fetch patients:", err);
      // Handle error display
    } finally {
      setLoadingPatients(false);
    }
  }, []);

  // Fetch Service Items
  const fetchServiceItems = useCallback(async (search: string) => {
    setLoadingServices(true);
    try {
      const response = await fetch(`/api/billing/service-items?search=${search}`);
      if (!response.ok) throw new Error("Failed to fetch service items");
      const data = await response.json();
      setServiceItems(data.serviceItems || []);
    } catch (err) {
      console.error("Failed to fetch service items:", err);
      // Handle error display
    } finally {
      setLoadingServices(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (patientSearchTerm) fetchPatients(patientSearchTerm);
      else setPatients([]); // Clear if search is empty
    }, 300); // Debounce time
    return () => clearTimeout(handler);
  }, [patientSearchTerm, fetchPatients]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (serviceSearchTerm) fetchServiceItems(serviceSearchTerm);
      else setServiceItems([]); // Clear if search is empty
    }, 300); // Debounce time
    return () => clearTimeout(handler);
  }, [serviceSearchTerm, fetchServiceItems]);

  // Add item to invoice
  const addInvoiceItem = (item: ServiceItem) => {
    if (!item) return;
    const existingItemIndex = invoiceItems.findIndex(invItem => invItem.id === item.id);
    
    if (existingItemIndex > -1) {
      // Increment quantity if item already exists
      const updatedItems = [...invoiceItems];
      updatedItems[existingItemIndex].quantity += 1;
      updatedItems[existingItemIndex].subtotal = updatedItems[existingItemIndex].quantity * updatedItems[existingItemIndex].unit_price;
      setInvoiceItems(updatedItems);
    } else {
      // Add new item
      setInvoiceItems([...invoiceItems, { ...item, quantity: 1, subtotal: item.unit_price }]);
    }
    setSelectedServiceItem(null); // Reset selection
    setServiceSearchTerm(""); // Clear search
    setServiceItems([]); // Clear results
  };

  // Update item quantity
  const updateItemQuantity = (itemId: number, quantity: number) => {
    const updatedItems = invoiceItems.map(item => {
      if (item.id === itemId) {
        const newQuantity = Math.max(1, quantity); // Ensure quantity is at least 1
        return { ...item, quantity: newQuantity, subtotal: newQuantity * item.unit_price };
      }
      return item;
    });
    setInvoiceItems(updatedItems);
  };

  // Remove item from invoice
  const removeInvoiceItem = (itemId: number) => {
    setInvoiceItems(invoiceItems.filter(item => item.id !== itemId));
  };

  // Calculate total whenever items change
  useEffect(() => {
    const total = invoiceItems.reduce((sum, item) => sum + item.subtotal, 0);
    setInvoiceTotal(total);
  }, [invoiceItems]);

  // Handle Invoice Submission
  const handleCreateInvoice = async () => {
    if (!selectedPatient || invoiceItems.length === 0) {
      setError("Please select a patient and add at least one item.");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const invoiceData = {
        patient_id: selectedPatient.id,
        items: invoiceItems.map(item => ({
          service_item_id: item.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
          // Add discount/tax details here if needed
        })),
        total_amount: invoiceTotal,
        // Add other invoice details like due_date, notes etc.
      };
      
      const response = await fetch("/api/billing/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoiceData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create invoice");
      }
      
      const result = await response.json();
      console.log("Invoice created:", result);
      // Redirect to the newly created invoice page or invoice list
      router.push(`/dashboard/billing/invoices/${result.invoice.id || 
'new'}`); // Adjust URL as needed
      
    } catch (err) {
      console.error("Error creating invoice:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred during submission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 space-y-6">
      <h1 className="text-2xl font-semibold">Create New Invoice</h1>

      {error && (
        <div className="mb-4 text-red-600 border border-red-600 p-3 rounded-md">
          Error: {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Patient Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="patient-search">Select Patient</Label>
          <Popover open={isPatientPopoverOpen} onOpenChange={setIsPatientPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={isPatientPopoverOpen}
                className="w-full justify-between mt-1"
                disabled={!!selectedPatient} // Disable if patient already selected
              >
                {selectedPatient
                  ? `${selectedPatient.name} (${selectedPatient.mrn})`
                  : "Select patient..."}
                {selectedPatient ? (
                  <X className="ml-2 h-4 w-4 shrink-0 opacity-50" onClick={(e) => { e.stopPropagation(); setSelectedPatient(null); }} />
                ) : (
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
              <Command shouldFilter={false}> {/* Disable default filtering */}
                <CommandInput 
                  placeholder="Search patient by name or MRN..." 
                  value={patientSearchTerm}
                  onValueChange={setPatientSearchTerm}
                />
                <CommandList>
                  {loadingPatients && <div className="p-2 text-center text-sm">Loading...</div>}
                  <CommandEmpty>{!loadingPatients && "No patient found."}</CommandEmpty>
                  <CommandGroup>
                    {patients.map((patient) => (
                      <CommandItem
                        key={patient.id}
                        value={`${patient.name} ${patient.mrn}`}
                        onSelect={() => {
                          setSelectedPatient(patient);
                          setIsPatientPopoverOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedPatient?.id === patient.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {patient.name} ({patient.mrn})
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Service Item */}
          <div className="flex gap-2 items-end">
            <div className="flex-grow">
              <Label htmlFor="service-search">Add Service/Item</Label>
              <Popover open={isServicePopoverOpen} onOpenChange={setIsServicePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isServicePopoverOpen}
                    className="w-full justify-between mt-1"
                  >
                    {selectedServiceItem
                      ? `${selectedServiceItem.item_name} (${selectedServiceItem.item_code})`
                      : "Search service or item..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command shouldFilter={false}>
                    <CommandInput 
                      placeholder="Search by name or code..." 
                      value={serviceSearchTerm}
                      onValueChange={setServiceSearchTerm}
                    />
                    <CommandList>
                      {loadingServices && <div className="p-2 text-center text-sm">Loading...</div>}
                      <CommandEmpty>{!loadingServices && "No service/item found."}</CommandEmpty>
                      <CommandGroup>
                        {serviceItems.map((item) => (
                          <CommandItem
                            key={item.id}
                            value={`${item.item_name} ${item.item_code}`}
                            onSelect={() => {
                              setSelectedServiceItem(item);
                              setIsServicePopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedServiceItem?.id === item.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {item.item_name} ({item.item_code}) - ₹{item.unit_price.toFixed(2)}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <Button onClick={() => addInvoiceItem(selectedServiceItem)} disabled={!selectedServiceItem}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>

          {/* Items Table */}
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Item</TableHead>
                  <TableHead className="w-[15%]">Category</TableHead>
                  <TableHead className="w-[15%] text-right">Unit Price (₹)</TableHead>
                  <TableHead className="w-[15%] text-center">Quantity</TableHead>
                  <TableHead className="w-[15%] text-right">Subtotal (₹)</TableHead>
                  <TableHead className="w-[5%]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoiceItems.length > 0 ? (
                  invoiceItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.item_name} ({item.item_code})</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell className="text-right">{item.unit_price.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <Input 
                          type="number" 
                          min="1" 
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                          className="w-16 h-8 text-center"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">{item.subtotal.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeInvoiceItem(item.id)}>
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No items added to the invoice yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end items-center gap-4 pt-4 border-t">
          <div className="text-right">
            {/* Add Discount/Tax fields here if needed */}
            <div className="text-xl font-semibold">Total Amount: ₹{invoiceTotal.toFixed(2)}</div>
          </div>
          <Button 
            size="lg" 
            onClick={handleCreateInvoice} 
            disabled={isSubmitting || !selectedPatient || invoiceItems.length === 0}
          >
            {isSubmitting ? "Creating Invoice..." : "Create Invoice"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

