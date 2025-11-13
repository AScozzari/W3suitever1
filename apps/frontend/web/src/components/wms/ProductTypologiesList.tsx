import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TypologyFormModal } from './TypologyFormModal';

interface ProductTypologiesListProps {
  selectedCategoryId: string | null;
}

export interface ProductTypology {
  id: string;
  nome: string;
  descrizione?: string | null;
  categoryId: string;
  ordine: number;
  isActive: boolean;
}

export default function ProductTypologiesList({
  selectedCategoryId,
}: ProductTypologiesListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTypology, setEditingTypology] = useState<ProductTypology | null>(null);

  // Fetch product types filtered by categoryId using query params
  // Note: queryClient automatically unwraps {data: ...} responses
  const { data: typologies, isLoading } = useQuery<ProductTypology[]>({
    queryKey: selectedCategoryId 
      ? [`/api/wms/product-types?categoryId=${selectedCategoryId}`]
      : ['/api/wms/product-types'],
    enabled: !!selectedCategoryId,
  });

  const typologiesArray = typologies || [];

  if (!selectedCategoryId) {
    return (
      <div className="space-y-4" data-testid="typologies-empty-state">
        <div className="pb-3 border-b" data-testid="typologies-header">
          <h3
            className="text-lg font-semibold"
            style={{ color: 'hsl(var(--foreground))' }}
            data-testid="typologies-title"
          >
            Tipologie
          </h3>
          <p className="text-sm text-gray-600 mt-1" data-testid="typologies-subtitle">
            Filtra per categoria
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-12" data-testid="typologies-placeholder">
          <AlertCircle className="h-12 w-12 text-gray-300 mb-3" data-testid="icon-placeholder" />
          <p className="text-gray-500 text-sm" data-testid="text-placeholder">
            Seleziona una categoria
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="typologies-list">
      {/* Header */}
      <div className="pb-3 border-b flex items-center justify-between" data-testid="typologies-header">
        <div>
          <h3
            className="text-lg font-semibold"
            style={{ color: 'hsl(var(--foreground))' }}
            data-testid="typologies-title"
          >
            Tipologie
          </h3>
          <p className="text-sm text-gray-600 mt-1" data-testid="typologies-subtitle">
            {typologiesArray.length} tipologie
          </p>
        </div>
        <Button
          size="sm"
          style={{
            background: 'hsl(var(--brand-orange))',
            color: 'white',
          }}
          onClick={() => {
            setEditingTypology(null);
            setIsModalOpen(true);
          }}
          data-testid="button-add-typology"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Typologies List */}
      {isLoading ? (
        <div className="space-y-2" data-testid="typologies-loading">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16" data-testid={`skeleton-typology-${i}`} />
          ))}
        </div>
      ) : typologiesArray.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12" data-testid="typologies-no-results">
          <AlertCircle className="h-12 w-12 text-gray-300 mb-3" data-testid="icon-no-results" />
          <p className="text-gray-500 text-sm" data-testid="text-no-results">
            Nessuna tipologia disponibile
          </p>
        </div>
      ) : (
        <div className="space-y-2" data-testid="typologies-items">
          {typologiesArray.map((typology) => (
            <div
              key={typology.id}
              className="group relative p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
              data-testid={`typology-${typology.id}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p
                    className="font-medium truncate"
                    style={{ color: 'hsl(var(--foreground))' }}
                    data-testid={`typology-name-${typology.id}`}
                  >
                    {typology.nome}
                  </p>
                  {typology.descrizione && (
                    <p
                      className="text-sm text-gray-600 truncate"
                      data-testid={`typology-description-${typology.id}`}
                    >
                      {typology.descrizione}
                    </p>
                  )}
                </div>

                {/* Hover Actions */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`actions-${typology.id}`}>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingTypology(typology);
                      setIsModalOpen(true);
                    }}
                    data-testid={`button-edit-${typology.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Implement delete confirmation dialog
                      console.log('Delete typology:', typology.id);
                    }}
                    data-testid={`button-delete-${typology.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Typology Form Modal */}
      <TypologyFormModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTypology(null);
        }}
        typology={editingTypology}
        initialCategoryId={selectedCategoryId || undefined}
      />
    </div>
  );
}
