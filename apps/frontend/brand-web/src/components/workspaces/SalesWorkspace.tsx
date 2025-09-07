import React from 'react';
import { 
  TrendingUp, DollarSign, Package, Users, 
  Target, BarChart3, FileText, Settings
} from 'lucide-react';

export default function SalesWorkspace() {
  const priceLists = [
    { id: 1, name: 'Listino Fibra B2B', validity: '2025-Q1', status: 'Attivo', tenants: 'Tutti' },
    { id: 2, name: 'Promo Very Mobile', validity: '2025-Q1', status: 'Attivo', tenants: '12 selezionati' },
    { id: 3, name: 'Energia Casa Winter', validity: '2024-Q4', status: 'Scaduto', tenants: 'Tutti' }
  ];

  const salesSupport = [
    { id: 1, title: 'Guida Vendita Fibra Enterprise', type: 'PDF', downloads: 234 },
    { id: 2, title: 'Script Chiamate B2B', type: 'Script', downloads: 156 },
    { id: 3, title: 'Presentazione Very Mobile', type: 'PPT', downloads: 89 }
  ];

  const targets = [
    { period: 'Gen 2025', fibra: '€450K', mobile: '€320K', energia: '€180K', status: 'In corso' },
    { period: 'Feb 2025', fibra: '€480K', mobile: '€340K', energia: '€200K', status: 'Pianificato' },
    { period: 'Mar 2025', fibra: '€520K', mobile: '€360K', energia: '€220K', status: 'Pianificato' }
  ];

  return (
    <div className="space-y-6">
      
      {/* Sales Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center space-x-3">
            <div className="glass-button rounded-lg p-2" style={{ background: '#10b98120' }}>
              <DollarSign className="w-5 h-5" style={{ color: '#10b981' }} />
            </div>
            <div>
              <p className="text-white/60 text-sm">Revenue Q1</p>
              <p className="text-white text-xl font-bold">€2.1M</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center space-x-3">
            <div className="glass-button rounded-lg p-2" style={{ background: '#FF690020' }}>
              <Target className="w-5 h-5" style={{ color: '#FF6900' }} />
            </div>
            <div>
              <p className="text-white/60 text-sm">Target Achievement</p>
              <p className="text-white text-xl font-bold">87%</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center space-x-3">
            <div className="glass-button rounded-lg p-2" style={{ background: '#7B2CBF20' }}>
              <Package className="w-5 h-5" style={{ color: '#7B2CBF' }} />
            </div>
            <div>
              <p className="text-white/60 text-sm">Listini Attivi</p>
              <p className="text-white text-xl font-bold">8</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center space-x-3">
            <div className="glass-button rounded-lg p-2" style={{ background: '#f59e0b20' }}>
              <Users className="w-5 h-5" style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <p className="text-white/60 text-sm">Tenant Coperti</p>
              <p className="text-white text-xl font-bold">24</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-6">
        <h2 className="text-white text-lg font-bold mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2" style={{ color: '#10b981' }} />
          Gestione Vendite
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="glass-button p-4 rounded-lg text-left hover:bg-white/10 transition-all">
            <Package className="w-6 h-6 mb-2" style={{ color: '#7B2CBF' }} />
            <h3 className="text-white font-medium">Nuovo Listino</h3>
            <p className="text-white/60 text-sm">Crea listino prezzi</p>
          </button>
          
          <button className="glass-button p-4 rounded-lg text-left hover:bg-white/10 transition-all">
            <Target className="w-6 h-6 mb-2" style={{ color: '#FF6900' }} />
            <h3 className="text-white font-medium">Target Vendite</h3>
            <p className="text-white/60 text-sm">Imposta obiettivi</p>
          </button>
          
          <button className="glass-button p-4 rounded-lg text-left hover:bg-white/10 transition-all">
            <FileText className="w-6 h-6 mb-2" style={{ color: '#10b981' }} />
            <h3 className="text-white font-medium">Materiale Vendita</h3>
            <p className="text-white/60 text-sm">Supporto commerciale</p>
          </button>
        </div>
      </div>

      {/* Price Lists */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-lg font-bold">Listini Prezzi</h2>
          <button 
            className="glass-button px-4 py-2 rounded-lg text-white hover:bg-white/10 transition-all"
            style={{ background: '#7B2CBF20', borderColor: '#7B2CBF40' }}
          >
            <Package className="w-4 h-4 mr-2 inline" />
            Nuovo Listino
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-white/60 font-medium py-3">Nome Listino</th>
                <th className="text-left text-white/60 font-medium py-3">Validità</th>
                <th className="text-left text-white/60 font-medium py-3">Stato</th>
                <th className="text-left text-white/60 font-medium py-3">Applicazione</th>
                <th className="text-left text-white/60 font-medium py-3">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {priceLists.map((list) => (
                <tr key={list.id} className="border-b border-white/5">
                  <td className="py-4">
                    <div className="text-white font-medium">{list.name}</div>
                  </td>
                  <td className="py-4 text-white/80">{list.validity}</td>
                  <td className="py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      list.status === 'Attivo' 
                        ? 'bg-green-500/20 text-green-300' 
                        : 'bg-red-500/20 text-red-300'
                    }`}>
                      {list.status}
                    </span>
                  </td>
                  <td className="py-4 text-white/80">{list.tenants}</td>
                  <td className="py-4">
                    <button className="glass-button p-2 rounded-lg text-white/60 hover:text-white mr-2">
                      <Settings className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sales Targets */}
      <div className="glass-card p-6">
        <h2 className="text-white text-lg font-bold mb-4">Target Vendite Q1 2025</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-white/60 font-medium py-3">Periodo</th>
                <th className="text-left text-white/60 font-medium py-3">Fibra</th>
                <th className="text-left text-white/60 font-medium py-3">Mobile</th>
                <th className="text-left text-white/60 font-medium py-3">Energia</th>
                <th className="text-left text-white/60 font-medium py-3">Stato</th>
              </tr>
            </thead>
            <tbody>
              {targets.map((target, index) => (
                <tr key={index} className="border-b border-white/5">
                  <td className="py-4 text-white font-medium">{target.period}</td>
                  <td className="py-4 text-white/80">{target.fibra}</td>
                  <td className="py-4 text-white/80">{target.mobile}</td>
                  <td className="py-4 text-white/80">{target.energia}</td>
                  <td className="py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      target.status === 'In corso' 
                        ? 'bg-blue-500/20 text-blue-300' 
                        : 'bg-gray-500/20 text-gray-300'
                    }`}>
                      {target.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sales Support Materials */}
      <div className="glass-card p-6">
        <h2 className="text-white text-lg font-bold mb-4">Materiale di Supporto</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {salesSupport.map((material) => (
            <div key={material.id} className="glass-button p-4 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <FileText className="w-5 h-5" style={{ color: '#10b981' }} />
                <span className="text-white/60 text-xs bg-white/10 px-2 py-1 rounded">
                  {material.downloads} downloads
                </span>
              </div>
              <h3 className="text-white font-medium mb-1">{material.title}</h3>
              <p className="text-white/60 text-sm">{material.type}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}