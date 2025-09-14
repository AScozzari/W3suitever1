import React, { useState } from 'react';
import { useBrandAuth } from '../contexts/BrandAuthContext';
import { useBrandTenant } from '../contexts/BrandTenantContext';
import BrandLayout from '../components/BrandLayout';
import { 
  Users, UserPlus, Mail, Phone, Building2, MapPin, Calendar, 
  TrendingUp, Filter, Search, MoreVertical, Star, Edit, Trash2,
  ChevronDown, Activity, DollarSign, Target
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

// Mock CRM data
const mockCustomers = [
  {
    id: 1,
    name: 'Mario Rossi',
    company: 'Tech Solutions SRL',
    email: 'mario.rossi@techsolutions.it',
    phone: '+39 334 567 8901',
    status: 'active',
    value: '€45,000',
    lastContact: '2 giorni fa',
    rating: 5,
    tags: ['Enterprise', 'Fibra', '5G']
  },
  {
    id: 2,
    name: 'Laura Bianchi',
    company: 'Digital Marketing Agency',
    email: 'laura@digitalagency.com',
    phone: '+39 335 678 9012',
    status: 'lead',
    value: '€12,000',
    lastContact: '1 settimana fa',
    rating: 4,
    tags: ['PMI', 'Cloud']
  },
  {
    id: 3,
    name: 'Giuseppe Verdi',
    company: 'Verdi Logistics',
    email: 'g.verdi@verdilogistics.it',
    phone: '+39 336 789 0123',
    status: 'prospect',
    value: '€78,000',
    lastContact: '3 giorni fa',
    rating: 5,
    tags: ['Enterprise', 'IoT', 'Fleet']
  },
  {
    id: 4,
    name: 'Anna Ferrari',
    company: 'Fashion Boutique',
    email: 'anna@fashionb.it',
    phone: '+39 337 890 1234',
    status: 'active',
    value: '€8,500',
    lastContact: '1 mese fa',
    rating: 3,
    tags: ['Retail', 'POS']
  },
  {
    id: 5,
    name: 'Marco Esposito',
    company: 'Esposito Consulting',
    email: 'marco@esposito.com',
    phone: '+39 338 901 2345',
    status: 'lead',
    value: '€22,000',
    lastContact: 'Oggi',
    rating: 4,
    tags: ['Consulting', 'Mobile']
  }
];

export default function CRM() {
  const { isAuthenticated } = useBrandAuth();
  const { currentTenant, isCrossTenant } = useBrandTenant();
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  if (!isAuthenticated) {
    window.location.href = '/brandinterface/login';
    return null;
  }

  const filteredCustomers = mockCustomers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          customer.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          customer.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || customer.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'glass-card bg-green-500/20 text-green-800 border-green-400/30',
      lead: 'glass-card bg-orange-500/20 text-orange-800 border-orange-400/30',
      prospect: 'glass-card bg-purple-500/20 text-purple-800 border-purple-400/30'
    };
    const labels = {
      active: 'Attivo',
      lead: 'Lead',
      prospect: 'Prospect'
    };
    return (
      <span className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide border ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  return (
    <BrandLayout>
      <div className="space-y-6">
        {/* Modern CRM Header */}
        <div className="glass-card p-8 border-2 border-purple-300/30" data-testid="crm-header">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold brand-gradient-text">
                CRM Management
              </h1>
              <p className="text-gray-700 mt-3 flex items-center gap-3 font-medium">
                <Users className="w-5 h-5 text-purple-600" strokeWidth={2} />
                Gestione clienti {isCrossTenant ? 'cross-tenant' : `per ${currentTenant}`}
                {isCrossTenant && <span className="action-badge ml-2">MULTI-TENANT</span>}
              </p>
            </div>
            <button className="glass-button-orange px-6 py-3 flex items-center space-x-3" data-testid="button-new-customer">
              <UserPlus className="w-5 h-5" strokeWidth={2.5} />
              <span className="font-semibold">Nuovo Cliente</span>
            </button>
          </div>

          {/* Modern CRM Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="glass-card bg-gradient-to-br from-purple-500/10 to-purple-600/15 border-2 border-purple-400/30 hover:border-purple-400/50 transition-all duration-300" data-testid="card-total-customers">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-purple-700 uppercase tracking-wide">
                    Clienti Totali
                  </CardTitle>
                  <div className="p-2 bg-purple-500/20 rounded-xl">
                    <Users className="w-6 h-6 text-purple-600" strokeWidth={2.5} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-800 mb-2">248</div>
                <p className="text-sm text-purple-700 font-medium">+12% questo mese</p>
              </CardContent>
            </Card>

            <Card className="glass-card bg-gradient-to-br from-orange-500/10 to-orange-600/15 border-2 border-orange-400/30 hover:border-orange-400/50 transition-all duration-300" data-testid="card-pipeline-value">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-orange-700 uppercase tracking-wide">
                    Valore Pipeline
                  </CardTitle>
                  <div className="p-2 bg-orange-500/20 rounded-xl">
                    <DollarSign className="w-6 h-6 text-orange-600" strokeWidth={2.5} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-800 mb-2">€165K</div>
                <p className="text-sm text-orange-700 font-medium">5 deals in corso</p>
              </CardContent>
            </Card>

            <Card className="glass-card bg-gradient-to-br from-green-500/10 to-green-600/15 border-2 border-green-400/30 hover:border-green-400/50 transition-all duration-300" data-testid="card-conversion-rate">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-green-700 uppercase tracking-wide">
                    Tasso Conversione
                  </CardTitle>
                  <div className="p-2 bg-green-500/20 rounded-xl">
                    <Target className="w-6 h-6 text-green-600" strokeWidth={2.5} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-800 mb-2">68%</div>
                <p className="text-sm text-green-700 font-medium">+5% vs mese scorso</p>
              </CardContent>
            </Card>

            <Card className="glass-card bg-gradient-to-br from-purple-400/10 to-purple-500/15 border-2 border-purple-300/30 hover:border-purple-300/50 transition-all duration-300" data-testid="card-new-leads">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-purple-700 uppercase tracking-wide">
                    Nuovi Lead
                  </CardTitle>
                  <div className="p-2 bg-purple-400/20 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-purple-600" strokeWidth={2.5} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-800 mb-2">34</div>
                <p className="text-sm text-purple-700 font-medium">Questa settimana</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Modern Customer List */}
        <div className="glass-card p-8 border-2 border-purple-300/20" data-testid="customer-list">
          {/* Modern Search and Filters */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-6 flex-1">
              <div className="relative flex-1 max-w-lg">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-500" strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Cerca clienti per nome, email o azienda..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="glass-input pl-12 pr-6 py-4 w-full text-gray-800 font-medium placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  data-testid="input-search-customers"
                />
              </div>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="glass-button-purple px-6 py-4 text-white font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
                data-testid="select-status-filter"
              >
                <option value="all" className="bg-gray-800 text-white">Tutti gli stati</option>
                <option value="active" className="bg-gray-800 text-white">Attivi</option>
                <option value="lead" className="bg-gray-800 text-white">Lead</option>
                <option value="prospect" className="bg-gray-800 text-white">Prospect</option>
              </select>

              <button className="glass-button px-6 py-4 flex items-center space-x-3 hover:bg-purple-50 transition-all duration-200" data-testid="button-advanced-filters">
                <Filter className="w-5 h-5" strokeWidth={2} />
                <span className="font-medium">Altri Filtri</span>
              </button>
            </div>
          </div>

          {/* Modern Customer Table */}
          <div className="overflow-x-auto rounded-xl">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-purple-200/50 bg-purple-50/30">
                  <th className="text-left py-5 px-6 font-bold text-purple-800 uppercase tracking-wide text-sm">Cliente</th>
                  <th className="text-left py-5 px-6 font-bold text-purple-800 uppercase tracking-wide text-sm">Azienda</th>
                  <th className="text-left py-5 px-6 font-bold text-purple-800 uppercase tracking-wide text-sm">Stato</th>
                  <th className="text-left py-5 px-6 font-bold text-purple-800 uppercase tracking-wide text-sm">Valore</th>
                  <th className="text-left py-5 px-6 font-bold text-purple-800 uppercase tracking-wide text-sm">Rating</th>
                  <th className="text-left py-5 px-6 font-bold text-purple-800 uppercase tracking-wide text-sm">Ultimo Contatto</th>
                  <th className="text-left py-5 px-6 font-bold text-purple-800 uppercase tracking-wide text-sm">Tags</th>
                  <th className="text-left py-5 px-6 font-bold text-purple-800 uppercase tracking-wide text-sm">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b border-purple-100/50 hover:bg-purple-50/20 transition-all duration-200" data-testid={`row-customer-${customer.id}`}>
                    <td className="py-6 px-6">
                      <div>
                        <p className="font-bold text-gray-900 text-lg">{customer.name}</p>
                        <p className="text-sm text-gray-600 font-medium mt-1">{customer.email}</p>
                      </div>
                    </td>
                    <td className="py-6 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Building2 className="w-5 h-5 text-purple-600" strokeWidth={2} />
                        </div>
                        <span className="text-gray-800 font-medium">{customer.company}</span>
                      </div>
                    </td>
                    <td className="py-6 px-6">
                      {getStatusBadge(customer.status)}
                    </td>
                    <td className="py-6 px-6">
                      <span className="font-bold text-2xl text-purple-700">{customer.value}</span>
                    </td>
                    <td className="py-6 px-6">
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-5 h-5 ${i < customer.rating ? 'text-orange-500 fill-current' : 'text-gray-300'}`}
                            strokeWidth={2}
                          />
                        ))}
                        <span className="ml-2 text-sm font-bold text-gray-700">({customer.rating}/5)</span>
                      </div>
                    </td>
                    <td className="py-6 px-6">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-purple-500" strokeWidth={2} />
                        <span className="text-sm text-gray-700 font-medium">{customer.lastContact}</span>
                      </div>
                    </td>
                    <td className="py-6 px-6">
                      <div className="flex flex-wrap gap-2">
                        {customer.tags.map((tag) => (
                          <span key={tag} className="action-badge text-xs font-bold">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-6 px-6">
                      <div className="flex items-center space-x-2">
                        <button className="glass-button p-3 hover:bg-green-100 rounded-xl transition-all duration-200" data-testid={`button-call-${customer.id}`}>
                          <Phone className="w-5 h-5 text-green-600" strokeWidth={2} />
                        </button>
                        <button className="glass-button p-3 hover:bg-blue-100 rounded-xl transition-all duration-200" data-testid={`button-email-${customer.id}`}>
                          <Mail className="w-5 h-5 text-blue-600" strokeWidth={2} />
                        </button>
                        <button className="glass-button-orange p-3 rounded-xl transition-all duration-200" data-testid={`button-edit-${customer.id}`}>
                          <Edit className="w-5 h-5 text-white" strokeWidth={2} />
                        </button>
                        <button className="glass-button p-3 hover:bg-gray-100 rounded-xl transition-all duration-200" data-testid={`button-more-${customer.id}`}>
                          <MoreVertical className="w-5 h-5 text-gray-600" strokeWidth={2} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </BrandLayout>
  );
}