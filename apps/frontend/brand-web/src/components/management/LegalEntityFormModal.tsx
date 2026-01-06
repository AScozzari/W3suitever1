import { useState, useEffect } from 'react';
import { 
  Building, FileText, MapPin, User, Briefcase, Phone, Mail, FileCheck
} from 'lucide-react';
import TabbedFormModal, { formStyles, TabSection } from '../ui/TabbedFormModal';
import { italianVatNumberSchema, italianTaxCodeSchema, pecEmailSchema } from '../../lib/validation/italian-business-validation';
import { z } from 'zod';

const sdiCodeSchema = z.string()
  .toUpperCase()
  .regex(/^[A-Z0-9]{7}$/, 'Codice SDI deve essere 7 caratteri alfanumerici maiuscoli');

interface LegalEntityFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  data: any | null;
  onClose: () => void;
  onSave: (entityData: any) => Promise<void>;
  legalForms?: any[];
}

const initialEntityData = {
  codice: '',
  nome: '',
  formaGiuridica: 'Srl',
  pIva: '',
  codiceFiscale: '',
  stato: 'Attiva',
  indirizzo: '',
  citta: '',
  cap: '',
  provincia: '',
  telefono: '',
  email: '',
  pec: '',
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
  refAmminPaese: 'Italia',
  note: ''
};

export default function LegalEntityFormModal({
  isOpen,
  mode,
  data,
  onClose,
  onSave,
  legalForms = []
}: LegalEntityFormModalProps) {
  const [formData, setFormData] = useState(initialEntityData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [fieldValidation, setFieldValidation] = useState<Record<string, 'valid' | 'invalid' | 'untouched'>>({});

  useEffect(() => {
    if (isOpen && data && (mode === 'edit' || mode === 'view')) {
      setFormData({
        codice: data.codice || data.code || '',
        nome: data.nome || data.name || '',
        formaGiuridica: data.formaGiuridica || data.legalForm || 'Srl',
        pIva: data.pIva || data.vatNumber || '',
        codiceFiscale: data.codiceFiscale || data.taxCode || '',
        stato: data.stato || data.status || 'Attiva',
        indirizzo: data.indirizzo || data.address || '',
        citta: data.citta || data.city || '',
        cap: data.cap || data.postalCode || '',
        provincia: data.provincia || data.province || '',
        telefono: data.telefono || data.phone || '',
        email: data.email || '',
        pec: data.pec || data.pecEmail || '',
        capitaleSociale: data.capitaleSociale || data.shareCapital || '',
        dataCostituzione: data.dataCostituzione || data.incorporationDate || '',
        rea: data.rea || '',
        registroImprese: data.registroImprese || data.businessRegister || '',
        logo: data.logo || '',
        codiceSDI: data.codiceSDI || data.sdiCode || '',
        refAmminNome: data.refAmminNome || '',
        refAmminCognome: data.refAmminCognome || '',
        refAmminEmail: data.refAmminEmail || '',
        refAmminCodiceFiscale: data.refAmminCodiceFiscale || '',
        refAmminIndirizzo: data.refAmminIndirizzo || '',
        refAmminCitta: data.refAmminCitta || '',
        refAmminCap: data.refAmminCap || '',
        refAmminPaese: data.refAmminPaese || 'Italia',
        note: data.note || data.notes || ''
      });
    } else if (isOpen && !data) {
      setFormData(initialEntityData);
    }
    setErrors({});
    setFieldValidation({});
  }, [isOpen, data, mode]);

  const validateField = (field: string, value: string) => {
    try {
      switch (field) {
        case 'pIva':
          if (value) italianVatNumberSchema.parse(value.replace(/^IT/i, ''));
          break;
        case 'codiceFiscale':
        case 'refAmminCodiceFiscale':
          if (value) italianTaxCodeSchema.parse(value.toUpperCase());
          break;
        case 'pec':
          if (value) pecEmailSchema.parse(value);
          break;
        case 'codiceSDI':
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

    if (!formData.nome.trim()) {
      setErrors({ general: 'Nome è obbligatorio' });
      return;
    }
    if (!formData.pIva.trim()) {
      setErrors({ general: 'Partita IVA è obbligatoria' });
      return;
    }
    if (!validateField('pIva', formData.pIva)) {
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
      icon: Building,
      content: (
        <div style={formStyles.grid(2)}>
          <div>
            <label style={formStyles.label}>Codice</label>
            <input
              type="text"
              value={formData.codice}
              onChange={(e) => setFormData({ ...formData, codice: e.target.value.toUpperCase() })}
              placeholder="Auto-generato se vuoto"
              readOnly={isReadOnly}
              style={inputStyle}
              data-testid="input-le-codice"
            />
          </div>
          <div>
            <label style={formStyles.label}>Ragione Sociale <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="es. Acme S.r.l."
              readOnly={isReadOnly}
              style={inputStyle}
              data-testid="input-le-nome"
            />
          </div>
          <div>
            <label style={formStyles.label}>Forma Giuridica</label>
            <select
              value={formData.formaGiuridica}
              onChange={(e) => setFormData({ ...formData, formaGiuridica: e.target.value })}
              disabled={isReadOnly}
              style={selectStyle}
              data-testid="select-le-forma"
            >
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
              value={formData.stato}
              onChange={(e) => setFormData({ ...formData, stato: e.target.value })}
              disabled={isReadOnly}
              style={selectStyle}
              data-testid="select-le-stato"
            >
              <option value="Attiva">Attiva</option>
              <option value="Sospesa">Sospesa</option>
              <option value="Cessata">Cessata</option>
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
                value={formData.pIva}
                onChange={(e) => setFormData({ ...formData, pIva: e.target.value.toUpperCase() })}
                onBlur={(e) => validateField('pIva', e.target.value)}
                placeholder="IT12345678901"
                readOnly={isReadOnly}
                style={getValidatedInputStyle('pIva')}
                data-testid="input-le-piva"
              />
            </div>
            <div>
              <label style={formStyles.label}>Codice Fiscale</label>
              <input
                type="text"
                value={formData.codiceFiscale}
                onChange={(e) => setFormData({ ...formData, codiceFiscale: e.target.value.toUpperCase() })}
                onBlur={(e) => validateField('codiceFiscale', e.target.value)}
                placeholder="RSSMRA80A01H501U o 12345678901"
                readOnly={isReadOnly}
                style={getValidatedInputStyle('codiceFiscale')}
                maxLength={16}
                data-testid="input-le-cf"
              />
            </div>
            <div>
              <label style={formStyles.label}>Codice SDI</label>
              <input
                type="text"
                value={formData.codiceSDI}
                onChange={(e) => setFormData({ ...formData, codiceSDI: e.target.value.toUpperCase() })}
                onBlur={(e) => validateField('codiceSDI', e.target.value)}
                placeholder="XXXXXXX"
                readOnly={isReadOnly}
                style={getValidatedInputStyle('codiceSDI')}
                maxLength={7}
                data-testid="input-le-sdi"
              />
            </div>
            <div>
              <label style={formStyles.label}>PEC</label>
              <input
                type="email"
                value={formData.pec}
                onChange={(e) => setFormData({ ...formData, pec: e.target.value.toLowerCase() })}
                onBlur={(e) => validateField('pec', e.target.value)}
                placeholder="azienda@pec.it"
                readOnly={isReadOnly}
                style={getValidatedInputStyle('pec')}
                data-testid="input-le-pec"
              />
            </div>
          </div>

          <h4 style={{ ...formStyles.sectionTitle, marginTop: '1.5rem' }}><Briefcase size={16} /> Dati Societari</h4>
          <div style={formStyles.grid(2)}>
            <div>
              <label style={formStyles.label}>Capitale Sociale</label>
              <input
                type="text"
                value={formData.capitaleSociale}
                onChange={(e) => setFormData({ ...formData, capitaleSociale: e.target.value })}
                placeholder="€ 10.000,00"
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-le-capitale"
              />
            </div>
            <div>
              <label style={formStyles.label}>Data Costituzione</label>
              <input
                type="date"
                value={formData.dataCostituzione}
                onChange={(e) => setFormData({ ...formData, dataCostituzione: e.target.value })}
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-le-costituzione"
              />
            </div>
            <div>
              <label style={formStyles.label}>REA</label>
              <input
                type="text"
                value={formData.rea}
                onChange={(e) => setFormData({ ...formData, rea: e.target.value })}
                placeholder="MI-1234567"
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-le-rea"
              />
            </div>
            <div>
              <label style={formStyles.label}>Registro Imprese</label>
              <input
                type="text"
                value={formData.registroImprese}
                onChange={(e) => setFormData({ ...formData, registroImprese: e.target.value })}
                placeholder="MI"
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-le-registro"
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={formStyles.label}>URL Logo</label>
              <input
                type="url"
                value={formData.logo}
                onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                placeholder="https://..."
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-le-logo"
              />
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
        <div>
          <div style={formStyles.grid(2)}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={formStyles.label}>Indirizzo</label>
              <input
                type="text"
                value={formData.indirizzo}
                onChange={(e) => setFormData({ ...formData, indirizzo: e.target.value })}
                placeholder="Via Roma, 123"
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-le-indirizzo"
              />
            </div>
            <div>
              <label style={formStyles.label}>Città</label>
              <input
                type="text"
                value={formData.citta}
                onChange={(e) => setFormData({ ...formData, citta: e.target.value })}
                placeholder="Milano"
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-le-citta"
              />
            </div>
            <div>
              <label style={formStyles.label}>CAP</label>
              <input
                type="text"
                value={formData.cap}
                onChange={(e) => setFormData({ ...formData, cap: e.target.value })}
                placeholder="20100"
                readOnly={isReadOnly}
                style={inputStyle}
                maxLength={5}
                data-testid="input-le-cap"
              />
            </div>
            <div>
              <label style={formStyles.label}>Provincia</label>
              <input
                type="text"
                value={formData.provincia}
                onChange={(e) => setFormData({ ...formData, provincia: e.target.value.toUpperCase().slice(0, 2) })}
                placeholder="MI"
                readOnly={isReadOnly}
                style={inputStyle}
                maxLength={2}
                data-testid="input-le-provincia"
              />
            </div>
          </div>

          <h4 style={{ ...formStyles.sectionTitle, marginTop: '1.5rem' }}><Phone size={16} /> Contatti Aziendali</h4>
          <div style={formStyles.grid(2)}>
            <div>
              <label style={formStyles.label}>Telefono</label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="+39 02 1234567"
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-le-telefono"
              />
            </div>
            <div>
              <label style={formStyles.label}>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
                placeholder="info@azienda.it"
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-le-email"
              />
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'referente',
      label: 'Referente',
      icon: User,
      content: (
        <div>
          <h4 style={formStyles.sectionTitle}><User size={16} /> Referente Amministrativo</h4>
          <div style={formStyles.grid(2)}>
            <div>
              <label style={formStyles.label}>Nome</label>
              <input
                type="text"
                value={formData.refAmminNome}
                onChange={(e) => setFormData({ ...formData, refAmminNome: e.target.value })}
                placeholder="Mario"
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-le-ref-nome"
              />
            </div>
            <div>
              <label style={formStyles.label}>Cognome</label>
              <input
                type="text"
                value={formData.refAmminCognome}
                onChange={(e) => setFormData({ ...formData, refAmminCognome: e.target.value })}
                placeholder="Rossi"
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-le-ref-cognome"
              />
            </div>
            <div>
              <label style={formStyles.label}>Email</label>
              <input
                type="email"
                value={formData.refAmminEmail}
                onChange={(e) => setFormData({ ...formData, refAmminEmail: e.target.value.toLowerCase() })}
                placeholder="mario.rossi@azienda.it"
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-le-ref-email"
              />
            </div>
            <div>
              <label style={formStyles.label}>Codice Fiscale</label>
              <input
                type="text"
                value={formData.refAmminCodiceFiscale}
                onChange={(e) => setFormData({ ...formData, refAmminCodiceFiscale: e.target.value.toUpperCase() })}
                onBlur={(e) => validateField('refAmminCodiceFiscale', e.target.value)}
                placeholder="RSSMRA80A01H501U"
                readOnly={isReadOnly}
                style={getValidatedInputStyle('refAmminCodiceFiscale')}
                maxLength={16}
                data-testid="input-le-ref-cf"
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={formStyles.label}>Indirizzo</label>
              <input
                type="text"
                value={formData.refAmminIndirizzo}
                onChange={(e) => setFormData({ ...formData, refAmminIndirizzo: e.target.value })}
                placeholder="Via..."
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-le-ref-indirizzo"
              />
            </div>
            <div>
              <label style={formStyles.label}>Città</label>
              <input
                type="text"
                value={formData.refAmminCitta}
                onChange={(e) => setFormData({ ...formData, refAmminCitta: e.target.value })}
                placeholder="Milano"
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-le-ref-citta"
              />
            </div>
            <div>
              <label style={formStyles.label}>CAP</label>
              <input
                type="text"
                value={formData.refAmminCap}
                onChange={(e) => setFormData({ ...formData, refAmminCap: e.target.value })}
                placeholder="20100"
                readOnly={isReadOnly}
                style={inputStyle}
                maxLength={5}
                data-testid="input-le-ref-cap"
              />
            </div>
            <div>
              <label style={formStyles.label}>Paese</label>
              <select
                value={formData.refAmminPaese}
                onChange={(e) => setFormData({ ...formData, refAmminPaese: e.target.value })}
                disabled={isReadOnly}
                style={selectStyle}
                data-testid="select-le-ref-paese"
              >
                <option value="Italia">Italia</option>
                <option value="San Marino">San Marino</option>
                <option value="Svizzera">Svizzera</option>
              </select>
            </div>
          </div>

          <h4 style={{ ...formStyles.sectionTitle, marginTop: '1.5rem' }}><FileCheck size={16} /> Note</h4>
          <textarea
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            placeholder="Note aggiuntive..."
            rows={4}
            readOnly={isReadOnly}
            style={formStyles.textarea(isReadOnly)}
            data-testid="textarea-le-note"
          />
        </div>
      )
    }
  ];

  return (
    <TabbedFormModal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Nuova Ragione Sociale' : mode === 'edit' ? 'Modifica Ragione Sociale' : 'Dettagli Ragione Sociale'}
      subtitle={data ? (data.nome || data.name) : undefined}
      icon={Building}
      iconGradient="linear-gradient(135deg, #FF6900, #ff8533)"
      tabs={tabs}
      onSave={handleSave}
      saveLabel="Salva Ragione Sociale"
      saving={saving}
      isReadOnly={isReadOnly}
      error={errors.general}
    />
  );
}
