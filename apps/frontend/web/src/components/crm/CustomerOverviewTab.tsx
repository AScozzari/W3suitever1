import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Calendar,
  Clock,
  User,
  Target,
  ShoppingCart,
  DollarSign,
  Building2,
  UserCircle,
  Mail,
  Phone,
  MapPin,
  FileText,
  Briefcase
} from 'lucide-react';

interface CustomerOverviewTabProps {
  customer: any;
  leads: any[];
  deals: any[];
  orders: any[];
  interactions: any[];
  analytics: any;
}

export function CustomerOverviewTab({
  customer,
  leads,
  deals,
  orders,
  interactions,
  analytics
}: CustomerOverviewTabProps) {
  const calculateHealthScore = () => {
    let score = 0;
    
    if (analytics.daysSinceLastOrder !== null && analytics.daysSinceLastOrder < 30) score += 25;
    else if (analytics.daysSinceLastOrder !== null && analytics.daysSinceLastOrder < 90) score += 15;
    
    if (analytics.totalOrders > 5) score += 25;
    else if (analytics.totalOrders > 2) score += 15;
    
    if (analytics.totalRevenue > 1000) score += 25;
    else if (analytics.totalRevenue > 500) score += 15;
    
    if (analytics.totalInteractions > 10) score += 25;
    else if (analytics.totalInteractions > 5) score += 15;
    
    return Math.min(score, 100);
  };

  const healthScore = calculateHealthScore();
  const healthStatus = 
    healthScore >= 75 ? { label: 'Eccellente', color: 'hsl(142, 76%, 36%)' } :
    healthScore >= 50 ? { label: 'Buono', color: 'hsl(48, 96%, 53%)' } :
    healthScore >= 25 ? { label: 'A Rischio', color: 'hsl(25, 95%, 53%)' } :
    { label: 'Critico', color: 'hsl(0, 84%, 60%)' };

  const recentInteractions = interactions
    .slice(0, 5)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  const upcomingActions = [
    ...(analytics.daysSinceLastOrder && analytics.daysSinceLastOrder > 60 
      ? [{ type: 'follow-up', title: 'Follow-up commerciale', priority: 'high', dueDate: new Date() }] 
      : []),
    ...(deals.filter(d => d.status === 'negotiation').length > 0
      ? [{ type: 'negotiation', title: 'Chiudi trattativa in corso', priority: 'medium', dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }]
      : []),
    ...(analytics.totalOrders > 3 && analytics.daysSinceLastOrder && analytics.daysSinceLastOrder < 30
      ? [{ type: 'upsell', title: 'Proposta upsell', priority: 'low', dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) }]
      : [])
  ];

  const journeyStages = [
    { 
      name: 'Lead', 
      count: leads.length,
      icon: User,
      color: 'hsl(var(--brand-purple))',
      completed: leads.length > 0
    },
    { 
      name: 'Deal', 
      count: deals.length,
      icon: Target,
      color: 'hsl(var(--brand-orange))',
      completed: deals.length > 0
    },
    { 
      name: 'Cliente', 
      count: 1,
      icon: CheckCircle2,
      color: 'hsl(142, 76%, 36%)',
      completed: true
    },
    { 
      name: 'Ordini', 
      count: orders.length,
      icon: ShoppingCart,
      color: 'hsl(var(--brand-purple))',
      completed: orders.length > 0
    }
  ];

  const isB2B = customer.customerType === 'b2b';

  return (
    <div className="space-y-6">
      {/* Anagrafica Dettagliata */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          {isB2B ? (
            <Building2 className="h-5 w-5" style={{ color: 'hsl(var(--brand-orange))' }} />
          ) : (
            <UserCircle className="h-5 w-5" style={{ color: 'hsl(var(--brand-purple))' }} />
          )}
          {isB2B ? 'Dati Aziendali' : 'Dati Anagrafici'}
        </h3>
        
        <div className="grid grid-cols-2 gap-6">
          {isB2B ? (
            // B2B Fields
            <>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500">Ragione Sociale</label>
                  <p className="text-sm font-semibold mt-1">{customer.companyName || 'N/D'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Forma Giuridica</label>
                  <p className="text-sm mt-1">{customer.legalForm?.toUpperCase() || 'N/D'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Partita IVA</label>
                  <p className="text-sm font-mono mt-1">{customer.vatNumber || 'N/D'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Codice SDI</label>
                  <p className="text-sm font-mono mt-1">{customer.sdiCode || 'N/D'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Codice ATECO</label>
                  <p className="text-sm font-mono mt-1">{customer.atecoCode || 'N/D'}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500">Referente Principale</label>
                  <p className="text-sm font-semibold mt-1">{customer.primaryContactName || 'N/D'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Email PEC</label>
                  <p className="text-sm mt-1">{customer.pecEmail || 'N/D'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Email</label>
                  <p className="text-sm mt-1">{customer.email || 'N/D'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Telefono</label>
                  <p className="text-sm mt-1">{customer.phone || 'N/D'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Dimensione Aziendale</label>
                  <p className="text-sm mt-1 capitalize">{customer.companySize || 'N/D'}</p>
                </div>
              </div>
            </>
          ) : (
            // B2C Fields
            <>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500">Nome</label>
                  <p className="text-sm font-semibold mt-1">{customer.firstName || 'N/D'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Cognome</label>
                  <p className="text-sm font-semibold mt-1">{customer.lastName || 'N/D'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Codice Fiscale</label>
                  <p className="text-sm font-mono mt-1">{customer.fiscalCode || 'N/D'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Data di Nascita</label>
                  <p className="text-sm mt-1">
                    {customer.dateOfBirth 
                      ? new Date(customer.dateOfBirth).toLocaleDateString('it-IT')
                      : 'N/D'}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500">Genere</label>
                  <p className="text-sm mt-1 capitalize">{customer.gender || 'N/D'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Email</label>
                  <p className="text-sm mt-1">{customer.email || 'N/D'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Telefono</label>
                  <p className="text-sm mt-1">{customer.phone || 'N/D'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Indirizzo</label>
                  <p className="text-sm mt-1">{customer.address || 'N/D'}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" style={{ color: 'hsl(var(--brand-orange))' }} />
          Customer Journey
        </h3>
        <div className="flex items-center justify-between relative">
          {journeyStages.map((stage, index) => (
            <div key={stage.name} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 transition-all ${
                    stage.completed ? 'bg-opacity-100' : 'bg-opacity-20'
                  }`}
                  style={{ 
                    backgroundColor: stage.completed ? stage.color : '#e5e7eb',
                    border: `2px solid ${stage.color}`
                  }}
                >
                  <stage.icon 
                    className="h-8 w-8" 
                    style={{ color: stage.completed ? 'white' : stage.color }} 
                  />
                </div>
                <div className="text-sm font-medium" style={{ color: '#1a1a1a' }}>
                  {stage.name}
                </div>
                <Badge 
                  variant="outline" 
                  className="mt-1"
                  style={{ borderColor: stage.color, color: stage.color }}
                >
                  {stage.count}
                </Badge>
              </div>
              {index < journeyStages.length - 1 && (
                <ArrowRight 
                  className="h-6 w-6 mx-2" 
                  style={{ color: stage.completed ? stage.color : '#9ca3af' }}
                />
              )}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" style={{ color: healthStatus.color }} />
            Customer Health Score
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl font-bold" style={{ color: healthStatus.color }}>
                  {healthScore}%
                </span>
                <Badge 
                  variant="outline" 
                  style={{ borderColor: healthStatus.color, color: healthStatus.color }}
                >
                  {healthStatus.label}
                </Badge>
              </div>
              <Progress 
                value={healthScore} 
                className="h-3"
                style={{ 
                  backgroundColor: '#e5e7eb',
                }}
              />
            </div>
            <div className="space-y-2 text-sm" style={{ color: '#6b7280' }}>
              <div className="flex items-center justify-between">
                <span>Recency (ultimo ordine)</span>
                <span className="font-medium">
                  {analytics.daysSinceLastOrder !== null 
                    ? `${analytics.daysSinceLastOrder} giorni fa`
                    : 'N/D'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Frequency (ordini totali)</span>
                <span className="font-medium">{analytics.totalOrders}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Monetary (valore totale)</span>
                <span className="font-medium">€{analytics.totalRevenue.toLocaleString('it-IT')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Engagement (interazioni)</span>
                <span className="font-medium">{analytics.totalInteractions}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5" style={{ color: 'hsl(var(--brand-orange))' }} />
            Prossime Azioni
          </h3>
          {upcomingActions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessuna azione in programma</p>
          ) : (
            <div className="space-y-3">
              {upcomingActions.map((action, index) => {
                const priorityConfig = {
                  high: { color: 'hsl(0, 84%, 60%)', label: 'Alta' },
                  medium: { color: 'hsl(48, 96%, 53%)', label: 'Media' },
                  low: { color: 'hsl(220, 90%, 56%)', label: 'Bassa' }
                };
                const priority = priorityConfig[action.priority as keyof typeof priorityConfig];
                
                return (
                  <div 
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}
                  >
                    <AlertCircle className="h-5 w-5 mt-0.5" style={{ color: priority.color }} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm" style={{ color: '#1a1a1a' }}>
                          {action.title}
                        </span>
                        <Badge 
                          variant="outline" 
                          style={{ borderColor: priority.color, color: priority.color }}
                          className="text-xs"
                        >
                          {priority.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs" style={{ color: '#6b7280' }}>
                        <Calendar className="h-3 w-3" />
                        <span>Scadenza: {action.dueDate.toLocaleDateString('it-IT')}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5" style={{ color: 'hsl(var(--brand-purple))' }} />
          Timeline Ultimi 30 Giorni
        </h3>
        {recentInteractions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessuna attività recente</p>
        ) : (
          <div className="space-y-3">
            {recentInteractions.map((interaction, index) => {
              const channelIcons = {
                email: '📧',
                phone: '📞',
                meeting: '🤝',
                chat: '💬',
                social: '📱'
              };
              const icon = channelIcons[interaction.channel as keyof typeof channelIcons] || '📝';
              
              return (
                <div 
                  key={interaction.id}
                  className="flex items-start gap-4 pb-3 border-b last:border-b-0"
                  style={{ borderColor: '#e5e7eb' }}
                >
                  <div className="text-2xl">{icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm" style={{ color: '#1a1a1a' }}>
                        {interaction.type}
                      </span>
                      <span className="text-xs" style={{ color: '#6b7280' }}>
                        {new Date(interaction.occurredAt).toLocaleDateString('it-IT', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    {interaction.summary && (
                      <p className="text-xs" style={{ color: '#6b7280' }}>
                        {interaction.summary}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
