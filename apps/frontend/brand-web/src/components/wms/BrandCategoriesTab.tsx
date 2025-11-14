import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { brandWmsApi } from '@/services/brandWmsApi';
import { Button } from '@/components/ui/button';
import { Plus, FolderTree, RefreshCw } from 'lucide-react';

export default function BrandCategoriesTab() {
  const { data: categoriesResponse, isLoading: categoriesLoading, refetch: refetchCategories } = useQuery({
    queryKey: ['/brand-api/wms/categories'],
    queryFn: brandWmsApi.getCategories
  });

  const { data: typesResponse, isLoading: typesLoading, refetch: refetchTypes } = useQuery({
    queryKey: ['/brand-api/wms/product-types'],
    queryFn: brandWmsApi.getProductTypes
  });

  const categories = categoriesResponse?.data || [];
  const productTypes = typesResponse?.data || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
            Categorie & Tipologie
          </h2>
          <p style={{ color: '#6b7280', marginTop: '4px', margin: 0 }}>
            Gestisci la struttura gerarchica del catalogo master
          </p>
        </div>
        <Button variant="outline" onClick={() => { refetchCategories(); refetchTypes(); }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Aggiorna
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Categories */}
        <div style={{
          background: 'hsla(255, 255, 255, 0.08)',
          backdropFilter: 'blur(24px)',
          border: '1px solid hsla(255, 255, 255, 0.12)',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
              Categorie
            </h3>
            <Button size="sm" style={{ background: 'linear-gradient(135deg, #FF6900, #ff8533)', color: 'white', border: 'none' }}>
              <Plus className="h-4 w-4 mr-2" />
              Nuova
            </Button>
          </div>
          {categoriesLoading ? (
            <p style={{ color: '#6b7280' }}>Caricamento...</p>
          ) : categories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <FolderTree size={32} style={{ color: '#9ca3af', margin: '0 auto 12px' }} />
              <p style={{ color: '#6b7280', fontSize: '14px' }}>Nessuna categoria</p>
            </div>
          ) : (
            <div>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>Trovate {categories.length} categorie</p>
            </div>
          )}
        </div>

        {/* Product Types */}
        <div style={{
          background: 'hsla(255, 255, 255, 0.08)',
          backdropFilter: 'blur(24px)',
          border: '1px solid hsla(255, 255, 255, 0.12)',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
              Tipologie
            </h3>
            <Button size="sm" style={{ background: 'linear-gradient(135deg, #7B2CBF, #9747ff)', color: 'white', border: 'none' }}>
              <Plus className="h-4 w-4 mr-2" />
              Nuova
            </Button>
          </div>
          {typesLoading ? (
            <p style={{ color: '#6b7280' }}>Caricamento...</p>
          ) : productTypes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <FolderTree size={32} style={{ color: '#9ca3af', margin: '0 auto 12px' }} />
              <p style={{ color: '#6b7280', fontSize: '14px' }}>Nessuna tipologia</p>
            </div>
          ) : (
            <div>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>Trovate {productTypes.length} tipologie</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
