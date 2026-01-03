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
}

const avatarSizes = {
  sm: { container: 32, text: 12 },
  md: { container: 40, text: 14 },
  lg: { container: 48, text: 16 }
};

export function AvatarWithPresence({
  userId,
  name,
  avatarUrl,
  size = 'md',
  className = ''
}: AvatarWithPresenceProps) {
  const dimensions = avatarSizes[size];
  const initial = name?.[0]?.toUpperCase() || '?';

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
          className="w-full h-full rounded-full bg-gradient-to-br from-windtre-orange to-orange-400 flex items-center justify-center text-white font-medium"
          style={{ fontSize: dimensions.text }}
        >
          {initial}
        </div>
      )}
      <div 
        className="absolute"
        style={{ 
          bottom: -2, 
          right: -2
        }}
      >
        <PresenceIndicator userId={userId} size={size} />
      </div>
    </div>
  );
}
