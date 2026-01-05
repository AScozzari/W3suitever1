import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, UserPlus, Trash2, Upload, Camera, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface Member {
  userId: string;
  role: string;
  inviteStatus: string;
  joinedAt: string;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

interface EditChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
  currentName: string;
  currentMetadata?: {
    headerColor?: string;
    backgroundPattern?: string;
    avatarUrl?: string;
  };
  channelType?: 'dm' | 'team' | 'task_thread' | 'general';
  dmUser?: {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string;
  } | null;
}

const headerColors = [
  { value: '#FF6900', label: 'Arancione WindTre' },
  { value: '#7B2CBF', label: 'Viola WindTre' },
  { value: '#059669', label: 'Verde' },
  { value: '#DC2626', label: 'Rosso' },
  { value: '#2563EB', label: 'Blu' },
  { value: '#9333EA', label: 'Viola scuro' },
];

const backgroundPatterns = [
  { value: 'neutral', label: 'Neutro' },
  { value: 'dots', label: 'Puntini' },
  { value: 'grid', label: 'Griglia' },
  { value: 'diagonal', label: 'Diagonale' },
];

export function EditChannelDialog({ 
  open, 
  onOpenChange, 
  channelId,
  currentName,
  currentMetadata,
  channelType,
  dmUser
}: EditChannelDialogProps) {
  const isDm = channelType === 'dm';
  const { toast } = useToast();
  const [name, setName] = useState(currentName);
  const [headerColor, setHeaderColor] = useState(currentMetadata?.headerColor || '#FF6900');
  const [backgroundPattern, setBackgroundPattern] = useState(currentMetadata?.backgroundPattern || 'neutral');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(currentMetadata?.avatarUrl || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(currentName);
      setHeaderColor(currentMetadata?.headerColor || '#FF6900');
      setBackgroundPattern(currentMetadata?.backgroundPattern || 'neutral');
      setAvatarUrl(currentMetadata?.avatarUrl || '');
    }
  }, [open, currentName, currentMetadata]);

  const handleAvatarUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Errore',
        description: 'Seleziona un file immagine',
        variant: 'destructive'
      });
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('context', 'chat-avatar');
      formData.append('channelId', channelId);
      
      const response = await apiRequest('/api/storage/upload', {
        method: 'POST',
        body: formData
      });
      
      if (response.signedUrl) {
        setAvatarUrl(response.signedUrl);
        toast({
          title: 'Successo',
          description: 'Immagine caricata con successo'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Errore',
        description: error.message || 'Errore durante il caricamento',
        variant: 'destructive'
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Fetch channel members
  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ['/api/chat/channels', channelId, 'members'],
    enabled: open
  });

  // Fetch all users for adding members
  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
    enabled: open
  });

  // Update channel mutation
  const updateChannelMutation = useMutation({
    mutationFn: async (updates: any) => {
      return apiRequest(`/api/chat/channels/${channelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/channels'] });
      toast({
        title: 'Successo',
        description: 'Canale aggiornato con successo',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Errore durante l\'aggiornamento del canale',
        variant: 'destructive'
      });
    }
  });

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest(`/api/chat/channels/${channelId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: 'member' })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          query.queryKey[0] === '/api/chat/channels'
      });
      setSelectedUserId('');
      toast({
        title: 'Successo',
        description: 'Membro aggiunto al canale',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Errore durante l\'aggiunta del membro',
        variant: 'destructive'
      });
    }
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest(`/api/chat/channels/${channelId}/members/${userId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          query.queryKey[0] === '/api/chat/channels'
      });
      toast({
        title: 'Successo',
        description: 'Membro rimosso dal canale',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Errore durante la rimozione del membro',
        variant: 'destructive'
      });
    }
  });

  const handleSave = () => {
    const updates: any = {};
    
    if (name !== currentName) {
      updates.name = name;
    }
    
    const metadataChanged = 
      headerColor !== currentMetadata?.headerColor || 
      backgroundPattern !== currentMetadata?.backgroundPattern ||
      avatarUrl !== currentMetadata?.avatarUrl;
      
    if (metadataChanged) {
      updates.metadata = {
        headerColor,
        backgroundPattern,
        avatarUrl: avatarUrl || null
      };
    }

    if (Object.keys(updates).length > 0) {
      updateChannelMutation.mutate(updates);
    }

    onOpenChange(false);
  };

  const handleAddMember = () => {
    if (selectedUserId) {
      addMemberMutation.mutate(selectedUserId);
    }
  };

  const handleRemoveMember = (userId: string) => {
    removeMemberMutation.mutate(userId);
  };

  // Filter users not already in channel
  const availableUsers = allUsers.filter(
    user => !members.some(m => m.userId === user.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-edit-channel">
        <DialogHeader>
          <DialogTitle>{isDm ? 'Impostazioni Chat Diretta' : 'Modifica Chat di Gruppo'}</DialogTitle>
          <DialogDescription>
            {isDm 
              ? 'Personalizza i colori e lo sfondo di questa conversazione'
              : 'Personalizza il nome, i colori e i membri di questa conversazione di gruppo'
            }
          </DialogDescription>
        </DialogHeader>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Per DM: mostra info interlocutore (read-only) */}
          {isDm && dmUser && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              padding: '12px 16px',
              background: 'linear-gradient(135deg, #f9fafb, #f3f4f6)',
              borderRadius: '12px',
              border: '1px solid #e5e7eb'
            }}>
              {dmUser.avatarUrl ? (
                <img 
                  src={dmUser.avatarUrl} 
                  alt={dmUser.name}
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #FF6900, #ff8533)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 600
                }}>
                  {dmUser.name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                  {dmUser.name}
                </div>
                {dmUser.email && (
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>
                    {dmUser.email}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Nome canale - solo per gruppi */}
          {!isDm && (
            <div>
              <Label htmlFor="channel-name">Nome Canale</Label>
              <Input
                id="channel-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome del canale"
                data-testid="input-channel-name"
              />
            </div>
          )}

          {/* Avatar upload - solo per gruppi */}
          {!isDm && (
            <div>
              <Label>Logo del Gruppo</Label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
                <div style={{ position: 'relative' }}>
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Logo gruppo"
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '3px solid #e5e7eb'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #e5e7eb, #d1d5db)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#6b7280',
                      border: '3px dashed #d1d5db'
                    }}>
                      <Camera size={32} />
                    </div>
                  )}
                  {isUploadingAvatar && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(255,255,255,0.8)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Loader2 size={24} className="animate-spin" style={{ color: '#FF6900' }} />
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleAvatarUpload(file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    data-testid="button-upload-avatar"
                  >
                    <Upload size={14} style={{ marginRight: '6px' }} />
                    Carica immagine
                  </Button>
                  {avatarUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAvatarUrl('')}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      data-testid="button-remove-avatar"
                    >
                      <Trash2 size={14} style={{ marginRight: '6px' }} />
                      Rimuovi
                    </Button>
                  )}
                </div>
              </div>
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                Carica un'immagine per personalizzare il logo del gruppo (PNG, JPG, max 2MB)
              </p>
            </div>
          )}

          {/* Customizzazioni */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
              Personalizzazione
            </h3>
            
            <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <Label htmlFor="header-color">Colore Header</Label>
                <Select value={headerColor} onValueChange={setHeaderColor}>
                  <SelectTrigger id="header-color" data-testid="select-header-color">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {headerColors.map((color) => (
                      <SelectItem key={color.value} value={color.value} data-testid={`option-header-${color.value}`}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ 
                            width: '16px', 
                            height: '16px', 
                            background: color.value,
                            borderRadius: '4px' 
                          }} />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div style={{ flex: 1 }}>
                <Label htmlFor="bg-pattern">Pattern Sfondo</Label>
                <Select value={backgroundPattern} onValueChange={setBackgroundPattern}>
                  <SelectTrigger id="bg-pattern" data-testid="select-background-pattern">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {backgroundPatterns.map((pattern) => (
                      <SelectItem key={pattern.value} value={pattern.value} data-testid={`option-pattern-${pattern.value}`}>
                        {pattern.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Membri - solo per gruppi, nascosto per DM */}
          {!isDm && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
                Membri ({members.length})
              </h3>

              {/* Aggiungi membro */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="flex-1" data-testid="select-add-member">
                    <SelectValue placeholder="Seleziona utente da aggiungere" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id} data-testid={`option-user-${user.id}`}>
                        {user.firstName && user.lastName 
                          ? `${user.firstName} ${user.lastName}`
                          : user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleAddMember} 
                  disabled={!selectedUserId || addMemberMutation.isPending}
                  data-testid="button-add-member"
                >
                  <UserPlus size={16} />
                </Button>
              </div>

              {/* Lista membri */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                {members.map((member, index) => (
                  <div 
                    key={member.userId || `member-${index}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: '#f9fafb',
                      borderRadius: '8px'
                    }}
                    data-testid={`member-${member.userId}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #FF6900, #ff8533)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 600
                      }}>
                        {member.user?.firstName?.[0] || member.user?.email?.[0] || '?'}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500 }}>
                          {member.user?.firstName && member.user?.lastName
                            ? `${member.user.firstName} ${member.user.lastName}`
                            : member.user?.email || member.userId}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {member.role === 'owner' ? 'Proprietario' : member.role === 'admin' ? 'Admin' : 'Membro'}
                        </div>
                      </div>
                    </div>
                    
                    {member.role !== 'owner' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.userId)}
                        disabled={removeMemberMutation.isPending}
                        data-testid={`button-remove-${member.userId}`}
                      >
                        <Trash2 size={16} className="text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pulsanti azione */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
              Annulla
            </Button>
            <Button 
              onClick={handleSave}
              disabled={updateChannelMutation.isPending}
              data-testid="button-save"
            >
              Salva
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
