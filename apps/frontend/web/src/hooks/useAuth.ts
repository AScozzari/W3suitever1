import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  // Only fetch user data if we have a token
  const hasToken = typeof window !== 'undefined' && localStorage.getItem('auth_token');
  
  const { data: userInfo, isLoading } = useQuery({
    queryKey: ["/oauth2/userinfo"], // OAuth2 standard userinfo endpoint
    enabled: !!hasToken, // Only run query if we have a token
    retry: false,
  });

  return {
    user: userInfo,
    isLoading: hasToken ? isLoading : false, // Don't show loading if no token
    isAuthenticated: !!userInfo,
  };
}