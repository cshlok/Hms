// src/app/dashboard/inventory/page.tsx
"use client";
export const dynamic = 'force-dynamic';

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
import { InventoryItem } from "@/types/inventory";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

export default function InventoryPage() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const fetchInventoryItems = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (searchTerm) {
            params.append("name", searchTerm);
        }
        // TODO: Add category filter if needed

        const response = await fetch(`/api/inventory-items?${params.toString()}`);
        if (!response.ok) {
          const errorData: { error?: string } = await response.json();
          throw new Error(errorData.error || "Failed to fetch inventory items");
        }
        const data: InventoryItem[] = await response.json();
        setInventoryItems(data);
      } catch (err: unknown) { // Use unknown
        const message = err instanceof Error ? err.message : "An unknown error occurred";
        setError(message);
        toast({
          title: "Error Fetching Inventory",
          description: message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce search or fetch on button click if preferred
    const debounceTimer = setTimeout(() => {
        fetchInventoryItems();
    }, 300); // Fetch after 300ms of inactivity

    return () => clearTimeout(debounceTimer);

  }, [toast, searchTerm]);

  const getStockStatus = (item: InventoryItem): { text: string; variant: "default" | "secondary" | "destructive" | "outline" } => {
    const stock = item.current_stock ?? 0;
    const reorderLevel = item.reorder_level ?? 0;
    if (stock <= 0) {
        return { text: "Out of Stock", variant: "destructive" };
    }
    if (reorderLevel > 0 && stock <= reorderLevel) {
        return { text: "Low Stock", variant: "secondary" }; // Use secondary (yellowish) for low stock
    }
    return { text: "In Stock", variant: "default" }; // Use default (greenish) for in stock
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Inventory Management</h1>
          <Link href="/dashboard/inventory/new">
             <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Item
             </Button>
          </Link>
        </div>

        {/* Filters: Search */}
        <div className="flex flex-wrap gap-4 items-center">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search by Item Name..."
                    className="pl-8 w-full sm:w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            {/* TODO: Add Category Filter Dropdown */}
        </div>

        {/* Inventory Table */}
        {isLoading && <p>Loading inventory...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}
        {!isLoading && !error && (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Reorder Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryItems.length > 0 ? (
                  inventoryItems.map((item) => {
                    const status = getStockStatus(item);
                    return (
                        <TableRow key={item.inventory_item_id}>
                        <TableCell className="font-medium">{item.item_name}</TableCell>
                        <TableCell>{item.category || "N/A"}</TableCell>
                        <TableCell>{item.current_stock ?? 0}</TableCell>
                        <TableCell>{item.unit_of_measure || "N/A"}</TableCell>
                        <TableCell>{item.reorder_level}</TableCell>
                        <TableCell>
                            <Badge variant={status.variant}>{status.text}</Badge>
                        </TableCell>
                        <TableCell>
                            {/* Add action buttons like View Details, Add Stock */}
                            <Link href={`/dashboard/inventory/${item.inventory_item_id}`}>
                            <Button variant="outline" size="sm" className="mr-2">View</Button>
                            </Link>
                            <Link href={`/dashboard/inventory/${item.inventory_item_id}/batches/new`}>
                                <Button variant="outline" size="sm">Add Stock</Button>
                            </Link>
                        </TableCell>
                        </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      No inventory items found.
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

