import React, { useState } from 'react';
import BrandLayout from '../components/BrandLayout';
import { useQuery } from '@tanstack/react-query';
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { 
  TrendingUp, Users, ShoppingBag, DollarSign, 
  Activity, Target, Zap, Award
} from 'lucide-react';

// Chart data
const revenueData = [
  { month: 'Gen', revenue: 45000, target: 42000 },
  { month: 'Feb', revenue: 52000, target: 48000 },
  { month: 'Mar', revenue: 48000, target: 50000 },
  { month: 'Apr', revenue: 61000, target: 55000 },
  { month: 'Mag', revenue: 59000, target: 58000 },
  { month: 'Giu', revenue: 67000, target: 62000 },
];

const performanceData = [
  { name: 'Milano', value: 35, color: '#FF6900' },
  { name: 'Roma', value: 28, color: '#ff8533' },
  { name: 'Napoli', value: 20, color: '#ffb366' },
  { name: 'Torino', value: 17, color: '#ffd299' },
];

const storeMetrics = [
  { day: 'Lun', sales: 120, visitors: 450 },
  { day: 'Mar', sales: 145, visitors: 520 },
  { day: 'Mer', sales: 135, visitors: 480 },
  { day: 'Gio', sales: 165, visitors: 590 },
  { day: 'Ven', sales: 185, visitors: 650 },
  { day: 'Sab', sales: 210, visitors: 720 },
  { day: 'Dom', sales: 175, visitors: 580 },
];

const categoryData = [
  { category: 'Mobile', sales: 4500 },
  { category: 'Fibra', sales: 3200 },
  { category: 'Accessori', sales: 2800 },
  { category: 'Servizi', sales: 2100 },
  { category: 'Business', sales: 1900 },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/brand-api/dashboard/stats'],
  });

  const metrics = [
    { 
      label: 'Revenue Totale', 
      value: '€187.5K',
      change: '+12.5%',
      icon: DollarSign,
      color: '#6b7280'  // Neutral gray for all icons
    },
    { 
      label: 'Store Attivi', 
      value: '156',
      change: '+8.2%',
      icon: ShoppingBag,
      color: '#6b7280'  // Neutral gray
    },
    { 
      label: 'Dipendenti', 
      value: '1,247',
      change: '+15.3%',
      icon: Users,
      color: '#6b7280'  // Neutral gray
    },
    { 
      label: 'Performance', 
      value: '92.5%',
      change: '+5.7%',
      icon: TrendingUp,
      color: '#6b7280'  // Neutral gray
    },
  ];

  if (isLoading) {
    return (
      <BrandLayout>
        <div style={{ padding: '32px' }}>
          <div style={{ color: '#6b7280', fontSize: '16px' }}>Caricamento dashboard...</div>
        </div>
      </BrandLayout>
    );
  }

  return (
    <BrandLayout>
      <div style={{ padding: '24px', minHeight: '100vh' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: 'bold', 
            color: '#1f2937',
            margin: 0
          }}>
            Dashboard Brand Interface
          </h1>
          <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>
            Monitoraggio performance network WindTre
          </p>
        </div>

        {/* Metrics Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '24px'
        }}>
          {metrics.map((metric, idx) => {
            const Icon = metric.icon;
            return (
              <div key={idx} style={{
                background: 'hsla(255, 255, 255, 0.08)',
                backdropFilter: 'blur(24px) saturate(140%)',
                WebkitBackdropFilter: 'blur(24px) saturate(140%)',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)',
                border: '1px solid hsla(255, 255, 255, 0.12)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '4px' }}>
                      {metric.label}
                    </p>
                    <h3 style={{ color: '#1f2937', fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0' }}>
                      {metric.value}
                    </h3>
                    <span style={{ color: '#10b981', fontSize: '12px', fontWeight: '500' }}>
                      {metric.change} vs ultimo mese
                    </span>
                  </div>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Icon size={20} color={metric.color} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div style={{
          background: 'hsla(255, 255, 255, 0.08)',
          backdropFilter: 'blur(24px) saturate(140%)',
          WebkitBackdropFilter: 'blur(24px) saturate(140%)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)',
          border: '1px solid hsla(255, 255, 255, 0.12)'
        }}>
          <div style={{
            display: 'flex',
            gap: '24px',
            borderBottom: '2px solid #e5e7eb',
            marginBottom: '24px'
          }}>
            {['overview', 'revenue', 'performance', 'analytics'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 0 12px 0',
                  background: 'none',
                  border: 'none',
                  color: activeTab === tab ? '#FF6900' : '#6b7280',
                  fontSize: '14px',
                  fontWeight: activeTab === tab ? '600' : '400',
                  borderBottom: activeTab === tab ? '2px solid #FF6900' : 'none',
                  marginBottom: '-2px',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.2s ease'
                }}
              >
                {tab === 'overview' ? 'Panoramica' :
                 tab === 'revenue' ? 'Ricavi' :
                 tab === 'performance' ? 'Performance' : 'Analytics'}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
              {/* Revenue Trend Chart */}
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
                  Trend Ricavi
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF6900" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#FF6900" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip />
                    <Area type="monotone" dataKey="revenue" stroke="#FF6900" fillOpacity={1} fill="url(#colorRevenue)" />
                    <Area type="monotone" dataKey="target" stroke="#9ca3af" fillOpacity={0.3} fill="#e5e7eb" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Store Performance Pie Chart */}
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
                  Performance Store
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={performanceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {performanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'revenue' && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
                Ricavi per Categoria
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="category" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="sales" fill="#FF6900" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {activeTab === 'performance' && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
                Metriche Store Settimanali
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={storeMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="sales" stroke="#FF6900" strokeWidth={2} dot={{ fill: '#FF6900' }} />
                  <Line type="monotone" dataKey="visitors" stroke="#ff8533" strokeWidth={2} dot={{ fill: '#ff8533' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
                <h4 style={{ color: '#1f2937', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
                  Top Performing Stores
                </h4>
                {['Milano Centro', 'Roma EUR', 'Napoli Vomero', 'Torino Centro'].map((store, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: idx < 3 ? '1px solid #e5e7eb' : 'none'
                  }}>
                    <span style={{ color: '#4b5563', fontSize: '13px' }}>{store}</span>
                    <span style={{ color: '#10b981', fontSize: '13px', fontWeight: '500' }}>
                      +{12 + idx * 3}%
                    </span>
                  </div>
                ))}
              </div>
              
              <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
                <h4 style={{ color: '#1f2937', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
                  Conversion Rate
                </h4>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#FF6900', marginBottom: '8px' }}>
                  24.8%
                </div>
                <p style={{ color: '#6b7280', fontSize: '12px' }}>
                  +3.2% rispetto al mese scorso
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
            Attività Recenti
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { text: 'Nuovo store Wind3 Milano aperto', time: '2 minuti fa', icon: ShoppingBag, color: '#10b981' },
              { text: 'Report vendite Q4 generato', time: '15 minuti fa', icon: Activity, color: '#FF6900' },
              { text: 'Training completato - 12 dipendenti', time: '1 ora fa', icon: Award, color: '#3b82f6' },
              { text: 'Target mensile raggiunto', time: '2 ore fa', icon: Target, color: '#10b981' },
            ].map((activity, idx) => {
              const Icon = activity.icon;
              return (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: '#f9fafb',
                  borderRadius: '8px'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    background: `${activity.color}15`,
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Icon size={16} color={activity.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: '#1f2937', margin: 0, fontSize: '14px' }}>{activity.text}</p>
                    <p style={{ color: '#9ca3af', fontSize: '12px', margin: 0 }}>{activity.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </BrandLayout>
  );
}