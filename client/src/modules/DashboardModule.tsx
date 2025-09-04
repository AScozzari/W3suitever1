import { useTheme } from '../contexts/ThemeContext';

const stats = [
  { label: 'Vendite Oggi', value: '€12,450', change: '+15%', icon: '💰' },
  { label: 'Clienti Attivi', value: '324', change: '+8%', icon: '👥' },
  { label: 'Ordini Aperti', value: '42', change: '-3%', icon: '📦' },
  { label: 'Performance', value: '92%', change: '+12%', icon: '📈' },
];

export default function DashboardModule() {
  const { currentTheme } = useTheme();

  const colors = {
    text: currentTheme === 'dark' ? 'white' : '#1f2937',
    textSecondary: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(31, 41, 55, 0.7)',
    cardBg: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
    border: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
  };

  return (
    <div>
      <h1 style={{ color: colors.text, fontSize: '28px', fontWeight: '600', marginBottom: '24px' }}>
        Dashboard Overview
      </h1>
      
      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {stats.map((stat, index) => (
          <div
            key={index}
            style={{
              background: colors.cardBg,
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '24px' }}>{stat.icon}</span>
              <span style={{
                color: stat.change.startsWith('+') ? '#10b981' : '#ef4444',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                {stat.change}
              </span>
            </div>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '4px' }}>
              {stat.label}
            </p>
            <p style={{ color: colors.text, fontSize: '24px', fontWeight: '600' }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts Placeholder */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '20px'
      }}>
        <div style={{
          background: colors.cardBg,
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '24px',
          border: `1px solid ${colors.border}`,
          minHeight: '300px'
        }}>
          <h3 style={{ color: colors.text, marginBottom: '16px' }}>Vendite Mensili</h3>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '250px',
            color: colors.textSecondary
          }}>
            Grafico vendite
          </div>
        </div>
        
        <div style={{
          background: colors.cardBg,
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '24px',
          border: `1px solid ${colors.border}`,
          minHeight: '300px'
        }}>
          <h3 style={{ color: colors.text, marginBottom: '16px' }}>Top Prodotti</h3>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '250px',
            color: colors.textSecondary
          }}>
            Lista prodotti
          </div>
        </div>
      </div>
    </div>
  );
}