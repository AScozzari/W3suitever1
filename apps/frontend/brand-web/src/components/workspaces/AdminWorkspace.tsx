import React from 'react';
import { 
  Shield, Building2, Users, UserPlus, Settings, 
  Key, Database, Globe, Plus, Edit, Trash2, Eye
} from 'lucide-react';

export default function AdminWorkspace() {
  const tenants = [
    { id: 1, name: 'ACME Corporation', slug: 'acme', status: 'Attivo', users: 156, stores: 45, created: '2024-01-15' },
    { id: 2, name: 'Tech Solutions Ltd', slug: 'tech-solutions', status: 'Attivo', users: 89, stores: 23, created: '2024-02-20' },
    { id: 3, name: 'Demo Organization', slug: 'demo', status: 'Demo', users: 34, stores: 12, created: '2024-03-10' }
  ];

  const adminUsers = [
    { id: 1, name: 'Mario Rossi', email: 'mario.rossi@w3suite.com', role: 'Super Admin', workspace: 'Tutte', lastLogin: '2 min fa' },
    { id: 2, name: 'Laura Bianchi', email: 'laura.bianchi@w3suite.com', role: 'Marketing Manager', workspace: 'Marketing', lastLogin: '1h fa' },
    { id: 3, name: 'Giuseppe Verdi', email: 'giuseppe.verdi@w3suite.com', role: 'Operations Lead', workspace: 'Operations', lastLogin: '3h fa' }
  ];

  const systemConfig = [
    { key: 'OAuth2 Provider', value: 'Keycloak Enterprise', status: 'Configurato' },
    { key: 'Database Cluster', value: 'PostgreSQL 15.x + RLS', status: 'Operativo' },
    { key: 'Email Service', value: 'SendGrid Pro', status: 'Attivo' },
    { key: 'File Storage', value: 'AWS S3 Enterprise', status: 'Attivo' }
  ];

  return (
    <div className="space-y-6">
      
      {/* Admin Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center space-x-3">
            <div className="glass-button rounded-lg p-2" style={{ background: '#f59e0b20' }}>
              <Building2 className="w-5 h-5" style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <p className="text-white/60 text-sm">Organizzazioni</p>
              <p className="text-white text-xl font-bold">24</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center space-x-3">
            <div className="glass-button rounded-lg p-2" style={{ background: '#7B2CBF20' }}>
              <Users className="w-5 h-5" style={{ color: '#7B2CBF' }} />
            </div>
            <div>
              <p className="text-white/60 text-sm">Utenti Brand</p>
              <p className="text-white text-xl font-bold">12</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center space-x-3">
            <div className="glass-button rounded-lg p-2" style={{ background: '#10b98120' }}>
              <Database className="w-5 h-5" style={{ color: '#10b981' }} />
            </div>
            <div>
              <p className="text-white/60 text-sm">DB Size</p>
              <p className="text-white text-xl font-bold">2.4GB</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center space-x-3">
            <div className="glass-button rounded-lg p-2" style={{ background: '#FF690020' }}>
              <Shield className="w-5 h-5" style={{ color: '#FF6900' }} />
            </div>
            <div>
              <p className="text-white/60 text-sm">Security Score</p>
              <p className="text-white text-xl font-bold">A+</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-6">
        <h2 className="text-white text-lg font-bold mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2" style={{ color: '#f59e0b' }} />
          Amministrazione Sistema
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="glass-button p-4 rounded-lg text-left hover:bg-white/10 transition-all">
            <Building2 className="w-6 h-6 mb-2" style={{ color: '#f59e0b' }} />
            <h3 className="text-white font-medium">Nuova Organizzazione</h3>
            <p className="text-white/60 text-sm">Crea nuovo tenant</p>
          </button>
          
          <button className="glass-button p-4 rounded-lg text-left hover:bg-white/10 transition-all">
            <UserPlus className="w-6 h-6 mb-2" style={{ color: '#7B2CBF' }} />
            <h3 className="text-white font-medium">Gestione Utenti</h3>
            <p className="text-white/60 text-sm">Admin e permessi</p>
          </button>
          
          <button className="glass-button p-4 rounded-lg text-left hover:bg-white/10 transition-all">
            <Settings className="w-6 h-6 mb-2" style={{ color: '#10b981' }} />
            <h3 className="text-white font-medium">Configurazione</h3>
            <p className="text-white/60 text-sm">Impostazioni sistema</p>
          </button>
        </div>
      </div>

      {/* Tenant Management */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-lg font-bold">Gestione Organizzazioni</h2>
          <button 
            className="glass-button px-4 py-2 rounded-lg text-white hover:bg-white/10 transition-all"
            style={{ background: '#f59e0b20', borderColor: '#f59e0b40' }}
          >
            <Plus className="w-4 h-4 mr-2 inline" />
            Nuova Organizzazione
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-white/60 font-medium py-3">Organizzazione</th>
                <th className="text-left text-white/60 font-medium py-3">Slug</th>
                <th className="text-left text-white/60 font-medium py-3">Stato</th>
                <th className="text-left text-white/60 font-medium py-3">Utenti</th>
                <th className="text-left text-white/60 font-medium py-3">Stores</th>
                <th className="text-left text-white/60 font-medium py-3">Creata</th>
                <th className="text-left text-white/60 font-medium py-3">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="border-b border-white/5">
                  <td className="py-4">
                    <div className="text-white font-medium">{tenant.name}</div>
                  </td>
                  <td className="py-4">
                    <code className="text-white/80 bg-white/10 px-2 py-1 rounded text-sm">
                      {tenant.slug}
                    </code>
                  </td>
                  <td className="py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      tenant.status === 'Attivo' 
                        ? 'bg-green-500/20 text-green-300' 
                        : 'bg-blue-500/20 text-blue-300'
                    }`}>
                      {tenant.status}
                    </span>
                  </td>
                  <td className="py-4 text-white/80">{tenant.users}</td>
                  <td className="py-4 text-white/80">{tenant.stores}</td>
                  <td className="py-4 text-white/80">{tenant.created}</td>
                  <td className="py-4">
                    <div className="flex space-x-2">
                      <button className="glass-button p-2 rounded-lg text-white/60 hover:text-white">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="glass-button p-2 rounded-lg text-white/60 hover:text-white">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="glass-button p-2 rounded-lg text-red-400/60 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Brand Users Management */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-lg font-bold">Utenti Brand Interface</h2>
          <button 
            className="glass-button px-4 py-2 rounded-lg text-white hover:bg-white/10 transition-all"
            style={{ background: '#7B2CBF20', borderColor: '#7B2CBF40' }}
          >
            <UserPlus className="w-4 h-4 mr-2 inline" />
            Nuovo Utente
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-white/60 font-medium py-3">Nome</th>
                <th className="text-left text-white/60 font-medium py-3">Email</th>
                <th className="text-left text-white/60 font-medium py-3">Ruolo</th>
                <th className="text-left text-white/60 font-medium py-3">Workspace</th>
                <th className="text-left text-white/60 font-medium py-3">Ultimo Accesso</th>
                <th className="text-left text-white/60 font-medium py-3">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {adminUsers.map((user) => (
                <tr key={user.id} className="border-b border-white/5">
                  <td className="py-4 text-white font-medium">{user.name}</td>
                  <td className="py-4 text-white/80">{user.email}</td>
                  <td className="py-4">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300">
                      {user.role}
                    </span>
                  </td>
                  <td className="py-4 text-white/80">{user.workspace}</td>
                  <td className="py-4 text-white/80">{user.lastLogin}</td>
                  <td className="py-4">
                    <div className="flex space-x-2">
                      <button className="glass-button p-2 rounded-lg text-white/60 hover:text-white">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="glass-button p-2 rounded-lg text-red-400/60 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Configuration */}
      <div className="glass-card p-6">
        <h2 className="text-white text-lg font-bold mb-4">Configurazione Sistema</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {systemConfig.map((config, index) => (
            <div key={index} className="glass-button p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-medium">{config.key}</h3>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300">
                  {config.status}
                </span>
              </div>
              <p className="text-white/60 text-sm">{config.value}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}