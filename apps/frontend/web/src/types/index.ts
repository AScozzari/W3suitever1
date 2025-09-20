// ==================== DOMAIN TYPES INDEX ====================
// Centralized type exports to eliminate (as any) casts throughout the frontend
// ARCHITECT REQUIREMENT: Single source of truth for all domain types

// Re-export UserData interface from useUserAvatar hook
export interface UserData {
  id?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  profileImageUrl?: string;
}

// Basic backend schema types - using simple interfaces instead of complex imports
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  [key: string]: any;
}

export interface HRRequest {
  id: string;
  stato: string;
  [key: string]: any;
}

export interface HRDocument {
  id: string;
  title: string;
  fileName: string;
  [key: string]: any;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  [key: string]: any;
}

// ==================== FRONTEND-SPECIFIC UTILITY TYPES ====================

// AuthUser type for proper authentication typing
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
}

// Modal State Types - Discriminated union to prevent any casts
export type ModalState<T = Record<string, unknown>> = 
  | { open: false; data: null }
  | { open: true; data: T | undefined };

// Generic API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Query Hook Return Types (to eliminate useQuery any returns)
export interface QueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

// User Display Helper Type
export interface DisplayUser {
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  ruolo: string;
  reparto: string;
  department: string; // Added for compatibility
  matricola: string;
  foto: string | null;
  dataAssunzione: string;
  manager: string;
  store: string;
}

// Leave Balance Display Type
export interface DisplayLeaveBalance {
  ferieRimanenti: number;
  permessiRimanenti: number;
  ferieAnno: number;
  ferieUsate: number;
  permessiROL: number;
  permessiUsati: number;
  malattia: number;
  congedi: number;
}

// HR Request Status Type Guard
export type HRRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

// Document Types
export interface DocumentMeta {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  downloadUrl?: string;
}

// Time Tracking Types
export interface TimeTrackingEntry {
  id: string;
  userId: string;
  clockIn: Date;
  clockOut?: Date;
  breakTime: number;
  totalHours?: number;
  status: 'active' | 'completed' | 'break';
}

// ==================== TYPE GUARDS AND UTILITIES ====================

// Type guard for HRRequest
export function isHRRequest(obj: any): obj is HRRequest {
  return obj && typeof obj === 'object' && 'id' in obj && 'stato' in obj;
}

// Type guard for User
export function isUser(obj: any): obj is User {
  return obj && typeof obj === 'object' && 'id' in obj && 'email' in obj;
}

// Helper function to safely extract display user data
export function getDisplayUser(userData: any, authUser: any): DisplayUser {
  return {
    nome: userData?.firstName || authUser?.name?.split(' ')[0] || 'Demo',
    cognome: userData?.lastName || authUser?.name?.split(' ')[1] || 'User',
    email: userData?.email || authUser?.email || 'demo@windtre.it',
    telefono: userData?.phone || '+39 335 123 4567',
    ruolo: userData?.position || 'Employee',
    reparto: userData?.department || 'General',
    department: userData?.department || 'General', // Added for compatibility
    matricola: userData?.id || 'W3-DEMO',
    foto: userData?.profileImageUrl || null,
    dataAssunzione: userData?.hireDate || '15/03/2022',
    manager: 'Laura Bianchi',
    store: 'Milano Centro'
  };
}

// Helper function to safely extract leave balance data
export function getDisplayLeaveBalance(leaveBalance: any): DisplayLeaveBalance {
  return {
    ferieRimanenti: leaveBalance?.remainingVacationDays || leaveBalance?.vacationDaysRemaining || 18,
    permessiRimanenti: leaveBalance?.remainingPersonalDays || leaveBalance?.personalDaysRemaining || 20,
    ferieAnno: leaveBalance?.totalVacationDays || 26,
    ferieUsate: leaveBalance?.usedVacationDays || 8,
    permessiROL: leaveBalance?.totalPersonalDays || 32,
    permessiUsati: leaveBalance?.usedPersonalDays || 12,
    malattia: leaveBalance?.sickDays || 5,
    congedi: leaveBalance?.otherLeave || 0
  };
}

// Helper to safely extract requests array from API response
export function extractHRRequests(apiResponse: any): HRRequest[] {
  if (Array.isArray(apiResponse)) {
    return apiResponse.filter(isHRRequest);
  }
  if (apiResponse?.data && Array.isArray(apiResponse.data)) {
    return apiResponse.data.filter(isHRRequest);
  }
  return [];
}

// ==================== NOTIFICATION TYPES ====================

// Notification API Response Types
export interface NotificationResponse {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'security';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'unread' | 'read';
  url?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface NotificationsApiResponse {
  notifications: NotificationResponse[];
  total?: number;
  unreadCount?: number;
}

export interface UnreadCountApiResponse {
  unreadCount: number;
}

// ==================== ENHANCED CURRENT SESSION TYPE ====================

// Extended CurrentSession interface with missing properties
export interface CurrentSession {
  id: string;
  clockIn: string;
  storeId: string;
  storeName: string;
  trackingMethod: string;
  elapsedMinutes: number;
  breakMinutes: number;
  // Missing properties that are accessed in MyPortal
  totalHours: string;
  breakTime: string;
  status: 'active' | 'completed' | 'break' | 'overtime';
  currentBreak?: {
    start: string;
    duration: number;
  };
  isOvertime: boolean;
  requiresBreak: boolean;
}

// ==================== COMPONENT PROP INTERFACES ====================

// DocumentCategories component props
export interface DocumentCategoriesProps {
  categories: any[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  onCategorySelect?: (category: any) => void; // Added missing prop
  documentCounts: Record<string, number>;
}

// DocumentGrid component props
export interface DocumentGridProps {
  documents: any[];
  viewMode: 'grid' | 'list';
  selectedDocuments: Set<string>;
  onSelectDocument: (docId: string, isSelected: boolean) => void;
  onViewDocument: (doc: any) => void;
  onDeleteDocument: (docId: string) => Promise<void>;
  onDocumentClick?: (document: any) => void; // Added missing prop
  isLoading: boolean;
}