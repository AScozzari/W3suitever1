import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useBrandTenant } from '../contexts/BrandTenantContext';
import { useBrandAuth } from '../contexts/BrandAuthContext';
import { apiRequest } from '../lib/queryClient';
import { X, Store, Globe, Plus, MapPin, Phone, Mail, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

// ==================== VALIDATION SCHEMA ====================
const storeSchema = z.object({
  tenantSlug: z.string().min(1, 'Seleziona un tenant di destinazione'),
  code: z.string().min(7, 'Codice deve avere almeno 7 caratteri').max(20, 'Codice troppo lungo'),
  nome: z.string().min(2, 'Nome richiesto').max(255, 'Nome troppo lungo'),
  legalEntityId: z.string().min(1, 'Seleziona ragione sociale'),
  channelId: z.string().min(1, 'Seleziona canale'),
  commercialAreaId: z.string().min(1, 'Seleziona area commerciale'),
  address: z.string().min(5, 'Indirizzo richiesto'),
  citta: z.string().min(2, 'Città richiesta'),
  provincia: z.string().length(2, 'Provincia deve essere di 2 caratteri'),
  cap: z.string().regex(/^\d{5}$/, 'CAP deve essere di 5 cifre'),
  region: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  whatsapp1: z.string().optional(),
  whatsapp2: z.string().optional(),
  facebook: z.string().optional(),
  instagram: z.string().optional(),
  tiktok: z.string().optional(),
  google_maps_url: z.string().url().optional().or(z.literal('')),
  telegram: z.string().optional(),
  geo: z.object({
    lat: z.number().nullable().optional(),
    lng: z.number().nullable().optional()
  }).optional(),
  brands: z.array(z.string()).optional(),
  status: z.enum(['active', 'inactive', 'pending']).default('active'),
  opened_at: z.string().nullable().optional(),
  closed_at: z.string().nullable().optional()
});

type StoreFormData = z.infer<typeof storeSchema>;

// ==================== REFERENCE DATA TYPES ====================
interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
}

interface LegalEntity {
  id: string;
  nome: string;
  codice: string;
  pIva?: string;
}

interface Channel {
  id: string;
  name: string;
  code: string;
}

interface CommercialArea {
  id: string;
  name: string;
  code: string;
}

interface Brand {
  id: string;
  name: string;
  code: string;
}

// ==================== API RESPONSE TYPES ====================
interface LegalEntitiesResponse {
  legalEntities: LegalEntity[];
}

interface ChannelsResponse {
  channels: Channel[];
}

interface CommercialAreasResponse {
  commercialAreas: CommercialArea[];
}

interface BrandsResponse {
  brands: Brand[];
}

// ==================== PROPS ====================
interface CrossTenantStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// ==================== COMPONENT ====================
export default function CrossTenantStoreModal({ isOpen, onClose, onSuccess }: CrossTenantStoreModalProps) {
  const queryClient = useQueryClient();
  const { user } = useBrandAuth();
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  
  // ==================== FORM SETUP ====================
  const form = useForm<StoreFormData>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      tenantSlug: '',
      code: '',
      nome: '',
      legalEntityId: '',
      channelId: '',
      commercialAreaId: '',
      address: '',
      citta: '',
      provincia: '',
      cap: '',
      region: '',
      phone: '',
      email: '',
      whatsapp1: '',
      whatsapp2: '',
      facebook: '',
      instagram: '',
      tiktok: '',
      google_maps_url: '',
      telegram: '',
      geo: { lat: null, lng: null },
      brands: [],
      status: 'active',
      opened_at: null,
      closed_at: null
    }
  });

  // ==================== DATA FETCHING ====================
  // Fetch available tenants - using secure Brand API endpoint
  const { data: tenants = [], isLoading: tenantsLoading, error: tenantsError } = useQuery<Tenant[]>({
    queryKey: ['/brand-api/cross-tenant/tenants'],
    enabled: isOpen,
    retry: 2,
    retryDelay: 1000
  });

  // Fetch reference data for selected tenant - using secure Brand API endpoints
  const selectedTenant = tenants.find(t => t.id === selectedTenantId);
  const selectedTenantSlug = selectedTenant?.slug;

  const { data: legalEntitiesResponse = null, isLoading: legalEntitiesLoading, error: legalEntitiesError } = useQuery<LegalEntitiesResponse>({
    queryKey: ['/brand-api/cross-tenant/legal-entities', selectedTenantSlug],
    enabled: !!selectedTenantSlug,
    retry: 1,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  const { data: channelsResponse = null, isLoading: channelsLoading, error: channelsError } = useQuery<ChannelsResponse>({
    queryKey: ['/brand-api/cross-tenant/channels', selectedTenantSlug],
    enabled: !!selectedTenantSlug,
    retry: 1,
    staleTime: 5 * 60 * 1000
  });

  const { data: commercialAreasResponse = null, isLoading: commercialAreasLoading, error: commercialAreasError } = useQuery<CommercialAreasResponse>({
    queryKey: ['/brand-api/cross-tenant/commercial-areas', selectedTenantSlug],
    enabled: !!selectedTenantSlug,
    retry: 1,
    staleTime: 5 * 60 * 1000
  });

  const { data: brandsResponse = null, isLoading: brandsLoading, error: brandsError } = useQuery<BrandsResponse>({
    queryKey: ['/brand-api/cross-tenant/brands', selectedTenantSlug],
    enabled: !!selectedTenantSlug,
    retry: 1,
    staleTime: 5 * 60 * 1000
  });

  // Extract data from responses
  const legalEntities = legalEntitiesResponse?.legalEntities || [];
  const channels = channelsResponse?.channels || [];
  const commercialAreas = commercialAreasResponse?.commercialAreas || [];
  const brands = brandsResponse?.brands || [];

  // ==================== MUTATION ====================
  const createStoreMutation = useMutation({
    mutationFn: async (data: StoreFormData) => {
      return apiRequest(`/brand-api/cross-tenant/stores`, {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          createdBy: user?.id || 'brand-interface'
        })
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/stores'] });
      queryClient.invalidateQueries({ queryKey: ['/brand-api/cross-tenant'] });
      
      console.log('✅ Store created successfully:', data);
      
      if (onSuccess) onSuccess();
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      console.error('❌ Store creation failed:', error);
      alert(`Errore creazione punto vendita: ${error?.message || 'Errore sconosciuto'}`);
    }
  });

  // ==================== EFFECTS ====================
  useEffect(() => {
    if (selectedTenantId && selectedTenant) {
      form.setValue('tenantSlug', selectedTenant.slug);
    }
  }, [selectedTenantId, selectedTenant, form]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setSelectedTenantId('');
    }
  }, [isOpen, form]);

  // ==================== HANDLERS ====================
  const handleSubmit = (data: StoreFormData) => {
    createStoreMutation.mutate(data);
  };

  const handleTenantChange = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    const tenant = tenants.find(t => t.id === tenantId);
    if (tenant) {
      form.setValue('tenantSlug', tenant.slug);
    }
    // Reset dependent fields when tenant changes
    form.setValue('legalEntityId', '');
    form.setValue('channelId', '');
    form.setValue('commercialAreaId', '');
    form.setValue('brands', []);
  };

  if (!isOpen) return null;

  // ==================== RENDER ====================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] mx-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-orange-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Crea Punto Vendita Cross-Tenant</h2>
                <p className="text-white/80 text-sm">
                  Gestione centralizzata punti vendita su tenant remoti
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              data-testid="button-close-modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Tenant Selection */}
            <div className="bg-gradient-to-r from-violet-50 to-orange-50 p-4 rounded-xl border border-violet-100">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-5 h-5 text-violet-600" />
                <h3 className="font-semibold text-violet-800">Selezione Tenant di Destinazione</h3>
              </div>
              <select
                value={selectedTenantId}
                onChange={(e) => handleTenantChange(e.target.value)}
                disabled={tenantsLoading}
                className="w-full p-3 bg-white/80 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all disabled:opacity-50"
                data-testid="select-tenant"
              >
                <option value="">
                  {tenantsLoading ? 'Caricamento tenant...' : 
                   tenantsError ? 'Errore caricamento tenant' : 
                   'Seleziona tenant di destinazione...'}
                </option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name} ({tenant.slug})
                  </option>
                ))}
              </select>
              {form.formState.errors.tenantSlug && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {form.formState.errors.tenantSlug.message}
                </p>
              )}
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Codice Punto Vendita <span className="text-red-500">*</span>
                </label>
                <input
                  {...form.register('code')}
                  type="text"
                  placeholder="9xxxxxxx (min. 7 cifre)"
                  className="w-full p-3 bg-white/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  data-testid="input-code"
                />
                {form.formState.errors.code && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.code.message}</p>
                )}
              </div>

              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Punto Vendita <span className="text-red-500">*</span>
                </label>
                <input
                  {...form.register('nome')}
                  type="text"
                  placeholder="Nome del punto vendita"
                  className="w-full p-3 bg-white/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  data-testid="input-nome"
                />
                {form.formState.errors.nome && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.nome.message}</p>
                )}
              </div>

              {/* Legal Entity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ragione Sociale <span className="text-red-500">*</span>
                </label>
                <select
                  {...form.register('legalEntityId')}
                  disabled={!selectedTenantId || legalEntitiesLoading}
                  className="w-full p-3 bg-white/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all disabled:opacity-50"
                  data-testid="select-legal-entity"
                >
                  <option value="">
                    {legalEntitiesLoading ? 'Caricamento...' : 
                     legalEntitiesError ? 'Errore caricamento' :
                     'Seleziona ragione sociale...'}
                  </option>
                  {legalEntities.map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {entity.nome} ({entity.codice})
                    </option>
                  ))}
                </select>
                {form.formState.errors.legalEntityId && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.legalEntityId.message}</p>
                )}
              </div>

              {/* Channel */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Canale <span className="text-red-500">*</span>
                </label>
                <select
                  {...form.register('channelId')}
                  disabled={!selectedTenantId || channelsLoading}
                  className="w-full p-3 bg-white/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all disabled:opacity-50"
                  data-testid="select-channel"
                >
                  <option value="">
                    {channelsLoading ? 'Caricamento...' : 
                     channelsError ? 'Errore caricamento' :
                     'Seleziona canale...'}
                  </option>
                  {channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      {channel.name} ({channel.code})
                    </option>
                  ))}
                </select>
                {form.formState.errors.channelId && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.channelId.message}</p>
                )}
              </div>

              {/* Commercial Area */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Area Commerciale <span className="text-red-500">*</span>
                </label>
                <select
                  {...form.register('commercialAreaId')}
                  disabled={!selectedTenantId || commercialAreasLoading}
                  className="w-full p-3 bg-white/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all disabled:opacity-50"
                  data-testid="select-commercial-area"
                >
                  <option value="">
                    {commercialAreasLoading ? 'Caricamento...' : 
                     commercialAreasError ? 'Errore caricamento' :
                     'Seleziona area commerciale...'}
                  </option>
                  {commercialAreas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name} ({area.code})
                    </option>
                  ))}
                </select>
                {form.formState.errors.commercialAreaId && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.commercialAreaId.message}</p>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stato
                </label>
                <select
                  {...form.register('status')}
                  className="w-full p-3 bg-white/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  data-testid="select-status"
                >
                  <option value="active">Attivo</option>
                  <option value="inactive">Inattivo</option>
                  <option value="pending">In preparazione</option>
                </select>
              </div>
            </div>

            {/* Address Information */}
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-800">Informazioni Indirizzo</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Indirizzo <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...form.register('address')}
                    type="text"
                    placeholder="Via, numero civico"
                    className="w-full p-3 bg-white/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    data-testid="input-address"
                  />
                  {form.formState.errors.address && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.address.message}</p>
                  )}
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Città <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...form.register('citta')}
                    type="text"
                    placeholder="Nome città"
                    className="w-full p-3 bg-white/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    data-testid="input-citta"
                  />
                  {form.formState.errors.citta && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.citta.message}</p>
                  )}
                </div>

                {/* Province */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Provincia <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...form.register('provincia')}
                    type="text"
                    placeholder="MI, RM, NA..."
                    maxLength={2}
                    className="w-full p-3 bg-white/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    data-testid="input-provincia"
                  />
                  {form.formState.errors.provincia && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.provincia.message}</p>
                  )}
                </div>

                {/* CAP */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CAP <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...form.register('cap')}
                    type="text"
                    placeholder="12345"
                    maxLength={5}
                    className="w-full p-3 bg-white/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    data-testid="input-cap"
                  />
                  {form.formState.errors.cap && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.cap.message}</p>
                  )}
                </div>

                {/* Region */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Regione
                  </label>
                  <input
                    {...form.register('region')}
                    type="text"
                    placeholder="Lombardia, Lazio..."
                    className="w-full p-3 bg-white/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    data-testid="input-region"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-green-50 p-4 rounded-xl border border-green-100">
              <div className="flex items-center gap-2 mb-3">
                <Phone className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-green-800">Informazioni di Contatto</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefono
                  </label>
                  <input
                    {...form.register('phone')}
                    type="tel"
                    placeholder="+39 123 456 7890"
                    className="w-full p-3 bg-white/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    data-testid="input-phone"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    {...form.register('email')}
                    type="email"
                    placeholder="store@example.com"
                    className="w-full p-3 bg-white/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    data-testid="input-email"
                  />
                  {form.formState.errors.email && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.email.message}</p>
                  )}
                </div>

                {/* WhatsApp 1 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    WhatsApp 1
                  </label>
                  <input
                    {...form.register('whatsapp1')}
                    type="tel"
                    placeholder="+39 123 456 7890"
                    className="w-full p-3 bg-white/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    data-testid="input-whatsapp1"
                  />
                </div>

                {/* WhatsApp 2 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    WhatsApp 2
                  </label>
                  <input
                    {...form.register('whatsapp2')}
                    type="tel"
                    placeholder="+39 123 456 7890"
                    className="w-full p-3 bg-white/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    data-testid="input-whatsapp2"
                  />
                </div>
              </div>
            </div>

            {/* Social Media */}
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
              <h3 className="font-semibold text-purple-800 mb-3">Social Media & Web</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Facebook */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Facebook
                  </label>
                  <input
                    {...form.register('facebook')}
                    type="url"
                    placeholder="https://facebook.com/..."
                    className="w-full p-3 bg-white/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    data-testid="input-facebook"
                  />
                </div>

                {/* Instagram */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instagram
                  </label>
                  <input
                    {...form.register('instagram')}
                    type="url"
                    placeholder="https://instagram.com/..."
                    className="w-full p-3 bg-white/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    data-testid="input-instagram"
                  />
                </div>

                {/* TikTok */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    TikTok
                  </label>
                  <input
                    {...form.register('tiktok')}
                    type="url"
                    placeholder="https://tiktok.com/..."
                    className="w-full p-3 bg-white/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    data-testid="input-tiktok"
                  />
                </div>

                {/* Telegram */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telegram
                  </label>
                  <input
                    {...form.register('telegram')}
                    type="url"
                    placeholder="https://t.me/..."
                    className="w-full p-3 bg-white/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    data-testid="input-telegram"
                  />
                </div>

                {/* Google Maps URL */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Google Maps URL
                  </label>
                  <input
                    {...form.register('google_maps_url')}
                    type="url"
                    placeholder="https://maps.google.com/..."
                    className="w-full p-3 bg-white/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    data-testid="input-google-maps"
                  />
                  {form.formState.errors.google_maps_url && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.google_maps_url.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={createStoreMutation.isPending}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                data-testid="button-cancel"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={createStoreMutation.isPending || !selectedTenantId}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-violet-600 to-orange-500 text-white rounded-lg hover:from-violet-700 hover:to-orange-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="button-submit"
              >
                {createStoreMutation.isPending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creazione in corso...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Crea Punto Vendita
                  </>
                )}
              </button>
            </div>

            {/* Error Display */}
            {createStoreMutation.isError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <span>Errore durante la creazione del punto vendita. Riprova.</span>
              </div>
            )}

            {/* Success Display */}
            {createStoreMutation.isSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                <span>Punto vendita creato con successo!</span>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}