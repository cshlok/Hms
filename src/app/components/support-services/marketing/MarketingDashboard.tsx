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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Loader2, Search, Filter, Download, RefreshCw, Plus, Calendar, Users, Target, DollarSign, BarChart2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';

// Define types for campaign data
interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  startDate: string;
  endDate?: string;
  budget?: number;
  createdAt: string;
  createdByUser?: { name: string };
  _count?: { leads: number; activities: number };
}

interface CampaignAnalytics {
  campaign: {
    id: string;
    name: string;
    type: string;
    startDate: string;
    endDate?: string;
    status: string;
  };
  metrics: any[];
  channels: {
    id: string;
    type: string;
    name: string;
    status: string;
    messageCount: number;
    interactionCount: number;
    metrics?: any;
  }[];
  leads: {
    total: number;
    converted: number;
    conversionRate: string;
    byStatus: Record<string, number>;
  };
  timeSeriesData: any[];
}

// Define columns for campaign table
const campaignColumns: ColumnDef<Campaign>[] = [
  {
    accessorKey: 'name',
    header: 'Campaign Name',
    cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div>,
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
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
      
      switch (status) {
        case 'DRAFT':
          variant = 'outline';
          break;
        case 'SCHEDULED':
          variant = 'secondary';
          break;
        case 'ACTIVE':
          variant = 'default';
          break;
        case 'PAUSED':
          variant = 'secondary';
          break;
        case 'COMPLETED':
          variant = 'outline';
          break;
        case 'CANCELLED':
          variant = 'destructive';
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
    accessorKey: 'startDate',
    header: 'Start Date',
    cell: ({ row }) => format(new Date(row.getValue('startDate')), 'MMM d, yyyy'),
  },
  {
    accessorKey: 'endDate',
    header: 'End Date',
    cell: ({ row }) => {
      const endDate = row.getValue('endDate');
      return endDate ? format(new Date(endDate as string), 'MMM d, yyyy') : '-';
    },
  },
  {
    accessorKey: 'budget',
    header: 'Budget',
    cell: ({ row }) => {
      const budget = row.getValue('budget');
      return budget ? `$${Number(budget).toLocaleString()}` : '-';
    },
  },
  {
    accessorKey: '_count',
    header: 'Leads',
    cell: ({ row }) => {
      const counts = row.original._count;
      return counts ? counts.leads : '0';
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <div className="flex space-x-2">
        <Button variant="ghost" size="sm" onClick={() => window.location.href = `/marketing/campaigns/${row.original.id}`}>
          View
        </Button>
        <Button variant="ghost" size="sm" onClick={() => window.location.href = `/marketing/campaigns/${row.original.id}/analytics`}>
          Analytics
        </Button>
      </div>
    ),
  },
];

// Define color palette for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#6C757D'];

export default function MarketingDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('campaigns');
  const [isLoading, setIsLoading] = useState(true);
  const [campaignData, setCampaignData] = useState<Campaign[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [campaignAnalytics, setCampaignAnalytics] = useState<CampaignAnalytics | null>(null);
  
  // Filters
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    page: 1,
    limit: 10,
  });
  
  // Pagination
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
  });

  // Load data on component mount and when filters change
  useEffect(() => {
    loadCampaignData();
  }, [filters]);
  
  useEffect(() => {
    loadOverviewAnalytics();
  }, []);
  
  useEffect(() => {
    if (selectedCampaign) {
      loadCampaignAnalytics(selectedCampaign);
    }
  }, [selectedCampaign]);

  // Load campaign data
  const loadCampaignData = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value.toString());
      });
      
      const response = await fetch(`/api/support-services/marketing/campaigns?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to load campaign data');
      }
      
      const data = await response.json();
      setCampaignData(data.data);
      setPagination({
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
      });
    } catch (error) {
      console.error('Error loading campaign data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load campaign data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load overview analytics data
  const loadOverviewAnalytics = async () => {
    try {
      const response = await fetch('/api/support-services/marketing/analytics/overview');
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

  // Load campaign-specific analytics
  const loadCampaignAnalytics = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/support-services/marketing/campaigns/${campaignId}/analytics`);
      if (!response.ok) {
        throw new Error('Failed to load campaign analytics');
      }
      
      const data = await response.json();
      setCampaignAnalytics(data);
    } catch (error) {
      console.error('Error loading campaign analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load campaign analytics',
        variant: 'destructive',
      });
    }
  };

  // Handle filter changes
  const handleFilterChange = (key: string, value: string | number) => {
    setFilters(prev => ({
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
        <h1 className="text-3xl font-bold">Marketing CRM Dashboard</h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => router.push('/marketing/contacts/new')}>
            New Contact
          </Button>
          <Button onClick={() => router.push('/marketing/campaigns/new')}>
            New Campaign
          </Button>
        </div>
      </div>

      {analyticsData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Active Campaigns</p>
                  <h3 className="text-2xl font-bold">{analyticsData.activeCampaigns}</h3>
                </div>
                <div className="p-2 bg-primary/10 rounded-full">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Contacts</p>
                  <h3 className="text-2xl font-bold">{analyticsData.totalContacts}</h3>
                </div>
                <div className="p-2 bg-blue-100 rounded-full">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Active Leads</p>
                  <h3 className="text-2xl font-bold">{analyticsData.activeLeads}</h3>
                </div>
                <div className="p-2 bg-green-100 rounded-full">
                  <Target className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Conversion Rate</p>
                  <h3 className="text-2xl font-bold">{analyticsData.conversionRate}%</h3>
                </div>
                <div className="p-2 bg-yellow-100 rounded-full">
                  <BarChart2 className="h-6 w-6 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 w-[600px]">
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Campaign Management</CardTitle>
              <CardDescription>
                View and manage your marketing campaigns.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="w-full md:w-auto">
                  <Label htmlFor="campaign-type">Type</Label>
                  <Select
                    value={filters.type}
                    onValueChange={(value) => handleFilterChange('type', value)}
                  >
                    <SelectTrigger id="campaign-type" className="w-[180px]">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Types</SelectItem>
                      <SelectItem value="EMAIL">Email</SelectItem>
                      <SelectItem value="SMS">SMS</SelectItem>
                      <SelectItem value="SOCIAL_MEDIA">Social Media</SelectItem>
                      <SelectItem value="EVENT">Event</SelectItem>
                      <SelectItem value="PRINT">Print</SelectItem>
                      <SelectItem value="DIGITAL_AD">Digital Ad</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full md:w-auto">
                  <Label htmlFor="campaign-status">Status</Label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => handleFilterChange('status', value)}
                  >
                    <SelectTrigger id="campaign-status" className="w-[180px]">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Statuses</SelectItem>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="PAUSED">Paused</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-grow"></div>

                <div className="flex items-end space-x-2">
                  <Button variant="outline" onClick={() => loadCampaignData()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => exportToCSV(campaignData, 'campaigns')}
                    disabled={campaignData.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button onClick={() => router.push('/marketing/campaigns/new')}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Campaign
                  </Button>
                </div>
              </div>

              <DataTable
                columns={campaignColumns}
                data={campaignData}
                isLoading={isLoading}
                pagination={{
                  pageIndex: filters.page - 1,
                  pageSize: filters.limit,
                  pageCount: pagination.totalPages,
                  onPageChange: (pageIndex) => handleFilterChange('page', pageIndex + 1),
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Contact Management</CardTitle>
              <CardDescription>
                View and manage your marketing contacts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <Button onClick={() => router.push('/marketing/contacts')}>
                  View All Contacts
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Contacts by Source</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    {analyticsData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analyticsData.contactsBySource || []}
                            dataKey="count"
                            nameKey="source"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ source }) => source}
                          >
                            {(analyticsData.contactsBySource || []).map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Contacts by Status</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    {analyticsData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={analyticsData.contactsByStatus || []}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="status" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leads Tab */}
        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Lead Management</CardTitle>
              <CardDescription>
                View and manage your marketing leads.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <Button onClick={() => router.push('/marketing/leads')}>
                  View All Leads
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Leads by Status</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    {analyticsData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analyticsData.leadsByStatus || []}
                            dataKey="count"
                            nameKey="status"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ status }) => status}
                          >
                            {(analyticsData.leadsByStatus || []).map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Leads by Source</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    {analyticsData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={analyticsData.leadsBySource || []}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="source" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#82ca9d" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Campaign Analytics</CardTitle>
                  <CardDescription>
                    Analyze performance metrics for your marketing campaigns.
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="campaign-select">Select Campaign:</Label>
                  <Select
                    value={selectedCampaign || ''}
                    onValueChange={setSelectedCampaign}
                  >
                    <SelectTrigger id="campaign-select" className="w-[250px]">
                      <SelectValue placeholder="Select a campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaignData.map(campaign => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {campaign.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!selectedCampaign ? (
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                  <p className="text-gray-500">Select a campaign to view detailed analytics</p>
                  <Button onClick={() => setSelectedCampaign(campaignData[0]?.id)}>
                    View Latest Campaign
                  </Button>
                </div>
              ) : !campaignAnalytics ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Campaign Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-500">Campaign</span>
                          <span className="text-lg font-medium">{campaignAnalytics.campaign.name}</span>
                          <Badge className="mt-1 w-fit">{campaignAnalytics.campaign.status}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-500">Total Leads</span>
                          <span className="text-2xl font-bold">{campaignAnalytics.leads.total}</span>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-500">Converted Leads</span>
                          <span className="text-2xl font-bold">{campaignAnalytics.leads.converted}</span>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-500">Conversion Rate</span>
                          <span className="text-2xl font-bold">{campaignAnalytics.leads.conversionRate}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Performance Metrics */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Performance Metrics</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={campaignAnalytics.timeSeriesData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tickFormatter={(date) => format(new Date(date), 'MMM d')} />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip labelFormatter={(date) => format(new Date(date), 'MMM d, yyyy')} />
                          <Legend />
                          <Line yAxisId="left" type="monotone" dataKey="impressions" stroke="#8884d8" name="Impressions" />
                          <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="#82ca9d" name="Clicks" />
                          <Line yAxisId="right" type="monotone" dataKey="leads" stroke="#ffc658" name="Leads" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Channel Performance */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Channel Performance</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Message Count by Channel</CardTitle>
                        </CardHeader>
                        <CardContent className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={campaignAnalytics.channels}
                              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="messageCount" name="Messages" fill="#8884d8" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Interaction Count by Channel</CardTitle>
                        </CardHeader>
                        <CardContent className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={campaignAnalytics.channels}
                              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="interactionCount" name="Interactions" fill="#82ca9d" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Lead Status Distribution */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Lead Status Distribution</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={Object.entries(campaignAnalytics.leads.byStatus).map(([status, count]) => ({ status, count }))}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="status" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" name="Leads" fill="#8884d8">
                            {Object.entries(campaignAnalytics.leads.byStatus).map(([status, _], index) => {
                              let color = '#8884d8';
                              switch (status) {
                                case 'NEW':
                                  color = '#8884d8';
                                  break;
                                case 'CONTACTED':
                                  color = '#82ca9d';
                                  break;
                                case 'QUALIFIED':
                                  color = '#ffc658';
                                  break;
                                case 'CONVERTED':
                                  color = '#ff8042';
                                  break;
                                case 'LOST':
                                  color = '#ff7c7c';
                                  break;
                              }
                              return <Cell key={`cell-${index}`} fill={color} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
