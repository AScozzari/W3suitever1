import { useQuery } from "@tanstack/react-query";

export default function DashboardModule() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const metrics = [
    { 
      label: 'Ricavi Totali', 
      value: stats?.totalRevenue ? `€${(stats.totalRevenue / 1000).toFixed(1)}K` : '€0',
      change: '+12%',
      color: '#FF6900',
      icon: '💰'
    },
    { 
      label: 'Ordini Totali', 
      value: stats?.totalOrders || '0',
      change: '+8%',
      color: '#7B2CBF',
      icon: '📦'
    },
    { 
      label: 'Clienti', 
      value: stats?.totalCustomers || '0',
      change: '+15%',
      color: '#FF6900',
      icon: '👥'
    },
    { 
      label: 'Valore Medio', 
      value: stats?.averageOrderValue ? `€${stats.averageOrderValue.toFixed(0)}` : '€0',
      change: '+5%',
      color: '#7B2CBF',
      icon: '📊'
    },
  ];

  const todayMetrics = [
    { label: "Ricavi Oggi", value: stats?.todayRevenue ? `€${stats.todayRevenue.toFixed(2)}` : '€0' },
    { label: "Ordini Oggi", value: stats?.todayOrders || '0' },
  ];

  if (isLoading) {
    return (
      <div style={{ padding: '32px', color: 'white' }}>
        <h2>Caricamento dashboard...</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px' }}>
      <h1 style={{ color: 'white', fontSize: '32px', fontWeight: 'bold', marginBottom: '32px' }}>
        Dashboard Aziendale
      </h1>

      {/* Main Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '24px',
        marginBottom: '40px'
      }}>
        {metrics.map((metric, idx) => (
          <div
            key={idx}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              transition: 'transform 0.2s ease',
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', marginBottom: '8px' }}>
                  {metric.label}
                </p>
                <h3 style={{ color: 'white', fontSize: '28px', fontWeight: 'bold', margin: 0 }}>
                  {metric.value}
                </h3>
              </div>
              <div style={{
                width: '48px',
                height: '48px',
                background: `linear-gradient(135deg, ${metric.color}33 0%, ${metric.color}11 100%)`,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>
                {metric.icon}
              </div>
            </div>
            <div style={{ marginTop: '12px' }}>
              <span style={{
                color: '#4ade80',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                {metric.change}
              </span>
              <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '12px', marginLeft: '8px' }}>
                vs mese scorso
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Today's Performance */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        marginBottom: '24px'
      }}>
        <h2 style={{ color: 'white', fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
          Performance di Oggi
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          {todayMetrics.map((metric, idx) => (
            <div key={idx}>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', marginBottom: '4px' }}>
                {metric.label}
              </p>
              <p style={{ color: 'white', fontSize: '24px', fontWeight: '600' }}>
                {metric.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Feed */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h2 style={{ color: 'white', fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
          Attività Recenti
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { text: 'Nuovo ordine ricevuto', time: '2 minuti fa', icon: '📦' },
            { text: 'Cliente registrato', time: '15 minuti fa', icon: '👤' },
            { text: 'Report generato', time: '1 ora fa', icon: '📊' },
            { text: 'Inventario aggiornato', time: '2 ore fa', icon: '📋' },
          ].map((activity, idx) => (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '8px'
            }}>
              <span style={{ fontSize: '20px' }}>{activity.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ color: 'white', margin: 0 }}>{activity.text}</p>
                <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '12px', margin: 0 }}>
                  {activity.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}