import { useState, useEffect } from 'react';
import { 
  Building2, MapPin, Phone, Link, Settings, Tag, Globe, 
  Mail, MessageCircle, Instagram, Facebook, Video
} from 'lucide-react';
import TabbedFormModal, { formStyles, TabSection } from '../ui/TabbedFormModal';
import { StandardCityField, StandardCapField, StandardEmailField } from '../Leave/forms/StandardFields';

interface StoreFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  data: any | null;
  onClose: () => void;
  onSave: (storeData: any) => Promise<void>;
  legalEntities: any[];
  commercialAreas: any[];
  channels: any[];
  brands: any[];
}

const initialStoreData = {
  category: 'sales_point' as 'sales_point' | 'office' | 'warehouse',
  hasWarehouse: false,
  code: '',
  nome: '',
  address: '',
  citta: '',
  provincia: '',
  cap: '',
  region: '',
  geo: { lat: '', lng: '' },
  phone: '',
  email: '',
  whatsapp1: '',
  whatsapp2: '',
  facebook: '',
  instagram: '',
  tiktok: '',
  google_maps_url: '',
  telegram: '',
  legal_entity_id: null as number | null,
  commercial_area_id: null as string | null,
  channel_id: null as number | null,
  brands: [] as number[],
  status: 'active',
  opened_at: '',
  closed_at: ''
};

export default function StoreFormModal({
  isOpen,
  mode,
  data,
  onClose,
  onSave,
  legalEntities,
  commercialAreas,
  channels,
  brands
}: StoreFormModalProps) {
  const [formData, setFormData] = useState(initialStoreData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && data && (mode === 'edit' || mode === 'view')) {
      setFormData({
        category: data.category || 'sales_point',
        hasWarehouse: data.hasWarehouse || data.has_warehouse || false,
        code: data.code || '',
        nome: data.nome || data.name || '',
        address: data.address || '',
        citta: data.citta || data.city || '',
        provincia: data.provincia || data.province || '',
        cap: data.cap || data.postalCode || '',
        region: data.region || '',
        geo: { 
          lat: data.geo?.lat || data.latitude || '', 
          lng: data.geo?.lng || data.longitude || '' 
        },
        phone: data.phone || '',
        email: data.email || '',
        whatsapp1: data.whatsapp1 || '',
        whatsapp2: data.whatsapp2 || '',
        facebook: data.facebook || '',
        instagram: data.instagram || '',
        tiktok: data.tiktok || '',
        google_maps_url: data.google_maps_url || '',
        telegram: data.telegram || '',
        legal_entity_id: data.legal_entity_id || data.legalEntityId || null,
        commercial_area_id: data.commercial_area_id || data.commercialAreaId || null,
        channel_id: data.channel_id || data.channelId || null,
        brands: data.brands || [],
        status: data.status || 'active',
        opened_at: data.opened_at || data.openedAt || '',
        closed_at: data.closed_at || data.closedAt || ''
      });
    } else if (isOpen && !data) {
      setFormData(initialStoreData);
    }
    setErrors({});
  }, [isOpen, data, mode]);

  const handleSave = async () => {
    if (mode === 'view') return;

    if (!formData.nome.trim()) {
      setErrors({ general: 'Nome sede è obbligatorio' });
      return;
    }
    if (!formData.legal_entity_id) {
      setErrors({ general: 'Ragione Sociale è obbligatoria' });
      return;
    }
    if (!formData.commercial_area_id) {
      setErrors({ general: 'Area Commerciale è obbligatoria' });
      return;
    }
    if (formData.category === 'sales_point' && !formData.channel_id) {
      setErrors({ general: 'Canale è obbligatorio per punti vendita' });
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

  const getCategoryIcon = () => {
    switch (formData.category) {
      case 'warehouse': return '📦';
      case 'office': return '🏢';
      default: return '🏪';
    }
  };

  const tabs: TabSection[] = [
    {
      id: 'anagrafica',
      label: 'Anagrafica',
      icon: Building2,
      content: (
        <div>
          <div style={formStyles.grid(3)}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={formStyles.label}>Categoria Sede <span style={{ color: '#ef4444' }}>*</span></label>
              <div style={{ display: 'flex', gap: '12px' }}>
                {[
                  { value: 'sales_point', label: 'Punto Vendita', icon: '🏪' },
                  { value: 'office', label: 'Ufficio', icon: '🏢' },
                  { value: 'warehouse', label: 'Magazzino', icon: '📦' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => !isReadOnly && setFormData({ ...formData, category: opt.value as any })}
                    disabled={isReadOnly}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '8px',
                      border: formData.category === opt.value ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                      background: formData.category === opt.value ? 'rgba(59, 130, 246, 0.1)' : 'white',
                      cursor: isReadOnly ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      fontWeight: formData.category === opt.value ? '600' : '400'
                    }}
                    data-testid={`btn-category-${opt.value}`}
                  >
                    <span>{opt.icon}</span> {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'end' }}>
              <label style={formStyles.checkbox}>
                <input
                  type="checkbox"
                  checked={formData.hasWarehouse}
                  onChange={(e) => setFormData({ ...formData, hasWarehouse: e.target.checked })}
                  disabled={isReadOnly || formData.category === 'warehouse'}
                  style={{ width: '18px', height: '18px' }}
                />
                Ha Magazzino Interno
              </label>
            </div>
          </div>

          <div style={{ ...formStyles.grid(2), marginTop: '20px' }}>
            <div>
              <label style={formStyles.label}>Codice Sede</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="Auto-generato se vuoto"
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-store-code"
              />
            </div>
            <div>
              <label style={formStyles.label}>Nome Sede <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="es. Milano Centro"
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-store-nome"
              />
            </div>
            <div>
              <label style={formStyles.label}>Ragione Sociale <span style={{ color: '#ef4444' }}>*</span></label>
              <select
                value={formData.legal_entity_id || ''}
                onChange={(e) => setFormData({ ...formData, legal_entity_id: e.target.value ? parseInt(e.target.value) : null })}
                disabled={isReadOnly}
                style={selectStyle}
                data-testid="select-store-legal-entity"
              >
                <option value="">-- Seleziona --</option>
                {legalEntities.map((le: any) => (
                  <option key={le.id} value={le.id}>{le.nome || le.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={formStyles.label}>Area Commerciale <span style={{ color: '#ef4444' }}>*</span></label>
              <select
                value={formData.commercial_area_id || ''}
                onChange={(e) => setFormData({ ...formData, commercial_area_id: e.target.value || null })}
                disabled={isReadOnly}
                style={selectStyle}
                data-testid="select-store-area"
              >
                <option value="">-- Seleziona --</option>
                {commercialAreas.map((area: any) => (
                  <option key={area.code || area.id} value={area.code || area.id}>{area.name}</option>
                ))}
              </select>
            </div>
            {formData.category === 'sales_point' && (
              <>
                <div>
                  <label style={formStyles.label}>Canale <span style={{ color: '#ef4444' }}>*</span></label>
                  <select
                    value={formData.channel_id || ''}
                    onChange={(e) => setFormData({ ...formData, channel_id: e.target.value ? parseInt(e.target.value) : null })}
                    disabled={isReadOnly}
                    style={selectStyle}
                    data-testid="select-store-channel"
                  >
                    <option value="">-- Seleziona --</option>
                    {channels.map((ch: any) => (
                      <option key={ch.id} value={ch.id}>{ch.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={formStyles.label}>Brand</label>
                  <select
                    multiple
                    value={formData.brands.map(String)}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions).map(opt => parseInt(opt.value));
                      setFormData({ ...formData, brands: selected });
                    }}
                    disabled={isReadOnly}
                    style={{ ...selectStyle, height: '80px' }}
                    data-testid="select-store-brands"
                  >
                    {brands.map((b: any) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>
      )
    },
    {
      id: 'indirizzo',
      label: 'Indirizzo',
      icon: MapPin,
      content: (
        <div>
          <div style={formStyles.grid(2)}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={formStyles.label}>Indirizzo <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Via Roma, 123"
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-store-address"
              />
            </div>
            <div>
              <label style={formStyles.label}>Città <span style={{ color: '#ef4444' }}>*</span></label>
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
                data-testid="input-store-provincia"
              />
            </div>
            <div>
              <label style={formStyles.label}>Regione</label>
              <input
                type="text"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                placeholder="Lombardia"
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-store-region"
              />
            </div>
          </div>

          <h4 style={{ ...formStyles.sectionTitle, marginTop: '24px' }}><Globe size={16} /> Coordinate GPS</h4>
          <div style={formStyles.grid(2)}>
            <div>
              <label style={formStyles.label}>Latitudine</label>
              <input
                type="text"
                value={formData.geo.lat}
                onChange={(e) => setFormData({ ...formData, geo: { ...formData.geo, lat: e.target.value } })}
                placeholder="45.4642"
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-store-lat"
              />
            </div>
            <div>
              <label style={formStyles.label}>Longitudine</label>
              <input
                type="text"
                value={formData.geo.lng}
                onChange={(e) => setFormData({ ...formData, geo: { ...formData.geo, lng: e.target.value } })}
                placeholder="9.1900"
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-store-lng"
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
              <label style={formStyles.label}><Phone size={14} style={{ display: 'inline', marginRight: '4px' }} /> Telefono</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+39 02 1234567"
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-store-phone"
              />
            </div>
            <div>
              <label style={formStyles.label}><Mail size={14} style={{ display: 'inline', marginRight: '4px' }} /> Email</label>
              <StandardEmailField
                value={formData.email}
                onChange={(val) => setFormData({ ...formData, email: val })}
              />
            </div>
            <div>
              <label style={formStyles.label}><MessageCircle size={14} style={{ display: 'inline', marginRight: '4px' }} /> WhatsApp 1</label>
              <input
                type="tel"
                value={formData.whatsapp1}
                onChange={(e) => setFormData({ ...formData, whatsapp1: e.target.value })}
                placeholder="+39 333 1234567"
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-store-whatsapp1"
              />
            </div>
            <div>
              <label style={formStyles.label}><MessageCircle size={14} style={{ display: 'inline', marginRight: '4px' }} /> WhatsApp 2</label>
              <input
                type="tel"
                value={formData.whatsapp2}
                onChange={(e) => setFormData({ ...formData, whatsapp2: e.target.value })}
                placeholder="+39 333 7654321"
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-store-whatsapp2"
              />
            </div>
          </div>

          <h4 style={{ ...formStyles.sectionTitle, marginTop: '24px' }}><Link size={16} /> Social Media</h4>
          <div style={formStyles.grid(2)}>
            <div>
              <label style={formStyles.label}><Facebook size={14} style={{ display: 'inline', marginRight: '4px' }} /> Facebook</label>
              <input
                type="url"
                value={formData.facebook}
                onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                placeholder="https://facebook.com/..."
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-store-facebook"
              />
            </div>
            <div>
              <label style={formStyles.label}><Instagram size={14} style={{ display: 'inline', marginRight: '4px' }} /> Instagram</label>
              <input
                type="url"
                value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                placeholder="https://instagram.com/..."
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-store-instagram"
              />
            </div>
            <div>
              <label style={formStyles.label}><Video size={14} style={{ display: 'inline', marginRight: '4px' }} /> TikTok</label>
              <input
                type="url"
                value={formData.tiktok}
                onChange={(e) => setFormData({ ...formData, tiktok: e.target.value })}
                placeholder="https://tiktok.com/@..."
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-store-tiktok"
              />
            </div>
            <div>
              <label style={formStyles.label}><MessageCircle size={14} style={{ display: 'inline', marginRight: '4px' }} /> Telegram</label>
              <input
                type="url"
                value={formData.telegram}
                onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                placeholder="https://t.me/..."
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-store-telegram"
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={formStyles.label}><MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} /> Google Maps URL</label>
              <input
                type="url"
                value={formData.google_maps_url}
                onChange={(e) => setFormData({ ...formData, google_maps_url: e.target.value })}
                placeholder="https://goo.gl/maps/..."
                readOnly={isReadOnly}
                style={inputStyle}
                data-testid="input-store-gmaps"
              />
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'stato',
      label: 'Stato',
      icon: Settings,
      content: (
        <div style={formStyles.grid(2)}>
          <div>
            <label style={formStyles.label}>Stato</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              disabled={isReadOnly}
              style={selectStyle}
              data-testid="select-store-status"
            >
              <option value="active">Attivo</option>
              <option value="inactive">Inattivo</option>
              <option value="coming_soon">In Apertura</option>
              <option value="closing">In Chiusura</option>
            </select>
          </div>
          <div>
            <label style={formStyles.label}>Data Apertura</label>
            <input
              type="date"
              value={formData.opened_at}
              onChange={(e) => setFormData({ ...formData, opened_at: e.target.value })}
              readOnly={isReadOnly}
              style={inputStyle}
              data-testid="input-store-opened"
            />
          </div>
          <div>
            <label style={formStyles.label}>Data Chiusura</label>
            <input
              type="date"
              value={formData.closed_at}
              onChange={(e) => setFormData({ ...formData, closed_at: e.target.value })}
              readOnly={isReadOnly}
              style={inputStyle}
              data-testid="input-store-closed"
            />
          </div>
        </div>
      )
    }
  ];

  return (
    <TabbedFormModal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Nuova Sede Operativa' : mode === 'edit' ? 'Modifica Sede' : 'Dettagli Sede'}
      subtitle={data ? (data.nome || data.name) : undefined}
      icon={Building2}
      iconGradient="linear-gradient(135deg, #10b981, #059669)"
      tabs={tabs}
      onSave={handleSave}
      saveLabel="Salva Sede"
      saving={saving}
      isReadOnly={isReadOnly}
      error={errors.general}
      headerBadge={data && (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 8px',
          background: 'rgba(16, 185, 129, 0.1)',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#059669',
          marginTop: '4px'
        }}>
          {getCategoryIcon()} {formData.category === 'sales_point' ? 'Punto Vendita' : formData.category === 'office' ? 'Ufficio' : 'Magazzino'}
        </span>
      )}
    />
  );
}
