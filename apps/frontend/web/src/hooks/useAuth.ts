import { useQuery } from "@tanstack/react-query";
import { oauth2Client } from "../services/OAuth2Client";
import { useEffect, useState } from "react";

export function useAuth() {
  const [hasToken, setHasToken] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Check for OAuth2 tokens and initialize client
  useEffect(() => {
    const checkTokens = async () => {
      try {
        // Simple check for stored tokens without async calls that might cause loops
        const storedTokens = localStorage.getItem('oauth2_tokens');
        setHasToken(!!storedTokens);
      } catch (error) {
        console.error('Error checking tokens:', error);
        setHasToken(false);
      } finally {
        setIsInitializing(false);
      }
    };
    
    checkTokens();
  }, []);
  
  const { data: userInfo, isLoading: isUserInfoLoading, error } = useQuery({
    queryKey: ["/oauth2/userinfo"], // OAuth2 standard userinfo endpoint
    enabled: hasToken, // Only run query if we have a token
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // If there's an auth error, clear tokens to avoid loops
  useEffect(() => {
    if (error && hasToken) {
      console.log('Auth error, clearing tokens:', error);
      localStorage.removeItem('oauth2_tokens');
      setHasToken(false);
    }
  }, [error, hasToken]);

  return {
    user: userInfo,
    isLoading: isInitializing || (hasToken ? isUserInfoLoading : false),
    isAuthenticated: !!userInfo && !error,
  };
}