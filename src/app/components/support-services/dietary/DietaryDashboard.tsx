'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { 
  CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  ClipboardList, 
  Clock, 
  Edit, 
  FileText, 
  Filter, 
  Plus, 
  RefreshCw, 
  Search, 
  User 
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';

// Status badge colors
const statusColors: Record<string, string> = {
  'PENDING': 'bg-yellow-100 text-yellow-800',
  'APPROVED': 'bg-blue-100 text-blue-800',
  'IN_PREPARATION': 'bg-purple-100 text-purple-800',
  'DELIVERED': 'bg-green-100 text-green-800',
  'COMPLETED': 'bg-green-100 text-green-800',
  'CANCELLED': 'bg-red-100 text-red-800',
};

// Request type colors
const requestTypeColors: Record<string, string> = {
  'REGULAR_MEAL': 'bg-gray-100 text-gray-800',
  'SPECIAL_DIET': 'bg-indigo-100 text-indigo-800',
  'NUTRITIONAL_CONSULTATION': 'bg-teal-100 text-teal-800',
};

export function DietaryDashboard() {
  const [activeTab, setActiveTab] = useState('requests');
  const [requests, setRequests] = useState<any[]>([]);
  const [mealPlans, setMealPlans] = useState<any[]>([]);
  const [nutritionalProfiles, setNutritionalProfiles] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    requestType: '',
    patientId: '',
    startDate: null as Date | null,
    endDate: null as Date | null,
  });
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [selectedMealPlan, setSelectedMealPlan] = useState<any>(null);
  const [showMealPlanDialog, setShowMealPlanDialog] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Fetch dietary requests on component mount and when filters change
  useEffect(() => {
    fetchDietaryRequests();
  }, [page, filters]);

  // Fetch analytics data when analytics tab is selected
  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalytics();
    }
  }, [activeTab]);

  // Fetch dietary requests with filters
  const fetchDietaryRequests = async () => {
    setIsLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '10');
      
      if (filters.status) params.append('status', filters.status);
      if (filters.requestType) params.append('requestType', filters.requestType);
      if (filters.patientId) params.append('patientId', filters.patientId);
      if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
      
      const response = await fetch(`/api/support-services/dietary?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch dietary requests');
      
      const data = await response.json();
      setRequests(data.data);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching dietary requests:', error);
      toast({
        title: "Error",
        description: "Failed to load dietary requests. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/support-services/dietary/analytics?period=MONTHLY');
      if (!response.ok) throw new Error('Failed to fetch analytics');
      
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle filter changes
  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filters change
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      status: '',
      requestType: '',
      patientId: '',
      startDate: null,
      endDate: null,
    });
    setPage(1);
  };

  // Handle pagination
  const handlePreviousPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (page < totalPages) setPage(page + 1);
  };

  // View request details
  const viewRequestDetails = async (requestId: string) => {
    try {
      const response = await fetch(`/api/support-services/dietary/${requestId}`);
      if (!response.ok) throw new Error('Failed to fetch request details');
      
      const data = await response.json();
      setSelectedRequest(data);
      setShowRequestDialog(true);
    } catch (error) {
      console.error('Error fetching request details:', error);
      toast({
        title: "Error",
        description: "Failed to load request details. Please try again.",
        variant: "destructive",
      });
    }
  };

  // View meal plan details
  const viewMealPlanDetails = async (mealPlanId: string) => {
    try {
      const response = await fetch(`/api/support-services/dietary/meal-plans/${mealPlanId}`);
      if (!response.ok) throw new Error('Failed to fetch meal plan details');
      
      const data = await response.json();
      setSelectedMealPlan(data);
      setShowMealPlanDialog(true);
    } catch (error) {
      console.error('Error fetching meal plan details:', error);
      toast({
        title: "Error",
        description: "Failed to load meal plan details. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Update request status
  const updateRequestStatus = async (requestId: string, status: string) => {
    try {
      const response = await fetch(`/api/support-services/dietary/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) throw new Error('Failed to update request status');
      
      toast({
        title: "Status Updated",
        description: `Request status has been updated to ${status}.`,
      });
      
      // Refresh the requests list
      fetchDietaryRequests();
      
      // If viewing request details, refresh those too
      if (selectedRequest && selectedRequest.id === requestId) {
        viewRequestDetails(requestId);
      }
    } catch (error) {
      console.error('Error updating request status:', error);
      toast({
        title: "Error",
        description: "Failed to update request status. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Render request status badge
  const renderStatusBadge = (status: string) => {
    return (
      <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  };

  // Render request type badge
  const renderRequestTypeBadge = (type: string) => {
    return (
      <Badge className={requestTypeColors[type] || 'bg-gray-100 text-gray-800'}>
        {type.replace(/_/g, ' ')}
      </Badge>
    );
  };

  // Render dietary requests table
  const renderRequestsTable = () => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      );
    }

    if (requests.length === 0) {
      return (
        <div className="text-center py-10">
          <p className="text-muted-foreground">No dietary requests found.</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => router.push('/support-services/dietary/new')}
          >
            <Plus className="mr-2 h-4 w-4" /> Create New Request
          </Button>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>End Date</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell className="font-medium">{request.patient?.name || 'Unknown'}</TableCell>
              <TableCell>{renderRequestTypeBadge(request.requestType)}</TableCell>
              <TableCell>{renderStatusBadge(request.status)}</TableCell>
              <TableCell>{format(new Date(request.startDate), 'MMM d, yyyy')}</TableCell>
              <TableCell>
                {request.endDate ? format(new Date(request.endDate), 'MMM d, yyyy') : 'Indefinite'}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <span className="sr-only">Open menu</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => viewRequestDetails(request.id)}>
                      <FileText className="mr-2 h-4 w-4" /> View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push(`/support-services/dietary/edit/${request.id}`)}>
                      <Edit className="mr-2 h-4 w-4" /> Edit Request
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                    {request.status !== 'APPROVED' && (
                      <DropdownMenuItem onClick={() => updateRequestStatus(request.id, 'APPROVED')}>
                        Approve
                      </DropdownMenuItem>
                    )}
                    {request.status !== 'IN_PREPARATION' && request.status === 'APPROVED' && (
                      <DropdownMenuItem onClick={() => updateRequestStatus(request.id, 'IN_PREPARATION')}>
                        Mark In Preparation
                      </DropdownMenuItem>
                    )}
                    {request.status !== 'DELIVERED' && (request.status === 'APPROVED' || request.status === 'IN_PREPARATION') && (
                      <DropdownMenuItem onClick={() => updateRequestStatus(request.id, 'DELIVERED')}>
                        Mark Delivered
                      </DropdownMenuItem>
                    )}
                    {request.status !== 'COMPLETED' && request.status !== 'CANCELLED' && (
                      <DropdownMenuItem onClick={() => updateRequestStatus(request.id, 'COMPLETED')}>
                        Mark Completed
                      </DropdownMenuItem>
                    )}
                    {request.status !== 'CANCELLED' && request.status !== 'COMPLETED' && (
                      <DropdownMenuItem onClick={() => updateRequestStatus(request.id, 'CANCELLED')}>
                        Cancel Request
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  // Render meal plans tab
  const renderMealPlansTab = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Meal Plans</h3>
          <Button onClick={() => router.push('/support-services/dietary/meal-plans/new')}>
            <Plus className="mr-2 h-4 w-4" /> Create Meal Plan
          </Button>
        </div>
        
        {/* Meal plans implementation would go here */}
        <div className="text-center py-10">
          <p className="text-muted-foreground">Meal plans feature is under development.</p>
        </div>
      </div>
    );
  };

  // Render nutritional profiles tab
  const renderNutritionalProfilesTab = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Nutritional Profiles</h3>
          <div className="flex gap-2">
            <Input 
              placeholder="Search patients..." 
              className="max-w-xs"
            />
            <Button variant="outline">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Nutritional profiles implementation would go here */}
        <div className="text-center py-10">
          <p className="text-muted-foreground">Nutritional profiles feature is under development.</p>
        </div>
      </div>
    );
  };

  // Render analytics tab
  const renderAnalyticsTab = () => {
    if (!analytics) {
      return (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[200px] w-full" />
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Dietary Analytics</h3>
          <Select defaultValue="MONTHLY" onValueChange={(value) => fetchAnalytics()}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DAILY">Daily (Last 30 days)</SelectItem>
              <SelectItem value="WEEKLY">Weekly (Last 90 days)</SelectItem>
              <SelectItem value="MONTHLY">Monthly (Last 12 months)</SelectItem>
              <SelectItem value="YEARLY">Yearly (Last 5 years)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Requests by Status */}
          <Card>
            <CardHeader>
              <CardTitle>Requests by Status</CardTitle>
              <CardDescription>Distribution of dietary requests by status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] flex items-center justify-center">
                {/* Chart would go here */}
                <p className="text-muted-foreground">Chart visualization coming soon</p>
              </div>
              <div className="mt-4 space-y-2">
                {analytics.requestsByStatus.map((item: any) => (
                  <div key={item.status} className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${statusColors[item.status] || 'bg-gray-200'}`}></div>
                      <span>{item.status.replace(/_/g, ' ')}</span>
                    </div>
                    <span className="font-medium">{item._count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Requests by Type */}
          <Card>
            <CardHeader>
              <CardTitle>Requests by Type</CardTitle>
              <CardDescription>Distribution of dietary requests by type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] flex items-center justify-center">
                {/* Chart would go here */}
                <p className="text-muted-foreground">Chart visualization coming soon</p>
              </div>
              <div className="mt-4 space-y-2">
                {analytics.requestsByType.map((item: any) => (
                  <div key={item.requestType} className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${requestTypeColors[item.requestType] || 'bg-gray-200'}`}></div>
                      <span>{item.requestType.replace(/_/g, ' ')}</span>
                    </div>
                    <span className="font-medium">{item._count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Average Nutritional Values */}
          <Card>
            <CardHeader>
              <CardTitle>Average Nutritional Values</CardTitle>
              <CardDescription>Average nutritional content per meal plan</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.averageNutrition ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Calories</p>
                    <p className="text-2xl font-bold">{analytics.averageNutrition.calories}</p>
                    <p className="text-xs text-muted-foreground">kcal</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Protein</p>
                    <p className="text-2xl font-bold">{analytics.averageNutrition.protein}</p>
                    <p className="text-xs text-muted-foreground">g</p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Carbohydrates</p>
                    <p className="text-2xl font-bold">{analytics.averageNutrition.carbohydrates}</p>
                    <p className="text-xs text-muted-foreground">g</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Fat</p>
                    <p className="text-2xl font-bold">{analytics.averageNutrition.fat}</p>
                    <p className="text-xs text-muted-foreground">g</p>
                  </div>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center">
                  <p className="text-muted-foreground">No nutritional data available</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Top Dietary Restrictions */}
          <Card>
            <CardHeader>
              <CardTitle>Common Dietary Needs</CardTitle>
              <CardDescription>Most common restrictions and allergies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Top Restrictions</h4>
                  <div className="flex flex-wrap gap-2">
                    {analytics.topRestrictions.slice(0, 5).map((item: any) => (
                      <Badge key={item.name} variant="outline" className="flex items-center gap-1">
                        {item.name}
                        <span className="bg-blue-100 text-blue-800 text-xs px-1 rounded-sm">{item.count}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Top Allergies</h4>
                  <div className="flex flex-wrap gap-2">
                    {analytics.topAllergies.slice(0, 5).map((item: any) => (
                      <Badge key={item.name} variant="outline" className="flex items-center gap-1">
                        {item.name}
                        <span className="bg-red-100 text-red-800 text-xs px-1 rounded-sm">{item.count}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // Render request details dialog
  const renderRequestDetailsDialog = () => {
    if (!selectedRequest) return null;
    
    return (
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Dietary Request Details</DialogTitle>
            <DialogDescription>
              Request ID: {selectedRequest.id}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Patient</p>
                <p className="font-medium">{selectedRequest.patient?.name || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                {renderStatusBadge(selectedRequest.status)}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                {renderRequestTypeBadge(selectedRequest.requestType)}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p>{format(new Date(selectedRequest.startDate), 'MMM d, yyyy')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">End Date</p>
                <p>{selectedRequest.endDate ? format(new Date(selectedRequest.endDate), 'MMM d, yyyy') : 'Indefinite'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Requested By</p>
                <p>{selectedRequest.requestedByUser?.name || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved By</p>
                <p>{selectedRequest.approvedByUser?.name || 'Not approved yet'}</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Meal Preferences</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedRequest.mealPreferences.length > 0 ? (
                    selectedRequest.mealPreferences.map((pref: string) => (
                      <Badge key={pref} variant="secondary">{pref}</Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No meal preferences specified</p>
                  )}
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium">Dietary Restrictions</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedRequest.dietaryRestrictions.length > 0 ? (
                    selectedRequest.dietaryRestrictions.map((restriction: string) => (
                      <Badge key={restriction} variant="secondary">{restriction}</Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No dietary restrictions specified</p>
                  )}
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium">Allergies</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedRequest.allergies.length > 0 ? (
                    selectedRequest.allergies.map((allergy: string) => (
                      <Badge key={allergy} variant="destructive">{allergy}</Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No allergies specified</p>
                  )}
                </div>
              </div>
              
              {selectedRequest.specialInstructions && (
                <div>
                  <p className="text-sm font-medium">Special Instructions</p>
                  <p className="text-sm mt-1">{selectedRequest.specialInstructions}</p>
                </div>
              )}
            </div>
            
            <Separator />
            
            <div>
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm font-medium">Meal Plans</p>
                <Button size="sm" variant="outline" onClick={() => router.push(`/support-services/dietary/meal-plans/new?requestId=${selectedRequest.id}`)}>
                  <Plus className="mr-2 h-4 w-4" /> Add Meal Plan
                </Button>
              </div>
              
              {selectedRequest.mealPlans && selectedRequest.mealPlans.length > 0 ? (
                <div className="space-y-2">
                  {selectedRequest.mealPlans.map((mealPlan: any) => (
                    <div 
                      key={mealPlan.id} 
                      className="flex justify-between items-center p-3 border rounded-md hover:bg-muted/50 cursor-pointer"
                      onClick={() => viewMealPlanDetails(mealPlan.id)}
                    >
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{format(new Date(mealPlan.date), 'MMM d, yyyy')}</span>
                      </div>
                      <Badge className={statusColors[mealPlan.status] || 'bg-gray-100 text-gray-800'}>
                        {mealPlan.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No meal plans created yet</p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>Close</Button>
            <Button onClick={() => router.push(`/support-services/dietary/edit/${selectedRequest.id}`)}>
              <Edit className="mr-2 h-4 w-4" /> Edit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Dietary Management</h2>
        <Button onClick={() => router.push('/support-services/dietary/new')}>
          <Plus className="mr-2 h-4 w-4" /> New Request
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="meal-plans">Meal Plans</TabsTrigger>
          <TabsTrigger value="profiles">Nutritional Profiles</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="requests" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dietary Requests</CardTitle>
              <CardDescription>
                Manage patient dietary requests and meal plans
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Filters */}
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Status</p>
                    <Select 
                      value={filters.status} 
                      onValueChange={(value) => handleFilterChange('status', value)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All statuses</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="IN_PREPARATION">In Preparation</SelectItem>
                        <SelectItem value="DELIVERED">Delivered</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Request Type</p>
                    <Select 
                      value={filters.requestType} 
                      onValueChange={(value) => handleFilterChange('requestType', value)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All types</SelectItem>
                        <SelectItem value="REGULAR_MEAL">Regular Meal</SelectItem>
                        <SelectItem value="SPECIAL_DIET">Special Diet</SelectItem>
                        <SelectItem value="NUTRITIONAL_CONSULTATION">Nutritional Consultation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Start Date</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-[180px] justify-start text-left font-normal",
                            !filters.startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filters.startDate ? format(filters.startDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={filters.startDate || undefined}
                          onSelect={(date) => handleFilterChange('startDate', date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <Button variant="ghost" onClick={resetFilters}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Reset Filters
                  </Button>
                </div>
                
                {/* Requests Table */}
                {renderRequestsTable()}
                
                {/* Pagination */}
                {!isLoading && requests.length > 0 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </p>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousPage}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="sr-only">Previous page</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={page === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                        <span className="sr-only">Next page</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="meal-plans">
          <Card>
            <CardHeader>
              <CardTitle>Meal Plans</CardTitle>
              <CardDescription>
                Create and manage patient meal plans
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderMealPlansTab()}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="profiles">
          <Card>
            <CardHeader>
              <CardTitle>Nutritional Profiles</CardTitle>
              <CardDescription>
                Manage patient nutritional profiles and dietary needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderNutritionalProfilesTab()}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Dietary Analytics</CardTitle>
              <CardDescription>
                View insights and statistics about dietary services
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderAnalyticsTab()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Request Details Dialog */}
      {renderRequestDetailsDialog()}
      
      {/* Meal Plan Details Dialog would go here */}
    </div>
  );
}
