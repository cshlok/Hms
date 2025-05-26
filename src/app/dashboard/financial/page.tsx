'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { 
  BarChart, 
  LineChart, 
  PieChart, 
  DonutChart 
} from '@/components/ui/charts';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatCurrency, formatDate, formatNumber } from '@/lib/formatters';

export default function FinancialDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date()
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange, activeTab]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would fetch data from the API
      // For now, we'll simulate the data
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate simulated data based on active tab
      let data;
      switch (activeTab) {
        case 'overview':
          data = generateOverviewData();
          break;
        case 'revenue':
          data = generateRevenueData();
          break;
        case 'billing':
          data = generateBillingData();
          break;
        case 'insurance':
          data = generateInsuranceData();
          break;
        case 'reports':
          data = generateReportsData();
          break;
        default:
          data = generateOverviewData();
      }
      
      setDashboardData(data);
    } catch (err) {
      setError('Failed to load dashboard data. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Simulated data generators
  const generateOverviewData = () => {
    return {
      kpis: [
        { title: 'Total Revenue', value: 1250000, change: 5.2, changeType: 'increase' },
        { title: 'Outstanding Amount', value: 320000, change: -2.1, changeType: 'decrease' },
        { title: 'Average Collection Period', value: 32, unit: 'days', change: -3, changeType: 'decrease' },
        { title: 'Claim Approval Rate', value: 87.5, unit: '%', change: 1.5, changeType: 'increase' }
      ],
      revenueChart: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Revenue',
            data: [120000, 150000, 180000, 220000, 250000, 280000],
            backgroundColor: 'rgba(34, 197, 94, 0.2)',
            borderColor: 'rgb(34, 197, 94)',
          },
          {
            label: 'Expenses',
            data: [90000, 110000, 130000, 150000, 170000, 190000],
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            borderColor: 'rgb(239, 68, 68)',
          }
        ]
      },
      billingStatus: {
        labels: ['Paid', 'Partial', 'Pending', 'Overdue'],
        data: [65, 15, 10, 10],
        backgroundColor: [
          'rgba(34, 197, 94, 0.6)',
          'rgba(59, 130, 246, 0.6)',
          'rgba(250, 204, 21, 0.6)',
          'rgba(239, 68, 68, 0.6)'
        ]
      },
      recentTransactions: [
        { id: 'INV-2025-000123', patient: 'John Smith', date: '2025-05-25', amount: 1250, status: 'paid' },
        { id: 'INV-2025-000124', patient: 'Sarah Johnson', date: '2025-05-24', amount: 2340, status: 'partial' },
        { id: 'INV-2025-000125', patient: 'Michael Brown', date: '2025-05-23', amount: 890, status: 'pending' },
        { id: 'INV-2025-000126', patient: 'Emily Davis', date: '2025-05-22', amount: 1780, status: 'overdue' },
        { id: 'INV-2025-000127', patient: 'Robert Wilson', date: '2025-05-21', amount: 3450, status: 'paid' }
      ]
    };
  };

  const generateRevenueData = () => {
    return {
      revenueTrend: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [
          {
            label: 'Revenue',
            data: [65000, 72000, 68000, 78000],
            backgroundColor: 'rgba(34, 197, 94, 0.2)',
            borderColor: 'rgb(34, 197, 94)',
          }
        ]
      },
      revenueByDepartment: {
        labels: ['OPD', 'IPD', 'Emergency', 'Laboratory', 'Radiology', 'Pharmacy'],
        data: [30, 25, 15, 10, 12, 8],
        backgroundColor: [
          'rgba(59, 130, 246, 0.6)',
          'rgba(34, 197, 94, 0.6)',
          'rgba(239, 68, 68, 0.6)',
          'rgba(250, 204, 21, 0.6)',
          'rgba(168, 85, 247, 0.6)',
          'rgba(236, 72, 153, 0.6)'
        ]
      },
      revenueByService: [
        { service: 'General Consultation', revenue: 125000, percentage: 15 },
        { service: 'Specialist Consultation', revenue: 180000, percentage: 22 },
        { service: 'Laboratory Tests', revenue: 95000, percentage: 12 },
        { service: 'Radiology Services', revenue: 110000, percentage: 13 },
        { service: 'Inpatient Care', revenue: 210000, percentage: 26 },
        { service: 'Pharmacy', revenue: 75000, percentage: 9 },
        { service: 'Emergency Services', revenue: 65000, percentage: 8 }
      ],
      paymentMethods: {
        labels: ['Cash', 'Credit Card', 'Insurance', 'Bank Transfer', 'Online Payment'],
        data: [15, 30, 40, 5, 10],
        backgroundColor: [
          'rgba(250, 204, 21, 0.6)',
          'rgba(59, 130, 246, 0.6)',
          'rgba(34, 197, 94, 0.6)',
          'rgba(168, 85, 247, 0.6)',
          'rgba(236, 72, 153, 0.6)'
        ]
      }
    };
  };

  const generateBillingData = () => {
    return {
      invoiceStatus: {
        labels: ['Draft', 'Pending', 'Verified', 'Approved', 'Sent', 'Partial', 'Paid', 'Overdue'],
        data: [5, 8, 12, 15, 10, 18, 25, 7],
        backgroundColor: [
          'rgba(156, 163, 175, 0.6)',
          'rgba(250, 204, 21, 0.6)',
          'rgba(59, 130, 246, 0.6)',
          'rgba(168, 85, 247, 0.6)',
          'rgba(236, 72, 153, 0.6)',
          'rgba(14, 165, 233, 0.6)',
          'rgba(34, 197, 94, 0.6)',
          'rgba(239, 68, 68, 0.6)'
        ]
      },
      agingAnalysis: {
        labels: ['Current', '1-30 days', '31-60 days', '61-90 days', '90+ days'],
        datasets: [
          {
            label: 'Outstanding Amount',
            data: [120000, 85000, 45000, 35000, 25000],
            backgroundColor: [
              'rgba(34, 197, 94, 0.6)',
              'rgba(250, 204, 21, 0.6)',
              'rgba(249, 115, 22, 0.6)',
              'rgba(239, 68, 68, 0.6)',
              'rgba(220, 38, 38, 0.6)'
            ]
          }
        ]
      },
      recentInvoices: [
        { id: 'INV-2025-000128', patient: 'Thomas Anderson', date: '2025-05-25', amount: 2150, status: 'approved' },
        { id: 'INV-2025-000129', patient: 'Jennifer Lee', date: '2025-05-25', amount: 1890, status: 'pending' },
        { id: 'INV-2025-000130', patient: 'David Miller', date: '2025-05-24', amount: 3450, status: 'verified' },
        { id: 'INV-2025-000131', patient: 'Susan White', date: '2025-05-24', amount: 1250, status: 'draft' },
        { id: 'INV-2025-000132', patient: 'James Brown', date: '2025-05-23', amount: 2780, status: 'sent' },
        { id: 'INV-2025-000133', patient: 'Patricia Davis', date: '2025-05-23', amount: 1950, status: 'paid' },
        { id: 'INV-2025-000134', patient: 'Robert Johnson', date: '2025-05-22', amount: 3250, status: 'partial' },
        { id: 'INV-2025-000135', patient: 'Linda Wilson', date: '2025-05-21', amount: 1650, status: 'overdue' }
      ],
      recentPayments: [
        { id: 'PAY-2025-000089', invoice: 'INV-2025-000123', patient: 'John Smith', date: '2025-05-25', amount: 1250, method: 'Credit Card' },
        { id: 'PAY-2025-000090', invoice: 'INV-2025-000124', patient: 'Sarah Johnson', date: '2025-05-24', amount: 1500, method: 'Insurance' },
        { id: 'PAY-2025-000091', invoice: 'INV-2025-000127', patient: 'Robert Wilson', date: '2025-05-21', amount: 3450, method: 'Bank Transfer' },
        { id: 'PAY-2025-000092', invoice: 'INV-2025-000133', patient: 'Patricia Davis', date: '2025-05-23', amount: 1950, method: 'Cash' },
        { id: 'PAY-2025-000093', invoice: 'INV-2025-000134', patient: 'Robert Johnson', date: '2025-05-22', amount: 2000, method: 'Online Payment' }
      ]
    };
  };

  const generateInsuranceData = () => {
    return {
      claimStatus: {
        labels: ['Draft', 'Submitted', 'In Progress', 'Additional Info Needed', 'Approved', 'Partially Approved', 'Denied', 'Appealed'],
        data: [10, 15, 20, 8, 30, 7, 5, 5],
        backgroundColor: [
          'rgba(156, 163, 175, 0.6)',
          'rgba(59, 130, 246, 0.6)',
          'rgba(250, 204, 21, 0.6)',
          'rgba(249, 115, 22, 0.6)',
          'rgba(34, 197, 94, 0.6)',
          'rgba(168, 85, 247, 0.6)',
          'rgba(239, 68, 68, 0.6)',
          'rgba(236, 72, 153, 0.6)'
        ]
      },
      claimTrend: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
        datasets: [
          {
            label: 'Submitted Claims',
            data: [45, 52, 48, 58, 63],
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
          },
          {
            label: 'Approved Claims',
            data: [35, 42, 38, 48, 53],
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
          }
        ]
      },
      topInsuranceProviders: [
        { provider: 'Blue Cross Blue Shield', claimsCount: 125, approvalRate: 92, averageProcessingDays: 12 },
        { provider: 'UnitedHealthcare', claimsCount: 98, approvalRate: 88, averageProcessingDays: 15 },
        { provider: 'Aetna', claimsCount: 87, approvalRate: 85, averageProcessingDays: 14 },
        { provider: 'Cigna', claimsCount: 76, approvalRate: 90, averageProcessingDays: 13 },
        { provider: 'Humana', claimsCount: 65, approvalRate: 87, averageProcessingDays: 16 }
      ],
      recentClaims: [
        { id: 'CLM-2025-000056', invoice: 'INV-2025-000123', patient: 'John Smith', provider: 'Blue Cross Blue Shield', amount: 1250, status: 'approved' },
        { id: 'CLM-2025-000057', invoice: 'INV-2025-000124', patient: 'Sarah Johnson', provider: 'UnitedHealthcare', amount: 2340, status: 'in_progress' },
        { id: 'CLM-2025-000058', invoice: 'INV-2025-000127', patient: 'Robert Wilson', provider: 'Aetna', amount: 3450, status: 'submitted' },
        { id: 'CLM-2025-000059', invoice: 'INV-2025-000132', patient: 'James Brown', provider: 'Cigna', amount: 2780, status: 'additional_info_needed' },
        { id: 'CLM-2025-000060', invoice: 'INV-2025-000133', patient: 'Patricia Davis', provider: 'Humana', amount: 1950, status: 'denied' }
      ],
      denialReasons: {
        labels: ['Eligibility Issues', 'Missing Information', 'Non-covered Service', 'Authorization Required', 'Duplicate Claim', 'Coding Errors'],
        data: [30, 25, 15, 12, 8, 10],
        backgroundColor: [
          'rgba(239, 68, 68, 0.6)',
          'rgba(249, 115, 22, 0.6)',
          'rgba(250, 204, 21, 0.6)',
          'rgba(168, 85, 247, 0.6)',
          'rgba(59, 130, 246, 0.6)',
          'rgba(236, 72, 153, 0.6)'
        ]
      }
    };
  };

  const generateReportsData = () => {
    return {
      availableReports: [
        { id: 'REP-001', name: 'Revenue Report', description: 'Detailed breakdown of revenue by department, service, and time period', lastRun: '2025-05-20' },
        { id: 'REP-002', name: 'Expenses Report', description: 'Analysis of expenses by category and department', lastRun: '2025-05-19' },
        { id: 'REP-003', name: 'Profit & Loss Statement', description: 'Financial performance summary with revenue, expenses, and profit', lastRun: '2025-05-18' },
        { id: 'REP-004', name: 'Accounts Receivable Aging', description: 'Outstanding invoices categorized by age', lastRun: '2025-05-25' },
        { id: 'REP-005', name: 'Insurance Claims Analysis', description: 'Status and performance of insurance claims', lastRun: '2025-05-24' },
        { id: 'REP-006', name: 'Payment Collection Report', description: 'Analysis of payment collection by method and time period', lastRun: '2025-05-23' },
        { id: 'REP-007', name: 'Department Revenue Report', description: 'Revenue breakdown by department with patient volume', lastRun: '2025-05-22' },
        { id: 'REP-008', name: 'Service Revenue Report', description: 'Revenue analysis by service type and volume', lastRun: '2025-05-21' }
      ],
      scheduledReports: [
        { id: 'SCH-001', report: 'Revenue Report', frequency: 'Weekly', nextRun: '2025-05-27', recipients: 'Finance Team' },
        { id: 'SCH-002', report: 'Profit & Loss Statement', frequency: 'Monthly', nextRun: '2025-06-01', recipients: 'Management Team' },
        { id: 'SCH-003', report: 'Accounts Receivable Aging', frequency: 'Weekly', nextRun: '2025-06-01', recipients: 'Billing Team' },
        { id: 'SCH-004', report: 'Insurance Claims Analysis', frequency: 'Weekly', nextRun: '2025-05-31', recipients: 'Insurance Team' }
      ]
    };
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading financial dashboard...</span>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={fetchDashboardData}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Financial Dashboard</h1>
        <div className="flex space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">From:</span>
            <DatePicker
              date={dateRange.startDate}
              onDateChange={(date) => setDateRange({ ...dateRange, startDate: date })}
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">To:</span>
            <DatePicker
              date={dateRange.endDate}
              onDateChange={(date) => setDateRange({ ...dateRange, endDate: date })}
            />
          </div>
          <Button onClick={fetchDashboardData}>Apply</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Analysis</TabsTrigger>
          <TabsTrigger value="billing">Billing & Payments</TabsTrigger>
          <TabsTrigger value="insurance">Insurance Claims</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {dashboardData && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                {dashboardData.kpis.map((kpi, index) => (
                  <Card key={index}>
                    <CardContent className="p-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-muted-foreground">{kpi.title}</span>
                        <div className="flex items-baseline mt-2">
                          <span className="text-3xl font-bold">
                            {kpi.unit === '%' ? formatNumber(kpi.value) + '%' : 
                             kpi.unit === 'days' ? formatNumber(kpi.value) + ' days' : 
                             formatCurrency(kpi.value)}
                          </span>
                          <span className={`ml-2 text-sm font-medium ${kpi.changeType === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
                            {kpi.changeType === 'increase' ? '↑' : '↓'} {Math.abs(kpi.change)}%
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue vs Expenses</CardTitle>
                    <CardDescription>Monthly comparison for the last 6 months</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BarChart
                      data={dashboardData.revenueChart}
                      height={300}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Billing Status</CardTitle>
                    <CardDescription>Current distribution of invoice status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DonutChart
                      data={dashboardData.billingStatus}
                      height={300}
                    />
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                  <CardDescription>Latest financial activities</CardDescription>
                </CardHeader>
                <CardContent>
                  <DataTable
                    data={dashboardData.recentTransactions}
                    columns={[
                      { header: 'Invoice ID', accessorKey: 'id' },
                      { header: 'Patient', accessorKey: 'patient' },
                      { 
                        header: 'Date', 
                        accessorKey: 'date',
                        cell: ({ row }) => formatDate(row.original.date)
                      },
                      { 
                        header: 'Amount', 
                        accessorKey: 'amount',
                        cell: ({ row }) => formatCurrency(row.original.amount)
                      },
                      { 
                        header: 'Status', 
                        accessorKey: 'status',
                        cell: ({ row }) => {
                          const status = row.original.status;
                          const statusColors = {
                            paid: 'bg-green-100 text-green-800',
                            partial: 'bg-blue-100 text-blue-800',
                            pending: 'bg-yellow-100 text-yellow-800',
                            overdue: 'bg-red-100 text-red-800'
                          };
                          
                          return (
                            <Badge className={statusColors[status as keyof typeof statusColors]}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </Badge>
                          );
                        }
                      }
                    ]}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="revenue">
          {dashboardData && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Trend</CardTitle>
                    <CardDescription>Weekly revenue for the selected period</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <LineChart
                      data={dashboardData.revenueTrend}
                      height={300}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Revenue by Department</CardTitle>
                    <CardDescription>Distribution across hospital departments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PieChart
                      data={dashboardData.revenueByDepartment}
                      height={300}
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue by Service</CardTitle>
                    <CardDescription>Top revenue-generating services</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DataTable
                      data={dashboardData.revenueByService}
                      columns={[
                        { header: 'Service', accessorKey: 'service' },
                        { 
                          header: 'Revenue', 
                          accessorKey: 'revenue',
                          cell: ({ row }) => formatCurrency(row.original.revenue)
                        },
                        { 
                          header: 'Percentage', 
                          accessorKey: 'percentage',
                          cell: ({ row }) => `${row.original.percentage}%`
                        }
                      ]}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Payment Methods</CardTitle>
                    <CardDescription>Distribution of payment methods used</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DonutChart
                      data={dashboardData.paymentMethods}
                      height={300}
                    />
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="billing">
          {dashboardData && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Invoice Status</CardTitle>
                    <CardDescription>Current distribution of invoices by status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BarChart
                      data={{
                        labels: dashboardData.invoiceStatus.labels,
                        datasets: [{
                          label: 'Invoices',
                          data: dashboardData.invoiceStatus.data,
                          backgroundColor: dashboardData.invoiceStatus.backgroundColor
                        }]
                      }}
                      height={300}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Aging Analysis</CardTitle>
                    <CardDescription>Outstanding amounts by age</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BarChart
                      data={{
                        labels: dashboardData.agingAnalysis.labels,
                        datasets: dashboardData.agingAnalysis.datasets
                      }}
                      height={300}
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-6 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Invoices</CardTitle>
                    <CardDescription>Latest generated invoices</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DataTable
                      data={dashboardData.recentInvoices}
                      columns={[
                        { header: 'Invoice ID', accessorKey: 'id' },
                        { header: 'Patient', accessorKey: 'patient' },
                        { 
                          header: 'Date', 
                          accessorKey: 'date',
                          cell: ({ row }) => formatDate(row.original.date)
                        },
                        { 
                          header: 'Amount', 
                          accessorKey: 'amount',
                          cell: ({ row }) => formatCurrency(row.original.amount)
                        },
                        { 
                          header: 'Status', 
                          accessorKey: 'status',
                          cell: ({ row }) => {
                            const status = row.original.status;
                            const statusColors: Record<string, string> = {
                              draft: 'bg-gray-100 text-gray-800',
                              pending: 'bg-yellow-100 text-yellow-800',
                              verified: 'bg-blue-100 text-blue-800',
                              approved: 'bg-purple-100 text-purple-800',
                              sent: 'bg-pink-100 text-pink-800',
                              partial: 'bg-sky-100 text-sky-800',
                              paid: 'bg-green-100 text-green-800',
                              overdue: 'bg-red-100 text-red-800'
                            };
                            
                            return (
                              <Badge className={statusColors[status]}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </Badge>
                            );
                          }
                        },
                        {
                          header: 'Actions',
                          cell: () => (
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">View</Button>
                              <Button variant="outline" size="sm">Edit</Button>
                            </div>
                          )
                        }
                      ]}
                    />
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Payments</CardTitle>
                  <CardDescription>Latest payment transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <DataTable
                    data={dashboardData.recentPayments}
                    columns={[
                      { header: 'Payment ID', accessorKey: 'id' },
                      { header: 'Invoice', accessorKey: 'invoice' },
                      { header: 'Patient', accessorKey: 'patient' },
                      { 
                        header: 'Date', 
                        accessorKey: 'date',
                        cell: ({ row }) => formatDate(row.original.date)
                      },
                      { 
                        header: 'Amount', 
                        accessorKey: 'amount',
                        cell: ({ row }) => formatCurrency(row.original.amount)
                      },
                      { header: 'Method', accessorKey: 'method' },
                      {
                        header: 'Actions',
                        cell: () => (
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">View</Button>
                            <Button variant="outline" size="sm">Receipt</Button>
                          </div>
                        )
                      }
                    ]}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="insurance">
          {dashboardData && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Claim Status</CardTitle>
                    <CardDescription>Distribution of claims by status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PieChart
                      data={dashboardData.claimStatus}
                      height={300}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Claim Trend</CardTitle>
                    <CardDescription>Monthly submitted vs approved claims</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <LineChart
                      data={dashboardData.claimTrend}
                      height={300}
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-6 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Insurance Providers</CardTitle>
                    <CardDescription>Performance metrics by insurance provider</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DataTable
                      data={dashboardData.topInsuranceProviders}
                      columns={[
                        { header: 'Provider', accessorKey: 'provider' },
                        { 
                          header: 'Claims Count', 
                          accessorKey: 'claimsCount',
                          cell: ({ row }) => formatNumber(row.original.claimsCount)
                        },
                        { 
                          header: 'Approval Rate', 
                          accessorKey: 'approvalRate',
                          cell: ({ row }) => `${row.original.approvalRate}%`
                        },
                        { 
                          header: 'Avg. Processing Days', 
                          accessorKey: 'averageProcessingDays',
                          cell: ({ row }) => `${row.original.averageProcessingDays} days`
                        }
                      ]}
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Claims</CardTitle>
                    <CardDescription>Latest insurance claims</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DataTable
                      data={dashboardData.recentClaims}
                      columns={[
                        { header: 'Claim ID', accessorKey: 'id' },
                        { header: 'Patient', accessorKey: 'patient' },
                        { header: 'Provider', accessorKey: 'provider' },
                        { 
                          header: 'Amount', 
                          accessorKey: 'amount',
                          cell: ({ row }) => formatCurrency(row.original.amount)
                        },
                        { 
                          header: 'Status', 
                          accessorKey: 'status',
                          cell: ({ row }) => {
                            const status = row.original.status;
                            const statusColors: Record<string, string> = {
                              draft: 'bg-gray-100 text-gray-800',
                              submitted: 'bg-blue-100 text-blue-800',
                              in_progress: 'bg-yellow-100 text-yellow-800',
                              additional_info_needed: 'bg-orange-100 text-orange-800',
                              approved: 'bg-green-100 text-green-800',
                              partially_approved: 'bg-purple-100 text-purple-800',
                              denied: 'bg-red-100 text-red-800',
                              appealed: 'bg-pink-100 text-pink-800'
                            };
                            
                            return (
                              <Badge className={statusColors[status]}>
                                {status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                              </Badge>
                            );
                          }
                        }
                      ]}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Denial Reasons</CardTitle>
                    <CardDescription>Common reasons for claim denials</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PieChart
                      data={dashboardData.denialReasons}
                      height={300}
                    />
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="reports">
          {dashboardData && (
            <>
              <div className="grid grid-cols-1 gap-6 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Available Reports</CardTitle>
                    <CardDescription>Generate financial reports</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DataTable
                      data={dashboardData.availableReports}
                      columns={[
                        { header: 'Report ID', accessorKey: 'id' },
                        { header: 'Name', accessorKey: 'name' },
                        { header: 'Description', accessorKey: 'description' },
                        { 
                          header: 'Last Run', 
                          accessorKey: 'lastRun',
                          cell: ({ row }) => formatDate(row.original.lastRun)
                        },
                        {
                          header: 'Actions',
                          cell: () => (
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">Generate</Button>
                              <Button variant="outline" size="sm">Schedule</Button>
                            </div>
                          )
                        }
                      ]}
                    />
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Scheduled Reports</CardTitle>
                  <CardDescription>Automated report generation</CardDescription>
                </CardHeader>
                <CardContent>
                  <DataTable
                    data={dashboardData.scheduledReports}
                    columns={[
                      { header: 'Schedule ID', accessorKey: 'id' },
                      { header: 'Report', accessorKey: 'report' },
                      { header: 'Frequency', accessorKey: 'frequency' },
                      { 
                        header: 'Next Run', 
                        accessorKey: 'nextRun',
                        cell: ({ row }) => formatDate(row.original.nextRun)
                      },
                      { header: 'Recipients', accessorKey: 'recipients' },
                      {
                        header: 'Actions',
                        cell: () => (
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">Edit</Button>
                            <Button variant="outline" size="sm">Delete</Button>
                          </div>
                        )
                      }
                    ]}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
