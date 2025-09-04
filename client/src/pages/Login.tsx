import { useState } from 'react';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const isLight = true; // Default light theme
  
  return (
    <div style={{
      minHeight: '100vh',
      background: isLight 
        ? 'linear-gradient(180deg, #f0f2f5 0%, #e1e5ea 100%)'
        : 'linear-gradient(180deg, #0f0f1e 0%, #1a1a2e 100%)',
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
        background: isLight 
          ? 'rgba(255, 255, 255, 0.9)'
          : 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        padding: '40px',
        border: isLight 
          ? '1px solid rgba(0, 0, 0, 0.1)'
          : '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: isLight
          ? '0 10px 30px rgba(0, 0, 0, 0.1)'
          : '0 20px 40px rgba(0, 0, 0, 0.4)',
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
              color: isLight ? '#1f2937' : 'white',
              fontSize: '24px',
              fontWeight: '600',
              margin: 0,
              letterSpacing: '-0.5px'
            }}>W3 Suite</h1>
            <p style={{
              color: isLight ? 'rgba(31, 41, 55, 0.6)' : 'rgba(255, 255, 255, 0.5)',
              fontSize: '13px',
              margin: 0
            }}>Enterprise Platform</p>
          </div>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <h2 style={{
            color: isLight ? '#1f2937' : 'white',
            fontSize: '20px',
            fontWeight: '500',
            marginBottom: '8px'
          }}>Accedi al tuo account</h2>
          <p style={{
            color: isLight ? 'rgba(31, 41, 55, 0.6)' : 'rgba(255, 255, 255, 0.5)',
            fontSize: '14px',
          }}>
            Inserisci le tue credenziali per accedere
          </p>
        </div>

        {/* Username Field */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            color: isLight ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.7)',
            fontSize: '13px',
            marginBottom: '8px',
            fontWeight: '500'
          }}>
            Email / Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            style={{
              width: '100%',
              padding: '12px 16px',
              background: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)',
              border: isLight ? '1px solid rgba(0, 0, 0, 0.15)' : '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              color: isLight ? '#1f2937' : 'white',
              fontSize: '15px',
              outline: 'none',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#FF6900';
              e.currentTarget.style.background = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.background = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)';
            }}
          />
        </div>

        {/* Password Field */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            color: isLight ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.7)',
            fontSize: '13px',
            marginBottom: '8px',
            fontWeight: '500'
          }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="admin123"
              style={{
                width: '100%',
                padding: '12px 45px 12px 16px',
                background: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)',
                border: isLight ? '1px solid rgba(0, 0, 0, 0.15)' : '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                color: isLight ? '#1f2937' : 'white',
                fontSize: '15px',
                outline: 'none',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#FF6900';
                e.currentTarget.style.background = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.background = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)';
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: isLight ? 'rgba(31, 41, 55, 0.5)' : 'rgba(255, 255, 255, 0.5)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.color = isLight ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)'}
              onMouseOut={(e) => e.currentTarget.style.color = isLight ? 'rgba(31, 41, 55, 0.5)' : 'rgba(255, 255, 255, 0.5)'}
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        <button
          onClick={async () => {
            if (!username || !password) {
              alert('Inserisci username e password');
              return;
            }
            
            try {
              const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
                credentials: 'include'
              });
              
              if (response.ok) {
                const data = await response.json();
                // Salva il token se presente
                if (data.token) {
                  localStorage.setItem('auth_token', data.token);
                }
                // Forza un refresh completo per ricaricare l'app
                window.location.replace('/');
              } else {
                const data = await response.json();
                alert(data.message || 'Credenziali non valide');
              }
            } catch (error) {
              alert('Errore durante il login');
            }
          }}
          style={{
            width: '100%',
            padding: '13px 20px',
            background: '#FF6900',
            color: 'white',
            fontSize: '15px',
            fontWeight: '500',
            textAlign: 'center',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            marginBottom: '16px'
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
          Accedi
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: isLight ? 'rgba(31, 41, 55, 0.6)' : 'rgba(255, 255, 255, 0.6)',
            fontSize: '13px',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              style={{
                width: '16px',
                height: '16px',
                accentColor: '#FF6900'
              }}
            />
            Ricordami
          </label>
          <a
            href="#"
            style={{
              color: '#FF6900',
              fontSize: '13px',
              textDecoration: 'none'
            }}
            onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
            onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
          >
            Password dimenticata?
          </a>
        </div>

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