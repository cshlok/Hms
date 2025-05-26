import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { BarChart, LineChart, PieChart } from '@/components/ui/charts';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/use-toast';

// Define column types for campaign table
type Campaign = {
  id: string;
  name: string;
  type: string;
  status: string;
  startDate: string;
  endDate?: string;
  segmentCount: number;
  performance?: {
    opens?: number;
    clicks?: number;
    conversions?: number;
  };
};

// Define column types for contact table
type Contact = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  source: string;
  status: string;
  createdAt: string;
  lastActivity?: string;
};

export default function MarketingDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [segments, setSegments] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [campaignFilter, setCampaignFilter] = useState('all');
  const [contactFilter, setContactFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Define columns for campaign table
  const campaignColumns: ColumnDef<Campaign>[] = [
    {
      accessorKey: 'name',
      header: 'Campaign Name',
      cell: ({ row }) => (
        <div className="font-medium cursor-pointer hover:text-primary" 
             onClick={() => router.push(`/marketing/campaigns/${row.original.id}`)}>
          {row.getValue('name')}
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="outline">{row.getValue('type')}</Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        let variant: 'default' | 'outline' | 'secondary' | 'destructive' = 'outline';
        
        switch (status) {
          case 'ACTIVE':
            variant = 'default';
            break;
          case 'DRAFT':
            variant = 'secondary';
            break;
          case 'PAUSED':
            variant = 'outline';
            break;
          case 'COMPLETED':
            variant = 'outline';
            break;
          case 'CANCELLED':
            variant = 'destructive';
            break;
        }
        
        return <Badge variant={variant}>{status}</Badge>;
      },
    },
    {
      accessorKey: 'startDate',
      header: 'Start Date',
      cell: ({ row }) => new Date(row.getValue('startDate')).toLocaleDateString(),
    },
    {
      accessorKey: 'segmentCount',
      header: 'Segments',
      cell: ({ row }) => row.getValue('segmentCount'),
    },
    {
      id: 'performance',
      header: 'Performance',
      cell: ({ row }) => {
        const performance = row.original.performance;
        if (!performance) return 'No data';
        
        return (
          <div className="flex items-center space-x-2">
            {performance.opens !== undefined && (
              <Badge variant="outline" className="bg-blue-50">
                {performance.opens} opens
              </Badge>
            )}
            {performance.clicks !== undefined && (
              <Badge variant="outline" className="bg-green-50">
                {performance.clicks} clicks
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push(`/marketing/campaigns/${row.original.id}`)}
          >
            View
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push(`/marketing/campaigns/${row.original.id}/edit`)}
          >
            Edit
          </Button>
        </div>
      ),
    },
  ];

  // Define columns for contact table
  const contactColumns: ColumnDef<Contact>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="font-medium cursor-pointer hover:text-primary" 
             onClick={() => router.push(`/marketing/contacts/${row.original.id}`)}>
          {row.getValue('name')}
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
    },
    {
      accessorKey: 'source',
      header: 'Source',
      cell: ({ row }) => (
        <Badge variant="outline">{row.getValue('source')}</Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        let variant: 'default' | 'outline' | 'secondary' | 'destructive' = 'outline';
        
        switch (status) {
          case 'ACTIVE':
            variant = 'default';
            break;
          case 'INACTIVE':
            variant = 'secondary';
            break;
          case 'UNSUBSCRIBED':
            variant = 'destructive';
            break;
        }
        
        return <Badge variant={variant}>{status}</Badge>;
      },
    },
    {
      accessorKey: 'lastActivity',
      header: 'Last Activity',
      cell: ({ row }) => {
        const lastActivity = row.getValue('lastActivity');
        return lastActivity ? new Date(lastActivity as string).toLocaleDateString() : 'Never';
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push(`/marketing/contacts/${row.original.id}`)}
          >
            View
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push(`/marketing/contacts/${row.original.id}/edit`)}
          >
            Edit
          </Button>
        </div>
      ),
    },
  ];

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch campaigns
        const campaignsResponse = await fetch('/api/support-services/marketing/campaigns');
        if (!campaignsResponse.ok) throw new Error('Failed to fetch campaigns');
        const campaignsData = await campaignsResponse.json();
        setCampaigns(campaignsData.data || []);
        
        // Fetch contacts
        const contactsResponse = await fetch('/api/support-services/marketing/contacts');
        if (!contactsResponse.ok) throw new Error('Failed to fetch contacts');
        const contactsData = await contactsResponse.json();
        setContacts(contactsData.data || []);
        
        // Fetch segments
        const segmentsResponse = await fetch('/api/support-services/marketing/segments');
        if (!segmentsResponse.ok) throw new Error('Failed to fetch segments');
        const segmentsData = await segmentsResponse.json();
        setSegments(segmentsData.data || []);
        
        // Fetch templates
        const templatesResponse = await fetch('/api/support-services/marketing/templates');
        if (!templatesResponse.ok) throw new Error('Failed to fetch templates');
        const templatesData = await templatesResponse.json();
        setTemplates(templatesData.data || []);
      } catch (error) {
        console.error('Error fetching marketing data:', error);
        toast({
          title: "Error",
          description: "Failed to load marketing data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Filter campaigns based on selected filter and search query
  const filteredCampaigns = campaigns.filter(campaign => {
    if (campaignFilter !== 'all' && campaign.status !== campaignFilter) {
      return false;
    }
    
    if (searchQuery && !campaign.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  // Filter contacts based on selected filter and search query
  const filteredContacts = contacts.filter(contact => {
    if (contactFilter !== 'all' && contact.status !== contactFilter) {
      return false;
    }
    
    if (searchQuery && !contact.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !contact.email.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  // Sample data for charts
  const campaignPerformanceData = {
    labels: ['Campaign 1', 'Campaign 2', 'Campaign 3', 'Campaign 4', 'Campaign 5'],
    datasets: [
      {
        label: 'Opens',
        data: [65, 59, 80, 81, 56],
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
      },
      {
        label: 'Clicks',
        data: [28, 48, 40, 19, 36],
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
      },
      {
        label: 'Conversions',
        data: [12, 19, 3, 5, 2],
        backgroundColor: 'rgba(153, 102, 255, 0.5)',
      },
    ],
  };

  const contactGrowthData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'New Contacts',
        data: [12, 19, 3, 5, 2, 3],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
      },
    ],
  };

  const contactSourceData = {
    labels: ['Website', 'Referral', 'Social Media', 'Event', 'Other'],
    datasets: [
      {
        label: 'Contact Sources',
        data: [12, 19, 3, 5, 2],
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(75, 192, 192, 0.5)',
          'rgba(153, 102, 255, 0.5)',
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Marketing CRM Dashboard</h1>
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            onClick={() => router.push('/marketing/campaigns/new')}
          >
            New Campaign
          </Button>
          <Button 
            onClick={() => router.push('/marketing/contacts/new')}
          >
            Add Contact
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.length}</div>
            <p className="text-xs text-muted-foreground">
              {campaigns.filter(c => c.status === 'ACTIVE').length} active
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contacts.length}</div>
            <p className="text-xs text-muted-foreground">
              {contacts.filter(c => c.status === 'ACTIVE').length} active
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Segments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{segments.length}</div>
            <p className="text-xs text-muted-foreground">
              Across {campaigns.length} campaigns
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
            <p className="text-xs text-muted-foreground">
              {templates.filter((t: any) => t.isActive).length} active
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Performance</CardTitle>
                <CardDescription>
                  Performance metrics across all campaigns
                </CardDescription>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select time range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="1y">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <BarChart data={campaignPerformanceData} height={300} />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Contact Growth</CardTitle>
                <CardDescription>
                  New contacts over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LineChart data={contactGrowthData} height={300} />
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Contact Sources</CardTitle>
                <CardDescription>
                  Where your contacts come from
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PieChart data={contactSourceData} height={200} />
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Recent Campaigns</CardTitle>
                <CardDescription>
                  Your most recent marketing campaigns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {campaigns.slice(0, 5).map((campaign) => (
                    <div key={campaign.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <h4 className="font-medium">{campaign.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {new Date(campaign.startDate).toLocaleDateString()} • {campaign.type}
                        </p>
                      </div>
                      <Badge variant={campaign.status === 'ACTIVE' ? 'default' : 'outline'}>
                        {campaign.status}
                      </Badge>
                    </div>
                  ))}
                  
                  {campaigns.length === 0 && (
                    <p className="text-sm text-muted-foreground">No campaigns yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle>Marketing Campaigns</CardTitle>
              <CardDescription>
                Manage your marketing campaigns
              </CardDescription>
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 mt-2">
                <Input
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
                <Select value={campaignFilter} onValueChange={setCampaignFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Campaigns</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                    <SelectItem value="PAUSED">Paused</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline"
                  onClick={() => router.push('/marketing/campaigns/new')}
                  className="sm:ml-auto"
                >
                  New Campaign
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <p>Loading campaigns...</p>
                </div>
              ) : (
                <DataTable 
                  columns={campaignColumns} 
                  data={filteredCampaigns} 
                  emptyMessage="No campaigns found"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="contacts">
          <Card>
            <CardHeader>
              <CardTitle>Marketing Contacts</CardTitle>
              <CardDescription>
                Manage your marketing contacts and leads
              </CardDescription>
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 mt-2">
                <Input
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
                <Select value={contactFilter} onValueChange={setContactFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Contacts</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="UNSUBSCRIBED">Unsubscribed</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={() => router.push('/marketing/contacts/new')}
                  className="sm:ml-auto"
                >
                  Add Contact
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <p>Loading contacts...</p>
                </div>
              ) : (
                <DataTable 
                  columns={contactColumns} 
                  data={filteredContacts} 
                  emptyMessage="No contacts found"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Marketing Analytics</CardTitle>
              <CardDescription>
                Analyze the performance of your marketing efforts
              </CardDescription>
              <div className="flex items-center space-x-2 mt-2">
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select time range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="1y">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="performance">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="performance">Campaign Performance</TabsTrigger>
                  <TabsTrigger value="engagement">Engagement</TabsTrigger>
                  <TabsTrigger value="conversion">Conversion</TabsTrigger>
                </TabsList>
                
                <TabsContent value="performance" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Campaign Comparison</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <BarChart data={campaignPerformanceData} height={300} />
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Performance Trends</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <LineChart data={contactGrowthData} height={300} />
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="engagement" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Email Engagement</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <LineChart data={contactGrowthData} height={300} />
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Content Performance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <BarChart data={campaignPerformanceData} height={300} />
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="conversion" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Conversion Rates</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <BarChart data={campaignPerformanceData} height={300} />
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>ROI Analysis</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <LineChart data={contactGrowthData} height={300} />
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
