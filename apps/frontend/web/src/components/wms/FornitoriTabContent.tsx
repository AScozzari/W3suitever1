import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/ApiService';
import { queryClient } from '@/lib/queryClient';
import { supplierValidationSchema, type SupplierValidation } from '@/lib/validation/italian-business-validation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus, Building2, Eye, Trash2, RefreshCw, AlertCircle, X, MapPin, Phone, CreditCard, Truck, Mail, FileText,
  Search, CalendarIcon, Filter, Wand2, CheckCircle2, XCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { StandardCityField } from '../Leave/forms/StandardFields';

const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';

export default function FornitoriTabContent() {
  // Modal state
  const [supplierModal, setSupplierModal] = useState<{ open: boolean; data: any }>({ open: false, data: null });
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  // Form state with all SupplierValidation fields
  const [newSupplier, setNewSupplier] = useState<SupplierValidation>({
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
    // SEPARATE PAYMENT FIELDS
    preferredPaymentMethodId: '',
    paymentConditionId: '',
    // NOTE
    notes: ''
  });

  // TanStack Query for suppliers
  const { data: suppliersList = [], isLoading: suppliersLoading, error: suppliersError, isError: suppliersIsError, refetch: refetchSuppliersQuery } = useQuery({
    queryKey: ['/api/suppliers'],
    queryFn: async () => {
      const result = await apiService.getSuppliers();
      if (!result.success) throw new Error(result.error || 'Failed to fetch suppliers');
      return result.data || [];
    }
  });

  // Safe array guard
  const safeSuppliersList = Array.isArray(suppliersList) ? suppliersList : [];

  // Load payment methods and conditions - using default queryFn
  const { data: paymentMethodsData, isLoading: paymentMethodsLoading } = useQuery({ 
    queryKey: ['/api/reference/payment-methods']
  });

  const { data: paymentConditionsData, isLoading: paymentConditionsLoading } = useQuery({ 
    queryKey: ['/api/reference/payment-conditions']
  });

  // Safe array extraction (API might return { data: [...] } or [...])
  const paymentMethodsList = Array.isArray(paymentMethodsData) 
    ? paymentMethodsData 
    : Array.isArray((paymentMethodsData as any)?.data) 
      ? (paymentMethodsData as any).data 
      : [];
  const paymentConditionsList = Array.isArray(paymentConditionsData) 
    ? paymentConditionsData 
    : Array.isArray((paymentConditionsData as any)?.data) 
      ? (paymentConditionsData as any).data 
      : [];

  const { data: legalForms = [] } = useQuery({ queryKey: ['/api/reference/legal-forms'] });
  const { data: countries = [] } = useQuery({ queryKey: ['/api/reference/countries'] });
  const { data: italianCities = [] } = useQuery({ queryKey: ['/api/reference/italian-cities'] });
  
  // VAT Regimes for Regime Fiscale dropdown
  const { data: vatRegimesData, isLoading: vatRegimesLoading } = useQuery({ 
    queryKey: ['/api/reference/vat-regimes']
  });
  const vatRegimesList = Array.isArray(vatRegimesData) 
    ? vatRegimesData 
    : Array.isArray((vatRegimesData as any)?.data) 
      ? (vatRegimesData as any).data 
      : [];

  // Validation helper functions
  const validateIBAN = (iban: string): { valid: boolean; message: string } => {
    if (!iban) return { valid: true, message: '' };
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    if (cleanIban.length < 15 || cleanIban.length > 34) {
      return { valid: false, message: 'IBAN deve avere tra 15 e 34 caratteri' };
    }
    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(cleanIban)) {
      return { valid: false, message: 'Formato IBAN non valido' };
    }
    // MOD-97 checksum validation
    const rearranged = cleanIban.slice(4) + cleanIban.slice(0, 4);
    const numericIban = rearranged.replace(/[A-Z]/g, (char) => (char.charCodeAt(0) - 55).toString());
    let remainder = numericIban;
    while (remainder.length > 2) {
      const block = remainder.slice(0, 9);
      remainder = (parseInt(block, 10) % 97).toString() + remainder.slice(9);
    }
    if (parseInt(remainder, 10) % 97 !== 1) {
      return { valid: false, message: 'IBAN non valido (checksum errato)' };
    }
    return { valid: true, message: 'IBAN valido' };
  };

  const validateSDI = (sdi: string): { valid: boolean; message: string } => {
    if (!sdi) return { valid: true, message: '' };
    const cleanSdi = sdi.toUpperCase();
    if (cleanSdi.length !== 7) {
      return { valid: false, message: 'Codice SDI deve avere esattamente 7 caratteri' };
    }
    if (!/^[A-Z0-9]{7}$/.test(cleanSdi)) {
      return { valid: false, message: 'Codice SDI deve contenere solo lettere e numeri' };
    }
    return { valid: true, message: 'Codice SDI valido' };
  };

  const validateEmail = (email: string): { valid: boolean; message: string } => {
    if (!email) return { valid: true, message: '' };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, message: 'Formato email non valido' };
    }
    return { valid: true, message: 'Email valida' };
  };

  const validatePEC = (pec: string): { valid: boolean; message: string } => {
    if (!pec) return { valid: true, message: '' };
    const pecDomains = ['.pec.it', '.legalmail.it', '.postacert.it', '.ingpec.eu', '.arubapec.it', '.pec.aruba.it'];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(pec)) {
      return { valid: false, message: 'Formato PEC non valido' };
    }
    const hasPecDomain = pecDomains.some(domain => pec.toLowerCase().endsWith(domain));
    if (!hasPecDomain) {
      return { valid: false, message: 'Dominio PEC non riconosciuto (es. .pec.it, .legalmail.it)' };
    }
    return { valid: true, message: 'PEC valida' };
  };

  const validatePhone = (phone: string): { valid: boolean; message: string } => {
    if (!phone) return { valid: true, message: '' };
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    if (!/^(\+39)?[0-9]{8,12}$/.test(cleanPhone)) {
      return { valid: false, message: 'Formato telefono non valido (es. +39 02 1234567)' };
    }
    return { valid: true, message: 'Telefono valido' };
  };

  const validateWebsite = (url: string): { valid: boolean; message: string } => {
    if (!url) return { valid: true, message: '' };
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { valid: false, message: 'URL deve iniziare con http:// o https://' };
      }
      return { valid: true, message: 'URL valido' };
    } catch {
      return { valid: false, message: 'Formato URL non valido' };
    }
  };

  // Delete handler
  const handleDeleteSupplier = async (supplierId: string) => {
    try {
      const result = await apiService.deleteSupplier(supplierId);
      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      } else {
        alert('Errore nell\'eliminazione del fornitore. Riprova.');
      }
    } catch (error) {
      alert('Errore nell\'eliminazione del fornitore. Riprova.');
    }
  };

  // Save handler (from SettingsPage lines 5709-5817)
  const handleSaveSupplier = async () => {
    try {
      const currentTenantId = DEMO_TENANT_ID;
      
      // Comprehensive validation using Zod schema
      const validationResult = supplierValidationSchema.safeParse(newSupplier);
      
      if (!validationResult.success) {
        // Show validation errors
        const errors = validationResult.error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join('\n');
        alert(`Errori di validazione:\n${errors}`);
        return;
      }

      const validatedData = validationResult.data;
      const isEdit = Boolean(supplierModal.data);
      
      // Genera codice fornitore: inizia con FOR, almeno 6 cifre totali (solo per creazione)
      const newCode = validatedData.code || (isEdit ? supplierModal.data.code : `FOR${String(Date.now()).slice(-3)}`);
      
      const supplierData = {
        tenantId: currentTenantId,
        origin: 'tenant',
        code: newCode,
        name: validatedData.name,
        legalName: validatedData.legalName,
        legalForm: validatedData.legalForm,
        supplierType: 'distributore',
        vatNumber: validatedData.vatNumber,
        taxCode: validatedData.taxCode,
        status: validatedData.status,
        // Address structure - JSONB + FK pattern
        registeredAddress: {
          via: validatedData.address,
          citta: validatedData.city,
          provincia: validatedData.province,
          cap: validatedData.postalCode
        },
        countryId: '00000000-0000-0000-0000-000000000001',
        email: validatedData.email,
        phone: validatedData.phone,
        website: validatedData.website,
        pecEmail: validatedData.pecEmail,
        sdiCode: validatedData.sdiCode,
        iban: validatedData.iban,
        bic: validatedData.bic,
        splitPayment: validatedData.splitPayment,
        withholdingTax: validatedData.withholdingTax,
        // SEPARATE PAYMENT FIELDS
        preferredPaymentMethodId: validatedData.preferredPaymentMethodId || null,
        paymentConditionId: validatedData.paymentConditionId || null,
        notes: validatedData.notes,
        createdBy: 'system'
      };

      let result;
      if (isEdit) {
        result = await apiService.updateSupplier(supplierModal.data.id, supplierData);
      } else {
        result = await apiService.createSupplier(supplierData);
      }
      
      if (result.success) {
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
          paymentConditionId: '',
          notes: ''
        });

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

  // Populate modal on edit
  useEffect(() => {
    if (supplierModal.open && supplierModal.data) {
      setNewSupplier({
        code: supplierModal.data.code || '',
        name: supplierModal.data.name || '',
        legalName: supplierModal.data.legal_name || '',
        legalForm: supplierModal.data.legal_form || '',
        vatNumber: supplierModal.data.vat_number || '',
        taxCode: supplierModal.data.tax_code || '',
        status: supplierModal.data.status || 'active',
        address: supplierModal.data.registeredAddress?.via || '',
        city: supplierModal.data.registeredAddress?.citta || '',
        province: supplierModal.data.registeredAddress?.provincia || '',
        postalCode: supplierModal.data.registeredAddress?.cap || '',
        country: supplierModal.data.country || 'Italia',
        email: supplierModal.data.email || '',
        phone: supplierModal.data.phone || '',
        website: supplierModal.data.website || '',
        pecEmail: supplierModal.data.pec_email || '',
        sdiCode: supplierModal.data.sdi_code || '',
        iban: supplierModal.data.iban || '',
        bic: supplierModal.data.bic || '',
        splitPayment: supplierModal.data.split_payment || false,
        withholdingTax: supplierModal.data.withholding_tax || false,
        preferredPaymentMethodId: supplierModal.data.preferred_payment_method_id || '',
        paymentConditionId: supplierModal.data.payment_condition_id || '',
        notes: supplierModal.data.notes || ''
      });
    } else if (supplierModal.open && !supplierModal.data) {
      // Reset for new supplier
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
        paymentConditionId: '',
        notes: ''
      });
    }
  }, [supplierModal]);

  // Filter suppliers
  const filteredSuppliers = safeSuppliersList.filter((supplier: any) => {
    // Search filter (name, code, vat, tax code)
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matches = 
        supplier.name?.toLowerCase().includes(search) ||
        supplier.code?.toLowerCase().includes(search) ||
        supplier.vat_number?.toLowerCase().includes(search) ||
        supplier.tax_code?.toLowerCase().includes(search) ||
        supplier.legal_name?.toLowerCase().includes(search) ||
        supplier.city?.toLowerCase().includes(search);
      if (!matches) return false;
    }

    // Source filter (brand/tenant)
    if (sourceFilter !== 'all') {
      if (supplier.origin !== sourceFilter) return false;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      const createdAt = supplier.created_at ? new Date(supplier.created_at) : null;
      if (createdAt) {
        if (dateFrom && createdAt < dateFrom) return false;
        if (dateTo) {
          const endOfDay = new Date(dateTo);
          endOfDay.setHours(23, 59, 59, 999);
          if (createdAt > endOfDay) return false;
        }
      }
    }

    return true;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setSourceFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasActiveFilters = searchTerm || sourceFilter !== 'all' || dateFrom || dateTo;

  return (
    <div className="space-y-6" data-testid="fornitori-content">
        {/* Header */}
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
            Fornitori ({suppliersLoading ? '...' : filteredSuppliers.length} di {safeSuppliersList.length} elementi)
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

        {/* Filters Section */}
        <Card className="p-4" style={{
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(229, 231, 235, 0.8)'
        }}>
          <div className="flex flex-wrap gap-3 items-end">
            {/* Search Field */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Ricerca</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Nome, codice, P.IVA, C.F., città..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-supplier"
                />
              </div>
            </div>

            {/* Source Filter */}
            <div className="min-w-[150px]">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Origine</label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger data-testid="select-source-filter">
                  <SelectValue placeholder="Tutti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="brand">Brand</SelectItem>
                  <SelectItem value="tenant">Tenant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date From */}
            <div className="min-w-[150px]">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Data da</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal" data-testid="button-date-from">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, 'dd/MM/yyyy', { locale: it }) : 'Seleziona...'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    locale={it}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Date To */}
            <div className="min-w-[150px]">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Data a</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal" data-testid="button-date-to">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, 'dd/MM/yyyy', { locale: it }) : 'Seleziona...'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    locale={it}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500" data-testid="button-clear-filters">
                <X className="h-4 w-4 mr-1" />
                Pulisci
              </Button>
            )}
          </div>
        </Card>

        {/* DataTable */}
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
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Origine</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Stato</th>
                  <th style={{ padding: '16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map((supplier: any, index: number) => (
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
                    {supplier.origin === 'brand' ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        background: '#dbeafe',
                        color: '#1d4ed8',
                        border: '1px solid #93c5fd',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}
                      title="Gestito centralmente dal Brand HQ - Solo visualizzazione"
                      >
                        <Building2 size={12} />
                        Brand
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        background: '#f3f4f6',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        Tenant
                      </span>
                    )}
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
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
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
                {filteredSuppliers.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ 
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

      {/* Modal Fornitore (from SettingsPage lines 9384-10500) */}
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
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="text" 
                        placeholder="es. FOR001"
                        value={newSupplier.code}
                        onChange={(e) => setNewSupplier({ ...newSupplier, code: e.target.value.toUpperCase() })}
                        style={{ flex: 1, padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} 
                        data-testid="input-supplier-code"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const timestamp = Date.now().toString().slice(-6);
                          const newCode = `FOR${timestamp}`;
                          setNewSupplier({ ...newSupplier, code: newCode });
                        }}
                        style={{
                          padding: '8px 10px',
                          background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 1px 4px rgba(99, 102, 241, 0.25)',
                          transition: 'all 0.2s ease'
                        }}
                        title="Genera automaticamente un codice fornitore univoco"
                        data-testid="button-auto-generate-code"
                      >
                        <Wand2 size={12} />
                        Auto
                      </button>
                    </div>
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
                  {/* P.IVA with Italian VAT validation */}
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Partita IVA <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="es. IT12345678901"
                      value={newSupplier.vatNumber}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        setNewSupplier({ ...newSupplier, vatNumber: value });
                      }}
                      onBlur={(e) => {
                        if (e.target.value) {
                          const vatValidation = supplierValidationSchema.shape.vatNumber?.safeParse(e.target.value);
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
                            errorDiv.style.cssText = 'color: #ef4444; font-size: 12px; margin-top: 4px;';
                          } else {
                            e.target.style.borderColor = '#10b981';
                            e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                            const errorDiv = e.target.parentElement?.querySelector('.validation-error');
                            errorDiv?.remove();
                          }
                        } else {
                          e.target.style.borderColor = '#d1d5db';
                          e.target.style.boxShadow = 'none';
                          const errorDiv = e.target.parentElement?.querySelector('.validation-error');
                          errorDiv?.remove();
                        }
                      }}
                      style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} 
                      data-testid="input-vat-number"
                    />
                  </div>
                  {/* Codice Fiscale with Italian tax code validation */}
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Codice Fiscale <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="es. RSSMRA85M01H501Z"
                      value={newSupplier.taxCode}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        setNewSupplier({ ...newSupplier, taxCode: value });
                      }}
                      onBlur={(e) => {
                        if (e.target.value) {
                          const taxCodeValidation = supplierValidationSchema.shape.taxCode?.safeParse(e.target.value);
                          if (!taxCodeValidation?.success) {
                            e.target.style.borderColor = '#ef4444';
                            e.target.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
                            let errorDiv = e.target.parentElement?.querySelector('.validation-error');
                            if (!errorDiv) {
                              errorDiv = document.createElement('div');
                              errorDiv.className = 'validation-error';
                              e.target.parentElement?.appendChild(errorDiv);
                            }
                            errorDiv.textContent = 'Codice fiscale non valido (16 caratteri)';
                            errorDiv.style.cssText = 'color: #ef4444; font-size: 12px; margin-top: 4px;';
                          } else {
                            e.target.style.borderColor = '#10b981';
                            e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                            const errorDiv = e.target.parentElement?.querySelector('.validation-error');
                            errorDiv?.remove();
                          }
                        } else {
                          e.target.style.borderColor = '#d1d5db';
                          e.target.style.boxShadow = 'none';
                          const errorDiv = e.target.parentElement?.querySelector('.validation-error');
                          errorDiv?.remove();
                        }
                      }}
                      style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} 
                      data-testid="input-tax-code"
                    />
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
                        <option value="Italia">Italia</option>
                        {countries.map((country: any) => (
                          <option key={country.id} value={country.name}>
                            {country.name}
                          </option>
                        ))}
                      </select>
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
                  Contatti
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '16px'
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Email *
                    </label>
                    <div className="relative">
                      <input 
                        type="email" 
                        placeholder="fornitore@example.com"
                        value={newSupplier.email}
                        onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value.toLowerCase() })}
                        onBlur={(e) => {
                          const validation = validateEmail(e.target.value);
                          if (e.target.value && !validation.valid) {
                            e.target.style.borderColor = '#ef4444';
                            e.target.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
                          } else if (e.target.value && validation.valid) {
                            e.target.style.borderColor = '#10b981';
                            e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                          } else {
                            e.target.style.borderColor = '#d1d5db';
                            e.target.style.boxShadow = 'none';
                          }
                        }}
                        style={{ width: '100%', padding: '12px', paddingRight: '40px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} 
                        data-testid="input-email"
                      />
                      {newSupplier.email && (
                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                          {validateEmail(newSupplier.email).valid ? 
                            <CheckCircle2 size={18} className="text-green-500" /> : 
                            <XCircle size={18} className="text-red-500" />}
                        </span>
                      )}
                    </div>
                    {newSupplier.email && !validateEmail(newSupplier.email).valid && (
                      <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                        {validateEmail(newSupplier.email).message}
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      PEC
                    </label>
                    <div className="relative">
                      <input 
                        type="email" 
                        placeholder="fornitore@pec.it"
                        value={newSupplier.pecEmail}
                        onChange={(e) => setNewSupplier({ ...newSupplier, pecEmail: e.target.value.toLowerCase() })}
                        onBlur={(e) => {
                          const validation = validatePEC(e.target.value);
                          if (e.target.value && !validation.valid) {
                            e.target.style.borderColor = '#ef4444';
                            e.target.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
                          } else if (e.target.value && validation.valid) {
                            e.target.style.borderColor = '#10b981';
                            e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                          } else {
                            e.target.style.borderColor = '#d1d5db';
                            e.target.style.boxShadow = 'none';
                          }
                        }}
                        style={{ width: '100%', padding: '12px', paddingRight: '40px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} 
                        data-testid="input-pec"
                      />
                      {newSupplier.pecEmail && (
                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                          {validatePEC(newSupplier.pecEmail).valid ? 
                            <CheckCircle2 size={18} className="text-green-500" /> : 
                            <XCircle size={18} className="text-red-500" />}
                        </span>
                      )}
                    </div>
                    {newSupplier.pecEmail && !validatePEC(newSupplier.pecEmail).valid && (
                      <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                        {validatePEC(newSupplier.pecEmail).message}
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Telefono
                    </label>
                    <div className="relative">
                      <input 
                        type="tel" 
                        placeholder="+39 02 1234567"
                        value={newSupplier.phone}
                        onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                        onBlur={(e) => {
                          const validation = validatePhone(e.target.value);
                          if (e.target.value && !validation.valid) {
                            e.target.style.borderColor = '#ef4444';
                            e.target.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
                          } else if (e.target.value && validation.valid) {
                            e.target.style.borderColor = '#10b981';
                            e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                          } else {
                            e.target.style.borderColor = '#d1d5db';
                            e.target.style.boxShadow = 'none';
                          }
                        }}
                        style={{ width: '100%', padding: '12px', paddingRight: '40px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} 
                        data-testid="input-phone"
                      />
                      {newSupplier.phone && (
                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                          {validatePhone(newSupplier.phone).valid ? 
                            <CheckCircle2 size={18} className="text-green-500" /> : 
                            <XCircle size={18} className="text-red-500" />}
                        </span>
                      )}
                    </div>
                    {newSupplier.phone && !validatePhone(newSupplier.phone).valid && (
                      <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                        {validatePhone(newSupplier.phone).message}
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Sito Web
                    </label>
                    <div className="relative">
                      <input 
                        type="url" 
                        placeholder="https://www.fornitore.it"
                        value={newSupplier.website}
                        onChange={(e) => setNewSupplier({ ...newSupplier, website: e.target.value })}
                        onBlur={(e) => {
                          const validation = validateWebsite(e.target.value);
                          if (e.target.value && !validation.valid) {
                            e.target.style.borderColor = '#ef4444';
                            e.target.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
                          } else if (e.target.value && validation.valid) {
                            e.target.style.borderColor = '#10b981';
                            e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                          } else {
                            e.target.style.borderColor = '#d1d5db';
                            e.target.style.boxShadow = 'none';
                          }
                        }}
                        style={{ width: '100%', padding: '12px', paddingRight: '40px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} 
                        data-testid="input-website"
                      />
                      {newSupplier.website && (
                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                          {validateWebsite(newSupplier.website).valid ? 
                            <CheckCircle2 size={18} className="text-green-500" /> : 
                            <XCircle size={18} className="text-red-500" />}
                        </span>
                      )}
                    </div>
                    {newSupplier.website && !validateWebsite(newSupplier.website).valid && (
                      <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                        {validateWebsite(newSupplier.website).message}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SEZIONE 4: Pagamenti */}
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
                  Dati di Pagamento
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '16px'
                }}>
                  {/* Payment Method Dropdown */}
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Metodo di Pagamento
                    </label>
                    <select 
                      value={newSupplier.preferredPaymentMethodId}
                      onChange={(e) => setNewSupplier({ ...newSupplier, preferredPaymentMethodId: e.target.value })}
                      style={{ 
                        width: '100%', 
                        padding: '12px', 
                        border: '1px solid #d1d5db', 
                        borderRadius: '8px', 
                        fontSize: '14px', 
                        background: paymentMethodsLoading ? '#f9fafb' : 'white',
                        cursor: paymentMethodsLoading ? 'wait' : 'pointer'
                      }}
                      disabled={paymentMethodsLoading}
                      data-testid="select-payment-method"
                    >
                      <option value="">{paymentMethodsLoading ? 'Caricamento...' : 'Seleziona metodo...'}</option>
                      {paymentMethodsList?.map((method: any) => (
                        <option key={method.id} value={method.id} title={method.description}>
                          {method.name} {method.requiresIban ? '(IBAN richiesto)' : ''}
                        </option>
                      ))}
                    </select>
                    {paymentMethodsLoading && (
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                        Caricamento metodi di pagamento...
                      </div>
                    )}
                  </div>

                  {/* Payment Conditions Dropdown */}
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Condizioni di Pagamento
                    </label>
                    <select 
                      value={newSupplier.paymentConditionId}
                      onChange={(e) => setNewSupplier({ ...newSupplier, paymentConditionId: e.target.value })}
                      style={{ 
                        width: '100%', 
                        padding: '12px', 
                        border: '1px solid #d1d5db', 
                        borderRadius: '8px', 
                        fontSize: '14px', 
                        background: paymentConditionsLoading ? '#f9fafb' : 'white',
                        cursor: paymentConditionsLoading ? 'wait' : 'pointer'
                      }}
                      disabled={paymentConditionsLoading}
                      data-testid="select-payment-condition"
                    >
                      <option value="">{paymentConditionsLoading ? 'Caricamento...' : 'Seleziona condizioni...'}</option>
                      {paymentConditionsList?.map((condition: any) => (
                        <option key={condition.id} value={condition.id} title={condition.description}>
                          {condition.name} {condition.days ? `(${condition.days} giorni)` : ''}
                        </option>
                      ))}
                    </select>
                    {paymentConditionsLoading && (
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                        Caricamento condizioni di pagamento...
                      </div>
                    )}
                  </div>

                  {/* IBAN with MOD-97 Validation */}
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      IBAN
                      {newSupplier.preferredPaymentMethodId && paymentMethodsList?.find(m => m.id === newSupplier.preferredPaymentMethodId)?.requiresIban && (
                        <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
                      )}
                    </label>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="IT60 X054 2811 1010 0000 0123 456"
                        value={newSupplier.iban}
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase().replace(/\s/g, '');
                          setNewSupplier({ ...newSupplier, iban: value });
                        }}
                        onBlur={(e) => {
                          const validation = validateIBAN(e.target.value);
                          if (e.target.value && !validation.valid) {
                            e.target.style.borderColor = '#ef4444';
                            e.target.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
                          } else if (e.target.value && validation.valid) {
                            e.target.style.borderColor = '#10b981';
                            e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                          } else {
                            e.target.style.borderColor = '#d1d5db';
                            e.target.style.boxShadow = 'none';
                          }
                        }}
                        style={{ width: '100%', padding: '12px', paddingRight: '40px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} 
                        data-testid="input-iban"
                      />
                      {newSupplier.iban && (
                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                          {validateIBAN(newSupplier.iban).valid ? 
                            <CheckCircle2 size={18} className="text-green-500" /> : 
                            <XCircle size={18} className="text-red-500" />}
                        </span>
                      )}
                    </div>
                    {newSupplier.iban && !validateIBAN(newSupplier.iban).valid && (
                      <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                        {validateIBAN(newSupplier.iban).message}
                      </div>
                    )}
                  </div>

                  {/* Codice SDI with validation */}
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Codice SDI
                    </label>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="es. ABCDEFG (7 caratteri)"
                        value={newSupplier.sdiCode}
                        onChange={(e) => setNewSupplier({ ...newSupplier, sdiCode: e.target.value.toUpperCase() })}
                        onBlur={(e) => {
                          const validation = validateSDI(e.target.value);
                          if (e.target.value && !validation.valid) {
                            e.target.style.borderColor = '#ef4444';
                            e.target.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
                          } else if (e.target.value && validation.valid) {
                            e.target.style.borderColor = '#10b981';
                            e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                          } else {
                            e.target.style.borderColor = '#d1d5db';
                            e.target.style.boxShadow = 'none';
                          }
                        }}
                        maxLength={7}
                        style={{ width: '100%', padding: '12px', paddingRight: '40px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', textTransform: 'uppercase' }} 
                        data-testid="input-codice-sdi"
                      />
                      {newSupplier.sdiCode && (
                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                          {validateSDI(newSupplier.sdiCode).valid ? 
                            <CheckCircle2 size={18} className="text-green-500" /> : 
                            <XCircle size={18} className="text-red-500" />}
                        </span>
                      )}
                    </div>
                    {newSupplier.sdiCode && !validateSDI(newSupplier.sdiCode).valid && (
                      <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                        {validateSDI(newSupplier.sdiCode).message}
                      </div>
                    )}
                  </div>

                  {/* BIC/SWIFT with Validation */}
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      BIC/SWIFT
                    </label>
                    <input 
                      type="text" 
                      placeholder="BCITITMM"
                      value={newSupplier.bic}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        setNewSupplier({ ...newSupplier, bic: value });
                      }}
                      onBlur={(e) => {
                        if (e.target.value) {
                          const bicValidation = supplierValidationSchema.shape.bic?.safeParse(e.target.value);
                          if (!bicValidation?.success) {
                            e.target.style.borderColor = '#ef4444';
                            e.target.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
                          } else {
                            e.target.style.borderColor = '#10b981';
                            e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                          }
                        } else {
                          e.target.style.borderColor = '#d1d5db';
                          e.target.style.boxShadow = 'none';
                        }
                      }}
                      style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} 
                      data-testid="input-bic"
                    />
                  </div>
                </div>

                {/* Regime Fiscale Section */}
                <div style={{ marginTop: '20px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>Regime Fiscale</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                    {/* VAT Regime Dropdown */}
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                        Regime IVA
                      </label>
                      <select 
                        value={(newSupplier as any).vatRegimeId || ''}
                        onChange={(e) => setNewSupplier({ ...newSupplier, vatRegimeId: e.target.value } as any)}
                        style={{ 
                          width: '100%', 
                          padding: '12px', 
                          border: '1px solid #d1d5db', 
                          borderRadius: '8px', 
                          fontSize: '14px', 
                          background: vatRegimesLoading ? '#f9fafb' : 'white',
                          cursor: vatRegimesLoading ? 'wait' : 'pointer'
                        }}
                        disabled={vatRegimesLoading}
                        data-testid="select-vat-regime"
                      >
                        <option value="">{vatRegimesLoading ? 'Caricamento...' : 'Seleziona regime...'}</option>
                        {vatRegimesList?.map((regime: any) => (
                          <option key={regime.id} value={regime.id} title={regime.description}>
                            {regime.name} {regime.vatPayer === 'customer' ? '(Cliente)' : regime.vatPayer === 'pa' ? '(PA)' : ''}
                          </option>
                        ))}
                      </select>
                      {vatRegimesLoading && (
                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                          Caricamento regimi fiscali...
                        </div>
                      )}
                    </div>
                    
                    {/* Ritenuta d'Acconto flag (separate from VAT regime) */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '24px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={newSupplier.withholdingTax}
                          onChange={(e) => setNewSupplier({ ...newSupplier, withholdingTax: e.target.checked })}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          data-testid="checkbox-withholding-tax"
                        />
                        Ritenuta d'Acconto (trattenuta sui compensi)
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* SEZIONE 5: Note */}
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
                  Note
                </h3>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                    Note Interne
                  </label>
                  <textarea 
                    placeholder="Note riservate per uso interno..."
                    rows={4}
                    value={newSupplier.notes}
                    onChange={(e) => setNewSupplier({ ...newSupplier, notes: e.target.value })}
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
                onClick={handleSaveSupplier}
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
    </div>
  );
}
