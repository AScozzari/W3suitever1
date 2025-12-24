import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Pencil, 
  Trash2, 
  Archive, 
  Building2, 
  User, 
  CalendarIcon,
  Search,
  X,
  Eye,
  AlertTriangle,
  Info,
  Lock,
  FolderTree
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { CategoryFormModal } from './CategoryFormModal';
import { TypologyFormModal } from './TypologyFormModal';

interface Category {
  id: string;
  productType: string;
  nome: string;
  descrizione?: string | null;
  icona?: string | null;
  ordine: number;
  source: string;
  isBrandSynced: boolean;
  isActive: boolean;
  versionNumber?: number;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Typology {
  id: string;
  categoryId: string;
  nome: string;
  descrizione?: string | null;
  source: string;
  isBrandSynced: boolean;
  isActive: boolean;
  versionNumber?: number;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Driver {
  id: string;
  code: string;
  name: string;
  source: string;
  isBrandSynced: boolean;
}

export default function CategoriesTypologiesDataTable() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'categories' | 'typologies'>('categories');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [productTypeFilter, setProductTypeFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingTypology, setEditingTypology] = useState<Typology | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isTypologyModalOpen, setIsTypologyModalOpen] = useState(false);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ type: 'category' | 'typology'; item: Category | Typology } | null>(null);

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/wms/categories'],
  });

  const { data: typologies = [], isLoading: typologiesLoading } = useQuery<Typology[]>({
    queryKey: ['/api/wms/product-types'],
  });

  const { data: drivers = [] } = useQuery<Driver[]>({
    queryKey: ['/api/wms/drivers'],
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/wms/categories/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wms/categories'] });
      toast({ title: 'Categoria eliminata', description: 'La categoria è stata eliminata con successo.' });
      setDeleteDialogOpen(false);
      setSelectedItem(null);
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Errore', 
        description: error.message || 'Impossibile eliminare la categoria. Potrebbe avere prodotti associati.',
        variant: 'destructive'
      });
    }
  });

  const deleteTypologyMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/wms/product-types/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wms/product-types'] });
      toast({ title: 'Tipologia eliminata', description: 'La tipologia è stata eliminata con successo.' });
      setDeleteDialogOpen(false);
      setSelectedItem(null);
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Errore', 
        description: error.message || 'Impossibile eliminare la tipologia. Potrebbe avere prodotti associati.',
        variant: 'destructive'
      });
    }
  });

  const archiveCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/wms/categories/${id}/archive`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wms/categories'] });
      toast({ title: 'Categoria archiviata', description: 'La categoria è stata archiviata con successo.' });
      setArchiveDialogOpen(false);
      setSelectedItem(null);
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Errore', 
        description: error.message || 'Impossibile archiviare la categoria.',
        variant: 'destructive'
      });
    }
  });

  const archiveTypologyMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/wms/product-types/${id}/archive`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wms/product-types'] });
      toast({ title: 'Tipologia archiviata', description: 'La tipologia è stata archiviata con successo.' });
      setArchiveDialogOpen(false);
      setSelectedItem(null);
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Errore', 
        description: error.message || 'Impossibile archiviare la tipologia.',
        variant: 'destructive'
      });
    }
  });

  const filteredCategories = useMemo(() => {
    return categories.filter(cat => {
      if (searchTerm && !cat.nome.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (productTypeFilter !== 'all' && cat.productType !== productTypeFilter) return false;
      if (sourceFilter !== 'all' && cat.source !== sourceFilter) return false;
      if (dateFrom && new Date(cat.createdAt) < dateFrom) return false;
      if (dateTo && new Date(cat.createdAt) > dateTo) return false;
      if (cat.archivedAt) return false;
      return true;
    });
  }, [categories, searchTerm, productTypeFilter, sourceFilter, dateFrom, dateTo]);

  const filteredTypologies = useMemo(() => {
    return typologies.filter(typ => {
      if (searchTerm && !typ.nome.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (sourceFilter !== 'all' && typ.source !== sourceFilter) return false;
      if (categoryFilter !== 'all' && typ.categoryId !== categoryFilter) return false;
      if (dateFrom && new Date(typ.createdAt) < dateFrom) return false;
      if (dateTo && new Date(typ.createdAt) > dateTo) return false;
      if (typ.archivedAt) return false;
      return true;
    });
  }, [typologies, searchTerm, sourceFilter, categoryFilter, dateFrom, dateTo]);

  // Separazione Brand vs Tenant
  const brandCategories = useMemo(() => 
    filteredCategories.filter(cat => cat.source === 'brand' || cat.isBrandSynced), 
    [filteredCategories]
  );
  const tenantCategories = useMemo(() => 
    filteredCategories.filter(cat => cat.source !== 'brand' && !cat.isBrandSynced), 
    [filteredCategories]
  );
  const brandTypologies = useMemo(() => 
    filteredTypologies.filter(typ => typ.source === 'brand' || typ.isBrandSynced), 
    [filteredTypologies]
  );
  const tenantTypologies = useMemo(() => 
    filteredTypologies.filter(typ => typ.source !== 'brand' && !typ.isBrandSynced), 
    [filteredTypologies]
  );

  const getCategoryName = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.nome || categoryId;
  };

  const getProductTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'PHYSICAL': 'Fisico',
      'VIRTUAL': 'Virtuale',
      'SERVICE': 'Servizio',
      'CANVAS': 'Canvas'
    };
    return labels[type] || type;
  };

  const handleEdit = (type: 'category' | 'typology', item: Category | Typology) => {
    if (type === 'category') {
      setEditingCategory(item as Category);
      setIsCategoryModalOpen(true);
    } else {
      setEditingTypology(item as Typology);
      setIsTypologyModalOpen(true);
    }
  };

  const handleDelete = (type: 'category' | 'typology', item: Category | Typology) => {
    setSelectedItem({ type, item });
    setDeleteDialogOpen(true);
  };

  const handleArchive = (type: 'category' | 'typology', item: Category | Typology) => {
    setSelectedItem({ type, item });
    setArchiveDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!selectedItem) return;
    if (selectedItem.type === 'category') {
      deleteCategoryMutation.mutate(selectedItem.item.id);
    } else {
      deleteTypologyMutation.mutate(selectedItem.item.id);
    }
  };

  const confirmArchive = () => {
    if (!selectedItem) return;
    if (selectedItem.type === 'category') {
      archiveCategoryMutation.mutate(selectedItem.item.id);
    } else {
      archiveTypologyMutation.mutate(selectedItem.item.id);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setProductTypeFilter('all');
    setSourceFilter('all');
    setCategoryFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const SourceBadge = ({ source, isBrandSynced }: { source: string; isBrandSynced: boolean }) => {
    if (source === 'brand' || isBrandSynced) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 gap-1">
                <Building2 className="h-3 w-3" />
                Brand
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Gestito centralmente dal Brand HQ - Solo visualizzazione</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <User className="h-3 w-3" />
        Tenant
      </Badge>
    );
  };

  const ActionButtons = ({ 
    type, 
    item, 
    isBrandManaged 
  }: { 
    type: 'category' | 'typology'; 
    item: Category | Typology; 
    isBrandManaged: boolean;
  }) => {
    if (isBrandManaged) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-12 w-12 p-0">
                <Eye className="h-8 w-8 text-gray-400" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Elemento gestito dal Brand - Solo visualizzazione</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <div className="flex items-center justify-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-12 w-12 p-0"
                onClick={() => handleEdit(type, item)}
                data-testid={`button-edit-${type}-${item.id}`}
              >
                <Pencil className="h-8 w-8" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Modifica (crea nuova versione)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-12 w-12 p-0"
                onClick={() => handleArchive(type, item)}
                data-testid={`button-archive-${type}-${item.id}`}
              >
                <Archive className="h-8 w-8 text-amber-500" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Archivia (soft-delete, recuperabile)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-12 w-12 p-0 text-red-500 hover:text-red-600"
                onClick={() => handleDelete(type, item)}
                data-testid={`button-delete-${type}-${item.id}`}
              >
                <Trash2 className="h-8 w-8" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Elimina (solo se nessun prodotto associato)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  };

  return (
    <Card
      className="p-6 mt-6"
      style={{
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)'
      }}
      data-testid="categories-typologies-datatable"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
              Gestione Avanzata
            </h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p><strong>Modifica:</strong> Crea una nuova versione (storicizzazione)</p>
                  <p><strong>Archivia:</strong> Soft-delete recuperabile</p>
                  <p><strong>Elimina:</strong> Solo se nessun prodotto associato</p>
                  <p className="mt-1 text-muted-foreground"><Building2 className="h-3 w-3 inline mr-1" />Elementi Brand = solo visualizzazione</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {(searchTerm || productTypeFilter !== 'all' || sourceFilter !== 'all' || categoryFilter !== 'all' || dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500">
              <X className="h-4 w-4 mr-1" />
              Pulisci filtri
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Cerca per nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>

          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-source-filter">
              <SelectValue placeholder="Origine" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le origini</SelectItem>
              <SelectItem value="brand">Brand</SelectItem>
              <SelectItem value="tenant">Tenant</SelectItem>
            </SelectContent>
          </Select>

          {activeTab === 'categories' && (
            <Select value={productTypeFilter} onValueChange={setProductTypeFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-product-type-filter">
                <SelectValue placeholder="Tipo Prodotto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i tipi</SelectItem>
                <SelectItem value="PHYSICAL">Fisico</SelectItem>
                <SelectItem value="VIRTUAL">Virtuale</SelectItem>
                <SelectItem value="SERVICE">Servizio</SelectItem>
                <SelectItem value="CANVAS">Canvas</SelectItem>
              </SelectContent>
            </Select>
          )}

          {activeTab === 'typologies' && (
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le categorie</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[140px] justify-start text-left font-normal" data-testid="button-date-from">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, 'dd/MM/yy', { locale: it }) : 'Da data'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={setDateFrom}
                locale={it}
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[140px] justify-start text-left font-normal" data-testid="button-date-to">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, 'dd/MM/yy', { locale: it }) : 'A data'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={setDateTo}
                locale={it}
              />
            </PopoverContent>
          </Popover>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'categories' | 'typologies')}>
          <TabsList>
            <TabsTrigger value="categories" data-testid="tab-categories">
              Categorie ({filteredCategories.length})
            </TabsTrigger>
            <TabsTrigger value="typologies" data-testid="tab-typologies">
              Tipologie ({filteredTypologies.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="mt-4 space-y-6">
            {/* Brand Categories Section (Read-only) */}
            <div data-testid="brand-categories-section">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    Categorie Brand
                    <Lock className="h-4 w-4 text-gray-400" />
                  </h4>
                  <p className="text-sm text-gray-500">Categorie sincronizzate dal brand (sola lettura)</p>
                </div>
                <Badge variant="secondary" className="ml-auto">{brandCategories.length} categorie</Badge>
              </div>
              <div className="rounded-md border">
                <Table className="table-fixed w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[35%]">Nome</TableHead>
                      <TableHead className="w-[20%]">Tipo Prodotto</TableHead>
                      <TableHead className="w-[12%]">Versione</TableHead>
                      <TableHead className="w-[20%]">Data Creazione</TableHead>
                      <TableHead className="w-[13%] text-center">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoriesLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          Caricamento...
                        </TableCell>
                      </TableRow>
                    ) : brandCategories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          Nessuna categoria Brand disponibile
                        </TableCell>
                      </TableRow>
                    ) : (
                      brandCategories.map((cat) => (
                        <TableRow key={cat.id} data-testid={`row-brand-category-${cat.id}`}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {cat.icona && <span>{cat.icona}</span>}
                              {cat.nome}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{getProductTypeLabel(cat.productType)}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">v{cat.versionNumber || 1}</span>
                          </TableCell>
                          <TableCell>
                            {format(new Date(cat.createdAt), 'dd/MM/yyyy HH:mm', { locale: it })}
                          </TableCell>
                          <TableCell className="text-center">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <Eye className="h-4 w-4 text-gray-400" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Categoria Brand - Solo visualizzazione</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Tenant Categories Section (CRUD) */}
            <div data-testid="tenant-categories-section">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                  <FolderTree className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-900">Categorie Personalizzate</h4>
                  <p className="text-sm text-gray-500">Categorie create dal tuo negozio</p>
                </div>
                <Badge variant="secondary" className="ml-auto">{tenantCategories.length} categorie</Badge>
              </div>
              <div className="rounded-md border">
                <Table className="table-fixed w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[35%]">Nome</TableHead>
                      <TableHead className="w-[20%]">Tipo Prodotto</TableHead>
                      <TableHead className="w-[12%]">Versione</TableHead>
                      <TableHead className="w-[20%]">Data Creazione</TableHead>
                      <TableHead className="w-[13%] text-center">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoriesLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          Caricamento...
                        </TableCell>
                      </TableRow>
                    ) : tenantCategories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          Nessuna categoria personalizzata trovata
                        </TableCell>
                      </TableRow>
                    ) : (
                      tenantCategories.map((cat) => (
                        <TableRow key={cat.id} data-testid={`row-tenant-category-${cat.id}`}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {cat.icona && <span>{cat.icona}</span>}
                              {cat.nome}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{getProductTypeLabel(cat.productType)}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">v{cat.versionNumber || 1}</span>
                          </TableCell>
                          <TableCell>
                            {format(new Date(cat.createdAt), 'dd/MM/yyyy HH:mm', { locale: it })}
                          </TableCell>
                          <TableCell className="text-center">
                            <ActionButtons 
                              type="category" 
                              item={cat} 
                              isBrandManaged={false}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="typologies" className="mt-4 space-y-6">
            {/* Brand Typologies Section (Read-only) */}
            <div data-testid="brand-typologies-section">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    Tipologie Brand
                    <Lock className="h-4 w-4 text-gray-400" />
                  </h4>
                  <p className="text-sm text-gray-500">Tipologie sincronizzate dal brand (sola lettura)</p>
                </div>
                <Badge variant="secondary" className="ml-auto">{brandTypologies.length} tipologie</Badge>
              </div>
              <div className="rounded-md border">
                <Table className="table-fixed w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[35%]">Nome</TableHead>
                      <TableHead className="w-[20%]">Categoria</TableHead>
                      <TableHead className="w-[12%]">Versione</TableHead>
                      <TableHead className="w-[20%]">Data Creazione</TableHead>
                      <TableHead className="w-[13%] text-center">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {typologiesLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          Caricamento...
                        </TableCell>
                      </TableRow>
                    ) : brandTypologies.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          Nessuna tipologia Brand disponibile
                        </TableCell>
                      </TableRow>
                    ) : (
                      brandTypologies.map((typ) => (
                        <TableRow key={typ.id} data-testid={`row-brand-typology-${typ.id}`}>
                          <TableCell className="font-medium">{typ.nome}</TableCell>
                          <TableCell>{getCategoryName(typ.categoryId)}</TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">v{typ.versionNumber || 1}</span>
                          </TableCell>
                          <TableCell>
                            {format(new Date(typ.createdAt), 'dd/MM/yyyy HH:mm', { locale: it })}
                          </TableCell>
                          <TableCell className="text-center">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <Eye className="h-4 w-4 text-gray-400" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Tipologia Brand - Solo visualizzazione</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Tenant Typologies Section (CRUD) */}
            <div data-testid="tenant-typologies-section">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                  <FolderTree className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-900">Tipologie Personalizzate</h4>
                  <p className="text-sm text-gray-500">Tipologie create dal tuo negozio</p>
                </div>
                <Badge variant="secondary" className="ml-auto">{tenantTypologies.length} tipologie</Badge>
              </div>
              <div className="rounded-md border">
                <Table className="table-fixed w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[35%]">Nome</TableHead>
                      <TableHead className="w-[20%]">Categoria</TableHead>
                      <TableHead className="w-[12%]">Versione</TableHead>
                      <TableHead className="w-[20%]">Data Creazione</TableHead>
                      <TableHead className="w-[13%] text-center">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {typologiesLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          Caricamento...
                        </TableCell>
                      </TableRow>
                    ) : tenantTypologies.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          Nessuna tipologia personalizzata trovata
                        </TableCell>
                      </TableRow>
                    ) : (
                      tenantTypologies.map((typ) => (
                        <TableRow key={typ.id} data-testid={`row-tenant-typology-${typ.id}`}>
                          <TableCell className="font-medium">{typ.nome}</TableCell>
                          <TableCell>{getCategoryName(typ.categoryId)}</TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">v{typ.versionNumber || 1}</span>
                          </TableCell>
                          <TableCell>
                            {format(new Date(typ.createdAt), 'dd/MM/yyyy HH:mm', { locale: it })}
                          </TableCell>
                          <TableCell className="text-center">
                            <ActionButtons 
                              type="typology" 
                              item={typ} 
                              isBrandManaged={false}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Conferma Eliminazione
            </AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare "{selectedItem?.item.nome}"? 
              Questa azione è irreversibile e sarà possibile solo se non ci sono prodotti associati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-amber-500" />
              Conferma Archiviazione
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vuoi archiviare "{selectedItem?.item.nome}"? 
              L'elemento non sarà più visibile ma potrà essere recuperato in seguito.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmArchive}
              className="bg-amber-500 hover:bg-amber-600"
            >
              Archivia
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isCategoryModalOpen && (
        <CategoryFormModal
          isOpen={isCategoryModalOpen}
          onClose={() => {
            setIsCategoryModalOpen(false);
            setEditingCategory(null);
          }}
          category={editingCategory}
          selectedProductType={editingCategory?.productType as any}
        />
      )}

      {isTypologyModalOpen && editingTypology && (
        <TypologyFormModal
          isOpen={isTypologyModalOpen}
          onClose={() => {
            setIsTypologyModalOpen(false);
            setEditingTypology(null);
          }}
          typology={editingTypology}
          categoryId={editingTypology.categoryId}
        />
      )}
    </Card>
  );
}
