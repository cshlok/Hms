"use client";

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge"; // Import BadgeProps
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Edit, Search } from "lucide-react";

// --- INTERFACES ---
interface ServiceItem {
  id: number;
  item_code: string;
  item_name: string;
  description?: string;
  category: string;
  unit_price: number;
  is_taxable: boolean;
  is_discountable: boolean;
  is_active: boolean;
}

// FIX: Define interface for API response
interface ServiceItemsApiResponse {
  serviceItems: ServiceItem[];
  // Add other potential properties if the API returns more data
}

// FIX: Define interface for error response
interface ErrorResponse {
  error?: string;
  message?: string;
}

// FIX: Define props type for ServiceItemForm
interface ServiceItemFormProperties {
  item: ServiceItem | null; // Item being edited, or null for new item
  onSubmit: (formData: Partial<ServiceItem>) => Promise<void>; // Function to handle form submission
  onCancel: () => void; // Function to handle cancellation
}



// --- ServiceItemForm Component ---
const ServiceItemForm: React.FC<ServiceItemFormProperties> = ({
  item,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState<Partial<ServiceItem>>(
    item || {
      item_code: "",
      item_name: "",
      description: "",
      category: "",
      unit_price: 0,
      is_taxable: true,
      is_discountable: true,
      is_active: true,
    }
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form data based on item prop when it changes (for editing)
  useEffect(() => {
    if (item) {
      setFormData(item);
    } else {
      // Reset form for creating new item
      setFormData({
        item_code: "",
        item_name: "",
        description: "",
        category: "",
        unit_price: 0,
        is_taxable: true,
        is_discountable: true,
        is_active: true,
      });
    }
  }, [item]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = event.target;
    if (type === "checkbox") {
      const { checked } = event.target as HTMLInputElement;
      setFormData((previous) => ({ ...previous, [name]: checked }));
    } else if (type === "number") {
      setFormData((previous) => ({
        ...previous,
        [name]: Number.parseFloat(value) || 0,
      }));
    } else {
      setFormData((previous) => ({ ...previous, [name]: value }));
    }
  };

  const handleSelectChange = (name: string, value: string | boolean) => {
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      // If onSubmit is successful, the modal will be closed by the parent component
    } catch (error) {
      console.error("Form submission error:", error);
      // Error is handled in the parent component (handleFormSubmit)
      // Keep the modal open by not calling onCancel here
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {" "}
        {/* Responsive grid */}
        <div>
          <Label htmlFor="item_code">Item Code</Label>
          <Input
            id="item_code"
            name="item_code"
            value={formData.item_code || ""}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <Label htmlFor="item_name">Item Name</Label>
          <Input
            id="item_name"
            name="item_name"
            value={formData.item_name || ""}
            onChange={handleChange}
            required
          />
        </div>
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          name="description"
          value={formData.description || ""}
          onChange={handleChange}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {" "}
        {/* Responsive grid */}
        <div>
          <Label htmlFor="category">Category</Label>
          <Select
            name="category"
            value={formData.category || ""}
            onValueChange={(value) => handleSelectChange("category", value)}
            required
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Consultation">Consultation</SelectItem>
              <SelectItem value="Laboratory">Laboratory</SelectItem>
              <SelectItem value="Radiology">Radiology</SelectItem>
              <SelectItem value="Procedure">Procedure</SelectItem>
              <SelectItem value="Medication">Medication</SelectItem>
              <SelectItem value="Room Charges">Room Charges</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="unit_price">Unit Price (₹)</Label>
          <Input
            id="unit_price"
            name="unit_price"
            type="number"
            step="0.01"
            min="0"
            value={formData.unit_price || 0}
            onChange={handleChange}
            required
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        {" "}
        {/* Responsive flex wrap */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_taxable"
            name="is_taxable"
            checked={formData.is_taxable}
            onCheckedChange={(checked) =>
              handleSelectChange("is_taxable", checked as boolean)
            }
          />
          <Label htmlFor="is_taxable">Taxable</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_discountable"
            name="is_discountable"
            checked={formData.is_discountable}
            onCheckedChange={(checked) =>
              handleSelectChange("is_discountable", checked as boolean)
            }
          />
          <Label htmlFor="is_discountable">Discountable</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_active"
            name="is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) =>
              handleSelectChange("is_active", checked as boolean)
            }
          />
          <Label htmlFor="is_active">Active</Label>
        </div>
      </div>
      <DialogFooter className="mt-6">
        {" "}
        {/* Added margin top */}
        <DialogClose asChild>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : item ? "Save Changes" : "Create Item"}
        </Button>
      </DialogFooter>
    </form>
  );
};

// --- Main Page Component ---
export default function ServiceItemsPage() {
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceItem | null>(null);

  const fetchServiceItems = useCallback(async () => {
    setIsLoading(true);
    setError(null); // Clear previous errors before fetching
    try {
      const response = await fetch("/api/billing/service-items");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // FIX: Cast response JSON to defined type
      const data = (await response.json()) as ServiceItemsApiResponse;
      // FIX: Ensure data.serviceItems is an array
      setServiceItems(
        Array.isArray(data?.serviceItems) ? data.serviceItems : []
      );
    } catch (error_) {
      console.error("Failed to fetch service items:", error_);
      setError(
        error_ instanceof Error ? error_.message : "An unknown error occurred"
      );
      setServiceItems([]); // Clear items on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServiceItems();
  }, [fetchServiceItems]);

  const handleFormSubmit = async (formData: Partial<ServiceItem>) => {
    const url = editingItem
      ? `/api/billing/service-items/${editingItem.id}`
      : "/api/billing/service-items";
    const method = editingItem ? "PUT" : "POST";
    setError(null); // Clear previous errors

    try {
      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        let errorMessage = `Failed to ${editingItem ? "update" : "create"} service item`;
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

      // Refresh list and close modal on success
      await fetchServiceItems();
      setIsModalOpen(false);
      setEditingItem(null);
      // Consider showing a success toast message here
    } catch (error) {
      console.error(
        `Error ${editingItem ? "updating" : "creating"} service item:`,
        error
      );
      const message =
        error instanceof Error
          ? error.message
          : `An unknown error occurred while ${editingItem ? "updating" : "creating"} the item.`;
      setError(message);
      // Re-throw to indicate failure to the form component if needed, or handle error display here
      throw error;
    }
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: ServiceItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  // Filter items based on search term
  const filteredItems = serviceItems.filter((item) => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      item.item_name.toLowerCase().includes(searchTermLower) ||
      item.item_code.toLowerCase().includes(searchTermLower) ||
      item.category.toLowerCase().includes(searchTermLower)
    );
  });

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      {" "}
      {/* Added lg:px-8 */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        {" "}
        {/* Responsive layout */}
        <h1 className="text-2xl font-semibold">Service Items Management</h1>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateModal} className="w-full sm:w-auto">
              {" "}
              {/* Full width on small screens */}
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Service Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Edit Service Item" : "Create New Service Item"}
              </DialogTitle>
            </DialogHeader>
            {/* Pass error state down if needed, or display globally */}
            <ServiceItemForm
              item={editingItem}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setIsModalOpen(false);
                setError(null);
              }} // Clear error on cancel
            />
          </DialogContent>
        </Dialog>
      </div>
      <div className="mb-4">
        <div className="relative w-full max-w-md">
          {" "}
          {/* Adjusted max-width */}
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, code, or category..."
            value={searchTerm}
            onChange={(_event_) => setSearchTerm(_event_.target.value)}
            className="pl-10" // Increased padding for icon
          />
        </div>
      </div>
      {error && (
        <div className="mb-4 text-red-700 border border-red-300 bg-red-50 p-3 rounded-md">
          {" "}
          {/* Adjusted colors */}
          Error: {error}
        </div>
      )}
      <div className="rounded-md border overflow-x-auto">
        {" "}
        {/* Added overflow-x-auto */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[100px]">Code</TableHead>{" "}
              {/* Added min-width */}
              <TableHead className="min-w-[200px]">Name</TableHead>{" "}
              {/* Added min-width */}
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Price (₹)</TableHead>
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
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </TableCell>{" "}
                  {/* Rounded skeleton for badge */}
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-10 ml-auto rounded" />
                  </TableCell>{" "}
                  {/* Rounded skeleton for button */}
                </TableRow>
              )))
            ) : filteredItems.length > 0 ? (
              // Service Item Data Rows
              (filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">
                    {item.item_code}
                  </TableCell>
                  <TableCell className="font-medium">
                    {item.item_name}
                  </TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell className="text-right">
                    {item.unit_price.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? "default" : "secondary"}>
                      {item.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditModal(item)}
                      title="Edit Item"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )))
            ) : (
              // No Items Found Row
              (<TableRow>
                <TableCell
                  colSpan={6} // Adjusted colSpan
                  className="h-24 text-center text-muted-foreground"
                >
                  {searchTerm
                    ? `No service items found matching "${searchTerm}".`
                    : "No service items available. Click \"Add New\" to create one."}
                </TableCell>
              </TableRow>)
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

