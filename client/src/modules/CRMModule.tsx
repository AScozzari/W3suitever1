// Tema light fisso

export default function CRMModule() {
  const colors = {
    text: '#1f2937',
    textSecondary: 'rgba(31, 41, 55, 0.7)',
    cardBg: 'rgba(255, 255, 255, 0.9)',
    border: 'rgba(0, 0, 0, 0.1)',
  };

  return (
    <div>
      <h1 style={{ color: colors.text, fontSize: '28px', fontWeight: '600', marginBottom: '24px' }}>
        Customer Relationship Management
      </h1>
      
      <div style={{
        background: colors.cardBg,
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        padding: '32px',
        border: `1px solid ${colors.border}`,
        textAlign: 'center',
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>
          <span style={{ fontSize: '64px', marginBottom: '16px', display: 'block' }}>👥</span>
          <h2 style={{ color: colors.text, fontSize: '24px', marginBottom: '8px' }}>
            Sistema CRM
          </h2>
          <p style={{ color: colors.textSecondary }}>
            Modulo gestione clienti in sviluppo
          </p>
        </div>
      </div>
    </div>
  );
}