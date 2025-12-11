import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Building2, FileText, MapPin, Phone, CreditCard, FileCheck, Mail, Globe
} from 'lucide-react';
import TabbedFormModal, { formStyles, TabSection } from '../ui/TabbedFormModal';
import { StandardCityField, StandardCapField, StandardEmailField, StandardCodiceFiscaleField } from '../Leave/forms/StandardFields';
import { 
  italianVatNumberSchema, italianTaxCodeSchema, pecEmailSchema, ibanSchema, websiteUrlSchema 
} from '../../lib/validation/italian-business-validation';
import { z } from 'zod';

const sdiCodeSchema = z.string()
  .toUpperCase()
  .regex(/^[A-Z0-9]{7}$/, 'Codice SDI deve essere 7 caratteri alfanumerici maiuscoli');

interface SupplierFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  data: any | null;
  onClose: () => void;
  onSave: (supplierData: any) => Promise<void>;
  legalForms: any[];
  paymentMethods: any[];
  paymentConditions: any[];
  vatRegimes: any[];
}

const initialSupplierData = {
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
  withholdingTax: false,
  preferredPaymentMethodId: '',
  paymentConditionId: '',
  vatRegimeId: '',
  notes: ''
};

export default function SupplierFormModal({
  isOpen,
  mode,
  data,
  onClose,
  onSave,
  legalForms,
  paymentMethods,
  paymentConditions,
  vatRegimes
}: SupplierFormModalProps) {
  const [formData, setFormData] = useState(initialSupplierData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [fieldValidation, setFieldValidation] = useState<Record<string, 'valid' | 'invalid' | 'untouched'>>({});

  useEffect(() => {
    if (isOpen && data && (mode === 'edit' || mode === 'view')) {
      setFormData({
        code: data.code || '',
        name: data.name || '',
        legalName: data.legal_name || data.legalName || '',
        legalForm: data.legal_form || data.legalForm || '',
        vatNumber: data.vat_number || data.vatNumber || '',
        taxCode: data.tax_code || data.taxCode || '',
        status: data.status || 'active',
        address: data.registeredAddress?.via || data.address || '',
        city: data.registeredAddress?.citta || data.city || '',
        province: data.registeredAddress?.provincia || data.province || '',
        postalCode: data.registeredAddress?.cap || data.postalCode || '',
        country: data.country || 'Italia',
        email: data.email || '',
        phone: data.phone || '',
        website: data.website || '',
        pecEmail: data.pec_email || data.pecEmail || '',
        sdiCode: data.sdi_code || data.sdiCode || '',
        iban: data.iban || '',
        bic: data.bic || '',
        withholdingTax: data.withholding_tax || data.withholdingTax || false,
        preferredPaymentMethodId: data.preferred_payment_method_id || data.preferredPaymentMethodId || '',
        paymentConditionId: data.payment_condition_id || data.paymentConditionId || '',
        vatRegimeId: data.vat_regime_id || data.vatRegimeId || '',
        notes: data.notes || ''
      });
    } else if (isOpen && !data) {
      setFormData(initialSupplierData);
    }
    setErrors({});
    setFieldValidation({});
  }, [isOpen, data, mode]);

  const validateField = (field: string, value: string) => {
    try {
      switch (field) {
        case 'vatNumber':
          if (value) italianVatNumberSchema.parse(value.replace(/^IT/i, ''));
          break;
        case 'taxCode':
          if (value) italianTaxCodeSchema.parse(value.toUpperCase());
          break;
        case 'pecEmail':
          if (value) pecEmailSchema.parse(value);
          break;
        case 'iban':
          if (value) ibanSchema.parse(value);
          break;
        case 'website':
          if (value) websiteUrlSchema.parse(value);
          break;
        case 'email':
          if (value) z.string().email().parse(value);
          break;
        case 'sdiCode':
          if (value) sdiCodeSchema.parse(value.toUpperCase());
          break;
      }
      setFieldValidation(prev => ({ ...prev, [field]: value ? 'valid' : 'untouched' }));
      return true;
    } catch (e: any) {
      setFieldValidation(prev => ({ ...prev, [field]: 'invalid' }));
      return false;
    }
  };

  const handleSave = async () => {
    if (mode === 'view') return;

    if (!formData.name.trim()) {
      setErrors({ general: 'Nome è obbligatorio' });
      return;
    }
    if (!formData.vatNumber.trim()) {
      setErrors({ general: 'Partita IVA è obbligatoria' });
      return;
    }
    if (!validateField('vatNumber', formData.vatNumber)) {
      setErrors({ general: 'Partita IVA non valida' });
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error: any) {
      setErrors({ general: error.message || 'Errore durante il salvataggio' });
    } finally {
      setSaving(false);
    }
  };

  const isReadOnly = mode === 'view';
  const inputStyle = formStyles.input(false, false, isReadOnly);
  const selectStyle = formStyles.select(isReadOnly);

  const getValidatedInputStyle = (field: string) => {
    const state = fieldValidation[field];
    return formStyles.input(state === 'invalid', state === 'valid', isReadOnly);
  };

  const tabs: TabSection[] = [
    {
      id: 'anagrafica',
      label: 'Anagrafica',
      icon: Building2,
      content: (
        <div style={formStyles.grid(2)}>
          <div>
            <label style={formStyles.label}>Codice Fornitore</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="FOR001"
              readOnly={isReadOnly}
              style={inputStyle}
              data-testid="input-supplier-code"
            />
          </div>
          <div>
            <label style={formStyles.label}>Nome <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nome commerciale"
              readOnly={isReadOnly}
              style={inputStyle}
              data-testid="input-supplier-name"
            />
          </div>
          <div>
            <label style={formStyles.label}>Ragione Sociale</label>
            <input
              type="text"
              value={formData.legalName}
              onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
              placeholder="Ragione sociale completa"
              readOnly={isReadOnly}
              style={inputStyle}
              data-testid="input-supplier-legal-name"
            />
          </div>
          <div>
            <label style={formStyles.label}>Forma Giuridica</label>
            <select
              value={formData.legalForm}
              onChange={(e) => setFormData({ ...formData, legalForm: e.target.value })}
              disabled={isReadOnly}
              style={selectStyle}
              data-testid="select-supplier-legal-form"
            >
              <option value="">-- Seleziona --</option>
              {legalForms.length > 0 ? (
                legalForms.map((lf: any) => (
                  <option key={lf.code || lf.id} value={lf.code || lf.abbreviation}>{lf.name || lf.label}</option>
                ))
              ) : (
                <>
                  <option value="Srl">S.r.l.</option>
                  <option value="Spa">S.p.A.</option>
                  <option value="Sas">S.a.s.</option>
                  <option value="Snc">S.n.c.</option>
                  <option value="DI">Ditta Individuale</option>
                </>
              )}
            </select>
          </div>
          <div>
            <label style={formStyles.label}>Stato</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              disabled={isReadOnly}
              style={selectStyle}
              data-testid="select-supplier-status"
            >
              <option value="active">Attivo</option>
              <option value="inactive">Inattivo</option>
              <option value="pending">In Attesa</option>
              <option value="suspended">Sospeso</option>
            </select>
          </div>
        </div>
      )
    },
    {
      id: 'fiscale',
      label: 'Dati Fiscali',
      icon: FileText,
      content: (
        <div>
          <div style={formStyles.grid(2)}>
            <div>
              <label style={formStyles.label}>Partita IVA <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="text"
                value={formData.vatNumber}
                onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value.toUpperCase() })}
                onBlur={(e) => validateField('vatNumber', e.target.value)}
                placeholder="IT12345678901"
                readOnly={isReadOnly}
                style={getValidatedInputStyle('vatNumber')}
                data-testid="input-supplier-vat"
              />
            </div>
            <div>
              <label style={formStyles.label}>Codice Fiscale</label>
              <input
                type="text"
                value={formData.taxCode}
                onChange={(e) => setFormData({ ...formData, taxCode: e.target.value.toUpperCase() })}
                onBlur={(e) => validateField('taxCode', e.target.value)}
                placeholder="RSSMRA80A01H501U"
                readOnly={isReadOnly}
                style={getValidatedInputStyle('taxCode')}
                maxLength={16}
                data-testid="input-supplier-tax-code"
              />
            </div>
            <div>
              <label style={formStyles.label}>Codice SDI</label>
              <input
                type="text"
                value={formData.sdiCode}
                onChange={(e) => setFormData({ ...formData, sdiCode: e.target.value.toUpperCase() })}
                onBlur={(e) => validateField('sdiCode', e.target.value)}
                placeholder="XXXXXXX"
                readOnly={isReadOnly}
                style={getValidatedInputStyle('sdiCode')}
                maxLength={7}
                data-testid="input-supplier-sdi"
              />
            </div>
            <div>
              <label style={formStyles.label}>Regime IVA</label>
              <select
                value={formData.vatRegimeId}
                onChange={(e) => setFormData({ ...formData, vatRegimeId: e.target.value })}
                disabled={isReadOnly}
                style={selectStyle}
                data-testid="select-supplier-vat-regime"
              >
                <option value="">-- Seleziona --</option>
                {vatRegimes.map((regime: any) => (
                  <option key={regime.id} value={regime.id}>
                    {regime.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={formStyles.checkbox}>
                <input
                  type="checkbox"
                  checked={formData.withholdingTax}
                  onChange={(e) => setFormData({ ...formData, withholdingTax: e.target.checked })}
                  disabled={isReadOnly}
                  style={{ width: '18px', height: '18px' }}
                />
                Ritenuta d'Acconto (trattenuta sui compensi professionali)
              </label>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'sede',
      label: 'Sede Legale',
      icon: MapPin,
      content: (
        <div style={formStyles.grid(2)}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={formStyles.label}>Indirizzo</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Via Roma, 123"
              readOnly={isReadOnly}
              style={inputStyle}
              data-testid="input-supplier-address"
            />
          </div>
          <div>
            <label style={formStyles.label}>Città</label>
            <StandardCityField
              value={formData.city}
              onChange={(val) => setFormData({ ...formData, city: val })}
              onCapChange={(cap) => setFormData(prev => ({ ...prev, postalCode: cap }))}
              onProvinciaChange={(provincia) => setFormData(prev => ({ ...prev, province: provincia }))}
            />
          </div>
          <div>
            <label style={formStyles.label}>CAP</label>
            <StandardCapField
              value={formData.postalCode}
              onChange={(val) => setFormData({ ...formData, postalCode: val })}
            />
          </div>
          <div>
            <label style={formStyles.label}>Provincia</label>
            <input
              type="text"
              value={formData.province}
              onChange={(e) => setFormData({ ...formData, province: e.target.value.toUpperCase().slice(0, 2) })}
              placeholder="MI"
              readOnly={isReadOnly}
              style={inputStyle}
              maxLength={2}
              data-testid="input-supplier-province"
            />
          </div>
          <div>
            <label style={formStyles.label}>Paese</label>
            <select
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              disabled={isReadOnly}
              style={selectStyle}
              data-testid="select-supplier-country"
            >
              <option value="Italia">Italia</option>
              <option value="San Marino">San Marino</option>
              <option value="Svizzera">Svizzera</option>
              <option value="Germania">Germania</option>
              <option value="Francia">Francia</option>
            </select>
          </div>
        </div>
      )
    },
    {
      id: 'pagamenti',
      label: 'Pagamenti',
      icon: CreditCard,
      content: (
        <div>
          <div style={formStyles.grid(2)}>
            <div>
              <label style={formStyles.label}>Metodo di Pagamento</label>
              <select
                value={formData.preferredPaymentMethodId}
                onChange={(e) => setFormData({ ...formData, preferredPaymentMethodId: e.target.value })}
                disabled={isReadOnly}
                style={selectStyle}
                data-testid="select-supplier-payment-method"
              >
                <option value="">-- Seleziona --</option>
                {paymentMethods.map((method: any) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={formStyles.label}>Condizioni di Pagamento</label>
              <select
                value={formData.paymentConditionId}
                onChange={(e) => setFormData({ ...formData, paymentConditionId: e.target.value })}
                disabled={isReadOnly}
                style={selectStyle}
                data-testid="select-supplier-payment-condition"
              >
                <option value="">-- Seleziona --</option>
                {paymentConditions.map((cond: any) => (
                  <option key={cond.id} value={cond.id}>
                    {cond.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={formStyles.label}>IBAN</label>
              <input
                type="text"
                value={formData.iban}
                onChange={(e) => setFormData({ ...formData, iban: e.target.value.toUpperCase().replace(/\s/g, '') })}
                onBlur={(e) => validateField('iban', e.target.value)}
                placeholder="IT60X0542811101000000123456"
                readOnly={isReadOnly}
                style={getValidatedInputStyle('iban')}
                data-testid="input-supplier-iban"
              />
            </div>
            <div>
              <label style={formStyles.label}>BIC/SWIFT</label>
              <input
                type="text"
                value={formData.bic}
                onChange={(e) => setFormData({ ...formData, bic: e.target.value.toUpperCase() })}
                placeholder="UNCRITM1XXX"
                readOnly={isReadOnly}
                style={inputStyle}
                maxLength={11}
                data-testid="input-supplier-bic"
              />
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'contatti',
      label: 'Contatti',
      icon: Phone,
      content: (
        <div>
          <div style={formStyles.grid(2)}>
            <div>
              <label style={formStyles.label}><Mail size={14} style={{ display: 'inline', marginRight: '4px' }} /> Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
                onBlur={(e) => validateField('email', e.target.value)}
                placeholder="fornitore@example.com"
                readOnly={isReadOnly}
                style={getValidatedInputStyle('email')}
                data-testid="input-supplier-email"
              />
            </div>
            <div>
              <label style={formStyles.label}><Mail size={14} style={{ display: 'inline', marginRight: '4px' }} /> PEC</label>
              <input
                type="email"
                value={formData.pecEmail}
                onChange={(e) => setFormData({ ...formData, pecEmail: e.target.value.toLowerCase() })}
                onBlur={(e) => validateField('pecEmail', e.target.value)}
                placeholder="fornitore@pec.it"
                readOnly={isReadOnly}
                style={getValidatedInputStyle('pecEmail')}
                data-testid="input-supplier-pec"
              />
            </div>
            <div>
              <label style={formStyles.label}><Phone size={14} style={{ display: 'inline', marginRight: '4px' }} /> Telefono</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+39 02 1234567"
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-supplier-phone"
              />
            </div>
            <div>
              <label style={formStyles.label}><Globe size={14} style={{ display: 'inline', marginRight: '4px' }} /> Sito Web</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                onBlur={(e) => validateField('website', e.target.value)}
                placeholder="https://www.example.com"
                readOnly={isReadOnly}
                style={getValidatedInputStyle('website')}
                data-testid="input-supplier-website"
              />
            </div>
          </div>

          <h4 style={{ ...formStyles.sectionTitle, marginTop: '24px' }}><FileCheck size={16} /> Note</h4>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Note interne sul fornitore..."
            rows={4}
            readOnly={isReadOnly}
            style={formStyles.textarea(isReadOnly)}
            data-testid="textarea-supplier-notes"
          />
        </div>
      )
    }
  ];

  return (
    <TabbedFormModal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Nuovo Fornitore' : mode === 'edit' ? 'Modifica Fornitore' : 'Dettagli Fornitore'}
      subtitle={data ? (data.name || data.legal_name) : undefined}
      icon={Building2}
      iconGradient="linear-gradient(135deg, #8b5cf6, #7c3aed)"
      tabs={tabs}
      onSave={handleSave}
      saveLabel="Salva Fornitore"
      saving={saving}
      isReadOnly={isReadOnly}
      error={errors.general}
    />
  );
}
