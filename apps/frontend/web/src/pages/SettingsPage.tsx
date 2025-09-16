import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/ApiService';
import Layout from '../components/Layout';
import { useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import AvatarSelector from '../components/AvatarSelector';
import {
  StandardEmailField,
  StandardCityField,
  StandardCapField,
  StandardCodiceFiscaleField,
  StandardPartitaIVAField,
  StandardPaeseField
} from '../components/forms/StandardFields';

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
  'campaigns.manage'
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
  
  // Local state for managing items - inizializzati vuoti, caricati dal DB
  const [ragioneSocialiList, setRagioneSocialiList] = useState<any[]>([]);
  const [puntiVenditaList, setPuntiVenditaList] = useState<any[]>([]);
  // Note: fornitoriList is now managed by TanStack Query as suppliersList
  
  
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
  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['/api/reference/payment-methods'],
    staleTime: 5 * 60 * 1000,
  });

  // Load suppliers data with TanStack Query for proper cache management
  const { data: suppliersList = [], isLoading: suppliersLoading, error: suppliersError, isError: suppliersIsError, refetch: refetchSuppliersQuery } = useQuery({
    queryKey: ['/api/suppliers'],
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
    
    permissions.forEach(permission => {
      // Extract category from permission string (e.g., "dashboard.view" -> "dashboard")
      const parts = permission.split('.');
      const category = parts[0] || 'other';
      
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(permission);
    });

    // Convert to array format expected by UI
    return Object.entries(categories).map(([category, perms]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      permissions: perms
    }));
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
            data-testid="button-create-supplier">
              <Plus size={16} />
              Nuovo Fornitore
            </button>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            border: '1px solid #e5e7eb'
          }}>
            {suppliersLoading ? (
              <div style={{ 
                padding: '48px 16px', 
                textAlign: 'center', 
                color: '#6b7280',
                fontSize: '14px'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <RefreshCw size={32} style={{ color: '#d1d5db', animation: 'spin 1s linear infinite' }} />
                  <div>Caricamento fornitori...</div>
                </div>
                <style>{`
                  @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                `}</style>
              </div>
            ) : suppliersIsError ? (
              <div style={{ 
                padding: '48px 16px', 
                textAlign: 'center', 
                color: '#ef4444',
                fontSize: '14px'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <AlertCircle size={32} style={{ color: '#ef4444' }} />
                  <div>Errore nel caricamento dei fornitori</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {suppliersError?.message || 'Si è verificato un errore imprevisto'}
                  </div>
                  <button
                    onClick={() => refetchSuppliersQuery()}
                    style={{
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      marginTop: '8px'
                    }}
                  >
                    Riprova
                  </button>
                </div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #f9fafb, #f3f4f6)' }}>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Codice</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Nome</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>P.IVA / C.F.</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Città</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Stato</th>
                    <th style={{ padding: '16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {safeSuppliersList.map((supplier: any, index: number) => (
                  <tr
                    key={supplier.id}
                    data-testid={`row-supplier-${supplier.id}`}
                    style={{
                      background: index % 2 === 0 ? '#ffffff' : '#fafafa',
                      borderBottom: '1px solid #f3f4f6',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = '#f0fdf4';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = index % 2 === 0 ? '#ffffff' : '#fafafa';
                    }}>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#111827', fontWeight: '600' }}>
                      {supplier.code}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div>
                        <div style={{ fontSize: '14px', color: '#111827', fontWeight: '600' }}>{supplier.name}</div>
                        {supplier.legal_name && (
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>{supplier.legal_name}</div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '16px', fontSize: '13px', color: '#6b7280' }}>
                      <div>
                        <div>P.IVA: {supplier.vat_number || 'N/A'}</div>
                        <div>C.F.: {supplier.tax_code || 'N/A'}</div>
                      </div>
                    </td>
                    <td style={{ padding: '16px', fontSize: '13px', color: '#6b7280' }}>
                      {supplier.city || '-'} ({supplier.province || '-'})
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 12px',
                        background: supplier.status === 'active' || supplier.status === 'Attivo'
                          ? '#dcfce7'
                          : supplier.status === 'suspended' || supplier.status === 'Sospeso'
                          ? '#fef3c7'
                          : supplier.status === 'archived' || supplier.status === 'Archiviato'
                          ? '#fecaca'
                          : '#f1f5f9',
                        color: supplier.status === 'active' || supplier.status === 'Attivo'
                          ? '#15803d' 
                          : supplier.status === 'suspended' || supplier.status === 'Sospeso'
                          ? '#d97706'
                          : supplier.status === 'archived' || supplier.status === 'Archiviato'
                          ? '#dc2626'
                          : '#475569',
                        border: `1px solid ${supplier.status === 'active' || supplier.status === 'Attivo'
                          ? '#bbf7d0' 
                          : supplier.status === 'suspended' || supplier.status === 'Sospeso'
                          ? '#fcd34d'
                          : supplier.status === 'archived' || supplier.status === 'Archiviato'
                          ? '#fca5a5'
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
                        {supplier.status === 'active' ? 'Attivo' : supplier.status === 'suspended' ? 'Sospeso' : supplier.status === 'archived' ? 'Archiviato' : supplier.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          data-testid={`button-view-supplier-${supplier.id}`}
                          onClick={() => setSupplierModal({ open: true, data: supplier })}
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
                            e.currentTarget.style.background = '#f0fdf4';
                            e.currentTarget.style.borderColor = '#bbf7d0';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = '#e5e7eb';
                          }}>
                          <Eye size={14} style={{ color: '#10b981' }} />
                        </button>
                        {supplier.origin === 'tenant' && (
                          <button
                            data-testid={`button-delete-supplier-${supplier.id}`}
                            onClick={() => handleDeleteSupplier(supplier.id)}
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
                        )}
                        {supplier.origin === 'brand' && (
                          <div style={{
                            padding: '6px 8px',
                            fontSize: '11px',
                            color: '#6b7280',
                            background: '#f9fafb',
                            borderRadius: '4px'
                          }}>
                            View Only
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                  {safeSuppliersList.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ 
                        padding: '48px 16px', 
                        textAlign: 'center', 
                        color: '#6b7280',
                        fontSize: '14px'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                          <Truck size={32} style={{ color: '#d1d5db' }} />
                          <div>Nessun fornitore configurato</div>
                          <div style={{ fontSize: '12px' }}>Crea il primo fornitore per iniziare</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
      
      {/* Placeholder per altre sezioni */}
      {selectedEntity === 'utenti' && (
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
              Utenti e Risorse
            </h3>
            <button style={{
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
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
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
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
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            border: '1px solid #e5e7eb'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, #f9fafb, #f3f4f6)' }}>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Nome Completo</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Email</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Ruolo</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Posizione</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Dipartimento</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Punto Vendita</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Telefono</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Contratto</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Stato</th>
                  <th style={{ padding: '16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Azioni</th>
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
                    <td style={{ padding: '16px', fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                      {user.firstName || user.first_name || ''} {user.lastName || user.last_name || ''}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                      {user.email || 'N/A'}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: getRoleColor(user.role_name || user.role) + '20',
                        color: getRoleColor(user.role_name || user.role),
                        border: `1px solid ${getRoleColor(user.role_name || user.role)}40`
                      }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: getRoleColor(user.role_name || user.role)
                        }}></div>
                        {user.role_name || user.role || 'Operatore'}
                      </span>
                    </td>
                    <td style={{ padding: '16px', fontSize: '13px', color: '#374151' }}>
                      {user.position || 'N/A'}
                    </td>
                    <td style={{ padding: '16px', fontSize: '13px', color: '#6b7280' }}>
                      {user.department || 'N/A'}
                    </td>
                    <td style={{ padding: '16px', fontSize: '13px', color: '#374151' }}>
                      {user.store_name || 'Sede Centrale'}
                    </td>
                    <td style={{ padding: '16px', fontSize: '13px', color: '#6b7280' }}>
                      {user.phone || 'N/A'}
                    </td>
                    <td style={{ padding: '16px', fontSize: '13px', color: '#374151' }}>
                      {user.contract_type || 'N/A'}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: getStatusColor(user.status).bg,
                        color: getStatusColor(user.status).color,
                        border: `1px solid ${getStatusColor(user.status).border}`
                      }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: getStatusColor(user.status).color
                        }}></div>
                        {user.status === 'Active' ? 'Attivo' : (user.status === 'Suspended' ? 'Sospeso' : user.status || 'Inattivo')}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => setUserModal({ open: true, data: user })}
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
                        }}
                        title="Modifica utente">
                          <Edit3 size={14} style={{ color: '#6b7280' }} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
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
            backdropFilter: 'blur(24px) saturate(140%)',
            WebkitBackdropFilter: 'blur(24px) saturate(140%)',
            border: '1px solid hsla(255, 255, 255, 0.12)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '32px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #8339ff, #6b2cbf)',
                  borderRadius: '12px',
                  padding: '10px',
                  boxShadow: '0 4px 12px rgba(131, 57, 255, 0.3)'
                }}>
                  <UserCog size={20} style={{ color: 'white' }} />
                </div>
                <div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#111827',
                    margin: 0
                  }}>
                    Gestione Ruoli e Permessi
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    margin: '4px 0 0 0'
                  }}>
                    Configura template di ruoli e gestisci capability per tenant
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCreateRoleModalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #8339ff, #6b2cbf)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(131, 57, 255, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(131, 57, 255, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(131, 57, 255, 0.3)';
                }}
              >
                <Plus size={16} />
                Crea Ruolo Custom
              </button>
            </div>
            
            {/* Template di Ruoli */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '16px'
            }}>
              {rolesLoading ? (
                // Loading skeleton for roles
                Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} style={{
                    background: 'hsla(255, 255, 255, 0.05)',
                    border: '1px solid hsla(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '20px',
                    position: 'relative',
                    cursor: 'pointer',
                    animation: 'pulse 2s infinite'
                  }}>
                    <div style={{ height: '3px', background: '#e5e7eb', borderRadius: '2px', marginBottom: '12px' }} />
                    <div style={{ height: '16px', background: '#e5e7eb', borderRadius: '4px', marginBottom: '4px', width: '60%' }} />
                    <div style={{ height: '12px', background: '#e5e7eb', borderRadius: '4px', marginBottom: '12px', width: '80%' }} />
                    <div style={{ height: '12px', background: '#e5e7eb', borderRadius: '4px', width: '40%' }} />
                  </div>
                ))
              ) : rolesError ? (
                <div style={{
                  gridColumn: '1 / -1',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center',
                  color: '#dc2626'
                }}>
                  <AlertTriangle size={20} style={{ marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '14px' }}>
                    Errore nel caricamento dei ruoli. <button onClick={() => refetchRoles()} style={{ color: '#dc2626', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>Riprova</button>
                  </p>
                </div>
              ) : (
                (rbacRolesData.roles || []).map((role: any) => {
                  // Add default colors and fallback data
                  const roleWithDefaults = {
                    ...role,
                    color: role.color || getDefaultRoleColor(role.code),
                    users: role.userCount || 0,
                    description: role.description || getDefaultRoleDescription(role.code)
                  };
                  return roleWithDefaults;
                })
              ).map((role: any) => (
                <div
                  key={role.code}
                  onClick={() => setSelectedRole(role.code)}
                  style={{
                    background: selectedRole === role.code 
                      ? `linear-gradient(135deg, ${role.color}15, ${role.color}08)`
                      : 'hsla(255, 255, 255, 0.05)',
                    border: selectedRole === role.code
                      ? `2px solid ${role.color}40`
                      : '1px solid hsla(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                    transform: 'translateY(0) scale(1) rotateX(0deg)',
                    transformStyle: 'preserve-3d',
                    perspective: '1000px',
                    boxShadow: selectedRole === role.code
                      ? `0 8px 24px ${role.color}20, 0 4px 12px rgba(0, 0, 0, 0.1)`
                      : '0 2px 8px rgba(0, 0, 0, 0.05)'
                  }}
                  onMouseEnter={(e) => {
                    const card = e.currentTarget;
                    const colorBar = card.querySelector('.color-bar') as HTMLElement;
                    const icon = card.querySelector('.role-icon') as HTMLElement;
                    const users = card.querySelector('.users-count') as HTMLElement;
                    
                    // Card animations
                    card.style.background = `linear-gradient(135deg, ${role.color}18, ${role.color}10)`;
                    card.style.borderColor = `${role.color}40`;
                    card.style.transform = 'translateY(-8px) scale(1.03) rotateX(-2deg)';
                    card.style.boxShadow = `0 16px 32px ${role.color}25, 0 8px 16px rgba(0, 0, 0, 0.15)`;
                    
                    // Color bar animation
                    if (colorBar) {
                      colorBar.style.height = '5px';
                      colorBar.style.background = `linear-gradient(90deg, ${role.color}, ${role.color}dd, ${role.color})`;
                      colorBar.style.boxShadow = `0 2px 8px ${role.color}60`;
                    }
                    
                    // Icon animation
                    if (icon) {
                      icon.style.transform = 'rotate(360deg) scale(1.2)';
                      icon.style.color = role.color;
                    }
                    
                    // Users count animation
                    if (users) {
                      users.style.transform = 'translateX(4px)';
                      users.style.color = role.color;
                    }
                  }}
                  onMouseLeave={(e) => {
                    const card = e.currentTarget;
                    const colorBar = card.querySelector('.color-bar') as HTMLElement;
                    const icon = card.querySelector('.role-icon') as HTMLElement;
                    const users = card.querySelector('.users-count') as HTMLElement;
                    
                    // Reset card
                    card.style.background = selectedRole === role.code 
                      ? `linear-gradient(135deg, ${role.color}15, ${role.color}08)`
                      : 'hsla(255, 255, 255, 0.05)';
                    card.style.borderColor = selectedRole === role.code
                      ? `${role.color}40`
                      : 'hsla(255, 255, 255, 0.08)';
                    card.style.transform = 'translateY(0) scale(1) rotateX(0deg)';
                    card.style.boxShadow = selectedRole === role.code
                      ? `0 8px 24px ${role.color}20, 0 4px 12px rgba(0, 0, 0, 0.1)`
                      : '0 2px 8px rgba(0, 0, 0, 0.05)';
                    
                    // Reset color bar
                    if (colorBar) {
                      colorBar.style.height = '3px';
                      colorBar.style.background = role.color;
                      colorBar.style.boxShadow = 'none';
                    }
                    
                    // Reset icon
                    if (icon) {
                      icon.style.transform = 'rotate(0deg) scale(1)';
                      icon.style.color = role.color;
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
                    background: `radial-gradient(circle at center, ${role.color}10 0%, transparent 70%)`,
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
                      background: role.color,
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                    }} />
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: '12px',
                    position: 'relative',
                    zIndex: 1
                  }}>
                    <div>
                      <h4 style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#111827',
                        margin: '0 0 4px 0'
                      }}>
                        {role.name}
                      </h4>
                      <p style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        margin: 0
                      }}>
                        {role.description}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {role.code === 'admin' && (
                        <Star 
                          size={16} 
                          className="role-icon"
                          style={{ 
                            color: role.color,
                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            transform: 'rotate(0deg) scale(1)'
                          }} 
                        />
                      )}
                      {!role.isSystemRole && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteRole(role.id || role.code, role.name, role.isSystemRole || false);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#dc2626',
                            padding: '4px',
                            borderRadius: '4px',
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
                        fontSize: '12px',
                        color: '#6b7280',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.3s ease',
                        transform: 'translateX(0)'
                      }}
                    >
                      <Users size={12} />
                      {role.users} utenti
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
              ))}
            </div>
          </div>
          
          {/* Dettaglio Ruolo Selezionato */}
          {selectedRole && (
            <div style={{
              background: 'hsla(255, 255, 255, 0.08)',
              backdropFilter: 'blur(24px) saturate(140%)',
              WebkitBackdropFilter: 'blur(24px) saturate(140%)',
              border: '1px solid hsla(255, 255, 255, 0.12)',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px'
              }}>
                <h4 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#111827',
                  margin: 0
                }}>
                  Permessi del Ruolo: {selectedRole ? selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1).replace('_', ' ') : 'Nessun ruolo selezionato'}
                </h4>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    style={{
                      padding: '8px 16px',
                      background: 'transparent',
                      color: '#6b7280',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '14px',
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
                      padding: '8px 16px',
                      background: isPermissionsDirty 
                        ? 'linear-gradient(135deg, #FF6900, #ff8533)' 
                        : '#e5e7eb',
                      color: isPermissionsDirty ? 'white' : '#6b7280',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: isPermissionsDirty ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s ease',
                      opacity: rolePermissionsLoading ? 0.7 : 1
                    }}
                  >
                    {rolePermissionsLoading ? 'Salvando...' : 'Salva Modifiche'}
                    {isPermissionsDirty && <span style={{ marginLeft: '4px' }}>•</span>}
                  </button>
                </div>
              </div>
              
              {/* Categorie di Permessi */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '20px'
              }}>
                {permissionsLoading ? (
                  // Loading skeleton for permissions
                  Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} style={{
                      background: 'hsla(255, 255, 255, 0.05)',
                      border: '1px solid hsla(255, 255, 255, 0.08)',
                      borderRadius: '8px',
                      padding: '16px',
                      animation: 'pulse 2s infinite'
                    }}>
                      <div style={{ height: '16px', background: '#e5e7eb', borderRadius: '4px', marginBottom: '12px', width: '60%' }} />
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} style={{ height: '12px', background: '#e5e7eb', borderRadius: '4px', marginBottom: '8px', width: `${60 + Math.random() * 30}%` }} />
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
                      borderRadius: '8px',
                      padding: '16px'
                    }}
                  >
                    <h5 style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#111827',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      {cat.category}
                      {/* Switch Toggle */}
                      <label style={{
                        position: 'relative',
                        display: 'inline-block',
                        width: '44px',
                        height: '24px',
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
                          background: selectedRole === 'admin' ? 'linear-gradient(135deg, #FF6900, #ff8533)' : '#e5e7eb',
                          borderRadius: '24px',
                          transition: 'all 0.3s ease',
                          boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.12)'
                        }}>
                          <span style={{
                            position: 'absolute',
                            content: '""',
                            height: '18px',
                            width: '18px',
                            left: '3px',
                            bottom: '3px',
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            transition: 'all 0.3s ease',
                            transform: selectedRole === 'admin' ? 'translateX(20px)' : 'translateX(0)',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                          }} />
                        </span>
                      </label>
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {cat.permissions.map((perm) => (
                        <label
                          key={perm}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '6px 8px',
                            fontSize: '13px',
                            color: '#6b7280',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = 'hsla(255, 255, 255, 0.05)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isPermissionEnabled(perm)}
                            onChange={() => togglePermission(perm)}
                            style={{ 
                              cursor: 'pointer',
                              width: '16px',
                              height: '16px',
                              accentColor: '#FF6900'
                            }}
                          />
                          {perm}
                        </label>
                      ))}
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

  const renderAIAssistant = () => (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#111827',
          margin: '0 0 4px 0'
        }}>
          Configurazione AI Assistant
        </h2>
        <p style={{
          fontSize: '14px',
          color: '#6b7280',
          margin: 0
        }}>
          Gestisci le impostazioni dell'assistente AI e automazioni
        </p>
      </div>

      {/* AI Configuration Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px',
        marginBottom: '32px'
      }}>
        {/* OpenAI Configuration */}
        <div style={{
          background: 'hsla(255, 255, 255, 0.08)',
          backdropFilter: 'blur(24px) saturate(140%)',
          WebkitBackdropFilter: 'blur(24px) saturate(140%)',
          border: '1px solid hsla(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              borderRadius: '12px',
              padding: '10px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}>
              <Cpu size={20} style={{ color: 'white' }} />
            </div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              OpenAI Integration
            </h3>
          </div>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: '16px'
          }}>
            Configura l'integrazione con OpenAI per funzionalità AI avanzate
          </p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{
              background: '#10b981',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              Configurato
            </span>
            <button style={{
              background: 'transparent',
              border: '1px solid hsla(255, 255, 255, 0.12)',
              borderRadius: '8px',
              color: '#6b7280',
              padding: '8px 16px',
              fontSize: '12px',
              cursor: 'pointer'
            }}>
              Modifica
            </button>
          </div>
        </div>

        {/* Automations */}
        <div style={{
          background: 'hsla(255, 255, 255, 0.08)',
          backdropFilter: 'blur(24px) saturate(140%)',
          WebkitBackdropFilter: 'blur(24px) saturate(140%)',
          border: '1px solid hsla(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              borderRadius: '12px',
              padding: '10px',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}>
              <Zap size={20} style={{ color: 'white' }} />
            </div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              Automazioni
            </h3>
          </div>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: '16px'
          }}>
            Gestisci automazioni e workflow intelligenti
          </p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{
              background: '#f59e0b',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              In Configurazione
            </span>
            <button style={{
              background: 'transparent',
              border: '1px solid hsla(255, 255, 255, 0.12)',
              borderRadius: '8px',
              color: '#6b7280',
              padding: '8px 16px',
              fontSize: '12px',
              cursor: 'pointer'
            }}>
              Configura
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderChannelSettings = () => (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#111827',
          margin: '0 0 4px 0'
        }}>
          Configurazione Canali
        </h2>
        <p style={{
          fontSize: '14px',
          color: '#6b7280',
          margin: 0
        }}>
          Gestisci canali di comunicazione e integrazione
        </p>
      </div>

      {/* Channel Configuration */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px'
      }}>
        {/* Email Channel */}
        <div style={{
          background: 'hsla(255, 255, 255, 0.08)',
          backdropFilter: 'blur(24px) saturate(140%)',
          WebkitBackdropFilter: 'blur(24px) saturate(140%)',
          border: '1px solid hsla(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              borderRadius: '12px',
              padding: '10px',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
            }}>
              <Mail size={20} style={{ color: 'white' }} />
            </div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              Email Integration
            </h3>
          </div>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: '16px'
          }}>
            Configura server SMTP e template email
          </p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{
              background: '#10b981',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              Attivo
            </span>
            <button style={{
              background: 'transparent',
              border: '1px solid hsla(255, 255, 255, 0.12)',
              borderRadius: '8px',
              color: '#6b7280',
              padding: '8px 16px',
              fontSize: '12px',
              cursor: 'pointer'
            }}>
              Gestisci
            </button>
          </div>
        </div>

        {/* Webhook Channel */}
        <div style={{
          background: 'hsla(255, 255, 255, 0.08)',
          backdropFilter: 'blur(24px) saturate(140%)',
          WebkitBackdropFilter: 'blur(24px) saturate(140%)',
          border: '1px solid hsla(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #7B2CBF, #9333ea)',
              borderRadius: '12px',
              padding: '10px',
              boxShadow: '0 4px 12px rgba(123, 44, 191, 0.3)'
            }}>
              <Globe size={20} style={{ color: 'white' }} />
            </div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              Webhook Integration
            </h3>
          </div>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: '16px'
          }}>
            Gestisci webhook per integrazioni esterne
          </p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{
              background: '#f59e0b',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              Da Configurare
            </span>
            <button style={{
              background: 'transparent',
              border: '1px solid hsla(255, 255, 255, 0.12)',
              borderRadius: '8px',
              color: '#6b7280',
              padding: '8px 16px',
              fontSize: '12px',
              cursor: 'pointer'
            }}>
              Configura
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSystemSettings = () => (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#111827',
          margin: '0 0 4px 0'
        }}>
          Configurazioni Sistema
        </h2>
        <p style={{
          fontSize: '14px',
          color: '#6b7280',
          margin: 0
        }}>
          Gestisci impostazioni generali del sistema e sicurezza
        </p>
      </div>

      {/* System Configuration */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px'
      }}>
        {/* Security Settings */}
        <div style={{
          background: 'hsla(255, 255, 255, 0.08)',
          backdropFilter: 'blur(24px) saturate(140%)',
          WebkitBackdropFilter: 'blur(24px) saturate(140%)',
          border: '1px solid hsla(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              borderRadius: '12px',
              padding: '10px',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
            }}>
              <Shield size={20} style={{ color: 'white' }} />
            </div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              Sicurezza
            </h3>
          </div>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: '16px'
          }}>
            Gestisci autenticazione, GDPR e politiche sicurezza
          </p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{
              background: '#10b981',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              Protetto
            </span>
            <button style={{
              background: 'transparent',
              border: '1px solid hsla(255, 255, 255, 0.12)',
              borderRadius: '8px',
              color: '#6b7280',
              padding: '8px 16px',
              fontSize: '12px',
              cursor: 'pointer'
            }}>
              Visualizza
            </button>
          </div>
        </div>

        {/* Backup Settings */}
        <div style={{
          background: 'hsla(255, 255, 255, 0.08)',
          backdropFilter: 'blur(24px) saturate(140%)',
          WebkitBackdropFilter: 'blur(24px) saturate(140%)',
          border: '1px solid hsla(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
              borderRadius: '12px',
              padding: '10px',
              boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)'
            }}>
              <Database size={20} style={{ color: 'white' }} />
            </div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              Backup e Ripristino
            </h3>
          </div>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: '16px'
          }}>
            Configura backup automatici e procedure di ripristino
          </p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{
              background: '#10b981',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              Attivo
            </span>
            <button style={{
              background: 'transparent',
              border: '1px solid hsla(255, 255, 255, 0.12)',
              borderRadius: '8px',
              color: '#6b7280',
              padding: '8px 16px',
              fontSize: '12px',
              cursor: 'pointer'
            }}>
              Gestisci
            </button>
          </div>
        </div>
      </div>
    </div>
  );

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
          minHeight: '400px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '40px'
        }}>
          <AlertCircle size={48} style={{ color: '#ef4444', marginBottom: '16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
            Error Loading Logs
          </h3>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px', textAlign: 'center' }}>
            {logsError.message || 'Failed to load system logs. Please try again.'}
          </p>
          <button
            onClick={() => refetchLogs()}
            aria-label="Retry loading logs"
            style={{
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
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
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '24px'
        }}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              height: '20px',
              background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 100%)',
              borderRadius: '4px',
              animation: 'shimmer 2s infinite',
              marginBottom: '8px'
            }} />
            <div style={{
              height: '14px',
              background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 100%)',
              borderRadius: '4px',
              width: '60%',
              animation: 'shimmer 2s infinite'
            }} />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{
              padding: '16px',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              marginBottom: '8px'
            }}>
              <div style={{
                height: '16px',
                background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 100%)',
                borderRadius: '4px',
                marginBottom: '8px',
                animation: 'shimmer 2s infinite'
              }} />
              <div style={{
                height: '12px',
                background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 100%)',
                borderRadius: '4px',
                width: '80%',
                animation: 'shimmer 2s infinite'
              }} />
            </div>
          ))}
          <style>{`
            @keyframes shimmer {
              0% { background-position: -200px 0; }
              100% { background-position: calc(200px + 100%) 0; }
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
          minHeight: '400px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '40px'
        }}>
          <FileText size={48} style={{ color: '#6b7280', marginBottom: '16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
            No Logs Found
          </h3>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px', textAlign: 'center' }}>
            No logs match your current filters. Try adjusting your search criteria or check back later.
          </p>
          <button
            onClick={resetLogsFilters}
            aria-label="Clear all filters to show all logs"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              padding: '10px 20px',
              color: '#6b7280',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
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
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <div>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#111827',
                margin: '0 0 4px 0'
              }}>
                Logs Sistema
              </h2>
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: 0
              }}>
                Visualizza e monitora i log strutturati del sistema
              </p>
            </div>
            
            {/* Auto-refresh and manual refresh controls */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {newLogsAvailable && (
                <div style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  animation: 'pulse 2s infinite'
                }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
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
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${autoRefreshEnabled ? '#10b981' : 'rgba(255, 255, 255, 0.2)'}`,
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: autoRefreshEnabled ? 'white' : '#6b7280',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
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
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  padding: '8px',
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
            backdropFilter: 'blur(24px) saturate(140%)',
            WebkitBackdropFilter: 'blur(24px) saturate(140%)',
            border: '1px solid hsla(255, 255, 255, 0.12)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px',
              marginBottom: '16px'
            }}>
              {/* Search Bar */}
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{
                  position: 'absolute',
                  left: '12px',
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
                    padding: '10px 12px 10px 36px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: '#111827',
                    fontSize: '14px',
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
                  padding: '10px 12px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#111827',
                  fontSize: '14px',
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
                  padding: '10px 12px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#111827',
                  fontSize: '14px',
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '16px'
            }}>
              {/* From Date */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#6b7280',
                  marginBottom: '4px'
                }}>
                  From Date
                </label>
                <input
                  type="datetime-local"
                  value={logsFromDate}
                  onChange={(e) => setLogsFromDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: '#111827',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  data-testid="input-from-date"
                />
              </div>

              {/* To Date */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#6b7280',
                  marginBottom: '4px'
                }}>
                  To Date
                </label>
                <input
                  type="datetime-local"
                  value={logsToDate}
                  onChange={(e) => setLogsToDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: '#111827',
                    fontSize: '14px',
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
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#111827',
                  fontSize: '14px',
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
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#111827',
                  fontSize: '14px',
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
                borderRadius: '8px',
                padding: '8px 16px',
                color: '#FF6900',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
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
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            {logsLoading ? (
              // Loading skeleton
              <div style={{ padding: '24px' }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{
                    background: 'rgba(0, 0, 0, 0.05)',
                    height: '60px',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }} />
                ))}
              </div>
            ) : logsError ? (
              // Error state
              <div style={{
                padding: '48px 24px',
                textAlign: 'center',
                color: '#ef4444'
              }}>
                <XCircle size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px' }}>
                  Error loading logs
                </h3>
                <p style={{ fontSize: '14px', margin: '0 0 16px', opacity: 0.7 }}>
                  {(logsError as any)?.message || 'Failed to fetch logs data'}
                </p>
                <button
                  onClick={() => window.location.reload()}
                  style={{
                    background: 'linear-gradient(135deg, #FF6900, #ff8533)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '14px',
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
                padding: '48px 24px',
                textAlign: 'center',
                color: '#6b7280'
              }}>
                <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px' }}>
                  No logs found
                </h3>
                <p style={{ fontSize: '14px', margin: 0, opacity: 0.7 }}>
                  Try adjusting your filters or check back later
                </p>
              </div>
            ) : (
              // Logs table
              <div style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg, #f9fafb, #f3f4f6)' }}>
                      <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb', minWidth: '140px' }}>Timestamp</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb', minWidth: '80px' }}>Level</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb', minWidth: '120px' }}>Component</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Message</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb', minWidth: '100px' }}>User</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb', minWidth: '120px' }}>Correlation ID</th>
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
                        <td style={{ padding: '12px 16px', fontSize: '12px', color: '#6b7280' }}>
                          {formatLogTimestamp(log.timestamp)}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{
                            background: `${getLevelColor(log.level)}15`,
                            color: getLevelColor(log.level),
                            border: `1px solid ${getLevelColor(log.level)}30`,
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            display: 'inline-block',
                            minWidth: '50px',
                            textAlign: 'center'
                          }}>
                            {log.level}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#111827', fontWeight: '500' }}>
                          {log.component}
                        </td>
                        <td style={{
                          padding: '12px 16px',
                          fontSize: '14px',
                          color: '#111827',
                          maxWidth: '300px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {log.message}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>
                          {log.user || '-'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {log.correlationId ? (
                            <div style={{
                              background: 'rgba(59, 130, 246, 0.1)',
                              color: '#3b82f6',
                              border: '1px solid rgba(59, 130, 246, 0.2)',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              fontSize: '11px',
                              fontFamily: 'monospace',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
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
                            <span style={{ color: '#9ca3af', fontSize: '12px' }}>-</span>
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
                backdropFilter: 'blur(8px)',
                borderTop: '1px solid #e5e7eb',
                padding: '16px 24px',
                display: 'flex',
                justifyContent: 'between',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  Showing {((metadata.page - 1) * metadata.limit) + 1} to {Math.min(metadata.page * metadata.limit, metadata.total)} of {metadata.total} logs
                </div>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={() => setLogsCurrentPage(Math.max(1, logsCurrentPage - 1))}
                    disabled={logsCurrentPage <= 1}
                    style={{
                      background: logsCurrentPage <= 1 ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.8)',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '14px',
                      color: logsCurrentPage <= 1 ? '#9ca3af' : '#374151',
                      cursor: logsCurrentPage <= 1 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    data-testid="button-previous-page"
                  >
                    <ChevronLeft size={14} />
                    Previous
                  </button>
                  
                  <div style={{
                    padding: '6px 12px',
                    background: 'rgba(255, 105, 0, 0.1)',
                    border: '1px solid rgba(255, 105, 0, 0.2)',
                    borderRadius: '6px',
                    fontSize: '14px',
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
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '14px',
                      color: logsCurrentPage >= metadata.totalPages ? '#9ca3af' : '#374151',
                      cursor: logsCurrentPage >= metadata.totalPages ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
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
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            data-testid="modal-log-details"
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '24px'
              }}>
                <div>
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#111827',
                    margin: '0 0 8px 0'
                  }}>
                    Log Details
                  </h3>
                  <div style={{
                    background: `${getLevelColor(logDetailsModal.data.level)}15`,
                    color: getLevelColor(logDetailsModal.data.level),
                    border: `1px solid ${getLevelColor(logDetailsModal.data.level)}30`,
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '12px',
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
                    borderRadius: '8px',
                    padding: '8px',
                    cursor: 'pointer',
                    color: '#6b7280'
                  }}
                  data-testid="button-close-modal"
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: 'grid', gap: '20px' }}>
                {/* Basic Information */}
                <div style={{
                  background: 'rgba(249, 250, 251, 0.5)',
                  borderRadius: '12px',
                  padding: '16px'
                }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 12px 0' }}>
                    Basic Information
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                        Timestamp
                      </label>
                      <div style={{ fontSize: '14px', color: '#111827', fontFamily: 'monospace' }}>
                        {formatLogTimestamp(logDetailsModal.data.timestamp)}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                        Component
                      </label>
                      <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                        {logDetailsModal.data.component}
                      </div>
                    </div>
                    {logDetailsModal.data.user && (
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                          User
                        </label>
                        <div style={{ fontSize: '14px', color: '#111827' }}>
                          {logDetailsModal.data.user}
                        </div>
                      </div>
                    )}
                    {logDetailsModal.data.correlationId && (
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                          Correlation ID
                        </label>
                        <div style={{
                          fontSize: '12px',
                          color: '#3b82f6',
                          fontFamily: 'monospace',
                          background: 'rgba(59, 130, 246, 0.1)',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
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
                  borderRadius: '12px',
                  padding: '16px'
                }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 12px 0' }}>
                    Message
                  </h4>
                  <div style={{
                    fontSize: '14px',
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
                    borderRadius: '12px',
                    padding: '16px'
                  }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 12px 0' }}>
                      Metadata
                    </h4>
                    <pre style={{
                      fontSize: '12px',
                      color: '#111827',
                      fontFamily: 'monospace',
                      background: 'white',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      overflow: 'auto',
                      maxHeight: '200px',
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
                    borderRadius: '12px',
                    padding: '16px'
                  }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#ef4444', margin: '0 0 12px 0' }}>
                      Stack Trace
                    </h4>
                    <pre style={{
                      fontSize: '11px',
                      color: '#374151',
                      fontFamily: 'monospace',
                      background: 'white',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #fecaca',
                      overflow: 'auto',
                      maxHeight: '300px',
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
                    borderRadius: '12px',
                    padding: '16px'
                  }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 12px 0' }}>
                      Request Context
                    </h4>
                    <pre style={{
                      fontSize: '12px',
                      color: '#111827',
                      fontFamily: 'monospace',
                      background: 'white',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      overflow: 'auto',
                      maxHeight: '200px',
                      margin: 0
                    }}>
                      {JSON.stringify(logDetailsModal.data.requestContext, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div style={{
                marginTop: '24px',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px'
              }}>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(logDetailsModal.data, null, 2))}
                  style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    color: '#3b82f6',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
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
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '14px',
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

        {/* Create Custom Role Modal */}
        {createRoleModalOpen && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px'
              }}>
                <h3 style={{
                  fontSize: '20px',
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
                    fontSize: '20px',
                    cursor: 'pointer',
                    color: '#6b7280'
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  Codice Ruolo
                </label>
                <input
                  type="text"
                  value={newRoleData.code}
                  onChange={(e) => setNewRoleData({ ...newRoleData, code: e.target.value })}
                  placeholder="es. custom_role"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  Nome Ruolo
                </label>
                <input
                  type="text"
                  value={newRoleData.name}
                  onChange={(e) => setNewRoleData({ ...newRoleData, name: e.target.value })}
                  placeholder="es. Custom Role"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  Descrizione
                </label>
                <textarea
                  value={newRoleData.description}
                  onChange={(e) => setNewRoleData({ ...newRoleData, description: e.target.value })}
                  placeholder="Descrizione del ruolo personalizzato..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => setCreateRoleModalOpen(false)}
                  style={{
                    padding: '10px 20px',
                    background: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
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
                    padding: '10px 20px',
                    background: newRoleData.code && newRoleData.name 
                      ? 'linear-gradient(135deg, #8339ff, #6b2cbf)' 
                      : '#e5e7eb',
                    color: newRoleData.code && newRoleData.name ? 'white' : '#6b7280',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
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

        {/* Notification Toast */}
        {notification && (
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: notification.type === 'success' ? '#10b981' : '#dc2626',
            color: 'white',
            padding: '16px 20px',
            borderRadius: '8px',
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            maxWidth: '400px',
            animation: 'slideIn 0.3s ease'
          }}>
            {notification.type === 'success' ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span style={{ fontSize: '14px', fontWeight: '600' }}>
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
                padding: '4px'
              }}
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Entity Management':
        return renderEntityManagement();
      case 'AI Assistant':
        return renderAIAssistant();
      case 'Channel Settings':
        return renderChannelSettings();
      case 'System Settings':
        return renderSystemSettings();
      case 'Logs':
        return renderLogs();
      default:
        return renderEntityManagement();
    }
  };

  // State per il nuovo modal punto vendita
  const [newStore, setNewStore] = useState({
    // ⭐ CAMPI ALLINEATI AL DATABASE SCHEMA
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
    legal_entity_id: null as string | null,  // Database: legal_entity_id (UUID)
    commercial_area_id: null as string | null, // Database: commercial_area_id (UUID)
    channel_id: null as string | null,     // Database: channel_id (UUID)
    status: 'active',                      // Database: status (default 'active')
    // 🔧 CAMPI BUSINESS
    brands: [] as string[],                // Relazione M:N con store_brands
    // 🗓️ CAMPI DATE (opzionali per UI)
    opened_at: null as string | null,      // Database: opened_at
    closed_at: null as string | null       // Database: closed_at
  });

  // Precompila i campi del modal quando è in modalità edit
  useEffect(() => {
    if (storeModal.open && storeModal.data) {
      // Modalità EDIT - precompila i campi con i dati esistenti
      const item = storeModal.data;
      setNewStore({
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
        legal_entity_id: item.legalEntityId || item.legal_entity_id || null,
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
        legal_entity_id: null,
        commercial_area_id: null,
        channel_id: null,
        status: 'active',
        brands: [],
        opened_at: null,
        closed_at: null
      });
    }
  }, [storeModal.open, storeModal.data]);

  // State per il nuovo utente
  const [newUser, setNewUser] = useState({
    // Dati di accesso
    username: '',
    password: '',
    confirmPassword: '',
    ruolo: '',
    cambioPasswordObbligatorio: true,
    
    // Relazioni obbligatorie
    ragioneSociale_id: null as number | null,  // Obbligatorio
    puntiVendita_ids: [] as number[],  // Almeno uno obbligatorio
    puntoVenditaPreferito_id: null as number | null,  // Obbligatorio se più PdV
    
    // ✅ SCOPE PIRAMIDALE NUOVO SISTEMA  
    scopeLevel: 'organizzazione',          // Mantento per compatibilità
    selectAllLegalEntities: false,         // "Seleziona tutto" ragioni sociali = accesso completo organizzazione
    selectedLegalEntities: [] as number[], // Ragioni sociali selezionate (primo livello)
    selectedStores: [] as number[],        // Punti vendita filtrati (secondo livello)
    
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

  // State per il modal fornitore
  const [newSupplier, setNewSupplier] = useState({
    // ANAGRAFICI
    code: '',
    name: '',
    legalName: '',
    legalForm: '',
    vatNumber: '',
    taxCode: '',
    status: 'active',
    // GEOGRAFICI
    address: '',
    city: '',
    province: '',
    postalCode: '',
    country: 'Italia',
    // CONTATTI
    email: '',
    phone: '',
    website: '',
    pecEmail: '',
    // AMMINISTRATIVI
    sdiCode: '',
    iban: '',
    bic: '',
    splitPayment: false,
    withholdingTax: false,
    preferredPaymentMethodId: '',
    // NOTE
    notes: ''
  });

  // Ottieni il tenant ID dal localStorage o usa il demo tenant
  const getCurrentTenantId = () => {
    const tenantId = localStorage.getItem('currentTenantId');
    return tenantId || '00000000-0000-0000-0000-000000000001';
  };

  // Handler per salvare la nuova ragione sociale - USA API REALE
  const handleSaveRagioneSociale = async () => {
    try {
      const currentTenantId = DEMO_TENANT_ID;
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

      // Chiamata API per creare la ragione sociale
      const response = await fetch('/api/legal-entities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': currentTenantId
        },
        body: JSON.stringify(legalEntityData)
      });

      if (!response.ok) {
        throw new Error(`Failed to create legal entity: ${response.statusText}`);
      }

      const newLegalEntity = await response.json();
      console.log('✅ Legal entity created:', newLegalEntity);

      // Refresh the list dopo la creazione
      await refetchLegalEntities();
      
      setLegalEntityModal({ open: false, data: null });
      
      // Reset form
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
        // Enterprise fields
        capitaleSociale: '',
        dataCostituzione: '',
        rea: '',
        registroImprese: '',
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
    } catch (error) {
      console.error('❌ Error creating legal entity:', error);
      alert('Errore nella creazione della ragione sociale. Riprova.');
    }
  };

  // Handler per salvare il fornitore - USA API REALE
  const handleSaveSupplier = async () => {
    try {
      const currentTenantId = DEMO_TENANT_ID;
      
      // Validation: Ragione Sociale is required
      if (!newSupplier.name.trim()) {
        alert('Errore: Nome/Ragione Sociale è obbligatorio per creare un fornitore.');
        return;
      }

      const isEdit = Boolean(supplierModal.data);
      
      // Genera codice fornitore: inizia con FOR, almeno 6 cifre totali (solo per creazione)
      const newCode = newSupplier.code || (isEdit ? supplierModal.data.code : `FOR${String(Date.now()).slice(-3)}`);
      
      const supplierData = {
        tenantId: currentTenantId,
        origin: 'tenant',
        code: newCode,
        name: newSupplier.name,
        legalName: newSupplier.legalName,
        legalForm: newSupplier.legalForm,
        supplierType: 'distributore', // Default type, can be made dynamic later
        vatNumber: newSupplier.vatNumber,
        taxCode: newSupplier.taxCode,
        status: newSupplier.status,
        // Address structure - JSONB + FK pattern
        registeredAddress: {
          via: newSupplier.address,
          citta: newSupplier.city,
          provincia: newSupplier.province,
          cap: newSupplier.postalCode
        },
        countryId: '00000000-0000-0000-0000-000000000001', // Default Italy UUID - should be dynamic
        email: newSupplier.email,
        phone: newSupplier.phone,
        website: newSupplier.website,
        pecEmail: newSupplier.pecEmail,
        sdiCode: newSupplier.sdiCode,
        iban: newSupplier.iban,
        bic: newSupplier.bic,
        splitPayment: newSupplier.splitPayment,
        withholdingTax: newSupplier.withholdingTax,
        preferredPaymentMethodId: newSupplier.preferredPaymentMethodId || null,
        notes: newSupplier.notes,
        createdBy: 'system' // Should be current user ID
      };

      let result;
      if (isEdit) {
        // Modalità UPDATE
        result = await apiService.updateSupplier(supplierModal.data.id, supplierData);
      } else {
        // Modalità CREATE
        result = await apiService.createSupplier(supplierData);
      }
      
      if (result.success) {
        // Chiudi modal e reset form
        setSupplierModal({ open: false, data: null });
        
        // Reset form
        setNewSupplier({
          code: '',
          name: '',
          legalName: '',
          legalForm: '',
          vatNumber: '',
          taxCode: '',
          status: 'active',
          address: '',
          city: '',
          province: '',
          postalCode: '',
          country: 'Italia',
          email: '',
          phone: '',
          website: '',
          pecEmail: '',
          sdiCode: '',
          iban: '',
          bic: '',
          splitPayment: false,
          withholdingTax: false,
          preferredPaymentMethodId: '',
          notes: ''
        });

        // Ricarica i dati per mostrare le modifiche
        await refetchSuppliersQuery();
        
      } else {
        console.error(`❌ Error ${isEdit ? 'updating' : 'creating'} supplier:`, result.error);
        alert(`Errore nella ${isEdit ? 'modifica' : 'creazione'} del fornitore. Riprova.`);
      }
    } catch (error) {
      console.error(`❌ Error ${supplierModal.data ? 'updating' : 'creating'} supplier:`, error);
      alert(`Errore nella ${supplierModal.data ? 'modifica' : 'creazione'} del fornitore. Riprova.`);
    }
  };

  // Handler per salvare/aggiornare punto vendita - USA API REALE
  const handleSaveStore = async () => {
    try {
      const currentTenantId = DEMO_TENANT_ID;
      
      // ✅ VALIDAZIONE RELAZIONI 1:1 OBBLIGATORIE
      if (!newStore.legal_entity_id) {
        alert('Errore: Ragione Sociale è obbligatoria per creare un punto vendita.');
        return;
      }
      
      if (!newStore.channel_id) {
        alert('Errore: Canale di vendita è obbligatorio per creare un punto vendita.');
        return;
      }
      
      if (!newStore.commercial_area_id) {
        alert('Errore: Area commerciale è obbligatoria per creare un punto vendita.');
        return;
      }
      
      const isEdit = Boolean(storeModal.data);
      
      // Genera codice PDV: inizia con 9, almeno 7 cifre totali (solo per creazione)
      const newCode = newStore.code || (isEdit ? storeModal.data.code : `9${String(Date.now()).slice(-6)}`);
      
      const storeData = {
        tenantId: currentTenantId,
        legalEntityId: newStore.legal_entity_id,
        code: newCode,                        
        nome: newStore.nome || 'Nuovo Punto Vendita',
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
          legal_entity_id: null,
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
        alert(`Errore nella ${isEdit ? 'modifica' : 'creazione'} del punto vendita. Riprova.`);
      }
    } catch (error) {
      console.error(`❌ Error ${storeModal.data ? 'updating' : 'creating'} store:`, error);
      alert(`Errore nella ${storeModal.data ? 'modifica' : 'creazione'} del punto vendita. Riprova.`);
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
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            borderTop: '3px solid transparent',
            borderImage: 'linear-gradient(90deg, #FF6900, #7B2CBF) 1',
            animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            {/* Header Modal - Clean Design */}
            <div style={{
              padding: '24px 32px',
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
                    gap: '12px',
                    marginBottom: '8px'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
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
                      fontSize: '20px',
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
                    fontSize: '14px',
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
                    borderRadius: '8px',
                    cursor: 'pointer',
                    padding: '8px',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    color: '#64748b',
                    backdropFilter: 'blur(8px)'
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
            <div style={{ padding: '32px', background: '#ffffff', flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Codice */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
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
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
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
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
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
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
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
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Forma Giuridica <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={newRagioneSociale.formaGiuridica}
                    onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, formaGiuridica: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#FF6900';
                      e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                      e.target.style.boxShadow = '0 4px 20px rgba(255, 105, 0, 0.2)';
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
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Partita IVA <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="IT12345678901"
                    value={newRagioneSociale.pIva}
                    onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, pIva: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      fontFamily: 'monospace',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#FF6900';
                      e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                      e.target.style.boxShadow = '0 4px 20px rgba(255, 105, 0, 0.2)';
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

                {/* Codice Fiscale */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
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
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      fontFamily: 'monospace',
                      textTransform: 'uppercase',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#FF6900';
                      e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                      e.target.style.boxShadow = '0 4px 20px rgba(255, 105, 0, 0.2)';
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
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
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
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
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
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
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
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
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
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
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
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
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
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
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
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
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
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Logo Aziendale 
                    <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '4px', cursor: 'help' }} 
                          title="File PNG, dimensioni consigliate: 300x150px, max 2MB">
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
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
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
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Codice SDI
                    <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '4px' }}>
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
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      fontFamily: 'monospace',
                      textTransform: 'uppercase',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#FF6900';
                      e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                      e.target.style.boxShadow = '0 4px 20px rgba(255, 105, 0, 0.2)';
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
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
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
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
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
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
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
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
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
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
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
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
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
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
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
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
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
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
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
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="info@azienda.it"
                    value={newRagioneSociale.email}
                    onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
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

                {/* PEC */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    PEC <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="azienda@pec.it"
                    value={newRagioneSociale.pec}
                    onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, pec: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
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

                {/* Stato */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Stato
                  </label>
                  <select
                    value={newRagioneSociale.stato}
                    onChange={(e) => setNewRagioneSociale({ ...newRagioneSociale, stato: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#fafbfc',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#FF6900';
                      e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                      e.target.style.boxShadow = '0 4px 20px rgba(255, 105, 0, 0.2)';
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
                <div style={{ gridColumn: 'span 2', marginTop: '24px' }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: '16px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid #e5e7eb',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Referente Amministrativo
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {/* Nome Referente */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px',
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
                          padding: '6px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px',
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
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px',
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
                          padding: '6px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px',
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
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px',
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
                          padding: '6px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px',
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
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px',
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
                          padding: '6px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: '#fafbfc',
                          transition: 'all 0.2s ease',
                          fontFamily: 'monospace',
                          textTransform: 'uppercase',
                          outline: 'none'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#FF6900';
                          e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                          e.target.style.boxShadow = '0 4px 20px rgba(255, 105, 0, 0.2)';
                        }}
                      />
                    </div>

                    {/* Indirizzo Referente - full width */}
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px',
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
                          padding: '6px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px',
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
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px',
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
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px',
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
                          padding: '6px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px',
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
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px',
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
                          padding: '6px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px',
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
                <div style={{ gridColumn: 'span 2', marginTop: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
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
                      padding: '8px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
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
                gap: '12px',
                marginTop: '32px',
                paddingTop: '20px',
                borderTop: '1px solid #e5e7eb'
              }}>
                <button
                  onClick={() => setLegalEntityModal({ open: false, data: null })}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    background: '#ffffff',
                    color: '#6b7280',
                    fontSize: '14px',
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
                    padding: '10px 24px',
                    background: '#FF6900',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                    boxShadow: '0 1px 3px 0 rgba(255, 105, 0, 0.3)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#e55a00';
                    e.currentTarget.style.boxShadow = '0 2px 6px 0 rgba(255, 105, 0, 0.4)';
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

      {/* Modal Punto Vendita */}
      {storeModal.open && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            borderTop: '3px solid transparent',
            borderImage: 'linear-gradient(90deg, #FF6900, #7B2CBF) 1',
            animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            {/* Header Modal - Clean Design */}
            <div style={{
              padding: '24px 32px',
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
                    gap: '12px',
                    marginBottom: '8px'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9 22V12h6v10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <h2 style={{
                      fontSize: '20px',
                      fontWeight: '600',
                      color: '#111827',
                      margin: 0,
                      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                      position: 'relative',
                      zIndex: 1,
                      textShadow: 'none'
                    }}>
                      {storeModal.data ? 'Modifica Punto Vendita' : 'Nuovo Punto Vendita'}
                    </h2>
                  </div>
                  <p style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    margin: 0,
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                    fontWeight: 500
                  }}>
                    {storeModal.data ? 'Modifica i dati del punto vendita' : 'Configura i dettagli del nuovo punto vendita'}
                  </p>
                </div>
                <button
                  onClick={() => setStoreModal({ open: false, data: null })}
                  style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    border: '1px solid rgba(226, 232, 240, 0.8)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    padding: '8px',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    color: '#64748b',
                    backdropFilter: 'blur(8px)'
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
            <div style={{ padding: '32px', background: '#ffffff', flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Codice */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Codice Punto Vendita
                  </label>
                  <input
                    type="text"
                    placeholder="9xxxxxxx (auto-generato, min. 7 cifre)"
                    value={newStore.code}
                    onChange={(e) => setNewStore({ ...newStore, code: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
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
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Nome Punto Vendita <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="es. WindTre Milano Centro"
                    value={newStore.nome}
                    onChange={(e) => setNewStore({ ...newStore, nome: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
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
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Ragione Sociale <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={newStore.legal_entity_id || ''}
                    onChange={(e) => setNewStore({ ...newStore, legal_entity_id: e.target.value || null })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
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
                    {ragioneSocialiList.filter(rs => rs.stato === 'Attiva').map(rs => (
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
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Canale <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={newStore.channel_id || ''}
                    onChange={(e) => setNewStore({ ...newStore, channel_id: e.target.value || null })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
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
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Area Commerciale <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={newStore.commercial_area_id || ''}
                    onChange={(e) => setNewStore({ ...newStore, commercial_area_id: e.target.value || null })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
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
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Stato <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={newStore.status}
                    onChange={(e) => setNewStore({ ...newStore, status: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
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

                {/* Brand - Multi-select */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Brand Gestiti <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      cursor: 'pointer',
                      padding: '6px 10px',
                      background: newStore.brands.includes('WindTre') ? 'rgba(255, 105, 0, 0.1)' : '#f8fafc',
                      borderRadius: '8px',
                      border: `2px solid ${newStore.brands.includes('WindTre') ? '#FF6900' : 'transparent'}`,
                      transition: 'all 0.2s ease'
                    }}>
                      <input
                        type="checkbox"
                        checked={newStore.brands.includes('WindTre')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewStore({ ...newStore, brands: [...newStore.brands, 'WindTre'] });
                          } else {
                            setNewStore({ ...newStore, brands: newStore.brands.filter(b => b !== 'WindTre') });
                          }
                        }}
                        style={{ 
                          width: '20px', 
                          height: '20px', 
                          cursor: 'pointer',
                          accentColor: '#FF6900'
                        }}
                      />
                      <span style={{ 
                        fontSize: '14px', 
                        color: newStore.brands.includes('WindTre') ? '#FF6900' : '#374151',
                        fontWeight: '600'
                      }}>
                        WindTre
                      </span>
                    </label>
                    
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      cursor: 'pointer',
                      padding: '6px 10px',
                      background: newStore.brands.includes('Very Mobile') ? 'rgba(16, 185, 129, 0.1)' : '#f8fafc',
                      borderRadius: '8px',
                      border: `2px solid ${newStore.brands.includes('Very Mobile') ? '#10b981' : 'transparent'}`,
                      transition: 'all 0.2s ease'
                    }}>
                      <input
                        type="checkbox"
                        checked={newStore.brands.includes('Very Mobile')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewStore({ ...newStore, brands: [...newStore.brands, 'Very Mobile'] });
                          } else {
                            setNewStore({ ...newStore, brands: newStore.brands.filter(b => b !== 'Very Mobile') });
                          }
                        }}
                        style={{ 
                          width: '20px', 
                          height: '20px', 
                          cursor: 'pointer',
                          accentColor: '#10b981'
                        }}
                      />
                      <span style={{ 
                        fontSize: '14px', 
                        color: newStore.brands.includes('Very Mobile') ? '#10b981' : '#374151',
                        fontWeight: '600'
                      }}>
                        Very Mobile
                      </span>
                    </label>
                  </div>
                </div>

                {/* Indirizzo - full width */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
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
                      padding: '6px 10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
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
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
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
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
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
                      padding: '6px 10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
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
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
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
                      padding: '6px 10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
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

                {/* 🗺️ Coordinate Geografiche */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  marginBottom: '24px'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '8px',
                      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                    }}>
                      🌐 Latitudine
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      placeholder="45.464211"
                      data-testid="input-latitude"
                      value={newStore.geo.lat || ''}
                      onChange={(e) => setNewStore({ ...newStore, geo: { ...newStore.geo, lat: e.target.value ? parseFloat(e.target.value) : null } })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        fontSize: '14px',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        background: '#ffffff',
                        color: '#374151',
                        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#FF6900';
                        e.target.style.boxShadow = '0 0 0 3px rgba(255, 105, 0, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '8px',
                      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                    }}>
                      🌐 Longitudine
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      placeholder="9.190347"
                      data-testid="input-longitude"
                      value={newStore.geo.lng || ''}
                      onChange={(e) => setNewStore({ ...newStore, geo: { ...newStore.geo, lng: e.target.value ? parseFloat(e.target.value) : null } })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        fontSize: '14px',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        background: '#ffffff',
                        color: '#374151',
                        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#FF6900';
                        e.target.style.boxShadow = '0 0 0 3px rgba(255, 105, 0, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                  <div style={{ 
                    gridColumn: '1 / -1',
                    fontSize: '12px',
                    color: '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '8px'
                  }}>
                    <span>💡</span>
                    <span>Puoi trovare le coordinate su <a href="https://www.google.com/maps" target="_blank" style={{ color: '#FF6900', textDecoration: 'underline' }}>Google Maps</a> cliccando destro sul punto vendita</span>
                  </div>
                </div>

                {/* 📱 Sezione Contatti/Social */}
                <div style={{ gridColumn: 'span 2', marginTop: '24px', marginBottom: '16px' }}>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: '#374151',
                    padding: '12px 16px',
                    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                    borderRadius: '8px',
                    border: '2px solid #e2e8f0',
                    textAlign: 'center',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}>
                    📱 Contatti/Social
                  </div>
                </div>

                {/* Telefono */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Telefono
                  </label>
                  <input
                    type="tel"
                    placeholder="+39 02 1234567"
                    value={newStore.phone}
                    onChange={(e) => setNewStore({ ...newStore, phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
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

                {/* Email */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="punto.vendita@windtre.it"
                    value={newStore.email}
                    onChange={(e) => setNewStore({ ...newStore, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
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

                {/* WhatsApp 1 */}
                <div>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    <span style={{ color: '#25D366', fontSize: '16px' }}>📱</span>
                    WhatsApp 1
                  </label>
                  <input
                    type="tel"
                    placeholder="+39 333 1234567"
                    value={newStore.whatsapp1}
                    onChange={(e) => setNewStore({ ...newStore, whatsapp1: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      background: '#fafbfc',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      outline: 'none',
                      color: '#1f2937'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#25D366';
                      e.target.style.boxShadow = '0 0 0 3px rgba(37, 211, 102, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* WhatsApp 2 */}
                <div>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    <span style={{ color: '#25D366', fontSize: '16px' }}>📱</span>
                    WhatsApp 2
                  </label>
                  <input
                    type="tel"
                    placeholder="+39 333 7654321"
                    value={newStore.whatsapp2}
                    onChange={(e) => setNewStore({ ...newStore, whatsapp2: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      background: '#fafbfc',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      outline: 'none',
                      color: '#1f2937'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#25D366';
                      e.target.style.boxShadow = '0 0 0 3px rgba(37, 211, 102, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Facebook */}
                <div>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    <span style={{ color: '#1877F2', fontSize: '16px' }}>👤</span>
                    Facebook
                  </label>
                  <input
                    type="url"
                    placeholder="facebook.com/windtrestore"
                    value={newStore.facebook}
                    onChange={(e) => setNewStore({ ...newStore, facebook: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      background: '#fafbfc',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      outline: 'none',
                      color: '#1f2937'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#1877F2';
                      e.target.style.boxShadow = '0 0 0 3px rgba(24, 119, 242, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Instagram */}
                <div>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    <span style={{ color: '#E4405F', fontSize: '16px' }}>📷</span>
                    Instagram
                  </label>
                  <input
                    type="url"
                    placeholder="instagram.com/windtrestore"
                    value={newStore.instagram}
                    onChange={(e) => setNewStore({ ...newStore, instagram: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      background: '#fafbfc',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      outline: 'none',
                      color: '#1f2937'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#E4405F';
                      e.target.style.boxShadow = '0 0 0 3px rgba(228, 64, 95, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* TikTok */}
                <div>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    <span style={{ color: '#FF0050', fontSize: '16px' }}>🎵</span>
                    TikTok
                  </label>
                  <input
                    type="url"
                    placeholder="tiktok.com/@windtrestore"
                    value={newStore.tiktok}
                    onChange={(e) => setNewStore({ ...newStore, tiktok: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      background: '#fafbfc',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      outline: 'none',
                      color: '#1f2937'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#FF0050';
                      e.target.style.boxShadow = '0 0 0 3px rgba(255, 0, 80, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Google Maps URL */}
                <div>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    <span style={{ color: '#4285F4', fontSize: '16px' }}>🗺️</span>
                    Google Maps
                  </label>
                  <input
                    type="url"
                    placeholder="https://maps.google.com/..."
                    value={newStore.google_maps_url}
                    onChange={(e) => setNewStore({ ...newStore, google_maps_url: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      background: '#fafbfc',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      outline: 'none',
                      color: '#1f2937'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#4285F4';
                      e.target.style.boxShadow = '0 0 0 3px rgba(66, 133, 244, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Telegram */}
                <div>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                  }}>
                    <span style={{ color: '#0088CC', fontSize: '16px' }}>✈️</span>
                    Telegram
                  </label>
                  <input
                    type="url"
                    placeholder="t.me/windtrestore"
                    value={newStore.telegram}
                    onChange={(e) => setNewStore({ ...newStore, telegram: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      background: '#fafbfc',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                      fontWeight: '400',
                      outline: 'none',
                      color: '#1f2937'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#0088CC';
                      e.target.style.boxShadow = '0 0 0 3px rgba(0, 136, 204, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Footer Modal */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                marginTop: '32px',
                paddingTop: '20px',
                borderTop: '1px solid #e5e7eb'
              }}>
                <button
                  onClick={() => setStoreModal({ open: false, data: null })}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    background: '#ffffff',
                    color: '#6b7280',
                    fontSize: '14px',
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
                    padding: '10px 24px',
                    background: '#FF6900',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                    boxShadow: '0 1px 3px 0 rgba(255, 105, 0, 0.3)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#e55a00';
                    e.currentTarget.style.boxShadow = '0 2px 6px 0 rgba(255, 105, 0, 0.4)';
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

      {/* Modal Nuovo Utente con Selezione Gerarchica */}
      {userModal.open && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
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
            borderRadius: '12px',
            width: '90%',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            borderTop: '3px solid transparent',
            borderImage: 'linear-gradient(90deg, #FF6900, #7B2CBF) 1',
            zIndex: 10001
          }}>
            {/* Header Modal - Clean Design */}
            <div style={{
              padding: '24px 32px',
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
                    gap: '12px',
                    marginBottom: '8px'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #FF6900, #7B2CBF)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 'none'
                    }}>
                      <User size={20} style={{ color: 'white' }} />
                    </div>
                    <h2 style={{
                      fontSize: '20px',
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
                    fontSize: '14px',
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
                    borderRadius: '8px',
                    width: '36px',
                    height: '36px',
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
            <div style={{ padding: '32px', background: '#ffffff', flex: 1, overflowY: 'auto' }}>

              {/* SEZIONE DATI DI ACCESSO */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '16px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Dati di Accesso
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {/* Username e Ruolo */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '8px'
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
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        background: '#fafafa',
                        transition: 'all 0.2s ease',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '8px'
                    }}>
                      Ruolo <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      value={newUser.ruolo}
                      onChange={(e) => setNewUser({ ...newUser, ruolo: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '14px',
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
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '8px'
                    }}>
                      Status <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      value={newUser.stato}
                      onChange={(e) => setNewUser({ ...newUser, stato: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '14px',
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
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '8px'
                    }}>
                      Password <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="password"
                      placeholder="Minimo 8 caratteri"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        background: '#fafafa',
                        transition: 'all 0.2s ease',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '8px'
                    }}>
                      Conferma Password <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="password"
                      placeholder="Ripeti password"
                      value={newUser.confirmPassword}
                      onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        background: '#fafafa',
                        transition: 'all 0.2s ease',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* SEZIONE INFORMAZIONI PERSONALI */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '16px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Informazioni Personali
                </h3>

                {/* Avatar Selector */}
                <div style={{ 
                  marginBottom: '24px', 
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
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '8px'
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
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        background: '#fafafa',
                        transition: 'all 0.2s ease',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '8px'
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
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        background: '#fafafa',
                        transition: 'all 0.2s ease',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '8px'
                    }}>
                      Email <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="mario.rossi@windtre.it"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        background: '#fafafa',
                        transition: 'all 0.2s ease',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '8px'
                    }}>
                      Telefono <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="+39 333 1234567"
                      value={newUser.telefono}
                      onChange={(e) => setNewUser({ ...newUser, telefono: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        background: '#fafafa',
                        transition: 'all 0.2s ease',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* ✅ NUOVO SISTEMA SCOPE PIRAMIDALE - ALLA FINE */}
              <div style={{ marginBottom: '28px' }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '16px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  🎯 Scope di Accesso Piramidale
                </h3>
                
                {/* 📋 PRIMO LIVELLO: Checkbox "Seleziona tutto ragioni sociali" */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px',
                    background: newUser.selectAllLegalEntities ? '#ecfdf5' : '#f9fafb',
                    border: `2px solid ${newUser.selectAllLegalEntities ? '#10b981' : '#e5e7eb'}`,
                    borderRadius: '12px',
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
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
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
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#111827',
                        marginBottom: '4px'
                      }}>
                        {newUser.selectAllLegalEntities ? '🌟 Accesso Completo Organizzazione' : 'Accesso Completo'}
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: '#6b7280'
                      }}>
                        {newUser.selectAllLegalEntities 
                          ? 'L\'utente ha accesso a tutte le ragioni sociali e punti vendita dell\'organizzazione'
                          : 'Seleziona per dare accesso a tutte le ragioni sociali (disabilita selezione specifica)'}
                      </div>
                    </div>
                    {newUser.selectAllLegalEntities && (
                      <div style={{
                        fontSize: '12px',
                        color: '#059669',
                        background: '#d1fae5',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontWeight: '600'
                      }}>
                        COMPLETO
                      </div>
                    )}
                  </label>
                </div>

                {/* 🏭 SECONDO LIVELLO: Multi-select ragioni sociali specifiche */}
                {!newUser.selectAllLegalEntities && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '12px'
                    }}>
                      📋 Seleziona Ragioni Sociali Specifiche <span style={{ color: '#ef4444' }}>*</span>
                      <span style={{ 
                        fontSize: '12px', 
                        fontWeight: '400', 
                        color: '#6b7280',
                        marginLeft: '8px'
                      }}>
                        (Primo livello - filtra i punti vendita)
                      </span>
                    </label>
                    <div style={{
                      maxHeight: '200px',
                      overflowY: 'auto',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '12px',
                      background: '#ffffff'
                    }}>
                      {ragioneSocialiList.filter(rs => rs.stato === 'Attiva').map(rs => (
                        <label key={rs.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px',
                          cursor: 'pointer',
                          borderRadius: '8px',
                          transition: 'all 0.2s ease',
                          background: newUser.selectedLegalEntities.includes(rs.id) ? '#e0f2fe' : 'transparent',
                          border: `1px solid ${newUser.selectedLegalEntities.includes(rs.id) ? '#0ea5e9' : 'transparent'}`,
                          marginBottom: '4px'
                        }}>
                          <input
                            type="checkbox"
                            checked={newUser.selectedLegalEntities.includes(rs.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewUser({
                                  ...newUser,
                                  selectedLegalEntities: [...newUser.selectedLegalEntities, rs.id],
                                  selectedStores: [] // Reset punti vendita quando cambiano ragioni sociali
                                });
                              } else {
                                setNewUser({
                                  ...newUser,
                                  selectedLegalEntities: newUser.selectedLegalEntities.filter(id => id !== rs.id),
                                  selectedStores: newUser.selectedStores.filter(storeId => {
                                    const store = puntiVenditaList.find(pv => pv.id === storeId);
                                    return store && store.ragioneSociale_id !== rs.id;
                                  })
                                });
                              }
                            }}
                            style={{ 
                              transform: 'scale(1.1)',
                              accentColor: '#0ea5e9'
                            }}
                          />
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {rs.nome ? rs.nome.charAt(0) : '?'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontSize: '14px',
                              fontWeight: '600',
                              color: '#111827',
                              marginBottom: '2px'
                            }}>
                              {rs.nome || 'Denominazione non disponibile'}
                            </div>
                            <div style={{
                              fontSize: '12px',
                              color: '#6b7280'
                            }}>
                              P.IVA: {rs.pIva || 'N/A'}
                            </div>
                          </div>
                          <div style={{
                            fontSize: '11px',
                            color: '#0369a1',
                            background: '#e0f2fe',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontWeight: '500'
                          }}>
                            {puntiVenditaList.filter(pv => pv.ragioneSociale_id === rs.id && (pv.status === 'active' || pv.status === 'Attivo')).length} negozi
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* 🏪 TERZO LIVELLO: Multi-select punti vendita filtrati */}
                {!newUser.selectAllLegalEntities && newUser.selectedLegalEntities.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '12px'
                    }}>
                      🏪 Seleziona Punti Vendita Specifici 
                      <span style={{ 
                        fontSize: '12px', 
                        fontWeight: '400', 
                        color: '#6b7280',
                        marginLeft: '8px'
                      }}>
                        ({puntiVenditaList.filter(pv => newUser.selectedLegalEntities.includes(pv.ragioneSociale_id) && (pv.status === 'active' || pv.status === 'Attivo')).length} disponibili dalle ragioni sociali selezionate)
                      </span>
                    </label>
                    <div style={{
                      maxHeight: '300px',
                      overflowY: 'auto',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '12px',
                      background: '#ffffff'
                    }}>
                      {puntiVenditaList
                        .filter(pv => newUser.selectedLegalEntities.includes(pv.ragioneSociale_id) && (pv.status === 'active' || pv.status === 'Attivo'))
                        .map(pv => (
                        <label key={pv.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px',
                          cursor: 'pointer',
                          borderRadius: '8px',
                          transition: 'all 0.2s ease',
                          background: newUser.selectedStores.includes(pv.id) ? '#fef3c7' : 'transparent',
                          border: `1px solid ${newUser.selectedStores.includes(pv.id) ? '#f59e0b' : 'transparent'}`,
                          marginBottom: '4px'
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
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #FF6900, #7B2CBF)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}>
                            {pv.code}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontSize: '14px',
                              fontWeight: '600',
                              color: '#111827',
                              marginBottom: '2px'
                            }}>
                              {pv.nome}
                            </div>
                            <div style={{
                              fontSize: '12px',
                              color: '#6b7280'
                            }}>
                              {pv.citta} • {ragioneSocialiList.find(rs => rs.id === pv.ragioneSociale_id)?.denominazione}
                            </div>
                          </div>
                          <div style={{
                            fontSize: '11px',
                            color: pv.status === 'active' ? '#059669' : '#dc2626',
                            background: pv.status === 'active' ? '#d1fae5' : '#fee2e2',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontWeight: '500'
                          }}>
                            {pv.status === 'active' ? 'Attivo' : 'Inattivo'}
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
                    borderRadius: '12px',
                    padding: '16px',
                    marginTop: '16px'
                  }}>
                    <p style={{
                      fontSize: '13px',
                      color: '#991b1b',
                      margin: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
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
                    borderRadius: '12px',
                    padding: '16px',
                    marginTop: '16px'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#0369a1',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <CheckCircle size={16} />
                      ✅ Riepilogo Accesso
                    </div>
                    {newUser.selectAllLegalEntities ? (
                      <p style={{
                        fontSize: '13px',
                        color: '#0369a1',
                        margin: 0
                      }}>
                        🌟 <strong>Accesso Completo:</strong> Tutte le ragioni sociali e punti vendita dell'organizzazione
                      </p>
                    ) : (
                      <div style={{
                        fontSize: '13px',
                        color: '#0369a1',
                        margin: 0
                      }}>
                        <p style={{ margin: '0 0 4px 0' }}>
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
                gap: '12px',
                marginTop: '24px',
                paddingTop: '20px',
                borderTop: '1px solid #e5e7eb'
              }}>
                <button
                  onClick={() => setUserModal({ open: false, data: null })}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    background: '#ffffff',
                    color: '#6b7280',
                    fontSize: '14px',
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
                    // Validazione base
                    if (!newUser.username || !newUser.password || !newUser.nome || !newUser.cognome || !newUser.email || !newUser.ruolo) {
                      alert('Compila tutti i campi obbligatori');
                      return;
                    }
                    
                    if (newUser.password !== newUser.confirmPassword) {
                      alert('Le password non corrispondono');
                      return;
                    }

                    // Validazione scope
                    if (newUser.scopeLevel === 'punti_vendita' && newUser.selectedLegalEntities.length === 0) {
                      alert('Seleziona almeno una ragione sociale');
                      return;
                    }
                    
                    // Aggiungi l'utente alla lista
                    const newUserEntry = {
                      id: utentiList.length + 1,
                      tenant_id: getCurrentTenantId(),
                      username: newUser.username,
                      nome: newUser.nome,
                      cognome: newUser.cognome,
                      email: newUser.email,
                      telefono: newUser.telefono,
                      ruolo: newUser.ruolo,
                      ambito: newUser.scopeLevel === 'organizzazione' ? 'Organizzazione' : 
                              newUser.scopeLevel === 'ragioni_sociali' ? 
                                (newUser.selectedStores.length > 0 ? 
                                  `${newUser.selectedLegalEntities.length} RS, ${newUser.selectedStores.length} PV` :
                                  `${newUser.selectedLegalEntities.length} Ragioni Sociali`) :
                              `${newUser.selectedStores.length} Punti Vendita`,
                      stato: newUser.stato,
                      ultimoAccesso: 'Mai',
                      createdAt: new Date().toISOString().split('T')[0]
                    };
                    
                    setUtentiList([...utentiList, newUserEntry]);
                    setUserModal({ open: false, data: null });
                  }}
                  style={{
                    padding: '10px 24px',
                    background: 'linear-gradient(135deg, #FF6900, #ff8533)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                    boxShadow: '0 4px 15px -3px rgba(255, 105, 0, 0.3)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #ff7a1f, #ff9547)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(255, 105, 0, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #FF6900, #ff8533)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px -3px rgba(255, 105, 0, 0.3)';
                  }}
                >
                  Salva Utente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuovo Fornitore Completo */}
      {supplierModal.open && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            width: '95%',
            maxWidth: '1200px',
            maxHeight: '95vh',
            overflow: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '32px'
            }}>
              <div>
                <h2 style={{
                  fontSize: '28px',
                  fontWeight: '700',
                  color: '#111827',
                  margin: '0 0 8px 0'
                }}>
                  {supplierModal.data ? 'Modifica Fornitore' : 'Nuovo Fornitore'}
                </h2>
                <p style={{
                  fontSize: '15px',
                  color: '#6b7280',
                  margin: 0
                }}>
                  {supplierModal.data ? 'Modifica i dati del fornitore' : 'Compila tutti i dettagli per configurare il nuovo fornitore'}
                </p>
              </div>
              <button
                onClick={() => setSupplierModal({ open: false, data: null })}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#f3f4f6';
                  e.currentTarget.style.color = '#111827';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#6b7280';
                }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Sezioni Organizzate */}
            <div style={{ display: 'grid', gap: '32px' }}>
              
              {/* SEZIONE 1: Anagrafica & Identificativi */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#111827',
                  margin: '0 0 20px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Building2 size={20} />
                  Anagrafica & Identificativi
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '16px'
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Codice Fornitore *
                    </label>
                    <input 
                      type="text" 
                      placeholder="es. FOR001"
                      value={newSupplier.code}
                      onChange={(e) => setNewSupplier({ ...newSupplier, code: e.target.value })}
                      style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Nome/Ragione Sociale *
                    </label>
                    <input 
                      type="text" 
                      placeholder="es. Acme Suppliers SpA"
                      value={newSupplier.name}
                      onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                      style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Forma Giuridica
                    </label>
                    <select 
                      value={newSupplier.legalForm}
                      onChange={(e) => setNewSupplier({ ...newSupplier, legalForm: e.target.value })}
                      style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', background: 'white' }}
                    >
                      <option value="">Seleziona...</option>
                      {legalForms.map((form: any) => (
                        <option key={form.id} value={form.code}>
                          {form.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Partita IVA
                    </label>
                    <input 
                      type="text" 
                      placeholder="es. IT12345678901"
                      value={newSupplier.vatNumber}
                      onChange={(e) => setNewSupplier({ ...newSupplier, vatNumber: e.target.value })}
                      style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Codice Fiscale
                    </label>
                    <input 
                      type="text" 
                      placeholder="es. ACMSPP95L01H501Z"
                      value={newSupplier.taxCode}
                      onChange={(e) => setNewSupplier({ ...newSupplier, taxCode: e.target.value })}
                      style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Categoria Merceologica
                    </label>
                    <select style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', background: 'white' }}>
                      <option value="">Seleziona...</option>
                      <option value="ELETTRONICA">Elettronica</option>
                      <option value="ABBIGLIAMENTO">Abbigliamento</option>
                      <option value="ALIMENTARE">Alimentare</option>
                      <option value="SERVIZI">Servizi</option>
                      <option value="LOGISTICA">Logistica</option>
                      <option value="CONSULENZA">Consulenza</option>
                      <option value="ALTRO">Altro</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Codice ERP/Esterno
                    </label>
                    <input type="text" placeholder="Codice nel sistema ERP"
                      style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Stato *
                    </label>
                    <select 
                      value={newSupplier.status}
                      onChange={(e) => setNewSupplier({ ...newSupplier, status: e.target.value })}
                      style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', background: 'white' }}
                    >
                      <option value="active">Attivo</option>
                      <option value="suspended">Sospeso</option>
                      <option value="archived">Archiviato</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SEZIONE 2: Indirizzi */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#111827',
                  margin: '0 0 20px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <MapPin size={20} />
                  Indirizzi
                </h3>
                
                {/* Sede Legale */}
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '16px' }}>Sede Legale</h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px'
                  }}>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                        Via e Civico *
                      </label>
                      <input 
                        type="text" 
                        placeholder="es. Via Roma, 123"
                        value={newSupplier.address}
                        onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                        style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} 
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                        CAP *
                      </label>
                      <input 
                        type="text" 
                        placeholder="20100"
                        value={newSupplier.postalCode}
                        onChange={(e) => setNewSupplier({ ...newSupplier, postalCode: e.target.value })}
                        readOnly={italianCities.length > 0}
                        style={{ 
                          width: '100%', 
                          padding: '12px', 
                          border: '1px solid #d1d5db', 
                          borderRadius: '8px', 
                          fontSize: '14px',
                          background: italianCities.length > 0 ? '#f9fafb' : 'white',
                          cursor: italianCities.length > 0 ? 'not-allowed' : 'text'
                        }} 
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                        Città *
                      </label>
                      <StandardCityField
                        value={newSupplier.city}
                        onChange={(cityName) => setNewSupplier({ ...newSupplier, city: cityName })}
                        onCapChange={(cap) => setNewSupplier(prev => ({ ...prev, postalCode: cap }))}
                        onProvinciaChange={(provincia) => setNewSupplier(prev => ({ ...prev, province: provincia }))}
                        required={true}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                        Provincia *
                      </label>
                      <input 
                        type="text" 
                        placeholder="MI"
                        value={newSupplier.province}
                        onChange={(e) => setNewSupplier({ ...newSupplier, province: e.target.value.toUpperCase() })}
                        readOnly={italianCities.length > 0}
                        style={{ 
                          width: '100%', 
                          padding: '12px', 
                          border: '1px solid #d1d5db', 
                          borderRadius: '8px', 
                          fontSize: '14px',
                          background: italianCities.length > 0 ? '#f9fafb' : 'white',
                          cursor: italianCities.length > 0 ? 'not-allowed' : 'text',
                          textTransform: 'uppercase'
                        }} 
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                        Nazione *
                      </label>
                      <select 
                        value={newSupplier.country}
                        onChange={(e) => setNewSupplier({ ...newSupplier, country: e.target.value })}
                        style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', background: 'white' }}
                      >
                        <option value="">Seleziona paese...</option>
                        {(countries as any[])?.map((country: any) => (
                          <option key={country.id} value={country.code}>
                            {country.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Sede Operativa */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', margin: 0 }}>Sede Operativa/Spedizioni</h4>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#6b7280' }}>
                      <input type="checkbox" style={{ margin: 0 }} />
                      Uguale alla sede legale
                    </label>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px'
                  }}>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                        Via e Civico
                      </label>
                      <input type="text" placeholder="es. Via Industria, 45"
                        style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                        CAP
                      </label>
                      <input type="text" placeholder="20151"
                        style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                        Città
                      </label>
                      <input type="text" placeholder="Milano"
                        style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                        Note Consegna
                      </label>
                      <input type="text" placeholder="Specificare reparto/piano"
                        style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* SEZIONE 3: Contatti */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#111827',
                  margin: '0 0 20px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Phone size={20} />
                  Contatti & Comunicazione
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '16px',
                  marginBottom: '24px'
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Email Principale *
                    </label>
                    <input 
                      type="email" 
                      placeholder="info@fornitore.it"
                      value={newSupplier.email}
                      onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                      style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      PEC (Fatturazione Elettronica)
                    </label>
                    <input 
                      type="email" 
                      placeholder="fatture@pec.fornitore.it"
                      value={newSupplier.pecEmail}
                      onChange={(e) => setNewSupplier({ ...newSupplier, pecEmail: e.target.value })}
                      style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Codice SDI
                    </label>
                    <input 
                      type="text" 
                      placeholder="es. ABCDEFG"
                      value={newSupplier.sdiCode}
                      onChange={(e) => setNewSupplier({ ...newSupplier, sdiCode: e.target.value })}
                      style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Telefono Fisso
                    </label>
                    <input 
                      type="tel" 
                      placeholder="+39 02 12345678"
                      value={newSupplier.phone}
                      onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                      style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Cellulare
                    </label>
                    <input type="tel" placeholder="+39 334 1234567"
                      style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Sito Web
                    </label>
                    <input 
                      type="url" 
                      placeholder="https://www.fornitore.it"
                      value={newSupplier.website}
                      onChange={(e) => setNewSupplier({ ...newSupplier, website: e.target.value })}
                      style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} 
                    />
                  </div>
                </div>

                {/* Referenti */}
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '16px' }}>Referenti</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                  <div style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                    <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#FF6900', marginBottom: '12px' }}>Referente Commerciale</h5>
                    <div style={{ display: 'grid', gap: '12px' }}>
                      <input type="text" placeholder="Nome e Cognome"
                        style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
                      <input type="email" placeholder="Email"
                        style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
                      <input type="tel" placeholder="Telefono"
                        style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
                    </div>
                  </div>
                  <div style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                    <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#7B2CBF', marginBottom: '12px' }}>Referente Amministrativo</h5>
                    <div style={{ display: 'grid', gap: '12px' }}>
                      <input type="text" placeholder="Nome e Cognome"
                        style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
                      <input type="email" placeholder="Email"
                        style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
                      <input type="tel" placeholder="Telefono"
                        style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
                    </div>
                  </div>
                  <div style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                    <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#10b981', marginBottom: '12px' }}>Referente Logistico</h5>
                    <div style={{ display: 'grid', gap: '12px' }}>
                      <input type="text" placeholder="Nome e Cognome"
                        style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
                      <input type="email" placeholder="Email"
                        style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
                      <input type="tel" placeholder="Telefono"
                        style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* SEZIONE 4: Fatturazione & Pagamenti */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#111827',
                  margin: '0 0 20px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <CreditCard size={20} />
                  Fatturazione & Pagamenti
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '16px'
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Condizioni di Pagamento
                    </label>
                    <select style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', background: 'white' }}>
                      <option value="">Seleziona...</option>
                      <option value="30GG">30 giorni</option>
                      <option value="60GG">60 giorni</option>
                      <option value="90GG">90 giorni</option>
                      <option value="FM">Fine mese</option>
                      <option value="ANTICIPO">Anticipo</option>
                      <option value="PERSONALIZZATO">Personalizzato</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Metodo di Pagamento
                    </label>
                    <select 
                      value={newSupplier.preferredPaymentMethodId}
                      onChange={(e) => setNewSupplier({ ...newSupplier, preferredPaymentMethodId: e.target.value })}
                      style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', background: 'white' }}
                    >
                      <option value="">Seleziona...</option>
                      {(paymentMethods as any[])?.map((method: any) => (
                        <option key={method.id} value={method.id}>
                          {method.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      IBAN
                    </label>
                    <input 
                      type="text" 
                      placeholder="IT60 X054 2811 1010 0000 0123 456"
                      value={newSupplier.iban}
                      onChange={(e) => setNewSupplier({ ...newSupplier, iban: e.target.value })}
                      style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      BIC/SWIFT
                    </label>
                    <input 
                      type="text" 
                      placeholder="BCITITMM"
                      value={newSupplier.bic}
                      onChange={(e) => setNewSupplier({ ...newSupplier, bic: e.target.value })}
                      style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Listino Associato
                    </label>
                    <select style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', background: 'white' }}>
                      <option value="">Seleziona...</option>
                      <option value="STANDARD">Listino Standard</option>
                      <option value="PREMIUM">Listino Premium</option>
                      <option value="VOLUME">Listino Volume</option>
                      <option value="PERSONALIZZATO">Personalizzato</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Sconto Base (%)
                    </label>
                    <input type="number" placeholder="0" min="0" max="100" step="0.01"
                      style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} />
                  </div>
                </div>

                {/* Flags fiscali */}
                <div style={{ marginTop: '20px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>Regime Fiscale</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                      <input 
                        type="checkbox" 
                        checked={newSupplier.splitPayment}
                        onChange={(e) => setNewSupplier({ ...newSupplier, splitPayment: e.target.checked })}
                      />
                      Split Payment
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                      <input 
                        type="checkbox" 
                        checked={newSupplier.withholdingTax}
                        onChange={(e) => setNewSupplier({ ...newSupplier, withholdingTax: e.target.checked })}
                      />
                      Ritenuta d'Acconto
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                      <input type="checkbox" />
                      Cassa Previdenziale
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                      <input type="checkbox" />
                      Reverse Charge
                    </label>
                  </div>
                </div>
              </div>

              {/* SEZIONE 5: Logistica */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#111827',
                  margin: '0 0 20px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Truck size={20} />
                  Logistica & Consegne
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '16px'
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Corriere Preferito
                    </label>
                    <select style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', background: 'white' }}>
                      <option value="">Seleziona...</option>
                      <option value="DHL">DHL</option>
                      <option value="UPS">UPS</option>
                      <option value="FEDEX">FedEx</option>
                      <option value="BRT">BRT</option>
                      <option value="SDA">SDA</option>
                      <option value="TNT">TNT</option>
                      <option value="ALTRO">Altro</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Incoterm
                    </label>
                    <select style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', background: 'white' }}>
                      <option value="">Seleziona...</option>
                      <option value="EXW">EXW - Ex Works</option>
                      <option value="FCA">FCA - Free Carrier</option>
                      <option value="CPT">CPT - Carriage Paid To</option>
                      <option value="CIP">CIP - Carriage Insurance Paid</option>
                      <option value="DDP">DDP - Delivered Duty Paid</option>
                      <option value="DDU">DDU - Delivered Duty Unpaid</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Lead Time (giorni)
                    </label>
                    <input type="number" placeholder="7" min="0"
                      style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Orari Consegna
                    </label>
                    <input type="text" placeholder="Lun-Ven 9:00-17:00"
                      style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} />
                  </div>
                </div>
              </div>

              {/* SEZIONE 6: Note & Valutazione */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#111827',
                  margin: '0 0 20px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <FileText size={20} />
                  Note & Valutazione
                </h3>
                <div style={{ display: 'grid', gap: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                        Rating Qualità (1-5)
                      </label>
                      <select style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', background: 'white' }}>
                        <option value="">Non valutato</option>
                        <option value="5">⭐⭐⭐⭐⭐ Eccellente</option>
                        <option value="4">⭐⭐⭐⭐ Buono</option>
                        <option value="3">⭐⭐⭐ Sufficiente</option>
                        <option value="2">⭐⭐ Scarso</option>
                        <option value="1">⭐ Pessimo</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                        Livello Rischio
                      </label>
                      <select style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', background: 'white' }}>
                        <option value="BASSO">🟢 Basso</option>
                        <option value="MEDIO">🟡 Medio</option>
                        <option value="ALTO">🔴 Alto</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                        Owner/Assegnatario
                      </label>
                      <select style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', background: 'white' }}>
                        <option value="">Seleziona...</option>
                        <option value="mario.rossi">Mario Rossi</option>
                        <option value="anna.verdi">Anna Verdi</option>
                        <option value="luca.bianchi">Luca Bianchi</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Note Interne
                    </label>
                    <textarea 
                      placeholder="Note riservate per uso interno..."
                      rows={4}
                      style={{ 
                        width: '100%', 
                        padding: '12px', 
                        border: '1px solid #d1d5db', 
                        borderRadius: '8px', 
                        fontSize: '14px',
                        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                        resize: 'vertical'
                      }} 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '32px',
              paddingTop: '24px',
              borderTop: '2px solid #e5e7eb'
            }}>
              <button
                onClick={() => setSupplierModal({ open: false, data: null })}
                style={{
                  padding: '12px 24px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  background: '#ffffff',
                  color: '#6b7280',
                  fontSize: '14px',
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
                  // TODO: Implementare salvataggio fornitore completo
                  console.log('Salvando fornitore completo...');
                  alert('Salvataggio fornitore completo - Funzionalità in fase di implementazione');
                  setSupplierModal({ open: false, data: null });
                }}
                style={{
                  padding: '12px 32px',
                  background: 'linear-gradient(135deg, #FF6900, #ff8533)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                  boxShadow: '0 4px 15px -3px rgba(255, 105, 0, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #ff7a1f, #ff9547)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(255, 105, 0, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #FF6900, #ff8533)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px -3px rgba(255, 105, 0, 0.3)';
                }}
              >
                Salva Fornitore
              </button>
            </div>
          </div>
        </div>
      )}

      <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
        {/* Header - Direttamente sullo sfondo */}
        <div style={{
          marginBottom: '24px'
        }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#111827',
            margin: '0 0 8px 0'
          }}>
            Configurazioni Sistema
          </h1>
          <p style={{
            fontSize: '15px',
            color: '#6b7280',
            margin: 0
          }}>
            Gestisci AI, canali di comunicazione, backup e configurazioni sistema
          </p>
        </div>

        {/* Tabs Container */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{
            display: 'flex',
            background: 'rgba(243, 244, 246, 0.5)',
            borderRadius: '12px',
            padding: '4px',
            gap: '4px'
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
                    borderRadius: '12px',
                    padding: '14px 20px',
                    fontSize: '14px',
                    fontWeight: isActive ? '600' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isActive 
                      ? '0 4px 16px rgba(255, 105, 0, 0.3)' 
                      : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    textAlign: 'center',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)'
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

        {/* Content Area - Direttamente sullo sfondo */}
        <div>
          {renderContent()}
        </div>
      </Layout>
    </>
  );
}