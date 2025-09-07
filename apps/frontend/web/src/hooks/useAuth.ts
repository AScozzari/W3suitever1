import { useQuery } from "@tanstack/react-query";
import { oauth2Client } from "../services/OAuth2Client";
import { useEffect, useState } from "react";

export function useAuth() {
  const [hasToken, setHasToken] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Check for OAuth2 tokens and initialize client
  useEffect(() => {
    const checkTokens = () => {
      try {
        // Simple check for stored tokens without async calls that might cause loops
        const storedTokens = localStorage.getItem('oauth2_tokens');
        console.log('useAuth: stored tokens check:', !!storedTokens);
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
  
  // Per ora semplifichiamo: se non ci sono token, non facciamo query
  // Questo evita chiamate API che potrebbero causare errori o loop
  const shouldFetchUserInfo = hasToken && !isInitializing;
  
  const { data: userInfo, isLoading: isUserInfoLoading, error } = useQuery({
    queryKey: ["/oauth2/userinfo"],
    enabled: shouldFetchUserInfo,
    retry: false,
    staleTime: 5 * 60 * 1000,
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

  const isAuthenticated = hasToken && !!userInfo && !error;
  
  console.log('useAuth state:', { 
    hasToken, 
    isInitializing, 
    isUserInfoLoading, 
    isAuthenticated,
    hasUserInfo: !!userInfo,
    hasError: !!error 
  });

  return {
    user: userInfo,
    isLoading: isInitializing || (shouldFetchUserInfo ? isUserInfoLoading : false),
    isAuthenticated,
  };
}