import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/ApiService';
import { queryClient } from '@/lib/queryClient';
import { supplierValidationSchema, type SupplierValidation } from '@/lib/validation/italian-business-validation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus, Building2, Eye, Trash2, RefreshCw, AlertCircle, X, MapPin, Phone, CreditCard, Truck, Mail, FileText
} from 'lucide-react';
import { StandardCityField } from '../Leave/forms/StandardFields';

const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';

export default function FornitoriTabContent() {
  // Modal state
  const [supplierModal, setSupplierModal] = useState<{ open: boolean; data: any }>({ open: false, data: null });

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
  const { data: paymentMethodsList, isLoading: paymentMethodsLoading } = useQuery({ 
    queryKey: ['/api/payment-methods']
  });

  const { data: paymentConditionsList, isLoading: paymentConditionsLoading } = useQuery({ 
    queryKey: ['/api/payment-conditions']
  });

  const { data: legalForms = [] } = useQuery({ queryKey: ['/api/reference/legal-forms'] });
  const { data: countries = [] } = useQuery({ queryKey: ['/api/reference/countries'] });
  const { data: italianCities = [] } = useQuery({ queryKey: ['/api/reference/italian-cities'] });

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

  return (
    <>
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

        {/* DataTable (from SettingsPage lines 2628-2858) */}
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
                    <input 
                      type="email" 
                      placeholder="fornitore@example.com"
                      value={newSupplier.email}
                      onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                      style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      PEC
                    </label>
                    <input 
                      type="email" 
                      placeholder="fornitore@pec.it"
                      value={newSupplier.pecEmail}
                      onChange={(e) => setNewSupplier({ ...newSupplier, pecEmail: e.target.value })}
                      style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Telefono
                    </label>
                    <input 
                      type="tel" 
                      placeholder="+39 02 1234567"
                      value={newSupplier.phone}
                      onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                      style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} 
                    />
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

                  {/* IBAN with Validation */}
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      IBAN
                      {newSupplier.preferredPaymentMethodId && paymentMethodsList?.find(m => m.id === newSupplier.preferredPaymentMethodId)?.requiresIban && (
                        <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
                      )}
                    </label>
                    <input 
                      type="text" 
                      placeholder="IT60 X054 2811 1010 0000 0123 456"
                      value={newSupplier.iban}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase().replace(/\s/g, '');
                        setNewSupplier({ ...newSupplier, iban: value });
                      }}
                      onBlur={(e) => {
                        if (e.target.value) {
                          const ibanValidation = supplierValidationSchema.shape.iban?.safeParse(e.target.value);
                          if (!ibanValidation?.success) {
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
                      data-testid="input-iban"
                    />
                  </div>

                  {/* Codice SDI */}
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
                      data-testid="input-codice-sdi"
                    />
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
    </>
  );
}
