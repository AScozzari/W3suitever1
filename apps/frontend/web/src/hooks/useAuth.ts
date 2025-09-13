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
        // Check for OAuth2 tokens
        const storedTokens = localStorage.getItem('oauth2_tokens');
        const accessToken = await oauth2Client.getAccessToken();
        
        setHasToken(!!storedTokens && !!accessToken);
      } catch (error) {
        console.error('Error checking tokens:', error);
        setHasToken(false);
      } finally {
        setIsInitializing(false);
      }
    };
    
    checkTokens();
  }, []);
  
  const { data: userInfo, isLoading: isUserInfoLoading } = useQuery({
    queryKey: ["/oauth2/userinfo"], // OAuth2 standard userinfo endpoint
    enabled: hasToken, // Only run query if we have a token
    retry: false,
  });

  return {
    user: userInfo,
    isLoading: isInitializing || (hasToken ? isUserInfoLoading : false),
    isAuthenticated: !!userInfo,
  };
}