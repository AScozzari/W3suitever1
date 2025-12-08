import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/ApiService';

// WindTre colors for avatar generation (matching AvatarSelector)
const WINDTRE_COLORS = [
  ['#FF6900', '#ff8533'], // Primary orange gradient
  ['#7B2CBF', '#9747ff'], // Primary purple gradient
  ['#FF6900', '#7B2CBF'], // Orange to purple
  ['#ff8533', '#9747ff'], // Light orange to light purple
  ['#e55a00', '#6B21A8'], // Dark orange to dark purple
  ['#FF8500', '#8B5CF6'], // Bright orange to violet
];

interface UserData {
  id?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  profileImageUrl?: string;
}

interface UseUserAvatarOptions {
  size?: number;
  enabled?: boolean;
}

interface UseUserAvatarReturn {
  avatarUrl?: string;
  initials: string;
  gradient: string;
  isLoading: boolean;
  error?: string;
  hasImage: boolean;
}

export function useUserAvatar(
  userData: UserData | null | undefined, 
  options: UseUserAvatarOptions = {}
): UseUserAvatarReturn {
  const { size = 32, enabled = true } = options;
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Generate consistent initials from user data
  const initials = useMemo(() => {
    if (!userData) return 'U';
    
    const { firstName, lastName, username, email } = userData;
    
    if (firstName && lastName) {
      return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    }
    if (firstName) {
      return firstName.charAt(0).toUpperCase();
    }
    if (username) {
      const parts = username.split(/[._-]/);
      if (parts.length >= 2) {
        return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
      }
      return username.charAt(0).toUpperCase();
    }
    if (email) {
      const emailParts = email.split('@')[0].split(/[._-]/);
      if (emailParts.length >= 2) {
        return (emailParts[0].charAt(0) + emailParts[1].charAt(0)).toUpperCase();
      }
      return email.charAt(0).toUpperCase();
    }
    return 'U';
  }, [userData]);

  // Generate consistent gradient based on user identifier (seeded)
  const gradient = useMemo(() => {
    if (!userData) {
      const colorSet = WINDTRE_COLORS[0];
      return `linear-gradient(135deg, ${colorSet[0]}, ${colorSet[1]})`;
    }

    // Create a simple hash from user identifier for consistent color selection
    const identifier = userData.id || userData.email || userData.username || 'default';
    let hash = 0;
    for (let i = 0; i < identifier.length; i++) {
      hash = ((hash << 5) - hash + identifier.charCodeAt(i)) & 0xffffffff;
    }
    
    const colorIndex = Math.abs(hash) % WINDTRE_COLORS.length;
    const colorSet = WINDTRE_COLORS[colorIndex];
    
    return `linear-gradient(135deg, ${colorSet[0]}, ${colorSet[1]})`;
  }, [userData]);

  // Query for user avatar image
  const { data: avatarData, isLoading: isQueryLoading, error: queryError } = useQuery({
    queryKey: ['/api/users', userData?.id, 'avatar'],
    queryFn: async () => {
      if (!userData?.id) throw new Error('User ID not available');
      
      // Try to fetch from API, but gracefully handle failures
      try {
        const response = await fetch(`/api/users/${userData.id}/avatar`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          // If 404 or other client errors, just return null (no avatar)
          if (response.status >= 400 && response.status < 500) {
            return null;
          }
          throw new Error(`Avatar fetch failed: ${response.status}`);
        }
        
        const result = await response.json();
        return result?.profileImageUrl || null;
      } catch (error) {
        // For network errors or server errors, log but don't throw
        console.warn('Avatar fetch failed, using fallback:', error);
        return null;
      }
    },
    enabled: enabled && !!userData?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry failed avatar fetches
    refetchOnWindowFocus: false
  });

  // Handle image loading states
  useEffect(() => {
    if (!avatarData) {
      setImageError(false);
      setImageLoaded(false);
      return;
    }

    setImageError(false);
    setImageLoaded(false);

    // Preload image to detect errors
    const img = new Image();
    img.onload = () => {
      setImageLoaded(true);
      setImageError(false);
    };
    img.onerror = () => {
      setImageError(true);
      setImageLoaded(false);
    };
    img.src = avatarData;
  }, [avatarData]);

  // Determine final avatar URL and loading state
  const avatarUrl = useMemo(() => {
    // If we have profile image URL from user data and no API error, use it
    if (userData?.profileImageUrl && !imageError) {
      return userData.profileImageUrl;
    }
    
    // If we have API data and it loaded successfully, use it
    if (avatarData && imageLoaded && !imageError) {
      return avatarData;
    }
    
    return undefined;
  }, [userData?.profileImageUrl, avatarData, imageLoaded, imageError]);

  const hasImage = !!(avatarUrl && !imageError && (imageLoaded || !!userData?.profileImageUrl));
  const isLoading = enabled && !!userData?.id && (isQueryLoading || (!!avatarData && !imageLoaded && !imageError));

  return {
    avatarUrl,
    initials,
    gradient,
    isLoading,
    error: queryError?.message,
    hasImage
  };
}