import { useQuery } from '@tanstack/react-query';
import { Users, Crown, Shield, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface ChannelMember {
  id: string;
  channelId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

interface ChannelMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
  channelName: string;
}

function getUserDisplayName(user: ChannelMember['user']): string {
  if (!user) return 'Utente';
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user.firstName) return user.firstName;
  if (user.lastName) return user.lastName;
  return user.email || 'Utente';
}

function getUserInitials(user: ChannelMember['user']): string {
  const displayName = getUserDisplayName(user);
  const parts = displayName.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return displayName.slice(0, 2).toUpperCase();
}

function getRoleLabel(role: string): string {
  switch (role) {
    case 'owner': return 'Proprietario';
    case 'admin': return 'Amministratore';
    case 'member': return 'Membro';
    default: return role;
  }
}

function getRoleIcon(role: string) {
  switch (role) {
    case 'owner': return <Crown size={14} className="text-[#FF6900]" />;
    case 'admin': return <Shield size={14} className="text-blue-500" />;
    default: return null;
  }
}

export function ChannelMembersDialog({ 
  open, 
  onOpenChange, 
  channelId,
  channelName 
}: ChannelMembersDialogProps) {
  const { data: members = [], isLoading } = useQuery<ChannelMember[]>({
    queryKey: ['/api/chat/channels', channelId, 'members'],
    enabled: open && !!channelId
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Users size={20} className="text-[#FF6900]" />
              Membri di {channelName}
            </DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            Lista dei membri del canale {channelName} con i loro ruoli
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              Caricamento membri...
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nessun membro trovato
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {members.map((member) => (
                <div
                  key={member.id}
                  data-testid={`member-${member.userId}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6900] to-[#ff8533] flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                    {getUserInitials(member.user)}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-sm text-gray-900 truncate">
                        {getUserDisplayName(member.user)}
                      </div>
                      {getRoleIcon(member.role)}
                    </div>
                    {member.user?.email && (
                      <div className="text-xs text-gray-500 truncate">
                        {member.user.email}
                      </div>
                    )}
                  </div>

                  {/* Role Badge */}
                  <div className="flex-shrink-0">
                    <span className={`
                      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${member.role === 'owner' 
                        ? 'bg-orange-100 text-[#FF6900]' 
                        : member.role === 'admin'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                      }
                    `}>
                      {getRoleLabel(member.role)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Members Count */}
          {!isLoading && members.length > 0 && (
            <div className="mt-4 pt-4 border-t text-sm text-gray-500 text-center">
              {members.length} {members.length === 1 ? 'membro' : 'membri'}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
