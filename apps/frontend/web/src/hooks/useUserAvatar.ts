import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const WINDTRE_COLORS = [
  ['#FF6900', '#ff8533'],
  ['#7B2CBF', '#9747ff'],
  ['#FF6900', '#7B2CBF'],
  ['#ff8533', '#9747ff'],
  ['#e55a00', '#6B21A8'],
  ['#FF8500', '#8B5CF6'],
];

interface UserData {
  id?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  avatarObjectPath?: string;
}

interface SignedUrlResponse {
  hasAvatar: boolean;
  url: string | null;
  expiresAt: string | null;
  isLegacy?: boolean;
  initials: string;
  mimeType?: string;
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
  isLegacy: boolean;
  refreshUrl: () => void;
}

export function useUserAvatar(
  userData: UserData | null | undefined, 
  options: UseUserAvatarOptions = {}
): UseUserAvatarReturn {
  const { size = 32, enabled = true } = options;
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const queryClient = useQueryClient();

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

  const gradient = useMemo(() => {
    if (!userData) {
      const colorSet = WINDTRE_COLORS[0];
      return `linear-gradient(135deg, ${colorSet[0]}, ${colorSet[1]})`;
    }

    const identifier = userData.id || userData.email || userData.username || 'default';
    let hash = 0;
    for (let i = 0; i < identifier.length; i++) {
      hash = ((hash << 5) - hash + identifier.charCodeAt(i)) & 0xffffffff;
    }
    
    const colorIndex = Math.abs(hash) % WINDTRE_COLORS.length;
    const colorSet = WINDTRE_COLORS[colorIndex];
    
    return `linear-gradient(135deg, ${colorSet[0]}, ${colorSet[1]})`;
  }, [userData]);

  const { data: signedUrlData, isLoading: isQueryLoading, error: queryError, refetch } = useQuery<SignedUrlResponse | null>({
    queryKey: [`/api/storage/avatars/${userData?.id}/signed-url`],
    enabled: enabled && !!userData?.id,
    staleTime: 4 * 60 * 1000, // 4 minutes (signed URLs expire in 5)
    retry: false,
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (!signedUrlData?.expiresAt || signedUrlData.isLegacy || !userData?.id) return;

    const expiresAt = new Date(signedUrlData.expiresAt).getTime();
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    
    if (timeUntilExpiry > 60000) {
      const refreshTimeout = setTimeout(() => {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/storage/avatars/${userData.id}/signed-url`] 
        });
      }, timeUntilExpiry - 60000);
      
      return () => clearTimeout(refreshTimeout);
    }
  }, [signedUrlData?.expiresAt, signedUrlData?.isLegacy, userData?.id, queryClient]);

  // Track retry count to prevent infinite loops
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 2;

  useEffect(() => {
    const url = signedUrlData?.url;
    if (!url) {
      setImageError(false);
      setImageLoaded(false);
      setRetryCount(0);
      return;
    }

    setImageError(false);
    setImageLoaded(false);

    const img = new Image();
    img.onload = () => {
      setImageLoaded(true);
      setImageError(false);
      setRetryCount(0);
    };
    img.onerror = () => {
      setImageError(true);
      setImageLoaded(false);
      
      // Auto-refresh token on load failure (likely expired)
      if (retryCount < MAX_RETRIES && userData?.id) {
        console.log('[useUserAvatar] Image load failed, refreshing signed URL (attempt', retryCount + 1, ')');
        setRetryCount(prev => prev + 1);
        queryClient.invalidateQueries({ 
          queryKey: [`/api/storage/avatars/${userData.id}/signed-url`] 
        });
      }
    };
    img.src = url;
  }, [signedUrlData?.url, retryCount, userData?.id, queryClient]);

  const avatarUrl = useMemo(() => {
    // Only use Signed URL from Object Storage (legacy profileImageUrl removed)
    if (signedUrlData?.url && signedUrlData.hasAvatar && imageLoaded && !imageError) {
      return signedUrlData.url;
    }
    
    return undefined;
  }, [signedUrlData, imageLoaded, imageError]);

  const hasImage = !!(signedUrlData?.hasAvatar && signedUrlData?.url && imageLoaded && !imageError);
  const isLoading = enabled && !!userData?.id && (isQueryLoading || (!!signedUrlData?.url && !imageLoaded && !imageError));
  const isLegacy = signedUrlData?.isLegacy ?? true;

  const refreshUrl = () => {
    if (userData?.id) {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/storage/avatars/${userData.id}/signed-url`] 
      });
    }
  };

  return {
    avatarUrl,
    initials: signedUrlData?.initials || initials,
    gradient,
    isLoading,
    error: queryError?.message,
    hasImage,
    isLegacy,
    refreshUrl
  };
}
