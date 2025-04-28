"use client";

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus } from "lucide-react";
import CreateProcedureTypeModal from "./CreateProcedureTypeModal";
import CreateModalityModal from "./CreateModalityModal";

export default function RadiologySettings() {
  const [procedureTypes, setProcedureTypes] = useState([]);
  const [modalities, setModalities] = useState([]);
  const [loadingProcedures, setLoadingProcedures] = useState(true);
  const [loadingModalities, setLoadingModalities] = useState(true);
  const [errorProcedures, setErrorProcedures] = useState(null);
  const [errorModalities, setErrorModalities] = useState(null);
  const [showCreateProcedureModal, setShowCreateProcedureModal] = useState(false);
  const [showCreateModalityModal, setShowCreateModalityModal] = useState(false);

  useEffect(() => {
    fetchProcedureTypes();
    fetchModalities();
  }, []);

  const fetchProcedureTypes = async () => {
    setLoadingProcedures(true);
    try {
      const response = await fetch('/api/radiology/procedure-types');
      if (!response.ok) {
        throw new Error('Failed to fetch procedure types');
      }
      const data = await response.json();
      setProcedureTypes(data);
      setErrorProcedures(null);
    } catch (err) {
      console.error('Error fetching procedure types:', err);
      setErrorProcedures('Failed to load procedure types. Please try again later.');
    } finally {
      setLoadingProcedures(false);
    }
  };

  const fetchModalities = async () => {
    setLoadingModalities(true);
    try {
      const response = await fetch('/api/radiology/modalities');
      if (!response.ok) {
        throw new Error('Failed to fetch modalities');
      }
      const data = await response.json();
      setModalities(data);
      setErrorModalities(null);
    } catch (err) {
      console.error('Error fetching modalities:', err);
      setErrorModalities('Failed to load modalities. Please try again later.');
    } finally {
      setLoadingModalities(false);
    }
  };

  const handleCreateProcedureType = async (procedureData) => {
    try {
      const response = await fetch('/api/radiology/procedure-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(procedureData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create procedure type');
      }
      
      setShowCreateProcedureModal(false);
      fetchProcedureTypes(); // Refresh the list
    } catch (err) {
      console.error('Error creating procedure type:', err);
      alert(err.message);
    }
  };

  const handleCreateModality = async (modalityData) => {
    try {
      const response = await fetch('/api/radiology/modalities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(modalityData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create modality');
      }
      
      setShowCreateModalityModal(false);
      fetchModalities(); // Refresh the list
    } catch (err) {
      console.error('Error creating modality:', err);
      alert(err.message);
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
              <h2 className="text-xl font-semibold">Radiology Procedure Types</h2>
              <Button onClick={() => setShowCreateProcedureModal(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Procedure Type
              </Button>
            </div>

            {loadingProcedures ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : errorProcedures ? (
              <div className="text-center text-red-500 p-4">{errorProcedures}</div>
            ) : procedureTypes.length === 0 ? (
              <div className="text-center text-gray-500 p-4">No procedure types found.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Modality Type</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {procedureTypes.map((type) => (
                      <TableRow key={type.id}>
                        <TableCell className="font-medium">{type.name}</TableCell>
                        <TableCell>{type.modality_type || 'N/A'}</TableCell>
                        <TableCell>{type.description || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
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
              <div className="text-center text-red-500 p-4">{errorModalities}</div>
            ) : modalities.length === 0 ? (
              <div className="text-center text-gray-500 p-4">No modalities found.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modalities.map((modality) => (
                      <TableRow key={modality.id}>
                        <TableCell className="font-medium">{modality.name}</TableCell>
                        <TableCell>{modality.location || 'N/A'}</TableCell>
                        <TableCell>{modality.description || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {showCreateProcedureModal && (
        <CreateProcedureTypeModal 
          onClose={() => setShowCreateProcedureModal(false)}
          onSubmit={handleCreateProcedureType}
        />
      )}

      {showCreateModalityModal && (
        <CreateModalityModal 
          onClose={() => setShowCreateModalityModal(false)}
          onSubmit={handleCreateModality}
        />
      )}
    </Card>
  );
}
