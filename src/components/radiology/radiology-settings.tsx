"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Plus } from "lucide-react";
import CreateProcedureTypeModal, {
  ProcedureTypeFormData,
} from "./create-procedure-type-modal"; // Assuming modal exports form data type
import CreateModalityModal, { ModalityFormData } from "./create-modality-modal"; // Assuming modal exports form data type

// Define interfaces
interface ProcedureType {
  id: string;
  name: string;
  modality_type?: string | null;
  description?: string | null;
  // Add other fields if available from API
}

interface Modality {
  id: string;
  name: string;
  location?: string | null;
  description?: string | null;
  // Add other fields if available from API
}

export default function RadiologySettings() {
  const [procedureTypes, setProcedureTypes] = useState<ProcedureType[]>([]);
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [loadingProcedures, setLoadingProcedures] = useState<boolean>(true);
  const [loadingModalities, setLoadingModalities] = useState<boolean>(true);
  const [errorProcedures, setErrorProcedures] = useState<string | null>();
  const [errorModalities, setErrorModalities] = useState<string | null>();
  const [showCreateProcedureModal, setShowCreateProcedureModal] =
    useState<boolean>(false);
  const [showCreateModalityModal, setShowCreateModalityModal] =
    useState<boolean>(false);

  useEffect(() => {
    fetchProcedureTypes();
    fetchModalities();
  }, []);

  const fetchProcedureTypes = async (): Promise<void> => {
    setLoadingProcedures(true);
    setErrorProcedures(undefined);
    try {
      const response = await fetch("/api/radiology/procedure-types");
      if (!response.ok) {
        let errorMessage = `Failed to fetch procedure types (status: ${response.status})`;
        try {
          const errorData: { error?: string } = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          /* Ignore if response is not JSON */
        }
        throw new Error(errorMessage);
      }
      const data: ProcedureType[] = await response.json();
      setProcedureTypes(data || []); // Ensure it's always an array
    } catch (err) { // Changed 'error' to 'err'
      const message = err instanceof Error ? err.message : "Unknown error"; // Use 'err'
      console.error("Error fetching procedure types:", err); // Use 'err'
      setErrorProcedures(`Failed to load procedure types: ${message}`);
      setProcedureTypes([]); // Clear on error
    } finally {
      setLoadingProcedures(false);
    }
  };

  const fetchModalities = async (): Promise<void> => {
    setLoadingModalities(true);
    setErrorModalities(undefined);
    try {
      const response = await fetch("/api/radiology/modalities");
      if (!response.ok) {
        let errorMessage = `Failed to fetch modalities (status: ${response.status})`;
        try {
          const errorData: { error?: string } = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          /* Ignore if response is not JSON */
        }
        throw new Error(errorMessage);
      }
      const data: Modality[] = await response.json();
      setModalities(data || []); // Ensure it's always an array
    } catch (err) { // Changed error to err
      const message = err instanceof Error ? err.message : "Unknown error"; // Use err
      console.error("Error fetching modalities:", err); // Use err
      setErrorModalities(`Failed to load modalities: ${message}`);
      setModalities([]); // Clear on error
    } finally {
      setLoadingModalities(false);
    }
  };

  const handleCreateProcedureType = async (
    procedureData: ProcedureTypeFormData
  ): Promise<void> => {
    try {
      const response = await fetch("/api/radiology/procedure-types", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(procedureData),
      });

      if (!response.ok) {
        let errorMessage = `Failed to create procedure type (status: ${response.status})`;
        try {
          const errorData: { error?: string } = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          /* Ignore if response is not JSON */
        }
        throw new Error(errorMessage);
      }

      setShowCreateProcedureModal(false);
      fetchProcedureTypes(); // Refresh the list
      // Consider showing a success message
    } catch (err) { // Changed error to err
      const message = err instanceof Error ? err.message : "Unknown error"; // Use err
      console.error("Error creating procedure type:", err); // Use err
      alert(`Error: ${message}`); // Replace alert with a better notification system (e.g., toast)
    }
  };

  const handleCreateModality = async (
    modalityData: ModalityFormData
  ): Promise<void> => {
    try {
      const response = await fetch("/api/radiology/modalities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(modalityData),
      });

      if (!response.ok) {
        let errorMessage = `Failed to create modality (status: ${response.status})`;
        try {
          const errorData: { error?: string } = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          /* Ignore if response is not JSON */
        }
        throw new Error(errorMessage);
      }

      setShowCreateModalityModal(false);
      fetchModalities(); // Refresh the list
      // Consider showing a success message
    } catch (err) { // Changed error to err
      const message = err instanceof Error ? err.message : "Unknown error"; // Use err
      console.error("Error creating modality:", err); // Use err
      alert(`Error: ${message}`); // Replace alert with a better notification system
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <Tabs defaultValue="procedure-types" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="procedure-types">Procedure Types</TabsTrigger>
            <TabsTrigger value="modalities">Modalities</TabsTrigger>
          </TabsList>

          <TabsContent value="procedure-types">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">
                Radiology Procedure Types
              </h2>
              <Button onClick={() => setShowCreateProcedureModal(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Procedure Type
              </Button>
            </div>

            {loadingProcedures ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : errorProcedures ? (
              <div className="text-center text-red-500 p-4 rounded border border-red-200 bg-red-50">
                {errorProcedures}
              </div>
            ) : (
              <div className="overflow-x-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Modality Type</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {procedureTypes.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center h-24 text-muted-foreground"
                        >
                          No procedure types found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      procedureTypes.map((type) => (
                        <TableRow key={type.id}>
                          <TableCell className="font-medium">
                            {type.name}
                          </TableCell>
                          <TableCell>{type.modality_type || "N/A"}</TableCell>
                          <TableCell>{type.description || "N/A"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="modalities">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Radiology Modalities</h2>
              <Button onClick={() => setShowCreateModalityModal(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Modality
              </Button>
            </div>

            {loadingModalities ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : errorModalities ? (
              <div className="text-center text-red-500 p-4 rounded border border-red-200 bg-red-50">
                {errorModalities}
              </div>
            ) : (
              <div className="overflow-x-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modalities.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center h-24 text-muted-foreground"
                        >
                          No modalities found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      modalities.map((modality) => (
                        <TableRow key={modality.id}>
                          <TableCell className="font-medium">
                            {modality.name}
                          </TableCell>
                          <TableCell>{modality.location || "N/A"}</TableCell>
                          <TableCell>{modality.description || "N/A"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {showCreateProcedureModal && (
        <CreateProcedureTypeModal
          isOpen={showCreateProcedureModal} // Pass isOpen prop if modal uses it
          onClose={() => setShowCreateProcedureModal(false)}
          onSubmit={handleCreateProcedureType}
        />
      )}

      {showCreateModalityModal && (
        <CreateModalityModal
          isOpen={showCreateModalityModal} // Pass isOpen prop if modal uses it
          onClose={() => setShowCreateModalityModal(false)}
          onSubmit={handleCreateModality}
        />
      )}
    </Card>
  );
}
