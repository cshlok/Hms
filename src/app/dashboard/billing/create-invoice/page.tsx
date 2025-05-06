"use client";

// export const dynamic = 'force-dynamic'; // Removed this line

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
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
import {} from // Select,
// SelectContent,
// SelectItem,
// SelectTrigger,
// SelectValue,
"@/components/ui/select";
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
  PopoverTrigger,
} from "@/components/ui/popover";
// import { Skeleton } from "@/components/ui/skeleton";
import { X, Check, ChevronsUpDown } from "lucide-react"; // Removed Plus
import { cn } from "@/lib/utils"; // Assuming you have this utility

// --- INTERFACES ---
interface Patient {
  id: number;
  name: string; // Combined first/last or display name
  mrn: string;
  first_name?: string; // Optional if 'name' is primary display
  last_name?: string; // Optional if 'name' is primary display
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

// --- API Response Interfaces ---
interface PatientsApiResponse {
  patients: Patient[];
  // Add other potential properties if known
}

interface ServiceItemsApiResponse {
  serviceItems: ServiceItem[];
  // Add other potential properties if known
}

interface ErrorResponse {
  error?: string;
  message?: string; // Common alternative
  // Add other potential properties
}

// --- COMPONENT ---
export default function CreateInvoicePage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>();
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [isPatientPopoverOpen, setIsPatientPopoverOpen] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(false);

  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);
  const [selectedServiceItem, setSelectedServiceItem] =
    useState<ServiceItem | null>();
  const [serviceSearchTerm, setServiceSearchTerm] = useState("");
  const [isServicePopoverOpen, setIsServicePopoverOpen] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);

  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>();

  // Fetch Patients from real API
  const fetchPatients = useCallback(async (search: string) => {
    setLoadingPatients(true);
    setError(undefined); // Clear previous errors
    try {
      const response = await fetch(
        `/api/patients?search=${encodeURIComponent(search)}`
      );
      if (!response.ok) throw new Error("Failed to fetch patients");
      // FIX: Cast response JSON to defined type
      const data = (await response.json()) as PatientsApiResponse;
      // Ensure data.patients is an array before setting state
      setPatients(Array.isArray(data?.patients) ? data.patients : []);
    } catch (error_) {
      console.error("Failed to fetch patients:", error_);
      setError(
        error_ instanceof Error ? error_.message : "Failed to fetch patients"
      );
      setPatients([]); // Clear patients on error
    } finally {
      setLoadingPatients(false);
    }
  }, []);

  // Fetch Service Items
  const fetchServiceItems = useCallback(async (search: string) => {
    setLoadingServices(true);
    setError(undefined); // Clear previous errors
    try {
      const response = await fetch(
        `/api/billing/service-items?search=${encodeURIComponent(search)}`
      );
      if (!response.ok) throw new Error("Failed to fetch service items");
      // FIX: Cast response JSON to defined type
      const data = (await response.json()) as ServiceItemsApiResponse;
      // Ensure data.serviceItems is an array before setting state
      setServiceItems(
        Array.isArray(data?.serviceItems) ? data.serviceItems : []
      );
    } catch (error_) {
      console.error("Failed to fetch service items:", error_);
      setError(
        error_ instanceof Error
          ? error_.message
          : "Failed to fetch service items"
      );
      setServiceItems([]); // Clear service items on error
    } finally {
      setLoadingServices(false);
    }
  }, []);

  // Debounce search for patients
  useEffect(() => {
    const handler = setTimeout(() => {
      if (patientSearchTerm.trim()) {
        // Only search if term is not empty
        fetchPatients(patientSearchTerm);
      } else {
        setPatients([]); // Clear if search is empty or just whitespace
      }
    }, 300); // Debounce time
    return () => clearTimeout(handler);
  }, [patientSearchTerm, fetchPatients]);

  // Debounce search for service items
  useEffect(() => {
    const handler = setTimeout(() => {
      if (serviceSearchTerm.trim()) {
        // Only search if term is not empty
        fetchServiceItems(serviceSearchTerm);
      } else {
        setServiceItems([]); // Clear if search is empty or just whitespace
      }
    }, 300); // Debounce time
    return () => clearTimeout(handler);
  }, [serviceSearchTerm, fetchServiceItems]);

  // Add item to invoice
  const addInvoiceItem = (item: ServiceItem) => {
    // The check `if (!item) return;` was already here, handling the null case.
    if (!item) return;
    const existingItemIndex = invoiceItems.findIndex(
      (invItem) => invItem.id === item.id
    );

    if (existingItemIndex === -1) {
      // Add new item
      setInvoiceItems([
        ...invoiceItems,
        { ...item, quantity: 1, subtotal: item.unit_price },
      ]);
    } else {
      // Increment quantity if item already exists
      const updatedItems = [...invoiceItems];
      updatedItems[existingItemIndex].quantity += 1;
      updatedItems[existingItemIndex].subtotal =
        updatedItems[existingItemIndex].quantity *
        updatedItems[existingItemIndex].unit_price;
      setInvoiceItems(updatedItems);
    }
    setSelectedServiceItem(undefined); // Reset selection
    setServiceSearchTerm(""); // Clear search
    setServiceItems([]); // Clear results
  };

  // Update item quantity
  const updateItemQuantity = (itemId: number, quantity: number) => {
    const updatedItems = invoiceItems.map((item) => {
      if (item.id === itemId) {
        const newQuantity = Math.max(1, quantity); // Ensure quantity is at least 1
        return {
          ...item,
          quantity: newQuantity,
          subtotal: newQuantity * item.unit_price,
        };
      }
      return item;
    });
    setInvoiceItems(updatedItems);
  };

  // Remove item from invoice
  const removeInvoiceItem = (itemId: number) => {
    setInvoiceItems(invoiceItems.filter((item) => item.id !== itemId));
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
    setError(undefined);

    try {
      const invoiceData = {
        patient_id: selectedPatient.id,
        items: invoiceItems.map((item) => ({
          service_item_id: item.id,
          item_name: item.item_name, // Consider if description should be different
          description: item.item_name, // Using item_name as description for now
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
        })),
        total_amount: invoiceTotal,
        status: "pending", // Assuming a default status
      };

      const response = await fetch("/api/billing/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoiceData),
      });

      if (!response.ok) {
        let errorMessage = "Failed to create invoice";
        try {
          // FIX: Cast error response JSON to defined type
          const errorData = (await response.json()) as ErrorResponse;
          errorMessage =
            errorData?.error ||
            errorData?.message ||
            `HTTP error! status: ${response.status}`;
        } catch {
          // Handle cases where response is not JSON or empty
          errorMessage = `HTTP error! status: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json(); // Assuming success response has data, define interface if needed
      console.log("Invoice created:", result);
      // Consider showing a success toast message here
      router.push("/dashboard/billing/invoices"); // Redirect to invoices list
    } catch (error_) {
      console.error("Error creating invoice:", error_);
      setError(
        error_ instanceof Error
          ? error_.message
          : "An unknown error occurred during submission."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- JSX ---
  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 space-y-6">
      {" "}
      {/* Added lg:px-8 */}
      <div className="flex justify-between items-center mb-4">
        {" "}
        {/* Added mb-4 */}
        <h1 className="text-2xl font-semibold">Create New Invoice</h1>
        <Button variant="outline" onClick={() => router.back()}>
          Back to Billing
        </Button>{" "}
        {/* Changed Cancel text */}
      </div>
      {error && (
        <div className="mb-4 text-red-600 border border-red-600 bg-red-50 p-3 rounded-md">
          {" "}
          {/* Added bg-red-50 */}
          Error: {error}
        </div>
      )}
      {/* Patient Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle>Patient Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="patient-search">Select Patient</Label>
          <Popover
            open={isPatientPopoverOpen}
            onOpenChange={setIsPatientPopoverOpen}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={isPatientPopoverOpen}
                className="w-full justify-between mt-1"
                disabled={!!selectedPatient} // Disable if patient already selected
              >
                {selectedPatient
                  ? `${selectedPatient.name} (MRN: ${selectedPatient.mrn})` // Added MRN label
                  : "Select patient..."}
                {selectedPatient ? (
                  (<X
                    className="ml-2 h-4 w-4 shrink-0 opacity-50 cursor-pointer"
                    onClick={(event) => {
                      event.stopPropagation(); // Use the correct event variable
                      setSelectedPatient(undefined);
                      setPatientSearchTerm("");
                    }}
                  />) // Added cursor-pointer and clear search term
                ) : (
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
              <Command shouldFilter={false}>
                {" "}
                {/* Disable default filtering, handled by API */}
                <CommandInput
                  placeholder="Search patient by name or MRN..."
                  value={patientSearchTerm}
                  onValueChange={setPatientSearchTerm} // Let useEffect handle debounced fetching
                />
                <CommandList>
                  {loadingPatients && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Loading patients...
                    </div>
                  )}{" "}
                  {/* Improved loading state */}
                  {!loadingPatients &&
                    patients.length === 0 &&
                    patientSearchTerm && (
                      <CommandEmpty>
                        No patient found matching &quot;{patientSearchTerm}
                        &quot;.
                      </CommandEmpty>
                    )}
                  {!loadingPatients &&
                    patients.length === 0 &&
                    !patientSearchTerm && (
                      <CommandEmpty>Type to search for patients.</CommandEmpty>
                    )}
                  {!loadingPatients && patients.length > 0 && (
                    <CommandGroup heading="Search Results">
                      {" "}
                      {/* Added heading */}
                      {patients.map((patient) => (
                        <CommandItem
                          key={patient.id}
                          value={`${patient.name} ${patient.mrn}`} // Value used for potential filtering if enabled later
                          onSelect={() => {
                            setSelectedPatient(patient);
                            setIsPatientPopoverOpen(false);
                            setPatientSearchTerm(""); // Clear search after selection
                          }}
                          className="cursor-pointer" // Added cursor
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedPatient?.id === patient.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {patient.name} (MRN: {patient.mrn})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>
      {/* Invoice Items Card */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Service Item */}
          <div className="flex flex-col sm:flex-row gap-2 items-end">
            {" "}
            {/* Responsive layout */}
            <div className="flex-grow w-full sm:w-auto">
              {" "}
              {/* Full width on small screens */}
              <Label htmlFor="service-search">Add Service/Item</Label>
              <Popover
                open={isServicePopoverOpen}
                onOpenChange={setIsServicePopoverOpen}
              >
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
                      placeholder="Search service by name or code..."
                      value={serviceSearchTerm}
                      onValueChange={setServiceSearchTerm}
                    />
                    <CommandList>
                      {loadingServices && (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          Loading services...
                        </div>
                      )}
                      {!loadingServices &&
                        serviceItems.length === 0 &&
                        serviceSearchTerm && (
                          <CommandEmpty>
                            No service found matching &quot;{serviceSearchTerm}
                            &quot;.
                          </CommandEmpty>
                        )}
                      {!loadingServices &&
                        serviceItems.length === 0 &&
                        !serviceSearchTerm && (
                          <CommandEmpty>Type to search for services.</CommandEmpty>
                        )}
                      {!loadingServices && serviceItems.length > 0 && (
                        <CommandGroup heading="Search Results">
                          {serviceItems.map((service) => (
                            <CommandItem
                              key={service.id}
                              value={`${service.item_name} ${service.item_code}`}
                              onSelect={() => {
                                // setSelectedServiceItem(service); // Don't set here, add directly
                                addInvoiceItem(service);
                                setIsServicePopoverOpen(false);
                                setServiceSearchTerm(""); // Clear search
                              }}
                              className="cursor-pointer"
                            >
                              {/* No checkmark needed here as we add directly */}
                              {service.item_name} ({service.item_code}) - {service.unit_price}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            {/* <Button onClick={() => addInvoiceItem(selectedServiceItem)} className="mt-1 sm:mt-0">Add Item</Button> */}
          </div>

          {/* Added Items Table */}
          {invoiceItems.length > 0 && (
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="w-24 text-center">Quantity</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoiceItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.item_name}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell className="text-right">
                        {item.unit_price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItemQuantity(item.id, parseInt(e.target.value, 10) || 1)
                          }
                          className="w-20 text-center mx-auto"
                          min="1"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {item.subtotal.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeInvoiceItem(item.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-end space-y-2">
          <div className="text-xl font-semibold">
            Total: {invoiceTotal.toFixed(2)}
          </div>
          <Button
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

