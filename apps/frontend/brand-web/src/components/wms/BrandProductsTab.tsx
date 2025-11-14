import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { brandWmsApi } from '@/services/brandWmsApi';
import { Button } from '@/components/ui/button';
import { Plus, Package, Eye, Trash2, RefreshCw } from 'lucide-react';

export default function BrandProductsTab() {
  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['/brand-api/wms/products'],
    queryFn: brandWmsApi.getProducts
  });

  const products = response?.data || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
            Prodotti Master
          </h2>
          <p style={{ color: '#6b7280', marginTop: '4px', margin: 0 }}>
            Gestisci i prodotti del catalogo master
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Aggiorna
          </Button>
          <Button
            style={{ background: 'linear-gradient(135deg, #FF6900, #ff8533)', color: 'white', border: 'none' }}
            data-testid="button-create-product"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Prodotto
          </Button>
        </div>
      </div>

      <div style={{
        background: 'hsla(255, 255, 255, 0.08)',
        backdropFilter: 'blur(24px)',
        border: '1px solid hsla(255, 255, 255, 0.12)',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        {isLoading ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <p style={{ color: '#6b7280' }}>Caricamento prodotti...</p>
          </div>
        ) : products.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <Package size={48} style={{ color: '#9ca3af', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
              Nessun prodotto
            </h3>
            <p style={{ color: '#6b7280' }}>Inizia creando il primo prodotto nel catalogo master</p>
          </div>
        ) : (
          <div style={{ padding: '16px' }}>
            <p style={{ color: '#6b7280' }}>Trovati {products.length} prodotti</p>
          </div>
        )}
      </div>
    </div>
  );
}
