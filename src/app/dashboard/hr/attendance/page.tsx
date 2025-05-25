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
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  FileText
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { toast } from '@/components/ui/use-toast';

export default function AttendanceManagement() {
  const router = useRouter();
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [biometricFilter, setBiometricFilter] = useState('');
  const [departments, setDepartments] = useState([]);
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [pagination, setPagination] = useState({
    skip: 0,
    take: 10,
    total: 0
  });
  const [activeTab, setActiveTab] = useState('daily');

  // Fetch attendance records
  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setLoading(true);
        const queryParams = new URLSearchParams({
          skip: pagination.skip.toString(),
          take: pagination.take.toString()
        });
        
        if (search) queryParams.append('search', search);
        if (departmentFilter) queryParams.append('departmentId', departmentFilter);
        if (statusFilter) queryParams.append('status', statusFilter);
        if (biometricFilter) queryParams.append('biometricVerified', biometricFilter);
        
        // Add date filters based on active tab
        if (activeTab === 'daily') {
          // For daily view, use the 'from' date as a single day filter
          queryParams.append('date', format(dateRange.from || new Date(), 'yyyy-MM-dd'));
        } else {
          // For range view, use from and to dates
          if (dateRange.from) {
            queryParams.append('startDate', format(startOfDay(dateRange.from), 'yyyy-MM-dd'));
          }
          if (dateRange.to) {
            queryParams.append('endDate', format(endOfDay(dateRange.to), 'yyyy-MM-dd'));
          }
        }
        
        const response = await fetch(`/api/hr/attendance?${queryParams.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch attendance records');
        }
        
        const data = await response.json();
        setAttendanceRecords(data.records || []);
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
    
    fetchAttendance();
  }, [search, departmentFilter, statusFilter, biometricFilter, pagination.skip, pagination.take, dateRange, activeTab]);

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
  };

  // Export attendance data
  const handleExport = async () => {
    try {
      // In a real implementation, this would call an API endpoint to generate a CSV/Excel file
      toast({
        title: "Export Started",
        description: "Your attendance report is being generated and will download shortly.",
      });
      
      // Simulate download delay
      setTimeout(() => {
        toast({
          title: "Export Complete",
          description: "Attendance report has been downloaded.",
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
      case 'PRESENT':
        return 'default';
      case 'LATE':
        return 'warning';
      case 'ABSENT':
        return 'destructive';
      case 'HALF_DAY':
        return 'secondary';
      case 'ON_LEAVE':
        return 'outline';
      default:
        return 'default';
    }
  };

  // Format time or show placeholder
  const formatTimeOrPlaceholder = (time) => {
    return time ? format(new Date(time), 'h:mm a') : '—';
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Attendance Management</h1>
        <p className="text-muted-foreground">
          Track and manage employee attendance records
        </p>
      </div>
      
      <Tabs defaultValue="daily" value={activeTab} onValueChange={handleTabChange}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="daily">Daily View</TabsTrigger>
            <TabsTrigger value="range">Date Range</TabsTrigger>
          </TabsList>
          
          <div className="flex flex-wrap gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {activeTab === 'daily' ? (
                    dateRange.from ? (
                      format(dateRange.from, 'PPP')
                    ) : (
                      "Select date"
                    )
                  ) : (
                    <>
                      {dateRange.from ? format(dateRange.from, 'PPP') : "Start date"} - 
                      {dateRange.to ? format(dateRange.to, 'PPP') : "End date"}
                    </>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode={activeTab === 'daily' ? "single" : "range"}
                  selected={activeTab === 'daily' ? dateRange.from : dateRange}
                  onSelect={activeTab === 'daily' 
                    ? (date) => setDateRange({ from: date, to: date }) 
                    : setDateRange
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 justify-between mb-4">
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search employees..."
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
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="PRESENT">Present</SelectItem>
                <SelectItem value="LATE">Late</SelectItem>
                <SelectItem value="ABSENT">Absent</SelectItem>
                <SelectItem value="HALF_DAY">Half Day</SelectItem>
                <SelectItem value="ON_LEAVE">On Leave</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={biometricFilter} onValueChange={setBiometricFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Biometric Verification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Records</SelectItem>
                <SelectItem value="true">Verified</SelectItem>
                <SelectItem value="false">Not Verified</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <TabsContent value="daily" className="mt-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Daily Attendance</CardTitle>
              <CardDescription>
                {loading ? 'Loading attendance records...' : 
                  `Showing ${attendanceRecords.length} of ${pagination.total} records for ${dateRange.from ? format(dateRange.from, 'PPPP') : 'today'}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error ? (
                <div className="text-center py-4 text-red-500">
                  Error: {error}
                </div>
              ) : loading ? (
                <div className="text-center py-4">
                  Loading...
                </div>
              ) : attendanceRecords.length === 0 ? (
                <div className="text-center py-4">
                  No attendance records found. Try adjusting your filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Check In</TableHead>
                        <TableHead>Check Out</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Biometric</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">
                            {record.employee.firstName} {record.employee.lastName}
                            <div className="text-xs text-muted-foreground">
                              {record.employee.employeeId}
                            </div>
                          </TableCell>
                          <TableCell>
                            {record.employee.department?.name || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {formatTimeOrPlaceholder(record.checkInTime)}
                          </TableCell>
                          <TableCell>
                            {formatTimeOrPlaceholder(record.checkOutTime)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(record.status)}>
                              {record.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {record.biometricVerified ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => router.push(`/dashboard/hr/attendance/${record.id}`)}
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
        
        <TabsContent value="range" className="mt-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Attendance Summary</CardTitle>
              <CardDescription>
                {loading ? 'Loading attendance summary...' : 
                  `Showing attendance from ${dateRange.from ? format(dateRange.from, 'PP') : '—'} to ${dateRange.to ? format(dateRange.to, 'PP') : '—'}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error ? (
                <div className="text-center py-4 text-red-500">
                  Error: {error}
                </div>
              ) : loading ? (
                <div className="text-center py-4">
                  Loading...
                </div>
              ) : attendanceRecords.length === 0 ? (
                <div className="text-center py-4">
                  No attendance records found in the selected date range.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Hours Worked</TableHead>
                        <TableHead>Biometric</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">
                            {record.employee.firstName} {record.employee.lastName}
                            <div className="text-xs text-muted-foreground">
                              {record.employee.employeeId}
                            </div>
                          </TableCell>
                          <TableCell>
                            {record.employee.department?.name || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {format(new Date(record.date), 'PP')}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(record.status)}>
                              {record.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {record.checkInTime && record.checkOutTime ? (
                              `${((new Date(record.checkOutTime).getTime() - new Date(record.checkInTime).getTime()) / (1000 * 60 * 60)).toFixed(1)} hrs`
                            ) : '—'}
                          </TableCell>
                          <TableCell>
                            {record.biometricVerified ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => router.push(`/dashboard/hr/attendance/${record.id}`)}
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
      </Tabs>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-2xl font-bold">
                {attendanceRecords.filter(r => r.status === 'PRESENT').length}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Late Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-yellow-500 mr-2" />
              <span className="text-2xl font-bold">
                {attendanceRecords.filter(r => r.status === 'LATE').length}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <XCircle className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-2xl font-bold">
                {attendanceRecords.filter(r => r.status === 'ABSENT').length}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">On Leave</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <FileText className="h-5 w-5 text-blue-500 mr-2" />
              <span className="text-2xl font-bold">
                {attendanceRecords.filter(r => r.status === 'ON_LEAVE').length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
