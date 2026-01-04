import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import Layout from '../components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Folder, File, Upload, MoreVertical, Grid, List, Search, Plus, 
  Download, Trash2, Share2, Star, StarOff, Clock, Home, ChevronRight,
  FileText, Image, FileVideo, FileAudio, Archive, FileSpreadsheet,
  Filter, SortAsc, SortDesc, RefreshCw, Info, Lock, Users, Eye
} from 'lucide-react';

interface StorageFolder {
  id: string;
  tenantId: string;
  parentFolderId: string | null;
  name: string;
  path: string;
  isSystemFolder: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StorageObject {
  id: string;
  tenantId: string;
  folderId: string | null;
  ownerId: string;
  name: string;
  displayName: string;
  mimeType: string;
  sizeBytes: number;
  category: string;
  isPublic: boolean;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  ownerName?: string;
}

interface StorageQuota {
  usedBytes: number;
  quotaBytes: number;
  fileCount: number;
}

interface BreadcrumbItem {
  id: string | null;
  name: string;
  path: string;
}

const CATEGORY_ICONS: Record<string, typeof File> = {
  documents: FileText,
  images: Image,
  videos: FileVideo,
  audio: FileAudio,
  archives: Archive,
  spreadsheets: FileSpreadsheet,
  default: File
};

const MIME_CATEGORIES: Record<string, string> = {
  'application/pdf': 'documents',
  'application/msword': 'documents',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'documents',
  'text/plain': 'documents',
  'image/jpeg': 'images',
  'image/png': 'images',
  'image/gif': 'images',
  'image/webp': 'images',
  'video/mp4': 'videos',
  'video/webm': 'videos',
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'application/zip': 'archives',
  'application/x-rar-compressed': 'archives',
  'application/vnd.ms-excel': 'spreadsheets',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'spreadsheets',
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Oggi';
  if (diffDays === 1) return 'Ieri';
  if (diffDays < 7) return `${diffDays} giorni fa`;
  
  return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getFileIcon(mimeType: string) {
  const category = MIME_CATEGORIES[mimeType] || 'default';
  return CATEGORY_ICONS[category] || File;
}

export default function MyDrivePage() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('my-files');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const tenantSlug = location.split('/')[1];

  const { data: foldersData, isLoading: foldersLoading } = useQuery<StorageFolder[]>({
    queryKey: ['/api/storage/folders', currentFolderId],
    enabled: activeTab === 'my-files' || activeTab === 'team-files'
  });

  const { data: objectsData, isLoading: objectsLoading } = useQuery<StorageObject[]>({
    queryKey: ['/api/storage/objects', { folderId: currentFolderId, favorite: activeTab === 'favorites' }]
  });

  const { data: quotaData } = useQuery<StorageQuota>({
    queryKey: ['/api/storage/quota']
  });

  const { data: recentData } = useQuery<{ objects: StorageObject[] }>({
    queryKey: ['/api/storage/objects/recent'],
    enabled: activeTab === 'recent'
  });

  const { data: sharedData } = useQuery<{ objects: StorageObject[], folders: StorageFolder[] }>({
    queryKey: ['/api/storage/shared-with-me'],
    enabled: activeTab === 'shared'
  });

  const createFolderMutation = useMutation({
    mutationFn: async (data: { name: string; parentFolderId: string | null }) => {
      const response = await fetch('/api/storage/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Errore creazione cartella');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/storage/folders'] });
      setNewFolderDialogOpen(false);
      setNewFolderName('');
      toast({ title: 'Cartella creata', description: 'La cartella è stata creata con successo' });
    },
    onError: () => {
      toast({ title: 'Errore', description: 'Impossibile creare la cartella', variant: 'destructive' });
    }
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async (objectId: string) => {
      const response = await fetch(`/api/storage/objects/${objectId}/favorite`, { method: 'POST' });
      if (!response.ok) throw new Error('Errore');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/storage/objects'] });
    }
  });

  const deleteObjectMutation = useMutation({
    mutationFn: async (objectId: string) => {
      const response = await fetch(`/api/storage/objects/${objectId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Errore eliminazione');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/storage/objects'] });
      toast({ title: 'File eliminato', description: 'Il file è stato eliminato con successo' });
    },
    onError: () => {
      toast({ title: 'Errore', description: 'Impossibile eliminare il file', variant: 'destructive' });
    }
  });

  const breadcrumbs: BreadcrumbItem[] = useMemo(() => {
    const items: BreadcrumbItem[] = [{ id: null, name: 'My Drive', path: '' }];
    return items;
  }, [currentFolderId]);

  const filteredAndSortedItems = useMemo(() => {
    let folders = foldersData || [];
    let objects = (activeTab === 'recent' ? recentData?.objects : 
                   activeTab === 'shared' ? sharedData?.objects : 
                   objectsData) || [];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      folders = folders.filter(f => f.name.toLowerCase().includes(query));
      objects = objects.filter(o => o.displayName.toLowerCase().includes(query));
    }

    if (activeTab === 'favorites') {
      objects = objects.filter(o => o.isFavorite);
    }

    folders.sort((a, b) => {
      if (sortBy === 'name') return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      if (sortBy === 'date') return sortOrder === 'asc' ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return 0;
    });

    objects.sort((a, b) => {
      if (sortBy === 'name') return sortOrder === 'asc' ? a.displayName.localeCompare(b.displayName) : b.displayName.localeCompare(a.displayName);
      if (sortBy === 'date') return sortOrder === 'asc' ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'size') return sortOrder === 'asc' ? a.sizeBytes - b.sizeBytes : b.sizeBytes - a.sizeBytes;
      return 0;
    });

    return { folders, objects };
  }, [foldersData, objectsData, recentData, sharedData, searchQuery, sortBy, sortOrder, activeTab]);

  const handleFolderClick = useCallback((folderId: string) => {
    setCurrentFolderId(folderId);
    setSelectedItems(new Set());
  }, []);

  const handleFileClick = useCallback(async (object: StorageObject) => {
    try {
      const response = await fetch(`/api/storage/objects/${object.id}/signed-url`);
      if (!response.ok) throw new Error('Errore');
      const { url } = await response.json();
      window.open(url, '_blank');
    } catch {
      toast({ title: 'Errore', description: 'Impossibile aprire il file', variant: 'destructive' });
    }
  }, [toast]);

  const quotaPercentage = quotaData ? Math.round((quotaData.usedBytes / quotaData.quotaBytes) * 100) : 0;

  const isLoading = foldersLoading || objectsLoading;

  return (
    <Layout title="My Drive" subtitle="Gestisci i tuoi file e documenti">
      <div className="space-y-1rem">
        <div className="flex flex-col sm:flex-row gap-0.5rem items-start sm:items-center justify-between">
          <div className="flex items-center gap-0.25rem text-0.875rem text-muted-foreground" data-testid="breadcrumb-nav">
            {breadcrumbs.map((item, index) => (
              <div key={item.id || 'root'} className="flex items-center gap-0.25rem">
                {index > 0 && <ChevronRight className="w-1rem h-1rem" />}
                <button
                  onClick={() => setCurrentFolderId(item.id)}
                  className={`hover:text-primary transition-colors ${index === breadcrumbs.length - 1 ? 'text-foreground font-medium' : ''}`}
                  data-testid={`breadcrumb-item-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {index === 0 && <Home className="w-1rem h-1rem inline mr-0.25rem" />}
                  {item.name}
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-0.5rem">
            <div className="relative">
              <Search className="absolute left-0.5rem top-1/2 -translate-y-1/2 w-1rem h-1rem text-muted-foreground" />
              <Input
                placeholder="Cerca file..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-2rem w-64"
                data-testid="input-search-files"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-sort">
                  {sortOrder === 'asc' ? <SortAsc className="w-1rem h-1rem mr-0.25rem" /> : <SortDesc className="w-1rem h-1rem mr-0.25rem" />}
                  Ordina
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => { setSortBy('name'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }} data-testid="sort-by-name">
                  Nome
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortBy('date'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }} data-testid="sort-by-date">
                  Data
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortBy('size'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }} data-testid="sort-by-size">
                  Dimensione
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
                data-testid="button-view-grid"
              >
                <Grid className="w-1rem h-1rem" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
                data-testid="button-view-list"
              >
                <List className="w-1rem h-1rem" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-1rem">
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-1rem">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <div className="flex items-center justify-between mb-1rem">
                    <TabsList>
                      <TabsTrigger value="my-files" data-testid="tab-my-files">
                        <Folder className="w-1rem h-1rem mr-0.25rem" />
                        I miei file
                      </TabsTrigger>
                      <TabsTrigger value="team-files" data-testid="tab-team-files">
                        <Users className="w-1rem h-1rem mr-0.25rem" />
                        Team
                      </TabsTrigger>
                      <TabsTrigger value="shared" data-testid="tab-shared">
                        <Share2 className="w-1rem h-1rem mr-0.25rem" />
                        Condivisi
                      </TabsTrigger>
                      <TabsTrigger value="recent" data-testid="tab-recent">
                        <Clock className="w-1rem h-1rem mr-0.25rem" />
                        Recenti
                      </TabsTrigger>
                      <TabsTrigger value="favorites" data-testid="tab-favorites">
                        <Star className="w-1rem h-1rem mr-0.25rem" />
                        Preferiti
                      </TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-0.5rem">
                      <Dialog open={newFolderDialogOpen} onOpenChange={setNewFolderDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" data-testid="button-new-folder">
                            <Plus className="w-1rem h-1rem mr-0.25rem" />
                            Nuova cartella
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Nuova cartella</DialogTitle>
                            <DialogDescription>Inserisci il nome della nuova cartella</DialogDescription>
                          </DialogHeader>
                          <div className="py-1rem">
                            <Label htmlFor="folder-name">Nome cartella</Label>
                            <Input
                              id="folder-name"
                              value={newFolderName}
                              onChange={(e) => setNewFolderName(e.target.value)}
                              placeholder="Es. Documenti lavoro"
                              data-testid="input-folder-name"
                            />
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setNewFolderDialogOpen(false)}>Annulla</Button>
                            <Button
                              onClick={() => createFolderMutation.mutate({ name: newFolderName, parentFolderId: currentFolderId })}
                              disabled={!newFolderName.trim() || createFolderMutation.isPending}
                              data-testid="button-create-folder"
                            >
                              {createFolderMutation.isPending ? 'Creazione...' : 'Crea'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Button size="sm" data-testid="button-upload-file">
                        <Upload className="w-1rem h-1rem mr-0.25rem" />
                        Carica file
                      </Button>
                    </div>
                  </div>

                  <TabsContent value={activeTab} className="mt-0">
                    {isLoading ? (
                      <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1rem' : 'space-y-0.5rem'}>
                        {Array.from({ length: 8 }).map((_, i) => (
                          <Skeleton key={i} className={viewMode === 'grid' ? 'h-32 rounded-lg' : 'h-12 rounded-md'} />
                        ))}
                      </div>
                    ) : (
                      <>
                        {filteredAndSortedItems.folders.length === 0 && filteredAndSortedItems.objects.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-3rem text-center">
                            <Folder className="w-4rem h-4rem text-muted-foreground/50 mb-1rem" />
                            <h3 className="text-1.125rem font-medium mb-0.5rem">Nessun file trovato</h3>
                            <p className="text-muted-foreground text-0.875rem max-w-sm">
                              {searchQuery ? 'Nessun risultato per la tua ricerca' : 'Carica i tuoi primi file o crea una cartella per iniziare'}
                            </p>
                          </div>
                        ) : viewMode === 'grid' ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1rem">
                            {filteredAndSortedItems.folders.map((folder) => (
                              <div
                                key={folder.id}
                                onClick={() => handleFolderClick(folder.id)}
                                className="p-1rem border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors group"
                                data-testid={`folder-${folder.id}`}
                              >
                                <div className="flex items-center justify-between mb-0.5rem">
                                  <Folder className="w-2rem h-2rem text-[#FF6900]" />
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                                        <MoreVertical className="w-1rem h-1rem" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      <DropdownMenuItem><Share2 className="w-1rem h-1rem mr-0.5rem" /> Condividi</DropdownMenuItem>
                                      <DropdownMenuItem><Download className="w-1rem h-1rem mr-0.5rem" /> Scarica</DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem className="text-destructive"><Trash2 className="w-1rem h-1rem mr-0.5rem" /> Elimina</DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                <p className="text-0.875rem font-medium truncate">{folder.name}</p>
                                <p className="text-0.75rem text-muted-foreground">{formatDate(folder.createdAt)}</p>
                              </div>
                            ))}

                            {filteredAndSortedItems.objects.map((obj) => {
                              const FileIcon = getFileIcon(obj.mimeType);
                              return (
                                <div
                                  key={obj.id}
                                  onClick={() => handleFileClick(obj)}
                                  className="p-1rem border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors group"
                                  data-testid={`file-${obj.id}`}
                                >
                                  <div className="flex items-center justify-between mb-0.5rem">
                                    <FileIcon className="w-2rem h-2rem text-[#7B2CBF]" />
                                    <div className="flex items-center gap-0.25rem opacity-0 group-hover:opacity-100">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => { e.stopPropagation(); toggleFavoriteMutation.mutate(obj.id); }}
                                      >
                                        {obj.isFavorite ? <Star className="w-1rem h-1rem text-yellow-500 fill-yellow-500" /> : <StarOff className="w-1rem h-1rem" />}
                                      </Button>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                          <Button variant="ghost" size="sm">
                                            <MoreVertical className="w-1rem h-1rem" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                          <DropdownMenuItem><Eye className="w-1rem h-1rem mr-0.5rem" /> Anteprima</DropdownMenuItem>
                                          <DropdownMenuItem><Share2 className="w-1rem h-1rem mr-0.5rem" /> Condividi</DropdownMenuItem>
                                          <DropdownMenuItem><Download className="w-1rem h-1rem mr-0.5rem" /> Scarica</DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            className="text-destructive"
                                            onClick={() => deleteObjectMutation.mutate(obj.id)}
                                          >
                                            <Trash2 className="w-1rem h-1rem mr-0.5rem" /> Elimina
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </div>
                                  <p className="text-0.875rem font-medium truncate">{obj.displayName}</p>
                                  <p className="text-0.75rem text-muted-foreground">{formatBytes(obj.sizeBytes)}</p>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="space-y-0.25rem">
                            {filteredAndSortedItems.folders.map((folder) => (
                              <div
                                key={folder.id}
                                onClick={() => handleFolderClick(folder.id)}
                                className="flex items-center gap-1rem p-0.75rem border rounded-md hover:bg-accent/50 cursor-pointer transition-colors group"
                                data-testid={`folder-row-${folder.id}`}
                              >
                                <Folder className="w-1.5rem h-1.5rem text-[#FF6900] shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-0.875rem font-medium truncate">{folder.name}</p>
                                </div>
                                <p className="text-0.75rem text-muted-foreground hidden sm:block">{formatDate(folder.createdAt)}</p>
                                <p className="text-0.75rem text-muted-foreground w-20 text-right">-</p>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                                      <MoreVertical className="w-1rem h-1rem" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    <DropdownMenuItem><Share2 className="w-1rem h-1rem mr-0.5rem" /> Condividi</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive"><Trash2 className="w-1rem h-1rem mr-0.5rem" /> Elimina</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            ))}

                            {filteredAndSortedItems.objects.map((obj) => {
                              const FileIcon = getFileIcon(obj.mimeType);
                              return (
                                <div
                                  key={obj.id}
                                  onClick={() => handleFileClick(obj)}
                                  className="flex items-center gap-1rem p-0.75rem border rounded-md hover:bg-accent/50 cursor-pointer transition-colors group"
                                  data-testid={`file-row-${obj.id}`}
                                >
                                  <FileIcon className="w-1.5rem h-1.5rem text-[#7B2CBF] shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-0.875rem font-medium truncate">{obj.displayName}</p>
                                  </div>
                                  <p className="text-0.75rem text-muted-foreground hidden sm:block">{formatDate(obj.createdAt)}</p>
                                  <p className="text-0.75rem text-muted-foreground w-20 text-right">{formatBytes(obj.sizeBytes)}</p>
                                  <div className="flex items-center gap-0.25rem opacity-0 group-hover:opacity-100">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => { e.stopPropagation(); toggleFavoriteMutation.mutate(obj.id); }}
                                    >
                                      {obj.isFavorite ? <Star className="w-1rem h-1rem text-yellow-500 fill-yellow-500" /> : <StarOff className="w-1rem h-1rem" />}
                                    </Button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                        <Button variant="ghost" size="sm">
                                          <MoreVertical className="w-1rem h-1rem" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent>
                                        <DropdownMenuItem><Eye className="w-1rem h-1rem mr-0.5rem" /> Anteprima</DropdownMenuItem>
                                        <DropdownMenuItem><Share2 className="w-1rem h-1rem mr-0.5rem" /> Condividi</DropdownMenuItem>
                                        <DropdownMenuItem><Download className="w-1rem h-1rem mr-0.5rem" /> Scarica</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive" onClick={() => deleteObjectMutation.mutate(obj.id)}>
                                          <Trash2 className="w-1rem h-1rem mr-0.5rem" /> Elimina
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-1rem">
            <Card>
              <CardHeader className="pb-0.5rem">
                <CardTitle className="text-0.875rem flex items-center gap-0.5rem">
                  <Info className="w-1rem h-1rem" />
                  Spazio di archiviazione
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-0.75rem">
                  <Progress value={quotaPercentage} className="h-2" />
                  <div className="flex justify-between text-0.75rem text-muted-foreground">
                    <span>{quotaData ? formatBytes(quotaData.usedBytes) : '0 B'} usati</span>
                    <span>{quotaData ? formatBytes(quotaData.quotaBytes) : '1 GB'} totali</span>
                  </div>
                  <div className="text-0.75rem text-muted-foreground">
                    {quotaData?.fileCount || 0} file
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-0.5rem">
                <CardTitle className="text-0.875rem flex items-center gap-0.5rem">
                  <Lock className="w-1rem h-1rem" />
                  Sicurezza
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-0.5rem text-0.75rem text-muted-foreground">
                  <div className="flex items-center gap-0.5rem">
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      RLS Attivo
                    </Badge>
                  </div>
                  <p>I tuoi file sono protetti con Row Level Security e URL firmati con scadenza.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-0.5rem">
                <CardTitle className="text-0.875rem">Categorie</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-0.5rem">
                  {[
                    { icon: FileText, label: 'Documenti', color: '#FF6900' },
                    { icon: Image, label: 'Immagini', color: '#7B2CBF' },
                    { icon: FileVideo, label: 'Video', color: '#FF6900' },
                    { icon: Archive, label: 'Archivi', color: '#7B2CBF' },
                  ].map((cat) => (
                    <button
                      key={cat.label}
                      className="w-full flex items-center gap-0.5rem p-0.5rem rounded hover:bg-accent transition-colors text-0.875rem"
                      data-testid={`category-${cat.label.toLowerCase()}`}
                    >
                      <cat.icon className="w-1rem h-1rem" style={{ color: cat.color }} />
                      {cat.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
