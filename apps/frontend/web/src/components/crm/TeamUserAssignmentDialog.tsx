import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Users, Search, UserCheck } from 'lucide-react';
import { LoadingState } from '@w3suite/frontend-kit/components/blocks';
import { apiRequest } from '@/lib/queryClient';

interface TeamUserAssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  teamIds: string[];
  currentAssignedUsers: string[];
  onSave: (selectedUserIds: string[]) => void;
  title: string;
  description: string;
}

export function TeamUserAssignmentDialog({
  open,
  onClose,
  teamIds,
  currentAssignedUsers,
  onSave,
  title,
  description,
}: TeamUserAssignmentDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>(currentAssignedUsers);

  // Fetch users from selected teams using apiRequest which handles authentication
  const { data: teamMembersData, isLoading } = useQuery({
    queryKey: ['/api/teams/members', { teamIds }],
    queryFn: async () => {
      if (!teamIds || teamIds.length === 0) return [];
      
      const allMembers = await Promise.all(
        teamIds.map(async (teamId) => {
          try {
            const data = await apiRequest(`/api/teams/${teamId}/members`, {
              method: 'GET',
            });
            return data.members || [];
          } catch (error) {
            console.error(`Failed to fetch members for team ${teamId}:`, error);
            return [];
          }
        })
      );

      // Deduplicate users by ID
      const uniqueUsers = new Map();
      allMembers.flat().forEach(user => {
        if (!uniqueUsers.has(user.id)) {
          uniqueUsers.set(user.id, user);
        }
      });

      return Array.from(uniqueUsers.values());
    },
    enabled: open && teamIds && teamIds.length > 0,
  });

  const teamMembers = teamMembersData || [];

  // Filter users by search query
  const filteredUsers = teamMembers.filter((user: any) => {
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
    const email = (user.email || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || email.includes(query);
  });

  // Update selected users when currentAssignedUsers changes
  useEffect(() => {
    setSelectedUsers(currentAssignedUsers);
  }, [currentAssignedUsers]);

  const handleToggleUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSave = () => {
    onSave(selectedUsers);
    onClose();
  };

  const handleSelectAll = () => {
    setSelectedUsers(filteredUsers.map((u: any) => u.id));
  };

  const handleDeselectAll = () => {
    setSelectedUsers([]);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent 
        className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        style={{
          background: 'white',
          border: '1px solid rgba(0, 0, 0, 0.1)'
        }}
      >
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 rounded-lg" style={{ background: 'hsl(var(--brand-purple))', color: 'white' }}>
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div style={{ color: '#1f2937' }}>{title}</div>
              <div className="text-sm font-normal text-gray-500 mt-1">
                {description}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4 py-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca per nome o email..."
              className="pl-10 bg-white border-gray-300"
              data-testid="input-search-users"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" style={{ borderColor: 'hsl(var(--brand-orange))' }}>
                {selectedUsers.length} selezionati
              </Badge>
              <Badge variant="outline">
                {filteredUsers.length} disponibili
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={filteredUsers.length === 0}
                data-testid="button-select-all"
              >
                Seleziona Tutti
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeselectAll}
                disabled={selectedUsers.length === 0}
                data-testid="button-deselect-all"
              >
                Deseleziona Tutti
              </Button>
            </div>
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {isLoading ? (
              <LoadingState />
            ) : filteredUsers.length === 0 ? (
              <Card className="p-8 text-center bg-gray-50 border-gray-200">
                <UserCheck className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-600">
                  {teamIds.length === 0 
                    ? 'Seleziona prima un team nella tab Permessi'
                    : searchQuery 
                    ? 'Nessun utente trovato con questa ricerca'
                    : 'Nessun utente disponibile in questo team'}
                </p>
              </Card>
            ) : (
              filteredUsers.map((user: any) => (
                <Card 
                  key={user.id}
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors border-gray-200"
                  onClick={() => handleToggleUser(user.id)}
                  data-testid={`user-item-${user.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={() => handleToggleUser(user.id)}
                      data-testid={`checkbox-user-${user.id}`}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                    {user.membershipType && (
                      <Badge variant="outline" className="text-xs">
                        {user.membershipType === 'direct' ? 'Diretto' : 'Via Ruolo'}
                      </Badge>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            data-testid="button-cancel"
          >
            Annulla
          </Button>
          <Button
            onClick={handleSave}
            style={{ background: 'hsl(var(--brand-orange))', color: 'white' }}
            data-testid="button-save"
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Salva Assegnazioni ({selectedUsers.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
