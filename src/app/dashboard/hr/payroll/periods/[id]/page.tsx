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
  DollarSign, 
  Calendar, 
  User,
  Building2,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';

export default function PayrollPeriodDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [payrollPeriod, setPayrollPeriod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingAction, setProcessingAction] = useState(false);

  // Fetch payroll period data
  useEffect(() => {
    const fetchPayrollPeriod = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/hr/payroll/periods/${params.id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Payroll period not found');
          }
          throw new Error('Failed to fetch payroll period data');
        }
        
        const data = await response.json();
        setPayrollPeriod(data);
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
    
    fetchPayrollPeriod();
  }, [params.id]);

  // Generate payroll entries
  const handleGenerateEntries = async () => {
    try {
      setProcessingAction(true);
      const response = await fetch(`/api/hr/payroll/periods/${params.id}/generate`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate payroll entries');
      }
      
      const data = await response.json();
      
      toast({
        title: "Success",
        description: `Generated ${data.entriesGenerated} payroll entries`,
      });
      
      // Refresh payroll period data
      const periodResponse = await fetch(`/api/hr/payroll/periods/${params.id}`);
      if (periodResponse.ok) {
        const periodData = await periodResponse.json();
        setPayrollPeriod(periodData);
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setProcessingAction(false);
    }
  };

  // Approve payroll period
  const handleApprovePeriod = async () => {
    try {
      setProcessingAction(true);
      const response = await fetch(`/api/hr/payroll/periods/${params.id}/approve`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to approve payroll period');
      }
      
      const data = await response.json();
      
      toast({
        title: "Success",
        description: `Approved ${data.entriesApproved} payroll entries`,
      });
      
      // Refresh payroll period data
      const periodResponse = await fetch(`/api/hr/payroll/periods/${params.id}`);
      if (periodResponse.ok) {
        const periodData = await periodResponse.json();
        setPayrollPeriod(periodData);
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setProcessingAction(false);
    }
  };

  // Mark payroll period as paid
  const handleMarkAsPaid = async () => {
    try {
      setProcessingAction(true);
      const response = await fetch(`/api/hr/payroll/periods/${params.id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentDate: new Date(),
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark payroll period as paid');
      }
      
      const data = await response.json();
      
      toast({
        title: "Success",
        description: `Marked ${data.entriesPaid} payroll entries as paid`,
      });
      
      // Refresh payroll period data
      const periodResponse = await fetch(`/api/hr/payroll/periods/${params.id}`);
      if (periodResponse.ok) {
        const periodData = await periodResponse.json();
        setPayrollPeriod(periodData);
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setProcessingAction(false);
    }
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

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4 md:p-8">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/dashboard/hr/payroll')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Payroll
          </Button>
        </div>
        <div className="flex justify-center items-center h-64">
          <p>Loading payroll period data...</p>
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
            onClick={() => router.push('/dashboard/hr/payroll')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Payroll
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <AlertCircle className="h-10 w-10 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button 
              className="mt-4" 
              onClick={() => router.push('/dashboard/hr/payroll')}
            >
              Return to Payroll
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!payrollPeriod) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push('/dashboard/hr/payroll')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Payroll
        </Button>
      </div>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {payrollPeriod.name}
          </h1>
          <p className="text-muted-foreground">
            {format(new Date(payrollPeriod.startDate), 'PP')} - {format(new Date(payrollPeriod.endDate), 'PP')}
          </p>
        </div>
        
        <div className="flex gap-2">
          {payrollPeriod.status === 'DRAFT' && (
            <Button 
              onClick={handleGenerateEntries}
              disabled={processingAction}
            >
              <FileText className="h-4 w-4 mr-2" />
              Generate Entries
            </Button>
          )}
          
          {payrollPeriod.status === 'PROCESSING' && (
            <Button 
              onClick={handleApprovePeriod}
              disabled={processingAction}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Payroll
            </Button>
          )}
          
          {payrollPeriod.status === 'APPROVED' && (
            <Button 
              onClick={handleMarkAsPaid}
              disabled={processingAction}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Mark as Paid
            </Button>
          )}
          
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Payroll Period Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Period</p>
                  <p className="font-medium">{format(new Date(payrollPeriod.startDate), 'PP')} - {format(new Date(payrollPeriod.endDate), 'PP')}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Payment Date</p>
                  <p className="font-medium">{format(new Date(payrollPeriod.paymentDate), 'PP')}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={getStatusBadgeVariant(payrollPeriod.status)}>
                    {payrollPeriod.status}
                  </Badge>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Summary</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">Total Entries</p>
                  <p className="font-medium">{payrollPeriod.payrollEntries?.length || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created On</p>
                  <p className="font-medium">{format(new Date(payrollPeriod.createdAt), 'PP')}</p>
                </div>
              </div>
            </div>
            
            {payrollPeriod.notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p>{payrollPeriod.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Payroll Entries</CardTitle>
            <CardDescription>
              {payrollPeriod.payrollEntries?.length || 0} employees in this payroll period
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!payrollPeriod.payrollEntries || payrollPeriod.payrollEntries.length === 0 ? (
              <div className="text-center py-4">
                {payrollPeriod.status === 'DRAFT' ? (
                  <div className="flex flex-col items-center gap-2">
                    <p>No payroll entries generated yet.</p>
                    <Button 
                      onClick={handleGenerateEntries}
                      disabled={processingAction}
                    >
                      Generate Entries
                    </Button>
                  </div>
                ) : (
                  <p>No payroll entries found for this period.</p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Base Salary</TableHead>
                      <TableHead>Net Salary</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollPeriod.payrollEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">
                          {entry.employee.firstName} {entry.employee.lastName}
                          <div className="text-xs text-muted-foreground">
                            {entry.employee.employeeId}
                          </div>
                        </TableCell>
                        <TableCell>
                          {entry.employee.department?.name || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(entry.baseSalary)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(entry.netSalary)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(entry.status)}>
                            {entry.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => router.push(`/dashboard/hr/payroll/entries/${entry.id}`)}
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
        </Card>
      </div>
      
      {payrollPeriod.payrollEntries && payrollPeriod.payrollEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payroll Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Base Salary</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(payrollPeriod.payrollEntries.reduce((sum, entry) => sum + entry.baseSalary, 0))}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Total Gross Salary</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(payrollPeriod.payrollEntries.reduce((sum, entry) => sum + entry.grossSalary, 0))}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Total Deductions</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(payrollPeriod.payrollEntries.reduce((sum, entry) => sum + entry.deductions, 0))}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Total Net Salary</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(payrollPeriod.payrollEntries.reduce((sum, entry) => sum + entry.netSalary, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
