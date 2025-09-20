import { FileText, FolderOpen, Clock, Shield, Archive, Trash2, Star, Share2, Calendar } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  icon: any;
  count?: number;
  color: string;
  gradient: string;
}

interface DocumentCategoriesProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  onCategorySelect?: (category: any) => void; // Added missing prop
  documentCounts: Record<string, number>;
}

export default function DocumentCategories({
  categories,
  selectedCategory,
  onSelectCategory,
  documentCounts
}: DocumentCategoriesProps) {
  const defaultCategories: Category[] = [
    {
      id: 'all',
      name: 'Tutti i Documenti',
      icon: FileText,
      color: 'text-gray-600',
      gradient: 'from-gray-400 to-gray-600'
    },
    {
      id: 'payslip',
      name: 'Buste Paga',
      icon: '💰',
      color: 'text-green-600',
      gradient: 'from-green-400 to-emerald-600'
    },
    {
      id: 'contract',
      name: 'Contratti',
      icon: '📄',
      color: 'text-blue-600',
      gradient: 'from-blue-400 to-indigo-600'
    },
    {
      id: 'certificate',
      name: 'Certificati',
      icon: '🏆',
      color: 'text-purple-600',
      gradient: 'from-purple-400 to-violet-600'
    },
    {
      id: 'id_document',
      name: 'Documenti ID',
      icon: '🆔',
      color: 'text-slate-600',
      gradient: 'from-gray-400 to-slate-600'
    },
    {
      id: 'cv',
      name: 'CV/Resume',
      icon: '📋',
      color: 'text-teal-600',
      gradient: 'from-teal-400 to-cyan-600'
    },
    {
      id: 'evaluation',
      name: 'Valutazioni',
      icon: '⭐',
      color: 'text-yellow-600',
      gradient: 'from-yellow-400 to-amber-600'
    },
    {
      id: 'warning',
      name: 'Richiami',
      icon: '⚠️',
      color: 'text-orange-600',
      gradient: 'from-orange-400 to-red-600'
    }
  ];

  const quickFilters = [
    {
      id: 'recent',
      name: 'Recenti',
      icon: Clock,
      color: 'text-blue-600',
      count: 5
    },
    {
      id: 'confidential',
      name: 'Confidenziali',
      icon: Shield,
      color: 'text-red-600',
      count: documentCounts['confidential'] || 0
    },
    {
      id: 'shared',
      name: 'Condivisi',
      icon: Share2,
      color: 'text-green-600',
      count: 0
    },
    {
      id: 'favorites',
      name: 'Preferiti',
      icon: Star,
      color: 'text-yellow-600',
      count: 0
    },
    {
      id: 'expiring',
      name: 'In Scadenza',
      icon: Calendar,
      color: 'text-orange-600',
      count: documentCounts['expiring'] || 0
    }
  ];

  const archiveFilters = [
    {
      id: 'archived',
      name: 'Archivio',
      icon: Archive,
      color: 'text-gray-600',
      count: 0
    },
    {
      id: 'trash',
      name: 'Cestino',
      icon: Trash2,
      color: 'text-gray-600',
      count: 0
    }
  ];

  const getTotalCount = () => {
    return Object.values(documentCounts).reduce((sum, count) => sum + count, 0);
  };

  return (
    <div className="space-y-6">
      {/* Categories */}
      <div className="bg-white/80 backdrop-blur-lg rounded-xl p-4">
        <h3 className="font-medium text-gray-700 mb-3">Categorie</h3>
        <div className="space-y-1">
          {defaultCategories.map((category) => {
            const isSelected = selectedCategory === (category.id === 'all' ? null : category.id);
            const count = category.id === 'all' ? getTotalCount() : (documentCounts[category.id] || 0);
            
            return (
              <button
                key={category.id}
                onClick={() => onSelectCategory(category.id === 'all' ? null : category.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${
                  isSelected 
                    ? 'bg-gradient-to-r ' + category.gradient + ' text-white shadow-md'
                    : 'hover:bg-gray-50'
                }`}
                data-testid={`button-category-${category.id}`}
              >
                <div className="flex items-center gap-3">
                  {typeof category.icon === 'string' ? (
                    <span className="text-xl">{category.icon}</span>
                  ) : (
                    <category.icon className={`h-5 w-5 ${isSelected ? 'text-white' : category.color}`} />
                  )}
                  <span className={`font-medium ${isSelected ? 'text-white' : 'text-gray-700'}`}>
                    {category.name}
                  </span>
                </div>
                {count > 0 && (
                  <span className={`text-sm ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Filters */}
      <div className="bg-white/80 backdrop-blur-lg rounded-xl p-4">
        <h3 className="font-medium text-gray-700 mb-3">Filtri Rapidi</h3>
        <div className="space-y-1">
          {quickFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => onSelectCategory(filter.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${
                selectedCategory === filter.id
                  ? 'bg-gray-100'
                  : 'hover:bg-gray-50'
              }`}
              data-testid={`button-filter-${filter.id}`}
            >
              <div className="flex items-center gap-3">
                <filter.icon className={`h-4 w-4 ${filter.color}`} />
                <span className="text-gray-700">{filter.name}</span>
              </div>
              {filter.count > 0 && (
                <span className="text-sm text-gray-500">{filter.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Archive & Trash */}
      <div className="bg-white/80 backdrop-blur-lg rounded-xl p-4">
        <div className="space-y-1">
          {archiveFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => onSelectCategory(filter.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${
                selectedCategory === filter.id
                  ? 'bg-gray-100'
                  : 'hover:bg-gray-50'
              }`}
              data-testid={`button-archive-${filter.id}`}
            >
              <div className="flex items-center gap-3">
                <filter.icon className={`h-4 w-4 ${filter.color}`} />
                <span className="text-gray-700">{filter.name}</span>
              </div>
              {filter.count > 0 && (
                <span className="text-sm text-gray-500">{filter.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Storage Info */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 text-white">
        <h4 className="font-medium mb-2">Spazio Utilizzato</h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Utilizzato</span>
            <span>245 MB / 1 GB</span>
          </div>
          <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full" style={{ width: '24.5%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}