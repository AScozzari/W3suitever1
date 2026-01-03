import { useUserPresence, getPresenceColor, getPresenceLabel, PresenceStatus } from '@/hooks/useChatPresence';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PresenceIndicatorProps {
  userId: string;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  customStatus?: string;
}

const sizeMap = {
  sm: { dot: 8, offset: 0 },
  md: { dot: 10, offset: 0 },
  lg: { dot: 12, offset: 1 }
};

export function PresenceIndicator({ 
  userId, 
  size = 'md',
  showTooltip = true,
  customStatus
}: PresenceIndicatorProps) {
  const { data: presence } = useUserPresence(userId);
  const status = (presence?.status || 'offline') as PresenceStatus;
  const color = getPresenceColor(status);
  const label = getPresenceLabel(status);
  const dimensions = sizeMap[size];

  const dot = (
    <div
      data-testid={`presence-indicator-${userId}`}
      style={{
        width: dimensions.dot,
        height: dimensions.dot,
        borderRadius: '50%',
        backgroundColor: color,
        border: '2px solid white',
        boxShadow: `0 0 0 1px ${color}20`
      }}
    />
  );

  if (!showTooltip) return dot;

  const tooltipText = customStatus 
    ? `${label} - ${customStatus}`
    : label;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {dot}
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface AvatarWithPresenceProps {
  userId: string;
  name: string;
  avatarUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showPresence?: boolean;
}

const avatarSizes = {
  sm: { container: 32, text: 11 },
  md: { container: 40, text: 13 },
  lg: { container: 48, text: 15 }
};

function getInitials(name: string): string {
  if (!name || name.trim() === '') return '??';
  
  const parts = name.trim().split(/\s+/);
  
  if (parts.length >= 2) {
    const first = parts[0]?.[0] || '';
    const last = parts[parts.length - 1]?.[0] || '';
    return (first + last).toUpperCase();
  }
  
  if (parts[0] && parts[0].length >= 2) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  
  return (parts[0]?.[0] || '?').toUpperCase();
}

export function AvatarWithPresence({
  userId,
  name,
  avatarUrl,
  size = 'md',
  className = '',
  showPresence = true
}: AvatarWithPresenceProps) {
  const dimensions = avatarSizes[size];
  const initials = getInitials(name);

  return (
    <div 
      className={`relative shrink-0 ${className}`}
      style={{ width: dimensions.container, height: dimensions.container }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <div
          className="w-full h-full rounded-full bg-gradient-to-br from-windtre-orange to-orange-400 flex items-center justify-center text-white font-semibold"
          style={{ fontSize: dimensions.text }}
        >
          {initials}
        </div>
      )}
      {showPresence && (
        <div 
          className="absolute"
          style={{ 
            bottom: -2, 
            right: -2
          }}
        >
          <PresenceIndicator userId={userId} size={size} />
        </div>
      )}
    </div>
  );
}
