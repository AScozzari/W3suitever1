export default function Landing() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0f0f1e 0%, #1a1a2e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>

      <div style={{
        position: 'relative',
        maxWidth: '400px',
        width: '100%',
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        padding: '40px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
      }}>
        {/* Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '40px'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            background: 'linear-gradient(135deg, #FF6900 0%, #7B2CBF 100%)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{
              color: 'white',
              fontSize: '22px',
              fontWeight: 'bold'
            }}>W3</span>
          </div>
          <div>
            <h1 style={{
              color: 'white',
              fontSize: '24px',
              fontWeight: '600',
              margin: 0,
              letterSpacing: '-0.5px'
            }}>W3 Suite</h1>
            <p style={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '13px',
              margin: 0
            }}>Enterprise Platform</p>
          </div>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <h2 style={{
            color: 'white',
            fontSize: '20px',
            fontWeight: '500',
            marginBottom: '8px'
          }}>Accedi al tuo account</h2>
          <p style={{
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '14px',
          }}>
            Utilizza le tue credenziali Replit per accedere
          </p>
        </div>

        <a
          href="/api/login"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            width: '100%',
            padding: '12px 20px',
            background: '#FF6900',
            color: 'white',
            fontSize: '15px',
            fontWeight: '500',
            textAlign: 'center',
            borderRadius: '8px',
            textDecoration: 'none',
            transition: 'all 0.2s ease',
            border: 'none',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#E55A00';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = '#FF6900';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7V12C2 16.5 4.23 20.68 7.62 23L12 20L16.38 23C19.77 20.68 22 16.5 22 12V7L12 2Z" fill="white"/>
          </svg>
          Accedi con Replit
        </a>

        <div style={{
          marginTop: '32px',
          paddingTop: '20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <p style={{
            color: 'rgba(255, 255, 255, 0.3)',
            fontSize: '12px',
            textAlign: 'center',
            margin: 0
          }}>
            © 2025 WindTre Business Solutions
          </p>
          <p style={{
            color: 'rgba(255, 255, 255, 0.3)',
            fontSize: '11px',
            textAlign: 'center',
            marginTop: '4px'
          }}>
            Enterprise Resource Planning Platform
          </p>
        </div>
      </div>
    </div>
  );
}