import { useAuth } from '../hooks/useAuth';
import { useUserAvatar } from '@/hooks/useUserAvatar';

interface AvatarProps {
  userId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({ userId, firstName, lastName, email, size = 'md', className = '' }: AvatarProps) {
  const { avatarUrl, initials, gradient, isLoading } = useUserAvatar(userId ? {
    id: userId,
    firstName,
    lastName,
    email
  } : null);
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };
  
  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-semibold overflow-hidden ${className}`}
      style={{ background: gradient }}
      data-testid={`avatar-${firstName || email || 'unknown'}`}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={initials} className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}
