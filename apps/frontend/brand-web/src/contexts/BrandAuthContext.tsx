import React, { createContext, useContext, useState, useEffect } from 'react';

// Extend window object for global auth token
declare global {
  interface Window {
    brandAuthToken?: string;
  }
}

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
    const savedToken = localStorage.getItem('brand-token');
    const savedWorkspace = localStorage.getItem('brand-workspace');
    
    if (savedUser && savedToken) {
      // Verify token is still valid
      fetch('/brand-api/auth/me', {
        headers: {
          'Authorization': `Bearer ${savedToken}`
        }
      }).then(response => {
        if (response.ok) {
          setUser(JSON.parse(savedUser));
          window.brandAuthToken = savedToken;
        } else {
          // Token expired or invalid
          localStorage.removeItem('brand-user');
          localStorage.removeItem('brand-token');
        }
      }).catch(() => {
        localStorage.removeItem('brand-user');
        localStorage.removeItem('brand-token');
      });
    }
    if (savedWorkspace) {
      setWorkspace(savedWorkspace);
    }
  }, []);

  const login = async (credentials: { email: string; password: string }): Promise<boolean> => {
    try {
      const response = await fetch('/brand-api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Login failed:', error);
        return false;
      }

      const data = await response.json();
      
      if (data.success && data.token && data.user) {
        // Store JWT token
        localStorage.setItem('brand-token', data.token);
        
        // Store user info
        const brandUser: BrandUser = {
          id: data.user.id,
          email: data.user.email,
          name: `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim() || data.user.email,
          role: data.user.role,
          permissions: data.user.permissions || [],
          workspace: workspace
        };
        
        setUser(brandUser);
        localStorage.setItem('brand-user', JSON.stringify(brandUser));
        
        // Set default auth header for future requests
        window.brandAuthToken = data.token;
        
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
    localStorage.removeItem('brand-token');
    localStorage.removeItem('brand-workspace');
    delete window.brandAuthToken;
    // ✅ Manteniamo SPA navigation anche per logout
    // Il componente che usa logout dovrebbe gestire la navigazione
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