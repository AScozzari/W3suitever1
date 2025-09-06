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
      background: 'linear-gradient(135deg, hsl(210, 20%, 98%), hsl(210, 25%, 96%))',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'Inter, system-ui, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Effects */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '10%',
        width: '120px',
        height: '120px',
        background: 'rgba(255, 105, 0, 0.1)',
        borderRadius: '50%',
        filter: 'blur(40px)'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '15%',
        width: '100px',
        height: '100px',
        background: 'rgba(123, 44, 191, 0.08)',
        borderRadius: '50%',
        filter: 'blur(35px)'
      }} />
      
      {/* Main Container */}
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: 'hsla(0, 0%, 100%, 0.7)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        position: 'relative'
      }}>
        <div style={{ 
          padding: isMobile ? '32px 24px' : '48px 40px',
          position: 'relative',
          zIndex: 1
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={{
              fontSize: isMobile ? '28px' : '32px',
              fontWeight: '700',
              color: '#1f2937',
              marginBottom: '8px'
            }}>
              W3 Suite
            </h1>
            <p style={{
              fontSize: '16px',
              color: '#6b7280',
              margin: 0
            }}>
              OAuth2 Enterprise Login
            </p>
            <p style={{
              fontSize: '14px',
              color: currentTenant.color,
              margin: '8px 0 0 0',
              fontWeight: '500'
            }}>
              {currentTenant.name}
            </p>
          </div>

          {/* Login Form */}
          <div style={{ marginBottom: '32px' }}>
            {/* Username */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                position: 'relative',
                background: 'rgba(255, 255, 255, 0.8)',
                borderRadius: '12px',
                border: '1px solid rgba(0, 0, 0, 0.1)'
              }}>
                <User style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '20px',
                  height: '20px',
                  color: '#6b7280'
                }} />
                <input
                  type="text"
                  placeholder="Username"
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
                    color: '#1f2937',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                position: 'relative',
                background: 'rgba(255, 255, 255, 0.8)',
                borderRadius: '12px',
                border: '1px solid rgba(0, 0, 0, 0.1)'
              }}>
                <Lock style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '20px',
                  height: '20px',
                  color: '#6b7280'
                }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
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
                    color: '#1f2937',
                    outline: 'none'
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
                    justifyContent: 'center'
                  }}
                >
                  {showPassword ? (
                    <EyeOff style={{ width: '20px', height: '20px', color: '#6b7280' }} />
                  ) : (
                    <Eye style={{ width: '20px', height: '20px', color: '#6b7280' }} />
                  )}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              onClick={handleOAuth2Login}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '16px',
                background: isLoading ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                color: 'white',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
              }}
            >
              {isLoading ? 'Autenticazione OAuth2...' : 'Accedi con OAuth2'}
            </button>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center' }}>
            <p style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.6)',
              margin: 0
            }}>
              Powered by OAuth2 Enterprise • RFC 6749 + PKCE
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}