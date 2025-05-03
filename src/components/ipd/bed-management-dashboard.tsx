"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card"; // Assuming Card and CardContent are correctly imported
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table"; // Assuming Table components are correctly imported
import { Badge, BadgeProps } from "@/components/ui/badge"; // FIX: Import BadgeProps
import { Button } from "@/components/ui/button"; // Assuming Button is correctly imported
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Assuming Select components are correctly imported

// Define interfaces
interface Bed {
  id: string;
  bed_number: string;
  room_number?: string | null;
  ward: string;
  category: "general" | "semi-private" | "private" | "icu";
  status: "available" | "occupied" | "reserved" | "maintenance";
  price_per_day: number;
  features?: string | null; // Comma-separated string
  // Add other bed properties if any
}

// FIX: Define type for API error response
interface ApiErrorResponse {
  error?: string;
}

// FIX: Define type for API success response (assuming it returns an array of beds)
type BedsApiResponse = Bed[];

type BedStatus = Bed["status"];
type BedCategory = Bed["category"];

const BedManagementDashboard: React.FC = () => {
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>();
  const [filterWard, setFilterWard] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<BedCategory | "">("");
  const [filterStatus, setFilterStatus] = useState<BedStatus | "">("");

  // Define ward options (example)
  const wardOptions: string[] = [
    "All",
    "General Ward",
    "Semi-Private",
    "Private",
    "Intensive Care",
  ];

  // Define category options
  const categoryOptions: Array<BedCategory | "All"> = [
    "All",
    "general",
    "semi-private",
    "private",
    "icu",
  ];

  // Define status options
  const statusOptions: Array<BedStatus | "All"> = [
    "All",
    "available",
    "occupied",
    "reserved",
    "maintenance",
  ];

  useEffect(() => {
    const fetchBeds = async () => {
      try {
        setLoading(true);
        setError(undefined);

        const parameters = new URLSearchParams();
        // FIX: Rely on falsiness of "" for "All" filter
        if (filterWard) parameters.append("ward", filterWard);
        if (filterCategory) parameters.append("category", filterCategory);
        if (filterStatus) parameters.append("status", filterStatus);

        const response = await fetch(`/api/ipd/beds?${parameters.toString()}`);

        if (!response.ok) {
          let errorMessage = `Failed to fetch beds (status: ${response.status})`;
          try {
            // FIX: Add type for errorData
            const errorData: ApiErrorResponse = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            // Ignore if response is not JSON
          }
          throw new Error(errorMessage);
        }

        // FIX: Use defined type for success response
        const data: BedsApiResponse = await response.json();
        setBeds(Array.isArray(data) ? data : []); // Ensure beds is always an array
      } catch (error_: unknown) {
        // FIX: Use unknown for catch block
        const message =
          error_ instanceof Error
            ? error_.message
            : "An unknown error occurred";
        console.error("Error fetching beds:", error_);
        setError(`Failed to load beds: ${message}`);
        setBeds([]); // Clear beds on error
      } finally {
        setLoading(false);
      }
    };

    fetchBeds();
  }, [filterWard, filterCategory, filterStatus]);

  // Get bed status color variant for Badge
  // FIX: Ensure return type matches BadgeProps["variant"]
  const getBedStatusVariant = (status: BedStatus): BadgeProps["variant"] => {
    switch (status) {
      case "available": {
        // return "success"; // Assuming you have a success variant
        return "default";
      } // FIX: Map to an existing variant, maybe style differently via className
      case "occupied": {
        return "destructive";
      }
      case "reserved": {
        return "secondary";
      }
      case "maintenance": {
        return "outline";
      }
      default: {
        return "default";
      }
    }
  };

  const handleFilterChange = (
    value: string,
    filterType: "ward" | "category" | "status"
  ) => {
    const actualValue = value === "All" ? "" : value;
    switch (filterType) {
      case "ward": {
        setFilterWard(actualValue);

        break;
      }
      case "category": {
        setFilterCategory(actualValue as BedCategory | "");

        break;
      }
      case "status": {
        setFilterStatus(actualValue as BedStatus | "");

        break;
      }
      // No default
    }
  };

  const availableBeds = beds.filter((bed) => bed.status === "available").length;
  const occupiedBeds = beds.filter((bed) => bed.status === "occupied").length;
  const reservedBeds = beds.filter((bed) => bed.status === "reserved").length;
  const maintenanceBeds = beds.filter(
    (bed) => bed.status === "maintenance"
  ).length;

  return (
    <div className="space-y-6 p-4">
      {/* Filter Section */}
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label
            htmlFor="ward-filter"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Ward
          </label>
          <Select
            value={filterWard || "All"}
            onValueChange={(value) => handleFilterChange(value, "ward")}
          >
            <SelectTrigger id="ward-filter" className="w-[180px]">
              <SelectValue placeholder="Select Ward" />
            </SelectTrigger>
            <SelectContent>
              {wardOptions.map((ward) => (
                <SelectItem key={ward} value={ward}>
                  {ward}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label
            htmlFor="category-filter"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Category
          </label>
          <Select
            value={filterCategory || "All"}
            onValueChange={(value) => handleFilterChange(value, "category")}
          >
            <SelectTrigger id="category-filter" className="w-[180px]">
              <SelectValue placeholder="Select Category" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label
            htmlFor="status-filter"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Status
          </label>
          <Select
            value={filterStatus || "All"}
            onValueChange={(value) => handleFilterChange(value, "status")}
          >
            <SelectTrigger id="status-filter" className="w-[180px]">
              <SelectValue placeholder="Select Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{availableBeds}</div>
            <div className="text-sm text-muted-foreground">Available Beds</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{occupiedBeds}</div>
            <div className="text-sm text-muted-foreground">Occupied Beds</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{reservedBeds}</div>
            <div className="text-sm text-muted-foreground">Reserved Beds</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{maintenanceBeds}</div>
            <div className="text-sm text-muted-foreground">
              Under Maintenance
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bed Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 p-4 text-center">{error}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bed No.</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Ward</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Price/Day</TableHead>
                  <TableHead>Features</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {beds.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-24">
                      No beds found matching criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  beds.map((bed) => (
                    <TableRow key={bed.id}>
                      <TableCell className="font-medium">
                        {bed.bed_number}
                      </TableCell>
                      <TableCell>{bed.room_number || "N/A"}</TableCell>
                      <TableCell>{bed.ward}</TableCell>
                      <TableCell className="capitalize">
                        {bed.category}
                      </TableCell>
                      <TableCell>
                        {/* FIX: Add className for potential custom styling of 'available' status */}
                        <Badge
                          variant={getBedStatusVariant(bed.status)}
                          className={`capitalize ${bed.status === "available" ? "text-green-800 bg-green-100 dark:text-green-300 dark:bg-green-900/50" : ""}`}
                        >
                          {bed.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{bed.price_per_day?.toFixed(2) ?? "N/A"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {bed.features
                          ? bed.features.split(",").map((feature) => (
                              <Badge
                                key={feature.trim()}
                                variant="outline"
                                className="mr-1 mb-1 whitespace-nowrap"
                              >
                                {feature.trim()}
                              </Badge>
                            ))
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mr-2 h-8"
                        >
                          View
                        </Button>
                        {bed.status === "available" && (
                          <Button size="sm" variant="default" className="h-8">
                            Assign
                          </Button>
                        )}
                        {/* Add more actions like Edit, Change Status etc. */}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BedManagementDashboard;
