import { createContext, useContext, useState, useEffect } from 'react';

// Contesto per autenticazione FORZATA in development
interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: any) => Promise<void>;
  logout: () => void;
  user: any;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: true,
  isLoading: false,
  login: async () => {},
  logout: () => {},
  user: {
    id: 'demo-user',
    name: 'Demo User',
    email: 'demo@w3suite.com',
    role: 'admin',
    tenantId: '00000000-0000-0000-0000-000000000001'
  }
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // ALWAYS AUTHENTICATED IN DEVELOPMENT
  const [isAuthenticated] = useState(true);
  const [isLoading] = useState(false);
  
  useEffect(() => {
    // Set demo token in localStorage
    localStorage.setItem('auth_token', 'demo-token-development');
    localStorage.setItem('currentTenantId', '00000000-0000-0000-0000-000000000001');
    localStorage.setItem('currentTenant', 'staging');
  }, []);

  const value = {
    isAuthenticated: true,
    isLoading: false,
    login: async () => { console.log('Login bypassed in development'); },
    logout: () => { console.log('Logout bypassed in development'); },
    user: {
      id: 'demo-user',
      name: 'Demo User', 
      email: 'demo@w3suite.com',
      role: 'admin',
      tenantId: '00000000-0000-0000-0000-000000000001'
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);