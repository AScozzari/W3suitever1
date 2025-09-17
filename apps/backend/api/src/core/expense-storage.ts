// Expense Management Storage Interface
import { db } from "./db";
import { eq, and, or, between, inArray, gte, lte, desc, isNull, sql } from "drizzle-orm";
import {
  expenseReports,
  expenseItems,
  users,
  tenants,
  ExpenseReport,
  ExpenseItem,
  InsertExpenseReport,
  InsertExpenseItem,
} from "../db/schema";
import { v4 as uuidv4 } from "uuid";

// Expense permissions based on roles
export const EXPENSE_PERMISSIONS = {
  USER: {
    view: ['own'],
    create: ['own'],
    update: ['own'],
    delete: ['own']
  },
  TEAM_LEADER: {
    view: ['own', 'team'],
    create: ['own'],
    update: ['own'],
    delete: ['own'],
    approve: ['team']
  },
  FINANCE: {
    view: ['all'],
    create: ['own'],
    update: ['own', 'finance'],
    delete: ['own'],
    approve: ['all'],
    reimburse: ['all']
  },
  HR_MANAGER: {
    view: ['all'],
    create: ['own'],
    update: ['own'],
    delete: ['own'],
    approve: ['all'],
    setPolicies: true,
    viewAnalytics: true
  },
  ADMIN: {
    view: ['all'],
    create: ['all'],
    update: ['all'],
    delete: ['all'],
    approve: ['all'],
    reimburse: ['all'],
    setPolicies: true,
    viewAnalytics: true
  }
};

export interface ExpenseFilters {
  status?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  userId?: string;
  minAmount?: number;
  maxAmount?: number;
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

export interface IExpenseStorage {
  // Expense Reports
  getExpenseReports(
    tenantId: string,
    userId: string,
    userRole: string,
    filters?: ExpenseFilters
  ): Promise<ExpenseReport[]>;
  
  getExpenseReportById(id: string, tenantId: string): Promise<ExpenseReport | null>;
  
  createExpenseReport(data: InsertExpenseReport): Promise<ExpenseReport>;
  
  updateExpenseReport(
    id: string,
    data: Partial<InsertExpenseReport>,
    tenantId: string
  ): Promise<ExpenseReport>;
  
  deleteExpenseReport(id: string, tenantId: string): Promise<void>;
  
  submitExpenseReport(id: string, tenantId: string): Promise<ExpenseReport>;
  
  approveExpenseReport(
    id: string,
    approverId: string,
    comments?: string,
    tenantId?: string
  ): Promise<ExpenseReport>;
  
  rejectExpenseReport(
    id: string,
    approverId: string,
    reason: string,
    tenantId?: string
  ): Promise<ExpenseReport>;
  
  reimburseExpenseReport(
    id: string,
    processedBy: string,
    paymentMethod: string,
    tenantId?: string
  ): Promise<ExpenseReport>;
  
  // Expense Items
  getExpenseItems(reportId: string): Promise<ExpenseItem[]>;
  
  createExpenseItem(data: InsertExpenseItem): Promise<ExpenseItem>;
  
  updateExpenseItem(
    id: string,
    data: Partial<InsertExpenseItem>
  ): Promise<ExpenseItem>;
  
  deleteExpenseItem(id: string): Promise<void>;
  
  // Analytics
  getExpenseAnalytics(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ExpenseAnalytics>;
  
  getExpensesByCategory(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{ category: string; amount: number; count: number }>>;
  
  // Policies
  getExpensePolicy(tenantId: string): Promise<ExpensePolicy>;
  
  updateExpensePolicy(
    tenantId: string,
    policy: Partial<ExpensePolicy>
  ): Promise<ExpensePolicy>;
  
  // Receipt OCR (mock)
  scanReceipt(imageData: string): Promise<{
    vendor: string;
    date: Date;
    total: number;
    vat: number;
    category: string;
    confidence: number;
  }>;
}

// Implementation
export class ExpenseStorage implements IExpenseStorage {
  // Generate unique report number
  private async generateReportNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    // Get count of reports for this month
    const count = await db
      .select({ count: sql<number>`count(*)` })
      .from(expenseReports)
      .where(
        and(
          eq(expenseReports.tenantId, tenantId),
          sql`DATE_PART('year', ${expenseReports.createdAt}) = ${year}`,
          sql`DATE_PART('month', ${expenseReports.createdAt}) = ${month}`
        )
      );
    
    const reportCount = Number(count[0]?.count || 0) + 1;
    return `EXP-${year}${month}-${String(reportCount).padStart(4, '0')}`;
  }
  
  // Expense Reports
  async getExpenseReports(
    tenantId: string,
    userId: string,
    userRole: string,
    filters?: ExpenseFilters
  ): Promise<ExpenseReport[]> {
    const conditions = [eq(expenseReports.tenantId, tenantId)];
    
    // Apply role-based filtering
    const permissions = EXPENSE_PERMISSIONS[userRole as keyof typeof EXPENSE_PERMISSIONS] || EXPENSE_PERMISSIONS.USER;
    
    if (!permissions.view.includes('all')) {
      if (permissions.view.includes('own')) {
        conditions.push(eq(expenseReports.userId, userId));
      }
      // TODO: Add team filtering logic when team structure is implemented
    }
    
    // Apply filters
    if (filters?.status) {
      conditions.push(eq(expenseReports.status, filters.status as any));
    }
    
    if (filters?.startDate && filters?.endDate) {
      conditions.push(
        between(expenseReports.createdAt, filters.startDate, filters.endDate)
      );
    }
    
    if (filters?.minAmount) {
      conditions.push(gte(expenseReports.totalAmount, filters.minAmount * 100));
    }
    
    if (filters?.maxAmount) {
      conditions.push(lte(expenseReports.totalAmount, filters.maxAmount * 100));
    }
    
    const reports = await db
      .select()
      .from(expenseReports)
      .where(and(...conditions))
      .orderBy(desc(expenseReports.createdAt));
    
    return reports;
  }
  
  async getExpenseReportById(id: string, tenantId: string): Promise<ExpenseReport | null> {
    const report = await db
      .select()
      .from(expenseReports)
      .where(
        and(
          eq(expenseReports.id, id),
          eq(expenseReports.tenantId, tenantId)
        )
      )
      .limit(1);
    
    return report[0] || null;
  }
  
  async createExpenseReport(data: InsertExpenseReport): Promise<ExpenseReport> {
    const reportNumber = await this.generateReportNumber(data.tenantId);
    
    const report = await db
      .insert(expenseReports)
      .values({
        ...data,
        reportNumber,
        status: 'draft',
        totalAmount: 0
      })
      .returning();
    
    return report[0];
  }
  
  async updateExpenseReport(
    id: string,
    data: Partial<InsertExpenseReport>,
    tenantId: string
  ): Promise<ExpenseReport> {
    const report = await db
      .update(expenseReports)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(expenseReports.id, id),
          eq(expenseReports.tenantId, tenantId)
        )
      )
      .returning();
    
    if (!report[0]) {
      throw new Error('Expense report not found');
    }
    
    return report[0];
  }
  
  async deleteExpenseReport(id: string, tenantId: string): Promise<void> {
    await db
      .delete(expenseReports)
      .where(
        and(
          eq(expenseReports.id, id),
          eq(expenseReports.tenantId, tenantId),
          eq(expenseReports.status, 'draft')
        )
      );
  }
  
  async submitExpenseReport(id: string, tenantId: string): Promise<ExpenseReport> {
    const report = await db
      .update(expenseReports)
      .set({
        status: 'submitted',
        submittedAt: new Date(),
        updatedAt: new Date()
      })
      .where(
        and(
          eq(expenseReports.id, id),
          eq(expenseReports.tenantId, tenantId),
          eq(expenseReports.status, 'draft')
        )
      )
      .returning();
    
    if (!report[0]) {
      throw new Error('Expense report not found or already submitted');
    }
    
    return report[0];
  }
  
  async approveExpenseReport(
    id: string,
    approverId: string,
    comments?: string,
    tenantId?: string
  ): Promise<ExpenseReport> {
    const conditions = [eq(expenseReports.id, id), eq(expenseReports.status, 'submitted')];
    if (tenantId) {
      conditions.push(eq(expenseReports.tenantId, tenantId));
    }
    
    const report = await db
      .update(expenseReports)
      .set({
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: approverId,
        notes: comments,
        updatedAt: new Date()
      })
      .where(and(...conditions))
      .returning();
    
    if (!report[0]) {
      throw new Error('Expense report not found or not in submitted status');
    }
    
    return report[0];
  }
  
  async rejectExpenseReport(
    id: string,
    approverId: string,
    reason: string,
    tenantId?: string
  ): Promise<ExpenseReport> {
    const conditions = [eq(expenseReports.id, id), eq(expenseReports.status, 'submitted')];
    if (tenantId) {
      conditions.push(eq(expenseReports.tenantId, tenantId));
    }
    
    const report = await db
      .update(expenseReports)
      .set({
        status: 'rejected',
        approvedBy: approverId,
        rejectionReason: reason,
        updatedAt: new Date()
      })
      .where(and(...conditions))
      .returning();
    
    if (!report[0]) {
      throw new Error('Expense report not found or not in submitted status');
    }
    
    return report[0];
  }
  
  async reimburseExpenseReport(
    id: string,
    processedBy: string,
    paymentMethod: string,
    tenantId?: string
  ): Promise<ExpenseReport> {
    const conditions = [eq(expenseReports.id, id), eq(expenseReports.status, 'approved')];
    if (tenantId) {
      conditions.push(eq(expenseReports.tenantId, tenantId));
    }
    
    const report = await db
      .update(expenseReports)
      .set({
        status: 'reimbursed',
        reimbursedAt: new Date(),
        paymentMethod: paymentMethod as any,
        updatedAt: new Date()
      })
      .where(and(...conditions))
      .returning();
    
    if (!report[0]) {
      throw new Error('Expense report not found or not in approved status');
    }
    
    return report[0];
  }
  
  // Expense Items
  async getExpenseItems(reportId: string): Promise<ExpenseItem[]> {
    const items = await db
      .select()
      .from(expenseItems)
      .where(eq(expenseItems.expenseReportId, reportId))
      .orderBy(desc(expenseItems.date));
    
    return items;
  }
  
  async createExpenseItem(data: InsertExpenseItem): Promise<ExpenseItem> {
    const item = await db
      .insert(expenseItems)
      .values(data)
      .returning();
    
    // Update report total
    await this.updateReportTotal(data.expenseReportId!);
    
    return item[0];
  }
  
  async updateExpenseItem(
    id: string,
    data: Partial<InsertExpenseItem>
  ): Promise<ExpenseItem> {
    const item = await db
      .update(expenseItems)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(expenseItems.id, id))
      .returning();
    
    if (!item[0]) {
      throw new Error('Expense item not found');
    }
    
    // Update report total
    await this.updateReportTotal(item[0].expenseReportId);
    
    return item[0];
  }
  
  async deleteExpenseItem(id: string): Promise<void> {
    const item = await db
      .select()
      .from(expenseItems)
      .where(eq(expenseItems.id, id))
      .limit(1);
    
    if (item[0]) {
      await db.delete(expenseItems).where(eq(expenseItems.id, id));
      await this.updateReportTotal(item[0].expenseReportId);
    }
  }
  
  private async updateReportTotal(reportId: string): Promise<void> {
    const items = await db
      .select({
        total: sql<number>`COALESCE(SUM(${expenseItems.amount}), 0)`
      })
      .from(expenseItems)
      .where(eq(expenseItems.expenseReportId, reportId));
    
    await db
      .update(expenseReports)
      .set({
        totalAmount: Number(items[0]?.total || 0),
        updatedAt: new Date()
      })
      .where(eq(expenseReports.id, reportId));
  }
  
  // Analytics
  async getExpenseAnalytics(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ExpenseAnalytics> {
    const dateConditions = [];
    if (startDate && endDate) {
      dateConditions.push(between(expenseReports.createdAt, startDate, endDate));
    }
    
    // Get summary stats
    const stats = await db
      .select({
        totalExpenses: sql<number>`COALESCE(SUM(${expenseReports.totalAmount}), 0)`,
        pendingApproval: sql<number>`COUNT(*) FILTER (WHERE ${expenseReports.status} = 'submitted')`,
        totalReimbursed: sql<number>`COALESCE(SUM(${expenseReports.totalAmount}) FILTER (WHERE ${expenseReports.status} = 'reimbursed'), 0)`,
        reportCount: sql<number>`COUNT(*)`
      })
      .from(expenseReports)
      .where(and(eq(expenseReports.tenantId, tenantId), ...dateConditions));
    
    // Get category breakdown
    const categories = await this.getExpensesByCategory(tenantId, startDate, endDate);
    
    // Get monthly trend
    const monthlyTrend = await db
      .select({
        month: sql<string>`TO_CHAR(${expenseReports.createdAt}, 'YYYY-MM')`,
        amount: sql<number>`COALESCE(SUM(${expenseReports.totalAmount}), 0)`,
        count: sql<number>`COUNT(*)`
      })
      .from(expenseReports)
      .where(and(eq(expenseReports.tenantId, tenantId), ...dateConditions))
      .groupBy(sql`TO_CHAR(${expenseReports.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${expenseReports.createdAt}, 'YYYY-MM')`);
    
    const totalExpenses = Number(stats[0]?.totalExpenses || 0);
    const reportCount = Number(stats[0]?.reportCount || 0);
    
    return {
      totalExpenses: totalExpenses / 100, // Convert from cents
      pendingApproval: Number(stats[0]?.pendingApproval || 0),
      totalReimbursed: Number(stats[0]?.totalReimbursed || 0) / 100,
      averagePerReport: reportCount > 0 ? totalExpenses / reportCount / 100 : 0,
      topCategories: categories.slice(0, 5),
      monthlyTrend: monthlyTrend.map(m => ({
        month: m.month,
        amount: Number(m.amount) / 100,
        count: Number(m.count)
      })),
      complianceRate: 0.85 // Mock compliance rate
    };
  }
  
  async getExpensesByCategory(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{ category: string; amount: number; count: number }>> {
    const dateConditions = [];
    if (startDate && endDate) {
      dateConditions.push(between(expenseReports.createdAt, startDate, endDate));
    }
    
    const categories = await db
      .select({
        category: expenseItems.category,
        amount: sql<number>`COALESCE(SUM(${expenseItems.amount}), 0)`,
        count: sql<number>`COUNT(*)`
      })
      .from(expenseItems)
      .innerJoin(expenseReports, eq(expenseItems.expenseReportId, expenseReports.id))
      .where(and(eq(expenseReports.tenantId, tenantId), ...dateConditions))
      .groupBy(expenseItems.category)
      .orderBy(sql`SUM(${expenseItems.amount}) DESC`);
    
    return categories.map(c => ({
      category: c.category,
      amount: Number(c.amount) / 100,
      count: Number(c.count)
    }));
  }
  
  // Policies
  async getExpensePolicy(tenantId: string): Promise<ExpensePolicy> {
    // Mock policy - in production, this would be stored in database
    return {
      categoryLimits: {
        travel: 500,
        meal: 100,
        accommodation: 200,
        transport: 50,
        supplies: 100,
        training: 1000,
        marketing: 500,
        other: 100
      },
      approvalThresholds: [
        { amount: 100, approver: 'team_leader' },
        { amount: 500, approver: 'manager' },
        { amount: 1000, approver: 'finance' },
        { amount: 5000, approver: 'ceo' }
      ],
      receiptRequired: 25,
      submitDeadlineDays: 30,
      allowedCategories: ['travel', 'meal', 'accommodation', 'transport', 'supplies', 'training', 'marketing', 'other'],
      mileageRate: 0.58,
      perDiemRate: 50
    };
  }
  
  async updateExpensePolicy(
    tenantId: string,
    policy: Partial<ExpensePolicy>
  ): Promise<ExpensePolicy> {
    // Mock implementation - in production, this would update database
    const currentPolicy = await this.getExpensePolicy(tenantId);
    return { ...currentPolicy, ...policy };
  }
  
  // Receipt OCR (mock)
  async scanReceipt(imageData: string): Promise<{
    vendor: string;
    date: Date;
    total: number;
    vat: number;
    category: string;
    confidence: number;
  }> {
    // Mock OCR response
    const categories = ['meal', 'transport', 'supplies', 'accommodation', 'travel'];
    const vendors = ['Ristorante Roma', 'Hotel Milano', 'Taxi Service', 'Office Supplies Co.', 'Airlines Italia'];
    
    return {
      vendor: vendors[Math.floor(Math.random() * vendors.length)],
      date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      total: Math.round(Math.random() * 200 * 100) / 100,
      vat: Math.round(Math.random() * 40 * 100) / 100,
      category: categories[Math.floor(Math.random() * categories.length)],
      confidence: Math.round(Math.random() * 15 + 85) / 100
    };
  }
}

export const expenseStorage = new ExpenseStorage();