import React from 'react';
import { 
  Megaphone, Target, Users, BarChart3, FileText, 
  Globe, Calendar, TrendingUp, Eye, Send
} from 'lucide-react';

export default function MarketingWorkspace() {
  const campaigns = [
    { id: 1, name: 'Campagna Fibra Q1 2025', status: 'Attiva', reach: '2.3M', engagement: '4.2%' },
    { id: 2, name: 'Promo Very Mobile', status: 'Pianificata', reach: '1.8M', engagement: '--' },
    { id: 3, name: 'Energia Casa', status: 'Completata', reach: '956K', engagement: '3.1%' }
  ];

  const templates = [
    { id: 1, name: 'Landing Fibra Enterprise', type: 'Landing Page', usage: 12 },
    { id: 2, name: 'Email Newsletter Mensile', type: 'Email Template', usage: 8 },
    { id: 3, name: 'Banner Promo Mobile', type: 'Display Banner', usage: 24 }
  ];

  return (
    <div className="space-y-6">
      
      {/* Marketing Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center space-x-3">
            <div className="glass-button rounded-lg p-2" style={{ background: '#FF690020' }}>
              <Target className="w-5 h-5" style={{ color: '#FF6900' }} />
            </div>
            <div>
              <p className="text-white/60 text-sm">Campagne Attive</p>
              <p className="text-white text-xl font-bold">12</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center space-x-3">
            <div className="glass-button rounded-lg p-2" style={{ background: '#7B2CBF20' }}>
              <Users className="w-5 h-5" style={{ color: '#7B2CBF' }} />
            </div>
            <div>
              <p className="text-white/60 text-sm">Reach Totale</p>
              <p className="text-white text-xl font-bold">8.2M</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center space-x-3">
            <div className="glass-button rounded-lg p-2" style={{ background: '#10b98120' }}>
              <TrendingUp className="w-5 h-5" style={{ color: '#10b981' }} />
            </div>
            <div>
              <p className="text-white/60 text-sm">Conversion Rate</p>
              <p className="text-white text-xl font-bold">3.8%</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center space-x-3">
            <div className="glass-button rounded-lg p-2" style={{ background: '#f59e0b20' }}>
              <BarChart3 className="w-5 h-5" style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <p className="text-white/60 text-sm">ROI Medio</p>
              <p className="text-white text-xl font-bold">4.2x</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-6">
        <h2 className="text-white text-lg font-bold mb-4 flex items-center">
          <Megaphone className="w-5 h-5 mr-2" style={{ color: '#FF6900' }} />
          Azioni Rapide Marketing
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="glass-button p-4 rounded-lg text-left hover:bg-white/10 transition-all">
            <Globe className="w-6 h-6 mb-2" style={{ color: '#FF6900' }} />
            <h3 className="text-white font-medium">Nuova Campagna</h3>
            <p className="text-white/60 text-sm">Crea campagna cross-tenant</p>
          </button>
          
          <button className="glass-button p-4 rounded-lg text-left hover:bg-white/10 transition-all">
            <FileText className="w-6 h-6 mb-2" style={{ color: '#7B2CBF' }} />
            <h3 className="text-white font-medium">Template CMS</h3>
            <p className="text-white/60 text-sm">Gestisci template landing</p>
          </button>
          
          <button className="glass-button p-4 rounded-lg text-left hover:bg-white/10 transition-all">
            <BarChart3 className="w-6 h-6 mb-2" style={{ color: '#10b981' }} />
            <h3 className="text-white font-medium">Analytics</h3>
            <p className="text-white/60 text-sm">Report performance</p>
          </button>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-lg font-bold">Campagne Attive</h2>
          <button 
            className="glass-button px-4 py-2 rounded-lg text-white hover:bg-white/10 transition-all"
            style={{ background: '#FF690020', borderColor: '#FF690040' }}
          >
            <Send className="w-4 h-4 mr-2 inline" />
            Nuova Campagna
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-white/60 font-medium py-3">Campagna</th>
                <th className="text-left text-white/60 font-medium py-3">Stato</th>
                <th className="text-left text-white/60 font-medium py-3">Reach</th>
                <th className="text-left text-white/60 font-medium py-3">Engagement</th>
                <th className="text-left text-white/60 font-medium py-3">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="border-b border-white/5">
                  <td className="py-4">
                    <div className="text-white font-medium">{campaign.name}</div>
                  </td>
                  <td className="py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      campaign.status === 'Attiva' 
                        ? 'bg-green-500/20 text-green-300' 
                        : campaign.status === 'Pianificata'
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-gray-500/20 text-gray-300'
                    }`}>
                      {campaign.status}
                    </span>
                  </td>
                  <td className="py-4 text-white/80">{campaign.reach}</td>
                  <td className="py-4 text-white/80">{campaign.engagement}</td>
                  <td className="py-4">
                    <button className="glass-button p-2 rounded-lg text-white/60 hover:text-white">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Templates Section */}
      <div className="glass-card p-6">
        <h2 className="text-white text-lg font-bold mb-4">Template CMS</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div key={template.id} className="glass-button p-4 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <FileText className="w-5 h-5" style={{ color: '#7B2CBF' }} />
                <span className="text-white/60 text-xs bg-white/10 px-2 py-1 rounded">
                  {template.usage} usi
                </span>
              </div>
              <h3 className="text-white font-medium mb-1">{template.name}</h3>
              <p className="text-white/60 text-sm">{template.type}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}