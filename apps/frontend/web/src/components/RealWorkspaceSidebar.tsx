import { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckSquare, 
  Calendar, 
  MessageCircle, 
  Clock, 
  Bell, 
  AlertCircle, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  TrendingUp, 
  Zap, 
  Star, 
  CalendarIcon, 
  CalendarDays, 
  Eye, 
  Edit3, 
  MoreHorizontal, 
  Trash2,
  Circle,
  CheckCircle
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { format, isWithinInterval, addDays } from 'date-fns';
import { it } from 'date-fns/locale';

interface WorkspaceSidebarProps {
  onCollapseChange?: (isCollapsed: boolean) => void;
}

interface Task {
  id: number;
  titolo: string;
  descrizione: string;
  priorita: 'Alta' | 'Media' | 'Bassa';
  scadenza: string;
  completato: boolean;
  urgente: boolean;
  categoria: string;
}

interface Lead {
  id: number;
  tipo: string;
  messaggio: string;
  cliente: string;
  azienda: string;
  fonte: string;
  priorita: 'Alta' | 'Media' | 'Bassa';
  tempo: string;
  letto: boolean;
  potenziale: string;
  telefono: string;
}

interface EventoCalendario {
  id: number;
  titolo: string;
  ora: string;
  dataCompleta: Date;
  tipo: string;
  partecipanti: number;
  location: string;
  colore: string;
  descrizione: string;
}

export const RealWorkspaceSidebar = ({ onCollapseChange }: WorkspaceSidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [activeTab, setActiveTab] = useState('tasks');
  const [autoCollapseTimeout, setAutoCollapseTimeout] = useState<NodeJS.Timeout | null>(null);
  const [eventDaysFilter, setEventDaysFilter] = useState(7);

  // Stati per i dati
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 1,
      titolo: 'Follow-up cliente Premium',
      descrizione: 'Chiamare Mario Rossi per rinnovo contratto Enterprise',
      priorita: 'Alta',
      scadenza: 'Oggi 15:00',
      completato: false,
      urgente: true,
      categoria: 'vendite'
    },
    {
      id: 2,
      titolo: 'Preparare documentazione',
      descrizione: 'Contratto fibra ottica per Laura Bianchi',
      priorita: 'Media',
      scadenza: 'Domani 10:00',
      completato: false,
      urgente: false,
      categoria: 'documentazione'
    },
    {
      id: 3,
      titolo: 'Verifica pagamento',
      descrizione: 'Controllo fattura cliente Giuseppe Verde - €2.300',
      priorita: 'Bassa',
      scadenza: 'Venerdì 16:00',
      completato: true,
      urgente: false,
      categoria: 'amministrativo'
    },
    {
      id: 4,
      titolo: 'Attivazione servizi',
      descrizione: 'Nuovo contratto mobile 5G + fibra 1GB/s',
      priorita: 'Alta',
      scadenza: 'Oggi 17:30',
      completato: false,
      urgente: true,
      categoria: 'tecnico'
    },
    {
      id: 5,
      titolo: 'Demo prodotto WindTre Business',
      descrizione: 'Presentazione soluzioni per PMI - Azienda Tecno Solutions',
      priorita: 'Alta',
      scadenza: 'Lunedì 09:30',
      completato: false,
      urgente: false,
      categoria: 'vendite'
    }
  ]);

  const [leads, setLeads] = useState<Lead[]>([
    {
      id: 1,
      tipo: 'nuovo_lead',
      messaggio: 'Lead interessato a Piano Business Pro',
      cliente: 'Alessandro Martini',
      azienda: 'Digital Marketing SRL',
      fonte: 'LinkedIn Ads',
      priorita: 'Alta',
      tempo: '2 min fa',
      letto: false,
      potenziale: '€15.000/anno',
      telefono: '+39 349 123 4567'
    },
    {
      id: 2,
      tipo: 'lead_qualificato',
      messaggio: 'Lead qualificato pronto per chiamata',
      cliente: 'Francesca Lombardi',
      azienda: 'Consulting Express',
      fonte: 'Campagna Email',
      priorita: 'Alta',
      tempo: '8 min fa',
      letto: false,
      potenziale: '€25.000/anno',
      telefono: '+39 335 987 6543'
    },
    {
      id: 3,
      tipo: 'appuntamento_fissato',
      messaggio: 'Demo confermata per martedì',
      cliente: 'Roberto Conti',
      azienda: 'Startup Innovation Hub',
      fonte: 'Chiamata diretta',
      priorita: 'Media',
      tempo: '45 min fa',
      letto: true,
      potenziale: '€8.500/anno',
      telefono: '+39 347 456 7890'
    },
    {
      id: 4,
      tipo: 'contratto_in_chiusura',
      messaggio: 'Contratto in fase di finalizzazione',
      cliente: 'Maria Ferretti',
      azienda: 'E-commerce Plus',
      fonte: 'Referral Partner',
      priorita: 'Alta',
      tempo: '1 ora fa',
      letto: false,
      potenziale: '€32.000/anno',
      telefono: '+39 366 234 5678'
    }
  ]);

  const [eventiCalendario, setEventiCalendario] = useState<EventoCalendario[]>(() => {
    const oggi = new Date();
    return [
      {
        id: 1,
        titolo: 'Riunione Team Vendite Q1',
        ora: '14:30',
        dataCompleta: new Date(oggi.getTime() + 1 * 24 * 60 * 60 * 1000),
        tipo: 'meeting',
        partecipanti: 8,
        location: 'Sala Conferenze A',
        colore: 'blue',
        descrizione: 'Revisione obiettivi Q1 e pianificazione strategie commerciali'
      },
      {
        id: 2,
        titolo: 'Demo Enterprise Fortune 500',
        ora: '11:30',
        dataCompleta: new Date(oggi.getTime() + 2 * 24 * 60 * 60 * 1000),
        tipo: 'client',
        partecipanti: 5,
        location: 'Ufficio Direzione',
        colore: 'orange',
        descrizione: 'Presentazione soluzioni enterprise per cliente multinazionale'
      },
      {
        id: 3,
        titolo: 'Training Nuovo Personale',
        ora: '09:00',
        dataCompleta: new Date(oggi.getTime() + 3 * 24 * 60 * 60 * 1000),
        tipo: 'training',
        partecipanti: 6,
        location: 'Aula Formazione B',
        colore: 'green',
        descrizione: 'Formazione su prodotti WindTre Business'
      },
      {
        id: 4,
        titolo: 'Call Cliente Premium',
        ora: '10:00',
        dataCompleta: new Date(oggi.getTime() + 4 * 24 * 60 * 60 * 1000),
        tipo: 'client',
        partecipanti: 3,
        location: 'Online - Teams',
        colore: 'blue',
        descrizione: 'Follow-up contratto renewal'
      }
    ];
  });

  // Simula notifiche in tempo reale per i leads
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() < 0.2) { // 20% di probabilità ogni 15 secondi
        const newLead: Lead = {
          id: Date.now(),
          tipo: ['nuovo_lead', 'lead_qualificato', 'follow_up_richiesto'][Math.floor(Math.random() * 3)],
          messaggio: [
            'Nuovo lead interessato a soluzioni Enterprise',
            'Lead qualificato da campagna Google Ads',
            'Richiesta demo per soluzioni Cloud'
          ][Math.floor(Math.random() * 3)],
          cliente: ['Andrea Rossi', 'Giulia Verdi', 'Marco Neri', 'Elena Blu'][Math.floor(Math.random() * 4)],
          azienda: ['Tech Solutions SRL', 'Digital Hub', 'Innovation Co.', 'Future Corp'][Math.floor(Math.random() * 4)],
          fonte: ['Website', 'LinkedIn', 'Google Ads', 'Referral'][Math.floor(Math.random() * 4)],
          priorita: ['Alta', 'Media'][Math.floor(Math.random() * 2)] as any,
          tempo: 'Ora',
          letto: false,
          potenziale: `€${(Math.random() * 30000 + 5000).toFixed(0)}/anno`,
          telefono: `+39 3${Math.floor(Math.random() * 90000000 + 10000000)}`
        };

        setLeads(prev => [newLead, ...prev.slice(0, 6)]);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const toggleTask = (taskId: number) => {
    setTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, completato: !task.completato } : task
    ));
  };

  const markLeadAsRead = (leadId: number) => {
    setLeads(prev => prev.map(lead =>
      lead.id === leadId ? { ...lead, letto: true } : lead
    ));
  };

  const toggleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onCollapseChange?.(newCollapsed);
  };

  const handleMouseEnter = () => {
    if (isCollapsed) {
      setIsCollapsed(false);
      onCollapseChange?.(false);
    }
    if (autoCollapseTimeout) {
      clearTimeout(autoCollapseTimeout);
      setAutoCollapseTimeout(null);
    }
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setIsCollapsed(true);
      onCollapseChange?.(true);
    }, 3000);
    setAutoCollapseTimeout(timeout);
  };

  const getPriorityColor = (priorita: string) => {
    switch (priorita) {
      case 'Alta': return 'red';
      case 'Media': return 'yellow';
      case 'Bassa': return 'green';
      default: return 'gray';
    }
  };

  const getEventColor = (tipo: string) => {
    switch (tipo) {
      case 'meeting': return 'blue';
      case 'client': return 'orange';
      case 'training': return 'green';
      case 'presentation': return 'purple';
      default: return 'gray';
    }
  };

  const eventiDelPeriodo = eventiCalendario.filter(evento => {
    const oggi = new Date();
    const limitData = new Date(oggi.getTime() + eventDaysFilter * 24 * 60 * 60 * 1000);
    return evento.dataCompleta >= oggi && evento.dataCompleta <= limitData;
  });

  // Contatori per i badge
  const tasksUrgenti = tasks.filter(t => !t.completato && t.urgente).length;
  const leadsNonLetti = leads.filter(l => !l.letto).length;
  const eventiOggi = eventiCalendario.filter(e => {
    const oggi = new Date();
    return format(e.dataCompleta, 'yyyy-MM-dd') === format(oggi, 'yyyy-MM-dd');
  }).length;

  return (
    <div 
      style={{
        position: 'fixed',
        right: 0,
        top: '64px',
        height: 'calc(100vh - 64px)',
        width: isCollapsed ? '64px' : '420px',
        background: 'hsla(255, 255, 255, 0.10)',
        backdropFilter: 'blur(28px) saturate(140%)',
        WebkitBackdropFilter: 'blur(28px) saturate(140%)',
        borderLeft: '1px solid hsla(255, 255, 255, 0.25)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 40,
        overflowY: 'auto',
        boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.06)',
        display: 'flex',
        flexDirection: 'column'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header con Toggle */}
      <div style={{
        padding: '20px 16px',
        borderBottom: '1px solid hsla(255, 255, 255, 0.15)',
        background: 'hsla(255, 255, 255, 0.05)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Button
            onClick={toggleCollapse}
            style={{
              background: 'hsla(255, 255, 255, 0.15)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid hsla(255, 255, 255, 0.25)',
              borderRadius: '12px',
              color: '#6b7280',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
          >
            {isCollapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </Button>
          
          {!isCollapsed && (
            <h3 style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#1f2937',
              margin: 0,
              background: 'linear-gradient(135deg, #FF6900, #7B2CBF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Workspace
            </h3>
          )}
        </div>
      </div>

      {!isCollapsed ? (
        // Contenuto espanso con tabs
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 16px' }}
          >
            <TabsList style={{
              background: 'hsla(255, 255, 255, 0.15)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid hsla(255, 255, 255, 0.25)',
              borderRadius: '16px',
              padding: '4px',
              margin: '16px 0',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '4px'
            }}>
              <TabsTrigger 
                value="tasks" 
                style={{
                  position: 'relative',
                  fontSize: '12px',
                  fontWeight: 500,
                  padding: '8px 12px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <CheckSquare size={14} />
                Tasks
                {tasksUrgenti > 0 && (
                  <Badge 
                    style={{
                      background: '#ef4444',
                      color: 'white',
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '8px',
                      minWidth: '16px',
                      height: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {tasksUrgenti}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="leads" 
                style={{
                  position: 'relative',
                  fontSize: '12px',
                  fontWeight: 500,
                  padding: '8px 12px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <TrendingUp size={14} />
                Leads
                {leadsNonLetti > 0 && (
                  <Badge 
                    style={{
                      background: '#f59e0b',
                      color: 'white',
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '8px',
                      minWidth: '16px',
                      height: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {leadsNonLetti}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="calendar" 
                style={{
                  position: 'relative',
                  fontSize: '12px',
                  fontWeight: 500,
                  padding: '8px 12px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Calendar size={14} />
                Eventi
                {eventiOggi > 0 && (
                  <Badge 
                    style={{
                      background: '#10b981',
                      color: 'white',
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '8px',
                      minWidth: '16px',
                      height: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {eventiOggi}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Tab Content */}
            <TabsContent value="tasks" style={{ flex: 1 }}>
              <ScrollArea style={{ height: 'calc(100vh - 240px)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '20px' }}>
                  {tasks.map((task) => (
                    <Card 
                      key={task.id} 
                      style={{
                        background: task.completato 
                          ? 'hsla(142, 76%, 36%, 0.08)'
                          : 'hsla(255, 255, 255, 0.20)',
                        backdropFilter: 'blur(16px) saturate(120%)',
                        WebkitBackdropFilter: 'blur(16px) saturate(120%)',
                        border: `1px solid ${task.urgente ? 'hsla(239, 68%, 68%, 0.4)' : 'hsla(255, 255, 255, 0.25)'}`,
                        borderRadius: '16px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <CardContent style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <Button
                            onClick={() => toggleTask(task.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              padding: '4px',
                              cursor: 'pointer',
                              color: task.completato ? '#10b981' : '#6b7280',
                              minWidth: '24px',
                              height: '24px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {task.completato ? <CheckCircle size={20} /> : <Circle size={20} />}
                          </Button>
                          
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <h4 style={{
                                fontSize: '14px',
                                fontWeight: 600,
                                color: task.completato ? '#6b7280' : '#1f2937',
                                textDecoration: task.completato ? 'line-through' : 'none',
                                margin: 0
                              }}>
                                {task.titolo}
                              </h4>
                              <Badge 
                                style={{
                                  background: `var(--${getPriorityColor(task.priorita)}-100)`,
                                  color: `var(--${getPriorityColor(task.priorita)}-700)`,
                                  fontSize: '10px',
                                  padding: '2px 8px',
                                  borderRadius: '8px',
                                  fontWeight: 500
                                }}
                              >
                                {task.priorita}
                              </Badge>
                            </div>
                            
                            <p style={{
                              fontSize: '12px',
                              color: '#6b7280',
                              margin: '0 0 8px 0',
                              lineHeight: '1.4'
                            }}>
                              {task.descrizione}
                            </p>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={12} style={{ color: '#6b7280' }} />
                                <span style={{ fontSize: '11px', color: '#6b7280' }}>{task.scadenza}</span>
                              </div>
                              <Badge 
                                style={{
                                  background: 'hsla(255, 255, 255, 0.15)',
                                  color: '#6b7280',
                                  fontSize: '9px',
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                  fontWeight: 400,
                                  textTransform: 'capitalize'
                                }}
                              >
                                {task.categoria}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="leads" style={{ flex: 1 }}>
              <ScrollArea style={{ height: 'calc(100vh - 240px)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '20px' }}>
                  {leads.map((lead) => (
                    <Card 
                      key={lead.id}
                      onClick={() => markLeadAsRead(lead.id)}
                      style={{
                        background: lead.letto 
                          ? 'hsla(255, 255, 255, 0.15)'
                          : 'hsla(255, 255, 255, 0.25)',
                        backdropFilter: 'blur(16px) saturate(120%)',
                        WebkitBackdropFilter: 'blur(16px) saturate(120%)',
                        border: `1px solid ${!lead.letto ? 'hsla(25, 100%, 50%, 0.4)' : 'hsla(255, 255, 255, 0.25)'}`,
                        borderRadius: '16px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <CardContent style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #FF6900, #7B2CBF)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '16px',
                            fontWeight: 600,
                            flexShrink: 0
                          }}>
                            {lead.cliente.split(' ').map(n => n[0]).join('')}
                          </div>
                          
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <h4 style={{
                                fontSize: '14px',
                                fontWeight: 600,
                                color: '#1f2937',
                                margin: 0
                              }}>
                                {lead.cliente}
                              </h4>
                              {!lead.letto && (
                                <div style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  background: '#f59e0b'
                                }} />
                              )}
                            </div>
                            
                            <p style={{
                              fontSize: '12px',
                              color: '#6b7280',
                              margin: '0 0 8px 0',
                              fontWeight: 500
                            }}>
                              {lead.azienda}
                            </p>
                            
                            <p style={{
                              fontSize: '12px',
                              color: '#374151',
                              margin: '0 0 8px 0',
                              lineHeight: '1.4'
                            }}>
                              {lead.messaggio}
                            </p>
                            
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <Badge 
                                style={{
                                  background: `var(--${getPriorityColor(lead.priorita)}-100)`,
                                  color: `var(--${getPriorityColor(lead.priorita)}-700)`,
                                  fontSize: '10px',
                                  padding: '2px 8px',
                                  borderRadius: '8px',
                                  fontWeight: 500
                                }}
                              >
                                {lead.priorita}
                              </Badge>
                              <span style={{ fontSize: '11px', color: '#6b7280' }}>{lead.tempo}</span>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <TrendingUp size={12} style={{ color: '#10b981' }} />
                                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 500 }}>{lead.potenziale}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Phone size={12} style={{ color: '#6b7280' }} />
                                <span style={{ fontSize: '10px', color: '#6b7280' }}>{lead.telefono}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="calendar" style={{ flex: 1 }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '16px'
                }}>
                  <Button
                    onClick={() => setEventDaysFilter(7)}
                    style={{
                      background: eventDaysFilter === 7 ? 'linear-gradient(135deg, #FF6900, #7B2CBF)' : 'hsla(255, 255, 255, 0.15)',
                      color: eventDaysFilter === 7 ? 'white' : '#6b7280',
                      border: '1px solid hsla(255, 255, 255, 0.25)',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 500,
                      padding: '8px 12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    7 giorni
                  </Button>
                  <Button
                    onClick={() => setEventDaysFilter(15)}
                    style={{
                      background: eventDaysFilter === 15 ? 'linear-gradient(135deg, #FF6900, #7B2CBF)' : 'hsla(255, 255, 255, 0.15)',
                      color: eventDaysFilter === 15 ? 'white' : '#6b7280',
                      border: '1px solid hsla(255, 255, 255, 0.25)',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 500,
                      padding: '8px 12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    15 giorni
                  </Button>
                </div>
              </div>
              
              <ScrollArea style={{ height: 'calc(100vh - 300px)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '20px' }}>
                  {eventiDelPeriodo.map((evento) => (
                    <Card 
                      key={evento.id}
                      style={{
                        background: 'hsla(255, 255, 255, 0.20)',
                        backdropFilter: 'blur(16px) saturate(120%)',
                        WebkitBackdropFilter: 'blur(16px) saturate(120%)',
                        border: '1px solid hsla(255, 255, 255, 0.25)',
                        borderRadius: '16px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <CardContent style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            background: `var(--${getEventColor(evento.tipo)}-100)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <CalendarDays size={20} style={{ color: `var(--${getEventColor(evento.tipo)}-600)` }} />
                          </div>
                          
                          <div style={{ flex: 1 }}>
                            <h4 style={{
                              fontSize: '14px',
                              fontWeight: 600,
                              color: '#1f2937',
                              margin: '0 0 4px 0'
                            }}>
                              {evento.titolo}
                            </h4>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={12} style={{ color: '#6b7280' }} />
                                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                  {format(evento.dataCompleta, 'dd MMM', { locale: it })} - {evento.ora}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <User size={12} style={{ color: '#6b7280' }} />
                                <span style={{ fontSize: '12px', color: '#6b7280' }}>{evento.partecipanti}</span>
                              </div>
                            </div>
                            
                            <p style={{
                              fontSize: '11px',
                              color: '#6b7280',
                              margin: '0 0 8px 0',
                              lineHeight: '1.4'
                            }}>
                              {evento.descrizione}
                            </p>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={12} style={{ color: '#6b7280' }} />
                              <span style={{ fontSize: '11px', color: '#6b7280' }}>{evento.location}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        // Vista collassata con icone
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          gap: '20px',
          padding: '20px 0'
        }}>
          <div style={{ position: 'relative' }}>
            <CheckSquare size={24} style={{ color: '#6b7280' }} />
            {tasksUrgenti > 0 && (
              <Badge 
                style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  background: '#ef4444',
                  color: 'white',
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '8px',
                  minWidth: '16px',
                  height: '16px'
                }}
              >
                {tasksUrgenti}
              </Badge>
            )}
          </div>
          
          <div style={{ position: 'relative' }}>
            <TrendingUp size={24} style={{ color: '#6b7280' }} />
            {leadsNonLetti > 0 && (
              <Badge 
                style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  background: '#f59e0b',
                  color: 'white',
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '8px',
                  minWidth: '16px',
                  height: '16px'
                }}
              >
                {leadsNonLetti}
              </Badge>
            )}
          </div>
          
          <div style={{ position: 'relative' }}>
            <Calendar size={24} style={{ color: '#6b7280' }} />
            {eventiOggi > 0 && (
              <Badge 
                style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  background: '#10b981',
                  color: 'white',
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '8px',
                  minWidth: '16px',
                  height: '16px'
                }}
              >
                {eventiOggi}
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
};