// ==================== DOMAIN TYPES INDEX ====================
// Centralized type exports to eliminate (as any) casts throughout the frontend
// ARCHITECT REQUIREMENT: Single source of truth for all domain types

// Re-export all backend schema types using absolute path
export * from '../../../../backend/api/src/db/schema';

// Re-export specific types for clarity and IDE support
export type {
  // User Management
  users as User,
  insertUserSchema as InsertUserSchema,
  
  // HR System
  hrRequests as HRRequest,
  insertHrRequestSchema as InsertHRRequestSchema,
  hrDocuments as HRDocument,
  
  // Leave Management
  leaveRequests as LeaveRequest,
  employeeBalances as EmployeeBalance,
  
  // Time Tracking
  timeTracking as TimeEntry,
  shifts as Shift,
  
  // Organizational Structure
  tenants as Tenant,
  legalEntities as LegalEntity,
  stores as Store,
  
  // Notifications
  notifications as Notification,
  
  // RBAC
  roles as Role,
  userAssignments as UserAssignment,
} from '@w3suite/sdk/schema';

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
  | { open: true; data: T };

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