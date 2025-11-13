import { Package, Server, Palette, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductType, Category } from './CategoriesTypologiesTabContent';

interface ProductTypesListProps {
  categories: Category[];
  isLoading: boolean;
  selectedProductType: ProductType | null;
  onSelectProductType: (type: ProductType) => void;
}

const PRODUCT_TYPES: Array<{
  id: ProductType;
  label: string;
  icon: React.ReactNode;
  color: string;
}> = [
  {
    id: 'PHYSICAL',
    label: 'Prodotti Fisici',
    icon: <Package className="h-5 w-5" />,
    color: 'hsl(var(--brand-orange))',
  },
  {
    id: 'SERVICE',
    label: 'Servizi',
    icon: <Server className="h-5 w-5" />,
    color: 'hsl(var(--brand-purple))',
  },
  {
    id: 'CANVAS',
    label: 'Canvas',
    icon: <Palette className="h-5 w-5" />,
    color: 'hsl(142, 76%, 36%)',
  },
  {
    id: 'VIRTUAL',
    label: 'Prodotti Digitali',
    icon: <FileCode className="h-5 w-5" />,
    color: 'hsl(220, 90%, 56%)',
  },
];

export default function ProductTypesList({
  categories,
  isLoading,
  selectedProductType,
  onSelectProductType,
}: ProductTypesListProps) {
  // Calculate counts per product type from provided categories
  const getCountForType = (type: ProductType) => {
    return categories.filter(cat => cat.productType === type).length;
  };

  return (
    <div className="space-y-4" data-testid="product-types-list">
      {/* Header */}
      <div className="pb-3 border-b" data-testid="product-types-header">
        <h3
          className="text-lg font-semibold"
          style={{ color: 'hsl(var(--foreground))' }}
          data-testid="product-types-title"
        >
          Tipi Prodotto
        </h3>
        <p className="text-sm text-gray-600 mt-1" data-testid="product-types-subtitle">
          Seleziona un tipo
        </p>
      </div>

      {/* Product Types List */}
      <div className="space-y-2" data-testid="product-types-items">
        {PRODUCT_TYPES.map((type) => {
          const count = getCountForType(type.id);
          const isSelected = selectedProductType === type.id;

          return (
            <Button
              key={type.id}
              variant={isSelected ? 'default' : 'outline'}
              className="w-full justify-start h-auto py-3"
              style={
                isSelected
                  ? {
                      background: type.color,
                      color: 'white',
                      borderColor: type.color,
                    }
                  : undefined
              }
              onClick={() => onSelectProductType(type.id)}
              data-testid={`product-type-${type.id.toLowerCase()}`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div
                    style={
                      isSelected
                        ? { color: 'white' }
                        : { color: type.color }
                    }
                    data-testid={`icon-${type.id.toLowerCase()}`}
                  >
                    {type.icon}
                  </div>
                  <span
                    className="font-medium"
                    data-testid={`label-${type.id.toLowerCase()}`}
                  >
                    {type.label}
                  </span>
                </div>
                <span
                  className={`text-sm ${
                    isSelected ? 'text-white' : 'text-gray-500'
                  }`}
                  data-testid={`count-${type.id.toLowerCase()}`}
                >
                  {count}
                </span>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
