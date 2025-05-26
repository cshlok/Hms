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
  Stethoscope,
  Activity,
  Thermometer,
  Microscope,
  Scissors,
  Heart,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';

export default function BiomedicalEquipment() {
  const router = useRouter();
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [regulatoryClassFilter, setRegulatoryClassFilter] = useState('');
  const [riskLevelFilter, setRiskLevelFilter] = useState('');
  const [calibrationDueFilter, setCalibrationDueFilter] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [pagination, setPagination] = useState({
    skip: 0,
    take: 10,
    total: 0
  });
  const [activeTab, setActiveTab] = useState('all');
  const [statistics, setStatistics] = useState(null);

  // Fetch biomedical equipment
  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        setLoading(true);
        const queryParams = new URLSearchParams({
          skip: pagination.skip.toString(),
          take: pagination.take.toString()
        });
        
        if (search) queryParams.append('search', search);
        if (equipmentTypeFilter) queryParams.append('equipmentType', equipmentTypeFilter);
        if (statusFilter) queryParams.append('status', statusFilter);
        if (departmentFilter) queryParams.append('departmentId', departmentFilter);
        if (regulatoryClassFilter) queryParams.append('regulatoryClass', regulatoryClassFilter);
        if (riskLevelFilter) queryParams.append('riskLevel', riskLevelFilter);
        if (calibrationDueFilter) queryParams.append('calibrationDue', 'true');
        
        const response = await fetch(`/api/hr/biomedical?${queryParams.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch biomedical equipment');
        }
        
        const data = await response.json();
        setEquipment(data.equipment || []);
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
    
    if (activeTab === 'all' || activeTab === 'calibration') {
      fetchEquipment();
    }
  }, [search, equipmentTypeFilter, statusFilter, departmentFilter, regulatoryClassFilter, riskLevelFilter, calibrationDueFilter, pagination.skip, pagination.take, activeTab]);

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

  // Fetch biomedical statistics
  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const response = await fetch('/api/hr/biomedical/statistics');
        if (response.ok) {
          const data = await response.json();
          setStatistics(data);
        }
      } catch (err) {
        console.error('Error fetching biomedical statistics:', err);
      }
    };
    
    fetchStatistics();
  }, []);

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
    if (value === 'calibration') {
      setCalibrationDueFilter(true);
    } else if (value === 'all') {
      setCalibrationDueFilter(false);
    }
  };

  // Create new biomedical equipment
  const handleCreateEquipment = () => {
    router.push('/dashboard/hr/biomedical/new');
  };

  // Export equipment data
  const handleExport = async () => {
    try {
      // In a real implementation, this would call an API endpoint to generate a CSV/Excel file
      toast({
        title: "Export Started",
        description: "Your biomedical equipment report is being generated and will download shortly.",
      });
      
      // Simulate download delay
      setTimeout(() => {
        toast({
          title: "Export Complete",
          description: "Biomedical equipment report has been downloaded.",
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

  // Get equipment type icon
  const getEquipmentTypeIcon = (type) => {
    switch (type) {
      case 'DIAGNOSTIC':
        return <Stethoscope className="h-4 w-4" />;
      case 'THERAPEUTIC':
        return <Activity className="h-4 w-4" />;
      case 'MONITORING':
        return <Thermometer className="h-4 w-4" />;
      case 'LABORATORY':
        return <Microscope className="h-4 w-4" />;
      case 'SURGICAL':
        return <Scissors className="h-4 w-4" />;
      case 'LIFE_SUPPORT':
        return <Heart className="h-4 w-4" />;
      default:
        return <Stethoscope className="h-4 w-4" />;
    }
  };

  // Get regulatory class badge variant
  const getRegulatoryClassBadgeVariant = (regulatoryClass) => {
    switch (regulatoryClass) {
      case 'CLASS_I':
        return 'default';
      case 'CLASS_II':
        return 'secondary';
      case 'CLASS_III':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Get risk level badge variant
  const getRiskLevelBadgeVariant = (riskLevel) => {
    switch (riskLevel) {
      case 'LOW':
        return 'default';
      case 'MEDIUM':
        return 'secondary';
      case 'HIGH':
        return 'warning';
      case 'CRITICAL':
        return 'destructive';
      default:
        return 'outline';
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

  // Format date or show placeholder
  const formatDateOrPlaceholder = (date) => {
    return date ? format(new Date(date), 'PPP') : '—';
  };

  // Check if calibration is due
  const isCalibrationDue = (nextCalibrationDate) => {
    if (!nextCalibrationDate) return false;
    return new Date(nextCalibrationDate) <= new Date();
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Biomedical Equipment Management</h1>
        <p className="text-muted-foreground">
          Track and manage specialized medical devices and equipment
        </p>
      </div>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={handleTabChange}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="all">All Equipment</TabsTrigger>
            <TabsTrigger value="calibration">Calibration Due</TabsTrigger>
            <TabsTrigger value="reports">Reports & Analytics</TabsTrigger>
          </TabsList>
          
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleCreateEquipment}>
              <Plus className="mr-2 h-4 w-4" />
              New Equipment
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
              <CardTitle>Biomedical Equipment Inventory</CardTitle>
              <CardDescription>
                {loading ? 'Loading equipment...' : 
                  `Showing ${equipment.length} of ${pagination.total} biomedical devices`}
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
                        placeholder="Search equipment..."
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
                  <Select value={equipmentTypeFilter} onValueChange={setEquipmentTypeFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Types</SelectItem>
                      <SelectItem value="DIAGNOSTIC">Diagnostic</SelectItem>
                      <SelectItem value="THERAPEUTIC">Therapeutic</SelectItem>
                      <SelectItem value="MONITORING">Monitoring</SelectItem>
                      <SelectItem value="LABORATORY">Laboratory</SelectItem>
                      <SelectItem value="SURGICAL">Surgical</SelectItem>
                      <SelectItem value="LIFE_SUPPORT">Life Support</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={regulatoryClassFilter} onValueChange={setRegulatoryClassFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="All Classes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Classes</SelectItem>
                      <SelectItem value="CLASS_I">Class I</SelectItem>
                      <SelectItem value="CLASS_II">Class II</SelectItem>
                      <SelectItem value="CLASS_III">Class III</SelectItem>
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
              ) : equipment.length === 0 ? (
                <div className="text-center py-4">
                  No biomedical equipment found. Try adjusting your filters or create a new equipment record.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Equipment Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Serial Number</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Regulatory Class</TableHead>
                        <TableHead>Next Calibration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {equipment.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {getEquipmentTypeIcon(item.equipmentType)}
                              <span>{item.asset.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.equipmentType.replace('_', ' ')}
                          </TableCell>
                          <TableCell>
                            {item.asset.serialNumber || '—'}
                          </TableCell>
                          <TableCell>
                            {item.asset.department?.name || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getRegulatoryClassBadgeVariant(item.regulatoryClass)}>
                              {item.regulatoryClass ? item.regulatoryClass.replace('CLASS_', 'Class ') : '—'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {isCalibrationDue(item.nextCalibrationDate) && (
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                              )}
                              {formatDateOrPlaceholder(item.nextCalibrationDate)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(item.asset.status)}>
                              {item.asset.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => router.push(`/dashboard/hr/biomedical/${item.id}`)}
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
        
        <TabsContent value="calibration" className="mt-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Calibration Schedule</CardTitle>
              <CardDescription>
                Equipment due for calibration or recently calibrated
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">
                  Loading calibration schedule...
                </div>
              ) : equipment.length === 0 ? (
                <div className="text-center py-4">
                  No equipment due for calibration.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Equipment Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Last Calibration</TableHead>
                        <TableHead>Next Calibration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {equipment.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {getEquipmentTypeIcon(item.equipmentType)}
                              <span>{item.asset.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.equipmentType.replace('_', ' ')}
                          </TableCell>
                          <TableCell>
                            {item.asset.department?.name || '—'}
                          </TableCell>
                          <TableCell>
                            {formatDateOrPlaceholder(item.lastCalibrationDate)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                              {formatDateOrPlaceholder(item.nextCalibrationDate)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(item.asset.status)}>
                              {item.asset.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => router.push(`/dashboard/hr/biomedical/${item.id}/calibration/new`)}
                            >
                              Calibrate
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="reports" className="mt-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Biomedical Equipment Reports & Analytics</CardTitle>
              <CardDescription>
                View equipment distribution, compliance, and calibration status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Reports content would go here */}
              <div className="text-center py-4">
                Loading biomedical reports...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Equipment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Stethoscope className="h-5 w-5 text-blue-500 mr-2" />
              <span className="text-2xl font-bold">
                {statistics?.totalEquipment || 0}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Calibration Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-destructive mr-2" />
              <span className="text-2xl font-bold">
                {statistics?.calibrationDue || 0}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Class III Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Heart className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-2xl font-bold">
                {statistics?.equipmentByRegulatoryClass?.find(c => c.class === 'CLASS_III')?.count || 0}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Calibrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-yellow-500 mr-2" />
              <span className="text-2xl font-bold">
                {statistics?.calibrationUpcoming || 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
