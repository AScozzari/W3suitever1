import React, { useState } from 'react';
import { useBrandAuth } from '../contexts/BrandAuthContext';
import { useBrandTenant } from '../contexts/BrandTenantContext';
import BrandLayout from '../components/BrandLayout';
import { 
  Users, UserPlus, Mail, Phone, Building2, MapPin, Calendar, 
  TrendingUp, Filter, Search, MoreVertical, Star, Edit, Trash2,
  ChevronDown, Activity, DollarSign, Target
} from 'lucide-react';

// Color palette
const COLORS = {
  primary: {
    orange: '#FF6900',
    orangeLight: '#ff8533',
    purple: '#7B2CBF',
    purpleLight: '#9747ff',
  },
  semantic: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  neutral: {
    dark: '#1f2937',
    medium: '#6b7280',
    light: '#9ca3af',
    lighter: '#e5e7eb',
    lightest: '#f9fafb',
  },
  glass: {
    white: 'hsla(255, 255, 255, 0.08)',
    whiteLight: 'hsla(255, 255, 255, 0.03)',
    whiteMedium: 'hsla(255, 255, 255, 0.12)',
    whiteBorder: 'hsla(255, 255, 255, 0.18)',
  }
};

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
    const baseStyle = {
      padding: '6px 12px',
      borderRadius: '8px',
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
      display: 'inline-block',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      border: '1px solid',
      transition: 'all 0.2s ease'
    };

    const styles = {
      active: {
        ...baseStyle,
        background: `linear-gradient(135deg, ${COLORS.semantic.success}15, ${COLORS.semantic.success}10)`,
        color: COLORS.semantic.success,
        borderColor: `${COLORS.semantic.success}30`
      },
      lead: {
        ...baseStyle,
        background: `linear-gradient(135deg, ${COLORS.primary.orange}15, ${COLORS.primary.orange}10)`,
        color: COLORS.primary.orange,
        borderColor: `${COLORS.primary.orange}30`
      },
      prospect: {
        ...baseStyle,
        background: `linear-gradient(135deg, ${COLORS.primary.purple}15, ${COLORS.primary.purple}10)`,
        color: COLORS.primary.purple,
        borderColor: `${COLORS.primary.purple}30`
      }
    };

    const labels = {
      active: 'Attivo',
      lead: 'Lead',
      prospect: 'Prospect'
    };

    return (
      <span style={styles[status as keyof typeof styles]}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  // Glassmorphism card style
  const glassCardStyle = {
    background: COLORS.glass.white,
    backdropFilter: 'blur(24px) saturate(140%)',
    WebkitBackdropFilter: 'blur(24px) saturate(140%)',
    border: `1px solid ${COLORS.glass.whiteBorder}`,
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
    transition: 'all 0.3s ease'
  };

  // Stats card style
  const statsCardStyle = (color: string) => ({
    ...glassCardStyle,
    padding: '20px',
    background: `linear-gradient(135deg, ${COLORS.glass.white}, ${COLORS.glass.whiteLight})`,
    borderLeft: `3px solid ${color}`,
    position: 'relative' as const,
    overflow: 'hidden',
    cursor: 'pointer'
  });

  return (
    <BrandLayout>
      <div style={{ padding: '24px', minHeight: '100vh' }}>
        {/* CRM Header */}
        <div 
          style={{
            ...glassCardStyle,
            padding: '32px',
            marginBottom: '24px',
            background: `linear-gradient(135deg, ${COLORS.glass.white}, ${COLORS.glass.whiteLight})`
          }}
          data-testid="crm-header"
        >
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '32px' 
          }}>
            <div>
              <h1 style={{ 
                fontSize: '32px', 
                fontWeight: 700,
                background: `linear-gradient(135deg, ${COLORS.primary.orange}, ${COLORS.primary.orangeLight})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                marginBottom: '8px'
              }}>
                CRM Management
              </h1>
              <p style={{ 
                fontSize: '14px',
                color: COLORS.neutral.medium,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Users size={18} style={{ color: COLORS.primary.orange }} strokeWidth={2} />
                <span style={{ fontWeight: 500 }}>
                  Gestione clienti {isCrossTenant ? 'cross-tenant' : `per ${currentTenant}`}
                </span>
                {isCrossTenant && (
                  <span style={{
                    background: `linear-gradient(135deg, ${COLORS.primary.orange}20, ${COLORS.primary.orange}10)`,
                    color: COLORS.primary.orange,
                    padding: '4px 12px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                    marginLeft: '8px',
                    border: `1px solid ${COLORS.primary.orange}30`
                  }}>
                    MULTI-TENANT
                  </span>
                )}
              </p>
            </div>
            <button 
              style={{
                background: `linear-gradient(135deg, ${COLORS.primary.orange}, ${COLORS.primary.orangeLight})`,
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(255, 105, 0, 0.3)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 105, 0, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 105, 0, 0.3)';
              }}
              data-testid="button-new-customer"
            >
              <UserPlus size={20} strokeWidth={2.5} />
              Nuovo Cliente
            </button>
          </div>

          {/* Stats Cards Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px'
          }}>
            {/* Total Customers Card */}
            <div 
              style={statsCardStyle(COLORS.primary.orange)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.08)';
              }}
              data-testid="card-total-customers"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: COLORS.primary.orange,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '12px'
                  }}>
                    Clienti Totali
                  </p>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    color: COLORS.neutral.dark,
                    marginBottom: '4px'
                  }}>248</div>
                  <p style={{
                    fontSize: '13px',
                    color: COLORS.semantic.success,
                    fontWeight: 500
                  }}>+12% questo mese</p>
                </div>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: `linear-gradient(135deg, ${COLORS.primary.orange}20, ${COLORS.primary.orange}10)`,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Users size={24} style={{ color: COLORS.primary.orange }} strokeWidth={2} />
                </div>
              </div>
            </div>

            {/* Pipeline Value Card */}
            <div 
              style={statsCardStyle(COLORS.primary.purple)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.08)';
              }}
              data-testid="card-pipeline-value"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: COLORS.primary.purple,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '12px'
                  }}>
                    Valore Pipeline
                  </p>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    color: COLORS.neutral.dark,
                    marginBottom: '4px'
                  }}>€165K</div>
                  <p style={{
                    fontSize: '13px',
                    color: COLORS.neutral.medium,
                    fontWeight: 500
                  }}>5 deals in corso</p>
                </div>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: `linear-gradient(135deg, ${COLORS.primary.purple}20, ${COLORS.primary.purple}10)`,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <DollarSign size={24} style={{ color: COLORS.primary.purple }} strokeWidth={2} />
                </div>
              </div>
            </div>

            {/* Conversion Rate Card */}
            <div 
              style={statsCardStyle(COLORS.semantic.success)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.08)';
              }}
              data-testid="card-conversion-rate"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: COLORS.semantic.success,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '12px'
                  }}>
                    Tasso Conversione
                  </p>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    color: COLORS.neutral.dark,
                    marginBottom: '4px'
                  }}>68%</div>
                  <p style={{
                    fontSize: '13px',
                    color: COLORS.semantic.success,
                    fontWeight: 500
                  }}>+5% vs mese scorso</p>
                </div>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: `linear-gradient(135deg, ${COLORS.semantic.success}20, ${COLORS.semantic.success}10)`,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Target size={24} style={{ color: COLORS.semantic.success }} strokeWidth={2} />
                </div>
              </div>
            </div>

            {/* New Leads Card */}
            <div 
              style={statsCardStyle(COLORS.semantic.warning)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.08)';
              }}
              data-testid="card-new-leads"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: COLORS.semantic.warning,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '12px'
                  }}>
                    Nuovi Lead
                  </p>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    color: COLORS.neutral.dark,
                    marginBottom: '4px'
                  }}>34</div>
                  <p style={{
                    fontSize: '13px',
                    color: COLORS.neutral.medium,
                    fontWeight: 500
                  }}>Questa settimana</p>
                </div>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: `linear-gradient(135deg, ${COLORS.semantic.warning}20, ${COLORS.semantic.warning}10)`,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <TrendingUp size={24} style={{ color: COLORS.semantic.warning }} strokeWidth={2} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Customer List */}
        <div 
          style={{
            ...glassCardStyle,
            padding: '32px',
            background: `linear-gradient(135deg, ${COLORS.glass.white}, ${COLORS.glass.whiteLight})`
          }}
          data-testid="customer-list"
        >
          {/* Search and Filters */}
          <div style={{ 
            display: 'flex', 
            gap: '16px',
            marginBottom: '24px',
            flexWrap: 'wrap'
          }}>
            {/* Search Input */}
            <div style={{ 
              position: 'relative',
              flex: '1',
              minWidth: '300px'
            }}>
              <Search 
                size={20} 
                style={{ 
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: COLORS.neutral.medium
                }} 
                strokeWidth={2}
              />
              <input
                type="text"
                placeholder="Cerca clienti per nome, email o azienda..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 48px',
                  background: COLORS.glass.white,
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: `1px solid ${COLORS.glass.whiteBorder}`,
                  borderRadius: '12px',
                  fontSize: '14px',
                  color: COLORS.neutral.dark,
                  outline: 'none',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = COLORS.primary.orange;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${COLORS.primary.orange}20`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = COLORS.glass.whiteBorder;
                  e.currentTarget.style.boxShadow = 'none';
                }}
                data-testid="input-search-customers"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: '12px 20px',
                background: COLORS.glass.white,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: `1px solid ${COLORS.glass.whiteBorder}`,
                borderRadius: '12px',
                fontSize: '14px',
                color: COLORS.neutral.dark,
                fontWeight: 500,
                cursor: 'pointer',
                outline: 'none',
                minWidth: '150px',
                transition: 'all 0.3s ease'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = COLORS.primary.orange;
                e.currentTarget.style.boxShadow = `0 0 0 3px ${COLORS.primary.orange}20`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = COLORS.glass.whiteBorder;
                e.currentTarget.style.boxShadow = 'none';
              }}
              data-testid="select-status-filter"
            >
              <option value="all">Tutti gli stati</option>
              <option value="active">Attivi</option>
              <option value="lead">Lead</option>
              <option value="prospect">Prospect</option>
            </select>

            {/* Advanced Filters Button */}
            <button 
              style={{
                padding: '12px 20px',
                background: COLORS.glass.white,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: `1px solid ${COLORS.glass.whiteBorder}`,
                borderRadius: '12px',
                fontSize: '14px',
                color: COLORS.neutral.dark,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `linear-gradient(135deg, ${COLORS.primary.orange}10, ${COLORS.primary.orange}05)`;
                e.currentTarget.style.borderColor = `${COLORS.primary.orange}30`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = COLORS.glass.white;
                e.currentTarget.style.borderColor = COLORS.glass.whiteBorder;
              }}
              data-testid="button-advanced-filters"
            >
              <Filter size={18} strokeWidth={2} />
              Altri Filtri
            </button>
          </div>

          {/* Customer Table */}
          <div style={{ 
            overflowX: 'auto',
            borderRadius: '12px',
            border: `1px solid ${COLORS.glass.whiteBorder}`,
            background: COLORS.glass.whiteLight
          }}>
            <table style={{ 
              width: '100%',
              borderCollapse: 'collapse'
            }}>
              <thead>
                <tr style={{
                  background: `linear-gradient(135deg, ${COLORS.primary.orange}08, ${COLORS.primary.orange}04)`,
                  borderBottom: `1px solid ${COLORS.glass.whiteBorder}`
                }}>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: COLORS.neutral.dark,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Cliente</th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: COLORS.neutral.dark,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Azienda</th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: COLORS.neutral.dark,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Stato</th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: COLORS.neutral.dark,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Valore</th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: COLORS.neutral.dark,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Rating</th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: COLORS.neutral.dark,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Ultimo Contatto</th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: COLORS.neutral.dark,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Tags</th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: COLORS.neutral.dark,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr 
                    key={customer.id} 
                    style={{
                      borderBottom: `1px solid ${COLORS.glass.whiteBorder}`,
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `linear-gradient(135deg, ${COLORS.glass.white}, ${COLORS.glass.whiteMedium})`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                    data-testid={`row-customer-${customer.id}`}
                  >
                    <td style={{ padding: '20px 16px' }}>
                      <div>
                        <p style={{
                          fontSize: '15px',
                          fontWeight: 600,
                          color: COLORS.neutral.dark,
                          marginBottom: '4px'
                        }}>{customer.name}</p>
                        <p style={{
                          fontSize: '13px',
                          color: COLORS.neutral.medium
                        }}>{customer.email}</p>
                      </div>
                    </td>
                    <td style={{ padding: '20px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          background: `linear-gradient(135deg, ${COLORS.primary.orange}20, ${COLORS.primary.orange}10)`,
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Building2 size={18} style={{ color: COLORS.primary.orange }} strokeWidth={2} />
                        </div>
                        <span style={{
                          fontSize: '14px',
                          color: COLORS.neutral.dark,
                          fontWeight: 500
                        }}>{customer.company}</span>
                      </div>
                    </td>
                    <td style={{ padding: '20px 16px' }}>
                      {getStatusBadge(customer.status)}
                    </td>
                    <td style={{ padding: '20px 16px' }}>
                      <span style={{
                        fontSize: '18px',
                        fontWeight: 700,
                        color: COLORS.neutral.dark
                      }}>{customer.value}</span>
                    </td>
                    <td style={{ padding: '20px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={16}
                            style={{ 
                              color: i < customer.rating ? COLORS.primary.orange : COLORS.neutral.lighter,
                              fill: i < customer.rating ? COLORS.primary.orange : 'none'
                            }}
                            strokeWidth={2}
                          />
                        ))}
                        <span style={{
                          marginLeft: '8px',
                          fontSize: '13px',
                          color: COLORS.neutral.medium,
                          fontWeight: 600
                        }}>({customer.rating}/5)</span>
                      </div>
                    </td>
                    <td style={{ padding: '20px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={16} style={{ color: COLORS.neutral.medium }} strokeWidth={2} />
                        <span style={{
                          fontSize: '13px',
                          color: COLORS.neutral.medium,
                          fontWeight: 500
                        }}>{customer.lastContact}</span>
                      </div>
                    </td>
                    <td style={{ padding: '20px 16px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {customer.tags.map((tag) => (
                          <span 
                            key={tag} 
                            style={{
                              padding: '4px 10px',
                              background: `linear-gradient(135deg, ${COLORS.primary.purple}15, ${COLORS.primary.purple}10)`,
                              color: COLORS.primary.purple,
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              letterSpacing: '0.3px',
                              border: `1px solid ${COLORS.primary.purple}20`
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '20px 16px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          style={{
                            width: '36px',
                            height: '36px',
                            background: COLORS.glass.white,
                            backdropFilter: 'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                            border: `1px solid ${COLORS.glass.whiteBorder}`,
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = `linear-gradient(135deg, ${COLORS.semantic.success}20, ${COLORS.semantic.success}10)`;
                            e.currentTarget.style.borderColor = `${COLORS.semantic.success}30`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = COLORS.glass.white;
                            e.currentTarget.style.borderColor = COLORS.glass.whiteBorder;
                          }}
                          data-testid={`button-call-${customer.id}`}
                        >
                          <Phone size={16} style={{ color: COLORS.semantic.success }} strokeWidth={2} />
                        </button>
                        <button 
                          style={{
                            width: '36px',
                            height: '36px',
                            background: COLORS.glass.white,
                            backdropFilter: 'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                            border: `1px solid ${COLORS.glass.whiteBorder}`,
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = `linear-gradient(135deg, ${COLORS.semantic.info}20, ${COLORS.semantic.info}10)`;
                            e.currentTarget.style.borderColor = `${COLORS.semantic.info}30`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = COLORS.glass.white;
                            e.currentTarget.style.borderColor = COLORS.glass.whiteBorder;
                          }}
                          data-testid={`button-email-${customer.id}`}
                        >
                          <Mail size={16} style={{ color: COLORS.semantic.info }} strokeWidth={2} />
                        </button>
                        <button 
                          style={{
                            width: '36px',
                            height: '36px',
                            background: COLORS.glass.white,
                            backdropFilter: 'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                            border: `1px solid ${COLORS.glass.whiteBorder}`,
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = `linear-gradient(135deg, ${COLORS.primary.orange}20, ${COLORS.primary.orange}10)`;
                            e.currentTarget.style.borderColor = `${COLORS.primary.orange}30`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = COLORS.glass.white;
                            e.currentTarget.style.borderColor = COLORS.glass.whiteBorder;
                          }}
                          data-testid={`button-edit-${customer.id}`}
                        >
                          <Edit size={16} style={{ color: COLORS.primary.orange }} strokeWidth={2} />
                        </button>
                        <button 
                          style={{
                            width: '36px',
                            height: '36px',
                            background: COLORS.glass.white,
                            backdropFilter: 'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                            border: `1px solid ${COLORS.glass.whiteBorder}`,
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = COLORS.glass.whiteMedium;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = COLORS.glass.white;
                          }}
                          data-testid={`button-more-${customer.id}`}
                        >
                          <MoreVertical size={16} style={{ color: COLORS.neutral.medium }} strokeWidth={2} />
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