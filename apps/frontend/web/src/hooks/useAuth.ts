import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  // Only fetch user data if we have a token
  const hasToken = typeof window !== 'undefined' && localStorage.getItem('auth_token');
  
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: !!hasToken, // Only run query if we have a token
    retry: false,
  });

  return {
    user,
    isLoading: hasToken ? isLoading : false, // Don't show loading if no token
    isAuthenticated: !!user,
  };
}