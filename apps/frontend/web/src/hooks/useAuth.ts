import { useQuery } from "@tanstack/react-query";
import { oauth2Client } from "../services/OAuth2Client";
import { useEffect, useState } from "react";

export function useAuth() {
  const [hasToken, setHasToken] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Check for OAuth2 tokens ONCE on mount
  useEffect(() => {
    const storedTokens = localStorage.getItem('oauth2_tokens');
    setHasToken(!!storedTokens);
    setIsInitializing(false);
  }, []); // Empty dependency array - run only once

  // Only make userinfo query if we have tokens and are not initializing
  const { data: userInfo, isLoading: isUserInfoLoading } = useQuery({
    queryKey: ["/oauth2/userinfo"],
    enabled: hasToken && !isInitializing,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Prevent unnecessary refetches
  });

  return {
    user: userInfo,
    isLoading: isInitializing || (hasToken && isUserInfoLoading),
    isAuthenticated: hasToken && !!userInfo,
  };
}