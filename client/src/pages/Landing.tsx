export default function Landing() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a1e 0%, #1a0033 50%, #0a0a1e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Background orbs */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-10%',
        width: '40%',
        height: '40%',
        background: 'radial-gradient(circle, rgba(255, 105, 0, 0.3) 0%, transparent 70%)',
        filter: 'blur(80px)',
        animation: 'float 20s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '-10%',
        width: '40%',
        height: '40%',
        background: 'radial-gradient(circle, rgba(123, 44, 191, 0.3) 0%, transparent 70%)',
        filter: 'blur(80px)',
        animation: 'float 25s ease-in-out infinite reverse',
      }} />

      <div style={{
        position: 'relative',
        maxWidth: '500px',
        width: '100%',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        padding: '48px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      }}>
        {/* Logo */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '32px'
        }}>
          <div style={{
            width: '100px',
            height: '100px',
            background: 'linear-gradient(135deg, #FF6900 0%, #7B2CBF 100%)',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 20px 40px -10px rgba(255, 105, 0, 0.5)',
          }}>
            <span style={{
              color: 'white',
              fontSize: '36px',
              fontWeight: 'bold'
            }}>W3</span>
          </div>
        </div>

        <h1 style={{
          color: 'white',
          fontSize: '32px',
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: '12px'
        }}>W3 Suite Enterprise</h1>
        
        <p style={{
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: '16px',
          textAlign: 'center',
          marginBottom: '40px'
        }}>
          Piattaforma completa per la gestione aziendale
        </p>

        <a
          href="/api/login"
          style={{
            display: 'block',
            width: '100%',
            padding: '16px 24px',
            background: 'linear-gradient(135deg, #FF6900 0%, #7B2CBF 100%)',
            color: 'white',
            fontSize: '18px',
            fontWeight: '600',
            textAlign: 'center',
            borderRadius: '12px',
            textDecoration: 'none',
            boxShadow: '0 10px 30px -10px rgba(255, 105, 0, 0.5)',
            transition: 'transform 0.2s ease',
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          Accedi con Replit
        </a>

        <div style={{
          marginTop: '40px',
          paddingTop: '24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <p style={{
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            Powered by WindTre Business Solutions
          </p>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
      `}</style>
    </div>
  );
}