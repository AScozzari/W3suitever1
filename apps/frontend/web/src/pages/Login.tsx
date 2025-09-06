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
    'staging': { name: 'Staging Environment', color: '#7B2CBF' },
    'demo': { name: 'Demo Organization', color: '#FF6900' },
    'acme': { name: 'Acme Corporation', color: '#0066CC' },
    'tech': { name: 'Tech Solutions Ltd', color: '#10B981' }
  };
  
  const currentTenant = tenantInfo[propTenantCode || 'staging'] || tenantInfo['staging'];

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
      const authResponse = await fetch('/oauth2/authorize', {
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

      if (authResponse.redirected || authResponse.status === 302) {
        // Parse redirect URL to extract the code
        const redirectUrl = authResponse.url;
        const urlParams = new URLSearchParams(redirectUrl.split('?')[1]);
        const authCode = urlParams.get('code');
        
        if (authCode) {
          // Step 2: Exchange authorization code for access token
          const tokenResponse = await fetch('/oauth2/token', {
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
            
            // Store OAuth2 tokens
            localStorage.setItem('auth_token', tokenData.access_token);
            if (tokenData.refresh_token) {
              localStorage.setItem('refresh_token', tokenData.refresh_token);
            }
            
            console.log('✅ OAuth2 Enterprise Login Successful:', {
              tokenType: tokenData.token_type,
              expiresIn: tokenData.expires_in,
              scope: tokenData.scope
            });
            
            window.location.reload();
          } else {
            throw new Error('Token exchange failed');
          }
        } else {
          throw new Error('No authorization code received');
        }
      } else {
        const error = await authResponse.json();
        alert(error.message || 'Credenziali non valide');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('OAuth2 Login error:', error);
      alert('Errore durante il login. Riprova.');
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #FF6900 0%, #7B2CBF 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'Inter, system-ui, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Effects WindTre */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '10%',
        width: '200px',
        height: '200px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '50%',
        filter: 'blur(60px)'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '15%',
        right: '15%',
        width: '150px',
        height: '150px',
        background: 'rgba(255, 255, 255, 0.08)',
        borderRadius: '50%',
        filter: 'blur(40px)'
      }} />
      <div style={{
        position: 'absolute',
        top: '60%',
        left: '5%',
        width: '100px',
        height: '100px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '50%',
        filter: 'blur(30px)'
      }} />
      
      {/* Main Login Container */}
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'rgba(255, 255, 255, 0.12)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        boxShadow: '0 32px 64px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.2)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Header Section */}
        <div style={{ 
          padding: isMobile ? '40px 32px 32px' : '48px 40px 40px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1))',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{
              fontSize: '28px',
              fontWeight: '900',
              color: 'white',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
            }}>W3</div>
          </div>
          
          <h1 style={{
            fontSize: isMobile ? '32px' : '36px',
            fontWeight: '800',
            color: 'white',
            marginBottom: '8px',
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            letterSpacing: '-0.5px'
          }}>
            W3 Suite Enterprise
          </h1>
          <p style={{
            fontSize: '16px',
            color: 'rgba(255, 255, 255, 0.85)',
            margin: '0 0 8px 0',
            fontWeight: '500'
          }}>
            Piattaforma Multi-Tenant Avanzata
          </p>
          <div style={{
            display: 'inline-block',
            background: 'rgba(255, 255, 255, 0.15)',
            padding: '6px 16px',
            borderRadius: '20px',
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.9)',
            fontWeight: '600',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {currentTenant.name}
          </div>
        </div>

        {/* Login Form */}
        <div style={{ 
          padding: isMobile ? '0 32px 32px' : '0 40px 40px'
        }}>
          <div style={{ marginBottom: '32px' }}>
            {/* Username Field */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: 'rgba(255, 255, 255, 0.9)',
                marginBottom: '8px'
              }}>Username</label>
              <div style={{
                position: 'relative',
                background: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                transition: 'all 0.3s ease'
              }}>
                <User style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '20px',
                  height: '20px',
                  color: 'rgba(255, 255, 255, 0.7)'
                }} />
                <input
                  type="text"
                  placeholder="Inserisci il tuo username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '16px 16px 16px 48px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    color: 'white',
                    outline: 'none',
                    fontWeight: '500'
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
                color: 'rgba(255, 255, 255, 0.9)',
                marginBottom: '8px'
              }}>Password</label>
              <div style={{
                position: 'relative',
                background: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <Lock style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '20px',
                  height: '20px',
                  color: 'rgba(255, 255, 255, 0.7)'
                }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Inserisci la tua password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '16px 48px 16px 48px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    color: 'white',
                    outline: 'none',
                    fontWeight: '500'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    transition: 'background 0.2s ease'
                  }}
                >
                  {showPassword ? (
                    <EyeOff style={{ width: '20px', height: '20px', color: 'rgba(255, 255, 255, 0.7)' }} />
                  ) : (
                    <Eye style={{ width: '20px', height: '20px', color: 'rgba(255, 255, 255, 0.7)' }} />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div style={{ textAlign: 'right', marginBottom: '32px' }}>
              <a 
                href="#forgot-password"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Contatta l\'amministratore per il reset della password');
                }}
                style={{
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  textDecoration: 'none',
                  fontWeight: '500',
                  transition: 'color 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.color = 'white';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
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
                padding: '18px',
                background: isLoading 
                  ? 'rgba(255, 255, 255, 0.2)' 
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.15))',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '700',
                color: 'white',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                boxShadow: isLoading ? 'none' : '0 4px 16px rgba(0, 0, 0, 0.15)',
                transform: isLoading ? 'scale(0.98)' : 'scale(1)',
                letterSpacing: '0.5px'
              }}
              onMouseOver={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.2))';
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2)';
                }
              }}
              onMouseOut={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.15))';
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.15)';
                }
              }}
            >
              {isLoading ? '🔄 Autenticazione in corso...' : '🚀 Accedi alla Suite'}
            </button>
          </div>

          {/* Security Info */}
          <div style={{ 
            textAlign: 'center', 
            padding: '16px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <p style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.7)',
              margin: '0 0 4px 0',
              fontWeight: '500'
            }}>
              🔐 Autenticazione OAuth2 Enterprise
            </p>
            <p style={{
              fontSize: '11px',
              color: 'rgba(255, 255, 255, 0.6)',
              margin: 0
            }}>
              RFC 6749 • PKCE • Multi-Tenant Security
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ 
        textAlign: 'center', 
        marginTop: '32px',
        padding: '0 24px'
      }}>
        <p style={{
          fontSize: '14px',
          color: 'rgba(255, 255, 255, 0.8)',
          margin: 0,
          fontWeight: '500'
        }}>
          Crafted by{' '}
          <a 
            href="https://www.easydigitalgroup.it" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              color: 'white',
              textDecoration: 'none',
              fontWeight: '700',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.textDecoration = 'underline';
              e.currentTarget.style.textShadow = '0 2px 4px rgba(0, 0, 0, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.textDecoration = 'none';
              e.currentTarget.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.3)';
            }}
          >
            EasyDigitalGroup
          </a>
        </p>
      </div>
    </div>
  );
}