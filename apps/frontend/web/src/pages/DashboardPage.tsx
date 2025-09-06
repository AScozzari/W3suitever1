import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { oauth2Client } from '../services/OAuth2Client';
import {
  BarChart3, Users, ShoppingBag, TrendingUp, DollarSign, 
  Target, Zap, Shield, Calendar, Clock,
  Activity, FileText, MessageCircle, AlertTriangle,
  Plus, Filter, Download, Phone, Wifi, Smartphone, 
  Eye, CheckCircle, UserPlus, FileCheck, MoreHorizontal,
  ArrowUpRight, ArrowDownRight, ChevronDown, BarChart,
  Folder, UserX, Star, Home, Building, Briefcase, Wrench
} from 'lucide-react';

export default function DashboardPage() {
  const [currentModule, setCurrentModule] = useState('dashboard');
  const [isMobile, setIsMobile] = useState(false);
  const { data: dashboardStats } = useQuery({ queryKey: ["/api/dashboard/stats"] });

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Azioni Rapide come da screenshot originale
  const azioniRapide = [
    {
      id: 'ricerca',
      title: 'Ricerca Cliente',
      subtitle: 'Trova per telefono o codice fiscale',
      color: '#FF6900',
      textColor: 'white',
      action: 'Cerca'
    },
    {
      id: 'contratto',
      title: 'Nuovo Contratto',
      subtitle: 'Attiva nuova linea o servizio',
      color: '#7B2CBF',
      textColor: 'white', 
      action: 'Attiva'
    },
    {
      id: 'fatture',
      title: 'Gestione Fatture',
      subtitle: 'Visualizza e gestisci fatturazione',
      color: '#E5E7EB',
      textColor: '#374151',
      action: 'Apri'
    },
    {
      id: 'ticket',
      title: 'Support Ticket',
      subtitle: 'Crea nuovo ticket di assistenza',
      color: '#E5E7EB',
      textColor: '#374151',
      action: 'Crea'
    }
  ];

  // Statistiche come da screenshot originale
  const statistiche = [
    {
      title: 'Clienti Attivi',
      value: '12,483',
      subtitle: 'Utenti registrati',
      trend: '+12.5%',
      trendUp: true,
      icon: Users,
      color: '#FF6900'
    },
    {
      title: 'Linee Mobile',
      value: '8,927',
      subtitle: 'Contratti attivi',
      trend: '+8.2%',
      trendUp: true,
      icon: Smartphone,
      color: '#7B2CBF'
    },
    {
      title: 'Connessioni Fibra',
      value: '3,556',
      subtitle: 'Installazioni attive',
      trend: '+2.1%',
      trendUp: true,
      icon: Wifi,
      color: '#10B981'
    },
    {
      title: 'Servizi Energia',
      value: '1,284',
      subtitle: 'Forniture attive',
      trend: '+24.3%',
      trendUp: true,
      icon: Zap,
      color: '#F59E0B'
    }
  ];

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      {/* Header principale con gradient come negli screenshots originali */}
      <div style={{
        background: 'linear-gradient(135deg, #FF6900 0%, #7B2CBF 100%)',
        borderRadius: '24px',
        padding: isMobile ? '24px' : '32px',
        marginBottom: '24px',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background decorativo */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-20%',
          width: '200px',
          height: '200px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          filter: 'blur(40px)'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-30%',
          left: '-10%',
          width: '150px',
          height: '150px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '50%',
          filter: 'blur(30px)'
        }} />

        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '16px' : '0'
          }}>
            <div>
              <h1 style={{
                fontSize: isMobile ? '24px' : '32px',
                fontWeight: 'bold',
                margin: '0 0 8px 0',
                lineHeight: 1.2
              }}>Dashboard Enterprise</h1>
              <p style={{
                fontSize: isMobile ? '14px' : '16px',
                opacity: 0.9,
                margin: 0,
                lineHeight: 1.4
              }}>Gestisci tutti i tuoi servizi WindTre da un'unica piattaforma</p>
              
              {/* Tags come negli screenshots originali */}
              <div style={{
                display: 'flex',
                gap: '12px',
                marginTop: '16px',
                flexWrap: 'wrap'
              }}>
                <span style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 500
                }}>Tenant: Corporate</span>
                <span style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 500
                }}>Ultimo accesso: Oggi</span>
              </div>
            </div>

            {/* Bottoni Report e Nuovo Cliente */}
            <div style={{
              display: 'flex',
              gap: '12px',
              flexDirection: isMobile ? 'column' : 'row',
              width: isMobile ? '100%' : 'auto'
            }}>
              <button style={{
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '12px',
                padding: '12px 20px',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                minWidth: isMobile ? '100%' : 'auto'
              }}>
                <Download size={16} />
                Report
              </button>
              <button style={{
                background: 'rgba(255, 255, 255, 0.95)',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 20px',
                color: '#FF6900',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                minWidth: isMobile ? '100%' : 'auto'
              }}>
                <Plus size={16} />
                Nuovo Cliente
              </button>
              {/* DEBUG: Token expiry test button */}
              <button 
                onClick={async () => {
                  await oauth2Client.forceExpireToken();
                  console.log('Token forced to expire - next API call will trigger refresh');
                  alert('Token expires in pochi secondi - controlla la console per i log!');
                }}
                style={{
                  background: 'rgba(255, 0, 0, 0.7)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 20px',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}>
                🔥 DEBUG: Expire Token
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sezione Azioni Rapide */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h2 style={{
            fontSize: isMobile ? '18px' : '20px',
            fontWeight: 600,
            color: '#1f2937',
            margin: 0
          }}>Azioni Rapide</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={{
              background: 'transparent',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Filter size={14} />
              Filtri
            </button>
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gap: '16px', 
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)'
        }}>
          {azioniRapide.map((azione) => (
            <div
              key={azione.id}
              style={{
                background: azione.color,
                borderRadius: '16px',
                padding: isMobile ? '20px 16px' : '24px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <h3 style={{
                fontSize: isMobile ? '14px' : '16px',
                fontWeight: 600,
                color: azione.textColor,
                margin: '0 0 8px 0',
                lineHeight: 1.3
              }}>{azione.title}</h3>
              <p style={{
                fontSize: isMobile ? '12px' : '14px',
                color: azione.textColor,
                opacity: 0.8,
                margin: '0 0 16px 0',
                lineHeight: 1.4
              }}>{azione.subtitle}</p>
              <button style={{
                background: azione.color === '#E5E7EB' 
                  ? 'rgba(55, 65, 81, 0.1)' 
                  : 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                color: azione.textColor,
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}>
                {azione.action}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Statistiche Generali */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{
          fontSize: isMobile ? '18px' : '20px',
          fontWeight: 600,
          color: '#1f2937',
          margin: '0 0 16px 0'
        }}>Statistiche Generali</h2>
        
        <div style={{ 
          display: 'grid', 
          gap: isMobile ? '16px' : '24px', 
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)'
        }}>
          {statistiche.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.title}
                style={{
                  background: 'hsla(0, 0%, 100%, 0.6)',
                  backdropFilter: 'blur(16px)',
                  borderRadius: '16px',
                  padding: isMobile ? '20px' : '24px',
                  border: '1px solid hsla(0, 0%, 100%, 0.18)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: `${stat.color}15`,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Icon size={20} style={{ color: stat.color }} />
                  </div>
                  <MoreHorizontal size={16} style={{ color: '#9ca3af' }} />
                </div>
                
                <h3 style={{
                  fontSize: isMobile ? '12px' : '14px',
                  fontWeight: 500,
                  color: '#374151',
                  margin: '0 0 4px 0'
                }}>{stat.title}</h3>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  <span style={{
                    fontSize: isMobile ? '20px' : '24px',
                    fontWeight: 'bold',
                    color: '#1f2937'
                  }}>{stat.value}</span>
                  <span style={{
                    background: stat.trendUp 
                      ? 'rgba(16, 185, 129, 0.1)' 
                      : 'rgba(239, 68, 68, 0.1)',
                    color: stat.trendUp ? '#10b981' : '#ef4444',
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px'
                  }}>
                    {stat.trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {stat.trend}
                  </span>
                </div>
                
                <p style={{
                  fontSize: '12px',
                  color: '#9ca3af',
                  margin: 0
                }}>{stat.subtitle}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts e Analytics section - COMPLETA dalla dashboard originale */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{
          fontSize: isMobile ? '18px' : '20px',
          fontWeight: 600,
          color: '#1f2937',
          margin: '0 0 16px 0'
        }}>Analytics e Reports</h2>
        
        <div style={{
          display: 'grid',
          gap: '24px',
          gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr'
        }}>
          {/* Andamento Ricavi - Main chart */}
          <div style={{
            background: 'hsla(0, 0%, 100%, 0.6)',
            backdropFilter: 'blur(16px)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid hsla(0, 0%, 100%, 0.18)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <div>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#1f2937',
                  margin: '0 0 4px 0'
                }}>Andamento Ricavi</h3>
                <p style={{
                  fontSize: '14px',
                  color: '#374151',
                  margin: 0
                }}>Fatturato mensile per servizio</p>
              </div>
              <MoreHorizontal size={16} style={{ color: '#9ca3af' }} />
            </div>
            
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '8px',
              marginBottom: '16px'
            }}>
              <span style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#1f2937'
              }}>€2.4M</span>
              <span style={{
                background: 'rgba(123, 44, 191, 0.1)',
                color: '#7B2CBF',
                fontSize: '12px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '12px'
              }}>+15.2% vs mese scorso</span>
            </div>

            {/* Placeholder grafico principale */}
            <div style={{
              height: '200px',
              background: 'linear-gradient(135deg, rgba(255, 105, 0, 0.05), rgba(123, 44, 191, 0.05))',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px dashed #d1d5db'
            }}>
              <div style={{ textAlign: 'center', color: '#6b7280' }}>
                <BarChart size={48} style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: '14px', margin: 0 }}>Grafico ricavi in sviluppo</p>
                <p style={{ fontSize: '12px', margin: '4px 0 0 0' }}>I dati verranno visualizzati qui</p>
              </div>
            </div>
          </div>

          {/* Side metrics column */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {/* Quick Stats */}
            <div style={{
              background: 'hsla(0, 0%, 100%, 0.6)',
              backdropFilter: 'blur(16px)',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid hsla(0, 0%, 100%, 0.18)'
            }}>
              <h4 style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#1f2937',
                margin: '0 0 12px 0'
              }}>Performance Mensile</h4>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>Obiettivo Vendite</span>
                <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>87%</span>
              </div>
              <div style={{
                width: '100%',
                height: '6px',
                background: '#e5e7eb',
                borderRadius: '3px',
                overflow: 'hidden',
                marginBottom: '12px'
              }}>
                <div style={{
                  width: '87%',
                  height: '100%',
                  background: 'linear-gradient(90deg, #10b981, #059669)'
                }} />
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>Customer Satisfaction</span>
                <span style={{ fontSize: '12px', color: '#FF6900', fontWeight: 600 }}>94%</span>
              </div>
              <div style={{
                width: '100%',
                height: '6px',
                background: '#e5e7eb',
                borderRadius: '3px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: '94%',
                  height: '100%',
                  background: 'linear-gradient(90deg, #FF6900, #ff8533)'
                }} />
              </div>
            </div>

            {/* Top Products */}
            <div style={{
              background: 'hsla(0, 0%, 100%, 0.6)',
              backdropFilter: 'blur(16px)',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid hsla(0, 0%, 100%, 0.18)'
            }}>
              <h4 style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#1f2937',
                margin: '0 0 16px 0'
              }}>Top Servizi</h4>
              
              {[
                { name: 'Fibra Ultra', sales: 1247, trend: '+12%', color: '#10b981' },
                { name: 'Mobile 5G', sales: 892, trend: '+8%', color: '#FF6900' },
                { name: 'Business Pro', sales: 654, trend: '+24%', color: '#7B2CBF' }
              ].map((product, index) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: index < 2 ? '12px' : '0',
                  padding: '8px 0'
                }}>
                  <div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#1f2937',
                      marginBottom: '2px'
                    }}>{product.name}</div>
                    <div style={{
                      fontSize: '10px',
                      color: '#6b7280'
                    }}>{product.sales} vendite</div>
                  </div>
                  <span style={{
                    background: `${product.color}15`,
                    color: product.color,
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '8px'
                  }}>{product.trend}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sezione Grafici Specifici - Identica alla dashboard originale */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{
          fontSize: isMobile ? '18px' : '20px',
          fontWeight: 600,
          color: '#1f2937',
          margin: '0 0 16px 0'
        }}>Metriche Dettagliate</h2>
        
        <div style={{
          display: 'grid',
          gap: '24px',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)'
        }}>
          {/* Nuove Attivazioni */}
          <div style={{
            background: 'hsla(0, 0%, 100%, 0.6)',
            backdropFilter: 'blur(16px)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid hsla(0, 0%, 100%, 0.18)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: 600,
                color: '#1f2937',
                margin: 0
              }}>Nuove Attivazioni</h3>
              <MoreHorizontal size={16} style={{ color: '#9ca3af' }} />
            </div>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: '0 0 16px 0'
            }}>Trend settimanale</p>
            
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '8px',
              marginBottom: '16px'
            }}>
              <span style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#1f2937'
              }}>284</span>
              <button style={{
                background: 'rgba(255, 105, 0, 0.1)',
                color: '#FF6900',
                fontSize: '12px',
                fontWeight: 600,
                padding: '4px 12px',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer'
              }}>+12% questa settimana</button>
            </div>

            {/* Placeholder grafico */}
            <div style={{
              height: '120px',
              background: 'rgba(255, 105, 0, 0.05)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px dashed #d1d5db'
            }}>
              <div style={{ textAlign: 'center', color: '#6b7280' }}>
                <BarChart size={32} style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: '12px', margin: 0 }}>Grafico in sviluppo</p>
                <p style={{ fontSize: '10px', margin: '4px 0 0 0' }}>I dati verranno visualizzati qui</p>
              </div>
            </div>
          </div>

          {/* Ticket Support */}
          <div style={{
            background: 'hsla(0, 0%, 100%, 0.6)',
            backdropFilter: 'blur(16px)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid hsla(0, 0%, 100%, 0.18)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: 600,
                color: '#1f2937',
                margin: 0
              }}>Ticket Support</h3>
              <MoreHorizontal size={16} style={{ color: '#9ca3af' }} />
            </div>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: '0 0 16px 0'
            }}>Stato delle richieste</p>
            
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '8px',
              marginBottom: '16px'
            }}>
              <span style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#1f2937'
              }}>42</span>
              <button style={{
                background: 'rgba(123, 44, 191, 0.1)',
                color: '#7B2CBF',
                fontSize: '12px',
                fontWeight: 600,
                padding: '4px 12px',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer'
              }}>Aperti: 12, Risolti: 30</button>
            </div>

            {/* Placeholder grafico */}
            <div style={{
              height: '120px',
              background: 'rgba(123, 44, 191, 0.05)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px dashed #d1d5db'
            }}>
              <div style={{ textAlign: 'center', color: '#6b7280' }}>
                <BarChart size={32} style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: '12px', margin: 0 }}>Grafico in sviluppo</p>
                <p style={{ fontSize: '10px', margin: '4px 0 0 0' }}>I dati verranno visualizzati qui</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attività Recenti - COMPLETA dalla dashboard originale */}
      <div>
        <h2 style={{
          fontSize: isMobile ? '18px' : '20px',
          fontWeight: 600,
          color: '#1f2937',
          margin: '0 0 16px 0'
        }}>Attività Recenti</h2>
        
        <div style={{
          background: 'hsla(0, 0%, 100%, 0.6)',
          backdropFilter: 'blur(16px)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid hsla(0, 0%, 100%, 0.18)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#1f2937',
              margin: 0
            }}>Ultime Operazioni</h3>
            <button style={{
              background: 'transparent',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              color: '#6b7280'
            }}>
              Visualizza tutto
            </button>
          </div>

          {/* Lista attività */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {[
              {
                type: 'contratto',
                icon: FileText,
                title: 'Nuovo contratto attivato',
                description: 'Contratto fibra 1Gb per Maria Rossi - Via Roma 123',
                time: '2 minuti fa',
                status: 'success',
                color: '#10b981'
              },
              {
                type: 'pagamento',
                icon: DollarSign,
                title: 'Pagamento ricevuto',
                description: 'Fattura #2024-001247 pagata - €89.90',
                time: '15 minuti fa',
                status: 'success',
                color: '#10b981'
              },
              {
                type: 'ticket',
                icon: MessageCircle,
                title: 'Nuovo ticket supporto',
                description: 'Richiesta assistenza tecnica - Cliente Premium',
                time: '32 minuti fa',
                status: 'pending',
                color: '#f59e0b'
              },
              {
                type: 'lead',
                icon: Users,
                title: 'Lead qualificato',
                description: 'Nuovo lead interessato a Business Pro - Da campagna LinkedIn',
                time: '1 ora fa',
                status: 'new',
                color: '#FF6900'
              },
              {
                type: 'alert',
                icon: AlertTriangle,
                title: 'Scadenza contratto',
                description: 'Contratto in scadenza tra 7 giorni - Giuseppe Bianchi',
                time: '2 ore fa',
                status: 'warning',
                color: '#ef4444'
              }
            ].map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  border: `1px solid ${activity.color}20`,
                  borderLeft: `3px solid ${activity.color}`,
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    background: `${activity.color}15`,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Icon size={16} style={{ color: activity.color }} />
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <h4 style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#1f2937',
                      margin: '0 0 4px 0'
                    }}>{activity.title}</h4>
                    <p style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      margin: '0 0 4px 0',
                      lineHeight: 1.4
                    }}>{activity.description}</p>
                    <span style={{
                      fontSize: '10px',
                      color: '#9ca3af'
                    }}>{activity.time}</span>
                  </div>
                  
                  <div style={{
                    width: '8px',
                    height: '8px',
                    background: activity.color,
                    borderRadius: '50%',
                    flexShrink: 0,
                    marginTop: '12px'
                  }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}