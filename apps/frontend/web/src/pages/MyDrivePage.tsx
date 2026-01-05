import { useState, useMemo, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import Layout from '../components/Layout';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  Folder, File, Upload, MoreVertical, LayoutGrid, List, Search, FolderPlus, 
  Download, Trash2, Share2, Star, StarOff, Clock, Home, ChevronRight,
  FileText, Image, FileVideo, FileAudio, Archive, FileSpreadsheet,
  ArrowUpDown, HardDrive, Users, Eye, Copy, CheckCircle2, AlertCircle,
  ChevronDown, Settings, Shield, Sparkles, FilePlus, ChevronUp
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StorageFolder {
  id: string;
  tenantId: string;
  parentFolderId: string | null;
  name: string;
  path: string;
  isSystemFolder: boolean;
  isShared?: boolean;
  shareCount?: number;
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
  isShared?: boolean;
  shareCount?: number;
  createdAt: string;
  updatedAt: string;
  ownerName?: string;
}

interface StorageShare {
  id: string;
  objectId?: string;
  folderId?: string;
  sharedWithUserId?: string;
  sharedWithEmail?: string;
  role: 'viewer' | 'editor' | 'owner';
  expiresAt?: string;
}

interface StorageQuota {
  usedBytes: number;
  quotaBytes: number;
  fileCount: number;
}

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
  if (diffDays < 7) return `${diffDays}g fa`;
  
  return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

function getFileIcon(mimeType: string) {
  const category = MIME_CATEGORIES[mimeType] || 'default';
  const icons: Record<string, typeof File> = {
    documents: FileText,
    images: Image,
    videos: FileVideo,
    audio: FileAudio,
    archives: Archive,
    spreadsheets: FileSpreadsheet,
    default: File
  };
  return icons[category] || File;
}

function getCategoryColor(mimeType: string): string {
  const category = MIME_CATEGORIES[mimeType] || 'default';
  const colors: Record<string, string> = {
    documents: 'text-orange-500',
    images: 'text-purple-500',
    videos: 'text-rose-500',
    audio: 'text-emerald-500',
    archives: 'text-amber-500',
    spreadsheets: 'text-green-500',
    default: 'text-slate-500'
  };
  return colors[category] || colors.default;
}

export function MyDriveContent({ embedded = false }: { embedded?: boolean }) {
  const [location] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>([]);
  const [activeSection, setActiveSection] = useState<'my-files' | 'recent' | 'favorites' | 'shared' | 'trash'>('my-files');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFileDialogOpen, setNewFileDialogOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ fileName: string; progress: number; status: 'uploading' | 'success' | 'error' }[]>([]);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<{ type: 'object' | 'folder'; id: string; name: string } | null>(null);
  const [shareSettings, setShareSettings] = useState({
    allowDownload: true,
    allowEdit: false,
    requirePassword: false,
    password: '',
    expiresInHours: 0,
    maxDownloads: 0
  });
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: foldersData, isLoading: foldersLoading } = useQuery<StorageFolder[]>({
    queryKey: ['/api/storage/my-drive/folders', currentFolderId],
    enabled: activeSection === 'my-files'
  });

  const { data: objectsData, isLoading: objectsLoading } = useQuery<StorageObject[]>({
    queryKey: ['/api/storage/objects', { folderId: currentFolderId, favorite: activeSection === 'favorites' }]
  });

  const { data: quotaData } = useQuery<StorageQuota>({
    queryKey: ['/api/storage/quota']
  });

  const { data: recentData } = useQuery<{ objects: StorageObject[] }>({
    queryKey: ['/api/storage/objects/recent'],
    enabled: activeSection === 'recent'
  });

  const { data: sharedData } = useQuery<{ objects: StorageObject[], folders: StorageFolder[] }>({
    queryKey: ['/api/storage/shared-with-me'],
    enabled: activeSection === 'shared'
  });

  const createFolderMutation = useMutation({
    mutationFn: async (data: { name: string; parentFolderId: string | null }) => {
      return apiRequest('/api/storage/folders', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: (newFolder: StorageFolder) => {
      queryClient.invalidateQueries({ queryKey: ['/api/storage/my-drive/folders'] });
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
      return apiRequest(`/api/storage/objects/${objectId}/favorite`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/storage/objects'] });
    }
  });

  const deleteObjectMutation = useMutation({
    mutationFn: async (objectId: string) => {
      return apiRequest(`/api/storage/objects/${objectId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/storage/objects'] });
      toast({ title: 'File eliminato', description: 'Il file è stato spostato nel cestino' });
    },
    onError: () => {
      toast({ title: 'Errore', description: 'Impossibile eliminare il file', variant: 'destructive' });
    }
  });

  const uploadBatchMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });
      if (currentFolderId) {
        formData.append('folderId', currentFolderId);
      }
      
      setUploadProgress(Array.from(files).map(f => ({ fileName: f.name, progress: 0, status: 'uploading' as const })));
      
      return apiRequest('/api/storage/upload/batch', {
        method: 'POST',
        body: formData,
        headers: {} // Let browser set Content-Type for FormData
      });
    },
    onSuccess: (result: { uploaded: number }) => {
      setUploadProgress(prev => prev.map(p => ({ ...p, status: 'success' as const, progress: 100 })));
      queryClient.invalidateQueries({ queryKey: ['/api/storage/objects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/storage/quota'] });
      toast({ 
        title: 'Upload completato', 
        description: `${result.uploaded} file caricati con successo` 
      });
      setTimeout(() => setUploadProgress([]), 3000);
    },
    onError: () => {
      setUploadProgress(prev => prev.map(p => ({ ...p, status: 'error' as const })));
      toast({ title: 'Errore', description: 'Impossibile caricare i file', variant: 'destructive' });
    }
  });

  const createShareMutation = useMutation({
    mutationFn: async (data: { objectId?: string; folderId?: string; settings: typeof shareSettings }) => {
      return apiRequest('/api/storage/share', {
        method: 'POST',
        body: JSON.stringify({
          objectId: data.objectId,
          folderId: data.folderId,
          allowDownload: data.settings.allowDownload,
          allowEdit: data.settings.allowEdit,
          requirePassword: data.settings.requirePassword,
          password: data.settings.requirePassword ? data.settings.password : undefined,
          expiresInHours: data.settings.expiresInHours || undefined,
          maxDownloads: data.settings.maxDownloads || undefined
        })
      });
    },
    onSuccess: (result: { shareUrl: string }) => {
      setShareLink(window.location.origin + result.shareUrl);
      toast({ title: 'Link creato', description: 'Il link di condivisione è stato generato' });
    },
    onError: () => {
      toast({ title: 'Errore', description: 'Impossibile creare il link', variant: 'destructive' });
    }
  });

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      uploadBatchMutation.mutate(files);
    }
  }, [uploadBatchMutation]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadBatchMutation.mutate(files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [uploadBatchMutation]);

  const handleOpenShareDialog = useCallback((type: 'object' | 'folder', id: string, name: string) => {
    setShareTarget({ type, id, name });
    setShareSettings({
      allowDownload: true,
      allowEdit: false,
      requirePassword: false,
      password: '',
      expiresInHours: 0,
      maxDownloads: 0
    });
    setShareLink(null);
    setShareDialogOpen(true);
  }, []);

  const handleCreateShare = useCallback(() => {
    if (!shareTarget) return;
    createShareMutation.mutate({
      objectId: shareTarget.type === 'object' ? shareTarget.id : undefined,
      folderId: shareTarget.type === 'folder' ? shareTarget.id : undefined,
      settings: shareSettings
    });
  }, [shareTarget, shareSettings, createShareMutation]);

  const copyShareLink = useCallback(() => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      toast({ title: 'Copiato!', description: 'Link copiato negli appunti' });
    }
  }, [shareLink, toast]);

  const filteredAndSortedItems = useMemo(() => {
    let folders = foldersData || [];
    let objects = (activeSection === 'recent' ? recentData?.objects : 
                   activeSection === 'shared' ? sharedData?.objects : 
                   objectsData) || [];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      folders = folders.filter(f => f.name.toLowerCase().includes(query));
      objects = objects.filter(o => o.displayName.toLowerCase().includes(query));
    }

    if (activeSection === 'favorites') {
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
  }, [foldersData, objectsData, recentData, sharedData, searchQuery, sortBy, sortOrder, activeSection]);

  const handleFolderClick = useCallback((folderId: string, folderName?: string) => {
    const folder = foldersData?.find(f => f.id === folderId);
    const name = folderName || folder?.name || 'Cartella';
    setFolderPath(prev => [...prev, { id: folderId, name }]);
    setCurrentFolderId(folderId);
  }, [foldersData]);

  const handleBreadcrumbClick = useCallback((index: number) => {
    if (index === -1) {
      setCurrentFolderId(null);
      setFolderPath([]);
    } else {
      const newPath = folderPath.slice(0, index + 1);
      setFolderPath(newPath);
      setCurrentFolderId(newPath[newPath.length - 1].id);
    }
  }, [folderPath]);

  const handleGoUp = useCallback(() => {
    if (folderPath.length > 0) {
      const newPath = folderPath.slice(0, -1);
      setFolderPath(newPath);
      setCurrentFolderId(newPath.length > 0 ? newPath[newPath.length - 1].id : null);
    }
  }, [folderPath]);

  const handleFileClick = useCallback(async (object: StorageObject) => {
    try {
      const data = await apiRequest(`/api/storage/objects/${object.id}/signed-url`);
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch {
      toast({ title: 'Errore', description: 'Impossibile aprire il file', variant: 'destructive' });
    }
  }, [toast]);

  const quotaPercentage = quotaData ? Math.round((quotaData.usedBytes / quotaData.quotaBytes) * 100) : 0;
  const isLoading = foldersLoading || objectsLoading;

  const sidebarItems = [
    { id: 'my-files', icon: HardDrive, label: 'I miei file', color: 'text-orange-500' },
    { id: 'recent', icon: Clock, label: 'Recenti', color: 'text-blue-500' },
    { id: 'favorites', icon: Star, label: 'Preferiti', color: 'text-yellow-500' },
    { id: 'shared', icon: Users, label: 'Condivisi', color: 'text-purple-500' },
    { id: 'trash', icon: Trash2, label: 'Cestino', color: 'text-slate-500' },
  ] as const;

  const content = (
    <TooltipProvider delayDuration={300}>
    <div className="h-full flex flex-col">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        data-testid="input-file-upload"
      />

      <div 
        className="flex-1 flex gap-0 overflow-hidden relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 z-50 backdrop-blur-sm bg-gradient-to-br from-orange-500/20 via-purple-500/10 to-orange-500/20 border-2 border-dashed border-orange-500 rounded-xl flex flex-col items-center justify-center">
            <div className="p-6 rounded-full bg-white/90 shadow-xl mb-4">
              <Upload className="w-12 h-12 text-orange-500 animate-bounce" />
            </div>
            <p className="text-xl font-semibold text-foreground">Rilascia i file qui</p>
            <p className="text-sm text-muted-foreground mt-1">Supporta fino a 20 file</p>
          </div>
        )}

        <aside className="w-56 border-r bg-gradient-to-b from-white to-slate-50/50 flex flex-col shrink-0">
          <div className="p-4">
            <Button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/25 gap-2"
              data-testid="button-upload-main"
            >
              <Upload className="w-4 h-4" />
              Carica file
            </Button>
          </div>

          <ScrollArea className="flex-1 px-2 my-drive-scroll">
            <nav className="space-y-1 py-2">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeSection === item.id 
                      ? 'bg-gradient-to-r from-orange-50 to-orange-100/50 text-orange-700 shadow-sm' 
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  data-testid={`nav-${item.id}`}
                >
                  <item.icon className={`w-5 h-5 ${activeSection === item.id ? 'text-orange-500' : item.color}`} />
                  {item.label}
                </button>
              ))}
            </nav>

            <Separator className="my-4" />

            {foldersData && foldersData.length > 0 && (
              <div className="pb-4">
                <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Cartelle</p>
                <ScrollArea className="max-h-48">
                  <nav className="space-y-0.5 pr-2">
                    {foldersData.map((folder) => (
                      <Tooltip key={folder.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => {
                              setActiveSection('my-files');
                              setFolderPath([{ id: folder.id, name: folder.name }]);
                              setCurrentFolderId(folder.id);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                              currentFolderId === folder.id 
                                ? 'bg-orange-50 text-orange-700' 
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                            data-testid={`folder-shortcut-${folder.id}`}
                          >
                            <Folder className={`w-4 h-4 shrink-0 ${currentFolderId === folder.id ? 'text-orange-500' : 'text-orange-400'}`} />
                            <span className="truncate">{folder.name}</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <div className="text-xs">
                            <p className="font-medium">{folder.name}</p>
                            <p className="text-muted-foreground">/{folder.path || folder.name}</p>
                            <p className="text-muted-foreground">Creata: {formatDate(folder.createdAt)}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </nav>
                </ScrollArea>
              </div>
            )}
          </ScrollArea>

          <div className="p-4 border-t bg-gradient-to-t from-slate-50 to-white">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Spazio utilizzato</span>
                <span className="font-medium text-slate-700">{quotaPercentage}%</span>
              </div>
              <Progress value={quotaPercentage} className="h-1.5" />
              <p className="text-xs text-slate-400">
                {quotaData ? `${formatBytes(quotaData.usedBytes)} di ${formatBytes(quotaData.quotaBytes)}` : 'Caricamento...'}
              </p>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 bg-white">
          <header className="px-6 py-4 border-b bg-gradient-to-r from-white to-slate-50/50">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm overflow-x-auto">
                {folderPath.length > 0 && (
                  <button 
                    onClick={handleGoUp}
                    className="flex items-center gap-1 text-slate-500 hover:text-orange-500 transition-colors p-1 rounded hover:bg-slate-100"
                    title="Torna indietro"
                    data-testid="button-go-up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                )}
                <button 
                  onClick={() => handleBreadcrumbClick(-1)}
                  className="flex items-center gap-1 text-slate-500 hover:text-orange-500 transition-colors"
                  data-testid="breadcrumb-home"
                >
                  <Home className="w-4 h-4" />
                </button>
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                <span className={`font-medium ${folderPath.length === 0 ? 'text-orange-600' : 'text-slate-700 cursor-pointer hover:text-orange-500'}`}
                  onClick={() => handleBreadcrumbClick(-1)}
                >
                  {sidebarItems.find(i => i.id === activeSection)?.label || 'I miei file'}
                </span>
                {folderPath.map((folder, index) => (
                  <div key={folder.id} className="flex items-center gap-2 shrink-0">
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleBreadcrumbClick(index)}
                          className={`font-medium max-w-[120px] truncate ${
                            index === folderPath.length - 1 
                              ? 'text-orange-600' 
                              : 'text-slate-700 hover:text-orange-500 cursor-pointer'
                          }`}
                          data-testid={`breadcrumb-${folder.id}`}
                        >
                          {folder.name}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>/{folderPath.slice(0, index + 1).map(f => f.name).join('/')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 flex-1 max-w-xl justify-end">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Cerca file..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-slate-50 border-slate-200 focus:bg-white"
                    data-testid="input-search"
                  />
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <ArrowUpDown className="w-4 h-4" />
                      Ordina
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSortBy('name')}>
                      {sortBy === 'name' && <CheckCircle2 className="w-4 h-4 mr-2 text-orange-500" />}
                      Nome
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('date')}>
                      {sortBy === 'date' && <CheckCircle2 className="w-4 h-4 mr-2 text-orange-500" />}
                      Data
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('size')}>
                      {sortBy === 'size' && <CheckCircle2 className="w-4 h-4 mr-2 text-orange-500" />}
                      Dimensione
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                      {sortOrder === 'asc' ? 'Crescente ↑' : 'Decrescente ↓'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex border rounded-lg overflow-hidden">
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-none"
                    data-testid="button-view-grid"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-none"
                    data-testid="button-view-list"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewFolderDialogOpen(true)}
                  className="gap-2"
                  data-testid="button-new-folder"
                >
                  <FolderPlus className="w-4 h-4" />
                  Cartella
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewFileDialogOpen(true)}
                  className="gap-2"
                  data-testid="button-new-file"
                >
                  <FilePlus className="w-4 h-4" />
                  File
                </Button>
              </div>
            </div>
          </header>

          <ScrollArea className="flex-1 my-drive-scroll">
            <div className="p-6">
              {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="aspect-square">
                      <Skeleton className="w-full h-full rounded-xl" />
                    </div>
                  ))}
                </div>
              ) : filteredAndSortedItems.folders.length === 0 && filteredAndSortedItems.objects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-100 to-purple-100 flex items-center justify-center mb-4">
                    <Sparkles className="w-10 h-10 text-orange-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-700 mb-1">Nessun file qui</h3>
                  <p className="text-sm text-slate-500 max-w-sm">
                    Trascina i file qui o clicca "Carica file" per iniziare
                  </p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filteredAndSortedItems.folders.map((folder) => (
                    <Tooltip key={folder.id}>
                      <TooltipTrigger asChild>
                        <div
                          onClick={() => handleFolderClick(folder.id, folder.name)}
                          className="group relative bg-gradient-to-br from-orange-50 to-amber-50/50 border border-orange-200/50 rounded-xl p-4 cursor-pointer hover:shadow-lg hover:shadow-orange-500/10 hover:border-orange-300 transition-all duration-200"
                          data-testid={`folder-card-${folder.id}`}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="absolute top-2 right-2 w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenShareDialog('folder', folder.id, folder.name); }}>
                                <Share2 className="w-4 h-4 mr-2" /> Condividi
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="w-4 h-4 mr-2" /> Elimina
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          
                          {folder.isShared && (
                            <div 
                              className="absolute top-2 left-2 w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center cursor-pointer hover:bg-purple-200 transition-colors"
                              onClick={(e) => { e.stopPropagation(); handleOpenShareDialog('folder', folder.id, folder.name); }}
                              data-testid={`share-indicator-folder-${folder.id}`}
                            >
                              <Users className="w-3 h-3 text-purple-600" />
                            </div>
                          )}
                          
                          <div className="flex flex-col items-center text-center">
                            <Folder className="w-12 h-12 text-orange-400 mb-3" />
                            <p className="font-medium text-sm text-slate-700 truncate w-full">{folder.name}</p>
                            <p className="text-xs text-slate-400 mt-1">{formatDate(folder.createdAt)}</p>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <div className="text-xs space-y-1">
                          <p className="font-medium">{folder.name}</p>
                          <p className="text-muted-foreground">Tipo: Cartella</p>
                          <p className="text-muted-foreground">Percorso: /{folder.path || folder.name}</p>
                          <p className="text-muted-foreground">Creata: {new Date(folder.createdAt).toLocaleDateString('it-IT')}</p>
                          {folder.isShared && <p className="text-purple-600">Condiviso con {folder.shareCount || 1} utenti</p>}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}

                  {filteredAndSortedItems.objects.map((obj) => {
                    const FileIcon = getFileIcon(obj.mimeType || 'application/octet-stream');
                    const iconColor = getCategoryColor(obj.mimeType || 'application/octet-stream');
                    const displayName = obj.displayName || obj.name || 'File senza nome';
                    const fileExtension = displayName.includes('.') ? displayName.split('.').pop()?.toUpperCase() : 'N/A';
                    return (
                      <Tooltip key={obj.id}>
                        <TooltipTrigger asChild>
                          <div
                            onClick={() => handleFileClick(obj)}
                            className="group relative bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:shadow-lg hover:shadow-purple-500/10 hover:border-purple-300 transition-all duration-200"
                            data-testid={`file-card-${obj.id}`}
                          >
                            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-7 h-7"
                                onClick={(e) => { e.stopPropagation(); toggleFavoriteMutation.mutate(obj.id); }}
                              >
                                {obj.isFavorite ? (
                                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                ) : (
                                  <StarOff className="w-4 h-4 text-slate-400" />
                                )}
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon" className="w-7 h-7">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem><Eye className="w-4 h-4 mr-2" /> Anteprima</DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenShareDialog('object', obj.id, displayName); }}>
                                    <Share2 className="w-4 h-4 mr-2" /> Condividi
                                  </DropdownMenuItem>
                                  <DropdownMenuItem><Download className="w-4 h-4 mr-2" /> Scarica</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); deleteObjectMutation.mutate(obj.id); }}>
                                    <Trash2 className="w-4 h-4 mr-2" /> Elimina
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            <div className="absolute top-2 left-2 flex items-center gap-1">
                              {obj.isFavorite && (
                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              )}
                              {obj.isShared && (
                                <div 
                                  className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center cursor-pointer hover:bg-purple-200 transition-colors"
                                  onClick={(e) => { e.stopPropagation(); handleOpenShareDialog('object', obj.id, obj.displayName); }}
                                  data-testid={`share-indicator-object-${obj.id}`}
                                >
                                  <Users className="w-3 h-3 text-purple-600" />
                                </div>
                              )}
                            </div>
                            
                            <div className="flex flex-col items-center text-center">
                              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center mb-3`}>
                                <FileIcon className={`w-6 h-6 ${iconColor}`} />
                              </div>
                              <p className="font-medium text-sm text-slate-700 truncate w-full">{displayName}</p>
                              <p className="text-xs text-slate-400 mt-1">{formatBytes(obj.sizeBytes || 0)}</p>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <div className="text-xs space-y-1">
                            <p className="font-medium">{displayName}</p>
                            <p className="text-muted-foreground">Tipo: {obj.mimeType || 'Sconosciuto'}</p>
                            <p className="text-muted-foreground">Estensione: {fileExtension}</p>
                            <p className="text-muted-foreground">Dimensione: {formatBytes(obj.sizeBytes || 0)}</p>
                            <p className="text-muted-foreground">Categoria: {obj.category || 'Altro'}</p>
                            <p className="text-muted-foreground">Modificato: {obj.updatedAt ? new Date(obj.updatedAt).toLocaleDateString('it-IT') : 'N/A'}</p>
                            {obj.ownerName && <p className="text-muted-foreground">Proprietario: {obj.ownerName}</p>}
                            {obj.isShared && <p className="text-purple-600">Condiviso con {obj.shareCount || 1} utenti</p>}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ) : (
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b">
                      <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        <th className="px-4 py-3">Nome</th>
                        <th className="px-4 py-3 hidden sm:table-cell">Modificato</th>
                        <th className="px-4 py-3 hidden sm:table-cell">Dimensione</th>
                        <th className="px-4 py-3 w-20"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredAndSortedItems.folders.map((folder) => (
                        <tr 
                          key={folder.id}
                          onClick={() => handleFolderClick(folder.id)}
                          className="hover:bg-orange-50/50 cursor-pointer transition-colors group"
                          data-testid={`folder-row-${folder.id}`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Folder className="w-5 h-5 text-orange-400" />
                              <span className="font-medium text-sm text-slate-700">{folder.name}</span>
                              {folder.isShared && (
                                <div 
                                  className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center cursor-pointer hover:bg-purple-200"
                                  onClick={(e) => { e.stopPropagation(); handleOpenShareDialog('folder', folder.id, folder.name); }}
                                  title="Condiviso"
                                >
                                  <Users className="w-3 h-3 text-purple-600" />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500 hidden sm:table-cell">{formatDate(folder.createdAt)}</td>
                          <td className="px-4 py-3 text-sm text-slate-400 hidden sm:table-cell">—</td>
                          <td className="px-4 py-3">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="w-8 h-8 opacity-0 group-hover:opacity-100">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenShareDialog('folder', folder.id, folder.name); }}>
                                  <Share2 className="w-4 h-4 mr-2" /> Condividi
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive">
                                  <Trash2 className="w-4 h-4 mr-2" /> Elimina
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                      {filteredAndSortedItems.objects.map((obj) => {
                        const FileIcon = getFileIcon(obj.mimeType);
                        const iconColor = getCategoryColor(obj.mimeType);
                        return (
                          <tr 
                            key={obj.id}
                            onClick={() => handleFileClick(obj)}
                            className="hover:bg-purple-50/50 cursor-pointer transition-colors group"
                            data-testid={`file-row-${obj.id}`}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <FileIcon className={`w-5 h-5 ${iconColor}`} />
                                <span className="font-medium text-sm text-slate-700">{obj.displayName}</span>
                                {obj.isFavorite && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                                {obj.isShared && (
                                  <div 
                                    className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center cursor-pointer hover:bg-purple-200"
                                    onClick={(e) => { e.stopPropagation(); handleOpenShareDialog('object', obj.id, obj.displayName); }}
                                    title="Condiviso"
                                  >
                                    <Users className="w-3 h-3 text-purple-600" />
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-500 hidden sm:table-cell">{formatDate(obj.createdAt)}</td>
                            <td className="px-4 py-3 text-sm text-slate-400 hidden sm:table-cell">{formatBytes(obj.sizeBytes)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="w-8 h-8"
                                  onClick={(e) => { e.stopPropagation(); toggleFavoriteMutation.mutate(obj.id); }}
                                >
                                  {obj.isFavorite ? (
                                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                  ) : (
                                    <StarOff className="w-4 h-4" />
                                  )}
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="w-8 h-8">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem><Eye className="w-4 h-4 mr-2" /> Anteprima</DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenShareDialog('object', obj.id, obj.displayName); }}>
                                      <Share2 className="w-4 h-4 mr-2" /> Condividi
                                    </DropdownMenuItem>
                                    <DropdownMenuItem><Download className="w-4 h-4 mr-2" /> Scarica</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); deleteObjectMutation.mutate(obj.id); }}>
                                      <Trash2 className="w-4 h-4 mr-2" /> Elimina
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </ScrollArea>
        </main>

        {showInfoPanel && (
          <aside className="w-64 border-l bg-gradient-to-b from-white to-slate-50/50 p-4 shrink-0 hidden lg:block">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-sm text-slate-700 mb-3 flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-orange-500" />
                  Spazio di archiviazione
                </h3>
                <div className="bg-gradient-to-br from-slate-50 to-white border rounded-xl p-4">
                  <div className="relative w-24 h-24 mx-auto mb-3">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="48" cy="48" r="40" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                      <circle 
                        cx="48" cy="48" r="40" fill="none" 
                        stroke="url(#gradient)" strokeWidth="8"
                        strokeDasharray={`${quotaPercentage * 2.51} 251`}
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#f97316" />
                          <stop offset="100%" stopColor="#7c3aed" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-bold text-slate-700">{quotaPercentage}%</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-700">
                      {quotaData ? formatBytes(quotaData.usedBytes) : '0 B'}
                    </p>
                    <p className="text-xs text-slate-400">
                      di {quotaData ? formatBytes(quotaData.quotaBytes) : '1 GB'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm text-slate-700 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-500" />
                  Sicurezza
                </h3>
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <Badge className="bg-green-500 text-white mb-2">RLS Attivo</Badge>
                  <p className="text-xs text-green-700">
                    File protetti con Row Level Security e URL firmati
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm text-slate-700 mb-3">Per tipo</h3>
                <div className="space-y-2">
                  {[
                    { icon: FileText, label: 'Documenti', color: 'bg-orange-500' },
                    { icon: Image, label: 'Immagini', color: 'bg-purple-500' },
                    { icon: FileVideo, label: 'Video', color: 'bg-rose-500' },
                    { icon: Archive, label: 'Archivi', color: 'bg-amber-500' },
                  ].map((type) => (
                    <div key={type.label} className="flex items-center gap-3 text-sm">
                      <div className={`w-2 h-2 rounded-full ${type.color}`} />
                      <type.icon className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">{type.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>

      {uploadProgress.length > 0 && (
        <div className="fixed bottom-4 right-4 w-80 bg-white border rounded-xl shadow-xl p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm">Caricamento file</h4>
            {!uploadBatchMutation.isPending && (
              <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => setUploadProgress([])}>
                <span className="sr-only">Chiudi</span>×
              </Button>
            )}
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {uploadProgress.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{item.fileName}</p>
                  <Progress value={item.status === 'uploading' ? 50 : 100} className="h-1 mt-1" />
                </div>
                {item.status === 'uploading' && <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />}
                {item.status === 'success' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                {item.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={newFolderDialogOpen} onOpenChange={setNewFolderDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-orange-500" />
              Nuova cartella
            </DialogTitle>
            <DialogDescription>
              Crea una nuova cartella {currentFolderId ? 'nella cartella corrente' : 'nella root'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="folder-name">Nome cartella</Label>
            <Input
              id="folder-name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Es: Documenti lavoro"
              className="mt-2"
              data-testid="input-folder-name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderDialogOpen(false)}>Annulla</Button>
            <Button 
              onClick={() => createFolderMutation.mutate({ name: newFolderName, parentFolderId: currentFolderId })}
              disabled={!newFolderName.trim() || createFolderMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600"
              data-testid="button-create-folder"
            >
              Crea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-purple-500" />
              Condividi "{shareTarget?.name}"
            </DialogTitle>
            <DialogDescription>
              Crea un link di condivisione per {shareTarget?.type === 'folder' ? 'questa cartella' : 'questo file'}
            </DialogDescription>
          </DialogHeader>
          
          {shareLink ? (
            <div className="space-y-4 py-4">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="font-medium text-green-700">Link creato!</span>
                </div>
                <div className="flex gap-2">
                  <Input value={shareLink} readOnly className="text-sm bg-white" data-testid="input-share-link" />
                  <Button onClick={copyShareLink} className="shrink-0" data-testid="button-copy-link">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => { setShareDialogOpen(false); setShareLink(null); }}>Chiudi</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Consenti download</Label>
                    <p className="text-xs text-muted-foreground">Chi ha il link può scaricare</p>
                  </div>
                  <Switch
                    checked={shareSettings.allowDownload}
                    onCheckedChange={(checked) => setShareSettings(s => ({ ...s, allowDownload: checked }))}
                    data-testid="switch-allow-download"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Consenti modifica</Label>
                    <p className="text-xs text-muted-foreground">Chi ha il link può modificare</p>
                  </div>
                  <Switch
                    checked={shareSettings.allowEdit}
                    onCheckedChange={(checked) => setShareSettings(s => ({ ...s, allowEdit: checked }))}
                    data-testid="switch-allow-edit"
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Proteggi con password</Label>
                    <p className="text-xs text-muted-foreground">Richiedi password per accedere</p>
                  </div>
                  <Switch
                    checked={shareSettings.requirePassword}
                    onCheckedChange={(checked) => setShareSettings(s => ({ ...s, requirePassword: checked }))}
                    data-testid="switch-require-password"
                  />
                </div>

                {shareSettings.requirePassword && (
                  <Input
                    type="password"
                    value={shareSettings.password}
                    onChange={(e) => setShareSettings(s => ({ ...s, password: e.target.value }))}
                    placeholder="Inserisci password"
                    data-testid="input-share-password"
                  />
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Scadenza (ore)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={shareSettings.expiresInHours}
                      onChange={(e) => setShareSettings(s => ({ ...s, expiresInHours: parseInt(e.target.value) || 0 }))}
                      placeholder="0 = mai"
                      className="mt-1"
                      data-testid="input-expires-hours"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Max download</Label>
                    <Input
                      type="number"
                      min="0"
                      value={shareSettings.maxDownloads}
                      onChange={(e) => setShareSettings(s => ({ ...s, maxDownloads: parseInt(e.target.value) || 0 }))}
                      placeholder="0 = illimitati"
                      className="mt-1"
                      data-testid="input-max-downloads"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShareDialogOpen(false)}>Annulla</Button>
                <Button 
                  onClick={handleCreateShare}
                  disabled={createShareMutation.isPending}
                  className="bg-purple-500 hover:bg-purple-600"
                  data-testid="button-create-share"
                >
                  {createShareMutation.isPending ? 'Creazione...' : 'Crea link'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={newFileDialogOpen} onOpenChange={setNewFileDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FilePlus className="w-5 h-5 text-blue-500" />
              Nuovo file di testo
            </DialogTitle>
            <DialogDescription>
              Crea un nuovo file di testo nella cartella corrente
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="file-name">Nome file</Label>
            <Input
              id="file-name"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="Es: note.txt"
              className="mt-2"
              data-testid="input-file-name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFileDialogOpen(false)}>Annulla</Button>
            <Button 
              onClick={() => {
                toast({ title: 'Funzionalità in arrivo', description: 'La creazione file sarà disponibile presto' });
                setNewFileDialogOpen(false);
                setNewFileName('');
              }}
              disabled={!newFileName.trim()}
              className="bg-blue-500 hover:bg-blue-600"
              data-testid="button-create-file"
            >
              Crea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );

  if (embedded) {
    return content;
  }

  return (
    <Layout currentModule="employee" setCurrentModule={() => {}}>
      {content}
    </Layout>
  );
}

export default function MyDrivePage() {
  return <MyDriveContent embedded={false} />;
}
