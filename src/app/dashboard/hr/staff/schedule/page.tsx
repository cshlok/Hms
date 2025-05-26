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
import { 
  Search, 
  Plus, 
  Building2, 
  ArrowLeft,
  CalendarRange,
  Users
} from 'lucide-react';
import { format } from 'date-fns';

export default function StaffScheduling() {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [departments, setDepartments] = useState([]);
  const [pagination, setPagination] = useState({
    skip: 0,
    take: 10,
    total: 0
  });
  const [scheduleView, setScheduleView] = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState([]);

  // Fetch employees
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const queryParams = new URLSearchParams({
          skip: pagination.skip.toString(),
          take: pagination.take.toString()
        });
        
        if (search) queryParams.append('search', search);
        if (departmentFilter) queryParams.append('departmentId', departmentFilter);
        
        const response = await fetch(`/api/hr/staff?${queryParams.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch employees');
        }
        
        const data = await response.json();
        setEmployees(data.employees);
        setPagination(prev => ({
          ...prev,
          total: data.total
        }));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEmployees();
  }, [search, departmentFilter, pagination.skip, pagination.take]);

  // Fetch departments for filters
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        // Fetch departments
        const deptResponse = await fetch('/api/hr/departments');
        if (deptResponse.ok) {
          const deptData = await deptResponse.json();
          setDepartments(deptData.departments || []);
        }
      } catch (err) {
        console.error('Error fetching departments:', err);
      }
    };
    
    fetchDepartments();
  }, []);

  // Generate mock schedule data for demonstration
  useEffect(() => {
    if (employees.length > 0) {
      const mockSchedules = [];
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const shifts = ['Morning (7AM-3PM)', 'Evening (3PM-11PM)', 'Night (11PM-7AM)', 'Off'];
      
      employees.forEach(employee => {
        const employeeSchedule = {
          employeeId: employee.id,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          department: employee.department?.name || 'Unassigned',
          position: employee.positions?.length > 0 
            ? (employee.positions.find(p => p.isPrimary)?.position.title || employee.positions[0].position.title) 
            : 'Unassigned',
          schedule: {}
        };
        
        days.forEach(day => {
          // Randomly assign shifts, with higher probability for "Off" on weekends
          const isWeekend = day === 'Saturday' || day === 'Sunday';
          const shiftIndex = Math.floor(Math.random() * (isWeekend ? 10 : shifts.length));
          employeeSchedule.schedule[day] = shiftIndex >= shifts.length ? 'Off' : shifts[shiftIndex];
        });
        
        mockSchedules.push(employeeSchedule);
      });
      
      setSchedules(mockSchedules);
    }
  }, [employees]);

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

  // Get days of the week for the current date
  const getDaysOfWeek = () => {
    const days = [];
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    startOfWeek.setDate(diff);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
      days.push({
        name: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i],
        date: date
      });
    }
    
    return days;
  };

  // Navigate to previous/next week
  const navigatePreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const navigateNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  // Get the week range string
  const getWeekRangeString = () => {
    const days = getDaysOfWeek();
    return `${format(days[0].date, 'MMM d')} - ${format(days[6].date, 'MMM d, yyyy')}`;
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push('/dashboard/hr/staff')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Staff Management
        </Button>
      </div>
      
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Staff Scheduling</h1>
        <p className="text-muted-foreground">
          Manage employee work schedules and shifts
        </p>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 justify-between">
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
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Filter by Department" />
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
          
          <Button onClick={() => router.push('/dashboard/hr/staff/schedule/new')}>
            <CalendarRange className="mr-2 h-4 w-4" />
            Create Schedule
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle>Staff Schedule</CardTitle>
            <div className="flex gap-2">
              <Select value={scheduleView} onValueChange={setScheduleView}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="View" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Week View</SelectItem>
                  <SelectItem value="month">Month View</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <CardDescription>
            {loading ? 'Loading schedule...' : `Showing schedule for ${getWeekRangeString()}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <Button variant="outline" size="sm" onClick={navigatePreviousWeek}>
              Previous Week
            </Button>
            <div className="font-medium">
              {getWeekRangeString()}
            </div>
            <Button variant="outline" size="sm" onClick={navigateNextWeek}>
              Next Week
            </Button>
          </div>
          
          {error ? (
            <div className="text-center py-4 text-red-500">
              Error: {error}
            </div>
          ) : loading ? (
            <div className="text-center py-4">
              Loading...
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-4">
              No employees found. Try adjusting your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Position</TableHead>
                    {getDaysOfWeek().map((day) => (
                      <TableHead key={day.name} className="min-w-[120px]">
                        <div className="flex flex-col">
                          <span>{day.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(day.date, 'MMM d')}
                          </span>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((schedule) => (
                    <TableRow key={schedule.employeeId}>
                      <TableCell className="font-medium">
                        {schedule.employeeName}
                      </TableCell>
                      <TableCell>
                        {schedule.department}
                      </TableCell>
                      <TableCell>
                        {schedule.position}
                      </TableCell>
                      {getDaysOfWeek().map((day) => (
                        <TableCell key={day.name}>
                          <Badge variant={
                            schedule.schedule[day.name] === 'Off' ? 'outline' :
                            schedule.schedule[day.name]?.includes('Morning') ? 'default' :
                            schedule.schedule[day.name]?.includes('Evening') ? 'secondary' :
                            'destructive'
                          }>
                            {schedule.schedule[day.name]}
                          </Badge>
                        </TableCell>
                      ))}
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
                  Page {Math.floor(pagination.skip / pagination.take) + 1} of {Math.ceil(pagination.total / pagination.take)}
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
    </div>
  );
}
