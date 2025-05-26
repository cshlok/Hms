import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';

interface SegmentBuilderProps {
  segmentId?: string;
  onSuccess?: (segment: any) => void;
}

export default function SegmentBuilder({ segmentId, onSuccess }: SegmentBuilderProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [segment, setSegment] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("details");
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true,
    criteria: {
      type: 'AND',
      conditions: []
    }
  });
  const [members, setMembers] = useState<any[]>([]);
  const [availableContacts, setAvailableContacts] = useState<any[]>([]);
  const [criteriaPreview, setCriteriaPreview] = useState<string>('');
  const [estimatedSize, setEstimatedSize] = useState<number>(0);
  const [newCondition, setNewCondition] = useState({
    field: 'email',
    operator: 'contains',
    value: ''
  });

  // Fetch segment data if editing an existing segment
  useEffect(() => {
    const fetchSegment = async () => {
      if (!segmentId) return;
      
      setIsLoading(true);
      try {
        const response = await fetch(`/api/support-services/marketing/segments/${segmentId}?includeMembers=true`);
        if (!response.ok) throw new Error('Failed to fetch segment');
        
        const data = await response.json();
        setSegment(data);
        
        // Set form values from segment data
        setFormData({
          name: data.name || '',
          description: data.description || '',
          isActive: data.isActive !== undefined ? data.isActive : true,
          criteria: data.criteria || {
            type: 'AND',
            conditions: []
          }
        });
        
        // Set members
        if (data.members && data.members.length > 0) {
          setMembers(data.members.map((m: any) => m.contact));
        }
        
        // Update criteria preview
        updateCriteriaPreview(data.criteria);
        
        // Get estimated size
        fetchEstimatedSize(data.criteria);
      } catch (error) {
        console.error('Error fetching segment:', error);
        toast({
          title: "Error",
          description: "Failed to load segment data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSegment();
  }, [segmentId]);

  // Fetch available contacts
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const response = await fetch('/api/support-services/marketing/contacts?status=ACTIVE');
        if (!response.ok) throw new Error('Failed to fetch contacts');
        
        const data = await response.json();
        setAvailableContacts(data.data || []);
      } catch (error) {
        console.error('Error fetching contacts:', error);
      }
    };
    
    fetchContacts();
  }, []);

  // Update criteria preview
  const updateCriteriaPreview = (criteria: any) => {
    if (!criteria || !criteria.conditions || criteria.conditions.length === 0) {
      setCriteriaPreview('No conditions defined');
      return;
    }
    
    const conditionStrings = criteria.conditions.map((condition: any) => {
      const fieldLabel = getFieldLabel(condition.field);
      const operatorLabel = getOperatorLabel(condition.operator);
      return `${fieldLabel} ${operatorLabel} "${condition.value}"`;
    });
    
    const joinWord = criteria.type === 'AND' ? 'AND' : 'OR';
    setCriteriaPreview(conditionStrings.join(` ${joinWord} `));
  };

  // Get estimated size
  const fetchEstimatedSize = async (criteria: any) => {
    if (!criteria || !criteria.conditions || criteria.conditions.length === 0) {
      setEstimatedSize(0);
      return;
    }
    
    try {
      // This would be a real API call in production
      // For now, we'll simulate with a random number
      setEstimatedSize(Math.floor(Math.random() * 100) + 1);
    } catch (error) {
      console.error('Error estimating segment size:', error);
    }
  };

  // Get field label
  const getFieldLabel = (field: string): string => {
    switch (field) {
      case 'email':
        return 'Email';
      case 'name':
        return 'Name';
      case 'phone':
        return 'Phone';
      case 'source':
        return 'Source';
      case 'status':
        return 'Status';
      case 'preferences.emailOptIn':
        return 'Email Opt-in';
      case 'preferences.smsOptIn':
        return 'SMS Opt-in';
      case 'address.city':
        return 'City';
      case 'address.state':
        return 'State';
      case 'address.country':
        return 'Country';
      case 'createdAt':
        return 'Created Date';
      default:
        return field;
    }
  };

  // Get operator label
  const getOperatorLabel = (operator: string): string => {
    switch (operator) {
      case 'equals':
        return 'equals';
      case 'notEquals':
        return 'does not equal';
      case 'contains':
        return 'contains';
      case 'notContains':
        return 'does not contain';
      case 'startsWith':
        return 'starts with';
      case 'endsWith':
        return 'ends with';
      case 'greaterThan':
        return 'is greater than';
      case 'lessThan':
        return 'is less than';
      case 'isTrue':
        return 'is true';
      case 'isFalse':
        return 'is false';
      case 'isNull':
        return 'is empty';
      case 'isNotNull':
        return 'is not empty';
      default:
        return operator;
    }
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle switch changes
  const handleSwitchChange = (checked: boolean) => {
    setFormData({
      ...formData,
      isActive: checked
    });
  };

  // Handle criteria type change
  const handleCriteriaTypeChange = (value: string) => {
    const newCriteria = {
      ...formData.criteria,
      type: value
    };
    
    setFormData({
      ...formData,
      criteria: newCriteria
    });
    
    updateCriteriaPreview(newCriteria);
    fetchEstimatedSize(newCriteria);
  };

  // Handle new condition field change
  const handleConditionFieldChange = (value: string) => {
    setNewCondition({
      ...newCondition,
      field: value
    });
  };

  // Handle new condition operator change
  const handleConditionOperatorChange = (value: string) => {
    setNewCondition({
      ...newCondition,
      operator: value
    });
  };

  // Handle new condition value change
  const handleConditionValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewCondition({
      ...newCondition,
      value: e.target.value
    });
  };

  // Add condition to criteria
  const handleAddCondition = () => {
    if (!newCondition.value && !['isTrue', 'isFalse', 'isNull', 'isNotNull'].includes(newCondition.operator)) {
      toast({
        title: "Validation Error",
        description: "Please enter a value for the condition.",
        variant: "destructive",
      });
      return;
    }
    
    const newCriteria = {
      ...formData.criteria,
      conditions: [...formData.criteria.conditions, { ...newCondition }]
    };
    
    setFormData({
      ...formData,
      criteria: newCriteria
    });
    
    // Reset new condition
    setNewCondition({
      field: 'email',
      operator: 'contains',
      value: ''
    });
    
    updateCriteriaPreview(newCriteria);
    fetchEstimatedSize(newCriteria);
  };

  // Remove condition from criteria
  const handleRemoveCondition = (index: number) => {
    const newConditions = [...formData.criteria.conditions];
    newConditions.splice(index, 1);
    
    const newCriteria = {
      ...formData.criteria,
      conditions: newConditions
    };
    
    setFormData({
      ...formData,
      criteria: newCriteria
    });
    
    updateCriteriaPreview(newCriteria);
    fetchEstimatedSize(newCriteria);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const url = segmentId 
        ? `/api/support-services/marketing/segments/${segmentId}` 
        : '/api/support-services/marketing/segments';
      
      const method = segmentId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) throw new Error('Failed to save segment');
      
      const savedSegment = await response.json();
      
      toast({
        title: "Success",
        description: `Segment ${segmentId ? 'updated' : 'created'} successfully.`,
      });
      
      if (onSuccess) {
        onSuccess(savedSegment);
      } else if (!segmentId) {
        router.push(`/marketing/segments/${savedSegment.id}`);
      }
    } catch (error) {
      console.error('Error saving segment:', error);
      toast({
        title: "Error",
        description: "Failed to save segment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Apply segment criteria
  const handleApplyCriteria = async () => {
    if (!segmentId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/support-services/marketing/segments/${segmentId}/apply-criteria`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) throw new Error('Failed to apply criteria');
      
      const result = await response.json();
      
      toast({
        title: "Success",
        description: `Criteria applied successfully. ${result.addedCount} contacts added to segment.`,
      });
      
      // Refresh members
      const segmentResponse = await fetch(`/api/support-services/marketing/segments/${segmentId}?includeMembers=true`);
      if (segmentResponse.ok) {
        const segmentData = await segmentResponse.json();
        if (segmentData.members) {
          setMembers(segmentData.members.map((m: any) => m.contact));
        }
      }
    } catch (error) {
      console.error('Error applying criteria:', error);
      toast({
        title: "Error",
        description: "Failed to apply criteria. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add contact to segment
  const handleAddContact = async (contactId: string) => {
    if (!segmentId) return;
    
    try {
      const response = await fetch(`/api/support-services/marketing/segments/${segmentId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contactId }),
      });
      
      if (!response.ok) throw new Error('Failed to add contact');
      
      // Update members
      const contact = availableContacts.find(c => c.id === contactId);
      if (contact) {
        setMembers([...members, contact]);
      }
      
      toast({
        title: "Success",
        description: "Contact added to segment successfully.",
      });
    } catch (error) {
      console.error('Error adding contact:', error);
      toast({
        title: "Error",
        description: "Failed to add contact. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Remove contact from segment
  const handleRemoveContact = async (contactId: string) => {
    if (!segmentId) return;
    
    try {
      const response = await fetch(`/api/support-services/marketing/segments/${segmentId}/members/${contactId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to remove contact');
      
      // Update members
      setMembers(members.filter(m => m.id !== contactId));
      
      toast({
        title: "Success",
        description: "Contact removed from segment successfully.",
      });
    } catch (error) {
      console.error('Error removing contact:', error);
      toast({
        title: "Error",
        description: "Failed to remove contact. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{segmentId ? 'Edit Segment' : 'Create New Segment'}</CardTitle>
        <CardDescription>
          {segmentId 
            ? 'Update your contact segment criteria and members' 
            : 'Create a new segment to target specific groups of contacts'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Segment Details</TabsTrigger>
            <TabsTrigger value="criteria">Segment Criteria</TabsTrigger>
            <TabsTrigger value="members" disabled={!segmentId}>Segment Members</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Segment Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter segment name"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Enter segment description"
                    rows={3}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={handleSwitchChange}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Saving...' : segmentId ? 'Update Segment' : 'Create Segment'}
                </Button>
              </div>
            </form>
          </TabsContent>
          
          <TabsContent value="criteria">
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Match Type</Label>
                  <Select
                    value={formData.criteria.type}
                    onValueChange={handleCriteriaTypeChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select match type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AND">Match ALL conditions (AND)</SelectItem>
                      <SelectItem value="OR">Match ANY condition (OR)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {formData.criteria.type === 'AND' 
                      ? 'Contacts must match all of the following conditions to be included in this segment.' 
                      : 'Contacts that match any of the following conditions will be included in this segment.'}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Current Conditions</Label>
                  <div className="border rounded-md p-4 space-y-2">
                    {formData.criteria.conditions.length > 0 ? (
                      formData.criteria.conditions.map((condition, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <span>
                            {getFieldLabel(condition.field)} {getOperatorLabel(condition.operator)} {condition.value}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleRemoveCondition(index)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No conditions defined yet</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2 border-t pt-4">
                  <Label>Add Condition</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Select
                      value={newCondition.field}
                      onValueChange={handleConditionFieldChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="source">Source</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                        <SelectItem value="preferences.emailOptIn">Email Opt-in</SelectItem>
                        <SelectItem value="preferences.smsOptIn">SMS Opt-in</SelectItem>
                        <SelectItem value="address.city">City</SelectItem>
                        <SelectItem value="address.state">State</SelectItem>
                        <SelectItem value="address.country">Country</SelectItem>
                        <SelectItem value="createdAt">Created Date</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select
                      value={newCondition.operator}
                      onValueChange={handleConditionOperatorChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select operator" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equals">Equals</SelectItem>
                        <SelectItem value="notEquals">Does not equal</SelectItem>
                        <SelectItem value="contains">Contains</SelectItem>
                        <SelectItem value="notContains">Does not contain</SelectItem>
                        <SelectItem value="startsWith">Starts with</SelectItem>
                        <SelectItem value="endsWith">Ends with</SelectItem>
                        {(newCondition.field === 'preferences.emailOptIn' || newCondition.field === 'preferences.smsOptIn') && (
                          <>
                            <SelectItem value="isTrue">Is true</SelectItem>
                            <SelectItem value="isFalse">Is false</SelectItem>
                          </>
                        )}
                        <SelectItem value="isNull">Is empty</SelectItem>
                        <SelectItem value="isNotNull">Is not empty</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {!['isTrue', 'isFalse', 'isNull', 'isNotNull'].includes(newCondition.operator) && (
                      <Input
                        value={newCondition.value}
                        onChange={handleConditionValueChange}
                        placeholder="Enter value"
                      />
                    )}
                  </div>
                  <div className="flex justify-end mt-2">
                    <Button type="button" onClick={handleAddCondition}>
                      Add Condition
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2 border-t pt-4">
                  <Label>Segment Preview</Label>
                  <div className="border rounded-md p-4">
                    <p className="text-sm">{criteriaPreview}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm">Estimated size: <Badge>{estimatedSize} contacts</Badge></p>
                    {segmentId && (
                      <Button 
                        type="button" 
                        onClick={handleApplyCriteria}
                        disabled={isLoading || formData.criteria.conditions.length === 0}
                      >
                        Apply Criteria
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setActiveTab("details")}
                >
                  Back
                </Button>
                <Button 
                  type="button" 
                  onClick={handleSubmit} 
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save Criteria'}
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="members">
            {segmentId ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Segment Members</h3>
                  <div className="flex items-center space-x-2">
                    <Badge>{members.length} contacts</Badge>
                    <Select onValueChange={handleAddContact}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Add contact" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableContacts
                          .filter(contact => !members.some(m => m.id === contact.id))
                          .map(contact => (
                            <SelectItem key={contact.id} value={contact.id}>
                              {contact.name}
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {members.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <h4 className="font-medium">{member.name}</h4>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => router.push(`/marketing/contacts/${member.id}`)}
                        >
                          View
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleRemoveContact(member.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {members.length === 0 && (
                    <p className="text-sm text-muted-foreground">No members in this segment yet</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 text-center">
                <p>Please save the segment first to manage members.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
