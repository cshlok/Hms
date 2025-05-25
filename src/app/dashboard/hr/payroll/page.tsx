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
  DollarSign,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';

export default function PayrollManagement() {
  const router = useRouter();
  const [payrollPeriods, setPayrollPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState({
    from: null,
    to: null
  });
  const [pagination, setPagination] = useState({
    skip: 0,
    take: 10,
    total: 0
  });
  const [activeTab, setActiveTab] = useState('periods');

  // Fetch payroll periods
  useEffect(() => {
    const fetchPayrollPeriods = async () => {
      try {
        setLoading(true);
        const queryParams = new URLSearchParams({
          skip: pagination.skip.toString(),
          take: pagination.take.toString()
        });
        
        if (statusFilter) queryParams.append('status', statusFilter);
        
        if (dateRange.from) {
          queryParams.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
        }
        
        if (dateRange.to) {
          queryParams.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
        }
        
        const response = await fetch(`/api/hr/payroll/periods?${queryParams.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch payroll periods');
        }
        
        const data = await response.json();
        setPayrollPeriods(data.periods || []);
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
    
    if (activeTab === 'periods') {
      fetchPayrollPeriods();
    }
  }, [statusFilter, dateRange, pagination.skip, pagination.take, activeTab]);

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

  // Handle tab change
  const handleTabChange = (value) => {
    setActiveTab(value);
    // Reset pagination when changing tabs
    setPagination(prev => ({
      ...prev,
      skip: 0
    }));
  };

  // Create new payroll period
  const handleCreatePeriod = () => {
    router.push('/dashboard/hr/payroll/periods/new');
  };

  // Export payroll data
  const handleExport = async () => {
    try {
      // In a real implementation, this would call an API endpoint to generate a CSV/Excel file
      toast({
        title: "Export Started",
        description: "Your payroll report is being generated and will download shortly.",
      });
      
      // Simulate download delay
      setTimeout(() => {
        toast({
          title: "Export Complete",
          description: "Payroll report has been downloaded.",
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
      case 'DRAFT':
        return 'secondary';
      case 'PROCESSING':
        return 'warning';
      case 'APPROVED':
        return 'default';
      case 'PAID':
        return 'success';
      default:
        return 'default';
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Payroll Management</h1>
        <p className="text-muted-foreground">
          Manage salary structures, payroll periods, and process payments
        </p>
      </div>
      
      <Tabs defaultValue="periods" value={activeTab} onValueChange={handleTabChange}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="periods">Payroll Periods</TabsTrigger>
            <TabsTrigger value="structures">Salary Structures</TabsTrigger>
            <TabsTrigger value="reports">Reports & Analytics</TabsTrigger>
          </TabsList>
          
          <div className="flex flex-wrap gap-2">
            {activeTab === 'periods' && (
              <Button onClick={handleCreatePeriod}>
                <Plus className="mr-2 h-4 w-4" />
                New Payroll Period
              </Button>
            )}
            {activeTab === 'structures' && (
              <Button onClick={() => router.push('/dashboard/hr/payroll/structures/new')}>
                <Plus className="mr-2 h-4 w-4" />
                New Salary Structure
              </Button>
            )}
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
        
        <TabsContent value="periods" className="mt-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Payroll Periods</CardTitle>
              <CardDescription>
                {loading ? 'Loading payroll periods...' : 
                  `Showing ${payrollPeriods.length} of ${pagination.total} payroll periods`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 justify-between mb-4">
                <div className="flex flex-col md:flex-row gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full md:w-[240px] justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from && dateRange.to ? (
                          <>
                            {format(dateRange.from, 'PP')} - {format(dateRange.to, 'PP')}
                          </>
                        ) : (
                          "Select date range"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        selected={dateRange}
                        onSelect={setDateRange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="flex flex-col md:flex-row gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Statuses</SelectItem>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="PROCESSING">Processing</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="PAID">Paid</SelectItem>
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
              ) : payrollPeriods.length === 0 ? (
                <div className="text-center py-4">
                  No payroll periods found. Try adjusting your filters or create a new period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period Name</TableHead>
                        <TableHead>Date Range</TableHead>
                        <TableHead>Payment Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Entries</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrollPeriods.map((period) => (
                        <TableRow key={period.id}>
                          <TableCell className="font-medium">
                            {period.name}
                          </TableCell>
                          <TableCell>
                            {format(new Date(period.startDate), 'PP')} - {format(new Date(period.endDate), 'PP')}
                          </TableCell>
                          <TableCell>
                            {format(new Date(period.paymentDate), 'PP')}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(period.status)}>
                              {period.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {period._count?.payrollEntries || 0}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => router.push(`/dashboard/hr/payroll/periods/${period.id}`)}
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
        
        <TabsContent value="structures" className="mt-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Salary Structures</CardTitle>
              <CardDescription>
                Manage salary components and structures for different employee types
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Salary structures content would go here */}
              <div className="text-center py-4">
                Loading salary structures...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="reports" className="mt-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Payroll Reports & Analytics</CardTitle>
              <CardDescription>
                View payroll summaries, trends, and department-wise breakdowns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Reports content would go here */}
              <div className="text-center py-4">
                Loading payroll reports...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Draft Periods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <FileText className="h-5 w-5 text-blue-500 mr-2" />
              <span className="text-2xl font-bold">
                {payrollPeriods.filter(p => p.status === 'DRAFT').length}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-yellow-500 mr-2" />
              <span className="text-2xl font-bold">
                {payrollPeriods.filter(p => p.status === 'PROCESSING').length}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-2xl font-bold">
                {payrollPeriods.filter(p => p.status === 'APPROVED').length}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-green-700 mr-2" />
              <span className="text-2xl font-bold">
                {payrollPeriods.filter(p => p.status === 'PAID').length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
