import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export function useAuth() {
  const [mockAuth, setMockAuth] = useState(false);
  
  // Check if we have a token from login
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      setMockAuth(true);
    }
  }, []);
  
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    enabled: false, // Disabilitiamo temporaneamente la query real
  });

  // Per ora usiamo mock auth per development
  if (mockAuth) {
    return {
      user: { 
        id: 'admin-user',
        email: 'admin@w3suite.com',
        firstName: 'Admin',
        lastName: 'User'
      },
      isLoading: false,
      isAuthenticated: true,
    };
  }

  return {
    user: null,
    isLoading: false,
    isAuthenticated: false,
  };
}