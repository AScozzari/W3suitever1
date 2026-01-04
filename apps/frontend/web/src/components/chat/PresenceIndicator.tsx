import { useUserPresence, getPresenceColor, getPresenceLabel, PresenceStatus } from '@/hooks/useChatPresence';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar } from './Avatar';

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
  firstName?: string;
  lastName?: string;
  email?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showPresence?: boolean;
}

const avatarContainerSizes = {
  sm: 32,
  md: 40,
  lg: 48
};

export function AvatarWithPresence({
  userId,
  firstName,
  lastName,
  email,
  size = 'md',
  className = '',
  showPresence = true
}: AvatarWithPresenceProps) {
  const containerSize = avatarContainerSizes[size];

  return (
    <div 
      className={`relative shrink-0 ${className}`}
      style={{ width: containerSize, height: containerSize }}
    >
      <Avatar 
        userId={userId}
        firstName={firstName}
        lastName={lastName}
        email={email}
        size={size}
      />
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
