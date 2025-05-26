'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pagination } from '@/components/ui/pagination';
import { format } from 'date-fns';
import { 
  Wrench, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock3,
  Filter,
  Plus,
  RefreshCw,
  Search,
  HardDrive,
  Tool
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

// Status badge color mapping
const statusColors: Record<string, string> = {
  'PENDING': 'bg-yellow-500',
  'ASSIGNED': 'bg-blue-500',
  'IN_PROGRESS': 'bg-purple-500',
  'ON_HOLD': 'bg-orange-500',
  'COMPLETED': 'bg-green-500',
  'CANCELLED': 'bg-gray-500'
};

// Priority badge color mapping
const priorityColors: Record<string, string> = {
  'LOW': 'bg-blue-500',
  'MEDIUM': 'bg-yellow-500',
  'HIGH': 'bg-orange-500',
  'EMERGENCY': 'bg-red-500'
};

// Request type icon mapping
const requestTypeIcons: Record<string, any> = {
  'REPAIR': <Wrench className="h-4 w-4 mr-1" />,
  'PREVENTIVE': <Tool className="h-4 w-4 mr-1" />,
  'INSTALLATION': <HardDrive className="h-4 w-4 mr-1" />,
  'INSPECTION': <Search className="h-4 w-4 mr-1" />
};

export function MaintenanceDashboard() {
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [locations, setLocations] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterLocation, setFilterLocation] = useState<string>('');
  const [filterAsset, setFilterAsset] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  // Load initial data from URL params
  useEffect(() => {
    const tab = searchParams.get('tab') || 'all';
    const status = searchParams.get('status') || '';
    const location = searchParams.get('location') || '';
    const asset = searchParams.get('asset') || '';
    const priority = searchParams.get('priority') || '';
    const type = searchParams.get('type') || '';
    const page = parseInt(searchParams.get('page') || '1');
    
    setActiveTab(tab);
    setFilterStatus(status);
    setFilterLocation(location);
    setFilterAsset(asset);
    setFilterPriority(priority);
    setFilterType(type);
    setCurrentPage(page);
  }, [searchParams]);
  
  // Fetch locations for filtering
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch('/api/locations');
        if (!response.ok) throw new Error('Failed to fetch locations');
        const data = await response.json();
        setLocations(data);
      } catch (error) {
        console.error('Error fetching locations:', error);
      }
    };
    
    fetchLocations();
  }, []);
  
  // Fetch assets for filtering
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const response = await fetch('/api/support-services/maintenance/assets');
        if (!response.ok) throw new Error('Failed to fetch assets');
        const data = await response.json();
        setAssets(data.data || []);
      } catch (error) {
        console.error('Error fetching assets:', error);
      }
    };
    
    fetchAssets();
  }, []);
  
  // Fetch maintenance requests
  useEffect(() => {
    const fetchRequests = async () => {
      setIsLoading(true);
      try {
        // Build query parameters
        const params = new URLSearchParams();
        
        if (filterStatus) params.append('status', filterStatus);
        if (filterLocation) params.append('locationId', filterLocation);
        if (filterAsset) params.append('assetId', filterAsset);
        if (filterPriority) params.append('priority', filterPriority);
        if (filterType) params.append('requestType', filterType);
        
        // Handle tab-specific filters
        if (activeTab === 'pending') {
          params.set('status', 'PENDING');
        } else if (activeTab === 'inProgress') {
          params.set('status', 'IN_PROGRESS');
        } else if (activeTab === 'completed') {
          params.set('status', 'COMPLETED');
        } else if (activeTab === 'emergency') {
          params.set('priority', 'EMERGENCY');
        } else if (activeTab === 'repairs') {
          params.set('requestType', 'REPAIR');
        }
        
        params.append('page', currentPage.toString());
        params.append('limit', '10');
        
        const response = await fetch(`/api/support-services/maintenance?${params.toString()}`);
        
        if (!response.ok) throw new Error('Failed to fetch requests');
        
        const data = await response.json();
        setRequests(data.data);
        setTotalPages(data.pagination.totalPages);
      } catch (error) {
        console.error('Error fetching requests:', error);
        toast({
          title: "Error",
          description: "Failed to load maintenance requests. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRequests();
  }, [activeTab, filterStatus, filterLocation, filterAsset, filterPriority, filterType, currentPage, toast]);
  
  // Update URL with current filters
  const updateUrlParams = () => {
    const params = new URLSearchParams();
    
    if (activeTab !== 'all') params.set('tab', activeTab);
    if (filterStatus) params.set('status', filterStatus);
    if (filterLocation) params.set('location', filterLocation);
    if (filterAsset) params.set('asset', filterAsset);
    if (filterPriority) params.set('priority', filterPriority);
    if (filterType) params.set('type', filterType);
    if (currentPage > 1) params.set('page', currentPage.toString());
    
    router.push(`/support-services/maintenance?${params.toString()}`);
  };
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setCurrentPage(1);
    
    // Reset filters when changing tabs to avoid conflicts
    if (value === 'pending') {
      setFilterStatus('PENDING');
      setFilterPriority('');
      setFilterType('');
    } else if (value === 'inProgress') {
      setFilterStatus('IN_PROGRESS');
      setFilterPriority('');
      setFilterType('');
    } else if (value === 'completed') {
      setFilterStatus('COMPLETED');
      setFilterPriority('');
      setFilterType('');
    } else if (value === 'emergency') {
      setFilterStatus('');
      setFilterPriority('EMERGENCY');
      setFilterType('');
    } else if (value === 'repairs') {
      setFilterStatus('');
      setFilterPriority('');
      setFilterType('REPAIR');
    } else {
      setFilterStatus('');
      setFilterPriority('');
      setFilterType('');
    }
  };
  
  // Handle filter changes
  const applyFilters = () => {
    setCurrentPage(1);
    updateUrlParams();
  };
  
  // Reset all filters
  const resetFilters = () => {
    setFilterStatus('');
    setFilterLocation('');
    setFilterAsset('');
    setFilterPriority('');
    setFilterType('');
    setCurrentPage(1);
    
    if (activeTab !== 'all') {
      setActiveTab('all');
    } else {
      updateUrlParams();
    }
  };
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  // Navigate to create new request
  const handleCreateRequest = () => {
    router.push('/support-services/maintenance/new');
  };
  
  // Navigate to request details
  const handleViewRequest = (id: string) => {
    router.push(`/support-services/maintenance/${id}`);
  };
  
  // Render status badge
  const renderStatusBadge = (status: string) => {
    const color = statusColors[status] || 'bg-gray-500';
    let icon;
    
    switch (status) {
      case 'PENDING':
        icon = <Clock className="h-3 w-3 mr-1" />;
        break;
      case 'ASSIGNED':
        icon = <User className="h-3 w-3 mr-1" />;
        break;
      case 'IN_PROGRESS':
        icon = <Clock3 className="h-3 w-3 mr-1" />;
        break;
      case 'ON_HOLD':
        icon = <AlertTriangle className="h-3 w-3 mr-1" />;
        break;
      case 'COMPLETED':
        icon = <CheckCircle2 className="h-3 w-3 mr-1" />;
        break;
      case 'CANCELLED':
        icon = <XCircle className="h-3 w-3 mr-1" />;
        break;
      default:
        icon = null;
    }
    
    return (
      <Badge className={`${color} flex items-center`}>
        {icon}
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  };
  
  // Render priority badge
  const renderPriorityBadge = (priority: string) => {
    const color = priorityColors[priority] || 'bg-gray-500';
    let icon = priority === 'EMERGENCY' ? <AlertTriangle className="h-3 w-3 mr-1" /> : null;
    
    return (
      <Badge className={`${color} flex items-center`}>
        {icon}
        {priority}
      </Badge>
    );
  };
  
  // Render request type with icon
  const renderRequestType = (requestType: string) => {
    const icon = requestTypeIcons[requestType] || null;
    
    return (
      <div className="flex items-center">
        {icon}
        {requestType.replace(/_/g, ' ')}
      </div>
    );
  };
  
  // Render loading skeleton
  const renderSkeleton = () => (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="flex justify-between">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-6 w-20" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </CardContent>
          <CardFooter>
            <div className="flex justify-between w-full">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-8 w-24" />
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Maintenance Management</h1>
        <Button onClick={handleCreateRequest}>
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid grid-cols-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="inProgress">In Progress</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="emergency">Emergency</TabsTrigger>
          <TabsTrigger value="repairs">Repairs</TabsTrigger>
        </TabsList>
        
        <div className="my-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <label className="text-sm font-medium">Status</label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="ASSIGNED">Assigned</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="ON_HOLD">On Hold</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium">Location</label>
            <Select value={filterLocation} onValueChange={setFilterLocation}>
              <SelectTrigger>
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Locations</SelectItem>
                {locations.map(location => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium">Asset</label>
            <Select value={filterAsset} onValueChange={setFilterAsset}>
              <SelectTrigger>
                <SelectValue placeholder="All Assets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Assets</SelectItem>
                {assets.map(asset => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium">Priority</label>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger>
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Priorities</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="EMERGENCY">Emergency</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-end space-x-2">
            <Button onClick={applyFilters} className="flex-1">
              <Filter className="h-4 w-4 mr-2" />
              Apply Filters
            </Button>
            <Button variant="outline" onClick={resetFilters}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <TabsContent value={activeTab} className="mt-0">
          {isLoading ? (
            renderSkeleton()
          ) : requests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <Wrench className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-900">No requests found</p>
                <p className="text-sm text-gray-500 mt-1">
                  {activeTab === 'all' 
                    ? 'There are no maintenance requests matching your filters.' 
                    : `There are no ${activeTab === 'inProgress' ? 'in progress' : activeTab} maintenance requests.`}
                </p>
                <Button onClick={handleCreateRequest} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Request
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <Card key={request.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {renderRequestType(request.requestType)}
                        </CardTitle>
                        <CardDescription className="flex items-center mt-1">
                          <MapPin className="h-3 w-3 mr-1" />
                          {request.location?.name || 'Unknown Location'}
                          {request.asset && (
                            <span className="ml-2">• {request.asset.name}</span>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex space-x-2">
                        {renderPriorityBadge(request.priority)}
                        {renderStatusBadge(request.status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm line-clamp-2">{request.description}</p>
                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        Created: {format(new Date(request.createdAt), 'MMM d, yyyy')}
                      </div>
                      {request.scheduledDate && (
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          Scheduled: {format(new Date(request.scheduledDate), 'MMM d, yyyy')}
                        </div>
                      )}
                      <div className="flex items-center">
                        <User className="h-3 w-3 mr-1" />
                        By: {request.requestedByUser?.name || 'Unknown'}
                      </div>
                      {request.estimatedHours && (
                        <div className="flex items-center">
                          <Clock3 className="h-3 w-3 mr-1" />
                          Est. Hours: {request.estimatedHours}
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between pt-0">
                    <div className="text-xs text-gray-500">
                      {request.workOrders?.length || 0} work order(s)
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewRequest(request.id)}
                    >
                      View Details
                    </Button>
                  </CardFooter>
                </Card>
              ))}
              
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
