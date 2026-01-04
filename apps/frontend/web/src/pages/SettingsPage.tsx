import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/ApiService';
import Layout from '../components/Layout';
import { useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient, getCurrentTenantId } from '@/lib/queryClient';
import { useAuthReadiness } from '@/hooks/useAuthReadiness';
import { oauth2Client } from '../services/OAuth2Client';

// Auth mode from environment
const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || 'development';

// Helper per fetch autenticate - rispetta AUTH_MODE
const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  try {
    const tenantId = getCurrentTenantId();
    let headers: HeadersInit = {
      ...(options.headers || {}),
      'X-Tenant-ID': tenantId,
    };
    
    if (AUTH_MODE === 'development') {
      headers['X-Auth-Session'] = 'authenticated';
      const demoUserId = localStorage.getItem('demo_user_id') || 'admin-user';
      headers['X-Demo-User'] = demoUserId;
    } else {
      const token = await oauth2Client.getAccessToken();
      
      if (!token) {
        console.error('[AUTH-FETCH] No token available, redirecting to login');
        window.location.href = '/oauth2/authorize';
        throw new Error('No authentication token');
      }
      
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return fetch(url, { ...options, headers, credentials: 'include' });
  } catch (error) {
    console.error('[AUTH-FETCH] Error:', error);
    throw error;
  }
};
import { useLocation } from 'wouter';
import AvatarSelector from '../components/AvatarSelector';
import HierarchyTreeView from '@/components/HierarchyTreeView';
import HierarchyNodeDialog from '@/components/HierarchyNodeDialog';
// WorkflowConfigurator removed - replaced with new workflow management system
// WorkflowManagement components removed - replaced with new system
import {
  StandardEmailField,
  StandardCityField,
  StandardCapField,
  StandardCodiceFiscaleField,
  StandardPartitaIVAField,
  StandardPaeseField
} from '../components/Leave/forms/StandardFields';
import AISettingsPage from '../components/AI/AISettingsPage';
import { StoreConfigurationDialog } from '../components/settings/StoreConfigurationDialog';
import { StoreCalendarModal } from '../components/settings/StoreCalendarModal';
import ChannelSettingsPage from './settings/ChannelSettingsPage';
import SystemConfigPage from './settings/SystemConfigPage';
import { LegalEntityFormModal, StoreFormModal, UserFormModal } from '../components/settings';
import { z } from 'zod';
import { 
  legalEntityValidationSchema,
  storeValidationSchema,
  userValidationSchema,
  italianPhoneSchema,
  websiteUrlSchema
} from '../lib/validation/italian-business-validation';

// Utility per unificare multiple event handlers onBlur
const composeEventHandlers = (...handlers: Array<((e: React.FocusEvent<HTMLElement>) => void) | undefined>) => (e: React.FocusEvent<HTMLElement>) => {
  for (const h of handlers) { 
    if (!h) continue; 
    h(e as any); 
    if ((e as any).defaultPrevented) break; 
  }
};

// Tenant ID per staging environment
const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';
import {
  Settings,
  Building2,
  Users,
  Store,
  Shield,
  Bell,
  Database,
  Server,
  Activity,
  FileText,
  Globe,
  Lock,
  Cpu,
  HardDrive,
  Plus,
  Edit3,
  MoreVertical,
  ChevronRight,
  User,
  UserCog,
  MapPin,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Zap,
  Palette,
  Languages,
  Clock,
  Eye,
  EyeOff,
  Check,
  CheckCircle,
  X,
  AlertTriangle,
  AlertCircle,
  ArrowLeft,
  Home,
  RefreshCw,
  BarChart3,
  Wifi,
  HelpCircle,
  Factory,
  Briefcase,
  Heart,
  Star,
  Target,
  TrendingUp,
  DollarSign,
  Trash2,
  Save,
  Search,
  Filter,
  Calendar as CalendarIcon,
  Copy,
  ExternalLink,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  RotateCcw,
  Play,
  Pause,
  Info,
  AlertTriangle as Warning,
  XCircle,
  Truck,
  Landmark,
  Archive,
  Wrench
} from 'lucide-react';

// Hardcoded roles data - 10 specific roles instead of backend fetching
const HARDCODED_ROLES = [
  {
    id: 'amministratore',
    code: 'amministratore',
    name: 'Amministratore',
    description: 'Accesso completo a tutte le funzionalità del sistema e gestione RBAC',
    isSystemRole: true,
    color: '#ef4444',
    permissions: ['*'] // Full access
  },
  {
    id: 'area_manager',
    code: 'area_manager',
    name: 'Area Manager',
    description: 'Supervisione di aree geografiche e coordinamento store',
    isSystemRole: true,
    color: '#3b82f6',
    permissions: ['dashboard.view', 'stores.manage', 'users.view', 'reports.view']
  },
  {
    id: 'store_manager',
    code: 'store_manager',
    name: 'Store Manager',
    description: 'Gestione completa del punto vendita e team',
    isSystemRole: true,
    color: '#10b981',
    permissions: ['dashboard.view', 'store.manage', 'users.manage', 'inventory.manage']
  },
  {
    id: 'store_specialist',
    code: 'store_specialist',
    name: 'Store Specialist',
    description: 'Operazioni quotidiane del punto vendita',
    isSystemRole: true,
    color: '#f59e0b',
    permissions: ['dashboard.view', 'pos.use', 'inventory.view', 'customers.manage']
  },
  {
    id: 'finance',
    code: 'finance',
    name: 'Finance',
    description: 'Gestione finanziaria, contabilità e reporting',
    isSystemRole: true,
    color: '#8b5cf6',
    permissions: ['dashboard.view', 'finance.manage', 'reports.view', 'analytics.view']
  },
  {
    id: 'hr_manager',
    code: 'hr_manager',
    name: 'HR Manager',
    description: 'Gestione risorse umane e formazione',
    isSystemRole: true,
    color: '#ec4899',
    permissions: ['dashboard.view', 'users.manage', 'hr.manage', 'training.manage']
  },
  {
    id: 'sales_agent',
    code: 'sales_agent',
    name: 'Sales Agent',
    description: 'Vendite e supporto clienti',
    isSystemRole: true,
    color: '#06b6d4',
    permissions: ['dashboard.view', 'pos.use', 'customers.manage', 'sales.view']
  },
  {
    id: 'cassiere',
    code: 'cassiere',
    name: 'Cassiere',
    description: 'Operazioni di cassa e transazioni',
    isSystemRole: true,
    color: '#84cc16',
    permissions: ['pos.use', 'transactions.manage', 'cash.manage']
  },
  {
    id: 'magazziniere',
    code: 'magazziniere',
    name: 'Magazziniere',
    description: 'Gestione magazzino e inventario',
    isSystemRole: true,
    color: '#f97316',
    permissions: ['inventory.manage', 'warehouse.manage', 'products.manage']
  },
  {
    id: 'marketing',
    code: 'marketing',
    name: 'Marketing',
    description: 'Campagne marketing e comunicazione',
    isSystemRole: true,
    color: '#e11d48',
    permissions: ['dashboard.view', 'marketing.manage', 'campaigns.manage', 'analytics.view']
  }
];

// All available permissions for the system
const ALL_PERMISSIONS = [
  'dashboard.view',
  'dashboard.manage',
  'users.view',
  'users.manage',
  'stores.view', 
  'stores.manage',
  'store.manage',
  'inventory.view',
  'inventory.manage',
  'pos.use',
  'customers.view',
  'customers.manage',
  'finance.view',
  'finance.manage',
  'reports.view',
  'reports.manage',
  'analytics.view',
  'analytics.manage',
  'hr.view',
  'hr.manage',
  'training.view',
  'training.manage',
  'sales.view',
  'sales.manage',
  'transactions.view',
  'transactions.manage',
  'cash.manage',
  'warehouse.view',
  'warehouse.manage',
  'products.view',
  'products.manage',
  'marketing.view',
  'marketing.manage',
  'campaigns.view',
  'campaigns.manage',
  // Workflow Management Permissions
  'workflow.read',
  'workflow.create',
  'workflow.update',
  'workflow.delete',
  // HR Workflow Actions (examples)
  'workflow.action.hr.approve_vacation',
  'workflow.action.hr.reject_vacation',
  'workflow.action.hr.approve_sick_leave',
  'workflow.action.hr.approve_training_request',
  'workflow.action.hr.approve_expense',
  // HR Workflow Triggers (examples)
  'workflow.trigger.hr.notify_team',
  'workflow.trigger.hr.update_calendar',
  'workflow.trigger.hr.send_reminder',
  'workflow.trigger.hr.escalate_to_manager',
  'workflow.trigger.hr.auto_approve_small_request'
];

// Lista di province italiane
const italianProvinces = [
  { code: 'AG', name: 'Agrigento' },
  { code: 'AL', name: 'Alessandria' },
  { code: 'AN', name: 'Ancona' },
  { code: 'AO', name: 'Aosta' },
  { code: 'AR', name: 'Arezzo' },
  { code: 'AP', name: 'Ascoli Piceno' },
  { code: 'AT', name: 'Asti' },
  { code: 'AV', name: 'Avellino' },
  { code: 'BA', name: 'Bari' },
  { code: 'BT', name: 'Barletta-Andria-Trani' },
  { code: 'BL', name: 'Belluno' },
  { code: 'BN', name: 'Benevento' },
  { code: 'BG', name: 'Bergamo' },
  { code: 'BI', name: 'Biella' },
  { code: 'BO', name: 'Bologna' },
  { code: 'BZ', name: 'Bolzano' },
  { code: 'BS', name: 'Brescia' },
  { code: 'BR', name: 'Brindisi' },
  { code: 'CA', name: 'Cagliari' },
  { code: 'CL', name: 'Caltanissetta' },
  { code: 'CB', name: 'Campobasso' },
  { code: 'CE', name: 'Caserta' },
  { code: 'CT', name: 'Catania' },
  { code: 'CZ', name: 'Catanzaro' },
  { code: 'CH', name: 'Chieti' },
  { code: 'CO', name: 'Como' },
  { code: 'CS', name: 'Cosenza' },
  { code: 'CR', name: 'Cremona' },
  { code: 'KR', name: 'Crotone' },
  { code: 'CN', name: 'Cuneo' },
  { code: 'EN', name: 'Enna' },
  { code: 'FM', name: 'Fermo' },
  { code: 'FE', name: 'Ferrara' },
  { code: 'FI', name: 'Firenze' },
  { code: 'FG', name: 'Foggia' },
  { code: 'FC', name: 'Forlì-Cesena' },
  { code: 'FR', name: 'Frosinone' },
  { code: 'GE', name: 'Genova' },
  { code: 'GO', name: 'Gorizia' },
  { code: 'GR', name: 'Grosseto' },
  { code: 'IM', name: 'Imperia' },
  { code: 'IS', name: 'Isernia' },
  { code: 'AQ', name: "L'Aquila" },
  { code: 'SP', name: 'La Spezia' },
  { code: 'LT', name: 'Latina' },
  { code: 'LE', name: 'Lecce' },
  { code: 'LC', name: 'Lecco' },
  { code: 'LI', name: 'Livorno' },
  { code: 'LO', name: 'Lodi' },
  { code: 'LU', name: 'Lucca' },
  { code: 'MC', name: 'Macerata' },
  { code: 'MN', name: 'Mantova' },
  { code: 'MS', name: 'Massa-Carrara' },
  { code: 'MT', name: 'Matera' },
  { code: 'ME', name: 'Messina' },
  { code: 'MI', name: 'Milano' },
  { code: 'MO', name: 'Modena' },
  { code: 'MB', name: 'Monza e Brianza' },
  { code: 'NA', name: 'Napoli' },
  { code: 'NO', name: 'Novara' },
  { code: 'NU', name: 'Nuoro' },
  { code: 'OR', name: 'Oristano' },
  { code: 'PD', name: 'Padova' },
  { code: 'PA', name: 'Palermo' },
  { code: 'PR', name: 'Parma' },
  { code: 'PV', name: 'Pavia' },
  { code: 'PG', name: 'Perugia' },
  { code: 'PU', name: 'Pesaro e Urbino' },
  { code: 'PE', name: 'Pescara' },
  { code: 'PC', name: 'Piacenza' },
  { code: 'PI', name: 'Pisa' },
  { code: 'PT', name: 'Pistoia' },
  { code: 'PN', name: 'Pordenone' },
  { code: 'PZ', name: 'Potenza' },
  { code: 'PO', name: 'Prato' },
  { code: 'RG', name: 'Ragusa' },
  { code: 'RA', name: 'Ravenna' },
  { code: 'RC', name: 'Reggio Calabria' },
  { code: 'RE', name: 'Reggio Emilia' },
  { code: 'RI', name: 'Rieti' },
  { code: 'RN', name: 'Rimini' },
  { code: 'RM', name: 'Roma' },
  { code: 'RO', name: 'Rovigo' },
  { code: 'SA', name: 'Salerno' },
  { code: 'SS', name: 'Sassari' },
  { code: 'SV', name: 'Savona' },
  { code: 'SI', name: 'Siena' },
  { code: 'SR', name: 'Siracusa' },
  { code: 'SO', name: 'Sondrio' },
  { code: 'SU', name: 'Sud Sardegna' },
  { code: 'TA', name: 'Taranto' },
  { code: 'TE', name: 'Teramo' },
  { code: 'TR', name: 'Terni' },
  { code: 'TO', name: 'Torino' },
  { code: 'TP', name: 'Trapani' },
  { code: 'TN', name: 'Trento' },
  { code: 'TV', name: 'Treviso' },
  { code: 'TS', name: 'Trieste' },
  { code: 'UD', name: 'Udine' },
  { code: 'VA', name: 'Varese' },
  { code: 'VE', name: 'Venezia' },
  { code: 'VB', name: 'Verbano-Cusio-Ossola' },
  { code: 'VC', name: 'Vercelli' },
  { code: 'VR', name: 'Verona' },
  { code: 'VV', name: 'Vibo Valentia' },
  { code: 'VI', name: 'Vicenza' },
  { code: 'VT', name: 'Viterbo' }
];

// Types for reference data
interface LegalForm {
  id: string;
  code: string;
  name: string;
  description?: string;
  minCapital?: string;
  liability?: string;
  active: boolean;
  sortOrder: number;
}

interface ItalianCity {
  id: string;
  name: string;
  province: string;
  provinceName: string;
  region: string;
  postalCode: string;
  active: boolean;
}

// ==================== ENTERPRISE AUDIT TRAIL TYPES ====================
// ✅ PROFESSIONAL: Complete types for enterprise audit dashboard

interface EnterpriseAuditLog {
  id: string;
  logType: 'structured' | 'entity';
  createdAt: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  component: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  correlationId?: string;
  userId?: string;
  userEmail?: string;
  duration?: number;
  metadata?: any;
  requestId?: string;
  // Entity logs specific fields
  previousStatus?: string;
  newStatus?: string;
  changes?: any;
  notes?: string;
}

interface EnterpriseAuditResponse {
  logs: EnterpriseAuditLog[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    duration: string;
    filters: {
      applied: number;
      available: {
        components: string[];
        actions: string[];
        entityTypes: string[];
        levels: string[];
        logTypes: string[];
        categories: string[];
        statuses: string[];
      };
    };
  };
  analytics: {
    totalLogs: number;
    averagePerDay: number;
    queryPerformance: number;
    dataFreshness: string;
  };
}

// Legacy types for backward compatibility
interface StructuredLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  component: string;
  message: string;
  user?: string;
  correlationId?: string;
  metadata?: any;
  stackTrace?: string;
  requestContext?: any;
}

interface LogsResponse {
  logs: StructuredLog[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Types for RBAC data
interface RBACRole {
  id: string;
  code: string;
  name: string;
  description?: string;
  isSystemRole: boolean;
  color?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface RBACPermission {
  id: string;
  code: string;
  name: string;
  description?: string;
  resource: string;
  action: string;
}

interface RBACRolesResponse {
  roles: RBACRole[];
  success: boolean;
}

interface RBACPermissionsResponse {
  permissions: string[];
  total: number;
}

interface RolePermissionsResponse {
  roleId: string;
  permissions: string[];
  total: number;
}

// Dati caricati dal database

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const { isReady: isAuthReady } = useAuthReadiness();
  const [currentModule, setCurrentModule] = useState('impostazioni');
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('Entity Management');
  
  // Custom roles state (must be declared before allRoles)
  const [customRoles, setCustomRoles] = useState<any[]>([]);
  
  // Modal states
  const [legalEntityModal, setLegalEntityModal] = useState<{ open: boolean; data: any }>({ open: false, data: null });
  const [storeModal, setStoreModal] = useState<{ open: boolean; data: any }>({ open: false, data: null });
  const [userModal, setUserModal] = useState<{ open: boolean; data: any }>({ open: false, data: null });
  const [logDetailsModal, setLogDetailsModal] = useState<{ open: boolean; data: any }>({ open: false, data: null });
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [calendarModal, setCalendarModal] = useState<{ open: boolean; storeId: string | null; storeName: string }>({ open: false, storeId: null, storeName: '' });

  // Avatar change handler
  const handleAvatarChange = (avatarData: { url?: string; blob?: Blob; type: 'upload' | 'generated' }) => {
    setNewUser(prevUser => ({
      ...prevUser,
      avatar: {
        url: avatarData.url || null,
        blob: avatarData.blob || null,
        type: avatarData.type
      }
    }));
  };
  
  // ✅ ENTERPRISE AUDIT: Advanced state management for professional dashboard
  const [auditSearchTerm, setAuditSearchTerm] = useState('');
  const [auditLevelFilter, setAuditLevelFilter] = useState('');
  const [auditComponentFilter, setAuditComponentFilter] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditEntityTypeFilter, setAuditEntityTypeFilter] = useState('');
  const [auditLogTypeFilter, setAuditLogTypeFilter] = useState('all');
  const [auditCategoryFilter, setAuditCategoryFilter] = useState('');
  const [auditStatusFilter, setAuditStatusFilter] = useState('');
  const [auditFromDate, setAuditFromDate] = useState('');
  const [auditToDate, setAuditToDate] = useState('');
  const [auditLastHours, setAuditLastHours] = useState('24'); // Default to last 24 hours
  const [auditUserFilter, setAuditUserFilter] = useState('');
  const [auditCorrelationIdFilter, setAuditCorrelationIdFilter] = useState('');
  const [auditCurrentPage, setAuditCurrentPage] = useState(1);
  const [auditPageSize] = useState(25); // Professional page size
  const [auditSortBy, setAuditSortBy] = useState('created_at');
  const [auditSortOrder, setAuditSortOrder] = useState('desc');
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [newLogsAvailable, setNewLogsAvailable] = useState(false);
  
  // ✅ Enterprise Audit Trail Filter States
  const [enterpriseAuditLevel, setEnterpriseAuditLevel] = useState('ALL');
  const [enterpriseAuditComponent, setEnterpriseAuditComponent] = useState('ALL');
  const [statsTimeRange, setStatsTimeRange] = useState<24 | 168 | 720>(168); // 24h, 7gg, 30gg
  const [enterpriseAuditSearch, setEnterpriseAuditSearch] = useState('');
  const [enterpriseAuditDateFrom, setEnterpriseAuditDateFrom] = useState('');
  const [enterpriseAuditDateTo, setEnterpriseAuditDateTo] = useState('');
  
  // Legacy logs state (for backward compatibility)
  const [logsSearchTerm, setLogsSearchTerm] = useState('');
  const [logsLevelFilter, setLogsLevelFilter] = useState('ALL');
  const [logsComponentFilter, setLogsComponentFilter] = useState('ALL');
  const [logsFromDate, setLogsFromDate] = useState('');
  const [logsToDate, setLogsToDate] = useState('');
  const [logsUserFilter, setLogsUserFilter] = useState('');
  const [logsCorrelationIdFilter, setLogsCorrelationIdFilter] = useState('');
  const [logsCurrentPage, setLogsCurrentPage] = useState(1);
  const [logsPageSize] = useState(20);
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);
  const lastSeenTimestamp = useRef<string | null>(null);
  
  // Form states
  const [selectedCity, setSelectedCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  
  // Selected entity tab
  const [selectedEntity, setSelectedEntity] = useState('ragione-sociale');
  
  // Workflow Management State
  const [workflowSubTab, setWorkflowSubTab] = useState('hierarchy');
  const [selectedWorkflowService, setSelectedWorkflowService] = useState('hr');

  // Note: Hierarchy Management removed - now handled by dedicated WorkflowManagementPage

  // Workflow Management Queries - Only load when Entity Management tab is active
  const { data: workflowActionsData, isLoading: loadingWorkflowActions } = useQuery({
    queryKey: ['/api/workflow-actions'],
    enabled: activeTab === 'Entity Management',
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000
  });

  const { data: workflowTriggersData, isLoading: loadingWorkflowTriggers } = useQuery({
    queryKey: ['/api/workflow-triggers'],
    enabled: activeTab === 'Entity Management',
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000
  });

  const { data: teamsData, isLoading: loadingTeams, refetch: refetchTeams } = useQuery({
    queryKey: ['/api/teams'],
    enabled: activeTab === 'Entity Management',
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000
  });

  const { data: workflowTemplatesData, isLoading: loadingTemplates, refetch: refetchTemplates } = useQuery({
    queryKey: ['/api/workflow-templates'],
    enabled: activeTab === 'Entity Management',
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000
  });

  const { data: teamAssignmentsData, isLoading: loadingAssignments, refetch: refetchAssignments } = useQuery({
    queryKey: ['/api/team-workflow-assignments'],
    enabled: activeTab === 'Entity Management',
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000
  });

  // VoIP Extensions Query - Load when user modal is open AND auth is ready
  const { data: voipExtensionsResponse, isLoading: loadingExtensions } = useQuery({
    queryKey: ['/api/voip/extensions'],
    enabled: userModal.open && isAuthReady, // Wait for auth initialization
    refetchOnMount: false,
    staleTime: 2 * 60 * 1000
  });
  // Note: queryClient now auto-unwraps {data: ...} responses, so we receive the array directly
  const voipExtensions = Array.isArray(voipExtensionsResponse) ? voipExtensionsResponse : [];
  
  // Operators (Brands) Query - Load from public.operators for Brand Gestiti field
  const { data: operatorsData = [] } = useQuery<any[]>({
    queryKey: ['/api/operators'],
    enabled: storeModal.open,
    staleTime: 5 * 60 * 1000
  });
  
  // Local state for managing items - inizializzati vuoti, caricati dal DB
  const [ragioneSocialiList, setRagioneSocialiList] = useState<any[]>([]);
  const [puntiVenditaList, setPuntiVenditaList] = useState<any[]>([]);
  
  
  // TanStack Query hooks for payment data - Only load when Entity Management tab is active
  const { data: paymentMethodsList, isLoading: paymentMethodsLoading } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: async () => {
      const result = await apiService.getPaymentMethods();
      if (!result.success) throw new Error(result.error || 'Failed to fetch payment methods');
      return (result.data as any)?.paymentMethods || [];
    },
    enabled: activeTab === 'Entity Management',
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000
  });

  const { data: paymentConditionsList, isLoading: paymentConditionsLoading } = useQuery({
    queryKey: ['paymentConditions'],
    queryFn: async () => {
      // Using reference payment methods as fallback until payment-conditions endpoint is added
      const result = await apiService.getPaymentMethods();
      if (!result.success) throw new Error(result.error || 'Failed to fetch payment conditions');
      return (result.data as any)?.paymentMethods || [];
    },
    enabled: activeTab === 'Entity Management',
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000
  });

  // Caricamento dati enterprise con service layer - Only when Entity Management tab is active
  useEffect(() => {
    // Skip loading if not on Entity Management tab
    if (activeTab !== 'Entity Management') {
      console.log('⏭️ SettingsPage: Skipping data load (not on Entity Management tab)');
      return;
    }

    // Skip if data already loaded
    if (ragioneSocialiList.length > 0 || utentiList.length > 0 || puntiVenditaList.length > 0) {
      console.log('✅ SettingsPage: Data already loaded, skipping');
      return;
    }

    console.log('🆕 SettingsPage: Loading data for Entity Management tab...');
    const loadData = async () => {
      try {
        console.log('🌎 SettingsPage: Calling apiService.loadSettingsData()...');
        const result = await apiService.loadSettingsData();
        console.log('📦 SettingsPage: loadSettingsData result:', result);
        
        if (!result.success) {
          if (result.needsAuth) {
            // Qui dovremmo gestire il redirect al login
            return;
          }
          console.error('Failed to load settings data:', result.error);
          return;
        }

        // Dati caricati con successo - aggiorna state
        if (result.data) {
          console.log('📝 Setting state with data:', {
            organizationEntities: result.data.organizationEntities?.length,
            users: result.data.users?.length,
            stores: result.data.stores?.length
          });
          setRagioneSocialiList(result.data.organizationEntities || []);
          setUtentiList(result.data.users || []);
          // Normalize store data to ensure consistent field names
          const normalizedStores = (result.data.stores || []).map((store: any) => ({
            ...store,
            organizationEntityId: store.organizationEntityId || store.organization_entity_id,
            commercialAreaId: store.commercialAreaId || store.commercial_area_id
          }));
          setPuntiVenditaList(normalizedStores);
        }

        // Carica anche i ruoli
        await fetchRoles();

      } catch (error) {
        console.error('Enterprise service error:', error);
      }
    };

    loadData();
  }, [activeTab]); // Re-run when activeTab changes

  // Funzione per ricaricare i dati delle ragioni sociali (organization entities)
  const refetchOrganizationEntities = async () => {
    try {
      const result = await apiService.loadSettingsData();
      if (result.success && result.data) {
        setRagioneSocialiList(result.data.organizationEntities);
      }
    } catch (error) {
      console.error('Error refetching organization entities:', error);
    }
  };

  
  // Roles loading function - kept separate as it's not in the main service
  const fetchRoles = async () => {
    try {
      const result = await apiService.getRoles();
      if (result.success && result.data) {
        setAvailableRoles(result.data.map((role: any) => role.name));
      } else {
        // Fallback ai ruoli di default se l'API fallisce
        setAvailableRoles([
          'Admin',
          'Finance',
          'Direttore', 
          'Store Manager',
          'Store Specialist',
          'Student',
          'Marketing',
          'HR Management',
          'Custom'
        ]);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      setAvailableRoles([
        'Admin',
        'Finance',
        'Direttore', 
        'Store Manager',
        'Store Specialist',
        'Student',
        'Marketing',
        'HR Management',
        'Custom'
      ]);
    }
  };
  
  const [utentiList, setUtentiList] = useState<any[]>([]);
  
  // Modal states
  const [showCreateRagioneSociale, setShowCreateRagioneSociale] = useState(false);
  const [showCreatePuntoVendita, setShowCreatePuntoVendita] = useState(false);
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  
  // Auto-refresh functionality for logs - FIXED: Remove duplicate mechanism
  const stopAutoRefresh = () => {
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current);
      autoRefreshInterval.current = null;
    }
  };
  
  // Toggle auto-refresh - FIXED: Use only TanStack Query mechanism
  const toggleAutoRefresh = () => {
    if (autoRefreshEnabled) {
      stopAutoRefresh();
      setAutoRefreshEnabled(false);
      setNewLogsAvailable(false);
    } else {
      setAutoRefreshEnabled(true);
      // Clear any false positives when enabling
      setNewLogsAvailable(false);
    }
  };
  
  // Reset all filters
  const resetLogsFilters = () => {
    setLogsSearchTerm('');
    setLogsLevelFilter('ALL');
    setLogsComponentFilter('ALL');
    setLogsFromDate('');
    setLogsToDate('');
    setLogsUserFilter('');
    setLogsCorrelationIdFilter('');
    setLogsCurrentPage(1);
    setNewLogsAvailable(false);
  };
  
  // ✅ ENTERPRISE AUDIT: Professional query builder with advanced filtering
  const buildEnterpriseAuditQueryParams = () => {
    const params: any = {
      page: auditCurrentPage,
      limit: auditPageSize,
      sortBy: auditSortBy,
      sortOrder: auditSortOrder,
      logType: auditLogTypeFilter
    };
    
    // ✅ Connect UI filters to query params
    if (enterpriseAuditSearch) params.search = enterpriseAuditSearch;
    if (enterpriseAuditLevel && enterpriseAuditLevel !== 'ALL') params.level = enterpriseAuditLevel;
    if (enterpriseAuditComponent && enterpriseAuditComponent !== 'ALL') params.service = enterpriseAuditComponent;
    
    // ✅ Date range filters (Dal/Al) - if set, use dates instead of lastHours
    if (enterpriseAuditDateFrom || enterpriseAuditDateTo) {
      if (enterpriseAuditDateFrom) params.dateFrom = enterpriseAuditDateFrom;
      if (enterpriseAuditDateTo) params.dateTo = enterpriseAuditDateTo;
    } else {
      params.lastHours = 168; // Default to 7 days if no date range set
    }
    
    // Additional advanced filters (for future use)
    if (auditActionFilter) params.action = auditActionFilter;
    if (auditEntityTypeFilter) params.entityType = auditEntityTypeFilter;
    if (auditStatusFilter) params.status = auditStatusFilter;
    if (auditUserFilter) params.actorEmail = auditUserFilter;
    
    return params;
  };

  // Legacy query builder (for backward compatibility)
  const buildLogsQueryParams = () => {
    const params: any = {
      page: logsCurrentPage,
      limit: logsPageSize
    };
    
    if (logsSearchTerm) params.search = logsSearchTerm;
    if (logsLevelFilter !== 'ALL') params.level = logsLevelFilter;
    if (logsComponentFilter !== 'ALL') params.component = logsComponentFilter;
    if (logsFromDate) params.fromDate = logsFromDate;
    if (logsToDate) params.toDate = logsToDate;
    if (logsUserFilter) params.user = logsUserFilter;
    if (logsCorrelationIdFilter) params.correlationId = logsCorrelationIdFilter;
    
    return params;
  };

  // ✅ Reset filters function for enterprise audit
  const resetEnterpriseAuditFilters = () => {
    setAuditSearchTerm('');
    setAuditLevelFilter('');
    setAuditComponentFilter('');
    setAuditActionFilter('');
    setAuditEntityTypeFilter('');
    setAuditLogTypeFilter('all');
    setAuditCategoryFilter('');
    setAuditStatusFilter('');
    setAuditFromDate('');
    setAuditToDate('');
    setAuditLastHours('24');
    setAuditUserFilter('');
    setAuditCorrelationIdFilter('');
    setAuditCurrentPage(1);
    setNewLogsAvailable(false);
  };

  // ==================== ENTERPRISE AUDIT TRAIL DASHBOARD ====================
  // ✅ PROFESSIONAL: Complete audit trail dashboard replacing "scarna" interface
  
  const renderEnterpriseAuditDashboard = () => {
    const auditData = enterpriseAuditData;
    const logs = auditData?.logs || [];
    const metadata = auditData?.metadata || { 
      total: 0, page: 1, limit: 25, totalPages: 0, duration: '0ms',
      filters: { applied: 0, available: { components: [], actions: [], entityTypes: [], levels: [], logTypes: [], categories: [], statuses: [] } }
    };
    const analytics = auditData?.analytics || { totalLogs: 0, averagePerDay: 0, queryPerformance: 0, dataFreshness: new Date().toISOString() };

    // ✅ PROFESSIONAL: Enhanced error state with enterprise styling
    if (auditError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '31.25rem',
          textAlign: 'center',
          padding: '2.5rem',
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05))',
          backdropFilter: 'blur(0.625rem)',
          borderRadius: '1rem',
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }}>
          <AlertTriangle size={56} style={{ color: '#ef4444', marginBottom: '1.25rem' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', margin: '0 0 0.5rem 0' }}>
            Errore Sistema Audit Trail
          </h3>
          <p style={{ fontSize: '1rem', color: '#6b7280', margin: '0 0 1.5rem 0', maxWidth: '31.25rem', lineHeight: '1.5' }}>
            Impossibile accedere ai dati dell'audit trail enterprise. Il sistema potrebbe essere temporaneamente non disponibile.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => refetchAudit()}
              style={{
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: 'white',
                border: 'none',
                borderRadius: '0.625rem',
                padding: '0.875rem 1.75rem',
                fontSize: '0.9375rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                boxShadow: '0 0.25rem 0.75rem rgba(239, 68, 68, 0.3)',
                transition: 'all 0.2s ease'
              }}
              data-testid="button-retry-audit"
            >
              <RefreshCw size={18} />
              Riprova Caricamento
            </button>
            <button
              onClick={() => resetEnterpriseAuditFilters()}
              style={{
                background: 'rgba(255, 255, 255, 0.8)',
                color: '#374151',
                border: '1px solid rgba(55, 65, 81, 0.2)',
                borderRadius: '0.625rem',
                padding: '0.875rem 1.75rem',
                fontSize: '0.9375rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem'
              }}
              data-testid="button-reset-filters"
            >
              <RotateCcw size={18} />
              Reset Filtri
            </button>
          </div>
        </div>
      );
    }

    // ✅ PROFESSIONAL: Enhanced loading state with enterprise analytics
    if (auditLoading) {
      return (
        <div style={{ padding: '1.5rem 2rem', width: '100%', boxSizing: 'border-box' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.7))',
            backdropFilter: 'blur(10.3125rem)',
            borderRadius: '1rem',
            padding: '2rem',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            marginBottom: '1.75rem',
            boxShadow: '0 0.5rem 2rem rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '50%',
                background: 'linear-gradient(90deg, rgba(255,105,0,0.2) 0%, rgba(255,105,0,0.4) 50%, rgba(255,105,0,0.2) 100%)',
                animation: 'spin 2s linear infinite'
              }} />
              <div>
                <div style={{
                  height: '1.75rem',
                  width: '17.5rem',
                  background: 'linear-gradient(90deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.3) 100%)',
                  borderRadius: '0.375rem',
                  marginBottom: '0.5rem',
                  animation: 'shimmer 2s infinite'
                }} />
                <div style={{
                  height: '1rem',
                  width: '25rem',
                  background: 'linear-gradient(90deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.2) 100%)',
                  borderRadius: '0.25rem',
                  animation: 'shimmer 2s infinite'
                }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(12.5rem, 1fr))', gap: '1rem' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{
                  background: 'rgba(255, 255, 255, 0.5)',
                  borderRadius: '0.75rem',
                  padding: '1.25rem',
                  border: '1px solid rgba(255, 255, 255, 0.3)'
                }}>
                  <div style={{
                    height: '1rem',
                    background: 'linear-gradient(90deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0.3) 100%)',
                    borderRadius: '0.25rem',
                    marginBottom: '0.75rem',
                    animation: 'shimmer 2s infinite'
                  }} />
                  <div style={{
                    height: '1.5rem',
                    background: 'linear-gradient(90deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0.4) 100%)',
                    borderRadius: '0.375rem',
                    animation: 'shimmer 2s infinite'
                  }} />
                </div>
              ))}
            </div>
          </div>
          <style>{`
            @keyframes shimmer {
              0% { background-position: -12.5rem 0; }
              100% { background-position: calc(12.5rem + 100%) 0; }
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      );
    }

    // ✅ STATS FROM SUMMARY API (independent from datatable filters)
    const summaryStats = auditSummary || { total: 0, byLevel: { ERROR: 0, WARN: 0, INFO: 0, DEBUG: 0 }, byService: {}, duration: '0ms' };
    const errorCount = summaryStats.byLevel.ERROR;
    const warnCount = summaryStats.byLevel.WARN;
    const infoCount = summaryStats.byLevel.INFO;
    const debugCount = summaryStats.byLevel.DEBUG;
    const totalLogs = summaryStats.total;
    
    // Top services from summary
    const topServices = Object.entries(summaryStats.byService || {})
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 5);
    
    // Available filters from metadata
    const availableLevels = ['ALL', 'ERROR', 'WARN', 'INFO', 'DEBUG'];
    const availableServices = ['ALL', ...(metadata.filters?.available?.services || [])];
    
    // Period label for cards
    const periodLabel = statsTimeRange === 24 ? 'ultime 24h' : statsTimeRange === 168 ? 'ultimi 7gg' : 'ultimi 30gg';

    return (
      <div style={{ padding: '1.5rem 2rem', width: '100%', boxSizing: 'border-box' }}>
        
        {/* ✅ ENTERPRISE HEADER */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#111827', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Shield size={32} style={{ color: '#ff6900' }} />
              Enterprise Audit Trail
            </h1>
            <p style={{ fontSize: '1rem', color: '#6b7280', margin: 0 }}>
              Chi ha fatto cosa, quando e su quale microservizio
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(34, 197, 94, 0.1)', padding: '0.75rem 1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
            <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#059669' }}>Sistema Operativo</span>
            <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '0.5rem' }}>Query: {metadata.duration}</span>
          </div>
        </div>

        {/* ✅ TIME RANGE SELECTOR FOR STATS CARDS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#374151' }}>Periodo Statistiche:</span>
          {[
            { value: 24, label: 'Ultime 24h' },
            { value: 168, label: 'Ultimi 7gg' },
            { value: 720, label: 'Ultimi 30gg' }
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatsTimeRange(opt.value as 24 | 168 | 720)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: statsTimeRange === opt.value ? '2px solid #ff6900' : '1px solid rgba(0,0,0,0.1)',
                background: statsTimeRange === opt.value ? 'rgba(255, 105, 0, 0.1)' : 'white',
                color: statsTimeRange === opt.value ? '#ff6900' : '#6b7280',
                fontWeight: statsTimeRange === opt.value ? '600' : '400',
                fontSize: '0.8125rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              data-testid={`button-stats-range-${opt.value}`}
            >
              {opt.label}
            </button>
          ))}
          {summaryLoading && <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '0.5rem' }}>Caricamento...</span>}
        </div>

        {/* ✅ STATS CARDS - 6 cards con più info */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(11.25rem, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05))', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <Database size={24} style={{ color: '#3b82f6' }} />
              <span style={{ fontSize: '0.6875rem', color: '#3b82f6', fontWeight: '600', background: 'rgba(59, 130, 246, 0.2)', padding: '2px 0.5rem', borderRadius: '0.25rem' }}>TOTALI</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#111827' }}>{totalLogs}</div>
            <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.25rem' }}>Log nelle {periodLabel}</div>
          </div>
          
          <div style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05))', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <XCircle size={24} style={{ color: '#ef4444' }} />
              <span style={{ fontSize: '0.6875rem', color: '#ef4444', fontWeight: '600', background: 'rgba(239, 68, 68, 0.2)', padding: '2px 0.5rem', borderRadius: '0.25rem' }}>ERRORI</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#ef4444' }}>{errorCount}</div>
            <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.25rem' }}>Errori rilevati</div>
          </div>
          
          <div style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05))', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <AlertTriangle size={24} style={{ color: '#f59e0b' }} />
              <span style={{ fontSize: '0.6875rem', color: '#f59e0b', fontWeight: '600', background: 'rgba(245, 158, 11, 0.2)', padding: '2px 0.5rem', borderRadius: '0.25rem' }}>WARNING</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b' }}>{warnCount}</div>
            <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.25rem' }}>Avvisi sistema</div>
          </div>
          
          <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05))', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <CheckCircle size={24} style={{ color: '#10b981' }} />
              <span style={{ fontSize: '0.6875rem', color: '#10b981', fontWeight: '600', background: 'rgba(16, 185, 129, 0.2)', padding: '2px 0.5rem', borderRadius: '0.25rem' }}>INFO</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981' }}>{infoCount}</div>
            <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.25rem' }}>Operazioni normali</div>
          </div>
          
          <div style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.05))', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <Clock size={24} style={{ color: '#8b5cf6' }} />
              <span style={{ fontSize: '0.6875rem', color: '#8b5cf6', fontWeight: '600', background: 'rgba(139, 92, 246, 0.2)', padding: '2px 0.5rem', borderRadius: '0.25rem' }}>PERF</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#8b5cf6' }}>{analytics.queryPerformance}ms</div>
            <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.25rem' }}>Latenza query</div>
          </div>
          
          <div style={{ background: 'linear-gradient(135deg, rgba(107, 114, 128, 0.1), rgba(107, 114, 128, 0.05))', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid rgba(107, 114, 128, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <Activity size={24} style={{ color: '#6b7280' }} />
              <span style={{ fontSize: '0.6875rem', color: '#6b7280', fontWeight: '600', background: 'rgba(107, 114, 128, 0.2)', padding: '2px 0.5rem', borderRadius: '0.25rem' }}>DEBUG</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#6b7280' }}>{debugCount}</div>
            <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.25rem' }}>Log debug</div>
          </div>
        </div>

        {/* ✅ CHARTS ROW - Distribution by Level & Top Components */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(18.75rem, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
          {/* Level Distribution */}
          <div style={{ background: 'rgba(255, 255, 255, 0.8)', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '1rem' }}>Distribuzione per Livello</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { label: 'ERROR', count: errorCount, color: '#ef4444', percent: totalLogs > 0 ? (errorCount / totalLogs * 100).toFixed(1) : 0 },
                { label: 'WARN', count: warnCount, color: '#f59e0b', percent: totalLogs > 0 ? (warnCount / totalLogs * 100).toFixed(1) : 0 },
                { label: 'INFO', count: infoCount, color: '#3b82f6', percent: totalLogs > 0 ? (infoCount / totalLogs * 100).toFixed(1) : 0 },
                { label: 'DEBUG', count: debugCount, color: '#6b7280', percent: totalLogs > 0 ? (debugCount / totalLogs * 100).toFixed(1) : 0 },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ width: '3.125rem', fontSize: '0.75rem', fontWeight: '600', color: item.color }}>{item.label}</span>
                  <div style={{ flex: 1, height: '0.5rem', background: 'rgba(0,0,0,0.05)', borderRadius: '0.25rem', overflow: 'hidden' }}>
                    <div style={{ width: `${item.percent}%`, height: '100%', background: item.color, borderRadius: '0.25rem', transition: 'width 0.3s' }} />
                  </div>
                  <span style={{ width: '3.75rem', fontSize: '0.75rem', color: '#6b7280', textAlign: 'right' }}>{item.count} ({item.percent}%)</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Top Microservizi */}
          <div style={{ background: 'rgba(255, 255, 255, 0.8)', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '1rem' }}>Top Microservizi</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {topServices.length === 0 ? (
                <div style={{ color: '#6b7280', fontSize: '0.8125rem' }}>Nessuna attività registrata</div>
              ) : topServices.map(([svc, count]: any, idx) => (
                <div key={svc} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ width: '1.25rem', fontSize: '0.75rem', fontWeight: '600', color: '#ff6900' }}>#{idx + 1}</span>
                  <span style={{ flex: 1, fontSize: '0.8125rem', fontWeight: '500', color: '#374151' }}>{svc}</span>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280', background: 'rgba(0,0,0,0.05)', padding: '2px 0.5rem', borderRadius: '0.25rem' }}>{count} attività</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ✅ FILTERS BAR */}
        <div style={{ background: 'rgba(255, 255, 255, 0.8)', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.25rem', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} style={{ color: '#6b7280' }} />
            <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#374151' }}>Filtri:</span>
          </div>
          <select
            value={enterpriseAuditLevel}
            onChange={(e) => setEnterpriseAuditLevel(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.8125rem', background: 'white', cursor: 'pointer' }}
            data-testid="select-audit-level"
          >
            {availableLevels.map(level => (
              <option key={level} value={level}>{level === 'ALL' ? 'Tutti i Livelli' : level}</option>
            ))}
          </select>
          <select
            value={enterpriseAuditComponent}
            onChange={(e) => setEnterpriseAuditComponent(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.8125rem', background: 'white', cursor: 'pointer' }}
            data-testid="select-audit-service"
          >
            {availableServices.map(svc => (
              <option key={svc} value={svc}>{svc === 'ALL' ? 'Tutti i Microservizi' : svc}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Cerca utente o azione..."
            value={enterpriseAuditSearch}
            onChange={(e) => setEnterpriseAuditSearch(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.8125rem', minWidth: '12.5rem' }}
            data-testid="input-audit-search"
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginLeft: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Dal:</span>
            <input
              type="date"
              value={enterpriseAuditDateFrom}
              onChange={(e) => setEnterpriseAuditDateFrom(e.target.value)}
              style={{ padding: '0.375rem 0.625rem', borderRadius: '0.5rem', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.75rem', background: 'white' }}
              data-testid="input-audit-date-from"
            />
            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Al:</span>
            <input
              type="date"
              value={enterpriseAuditDateTo}
              onChange={(e) => setEnterpriseAuditDateTo(e.target.value)}
              style={{ padding: '0.375rem 0.625rem', borderRadius: '0.5rem', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.75rem', background: 'white' }}
              data-testid="input-audit-date-to"
            />
          </div>
          <button
            onClick={() => { setEnterpriseAuditLevel('ALL'); setEnterpriseAuditComponent('ALL'); setEnterpriseAuditSearch(''); setEnterpriseAuditDateFrom(''); setEnterpriseAuditDateTo(''); }}
            style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.8125rem', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
            data-testid="button-reset-audit-filters"
          >
            <RotateCcw size={14} />
            Reset
          </button>
        </div>

        {/* ✅ ENTERPRISE LOGS TABLE - Real Data */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.7))',
          backdropFilter: 'blur(10.3125rem)',
          borderRadius: '1rem',
          padding: '1.5rem',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 0.5rem 2rem rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', margin: 0 }}>
              Log Attività Recenti ({logs.length} di {metadata.total})
            </h2>
            <button
              onClick={() => refetchAudit()}
              style={{
                background: 'linear-gradient(135deg, #ff6900, #ff8533)',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                padding: '0.625rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              data-testid="button-refresh-logs"
            >
              <RefreshCw size={16} />
              Aggiorna
            </button>
          </div>
          
          {logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.75rem 1.25rem', color: '#6b7280' }}>
              <Database size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p style={{ fontSize: '1rem', margin: '0 0 0.5rem 0' }}>Nessuna attività registrata</p>
              <p style={{ fontSize: '0.875rem', margin: 0, opacity: 0.7 }}>Le attività degli utenti verranno tracciate automaticamente</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.1)' }}>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Quando</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Livello</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Microservizio</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Chi</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Cosa</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Entità</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: any, index: number) => (
                    <tr 
                      key={log.id || index}
                      style={{ 
                        borderBottom: '1px solid rgba(0,0,0,0.05)',
                        background: index % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)'
                      }}
                    >
                      <td style={{ padding: '0.625rem 0.5rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
                        {formatLogTimestamp(log.created_at)}
                      </td>
                      <td style={{ padding: '0.625rem 0.5rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 0.5rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.6875rem',
                          fontWeight: '600',
                          color: 'white',
                          background: log.level === 'ERROR' ? '#ef4444' : 
                                     log.level === 'WARN' ? '#f59e0b' : 
                                     log.level === 'INFO' ? '#3b82f6' : 
                                     log.level === 'DEBUG' ? '#6b7280' : '#6b7280'
                        }}>
                          {log.level || 'INFO'}
                        </span>
                      </td>
                      <td style={{ padding: '0.625rem 0.5rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 0.5rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.6875rem',
                          fontWeight: '600',
                          color: 'white',
                          background: log.service === 'WMS' ? '#3b82f6' : 
                                     log.service === 'CRM' ? '#10b981' : 
                                     log.service === 'POS' ? '#f59e0b' : 
                                     log.service === 'HR' ? '#8b5cf6' :
                                     log.service === 'AUTH' ? '#ef4444' :
                                     log.service === 'VOIP' ? '#06b6d4' : '#6b7280'
                        }}>
                          {log.service || 'SYSTEM'}
                        </span>
                      </td>
                      <td style={{ padding: '0.625rem 0.5rem', color: '#374151', fontWeight: '500' }}>
                        {log.actor_email || log.actor_role || 'sistema'}
                      </td>
                      <td style={{ padding: '0.625rem 0.5rem', color: '#111827', fontWeight: '500' }}>
                        {log.action || '-'}
                      </td>
                      <td style={{ padding: '0.625rem 0.5rem', color: '#6b7280', maxWidth: '12.5rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {log.entity_name || log.entity_type || '-'}
                        {log.entity_id && <span style={{ fontSize: '0.6875rem', color: '#9ca3af', marginLeft: '0.25rem' }}>#{log.entity_id.slice(0, 8)}</span>}
                      </td>
                      <td style={{ padding: '0.625rem 0.5rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 0.5rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.6875rem',
                          fontWeight: '600',
                          color: log.status === 'success' ? '#059669' : log.status === 'failure' ? '#dc2626' : '#d97706',
                          background: log.status === 'success' ? 'rgba(16, 185, 129, 0.1)' : 
                                     log.status === 'failure' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)'
                        }}>
                          {log.status === 'success' ? '✓ Successo' : log.status === 'failure' ? '✗ Errore' : log.status || 'OK'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination */}
          {metadata.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginTop: '1.25rem' }}>
              <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
                Pagina {metadata.page} di {metadata.totalPages}
              </span>
            </div>
          )}
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  };
  
  // Get level badge color
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return '#ef4444';
      case 'WARN': return '#f59e0b';
      case 'INFO': return '#3b82f6';
      case 'DEBUG': return '#6b7280';
      default: return '#6b7280';
    }
  };
  
  // Format timestamp for display
  const formatLogTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return timestamp;
    }
  };
  
  // Copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could show a toast notification here
      console.log('Copied to clipboard:', text);
    });
  };
  
  // Role management states
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedLegalEntities, setSelectedLegalEntities] = useState<number[]>([]);
  const [selectedStores, setSelectedStores] = useState<number[]>([]);
  
  // Handlers per Ragioni Sociali
  const handleCreateRagioneSociale = () => {
    // Apri il modal invece di creare dati mock
    setLegalEntityModal({ open: true, data: null });
  };
  
  // Handler per eliminare un utente - USA API REALE
  const handleDeleteUser = async (userId: string) => {
    try {
      const currentTenantId = DEMO_TENANT_ID;
      
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'X-Tenant-ID': currentTenantId
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete user: ${response.statusText}`);
      }

      console.log('✅ User deleted successfully');
      
      // Refresh the list dopo l'eliminazione
      await refetchUserData();
      
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      alert('Errore nell\'eliminazione dell\'utente. Riprova.');
    }
  };

  // Funzione per ricaricare i dati utenti
  const refetchUserData = async () => {
    try {
      const result = await apiService.loadSettingsData();
      if (result.success && result.data) {
        setUtentiList(result.data.users);
      }
    } catch (error) {
      console.error('Error refetching users:', error);
    }
  };

  // Handler per eliminare una ragione sociale (organization entity) - USA API REALE
  const handleDeleteRagioneSociale = async (organizationEntityId: string) => {
    try {
      const currentTenantId = DEMO_TENANT_ID;
      
      const response = await authenticatedFetch(`/api/organization-entities/${organizationEntityId}`, {
        method: 'DELETE',
        headers: {
          'X-Tenant-ID': currentTenantId
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete organization entity: ${response.statusText}`);
      }

      console.log('✅ Organization entity deleted successfully');
      
      // Refresh the list dopo l'eliminazione
      await refetchOrganizationEntities();
      
    } catch (error) {
      console.error('❌ Error deleting organization entity:', error);
      alert('Errore nell\'eliminazione della ragione sociale. Riprova.');
    }
  };

  
  // Handlers per Punti Vendita - USA API REALI
  const handleCreatePuntoVendita = () => {
    // Apri il modal invece di creare dati mock
    setStoreModal({ open: true, data: null });
  };
  
  const handleDeletePuntoVendita = async (id: string) => {
    try {
      const result = await apiService.deleteStore(id);
      if (result.success) {
        // Ricarica i dati dopo l'eliminazione
        await reloadStoreData();
      } else {
        console.error('❌ Error deleting store:', result.error);
        alert('Errore nell\'eliminazione della sede operativa. Riprova.');
      }
    } catch (error) {
      console.error('❌ Error deleting store:', error);
      alert('Errore nell\'eliminazione della sede operativa. Riprova.');
    }
  };

  // Funzione per ricaricare i dati stores
  const reloadStoreData = async () => {
    try {
      const result = await apiService.getStores();
      if (result.success && result.data) {
        // Normalize store data to ensure consistent field names
        const normalizedStores = result.data.map((store: any) => ({
          ...store,
          organizationEntityId: store.organizationEntityId || store.organization_entity_id,
          commercialAreaId: store.commercialAreaId || store.commercial_area_id
        }));
        setPuntiVenditaList(normalizedStores);
      }
    } catch (error) {
      console.error('Error reloading stores:', error);
    }
  };
  
  // Load reference data from API - Only when Entity Management tab is active
  const { data: legalForms = [] } = useQuery<LegalForm[]>({
    queryKey: ['/api/reference/legal-forms'],
    enabled: activeTab === 'Entity Management',
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // ✅ REAL ROLES from backend API - Only when Entity Management tab is active
  const { data: rolesApiResponse, isLoading: rolesLoading, error: rolesError, refetch: refetchRoles } = useQuery<{roles: any[], total: number}>({
    queryKey: ['/api/rbac/roles', 'v3'], // v3 to use RBAC endpoint with userCount
    enabled: activeTab === 'Entity Management',
    refetchOnMount: true, // Always refetch fresh data on mount
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const rbacRolesData = {
    roles: rolesApiResponse?.roles || [],
    success: !!rolesApiResponse
  };

  // REAL permissions from backend API - Only when Entity Management tab is active
  const { data: rbacPermissionsData, isLoading: permissionsLoading } = useQuery<RBACPermissionsResponse>({
    queryKey: ['/api/rbac/permissions'],
    enabled: activeTab === 'Entity Management',
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // REAL permissions for selected role from backend API - Only when Entity Management tab is active
  const { data: selectedRolePermissions, isLoading: rolePermissionsLoading, error: rolePermissionsError } = useQuery<RolePermissionsResponse>({
    queryKey: [`/api/rbac/roles/${selectedRole}/permissions`],
    enabled: activeTab === 'Entity Management' && !!selectedRole,
    refetchOnMount: false,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
  
  // Debug logging for role permissions query
  useEffect(() => {
    console.log('[RBAC-DEBUG] Role Permissions Query State:', {
      selectedRole,
      enabled: activeTab === 'Entity Management' && !!selectedRole,
      isLoading: rolePermissionsLoading,
      hasData: !!selectedRolePermissions,
      data: selectedRolePermissions,
      error: rolePermissionsError
    });
  }, [selectedRole, rolePermissionsLoading, selectedRolePermissions, rolePermissionsError, activeTab]);
  
  // ✅ ENTERPRISE AUDIT: Load real data from unified audit trail API (for datatable)
  const enterpriseQueryParams = buildEnterpriseAuditQueryParams();
  console.log('[DATATABLE-FILTERS] Query params:', enterpriseQueryParams);
  const { data: enterpriseAuditData, isLoading: auditLoading, error: auditError, refetch: refetchAudit } = useQuery<EnterpriseAuditResponse>({
    queryKey: ['/api/audit/enterprise', enterpriseQueryParams],
    enabled: activeTab === 'Logs', // Only fetch when Logs tab is active
    refetchInterval: autoRefreshEnabled ? 30000 : false, // Auto-refetch every 30s if enabled
    staleTime: 15 * 1000, // 15 seconds for real-time feel
    retry: 3, // Enterprise resilience
  });

  // ✅ STATISTICS SUMMARY: Separate query for cards (independent from datatable filters)
  interface AuditSummaryResponse {
    period: string;
    hours: number;
    total: number;
    byLevel: { ERROR: number; WARN: number; INFO: number; DEBUG: number };
    byService: Record<string, number>;
    duration: string;
  }
  const { data: auditSummary, isLoading: summaryLoading } = useQuery<AuditSummaryResponse>({
    queryKey: ['/api/audit/enterprise/summary', { hours: statsTimeRange }],
    enabled: activeTab === 'Logs',
    staleTime: 30 * 1000,
    retry: 2,
  });

  // Legacy logs query (for backward compatibility if needed)
  const queryParams = buildLogsQueryParams();
  const { data: logsData, isLoading: logsLoading, error: logsError, refetch: refetchLogs } = useQuery<LogsResponse>({
    queryKey: ['/api/logs', queryParams],
    enabled: false, // Disabled - using enterprise audit instead
    refetchInterval: false,
    staleTime: 30 * 1000,
  });

  // TanStack Query v5 compatible effect to handle data changes
  useEffect(() => {
    if (logsData?.logs && logsData.logs.length > 0) {
      const latestTimestamp = logsData.logs[0].timestamp;
      if (lastSeenTimestamp.current && latestTimestamp > lastSeenTimestamp.current) {
        setNewLogsAvailable(true);
      }
      if (!lastSeenTimestamp.current) {
        lastSeenTimestamp.current = latestTimestamp;
      }
    }
  }, [logsData]);

  const { data: countries = [] } = useQuery({
    queryKey: ['/api/reference/countries'],
    enabled: activeTab === 'Entity Management',
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000,
  });

  const { data: italianCities = [] } = useQuery<ItalianCity[]>({
    queryKey: ['/api/reference/italian-cities'],
    enabled: activeTab === 'Entity Management',
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000,
  });

  const { data: commercialAreas = [] } = useQuery({
    queryKey: ['/api/commercial-areas'],
    enabled: activeTab === 'Entity Management',
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000,
  });

  // Load payment methods reference data - Only when Entity Management tab is active
  const { data: referencePaymentMethods = [] } = useQuery({
    queryKey: ['/api/reference/payment-methods'],
    enabled: activeTab === 'Entity Management',
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000,
  });

  
  // Clean up auto-refresh on unmount - FIXED: Use ref
  useEffect(() => {
    return () => {
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
      }
    };
  }, []);

  // Helper functions for role defaults
  const getDefaultRoleColor = (roleCode: string): string => {
    const colorMap: { [key: string]: string } = {
      // Italian role templates
      'Amministratore': '#ef4444',  // Red - admin
      'Store Manager': '#f59e0b',    // Amber
      'Area Manager': '#3b82f6',     // Blue  
      'Finance': '#10b981',          // Green
      'HR Manager': '#14b8a6',       // Teal
      'Marketing': '#ec4899',        // Pink
      'Sales Agent': '#8b5cf6',      // Purple
      'Cassiere': '#06b6d4',         // Cyan
      'Magazziniere': '#f97316',     // Orange
      'Operatore': '#6b7280',        // Gray
      // Legacy English roles (backward compatibility)
      'admin': '#ef4444',
      'finance': '#10b981',
      'direttore': '#3b82f6',
      'store_manager': '#f59e0b',
      'store_specialist': '#8b5cf6',
      'student': '#06b6d4',
      'marketing': '#ec4899',
      'hr_management': '#14b8a6',
      'custom': '#6b7280'
    };
    return colorMap[roleCode] || '#6b7280';
  };

  const getDefaultRoleDescription = (roleCode: string): string => {
    // Descriptions already come from database, just return fallback
    return 'Ruolo personalizzato';
  };

  // Get role color based on role name/code
  const getRoleColor = (roleName: string | undefined): string => {
    if (!roleName) return '#6b7280';
    const normalizedRole = roleName.toLowerCase();
    const roleMapping: { [key: string]: string } = {
      'amministratore': '#ef4444',
      'area manager': '#3b82f6', 
      'store manager': '#10b981',
      'store specialist': '#f59e0b',
      'finance': '#8b5cf6',
      'hr manager': '#06b6d4',
      'sales agent': '#84cc16',
      'cassiere': '#f97316',
      'magazziniere': '#6366f1',
      'marketing': '#ec4899'
    };
    return roleMapping[normalizedRole] || '#6b7280';
  };

  // Get status color based on status value
  const getStatusColor = (status: string | undefined): {bg: string, color: string, border: string} => {
    if (!status) return { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' };
    const normalizedStatus = status.toLowerCase();
    const statusMapping: { [key: string]: {bg: string, color: string, border: string} } = {
      'active': { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
      'attivo': { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
      'suspended': { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
      'sospeso': { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
      'inactive': { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' },
      'inattivo': { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' },
      'pending': { bg: '#e0e7ff', color: '#3730a3', border: '#c7d2fe' },
      'in_attesa': { bg: '#e0e7ff', color: '#3730a3', border: '#c7d2fe' }
    };
    return statusMapping[normalizedStatus] || { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' };
  };

  // Organize permissions by category for UI display
  // Accepts array of objects: { permission: string, description: string, category: string }
  const organizePermissionsByCategory = (permissions: Array<{ permission: string; description: string; category: string }> | string[]) => {
    const categories: { [key: string]: Array<{ permission: string; description: string }> } = {};
    
    // Normalize permissions to objects (backward compatible with old string[] format)
    const normalizedPermissions = (permissions || []).map(p => 
      typeof p === 'string' 
        ? { permission: p, description: 'Permesso di sistema', category: p.split('.')[0] || 'other' }
        : p
    );
    
    // Add workflow actions and triggers to permissions if available
    let allPermissions = [...normalizedPermissions];
    
    // Add workflow actions as permissions
    if (workflowActionsData && Array.isArray(workflowActionsData)) {
      workflowActionsData.forEach((action: any) => {
        const permString = action.requiredPermission || `workflow.action.${action.category}.${action.actionId}`;
        if (!allPermissions.find(p => p.permission === permString)) {
          allPermissions.push({
            permission: permString,
            description: action.description || `Azione workflow: ${action.name || permString}`,
            category: 'workflow'
          });
        }
      });
    }
    
    // Add workflow triggers as permissions
    if (workflowTriggersData && Array.isArray(workflowTriggersData)) {
      workflowTriggersData.forEach((trigger: any) => {
        const triggerPermission = `workflow.trigger.${trigger.category}.${trigger.triggerId}`;
        if (!allPermissions.find(p => p.permission === triggerPermission)) {
          allPermissions.push({
            permission: triggerPermission,
            description: trigger.description || `Trigger workflow: ${trigger.name || triggerPermission}`,
            category: 'workflow'
          });
        }
      });
    }
    
    allPermissions.forEach(permObj => {
      const { permission, description } = permObj;
      
      // Special handling for workflow permissions
      if (permission.startsWith('workflow.action.')) {
        const parts = permission.split('.');
        const categoryKey = `workflow-actions-${parts[2]}`; // workflow.action.hr.xxx -> workflow-actions-hr
        if (!categories[categoryKey]) {
          categories[categoryKey] = [];
        }
        categories[categoryKey].push({ permission, description });
      } else if (permission.startsWith('workflow.trigger.')) {
        const parts = permission.split('.');
        const categoryKey = `workflow-triggers-${parts[2]}`; // workflow.trigger.hr.xxx -> workflow-triggers-hr
        if (!categories[categoryKey]) {
          categories[categoryKey] = [];
        }
        categories[categoryKey].push({ permission, description });
      } else {
        // Standard permissions
        const parts = permission.split('.');
        const category = parts[0] || 'other';
        
        if (!categories[category]) {
          categories[category] = [];
        }
        categories[category].push({ permission, description });
      }
    });

    // Convert to array format with proper labels
    return Object.entries(categories).map(([category, perms]) => {
      let displayName = category;
      
      // Special display names for workflow categories
      if (category.startsWith('workflow-actions-')) {
        const service = category.replace('workflow-actions-', '');
        displayName = `Workflow Actions - ${service.toUpperCase()}`;
      } else if (category.startsWith('workflow-triggers-')) {
        const service = category.replace('workflow-triggers-', '');
        displayName = `Workflow Triggers - ${service.toUpperCase()}`;
      } else {
        displayName = category.charAt(0).toUpperCase() + category.slice(1);
      }
      
      return {
        category: displayName,
        permissions: perms
      };
    }).sort((a, b) => {
      // Sort workflow categories to the end
      if (a.category.startsWith('Workflow') && !b.category.startsWith('Workflow')) return 1;
      if (!a.category.startsWith('Workflow') && b.category.startsWith('Workflow')) return -1;
      return a.category.localeCompare(b.category);
    });
  };

  // Permission management state and functions
  // 🔧 FIX Bug #2: Store permissions per-role to prevent cross-contamination
  const [rolePermissionsMap, setRolePermissionsMap] = useState<Record<string, string[]>>({});
  const [isPermissionsDirty, setIsPermissionsDirty] = useState(false);

  // Get current role's permissions from map
  const getCurrentRolePermissions = (): string[] => {
    if (!selectedRole) return [];
    return rolePermissionsMap[selectedRole] || [];
  };

  // Initialize temp permissions when role permissions are loaded or role changes
  useEffect(() => {
    console.log('[RBAC] 🔄 Permission initialization effect triggered', {
      hasSelectedRole: !!selectedRole,
      selectedRole,
      hasRolePermissions: !!selectedRolePermissions?.permissions,
      rolePermissions: selectedRolePermissions?.permissions,
      rolePermissionsCount: selectedRolePermissions?.permissions?.length,
      hasRbacData: !!rbacPermissionsData?.permissions,
      rbacDataCount: rbacPermissionsData?.permissions?.length,
      isAlreadyInMap: !!rolePermissionsMap[selectedRole || ''],
      fullSelectedRolePermsData: selectedRolePermissions
    });

    if (selectedRolePermissions?.permissions && selectedRole) {
      // 🔧 CRITICAL: If role has wildcard '*', wait for RBAC permissions API to load
      if (selectedRolePermissions.permissions.includes('*') && !rbacPermissionsData?.permissions) {
        console.warn('[RBAC] ⏸️ Wildcard detected but RBAC data not ready - waiting...');
        return;
      }
      
      // Only initialize if this role's permissions aren't already in the map
      if (!rolePermissionsMap[selectedRole]) {
        // 🔧 FIX Bug #4: Expand wildcard '*' to all permissions for Amministratore
        let permissions = selectedRolePermissions.permissions;
        if (permissions.includes('*')) {
          // Expand wildcard '*' to all 223 permissions from API instead of hardcoded array
          const expandedPermissions = (rbacPermissionsData?.permissions || []).map(p => p.permission);
          console.log('[RBAC] ✨ Expanding wildcard * to all permissions', {
            originalCount: permissions.length,
            expandedCount: expandedPermissions.length,
            first5: expandedPermissions.slice(0, 5)
          });
          permissions = expandedPermissions;
        }
        
        console.log('[RBAC] ✅ Setting permissions in map', {
          role: selectedRole,
          permissionCount: permissions.length
        });
        
        setRolePermissionsMap(prev => ({
          ...prev,
          [selectedRole]: permissions
        }));
        // Only reset dirty flag when INITIALIZING a role, not on every map change
        setIsPermissionsDirty(false);
      } else {
        console.log('[RBAC] ℹ️ Role already in map, skipping initialization');
      }
    }
    // NOTE: rbacPermissionsData added to dependencies to trigger re-run when API data loads
    // NOTE: rolePermissionsMap is NOT in dependencies to avoid resetting dirty flag on toggle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRolePermissions, selectedRole, rbacPermissionsData]);

  // Check if a permission is currently enabled
  const isPermissionEnabled = (permission: string): boolean => {
    return getCurrentRolePermissions().includes(permission);
  };

  // Check if category switch should be ON (at least one permission is enabled)
  const isCategoryEnabled = (category: string): boolean => {
    const categoryPermissions = organizePermissionsByCategory(rbacPermissionsData?.permissions || [])
      .find(cat => cat.category === category)?.permissions || [];
    // Switch is ON if at least ONE permission is enabled, not ALL
    // This prevents the switch from turning OFF when user manually disables a single microservice
    return categoryPermissions.length > 0 && categoryPermissions.some(permObj => isPermissionEnabled(permObj.permission));
  };

  // Toggle individual permission
  const togglePermission = (permission: string) => {
    if (!selectedRole) return;
    
    const currentPermissions = getCurrentRolePermissions();
    const newPermissions = isPermissionEnabled(permission)
      ? currentPermissions.filter(p => p !== permission)
      : [...currentPermissions, permission];
    
    setRolePermissionsMap(prev => ({
      ...prev,
      [selectedRole]: newPermissions
    }));
    setIsPermissionsDirty(true);
  };

  // Toggle all permissions in a category
  const toggleCategoryPermissions = (category: string, enabled: boolean) => {
    if (!selectedRole) return;
    
    const categoryPermissionsObjs = organizePermissionsByCategory(rbacPermissionsData?.permissions || [])
      .find(cat => cat.category === category)?.permissions || [];
    
    // Extract permission strings from objects
    const categoryPermissions = categoryPermissionsObjs.map(p => p.permission);
    
    const currentPermissions = getCurrentRolePermissions();
    let newPermissions = [...currentPermissions];
    
    if (enabled) {
      // Add all category permissions
      categoryPermissions.forEach(perm => {
        if (!newPermissions.includes(perm)) {
          newPermissions.push(perm);
        }
      });
    } else {
      // Remove all category permissions
      newPermissions = newPermissions.filter(perm => !categoryPermissions.includes(perm));
    }
    
    setRolePermissionsMap(prev => ({
      ...prev,
      [selectedRole]: newPermissions
    }));
    setIsPermissionsDirty(true);
  };

  // Save permissions for selected role
  const saveRolePermissions = async () => {
    if (!selectedRole) return;

    try {
      const currentPermissions = getCurrentRolePermissions();
      
      // Update permissions in local state
      const isCustomRole = !HARDCODED_ROLES.find(r => r.code === selectedRole);
      
      if (isCustomRole) {
        // Update custom role permissions
        setCustomRoles(prev => prev.map(role => 
          role.code === selectedRole 
            ? { ...role, permissions: currentPermissions }
            : role
        ));
      } else {
        // For hardcoded roles, we can only update them temporarily in this session
        // In a real app, you might want to save this to localStorage or a backend
        console.log('Note: Hardcoded role permissions updated for this session only');
      }
      
      setIsPermissionsDirty(false);
      
      // Show success message
      console.log('✅ Permessi aggiornati con successo');
      showNotification('Permessi aggiornati con successo', 'success');
    } catch (error) {
      console.error('❌ Errore nel salvataggio dei permessi:', error);
      showNotification('Errore nel salvataggio dei permessi', 'error');
    }
  };

  // Create custom role modal state and functions
  const [createRoleModalOpen, setCreateRoleModalOpen] = useState(false);
  const [newRoleData, setNewRoleData] = useState({
    code: '',
    name: '',
    description: '',
    isSystemRole: false,
    color: '#6b7280'
  });
  
  // Custom roles state moved up before allRoles declaration

  const createCustomRole = async () => {
    try {
      // Validate required fields
      if (!newRoleData.name.trim() || !newRoleData.code.trim()) {
        showNotification('Nome e codice sono obbligatori', 'error');
        return;
      }
      
      // Check if code already exists in hardcoded roles or custom roles
      const existingRole = [...HARDCODED_ROLES, ...customRoles].find(r => r.code === newRoleData.code);
      if (existingRole) {
        showNotification('Un ruolo con questo codice esiste già', 'error');
        return;
      }
      
      // Create new custom role
      const newRole = {
        ...newRoleData,
        id: newRoleData.code,
        permissions: [] // Start with no permissions
      };
      
      // Add to custom roles
      setCustomRoles(prev => [...prev, newRole]);
      
      // Reset form and close modal
      setCreateRoleModalOpen(false);
      setNewRoleData({ code: '', name: '', description: '', isSystemRole: false, color: '#6b7280' });
      
      console.log('✅ Ruolo personalizzato creato con successo:', newRole);
      showNotification('Ruolo personalizzato creato con successo', 'success');
    } catch (error) {
      console.error('❌ Errore nella creazione del ruolo:', error);
      showNotification('Errore nella creazione del ruolo', 'error');
    }
  };

  // Delete role functionality
  const deleteRole = async (roleId: string, roleName: string, isSystemRole: boolean) => {
    if (isSystemRole) {
      showNotification('Non è possibile eliminare un ruolo di sistema', 'error');
      return;
    }

    if (!confirm(`Sei sicuro di voler eliminare il ruolo "${roleName}"?`)) {
      return;
    }

    try {
      // Remove from custom roles
      setCustomRoles(prev => prev.filter(r => r.id !== roleId));
      
      // If the deleted role was selected, clear selection
      if (selectedRole === roleId) {
        setSelectedRole(null);
        setTempPermissions([]);
        setIsPermissionsDirty(false);
      }
      
      console.log(`✅ Ruolo "${roleName}" eliminato con successo`);
      showNotification(`Ruolo "${roleName}" eliminato con successo`, 'success');
    } catch (error) {
      console.error('❌ Errore nell\'eliminazione del ruolo:', error);
      showNotification('Errore nell\'eliminazione del ruolo', 'error');
    }
  };

  // Simple notification system
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error'; id: number } | null>(null);
  
  const showNotification = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setNotification({ message, type, id });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Validation functions
  const validateCodiceFiscale = (cf: string): boolean => {
    // Basic Italian fiscal code validation
    const cfRegex = /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/;
    return cfRegex.test(cf.toUpperCase());
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleCityChange = (cityName: string) => {
    setSelectedCity(cityName);
    const city = italianCities.find((c) => c.name === cityName);
    if (city) {
      setPostalCode(city.postalCode);
    }
  };

  const tabs = [
    { id: 'Entity Management', label: 'Gestione Organizzazione', icon: Building2 },
    { id: 'Legal Entity', label: 'Entità Legali', icon: Landmark },
    { id: 'AI Assistant', label: 'AI Assistant', icon: Cpu },
    { id: 'Channel Settings', label: 'Channel Settings', icon: Globe },
    { id: 'System Settings', label: 'System Settings', icon: Server },
    { id: 'Logs', label: 'Logs', icon: FileText }
  ];

  const renderEntityManagement = () => (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: '600',
          color: '#111827',
          margin: '0 0 0.25rem 0'
        }}>
          Configurazione Entità
        </h2>
        <p style={{
          fontSize: '0.875rem',
          color: '#6b7280',
          margin: 0
        }}>
          Gestisci entità aziendali, ragioni sociali e punti vendita
        </p>
      </div>

      {/* Sezione Icone Configurazione - Barra con tutte le entità */}
      <div style={{
        background: 'hsla(255, 255, 255, 0.08)',
        backdropFilter: 'blur(1.5rem) saturate(140%)',
        WebkitBackdropFilter: 'blur(1.5rem) saturate(140%)',
        border: '1px solid hsla(255, 255, 255, 0.12)',
        borderRadius: '1rem',
        padding: '1.25rem',
        marginBottom: '2rem',
        boxShadow: '0 0.25rem 1.25rem rgba(0, 0, 0, 0.08)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(11.25rem, 1fr))',
          alignItems: 'center',
          gap: '1rem'
        }}>
          {[
            { id: 'ragione-sociale', icon: Building2, label: 'Ragione Sociale', color: '#FF6900' },
            { id: 'punti-vendita', icon: Store, label: 'Sedi Operative', color: '#7B2CBF' },
            { id: 'utenti', icon: Users, label: 'Utenti', color: '#3b82f6' },
            { id: 'gestione-ruoli', icon: UserCog, label: 'Gestione Ruoli', color: '#8339ff' }
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                onClick={() => setSelectedEntity(item.id)}
                style={{
                  background: selectedEntity === item.id 
                    ? `linear-gradient(135deg, ${item.color}15, ${item.color}08)`
                    : 'transparent',
                  border: selectedEntity === item.id 
                    ? `1px solid ${item.color}30`
                    : '1px solid transparent',
                  borderRadius: '0.75rem',
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(0.5rem)',
                  WebkitBackdropFilter: 'blur(0.5rem)'
                }}
                onMouseOver={(e) => {
                  if (selectedEntity !== item.id) {
                    e.currentTarget.style.background = `${item.color}10`;
                    e.currentTarget.style.borderColor = `${item.color}20`;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseOut={(e) => {
                  if (selectedEntity !== item.id) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                <Icon size={16} style={{ color: selectedEntity === item.id ? item.color : '#6b7280' }} />
                <span style={{
                  fontSize: '0.875rem',
                  fontWeight: selectedEntity === item.id ? '600' : '500',
                  color: selectedEntity === item.id ? item.color : '#6b7280'
                }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ragioni Sociali Section */}
      {selectedEntity === 'ragione-sociale' && (
        <div style={{ marginBottom: '3rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem'
        }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#111827',
            margin: 0
          }}>
            Ragioni Sociali ({ragioneSocialiList.length} elementi)
          </h3>
          <button style={{
            background: 'linear-gradient(135deg, #FF6900, #ff8533)',
            color: 'white',
            border: 'none',
            borderRadius: '0.75rem',
            padding: '0.625rem 1.25rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 0.25rem 0.75rem rgba(255, 105, 0, 0.3)',
            transition: 'all 0.2s ease'
          }}
          onClick={() => {
            setNewRagioneSociale({
              codice: '',
              nome: '',
              formaGiuridica: 'Srl',
              pIva: '',
              codiceFiscale: '',
              indirizzo: '',
              citta: '',
              cap: '',
              provincia: '',
              telefono: '',
              email: '',
              pec: '',
              stato: 'Attiva',
              // Missing enterprise fields for 1:1 integrity
              capitaleSociale: '',
              dataCostituzione: '',
              rea: '',
              registroImprese: '',
              // New enterprise fields
              logo: '',
              codiceSDI: '',
              // Administrative contact section
              refAmminNome: '',
              refAmminCognome: '',
              refAmminEmail: '',
              refAmminCodiceFiscale: '',
              refAmminIndirizzo: '',
              refAmminCitta: '',
              refAmminCap: '',
              refAmminPaese: '',
              // Notes field
              note: ''
            });
            setLegalEntityModal({ open: true, data: null });
          }}>
            <Plus size={16} />
            Nuova Ragione Sociale
          </button>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '1rem',
          overflow: 'hidden',
          boxShadow: '0 0.25rem 1.25rem rgba(0, 0, 0, 0.08)',
          border: '1px solid #e5e7eb'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #f9fafb, #f3f4f6)' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Codice</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Ragione Sociale</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>P.IVA / C.F.</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Città</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Stato</th>
                <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8125rem', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {ragioneSocialiList.map((item, index) => (
                <tr key={item.id} style={{ 
                  borderBottom: '1px solid #f3f4f6',
                  transition: 'background 0.2s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#fafbfc'}
                onMouseOut={(e) => e.currentTarget.style.background = 'white'}>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#111827', fontWeight: '600' }}>
                    {item.codice}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.875rem', color: '#111827', fontWeight: '600' }}>{item.nome}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{item.formaGiuridica}</div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.8125rem', color: '#6b7280' }}>
                    <div>
                      <div>P.IVA: {item.pIva}</div>
                      <div>C.F.: {item.codiceFiscale}</div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.8125rem', color: '#6b7280' }}>
                    {item.citta} ({item.provincia})
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '0.25rem 0.75rem',
                      background: item.stato === 'Attiva' 
                        ? '#dcfce7'
                        : item.stato === 'Sospesa'
                        ? '#fef3c7'
                        : item.stato === 'Bozza'
                        ? '#e0e7ff'
                        : item.stato === 'Cessata'
                        ? '#fecaca'
                        : item.stato === 'Trasferita'
                        ? '#fed7aa'
                        : '#f1f5f9',
                      color: item.stato === 'Attiva' 
                        ? '#15803d' 
                        : item.stato === 'Sospesa'
                        ? '#d97706'
                        : item.stato === 'Bozza'
                        ? '#4338ca'
                        : item.stato === 'Cessata'
                        ? '#dc2626'
                        : item.stato === 'Trasferita'
                        ? '#ea580c'
                        : '#475569',
                      border: `1px solid ${item.stato === 'Attiva' 
                        ? '#bbf7d0' 
                        : item.stato === 'Sospesa'
                        ? '#fcd34d'
                        : item.stato === 'Bozza'
                        ? '#c7d2fe'
                        : item.stato === 'Cessata'
                        ? '#fca5a5'
                        : item.stato === 'Trasferita'
                        ? '#fdba74'
                        : '#e2e8f0'}`,
                      borderRadius: '1.25rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      boxShadow: '0 2px 0.25rem rgba(0, 0, 0, 0.1)'
                    }}>
                      <div style={{
                        width: '0.375rem',
                        height: '0.375rem',
                        borderRadius: '50%',
                        background: 'white'
                      }} />
                      {item.stato}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button
                        onClick={() => setLegalEntityModal({ open: true, data: item })}
                        style={{
                          background: 'transparent',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.375rem',
                          padding: '0.375rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = '#f3f4f6';
                          e.currentTarget.style.borderColor = '#9ca3af';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }}>
                        <Edit3 size={14} style={{ color: '#6b7280' }} />
                      </button>
                      <button
                        onClick={() => handleDeleteRagioneSociale(item.id)}
                        style={{
                          background: 'transparent',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.375rem',
                          padding: '0.375rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = '#fee2e2';
                          e.currentTarget.style.borderColor = '#fca5a5';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }}>
                        <Trash2 size={14} style={{ color: '#ef4444' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Sedi Operative Section */}
      {selectedEntity === 'punti-vendita' && (
        <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem'
            }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#111827',
                margin: 0
              }}>
                Sedi Operative
              </h3>
              <button style={{
                background: 'linear-gradient(135deg, #7B2CBF, #9333ea)',
                color: 'white',
                border: 'none',
                borderRadius: '0.75rem',
                padding: '0.625rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 0.25rem 0.75rem rgba(123, 44, 191, 0.3)',
                transition: 'all 0.2s ease'
              }}
              onClick={() => setStoreModal({ open: true, data: null })}>
                <Plus size={16} />
                Nuova Sede Operativa
              </button>
            </div>

        <div style={{
          background: 'white',
          borderRadius: '1rem',
          overflow: 'hidden',
          boxShadow: '0 0.25rem 1.25rem rgba(0, 0, 0, 0.08)',
          border: '1px solid #e5e7eb'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #f9fafb, #f3f4f6)' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Codice</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Categoria</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Nome</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Indirizzo</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Area</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Canale</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Stato</th>
                <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8125rem', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {puntiVenditaList.map((item, index) => (
                <tr key={item.id} style={{ 
                  borderBottom: '1px solid #f3f4f6',
                  transition: 'background 0.2s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#fafbfc'}
                onMouseOut={(e) => e.currentTarget.style.background = 'white'}>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#111827', fontWeight: '600' }}>
                    {item.code}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '0.25rem 0.75rem',
                      background: item.category === 'sales_point' 
                        ? '#fef3f0'   // Orange for sales
                        : item.category === 'office'
                        ? '#f0f9ff'   // Blue for office
                        : item.category === 'warehouse'
                        ? '#f0fdf4'   // Green for warehouse
                        : '#f1f5f9',  // Default gray
                      color: item.category === 'sales_point' 
                        ? '#ea580c' 
                        : item.category === 'office'
                        ? '#0369a1'
                        : item.category === 'warehouse'
                        ? '#047857'
                        : '#475569',
                      border: `1px solid ${item.category === 'sales_point' 
                        ? '#fed7aa' 
                        : item.category === 'office'
                        ? '#e0f2fe'
                        : item.category === 'warehouse'
                        ? '#bbf7d0'
                        : '#e2e8f0'}`,
                      borderRadius: '1.25rem',
                      fontSize: '0.6875rem',
                      fontWeight: '600'
                    }}>
                      {item.category === 'sales_point' && '🏪 Vendita'}
                      {item.category === 'office' && '🏢 Ufficio'}
                      {item.category === 'warehouse' && '📦 Magazzino'}
                      {!item.category && '🏪 Vendita'} {/* Default fallback */}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.875rem', color: '#111827', fontWeight: '600' }}>{item.nome}</div>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>{item.address}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '0.25rem 0.75rem',
                      background: '#f0f9ff',
                      color: '#0369a1',
                      borderRadius: '1.25rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      border: '1px solid #e0f2fe'
                    }}>
                      {item.commercial_area_name || 'Non assegnata'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '0.25rem 0.75rem',
                      background: item.channel_name === 'Franchising' 
                        ? '#fef3f0'
                        : item.channel_name === 'Top Dealer'
                        ? '#f0f9ff'
                        : item.channel_name === 'Dealer'
                        ? '#faf5ff'
                        : '#f1f5f9',
                      color: item.channel_name === 'Franchising' 
                        ? '#ea580c' 
                        : item.channel_name === 'Top Dealer'
                        ? '#0369a1'
                        : item.channel_name === 'Dealer'
                        ? '#7c3aed'
                        : '#475569',
                      border: `1px solid ${item.channel_name === 'Franchising' 
                        ? '#fed7aa' 
                        : item.channel_name === 'Top Dealer'
                        ? '#e0f2fe'
                        : item.channel_name === 'Dealer'
                        ? '#e9d5ff'
                        : '#e2e8f0'}`,
                      borderRadius: '1.25rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      boxShadow: '0 2px 0.25rem rgba(0, 0, 0, 0.1)'
                    }}>
                      <div style={{
                        width: '0.375rem',
                        height: '0.375rem',
                        borderRadius: '50%',
                        background: 'white'
                      }} />
                      {item.channel_name || 'N/A'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '0.25rem 0.75rem',
                      background: (item.status === 'Attivo' || item.status === 'active')
                        ? '#dcfce7'
                        : (item.status === 'Sospeso' || item.status === 'suspended')
                        ? '#fef3c7'
                        : item.status === 'Bozza'
                        ? '#e0e7ff'
                        : item.status === 'Cessato'
                        ? '#fecaca'
                        : item.status === 'Trasferito'
                        ? '#fed7aa'
                        : '#f1f5f9',
                      color: (item.status === 'Attivo' || item.status === 'active')
                        ? '#15803d' 
                        : (item.status === 'Sospeso' || item.status === 'suspended')
                        ? '#d97706'
                        : item.status === 'Bozza'
                        ? '#4338ca'
                        : item.status === 'Cessato'
                        ? '#dc2626'
                        : item.status === 'Trasferito'
                        ? '#ea580c'
                        : '#475569',
                      border: `1px solid ${(item.status === 'Attivo' || item.status === 'active')
                        ? '#bbf7d0' 
                        : (item.status === 'Sospeso' || item.status === 'suspended')
                        ? '#fcd34d'
                        : item.status === 'Bozza'
                        ? '#c7d2fe'
                        : item.status === 'Cessato'
                        ? '#fca5a5'
                        : item.status === 'Trasferito'
                        ? '#fdba74'
                        : '#e2e8f0'}`,
                      borderRadius: '1.25rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      boxShadow: '0 2px 0.25rem rgba(0, 0, 0, 0.1)'
                    }}>
                      <div style={{
                        width: '0.375rem',
                        height: '0.375rem',
                        borderRadius: '50%',
                        background: 'white'
                      }} />
                      {item.status === 'active' ? 'Attivo' : item.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button
                        onClick={() => setSelectedStoreId(item.id)}
                        style={{
                          background: 'transparent',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.375rem',
                          padding: '0.375rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = '#fef3f0';
                          e.currentTarget.style.borderColor = '#ff6900';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }}
                        title="Configura Store (GPS, Social, Marketing, WhatsApp)">
                        <Settings size={14} style={{ color: '#ff6900' }} />
                      </button>
                      <button
                        onClick={() => setCalendarModal({ open: true, storeId: item.id, storeName: item.nome })}
                        style={{
                          background: 'transparent',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.375rem',
                          padding: '0.375rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = '#f0f9ff';
                          e.currentTarget.style.borderColor = '#3b82f6';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }}
                        title="Calendario Orari e Aperture"
                        data-testid={`btn-calendar-store-${item.id}`}>
                        <CalendarIcon size={14} style={{ color: '#3b82f6' }} />
                      </button>
                      <button
                        onClick={() => setStoreModal({ open: true, data: item })}
                        style={{
                          background: 'transparent',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.375rem',
                          padding: '0.375rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = '#f3f4f6';
                          e.currentTarget.style.borderColor = '#9ca3af';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }}>
                        <Edit3 size={14} style={{ color: '#6b7280' }} />
                      </button>
                      <button
                        onClick={() => handleDeletePuntoVendita(item.id)}
                        style={{
                          background: 'transparent',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.375rem',
                          padding: '0.375rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = '#fee2e2';
                          e.currentTarget.style.borderColor = '#fca5a5';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }}>
                        <Trash2 size={14} style={{ color: '#ef4444' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}
      
      {/* Placeholder per altre sezioni */}
      {selectedEntity === 'utenti' && (
        <div style={{ marginBottom: '3rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem'
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              Utenti e Risorse
            </h3>
            <button style={{
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: 'white',
              border: 'none',
              borderRadius: '0.75rem',
              padding: '0.625rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 0.25rem 0.75rem rgba(59, 130, 246, 0.3)',
              transition: 'all 0.2s ease'
            }}
            onClick={() => {
              setNewUser({
                username: '',
                password: '',
                confirmPassword: '',
                ruolo: '',
                cambioPasswordObbligatorio: true,
                ragioneSociale_id: null,
                puntiVendita_ids: [] as number[],
                puntoVenditaPreferito_id: null,
                nome: '',
                cognome: '',
                avatar: {
                  url: null,
                  blob: null,
                  type: 'upload' as 'upload' | 'generated'
                },
                codiceFiscale: '',
                dataNascita: '',
                luogoNascita: '',
                sesso: 'M',
                email: '',
                emailPersonale: '',
                telefono: '',
                telefonoAziendale: '',
                via: '',
                civico: '',
                citta: '',
                cap: '',
                provincia: '',
                paese: 'Italia',
                scopeLevel: 'organizzazione',
                selectAllLegalEntities: false,
                selectedAreas: [] as string[],
                selectedLegalEntities: [] as number[],
                selectedStores: [] as number[],
                tipoDocumento: 'Carta Identità',
                numeroDocumento: '',
                dataScadenzaDocumento: '',
                stato: 'Attivo',
                dataInizioValidita: '',
                dataFineValidita: '',
                notificheEmail: true,
                notificheSMS: false,
                lingua: 'it',
                fuso: 'Europe/Rome',
                tipoContratto: 'Indeterminato',
                dataAssunzione: '',
                livello: '',
                ccnl: 'Commercio',
                oreLavoro: '40',
                note: ''
              });
              setUserModal({ open: true, data: null });
            }}>
              <Plus size={16} />
              Nuovo Utente
            </button>
          </div>

          {/* Tabella Utenti */}
          <div style={{
            background: 'white',
            borderRadius: '0.75rem',
            overflow: 'hidden',
            boxShadow: '0 0.25rem 1.25rem rgba(0, 0, 0, 0.08)',
            border: '1px solid #e5e7eb'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, #f9fafb, #f3f4f6)' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Nome Completo</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Email</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Ruolo</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Accesso</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Telefono</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Stato</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8125rem', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {utentiList.map((user, index) => (
                  <tr key={user.id} style={{ 
                    borderBottom: '1px solid #f3f4f6',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#fafbfc'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'white'}>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#111827', fontWeight: '500' }}>
                      {user.firstName || user.first_name || ''} {user.lastName || user.last_name || ''}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                      {user.email || 'N/A'}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '1.25rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: getRoleColor(user.role_name || user.role) + '20',
                        color: getRoleColor(user.role_name || user.role),
                        border: `1px solid ${getRoleColor(user.role_name || user.role)}40`
                      }}>
                        <div style={{
                          width: '0.5rem',
                          height: '0.5rem',
                          borderRadius: '50%',
                          backgroundColor: getRoleColor(user.role_name || user.role)
                        }}></div>
                        {user.role_name || user.role || 'Operatore'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.8125rem', color: '#374151' }}>
                      {(() => {
                        const userStores = user.stores || user.scope?.stores || [];
                        const userOrgs = user.organization_entities || user.scope?.organization_entities || [];
                        const tenantWide = user.tenant_wide || user.scope?.tenant_wide || false;
                        
                        if (tenantWide) {
                          return (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', borderRadius: '0.375rem', background: '#dbeafe', color: '#1e40af', fontSize: '0.75rem', fontWeight: '500' }} title="Accesso completo a tutto il tenant" data-testid="scope-badge-tenant">
                              🌐 Totale
                            </span>
                          );
                        }
                        
                        if (userOrgs.length > 0) {
                          const orgNames = userOrgs.map((o: any) => o.name || o.organization_name || 'Org').filter(Boolean);
                          const storeCount = userStores.length;
                          const tooltip = orgNames.length > 0 
                            ? orgNames.join(', ') + (storeCount > 0 ? ` (${storeCount} punti vendita)` : '')
                            : `${userOrgs.length} organizzazioni`;
                          return (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', borderRadius: '0.375rem', background: '#fef3c7', color: '#92400e', fontSize: '0.75rem', fontWeight: '500', cursor: 'help' }} title={tooltip} data-testid="scope-badge-org">
                              🏢 {userOrgs.length} {userOrgs.length === 1 ? 'Organizzazione' : 'Organizzazioni'}
                            </span>
                          );
                        }
                        
                        if (userStores.length > 0) {
                          const storeNames = userStores.map((s: any) => s.name || s.store_name || 'Store').filter(Boolean);
                          const tooltip = storeNames.length > 0 ? storeNames.join(', ') : `${userStores.length} punti vendita`;
                          return (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', borderRadius: '0.375rem', background: '#d1fae5', color: '#065f46', fontSize: '0.75rem', fontWeight: '500', cursor: 'help' }} title={tooltip} data-testid="scope-badge-store">
                              🏪 {userStores.length} {userStores.length === 1 ? 'Punto Vendita' : 'Punti Vendita'}
                            </span>
                          );
                        }
                        
                        return (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', borderRadius: '0.375rem', background: '#f3f4f6', color: '#6b7280', fontSize: '0.75rem', fontWeight: '500', cursor: 'help' }} title="Nessun accesso assegnato - contattare l'amministratore" data-testid="scope-badge-none">
                            ⚠️ Non assegnato
                          </span>
                        );
                      })()}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.8125rem', color: '#6b7280' }}>
                      {user.phone || 'N/A'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '1.25rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: getStatusColor(user.status).bg,
                        color: getStatusColor(user.status).color,
                        border: `1px solid ${getStatusColor(user.status).border}`
                      }}>
                        <div style={{
                          width: '0.5rem',
                          height: '0.5rem',
                          borderRadius: '50%',
                          backgroundColor: getStatusColor(user.status).color
                        }}></div>
                        {user.status === 'Active' ? 'Attivo' : (user.status === 'Suspended' ? 'Sospeso' : user.status || 'Inattivo')}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button
                          onClick={() => setUserModal({ open: true, data: user })}
                          style={{
                          background: 'transparent',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.375rem',
                          padding: '0.375rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = '#f3f4f6';
                          e.currentTarget.style.borderColor = '#9ca3af';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }}
                        title="Modifica utente">
                          <Edit3 size={14} style={{ color: '#6b7280' }} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          style={{
                          background: 'transparent',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.375rem',
                          padding: '0.375rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = '#fee2e2';
                          e.currentTarget.style.borderColor = '#fca5a5';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }}
                        title="Elimina utente">
                          <Trash2 size={14} style={{ color: '#ef4444' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Gestione Ruoli */}
      {selectedEntity === 'gestione-ruoli' && (
        <div>
          {/* Header sezione */}
          <div style={{
            background: 'hsla(255, 255, 255, 0.08)',
            backdropFilter: 'blur(1.5rem) saturate(140%)',
            WebkitBackdropFilter: 'blur(1.5rem) saturate(140%)',
            border: '1px solid hsla(255, 255, 255, 0.12)',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            marginBottom: '2rem',
            boxShadow: '0 0.25rem 1.25rem rgba(0, 0, 0, 0.08)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #8339ff, #6b2cbf)',
                  borderRadius: '0.75rem',
                  padding: '0.625rem',
                  boxShadow: '0 0.25rem 0.75rem rgba(131, 57, 255, 0.3)'
                }}>
                  <UserCog size={20} style={{ color: 'white' }} />
                </div>
                <div>
                  <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#111827',
                    margin: 0
                  }}>
                    Gestione Ruoli e Permessi
                  </h3>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    margin: '0.25rem 0 0 0'
                  }}>
                    Configura template di ruoli e gestisci capability per tenant
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  console.log('🔘 Bottone "Crea Ruolo Custom" cliccato');
                  setCreateRoleModalOpen(true);
                  console.log('🔘 createRoleModalOpen impostato a true');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1.25rem',
                  background: 'linear-gradient(135deg, #8339ff, #6b2cbf)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 0.25rem 0.75rem rgba(131, 57, 255, 0.3)',
                  zIndex: 10
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 0.5rem 1.25rem rgba(131, 57, 255, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 0.25rem 0.75rem rgba(131, 57, 255, 0.3)';
                }}
              >
                <Plus size={16} />
                Crea Ruolo Custom
              </button>
            </div>
            
            {/* Template di Ruoli */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(23.125rem, 1fr))',
              gap: '1rem'
            }}>
              {rolesLoading ? (
                // Loading skeleton for roles
                Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} style={{
                    background: 'hsla(255, 255, 255, 0.05)',
                    border: '1px solid hsla(255, 255, 255, 0.08)',
                    borderRadius: '0.75rem',
                    padding: '1.25rem',
                    position: 'relative',
                    cursor: 'pointer',
                    animation: 'pulse 2s infinite'
                  }}>
                    <div style={{ height: '3px', background: '#e5e7eb', borderRadius: '2px', marginBottom: '0.75rem' }} />
                    <div style={{ height: '1rem', background: '#e5e7eb', borderRadius: '0.25rem', marginBottom: '0.25rem', width: '60%' }} />
                    <div style={{ height: '0.75rem', background: '#e5e7eb', borderRadius: '0.25rem', marginBottom: '0.75rem', width: '80%' }} />
                    <div style={{ height: '0.75rem', background: '#e5e7eb', borderRadius: '0.25rem', width: '40%' }} />
                  </div>
                ))
              ) : rolesError ? (
                <div style={{
                  gridColumn: '1 / -1',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  textAlign: 'center',
                  color: '#dc2626'
                }}>
                  <AlertTriangle size={20} style={{ marginBottom: '0.5rem' }} />
                  <p style={{ margin: 0, fontSize: '0.875rem' }}>
                    Errore nel caricamento dei ruoli. <button onClick={() => refetchRoles()} style={{ color: '#dc2626', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>Riprova</button>
                  </p>
                </div>
              ) : (
                (rbacRolesData.roles || []).map((role: any) => {
                  // Add default colors and fallback data
                  const roleWithDefaults = {
                    ...role,
                    code: role.code || role.name, // Use name as code fallback
                    color: role.color || getDefaultRoleColor(role.code || role.name),
                    users: role.userCount || 0,
                    description: role.description || 'Ruolo personalizzato'
                  };
                  
                  const r = roleWithDefaults; // Short alias
                  return (
                <div
                  key={r.id}
                  onClick={() => setSelectedRole(r.id)}
                  style={{
                    background: selectedRole === r.id 
                      ? `linear-gradient(135deg, ${r.color}15, ${r.color}08)`
                      : 'hsla(255, 255, 255, 0.05)',
                    border: selectedRole === r.id
                      ? `2px solid ${r.color}40`
                      : '1px solid hsla(255, 255, 255, 0.08)',
                    borderRadius: '0.75rem',
                    padding: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                    transform: 'translateY(0) scale(1) rotateX(0deg)',
                    transformStyle: 'preserve-3d',
                    perspective: '62.5rem',
                    boxShadow: selectedRole === r.id
                      ? `0 0.5rem 1.5rem ${r.color}20, 0 0.25rem 0.75rem rgba(0, 0, 0, 0.1)`
                      : '0 2px 0.5rem rgba(0, 0, 0, 0.05)'
                  }}
                  onMouseEnter={(e) => {
                    const card = e.currentTarget;
                    const colorBar = card.querySelector('.color-bar') as HTMLElement;
                    const icon = card.querySelector('.role-icon') as HTMLElement;
                    const users = card.querySelector('.users-count') as HTMLElement;
                    
                    // Card animations
                    card.style.background = `linear-gradient(135deg, ${r.color}18, ${r.color}10)`;
                    card.style.borderColor = `${r.color}40`;
                    card.style.transform = 'translateY(-0.5rem) scale(1.03) rotateX(-2deg)';
                    card.style.boxShadow = `0 1rem 2rem ${r.color}25, 0 0.5rem 1rem rgba(0, 0, 0, 0.15)`;
                    
                    // Color bar animation
                    if (colorBar) {
                      colorBar.style.height = '0.3125rem';
                      colorBar.style.background = `linear-gradient(90deg, ${r.color}, ${r.color}dd, ${r.color})`;
                      colorBar.style.boxShadow = `0 2px 0.5rem ${r.color}60`;
                    }
                    
                    // Icon animation
                    if (icon) {
                      icon.style.transform = 'rotate(360deg) scale(1.2)';
                      icon.style.color = r.color;
                    }
                    
                    // Users count animation
                    if (users) {
                      users.style.transform = 'translateX(0.25rem)';
                      users.style.color = r.color;
                    }
                  }}
                  onMouseLeave={(e) => {
                    const card = e.currentTarget;
                    const colorBar = card.querySelector('.color-bar') as HTMLElement;
                    const icon = card.querySelector('.role-icon') as HTMLElement;
                    const users = card.querySelector('.users-count') as HTMLElement;
                    
                    // Reset card
                    card.style.background = selectedRole === r.id 
                      ? `linear-gradient(135deg, ${r.color}15, ${r.color}08)`
                      : 'hsla(255, 255, 255, 0.05)';
                    card.style.borderColor = selectedRole === r.id
                      ? `${r.color}40`
                      : 'hsla(255, 255, 255, 0.08)';
                    card.style.transform = 'translateY(0) scale(1) rotateX(0deg)';
                    card.style.boxShadow = selectedRole === r.id
                      ? `0 0.5rem 1.5rem ${r.color}20, 0 0.25rem 0.75rem rgba(0, 0, 0, 0.1)`
                      : '0 2px 0.5rem rgba(0, 0, 0, 0.05)';
                    
                    // Reset color bar
                    if (colorBar) {
                      colorBar.style.height = '3px';
                      colorBar.style.background = r.color;
                      colorBar.style.boxShadow = 'none';
                    }
                    
                    // Reset icon
                    if (icon) {
                      icon.style.transform = 'rotate(0deg) scale(1)';
                      icon.style.color = r.color;
                    }
                    
                    // Reset users count
                    if (users) {
                      users.style.transform = 'translateX(0)';
                      users.style.color = '#6b7280';
                    }
                  }}
                >
                  {/* Animated background gradient */}
                  <div style={{
                    position: 'absolute',
                    top: '-100%',
                    left: '-100%',
                    width: '300%',
                    height: '300%',
                    background: `radial-gradient(circle at center, ${r.color}10 0%, transparent 70%)`,
                    opacity: 0,
                    transition: 'opacity 0.5s ease',
                    pointerEvents: 'none',
                    animation: 'pulse 3s ease-in-out infinite'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                  />
                  
                  <div 
                    className="color-bar"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '3px',
                      background: r.color,
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                    }} />
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: '0.75rem',
                    position: 'relative',
                    zIndex: 1
                  }}>
                    <div>
                      <h4 style={{
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: '#111827',
                        margin: '0 0 0.25rem 0'
                      }}>
                        {r.name}
                      </h4>
                      <p style={{
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        margin: 0
                      }}>
                        {r.description}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {r.name === 'Amministratore' && (
                        <Star 
                          size={16} 
                          className="role-icon"
                          style={{ 
                            color: r.color,
                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            transform: 'rotate(0deg) scale(1)'
                          }} 
                        />
                      )}
                      {!r.isSystem && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteRole(r.id, r.name, r.isSystem);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#dc2626',
                            padding: '0.25rem',
                            borderRadius: '0.25rem',
                            transition: 'all 0.2s ease',
                            opacity: 0.6
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.opacity = '1';
                            e.currentTarget.style.background = '#fef2f2';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.opacity = '0.6';
                            e.currentTarget.style.background = 'none';
                          }}
                          title="Elimina ruolo personalizzato"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'relative',
                    zIndex: 1
                  }}>
                    <span 
                      className="users-count"
                      style={{
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        transition: 'all 0.3s ease',
                        transform: 'translateX(0)'
                      }}
                    >
                      <Users size={12} />
                      {r.users} utenti
                    </span>
                    <ChevronRight 
                      size={14} 
                      style={{ 
                        color: '#6b7280',
                        transition: 'all 0.3s ease'
                      }} 
                    />
                  </div>
                </div>
              );
                })
              )}
            </div>
          </div>
          
          {/* Dettaglio Ruolo Selezionato */}
          {selectedRole && (
            <div style={{
              background: 'hsla(255, 255, 255, 0.08)',
              backdropFilter: 'blur(1.5rem) saturate(140%)',
              WebkitBackdropFilter: 'blur(1.5rem) saturate(140%)',
              border: '1px solid hsla(255, 255, 255, 0.12)',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              boxShadow: '0 0.25rem 1.25rem rgba(0, 0, 0, 0.08)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem'
              }}>
                <h4 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#111827',
                  margin: 0
                }}>
                  Permessi del Ruolo: {selectedRole ? selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1).replace('_', ' ') : 'Nessun ruolo selezionato'}
                </h4>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'transparent',
                      color: '#6b7280',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Duplica
                  </button>
                  <button
                    onClick={saveRolePermissions}
                    disabled={!isPermissionsDirty || rolePermissionsLoading}
                    style={{
                      padding: '0.5rem 1rem',
                      background: isPermissionsDirty 
                        ? 'linear-gradient(135deg, #FF6900, #ff8533)' 
                        : '#e5e7eb',
                      color: isPermissionsDirty ? 'white' : '#6b7280',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: isPermissionsDirty ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s ease',
                      opacity: rolePermissionsLoading ? 0.7 : 1
                    }}
                  >
                    {rolePermissionsLoading ? 'Salvando...' : 'Salva Modifiche'}
                    {isPermissionsDirty && <span style={{ marginLeft: '0.25rem' }}>•</span>}
                  </button>
                </div>
              </div>
              
              {/* Categorie di Permessi */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(18.75rem, 1fr))',
                gap: '1.25rem'
              }}>
                {permissionsLoading ? (
                  // Loading skeleton for permissions
                  Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} style={{
                      background: 'hsla(255, 255, 255, 0.05)',
                      border: '1px solid hsla(255, 255, 255, 0.08)',
                      borderRadius: '0.5rem',
                      padding: '1rem',
                      animation: 'pulse 2s infinite'
                    }}>
                      <div style={{ height: '1rem', background: '#e5e7eb', borderRadius: '0.25rem', marginBottom: '0.75rem', width: '60%' }} />
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} style={{ height: '0.75rem', background: '#e5e7eb', borderRadius: '0.25rem', marginBottom: '0.5rem', width: `${60 + Math.random() * 30}%` }} />
                      ))}
                    </div>
                  ))
                ) : (
                  organizePermissionsByCategory(rbacPermissionsData?.permissions || []).map((cat) => (
                    <div
                    key={cat.category}
                    style={{
                      background: 'hsla(255, 255, 255, 0.05)',
                      border: '1px solid hsla(255, 255, 255, 0.08)',
                      borderRadius: '0.5rem',
                      padding: '1rem'
                    }}
                  >
                    <h5 style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#111827',
                      marginBottom: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      {cat.category}
                      {/* Switch Toggle */}
                      <label style={{
                        position: 'relative',
                        display: 'inline-block',
                        width: '2.75rem',
                        height: '1.5rem',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="checkbox"
                          checked={isCategoryEnabled(cat.category)}
                          style={{
                            opacity: 0,
                            width: 0,
                            height: 0
                          }}
                          onChange={(e) => toggleCategoryPermissions(cat.category, e.target.checked)}
                        />
                        <span style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: isCategoryEnabled(cat.category) ? 'linear-gradient(135deg, #FF6900, #ff8533)' : '#e5e7eb',
                          borderRadius: '1.5rem',
                          transition: 'all 0.3s ease',
                          boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.12)'
                        }}>
                          <span style={{
                            position: 'absolute',
                            content: '""',
                            height: '1.125rem',
                            width: '1.125rem',
                            left: '3px',
                            bottom: '3px',
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            transition: 'all 0.3s ease',
                            transform: isCategoryEnabled(cat.category) ? 'translateX(1.25rem)' : 'translateX(0)',
                            boxShadow: '0 2px 0.25rem rgba(0, 0, 0, 0.2)'
                          }} />
                        </span>
                      </label>
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {cat.permissions.map((permObj) => {
                        const categoryEnabled = isCategoryEnabled(cat.category);
                        const { permission, description } = permObj;
                        return (
                          <div
                            key={permission}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.625rem',
                              padding: '0.375rem 0.5rem',
                              borderRadius: '0.25rem',
                              transition: 'all 0.2s ease',
                              background: 'transparent'
                            }}
                            onMouseOver={(e) => {
                              if (categoryEnabled) {
                                e.currentTarget.style.background = 'hsla(255, 255, 255, 0.05)';
                              }
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <label
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.625rem',
                                fontSize: '0.8125rem',
                                color: categoryEnabled ? '#6b7280' : '#9ca3af',
                                cursor: categoryEnabled ? 'pointer' : 'not-allowed',
                                opacity: categoryEnabled ? 1 : 0.5,
                                flex: 1
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isPermissionEnabled(permission)}
                                disabled={!categoryEnabled}
                                onChange={() => {
                                  // 🔧 FIX Bug #3: Block individual permission toggle when category is disabled
                                  if (categoryEnabled) {
                                    togglePermission(permission);
                                  }
                                }}
                                style={{ 
                                  cursor: categoryEnabled ? 'pointer' : 'not-allowed',
                                  width: '1rem',
                                  height: '1rem',
                                  accentColor: '#FF6900',
                                  flexShrink: 0
                                }}
                              />
                              <span style={{ flex: 1 }}>{permission}</span>
                            </label>
                            {/* Info Tooltip Icon */}
                            <div
                              style={{
                                position: 'relative',
                                display: 'inline-block',
                                flexShrink: 0
                              }}
                              onMouseEnter={(e) => {
                                const tooltip = e.currentTarget.querySelector('.permission-tooltip') as HTMLElement;
                                if (tooltip) {
                                  tooltip.style.opacity = '1';
                                  tooltip.style.visibility = 'visible';
                                }
                              }}
                              onMouseLeave={(e) => {
                                const tooltip = e.currentTarget.querySelector('.permission-tooltip') as HTMLElement;
                                if (tooltip) {
                                  tooltip.style.opacity = '0';
                                  tooltip.style.visibility = 'hidden';
                                }
                              }}
                            >
                              <Info
                                size={16}
                                style={{
                                  color: '#9ca3af',
                                  cursor: 'help',
                                  transition: 'color 0.2s ease'
                                }}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.color = '#FF6900';
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.color = '#9ca3af';
                                }}
                              />
                              {/* Tooltip Content - WindTre Glassmorphism */}
                              <div
                                className="permission-tooltip"
                                style={{
                                  position: 'absolute',
                                  bottom: '100%',
                                  left: '50%',
                                  transform: 'translateX(-50%) translateY(-0.5rem)',
                                  marginBottom: '0.25rem',
                                  padding: '0.75rem 1rem',
                                  minWidth: '17.5rem',
                                  maxWidth: '25rem',
                                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
                                  backdropFilter: 'blur(1.25rem)',
                                  WebkitBackdropFilter: 'blur(1.25rem)',
                                  border: '1px solid rgba(255, 105, 0, 0.2)',
                                  borderRadius: '0.75rem',
                                  boxShadow: '0 0.5rem 2rem rgba(0, 0, 0, 0.1), 0 2px 0.5rem rgba(255, 105, 0, 0.15)',
                                  fontSize: '0.75rem',
                                  lineHeight: '1.5',
                                  color: '#374151',
                                  fontWeight: '500',
                                  opacity: 0,
                                  visibility: 'hidden',
                                  transition: 'opacity 0.2s ease, visibility 0.2s ease',
                                  zIndex: 1000,
                                  pointerEvents: 'none',
                                  whiteSpace: 'normal'
                                }}
                              >
                                <div style={{
                                  position: 'absolute',
                                  bottom: '-0.375rem',
                                  left: '50%',
                                  width: '0.75rem',
                                  height: '0.75rem',
                                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
                                  border: '1px solid rgba(255, 105, 0, 0.2)',
                                  borderTop: 'none',
                                  borderLeft: 'none',
                                  transform: 'translateX(-50%) rotate(45deg)',
                                  zIndex: -1
                                }} />
                                {description}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
      
    </div>
  );

  // ==================== LEGAL ENTITY TAB ====================
  const [legalEntityModalOpen, setLegalEntityModalOpen] = useState(false);
  const [editingLegalEntity, setEditingLegalEntity] = useState<any>(null);
  const [legalEntityForm, setLegalEntityForm] = useState({
    codice: '',
    ragioneSociale: '',
    formaGiuridica: '',
    partitaIva: '',
    codiceFiscale: '',
    indirizzo: '',
    citta: '',
    provincia: '',
    cap: '',
    telefono: '',
    email: '',
    pec: '',
    rea: '',
    registroImprese: '',
    codiceSDI: '',
    iban: '',
    bic: '',
    website: '',
    capitaleSociale: '',
    isSupplier: false,
    isFinancialEntity: false,
    supplierType: 'other' as 'products' | 'services' | 'logistics' | 'technology' | 'other',
    note: ''
  });

  const { data: legalEntitiesData, isLoading: legalEntitiesLoading, refetch: refetchLegalEntitiesQuery, isError, error } = useQuery({
    queryKey: ['/api/legal-entities', { roleFilter: true }],
    queryFn: async () => {
      const response = await authenticatedFetch('/api/legal-entities?roleFilter=true', {
        headers: {
          'X-Tenant-ID': DEMO_TENANT_ID
        }
      });
      if (!response.ok) throw new Error('Failed to fetch legal entities');
      return response.json();
    },
    enabled: activeTab === 'Legal Entity',
    staleTime: 0,
    refetchOnMount: true
  });

  // Debug: log query state
  if (activeTab === 'Legal Entity') {
    console.log('[LEGAL-ENTITY] Query state:', { 
      data: legalEntitiesData, 
      isLoading: legalEntitiesLoading, 
      isError, 
      error,
      activeTab 
    });
  }

  const legalEntitiesList = Array.isArray(legalEntitiesData) 
    ? legalEntitiesData 
    : (legalEntitiesData as any)?.data || [];

  const handleSaveLegalEntity = async () => {
    try {
      const url = editingLegalEntity 
        ? `/api/legal-entities/${editingLegalEntity.id}`
        : '/api/legal-entities';
      const method = editingLegalEntity ? 'PUT' : 'POST';

      const response = await authenticatedFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': DEMO_TENANT_ID
        },
        body: JSON.stringify(legalEntityForm)
      });

      if (response.ok) {
        showNotification(editingLegalEntity ? 'Entità legale aggiornata' : 'Entità legale creata', 'success');
        setLegalEntityModalOpen(false);
        setEditingLegalEntity(null);
        setLegalEntityForm({
          codice: '', ragioneSociale: '', formaGiuridica: '', partitaIva: '', codiceFiscale: '',
          indirizzo: '', citta: '', provincia: '', cap: '', telefono: '', email: '', pec: '',
          rea: '', registroImprese: '', codiceSDI: '', iban: '', bic: '', website: '',
          capitaleSociale: '', isSupplier: false, isFinancialEntity: false, supplierType: 'other', note: ''
        });
        refetchLegalEntitiesQuery();
      } else {
        const error = await response.json();
        showNotification(error.message || 'Errore nel salvataggio', 'error');
      }
    } catch (error) {
      showNotification('Errore di connessione', 'error');
    }
  };

  const handleDeleteLegalEntity = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa entità legale? Verranno eliminati anche i fornitori e gli enti finanzianti collegati.')) return;
    
    try {
      const response = await authenticatedFetch(`/api/legal-entities/${id}`, {
        method: 'DELETE',
        headers: { 
          'X-Tenant-ID': DEMO_TENANT_ID
        }
      });

      if (response.ok) {
        showNotification('Entità legale eliminata', 'success');
        refetchLegalEntitiesQuery();
      } else {
        const error = await response.json();
        showNotification(error.message || 'Errore nell\'eliminazione', 'error');
      }
    } catch (error) {
      showNotification('Errore di connessione', 'error');
    }
  };

  const handleArchiveLegalEntity = async (id: string) => {
    if (!confirm('Sei sicuro di voler archiviare questa entità legale?')) return;
    
    try {
      const response = await authenticatedFetch(`/api/legal-entities/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Tenant-ID': DEMO_TENANT_ID
        },
        body: JSON.stringify({ stato: 'Archiviata' })
      });

      if (response.ok) {
        showNotification('Entità legale archiviata', 'success');
        refetchLegalEntitiesQuery();
      } else {
        const error = await response.json();
        showNotification(error.message || 'Errore nell\'archiviazione', 'error');
      }
    } catch (error) {
      showNotification('Errore di connessione', 'error');
    }
  };

  const handleSuspendLegalEntity = async (id: string, currentStato: string) => {
    const newStato = currentStato === 'Sospesa' ? 'Attiva' : 'Sospesa';
    const action = currentStato === 'Sospesa' ? 'riattivare' : 'sospendere';
    
    if (!confirm(`Sei sicuro di voler ${action} questa entità legale?`)) return;
    
    try {
      const response = await authenticatedFetch(`/api/legal-entities/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Tenant-ID': DEMO_TENANT_ID
        },
        body: JSON.stringify({ stato: newStato })
      });

      if (response.ok) {
        showNotification(`Entità legale ${newStato === 'Sospesa' ? 'sospesa' : 'riattivata'}`, 'success');
        refetchLegalEntitiesQuery();
      } else {
        const error = await response.json();
        showNotification(error.message || `Errore nel ${action}`, 'error');
      }
    } catch (error) {
      showNotification('Errore di connessione', 'error');
    }
  };

  const openEditLegalEntity = (entity: any) => {
    setEditingLegalEntity(entity);
    setLegalEntityForm({
      codice: entity.codice || '',
      ragioneSociale: entity.nome || '',
      formaGiuridica: entity.formaGiuridica || '',
      partitaIva: entity.pIva || '',
      codiceFiscale: entity.codiceFiscale || '',
      indirizzo: entity.indirizzo || '',
      citta: entity.citta || '',
      provincia: entity.provincia || '',
      cap: entity.cap || '',
      telefono: entity.telefono || '',
      email: entity.email || '',
      pec: entity.pec || '',
      rea: entity.rea || '',
      registroImprese: entity.registroImprese || '',
      codiceSDI: entity.codiceSDI || '',
      iban: entity.iban || '',
      bic: entity.bic || '',
      website: entity.website || '',
      capitaleSociale: entity.capitaleSociale || '',
      isSupplier: entity.isSupplier || false,
      isFinancialEntity: entity.isFinancialEntity || false,
      supplierType: 'other',
      note: entity.note || ''
    });
    setLegalEntityModalOpen(true);
  };

  const renderLegalEntityTab = () => (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', margin: '0 0 0.25rem 0' }}>
            Entità Legali
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
            Gestisci le entità legali e propaga i dati a fornitori ed enti finanzianti
          </p>
        </div>
        <button
          data-testid="button-add-legal-entity"
          onClick={() => {
            setEditingLegalEntity(null);
            setLegalEntityForm({
              codice: '', ragioneSociale: '', formaGiuridica: '', partitaIva: '', codiceFiscale: '',
              indirizzo: '', citta: '', provincia: '', cap: '', telefono: '', email: '', pec: '',
              rea: '', registroImprese: '', codiceSDI: '', iban: '', bic: '', website: '',
              capitaleSociale: '', isSupplier: false, isFinancialEntity: false, supplierType: 'other', note: ''
            });
            setLegalEntityModalOpen(true);
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'linear-gradient(135deg, #FF6900, #FF8533)',
            color: 'white', border: 'none', borderRadius: '0.625rem',
            padding: '0.625rem 1.25rem', cursor: 'pointer', fontWeight: '600'
          }}
        >
          <Plus size={18} />
          Nuova Entità Legale
        </button>
      </div>

      {/* Data Table */}
      <div style={{
        background: 'white', borderRadius: '1rem', border: '1px solid #e5e7eb',
        overflow: 'hidden', boxShadow: '0 0.25rem 1.25rem rgba(0, 0, 0, 0.05)'
      }}>
        {legalEntitiesLoading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#6b7280' }}>Caricamento...</div>
        ) : legalEntitiesList.length === 0 ? (
          <div style={{ padding: '3.75rem', textAlign: 'center', color: '#6b7280' }}>
            <Building2 size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p style={{ margin: 0, fontSize: '1rem' }}>Nessuna entità legale trovata</p>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem' }}>Clicca su "Nuova Entità Legale" per iniziare</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '0.8125rem' }}>Codice</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'center', fontWeight: '600', color: '#374151', fontSize: '0.8125rem' }}>Origine</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '0.8125rem' }}>Nome</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '0.8125rem' }}>Ragione Sociale</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '0.8125rem' }}>P.IVA</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'center', fontWeight: '600', color: '#374151', fontSize: '0.8125rem' }}>Ruoli</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '0.8125rem' }}>Stato</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'right', fontWeight: '600', color: '#374151', fontSize: '0.8125rem' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {legalEntitiesList.map((entity: any) => (
                <tr key={entity.id} data-testid={`row-legal-entity-${entity.id}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.875rem 1rem', fontWeight: '500', color: '#111827' }}>
                    {entity.codice || '-'}
                  </td>
                  <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                    <span style={{
                      background: entity.isBrandPushed ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : 'linear-gradient(135deg, #FF6900, #FF8533)',
                      color: 'white',
                      padding: '0.25rem 0.625rem',
                      borderRadius: '0.75rem',
                      fontSize: '0.6875rem',
                      fontWeight: '600'
                    }}>
                      {entity.isBrandPushed ? 'Brand' : 'Custom'}
                    </span>
                  </td>
                  <td style={{ padding: '0.875rem 1rem', color: '#374151' }}>{entity.nome}</td>
                  <td style={{ padding: '0.875rem 1rem', color: '#6b7280' }}>{entity.ragioneSociale || entity.nome || '-'}</td>
                  <td style={{ padding: '0.875rem 1rem', color: '#6b7280', fontFamily: 'monospace' }}>{entity.pIva || '-'}</td>
                  <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {entity.roles && entity.roles.length > 0 ? (
                        entity.roles.map((role: { type: string; origin: string; label: string }, idx: number) => {
                          // Define colors based on role type and origin
                          const getBadgeStyle = () => {
                            if (role.origin === 'brand') {
                              // Brand-managed = purple/violet tones (read-only)
                              return { background: '#ede9fe', color: '#7c3aed', border: '1px solid #c4b5fd' };
                            }
                            // Tenant-managed colors by type
                            if (role.type === 'supplier') {
                              return { background: '#dbeafe', color: '#1d4ed8', border: 'none' };
                            }
                            if (role.type === 'financial_entity') {
                              return { background: '#d1fae5', color: '#059669', border: 'none' };
                            }
                            if (role.type === 'operator' || role.type === 'brand') {
                              return { background: '#fef3c7', color: '#d97706', border: 'none' };
                            }
                            return { background: '#f3f4f6', color: '#6b7280', border: 'none' };
                          };
                          const style = getBadgeStyle();
                          // Clean label: remove "(Brand)" suffix for display
                          const cleanLabel = role.label.replace(' (Brand)', '');
                          return (
                            <span
                              key={idx}
                              title={role.origin === 'brand' ? 'Gestito da Brand Interface - sola lettura' : 'Gestito dal Tenant - modificabile'}
                              style={{
                                ...style,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                padding: '2px 0.5rem',
                                borderRadius: '0.75rem',
                                fontSize: '0.6875rem',
                                fontWeight: '600',
                                cursor: 'help'
                              }}
                            >
                              {cleanLabel}
                              {role.origin === 'brand' && (
                                <Lock size={10} style={{ opacity: 0.7 }} />
                              )}
                            </span>
                          );
                        })
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>-</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    {(() => {
                      const normalizedStatus = (entity.stato === 'Attiva' || entity.status === 'active') ? 'Attiva' : 'Inattiva';
                      const isActive = normalizedStatus === 'Attiva';
                      return (
                        <span style={{
                          background: isActive ? '#d1fae5' : '#fee2e2',
                          color: isActive ? '#059669' : '#dc2626',
                          padding: '0.25rem 0.625rem', borderRadius: '0.75rem', fontSize: '0.75rem', fontWeight: '500'
                        }}>
                          {normalizedStatus}
                        </span>
                      );
                    })()}
                  </td>
                  <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      {/* View button - always enabled for all entities */}
                      <button
                        data-testid={`button-view-legal-entity-${entity.id}`}
                        onClick={() => {
                          setEditingLegalEntity(entity);
                          setLegalEntityForm({
                            codice: entity.codice || '',
                            ragioneSociale: entity.nome || '',
                            formaGiuridica: entity.formaGiuridica || '',
                            partitaIva: entity.pIva || '',
                            codiceFiscale: entity.codiceFiscale || '',
                            indirizzo: entity.indirizzo || '',
                            citta: entity.citta || '',
                            provincia: entity.provincia || '',
                            cap: entity.cap || '',
                            telefono: entity.telefono || '',
                            email: entity.email || '',
                            pec: entity.pec || '',
                            rea: entity.rea || '',
                            registroImprese: entity.registroImprese || '',
                            codiceSDI: entity.codiceSDI || '',
                            iban: entity.iban || '',
                            bic: entity.bic || '',
                            website: entity.website || '',
                            capitaleSociale: entity.capitaleSociale || '',
                            isSupplier: entity.isSupplier || false,
                            isFinancialEntity: entity.isFinancialEntity || false,
                            supplierType: 'other',
                            note: entity.note || ''
                          });
                          setLegalEntityModalOpen(true);
                        }}
                        title="Visualizza dettagli"
                        style={{
                          background: '#e0f2fe',
                          border: 'none', borderRadius: '0.5rem',
                          padding: '0.5rem',
                          cursor: 'pointer',
                          color: '#0284c7'
                        }}
                      >
                        <Eye size={16} />
                      </button>
                      {/* Edit button - disabled for brand-managed entities */}
                      <button
                        data-testid={`button-edit-legal-entity-${entity.id}`}
                        onClick={() => entity.isEditable && openEditLegalEntity(entity)}
                        disabled={!entity.isEditable}
                        title={!entity.isEditable ? 'Non modificabile: gestito da Brand' : 'Modifica'}
                        style={{
                          background: entity.isEditable ? '#f3f4f6' : '#f9fafb',
                          border: 'none', borderRadius: '0.5rem',
                          padding: '0.5rem',
                          cursor: entity.isEditable ? 'pointer' : 'not-allowed',
                          color: entity.isEditable ? '#374151' : '#9ca3af',
                          opacity: entity.isEditable ? 1 : 0.6
                        }}
                      >
                        <Edit3 size={16} />
                      </button>
                      {/* Archive button */}
                      <button
                        data-testid={`button-archive-legal-entity-${entity.id}`}
                        onClick={() => entity.isEditable && entity.stato !== 'Archiviata' && handleArchiveLegalEntity(entity.id)}
                        disabled={!entity.isEditable || entity.stato === 'Archiviata'}
                        title={!entity.isEditable ? 'Non modificabile: gestito da Brand' : entity.stato === 'Archiviata' ? 'Già archiviata' : 'Archivia'}
                        style={{
                          background: entity.isEditable && entity.stato !== 'Archiviata' ? '#fef3c7' : '#f9fafb',
                          border: 'none', borderRadius: '0.5rem',
                          padding: '0.5rem',
                          cursor: entity.isEditable && entity.stato !== 'Archiviata' ? 'pointer' : 'not-allowed',
                          color: entity.isEditable && entity.stato !== 'Archiviata' ? '#d97706' : '#9ca3af',
                          opacity: entity.isEditable && entity.stato !== 'Archiviata' ? 1 : 0.6
                        }}
                      >
                        <Archive size={16} />
                      </button>
                      {/* Suspend button */}
                      <button
                        data-testid={`button-suspend-legal-entity-${entity.id}`}
                        onClick={() => entity.isEditable && handleSuspendLegalEntity(entity.id, entity.stato)}
                        disabled={!entity.isEditable}
                        title={!entity.isEditable ? 'Non modificabile: gestito da Brand' : entity.stato === 'Sospesa' ? 'Riattiva' : 'Sospendi'}
                        style={{
                          background: entity.isEditable ? (entity.stato === 'Sospesa' ? '#d1fae5' : '#fef3c7') : '#f9fafb',
                          border: 'none', borderRadius: '0.5rem',
                          padding: '0.5rem',
                          cursor: entity.isEditable ? 'pointer' : 'not-allowed',
                          color: entity.isEditable ? (entity.stato === 'Sospesa' ? '#059669' : '#d97706') : '#9ca3af',
                          opacity: entity.isEditable ? 1 : 0.6
                        }}
                      >
                        {entity.stato === 'Sospesa' ? <RefreshCw size={16} /> : <Pause size={16} />}
                      </button>
                      {/* Delete button - disabled if has dependencies */}
                      <button
                        data-testid={`button-delete-legal-entity-${entity.id}`}
                        onClick={() => !entity.hasDependencies && handleDeleteLegalEntity(entity.id)}
                        disabled={entity.hasDependencies}
                        title={entity.hasDependencies ? 'Non eliminabile: ha dipendenze (negozi, brand, etc.)' : 'Elimina'}
                        style={{
                          background: entity.hasDependencies ? '#f3f4f6' : '#fee2e2',
                          border: 'none', borderRadius: '0.5rem',
                          padding: '0.5rem',
                          cursor: entity.hasDependencies ? 'not-allowed' : 'pointer',
                          color: entity.hasDependencies ? '#9ca3af' : '#dc2626',
                          opacity: entity.hasDependencies ? 0.6 : 1
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal for Create/Edit */}
      {legalEntityModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white', borderRadius: '1rem', width: '90%', maxWidth: '50rem',
            maxHeight: '90vh', overflow: 'auto', padding: '2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                {editingLegalEntity ? 'Modifica Entità Legale' : 'Nuova Entità Legale'}
              </h3>
              <button onClick={() => setLegalEntityModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            {/* Form Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#374151', marginBottom: '0.375rem' }}>Codice *</label>
                <input
                  data-testid="input-legal-entity-codice"
                  value={legalEntityForm.codice}
                  onChange={(e) => setLegalEntityForm(prev => ({ ...prev, codice: e.target.value.toUpperCase() }))}
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                  placeholder="ES. LE001"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#374151', marginBottom: '0.375rem' }}>Ragione Sociale *</label>
                <input
                  data-testid="input-legal-entity-ragione-sociale"
                  value={legalEntityForm.ragioneSociale}
                  onChange={(e) => setLegalEntityForm(prev => ({ ...prev, ragioneSociale: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                  placeholder="Nome della società"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#374151', marginBottom: '0.375rem' }}>Forma Giuridica</label>
                <select
                  value={legalEntityForm.formaGiuridica}
                  onChange={(e) => setLegalEntityForm(prev => ({ ...prev, formaGiuridica: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                >
                  <option value="">Seleziona...</option>
                  <option value="S.r.l.">S.r.l.</option>
                  <option value="S.p.A.">S.p.A.</option>
                  <option value="S.a.s.">S.a.s.</option>
                  <option value="S.n.c.">S.n.c.</option>
                  <option value="Ditta Individuale">Ditta Individuale</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#374151', marginBottom: '0.375rem' }}>Partita IVA</label>
                <input
                  data-testid="input-legal-entity-partita-iva"
                  value={legalEntityForm.partitaIva}
                  onChange={(e) => setLegalEntityForm(prev => ({ ...prev, partitaIva: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                  placeholder="IT12345678901"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#374151', marginBottom: '0.375rem' }}>Codice Fiscale</label>
                <input
                  value={legalEntityForm.codiceFiscale}
                  onChange={(e) => setLegalEntityForm(prev => ({ ...prev, codiceFiscale: e.target.value.toUpperCase() }))}
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#374151', marginBottom: '0.375rem' }}>Codice SDI</label>
                <input
                  value={legalEntityForm.codiceSDI}
                  onChange={(e) => setLegalEntityForm(prev => ({ ...prev, codiceSDI: e.target.value.toUpperCase() }))}
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                  placeholder="0000000"
                  maxLength={7}
                />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#374151', marginBottom: '0.375rem' }}>Indirizzo</label>
                <input
                  value={legalEntityForm.indirizzo}
                  onChange={(e) => setLegalEntityForm(prev => ({ ...prev, indirizzo: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                  placeholder="Via Roma, 1"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#374151', marginBottom: '0.375rem' }}>Città</label>
                <input
                  value={legalEntityForm.citta}
                  onChange={(e) => setLegalEntityForm(prev => ({ ...prev, citta: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#374151', marginBottom: '0.375rem' }}>Provincia</label>
                  <input
                    value={legalEntityForm.provincia}
                    onChange={(e) => setLegalEntityForm(prev => ({ ...prev, provincia: e.target.value.toUpperCase() }))}
                    style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                    maxLength={2}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#374151', marginBottom: '0.375rem' }}>CAP</label>
                  <input
                    value={legalEntityForm.cap}
                    onChange={(e) => setLegalEntityForm(prev => ({ ...prev, cap: e.target.value }))}
                    style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                    maxLength={5}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#374151', marginBottom: '0.375rem' }}>Telefono</label>
                <input
                  value={legalEntityForm.telefono}
                  onChange={(e) => setLegalEntityForm(prev => ({ ...prev, telefono: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#374151', marginBottom: '0.375rem' }}>Email</label>
                <input
                  value={legalEntityForm.email}
                  onChange={(e) => setLegalEntityForm(prev => ({ ...prev, email: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                  type="email"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#374151', marginBottom: '0.375rem' }}>PEC</label>
                <input
                  value={legalEntityForm.pec}
                  onChange={(e) => setLegalEntityForm(prev => ({ ...prev, pec: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#374151', marginBottom: '0.375rem' }}>Sito Web</label>
                <input
                  value={legalEntityForm.website}
                  onChange={(e) => setLegalEntityForm(prev => ({ ...prev, website: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                  placeholder="https://www.example.com"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#374151', marginBottom: '0.375rem' }}>IBAN</label>
                <input
                  value={legalEntityForm.iban}
                  onChange={(e) => setLegalEntityForm(prev => ({ ...prev, iban: e.target.value.toUpperCase() }))}
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                  placeholder="IT60X0542811101000000123456"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#374151', marginBottom: '0.375rem' }}>BIC/SWIFT</label>
                <input
                  value={legalEntityForm.bic}
                  onChange={(e) => setLegalEntityForm(prev => ({ ...prev, bic: e.target.value.toUpperCase() }))}
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                  maxLength={11}
                />
              </div>

              {/* Role Checkboxes */}
              <div style={{ gridColumn: 'span 2', marginTop: '1rem', padding: '1rem', background: '#f9fafb', borderRadius: '0.75rem' }}>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                  Ruoli dell'Entità (Propagazione Automatica)
                </h4>
                <p style={{ margin: '0 0 1rem', fontSize: '0.8125rem', color: '#6b7280' }}>
                  Selezionando questi ruoli, l'entità verrà automaticamente creata anche nelle tabelle specifiche
                </p>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={legalEntityForm.isSupplier}
                      onChange={(e) => setLegalEntityForm(prev => ({ ...prev, isSupplier: e.target.checked }))}
                      style={{ width: '1.125rem', height: '1.125rem' }}
                    />
                    <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>È un Fornitore</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={legalEntityForm.isFinancialEntity}
                      onChange={(e) => setLegalEntityForm(prev => ({ ...prev, isFinancialEntity: e.target.checked }))}
                      style={{ width: '1.125rem', height: '1.125rem' }}
                    />
                    <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>È un Ente Finanziante</span>
                  </label>
                </div>

                {legalEntityForm.isSupplier && (
                  <div style={{ marginTop: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#374151', marginBottom: '0.375rem' }}>Tipo Fornitore</label>
                    <select
                      value={legalEntityForm.supplierType}
                      onChange={(e) => setLegalEntityForm(prev => ({ ...prev, supplierType: e.target.value as any }))}
                      style={{ width: '12.5rem', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                    >
                      <option value="products">Prodotti</option>
                      <option value="services">Servizi</option>
                      <option value="logistics">Logistica</option>
                      <option value="technology">Tecnologia</option>
                      <option value="other">Altro</option>
                    </select>
                  </div>
                )}
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#374151', marginBottom: '0.375rem' }}>Note</label>
                <textarea
                  value={legalEntityForm.note}
                  onChange={(e) => setLegalEntityForm(prev => ({ ...prev, note: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', minHeight: '5rem', resize: 'vertical' }}
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
              <button
                onClick={() => setLegalEntityModalOpen(false)}
                style={{ padding: '0.625rem 1.25rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', background: 'white', cursor: 'pointer', fontWeight: '500' }}
              >
                Annulla
              </button>
              <button
                data-testid="button-save-legal-entity"
                onClick={handleSaveLegalEntity}
                disabled={!legalEntityForm.codice || !legalEntityForm.ragioneSociale}
                style={{
                  padding: '0.625rem 1.25rem', border: 'none', borderRadius: '0.5rem',
                  background: (!legalEntityForm.codice || !legalEntityForm.ragioneSociale) ? '#d1d5db' : 'linear-gradient(135deg, #FF6900, #FF8533)',
                  color: 'white', cursor: (!legalEntityForm.codice || !legalEntityForm.ragioneSociale) ? 'not-allowed' : 'pointer', fontWeight: '600'
                }}
              >
                {editingLegalEntity ? 'Aggiorna' : 'Crea Entità Legale'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderAIAssistant = () => {
    return <AISettingsPage />;
  };

  const renderChannelSettings = () => {
    return <ChannelSettingsPage />;
  };

  const renderSystemSettings = () => {
    return <SystemConfigPage />;
  };

  // LOGS RENDERING FUNCTION - Complete implementation with robust error/loading states
  const renderLogs = () => {
    const logs = logsData?.logs || [];
    const metadata = logsData?.metadata || { total: 0, page: 1, limit: 20, totalPages: 0 };

    // FIXED: Robust error state with retry
    if (logsError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '25rem',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '1rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '2.5rem'
        }}>
          <AlertCircle size={48} style={{ color: '#ef4444', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
            Error Loading Logs
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem', textAlign: 'center' }}>
            {logsError.message || 'Failed to load system logs. Please try again.'}
          </p>
          <button
            onClick={() => refetchLogs()}
            aria-label="Retry loading logs"
            style={{
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.625rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            data-testid="button-retry-logs"
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      );
    }

    // FIXED: Loading skeleton state
    if (logsLoading) {
      return (
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '1rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '1.5rem'
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{
              height: '1.25rem',
              background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 100%)',
              borderRadius: '0.25rem',
              animation: 'shimmer 2s infinite',
              marginBottom: '0.5rem'
            }} />
            <div style={{
              height: '0.875rem',
              background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 100%)',
              borderRadius: '0.25rem',
              width: '60%',
              animation: 'shimmer 2s infinite'
            }} />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{
              padding: '1rem',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '0.5rem',
              marginBottom: '0.5rem'
            }}>
              <div style={{
                height: '1rem',
                background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 100%)',
                borderRadius: '0.25rem',
                marginBottom: '0.5rem',
                animation: 'shimmer 2s infinite'
              }} />
              <div style={{
                height: '0.75rem',
                background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 100%)',
                borderRadius: '0.25rem',
                width: '80%',
                animation: 'shimmer 2s infinite'
              }} />
            </div>
          ))}
          <style>{`
            @keyframes shimmer {
              0% { background-position: -12.5rem 0; }
              100% { background-position: calc(12.5rem + 100%) 0; }
            }
          `}</style>
        </div>
      );
    }

    // FIXED: Empty state when no logs found
    if (!logs.length) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '25rem',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '1rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '2.5rem'
        }}>
          <FileText size={48} style={{ color: '#6b7280', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
            No Logs Found
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem', textAlign: 'center' }}>
            No logs match your current filters. Try adjusting your search criteria or check back later.
          </p>
          <button
            onClick={resetLogsFilters}
            aria-label="Clear all filters to show all logs"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '0.5rem',
              padding: '0.625rem 1.25rem',
              color: '#6b7280',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            data-testid="button-clear-filters-empty"
          >
            <RotateCcw size={16} />
            Clear Filters
          </button>
        </div>
      );
    }

    // Get unique components for filter dropdown
    const availableComponents = ['ALL', ...Array.from(new Set(logs.map(log => log.component)))];

    return (
      <div>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <div>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#111827',
                margin: '0 0 0.25rem 0'
              }}>
                Logs Sistema
              </h2>
              <p style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                margin: 0
              }}>
                Visualizza e monitora i log strutturati del sistema
              </p>
            </div>
            
            {/* Auto-refresh and manual refresh controls */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              {newLogsAvailable && (
                <div style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  padding: '0.375rem 0.75rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  animation: 'pulse 2s infinite'
                }}>
                  <div style={{
                    width: '0.375rem',
                    height: '0.375rem',
                    background: 'white',
                    borderRadius: '50%'
                  }} />
                  Nuovi log disponibili
                </div>
              )}
              
              <button
                onClick={toggleAutoRefresh}
                style={{
                  background: autoRefreshEnabled 
                    ? 'linear-gradient(135deg, #10b981, #059669)' 
                    : 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(0.625rem)',
                  border: `1px solid ${autoRefreshEnabled ? '#10b981' : 'rgba(255, 255, 255, 0.2)'}`,
                  borderRadius: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  color: autoRefreshEnabled ? 'white' : '#6b7280',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  transition: 'all 0.2s ease'
                }}
                data-testid="button-toggle-auto-refresh"
              >
                {autoRefreshEnabled ? <Pause size={12} /> : <Play size={12} />}
                Auto-refresh
              </button>
              
              <button
                onClick={() => {
                  refetchLogs();
                  setNewLogsAvailable(false);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(0.625rem)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '0.5rem',
                  padding: '0.5rem',
                  color: '#6b7280',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                data-testid="button-refresh-logs"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* SEARCH & FILTERING UI - Glassmorphism Design */}
          <div style={{
            background: 'hsla(255, 255, 255, 0.08)',
            backdropFilter: 'blur(1.5rem) saturate(140%)',
            WebkitBackdropFilter: 'blur(1.5rem) saturate(140%)',
            border: '1px solid hsla(255, 255, 255, 0.12)',
            borderRadius: '1rem',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            boxShadow: '0 0.25rem 1.25rem rgba(0, 0, 0, 0.08)'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(23.125rem, 1fr))',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              {/* Search Bar */}
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#6b7280'
                }} />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={logsSearchTerm}
                  onChange={(e) => setLogsSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem 0.625rem 2.25rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(0.5rem)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '0.5rem',
                    color: '#111827',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  data-testid="input-search-logs"
                />
              </div>

              {/* Level Filter */}
              <select
                value={logsLevelFilter}
                onChange={(e) => setLogsLevelFilter(e.target.value)}
                style={{
                  padding: '0.625rem 0.75rem',
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(0.5rem)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '0.5rem',
                  color: '#111827',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  outline: 'none'
                }}
                data-testid="select-level-filter"
              >
                <option value="ALL">All Levels</option>
                <option value="ERROR">ERROR</option>
                <option value="WARN">WARN</option>
                <option value="INFO">INFO</option>
                <option value="DEBUG">DEBUG</option>
              </select>

              {/* Component Filter */}
              <select
                value={logsComponentFilter}
                onChange={(e) => setLogsComponentFilter(e.target.value)}
                style={{
                  padding: '0.625rem 0.75rem',
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(0.5rem)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '0.5rem',
                  color: '#111827',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  outline: 'none'
                }}
                data-testid="select-component-filter"
              >
                {availableComponents.map(component => (
                  <option key={component} value={component}>
                    {component === 'ALL' ? 'All Components' : component}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range and Additional Filters */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(12.5rem, 1fr))',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              {/* From Date */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: '#6b7280',
                  marginBottom: '0.25rem'
                }}>
                  From Date
                </label>
                <input
                  type="datetime-local"
                  value={logsFromDate}
                  onChange={(e) => setLogsFromDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(0.5rem)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '0.5rem',
                    color: '#111827',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  data-testid="input-from-date"
                />
              </div>

              {/* To Date */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: '#6b7280',
                  marginBottom: '0.25rem'
                }}>
                  To Date
                </label>
                <input
                  type="datetime-local"
                  value={logsToDate}
                  onChange={(e) => setLogsToDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(0.5rem)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '0.5rem',
                    color: '#111827',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  data-testid="input-to-date"
                />
              </div>

              {/* User Filter */}
              <input
                type="text"
                placeholder="Filter by user..."
                value={logsUserFilter}
                onChange={(e) => setLogsUserFilter(e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem',
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(0.5rem)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '0.5rem',
                  color: '#111827',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
                data-testid="input-user-filter"
              />

              {/* Correlation ID Filter */}
              <input
                type="text"
                placeholder="Filter by correlation ID..."
                value={logsCorrelationIdFilter}
                onChange={(e) => setLogsCorrelationIdFilter(e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem',
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(0.5rem)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '0.5rem',
                  color: '#111827',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
                data-testid="input-correlation-filter"
              />
            </div>

            {/* Reset Filters Button */}
            <button
              onClick={resetLogsFilters}
              aria-label="Reset all log filters to default values"
              style={{
                background: 'rgba(255, 105, 0, 0.1)',
                border: '1px solid rgba(255, 105, 0, 0.3)',
                borderRadius: '0.5rem',
                padding: '0.5rem 1rem',
                color: '#FF6900',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                transition: 'all 0.2s ease'
              }}
              data-testid="button-reset-filters"
            >
              <RotateCcw size={14} />
              Reset Filters
            </button>
          </div>

          {/* LOGS TABLE/LIST VIEW */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(0.625rem)',
            borderRadius: '1rem',
            overflow: 'hidden',
            boxShadow: '0 0.25rem 1.25rem rgba(0, 0, 0, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            {logsLoading ? (
              // Loading skeleton
              <div style={{ padding: '1.5rem' }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{
                    background: 'rgba(0, 0, 0, 0.05)',
                    height: '3.75rem',
                    borderRadius: '0.5rem',
                    marginBottom: '0.75rem',
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }} />
                ))}
              </div>
            ) : logsError ? (
              // Error state
              <div style={{
                padding: '40.5rem 1.5rem',
                textAlign: 'center',
                color: '#ef4444'
              }}>
                <XCircle size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', margin: '0 0 0.5rem' }}>
                  Error loading logs
                </h3>
                <p style={{ fontSize: '0.875rem', margin: '0 0 1rem', opacity: 0.7 }}>
                  {(logsError as any)?.message || 'Failed to fetch logs data'}
                </p>
                <button
                  onClick={() => window.location.reload()}
                  style={{
                    background: 'linear-gradient(135deg, #FF6900, #ff8533)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                  data-testid="button-retry-logs"
                >
                  Try Again
                </button>
              </div>
            ) : (logsData?.logs?.length || 0) === 0 ? (
              // Empty state
              <div style={{
                padding: '40.5rem 1.5rem',
                textAlign: 'center',
                color: '#6b7280'
              }}>
                <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', margin: '0 0 0.5rem' }}>
                  No logs found
                </h3>
                <p style={{ fontSize: '0.875rem', margin: 0, opacity: 0.7 }}>
                  Try adjusting your filters or check back later
                </p>
              </div>
            ) : (
              // Logs table
              <div style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg, #f9fafb, #f3f4f6)' }}>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb', minWidth: '8.75rem' }}>Timestamp</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb', minWidth: '5rem' }}>Level</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb', minWidth: '7.5rem' }}>Component</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Message</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb', minWidth: '6.25rem' }}>User</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb', minWidth: '7.5rem' }}>Correlation ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(logsData?.logs || []).map((log: StructuredLog, index: number) => (
                      <tr
                        key={log.id}
                        onClick={() => setLogDetailsModal({ open: true, data: log })}
                        style={{
                          borderBottom: '1px solid #f3f4f6',
                          cursor: 'pointer',
                          transition: 'background 0.2s ease'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 105, 0, 0.05)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                        data-testid={`row-log-${log.id}`}
                      >
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#6b7280' }}>
                          {formatLogTimestamp(log.timestamp)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{
                            background: `${getLevelColor(log.level)}15`,
                            color: getLevelColor(log.level),
                            border: `1px solid ${getLevelColor(log.level)}30`,
                            borderRadius: '0.375rem',
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.6875rem',
                            fontWeight: '600',
                            display: 'inline-block',
                            minWidth: '3.125rem',
                            textAlign: 'center'
                          }}>
                            {log.level}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', color: '#111827', fontWeight: '500' }}>
                          {log.component}
                        </td>
                        <td style={{
                          padding: '0.75rem 1rem',
                          fontSize: '0.875rem',
                          color: '#111827',
                          maxWidth: '18.75rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {log.message}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', color: '#6b7280' }}>
                          {log.user || '-'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          {log.correlationId ? (
                            <div style={{
                              background: 'rgba(59, 130, 246, 0.1)',
                              color: '#3b82f6',
                              border: '1px solid rgba(59, 130, 246, 0.2)',
                              borderRadius: '0.375rem',
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.6875rem',
                              fontFamily: 'monospace',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              cursor: 'pointer'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(log.correlationId!);
                            }}
                          >
                            {log.correlationId.slice(0, 8)}...
                            <Copy size={10} />
                          </div>
                          ) : (
                            <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* PAGINATION CONTROLS */}
            {logs.length > 0 && (
              <div style={{
                background: 'rgba(249, 250, 251, 0.8)',
                backdropFilter: 'blur(0.5rem)',
                borderTop: '1px solid #e5e7eb',
                padding: '1rem 1.5rem',
                display: 'flex',
                justifyContent: 'between',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  Showing {((metadata.page - 1) * metadata.limit) + 1} to {Math.min(metadata.page * metadata.limit, metadata.total)} of {metadata.total} logs
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    onClick={() => setLogsCurrentPage(Math.max(1, logsCurrentPage - 1))}
                    disabled={logsCurrentPage <= 1}
                    style={{
                      background: logsCurrentPage <= 1 ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.8)',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      borderRadius: '0.375rem',
                      padding: '0.375rem 0.75rem',
                      fontSize: '0.875rem',
                      color: logsCurrentPage <= 1 ? '#9ca3af' : '#374151',
                      cursor: logsCurrentPage <= 1 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                    data-testid="button-previous-page"
                  >
                    <ChevronLeft size={14} />
                    Previous
                  </button>
                  
                  <div style={{
                    padding: '0.375rem 0.75rem',
                    background: 'rgba(255, 105, 0, 0.1)',
                    border: '1px solid rgba(255, 105, 0, 0.2)',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#FF6900'
                  }}>
                    Page {metadata.page} of {metadata.totalPages}
                  </div>
                  
                  <button
                    onClick={() => setLogsCurrentPage(Math.min(metadata.totalPages, logsCurrentPage + 1))}
                    disabled={logsCurrentPage >= metadata.totalPages}
                    style={{
                      background: logsCurrentPage >= metadata.totalPages ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.8)',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      borderRadius: '0.375rem',
                      padding: '0.375rem 0.75rem',
                      fontSize: '0.875rem',
                      color: logsCurrentPage >= metadata.totalPages ? '#9ca3af' : '#374151',
                      cursor: logsCurrentPage >= metadata.totalPages ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                    data-testid="button-next-page"
                  >
                    Next
                    <ChevronRightIcon size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* LOG DETAILS MODAL */}
        {logDetailsModal.open && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(0.5rem)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.25rem'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '1rem',
              padding: '1.5rem',
              maxWidth: '50rem',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 1.25rem 20.3125rem -0.3125rem rgba(0, 0, 0, 0.1), 0 0.625rem 0.625rem -0.3125rem rgba(0, 0, 0, 0.04)'
            }}
            data-testid="modal-log-details"
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '1.5rem'
              }}>
                <div>
                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    color: '#111827',
                    margin: '0 0 0.5rem 0'
                  }}>
                    Log Details
                  </h3>
                  <div style={{
                    background: `${getLevelColor(logDetailsModal.data.level)}15`,
                    color: getLevelColor(logDetailsModal.data.level),
                    border: `1px solid ${getLevelColor(logDetailsModal.data.level)}30`,
                    borderRadius: '0.5rem',
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    display: 'inline-block'
                  }}>
                    {logDetailsModal.data.level}
                  </div>
                </div>
                
                <button
                  onClick={() => setLogDetailsModal({ open: false, data: null })}
                  style={{
                    background: 'rgba(0, 0, 0, 0.05)',
                    border: 'none',
                    borderRadius: '0.5rem',
                    padding: '0.5rem',
                    cursor: 'pointer',
                    color: '#6b7280'
                  }}
                  data-testid="button-close-modal"
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: 'grid', gap: '1.25rem' }}>
                {/* Basic Information */}
                <div style={{
                  background: 'rgba(249, 250, 251, 0.5)',
                  borderRadius: '0.75rem',
                  padding: '1rem'
                }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: '0 0 0.75rem 0' }}>
                    Basic Information
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(23.125rem, 1fr))', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>
                        Timestamp
                      </label>
                      <div style={{ fontSize: '0.875rem', color: '#111827', fontFamily: 'monospace' }}>
                        {formatLogTimestamp(logDetailsModal.data.timestamp)}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>
                        Component
                      </label>
                      <div style={{ fontSize: '0.875rem', color: '#111827', fontWeight: '500' }}>
                        {logDetailsModal.data.component}
                      </div>
                    </div>
                    {logDetailsModal.data.user && (
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>
                          User
                        </label>
                        <div style={{ fontSize: '0.875rem', color: '#111827' }}>
                          {logDetailsModal.data.user}
                        </div>
                      </div>
                    )}
                    {logDetailsModal.data.correlationId && (
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>
                          Correlation ID
                        </label>
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#3b82f6',
                          fontFamily: 'monospace',
                          background: 'rgba(59, 130, 246, 0.1)',
                          padding: '0.375rem 0.5rem',
                          borderRadius: '0.375rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                          cursor: 'pointer'
                        }}
                        onClick={() => copyToClipboard(logDetailsModal.data.correlationId)}
                        >
                          {logDetailsModal.data.correlationId}
                          <Copy size={12} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Message */}
                <div style={{
                  background: 'rgba(249, 250, 251, 0.5)',
                  borderRadius: '0.75rem',
                  padding: '1rem'
                }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: '0 0 0.75rem 0' }}>
                    Message
                  </h4>
                  <div style={{
                    fontSize: '0.875rem',
                    color: '#111827',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {logDetailsModal.data.message}
                  </div>
                </div>

                {/* Metadata */}
                {logDetailsModal.data.metadata && (
                  <div style={{
                    background: 'rgba(249, 250, 251, 0.5)',
                    borderRadius: '0.75rem',
                    padding: '1rem'
                  }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: '0 0 0.75rem 0' }}>
                      Metadata
                    </h4>
                    <pre style={{
                      fontSize: '0.75rem',
                      color: '#111827',
                      fontFamily: 'monospace',
                      background: 'white',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #e5e7eb',
                      overflow: 'auto',
                      maxHeight: '12.5rem',
                      margin: 0
                    }}>
                      {JSON.stringify(logDetailsModal.data.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Stack Trace */}
                {logDetailsModal.data.stackTrace && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.05)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '0.75rem',
                    padding: '1rem'
                  }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#ef4444', margin: '0 0 0.75rem 0' }}>
                      Stack Trace
                    </h4>
                    <pre style={{
                      fontSize: '0.6875rem',
                      color: '#374151',
                      fontFamily: 'monospace',
                      background: 'white',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #fecaca',
                      overflow: 'auto',
                      maxHeight: '18.75rem',
                      margin: 0,
                      whiteSpace: 'pre-wrap'
                    }}>
                      {logDetailsModal.data.stackTrace}
                    </pre>
                  </div>
                )}

                {/* Request Context */}
                {logDetailsModal.data.requestContext && (
                  <div style={{
                    background: 'rgba(249, 250, 251, 0.5)',
                    borderRadius: '0.75rem',
                    padding: '1rem'
                  }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: '0 0 0.75rem 0' }}>
                      Request Context
                    </h4>
                    <pre style={{
                      fontSize: '0.75rem',
                      color: '#111827',
                      fontFamily: 'monospace',
                      background: 'white',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #e5e7eb',
                      overflow: 'auto',
                      maxHeight: '12.5rem',
                      margin: 0
                    }}>
                      {JSON.stringify(logDetailsModal.data.requestContext, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div style={{
                marginTop: '1.5rem',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem'
              }}>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(logDetailsModal.data, null, 2))}
                  style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '0.5rem',
                    padding: '0.5rem 1rem',
                    color: '#3b82f6',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem'
                  }}
                  data-testid="button-copy-log"
                >
                  <Copy size={14} />
                  Copy JSON
                </button>
                
                <button
                  onClick={() => setLogDetailsModal({ open: false, data: null })}
                  style={{
                    background: 'linear-gradient(135deg, #FF6900, #ff8533)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                  data-testid="button-close-log-modal"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notification Toast */}
        {notification && (
          <div style={{
            position: 'fixed',
            top: '1.25rem',
            right: '1.25rem',
            background: notification.type === 'success' ? '#10b981' : '#dc2626',
            color: 'white',
            padding: '1rem 1.25rem',
            borderRadius: '0.5rem',
            boxShadow: '0 0.5rem 1.25rem rgba(0, 0, 0, 0.15)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            maxWidth: '25rem',
            animation: 'slideIn 0.3s ease'
          }}>
            {notification.type === 'success' ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>
              {notification.message}
            </span>
            <button
              onClick={() => setNotification(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                marginLeft: 'auto',
                padding: '0.25rem'
              }}
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    );
  };

  // Note: Hierarchy management functionality moved to WorkflowManagementPage



  const renderContent = () => {
    switch (activeTab) {
      case 'Entity Management':
        return renderEntityManagement();
      case 'Legal Entity':
        return renderLegalEntityTab();
      case 'AI Assistant':
        return renderAIAssistant();
      case 'Channel Settings':
        return renderChannelSettings();
      case 'System Settings':
        return renderSystemSettings();
      case 'Logs':
        return renderEnterpriseAuditDashboard();
      default:
        return renderEntityManagement();
    }
  };

  // State per il nuovo modal sede operativa
  const [newStore, setNewStore] = useState({
    // ⭐ CAMPI ALLINEATI AL DATABASE SCHEMA
    category: 'sales_point',               // Database: category (enum) - ✅ FIRST FIELD
    hasWarehouse: true,                    // Database: has_warehouse (default true for sales_point/warehouse)
    code: '',                              // Database: code
    nome: '',                              // Database: nome  
    address: '',                           // Database: address
    citta: '',                             // Database: citta
    provincia: '',                         // Database: provincia
    cap: '',                               // Database: cap
    region: '',                            // Database: region
    geo: { lat: null, lng: null } as { lat: number | null, lng: number | null }, // Database: geo (jsonb)
    phone: '',                             // Database: phone
    email: '',                             // Database: email
    whatsapp1: '',                         // Database: whatsapp1
    whatsapp2: '',                         // Database: whatsapp2
    facebook: '',                          // Database: facebook
    instagram: '',                         // Database: instagram
    tiktok: '',                            // Database: tiktok
    google_maps_url: '',                   // Database: google_maps_url
    telegram: '',                          // Database: telegram
    organization_entity_id: null as string | null,  // Database: organization_entity_id (UUID)
    commercial_area_id: null as string | null, // Database: commercial_area_id (UUID)
    channel_id: null as string | null,     // Database: channel_id (UUID)
    status: 'active',                      // Database: status (default 'active')
    // 🔧 CAMPI BUSINESS
    brands: [] as string[],                // Relazione M:N con store_brands
    // 🗓️ CAMPI DATE (opzionali per UI)
    opened_at: null as string | null,      // Database: opened_at
    closed_at: null as string | null       // Database: closed_at
  });

  // 📋 VALIDATION STATE FOR STORE MODAL
  const [storeValidationErrors, setStoreValidationErrors] = useState<Record<string, string>>({});
  const [storeValidationState, setStoreValidationState] = useState<Record<string, 'valid' | 'invalid' | 'untouched'>>({
    phone: 'untouched',
    email: 'untouched',
    whatsapp1: 'untouched',
    whatsapp2: 'untouched',
    facebook: 'untouched',
    instagram: 'untouched',
    tiktok: 'untouched',
    google_maps_url: 'untouched',
    telegram: 'untouched'
  });

  // 🔍 VALIDATION FUNCTIONS FOR STORE MODAL
  const validateStoreField = (fieldName: string, value: string): { isValid: boolean; error?: string } => {
    try {
      switch (fieldName) {
        case 'email':
          if (!value) return { isValid: true }; // Optional field
          z.string().email("Email non valida").parse(value);
          return { isValid: true };

        case 'phone':
          if (!value) return { isValid: true }; // Optional field
          italianPhoneSchema.parse(value);
          return { isValid: true };

        case 'whatsapp1':
        case 'whatsapp2':
          if (!value) return { isValid: true }; // Optional field
          italianPhoneSchema.parse(value);
          return { isValid: true };

        case 'facebook':
        case 'instagram':
        case 'tiktok':
        case 'google_maps_url':
        case 'telegram':
          if (!value) return { isValid: true }; // Optional field
          websiteUrlSchema.parse(value);
          return { isValid: true };

        default:
          return { isValid: true };
      }
    } catch (error: any) {
      const errorMessage = error.errors?.[0]?.message || error.message || 'Valore non valido';
      return { isValid: false, error: errorMessage };
    }
  };

  // 🎯 HANDLE STORE FIELD VALIDATION ON BLUR
  const handleStoreFieldValidation = (fieldName: string, value: string) => {
    const validation = validateStoreField(fieldName, value);
    
    setStoreValidationState(prev => ({
      ...prev,
      [fieldName]: validation.isValid ? 'valid' : 'invalid'
    }));

    setStoreValidationErrors(prev => ({
      ...prev,
      [fieldName]: validation.error || ''
    }));

    // Auto-format phone numbers
    if ((fieldName === 'phone' || fieldName === 'whatsapp1' || fieldName === 'whatsapp2') && validation.isValid && value) {
      try {
        const formatted = italianPhoneSchema.parse(value);
        setNewStore(prev => ({ ...prev, [fieldName]: formatted }));
      } catch {
        // If formatting fails, keep original value
      }
    }

    // Auto-format URLs  
    if (['facebook', 'instagram', 'tiktok', 'google_maps_url', 'telegram'].includes(fieldName) && validation.isValid && value) {
      try {
        const formatted = websiteUrlSchema.parse(value);
        setNewStore(prev => ({ ...prev, [fieldName]: formatted }));
      } catch {
        // If formatting fails, keep original value
      }
    }
  };

  // 🎨 GET FIELD BORDER STYLE BASED ON VALIDATION STATE
  const getStoreFieldStyle = (fieldName: string, baseStyle: React.CSSProperties): React.CSSProperties => {
    const state = storeValidationState[fieldName];
    let borderColor = baseStyle.borderColor || '#d1d5db';
    let boxShadow = 'none';

    if (state === 'valid') {
      borderColor = '#10b981'; // Green for valid
      boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
    } else if (state === 'invalid') {
      borderColor = '#ef4444'; // Red for invalid
      boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
    }

    return {
      ...baseStyle,
      borderColor,
      boxShadow: storeValidationState[fieldName] !== 'untouched' ? boxShadow : baseStyle.boxShadow || 'none'
    };
  };

  // 🔄 RESET STORE VALIDATION ON MODAL OPEN/CLOSE
  useEffect(() => {
    if (storeModal.open) {
      // Reset validation state when modal opens
      setStoreValidationErrors({});
      setStoreValidationState({
        phone: 'untouched',
        email: 'untouched', 
        whatsapp1: 'untouched',
        whatsapp2: 'untouched',
        facebook: 'untouched',
        instagram: 'untouched',
        tiktok: 'untouched',
        google_maps_url: 'untouched',
        telegram: 'untouched'
      });
    }
  }, [storeModal.open]);

  // 🆔 USER MODAL VALIDATION STATE MANAGEMENT
  const [userValidationErrors, setUserValidationErrors] = useState<Record<string, string>>({});
  const [userValidationState, setUserValidationState] = useState<Record<string, 'valid' | 'invalid' | 'untouched'>>({
    email: 'untouched',
    telefono: 'untouched'
  });

  // 🔍 VALIDATION FUNCTIONS FOR USER MODAL
  const validateUserField = (fieldName: string, value: string): { isValid: boolean; error?: string } => {
    try {
      switch (fieldName) {
        case 'email':
          if (!value) return { isValid: false, error: 'Email richiesta' }; // Required field
          z.string().email("Email non valida").parse(value);
          return { isValid: true };

        case 'telefono':
          if (!value) return { isValid: false, error: 'Telefono richiesto' }; // Required field
          italianPhoneSchema.parse(value);
          return { isValid: true };

        default:
          return { isValid: true };
      }
    } catch (error: any) {
      const errorMessage = error.errors?.[0]?.message || error.message || 'Valore non valido';
      return { isValid: false, error: errorMessage };
    }
  };

  // 🎯 HANDLE USER FIELD VALIDATION ON BLUR
  const handleUserFieldValidation = (fieldName: string, value: string) => {
    const validation = validateUserField(fieldName, value);
    
    setUserValidationState(prev => ({
      ...prev,
      [fieldName]: validation.isValid ? 'valid' : 'invalid'
    }));

    setUserValidationErrors(prev => ({
      ...prev,
      [fieldName]: validation.error || ''
    }));

    // Auto-format phone numbers
    if (fieldName === 'telefono' && validation.isValid && value) {
      try {
        const formatted = italianPhoneSchema.parse(value);
        setNewUser(prev => ({ ...prev, [fieldName]: formatted }));
      } catch {
        // If formatting fails, keep original value
      }
    }
  };

  // 🎨 GET USER FIELD BORDER STYLE BASED ON VALIDATION STATE
  const getUserFieldStyle = (fieldName: string, baseStyle: React.CSSProperties): React.CSSProperties => {
    const state = userValidationState[fieldName];
    let borderColor = baseStyle.borderColor || '#d1d5db';
    let boxShadow = 'none';

    if (state === 'valid') {
      borderColor = '#10b981'; // Green for valid
      boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
    } else if (state === 'invalid') {
      borderColor = '#ef4444'; // Red for invalid
      boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
    }

    return {
      ...baseStyle,
      borderColor,
      boxShadow: userValidationState[fieldName] !== 'untouched' ? boxShadow : baseStyle.boxShadow || 'none'
    };
  };

  // 🔄 RESET USER VALIDATION ON MODAL OPEN/CLOSE
  useEffect(() => {
    if (userModal.open) {
      // Reset validation state when modal opens
      setUserValidationErrors({});
      setUserValidationState({
        email: 'untouched',
        telefono: 'untouched'
      });
    }
  }, [userModal.open]);

  // Precompila i campi del modal quando è in modalità edit
  useEffect(() => {
    if (storeModal.open && storeModal.data) {
      // Modalità EDIT - precompila i campi con i dati esistenti
      const item = storeModal.data;
      setNewStore({
        category: item.category || 'sales_point',
        hasWarehouse: item.hasWarehouse ?? (item.category !== 'office'), // Default based on category
        code: item.code || '',
        nome: item.nome || '',
        address: item.address || '',
        citta: item.citta || '',
        provincia: item.provincia || '',
        cap: item.cap || '',
        region: item.region || '',
        geo: item.geo || { lat: null, lng: null },
        phone: item.phone || '',
        email: item.email || '',
        whatsapp1: item.whatsapp1 || '',
        whatsapp2: item.whatsapp2 || '',
        facebook: item.facebook || '',
        instagram: item.instagram || '',
        tiktok: item.tiktok || '',
        google_maps_url: item.googleMapsUrl || item.google_maps_url || '',
        telegram: item.telegram || '',
        organization_entity_id: item.organizationEntityId || item.organization_entity_id || item.legalEntityId || item.legal_entity_id || null,
        commercial_area_id: item.commercialAreaId || item.commercial_area_id || null,
        channel_id: item.channelId || item.channel_id || null,
        status: item.status || 'active',
        brands: item.brands || [],
        opened_at: item.openedAt || item.opened_at || null,
        closed_at: item.closedAt || item.closed_at || null
      });
    } else if (storeModal.open && !storeModal.data) {
      // Modalità CREATE - resetta i campi
      setNewStore({
        category: 'sales_point',
        hasWarehouse: true, // Default true for sales_point
        code: '',
        nome: '',
        address: '',
        citta: '',
        provincia: '',
        cap: '',
        region: '',
        geo: { lat: null, lng: null },
        phone: '',
        email: '',
        whatsapp1: '',
        whatsapp2: '',
        facebook: '',
        instagram: '',
        tiktok: '',
        google_maps_url: '',
        telegram: '',
        organization_entity_id: null,
        commercial_area_id: null,
        channel_id: null,
        status: 'active',
        brands: [],
        opened_at: null,
        closed_at: null
      });
    }
  }, [storeModal.open, storeModal.data]);

  // Helper to check if a store is active (handles both 'active' and 'Attivo' status variants)
  const isStoreActive = (status: string | undefined): boolean => {
    if (!status) return false;
    const normalized = status.toLowerCase();
    return normalized === 'active' || normalized === 'attivo' || normalized.startsWith('attiv');
  };

  // ✅ POPULATE newUser when userModal opens in EDIT mode
  useEffect(() => {
    if (userModal.open && userModal.data) {
      // Modalità EDIT - precompila i campi con i dati esistenti
      const user = userModal.data;
      const scopeLevel = user.scopeLevel || 'tenant';
      const orgEntities = user.selectedOrganizationEntities || user.selectedLegalEntities || [];
      const isTenantScope = scopeLevel === 'tenant';
      
      // Derive selectedStores from hierarchy when backend returns org-level scope without explicit stores
      let derivedStores = user.selectedStores || [];
      if (!isTenantScope && orgEntities.length > 0 && derivedStores.length === 0 && puntiVenditaList.length > 0) {
        // Auto-populate all active stores for the selected organization entities
        derivedStores = puntiVenditaList
          .filter(pv => orgEntities.includes(pv.organizationEntityId) && isStoreActive(pv.status))
          .map(pv => pv.id);
      }
      
      setNewUser({
        username: user.username || user.email || '',
        password: '',
        confirmPassword: '',
        ruolo: user.ruolo || user.role || '',
        cambioPasswordObbligatorio: user.cambioPasswordObbligatorio ?? false,
        ragioneSociale_id: user.ragioneSociale_id || user.legalEntityId || null,
        puntiVendita_ids: user.puntiVendita_ids || user.storeIds || [],
        puntoVenditaPreferito_id: user.puntoVenditaPreferito_id || user.primaryStoreId || null,
        scopeLevel: scopeLevel,
        selectedOrganizationEntities: orgEntities,
        primaryOrganizationEntityId: user.primaryOrganizationEntityId || null,
        selectedStores: derivedStores,
        primaryStoreId: user.primaryStoreId || null,
        // Tenant scope: selectAll=true and clear explicit selections
        selectAllLegalEntities: isTenantScope,
        selectedAreas: isTenantScope ? [] : (user.selectedAreas || []),
        // Only use entity selections for non-tenant scope
        selectedLegalEntities: isTenantScope ? [] : orgEntities,
        nome: user.nome || user.firstName || '',
        cognome: user.cognome || user.lastName || '',
        avatar: {
          url: user.avatarUrl || user.avatar?.url || user.profileImageUrl || null,
          blob: null,
          type: 'upload' as 'upload' | 'generated'
        },
        codiceFiscale: user.codiceFiscale || user.fiscalCode || '',
        dataNascita: user.dataNascita || user.birthDate || '',
        luogoNascita: user.luogoNascita || user.birthPlace || '',
        sesso: user.sesso || user.gender || 'M',
        email: user.email || '',
        emailPersonale: user.emailPersonale || user.personalEmail || '',
        telefono: user.telefono || user.phone || '',
        telefonoAziendale: user.telefonoAziendale || user.workPhone || '',
        via: user.via || user.address?.via || '',
        civico: user.civico || user.address?.civico || '',
        citta: user.citta || user.address?.city || '',
        cap: user.cap || user.address?.postalCode || '',
        provincia: user.provincia || user.address?.province || '',
        paese: user.paese || user.address?.country || 'Italia',
        tipoDocumento: user.tipoDocumento || user.documentType || 'Carta Identità',
        numeroDocumento: user.numeroDocumento || user.documentNumber || '',
        dataScadenzaDocumento: user.dataScadenzaDocumento || user.documentExpiry || '',
        stato: user.stato || (user.status === 'Active' ? 'Attivo' : user.status === 'Suspended' ? 'Sospeso' : user.status) || 'Attivo',
        dataInizioValidita: user.dataInizioValidita || user.validFrom || '',
        dataFineValidita: user.dataFineValidita || user.validUntil || '',
        notificheEmail: user.notificheEmail ?? user.emailNotifications ?? true,
        notificheSMS: user.notificheSMS ?? user.smsNotifications ?? false,
        lingua: user.lingua || user.language || 'it',
        fuso: user.fuso || user.timezone || 'Europe/Rome',
        extension: {
          enabled: user.extension?.enabled || false,
          extNumber: user.extension?.extNumber || '',
          sipDomain: user.extension?.sipDomain || '',
          classOfService: user.extension?.classOfService || 'agent',
          voicemailEnabled: user.extension?.voicemailEnabled ?? true,
          storeId: user.extension?.storeId || null
        },
        tipoContratto: user.tipoContratto || user.contractType || 'Indeterminato',
        dataAssunzione: user.dataAssunzione || user.hireDate || '',
        livello: user.livello || user.level || '',
        ccnl: user.ccnl || 'Commercio',
        oreLavoro: user.oreLavoro || user.workHours || '40',
        note: user.note || user.notes || ''
      });
    } else if (userModal.open && !userModal.data) {
      // Modalità CREATE - resetta i campi (già gestito dal onClick del bottone "Nuovo Utente")
    }
  }, [userModal.open, userModal.data, puntiVenditaList]);

  // State per il nuovo utente
  const [newUser, setNewUser] = useState({
    // Dati di accesso
    username: '',
    password: '',
    confirmPassword: '',
    ruolo: '',
    cambioPasswordObbligatorio: true,
    
    // Relazioni obbligatorie (legacy - keeping for backward compatibility)
    ragioneSociale_id: null as string | null,
    puntiVendita_ids: [] as string[],
    puntoVenditaPreferito_id: null as string | null,
    
    // ✅ NEW SCOPE SYSTEM (uses UUID strings and relational tables)
    scopeLevel: 'tenant' as 'tenant' | 'organization_entity' | 'store',
    selectedOrganizationEntities: [] as string[],  // UUID strings
    primaryOrganizationEntityId: null as string | null,
    selectedStores: [] as string[],  // UUID strings
    primaryStoreId: null as string | null,
    
    // Legacy scope fields (for backward compatibility during transition)
    selectAllLegalEntities: false,
    selectedAreas: [] as string[],
    selectedLegalEntities: [] as string[],
    
    // Informazioni personali
    nome: '',
    cognome: '',
    avatar: {
      url: null as string | null,
      blob: null as Blob | null,
      type: 'upload' as 'upload' | 'generated'
    },
    codiceFiscale: '',
    dataNascita: '',
    luogoNascita: '',
    sesso: 'M',
    
    // Contatti
    email: '',
    emailPersonale: '',
    telefono: '',
    telefonoAziendale: '',
    
    // Indirizzo residenza
    via: '',
    civico: '',
    citta: '',
    cap: '',
    provincia: '',
    paese: 'Italia',
    
    // Documenti
    tipoDocumento: 'Carta Identità',
    numeroDocumento: '',
    dataScadenzaDocumento: '',
    
    // Impostazioni account
    stato: 'attivo',
    dataInizioValidita: '',
    dataFineValidita: '',
    notificheEmail: true,
    notificheSMS: false,
    lingua: 'it',
    fuso: 'Europe/Rome',
    
    // ✅ Configurazione VoIP Extension (1:1 relationship)
    extension: {
      enabled: false,         // Toggle per abilitare provisioning extension
      extNumber: '',          // Numero interno (3-6 cifre)
      sipDomain: '',          // SIP domain (es: tenant1.pbx.w3suite.it)
      classOfService: 'agent' as 'agent' | 'supervisor' | 'admin',
      voicemailEnabled: true,
      storeId: null as string | null
    },
    
    // Informazioni contrattuali
    tipoContratto: 'Indeterminato',
    dataAssunzione: '',
    livello: '',
    ccnl: 'Commercio',
    oreLavoro: '40',
    
    // Note
    note: ''
  });

  // State per il modal ragione sociale
  const [newRagioneSociale, setNewRagioneSociale] = useState({
    codice: '',
    nome: '',
    formaGiuridica: 'Srl',
    pIva: '',
    codiceFiscale: '',
    indirizzo: '',
    citta: '',
    cap: '',
    provincia: '',
    telefono: '',
    email: '',
    pec: '',
    stato: 'Attiva',
    // Missing enterprise fields for 1:1 integrity
    capitaleSociale: '',
    dataCostituzione: '',
    rea: '',
    registroImprese: '',
    // New enterprise fields
    logo: '',
    codiceSDI: '',
    // Administrative contact section
    refAmminNome: '',
    refAmminCognome: '',
    refAmminEmail: '',
    refAmminCodiceFiscale: '',
    refAmminIndirizzo: '',
    refAmminCitta: '',
    refAmminCap: '',
    refAmminPaese: '',
    // Notes field
    note: ''
  });

  // 🔧 FIX: Popola il form quando viene aperto in modalità modifica
  useEffect(() => {
    if (legalEntityModal.open && legalEntityModal.data) {
      console.log('🔄 Populating form with existing legal entity data:', legalEntityModal.data);
      // Popola il form con i dati esistenti
      setNewRagioneSociale({
        codice: legalEntityModal.data.codice || '',
        nome: legalEntityModal.data.nome || '',
        formaGiuridica: legalEntityModal.data.formaGiuridica || 'Srl',
        pIva: legalEntityModal.data.pIva || '',
        codiceFiscale: legalEntityModal.data.codiceFiscale || '',
        indirizzo: legalEntityModal.data.indirizzo || '',
        citta: legalEntityModal.data.citta || '',
        cap: legalEntityModal.data.cap || '',
        provincia: legalEntityModal.data.provincia || '',
        telefono: legalEntityModal.data.telefono || '',
        email: legalEntityModal.data.email || '',
        pec: legalEntityModal.data.pec || '',
        stato: legalEntityModal.data.stato || 'Attiva',
        capitaleSociale: legalEntityModal.data.capitaleSociale || '',
        dataCostituzione: legalEntityModal.data.dataCostituzione || '',
        rea: legalEntityModal.data.rea || '',
        registroImprese: legalEntityModal.data.registroImprese || '',
        logo: legalEntityModal.data.logo || '',
        codiceSDI: legalEntityModal.data.codiceSDI || '',
        refAmminNome: legalEntityModal.data.refAmminNome || '',
        refAmminCognome: legalEntityModal.data.refAmminCognome || '',
        refAmminEmail: legalEntityModal.data.refAmminEmail || '',
        refAmminCodiceFiscale: legalEntityModal.data.refAmminCodiceFiscale || '',
        refAmminIndirizzo: legalEntityModal.data.refAmminIndirizzo || '',
        refAmminCitta: legalEntityModal.data.refAmminCitta || '',
        refAmminCap: legalEntityModal.data.refAmminCap || '',
        refAmminPaese: legalEntityModal.data.refAmminPaese || '',
        note: legalEntityModal.data.note || ''
      });
    } else if (legalEntityModal.open && !legalEntityModal.data) {
      console.log('🆕 Resetting form for new legal entity');
      // Reset del form per nuova entità
      setNewRagioneSociale({
        codice: '',
        nome: '',
        formaGiuridica: 'Srl',
        pIva: '',
        codiceFiscale: '',
        indirizzo: '',
        citta: '',
        cap: '',
        provincia: '',
        telefono: '',
        email: '',
        pec: '',
        stato: 'Attiva',
        capitaleSociale: '',
        dataCostituzione: '',
        rea: '',
        registroImprese: '',
        logo: '',
        codiceSDI: '',
        refAmminNome: '',
        refAmminCognome: '',
        refAmminEmail: '',
        refAmminCodiceFiscale: '',
        refAmminIndirizzo: '',
        refAmminCitta: '',
        refAmminCap: '',
        refAmminPaese: '',
        note: ''
      });
    }
  }, [legalEntityModal.open, legalEntityModal.data]);


  // Ottieni il tenant ID dal localStorage o usa il demo tenant
  const getCurrentTenantId = () => {
    const tenantId = localStorage.getItem('currentTenantId');
    return tenantId || '00000000-0000-0000-0000-000000000001';
  };

  // Handler per salvare la ragione sociale - USA API REALE (CREATE/UPDATE)
  const handleSaveRagioneSociale = async () => {
    try {
      const currentTenantId = DEMO_TENANT_ID;
      const isEdit = legalEntityModal.data && legalEntityModal.data.id;
      
      // Genera codice RS: inizia con 8, almeno 7 cifre totali  
      const newCode = newRagioneSociale.codice || `8${String(Date.now()).slice(-6)}`;
      
      // Prepara i dati per l'API con tutti i nuovi campi enterprise
      const legalEntityData = {
        tenantId: currentTenantId,
        codice: newCode,
        nome: newRagioneSociale.nome || 'Nuova Ragione Sociale',
        formaGiuridica: newRagioneSociale.formaGiuridica,
        pIva: newRagioneSociale.pIva || `IT${String(Math.floor(Math.random() * 99999999999) + 10000000000).padStart(11, '0')}`,
        codiceFiscale: newRagioneSociale.codiceFiscale,
        stato: newRagioneSociale.stato,
        indirizzo: newRagioneSociale.indirizzo,
        citta: newRagioneSociale.citta || 'Milano',
        cap: newRagioneSociale.cap,
        provincia: newRagioneSociale.provincia,
        telefono: newRagioneSociale.telefono,
        email: newRagioneSociale.email,
        pec: newRagioneSociale.pec,
        // Missing enterprise fields for 1:1 integrity
        capitaleSociale: newRagioneSociale.capitaleSociale,
        dataCostituzione: newRagioneSociale.dataCostituzione,
        rea: newRagioneSociale.rea,
        registroImprese: newRagioneSociale.registroImprese,
        // New enterprise fields - using camelCase
        logo: newRagioneSociale.logo,
        codiceSDI: newRagioneSociale.codiceSDI,
        // Administrative contact section
        refAmminNome: newRagioneSociale.refAmminNome,
        refAmminCognome: newRagioneSociale.refAmminCognome,
        refAmminEmail: newRagioneSociale.refAmminEmail,
        refAmminCodiceFiscale: newRagioneSociale.refAmminCodiceFiscale,
        refAmminIndirizzo: newRagioneSociale.refAmminIndirizzo,
        refAmminCitta: newRagioneSociale.refAmminCitta,
        refAmminCap: newRagioneSociale.refAmminCap,
        refAmminPaese: newRagioneSociale.refAmminPaese,
        // Notes field
        note: newRagioneSociale.note
      };

      console.log(`💾 ${isEdit ? 'Updating' : 'Creating'} legal entity:`, legalEntityData);

      let result;
      if (isEdit) {
        // Update existing legal entity using ApiService (with proper auth headers)
        result = await apiService.updateLegalEntity(legalEntityModal.data.id, legalEntityData);
      } else {
        // Create new legal entity using ApiService
        result = await apiService.createLegalEntity(legalEntityData);
      }
      
      if (result.success) {
        console.log(`✅ Legal entity ${isEdit ? 'updated' : 'created'}:`, result.data);
        
        // Refresh the list dopo l'operazione
        await refetchLegalEntities();
        
        setLegalEntityModal({ open: false, data: null });
        
        alert(`Ragione sociale ${isEdit ? 'modificata' : 'salvata'} con successo!`);
      } else {
        console.error(`❌ Error ${isEdit ? 'updating' : 'creating'} legal entity:`, result.error);
        alert(`Errore nella ${isEdit ? 'modifica' : 'creazione'} della ragione sociale: ${result.error}. Riprova.`);
      }

    } catch (error) {
      console.error(`❌ Error ${legalEntityModal.data ? 'updating' : 'creating'} legal entity:`, error);
      alert(`Errore nella ${legalEntityModal.data ? 'modifica' : 'creazione'} della ragione sociale. Riprova.`);
    }
  };


  // Handler per salvare/aggiornare punto vendita - USA API REALE
  const handleSaveStore = async () => {
    try {
      const currentTenantId = DEMO_TENANT_ID;
      
      // ✅ VALIDAZIONE RELAZIONI 1:1 OBBLIGATORIE
      if (!newStore.organization_entity_id) {
        alert('Errore: Ragione Sociale è obbligatoria per creare una sede operativa.');
        return;
      }
      
      // ✅ VALIDAZIONE CONDIZIONALE CANALE (obbligatorio solo per sales_point)
      if (newStore.category === 'sales_point' && !newStore.channel_id) {
        alert('Errore: Canale di vendita è obbligatorio per i punti vendita.');
        return;
      }
      
      if (!newStore.commercial_area_id) {
        alert('Errore: Area commerciale è obbligatoria per creare una sede operativa.');
        return;
      }
      
      // ✅ VALIDAZIONE CONDIZIONALE BRANDS (obbligatorio solo per sales_point)
      if (newStore.category === 'sales_point' && (!newStore.brands || newStore.brands.length === 0)) {
        alert('Errore: Brand è obbligatorio per i punti vendita.');
        return;
      }
      
      const isEdit = Boolean(storeModal.data);
      
      // ✅ AUTO-GENERAZIONE CODICE BASATA SU CATEGORIA (5xxx=magazzino, 6xxx=ufficio, 9xxx=sales)
      let newCode = newStore.code;
      if (!newCode && !isEdit) {
        const timestamp = String(Date.now()).slice(-6);
        switch (newStore.category) {
          case 'warehouse':
            newCode = `5${timestamp}`; // 5xxxxxxx per magazzini
            break;
          case 'office':
            newCode = `6${timestamp}`; // 6xxxxxxx per uffici
            break;
          case 'sales_point':
          default:
            newCode = `9${timestamp}`; // 9xxxxxxx per punti vendita
            break;
        }
      } else if (!newCode && isEdit) {
        newCode = storeModal.data.code;
      }
      
      const storeData = {
        tenantId: currentTenantId,
        organizationEntityId: newStore.organization_entity_id,
        category: newStore.category,              // ✅ Category field added
        hasWarehouse: newStore.hasWarehouse,      // ✅ Warehouse flag added
        code: newCode,                        
        nome: newStore.nome || 'Nuova Sede Operativa',
        address: newStore.address || 'Via Nuova 1',
        citta: newStore.citta || 'Milano',
        provincia: newStore.provincia,
        cap: newStore.cap,
        region: newStore.region,
        geo: newStore.geo,                    
        phone: newStore.phone,                
        email: newStore.email,
        whatsapp1: newStore.whatsapp1,
        whatsapp2: newStore.whatsapp2,
        facebook: newStore.facebook,
        instagram: newStore.instagram,
        tiktok: newStore.tiktok,
        googleMapsUrl: newStore.google_maps_url,
        telegram: newStore.telegram,
        commercialAreaId: newStore.commercial_area_id,
        channelId: newStore.channel_id,
        status: newStore.status,              
        openedAt: newStore.opened_at,
        closedAt: newStore.closed_at
      };

      let result;
      if (isEdit) {
        // Modalità UPDATE
        result = await apiService.updateStore(storeModal.data.id, storeData);
      } else {
        // Modalità CREATE
        result = await apiService.createStore(storeData);
      }
      
      if (result.success) {
        // Chiudi modal e reset form
        setStoreModal({ open: false, data: null });
        setNewStore({
          category: 'sales_point',
          hasWarehouse: true,
          code: '',
          nome: '',
          address: '',
          citta: '',
          provincia: '',
          cap: '',
          region: '',
          geo: { lat: null, lng: null },
          phone: '',
          email: '',
          whatsapp1: '',
          whatsapp2: '',
          facebook: '',
          instagram: '',
          tiktok: '',
          google_maps_url: '',
          telegram: '',
          organization_entity_id: null,
          commercial_area_id: null,
          channel_id: null,
          status: 'active',
          brands: [],
          opened_at: null,
          closed_at: null
        });

        // Ricarica i dati per mostrare le modifiche
        await reloadStoreData();
        
      } else {
        console.error(`❌ Error ${isEdit ? 'updating' : 'creating'} store:`, result.error);
        alert(`Errore nella ${isEdit ? 'modifica' : 'creazione'} della sede operativa. Riprova.`);
      }
    } catch (error) {
      console.error(`❌ Error ${storeModal.data ? 'updating' : 'creating'} sede operativa:`, error);
      alert(`Errore nella ${storeModal.data ? 'modifica' : 'creazione'} della sede operativa. Riprova.`);
    }
  };

  return (
    <>
      {/* Modal Ragione Sociale */}
      {legalEntityModal.open && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(0.25rem)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '0.75rem',
            width: '90%',
            maxWidth: '37.5rem',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20.3125rem 3.125rem -0.75rem rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            borderTop: '3px solid transparent',
            borderImage: 'linear-gradient(90deg, #FF6900, #7B2CBF) 1',
            animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            {/* Header Modal - Clean Design */}
            <div style={{
              padding: '1.5rem 2rem',
              background: '#ffffff',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}>
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: '0.625rem',
                      background: 'linear-gradient(135deg, #FF6900, #ff8533)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 'none'
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <h2 style={{
                      fontSize: '1.25rem',
                      fontWeight: '600',
                      color: '#111827',
                      margin: 0,
                      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                      position: 'relative',
                      zIndex: 1,
                      textShadow: 'none'
                    }}>
                      {legalEntityModal.data ? 'Modifica Ragione Sociale' : 'Nuova Ragione Sociale'}
                    </h2>
                  </div>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    margin: 0,
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                    fontWeight: 500
                  }}>
                    {legalEntityModal.data ? 'Modifica i dati dell\'entità giuridica' : 'Inserisci i dati della nuova entità giuridica'}
                  </p>
                </div>
                <button
                  onClick={() => setLegalEntityModal({ open: false, data: null })}
                  style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    border: '1px solid rgba(226, 232, 240, 0.8)',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    color: '#64748b',
                    backdropFilter: 'blur(0.5rem)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(248, 250, 252, 0.95)';
                    e.currentTarget.style.color = '#374151';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
                    e.currentTarget.style.color = '#64748b';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body Modal */}
            <div style={{ padding: '2rem', background: '#ffffff', flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Codice */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Codice Ragione Sociale
                  </label>
                  <input
                    type="text"
                    placeholder="8xxxxxxx (auto-generato, min. 7 cifre)"
                    value={newRagioneSociale.codice}
                    onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, codice: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.625rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      color: '#374151',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      lineHeight: '1.5'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.background = '#fafbfc';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Nome */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Nome Ragione Sociale <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="es. Franchising Ltd"
                    value={newRagioneSociale.nome}
                    onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, nome: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.625rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      color: '#374151',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      lineHeight: '1.5'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.background = '#fafbfc';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Forma Giuridica */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Forma Giuridica <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={newRagioneSociale.formaGiuridica}
                    onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, formaGiuridica: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.625rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#FF6900';
                      e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                      e.target.style.boxShadow = '0 0.25rem 1.25rem rgba(255, 105, 0, 0.2)';
                      e.target.style.transform = 'translateY(-1px)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                      e.target.style.background = 'rgba(255, 255, 255, 0.7)';
                      e.target.style.boxShadow = 'none';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  >
                    <option value="">Seleziona...</option>
                    {legalForms.length > 0 ? (
                      (legalForms as any[]).map((form: any) => (
                        <option key={form.code} value={form.code}>
                          {form.code} - {form.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="SRL">SRL - Società a Responsabilità Limitata</option>
                        <option value="SPA">SPA - Società per Azioni</option>
                        <option value="SNC">SNC - Società in Nome Collettivo</option>
                        <option value="SAS">SAS - Società in Accomandita Semplice</option>
                        <option value="SAPA">SAPA - Società in Accomandita per Azioni</option>
                        <option value="SRLS">SRLS - Società a Responsabilità Limitata Semplificata</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Partita IVA */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Partita IVA <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="IT12345678901"
                    value={newRagioneSociale.pIva}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase();
                      setNewRagioneSociale({ ...newRagioneSociale, pIva: value });
                    }}
                    onBlur={composeEventHandlers(
                      (e) => {
                        // Real-time P.IVA validation for legal entities
                        if (e.target.value) {
                          const vatValidation = legalEntityValidationSchema.shape.pIva?.safeParse(e.target.value);
                          if (!vatValidation?.success) {
                            e.target.style.borderColor = '#ef4444';
                            e.target.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
                            let errorDiv = e.target.parentElement?.querySelector('.validation-error');
                            if (!errorDiv) {
                              errorDiv = document.createElement('div');
                              errorDiv.className = 'validation-error';
                              e.target.parentElement?.appendChild(errorDiv);
                            }
                            errorDiv.textContent = 'P.IVA non valida (formato: IT + 11 cifre)';
                            errorDiv.style.cssText = 'color: #ef4444; font-size: 0.75rem; margin-top: 0.25rem;';
                          } else {
                            e.target.style.borderColor = '#10b981';
                            e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                            const errorDiv = e.target.parentElement?.querySelector('.validation-error');
                            errorDiv?.remove();
                          }
                        } else {
                          e.target.style.borderColor = '#e5e7eb';
                          e.target.style.boxShadow = 'none';
                          const errorDiv = e.target.parentElement?.querySelector('.validation-error');
                          errorDiv?.remove();
                        }
                      },
                      (e) => {
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                        e.target.style.background = 'rgba(255, 255, 255, 0.7)';
                        e.target.style.boxShadow = 'none';
                        e.target.style.transform = 'translateY(0)';
                      }
                    )}
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.625rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      fontFamily: 'monospace',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#FF6900';
                      e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                      e.target.style.boxShadow = '0 0.25rem 1.25rem rgba(255, 105, 0, 0.2)';
                      e.target.style.transform = 'translateY(-1px)';
                    }}
                  />
                </div>

                {/* Codice Fiscale */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Codice Fiscale
                  </label>
                  <input
                    type="text"
                    placeholder="RSSMRA80A01H501U"
                    value={newRagioneSociale.codiceFiscale}
                    onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, codiceFiscale: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.625rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      fontFamily: 'monospace',
                      textTransform: 'uppercase',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#FF6900';
                      e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                      e.target.style.boxShadow = '0 0.25rem 1.25rem rgba(255, 105, 0, 0.2)';
                      e.target.style.transform = 'translateY(-1px)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                      e.target.style.background = 'rgba(255, 255, 255, 0.7)';
                      e.target.style.boxShadow = 'none';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  />
                </div>

                {/* Capitale Sociale */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Capitale Sociale
                  </label>
                  <input
                    type="text"
                    placeholder="es. €10.000"
                    value={newRagioneSociale.capitaleSociale}
                    onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, capitaleSociale: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.625rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      color: '#374151',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      lineHeight: '1.5'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.background = '#fafbfc';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Data Costituzione */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Data Costituzione
                  </label>
                  <input
                    type="date"
                    value={newRagioneSociale.dataCostituzione}
                    onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, dataCostituzione: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.625rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      color: '#374151',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      lineHeight: '1.5'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.background = '#fafbfc';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* REA */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    R.E.A.
                  </label>
                  <input
                    type="text"
                    placeholder="es. MI-1234567"
                    value={newRagioneSociale.rea}
                    onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, rea: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.625rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      color: '#374151',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      lineHeight: '1.5'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.background = '#fafbfc';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Registro Imprese */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Registro Imprese
                  </label>
                  <input
                    type="text"
                    placeholder="es. 123456789012"
                    value={newRagioneSociale.registroImprese}
                    onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, registroImprese: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.625rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      color: '#374151',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      lineHeight: '1.5'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.background = '#fafbfc';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Logo Aziendale */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Logo Aziendale 
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginLeft: '0.25rem', cursor: 'help' }} 
                          title="File PNG, dimensioni consigliate: 300x13.125rem, max 2MB">
                      ⓘ
                    </span>
                  </label>
                  <input
                    type="file"
                    accept=".png"
                    data-testid="input-logo"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // Convert to base64 or handle file upload
                        const reader = new FileReader();
                        reader.onload = () => {
                          setNewRagioneSociale({ ...newRagioneSociale, logo: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.625rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      color: '#374151',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      lineHeight: '1.5'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.background = '#fafbfc';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Codice SDI */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Codice SDI
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginLeft: '0.25rem' }}>
                      (Sistema di Interscambio)
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="A4707H7"
                    data-testid="input-codice-sdi"
                    value={newRagioneSociale.codiceSDI}
                    onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, codiceSDI: e.target.value.toUpperCase() })}
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.625rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      fontFamily: 'monospace',
                      textTransform: 'uppercase',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#FF6900';
                      e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                      e.target.style.boxShadow = '0 0.25rem 1.25rem rgba(255, 105, 0, 0.2)';
                      e.target.style.transform = 'translateY(-1px)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                      e.target.style.background = 'rgba(255, 255, 255, 0.7)';
                      e.target.style.boxShadow = 'none';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  />
                </div>

                {/* Indirizzo - full width */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Indirizzo Sede Legale <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="es. Via Roma 123"
                    value={newRagioneSociale.indirizzo}
                    onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, indirizzo: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.625rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      color: '#374151',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      lineHeight: '1.5'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.background = '#fafbfc';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Città */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Città <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <StandardCityField
                    value={newRagioneSociale.citta}
                    onChange={(cityName) => setNewRagioneSociale({ ...newRagioneSociale, citta: cityName })}
                    onCapChange={(cap) => setNewRagioneSociale(prev => ({ ...prev, cap }))}
                    onProvinciaChange={(provincia) => setNewRagioneSociale(prev => ({ ...prev, provincia }))}
                    required={true}
                  />
                </div>

                {/* CAP */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    CAP
                  </label>
                  <input
                    type="text"
                    placeholder="20121"
                    value={newRagioneSociale.cap}
                    onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, cap: e.target.value })}
                    readOnly={italianCities.length > 0} // Auto-popolato dalla città
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.625rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      cursor: italianCities.length > 0 ? 'not-allowed' : 'text'
                    }}
                    onFocus={(e) => {
                      if (italianCities.length === 0) {
                        e.target.style.borderColor = '#FF6900';
                        e.target.style.background = 'white';
                        e.target.style.boxShadow = '0 0 0 3px rgba(255, 105, 0, 0.1)';
                      }
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'transparent';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Provincia */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Provincia
                  </label>
                  <input
                    type="text"
                    placeholder="MI"
                    maxLength={2}
                    value={newRagioneSociale.provincia}
                    onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, provincia: e.target.value.toUpperCase() })}
                    readOnly={italianCities.length > 0} // Auto-popolato dalla città
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.625rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      textTransform: 'uppercase',
                      outline: 'none',
                      cursor: italianCities.length > 0 ? 'not-allowed' : 'text'
                    }}
                    onFocus={(e) => {
                      if (italianCities.length === 0) {
                        e.target.style.borderColor = '#FF6900';
                        e.target.style.background = 'white';
                        e.target.style.boxShadow = '0 0 0 3px rgba(255, 105, 0, 0.1)';
                      }
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'transparent';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Telefono */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Telefono
                  </label>
                  <input
                    type="tel"
                    placeholder="+39 02 1234567"
                    value={newRagioneSociale.telefono}
                    onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, telefono: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.625rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      color: '#374151',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      lineHeight: '1.5'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.background = '#fafbfc';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Email */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="info@azienda.it"
                    value={newRagioneSociale.email}
                    onChange={(e) => {
                      const value = e.target.value.toLowerCase();
                      setNewRagioneSociale({ ...newRagioneSociale, email: value });
                    }}
                    onBlur={(e) => {
                      // Real-time email validation for legal entities
                      if (e.target.value) {
                        const emailValidation = legalEntityValidationSchema.shape.email?.safeParse(e.target.value);
                        if (!emailValidation?.success) {
                          e.target.style.borderColor = '#ef4444';
                          e.target.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
                          let errorDiv = e.target.parentElement?.querySelector('.validation-error');
                          if (!errorDiv) {
                            errorDiv = document.createElement('div');
                            errorDiv.className = 'validation-error';
                            e.target.parentElement?.appendChild(errorDiv);
                          }
                          errorDiv.textContent = 'Formato email non valido';
                          errorDiv.style.cssText = 'color: #ef4444; font-size: 0.75rem; margin-top: 0.25rem;';
                        } else {
                          e.target.style.borderColor = '#10b981';
                          e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                          const errorDiv = e.target.parentElement?.querySelector('.validation-error');
                          errorDiv?.remove();
                        }
                      } else {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.boxShadow = 'none';
                        const errorDiv = e.target.parentElement?.querySelector('.validation-error');
                        errorDiv?.remove();
                      }
                    }}
                    data-testid="input-legal-entity-email"
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.625rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      color: '#374151',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      lineHeight: '1.5'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                  />
                </div>

                {/* PEC */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    PEC <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="azienda@pec.it"
                    value={newRagioneSociale.pec}
                    onChange={(e) => {
                      const value = e.target.value.toLowerCase();
                      setNewRagioneSociale({ ...newRagioneSociale, pec: value });
                    }}
                    onBlur={composeEventHandlers(
                      (e) => {
                        // Real-time PEC email validation for legal entities
                        if (e.target.value) {
                          const pecValidation = legalEntityValidationSchema.shape.pec?.safeParse(e.target.value);
                          if (!pecValidation?.success) {
                            e.target.style.borderColor = '#ef4444';
                            e.target.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
                            let errorDiv = e.target.parentElement?.querySelector('.validation-error');
                            if (!errorDiv) {
                              errorDiv = document.createElement('div');
                              errorDiv.className = 'validation-error';
                              e.target.parentElement?.appendChild(errorDiv);
                            }
                            errorDiv.textContent = 'PEC non valida - deve terminare con domini certificati PEC';
                            errorDiv.style.cssText = 'color: #ef4444; font-size: 0.75rem; margin-top: 0.25rem;';
                          } else {
                            e.target.style.borderColor = '#10b981';
                            e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                            const errorDiv = e.target.parentElement?.querySelector('.validation-error');
                            errorDiv?.remove();
                          }
                        } else {
                          e.target.style.borderColor = '#e5e7eb';
                          e.target.style.background = '#fafbfc';
                          e.target.style.boxShadow = 'none';
                          const errorDiv = e.target.parentElement?.querySelector('.validation-error');
                          errorDiv?.remove();
                        }
                      },
                      (e) => {
                        // Styling reset handler
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.background = '#fafbfc';
                        e.target.style.boxShadow = 'none';
                      }
                    )}
                    data-testid="input-legal-entity-pec"
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.625rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      color: '#374151',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      lineHeight: '1.5'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                  />
                </div>

                {/* Stato */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Stato
                  </label>
                  <select
                    value={newRagioneSociale.stato}
                    onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, stato: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.625rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#FF6900';
                      e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                      e.target.style.boxShadow = '0 0.25rem 1.25rem rgba(255, 105, 0, 0.2)';
                      e.target.style.transform = 'translateY(-1px)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                      e.target.style.background = 'rgba(255, 255, 255, 0.7)';
                      e.target.style.boxShadow = 'none';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  >
                    <option value="Attiva">Attiva</option>
                    <option value="Sospesa">Sospesa</option>
                    <option value="Bozza">Bozza</option>
                    <option value="Cessata">Cessata</option>
                  </select>
                </div>


                {/* Sezione Referente Amministrativo */}
                <div style={{ gridColumn: 'span 2', marginTop: '1.5rem' }}>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: '1rem',
                    paddingBottom: '0.5rem',
                    borderBottom: '1px solid #e5e7eb',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Referente Amministrativo
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {/* Nome Referente */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '0.5rem',
                        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                      }}>
                        Nome <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="es. Mario"
                        data-testid="input-ref-nome"
                        value={newRagioneSociale.refAmminNome}
                        onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, refAmminNome: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.375rem 0.625rem',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          background: '#fafbfc',
                          transition: 'all 0.2s ease',
                          outline: 'none',
                          color: '#374151',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                          fontWeight: '400',
                          lineHeight: '1.5'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#3b82f6';
                          e.target.style.background = '#ffffff';
                          e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#e5e7eb';
                          e.target.style.background = '#fafbfc';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    {/* Cognome Referente */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '0.5rem',
                        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                      }}>
                        Cognome <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="es. Rossi"
                        data-testid="input-ref-cognome"
                        value={newRagioneSociale.refAmminCognome}
                        onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, refAmminCognome: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.375rem 0.625rem',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          background: '#fafbfc',
                          transition: 'all 0.2s ease',
                          outline: 'none',
                          color: '#374151',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                          fontWeight: '400',
                          lineHeight: '1.5'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#3b82f6';
                          e.target.style.background = '#ffffff';
                          e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#e5e7eb';
                          e.target.style.background = '#fafbfc';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    {/* Email Referente */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '0.5rem',
                        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                      }}>
                        Email <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="email"
                        placeholder="mario.rossi@azienda.it"
                        data-testid="input-ref-email"
                        value={newRagioneSociale.refAmminEmail}
                        onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, refAmminEmail: e.target.value })}
                        onBlur={(e) => {
                          const isValid = validateEmail(e.target.value);
                          if (e.target.value && !isValid) {
                            e.target.style.borderColor = '#ef4444';
                            e.target.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '0.375rem 0.625rem',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          background: '#fafbfc',
                          transition: 'all 0.2s ease',
                          outline: 'none',
                          color: '#374151',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                          fontWeight: '400',
                          lineHeight: '1.5'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#3b82f6';
                          e.target.style.background = '#ffffff';
                          e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                        }}
                      />
                    </div>

                    {/* Codice Fiscale Referente */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '0.5rem',
                        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                      }}>
                        Codice Fiscale <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="RSSMRA80A01H501U"
                        data-testid="input-ref-codicefiscale"
                        value={newRagioneSociale.refAmminCodiceFiscale}
                        onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, refAmminCodiceFiscale: e.target.value.toUpperCase() })}
                        onBlur={(e) => {
                          const isValid = validateCodiceFiscale(e.target.value);
                          if (e.target.value && !isValid) {
                            e.target.style.borderColor = '#ef4444';
                            e.target.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '0.375rem 0.625rem',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          background: '#fafbfc',
                          transition: 'all 0.2s ease',
                          fontFamily: 'monospace',
                          textTransform: 'uppercase',
                          outline: 'none'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#FF6900';
                          e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                          e.target.style.boxShadow = '0 0.25rem 1.25rem rgba(255, 105, 0, 0.2)';
                        }}
                      />
                    </div>

                    {/* Indirizzo Referente - full width */}
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '0.5rem',
                        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                      }}>
                        Indirizzo
                      </label>
                      <input
                        type="text"
                        placeholder="es. Via Verdi 456"
                        data-testid="input-ref-indirizzo"
                        value={newRagioneSociale.refAmminIndirizzo}
                        onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, refAmminIndirizzo: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.375rem 0.625rem',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          background: '#fafbfc',
                          transition: 'all 0.2s ease',
                          outline: 'none',
                          color: '#374151',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                          fontWeight: '400',
                          lineHeight: '1.5'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#3b82f6';
                          e.target.style.background = '#ffffff';
                          e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#e5e7eb';
                          e.target.style.background = '#fafbfc';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    {/* Città Referente */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '0.5rem',
                        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                      }}>
                        Città
                      </label>
                      <StandardCityField
                        value={newRagioneSociale.refAmminCitta}
                        onChange={(cityName) => setNewRagioneSociale({ ...newRagioneSociale, refAmminCitta: cityName })}
                        onCapChange={(cap) => setNewRagioneSociale(prev => ({ ...prev, refAmminCap: cap }))}
                        onProvinciaChange={() => {}} // Il referente non ha campo provincia
                        required={false}
                      />
                    </div>

                    {/* CAP Referente */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '0.5rem',
                        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                      }}>
                        CAP
                      </label>
                      <input
                        type="text"
                        placeholder="20121"
                        data-testid="input-ref-cap"
                        value={newRagioneSociale.refAmminCap}
                        onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, refAmminCap: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.375rem 0.625rem',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          background: '#fafbfc',
                          transition: 'all 0.2s ease',
                          outline: 'none',
                          fontFamily: 'monospace'
                        }}
                      />
                    </div>

                    {/* Paese Referente */}
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '0.5rem',
                        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                      }}>
                        Paese
                      </label>
                      <input
                        type="text"
                        placeholder="Italia"
                        data-testid="input-ref-paese"
                        value={newRagioneSociale.refAmminPaese}
                        onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, refAmminPaese: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.375rem 0.625rem',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          background: '#fafbfc',
                          transition: 'all 0.2s ease',
                          outline: 'none',
                          color: '#374151',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                          fontWeight: '400',
                          lineHeight: '1.5'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#3b82f6';
                          e.target.style.background = '#ffffff';
                          e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#e5e7eb';
                          e.target.style.background = '#fafbfc';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Campo Note - full width */}
                <div style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Note
                  </label>
                  <textarea
                    placeholder="Inserisci eventuali note..."
                    data-testid="textarea-note"
                    value={newRagioneSociale.note}
                    onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, note: e.target.value })}
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      color: '#374151',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      lineHeight: '1.5',
                      resize: 'vertical'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.background = '#fafbfc';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Footer Modal */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                marginTop: '2rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid #e5e7eb'
              }}>
                <button
                  onClick={() => setLegalEntityModal({ open: false, data: null })}
                  style={{
                    padding: '0.625rem 1.25rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    background: '#ffffff',
                    color: '#6b7280',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#f9fafb';
                    e.currentTarget.style.borderColor = '#9ca3af';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }}
                >
                  Annulla
                </button>
                <button
                  onClick={handleSaveRagioneSociale}
                  style={{
                    padding: '0.625rem 1.5rem',
                    background: '#FF6900',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                    boxShadow: '0 1px 3px 0 rgba(255, 105, 0, 0.3)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#e55a00';
                    e.currentTarget.style.boxShadow = '0 2px 0.375rem 0 rgba(255, 105, 0, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = '#FF6900';
                    e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(255, 105, 0, 0.3)';
                  }}
                >
                  Salva
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sede Operativa */}
      {storeModal.open && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(0.25rem)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '0.75rem',
            width: '90%',
            maxWidth: '37.5rem',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20.3125rem 3.125rem -0.75rem rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            borderTop: '3px solid transparent',
            borderImage: 'linear-gradient(90deg, #FF6900, #7B2CBF) 1',
            animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            {/* Header Modal - Clean Design */}
            <div style={{
              padding: '1.5rem 2rem',
              background: '#ffffff',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}>
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: '0.625rem',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0.25rem 0.75rem rgba(16, 185, 129, 0.25)'
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9 22V12h6v10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <h2 style={{
                      fontSize: '1.25rem',
                      fontWeight: '600',
                      color: '#111827',
                      margin: 0,
                      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                      position: 'relative',
                      zIndex: 1,
                      textShadow: 'none'
                    }}>
                      {storeModal.data ? 'Modifica Sede Operativa' : 'Nuova Sede Operativa'}
                    </h2>
                  </div>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    margin: 0,
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                    fontWeight: 500
                  }}>
                    {storeModal.data ? 'Modifica i dati della sede operativa' : 'Configura i dettagli della nuova sede operativa'}
                  </p>
                </div>
                <button
                  onClick={() => setStoreModal({ open: false, data: null })}
                  style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    border: '1px solid rgba(226, 232, 240, 0.8)',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    color: '#64748b',
                    backdropFilter: 'blur(0.5rem)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(248, 250, 252, 0.95)';
                    e.currentTarget.style.color = '#374151';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
                    e.currentTarget.style.color = '#64748b';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body Modal */}
            <div style={{ padding: '2rem', background: '#ffffff', flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* ✅ CATEGORIA - PRIMO CAMPO (span 2 colonne) */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Tipologia Sede <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={newStore.category}
                    onChange={(e) => {
                      const newCategory = e.target.value as 'sales_point' | 'office' | 'warehouse';
                      // Default hasWarehouse: true for sales_point/warehouse, false for office
                      const defaultHasWarehouse = newCategory !== 'office';
                      setNewStore({ ...newStore, category: newCategory, hasWarehouse: defaultHasWarehouse, code: '' }); // Reset code on category change
                    }}
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.625rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      background: '#fafbfc',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      cursor: 'pointer',
                      outline: 'none',
                      color: '#1f2937'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#6366f1';
                      e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="sales_point">🏪 Punto Vendita</option>
                    <option value="office">🏢 Ufficio</option>
                    <option value="warehouse">📦 Magazzino</option>
                  </select>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    marginTop: '0.25rem',
                    fontStyle: 'italic'
                  }}>
                    {newStore.category === 'sales_point' && 'Codice auto: 9xxxxxxx'}
                    {newStore.category === 'office' && 'Codice auto: 6xxxxxxx'}
                    {newStore.category === 'warehouse' && 'Codice auto: 5xxxxxxx'}
                  </div>
                </div>

                {/* Toggle Magazzino */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: newStore.hasWarehouse ? 'rgba(16, 185, 129, 0.08)' : 'rgba(156, 163, 175, 0.08)',
                    borderRadius: '0.5rem',
                    border: `1px solid ${newStore.hasWarehouse ? 'rgba(16, 185, 129, 0.3)' : 'rgba(156, 163, 175, 0.3)'}`,
                    transition: 'all 0.2s ease'
                  }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#374151',
                        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                      }}>
                        📦 Gestione Magazzino
                      </label>
                      <span style={{
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        fontStyle: 'italic'
                      }}>
                        {newStore.hasWarehouse 
                          ? 'Questa sede gestisce inventario e movimenti magazzino' 
                          : 'Questa sede non prevede gestione magazzino'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewStore({ ...newStore, hasWarehouse: !newStore.hasWarehouse })}
                      style={{
                        width: '3rem',
                        height: '20.375rem',
                        borderRadius: '0.8125rem',
                        background: newStore.hasWarehouse 
                          ? 'linear-gradient(135deg, #10b981, #059669)' 
                          : '#d1d5db',
                        border: 'none',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: newStore.hasWarehouse 
                          ? '0 2px 0.5rem rgba(16, 185, 129, 0.3)' 
                          : 'inset 0 1px 2px rgba(0, 0, 0, 0.1)'
                      }}
                      data-testid="toggle-has-warehouse"
                    >
                      <span style={{
                        position: 'absolute',
                        top: '3px',
                        left: newStore.hasWarehouse ? '1.5625rem' : '3px',
                        width: '1.25rem',
                        height: '1.25rem',
                        borderRadius: '50%',
                        background: 'white',
                        transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
                      }} />
                    </button>
                  </div>
                </div>

                {/* Codice */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Codice Sede Operativa
                  </label>
                  <input
                    type="text"
                    placeholder={
                      newStore.category === 'warehouse' ? '5xxxxxxx (auto-generato)' :
                      newStore.category === 'office' ? '6xxxxxxx (auto-generato)' :
                      '9xxxxxxx (auto-generato)'
                    }
                    value={newStore.code}
                    onChange={(e) => setNewStore({ ...newStore, code: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.625rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      color: '#374151',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      lineHeight: '1.5'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.background = '#fafbfc';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Nome */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Nome Sede Operativa <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="es. WindTre Milano Centro"
                    value={newStore.nome}
                    onChange={(e) => setNewStore({ ...newStore, nome: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.625rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      background: '#fafbfc',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      outline: 'none',
                      color: '#1f2937'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#6366f1';
                      e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Ragione Sociale */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Ragione Sociale <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={newStore.organization_entity_id || ''}
                    onChange={(e) => setNewStore({ ...newStore, organization_entity_id: e.target.value || null })}
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.625rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      background: '#fafbfc',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      cursor: 'pointer',
                      outline: 'none',
                      color: '#1f2937'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#6366f1';
                      e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="">Seleziona ragione sociale...</option>
                    {ragioneSocialiList.filter(rs => rs.stato?.toLowerCase().startsWith('attiv')).map(rs => (
                      <option key={rs.id} value={rs.id}>
                        {rs.nome} ({rs.codice})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Canale */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Canale {newStore.category === 'sales_point' && <span style={{ color: '#ef4444' }}>*</span>}
                  </label>
                  <select
                    value={newStore.channel_id || ''}
                    onChange={(e) => setNewStore({ ...newStore, channel_id: e.target.value || null })}
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.625rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      background: '#fafbfc',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      cursor: 'pointer',
                      outline: 'none',
                      color: '#1f2937'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#6366f1';
                      e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="Franchising">Franchising</option>
                    <option value="Top Dealer">Top Dealer</option>
                    <option value="Dealer">Dealer</option>
                  </select>
                </div>

                {/* Area Commerciale */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Area Commerciale <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={newStore.commercial_area_id || ''}
                    onChange={(e) => setNewStore({ ...newStore, commercial_area_id: e.target.value || null })}
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.625rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      background: '#fafbfc',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      cursor: 'pointer',
                      outline: 'none',
                      color: '#1f2937'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#6366f1';
                      e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="">Seleziona area...</option>
                    {(commercialAreas as any[]).map((area: any) => (
                      <option key={area.id} value={area.id}>
                        {area.name} - {area.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Stato */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Stato <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={newStore.status}
                    onChange={(e) => setNewStore({ ...newStore, status: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.625rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      background: '#fafbfc',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      cursor: 'pointer',
                      outline: 'none',
                      color: '#1f2937'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#6366f1';
                      e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="Attivo">Attivo</option>
                    <option value="Sospeso">Sospeso</option>
                    <option value="Chiuso">Chiuso</option>
                  </select>
                </div>

                {/* Brand - Multi-select - Dynamic from public.operators */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Brand Gestiti {newStore.category === 'sales_point' && <span style={{ color: '#ef4444' }}>*</span>}
                  </label>
                  <p style={{
                    fontSize: '0.75rem',
                    color: newStore.category === 'sales_point' ? '#ef4444' : '#6b7280',
                    margin: '0 0 0.75rem 0',
                    fontStyle: 'italic'
                  }}>
                    {newStore.category === 'sales_point' 
                      ? '⚠️ Obbligatorio per i punti vendita'
                      : 'ℹ️ Opzionale per uffici e magazzini'
                    }
                  </p>
                  <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                    {operatorsData.length === 0 ? (
                      <span style={{ 
                        fontSize: '0.875rem', 
                        color: '#9ca3af',
                        fontStyle: 'italic',
                        padding: '0.5rem 0.75rem',
                        background: '#f3f4f6',
                        borderRadius: '0.5rem'
                      }}>
                        Nessun brand disponibile
                      </span>
                    ) : operatorsData.map((operator: { id: string; name: string; brandColor?: string }) => {
                      const rawColor = operator.brandColor || '#6366f1';
                      const brandColor = rawColor.startsWith('#') ? rawColor : '#6366f1';
                      const isSelected = newStore.brands.includes(operator.name);
                      return (
                        <label key={operator.id} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.75rem', 
                          cursor: 'pointer',
                          padding: '0.375rem 0.625rem',
                          background: isSelected ? `${brandColor}15` : '#f8fafc',
                          borderRadius: '0.5rem',
                          border: `2px solid ${isSelected ? brandColor : 'transparent'}`,
                          transition: 'all 0.2s ease'
                        }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewStore({ ...newStore, brands: [...newStore.brands, operator.name] });
                              } else {
                                setNewStore({ ...newStore, brands: newStore.brands.filter((b: string) => b !== operator.name) });
                              }
                            }}
                            style={{ 
                              width: '1.25rem', 
                              height: '1.25rem', 
                              cursor: 'pointer',
                              accentColor: brandColor
                            }}
                          />
                          <span style={{ 
                            fontSize: '0.875rem', 
                            color: isSelected ? brandColor : '#374151',
                            fontWeight: '600'
                          }}>
                            {operator.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Indirizzo - full width */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Indirizzo <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="es. Via Roma 123"
                    value={newStore.address}
                    onChange={(e) => setNewStore({ ...newStore, address: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.625rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      background: '#fafbfc',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      outline: 'none',
                      color: '#1f2937'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#6366f1';
                      e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Città */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Città <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <StandardCityField
                    value={newStore.citta}
                    onChange={(cityName) => setNewStore({ ...newStore, citta: cityName })}
                    onCapChange={(cap) => setNewStore(prev => ({ ...prev, cap }))}
                    onProvinciaChange={(provincia) => setNewStore(prev => ({ ...prev, provincia }))}
                    required={true}
                  />
                </div>

                {/* CAP */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    CAP
                  </label>
                  <input
                    type="text"
                    placeholder="20121"
                    value={newStore.cap}
                    onChange={(e) => setNewStore({ ...newStore, cap: e.target.value })}
                    readOnly={italianCities.length > 0} // Auto-popolato dalla città
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.625rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      background: '#fafbfc',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      outline: 'none',
                      color: '#1f2937',
                      cursor: italianCities.length > 0 ? 'not-allowed' : 'text'
                    }}
                    onFocus={(e) => {
                      if (italianCities.length === 0) {
                        e.target.style.borderColor = '#6366f1';
                        e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                      }
                    }}
                    onBlur={(e) => {
                      if (italianCities.length === 0) {
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.boxShadow = 'none';
                      }
                    }}
                  />
                </div>

                {/* Provincia */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Provincia
                  </label>
                  <input
                    type="text"
                    placeholder="MI"
                    value={newStore.provincia}
                    onChange={(e) => setNewStore({ ...newStore, provincia: e.target.value })}
                    readOnly={italianCities.length > 0} // Auto-popolato dalla città
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.625rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      background: '#fafbfc',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      outline: 'none',
                      color: '#1f2937',
                      cursor: italianCities.length > 0 ? 'not-allowed' : 'text'
                    }}
                    onFocus={(e) => {
                      if (italianCities.length === 0) {
                        e.target.style.borderColor = '#6366f1';
                        e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                      }
                    }}
                    onBlur={(e) => {
                      if (italianCities.length === 0) {
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.boxShadow = 'none';
                      }
                    }}
                  />
                </div>
              </div>

              {/* Footer Modal */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                marginTop: '2rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid #e5e7eb'
              }}>
                <button
                  onClick={() => setStoreModal({ open: false, data: null })}
                  style={{
                    padding: '0.625rem 1.25rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    background: '#ffffff',
                    color: '#6b7280',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#f9fafb';
                    e.currentTarget.style.borderColor = '#9ca3af';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }}
                >
                  Annulla
                </button>
                <button
                  onClick={handleSaveStore}
                  style={{
                    padding: '0.625rem 1.5rem',
                    background: '#FF6900',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                    boxShadow: '0 1px 3px 0 rgba(255, 105, 0, 0.3)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#e55a00';
                    e.currentTarget.style.boxShadow = '0 2px 0.375rem 0 rgba(255, 105, 0, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = '#FF6900';
                    e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(255, 105, 0, 0.3)';
                  }}
                >
                  Salva
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuovo Utente con Selezione Team */}
      {userModal.open && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(0.25rem)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div 
            data-testid="modal-nuovo-utente"
            style={{
            background: 'white',
            borderRadius: '0.75rem',
            width: '90%',
            maxWidth: '56.25rem',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20.3125rem 3.125rem -0.75rem rgba(0, 0, 0, 0.25)',
            borderTop: '3px solid transparent',
            borderImage: 'linear-gradient(90deg, #FF6900, #7B2CBF) 1',
            zIndex: 10001
          }}>
            {/* Header Modal - Clean Design */}
            <div style={{
              padding: '1.5rem 2rem',
              background: '#ffffff',
              borderBottom: '1px solid #e5e7eb'
            }}>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}>
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: '0.625rem',
                      background: 'linear-gradient(135deg, #FF6900, #7B2CBF)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 'none'
                    }}>
                      <User size={20} style={{ color: 'white' }} />
                    </div>
                    <h2 style={{
                      fontSize: '1.25rem',
                      fontWeight: '600',
                      color: '#111827',
                      margin: 0,
                      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                      position: 'relative',
                      zIndex: 1,
                      textShadow: 'none'
                    }}>
                      {userModal.data ? 'Modifica Utente' : 'Nuovo Utente'}
                    </h2>
                  </div>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    margin: 0,
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                    fontWeight: 500
                  }}>
                    {userModal.data ? 'Modifica i dati dell\'utente' : 'Completa tutte le informazioni per creare un nuovo utente'}
                  </p>
                </div>
                <button
                  onClick={() => setUserModal({ open: false, data: null })}
                  style={{
                    background: 'transparent',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    width: '2.25rem',
                    height: '2.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    color: '#6b7280'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#f3f4f6';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body Modal con sezioni */}
            <div style={{ padding: '2rem', background: '#ffffff', flex: 1, overflowY: 'auto' }}>

              {/* SEZIONE DATI DI ACCESSO */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '1rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.0.3125rem'
                }}>
                  Dati di Accesso
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* Username e Ruolo */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Username <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="mario.rossi"
                      value={newUser.username}
                      onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.625rem 0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        background: '#fafafa',
                        transition: 'all 0.2s ease',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Ruolo <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      value={newUser.ruolo}
                      onChange={(e) => setNewUser({ ...newUser, ruolo: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.625rem 0.75rem',
                        border: '1px solid #e5e7eb',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        background: '#ffffff',
                        transition: 'all 0.2s ease',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">Seleziona ruolo...</option>
                      {availableRoles.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status field */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Status <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      value={newUser.stato}
                      onChange={(e) => setNewUser({ ...newUser, stato: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.625rem 0.75rem',
                        border: '1px solid #e5e7eb',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        background: '#ffffff',
                        transition: 'all 0.2s ease',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                      data-testid="select-user-status"
                    >
                      <option value="attivo">Attivo</option>
                      <option value="sospeso">Sospeso</option>
                      <option value="off-boarding">Off-boarding</option>
                    </select>
                  </div>

                  {/* Password fields */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      {userModal.data ? (
                        <>Nuova Password <span style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: 'normal' }}>(lascia vuoto per non modificare)</span></>
                      ) : (
                        <>Password <span style={{ color: '#ef4444' }}>*</span></>
                      )}
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.625rem 0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        background: '#fafafa',
                        transition: 'all 0.2s ease',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      {userModal.data ? (
                        <>Conferma Nuova Password <span style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: 'normal' }}>(lascia vuoto per non modificare)</span></>
                      ) : (
                        <>Conferma Password <span style={{ color: '#ef4444' }}>*</span></>
                      )}
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={newUser.confirmPassword}
                      onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.625rem 0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        background: '#fafafa',
                        transition: 'all 0.2s ease',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* SEZIONE INFORMAZIONI PERSONALI */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '1rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.0.3125rem'
                }}>
                  Informazioni Personali
                </h3>

                {/* Avatar Selector */}
                <div style={{ 
                  marginBottom: '1.5rem', 
                  display: 'flex', 
                  justifyContent: 'center'
                }}>
                  <AvatarSelector
                    currentAvatarUrl={newUser.avatar?.url || undefined}
                    firstName={newUser.nome}
                    lastName={newUser.cognome}
                    username={newUser.username}
                    onAvatarChange={handleAvatarChange}
                    loading={false}
                    size={120}
                  />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Nome <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Mario"
                      value={newUser.nome}
                      onChange={(e) => setNewUser({ ...newUser, nome: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.625rem 0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        background: '#fafafa',
                        transition: 'all 0.2s ease',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Cognome <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Rossi"
                      value={newUser.cognome}
                      onChange={(e) => setNewUser({ ...newUser, cognome: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.625rem 0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        background: '#fafafa',
                        transition: 'all 0.2s ease',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Email <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="mario.rossi@windtre.it"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      onBlur={(e) => handleUserFieldValidation('email', e.target.value)}
                      style={getUserFieldStyle('email', {
                        width: '100%',
                        padding: '0.625rem 0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        background: '#fafafa',
                        transition: 'all 0.2s ease',
                        outline: 'none'
                      })}
                    />
                    {userValidationErrors.email && (
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#ef4444',
                        marginTop: '0.25rem',
                        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                      }}>
                        {userValidationErrors.email}
                      </div>
                    )}
                    {userValidationState.email === 'valid' && newUser.email && (
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#10b981',
                        marginTop: '0.25rem',
                        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                      }}>
                        ✓ Email valida
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Telefono <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="+39 333 1234567"
                      value={newUser.telefono}
                      onChange={(e) => setNewUser({ ...newUser, telefono: e.target.value })}
                      onBlur={(e) => handleUserFieldValidation('telefono', e.target.value)}
                      style={getUserFieldStyle('telefono', {
                        width: '100%',
                        padding: '0.625rem 0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        background: '#fafafa',
                        transition: 'all 0.2s ease',
                        outline: 'none'
                      })}
                    />
                    {userValidationErrors.telefono && (
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#ef4444',
                        marginTop: '0.25rem',
                        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                      }}>
                        {userValidationErrors.telefono}
                      </div>
                    )}
                    {userValidationState.telefono === 'valid' && newUser.telefono && (
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#10b981',
                        marginTop: '0.25rem',
                        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                      }}>
                        ✓ Telefono valido
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SEZIONE CONFIGURAZIONE VoIP (ENTERPRISE APPROACH) */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '1rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.0.3125rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <Phone size={16} style={{ color: '#FF6900' }} />
                  VoIP Extension (Opzionale)
                </h3>

                {/* Info banner */}
                <div style={{
                  padding: '0.75rem',
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '0.5rem',
                  marginBottom: '1rem'
                }}>
                  <p style={{ fontSize: '0.8125rem', color: '#0369a1', margin: 0 }}>
                    💡 <strong>Nota:</strong> Le extensions devono essere create prima in <em>Settings → Channels → Phone/VoIP</em>. 
                    Qui puoi solo assegnare un'extension già esistente all'utente.
                  </p>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Assegna Extension
                  </label>
                  <select
                    value={newUser.extensionId || ''}
                    onChange={(e) => setNewUser({ ...newUser, extensionId: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.75rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      background: '#ffffff',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                    data-testid="select-user-extension"
                    disabled={loadingExtensions}
                  >
                    <option value="">Nessuna extension</option>
                    {voipExtensions.map((item: any) => {
                      const ext = item.extension || item;
                      const isAssignedToOther = ext.userId && ext.userId !== userModal.data?.id;
                      const isAssignedToThis = ext.userId === userModal.data?.id;
                      const isFree = !ext.userId;
                      
                      return (
                        <option 
                          key={ext.id} 
                          value={ext.id}
                          disabled={isAssignedToOther}
                          style={{
                            color: isAssignedToOther ? '#dc2626' : isFree ? '#16a34a' : '#374151',
                            fontWeight: isAssignedToThis ? '600' : '400',
                            backgroundColor: isAssignedToOther ? '#fef2f2' : isFree ? '#f0fdf4' : 'transparent'
                          }}
                        >
                          {isAssignedToOther ? '🔴 ' : isFree ? '🟢 ' : '🔵 '}
                          {ext.extension} - {ext.displayName || item.userName || 'N/A'} 
                          (sip:{ext.extension}@{ext.sipServer || item.domainFqdn || 'edgvoip.it'})
                          {isAssignedToOther && ` [Assegnato a: ${item.userName || item.userEmail || 'altro utente'}]`}
                        </option>
                      );
                    })}
                    {loadingExtensions && (
                      <option value="" disabled>Caricamento extensions...</option>
                    )}
                    {!loadingExtensions && voipExtensions.length === 0 && (
                      <option value="" disabled>Nessuna extension configurata. Crea prima le extensions in Settings → Channels.</option>
                    )}
                  </select>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.375rem' }}>
                    <span style={{ color: '#16a34a' }}>🟢 Libera</span> | 
                    <span style={{ color: '#dc2626' }}> 🔴 Assegnata</span> | 
                    <span style={{ color: '#374151' }}> 🔵 Assegnata a questo utente</span>
                  </div>
                </div>
              </div>

              {/* ✅ NUOVO SISTEMA SCOPE PIRAMIDALE - ALLA FINE */}
              <div style={{ marginBottom: '1.75rem' }}>
                <h3 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '1rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.0.3125rem'
                }}>
                  🎯 Scope di Accesso Piramidale
                </h3>
                
                {/* 📋 PRIMO LIVELLO: Checkbox "Seleziona tutto ragioni sociali" */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '1rem',
                    background: newUser.selectAllLegalEntities ? '#ecfdf5' : '#f9fafb',
                    border: `2px solid ${newUser.selectAllLegalEntities ? '#10b981' : '#e5e7eb'}`,
                    borderRadius: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}>
                    <input
                      type="checkbox"
                      checked={newUser.selectAllLegalEntities}
                      onChange={(e) => {
                        const selectAll = e.target.checked;
                        setNewUser({
                          ...newUser,
                          selectAllLegalEntities: selectAll,
                          selectedAreas: selectAll ? [] : newUser.selectedAreas,
                          selectedLegalEntities: selectAll ? [] : newUser.selectedLegalEntities,
                          selectedStores: selectAll ? [] : newUser.selectedStores
                        });
                      }}
                      style={{ 
                        transform: 'scale(1.2)',
                        accentColor: '#10b981'
                      }}
                    />
                    <div style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: '0.625rem',
                      background: newUser.selectAllLegalEntities ? 'linear-gradient(135deg, #10b981, #047857)' : 'linear-gradient(135deg, #FF6900, #7B2CBF)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white'
                    }}>
                      {newUser.selectAllLegalEntities ? <Shield size={20} /> : <Building2 size={20} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: '#111827',
                        marginBottom: '0.25rem'
                      }}>
                        {newUser.selectAllLegalEntities ? '🌟 Accesso Completo Organizzazione' : 'Accesso Completo'}
                      </div>
                      <div style={{
                        fontSize: '0.8125rem',
                        color: '#6b7280'
                      }}>
                        {newUser.selectAllLegalEntities 
                          ? 'L\'utente ha accesso a tutte le ragioni sociali e punti vendita dell\'organizzazione'
                          : 'Seleziona per dare accesso a tutte le ragioni sociali (disabilita selezione specifica)'}
                      </div>
                    </div>
                    {newUser.selectAllLegalEntities && (
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#059669',
                        background: '#d1fae5',
                        padding: '0.375rem 0.75rem',
                        borderRadius: '1.25rem',
                        fontWeight: '600'
                      }}>
                        COMPLETO
                      </div>
                    )}
                  </label>
                </div>

                {/* 📍 PRIMO LIVELLO PIRAMIDALE: Selezione Aree Commerciali */}
                {!newUser.selectAllLegalEntities && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.75rem'
                    }}>
                      📍 Filtra per Area Commerciale
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: '400', 
                        color: '#6b7280',
                        marginLeft: '0.5rem'
                      }}>
                        (Opzionale - filtra i punti vendita per area)
                      </span>
                    </label>
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.75rem',
                      background: '#f9fafb'
                    }}>
                      {(commercialAreas as any[]).map((area: any) => (
                        <label key={area.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 0.875rem',
                          cursor: 'pointer',
                          borderRadius: '1.25rem',
                          transition: 'all 0.2s ease',
                          background: newUser.selectedAreas.includes(area.id) ? '#dbeafe' : '#ffffff',
                          border: `2px solid ${newUser.selectedAreas.includes(area.id) ? '#3b82f6' : '#e5e7eb'}`,
                          fontSize: '0.8125rem',
                          fontWeight: newUser.selectedAreas.includes(area.id) ? '600' : '400',
                          color: newUser.selectedAreas.includes(area.id) ? '#1d4ed8' : '#374151'
                        }}>
                          <input
                            type="checkbox"
                            checked={newUser.selectedAreas.includes(area.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewUser({
                                  ...newUser,
                                  selectedAreas: [...newUser.selectedAreas, area.id],
                                  selectedLegalEntities: [],
                                  selectedStores: []
                                });
                              } else {
                                setNewUser({
                                  ...newUser,
                                  selectedAreas: newUser.selectedAreas.filter(id => id !== area.id),
                                  selectedLegalEntities: [],
                                  selectedStores: []
                                });
                              }
                            }}
                            style={{ display: 'none' }}
                          />
                          <MapPin size={14} />
                          {area.name || area.code}
                          {newUser.selectedAreas.includes(area.id) && (
                            <span style={{ marginLeft: '0.25rem' }}>✓</span>
                          )}
                        </label>
                      ))}
                      {(commercialAreas as any[]).length === 0 && (
                        <span style={{ color: '#9ca3af', fontSize: '0.8125rem' }}>
                          Nessuna area commerciale configurata
                        </span>
                      )}
                    </div>
                    {newUser.selectedAreas.length > 0 && (
                      <div style={{
                        marginTop: '0.5rem',
                        fontSize: '0.75rem',
                        color: '#3b82f6',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        <Filter size={12} />
                        {newUser.selectedAreas.length} area/e selezionate - i punti vendita saranno filtrati
                      </div>
                    )}
                  </div>
                )}

                {/* 🏭 SECONDO LIVELLO: Multi-select ragioni sociali specifiche */}
                {!newUser.selectAllLegalEntities && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.75rem'
                    }}>
                      📋 Seleziona Ragioni Sociali Specifiche <span style={{ color: '#ef4444' }}>*</span>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: '400', 
                        color: '#6b7280',
                        marginLeft: '0.5rem'
                      }}>
                        (Secondo livello - filtra i punti vendita)
                      </span>
                    </label>
                    <div style={{
                      maxHeight: '12.5rem',
                      overflowY: 'auto',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.75rem',
                      padding: '0.75rem',
                      background: '#ffffff'
                    }}>
                      {ragioneSocialiList
                        .filter(rs => rs.stato?.toLowerCase().startsWith('attiv'))
                        .map(rs => (
                        <label key={rs.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem',
                          cursor: 'pointer',
                          borderRadius: '0.5rem',
                          transition: 'all 0.2s ease',
                          background: newUser.selectedLegalEntities.includes(rs.id) ? '#e0f2fe' : 'transparent',
                          border: `1px solid ${newUser.selectedLegalEntities.includes(rs.id) ? '#0ea5e9' : 'transparent'}`,
                          marginBottom: '0.25rem'
                        }}>
                          <input
                            type="checkbox"
                            checked={newUser.selectedLegalEntities.includes(rs.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                // Auto-select all active stores for this organization entity
                                const newLegalEntities = [...newUser.selectedLegalEntities, rs.id];
                                const storesForNewEntity = puntiVenditaList
                                  .filter(pv => pv.organizationEntityId === rs.id && isStoreActive(pv.status))
                                  .map(pv => pv.id);
                                // Merge with existing stores (keeping already selected stores)
                                const allStores = [...new Set([...newUser.selectedStores, ...storesForNewEntity])];
                                setNewUser({
                                  ...newUser,
                                  selectedLegalEntities: newLegalEntities,
                                  selectedOrganizationEntities: newLegalEntities,
                                  selectedStores: allStores,
                                  scopeLevel: 'organization_entity'
                                });
                              } else {
                                // Remove all stores from this organization entity
                                const updatedLegalEntities = newUser.selectedLegalEntities.filter(id => id !== rs.id);
                                setNewUser({
                                  ...newUser,
                                  selectedLegalEntities: updatedLegalEntities,
                                  selectedOrganizationEntities: updatedLegalEntities,
                                  selectedStores: newUser.selectedStores.filter(storeId => {
                                    const store = puntiVenditaList.find(pv => pv.id === storeId);
                                    return store && store.organizationEntityId !== rs.id;
                                  }),
                                  scopeLevel: updatedLegalEntities.length > 0 ? 'organization_entity' : 'tenant'
                                });
                              }
                            }}
                            style={{ 
                              transform: 'scale(1.1)',
                              accentColor: '#0ea5e9'
                            }}
                          />
                          <div style={{
                            width: '2rem',
                            height: '2rem',
                            borderRadius: '0.5rem',
                            background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}>
                            {rs.nome ? rs.nome.charAt(0) : '?'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              color: '#111827',
                              marginBottom: '2px'
                            }}>
                              {rs.nome || 'Denominazione non disponibile'}
                            </div>
                            <div style={{
                              fontSize: '0.75rem',
                              color: '#6b7280'
                            }}>
                              P.IVA: {rs.pIva || 'N/A'}
                            </div>
                          </div>
                          <div style={{
                            fontSize: '0.6875rem',
                            color: '#0369a1',
                            background: '#e0f2fe',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.75rem',
                            fontWeight: '500'
                          }}>
                            {puntiVenditaList.filter(pv => pv.organizationEntityId === rs.id && isStoreActive(pv.status)).length} negozi
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* 🏪 TERZO LIVELLO: Multi-select punti vendita filtrati */}
                {!newUser.selectAllLegalEntities && newUser.selectedLegalEntities.length > 0 && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.75rem'
                    }}>
                      🏪 Seleziona Punti Vendita Specifici 
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: '400', 
                        color: '#6b7280',
                        marginLeft: '0.5rem'
                      }}>
                        ({puntiVenditaList.filter(pv => newUser.selectedLegalEntities.includes(pv.organizationEntityId) && isStoreActive(pv.status)).length} disponibili dalle ragioni sociali selezionate)
                      </span>
                    </label>
                    <div style={{
                      maxHeight: '18.75rem',
                      overflowY: 'auto',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.75rem',
                      padding: '0.75rem',
                      background: '#ffffff'
                    }}>
                      {puntiVenditaList
                        .filter(pv => newUser.selectedLegalEntities.includes(pv.organizationEntityId) && isStoreActive(pv.status))
                        .filter(pv => newUser.selectedAreas.length === 0 || newUser.selectedAreas.includes(pv.commercialAreaId))
                        .map(pv => (
                        <label key={pv.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem',
                          cursor: 'pointer',
                          borderRadius: '0.5rem',
                          transition: 'all 0.2s ease',
                          background: newUser.selectedStores.includes(pv.id) ? '#fef3c7' : 'transparent',
                          border: `1px solid ${newUser.selectedStores.includes(pv.id) ? '#f59e0b' : 'transparent'}`,
                          marginBottom: '0.25rem'
                        }}>
                          <input
                            type="checkbox"
                            checked={newUser.selectedStores.includes(pv.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewUser({
                                  ...newUser,
                                  selectedStores: [...newUser.selectedStores, pv.id]
                                });
                              } else {
                                setNewUser({
                                  ...newUser,
                                  selectedStores: newUser.selectedStores.filter(id => id !== pv.id)
                                });
                              }
                            }}
                            style={{ 
                              transform: 'scale(1.1)',
                              accentColor: '#f59e0b'
                            }}
                          />
                          <div style={{
                            width: '2rem',
                            height: '2rem',
                            borderRadius: '0.5rem',
                            background: 'linear-gradient(135deg, #FF6900, #7B2CBF)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '0.6875rem',
                            fontWeight: '600'
                          }}>
                            {pv.code}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              color: '#111827',
                              marginBottom: '2px'
                            }}>
                              {pv.nome}
                            </div>
                            <div style={{
                              fontSize: '0.75rem',
                              color: '#6b7280'
                            }}>
                              {pv.citta} • {ragioneSocialiList.find(rs => rs.id === pv.ragioneSociale_id)?.denominazione}
                            </div>
                          </div>
                          <div style={{
                            fontSize: '0.6875rem',
                            color: isStoreActive(pv.status) ? '#059669' : '#dc2626',
                            background: isStoreActive(pv.status) ? '#d1fae5' : '#fee2e2',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.75rem',
                            fontWeight: '500'
                          }}>
                            {isStoreActive(pv.status) ? 'Attivo' : 'Inattivo'}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* ⚠️ MESSAGGI DI VALIDAZIONE */}
                {!newUser.selectAllLegalEntities && newUser.selectedLegalEntities.length === 0 && (
                  <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fca5a5',
                    borderRadius: '0.75rem',
                    padding: '1rem',
                    marginTop: '1rem'
                  }}>
                    <p style={{
                      fontSize: '0.8125rem',
                      color: '#991b1b',
                      margin: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <AlertCircle size={16} />
                      ⚠️ Seleziona almeno una ragione sociale o attiva "Seleziona tutto"
                    </p>
                  </div>
                )}

                {/* ✅ RIEPILOGO SELEZIONE */}
                {(newUser.selectAllLegalEntities || newUser.selectedLegalEntities.length > 0) && (
                  <div style={{
                    background: '#f0f9ff',
                    border: '1px solid #0ea5e9',
                    borderRadius: '0.75rem',
                    padding: '1rem',
                    marginTop: '1rem'
                  }}>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#0369a1',
                      marginBottom: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <CheckCircle size={16} />
                      ✅ Riepilogo Accesso
                    </div>
                    {newUser.selectAllLegalEntities ? (
                      <p style={{
                        fontSize: '0.8125rem',
                        color: '#0369a1',
                        margin: 0
                      }}>
                        🌟 <strong>Accesso Completo:</strong> Tutte le ragioni sociali e punti vendita dell'organizzazione
                      </p>
                    ) : (
                      <div style={{
                        fontSize: '0.8125rem',
                        color: '#0369a1',
                        margin: 0
                      }}>
                        <p style={{ margin: '0 0 0.25rem 0' }}>
                          📋 <strong>Ragioni Sociali:</strong> {newUser.selectedLegalEntities.length} selezionate
                        </p>
                        <p style={{ margin: 0 }}>
                          🏪 <strong>Punti Vendita:</strong> {newUser.selectedStores.length} selezionati {newUser.selectedStores.length === 0 ? '(tutti disponibili dalle ragioni sociali)' : '(specifici)'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer con pulsanti */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                marginTop: '1.5rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid #e5e7eb'
              }}>
                <button
                  onClick={() => setUserModal({ open: false, data: null })}
                  style={{
                    padding: '0.625rem 1.25rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    background: '#ffffff',
                    color: '#6b7280',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#f9fafb';
                    e.currentTarget.style.borderColor = '#9ca3af';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }}
                >
                  Annulla
                </button>
                <button
                  onClick={() => {
                    // 🔍 COMPREHENSIVE ITALIAN BUSINESS VALIDATION
                    let hasValidationErrors = false;

                    // Validate email field
                    const emailValidation = validateUserField('email', newUser.email);
                    if (!emailValidation.isValid) {
                      handleUserFieldValidation('email', newUser.email);
                      hasValidationErrors = true;
                    }

                    // Validate telefono field
                    const telefonoValidation = validateUserField('telefono', newUser.telefono);
                    if (!telefonoValidation.isValid) {
                      handleUserFieldValidation('telefono', newUser.telefono);
                      hasValidationErrors = true;
                    }

                    // Basic required field validation
                    if (!newUser.username || !newUser.password || !newUser.nome || !newUser.cognome || !newUser.ruolo) {
                      alert('Compila tutti i campi obbligatori');
                      return;
                    }
                    
                    if (newUser.password !== newUser.confirmPassword) {
                      alert('Le password non corrispondono');
                      return;
                    }

                    // Stop submission if validation errors exist
                    if (hasValidationErrors) {
                      alert('Correggi gli errori di validazione prima di procedere');
                      return;
                    }

                    // ✅ Validate VoIP Extension fields (if enabled)
                    if (newUser.extension.enabled) {
                      if (!newUser.extension.extNumber || !/^\d{3,6}$/.test(newUser.extension.extNumber)) {
                        alert('Extension: Numero Interno deve essere 3-6 cifre (es: 100, 1001)');
                        return;
                      }
                      if (!newUser.extension.sipDomain || newUser.extension.sipDomain.trim() === '') {
                        alert('Extension: SIP Domain è obbligatorio (es: tenant1.pbx.w3suite.it)');
                        return;
                      }
                    }

                    // Validazione scope
                    if (newUser.scopeLevel === 'punti_vendita' && newUser.selectedLegalEntities.length === 0) {
                      alert('Seleziona almeno una ragione sociale');
                      return;
                    }
                    
                    // 🔥 SAVE USER TO DATABASE WITH AVATAR
                    console.log('💾 Creating new user with avatar:', newUser.avatar);
                    
                    const createUser = async () => {
                      try {
                        const userData = {
                          username: newUser.username,
                          nome: newUser.nome,
                          cognome: newUser.cognome,
                          email: newUser.email,
                          telefono: newUser.telefono,
                          ruolo: newUser.ruolo,
                          stato: newUser.stato,
                          foto: newUser.avatar?.url || null, // ✅ INCLUDE AVATAR URL
                          password: newUser.password,
                          tenant_id: getCurrentTenantId(),
                          // ✅ SCOPE DATA - Invia dati scope piramidale al backend
                          selectAllLegalEntities: newUser.selectAllLegalEntities,
                          selectedAreas: newUser.selectedAreas,
                          selectedLegalEntities: newUser.selectedLegalEntities,
                          selectedStores: newUser.selectedStores,
                          // ✅ VOIP EXTENSION DATA (optional, only if enabled)
                          ...(newUser.extension.enabled ? {
                            extension: {
                              extNumber: newUser.extension.extNumber,
                              sipDomain: newUser.extension.sipDomain,
                              classOfService: newUser.extension.classOfService,
                              voicemailEnabled: newUser.extension.voicemailEnabled,
                              storeId: newUser.extension.storeId
                            }
                          } : {})
                        };

                        console.log('📤 Sending user data to API:', userData);
                        
                        const response = await fetch('/api/users', {
                          method: 'POST',
                          credentials: 'include',
                          headers: {
                            'Content-Type': 'application/json',
                            'X-Tenant-ID': getCurrentTenantId()
                          },
                          body: JSON.stringify(userData)
                        });

                        if (!response.ok) {
                          throw new Error(`Failed to create user: ${response.statusText}`);
                        }

                        const result = await response.json();
                        console.log('✅ User created successfully:', result);
                        
                        const createdUserId = result.data?.id || result.id;
                        
                        // ✅ Set user scope via new relational APIs
                        // Map legacy selectedLegalEntities to organization entity UUIDs
                        if (createdUserId) {
                          const tenantId = getCurrentTenantId();
                          
                          // Determine scope type: tenant (selectAll), organization_entity, or store
                          const isTenantScope = newUser.selectAllLegalEntities;
                          const hasOrgSelections = !isTenantScope && (newUser.selectedLegalEntities || []).length > 0;
                          const hasStoreSelections = (newUser.selectedStores || []).length > 0;
                          
                          // Get organization entity UUIDs from legacy selectedLegalEntities
                          // Only include valid UUIDs (from organization_entity_id field)
                          const selectedOrgEntityIds = hasOrgSelections 
                            ? (newUser.selectedLegalEntities || [])
                                .map(legacyId => {
                                  const rs = ragioniSocialiList.find((r: any) => r.id === legacyId);
                                  return rs?.organization_entity_id; // Only return actual UUIDs
                                })
                                .filter((id): id is string => !!id && id.includes('-')) // Validate UUID format
                            : [];
                          
                          // Get store UUIDs - only include valid UUIDs
                          const selectedStoreIds = hasStoreSelections
                            ? (newUser.selectedStores || [])
                                .map((id: any) => String(id))
                                .filter((id: string) => id.includes('-')) // Validate UUID format
                            : [];
                          
                          // Always sync organization entities (empty array for tenant scope clears assignments)
                          try {
                            const orgPayload = {
                              organizationEntityIds: selectedOrgEntityIds,
                              ...(selectedOrgEntityIds.length > 0 ? { primaryId: selectedOrgEntityIds[0] } : {})
                            };
                            const response = await fetch(`/api/users/${createdUserId}/organization-entities`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': tenantId },
                              body: JSON.stringify(orgPayload)
                            });
                            if (response.ok) {
                              console.log('✅ Organization entities scope set:', selectedOrgEntityIds.length);
                            } else {
                              console.error('❌ Organization entities scope failed:', await response.text());
                            }
                          } catch (err) {
                            console.error('❌ Failed to set organization entities scope:', err);
                          }
                          
                          // Always sync stores (empty array for tenant/org-only scope clears assignments)
                          try {
                            const storePayload = {
                              storeIds: selectedStoreIds,
                              ...(selectedStoreIds.length > 0 ? { primaryId: selectedStoreIds[0] } : {})
                            };
                            const response = await fetch(`/api/users/${createdUserId}/stores`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': tenantId },
                              body: JSON.stringify(storePayload)
                            });
                            if (response.ok) {
                              console.log('✅ Store scope set:', selectedStoreIds.length);
                            } else {
                              console.error('❌ Store scope failed:', await response.text());
                            }
                          } catch (err) {
                            console.error('❌ Failed to set store scope:', err);
                          }
                        }

                        // Refresh user list from API
                        await refetchUserData();
                        setUserModal({ open: false, data: null });

                        // Reset form
                        setNewUser({
                          username: '',
                          password: '',
                          confirmPassword: '',
                          nome: '',
                          cognome: '',
                          email: '',
                          telefono: '',
                          ruolo: '',
                          stato: 'attivo',
                          scopeLevel: 'tenant',
                          selectedOrganizationEntities: [],
                          primaryOrganizationEntityId: null,
                          selectedStores: [],
                          primaryStoreId: null,
                          selectAllLegalEntities: false,
                          selectedAreas: [],
                          selectedLegalEntities: [],
                          avatar: null,
                          extension: {
                            enabled: false,
                            extNumber: '',
                            sipDomain: '',
                            classOfService: 'agent' as const,
                            voicemailEnabled: true,
                            storeId: null
                          }
                        } as any);

                      } catch (error) {
                        console.error('❌ Error creating user:', error);
                        alert('Errore durante la creazione dell\'utente. Riprova.');
                      }
                    };

                    createUser();
                  }}
                  style={{
                    padding: '0.625rem 1.5rem',
                    background: 'linear-gradient(135deg, #FF6900, #ff8533)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                    boxShadow: '0 0.25rem 0.9375rem -3px rgba(255, 105, 0, 0.3)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #ff7a1f, #ff9547)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 0.625rem 20.3125rem -0.3125rem rgba(255, 105, 0, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #FF6900, #ff8533)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 0.25rem 0.9375rem -3px rgba(255, 105, 0, 0.3)';
                  }}
                >
                  Salva Utente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
        {/* Main container con scroll indipendente */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 4rem)',
          overflow: 'hidden'
        }}>
          {/* Header - fisso in alto */}
          <div style={{
            flexShrink: 0,
            marginBottom: '1rem'
          }}>
            <h1 style={{
              fontSize: '1.75rem',
              fontWeight: '700',
              color: '#111827',
              margin: '0 0 0.5rem 0'
            }}>
              Configurazioni Sistema
            </h1>
            <p style={{
              fontSize: '0.9375rem',
              color: '#6b7280',
              margin: 0
            }}>
              Gestisci AI, canali di comunicazione, backup e configurazioni sistema
            </p>
          </div>

          {/* Tabs Container - fisso */}
          <div style={{
            flexShrink: 0,
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(0.625rem)',
            borderRadius: '1rem',
            padding: '1.25rem',
            marginBottom: '1rem',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 0.25rem 0.375rem rgba(0, 0, 0, 0.05)'
          }}>
          <div style={{
            display: 'flex',
            background: 'rgba(243, 244, 246, 0.5)',
            borderRadius: '0.75rem',
            padding: '0.25rem',
            gap: '0.25rem'
          }}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1,
                    background: isActive 
                      ? 'linear-gradient(135deg, #FF6900, #ff8533)'
                      : 'transparent',
                    color: isActive ? 'white' : '#6b7280',
                    border: 'none',
                    borderRadius: '0.75rem',
                    padding: '0.875rem 1.25rem',
                    fontSize: '0.875rem',
                    fontWeight: isActive ? '600' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isActive 
                      ? '0 0.25rem 1rem rgba(255, 105, 0, 0.3)' 
                      : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    textAlign: 'center',
                    backdropFilter: 'blur(0.5rem)',
                    WebkitBackdropFilter: 'blur(0.5rem)'
                  }}
                  onMouseOver={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'hsla(255, 255, 255, 0.08)';
                      e.currentTarget.style.color = '#374151';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#6b7280';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
          </div>

          {/* Content Area - scrollabile indipendentemente */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingRight: '0.5rem',
            paddingBottom: '2rem'
          }}>
            {renderContent()}
          </div>
        </div>
      </Layout>

      {/* Store Configuration Dialog */}
      {selectedStoreId && (
        <StoreConfigurationDialog
          storeId={selectedStoreId}
          open={!!selectedStoreId}
          onOpenChange={() => setSelectedStoreId(null)}
        />
      )}

      {/* Store Calendar Modal */}
      <StoreCalendarModal
        open={calendarModal.open}
        storeId={calendarModal.storeId}
        storeName={calendarModal.storeName}
        onClose={() => setCalendarModal({ open: false, storeId: null, storeName: '' })}
        tenantId={DEMO_TENANT_ID}
        allStores={puntiVenditaList.map(s => ({ id: s.id, nome: s.nome }))}
      />

      {/* Create Custom Role Modal - MOVED TO ROOT LEVEL */}
      {createRoleModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(0.5rem)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '2rem',
            maxWidth: '31.25rem',
            width: '90%',
            boxShadow: '0 1.25rem 2.5rem rgba(0, 0, 0, 0.15)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#111827',
                margin: 0
              }}>
                Crea Ruolo Personalizzato
              </h3>
              <button
                onClick={() => setCreateRoleModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                Codice Ruolo
              </label>
              <input
                type="text"
                value={newRoleData.code}
                onChange={(e) => setNewRoleData({ ...newRoleData, code: e.target.value })}
                placeholder="es. custom_role"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                Nome Ruolo
              </label>
              <input
                type="text"
                value={newRoleData.name}
                onChange={(e) => setNewRoleData({ ...newRoleData, name: e.target.value })}
                placeholder="es. Custom Role"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                Descrizione
              </label>
              <textarea
                value={newRoleData.description}
                onChange={(e) => setNewRoleData({ ...newRoleData, description: e.target.value })}
                placeholder="Descrizione del ruolo personalizzato..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setCreateRoleModalOpen(false)}
                style={{
                  padding: '0.625rem 1.25rem',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Annulla
              </button>
              <button
                onClick={createCustomRole}
                disabled={!newRoleData.code || !newRoleData.name}
                style={{
                  padding: '0.625rem 1.25rem',
                  background: newRoleData.code && newRoleData.name 
                    ? 'linear-gradient(135deg, #8339ff, #6b2cbf)' 
                    : '#e5e7eb',
                  color: newRoleData.code && newRoleData.name ? 'white' : '#6b7280',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: newRoleData.code && newRoleData.name ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease'
                }}
              >
                Crea Ruolo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}