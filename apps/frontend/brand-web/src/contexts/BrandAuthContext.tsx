import React, { createContext, useContext, useState, useEffect } from 'react';

interface BrandUser {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  workspace?: string;
}

interface BrandAuthContextType {
  user: BrandUser | null;
  isAuthenticated: boolean;
  login: (credentials: any) => Promise<boolean>;
  logout: () => void;
  workspace: string;
  setWorkspace: (workspace: string) => void;
}

const BrandAuthContext = createContext<BrandAuthContextType | undefined>(undefined);

export function BrandAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<BrandUser | null>(null);
  const [workspace, setWorkspace] = useState('marketing');

  // Check for existing session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('brand-user');
    const savedWorkspace = localStorage.getItem('brand-workspace');
    
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    if (savedWorkspace) {
      setWorkspace(savedWorkspace);
    }
  }, []);

  const login = async (credentials: any): Promise<boolean> => {
    try {
      // TODO: Replace with actual OAuth2 integration
      // For now, create a super admin seed user
      if (credentials.username === 'sadminbrand' && credentials.password === 'admin123') {
        const superAdmin: BrandUser = {
          id: 'brand-super-admin',
          email: 'sadminbrand@w3suite.com',
          name: 'Super Administrator',
          role: 'super-admin',
          permissions: ['*'], // All permissions
          workspace: workspace
        };
        
        setUser(superAdmin);
        localStorage.setItem('brand-user', JSON.stringify(superAdmin));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('brand-user');
    localStorage.removeItem('brand-workspace');
    window.location.href = '/brandinterface/login';
  };

  const updateWorkspace = (newWorkspace: string) => {
    setWorkspace(newWorkspace);
    localStorage.setItem('brand-workspace', newWorkspace);
  };

  return (
    <BrandAuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      logout,
      workspace,
      setWorkspace: updateWorkspace
    }}>
      {children}
    </BrandAuthContext.Provider>
  );
}

export function useBrandAuth() {
  const context = useContext(BrandAuthContext);
  if (context === undefined) {
    throw new Error('useBrandAuth must be used within a BrandAuthProvider');
  }
  return context;
}