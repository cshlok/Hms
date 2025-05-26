'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Plus, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Form schema
const campaignFormSchema = z.object({
  name: z.string().min(3, {
    message: "Campaign name must be at least 3 characters",
  }),
  description: z.string().optional(),
  type: z.string({
    required_error: "Please select a campaign type",
  }),
  status: z.string().default('DRAFT'),
  startDate: z.date({
    required_error: "Start date is required",
  }),
  endDate: z.date().optional(),
  budget: z.number().optional(),
  targetAudience: z.any().optional(),
  goals: z.array(z.string()).default([]),
  kpis: z.any().optional(),
});

type CampaignFormValues = z.infer<typeof campaignFormSchema>;

interface CampaignFormProps {
  onSuccess?: (data: any) => void;
  defaultValues?: Partial<CampaignFormValues>;
  campaignId?: string;
}

export default function CampaignForm({ onSuccess, defaultValues, campaignId }: CampaignFormProps) {
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(!!campaignId);
  const [activeTab, setActiveTab] = useState('details');
  const [newGoal, setNewGoal] = useState('');
  const [segments, setSegments] = useState<any[]>([]);
  const [selectedSegments, setSelectedSegments] = useState<any[]>([]);
  const [availableSegments, setAvailableSegments] = useState<any[]>([]);

  // Initialize form
  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      description: defaultValues?.description || '',
      type: defaultValues?.type || '',
      status: defaultValues?.status || 'DRAFT',
      startDate: defaultValues?.startDate || new Date(),
      endDate: defaultValues?.endDate,
      budget: defaultValues?.budget || undefined,
      targetAudience: defaultValues?.targetAudience || {},
      goals: defaultValues?.goals || [],
      kpis: defaultValues?.kpis || {},
    },
  });

  // Load campaign data if editing
  useEffect(() => {
    if (campaignId) {
      loadCampaignData();
    }
    
    // Load segments
    loadSegments();
  }, [campaignId]);

  const loadCampaignData = async () => {
    try {
      const response = await fetch(`/api/support-services/marketing/campaigns/${campaignId}`);
      if (!response.ok) {
        throw new Error('Failed to load campaign data');
      }
      
      const campaignData = await response.json();
      
      // Set form values
      form.reset({
        name: campaignData.name,
        description: campaignData.description || '',
        type: campaignData.type,
        status: campaignData.status,
        startDate: new Date(campaignData.startDate),
        endDate: campaignData.endDate ? new Date(campaignData.endDate) : undefined,
        budget: campaignData.budget,
        targetAudience: campaignData.targetAudience || {},
        goals: campaignData.goals || [],
        kpis: campaignData.kpis || {},
      });
      
      // Set selected segments
      if (campaignData.segments && campaignData.segments.length > 0) {
        const selectedSegs = campaignData.segments.map((seg: any) => seg.segment);
        setSelectedSegments(selectedSegs);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading campaign data:', error);
      toast({
        title: "Error",
        description: "Failed to load campaign data",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const loadSegments = async () => {
    try {
      const response = await fetch('/api/support-services/marketing/segments?isActive=true');
      if (!response.ok) {
        throw new Error('Failed to load segments');
      }
      
      const data = await response.json();
      setSegments(data.data);
      updateAvailableSegments(data.data, selectedSegments);
    } catch (error) {
      console.error('Error loading segments:', error);
    }
  };

  const updateAvailableSegments = (allSegments: any[], selected: any[]) => {
    const selectedIds = selected.map(seg => seg.id);
    setAvailableSegments(allSegments.filter(seg => !selectedIds.includes(seg.id)));
  };

  // Handle form submission
  const onSubmit = async (values: CampaignFormValues) => {
    setIsSubmitting(true);
    try {
      const endpoint = campaignId 
        ? `/api/support-services/marketing/campaigns/${campaignId}`
        : '/api/support-services/marketing/campaigns';
      
      const method = campaignId ? 'PATCH' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save campaign');
      }

      const data = await response.json();
      
      toast({
        title: campaignId ? "Campaign Updated" : "Campaign Created",
        description: campaignId 
          ? "The campaign has been updated successfully." 
          : "The campaign has been created successfully.",
      });

      // If we have a new campaign ID and selected segments, add them
      if (data.id && selectedSegments.length > 0) {
        await addSegmentsToCampaign(data.id);
      }

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(data);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred while saving the campaign",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addSegmentsToCampaign = async (cId: string) => {
    const campaignIdToUse = campaignId || cId;
    
    for (const segment of selectedSegments) {
      try {
        await fetch(`/api/support-services/marketing/campaigns/${campaignIdToUse}/segments/${segment.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.error(`Error adding segment ${segment.id} to campaign:`, error);
      }
    }
  };

  const handleAddGoal = () => {
    if (newGoal.trim() === '') return;
    
    const currentGoals = form.getValues('goals') || [];
    form.setValue('goals', [...currentGoals, newGoal]);
    setNewGoal('');
  };

  const handleRemoveGoal = (index: number) => {
    const currentGoals = form.getValues('goals') || [];
    form.setValue('goals', currentGoals.filter((_, i) => i !== index));
  };

  const handleAddSegment = (segmentId: string) => {
    const segment = segments.find(seg => seg.id === segmentId);
    if (!segment) return;
    
    setSelectedSegments([...selectedSegments, segment]);
    updateAvailableSegments(segments, [...selectedSegments, segment]);
  };

  const handleRemoveSegment = (segmentId: string) => {
    setSelectedSegments(selectedSegments.filter(seg => seg.id !== segmentId));
    updateAvailableSegments(segments, selectedSegments.filter(seg => seg.id !== segmentId));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{campaignId ? 'Edit Campaign' : 'Create New Campaign'}</CardTitle>
        <CardDescription>
          {campaignId 
            ? 'Update the details of your marketing campaign.' 
            : 'Create a new marketing campaign to reach your target audience.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 w-[400px]">
            <TabsTrigger value="details">Basic Details</TabsTrigger>
            <TabsTrigger value="targeting">Targeting</TabsTrigger>
            <TabsTrigger value="goals">Goals & KPIs</TabsTrigger>
          </TabsList>

          <form onSubmit={form.handleSubmit(onSubmit)}>
            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Campaign Name</Label>
                  <Input
                    id="name"
                    {...form.register('name')}
                    placeholder="Enter campaign name"
                    disabled={isSubmitting}
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Campaign Type</Label>
                  <Controller
                    name="type"
                    control={form.control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger id="type">
                          <SelectValue placeholder="Select campaign type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EMAIL">Email Campaign</SelectItem>
                          <SelectItem value="SMS">SMS Campaign</SelectItem>
                          <SelectItem value="SOCIAL_MEDIA">Social Media Campaign</SelectItem>
                          <SelectItem value="EVENT">Event Campaign</SelectItem>
                          <SelectItem value="PRINT">Print Campaign</SelectItem>
                          <SelectItem value="DIGITAL_AD">Digital Ad Campaign</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {form.formState.errors.type && (
                    <p className="text-sm text-red-500">{form.formState.errors.type.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...form.register('description')}
                  placeholder="Enter campaign description"
                  className="min-h-[100px]"
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Controller
                    name="status"
                    control={form.control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger id="status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DRAFT">Draft</SelectItem>
                          <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="PAUSED">Paused</SelectItem>
                          <SelectItem value="COMPLETED">Completed</SelectItem>
                          <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Controller
                    name="startDate"
                    control={form.control}
                    render={({ field }) => (
                      <DatePicker
                        date={field.value}
                        onSelect={field.onChange}
                        disabled={isSubmitting}
                      />
                    )}
                  />
                  {form.formState.errors.startDate && (
                    <p className="text-sm text-red-500">{form.formState.errors.startDate.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date (Optional)</Label>
                  <Controller
                    name="endDate"
                    control={form.control}
                    render={({ field }) => (
                      <DatePicker
                        date={field.value}
                        onSelect={field.onChange}
                        disabled={isSubmitting}
                      />
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">Budget (Optional)</Label>
                <Input
                  id="budget"
                  type="number"
                  step="0.01"
                  {...form.register('budget', { valueAsNumber: true })}
                  placeholder="Enter campaign budget"
                  disabled={isSubmitting}
                />
              </div>
            </TabsContent>

            <TabsContent value="targeting" className="space-y-4 mt-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Target Audience</h3>
                
                <div className="space-y-4 border rounded-md p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="targetAudience.ageRange">Age Range</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="targetAudience.ageMin"
                          type="number"
                          placeholder="Min"
                          className="w-24"
                          onChange={(e) => {
                            const currentTarget = form.getValues('targetAudience') || {};
                            form.setValue('targetAudience', {
                              ...currentTarget,
                              ageRange: {
                                ...(currentTarget.ageRange || {}),
                                min: parseInt(e.target.value)
                              }
                            });
                          }}
                          defaultValue={form.getValues('targetAudience')?.ageRange?.min || ''}
                          disabled={isSubmitting}
                        />
                        <span>to</span>
                        <Input
                          id="targetAudience.ageMax"
                          type="number"
                          placeholder="Max"
                          className="w-24"
                          onChange={(e) => {
                            const currentTarget = form.getValues('targetAudience') || {};
                            form.setValue('targetAudience', {
                              ...currentTarget,
                              ageRange: {
                                ...(currentTarget.ageRange || {}),
                                max: parseInt(e.target.value)
                              }
                            });
                          }}
                          defaultValue={form.getValues('targetAudience')?.ageRange?.max || ''}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="targetAudience.gender">Gender</Label>
                      <Select
                        onValueChange={(value) => {
                          const currentTarget = form.getValues('targetAudience') || {};
                          form.setValue('targetAudience', {
                            ...currentTarget,
                            gender: value
                          });
                        }}
                        defaultValue={form.getValues('targetAudience')?.gender || ''}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger id="targetAudience.gender">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All</SelectItem>
                          <SelectItem value="MALE">Male</SelectItem>
                          <SelectItem value="FEMALE">Female</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="targetAudience.location">Location</Label>
                    <Input
                      id="targetAudience.location"
                      placeholder="Enter target location"
                      onChange={(e) => {
                        const currentTarget = form.getValues('targetAudience') || {};
                        form.setValue('targetAudience', {
                          ...currentTarget,
                          location: e.target.value
                        });
                      }}
                      defaultValue={form.getValues('targetAudience')?.location || ''}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="targetAudience.interests">Interests (comma separated)</Label>
                    <Input
                      id="targetAudience.interests"
                      placeholder="E.g., health, wellness, fitness"
                      onChange={(e) => {
                        const currentTarget = form.getValues('targetAudience') || {};
                        form.setValue('targetAudience', {
                          ...currentTarget,
                          interests: e.target.value.split(',').map(i => i.trim())
                        });
                      }}
                      defaultValue={form.getValues('targetAudience')?.interests?.join(', ') || ''}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <h3 className="text-lg font-medium mt-6">Segments</h3>
                <div className="border rounded-md p-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="segment">Add Segment</Label>
                      <div className="flex space-x-2">
                        <Select
                          disabled={availableSegments.length === 0 || isSubmitting}
                          onValueChange={handleAddSegment}
                        >
                          <SelectTrigger id="segment" className="flex-1">
                            <SelectValue placeholder={availableSegments.length === 0 ? "No segments available" : "Select segment"} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableSegments.map(segment => (
                              <SelectItem key={segment.id} value={segment.id}>
                                {segment.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Selected Segments</Label>
                      <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border rounded-md">
                        {selectedSegments.length === 0 ? (
                          <p className="text-sm text-gray-500">No segments selected</p>
                        ) : (
                          selectedSegments.map(segment => (
                            <Badge key={segment.id} variant="secondary" className="flex items-center gap-1">
                              {segment.name}
                              <button
                                type="button"
                                onClick={() => handleRemoveSegment(segment.id)}
                                className="text-gray-500 hover:text-gray-700"
                                disabled={isSubmitting}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="goals" className="space-y-4 mt-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Campaign Goals</h3>
                
                <div className="space-y-4 border rounded-md p-4">
                  <div className="space-y-2">
                    <Label htmlFor="newGoal">Add Goal</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="newGoal"
                        value={newGoal}
                        onChange={(e) => setNewGoal(e.target.value)}
                        placeholder="Enter campaign goal"
                        disabled={isSubmitting}
                        className="flex-1"
                      />
                      <Button 
                        type="button" 
                        onClick={handleAddGoal}
                        disabled={isSubmitting || newGoal.trim() === ''}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Current Goals</Label>
                    <div className="flex flex-col gap-2 min-h-[40px]">
                      {form.watch('goals').length === 0 ? (
                        <p className="text-sm text-gray-500">No goals added</p>
                      ) : (
                        form.watch('goals').map((goal, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                            <span>{goal}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveGoal(index)}
                              className="text-gray-500 hover:text-gray-700"
                              disabled={isSubmitting}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-medium mt-6">Key Performance Indicators</h3>
                <div className="space-y-4 border rounded-md p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="kpis.impressions">Target Impressions</Label>
                      <Input
                        id="kpis.impressions"
                        type="number"
                        placeholder="Enter target impressions"
                        onChange={(e) => {
                          const currentKpis = form.getValues('kpis') || {};
                          form.setValue('kpis', {
                            ...currentKpis,
                            impressions: parseInt(e.target.value)
                          });
                        }}
                        defaultValue={form.getValues('kpis')?.impressions || ''}
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="kpis.clicks">Target Clicks</Label>
                      <Input
                        id="kpis.clicks"
                        type="number"
                        placeholder="Enter target clicks"
                        onChange={(e) => {
                          const currentKpis = form.getValues('kpis') || {};
                          form.setValue('kpis', {
                            ...currentKpis,
                            clicks: parseInt(e.target.value)
                          });
                        }}
                        defaultValue={form.getValues('kpis')?.clicks || ''}
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="kpis.leads">Target Leads</Label>
                      <Input
                        id="kpis.leads"
                        type="number"
                        placeholder="Enter target leads"
                        onChange={(e) => {
                          const currentKpis = form.getValues('kpis') || {};
                          form.setValue('kpis', {
                            ...currentKpis,
                            leads: parseInt(e.target.value)
                          });
                        }}
                        defaultValue={form.getValues('kpis')?.leads || ''}
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="kpis.conversions">Target Conversions</Label>
                      <Input
                        id="kpis.conversions"
                        type="number"
                        placeholder="Enter target conversions"
                        onChange={(e) => {
                          const currentKpis = form.getValues('kpis') || {};
                          form.setValue('kpis', {
                            ...currentKpis,
                            conversions: parseInt(e.target.value)
                          });
                        }}
                        defaultValue={form.getValues('kpis')?.conversions || ''}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="kpis.roi">Target ROI (%)</Label>
                    <Input
                      id="kpis.roi"
                      type="number"
                      placeholder="Enter target ROI percentage"
                      onChange={(e) => {
                        const currentKpis = form.getValues('kpis') || {};
                        form.setValue('kpis', {
                          ...currentKpis,
                          roi: parseFloat(e.target.value)
                        });
                      }}
                      defaultValue={form.getValues('kpis')?.roi || ''}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <div className="mt-6 flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (onSuccess) onSuccess(null);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {campaignId ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  campaignId ? 'Update Campaign' : 'Create Campaign'
                )}
              </Button>
            </div>
          </form>
        </Tabs>
      </CardContent>
    </Card>
  );
}
