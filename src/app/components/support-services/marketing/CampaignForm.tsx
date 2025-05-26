import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DatePicker } from '@/components/ui/date-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';
import { CampaignType, CampaignStatus } from '@/lib/models/marketing';
import { useRouter } from 'next/navigation';

// Form schema for campaign creation/editing
const campaignFormSchema = z.object({
  name: z.string().min(3, {
    message: "Campaign name must be at least 3 characters.",
  }),
  description: z.string().optional(),
  type: z.string({
    required_error: "Please select a campaign type.",
  }),
  status: z.string({
    required_error: "Please select a campaign status.",
  }),
  startDate: z.date({
    required_error: "Start date is required.",
  }),
  endDate: z.date().optional(),
  budget: z.number().optional(),
  targetAudience: z.record(z.any()).optional(),
  goals: z.array(z.string()).min(1, {
    message: "At least one goal is required.",
  }),
});

type CampaignFormValues = z.infer<typeof campaignFormSchema>;

interface CampaignFormProps {
  campaignId?: string;
  onSuccess?: (campaign: any) => void;
}

export default function CampaignForm({ campaignId, onSuccess }: CampaignFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [campaign, setCampaign] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("details");
  const [goalInput, setGoalInput] = useState<string>("");
  const [selectedSegments, setSelectedSegments] = useState<any[]>([]);
  const [availableSegments, setAvailableSegments] = useState<any[]>([]);

  // Initialize form with default values or existing campaign data
  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "EMAIL",
      status: "DRAFT",
      goals: [],
      targetAudience: {},
    },
  });

  // Fetch campaign data if editing an existing campaign
  useEffect(() => {
    const fetchCampaign = async () => {
      if (!campaignId) return;
      
      setIsLoading(true);
      try {
        const response = await fetch(`/api/support-services/marketing/campaigns/${campaignId}`);
        if (!response.ok) throw new Error('Failed to fetch campaign');
        
        const data = await response.json();
        setCampaign(data);
        
        // Set form values from campaign data
        form.reset({
          name: data.name,
          description: data.description || "",
          type: data.type,
          status: data.status,
          startDate: new Date(data.startDate),
          endDate: data.endDate ? new Date(data.endDate) : undefined,
          budget: data.budget || undefined,
          targetAudience: data.targetAudience || {},
          goals: data.goals || [],
        });
        
        // Fetch campaign segments
        if (data.segments && data.segments.length > 0) {
          setSelectedSegments(data.segments.map((s: any) => s.segment));
        }
      } catch (error) {
        console.error('Error fetching campaign:', error);
        toast({
          title: "Error",
          description: "Failed to load campaign data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCampaign();
  }, [campaignId, form]);

  // Fetch available segments
  useEffect(() => {
    const fetchSegments = async () => {
      try {
        const response = await fetch('/api/support-services/marketing/segments?isActive=true');
        if (!response.ok) throw new Error('Failed to fetch segments');
        
        const data = await response.json();
        setAvailableSegments(data.data || []);
      } catch (error) {
        console.error('Error fetching segments:', error);
      }
    };
    
    fetchSegments();
  }, []);

  // Handle form submission
  const onSubmit = async (values: CampaignFormValues) => {
    setIsLoading(true);
    
    try {
      const url = campaignId 
        ? `/api/support-services/marketing/campaigns/${campaignId}` 
        : '/api/support-services/marketing/campaigns';
      
      const method = campaignId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      
      if (!response.ok) throw new Error('Failed to save campaign');
      
      const savedCampaign = await response.json();
      
      toast({
        title: "Success",
        description: `Campaign ${campaignId ? 'updated' : 'created'} successfully.`,
      });
      
      if (onSuccess) {
        onSuccess(savedCampaign);
      } else {
        router.push(`/marketing/campaigns/${savedCampaign.id}`);
      }
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast({
        title: "Error",
        description: "Failed to save campaign. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle adding a goal
  const handleAddGoal = () => {
    if (!goalInput.trim()) return;
    
    const currentGoals = form.getValues("goals") || [];
    form.setValue("goals", [...currentGoals, goalInput.trim()]);
    setGoalInput("");
  };

  // Handle removing a goal
  const handleRemoveGoal = (index: number) => {
    const currentGoals = form.getValues("goals") || [];
    form.setValue("goals", currentGoals.filter((_, i) => i !== index));
  };

  // Handle adding a segment to the campaign
  const handleAddSegment = async (segmentId: string) => {
    if (!campaignId) return;
    
    try {
      const response = await fetch(`/api/support-services/marketing/campaigns/${campaignId}/segments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ segmentId }),
      });
      
      if (!response.ok) throw new Error('Failed to add segment');
      
      // Update selected segments
      const segment = availableSegments.find(s => s.id === segmentId);
      if (segment) {
        setSelectedSegments(prev => [...prev, segment]);
      }
      
      toast({
        title: "Success",
        description: "Segment added to campaign.",
      });
    } catch (error) {
      console.error('Error adding segment:', error);
      toast({
        title: "Error",
        description: "Failed to add segment. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{campaignId ? 'Edit Campaign' : 'Create New Campaign'}</CardTitle>
        <CardDescription>
          {campaignId 
            ? 'Update your marketing campaign details' 
            : 'Create a new marketing campaign to reach your target audience'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Campaign Details</TabsTrigger>
            <TabsTrigger value="audience" disabled={!campaignId}>Target Audience</TabsTrigger>
            <TabsTrigger value="channels" disabled={!campaignId}>Channels</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter campaign name" {...field} />
                      </FormControl>
                      <FormDescription>
                        A descriptive name for your marketing campaign
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter campaign description" 
                          className="min-h-[100px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Detailed description of the campaign's purpose and objectives
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campaign Type</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select campaign type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="EMAIL">Email</SelectItem>
                            <SelectItem value="SMS">SMS</SelectItem>
                            <SelectItem value="SOCIAL_MEDIA">Social Media</SelectItem>
                            <SelectItem value="EVENT">Event</SelectItem>
                            <SelectItem value="PRINT">Print</SelectItem>
                            <SelectItem value="DIGITAL_AD">Digital Ad</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The primary channel for this campaign
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="DRAFT">Draft</SelectItem>
                            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="PAUSED">Paused</SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Current status of the campaign
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Start Date</FormLabel>
                        <DatePicker
                          date={field.value}
                          setDate={field.onChange}
                        />
                        <FormDescription>
                          When the campaign will start
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>End Date (Optional)</FormLabel>
                        <DatePicker
                          date={field.value}
                          setDate={field.onChange}
                        />
                        <FormDescription>
                          When the campaign will end
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Enter budget amount" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>
                        Allocated budget for this campaign
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div>
                  <FormLabel>Campaign Goals</FormLabel>
                  <div className="flex items-center space-x-2 mt-2">
                    <Input
                      placeholder="Enter a campaign goal"
                      value={goalInput}
                      onChange={(e) => setGoalInput(e.target.value)}
                    />
                    <Button type="button" onClick={handleAddGoal}>Add</Button>
                  </div>
                  <FormDescription className="mt-2">
                    Define the objectives you want to achieve with this campaign
                  </FormDescription>
                  
                  <div className="mt-4 space-y-2">
                    {form.watch("goals")?.map((goal, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <span>{goal}</span>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleRemoveGoal(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                  {form.formState.errors.goals && (
                    <p className="text-sm font-medium text-destructive mt-2">
                      {form.formState.errors.goals.message}
                    </p>
                  )}
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
                    {isLoading ? 'Saving...' : campaignId ? 'Update Campaign' : 'Create Campaign'}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="audience">
            {campaignId ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium">Target Segments</h3>
                  <p className="text-sm text-muted-foreground">
                    Select audience segments to target with this campaign
                  </p>
                  
                  <div className="mt-4">
                    <Select onValueChange={handleAddSegment}>
                      <SelectTrigger>
                        <SelectValue placeholder="Add a segment" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSegments
                          .filter(segment => !selectedSegments.some(s => s.id === segment.id))
                          .map(segment => (
                            <SelectItem key={segment.id} value={segment.id}>
                              {segment.name}
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    {selectedSegments.map(segment => (
                      <div key={segment.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <h4 className="font-medium">{segment.name}</h4>
                          <p className="text-sm text-muted-foreground">{segment.description}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm">View</Button>
                        </div>
                      </div>
                    ))}
                    
                    {selectedSegments.length === 0 && (
                      <p className="text-sm text-muted-foreground">No segments added yet</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium">Custom Audience Criteria</h3>
                  <p className="text-sm text-muted-foreground">
                    Define custom criteria for targeting specific audiences
                  </p>
                  
                  {/* Custom audience criteria builder would go here */}
                  <div className="mt-4 p-4 border rounded bg-muted">
                    <p className="text-sm">Advanced audience targeting options will be available soon.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center">
                <p>Please save the campaign first to configure target audience.</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="channels">
            {campaignId ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium">Campaign Channels</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure the channels used for this marketing campaign
                  </p>
                  
                  <div className="mt-4 space-y-4">
                    <div className="p-4 border rounded">
                      <h4 className="font-medium">Email Channel</h4>
                      <div className="mt-2 grid grid-cols-2 gap-4">
                        <div>
                          <FormLabel>Email Template</FormLabel>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select template" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="template1">Monthly Newsletter</SelectItem>
                              <SelectItem value="template2">Promotional Offer</SelectItem>
                              <SelectItem value="template3">Event Invitation</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <FormLabel>Send Schedule</FormLabel>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select schedule" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="immediate">Immediate</SelectItem>
                              <SelectItem value="scheduled">Scheduled</SelectItem>
                              <SelectItem value="recurring">Recurring</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Button>Configure Email</Button>
                      </div>
                    </div>
                    
                    <div className="p-4 border rounded">
                      <h4 className="font-medium">SMS Channel</h4>
                      <div className="mt-2">
                        <FormLabel>Message Template</FormLabel>
                        <Textarea placeholder="Enter SMS message template" className="mt-1" />
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Button>Configure SMS</Button>
                      </div>
                    </div>
                    
                    <div className="p-4 border rounded">
                      <h4 className="font-medium">Add Channel</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Add additional channels to this campaign
                      </p>
                      <div className="mt-4 flex justify-end">
                        <Button variant="outline">Add Channel</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center">
                <p>Please save the campaign first to configure channels.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div>
          {campaignId && (
            <Button variant="outline" className="text-destructive">
              Delete Campaign
            </Button>
          )}
        </div>
        <div className="flex space-x-2">
          {activeTab !== "details" && (
            <Button 
              variant="outline" 
              onClick={() => setActiveTab(activeTab === "audience" ? "details" : "audience")}
            >
              {activeTab === "channels" ? "Previous" : "Cancel"}
            </Button>
          )}
          {activeTab !== "channels" && campaignId && (
            <Button 
              onClick={() => setActiveTab(activeTab === "details" ? "audience" : "channels")}
            >
              Next
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
