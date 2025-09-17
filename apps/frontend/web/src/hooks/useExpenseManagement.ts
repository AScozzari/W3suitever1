// Expense Management Hooks
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { expenseService, ExpenseReport, ExpenseItem, ExpenseAnalytics, ExpensePolicy } from '@/services/expenseService';

// Hook for managing expense reports
export const useExpenseReports = (filters?: any) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: reports = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['expenseReports', filters],
    queryFn: () => expenseService.getExpenseReports(filters),
    staleTime: 5 * 60 * 1000
  });

  const createReport = useMutation({
    mutationFn: (data: Partial<ExpenseReport>) => expenseService.createExpenseReport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseReports'] });
      toast({
        title: 'Successo',
        description: 'Nota spese creata con successo'
      });
    },
    onError: () => {
      toast({
        title: 'Errore',
        description: 'Impossibile creare la nota spese',
        variant: 'destructive'
      });
    }
  });

  const updateReport = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ExpenseReport> }) => 
      expenseService.updateExpenseReport(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseReports'] });
      toast({
        title: 'Successo',
        description: 'Nota spese aggiornata'
      });
    }
  });

  const deleteReport = useMutation({
    mutationFn: (id: string) => expenseService.deleteExpenseReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseReports'] });
      toast({
        title: 'Successo',
        description: 'Nota spese eliminata'
      });
    }
  });

  const submitReport = useMutation({
    mutationFn: (id: string) => expenseService.submitExpenseReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseReports'] });
      toast({
        title: 'Successo',
        description: 'Nota spese inviata per approvazione'
      });
    }
  });

  const summary = useMemo(() => {
    if (!reports.length) return null;
    return expenseService.generateExpenseSummary(reports);
  }, [reports]);

  return {
    reports,
    isLoading,
    error,
    refetch,
    createReport,
    updateReport,
    deleteReport,
    submitReport,
    summary
  };
};

// Hook for managing expense items
export const useExpenseItems = (reportId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: items = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['expenseItems', reportId],
    queryFn: () => expenseService.getExpenseItems(reportId),
    enabled: !!reportId
  });

  const createItem = useMutation({
    mutationFn: (data: Partial<ExpenseItem>) => expenseService.createExpenseItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseItems', reportId] });
      queryClient.invalidateQueries({ queryKey: ['expenseReports'] });
      toast({
        title: 'Successo',
        description: 'Voce spesa aggiunta'
      });
    }
  });

  const updateItem = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ExpenseItem> }) =>
      expenseService.updateExpenseItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseItems', reportId] });
      queryClient.invalidateQueries({ queryKey: ['expenseReports'] });
      toast({
        title: 'Successo',
        description: 'Voce spesa aggiornata'
      });
    }
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) => expenseService.deleteExpenseItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseItems', reportId] });
      queryClient.invalidateQueries({ queryKey: ['expenseReports'] });
      toast({
        title: 'Successo',
        description: 'Voce spesa eliminata'
      });
    }
  });

  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  }, [items]);

  const byCategory = useMemo(() => {
    return items.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = { amount: 0, count: 0, items: [] };
      }
      acc[item.category].amount += item.amount;
      acc[item.category].count += 1;
      acc[item.category].items.push(item);
      return acc;
    }, {} as Record<string, { amount: number; count: number; items: ExpenseItem[] }>);
  }, [items]);

  return {
    items,
    isLoading,
    error,
    refetch,
    createItem,
    updateItem,
    deleteItem,
    total,
    byCategory
  };
};

// Hook for expense approvals
export const useExpenseApprovals = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: pendingApprovals = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['expenseApprovals'],
    queryFn: () => expenseService.getExpenseReports({ status: 'submitted' }),
    staleTime: 2 * 60 * 1000
  });

  const approveReport = useMutation({
    mutationFn: ({ id, comments }: { id: string; comments?: string }) =>
      expenseService.approveExpenseReport(id, comments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseApprovals'] });
      queryClient.invalidateQueries({ queryKey: ['expenseReports'] });
      toast({
        title: 'Successo',
        description: 'Nota spese approvata'
      });
    }
  });

  const rejectReport = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      expenseService.rejectExpenseReport(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseApprovals'] });
      queryClient.invalidateQueries({ queryKey: ['expenseReports'] });
      toast({
        title: 'Successo',
        description: 'Nota spese rifiutata'
      });
    }
  });

  const reimburseReport = useMutation({
    mutationFn: ({ id, paymentMethod }: { id: string; paymentMethod: string }) =>
      expenseService.reimburseExpenseReport(id, paymentMethod),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseApprovals'] });
      queryClient.invalidateQueries({ queryKey: ['expenseReports'] });
      toast({
        title: 'Successo',
        description: 'Rimborso processato'
      });
    }
  });

  const batchApprove = useCallback(async (reportIds: string[], comments?: string) => {
    const results = await Promise.allSettled(
      reportIds.map(id => expenseService.approveExpenseReport(id, comments))
    );
    
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    if (succeeded > 0) {
      queryClient.invalidateQueries({ queryKey: ['expenseApprovals'] });
      queryClient.invalidateQueries({ queryKey: ['expenseReports'] });
      toast({
        title: 'Successo',
        description: `${succeeded} note spese approvate${failed > 0 ? `, ${failed} fallite` : ''}`
      });
    }
    
    return results;
  }, [queryClient]);

  return {
    pendingApprovals,
    isLoading,
    error,
    refetch,
    approveReport,
    rejectReport,
    reimburseReport,
    batchApprove
  };
};

// Hook for expense analytics
export const useExpenseAnalytics = (startDate?: Date, endDate?: Date) => {
  const {
    data: analytics,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['expenseAnalytics', startDate, endDate],
    queryFn: () => expenseService.getExpenseAnalytics(startDate, endDate),
    staleTime: 10 * 60 * 1000
  });

  const {
    data: categories,
    isLoading: categoriesLoading
  } = useQuery({
    queryKey: ['expenseCategories', startDate, endDate],
    queryFn: () => expenseService.getExpensesByCategory(startDate, endDate),
    staleTime: 10 * 60 * 1000
  });

  return {
    analytics,
    categories,
    isLoading: isLoading || categoriesLoading,
    error,
    refetch
  };
};

// Hook for expense policies
export const useExpensePolicy = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: policy,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['expensePolicy'],
    queryFn: () => expenseService.getExpensePolicy(),
    staleTime: 30 * 60 * 1000
  });

  const updatePolicy = useMutation({
    mutationFn: (data: Partial<ExpensePolicy>) => expenseService.updateExpensePolicy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expensePolicy'] });
      toast({
        title: 'Successo',
        description: 'Policy spese aggiornate'
      });
    }
  });

  const checkViolations = useCallback((items: ExpenseItem[]) => {
    if (!policy) return [];
    return expenseService.checkPolicyViolations(items, policy);
  }, [policy]);

  return {
    policy,
    isLoading,
    error,
    refetch,
    updatePolicy,
    checkViolations
  };
};

// Hook for receipt scanning
export const useReceiptScanner = () => {
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);

  const scanReceipt = useCallback(async (imageData: string) => {
    setScanning(true);
    setError(null);
    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      const result = await expenseService.scanReceipt(imageData);
      setScanResult(result);
      return result;
    } catch (err) {
      setError(err);
      toast({
        title: 'Errore',
        description: 'Scansione scontrino fallita',
        variant: 'destructive'
      });
      throw err;
    } finally {
      setScanning(false);
    }
  }, []);

  const uploadReceipt = useMutation({
    mutationFn: ({ file, reportId }: { file: File; reportId: string }) =>
      expenseService.uploadReceipt(file, reportId),
    onSuccess: () => {
      toast({
        title: 'Successo',
        description: 'Scontrino caricato'
      });
    }
  });

  const clearScanResult = useCallback(() => {
    setScanResult(null);
    setError(null);
  }, []);

  return {
    scanning,
    scanResult,
    error,
    scanReceipt,
    uploadReceipt,
    clearScanResult
  };
};

// Hook for expense report details
export const useExpenseReport = (id: string) => {
  const {
    data: report,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['expenseReport', id],
    queryFn: () => expenseService.getExpenseReport(id),
    enabled: !!id
  });

  const { items, total, byCategory } = useExpenseItems(id);

  return {
    report,
    items,
    total,
    byCategory,
    isLoading,
    error,
    refetch
  };
};

// Hook for expense stats
export const useExpenseStats = () => {
  const { reports } = useExpenseReports();
  const { analytics } = useExpenseAnalytics();

  const stats = useMemo(() => {
    if (!reports.length) {
      return {
        totalPending: 0,
        totalApproved: 0,
        totalReimbursed: 0,
        totalThisMonth: 0,
        totalThisYear: 0,
        averageProcessingTime: 0
      };
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const pending = reports
      .filter(r => r.status === 'submitted')
      .reduce((sum, r) => sum + r.totalAmount, 0);

    const approved = reports
      .filter(r => r.status === 'approved')
      .reduce((sum, r) => sum + r.totalAmount, 0);

    const reimbursed = reports
      .filter(r => r.status === 'reimbursed')
      .reduce((sum, r) => sum + r.totalAmount, 0);

    const thisMonth = reports
      .filter(r => {
        const date = new Date(r.createdAt);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      })
      .reduce((sum, r) => sum + r.totalAmount, 0);

    const thisYear = reports
      .filter(r => new Date(r.createdAt).getFullYear() === currentYear)
      .reduce((sum, r) => sum + r.totalAmount, 0);

    // Calculate average processing time (in days)
    const processedReports = reports.filter(r => r.status === 'approved' || r.status === 'reimbursed');
    const averageProcessingTime = processedReports.length > 0
      ? processedReports.reduce((sum, r) => {
          if (r.approvedAt) {
            const submitted = new Date(r.submittedAt || r.createdAt);
            const approved = new Date(r.approvedAt);
            const days = Math.floor((approved.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24));
            return sum + days;
          }
          return sum;
        }, 0) / processedReports.length
      : 0;

    return {
      totalPending: pending,
      totalApproved: approved,
      totalReimbursed: reimbursed,
      totalThisMonth: thisMonth,
      totalThisYear: thisYear,
      averageProcessingTime: Math.round(averageProcessingTime)
    };
  }, [reports]);

  return {
    stats,
    analytics
  };
};