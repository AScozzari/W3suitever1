import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function MinimalLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('admin@w3.org');
  const [password, setPassword] = useState('admin123');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Inserisci email e password');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username: 'admin', 
          password: password 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('auth_token', data.token);
        window.location.reload();
      } else {
        const error = await response.json();
        alert(error.message || 'Credenziali non valide');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Errore durante il login. Riprova.');
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8f9fa',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Main Login Card */}
      <div style={{
        width: '100%',
        maxWidth: '400px',
        margin: '0 20px'
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px'
        }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 600,
            color: '#FF6900',
            margin: '0 0 8px 0'
          }}>W3 Enterprise</h1>
          <p style={{
            fontSize: '16px',
            color: '#6b7280',
            margin: 0
          }}>Accedi al sistema di gestione aziendale</p>
        </div>

        {/* Login Form Card */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 15px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e5e7eb'
        }}>
          {/* Email Field */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '8px'
            }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@w3.org"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#1f2937',
                outline: 'none',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box',
                background: '#ffffff'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#FF6900';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 105, 0, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <div style={{
              fontSize: '12px',
              color: '#FF6900',
              marginTop: '4px',
              fontWeight: 500
            }}>*</div>
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '8px'
            }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px 50px 12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#1f2937',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box',
                  background: '#ffffff'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#FF6900';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 105, 0, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleLogin();
                  }
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
                  color: '#9ca3af',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.color = '#6b7280';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.color = '#9ca3af';
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button
            onClick={handleLogin}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '14px',
              background: isLoading 
                ? '#d1d5db' 
                : '#FF6900',
              color: 'white',
              fontSize: '16px',
              fontWeight: 600,
              border: 'none',
              borderRadius: '8px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onMouseOver={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = '#e55800';
              }
            }}
            onMouseOut={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = '#FF6900';
              }
            }}
          >
            {isLoading ? (
              <>
                <div style={{
                  width: '18px',
                  height: '18px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Accesso in corso...
              </>
            ) : (
              'Accedi'
            )}
          </button>

          {/* Credenziali di test */}
          <div style={{
            background: '#f9fafb',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid #e5e7eb'
          }}>
            <p style={{
              fontSize: '12px',
              color: '#6b7280',
              margin: '0 0 8px 0',
              fontWeight: 600
            }}>Credenziali di test:</p>
            <div style={{
              fontSize: '11px',
              color: '#374151',
              fontFamily: 'JetBrains Mono, monospace',
              lineHeight: 1.5
            }}>
              <p style={{ margin: '0 0 4px 0' }}>Email: admin@w3.org</p>
              <p style={{ margin: 0 }}>Password: admin123</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: '32px',
          fontSize: '12px',
          color: '#9ca3af'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '16px',
            marginBottom: '16px'
          }}>
            <span style={{
              background: '#f3f4f6',
              color: '#6b7280',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 500
            }}>Logout eseguito</span>
            <span style={{
              color: '#6b7280',
              fontSize: '11px'
            }}>Sei stato disconnesso dal sistema</span>
          </div>
          <p style={{ margin: 0 }}>© 2025 WindTre Business Solutions - Enterprise Platform v2.0</p>
        </div>

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}