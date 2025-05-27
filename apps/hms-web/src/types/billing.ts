import { BillingStatus, InvoiceStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

// Billing Types
export interface BillingItem {
  id: string;
  name: string;
  code: string;
  description?: string;
  category: string;
  price: number;
  taxRate: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  patientId: string;
  patientName: string;
  doctorId?: string;
  doctorName?: string;
  issueDate: Date;
  dueDate: Date;
  status: InvoiceStatus;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  notes?: string;
  items: InvoiceItem[];
  payments: Payment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  invoiceId: string;
  patientId: string;
  patientName: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  notes?: string;
  receivedBy: string;
  receivedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingDashboardStats {
  totalRevenue: number;
  pendingAmount: number;
  overdueAmount: number;
  recentInvoices: Invoice[];
  recentPayments: Payment[];
  revenueTrend: {
    period: string;
    amount: number;
  }[];
}

export interface BillingSearchParams {
  query?: string;
  status?: BillingStatus;
  startDate?: Date;
  endDate?: Date;
  patientId?: string;
  doctorId?: string;
  page?: number;
  limit?: number;
}
