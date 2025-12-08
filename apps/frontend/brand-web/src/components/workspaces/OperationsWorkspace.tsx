import React from 'react';
import { 
  Cog, BarChart3, AlertTriangle, CheckCircle, 
  Clock, Users, Building2, Zap, Activity, FileText
} from 'lucide-react';

export default function OperationsWorkspace() {
  const systemStatus = [
    { service: 'W3 Suite Core', status: 'Operativo', uptime: '99.9%', response: '120ms' },
    { service: 'OAuth2 Service', status: 'Operativo', uptime: '99.8%', response: '85ms' },
    { service: 'Database Cluster', status: 'Operativo', uptime: '99.9%', response: '45ms' },
    { service: 'Brand Interface', status: 'Manutenzione', uptime: '98.5%', response: '95ms' }
  ];

  const deployments = [
    { id: 1, type: 'Feature Release', version: 'v2.1.4', target: 'Tutti i tenant', status: 'Completato', date: '15 Gen 2025' },
    { id: 2, type: 'Hotfix', version: 'v2.1.3-hotfix.1', target: 'Tenant critici', status: 'In corso', date: '14 Gen 2025' },
    { id: 3, type: 'Configuration Update', version: 'Config-2025.01', target: 'acme, tech-corp', status: 'Pianificato', date: '16 Gen 2025' }
  ];

  const tenantHealth = [
    { tenant: 'ACME Corp', stores: 45, users: 156, lastActivity: '2 min fa', health: 'Ottima' },
    { tenant: 'Tech Solutions', stores: 23, users: 89, lastActivity: '5 min fa', health: 'Buona' },
    { tenant: 'Demo Tenant', stores: 12, users: 34, lastActivity: '1h fa', health: 'Attenzione' }
  ];

  return (
    <div className="space-y-6">
      
      {/* Operations Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center space-x-3">
            <div className="glass-button rounded-lg p-2" style={{ background: '#10b98120' }}>
              <CheckCircle className="w-5 h-5" style={{ color: '#10b981' }} />
            </div>
            <div>
              <p className="text-white/60 text-sm">Uptime Globale</p>
              <p className="text-white text-xl font-bold">99.7%</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center space-x-3">
            <div className="glass-button rounded-lg p-2" style={{ background: '#FF690020' }}>
              <Building2 className="w-5 h-5" style={{ color: '#FF6900' }} />
            </div>
            <div>
              <p className="text-white/60 text-sm">Tenant Attivi</p>
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
              <p className="text-white/60 text-sm">Utenti Totali</p>
              <p className="text-white text-xl font-bold">1,234</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center space-x-3">
            <div className="glass-button rounded-lg p-2" style={{ background: '#f59e0b20' }}>
              <AlertTriangle className="w-5 h-5" style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <p className="text-white/60 text-sm">Alert Aperti</p>
              <p className="text-white text-xl font-bold">3</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-6">
        <h2 className="text-white text-lg font-bold mb-4 flex items-center">
          <Cog className="w-5 h-5 mr-2" style={{ color: '#10b981' }} />
          Centro Operativo
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="glass-button p-4 rounded-lg text-left hover:bg-white/10 transition-all">
            <Zap className="w-6 h-6 mb-2" style={{ color: '#FF6900' }} />
            <h3 className="text-white font-medium">Deploy Management</h3>
            <p className="text-white/60 text-sm">Gestisci rilasci</p>
          </button>
          
          <button className="glass-button p-4 rounded-lg text-left hover:bg-white/10 transition-all">
            <BarChart3 className="w-6 h-6 mb-2" style={{ color: '#7B2CBF' }} />
            <h3 className="text-white font-medium">System Monitoring</h3>
            <p className="text-white/60 text-sm">Monitoraggio servizi</p>
          </button>
          
          <button className="glass-button p-4 rounded-lg text-left hover:bg-white/10 transition-all">
            <Building2 className="w-6 h-6 mb-2" style={{ color: '#10b981' }} />
            <h3 className="text-white font-medium">Tenant Health</h3>
            <p className="text-white/60 text-sm">Salute organizzazioni</p>
          </button>
        </div>
      </div>

      {/* System Status */}
      <div className="glass-card p-6">
        <h2 className="text-white text-lg font-bold mb-4">Stato Servizi</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-white/60 font-medium py-3">Servizio</th>
                <th className="text-left text-white/60 font-medium py-3">Stato</th>
                <th className="text-left text-white/60 font-medium py-3">Uptime</th>
                <th className="text-left text-white/60 font-medium py-3">Response Time</th>
                <th className="text-left text-white/60 font-medium py-3">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {systemStatus.map((service, index) => (
                <tr key={index} className="border-b border-white/5">
                  <td className="py-4">
                    <div className="text-white font-medium">{service.service}</div>
                  </td>
                  <td className="py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      service.status === 'Operativo' 
                        ? 'bg-green-500/20 text-green-300' 
                        : 'bg-yellow-500/20 text-yellow-300'
                    }`}>
                      {service.status}
                    </span>
                  </td>
                  <td className="py-4 text-white/80">{service.uptime}</td>
                  <td className="py-4 text-white/80">{service.response}</td>
                  <td className="py-4">
                    <button className="glass-button p-2 rounded-lg text-white/60 hover:text-white">
                      <Activity className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Deployments */}
      <div className="glass-card p-6">
        <h2 className="text-white text-lg font-bold mb-4">Deploy Recenti</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-white/60 font-medium py-3">Tipo</th>
                <th className="text-left text-white/60 font-medium py-3">Versione</th>
                <th className="text-left text-white/60 font-medium py-3">Target</th>
                <th className="text-left text-white/60 font-medium py-3">Stato</th>
                <th className="text-left text-white/60 font-medium py-3">Data</th>
              </tr>
            </thead>
            <tbody>
              {deployments.map((deploy) => (
                <tr key={deploy.id} className="border-b border-white/5">
                  <td className="py-4 text-white font-medium">{deploy.type}</td>
                  <td className="py-4 text-white/80 font-mono text-sm">{deploy.version}</td>
                  <td className="py-4 text-white/80">{deploy.target}</td>
                  <td className="py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      deploy.status === 'Completato' 
                        ? 'bg-green-500/20 text-green-300' 
                        : deploy.status === 'In corso'
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-gray-500/20 text-gray-300'
                    }`}>
                      {deploy.status}
                    </span>
                  </td>
                  <td className="py-4 text-white/80">{deploy.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tenant Health Monitor */}
      <div className="glass-card p-6">
        <h2 className="text-white text-lg font-bold mb-4">Salute Tenant</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tenantHealth.map((tenant, index) => (
            <div key={index} className="glass-button p-4 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <Building2 className="w-5 h-5" style={{ color: '#7B2CBF' }} />
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  tenant.health === 'Ottima' 
                    ? 'bg-green-500/20 text-green-300' 
                    : tenant.health === 'Buona'
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'bg-yellow-500/20 text-yellow-300'
                }`}>
                  {tenant.health}
                </span>
              </div>
              <h3 className="text-white font-medium mb-2">{tenant.tenant}</h3>
              <div className="space-y-1 text-sm text-white/60">
                <p>{tenant.stores} stores • {tenant.users} utenti</p>
                <p>Ultima attività: {tenant.lastActivity}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}