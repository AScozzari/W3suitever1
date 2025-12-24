import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  X, Landmark, Building2, FileText, MapPin, CreditCard, Phone, 
  Mail, Globe, Save, AlertCircle, CheckCircle
} from 'lucide-react';
import { 
  italianVatNumberSchema, italianTaxCodeSchema, pecEmailSchema,
  italianPhoneSchema, ibanSchema
} from '@/lib/validation/italian-business-validation';
import { apiService } from '@/services/ApiService';

interface FinancialEntityModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  data: any | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  code: string;
  name: string;
  vatNumber: string;
  fiscalCode: string;
  bankRegisterNumber: string;
  ivassCode: string;
  parentCompany: string;
  capitalStock: string;
  legalFormId: string;
  vatRegimeId: string;
  registeredAddress: {
    via: string;
    civico: string;
    cap: string;
    citta: string;
    provincia: string;
    paese: string;
  };
  iban: string;
  bic: string;
  bankName: string;
  accountHolder: string;
  phone: string;
  email: string;
  pec: string;
  website: string;
  notes: string;
  status: 'active' | 'suspended' | 'blocked';
}

const initialFormData: FormData = {
  code: '',
  name: '',
  vatNumber: '',
  fiscalCode: '',
  bankRegisterNumber: '',
  ivassCode: '',
  parentCompany: '',
  capitalStock: '',
  legalFormId: '',
  vatRegimeId: '',
  registeredAddress: {
    via: '',
    civico: '',
    cap: '',
    citta: '',
    provincia: '',
    paese: 'IT'
  },
  iban: '',
  bic: '',
  bankName: '',
  accountHolder: '',
  phone: '',
  email: '',
  pec: '',
  website: '',
  notes: '',
  status: 'active'
};

export default function FinancialEntityModal({ 
  isOpen, 
  mode, 
  data, 
  onClose, 
  onSuccess 
}: FinancialEntityModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('anagrafica');

  const { data: legalFormsResponse } = useQuery({
    queryKey: ['/api/reference/legal-forms'],
    enabled: isOpen
  });

  const { data: vatRegimesResponse } = useQuery({
    queryKey: ['/api/reference/vat-regimes'],
    enabled: isOpen
  });

  const legalForms = Array.isArray(legalFormsResponse) 
    ? legalFormsResponse 
    : (legalFormsResponse as any)?.data || [];

  const vatRegimes = Array.isArray(vatRegimesResponse)
    ? vatRegimesResponse
    : (vatRegimesResponse as any)?.data || [];

  useEffect(() => {
    if (data && (mode === 'edit' || mode === 'view')) {
      const addr = data.registeredAddress || {};
      setFormData({
        code: data.code || '',
        name: data.name || '',
        vatNumber: data.vatNumber || '',
        fiscalCode: data.fiscalCode || '',
        bankRegisterNumber: data.bankRegisterNumber || '',
        ivassCode: data.ivassCode || '',
        parentCompany: data.parentCompany || '',
        capitalStock: data.capitalStock?.toString() || '',
        legalFormId: data.legalFormId?.toString() || '',
        vatRegimeId: data.vatRegimeId?.toString() || '',
        registeredAddress: {
          via: addr.via || '',
          civico: addr.civico || '',
          cap: addr.cap || '',
          citta: addr.citta || '',
          provincia: addr.provincia || '',
          paese: addr.paese || 'IT'
        },
        iban: data.iban || '',
        bic: data.bic || '',
        bankName: data.bankName || '',
        accountHolder: data.accountHolder || '',
        phone: data.phone || '',
        email: data.email || '',
        pec: data.pec || '',
        website: data.website || '',
        notes: data.notes || '',
        status: data.status || 'active'
      });
    } else {
      setFormData(initialFormData);
    }
    setErrors({});
    setActiveSection('anagrafica');
  }, [data, mode, isOpen]);

  const validateField = (field: string, value: string): string | null => {
    if (field === 'vatNumber' && value) {
      const result = italianVatNumberSchema.safeParse(value);
      return result.success ? null : result.error.errors[0]?.message || 'Partita IVA non valida';
    }
    if (field === 'fiscalCode' && value) {
      const result = italianTaxCodeSchema.safeParse(value);
      return result.success ? null : result.error.errors[0]?.message || 'Codice fiscale non valido';
    }
    if (field === 'pec' && value) {
      const result = pecEmailSchema.safeParse(value);
      return result.success ? null : result.error.errors[0]?.message || 'PEC non valida';
    }
    if (field === 'phone' && value) {
      const result = italianPhoneSchema.safeParse(value);
      return result.success ? null : result.error.errors[0]?.message || 'Telefono non valido';
    }
    if (field === 'iban' && value) {
      const result = ibanSchema.safeParse(value);
      return result.success ? null : result.error.errors[0]?.message || 'IBAN non valido';
    }
    return null;
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    const error = validateField(field, value);
    setErrors(prev => {
      const newErrors = { ...prev };
      if (error) {
        newErrors[field] = error;
      } else {
        delete newErrors[field];
      }
      return newErrors;
    });
  };

  const handleAddressChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      registeredAddress: { ...prev.registeredAddress, [field]: value }
    }));
  };

  const handleSave = async () => {
    if (mode === 'view') return;

    if (!formData.code.trim() || !formData.name.trim()) {
      setErrors({ general: 'Codice e Ragione Sociale sono obbligatori' });
      return;
    }

    if (Object.keys(errors).length > 0) {
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        legalFormId: formData.legalFormId ? parseInt(formData.legalFormId) : null,
        vatRegimeId: formData.vatRegimeId ? parseInt(formData.vatRegimeId) : null,
        capitalStock: formData.capitalStock ? parseFloat(formData.capitalStock) : null
      };

      let result;
      if (mode === 'create') {
        result = await apiService.createFinancialEntity(payload);
      } else {
        result = await apiService.updateFinancialEntity(data.id, payload);
      }

      if (!result.success) {
        throw new Error(result.error || 'Errore durante il salvataggio');
      }

      queryClient.invalidateQueries({ queryKey: ['/api/wms/financial-entities'] });
      onSuccess();
      onClose();
    } catch (error: any) {
      setErrors({ general: error.message || 'Errore durante il salvataggio' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isReadOnly = mode === 'view';
  const isBrandEntity = data?.origin === 'brand';

  const sections = [
    { id: 'anagrafica', label: 'Anagrafica', icon: Building2 },
    { id: 'fiscale', label: 'Dati Fiscali', icon: FileText },
    { id: 'sede', label: 'Sede Legale', icon: MapPin },
    { id: 'bancario', label: 'Dati Bancari', icon: CreditCard },
    { id: 'contatti', label: 'Contatti', icon: Phone }
  ];

  const inputStyle = (hasError: boolean = false, isValid: boolean = false) => ({
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${hasError ? '#ef4444' : isValid ? '#10b981' : '#e5e7eb'}`,
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    background: isReadOnly ? '#f9fafb' : 'white',
    transition: 'border-color 0.2s'
  });

  const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '13px',
    fontWeight: '500' as const,
    color: '#374151'
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'white',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '85vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.05), rgba(16, 185, 129, 0.05))'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #059669, #10b981)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Landmark size={22} style={{ color: 'white' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
                {mode === 'create' ? 'Nuovo Ente Finanziatore' : 
                 mode === 'edit' ? 'Modifica Ente Finanziatore' : 
                 'Dettagli Ente Finanziatore'}
              </h2>
              {isBrandEntity && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '4px',
                  padding: '2px 8px',
                  background: 'rgba(139, 92, 246, 0.1)',
                  color: '#8b5cf6',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '500'
                }}>
                  Ente Brand - Sola Lettura
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: 'none',
              background: '#f3f4f6',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Section Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '12px 24px',
          background: '#fafafa',
          borderBottom: '1px solid #e5e7eb',
          overflowX: 'auto'
        }}>
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: 'none',
                background: activeSection === section.id 
                  ? 'linear-gradient(135deg, #059669, #10b981)' 
                  : 'white',
                color: activeSection === section.id ? 'white' : '#6b7280',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: activeSection === section.id 
                  ? '0 2px 8px rgba(5, 150, 105, 0.3)'
                  : '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              <section.icon size={14} />
              {section.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {errors.general && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '8px',
              marginBottom: '20px',
              color: '#ef4444',
              fontSize: '14px'
            }}>
              <AlertCircle size={16} />
              {errors.general}
            </div>
          )}

          {/* Anagrafica Section */}
          {activeSection === 'anagrafica' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Codice <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => handleFieldChange('code', e.target.value.toUpperCase())}
                  placeholder="Es: FIN001"
                  readOnly={isReadOnly || mode === 'edit'}
                  style={inputStyle()}
                  data-testid="input-financial-entity-code"
                />
              </div>
              <div>
                <label style={labelStyle}>Stato</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleFieldChange('status', e.target.value)}
                  disabled={isReadOnly}
                  style={inputStyle()}
                  data-testid="select-financial-entity-status"
                >
                  <option value="active">Attivo</option>
                  <option value="suspended">Sospeso</option>
                  <option value="blocked">Bloccato</option>
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Ragione Sociale <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  placeholder="Es: Compass Banca S.p.A."
                  readOnly={isReadOnly}
                  style={inputStyle()}
                  data-testid="input-financial-entity-name"
                />
              </div>
              <div>
                <label style={labelStyle}>Forma Giuridica</label>
                <select
                  value={formData.legalFormId}
                  onChange={(e) => handleFieldChange('legalFormId', e.target.value)}
                  disabled={isReadOnly}
                  style={inputStyle()}
                  data-testid="select-financial-entity-legal-form"
                >
                  <option value="">-- Seleziona --</option>
                  {legalForms.map((lf: any) => (
                    <option key={lf.id} value={lf.id}>{lf.name} ({lf.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Gruppo Societario</label>
                <input
                  type="text"
                  value={formData.parentCompany}
                  onChange={(e) => handleFieldChange('parentCompany', e.target.value)}
                  placeholder="Es: Mediobanca Group"
                  readOnly={isReadOnly}
                  style={inputStyle()}
                  data-testid="input-financial-entity-parent"
                />
              </div>
              <div>
                <label style={labelStyle}>Capitale Sociale (€)</label>
                <input
                  type="text"
                  value={formData.capitalStock}
                  onChange={(e) => handleFieldChange('capitalStock', e.target.value.replace(/[^\d.,]/g, ''))}
                  placeholder="Es: 10000000"
                  readOnly={isReadOnly}
                  style={inputStyle()}
                  data-testid="input-financial-entity-capital"
                />
              </div>
            </div>
          )}

          {/* Dati Fiscali Section */}
          {activeSection === 'fiscale' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Partita IVA</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={formData.vatNumber}
                    onChange={(e) => handleFieldChange('vatNumber', e.target.value.toUpperCase())}
                    placeholder="Es: IT12345678901"
                    readOnly={isReadOnly}
                    style={inputStyle(!!errors.vatNumber, formData.vatNumber && !errors.vatNumber)}
                    data-testid="input-financial-entity-vat"
                  />
                  {formData.vatNumber && !errors.vatNumber && (
                    <CheckCircle size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#10b981' }} />
                  )}
                </div>
                {errors.vatNumber && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.vatNumber}</p>}
              </div>
              <div>
                <label style={labelStyle}>Codice Fiscale</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={formData.fiscalCode}
                    onChange={(e) => handleFieldChange('fiscalCode', e.target.value.toUpperCase())}
                    placeholder="Es: 12345678901 o RSSMRA80A01H501X"
                    readOnly={isReadOnly}
                    style={inputStyle(!!errors.fiscalCode, formData.fiscalCode && !errors.fiscalCode)}
                    data-testid="input-financial-entity-fiscal-code"
                  />
                  {formData.fiscalCode && !errors.fiscalCode && (
                    <CheckCircle size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#10b981' }} />
                  )}
                </div>
                {errors.fiscalCode && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.fiscalCode}</p>}
              </div>
              <div>
                <label style={labelStyle}>Regime IVA</label>
                <select
                  value={formData.vatRegimeId}
                  onChange={(e) => handleFieldChange('vatRegimeId', e.target.value)}
                  disabled={isReadOnly}
                  style={inputStyle()}
                  data-testid="select-financial-entity-vat-regime"
                >
                  <option value="">-- Seleziona --</option>
                  {vatRegimes.map((vr: any) => (
                    <option key={vr.id} value={vr.id}>{vr.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>N. Iscrizione Albo Banche</label>
                <input
                  type="text"
                  value={formData.bankRegisterNumber}
                  onChange={(e) => handleFieldChange('bankRegisterNumber', e.target.value)}
                  placeholder="Es: 1234"
                  readOnly={isReadOnly}
                  style={inputStyle()}
                  data-testid="input-financial-entity-bank-register"
                />
              </div>
              <div>
                <label style={labelStyle}>Codice IVASS</label>
                <input
                  type="text"
                  value={formData.ivassCode}
                  onChange={(e) => handleFieldChange('ivassCode', e.target.value)}
                  placeholder="Es: A12345"
                  readOnly={isReadOnly}
                  style={inputStyle()}
                  data-testid="input-financial-entity-ivass"
                />
              </div>
            </div>
          )}

          {/* Sede Legale Section */}
          {activeSection === 'sede' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Via/Piazza</label>
                <input
                  type="text"
                  value={formData.registeredAddress.via}
                  onChange={(e) => handleAddressChange('via', e.target.value)}
                  placeholder="Es: Via Monte di Pietà"
                  readOnly={isReadOnly}
                  style={inputStyle()}
                  data-testid="input-financial-entity-address-via"
                />
              </div>
              <div>
                <label style={labelStyle}>Civico</label>
                <input
                  type="text"
                  value={formData.registeredAddress.civico}
                  onChange={(e) => handleAddressChange('civico', e.target.value)}
                  placeholder="Es: 7"
                  readOnly={isReadOnly}
                  style={inputStyle()}
                  data-testid="input-financial-entity-address-civico"
                />
              </div>
              <div>
                <label style={labelStyle}>CAP</label>
                <input
                  type="text"
                  value={formData.registeredAddress.cap}
                  onChange={(e) => handleAddressChange('cap', e.target.value.replace(/\D/g, '').slice(0, 5))}
                  placeholder="Es: 20121"
                  readOnly={isReadOnly}
                  style={inputStyle()}
                  data-testid="input-financial-entity-address-cap"
                />
              </div>
              <div>
                <label style={labelStyle}>Città</label>
                <input
                  type="text"
                  value={formData.registeredAddress.citta}
                  onChange={(e) => handleAddressChange('citta', e.target.value)}
                  placeholder="Es: Milano"
                  readOnly={isReadOnly}
                  style={inputStyle()}
                  data-testid="input-financial-entity-address-citta"
                />
              </div>
              <div>
                <label style={labelStyle}>Provincia</label>
                <input
                  type="text"
                  value={formData.registeredAddress.provincia}
                  onChange={(e) => handleAddressChange('provincia', e.target.value.toUpperCase().slice(0, 2))}
                  placeholder="Es: MI"
                  readOnly={isReadOnly}
                  style={inputStyle()}
                  data-testid="input-financial-entity-address-provincia"
                />
              </div>
              <div>
                <label style={labelStyle}>Paese</label>
                <input
                  type="text"
                  value={formData.registeredAddress.paese}
                  onChange={(e) => handleAddressChange('paese', e.target.value.toUpperCase().slice(0, 2))}
                  placeholder="IT"
                  readOnly={isReadOnly}
                  style={inputStyle()}
                  data-testid="input-financial-entity-address-paese"
                />
              </div>
            </div>
          )}

          {/* Dati Bancari Section */}
          {activeSection === 'bancario' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>IBAN</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={formData.iban}
                    onChange={(e) => handleFieldChange('iban', e.target.value.toUpperCase().replace(/\s/g, ''))}
                    placeholder="Es: IT60X0542811101000000123456"
                    readOnly={isReadOnly}
                    style={inputStyle(!!errors.iban, formData.iban && !errors.iban)}
                    data-testid="input-financial-entity-iban"
                  />
                  {formData.iban && !errors.iban && (
                    <CheckCircle size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#10b981' }} />
                  )}
                </div>
                {errors.iban && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.iban}</p>}
              </div>
              <div>
                <label style={labelStyle}>BIC/SWIFT</label>
                <input
                  type="text"
                  value={formData.bic}
                  onChange={(e) => handleFieldChange('bic', e.target.value.toUpperCase())}
                  placeholder="Es: BCITITMM"
                  readOnly={isReadOnly}
                  style={inputStyle()}
                  data-testid="input-financial-entity-bic"
                />
              </div>
              <div>
                <label style={labelStyle}>Nome Banca</label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => handleFieldChange('bankName', e.target.value)}
                  placeholder="Es: Intesa Sanpaolo"
                  readOnly={isReadOnly}
                  style={inputStyle()}
                  data-testid="input-financial-entity-bank-name"
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Intestatario Conto</label>
                <input
                  type="text"
                  value={formData.accountHolder}
                  onChange={(e) => handleFieldChange('accountHolder', e.target.value)}
                  placeholder="Es: Compass Banca S.p.A."
                  readOnly={isReadOnly}
                  style={inputStyle()}
                  data-testid="input-financial-entity-account-holder"
                />
              </div>
            </div>
          )}

          {/* Contatti Section */}
          {activeSection === 'contatti' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Telefono</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    placeholder="Es: +39 02 1234567"
                    readOnly={isReadOnly}
                    style={inputStyle(!!errors.phone, formData.phone && !errors.phone)}
                    data-testid="input-financial-entity-phone"
                  />
                  {formData.phone && !errors.phone && (
                    <CheckCircle size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#10b981' }} />
                  )}
                </div>
                {errors.phone && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.phone}</p>}
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleFieldChange('email', e.target.value.toLowerCase())}
                  placeholder="Es: info@compass.it"
                  readOnly={isReadOnly}
                  style={inputStyle()}
                  data-testid="input-financial-entity-email"
                />
              </div>
              <div>
                <label style={labelStyle}>PEC</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    value={formData.pec}
                    onChange={(e) => handleFieldChange('pec', e.target.value.toLowerCase())}
                    placeholder="Es: compass@legalmail.it"
                    readOnly={isReadOnly}
                    style={inputStyle(!!errors.pec, formData.pec && !errors.pec)}
                    data-testid="input-financial-entity-pec"
                  />
                  {formData.pec && !errors.pec && (
                    <CheckCircle size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#10b981' }} />
                  )}
                </div>
                {errors.pec && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.pec}</p>}
              </div>
              <div>
                <label style={labelStyle}>Sito Web</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleFieldChange('website', e.target.value)}
                  placeholder="Es: https://www.compass.it"
                  readOnly={isReadOnly}
                  style={inputStyle()}
                  data-testid="input-financial-entity-website"
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Note</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  placeholder="Note aggiuntive..."
                  rows={3}
                  readOnly={isReadOnly}
                  style={{ ...inputStyle(), resize: 'vertical' } as any}
                  data-testid="input-financial-entity-notes"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          background: '#fafafa'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: 'white',
              color: '#374151',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            {mode === 'view' ? 'Chiudi' : 'Annulla'}
          </button>
          {mode !== 'view' && !isBrandEntity && (
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: saving ? '#9ca3af' : 'linear-gradient(135deg, #059669, #10b981)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: saving ? 'not-allowed' : 'pointer'
              }}
              data-testid="button-save-financial-entity"
            >
              <Save size={16} />
              {saving ? 'Salvataggio...' : 'Salva'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
