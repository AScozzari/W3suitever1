import { createContext, useContext, useState, useEffect } from 'react';

interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
  storeId?: string;
}

const DEMO_USERS: Record<string, DemoUser> = {
  'admin-user': {
    id: 'admin-user',
    name: 'Admin Demo',
    email: 'admin@w3suite.com',
    role: 'Amministratore',
    tenantId: '00000000-0000-0000-0000-000000000001'
  },
  'user-002': {
    id: 'user-002',
    name: 'Mario Rossi',
    email: 'mario.rossi@windtre.it',
    role: 'Store Manager',
    tenantId: '00000000-0000-0000-0000-000000000001',
    storeId: '50000000-0000-0000-0000-000000000002'
  },
  'user-003': {
    id: 'user-003',
    name: 'Laura Bianchi',
    email: 'laura.bianchi@windtre.it',
    role: 'Sales Agent',
    tenantId: '00000000-0000-0000-0000-000000000001',
    storeId: '50000000-0000-0000-0000-000000000002'
  }
};

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: any) => Promise<void>;
  logout: () => void;
  user: DemoUser;
  switchUser: (userId: string) => void;
  availableUsers: DemoUser[];
}

const defaultUser = DEMO_USERS['admin-user'];

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: true,
  isLoading: false,
  login: async () => {},
  logout: () => {},
  user: defaultUser,
  switchUser: () => {},
  availableUsers: Object.values(DEMO_USERS)
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<DemoUser>(() => {
    const savedUserId = localStorage.getItem('demo_user_id');
    return savedUserId && DEMO_USERS[savedUserId] ? DEMO_USERS[savedUserId] : defaultUser;
  });
  
  useEffect(() => {
    localStorage.setItem('auth_token', 'demo-token-development');
    localStorage.setItem('currentTenantId', currentUser.tenantId);
    localStorage.setItem('currentTenant', 'staging');
    localStorage.setItem('demo_user_id', currentUser.id);
  }, [currentUser]);

  const switchUser = (userId: string) => {
    const newUser = DEMO_USERS[userId];
    if (newUser) {
      setCurrentUser(newUser);
      localStorage.setItem('demo_user_id', userId);
      console.log(`[DEV] Switched to user: ${newUser.name} (${newUser.role})`);
      window.location.reload();
    }
  };

  const value: AuthContextType = {
    isAuthenticated: true,
    isLoading: false,
    login: async () => { console.log('Login bypassed in development'); },
    logout: () => { 
      localStorage.removeItem('demo_user_id');
      setCurrentUser(defaultUser);
      console.log('Logout - reset to admin'); 
    },
    user: currentUser,
    switchUser,
    availableUsers: Object.values(DEMO_USERS)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
