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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Edit, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Calendar, 
  User,
  Building2,
  FileText,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';

export default function AttendanceDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch attendance data
  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/hr/attendance/${params.id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Attendance record not found');
          }
          throw new Error('Failed to fetch attendance data');
        }
        
        const data = await response.json();
        setAttendance(data);
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
  }, [params.id]);

  // Handle edit navigation
  const handleEdit = () => {
    router.push(`/dashboard/hr/attendance/${params.id}/edit`);
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
    return time ? format(new Date(time), 'h:mm:ss a') : '—';
  };

  // Calculate hours worked
  const calculateHoursWorked = (checkInTime, checkOutTime) => {
    if (!checkInTime || !checkOutTime) return '—';
    
    const checkIn = new Date(checkInTime);
    const checkOut = new Date(checkOutTime);
    const diffMs = checkOut.getTime() - checkIn.getTime();
    const diffHrs = diffMs / (1000 * 60 * 60);
    
    return `${diffHrs.toFixed(2)} hours`;
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4 md:p-8">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/dashboard/hr/attendance')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Attendance
          </Button>
        </div>
        <div className="flex justify-center items-center h-64">
          <p>Loading attendance data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4 p-4 md:p-8">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/dashboard/hr/attendance')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Attendance
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <AlertCircle className="h-10 w-10 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button 
              className="mt-4" 
              onClick={() => router.push('/dashboard/hr/attendance')}
            >
              Return to Attendance
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!attendance) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push('/dashboard/hr/attendance')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Attendance
        </Button>
      </div>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Attendance Record
          </h1>
          <p className="text-muted-foreground">
            {format(new Date(attendance.date), 'PPPP')}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Record
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Employee Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
                <User className="h-12 w-12 text-muted-foreground" />
              </div>
              
              <h3 className="text-xl font-semibold">
                {attendance.employee.firstName} {attendance.employee.lastName}
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                {attendance.employee.employeeId}
              </p>
              
              {attendance.employee.department && (
                <Badge variant="outline" className="mb-2">
                  {attendance.employee.department.name}
                </Badge>
              )}
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium">{attendance.employee.department?.name || 'Not Assigned'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{format(new Date(attendance.date), 'PPP')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Attendance Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Status</p>
                <div>
                  <Badge variant={getStatusBadgeVariant(attendance.status)} className="text-base px-3 py-1">
                    {attendance.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Biometric Verification</p>
                <div className="flex items-center">
                  {attendance.biometricVerified ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      <span>Verified</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-500 mr-2" />
                      <span>Not Verified</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Check In Time</p>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-blue-500 mr-2" />
                  <span className="font-medium">{formatTimeOrPlaceholder(attendance.checkInTime)}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Check Out Time</p>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-blue-500 mr-2" />
                  <span className="font-medium">{formatTimeOrPlaceholder(attendance.checkOutTime)}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Hours Worked</p>
                <p className="font-medium">
                  {calculateHoursWorked(attendance.checkInTime, attendance.checkOutTime)}
                </p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Record Created</p>
                <p className="font-medium">
                  {format(new Date(attendance.createdAt), 'PPP p')}
                </p>
              </div>
            </div>
            
            {attendance.notes && (
              <>
                <Separator className="my-6" />
                
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <div className="p-4 bg-muted rounded-md">
                    <p>{attendance.notes}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
