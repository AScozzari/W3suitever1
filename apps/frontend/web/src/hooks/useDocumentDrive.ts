import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { documentService, HRDocument, DocumentSearchParams } from '../services/documentService';
import { useToast } from './use-toast';

// Main hook for document management
export function useDocumentDrive(searchQuery?: string, filters?: DocumentSearchParams) {
  const { toast } = useToast();
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());

  // Fetch documents
  const { data: documents = [], isLoading, error, refetch } = useQuery({
    queryKey: ['/api/hr/documents', searchQuery, filters],
    queryFn: async () => {
      if (searchQuery) {
        return documentService.searchDocuments(searchQuery, filters);
      }
      return documentService.getDocuments(filters);
    }
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/hr/documents/categories'],
    queryFn: () => documentService.getCategories()
  });

  // Fetch storage usage
  const { data: storageUsage = { used: 0, total: 1073741824, percentage: 0 } } = useQuery({
    queryKey: ['/api/hr/documents/storage-quota'],
    queryFn: () => documentService.getStorageQuota()
  });

  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: documentService.deleteDocument,
    onSuccess: () => {
      toast({
        title: 'Documento eliminato',
        description: 'Il documento è stato eliminato con successo'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/documents'] });
    },
    onError: () => {
      toast({
        title: 'Errore',
        description: 'Impossibile eliminare il documento',
        variant: 'destructive'
      });
    }
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: documentService.bulkDelete,
    onSuccess: () => {
      toast({
        title: 'Documenti eliminati',
        description: 'I documenti selezionati sono stati eliminati'
      });
      setSelectedDocuments(new Set());
      queryClient.invalidateQueries({ queryKey: ['/api/hr/documents'] });
    }
  });

  // Share document mutation
  const shareMutation = useMutation({
    mutationFn: documentService.shareDocument,
    onSuccess: () => {
      toast({
        title: 'Link condivisione creato',
        description: 'Il link è stato copiato negli appunti'
      });
    }
  });

  // Utility functions
  const deleteDocument = useCallback(async (id: string) => {
    await deleteMutation.mutateAsync(id);
  }, [deleteMutation]);

  const bulkDownload = useCallback(async (documentIds: string[]) => {
    try {
      await documentService.bulkDownload(documentIds);
      toast({
        title: 'Download avviato',
        description: `Download di ${documentIds.length} documenti in corso...`
      });
    } catch (error) {
      toast({
        title: 'Errore download',
        description: 'Impossibile scaricare i documenti',
        variant: 'destructive'
      });
    }
  }, [toast]);

  const searchDocuments = useCallback(async (query: string) => {
    return documentService.searchDocuments(query, filters);
  }, [filters]);

  return {
    documents,
    isLoading,
    error,
    refetch,
    categories,
    storageUsage,
    selectedDocuments,
    setSelectedDocuments,
    deleteDocument,
    bulkDelete: bulkDeleteMutation.mutateAsync,
    bulkDownload,
    shareDocument: shareMutation.mutateAsync,
    searchDocuments
  };
}

// Hook for document upload
export function useDocumentUpload() {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const uploadDocument = useCallback(
    async (file: File, metadata: any, onProgress?: (progress: number) => void) => {
      setIsUploading(true);
      
      try {
        const result = await documentService.uploadDocument(
          {
            file,
            documentType: metadata.documentType,
            title: metadata.title || file.name,
            description: metadata.description,
            year: metadata.year,
            month: metadata.month,
            isConfidential: metadata.isConfidential,
            expiryDate: metadata.expiryDate,
            metadata: metadata.metadata
          },
          (progress) => {
            setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
            onProgress?.(progress);
          }
        );

        toast({
          title: 'Upload completato',
          description: `${file.name} caricato con successo`
        });

        queryClient.invalidateQueries({ queryKey: ['/api/hr/documents'] });
        return result;
      } catch (error) {
        toast({
          title: 'Errore upload',
          description: `Impossibile caricare ${file.name}`,
          variant: 'destructive'
        });
        throw error;
      } finally {
        setIsUploading(false);
        // Clean up progress after delay
        setTimeout(() => {
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[file.name];
            return newProgress;
          });
        }, 2000);
      }
    },
    [toast]
  );

  return {
    uploadDocument,
    isUploading,
    uploadProgress
  };
}

// Hook for document search
export function useDocumentSearch(initialQuery = '') {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: ['/api/hr/documents/search', debouncedQuery],
    queryFn: () => documentService.searchDocuments(debouncedQuery),
    enabled: debouncedQuery.length > 2
  });

  return {
    query,
    setQuery,
    searchResults,
    isSearching: isLoading
  };
}

// Hook for document categories with counts
export function useDocumentCategories() {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['/api/hr/documents/categories'],
    queryFn: () => documentService.getCategories()
  });

  const categoryMap = categories.reduce((acc, cat) => {
    acc[cat.type] = {
      count: cat.count,
      totalSize: cat.totalSize
    };
    return acc;
  }, {} as Record<string, { count: number; totalSize: number }>);

  return {
    categories,
    categoryMap,
    isLoading,
    totalDocuments: categories.reduce((sum, cat) => sum + cat.count, 0),
    totalSize: categories.reduce((sum, cat) => sum + cat.totalSize, 0)
  };
}

// Hook for storage quota
export function useStorageQuota() {
  const { data: quota, isLoading } = useQuery({
    queryKey: ['/api/hr/documents/storage-quota'],
    queryFn: () => documentService.getStorageQuota(),
    refetchInterval: 60000 // Refresh every minute
  });

  const isNearLimit = quota ? quota.percentage > 80 : false;
  const isOverLimit = quota ? quota.percentage >= 100 : false;

  return {
    used: quota?.used || 0,
    total: quota?.total || 1073741824, // 1GB default
    percentage: quota?.percentage || 0,
    isNearLimit,
    isOverLimit,
    isLoading
  };
}

// Hook for payslip management
export function usePayslips(year: number) {
  const { toast } = useToast();

  const { data: payslips = [], isLoading } = useQuery({
    queryKey: [`/api/hr/documents/payslips`, year],
    queryFn: () => documentService.getPayslips(year)
  });

  const downloadYear = useCallback(async () => {
    try {
      await documentService.downloadYearPayslips(year);
      toast({
        title: 'Download avviato',
        description: `Download buste paga ${year} in corso...`
      });
    } catch (error) {
      toast({
        title: 'Errore download',
        description: 'Impossibile scaricare le buste paga',
        variant: 'destructive'
      });
    }
  }, [year, toast]);

  const generateCUD = useCallback(async () => {
    try {
      await documentService.generateCUD(year);
      toast({
        title: 'CUD generato',
        description: `Il CUD ${year} è stato generato con successo`
      });
    } catch (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile generare il CUD',
        variant: 'destructive'
      });
    }
  }, [year, toast]);

  const hasAllMonths = payslips.length === 12;
  const missingMonths = Array.from({ length: 12 }, (_, i) => i + 1)
    .filter(month => !payslips.some((p: any) => p.month === month));

  return {
    payslips,
    isLoading,
    downloadYear,
    generateCUD,
    hasAllMonths,
    missingMonths
  };
}

// Hook for document viewer
export function useDocumentViewer(documentId: string | null) {
  const [isLoading, setIsLoading] = useState(true);

  const { data: document } = useQuery({
    queryKey: ['/api/hr/documents', documentId],
    queryFn: () => documentService.getDocument(documentId!),
    enabled: !!documentId
  });

  const { data: accessLogs = [] } = useQuery({
    queryKey: ['/api/hr/documents', documentId, 'access-logs'],
    queryFn: () => documentService.getAccessLogs(documentId!),
    enabled: !!documentId
  });

  // Mark document as accessed
  useEffect(() => {
    if (documentId) {
      documentService.markAsAccessed(documentId).catch(console.error);
    }
  }, [documentId]);

  const download = useCallback(async () => {
    if (!documentId) return;
    await documentService.downloadDocument(documentId);
  }, [documentId]);

  const share = useCallback(async (expiresIn?: number) => {
    if (!documentId) return;
    return documentService.shareDocument({
      documentId,
      expiresIn
    });
  }, [documentId]);

  return {
    document,
    accessLogs,
    isLoading,
    download,
    share
  };
}