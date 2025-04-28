// src/app/dashboard/billing/service-items/page.tsx
"use client";

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
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Edit, Search } from "lucide-react";

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

const ServiceItemForm = ({ item, onSubmit, onCancel }) => {
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const { checked } = e.target as HTMLInputElement;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (type === "number") {
      setFormData((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectChange = (name: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error("Form submission error:", error);
      // Optionally show an error message to the user
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="item_code">Item Code</Label>
          <Input id="item_code" name="item_code" value={formData.item_code} onChange={handleChange} required />
        </div>
        <div>
          <Label htmlFor="item_name">Item Name</Label>
          <Input id="item_name" name="item_name" value={formData.item_name} onChange={handleChange} required />
        </div>
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" value={formData.description} onChange={handleChange} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category">Category</Label>
          <Select 
            name="category" 
            value={formData.category} 
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
          <Input id="unit_price" name="unit_price" type="number" step="0.01" min="0" value={formData.unit_price} onChange={handleChange} required />
        </div>
      </div>
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2">
          <Checkbox id="is_taxable" name="is_taxable" checked={formData.is_taxable} onCheckedChange={(checked) => handleSelectChange("is_taxable", checked as boolean)} />
          <Label htmlFor="is_taxable">Taxable</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="is_discountable" name="is_discountable" checked={formData.is_discountable} onCheckedChange={(checked) => handleSelectChange("is_discountable", checked as boolean)} />
          <Label htmlFor="is_discountable">Discountable</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="is_active" name="is_active" checked={formData.is_active} onCheckedChange={(checked) => handleSelectChange("is_active", checked as boolean)} />
          <Label htmlFor="is_active">Active</Label>
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : item ? "Save Changes" : "Create Item"}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default function ServiceItemsPage() {
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceItem | null>(null);

  const fetchServiceItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/billing/service-items");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setServiceItems(data.serviceItems || []);
    } catch (err) {
      console.error("Failed to fetch service items:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServiceItems();
  }, [fetchServiceItems]);

  const handleFormSubmit = async (formData: Partial<ServiceItem>) => {
    const url = editingItem ? `/api/billing/service-items/${editingItem.id}` : "/api/billing/service-items";
    const method = editingItem ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingItem ? "update" : "create"} service item`);
      }
      
      // Refresh list and close modal
      await fetchServiceItems(); 
      setIsModalOpen(false);
      setEditingItem(null);
      // Show success message (optional)

    } catch (err) {
      console.error(`Error ${editingItem ? "updating" : "creating"} service item:`, err);
      setError(err instanceof Error ? err.message : `Failed to ${editingItem ? "update" : "create"} item.`);
      // Re-throw to prevent modal close on error
      throw err; 
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

  const filteredItems = serviceItems.filter(
    (item) =>
      item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <h1 className="text-2xl font-semibold mb-6">Service Items Management</h1>

      <div className="flex justify-between items-center mb-4 gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            type="search"
            placeholder="Search by name, code, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateModal}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Service Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Service Item" : "Create New Service Item"}</DialogTitle>
            </DialogHeader>
            <ServiceItemForm 
              item={editingItem} 
              onSubmit={handleFormSubmit} 
              onCancel={() => setIsModalOpen(false)} 
            />
          </DialogContent>
        </Dialog>
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
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Price (₹)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-10 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">{item.item_code}</TableCell>
                  <TableCell className="font-medium">{item.item_name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell className="text-right">{item.unit_price.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? "success" : "secondary"}>
                      {item.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEditModal(item)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    {/* Add delete button/functionality if needed */}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No service items found matching your criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

