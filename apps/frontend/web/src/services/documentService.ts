import { apiRequest, queryClient } from '../lib/queryClient';

export interface HRDocument {
  id: string;
  tenantId: string;
  userId: string;
  documentType: 'payslip' | 'contract' | 'certificate' | 'id_document' | 'cv' | 'evaluation' | 'warning' | 'other';
  title: string;
  description?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  year?: number;
  month?: number;
  isConfidential: boolean;
  expiryDate?: string | null;
  metadata?: Record<string, any>;
  uploadedBy: string;
  uploadedAt: string;
  lastAccessedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentUploadRequest {
  file: File;
  documentType: HRDocument['documentType'];
  title?: string;
  description?: string;
  year?: number;
  month?: number;
  isConfidential?: boolean;
  expiryDate?: string;
  metadata?: Record<string, any>;
}

export interface DocumentShareRequest {
  documentId: string;
  expiresIn?: number; // hours
  password?: string;
  maxDownloads?: number;
}

export interface DocumentSearchParams {
  query?: string;
  documentType?: HRDocument['documentType'];
  year?: number;
  month?: number;
  isConfidential?: boolean;
  uploadedBy?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface StorageQuota {
  used: number;
  total: number;
  percentage: number;
}

class DocumentService {
  private baseUrl = '/api/hr/documents';

  // Upload document with progress tracking
  async uploadDocument(
    request: DocumentUploadRequest,
    onProgress?: (progress: number) => void
  ): Promise<HRDocument> {
    const formData = new FormData();
    formData.append('file', request.file);
    formData.append('documentType', request.documentType);
    
    if (request.title) formData.append('title', request.title);
    if (request.description) formData.append('description', request.description);
    if (request.year) formData.append('year', request.year.toString());
    if (request.month) formData.append('month', request.month.toString());
    if (request.isConfidential !== undefined) {
      formData.append('isConfidential', request.isConfidential.toString());
    }
    if (request.expiryDate) formData.append('expiryDate', request.expiryDate);
    if (request.metadata) {
      formData.append('metadata', JSON.stringify(request.metadata));
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);
          // Invalidate document queries
          queryClient.invalidateQueries({ queryKey: [this.baseUrl] });
          resolve(response);
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', `${this.baseUrl}/upload`);
      
      // Add auth headers
      const authToken = localStorage.getItem('access_token');
      if (authToken) {
        xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
      }
      
      xhr.send(formData);
    });
  }

  // Get documents with filtering
  async getDocuments(params?: DocumentSearchParams): Promise<HRDocument[]> {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return apiRequest(`${this.baseUrl}${queryString}`, 'GET');
  }

  // Get single document
  async getDocument(id: string): Promise<HRDocument> {
    return apiRequest(`${this.baseUrl}/${id}`, 'GET');
  }

  // Update document metadata
  async updateDocument(id: string, updates: Partial<HRDocument>): Promise<HRDocument> {
    const response = await apiRequest(`${this.baseUrl}/${id}`, 'PUT', updates);
    queryClient.invalidateQueries({ queryKey: [this.baseUrl] });
    return response;
  }

  // Delete document
  async deleteDocument(id: string): Promise<void> {
    await apiRequest(`${this.baseUrl}/${id}`, 'DELETE');
    queryClient.invalidateQueries({ queryKey: [this.baseUrl] });
  }

  // Download document
  async downloadDocument(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}/download`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    });
    
    if (!response.ok) throw new Error('Download failed');
    
    const blob = await response.blob();
    const filename = response.headers.get('content-disposition')
      ?.split('filename=')[1]
      ?.replace(/['"]/g, '') || 'document';
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // Bulk download documents
  async bulkDownload(documentIds: string[]): Promise<void> {
    const response = await fetch(`${this.baseUrl}/bulk-download`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ documentIds })
    });
    
    if (!response.ok) throw new Error('Bulk download failed');
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `documents-${Date.now()}.zip`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // Share document
  async shareDocument(request: DocumentShareRequest): Promise<{ shareUrl: string; expiresAt: string }> {
    return apiRequest(`${this.baseUrl}/${request.documentId}/share`, 'POST', request);
  }

  // Search documents
  async searchDocuments(query: string, filters?: DocumentSearchParams): Promise<HRDocument[]> {
    const params = { ...filters, query };
    const queryString = new URLSearchParams(params as any).toString();
    return apiRequest(`${this.baseUrl}/search?${queryString}`, 'GET');
  }

  // Get document categories with counts
  async getCategories(): Promise<Array<{ type: string; count: number; totalSize: number }>> {
    return apiRequest(`${this.baseUrl}/categories`, 'GET');
  }

  // Get storage quota
  async getStorageQuota(): Promise<StorageQuota> {
    return apiRequest(`${this.baseUrl}/storage-quota`, 'GET');
  }

  // Get payslips for a year
  async getPayslips(year: number): Promise<HRDocument[]> {
    return apiRequest(`${this.baseUrl}/payslips?year=${year}`, 'GET');
  }

  // Download all payslips for a year
  async downloadYearPayslips(year: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/payslips/${year}/download-all`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    });
    
    if (!response.ok) throw new Error('Download failed');
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `buste-paga-${year}.zip`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // Generate CUD document
  async generateCUD(year: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/cud/${year}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    });
    
    if (!response.ok) throw new Error('CUD generation failed');
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CUD-${year}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // Mark document as accessed
  async markAsAccessed(id: string): Promise<void> {
    await apiRequest(`${this.baseUrl}/${id}/access`, 'POST');
  }

  // Get document access logs
  async getAccessLogs(id: string): Promise<Array<{ userId: string; accessedAt: string; action: string }>> {
    return apiRequest(`${this.baseUrl}/${id}/access-logs`, 'GET');
  }

  // Bulk operations
  async bulkDelete(documentIds: string[]): Promise<void> {
    await apiRequest(`${this.baseUrl}/bulk-delete`, 'POST', { documentIds });
    queryClient.invalidateQueries({ queryKey: [this.baseUrl] });
  }

  async bulkMove(documentIds: string[], targetFolder: string): Promise<void> {
    await apiRequest(`${this.baseUrl}/bulk-move`, 'POST', { documentIds, targetFolder });
    queryClient.invalidateQueries({ queryKey: [this.baseUrl] });
  }

  async bulkUpdateMetadata(documentIds: string[], updates: Partial<HRDocument>): Promise<void> {
    await apiRequest(`${this.baseUrl}/bulk-update`, 'POST', { documentIds, updates });
    queryClient.invalidateQueries({ queryKey: [this.baseUrl] });
  }
}

export const documentService = new DocumentService();