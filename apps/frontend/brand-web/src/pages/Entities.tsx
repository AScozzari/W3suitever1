import React, { useState } from 'react';
import BrandLayout from '../components/BrandLayout';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Building2, Store, Users, Plus, Edit2, Trash2, ChevronRight } from 'lucide-react';

export default function Entities() {
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [selectedRagioneSociale, setSelectedRagioneSociale] = useState<string | null>(null);
  
  // Mock data for demonstration
  const tenants = [
    { id: '1', name: 'Staging Environment', code: 'STG-001' },
    { id: '2', name: 'Demo Tenant', code: 'DMO-001' },
    { id: '3', name: 'ACME Corporation', code: 'ACM-001' },
    { id: '4', name: 'Tech Solutions', code: 'TEC-001' }
  ];
  
  const ragioniSociali = selectedTenant ? [
    { id: '1', name: 'WindTre S.p.A.', partitaIva: '13378520152' },
    { id: '2', name: 'Wind Retail S.r.l.', partitaIva: '06700161002' },
    { id: '3', name: 'WindTre Business S.p.A.', partitaIva: '08644781006' }
  ] : [];
  
  const puntiVendita = selectedRagioneSociale ? [
    { id: '1', name: 'Milano Centro', address: 'Via Roma, 123' },
    { id: '2', name: 'Roma EUR', address: 'Viale Europa, 45' },
    { id: '3', name: 'Napoli Centro', address: 'Piazza Garibaldi, 78' },
    { id: '4', name: 'Torino Porta Nuova', address: 'Corso Vittorio, 12' }
  ] : [];

  return (
    <BrandLayout>
      <div style={{ padding: '24px' }}>
        <h1 style={{ 
          fontSize: '24px', 
          fontWeight: 600, 
          color: '#1f2937',
          marginBottom: '24px'
        }}>
          Gestione Entità Cross-Tenant
        </h1>
        
        {/* Three column layout */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '24px',
          height: 'calc(100vh - 200px)'
        }}>
          
          {/* Tenants Column */}
          <div style={{
            background: 'hsla(255, 255, 255, 0.08)',
            backdropFilter: 'blur(24px) saturate(140%)',
            WebkitBackdropFilter: 'blur(24px) saturate(140%)',
            borderRadius: '12px',
            border: '1px solid hsla(255, 255, 255, 0.12)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '16px',
              borderBottom: '1px solid hsla(255, 255, 255, 0.12)',
              background: 'linear-gradient(135deg, #FF6900, #ff8533)',
              color: 'white'
            }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
                Tenant
              </h2>
              <p style={{ fontSize: '12px', opacity: 0.9, margin: 0 }}>
                {tenants.length} organizzazioni
              </p>
            </div>
            
            <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
              {tenants.map((tenant) => (
                <div
                  key={tenant.id}
                  onClick={() => {
                    setSelectedTenant(tenant.id);
                    setSelectedRagioneSociale(null); // Reset dependent selection
                  }}
                  style={{
                    padding: '12px',
                    marginBottom: '8px',
                    background: selectedTenant === tenant.id ? 'rgba(255, 105, 0, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                    border: selectedTenant === tenant.id ? '1px solid #FF6900' : '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backdropFilter: 'blur(8px)'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedTenant !== tenant.id) {
                      e.currentTarget.style.background = 'rgba(255, 105, 0, 0.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedTenant !== tenant.id) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Building2 size={20} color="#6b7280" />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, color: '#1f2937', margin: 0 }}>
                        {tenant.name}
                      </p>
                      <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                        Codice: {tenant.code}
                      </p>
                    </div>
                    <ChevronRight size={16} color="#9ca3af" />
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ padding: '16px', borderTop: '1px solid hsla(255, 255, 255, 0.12)' }}>
              <button style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #FF6900, #ff8533)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'transform 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <Plus size={16} />
                Nuovo Tenant
              </button>
            </div>
          </div>
          
          {/* Ragioni Sociali Column */}
          <div style={{
            background: 'hsla(255, 255, 255, 0.08)',
            backdropFilter: 'blur(24px) saturate(140%)',
            WebkitBackdropFilter: 'blur(24px) saturate(140%)',
            borderRadius: '12px',
            border: '1px solid hsla(255, 255, 255, 0.12)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            opacity: selectedTenant ? 1 : 0.5
          }}>
            <div style={{
              padding: '16px',
              borderBottom: '1px solid hsla(255, 255, 255, 0.12)',
              background: 'linear-gradient(135deg, #7B2CBF, #9747ff)',
              color: 'white'
            }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
                Ragioni Sociali
              </h2>
              <p style={{ fontSize: '12px', opacity: 0.9, margin: 0 }}>
                {ragioniSociali.length} entità giuridiche
              </p>
            </div>
            
            <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
              {!selectedTenant ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                  Seleziona un tenant
                </div>
              ) : (
                ragioniSociali.map((rs) => (
                  <div
                    key={rs.id}
                    onClick={() => setSelectedRagioneSociale(rs.id)}
                    style={{
                      padding: '12px',
                      marginBottom: '8px',
                      background: selectedRagioneSociale === rs.id ? 'rgba(123, 44, 191, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                      border: selectedRagioneSociale === rs.id ? '1px solid #7B2CBF' : '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      backdropFilter: 'blur(8px)'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedRagioneSociale !== rs.id) {
                        e.currentTarget.style.background = 'rgba(123, 44, 191, 0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedRagioneSociale !== rs.id) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Building2 size={20} color="#6b7280" />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, color: '#1f2937', margin: 0 }}>
                          {rs.name}
                        </p>
                        <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                          P.IVA: {rs.partitaIva}
                        </p>
                      </div>
                      <ChevronRight size={16} color="#9ca3af" />
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div style={{ padding: '16px', borderTop: '1px solid hsla(255, 255, 255, 0.12)' }}>
              <button 
                disabled={!selectedTenant}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: selectedTenant ? 'linear-gradient(135deg, #7B2CBF, #9747ff)' : '#e5e7eb',
                  color: selectedTenant ? 'white' : '#9ca3af',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: selectedTenant ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'transform 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (selectedTenant) {
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedTenant) {
                    e.currentTarget.style.transform = 'scale(1)';
                  }
                }}
              >
                <Plus size={16} />
                Nuova Ragione Sociale
              </button>
            </div>
          </div>
          
          {/* Punti Vendita Column */}
          <div style={{
            background: 'hsla(255, 255, 255, 0.08)',
            backdropFilter: 'blur(24px) saturate(140%)',
            WebkitBackdropFilter: 'blur(24px) saturate(140%)',
            borderRadius: '12px',
            border: '1px solid hsla(255, 255, 255, 0.12)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            opacity: selectedRagioneSociale ? 1 : 0.5
          }}>
            <div style={{
              padding: '16px',
              borderBottom: '1px solid hsla(255, 255, 255, 0.12)',
              background: 'linear-gradient(135deg, #10b981, #34d399)',
              color: 'white'
            }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
                Punti Vendita
              </h2>
              <p style={{ fontSize: '12px', opacity: 0.9, margin: 0 }}>
                {puntiVendita.length} stores
              </p>
            </div>
            
            <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
              {!selectedRagioneSociale ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                  Seleziona una ragione sociale
                </div>
              ) : (
                puntiVendita.map((pv) => (
                  <div
                    key={pv.id}
                    style={{
                      padding: '12px',
                      marginBottom: '8px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '8px',
                      transition: 'all 0.2s',
                      backdropFilter: 'blur(8px)',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(16, 185, 129, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Store size={20} color="#6b7280" />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, color: '#1f2937', margin: 0 }}>
                          {pv.name}
                        </p>
                        <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                          {pv.address}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div style={{ padding: '16px', borderTop: '1px solid hsla(255, 255, 255, 0.12)' }}>
              <button 
                disabled={!selectedRagioneSociale}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: selectedRagioneSociale ? 'linear-gradient(135deg, #10b981, #34d399)' : '#e5e7eb',
                  color: selectedRagioneSociale ? 'white' : '#9ca3af',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: selectedRagioneSociale ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'transform 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (selectedRagioneSociale) {
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedRagioneSociale) {
                    e.currentTarget.style.transform = 'scale(1)';
                  }
                }}
              >
                <Plus size={16} />
                Nuovo Punto Vendita
              </button>
            </div>
          </div>
          
        </div>
      </div>
    </BrandLayout>
  );
}