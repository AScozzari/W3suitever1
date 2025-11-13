import { useMemo } from 'react';
import { Plus, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductType, Category } from './CategoriesTypologiesTabContent';

interface CategoriesListProps {
  categories: Category[];
  isLoading: boolean;
  selectedProductType: ProductType | null;
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string) => void;
}

export default function CategoriesList({
  categories: allCategories,
  isLoading,
  selectedProductType,
  selectedCategoryId,
  onSelectCategory,
}: CategoriesListProps) {
  // Filter categories by selected productType (memoized)
  const categories = useMemo(() => {
    if (!selectedProductType) return [];
    return allCategories.filter(cat => cat.productType === selectedProductType);
  }, [allCategories, selectedProductType]);

  if (!selectedProductType) {
    return (
      <div className="space-y-4" data-testid="categories-empty-state">
        <div className="pb-3 border-b" data-testid="categories-header">
          <h3
            className="text-lg font-semibold"
            style={{ color: 'hsl(var(--foreground))' }}
            data-testid="categories-title"
          >
            Categorie
          </h3>
          <p className="text-sm text-gray-600 mt-1" data-testid="categories-subtitle">
            Filtra per tipo prodotto
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-12" data-testid="categories-placeholder">
          <AlertCircle className="h-12 w-12 text-gray-300 mb-3" data-testid="icon-placeholder" />
          <p className="text-gray-500 text-sm" data-testid="text-placeholder">
            Seleziona un tipo prodotto
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="categories-list">
      {/* Header */}
      <div className="pb-3 border-b flex items-center justify-between" data-testid="categories-header">
        <div>
          <h3
            className="text-lg font-semibold"
            style={{ color: 'hsl(var(--foreground))' }}
            data-testid="categories-title"
          >
            Categorie
          </h3>
          <p className="text-sm text-gray-600 mt-1" data-testid="categories-subtitle">
            {categories.length} categorie
          </p>
        </div>
        <Button
          size="sm"
          style={{
            background: 'hsl(var(--brand-orange))',
            color: 'white',
          }}
          data-testid="button-add-category"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Categories List */}
      {isLoading ? (
        <div className="space-y-2" data-testid="categories-loading">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16" data-testid={`skeleton-category-${i}`} />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12" data-testid="categories-no-results">
          <AlertCircle className="h-12 w-12 text-gray-300 mb-3" data-testid="icon-no-results" />
          <p className="text-gray-500 text-sm" data-testid="text-no-results">
            Nessuna categoria disponibile
          </p>
        </div>
      ) : (
        <div className="space-y-2" data-testid="categories-items">
          {categories.map((category) => {
            const isSelected = selectedCategoryId === category.id;

            return (
              <div
                key={category.id}
                className={`group relative p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => onSelectCategory(category.id)}
                data-testid={`category-${category.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-medium truncate"
                      style={{ color: isSelected ? 'hsl(var(--brand-orange))' : 'hsl(var(--foreground))' }}
                      data-testid={`category-name-${category.id}`}
                    >
                      {category.nome}
                    </p>
                    {category.descrizione && (
                      <p
                        className="text-sm text-gray-600 truncate"
                        data-testid={`category-description-${category.id}`}
                      >
                        {category.descrizione}
                      </p>
                    )}
                  </div>

                  {/* Hover Actions */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`actions-${category.id}`}>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Open edit modal
                      }}
                      data-testid={`button-edit-${category.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Delete category
                      }}
                      data-testid={`button-delete-${category.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
