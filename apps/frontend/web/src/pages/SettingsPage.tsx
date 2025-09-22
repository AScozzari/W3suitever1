import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/ApiService';
import Layout from '../components/Layout';
import { useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
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
import { z } from 'zod';
import { 
  supplierValidationSchema, 
  legalEntityValidationSchema,
  storeValidationSchema,
  userValidationSchema,
  italianPhoneSchema,
  websiteUrlSchema,
  type SupplierValidation 
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
  Truck
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

// Types for structured logs
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
  success: boolean;
}

interface RolePermissionsResponse {
  permissions: string[];
  success: boolean;
}

// Dati caricati dal database

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const [currentModule, setCurrentModule] = useState('impostazioni');
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('Entity Management');
  
  // Custom roles state (must be declared before allRoles)
  const [customRoles, setCustomRoles] = useState<any[]>([]);
  
  // Modal states
  const [legalEntityModal, setLegalEntityModal] = useState<{ open: boolean; data: any }>({ open: false, data: null });
  const [storeModal, setStoreModal] = useState<{ open: boolean; data: any }>({ open: false, data: null });
  const [userModal, setUserModal] = useState<{ open: boolean; data: any }>({ open: false, data: null });
  const [supplierModal, setSupplierModal] = useState<{ open: boolean; data: any }>({ open: false, data: null });
  const [logDetailsModal, setLogDetailsModal] = useState<{ open: boolean; data: any }>({ open: false, data: null });

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
  
  // Logs state variables
  const [logsSearchTerm, setLogsSearchTerm] = useState('');
  const [logsLevelFilter, setLogsLevelFilter] = useState('ALL');
  const [logsComponentFilter, setLogsComponentFilter] = useState('ALL');
  const [logsFromDate, setLogsFromDate] = useState('');
  const [logsToDate, setLogsToDate] = useState('');
  const [logsUserFilter, setLogsUserFilter] = useState('');
  const [logsCorrelationIdFilter, setLogsCorrelationIdFilter] = useState('');
  const [logsCurrentPage, setLogsCurrentPage] = useState(1);
  const [logsPageSize] = useState(20);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [newLogsAvailable, setNewLogsAvailable] = useState(false);
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);
  const lastSeenTimestamp = useRef<string | null>(null);
  
  // Form states
  const [selectedCity, setSelectedCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  
  // Selected entity tab
  const [selectedEntity, setSelectedEntity] = useState('ragione-sociale');
  
  // Workflow Management State

  // Hierarchy Management State (moved from renderHierarchyManagement function)
  const [hierarchyView, setHierarchyView] = useState<'tree' | 'workflows' | 'permissions'>('tree');
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [nodeDialogOpen, setNodeDialogOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<any>(null);
  const [parentIdForNewNode, setParentIdForNewNode] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string>('');

  // Hierarchy Management Queries (moved from renderHierarchyManagement function)
  const { data: hierarchyData, isLoading: loadingHierarchy, refetch: refetchHierarchy } = useQuery({
    queryKey: ['/api/organizational-structure'],
    enabled: true
  });

  const { data: workflowsData, isLoading: loadingWorkflows } = useQuery({
    queryKey: ['/api/approval-workflows', selectedService],
    enabled: !!selectedService
  });
  
  const { data: rolesData } = useQuery({
    queryKey: ['/api/roles'],
    enabled: true
  });

  // Workflow Management Queries
  const { data: workflowActionsData, isLoading: loadingWorkflowActions } = useQuery({
    queryKey: ['/api/workflow-actions'],
    enabled: true,
    staleTime: 5 * 60 * 1000
  });

  const { data: workflowTriggersData, isLoading: loadingWorkflowTriggers } = useQuery({
    queryKey: ['/api/workflow-triggers'],
    enabled: true,
    staleTime: 5 * 60 * 1000
  });

  const { data: teamsData, isLoading: loadingTeams, refetch: refetchTeams } = useQuery({
    queryKey: ['/api/teams'],
    enabled: true,
    staleTime: 5 * 60 * 1000
  });

  const { data: workflowTemplatesData, isLoading: loadingTemplates, refetch: refetchTemplates } = useQuery({
    queryKey: ['/api/workflow-templates'],
    enabled: true,
    staleTime: 5 * 60 * 1000
  });

  const { data: teamAssignmentsData, isLoading: loadingAssignments, refetch: refetchAssignments } = useQuery({
    queryKey: ['/api/team-workflow-assignments'],
    enabled: true,
    staleTime: 5 * 60 * 1000
  });
  
  // Local state for managing items - inizializzati vuoti, caricati dal DB
  const [ragioneSocialiList, setRagioneSocialiList] = useState<any[]>([]);
  const [puntiVenditaList, setPuntiVenditaList] = useState<any[]>([]);
  // Note: fornitoriList is now managed by TanStack Query as suppliersList
  
  
  // TanStack Query hooks for payment data using ApiService
  const { data: paymentMethodsList, isLoading: paymentMethodsLoading } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: async () => {
      const result = await apiService.getPaymentMethods();
      if (!result.success) throw new Error(result.error || 'Failed to fetch payment methods');
      return result.data || [];
    }
  });

  const { data: paymentConditionsList, isLoading: paymentConditionsLoading } = useQuery({
    queryKey: ['paymentConditions'],
    queryFn: async () => {
      // Using reference payment methods as fallback until payment-conditions endpoint is added
      const result = await apiService.getPaymentMethods();
      if (!result.success) throw new Error(result.error || 'Failed to fetch payment conditions');
      return result.data || [];
    }
  });

  // Caricamento dati enterprise con service layer
  useEffect(() => {
    console.log('🆕 SettingsPage: useEffect triggered - loading data...');
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
            legalEntities: result.data.legalEntities?.length,
            users: result.data.users?.length,
            stores: result.data.stores?.length
          });
          setRagioneSocialiList(result.data.legalEntities || []);
          setUtentiList(result.data.users || []);
          setPuntiVenditaList(result.data.stores || []);
        }

        // Carica anche i ruoli
        await fetchRoles();

        // Carica i fornitori usando TanStack Query
        console.log('📋 Suppliers will be loaded via TanStack Query automatically');

      } catch (error) {
        console.error('Enterprise service error:', error);
      }
    };

    loadData();
  }, []);

  // Funzione per ricaricare i dati delle ragioni sociali
  const refetchLegalEntities = async () => {
    try {
      const result = await apiService.loadSettingsData();
      if (result.success && result.data) {
        setRagioneSocialiList(result.data.legalEntities);
      }
    } catch (error) {
      console.error('Error refetching legal entities:', error);
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
  
  // Build query params for logs API
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

  // Handler per eliminare una ragione sociale - USA API REALE
  const handleDeleteRagioneSociale = async (legalEntityId: string) => {
    try {
      const currentTenantId = DEMO_TENANT_ID;
      
      const response = await fetch(`/api/legal-entities/${legalEntityId}`, {
        method: 'DELETE',
        headers: {
          'X-Tenant-ID': currentTenantId
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete legal entity: ${response.statusText}`);
      }

      console.log('✅ Legal entity deleted successfully');
      
      // Refresh the list dopo l'eliminazione
      await refetchLegalEntities();
      
    } catch (error) {
      console.error('❌ Error deleting legal entity:', error);
      alert('Errore nell\'eliminazione della ragione sociale. Riprova.');
    }
  };

  // Handler per eliminare un fornitore - USA API AUTENTICATA con cache invalidation
  const handleDeleteSupplier = async (supplierId: string) => {
    try {
      console.log('🗑️ Deleting supplier using authenticated API:', supplierId);
      const result = await apiService.deleteSupplier(supplierId);
      if (result.success) {
        console.log('✅ Supplier deleted successfully');
        // Invalidate suppliers cache per refresh automatico
        await queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
        console.log('🔄 Suppliers cache invalidated - data will refresh automatically');
      } else {
        console.error('❌ Error deleting supplier:', result.error);
        if (result.needsAuth) {
          console.log('🔒 Authentication required for supplier deletion');
        }
        alert('Errore nell\'eliminazione del fornitore. Riprova.');
      }
    } catch (error) {
      console.error('❌ Error deleting supplier:', error);
      alert('Errore nell\'eliminazione del fornitore. Riprova.');
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
        alert('Errore nell\'eliminazione del punto vendita. Riprova.');
      }
    } catch (error) {
      console.error('❌ Error deleting store:', error);
      alert('Errore nell\'eliminazione del punto vendita. Riprova.');
    }
  };

  // Funzione per ricaricare i dati stores
  const reloadStoreData = async () => {
    try {
      const result = await apiService.getStores();
      if (result.success && result.data) {
        setPuntiVenditaList(result.data);
      }
    } catch (error) {
      console.error('Error reloading stores:', error);
    }
  };
  
  // Load reference data from API
  const { data: legalForms = [] } = useQuery<LegalForm[]>({
    queryKey: ['/api/reference/legal-forms'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // HYBRID SYSTEM: Show 10 specific roles but use REAL backend permissions 
  const allRoles = [...HARDCODED_ROLES, ...customRoles];
  const rbacRolesData = {
    roles: allRoles,
    success: true
  };
  const rolesLoading = false;
  const rolesError = null;
  const refetchRoles = () => Promise.resolve();

  // REAL permissions from backend API - NOT hardcoded!
  const { data: rbacPermissionsData, isLoading: permissionsLoading } = useQuery<RBACPermissionsResponse>({
    queryKey: ['/api/rbac/permissions'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // REAL permissions for selected role from backend API
  const { data: selectedRolePermissions, isLoading: rolePermissionsLoading } = useQuery<RolePermissionsResponse>({
    queryKey: ['/api/rbac/roles', selectedRole, 'permissions'],
    enabled: !!selectedRole,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
  
  // Load logs data with filtering and pagination - FIXED: Proper new data detection
  const queryParams = buildLogsQueryParams();
  const { data: logsData, isLoading: logsLoading, error: logsError, refetch: refetchLogs } = useQuery<LogsResponse>({
    queryKey: ['/api/logs', queryParams],
    enabled: activeTab === 'Logs', // Only fetch when Logs tab is active
    refetchInterval: autoRefreshEnabled ? 30000 : false, // Auto-refetch every 30s if enabled
    staleTime: 30 * 1000, // 30 seconds
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
    staleTime: 5 * 60 * 1000,
  });

  const { data: italianCities = [] } = useQuery<ItalianCity[]>({
    queryKey: ['/api/reference/italian-cities'],
    staleTime: 5 * 60 * 1000,
  });

  const { data: commercialAreas = [] } = useQuery({
    queryKey: ['/api/commercial-areas'],
    staleTime: 5 * 60 * 1000,
  });

  // Load payment methods reference data
  const { data: referencePaymentMethods = [] } = useQuery({
    queryKey: ['/api/reference/payment-methods'],
    staleTime: 5 * 60 * 1000,
  });

  // Load suppliers data with TanStack Query using ApiService
  const { data: suppliersList = [], isLoading: suppliersLoading, error: suppliersError, isError: suppliersIsError, refetch: refetchSuppliersQuery } = useQuery({
    queryKey: ['/api/suppliers'],
    queryFn: async () => {
      const result = await apiService.getSuppliers();
      if (!result.success) throw new Error(result.error || 'Failed to fetch suppliers');
      return result.data?.suppliers || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 3, // Retry failed requests 3 times
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Ensure suppliersList is always an array
  const safeSuppliersList = Array.isArray(suppliersList) ? suppliersList : [];
  
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
    const descriptionMap: { [key: string]: string } = {
      'admin': 'Accesso completo al sistema',
      'finance': 'Gestione finanziaria e contabile',
      'direttore': 'Supervisione strategica e decisionale',
      'store_manager': 'Gestione completa punto vendita',
      'store_specialist': 'Operazioni quotidiane del negozio',
      'student': 'Accesso limitato per formazione',
      'marketing': 'Campagne e comunicazione aziendale',
      'hr_management': 'Gestione risorse umane',
      'custom': 'Ruolo personalizzato'
    };
    return descriptionMap[roleCode] || 'Ruolo personalizzato';
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
  const organizePermissionsByCategory = (permissions: string[]) => {
    const categories: { [key: string]: string[] } = {};
    
    // Add workflow actions and triggers to permissions if available
    let allPermissions = [...(permissions || [])];
    
    // Add workflow actions as permissions
    if (workflowActionsData && Array.isArray(workflowActionsData)) {
      workflowActionsData.forEach((action: any) => {
        if (action.requiredPermission && !allPermissions.includes(action.requiredPermission)) {
          allPermissions.push(action.requiredPermission);
        }
      });
    }
    
    // Add workflow triggers as permissions
    if (workflowTriggersData && Array.isArray(workflowTriggersData)) {
      workflowTriggersData.forEach((trigger: any) => {
        const triggerPermission = `workflow.trigger.${trigger.category}.${trigger.triggerId}`;
        if (!allPermissions.includes(triggerPermission)) {
          allPermissions.push(triggerPermission);
        }
      });
    }
    
    allPermissions.forEach(permission => {
      // Special handling for workflow permissions
      if (permission.startsWith('workflow.action.')) {
        const parts = permission.split('.');
        const categoryKey = `workflow-actions-${parts[2]}`; // workflow.action.hr.xxx -> workflow-actions-hr
        if (!categories[categoryKey]) {
          categories[categoryKey] = [];
        }
        categories[categoryKey].push(permission);
      } else if (permission.startsWith('workflow.trigger.')) {
        const parts = permission.split('.');
        const categoryKey = `workflow-triggers-${parts[2]}`; // workflow.trigger.hr.xxx -> workflow-triggers-hr
        if (!categories[categoryKey]) {
          categories[categoryKey] = [];
        }
        categories[categoryKey].push(permission);
      } else {
        // Standard permissions
        const parts = permission.split('.');
        const category = parts[0] || 'other';
        
        if (!categories[category]) {
          categories[category] = [];
        }
        categories[category].push(permission);
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
  const [tempPermissions, setTempPermissions] = useState<string[]>([]);
  const [isPermissionsDirty, setIsPermissionsDirty] = useState(false);

  // Initialize temp permissions when role permissions are loaded
  useEffect(() => {
    if (selectedRolePermissions?.permissions) {
      setTempPermissions(selectedRolePermissions.permissions);
      setIsPermissionsDirty(false);
    }
  }, [selectedRolePermissions]);

  // Check if a permission is currently enabled
  const isPermissionEnabled = (permission: string): boolean => {
    return tempPermissions.includes(permission);
  };

  // Check if all permissions in a category are enabled
  const isCategoryEnabled = (category: string): boolean => {
    const categoryPermissions = organizePermissionsByCategory(rbacPermissionsData?.permissions || [])
      .find(cat => cat.category === category)?.permissions || [];
    return categoryPermissions.length > 0 && categoryPermissions.every(perm => isPermissionEnabled(perm));
  };

  // Toggle individual permission
  const togglePermission = (permission: string) => {
    const newPermissions = isPermissionEnabled(permission)
      ? tempPermissions.filter(p => p !== permission)
      : [...tempPermissions, permission];
    
    setTempPermissions(newPermissions);
    setIsPermissionsDirty(true);
  };

  // Toggle all permissions in a category
  const toggleCategoryPermissions = (category: string, enabled: boolean) => {
    const categoryPermissions = organizePermissionsByCategory(rbacPermissionsData?.permissions || [])
      .find(cat => cat.category === category)?.permissions || [];
    
    let newPermissions = [...tempPermissions];
    
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
    
    setTempPermissions(newPermissions);
    setIsPermissionsDirty(true);
  };

  // Save permissions for selected role
  const saveRolePermissions = async () => {
    if (!selectedRole) return;

    try {
      // Update permissions in local state
      const isCustomRole = !HARDCODED_ROLES.find(r => r.code === selectedRole);
      
      if (isCustomRole) {
        // Update custom role permissions
        setCustomRoles(prev => prev.map(role => 
          role.code === selectedRole 
            ? { ...role, permissions: tempPermissions }
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
    { id: 'Entity Management', label: 'Entity Management', icon: Building2 },
    { id: 'Hierarchy Management', label: 'Workflow & Teams', icon: Users },
    { id: 'AI Assistant', label: 'AI Assistant', icon: Cpu },
    { id: 'Channel Settings', label: 'Channel Settings', icon: Globe },
    { id: 'System Settings', label: 'System Settings', icon: Server },
    { id: 'Logs', label: 'Logs', icon: FileText }
  ];

  const renderEntityManagement = () => (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#111827',
          margin: '0 0 4px 0'
        }}>
          Configurazione Entità
        </h2>
        <p style={{
          fontSize: '14px',
          color: '#6b7280',
          margin: 0
        }}>
          Gestisci entità aziendali, ragioni sociali e punti vendita
        </p>
      </div>

      {/* Sezione Icone Configurazione - Barra con tutte le entità */}
      <div style={{
        background: 'hsla(255, 255, 255, 0.08)',
        backdropFilter: 'blur(24px) saturate(140%)',
        WebkitBackdropFilter: 'blur(24px) saturate(140%)',
        border: '1px solid hsla(255, 255, 255, 0.12)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '32px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          alignItems: 'center',
          gap: '16px'
        }}>
          {[
            { id: 'ragione-sociale', icon: Building2, label: 'Ragione Sociale', color: '#FF6900' },
            { id: 'punti-vendita', icon: Store, label: 'Punti Vendita', color: '#7B2CBF' },
            { id: 'utenti', icon: Users, label: 'Utenti', color: '#3b82f6' },
            { id: 'gestione-ruoli', icon: UserCog, label: 'Gestione Ruoli', color: '#8339ff' },
            { id: 'fornitori', icon: Truck, label: 'Fornitori', color: '#10b981' }
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
                  borderRadius: '12px',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)'
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
                  fontSize: '14px',
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
        <div style={{ marginBottom: '48px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h3 style={{
            fontSize: '18px',
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
            borderRadius: '12px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(255, 105, 0, 0.3)',
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
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e5e7eb'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #f9fafb, #f3f4f6)' }}>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Codice</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Ragione Sociale</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>P.IVA / C.F.</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Città</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Stato</th>
                <th style={{ padding: '16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Azioni</th>
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
                  <td style={{ padding: '16px', fontSize: '14px', color: '#111827', fontWeight: '600' }}>
                    {item.codice}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div>
                      <div style={{ fontSize: '14px', color: '#111827', fontWeight: '600' }}>{item.nome}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{item.formaGiuridica}</div>
                    </div>
                  </td>
                  <td style={{ padding: '16px', fontSize: '13px', color: '#6b7280' }}>
                    <div>
                      <div>P.IVA: {item.pIva}</div>
                      <div>C.F.: {item.codiceFiscale}</div>
                    </div>
                  </td>
                  <td style={{ padding: '16px', fontSize: '13px', color: '#6b7280' }}>
                    {item.citta} ({item.provincia})
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 12px',
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
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                    }}>
                      <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: 'white'
                      }} />
                      {item.stato}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        onClick={() => setLegalEntityModal({ open: true, data: item })}
                        style={{
                          background: 'transparent',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '6px',
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
                          borderRadius: '6px',
                          padding: '6px',
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

      {/* Punti Vendita Section */}
      {selectedEntity === 'punti-vendita' && (
        <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#111827',
                margin: 0
              }}>
                Punti Vendita
              </h3>
              <button style={{
                background: 'linear-gradient(135deg, #7B2CBF, #9333ea)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(123, 44, 191, 0.3)',
                transition: 'all 0.2s ease'
              }}
              onClick={() => setStoreModal({ open: true, data: null })}>
                <Plus size={16} />
                Nuovo Punto Vendita
              </button>
            </div>

        <div style={{
          background: 'white',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e5e7eb'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #f9fafb, #f3f4f6)' }}>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Codice PDV</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Nome</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Indirizzo</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Area</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Canale</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Stato</th>
                <th style={{ padding: '16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Azioni</th>
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
                  <td style={{ padding: '16px', fontSize: '14px', color: '#111827', fontWeight: '600' }}>
                    {item.code}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontSize: '14px', color: '#111827', fontWeight: '600' }}>{item.nome}</div>
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>{item.address}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 12px',
                      background: '#f0f9ff',
                      color: '#0369a1',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600',
                      border: '1px solid #e0f2fe'
                    }}>
                      {item.commercial_area_name || 'Non assegnata'}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 12px',
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
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                    }}>
                      <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: 'white'
                      }} />
                      {item.channel_name || 'N/A'}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 12px',
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
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                    }}>
                      <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: 'white'
                      }} />
                      {item.status === 'active' ? 'Attivo' : item.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        onClick={() => setStoreModal({ open: true, data: item })}
                        style={{
                          background: 'transparent',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '6px',
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
                          borderRadius: '6px',
                          padding: '6px',
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

      {/* Fornitori Section */}
      {selectedEntity === 'fornitori' && (
        <div style={{ marginBottom: '48px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              Fornitori ({suppliersLoading ? '...' : safeSuppliersList.length} elementi)
            </h3>
            <button style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              transition: 'all 0.2s ease'
            }}
            onClick={() => setSupplierModal({ open: true, data: null })}
            data-testid="button-create-supplier"
            >
              <Plus size={16} />
              Nuovo Fornitore
            </button>
          </div>

          {suppliersLoading ? (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              color: '#6b7280'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                border: '3px solid rgba(16, 185, 129, 0.2)',
                borderTop: '3px solid #10b981',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <p style={{ marginLeft: '12px', fontSize: '14px' }}>Caricamento fornitori...</p>
            </div>
          ) : (
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                    <th style={{ textAlign: 'left', padding: '16px', fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nome</th>
                    <th style={{ textAlign: 'left', padding: '16px', fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>P.IVA</th>
                    <th style={{ textAlign: 'left', padding: '16px', fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</th>
                    <th style={{ textAlign: 'right', padding: '16px', fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {safeSuppliersList.map((item, index) => (
                    <tr key={item.id || index} style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '16px' }}>
                        <div style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>
                          {item.companyName || 'Nome non disponibile'}
                        </div>
                      </td>
                      <td style={{ padding: '16px', color: '#9ca3af', fontSize: '14px' }}>
                        {item.vatNumber || 'N/A'}
                      </td>
                      <td style={{ padding: '16px', color: '#9ca3af', fontSize: '14px' }}>
                        {item.email || 'N/A'}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            onClick={() => setSupplierModal({ open: true, data: item })}
                            style={{
                              background: 'transparent',
                              border: '1px solid #6b7280',
                              borderRadius: '6px',
                              padding: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.background = '#6b7280';
                              e.currentTarget.style.borderColor = '#9ca3af';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.borderColor = '#6b7280';
                            }}>
                            <Edit size={14} style={{ color: '#9ca3af' }} />
                          </button>
                          <button
                            onClick={() => handleDeleteFornitore(item.id)}
                            style={{
                              background: 'transparent',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              padding: '6px',
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
          )}
        </div>
      )}

      {/* Risorse Umane Section */}
      {selectedEntity === 'risorse-umane' && (
        <div style={{ marginBottom: '48px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              Risorse Umane - Gestione Avanzata
            </h3>
          </div>

          <div style={{
            textAlign: 'center',
            padding: '40px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#6b7280'
          }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #059669, #047857)',
              borderRadius: '12px',
              width: '60px',
              height: '60px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <span style={{ fontSize: '24px', color: 'white' }}>👥</span>
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 8px' }}>
              HR Management in Costruzione
            </h3>
            <p style={{ fontSize: '14px' }}>
              Il sistema completo di gestione risorse umane sarà disponibile nel nuovo sistema unificato.
            </p>
          </div>
        </div>
      )}

      {/* CMS Section */}
      {selectedEntity === 'cms' && (
        <div style={{ marginBottom: '48px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              Content Management System
            </h3>
          </div>

          <div style={{
            textAlign: 'center',
            padding: '40px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#6b7280'
          }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #059669, #047857)',
              borderRadius: '12px',
              width: '60px',
              height: '60px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <span style={{ fontSize: '24px', color: 'white' }}>📄</span>
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 8px' }}>
              CMS in Costruzione
            </h3>
            <p style={{ fontSize: '14px' }}>
              Il sistema di gestione contenuti sarà disponibile nel nuovo sistema unificato.
            </p>
          </div>
        </div>
      )}

      {/* Magazzino Section */}
      {selectedEntity === 'magazzino' && (
        <div style={{ marginBottom: '48px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              Gestione Magazzino
            </h3>
          </div>

          <div style={{
            textAlign: 'center',
            padding: '40px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#6b7280'
          }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #059669, #047857)',
              borderRadius: '12px',
              width: '60px',
              height: '60px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <span style={{ fontSize: '24px', color: 'white' }}>📦</span>
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 8px' }}>
              Magazzino in Costruzione
            </h3>
            <p style={{ fontSize: '14px' }}>
              Il sistema di gestione magazzino sarà disponibile nel nuovo sistema unificato.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

            {/* Rendering Condizionale per Sotto-Tab */}
            {workflowSubTab === 'hierarchy' && (
