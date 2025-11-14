import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { brandWmsApi } from '@/services/brandWmsApi';
import { Button } from '@/components/ui/button';
import { Plus, Building2, Eye, Trash2, RefreshCw } from 'lucide-react';

export default function BrandSuppliersTab() {
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);

  // Fetch suppliers
  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['/brand-api/wms/suppliers'],
    queryFn: brandWmsApi.getSuppliers
  });

  const suppliers = response?.data || [];

  return (
    <div>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
            Fornitori Master
          </h2>
          <p style={{ color: '#6b7280', marginTop: '4px', margin: 0 }}>
            Gestisci i fornitori del catalogo master
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button
            variant="outline"
            onClick={() => refetch()}
            data-testid="button-refresh-suppliers"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Aggiorna
          </Button>
          <Button
            style={{
              background: 'linear-gradient(135deg, #FF6900, #ff8533)',
              color: 'white',
              border: 'none'
            }}
            data-testid="button-create-supplier"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Fornitore
          </Button>
        </div>
      </div>

      {/* Suppliers Table */}
      <div style={{
        background: 'hsla(255, 255, 255, 0.08)',
        backdropFilter: 'blur(24px)',
        border: '1px solid hsla(255, 255, 255, 0.12)',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        {isLoading ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '4px solid #e5e7eb',
              borderTopColor: '#FF6900',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }} />
            <p style={{ marginTop: '16px', color: '#6b7280' }}>Caricamento fornitori...</p>
          </div>
        ) : suppliers.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <Building2 size={48} style={{ color: '#9ca3af', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
              Nessun fornitore
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>
              Inizia creando il primo fornitore nel catalogo master
            </p>
            <Button
              style={{
                background: 'linear-gradient(135deg, #FF6900, #ff8533)',
                color: 'white',
                border: 'none'
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Crea Primo Fornitore
            </Button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid hsla(255, 255, 255, 0.12)' }}>
                <th style={{ 
                  padding: '16px', 
                  textAlign: 'left', 
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Codice
                </th>
                <th style={{ 
                  padding: '16px', 
                  textAlign: 'left', 
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Nome
                </th>
                <th style={{ 
                  padding: '16px', 
                  textAlign: 'left', 
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  P.IVA
                </th>
                <th style={{ 
                  padding: '16px', 
                  textAlign: 'left', 
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Stato
                </th>
                <th style={{ 
                  padding: '16px', 
                  textAlign: 'left', 
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Deployment
                </th>
                <th style={{ 
                  padding: '16px', 
                  textAlign: 'right', 
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier: any, index: number) => (
                <tr 
                  key={supplier.id}
                  style={{ 
                    borderBottom: index < suppliers.length - 1 ? '1px solid hsla(255, 255, 255, 0.06)' : 'none'
                  }}
                >
                  <td style={{ padding: '16px', color: '#1f2937', fontWeight: '500' }}>
                    {supplier.code}
                  </td>
                  <td style={{ padding: '16px', color: '#374151' }}>
                    <div>
                      <div style={{ fontWeight: '500' }}>{supplier.name}</div>
                      {supplier.legalName && (
                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                          {supplier.legalName}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '16px', color: '#6b7280' }}>
                    {supplier.vatNumber || '-'}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500',
                      background: supplier.status === 'active' 
                        ? 'rgba(16, 185, 129, 0.1)' 
                        : 'rgba(239, 68, 68, 0.1)',
                      color: supplier.status === 'active' 
                        ? '#10b981' 
                        : '#ef4444'
                    }}>
                      {supplier.status === 'active' ? 'Attivo' : 'Inattivo'}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontSize: '12px' }}>
                      <div style={{ color: '#6b7280' }}>
                        {supplier.deploymentStatus || 'draft'}
                      </div>
                      {supplier.deployedToCount > 0 && (
                        <div style={{ color: '#10b981', marginTop: '2px' }}>
                          {supplier.deployedToCount} tenant
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setSelectedSupplier(supplier)}
                        style={{
                          padding: '8px',
                          background: 'rgba(59, 130, 246, 0.1)',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        data-testid={`button-view-supplier-${supplier.id}`}
                      >
                        <Eye size={16} style={{ color: '#3b82f6' }} />
                      </button>
                      <button
                        style={{
                          padding: '8px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        data-testid={`button-delete-supplier-${supplier.id}`}
                      >
                        <Trash2 size={16} style={{ color: '#ef4444' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Info Box */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: '8px'
      }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#1f2937' }}>
          💡 <strong>Nota:</strong> I fornitori creati qui sono disponibili per il deployment selettivo ai tenant. 
          Utilizza il sistema di deployment per sincronizzare i dati ai punti vendita desiderati.
        </p>
      </div>
    </div>
  );
}
