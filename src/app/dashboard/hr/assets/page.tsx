'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Search, 
  Calendar as CalendarIcon, 
  Filter, 
  Download, 
  Plus,
  Package,
  Truck,
  Wrench,
  AlertTriangle,
  Building,
  Tag
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';

export default function AssetManagement() {
  const router = useRouter();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [assetTypeFilter, setAssetTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [departments, setDepartments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [dateRange, setDateRange] = useState({
    from: null,
    to: null
  });
  const [pagination, setPagination] = useState({
    skip: 0,
    take: 10,
    total: 0
  });
  const [activeTab, setActiveTab] = useState('all');
  const [statistics, setStatistics] = useState(null);

  // Fetch assets
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setLoading(true);
        const queryParams = new URLSearchParams({
          skip: pagination.skip.toString(),
          take: pagination.take.toString()
        });
        
        if (search) queryParams.append('search', search);
        if (assetTypeFilter) queryParams.append('assetType', assetTypeFilter);
        if (statusFilter) queryParams.append('status', statusFilter);
        if (departmentFilter) queryParams.append('departmentId', departmentFilter);
        if (locationFilter) queryParams.append('location', locationFilter);
        
        if (dateRange.from) {
          queryParams.append('purchaseDateStart', format(dateRange.from, 'yyyy-MM-dd'));
        }
        
        if (dateRange.to) {
          queryParams.append('purchaseDateEnd', format(dateRange.to, 'yyyy-MM-dd'));
        }
        
        const response = await fetch(`/api/hr/assets?${queryParams.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch assets');
        }
        
        const data = await response.json();
        setAssets(data.assets || []);
        setPagination(prev => ({
          ...prev,
          total: data.total || 0
        }));
      } catch (err) {
        setError(err.message);
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    if (activeTab === 'all' || activeTab === 'maintenance') {
      fetchAssets();
    }
  }, [search, assetTypeFilter, statusFilter, departmentFilter, locationFilter, dateRange, pagination.skip, pagination.take, activeTab]);

  // Fetch departments for filters
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await fetch('/api/hr/departments');
        if (response.ok) {
          const data = await response.json();
          setDepartments(data.departments || []);
        }
      } catch (err) {
        console.error('Error fetching departments:', err);
      }
    };
    
    fetchDepartments();
  }, []);

  // Fetch asset statistics
  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const response = await fetch('/api/hr/assets/statistics');
        if (response.ok) {
          const data = await response.json();
          setStatistics(data);
        }
      } catch (err) {
        console.error('Error fetching asset statistics:', err);
      }
    };
    
    fetchStatistics();
  }, []);

  // Extract unique locations from assets
  useEffect(() => {
    if (assets.length > 0) {
      const uniqueLocations = [...new Set(assets.map(asset => asset.location).filter(Boolean))];
      setLocations(uniqueLocations);
    }
  }, [assets]);

  // Handle pagination
  const handlePreviousPage = () => {
    if (pagination.skip - pagination.take >= 0) {
      setPagination(prev => ({
        ...prev,
        skip: prev.skip - prev.take
      }));
    }
  };

  const handleNextPage = () => {
    if (pagination.skip + pagination.take < pagination.total) {
      setPagination(prev => ({
        ...prev,
        skip: prev.skip + prev.take
      }));
    }
  };

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    // Reset pagination when searching
    setPagination(prev => ({
      ...prev,
      skip: 0
    }));
  };

  // Handle tab change
  const handleTabChange = (value) => {
    setActiveTab(value);
    // Reset pagination when changing tabs
    setPagination(prev => ({
      ...prev,
      skip: 0
    }));
    
    // Set appropriate filters based on tab
    if (value === 'maintenance') {
      setStatusFilter('UNDER_MAINTENANCE');
    } else if (value === 'all') {
      setStatusFilter('');
    }
  };

  // Create new asset
  const handleCreateAsset = () => {
    router.push('/dashboard/hr/assets/new');
  };

  // Export asset data
  const handleExport = async () => {
    try {
      // In a real implementation, this would call an API endpoint to generate a CSV/Excel file
      toast({
        title: "Export Started",
        description: "Your asset report is being generated and will download shortly.",
      });
      
      // Simulate download delay
      setTimeout(() => {
        toast({
          title: "Export Complete",
          description: "Asset report has been downloaded.",
        });
      }, 2000);
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return 'default';
      case 'IN_USE':
        return 'secondary';
      case 'UNDER_MAINTENANCE':
        return 'warning';
      case 'DISPOSED':
        return 'destructive';
      case 'LOST':
        return 'outline';
      default:
        return 'default';
    }
  };

  // Get asset type icon
  const getAssetTypeIcon = (type) => {
    switch (type) {
      case 'EQUIPMENT':
        return <Package className="h-4 w-4" />;
      case 'FURNITURE':
        return <Tag className="h-4 w-4" />;
      case 'IT':
        return <Package className="h-4 w-4" />;
      case 'VEHICLE':
        return <Truck className="h-4 w-4" />;
      case 'BUILDING':
        return <Building className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Asset Management</h1>
        <p className="text-muted-foreground">
          Track and manage hospital assets and equipment
        </p>
      </div>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={handleTabChange}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="all">All Assets</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            <TabsTrigger value="reports">Reports & Analytics</TabsTrigger>
          </TabsList>
          
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleCreateAsset}>
              <Plus className="mr-2 h-4 w-4" />
              New Asset
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
        
        <TabsContent value="all" className="mt-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Asset Inventory</CardTitle>
              <CardDescription>
                {loading ? 'Loading assets...' : 
                  `Showing ${assets.length} of ${pagination.total} assets`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 justify-between mb-4">
                <div className="flex flex-col md:flex-row gap-2 md:items-center">
                  <form onSubmit={handleSearch} className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Search assets..."
                        className="pl-8 w-full md:w-[300px]"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <Button type="submit" variant="secondary">
                      Search
                    </Button>
                  </form>
                </div>
                
                <div className="flex flex-col md:flex-row gap-2">
                  <Select value={assetTypeFilter} onValueChange={setAssetTypeFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Types</SelectItem>
                      <SelectItem value="EQUIPMENT">Equipment</SelectItem>
                      <SelectItem value="FURNITURE">Furniture</SelectItem>
                      <SelectItem value="IT">IT</SelectItem>
                      <SelectItem value="VEHICLE">Vehicle</SelectItem>
                      <SelectItem value="BUILDING">Building</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Statuses</SelectItem>
                      <SelectItem value="AVAILABLE">Available</SelectItem>
                      <SelectItem value="IN_USE">In Use</SelectItem>
                      <SelectItem value="UNDER_MAINTENANCE">Under Maintenance</SelectItem>
                      <SelectItem value="DISPOSED">Disposed</SelectItem>
                      <SelectItem value="LOST">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Departments</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {error ? (
                <div className="text-center py-4 text-red-500">
                  Error: {error}
                </div>
              ) : loading ? (
                <div className="text-center py-4">
                  Loading...
                </div>
              ) : assets.length === 0 ? (
                <div className="text-center py-4">
                  No assets found. Try adjusting your filters or create a new asset.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Serial Number</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assets.map((asset) => (
                        <TableRow key={asset.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {getAssetTypeIcon(asset.assetType)}
                              <span>{asset.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {asset.assetType}
                          </TableCell>
                          <TableCell>
                            {asset.serialNumber || '—'}
                          </TableCell>
                          <TableCell>
                            {asset.department?.name || '—'}
                          </TableCell>
                          <TableCell>
                            {asset.location || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(asset.status)}>
                              {asset.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => router.push(`/dashboard/hr/assets/${asset.id}`)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={handlePreviousPage}
                      className={pagination.skip === 0 ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <span className="text-sm">
                      Page {Math.floor(pagination.skip / pagination.take) + 1} of {Math.ceil(pagination.total / pagination.take) || 1}
                    </span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext 
                      onClick={handleNextPage}
                      className={pagination.skip + pagination.take >= pagination.total ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="maintenance" className="mt-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Maintenance Schedule</CardTitle>
              <CardDescription>
                Assets currently under maintenance or scheduled for maintenance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Maintenance content would go here */}
              <div className="text-center py-4">
                Loading maintenance schedule...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="reports" className="mt-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Asset Reports & Analytics</CardTitle>
              <CardDescription>
                View asset distribution, value, and maintenance costs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Reports content would go here */}
              <div className="text-center py-4">
                Loading asset reports...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Package className="h-5 w-5 text-blue-500 mr-2" />
              <span className="text-2xl font-bold">
                {statistics?.totalAssets || 0}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Under Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Wrench className="h-5 w-5 text-yellow-500 mr-2" />
              <span className="text-2xl font-bold">
                {statistics?.assetsByStatus?.find(s => s.status === 'UNDER_MAINTENANCE')?.count || 0}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <span className="text-2xl font-bold">
                {formatCurrency(statistics?.totalValue || 0)}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Maintenance Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <span className="text-2xl font-bold">
                {formatCurrency(statistics?.maintenanceCosts || 0)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
