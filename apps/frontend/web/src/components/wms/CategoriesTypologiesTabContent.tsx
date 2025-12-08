import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import ProductTypesList from './ProductTypesList';
import CategoriesList from './CategoriesList';
import ProductTypologiesList from './ProductTypologiesList';

export type ProductType = 'PHYSICAL' | 'VIRTUAL' | 'SERVICE' | 'CANVAS';

export interface Category {
  id: string;
  productType: ProductType;
  nome: string;
  descrizione?: string | null;
  icona?: string | null;
  ordine: number;
  source: string;
  isBrandSynced: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function CategoriesTypologiesTabContent() {
  const [selectedProductType, setSelectedProductType] = useState<ProductType | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Centralized categories fetch (after TenantContext is ready)
  // Note: queryClient automatically unwraps {data: ...} responses
  const { data: categories, isLoading: categoriesLoading, error } = useQuery<Category[]>({
    queryKey: ['/api/wms/categories'],
  });

  const categoriesArray = categories || [];

  return (
    <div className="space-y-6" data-testid="categories-typologies-content">
      {/* Header */}
      <div className="mb-6" data-testid="categories-typologies-header">
        <h2
          className="text-2xl font-bold mb-2"
          style={{ color: 'hsl(var(--foreground))' }}
          data-testid="categories-typologies-title"
        >
          Categorie & Tipologie Prodotto
        </h2>
        <p className="text-gray-600" data-testid="categories-typologies-subtitle">
          Gerarchia prodotti: Tipo Prodotto → Categoria → Tipologia
        </p>
      </div>

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" data-testid="three-column-layout">
        {/* Column 1: Product Types (static enum) */}
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
          data-testid="column-product-types"
        >
          <ProductTypesList
            categories={categoriesArray}
            isLoading={categoriesLoading}
            selectedProductType={selectedProductType}
            onSelectProductType={(type) => {
              setSelectedProductType(type);
              setSelectedCategoryId(null); // Reset category selection
            }}
          />
        </Card>

        {/* Column 2: Categories (filtered by productType) */}
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
          <CategoriesList
            categories={categoriesArray}
            isLoading={categoriesLoading}
            selectedProductType={selectedProductType}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
          />
        </Card>

        {/* Column 3: Product Typologies (filtered by categoryId) */}
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
          <ProductTypologiesList
            selectedCategoryId={selectedCategoryId}
          />
        </Card>
      </div>
    </div>
  );
}
