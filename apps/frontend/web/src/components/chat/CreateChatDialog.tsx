import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MessageCircle, Users, User, Lock, Globe, Upload, X } from 'lucide-react';

interface CreateChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChatCreated?: (channelId: string) => void;
}

interface UserOption {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

// Helper per ottenere nome display
function getUserDisplayName(user: UserOption): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user.firstName) return user.firstName;
  if (user.lastName) return user.lastName;
  return user.email || 'Utente';
}

// Helper per ottenere iniziali
function getUserInitials(user: UserOption): string {
  const displayName = getUserDisplayName(user);
  const parts = displayName.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return displayName.slice(0, 2).toUpperCase();
}

export function CreateChatDialog({ open, onOpenChange, onChatCreated }: CreateChatDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'dm' | 'group'>('dm');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [headerColor, setHeaderColor] = useState<string>('#FF6900');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch available users
  const { data: users = [], isLoading: usersLoading } = useQuery<UserOption[]>({
    queryKey: ['/api/users'],
    enabled: open,
    staleTime: 60000
  });

  // Create DM mutation
  const createDMMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest('/api/chat/channels/dm', {
        method: 'POST',
        body: JSON.stringify({ userId })
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Chat creata',
        description: 'Chat diretta creata con successo'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/channels'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/unread-count'] });
      onOpenChange(false);
      if (onChatCreated) onChatCreated(data.id);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile creare chat diretta',
        variant: 'destructive'
      });
    }
  });

  // Upload avatar helper
  const uploadAvatar = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('directory', '.private');
    
    const response = await fetch('/api/object-storage/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Upload failed');
    }
    
    const result = await response.json();
    return result.url;
  };

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string; visibility: 'public' | 'private'; memberIds: string[]; avatarFile?: File; headerColor: string }) => {
      let avatarUrl = '';
      
      // Upload avatar if provided
      if (data.avatarFile) {
        try {
          avatarUrl = await uploadAvatar(data.avatarFile);
        } catch (err) {
          console.error('Avatar upload failed:', err);
        }
      }
      
      return apiRequest('/api/chat/channels', {
        method: 'POST',
        body: JSON.stringify({
          channelType: 'team',
          name: data.name,
          visibility: data.visibility,
          memberUserIds: data.memberIds,
          metadata: { 
            ...(avatarUrl ? { avatarUrl } : {}),
            headerColor: data.headerColor
          }
        })
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Gruppo creato',
        description: 'Gruppo creato con successo'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/channels'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/unread-count'] });
      onOpenChange(false);
      if (onChatCreated) onChatCreated(data.id);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile creare gruppo',
        variant: 'destructive'
      });
    }
  });

  const resetForm = () => {
    setSelectedUserId('');
    setSelectedUserIds([]);
    setGroupName('');
    setIsPrivate(true);
    setAvatarFile(null);
    setAvatarPreview('');
    setHeaderColor('#FF6900');
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Errore',
        description: 'Seleziona un\'immagine valida',
        variant: 'destructive'
      });
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Errore',
        description: 'Immagine troppo grande (max 5MB)',
        variant: 'destructive'
      });
      return;
    }
    
    setAvatarFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreateDM = () => {
    if (!selectedUserId) {
      toast({
        title: 'Attenzione',
        description: 'Seleziona un utente',
        variant: 'destructive'
      });
      return;
    }
    createDMMutation.mutate(selectedUserId);
  };

  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      toast({
        title: 'Attenzione',
        description: 'Inserisci un nome per il gruppo',
        variant: 'destructive'
      });
      return;
    }
    if (selectedUserIds.length === 0) {
      toast({
        title: 'Attenzione',
        description: 'Seleziona almeno un membro',
        variant: 'destructive'
      });
      return;
    }
    createGroupMutation.mutate({
      name: groupName,
      visibility: isPrivate ? 'private' : 'public',
      memberIds: selectedUserIds,
      avatarFile: avatarFile || undefined,
      headerColor: headerColor
    });
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const isCreating = createDMMutation.isPending || createGroupMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle size={20} className="text-[#FF6900]" />
            Nuova Chat
          </DialogTitle>
          <DialogDescription>
            Crea una chat diretta o un gruppo di conversazione
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'dm' | 'group')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dm" data-testid="tab-dm">
              <User size={16} className="mr-2" />
              Chat Diretta
            </TabsTrigger>
            <TabsTrigger value="group" data-testid="tab-group">
              <Users size={16} className="mr-2" />
              Gruppo
            </TabsTrigger>
          </TabsList>

          {/* DM Tab */}
          <TabsContent value="dm" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="dm-user">Seleziona Utente *</Label>
              <div className="mt-2 max-h-[300px] overflow-y-auto border rounded-md">
                {usersLoading ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    Caricamento utenti...
                  </div>
                ) : users.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    Nessun utente disponibile
                  </div>
                ) : (
                  users.map((user) => (
                    <button
                      key={user.id}
                      data-testid={`user-option-${user.id}`}
                      onClick={() => setSelectedUserId(user.id)}
                      className={`w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-gray-50 transition-colors ${
                        selectedUserId === user.id ? 'bg-orange-50 border-l-4 border-l-[#FF6900]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6900] to-[#ff8533] flex items-center justify-center text-white text-sm font-medium">
                          {getUserInitials(user)}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{getUserDisplayName(user)}</div>
                          {user.email && (
                            <div className="text-xs text-gray-500">{user.email}</div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <Button
              onClick={handleCreateDM}
              disabled={!selectedUserId || isCreating}
              data-testid="button-create-dm"
              className="w-full bg-[#FF6900] hover:bg-[#ff8533]"
            >
              {isCreating ? 'Creazione...' : 'Crea Chat Diretta'}
            </Button>
          </TabsContent>

          {/* Group Tab */}
          <TabsContent value="group" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="group-name">Nome Gruppo *</Label>
              <Input
                id="group-name"
                data-testid="input-group-name"
                placeholder="es. Team Marketing"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Avatar Upload */}
            <div>
              <Label>Avatar Gruppo</Label>
              <div className="mt-2 flex items-center gap-4">
                {avatarPreview ? (
                  <div className="relative">
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="w-20 h-20 rounded-full object-cover border-2 border-[#FF6900]"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      data-testid="button-remove-avatar"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border-2 border-dashed border-gray-300">
                    <Upload size={24} className="text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarSelect}
                    className="hidden"
                    data-testid="input-avatar-file"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-upload-avatar"
                    className="w-full"
                  >
                    <Upload size={16} className="mr-2" />
                    {avatarPreview ? 'Cambia Immagine' : 'Carica Immagine'}
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG fino a 5MB
                  </p>
                </div>
              </div>
            </div>

            {/* Header Color Picker */}
            <div>
              <Label htmlFor="header-color">Colore Header</Label>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex gap-2">
                  {['#FF6900', '#7B2CBF', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setHeaderColor(color)}
                      className={`w-10 h-10 rounded-full transition-transform ${
                        headerColor === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                      data-testid={`color-${color}`}
                    />
                  ))}
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="color"
                    id="header-color"
                    value={headerColor}
                    onChange={(e) => setHeaderColor(e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer"
                    data-testid="input-header-color"
                  />
                  <div className="text-sm text-gray-600 font-mono">
                    {headerColor}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-md">
              <div className="flex items-center gap-2">
                {isPrivate ? <Lock size={16} /> : <Globe size={16} />}
                <div>
                  <div className="font-medium text-sm">
                    {isPrivate ? 'Gruppo Privato' : 'Gruppo Pubblico'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {isPrivate 
                      ? 'Solo membri invitati possono accedere' 
                      : 'Tutti nel workspace possono accedere'}
                  </div>
                </div>
              </div>
              <Switch
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
                data-testid="switch-visibility"
              />
            </div>

            <div>
              <Label>Seleziona Membri *</Label>
              <div className="mt-2 max-h-[200px] overflow-y-auto border rounded-md">
                {usersLoading ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    Caricamento utenti...
                  </div>
                ) : users.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    Nessun utente disponibile
                  </div>
                ) : (
                  users.map((user) => {
                    const isSelected = selectedUserIds.includes(user.id);
                    return (
                      <button
                        key={user.id}
                        data-testid={`group-user-option-${user.id}`}
                        onClick={() => toggleUserSelection(user.id)}
                        className={`w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-gray-50 transition-colors ${
                          isSelected ? 'bg-orange-50 border-l-4 border-l-[#FF6900]' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected ? 'bg-[#FF6900] border-[#FF6900]' : 'border-gray-300'
                          }`}>
                            {isSelected && (
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6900] to-[#ff8533] flex items-center justify-center text-white text-sm font-medium">
                            {getUserInitials(user)}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{getUserDisplayName(user)}</div>
                            {user.email && (
                              <div className="text-xs text-gray-500">{user.email}</div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
              {selectedUserIds.length > 0 && (
                <div className="mt-2 text-sm text-gray-500">
                  {selectedUserIds.length} {selectedUserIds.length === 1 ? 'membro selezionato' : 'membri selezionati'}
                </div>
              )}
            </div>

            <Button
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || selectedUserIds.length === 0 || isCreating}
              data-testid="button-create-group"
              className="w-full bg-[#FF6900] hover:bg-[#ff8533]"
            >
              {isCreating ? 'Creazione...' : 'Crea Gruppo'}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
