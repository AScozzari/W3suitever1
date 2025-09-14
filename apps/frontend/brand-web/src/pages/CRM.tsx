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
      active: 'bg-green-100 text-green-800',
      lead: 'bg-blue-100 text-blue-800',
      prospect: 'bg-yellow-100 text-yellow-800'
    };
    const labels = {
      active: 'Attivo',
      lead: 'Lead',
      prospect: 'Prospect'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  return (
    <BrandLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold brand-gradient-text">
                CRM Management
              </h1>
              <p className="text-gray-600 mt-2">
                Gestione clienti {isCrossTenant ? 'cross-tenant' : `per ${currentTenant}`}
              </p>
            </div>
            <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all flex items-center space-x-2">
              <UserPlus className="w-5 h-5" />
              <span>Nuovo Cliente</span>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-600">
                  Clienti Totali
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-700">248</div>
                <p className="text-xs text-purple-600">+12% questo mese</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-600">
                  Valore Pipeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">€165K</div>
                <p className="text-xs text-blue-600">5 deals in corso</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-600">
                  Tasso Conversione
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">68%</div>
                <p className="text-xs text-green-600">+5% vs mese scorso</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-amber-600">
                  Nuovi Lead
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-700">34</div>
                <p className="text-xs text-amber-600">Questa settimana</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Customer List */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
          {/* Search and Filters */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cerca clienti..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">Tutti gli stati</option>
                <option value="active">Attivi</option>
                <option value="lead">Lead</option>
                <option value="prospect">Prospect</option>
              </select>

              <button className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center space-x-2">
                <Filter className="w-4 h-4" />
                <span>Altri filtri</span>
              </button>
            </div>
          </div>

          {/* Customer Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Cliente</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Azienda</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Stato</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Valore</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Rating</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Ultimo Contatto</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Tags</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{customer.name}</p>
                        <p className="text-sm text-gray-500">{customer.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700">{customer.company}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(customer.status)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-900">{customer.value}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-4 h-4 ${i < customer.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600">{customer.lastContact}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {customer.tags.map((tag) => (
                          <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <Phone className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <Mail className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <MoreVertical className="w-4 h-4 text-gray-600" />
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