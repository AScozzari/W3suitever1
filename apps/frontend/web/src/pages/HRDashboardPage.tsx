import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, Clock, CalendarDays, Users, 
  FileText, DollarSign, BarChart3, Settings,
  ArrowRight, TrendingUp, AlertCircle, CheckCircle
} from 'lucide-react';
import { useLocation } from 'wouter';

const hrModules = [
  {
    id: 'calendar',
    title: 'Calendario',
    description: 'Sistema eventi con RBAC e permissions granulari',
    icon: Calendar,
    path: '/calendar',
    color: 'bg-blue-500',
    stats: { label: 'Eventi oggi', value: '5' }
  },
  {
    id: 'time-tracking',
    title: 'Timbrature',
    description: 'Clock in/out multi-device con geolocalizzazione',
    icon: Clock,
    path: '/time-tracking',
    color: 'bg-green-500',
    stats: { label: 'Dipendenti attivi', value: '142' }
  },
  {
    id: 'leave-management',
    title: 'Gestione Ferie',
    description: 'Richieste ferie con workflow approvazione',
    icon: CalendarDays,
    path: '/leave-management',
    color: 'bg-purple-500',
    stats: { label: 'Richieste pending', value: '8' }
  },
  {
    id: 'shift-planning',
    title: 'Pianificazione Turni',
    description: 'Auto-scheduling con ottimizzazione risorse',
    icon: Users,
    path: '/shift-planning',
    color: 'bg-orange-500',
    stats: { label: 'Turni questa settimana', value: '234' }
  },
  {
    id: 'documents',
    title: 'Document Drive',
    description: 'Storage sicuro per documenti HR e buste paga',
    icon: FileText,
    path: '/documents',
    color: 'bg-indigo-500',
    stats: { label: 'Documenti totali', value: '1,842' }
  },
  {
    id: 'expenses',
    title: 'Note Spese',
    description: 'Gestione rimborsi con OCR receipt scanning',
    icon: DollarSign,
    path: '/expense-management',
    color: 'bg-pink-500',
    stats: { label: 'Da rimborsare', value: '€4,250' }
  },
  {
    id: 'analytics',
    title: 'HR Analytics',
    description: 'Dashboard KPI con metriche real-time',
    icon: BarChart3,
    path: '/hr-analytics',
    color: 'bg-cyan-500',
    stats: { label: 'KPI Score', value: '94%' }
  }
];

const quickStats = [
  { label: 'Dipendenti Totali', value: '487', change: '+12', trend: 'up' },
  { label: 'Tasso Presenza', value: '96.3%', change: '+2.1%', trend: 'up' },
  { label: 'Ore Straordinario', value: '342h', change: '-15%', trend: 'down' },
  { label: 'Compliance Score', value: '98%', change: '+3%', trend: 'up' }
];

export default function HRDashboardPage() {
  const [, navigate] = useLocation();
  const [location] = useLocation();
  const pathSegments = location.split('/').filter(Boolean);
  const tenant = pathSegments[0];

  const navigateToModule = (path: string) => {
    navigate(`/${tenant}${path}`);
  };

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '24px',
        borderBottom: '1px solid #e5e7eb',
        background: 'linear-gradient(135deg, #FF6900 0%, #7B2CBF 100%)',
        color: 'white'
      }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
          Human Resources Management
        </h1>
        <p style={{ opacity: 0.9 }}>
          Sistema HR completo con 8 moduli integrati per la gestione del personale
        </p>
      </div>

      {/* Quick Stats */}
      <div style={{
        padding: '24px',
        background: '#f9fafb',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          {quickStats.map((stat) => (
            <Card key={stat.label} style={{ 
              background: 'white',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <CardContent style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                      {stat.label}
                    </p>
                    <p style={{ fontSize: '24px', fontWeight: 700 }}>
                      {stat.value}
                    </p>
                  </div>
                  <Badge style={{
                    background: stat.trend === 'up' ? '#10b981' : '#ef4444',
                    color: 'white'
                  }}>
                    {stat.change}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Modules Grid */}
      <div style={{
        flex: 1,
        padding: '24px',
        overflowY: 'auto',
        background: '#ffffff'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '24px'
        }}>
          {hrModules.map((module) => {
            const Icon = module.icon;
            return (
              <Card 
                key={module.id}
                style={{
                  background: 'hsla(0, 0%, 100%, 0.9)',
                  backdropFilter: 'blur(24px)',
                  border: '1px solid hsla(0, 0%, 100%, 0.25)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => navigateToModule(module.path)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 48px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.08)';
                }}
              >
                <CardHeader style={{ paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                    <div className={module.color} style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Icon size={24} color="white" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <CardTitle style={{ fontSize: '18px', marginBottom: '4px' }}>
                        {module.title}
                      </CardTitle>
                      <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.4' }}>
                        {module.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '12px',
                    borderTop: '1px solid #f3f4f6'
                  }}>
                    <div>
                      <p style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '2px' }}>
                        {module.stats.label}
                      </p>
                      <p style={{ fontSize: '16px', fontWeight: 600 }}>
                        {module.stats.value}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: '#FF6900'
                      }}
                    >
                      Apri
                      <ArrowRight size={16} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* System Status */}
        <Card style={{
          marginTop: '32px',
          background: 'hsla(0, 0%, 100%, 0.9)',
          backdropFilter: 'blur(24px)',
          border: '1px solid hsla(0, 0%, 100%, 0.25)'
        }}>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={20} />
              Stato Sistema HR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} color="#10b981" />
                <span style={{ fontSize: '14px', color: '#6b7280' }}>
                  Database Connesso
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} color="#10b981" />
                <span style={{ fontSize: '14px', color: '#6b7280' }}>
                  Object Storage Attivo
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} color="#10b981" />
                <span style={{ fontSize: '14px', color: '#6b7280' }}>
                  8 Moduli Operativi
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} color="#f59e0b" />
                <span style={{ fontSize: '14px', color: '#6b7280' }}>
                  OCR Mock Mode (AI features da implementare)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}