'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2, Search, Filter, Download, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';

// Define types for feedback and complaint data
interface Feedback {
  id: string;
  type: string;
  source: string;
  rating: number;
  comments?: string;
  status: string;
  createdAt: string;
  departmentId?: string;
  department?: { name: string };
  serviceType?: string;
  submittedById?: string;
  submittedByUser?: { name: string; email: string };
  reviewedById?: string;
  reviewedByUser?: { name: string };
  reviewedAt?: string;
  _count?: { responses: number; attachments: number; followUpActions: number };
}

interface Complaint {
  id: string;
  title: string;
  category: string;
  severity: string;
  status: string;
  createdAt: string;
  departmentId?: string;
  department?: { name: string };
  submittedById?: string;
  submittedByUser?: { name: string; email: string };
  assignedToId?: string;
  assignedToUser?: { name: string };
  dueDate?: string;
  _count?: { activities: number; attachments: number; followUpActions: number };
}

interface AnalyticsData {
  feedbackByType: { type: string; _count: number }[];
  feedbackBySource: { source: string; _count: number }[];
  feedbackByStatus: { status: string; _count: number }[];
  feedbackByServiceType: { serviceType: string; _count: number }[];
  feedbackByDepartment: { department: string; count: number }[];
  overallRating: number;
  ratingsByServiceType: Record<string, { count: number; sum: number; avg: number }>;
  ratingsByDepartment: Record<string, { count: number; sum: number; avg: number }>;
  complaintsByCategory: { category: string; _count: number }[];
  complaintsBySeverity: { severity: string; _count: number }[];
  complaintsByStatus: { status: string; _count: number }[];
  resolutionTimes: Record<string, { count: number; totalDays: number; avgDays: number }>;
  period: string;
}

// Define columns for feedback table
const feedbackColumns: ColumnDef<Feedback>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => <div className="font-mono text-xs">{row.getValue('id').substring(0, 8)}...</div>,
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => (
      <Badge variant="outline" className="capitalize">
        {row.getValue('type').replace(/_/g, ' ').toLowerCase()}
      </Badge>
    ),
  },
  {
    accessorKey: 'rating',
    header: 'Rating',
    cell: ({ row }) => {
      const rating = row.getValue('rating') as number;
      return (
        <div className="flex">
          {[...Array(5)].map((_, i) => (
            <span key={i} className={`text-sm ${i < rating ? 'text-yellow-500' : 'text-gray-300'}`}>
              ★
            </span>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: 'source',
    header: 'Source',
    cell: ({ row }) => (
      <Badge variant="secondary" className="capitalize">
        {row.getValue('source').toLowerCase()}
      </Badge>
    ),
  },
  {
    accessorKey: 'department',
    header: 'Department',
    cell: ({ row }) => {
      const department = row.original.department;
      return department ? department.name : '-';
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
      
      switch (status) {
        case 'NEW':
          variant = 'default';
          break;
        case 'REVIEWED':
          variant = 'secondary';
          break;
        case 'ADDRESSED':
          variant = 'outline';
          break;
        case 'CLOSED':
          variant = 'outline';
          break;
      }
      
      return (
        <Badge variant={variant} className="capitalize">
          {status.toLowerCase()}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Date',
    cell: ({ row }) => format(new Date(row.getValue('createdAt')), 'MMM d, yyyy'),
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <Button variant="ghost" size="sm" onClick={() => window.location.href = `/feedback/${row.original.id}`}>
        View
      </Button>
    ),
  },
];

// Define columns for complaint table
const complaintColumns: ColumnDef<Complaint>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => <div className="font-mono text-xs">{row.getValue('id').substring(0, 8)}...</div>,
  },
  {
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }) => <div className="max-w-[200px] truncate">{row.getValue('title')}</div>,
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => (
      <Badge variant="outline" className="capitalize">
        {row.getValue('category').toLowerCase()}
      </Badge>
    ),
  },
  {
    accessorKey: 'severity',
    header: 'Severity',
    cell: ({ row }) => {
      const severity = row.getValue('severity') as string;
      let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
      
      switch (severity) {
        case 'LOW':
          variant = 'outline';
          break;
        case 'MEDIUM':
          variant = 'secondary';
          break;
        case 'HIGH':
          variant = 'default';
          break;
        case 'CRITICAL':
          variant = 'destructive';
          break;
      }
      
      return (
        <Badge variant={variant} className="capitalize">
          {severity.toLowerCase()}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
      
      switch (status) {
        case 'SUBMITTED':
          variant = 'default';
          break;
        case 'UNDER_INVESTIGATION':
          variant = 'secondary';
          break;
        case 'RESOLVED':
          variant = 'outline';
          break;
        case 'CLOSED':
          variant = 'outline';
          break;
        case 'ESCALATED':
          variant = 'destructive';
          break;
      }
      
      return (
        <Badge variant={variant} className="capitalize">
          {status.toLowerCase().replace(/_/g, ' ')}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'department',
    header: 'Department',
    cell: ({ row }) => {
      const department = row.original.department;
      return department ? department.name : '-';
    },
  },
  {
    accessorKey: 'assignedToUser',
    header: 'Assigned To',
    cell: ({ row }) => {
      const assignedTo = row.original.assignedToUser;
      return assignedTo ? assignedTo.name : '-';
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Date',
    cell: ({ row }) => format(new Date(row.getValue('createdAt')), 'MMM d, yyyy'),
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <Button variant="ghost" size="sm" onClick={() => window.location.href = `/complaints/${row.original.id}`}>
        View
      </Button>
    ),
  },
];

// Define color palette for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#6C757D'];

export default function FeedbackDashboard() {
  const [activeTab, setActiveTab] = useState('feedback');
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackData, setFeedbackData] = useState<Feedback[]>([]);
  const [complaintData, setComplaintData] = useState<Complaint[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState('MONTHLY');
  
  // Filters
  const [feedbackFilters, setFeedbackFilters] = useState({
    type: '',
    source: '',
    status: '',
    departmentId: '',
    serviceType: '',
    page: 1,
    limit: 10,
  });
  
  const [complaintFilters, setComplaintFilters] = useState({
    category: '',
    severity: '',
    status: '',
    departmentId: '',
    assignedToId: '',
    page: 1,
    limit: 10,
  });
  
  // Pagination
  const [feedbackPagination, setFeedbackPagination] = useState({
    total: 0,
    totalPages: 0,
  });
  
  const [complaintPagination, setComplaintPagination] = useState({
    total: 0,
    totalPages: 0,
  });

  // Load data on component mount and when filters change
  useEffect(() => {
    loadFeedbackData();
  }, [feedbackFilters]);
  
  useEffect(() => {
    loadComplaintData();
  }, [complaintFilters]);
  
  useEffect(() => {
    loadAnalyticsData();
  }, [analyticsPeriod]);

  // Load feedback data
  const loadFeedbackData = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(feedbackFilters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value.toString());
      });
      
      const response = await fetch(`/api/support-services/feedback?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to load feedback data');
      }
      
      const data = await response.json();
      setFeedbackData(data.data);
      setFeedbackPagination({
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
      });
    } catch (error) {
      console.error('Error loading feedback data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load feedback data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load complaint data
  const loadComplaintData = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(complaintFilters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value.toString());
      });
      
      const response = await fetch(`/api/support-services/feedback/complaint?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to load complaint data');
      }
      
      const data = await response.json();
      setComplaintData(data.data);
      setComplaintPagination({
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
      });
    } catch (error) {
      console.error('Error loading complaint data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load complaint data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load analytics data
  const loadAnalyticsData = async () => {
    try {
      const response = await fetch(`/api/support-services/feedback/analytics?period=${analyticsPeriod}`);
      if (!response.ok) {
        throw new Error('Failed to load analytics data');
      }
      
      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error loading analytics data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load analytics data',
        variant: 'destructive',
      });
    }
  };

  // Handle feedback filter changes
  const handleFeedbackFilterChange = (key: string, value: string | number) => {
    setFeedbackFilters(prev => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? value : 1, // Reset page when other filters change
    }));
  };

  // Handle complaint filter changes
  const handleComplaintFilterChange = (key: string, value: string | number) => {
    setComplaintFilters(prev => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? value : 1, // Reset page when other filters change
    }));
  };

  // Export data to CSV
  const exportToCSV = (data: any[], filename: string) => {
    const headers = Object.keys(data[0]).filter(key => !key.startsWith('_'));
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'object' && value !== null) {
            return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          }
          return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
        }).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Prepare data for charts
  const prepareChartData = (data: any[]) => {
    return data.map((item, index) => ({
      ...item,
      color: COLORS[index % COLORS.length],
    }));
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Feedback & Complaint Dashboard</h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => window.location.href = '/feedback/new'}>
            New Feedback
          </Button>
          <Button onClick={() => window.location.href = '/complaints/new'}>
            New Complaint
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-[400px]">
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="complaints">Complaints</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Feedback Tab */}
        <TabsContent value="feedback" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Feedback Management</CardTitle>
              <CardDescription>
                View and manage feedback from patients, visitors, and staff.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="w-full md:w-auto">
                  <Label htmlFor="feedback-type">Type</Label>
                  <Select
                    value={feedbackFilters.type}
                    onValueChange={(value) => handleFeedbackFilterChange('type', value)}
                  >
                    <SelectTrigger id="feedback-type" className="w-[180px]">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Types</SelectItem>
                      <SelectItem value="PATIENT_SATISFACTION">Patient Satisfaction</SelectItem>
                      <SelectItem value="SERVICE_QUALITY">Service Quality</SelectItem>
                      <SelectItem value="STAFF_PERFORMANCE">Staff Performance</SelectItem>
                      <SelectItem value="FACILITY_CONDITION">Facility Condition</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full md:w-auto">
                  <Label htmlFor="feedback-source">Source</Label>
                  <Select
                    value={feedbackFilters.source}
                    onValueChange={(value) => handleFeedbackFilterChange('source', value)}
                  >
                    <SelectTrigger id="feedback-source" className="w-[180px]">
                      <SelectValue placeholder="All Sources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Sources</SelectItem>
                      <SelectItem value="PATIENT">Patient</SelectItem>
                      <SelectItem value="VISITOR">Visitor</SelectItem>
                      <SelectItem value="STAFF">Staff</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full md:w-auto">
                  <Label htmlFor="feedback-status">Status</Label>
                  <Select
                    value={feedbackFilters.status}
                    onValueChange={(value) => handleFeedbackFilterChange('status', value)}
                  >
                    <SelectTrigger id="feedback-status" className="w-[180px]">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Statuses</SelectItem>
                      <SelectItem value="NEW">New</SelectItem>
                      <SelectItem value="REVIEWED">Reviewed</SelectItem>
                      <SelectItem value="ADDRESSED">Addressed</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-grow"></div>

                <div className="flex items-end space-x-2">
                  <Button variant="outline" onClick={() => loadFeedbackData()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => exportToCSV(feedbackData, 'feedback')}
                    disabled={feedbackData.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>

              <DataTable
                columns={feedbackColumns}
                data={feedbackData}
                isLoading={isLoading}
                pagination={{
                  pageIndex: feedbackFilters.page - 1,
                  pageSize: feedbackFilters.limit,
                  pageCount: feedbackPagination.totalPages,
                  onPageChange: (pageIndex) => handleFeedbackFilterChange('page', pageIndex + 1),
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Complaints Tab */}
        <TabsContent value="complaints" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Complaint Management</CardTitle>
              <CardDescription>
                View and manage complaints from patients, visitors, and staff.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="w-full md:w-auto">
                  <Label htmlFor="complaint-category">Category</Label>
                  <Select
                    value={complaintFilters.category}
                    onValueChange={(value) => handleComplaintFilterChange('category', value)}
                  >
                    <SelectTrigger id="complaint-category" className="w-[180px]">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Categories</SelectItem>
                      <SelectItem value="CLINICAL">Clinical Care</SelectItem>
                      <SelectItem value="ADMINISTRATIVE">Administrative</SelectItem>
                      <SelectItem value="FACILITY">Facility</SelectItem>
                      <SelectItem value="STAFF">Staff Behavior</SelectItem>
                      <SelectItem value="BILLING">Billing</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full md:w-auto">
                  <Label htmlFor="complaint-severity">Severity</Label>
                  <Select
                    value={complaintFilters.severity}
                    onValueChange={(value) => handleComplaintFilterChange('severity', value)}
                  >
                    <SelectTrigger id="complaint-severity" className="w-[180px]">
                      <SelectValue placeholder="All Severities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Severities</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full md:w-auto">
                  <Label htmlFor="complaint-status">Status</Label>
                  <Select
                    value={complaintFilters.status}
                    onValueChange={(value) => handleComplaintFilterChange('status', value)}
                  >
                    <SelectTrigger id="complaint-status" className="w-[180px]">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Statuses</SelectItem>
                      <SelectItem value="SUBMITTED">Submitted</SelectItem>
                      <SelectItem value="UNDER_INVESTIGATION">Under Investigation</SelectItem>
                      <SelectItem value="RESOLVED">Resolved</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                      <SelectItem value="ESCALATED">Escalated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-grow"></div>

                <div className="flex items-end space-x-2">
                  <Button variant="outline" onClick={() => loadComplaintData()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => exportToCSV(complaintData, 'complaints')}
                    disabled={complaintData.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>

              <DataTable
                columns={complaintColumns}
                data={complaintData}
                isLoading={isLoading}
                pagination={{
                  pageIndex: complaintFilters.page - 1,
                  pageSize: complaintFilters.limit,
                  pageCount: complaintPagination.totalPages,
                  onPageChange: (pageIndex) => handleComplaintFilterChange('page', pageIndex + 1),
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Feedback & Complaint Analytics</CardTitle>
                  <CardDescription>
                    Analyze trends and patterns in feedback and complaints.
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="analytics-period">Time Period:</Label>
                  <Select
                    value={analyticsPeriod}
                    onValueChange={setAnalyticsPeriod}
                  >
                    <SelectTrigger id="analytics-period" className="w-[150px]">
                      <SelectValue placeholder="Select Period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAILY">Last 30 Days</SelectItem>
                      <SelectItem value="WEEKLY">Last 90 Days</SelectItem>
                      <SelectItem value="MONTHLY">Last 12 Months</SelectItem>
                      <SelectItem value="YEARLY">Last 5 Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!analyticsData ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Feedback Overview */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Feedback Overview</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Feedback by Type */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Feedback by Type</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={prepareChartData(analyticsData.feedbackByType)}
                                  dataKey="_count"
                                  nameKey="type"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={80}
                                  label={({ type }) => type.replace(/_/g, ' ')}
                                >
                                  {analyticsData.feedbackByType.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value, name) => [value, name.replace(/_/g, ' ')]} />
                                <Legend formatter={(value) => value.replace(/_/g, ' ')} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Average Ratings */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Average Ratings</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={[
                                  { name: 'Overall', rating: analyticsData.overallRating },
                                  ...Object.entries(analyticsData.ratingsByServiceType).map(([type, data]) => ({
                                    name: type.replace(/_/g, ' '),
                                    rating: data.avg,
                                  })),
                                ]}
                                margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
                                <YAxis domain={[0, 5]} />
                                <Tooltip formatter={(value) => [Number(value).toFixed(2), 'Rating']} />
                                <Bar dataKey="rating" fill="#8884d8" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Complaint Overview */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Complaint Overview</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Complaints by Category */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Complaints by Category</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={prepareChartData(analyticsData.complaintsByCategory)}
                                  dataKey="_count"
                                  nameKey="category"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={80}
                                  label={({ category }) => category.replace(/_/g, ' ')}
                                >
                                  {analyticsData.complaintsByCategory.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value, name) => [value, name.replace(/_/g, ' ')]} />
                                <Legend formatter={(value) => value.replace(/_/g, ' ')} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Complaints by Severity */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Complaints by Severity</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={analyticsData.complaintsBySeverity}
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="severity" />
                                <YAxis />
                                <Tooltip formatter={(value, name, props) => [value, props.payload.severity]} />
                                <Bar dataKey="_count" name="Count">
                                  {analyticsData.complaintsBySeverity.map((entry, index) => {
                                    let color = '#8884d8';
                                    switch (entry.severity) {
                                      case 'LOW':
                                        color = '#82ca9d';
                                        break;
                                      case 'MEDIUM':
                                        color = '#8884d8';
                                        break;
                                      case 'HIGH':
                                        color = '#ffc658';
                                        break;
                                      case 'CRITICAL':
                                        color = '#ff8042';
                                        break;
                                    }
                                    return <Cell key={`cell-${index}`} fill={color} />;
                                  })}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Resolution Times */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Average Resolution Time (Days)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={[
                              { name: 'Overall', days: analyticsData.resolutionTimes.overall.avgDays },
                              { name: 'Low', days: analyticsData.resolutionTimes.LOW.avgDays },
                              { name: 'Medium', days: analyticsData.resolutionTimes.MEDIUM.avgDays },
                              { name: 'High', days: analyticsData.resolutionTimes.HIGH.avgDays },
                              { name: 'Critical', days: analyticsData.resolutionTimes.CRITICAL.avgDays },
                            ]}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip formatter={(value) => [Number(value).toFixed(1), 'Days']} />
                            <Bar dataKey="days" fill="#8884d8">
                              <Cell fill="#82ca9d" />
                              <Cell fill="#82ca9d" />
                              <Cell fill="#8884d8" />
                              <Cell fill="#ffc658" />
                              <Cell fill="#ff8042" />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
