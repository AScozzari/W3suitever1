// Expense Management Service
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

export interface ExpenseReport {
  id: string;
  reportNumber: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  tenantId: string;
  title: string;
  description?: string;
  periodStart: Date | string;
  periodEnd: Date | string;
  startDate?: Date | string;
  endDate?: Date | string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'reimbursed';
  totalAmount: number;
  currency: string;
  submittedAt?: Date | string;
  approvedAt?: Date | string;
  approvedBy?: string;
  rejectionReason?: string;
  reimbursedAt?: Date | string;
  paymentMethod?: 'bank_transfer' | 'cash' | 'company_card';
  notes?: string;
  itemsCount?: number;
  categories?: Array<{ name: string; amount: number }>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ExpenseItem {
  id: string;
  expenseReportId: string;
  category: string;
  description: string;
  amount: number;
  vat?: number;
  date: Date | string;
  vendor?: string;
  receiptUrl?: string;
  projectCode?: string;
  clientCode?: string;
  isReimbursable: boolean;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ExpenseAnalytics {
  totalExpenses: number;
  pendingApproval: number;
  totalReimbursed: number;
  averagePerReport: number;
  topCategories: Array<{ category: string; amount: number; count: number }>;
  monthlyTrend: Array<{ month: string; amount: number; count: number }>;
  complianceRate: number;
}

export interface ExpensePolicy {
  categoryLimits: Record<string, number>;
  approvalThresholds: Array<{ amount: number; approver: string }>;
  receiptRequired: number;
  submitDeadlineDays: number;
  allowedCategories: string[];
  mileageRate: number;
  perDiemRate: number;
}

export interface ExpenseFilters {
  status?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  userId?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface OCRResult {
  vendor: string;
  date: Date;
  total: number;
  vat: number;
  category: string;
  confidence: number;
}

class ExpenseService {
  // Expense Reports
  async getExpenseReports(filters?: ExpenseFilters): Promise<ExpenseReport[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    
    return apiGet(`/api/hr/expenses/reports?${params.toString()}`);
  }

  async getExpenseReport(id: string): Promise<ExpenseReport> {
    return apiGet(`/api/hr/expenses/reports/${id}`);
  }

  async createExpenseReport(data: Partial<ExpenseReport>): Promise<ExpenseReport> {
    return apiPost('/api/hr/expenses/reports', data);
  }

  async updateExpenseReport(id: string, data: Partial<ExpenseReport>): Promise<ExpenseReport> {
    return apiPut(`/api/hr/expenses/reports/${id}`, data);
  }

  async deleteExpenseReport(id: string): Promise<void> {
    await apiDelete(`/api/hr/expenses/reports/${id}`);
  }

  async submitExpenseReport(id: string): Promise<ExpenseReport> {
    return apiPost(`/api/hr/expenses/reports/${id}/submit`);
  }

  async approveExpenseReport(id: string, comments?: string): Promise<ExpenseReport> {
    return apiPost(`/api/hr/expenses/reports/${id}/approve`, { comments });
  }

  async rejectExpenseReport(id: string, reason: string): Promise<ExpenseReport> {
    return apiPost(`/api/hr/expenses/reports/${id}/reject`, { reason });
  }

  async reimburseExpenseReport(id: string, paymentMethod: string): Promise<ExpenseReport> {
    return apiPost(`/api/hr/expenses/reports/${id}/reimburse`, { paymentMethod });
  }

  // Expense Items
  async getExpenseItems(reportId: string): Promise<ExpenseItem[]> {
    return apiGet(`/api/hr/expenses/reports/${reportId}/items`);
  }

  async createExpenseItem(data: Partial<ExpenseItem>): Promise<ExpenseItem> {
    return apiPost('/api/hr/expenses/items', data);
  }

  async updateExpenseItem(id: string, data: Partial<ExpenseItem>): Promise<ExpenseItem> {
    return apiPut(`/api/hr/expenses/items/${id}`, data);
  }

  async deleteExpenseItem(id: string): Promise<void> {
    await apiDelete(`/api/hr/expenses/items/${id}`);
  }

  // Analytics
  async getExpenseAnalytics(startDate?: Date, endDate?: Date): Promise<ExpenseAnalytics> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());
    
    return apiGet(`/api/hr/expenses/analytics?${params.toString()}`);
  }

  async getExpensesByCategory(startDate?: Date, endDate?: Date): Promise<Array<{ category: string; amount: number; count: number }>> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());
    
    return apiGet(`/api/hr/expenses/categories?${params.toString()}`);
  }

  // Policies
  async getExpensePolicy(): Promise<ExpensePolicy> {
    return apiGet('/api/hr/expenses/policy');
  }

  async updateExpensePolicy(policy: Partial<ExpensePolicy>): Promise<ExpensePolicy> {
    return apiPut('/api/hr/expenses/policy', policy);
  }

  // Receipt Scanning (Mock)
  async scanReceipt(imageData: string): Promise<OCRResult> {
    return apiPost('/api/hr/expenses/receipts/scan', { imageData });
  }

  // Receipt Upload
  async uploadReceipt(file: File, reportId: string): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('reportId', reportId);
    
    const response = await fetch('/api/hr/expenses/receipts/upload', {
      method: 'POST',
      body: formData
    });
    if (!response.ok) throw new Error('Failed to upload receipt');
    return response.json();
  }

  // Helper: Format currency
  formatCurrency(amount: number, currency: string = 'EUR'): string {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency
    }).format(amount);
  }

  // Helper: Get status color
  getStatusColor(status: ExpenseReport['status']): string {
    const colors = {
      draft: 'gray',
      submitted: 'orange',
      approved: 'green',
      rejected: 'red',
      reimbursed: 'blue'
    };
    return colors[status] || 'gray';
  }

  // Helper: Get category icon
  getCategoryIcon(category: string): string {
    const icons = {
      travel: '✈️',
      meal: '🍽️',
      accommodation: '🏨',
      transport: '🚗',
      supplies: '📦',
      training: '📚',
      marketing: '📢',
      other: '📝'
    };
    return icons[category.toLowerCase()] || '📝';
  }

  // Helper: Calculate VAT
  calculateVAT(amount: number, vatRate: number = 0.22): { net: number; vat: number; gross: number } {
    const gross = amount;
    const net = gross / (1 + vatRate);
    const vat = gross - net;
    
    return {
      net: Math.round(net * 100) / 100,
      vat: Math.round(vat * 100) / 100,
      gross: Math.round(gross * 100) / 100
    };
  }

  // Helper: Check policy violations
  checkPolicyViolations(
    items: ExpenseItem[],
    policy: ExpensePolicy
  ): Array<{ item: ExpenseItem; violation: string }> {
    const violations: Array<{ item: ExpenseItem; violation: string }> = [];
    
    items.forEach(item => {
      // Check category limits
      const limit = policy.categoryLimits[item.category];
      if (limit && item.amount > limit) {
        violations.push({
          item,
          violation: `Importo supera limite di ${this.formatCurrency(limit)} per categoria ${item.category}`
        });
      }
      
      // Check receipt requirement
      if (item.amount >= policy.receiptRequired && !item.receiptUrl) {
        violations.push({
          item,
          violation: `Scontrino richiesto per spese sopra ${this.formatCurrency(policy.receiptRequired)}`
        });
      }
      
      // Check allowed categories
      if (!policy.allowedCategories.includes(item.category)) {
        violations.push({
          item,
          violation: `Categoria ${item.category} non permessa`
        });
      }
    });
    
    return violations;
  }

  // Helper: Generate expense summary
  generateExpenseSummary(reports: ExpenseReport[]): {
    total: number;
    byStatus: Record<string, number>;
    byMonth: Array<{ month: string; amount: number }>;
  } {
    const total = reports.reduce((sum, report) => sum + report.totalAmount, 0);
    
    const byStatus = reports.reduce((acc, report) => {
      acc[report.status] = (acc[report.status] || 0) + report.totalAmount;
      return acc;
    }, {} as Record<string, number>);
    
    const byMonth = reports.reduce((acc, report) => {
      const month = new Date(report.createdAt).toLocaleString('it-IT', { month: 'long', year: 'numeric' });
      const existing = acc.find(m => m.month === month);
      if (existing) {
        existing.amount += report.totalAmount;
      } else {
        acc.push({ month, amount: report.totalAmount });
      }
      return acc;
    }, [] as Array<{ month: string; amount: number }>);
    
    return { total, byStatus, byMonth };
  }
}

export const expenseService = new ExpenseService();