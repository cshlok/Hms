import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { 
  withErrorHandling, 
  validateQuery, 
  checkPermission, 
  createSuccessResponse
} from '@/lib/core/middleware';
import { ValidationError, NotFoundError } from '@/lib/core/errors';
import { logger } from '@/lib/core/logging';

// Schema for financial report query parameters
const reportQuerySchema = z.object({
  reportType: z.enum([
    'revenue', 
    'expenses', 
    'profit_loss', 
    'accounts_receivable', 
    'insurance_claims', 
    'payment_collection',
    'department_revenue',
    'service_revenue'
  ]),
  startDate: z.string(),
  endDate: z.string(),
  groupBy: z.enum(['day', 'week', 'month', 'quarter', 'year']).optional().default('month'),
  departmentId: z.string().uuid().optional(),
  insuranceProviderId: z.string().uuid().optional(),
  format: z.enum(['json', 'csv', 'pdf', 'excel']).optional().default('json'),
});

// GET handler for generating financial reports
export const GET = withErrorHandling(async (req: NextRequest) => {
  // Validate query parameters
  const query = validateQuery(reportQuerySchema)(req);
  
  // Check permissions
  await checkPermission(permissionService, 'read', 'financialReport')(req);
  
  // Parse dates
  let startDate: Date, endDate: Date;
  try {
    startDate = new Date(query.startDate);
    endDate = new Date(query.endDate);
    
    if (startDate > endDate) {
      throw new ValidationError('Start date must be before end date', 'INVALID_DATE_RANGE');
    }
  } catch (error) {
    throw new ValidationError('Invalid date format', 'INVALID_DATE_FORMAT');
  }
  
  // Generate report based on type
  let reportData;
  switch (query.reportType) {
    case 'revenue':
      reportData = await generateRevenueReport(startDate, endDate, query.groupBy, query.departmentId);
      break;
    case 'expenses':
      reportData = await generateExpensesReport(startDate, endDate, query.groupBy, query.departmentId);
      break;
    case 'profit_loss':
      reportData = await generateProfitLossReport(startDate, endDate, query.groupBy);
      break;
    case 'accounts_receivable':
      reportData = await generateAccountsReceivableReport(startDate, endDate);
      break;
    case 'insurance_claims':
      reportData = await generateInsuranceClaimsReport(startDate, endDate, query.insuranceProviderId);
      break;
    case 'payment_collection':
      reportData = await generatePaymentCollectionReport(startDate, endDate, query.groupBy);
      break;
    case 'department_revenue':
      reportData = await generateDepartmentRevenueReport(startDate, endDate);
      break;
    case 'service_revenue':
      reportData = await generateServiceRevenueReport(startDate, endDate);
      break;
    default:
      throw new ValidationError(`Unsupported report type: ${query.reportType}`, 'UNSUPPORTED_REPORT_TYPE');
  }
  
  // Format report based on requested format
  // For now, we'll just return JSON
  // In a real implementation, this would generate CSV, PDF, or Excel files
  
  logger.info('Financial report generated', { 
    reportType: query.reportType,
    startDate: query.startDate,
    endDate: query.endDate,
    format: query.format
  });
  
  return createSuccessResponse({
    reportType: query.reportType,
    startDate: query.startDate,
    endDate: query.endDate,
    groupBy: query.groupBy,
    generatedAt: new Date().toISOString(),
    data: reportData,
  });
});

// Helper function to generate revenue report
async function generateRevenueReport(startDate: Date, endDate: Date, groupBy: string, departmentId?: string) {
  const where: any = {
    billDate: {
      gte: startDate,
      lte: endDate,
    },
  };
  
  if (departmentId) {
    where.departmentId = departmentId;
  }
  
  // Group by time period
  let groupByFormat: any;
  switch (groupBy) {
    case 'day':
      groupByFormat = { 
        _type: 'day', 
        day: { date: '$billDate' } 
      };
      break;
    case 'week':
      groupByFormat = { 
        _type: 'week', 
        week: { date: '$billDate' } 
      };
      break;
    case 'month':
      groupByFormat = { 
        _type: 'month', 
        month: { date: '$billDate' } 
      };
      break;
    case 'quarter':
      groupByFormat = { 
        _type: 'quarter', 
        quarter: { date: '$billDate' } 
      };
      break;
    case 'year':
      groupByFormat = { 
        _type: 'year', 
        year: { date: '$billDate' } 
      };
      break;
    default:
      groupByFormat = { 
        _type: 'month', 
        month: { date: '$billDate' } 
      };
  }
  
  // In a real implementation, this would use Prisma's aggregation features
  // For now, we'll simulate the data
  
  // Simulate monthly revenue data
  const months = getMonthsBetweenDates(startDate, endDate);
  const revenueData = months.map(month => {
    return {
      period: month.toISOString().substring(0, 7), // YYYY-MM format
      totalRevenue: Math.floor(Math.random() * 500000) + 100000,
      paidRevenue: Math.floor(Math.random() * 400000) + 50000,
      outstandingRevenue: Math.floor(Math.random() * 200000) + 10000,
    };
  });
  
  return {
    summary: {
      totalRevenue: revenueData.reduce((sum, item) => sum + item.totalRevenue, 0),
      paidRevenue: revenueData.reduce((sum, item) => sum + item.paidRevenue, 0),
      outstandingRevenue: revenueData.reduce((sum, item) => sum + item.outstandingRevenue, 0),
    },
    details: revenueData,
  };
}

// Helper function to generate expenses report
async function generateExpensesReport(startDate: Date, endDate: Date, groupBy: string, departmentId?: string) {
  // Simulate monthly expense data
  const months = getMonthsBetweenDates(startDate, endDate);
  const expenseData = months.map(month => {
    return {
      period: month.toISOString().substring(0, 7), // YYYY-MM format
      totalExpenses: Math.floor(Math.random() * 300000) + 50000,
      categories: {
        salaries: Math.floor(Math.random() * 150000) + 30000,
        supplies: Math.floor(Math.random() * 50000) + 10000,
        equipment: Math.floor(Math.random() * 30000) + 5000,
        utilities: Math.floor(Math.random() * 20000) + 5000,
        other: Math.floor(Math.random() * 10000) + 2000,
      },
    };
  });
  
  return {
    summary: {
      totalExpenses: expenseData.reduce((sum, item) => sum + item.totalExpenses, 0),
      categorySummary: {
        salaries: expenseData.reduce((sum, item) => sum + item.categories.salaries, 0),
        supplies: expenseData.reduce((sum, item) => sum + item.categories.supplies, 0),
        equipment: expenseData.reduce((sum, item) => sum + item.categories.equipment, 0),
        utilities: expenseData.reduce((sum, item) => sum + item.categories.utilities, 0),
        other: expenseData.reduce((sum, item) => sum + item.categories.other, 0),
      },
    },
    details: expenseData,
  };
}

// Helper function to generate profit/loss report
async function generateProfitLossReport(startDate: Date, endDate: Date, groupBy: string) {
  // Get revenue and expense data
  const revenueData = await generateRevenueReport(startDate, endDate, groupBy);
  const expenseData = await generateExpensesReport(startDate, endDate, groupBy);
  
  // Calculate profit/loss
  const profitLossData = {
    summary: {
      totalRevenue: revenueData.summary.totalRevenue,
      totalExpenses: expenseData.summary.totalExpenses,
      netProfit: revenueData.summary.totalRevenue - expenseData.summary.totalExpenses,
      profitMargin: ((revenueData.summary.totalRevenue - expenseData.summary.totalExpenses) / revenueData.summary.totalRevenue * 100).toFixed(2) + '%',
    },
    details: revenueData.details.map((revenue, index) => {
      const expense = expenseData.details[index];
      return {
        period: revenue.period,
        revenue: revenue.totalRevenue,
        expenses: expense.totalExpenses,
        profit: revenue.totalRevenue - expense.totalExpenses,
        profitMargin: ((revenue.totalRevenue - expense.totalExpenses) / revenue.totalRevenue * 100).toFixed(2) + '%',
      };
    }),
  };
  
  return profitLossData;
}

// Helper function to generate accounts receivable report
async function generateAccountsReceivableReport(startDate: Date, endDate: Date) {
  // Simulate accounts receivable aging data
  const agingData = {
    current: Math.floor(Math.random() * 200000) + 50000,
    '1-30': Math.floor(Math.random() * 150000) + 30000,
    '31-60': Math.floor(Math.random() * 100000) + 20000,
    '61-90': Math.floor(Math.random() * 50000) + 10000,
    '91+': Math.floor(Math.random() * 30000) + 5000,
  };
  
  // Simulate top outstanding invoices
  const topOutstandingInvoices = Array.from({ length: 10 }, (_, i) => {
    return {
      invoiceId: `INV-${Math.floor(Math.random() * 10000)}`,
      patientName: `Patient ${i + 1}`,
      amount: Math.floor(Math.random() * 10000) + 1000,
      dueDate: new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      agingDays: Math.floor(Math.random() * 90) + 1,
    };
  }).sort((a, b) => b.amount - a.amount);
  
  return {
    summary: {
      totalReceivables: Object.values(agingData).reduce((sum: any, value) => sum + value, 0),
      agingBuckets: agingData,
    },
    topOutstandingInvoices,
  };
}

// Helper function to generate insurance claims report
async function generateInsuranceClaimsReport(startDate: Date, endDate: Date, insuranceProviderId?: string) {
  const where: any = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };
  
  if (insuranceProviderId) {
    where.insurancePolicy = {
      insuranceProviderId,
    };
  }
  
  // Simulate claims status data
  const claimsStatusData = {
    draft: Math.floor(Math.random() * 50) + 10,
    submitted: Math.floor(Math.random() * 100) + 20,
    in_progress: Math.floor(Math.random() * 80) + 15,
    additional_info_needed: Math.floor(Math.random() * 30) + 5,
    approved: Math.floor(Math.random() * 200) + 50,
    partially_approved: Math.floor(Math.random() * 50) + 10,
    denied: Math.floor(Math.random() * 40) + 5,
    appealed: Math.floor(Math.random() * 20) + 3,
    closed: Math.floor(Math.random() * 150) + 30,
  };
  
  // Calculate totals
  const totalClaims = Object.values(claimsStatusData).reduce((sum: any, value) => sum + value, 0);
  
  // Simulate financial data
  const financialData = {
    totalClaimedAmount: Math.floor(Math.random() * 1000000) + 200000,
    totalApprovedAmount: Math.floor(Math.random() * 800000) + 150000,
    totalDeniedAmount: Math.floor(Math.random() * 200000) + 30000,
    averageProcessingDays: Math.floor(Math.random() * 20) + 5,
  };
  
  // Simulate top insurance providers
  const topProviders = Array.from({ length: 5 }, (_, i) => {
    return {
      providerId: `INS-${i + 1}`,
      providerName: `Insurance Provider ${i + 1}`,
      claimsCount: Math.floor(Math.random() * 100) + 20,
      totalAmount: Math.floor(Math.random() * 200000) + 50000,
      approvedAmount: Math.floor(Math.random() * 150000) + 30000,
      deniedAmount: Math.floor(Math.random() * 50000) + 10000,
      approvalRate: (Math.random() * 30 + 70).toFixed(2) + '%',
    };
  }).sort((a, b) => b.totalAmount - a.totalAmount);
  
  return {
    summary: {
      totalClaims,
      statusBreakdown: claimsStatusData,
      financialSummary: financialData,
    },
    topProviders,
  };
}

// Helper function to generate payment collection report
async function generatePaymentCollectionReport(startDate: Date, endDate: Date, groupBy: string) {
  // Simulate payment method data
  const paymentMethodData = {
    cash: Math.floor(Math.random() * 100000) + 20000,
    check: Math.floor(Math.random() * 50000) + 10000,
    credit_card: Math.floor(Math.random() * 300000) + 50000,
    debit_card: Math.floor(Math.random() * 200000) + 30000,
    bank_transfer: Math.floor(Math.random() * 150000) + 25000,
    online_payment: Math.floor(Math.random() * 250000) + 40000,
    insurance: Math.floor(Math.random() * 500000) + 100000,
    mobile_payment: Math.floor(Math.random() * 80000) + 15000,
  };
  
  // Calculate total
  const totalPayments = Object.values(paymentMethodData).reduce((sum: any, value) => sum + value, 0);
  
  // Simulate monthly payment data
  const months = getMonthsBetweenDates(startDate, endDate);
  const paymentTrendData = months.map(month => {
    return {
      period: month.toISOString().substring(0, 7), // YYYY-MM format
      totalCollected: Math.floor(Math.random() * 200000) + 50000,
      paymentMethods: {
        cash: Math.floor(Math.random() * 20000) + 5000,
        check: Math.floor(Math.random() * 10000) + 2000,
        credit_card: Math.floor(Math.random() * 50000) + 10000,
        debit_card: Math.floor(Math.random() * 40000) + 8000,
        bank_transfer: Math.floor(Math.random() * 30000) + 6000,
        online_payment: Math.floor(Math.random() * 40000) + 8000,
        insurance: Math.floor(Math.random() * 80000) + 15000,
        mobile_payment: Math.floor(Math.random() * 15000) + 3000,
      },
    };
  });
  
  return {
    summary: {
      totalPayments,
      paymentMethodBreakdown: paymentMethodData,
    },
    trends: paymentTrendData,
  };
}

// Helper function to generate department revenue report
async function generateDepartmentRevenueReport(startDate: Date, endDate: Date) {
  // Simulate department revenue data
  const departmentData = [
    {
      departmentId: 'DEPT-1',
      departmentName: 'Outpatient Department',
      totalRevenue: Math.floor(Math.random() * 500000) + 100000,
      paidRevenue: Math.floor(Math.random() * 400000) + 80000,
      outstandingRevenue: Math.floor(Math.random() * 100000) + 20000,
      patientCount: Math.floor(Math.random() * 2000) + 500,
      averageRevenuePerPatient: 0, // Calculated below
    },
    {
      departmentId: 'DEPT-2',
      departmentName: 'Inpatient Department',
      totalRevenue: Math.floor(Math.random() * 800000) + 200000,
      paidRevenue: Math.floor(Math.random() * 600000) + 150000,
      outstandingRevenue: Math.floor(Math.random() * 200000) + 50000,
      patientCount: Math.floor(Math.random() * 1000) + 200,
      averageRevenuePerPatient: 0, // Calculated below
    },
    {
      departmentId: 'DEPT-3',
      departmentName: 'Emergency Department',
      totalRevenue: Math.floor(Math.random() * 400000) + 80000,
      paidRevenue: Math.floor(Math.random() * 300000) + 60000,
      outstandingRevenue: Math.floor(Math.random() * 100000) + 20000,
      patientCount: Math.floor(Math.random() * 1500) + 300,
      averageRevenuePerPatient: 0, // Calculated below
    },
    {
      departmentId: 'DEPT-4',
      departmentName: 'Laboratory',
      totalRevenue: Math.floor(Math.random() * 300000) + 60000,
      paidRevenue: Math.floor(Math.random() * 250000) + 50000,
      outstandingRevenue: Math.floor(Math.random() * 50000) + 10000,
      patientCount: Math.floor(Math.random() * 3000) + 1000,
      averageRevenuePerPatient: 0, // Calculated below
    },
    {
      departmentId: 'DEPT-5',
      departmentName: 'Radiology',
      totalRevenue: Math.floor(Math.random() * 350000) + 70000,
      paidRevenue: Math.floor(Math.random() * 300000) + 60000,
      outstandingRevenue: Math.floor(Math.random() * 50000) + 10000,
      patientCount: Math.floor(Math.random() * 2500) + 800,
      averageRevenuePerPatient: 0, // Calculated below
    },
    {
      departmentId: 'DEPT-6',
      departmentName: 'Pharmacy',
      totalRevenue: Math.floor(Math.random() * 450000) + 90000,
      paidRevenue: Math.floor(Math.random() * 400000) + 80000,
      outstandingRevenue: Math.floor(Math.random() * 50000) + 10000,
      patientCount: Math.floor(Math.random() * 4000) + 1500,
      averageRevenuePerPatient: 0, // Calculated below
    },
  ];
  
  // Calculate average revenue per patient
  departmentData.forEach(dept => {
    dept.averageRevenuePerPatient = Math.round(dept.totalRevenue / dept.patientCount);
  });
  
  // Sort by total revenue
  departmentData.sort((a, b) => b.totalRevenue - a.totalRevenue);
  
  // Calculate totals
  const totalRevenue = departmentData.reduce((sum, dept) => sum + dept.totalRevenue, 0);
  const totalPaidRevenue = departmentData.reduce((sum, dept) => sum + dept.paidRevenue, 0);
  const totalOutstandingRevenue = departmentData.reduce((sum, dept) => sum + dept.outstandingRevenue, 0);
  const totalPatients = departmentData.reduce((sum, dept) => sum + dept.patientCount, 0);
  
  return {
    summary: {
      totalRevenue,
      totalPaidRevenue,
      totalOutstandingRevenue,
      totalPatients,
      averageRevenuePerPatient: Math.round(totalRevenue / totalPatients),
    },
    departmentBreakdown: departmentData,
  };
}

// Helper function to generate service revenue report
async function generateServiceRevenueReport(startDate: Date, endDate: Date) {
  // Simulate service revenue data
  const serviceData = [
    {
      serviceId: 'SVC-1',
      serviceName: 'General Consultation',
      totalRevenue: Math.floor(Math.random() * 200000) + 50000,
      serviceCount: Math.floor(Math.random() * 2000) + 500,
      averageRevenuePerService: 0, // Calculated below
    },
    {
      serviceId: 'SVC-2',
      serviceName: 'Specialist Consultation',
      totalRevenue: Math.floor(Math.random() * 300000) + 80000,
      serviceCount: Math.floor(Math.random() * 1500) + 300,
      averageRevenuePerService: 0, // Calculated below
    },
    {
      serviceId: 'SVC-3',
      serviceName: 'Laboratory Tests',
      totalRevenue: Math.floor(Math.random() * 250000) + 60000,
      serviceCount: Math.floor(Math.random() * 3000) + 1000,
      averageRevenuePerService: 0, // Calculated below
    },
    {
      serviceId: 'SVC-4',
      serviceName: 'X-Ray',
      totalRevenue: Math.floor(Math.random() * 150000) + 40000,
      serviceCount: Math.floor(Math.random() * 1000) + 200,
      averageRevenuePerService: 0, // Calculated below
    },
    {
      serviceId: 'SVC-5',
      serviceName: 'CT Scan',
      totalRevenue: Math.floor(Math.random() * 180000) + 50000,
      serviceCount: Math.floor(Math.random() * 500) + 100,
      averageRevenuePerService: 0, // Calculated below
    },
    {
      serviceId: 'SVC-6',
      serviceName: 'MRI',
      totalRevenue: Math.floor(Math.random() * 220000) + 60000,
      serviceCount: Math.floor(Math.random() * 400) + 80,
      averageRevenuePerService: 0, // Calculated below
    },
    {
      serviceId: 'SVC-7',
      serviceName: 'Surgery - Minor',
      totalRevenue: Math.floor(Math.random() * 280000) + 70000,
      serviceCount: Math.floor(Math.random() * 300) + 50,
      averageRevenuePerService: 0, // Calculated below
    },
    {
      serviceId: 'SVC-8',
      serviceName: 'Surgery - Major',
      totalRevenue: Math.floor(Math.random() * 400000) + 100000,
      serviceCount: Math.floor(Math.random() * 200) + 30,
      averageRevenuePerService: 0, // Calculated below
    },
    {
      serviceId: 'SVC-9',
      serviceName: 'Physiotherapy',
      totalRevenue: Math.floor(Math.random() * 120000) + 30000,
      serviceCount: Math.floor(Math.random() * 1200) + 300,
      averageRevenuePerService: 0, // Calculated below
    },
    {
      serviceId: 'SVC-10',
      serviceName: 'Medications',
      totalRevenue: Math.floor(Math.random() * 350000) + 80000,
      serviceCount: Math.floor(Math.random() * 5000) + 2000,
      averageRevenuePerService: 0, // Calculated below
    },
  ];
  
  // Calculate average revenue per service
  serviceData.forEach(service => {
    service.averageRevenuePerService = Math.round(service.totalRevenue / service.serviceCount);
  });
  
  // Sort by total revenue
  serviceData.sort((a, b) => b.totalRevenue - a.totalRevenue);
  
  // Calculate totals
  const totalRevenue = serviceData.reduce((sum, service) => sum + service.totalRevenue, 0);
  const totalServiceCount = serviceData.reduce((sum, service) => sum + service.serviceCount, 0);
  
  return {
    summary: {
      totalRevenue,
      totalServiceCount,
      averageRevenuePerService: Math.round(totalRevenue / totalServiceCount),
    },
    serviceBreakdown: serviceData,
  };
}

// Helper function to get months between two dates
function getMonthsBetweenDates(startDate: Date, endDate: Date) {
  const months = [];
  const currentDate = new Date(startDate);
  
  // Set to first day of month
  currentDate.setDate(1);
  
  // Loop through months
  while (currentDate <= endDate) {
    months.push(new Date(currentDate));
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  
  return months;
}
