import { useQuery } from "@tanstack/react-query";
import { authService } from "../services/AuthService";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export function useAuth() {
  const [hasToken, setHasToken] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [, navigate] = useLocation();

  // Check for JWT auth and initialize
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Initialize auth service (restores token from localStorage)
        await authService.initialize();
        
        // Check if authenticated
        const isAuthenticated = await authService.isAuthenticated();
        setHasToken(isAuthenticated);
      } catch (error) {
        console.error('Auth initialization error:', error);
        setHasToken(false);
      } finally {
        setIsInitializing(false);
      }
    };
    
    checkAuth();
    
    // Also listen for storage events to sync auth state across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'w3_auth') {
        checkAuth();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  // Get current user info
  const { data: userInfo, isLoading: isUserInfoLoading, refetch } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const user = await authService.getMe();
      if (!user) {
        throw new Error('Not authenticated');
      }
      return user;
    },
    enabled: hasToken && !isInitializing,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Logout function
  const logout = async () => {
    try {
      await authService.logout();
      setHasToken(false);
      // Clear query cache
      refetch();
      // Get current tenant from path
      const pathSegments = window.location.pathname.split('/').filter(Boolean);
      const tenant = pathSegments[0] || 'staging';
      // Navigate to login using wouter
      navigate(`/${tenant}/login`);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return {
    user: userInfo,
    isLoading: isInitializing || (hasToken ? isUserInfoLoading : false),
    isAuthenticated: hasToken && !!userInfo,
    logout,
    refetchAuth: async () => {
      const isAuthenticated = await authService.isAuthenticated();
      setHasToken(isAuthenticated);
      if (isAuthenticated) {
        await refetch();
      }
    },
  };
}