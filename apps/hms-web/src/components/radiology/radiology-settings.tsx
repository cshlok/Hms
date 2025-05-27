import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

/**
 * Radiology settings component
 */
export function RadiologySettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Radiology Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="general">
          <TabsList className="mb-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="modalities">Modalities</TabsTrigger>
            <TabsTrigger value="templates">Report Templates</TabsTrigger>
            <TabsTrigger value="protocols">Protocols</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="departmentName">Department Name</Label>
                <Input id="departmentName" defaultValue="Radiology Department" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="defaultPriority">Default Order Priority</Label>
                <Select 
                  id="defaultPriority"
                  options={[
                    { value: "routine", label: "Routine" },
                    { value: "urgent", label: "Urgent" },
                    { value: "stat", label: "STAT" },
                  ]}
                  defaultValue="routine"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="autoAssign">Auto-assign Radiologist</Label>
                <Select 
                  id="autoAssign"
                  options={[
                    { value: "true", label: "Yes" },
                    { value: "false", label: "No" },
                  ]}
                  defaultValue="false"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reportFormat">Default Report Format</Label>
                <Select 
                  id="reportFormat"
                  options={[
                    { value: "structured", label: "Structured" },
                    { value: "narrative", label: "Narrative" },
                    { value: "hybrid", label: "Hybrid" },
                  ]}
                  defaultValue="structured"
                />
              </div>
              
              <Button className="mt-4">Save Settings</Button>
            </div>
          </TabsContent>
          
          <TabsContent value="modalities">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Active Modalities</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="xray" defaultChecked />
                    <Label htmlFor="xray">X-Ray</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="ct" defaultChecked />
                    <Label htmlFor="ct">CT Scan</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="mri" defaultChecked />
                    <Label htmlFor="mri">MRI</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="ultrasound" defaultChecked />
                    <Label htmlFor="ultrasound">Ultrasound</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="mammography" defaultChecked />
                    <Label htmlFor="mammography">Mammography</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="fluoroscopy" defaultChecked />
                    <Label htmlFor="fluoroscopy">Fluoroscopy</Label>
                  </div>
                </div>
              </div>
              
              <Button className="mt-4">Save Modalities</Button>
            </div>
          </TabsContent>
          
          <TabsContent value="templates">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Report Templates</Label>
                <div className="border rounded-md p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">X-Ray Chest Template</span>
                    <div className="space-x-2">
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button variant="outline" size="sm">Delete</Button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">CT Abdomen Template</span>
                    <div className="space-x-2">
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button variant="outline" size="sm">Delete</Button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">MRI Brain Template</span>
                    <div className="space-x-2">
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button variant="outline" size="sm">Delete</Button>
                    </div>
                  </div>
                </div>
              </div>
              
              <Button>Add New Template</Button>
            </div>
          </TabsContent>
          
          <TabsContent value="protocols">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Imaging Protocols</Label>
                <div className="border rounded-md p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Standard CT Protocol</span>
                    <div className="space-x-2">
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button variant="outline" size="sm">Delete</Button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Contrast MRI Protocol</span>
                    <div className="space-x-2">
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button variant="outline" size="sm">Delete</Button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Pediatric Imaging Protocol</span>
                    <div className="space-x-2">
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button variant="outline" size="sm">Delete</Button>
                    </div>
                  </div>
                </div>
              </div>
              
              <Button>Add New Protocol</Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
