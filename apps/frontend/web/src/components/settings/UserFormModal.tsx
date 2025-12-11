import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  User, Lock, UserCircle, Phone, MapPin, FileText, 
  Settings, Briefcase, Headphones, CheckCircle, Eye, EyeOff
} from 'lucide-react';
import TabbedFormModal, { formStyles, TabSection } from '../ui/TabbedFormModal';
import AvatarSelector from '../AvatarSelector';
import { 
  StandardEmailField, StandardCityField, StandardCapField,
  StandardCodiceFiscaleField
} from '../Leave/forms/StandardFields';

interface UserFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  data: any | null;
  onClose: () => void;
  onSave: (userData: any) => Promise<void>;
  legalEntities: any[];
  stores: any[];
  roles: any[];
  commercialAreas: any[];
  voipExtensions: any[];
}

const initialUserData = {
  username: '',
  password: '',
  confirmPassword: '',
  ruolo: '',
  cambioPasswordObbligatorio: true,
  ragioneSociale_id: null as number | null,
  puntiVendita_ids: [] as number[],
  puntoVenditaPreferito_id: null as number | null,
  nome: '',
  cognome: '',
  avatar: { url: null as string | null, blob: null as Blob | null, type: 'upload' as 'upload' | 'generated' },
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
  extension: {
    enabled: false,
    extNumber: '',
    sipDomain: '',
    classOfService: 'internal',
    voicemailEnabled: false,
    storeId: null as number | null
  },
  note: ''
};

export default function UserFormModal({
  isOpen,
  mode,
  data,
  onClose,
  onSave,
  legalEntities,
  stores,
  roles,
  commercialAreas,
  voipExtensions
}: UserFormModalProps) {
  const [formData, setFormData] = useState(initialUserData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen && data && (mode === 'edit' || mode === 'view')) {
      setFormData({
        username: data.username || '',
        password: '',
        confirmPassword: '',
        ruolo: data.ruolo || data.role || '',
        cambioPasswordObbligatorio: data.cambioPasswordObbligatorio ?? true,
        ragioneSociale_id: data.ragioneSociale_id || data.legalEntityId || null,
        puntiVendita_ids: data.puntiVendita_ids || data.storeIds || [],
        puntoVenditaPreferito_id: data.puntoVenditaPreferito_id || data.primaryStoreId || null,
        nome: data.nome || data.firstName || '',
        cognome: data.cognome || data.lastName || '',
        avatar: { url: data.avatar?.url || data.avatarUrl || null, blob: null, type: 'upload' },
        codiceFiscale: data.codiceFiscale || data.fiscalCode || '',
        dataNascita: data.dataNascita || data.birthDate || '',
        luogoNascita: data.luogoNascita || data.birthPlace || '',
        sesso: data.sesso || data.gender || 'M',
        email: data.email || '',
        emailPersonale: data.emailPersonale || data.personalEmail || '',
        telefono: data.telefono || data.phone || '',
        telefonoAziendale: data.telefonoAziendale || data.workPhone || '',
        via: data.via || data.address?.via || '',
        civico: data.civico || data.address?.civico || '',
        citta: data.citta || data.address?.city || '',
        cap: data.cap || data.address?.postalCode || '',
        provincia: data.provincia || data.address?.province || '',
        paese: data.paese || data.address?.country || 'Italia',
        scopeLevel: data.scopeLevel || 'organizzazione',
        selectAllLegalEntities: data.selectAllLegalEntities || false,
        selectedAreas: data.selectedAreas || [],
        selectedLegalEntities: data.selectedLegalEntities || [],
        selectedStores: data.selectedStores || [],
        tipoDocumento: data.tipoDocumento || data.documentType || 'Carta Identità',
        numeroDocumento: data.numeroDocumento || data.documentNumber || '',
        dataScadenzaDocumento: data.dataScadenzaDocumento || data.documentExpiry || '',
        stato: data.stato || data.status || 'Attivo',
        dataInizioValidita: data.dataInizioValidita || data.validFrom || '',
        dataFineValidita: data.dataFineValidita || data.validUntil || '',
        notificheEmail: data.notificheEmail ?? data.emailNotifications ?? true,
        notificheSMS: data.notificheSMS ?? data.smsNotifications ?? false,
        lingua: data.lingua || data.language || 'it',
        fuso: data.fuso || data.timezone || 'Europe/Rome',
        tipoContratto: data.tipoContratto || data.contractType || 'Indeterminato',
        dataAssunzione: data.dataAssunzione || data.hireDate || '',
        livello: data.livello || data.level || '',
        ccnl: data.ccnl || 'Commercio',
        oreLavoro: data.oreLavoro || data.workHours || '40',
        extension: {
          enabled: data.extension?.enabled || false,
          extNumber: data.extension?.extNumber || '',
          sipDomain: data.extension?.sipDomain || '',
          classOfService: data.extension?.classOfService || 'internal',
          voicemailEnabled: data.extension?.voicemailEnabled || false,
          storeId: data.extension?.storeId || null
        },
        note: data.note || data.notes || ''
      });
    } else if (isOpen && !data) {
      setFormData(initialUserData);
    }
    setErrors({});
  }, [isOpen, data, mode]);

  const handleSave = async () => {
    if (mode === 'view') return;

    if (!formData.nome.trim() || !formData.cognome.trim()) {
      setErrors({ general: 'Nome e Cognome sono obbligatori' });
      return;
    }
    if (!formData.email.trim()) {
      setErrors({ general: 'Email è obbligatoria' });
      return;
    }
    if (mode === 'create' && !formData.username.trim()) {
      setErrors({ general: 'Username è obbligatorio' });
      return;
    }
    if (mode === 'create' && formData.password !== formData.confirmPassword) {
      setErrors({ general: 'Le password non coincidono' });
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

  const tabs: TabSection[] = [
    {
      id: 'credenziali',
      label: 'Credenziali',
      icon: Lock,
      content: (
        <div style={formStyles.grid(2)}>
          <div>
            <label style={formStyles.label}>Username {mode === 'create' && <span style={{ color: '#ef4444' }}>*</span>}</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="es. mario.rossi"
              readOnly={isReadOnly || mode === 'edit'}
              style={inputStyle}
              data-testid="input-user-username"
            />
          </div>
          <div>
            <label style={formStyles.label}>Ruolo</label>
            <select
              value={formData.ruolo}
              onChange={(e) => setFormData({ ...formData, ruolo: e.target.value })}
              disabled={isReadOnly}
              style={selectStyle}
              data-testid="select-user-role"
            >
              <option value="">-- Seleziona --</option>
              {roles.map((r: any) => (
                <option key={r.code || r.id} value={r.code || r.id}>{r.name || r.label}</option>
              ))}
            </select>
          </div>
          {mode === 'create' && (
            <>
              <div>
                <label style={formStyles.label}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    style={{ ...inputStyle, paddingRight: '40px' }}
                    data-testid="input-user-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label style={formStyles.label}>Conferma Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  style={inputStyle}
                  data-testid="input-user-confirm-password"
                />
              </div>
            </>
          )}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={formStyles.checkbox}>
              <input
                type="checkbox"
                checked={formData.cambioPasswordObbligatorio}
                onChange={(e) => setFormData({ ...formData, cambioPasswordObbligatorio: e.target.checked })}
                disabled={isReadOnly}
                style={{ width: '18px', height: '18px' }}
              />
              Richiedi cambio password al primo accesso
            </label>
          </div>
        </div>
      )
    },
    {
      id: 'anagrafica',
      label: 'Anagrafica',
      icon: UserCircle,
      content: (
        <div>
          <div style={{ display: 'flex', gap: '24px', marginBottom: '20px' }}>
            <div style={{ flexShrink: 0 }}>
              <AvatarSelector
                currentAvatarUrl={formData.avatar.url || undefined}
                onAvatarChange={(avatarData) => setFormData({ 
                  ...formData, 
                  avatar: { url: avatarData.url || null, blob: avatarData.blob || null, type: avatarData.type }
                })}
                firstName={formData.nome}
                lastName={formData.cognome}
                size={80}
              />
            </div>
            <div style={{ flex: 1, ...formStyles.grid(2) }}>
              <div>
                <label style={formStyles.label}>Nome <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Mario"
                  readOnly={isReadOnly}
                  style={inputStyle}
                  data-testid="input-user-nome"
                />
              </div>
              <div>
                <label style={formStyles.label}>Cognome <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  value={formData.cognome}
                  onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                  placeholder="Rossi"
                  readOnly={isReadOnly}
                  style={inputStyle}
                  data-testid="input-user-cognome"
                />
              </div>
            </div>
          </div>
          <div style={formStyles.grid(2)}>
            <div>
              <label style={formStyles.label}>Codice Fiscale</label>
              <StandardCodiceFiscaleField
                value={formData.codiceFiscale}
                onChange={(val) => setFormData({ ...formData, codiceFiscale: val })}
              />
            </div>
            <div>
              <label style={formStyles.label}>Sesso</label>
              <select
                value={formData.sesso}
                onChange={(e) => setFormData({ ...formData, sesso: e.target.value })}
                disabled={isReadOnly}
                style={selectStyle}
                data-testid="select-user-sesso"
              >
                <option value="M">Maschio</option>
                <option value="F">Femmina</option>
                <option value="X">Non specificato</option>
              </select>
            </div>
            <div>
              <label style={formStyles.label}>Data di Nascita</label>
              <input
                type="date"
                value={formData.dataNascita}
                onChange={(e) => setFormData({ ...formData, dataNascita: e.target.value })}
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-user-data-nascita"
              />
            </div>
            <div>
              <label style={formStyles.label}>Luogo di Nascita</label>
              <input
                type="text"
                value={formData.luogoNascita}
                onChange={(e) => setFormData({ ...formData, luogoNascita: e.target.value })}
                placeholder="Roma"
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-user-luogo-nascita"
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
          <h4 style={formStyles.sectionTitle}><Phone size={16} /> Recapiti</h4>
          <div style={formStyles.grid(2)}>
            <div>
              <label style={formStyles.label}>Email Aziendale <span style={{ color: '#ef4444' }}>*</span></label>
              <StandardEmailField
                value={formData.email}
                onChange={(val) => setFormData({ ...formData, email: val })}
                required
              />
            </div>
            <div>
              <label style={formStyles.label}>Email Personale</label>
              <StandardEmailField
                value={formData.emailPersonale}
                onChange={(val) => setFormData({ ...formData, emailPersonale: val })}
              />
            </div>
            <div>
              <label style={formStyles.label}>Telefono</label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="+39 333 1234567"
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-user-telefono"
              />
            </div>
            <div>
              <label style={formStyles.label}>Telefono Aziendale</label>
              <input
                type="tel"
                value={formData.telefonoAziendale}
                onChange={(e) => setFormData({ ...formData, telefonoAziendale: e.target.value })}
                placeholder="+39 02 1234567"
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-user-telefono-aziendale"
              />
            </div>
          </div>

          <h4 style={{ ...formStyles.sectionTitle, marginTop: '24px' }}><MapPin size={16} /> Indirizzo</h4>
          <div style={formStyles.grid(2)}>
            <div>
              <label style={formStyles.label}>Via</label>
              <input
                type="text"
                value={formData.via}
                onChange={(e) => setFormData({ ...formData, via: e.target.value })}
                placeholder="Via Roma"
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-user-via"
              />
            </div>
            <div>
              <label style={formStyles.label}>Civico</label>
              <input
                type="text"
                value={formData.civico}
                onChange={(e) => setFormData({ ...formData, civico: e.target.value })}
                placeholder="123"
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-user-civico"
              />
            </div>
            <div>
              <label style={formStyles.label}>Città</label>
              <StandardCityField
                value={formData.citta}
                onChange={(val) => setFormData({ ...formData, citta: val })}
                onCapChange={(cap) => setFormData(prev => ({ ...prev, cap }))}
                onProvinciaChange={(provincia) => setFormData(prev => ({ ...prev, provincia }))}
              />
            </div>
            <div>
              <label style={formStyles.label}>CAP</label>
              <StandardCapField
                value={formData.cap}
                onChange={(val) => setFormData({ ...formData, cap: val })}
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
                data-testid="input-user-provincia"
              />
            </div>
            <div>
              <label style={formStyles.label}>Paese</label>
              <select
                value={formData.paese}
                onChange={(e) => setFormData({ ...formData, paese: e.target.value })}
                disabled={isReadOnly}
                style={selectStyle}
                data-testid="select-user-paese"
              >
                <option value="Italia">Italia</option>
                <option value="San Marino">San Marino</option>
                <option value="Svizzera">Svizzera</option>
                <option value="Città del Vaticano">Città del Vaticano</option>
              </select>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'documenti',
      label: 'Documenti',
      icon: FileText,
      content: (
        <div style={formStyles.grid(2)}>
          <div>
            <label style={formStyles.label}>Tipo Documento</label>
            <select
              value={formData.tipoDocumento}
              onChange={(e) => setFormData({ ...formData, tipoDocumento: e.target.value })}
              disabled={isReadOnly}
              style={selectStyle}
              data-testid="select-user-tipo-documento"
            >
              <option value="Carta Identità">Carta d'Identità</option>
              <option value="Patente">Patente di Guida</option>
              <option value="Passaporto">Passaporto</option>
              <option value="Permesso Soggiorno">Permesso di Soggiorno</option>
            </select>
          </div>
          <div>
            <label style={formStyles.label}>Numero Documento</label>
            <input
              type="text"
              value={formData.numeroDocumento}
              onChange={(e) => setFormData({ ...formData, numeroDocumento: e.target.value.toUpperCase() })}
              placeholder="AA1234567"
              readOnly={isReadOnly}
              style={inputStyle}
              data-testid="input-user-numero-documento"
            />
          </div>
          <div>
            <label style={formStyles.label}>Data Scadenza Documento</label>
            <input
              type="date"
              value={formData.dataScadenzaDocumento}
              onChange={(e) => setFormData({ ...formData, dataScadenzaDocumento: e.target.value })}
              readOnly={isReadOnly}
              style={inputStyle}
              data-testid="input-user-scadenza-documento"
            />
          </div>
        </div>
      )
    },
    {
      id: 'account',
      label: 'Account',
      icon: Settings,
      content: (
        <div>
          <h4 style={formStyles.sectionTitle}><Settings size={16} /> Stato Account</h4>
          <div style={formStyles.grid(2)}>
            <div>
              <label style={formStyles.label}>Stato</label>
              <select
                value={formData.stato}
                onChange={(e) => setFormData({ ...formData, stato: e.target.value })}
                disabled={isReadOnly}
                style={selectStyle}
                data-testid="select-user-stato"
              >
                <option value="Attivo">Attivo</option>
                <option value="Sospeso">Sospeso</option>
                <option value="Disattivo">Disattivo</option>
              </select>
            </div>
            <div>
              <label style={formStyles.label}>Lingua</label>
              <select
                value={formData.lingua}
                onChange={(e) => setFormData({ ...formData, lingua: e.target.value })}
                disabled={isReadOnly}
                style={selectStyle}
                data-testid="select-user-lingua"
              >
                <option value="it">Italiano</option>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="fr">Français</option>
              </select>
            </div>
            <div>
              <label style={formStyles.label}>Fuso Orario</label>
              <select
                value={formData.fuso}
                onChange={(e) => setFormData({ ...formData, fuso: e.target.value })}
                disabled={isReadOnly}
                style={selectStyle}
                data-testid="select-user-fuso"
              >
                <option value="Europe/Rome">Europe/Rome (CET)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="America/New_York">America/New_York (EST)</option>
              </select>
            </div>
            <div>
              <label style={formStyles.label}>Data Inizio Validità</label>
              <input
                type="date"
                value={formData.dataInizioValidita}
                onChange={(e) => setFormData({ ...formData, dataInizioValidita: e.target.value })}
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-user-data-inizio"
              />
            </div>
            <div>
              <label style={formStyles.label}>Data Fine Validità</label>
              <input
                type="date"
                value={formData.dataFineValidita}
                onChange={(e) => setFormData({ ...formData, dataFineValidita: e.target.value })}
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-user-data-fine"
              />
            </div>
          </div>

          <h4 style={{ ...formStyles.sectionTitle, marginTop: '24px' }}>Notifiche</h4>
          <div style={{ display: 'flex', gap: '24px' }}>
            <label style={formStyles.checkbox}>
              <input
                type="checkbox"
                checked={formData.notificheEmail}
                onChange={(e) => setFormData({ ...formData, notificheEmail: e.target.checked })}
                disabled={isReadOnly}
                style={{ width: '18px', height: '18px' }}
              />
              Notifiche Email
            </label>
            <label style={formStyles.checkbox}>
              <input
                type="checkbox"
                checked={formData.notificheSMS}
                onChange={(e) => setFormData({ ...formData, notificheSMS: e.target.checked })}
                disabled={isReadOnly}
                style={{ width: '18px', height: '18px' }}
              />
              Notifiche SMS
            </label>
          </div>

          <h4 style={{ ...formStyles.sectionTitle, marginTop: '24px' }}><Briefcase size={16} /> Contratto</h4>
          <div style={formStyles.grid(2)}>
            <div>
              <label style={formStyles.label}>Tipo Contratto</label>
              <select
                value={formData.tipoContratto}
                onChange={(e) => setFormData({ ...formData, tipoContratto: e.target.value })}
                disabled={isReadOnly}
                style={selectStyle}
                data-testid="select-user-contratto"
              >
                <option value="Indeterminato">Tempo Indeterminato</option>
                <option value="Determinato">Tempo Determinato</option>
                <option value="Apprendistato">Apprendistato</option>
                <option value="Collaborazione">Collaborazione</option>
                <option value="Stage">Stage</option>
              </select>
            </div>
            <div>
              <label style={formStyles.label}>Data Assunzione</label>
              <input
                type="date"
                value={formData.dataAssunzione}
                onChange={(e) => setFormData({ ...formData, dataAssunzione: e.target.value })}
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-user-data-assunzione"
              />
            </div>
            <div>
              <label style={formStyles.label}>Livello</label>
              <input
                type="text"
                value={formData.livello}
                onChange={(e) => setFormData({ ...formData, livello: e.target.value })}
                placeholder="es. 3S"
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-user-livello"
              />
            </div>
            <div>
              <label style={formStyles.label}>CCNL</label>
              <select
                value={formData.ccnl}
                onChange={(e) => setFormData({ ...formData, ccnl: e.target.value })}
                disabled={isReadOnly}
                style={selectStyle}
                data-testid="select-user-ccnl"
              >
                <option value="Commercio">Commercio</option>
                <option value="Terziario">Terziario</option>
                <option value="Telecomunicazioni">Telecomunicazioni</option>
                <option value="Metalmeccanico">Metalmeccanico</option>
              </select>
            </div>
            <div>
              <label style={formStyles.label}>Ore Lavoro Settimanali</label>
              <input
                type="number"
                value={formData.oreLavoro}
                onChange={(e) => setFormData({ ...formData, oreLavoro: e.target.value })}
                placeholder="40"
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-user-ore-lavoro"
              />
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'voip',
      label: 'VoIP',
      icon: Headphones,
      content: (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <label style={formStyles.checkbox}>
              <input
                type="checkbox"
                checked={formData.extension.enabled}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  extension: { ...formData.extension, enabled: e.target.checked }
                })}
                disabled={isReadOnly}
                style={{ width: '18px', height: '18px' }}
              />
              Abilita Interno VoIP
            </label>
          </div>

          {formData.extension.enabled && (
            <div style={formStyles.grid(2)}>
              <div>
                <label style={formStyles.label}>Numero Interno</label>
                <select
                  value={formData.extension.extNumber}
                  onChange={(e) => {
                    const selected = voipExtensions.find((ext: any) => ext.extension === e.target.value);
                    setFormData({ 
                      ...formData, 
                      extension: { 
                        ...formData.extension, 
                        extNumber: e.target.value,
                        sipDomain: selected?.sipServer || formData.extension.sipDomain
                      }
                    });
                  }}
                  disabled={isReadOnly}
                  style={selectStyle}
                  data-testid="select-user-ext-number"
                >
                  <option value="">-- Seleziona Interno --</option>
                  {voipExtensions.map((ext: any) => (
                    <option key={ext.id} value={ext.extension}>
                      {ext.extension} - {ext.displayName || 'Disponibile'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={formStyles.label}>Dominio SIP</label>
                <input
                  type="text"
                  value={formData.extension.sipDomain}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    extension: { ...formData.extension, sipDomain: e.target.value }
                  })}
                  placeholder="pbx.example.com"
                  readOnly={isReadOnly}
                  style={inputStyle}
                  data-testid="input-user-sip-domain"
                />
              </div>
              <div>
                <label style={formStyles.label}>Classe di Servizio</label>
                <select
                  value={formData.extension.classOfService}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    extension: { ...formData.extension, classOfService: e.target.value }
                  })}
                  disabled={isReadOnly}
                  style={selectStyle}
                  data-testid="select-user-cos"
                >
                  <option value="internal">Solo Interni</option>
                  <option value="local">Locali</option>
                  <option value="national">Nazionali</option>
                  <option value="international">Internazionali</option>
                </select>
              </div>
              <div>
                <label style={formStyles.label}>Sede VoIP</label>
                <select
                  value={formData.extension.storeId || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    extension: { ...formData.extension, storeId: e.target.value ? parseInt(e.target.value) : null }
                  })}
                  disabled={isReadOnly}
                  style={selectStyle}
                  data-testid="select-user-voip-store"
                >
                  <option value="">-- Seleziona Sede --</option>
                  {stores.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.nome || s.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={formStyles.checkbox}>
                  <input
                    type="checkbox"
                    checked={formData.extension.voicemailEnabled}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      extension: { ...formData.extension, voicemailEnabled: e.target.checked }
                    })}
                    disabled={isReadOnly}
                    style={{ width: '18px', height: '18px' }}
                  />
                  Abilita Voicemail
                </label>
              </div>
            </div>
          )}

          <h4 style={{ ...formStyles.sectionTitle, marginTop: '24px' }}>Note</h4>
          <textarea
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            placeholder="Note aggiuntive sull'utente..."
            rows={4}
            readOnly={isReadOnly}
            style={formStyles.textarea(isReadOnly)}
            data-testid="textarea-user-note"
          />
        </div>
      )
    }
  ];

  return (
    <TabbedFormModal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Nuovo Utente' : mode === 'edit' ? 'Modifica Utente' : 'Dettagli Utente'}
      subtitle={data ? `${data.nome || data.firstName || ''} ${data.cognome || data.lastName || ''}`.trim() : undefined}
      icon={User}
      iconGradient="linear-gradient(135deg, #3b82f6, #2563eb)"
      tabs={tabs}
      onSave={handleSave}
      saveLabel="Salva Utente"
      saving={saving}
      isReadOnly={isReadOnly}
      error={errors.general}
    />
  );
}
