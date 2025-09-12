import { useState, useEffect } from 'react';
import { User, Lock, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  tenantCode?: string;
}

/**
 * W3 Suite OAuth2 Enterprise Login
 * Direct integration with OAuth2 Authorization Server
 */
export default function Login({ tenantCode: propTenantCode }: LoginProps = {}) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Tenant information
  const tenantInfo: Record<string, { name: string, color: string }> = {
    'w3suite': { name: 'W3 Suite Enterprise', color: '#FF6900' },
    'staging': { name: 'W3 Suite Staging', color: '#FF6900' },
    'demo': { name: 'Demo Organization', color: '#FF6900' },
    'acme': { name: 'Acme Corporation', color: '#0066CC' },
    'tech': { name: 'Tech Solutions Ltd', color: '#10B981' }
  };
  
  const currentTenant = tenantInfo[propTenantCode || 'w3suite'] || tenantInfo['w3suite'];

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // OAuth2 PKCE helpers
  const generateCodeVerifier = (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, Array.from(array)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  const generateCodeChallenge = async (verifier: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  const handleOAuth2Login = async () => {
    if (!username || !password) {
      alert('Inserisci nome utente e password');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // OAuth2 Authorization Code Flow with PKCE
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      
      // Step 1: Get authorization code
      const authResponse = await fetch('/api/oauth2/authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: 'w3suite-frontend',
          redirect_uri: `${window.location.origin}/auth/callback`,
          response_type: 'code',
          scope: 'openid profile email tenant_access',
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
          username: username,
          password: password
        }),
      });


      if (authResponse.ok && authResponse.redirected) {
        // The server redirected us to the callback URL with the authorization code
        const redirectUrl = new URL(authResponse.url);
        const authCode = redirectUrl.searchParams.get('code');
        
        if (authCode) {
          // Step 2: Exchange authorization code for access token
          const tokenResponse = await fetch('/api/oauth2/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              code: authCode,
              redirect_uri: `${window.location.origin}/auth/callback`,
              client_id: 'w3suite-frontend',
              code_verifier: codeVerifier
            }),
          });

          
          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json();
            
            // Add expires_at timestamp for OAuth2Client compatibility
            const expiresAt = Date.now() + (tokenData.expires_in * 1000);
            const tokensWithExpiry = {
              ...tokenData,
              expires_at: expiresAt
            };
            
            // Store OAuth2 tokens using OAuth2Client format
            localStorage.setItem('oauth2_tokens', JSON.stringify(tokensWithExpiry));
            
            console.log('✅ OAuth2 Enterprise Login Successful');
            console.log('🔄 Redirecting to dashboard...');
            // Redirect alla dashboard del tenant dopo login
            const tenantCode = propTenantCode || 'w3suite';
            window.location.href = `/${tenantCode}/dashboard`;
          } else {
            const errorData = await tokenResponse.json();
            console.error('Token exchange failed:', errorData);
            throw new Error(`Token exchange failed: ${errorData.error || 'Unknown error'}`);
          }
        } else {
          throw new Error('No authorization code received in redirect');
        }
      } else {
        // Handle different error cases
        if (authResponse.status === 0) {
          console.error('Network error or CORS issue');
          alert('Errore di rete. Verifica la connessione.');
        } else {
          try {
            const error = await authResponse.json();
            alert(error.message || 'Credenziali non valide');
          } catch (e) {
            console.error('Error parsing response:', e);
            alert(`Errore del server (${authResponse.status})`);
          }
        }
        setIsLoading(false);
      }
    } catch (error) {
      console.error('OAuth2 Login error:', error);
      console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
      alert('Errore durante il login. Riprova.');
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      
      {/* Main Login Container */}
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        {/* Header Section */}
        <div style={{ 
          padding: '32px',
          textAlign: 'center',
          borderBottom: '1px solid #f3f4f6'
        }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#FF6900',
            marginBottom: '8px',
            letterSpacing: '-0.5px'
          }}>
            W3 Suite
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            margin: '0 0 12px 0'
          }}>
            Enterprise Multi-Tenant Platform
          </p>
        </div>

        {/* Login Form */}
        <div style={{ padding: '32px' }}>
          <div style={{ marginBottom: '24px' }}>
            {/* Username Field */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>Username</label>
              <div style={{
                position: 'relative',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #d1d5db'
              }}>
                <User style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '18px',
                  height: '18px',
                  color: '#9ca3af'
                }} />
                <input
                  type="text"
                  placeholder="Inserisci username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 40px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#111827',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>Password</label>
              <div style={{
                position: 'relative',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #d1d5db'
              }}>
                <Lock style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '18px',
                  height: '18px',
                  color: '#9ca3af'
                }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Inserisci password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '12px 40px 12px 40px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#111827',
                    outline: 'none'
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
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px'
                  }}
                >
                  {showPassword ? (
                    <EyeOff style={{ width: '18px', height: '18px', color: '#9ca3af' }} />
                  ) : (
                    <Eye style={{ width: '18px', height: '18px', color: '#9ca3af' }} />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div style={{ textAlign: 'right', marginBottom: '24px' }}>
              <a 
                href="#forgot-password"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Contatta l\'amministratore per il reset della password');
                }}
                style={{
                  fontSize: '13px',
                  color: '#6b7280',
                  textDecoration: 'none',
                  transition: 'color 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.color = '#FF6900';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.color = '#6b7280';
                }}
              >
                Password dimenticata?
              </a>
            </div>

            {/* Login Button */}
            <button
              onClick={handleOAuth2Login}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '14px',
                background: isLoading 
                  ? '#d1d5db' 
                  : 'linear-gradient(135deg, #FF6900, #7B2CBF)',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: 'white',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isLoading ? 'none' : '0 2px 8px rgba(255, 105, 0, 0.3)'
              }}
              onMouseOver={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 105, 0, 0.4)';
                }
              }}
              onMouseOut={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translateY(0px)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 105, 0, 0.3)';
                }
              }}
            >
              {isLoading ? 'Autenticazione in corso...' : 'Accedi alla Suite'}
            </button>
          </div>

          {/* Security Info */}
          <div style={{ 
            textAlign: 'center', 
            padding: '12px',
            background: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <p style={{
              fontSize: '12px',
              color: '#6b7280',
              margin: 0
            }}>
              Autenticazione OAuth2 Enterprise • RFC 6749 • PKCE
            </p>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div style={{
        marginTop: '40px',
        textAlign: 'center'
      }}>
        <span style={{
          fontSize: '13px',
          color: '#6b7280',
          fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
        }}>
          Powered by{' '}
        </span>
        <a 
          href="https://www.easydigitalgroup.it" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            fontSize: '13px',
            color: '#3B82F6',
            textDecoration: 'none',
            fontWeight: '500',
            fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
            letterSpacing: '0.5px',
            transition: 'color 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = '#1D4ED8';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = '#3B82F6';
          }}
        >
          Easydigitalgroup srl
        </a>
      </div>
    </div>
  );
}