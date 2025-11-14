import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { brandWmsApi } from '@/services/brandWmsApi';
import { Button } from '@/components/ui/button';
import { Plus, FolderTree } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function BrandCategoriesTab() {
  const { data: categoriesResponse, isLoading: categoriesLoading } = useQuery({
    queryKey: ['/brand-api/wms/categories'],
    queryFn: brandWmsApi.getCategories
  });

  const { data: typesResponse, isLoading: typesLoading } = useQuery({
    queryKey: ['/brand-api/wms/product-types'],
    queryFn: brandWmsApi.getProductTypes
  });

  const categories = categoriesResponse?.data || [];
  const productTypes = typesResponse?.data || [];
  const isLoading = categoriesLoading || typesLoading;

  return (
    <div className="space-y-6" data-testid="categories-typologies-content">
      {/* Header */}
      <div className="mb-6" data-testid="categories-typologies-header">
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }} data-testid="categories-typologies-title">
          Categorie & Tipologie Prodotto
        </h2>
        <p className="text-gray-600" data-testid="categories-typologies-subtitle">
          Gestisci la struttura gerarchica del catalogo master: Categorie e Tipologie
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />
          <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="two-column-layout">
          {/* Column 1: Categories */}
          <Card
            className="p-4"
            style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)'
            }}
            data-testid="column-categories"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                Categorie Master
              </h3>
              <Button size="sm" style={{ background: 'hsl(var(--brand-orange))', color: 'white' }}>
                <Plus className="h-4 w-4 mr-2" />
                Nuova
              </Button>
            </div>
            {categories.length === 0 ? (
              <div className="text-center py-12">
                <FolderTree className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-sm">Nessuna categoria</p>
                <p className="text-gray-500 text-xs mt-2">Crea la prima categoria del catalogo master</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">{categories.length} categorie trovate</p>
                <div className="max-h-96 overflow-y-auto space-y-1">
                  {categories.map((cat: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                      <p className="font-medium text-sm">{cat.name || cat.nome || `Categoria ${idx + 1}`}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Column 2: Product Typologies */}
          <Card
            className="p-4"
            style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)'
            }}
            data-testid="column-product-typologies"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                Tipologie Prodotto
              </h3>
              <Button size="sm" style={{ background: 'hsl(var(--brand-purple))', color: 'white' }}>
                <Plus className="h-4 w-4 mr-2" />
                Nuova
              </Button>
            </div>
            {productTypes.length === 0 ? (
              <div className="text-center py-12">
                <FolderTree className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-sm">Nessuna tipologia</p>
                <p className="text-gray-500 text-xs mt-2">Crea la prima tipologia prodotto</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">{productTypes.length} tipologie trovate</p>
                <div className="max-h-96 overflow-y-auto space-y-1">
                  {productTypes.map((type: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                      <p className="font-medium text-sm">{type.name || type.nome || `Tipologia ${idx + 1}`}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
