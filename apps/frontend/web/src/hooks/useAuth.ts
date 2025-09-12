import { useQuery } from "@tanstack/react-query";
import { authService } from "../services/AuthService";
import { useEffect, useState } from "react";

export function useAuth() {
  const [hasToken, setHasToken] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Check for JWT auth and initialize
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Initialize auth service (tries to refresh token)
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
      // Redirect to login
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return {
    user: userInfo,
    isLoading: isInitializing || (hasToken ? isUserInfoLoading : false),
    isAuthenticated: !!userInfo,
    logout,
  };
}