import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, UserPlus, Trash2 } from 'lucide-react';
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
  };
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
  currentMetadata 
}: EditChannelDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState(currentName);
  const [headerColor, setHeaderColor] = useState(currentMetadata?.headerColor || '#FF6900');
  const [backgroundPattern, setBackgroundPattern] = useState(currentMetadata?.backgroundPattern || 'neutral');
  const [selectedUserId, setSelectedUserId] = useState('');

  useEffect(() => {
    if (open) {
      setName(currentName);
      setHeaderColor(currentMetadata?.headerColor || '#FF6900');
      setBackgroundPattern(currentMetadata?.backgroundPattern || 'neutral');
    }
  }, [open, currentName, currentMetadata]);

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
    
    if (headerColor !== currentMetadata?.headerColor || backgroundPattern !== currentMetadata?.backgroundPattern) {
      updates.metadata = {
        headerColor,
        backgroundPattern
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
          <DialogTitle>Modifica Chat di Gruppo</DialogTitle>
          <DialogDescription>
            Personalizza il nome, i colori e i membri di questa conversazione di gruppo
          </DialogDescription>
        </DialogHeader>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Nome canale */}
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

          {/* Membri */}
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
              {members.map((member) => (
                <div 
                  key={member.userId}
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
