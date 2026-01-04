import { useState, useEffect } from 'react';
import { User, Lock, Eye, EyeOff, Bot, Phone, BarChart3, Zap, Building2 } from 'lucide-react';
import { sha256 } from 'js-sha256';
import { Link } from 'wouter';
import w3LogoOfficial from '../assets/w3-logo-official.png';

interface LoginProps {
  tenantCode?: string;
}

const FEATURES = [
  {
    icon: Bot,
    title: 'AI Nativa',
    description: 'La tua piattaforma con intelligenza artificiale integrata che ti supporta ogni giorno',
    color: '#8B5CF6',
    bgColor: 'rgba(139, 92, 246, 0.1)'
  },
  {
    icon: Phone,
    title: 'CRM Intelligente',
    description: 'Rimani connesso con i tuoi clienti grazie ad un Agent AI integrato',
    color: '#FF6900',
    bgColor: 'rgba(255, 105, 0, 0.1)'
  },
  {
    icon: BarChart3,
    title: 'Analytics Predittive',
    description: 'Report e analisi per decisioni strategiche in tempo reale',
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.1)'
  },
  {
    icon: Zap,
    title: 'Automazione Smart',
    description: 'Workflow intelligenti che ottimizzano i processi e riducono gli errori',
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.1)'
  },
  {
    icon: Building2,
    title: 'Tutto in Uno',
    description: 'CRM, WMS, HR, Finance - una sola piattaforma per ogni esigenza',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.1)'
  }
];

export default function Login({ tenantCode: propTenantCode }: LoginProps = {}) {
  // Development mode: precompile with demo credentials for faster testing
  const isDevelopmentMode = import.meta.env.VITE_AUTH_MODE === 'development';
  const [username, setUsername] = useState(isDevelopmentMode ? 'admin@w3suite.com' : '');
  const [password, setPassword] = useState(isDevelopmentMode ? 'admin123' : '');
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get('returnTo') || params.get('return');
  const isOAuth2Return = returnTo?.includes('/oauth2/authorize');
  
  const getOAuth2ParamsFromReturnTo = (): { clientId: string; redirectUri: string; scope: string; state?: string } | null => {
    if (!isOAuth2Return || !returnTo) return null;
    try {
      const decodedUrl = decodeURIComponent(returnTo);
      const url = new URL(decodedUrl, window.location.origin);
      const clientId = url.searchParams.get('client_id');
      const redirectUri = url.searchParams.get('redirect_uri');
      const scope = url.searchParams.get('scope');
      const state = url.searchParams.get('state');
      if (clientId && redirectUri) {
        return { 
          clientId, 
          redirectUri: decodeURIComponent(redirectUri), 
          scope: scope || 'openid',
          state: state || undefined
        };
      }
    } catch (e) {
      console.warn('Failed to parse OAuth2 returnTo URL:', e);
    }
    return null;
  };
  
  const oauth2ReturnParams = getOAuth2ParamsFromReturnTo();
  const isExternalOAuth2Client = oauth2ReturnParams && oauth2ReturnParams.clientId !== 'w3suite-frontend';
  const returnUrl = isExternalOAuth2Client && returnTo
    ? decodeURIComponent(returnTo) 
    : (isOAuth2Return ? `/${propTenantCode || 'staging'}/dashboard` : (returnTo || `/${propTenantCode || 'staging'}/dashboard`));

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const generateCodeVerifier = (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, Array.from(array)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  const generateCodeChallenge = async (verifier: string): Promise<{ challenge: string; method: string }> => {
    const hashArray = sha256.array(verifier);
    const challenge = btoa(String.fromCharCode.apply(null, hashArray))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    return { challenge, method: 'S256' };
  };

  const handleOAuth2Login = async () => {
    if (!username || !password) {
      alert('Inserisci nome utente e password');
      return;
    }
    
    setIsLoading(true);
    
    const isDevelopmentAuth = import.meta.env.VITE_AUTH_MODE === 'development';
    if (isDevelopmentAuth) {
      try {
        const demoToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkZW1vLXVzZXIiLCJ0ZW5hbnRJZCI6IjAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMSIsInJvbGUiOiJhZG1pbiIsImV4cCI6OTk5OTk5OTk5OX0.demo';
        localStorage.setItem('auth_token', demoToken);
        localStorage.setItem('currentTenant', propTenantCode || 'staging');
        localStorage.setItem('currentTenantId', '00000000-0000-0000-0000-000000000001');
        window.location.href = returnUrl;
        return;
      } catch (error) {
        console.error('Development login error:', error);
        alert('Errore durante il login in development mode');
        setIsLoading(false);
        return;
      }
    }
    
    try {
      if (isExternalOAuth2Client && returnTo) {
        const loginResponse = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username, password }),
        });
        
        if (loginResponse.ok) {
          window.location.href = returnUrl;
          return;
        } else {
          const error = await loginResponse.json();
          alert(error.message || 'Credenziali non valide');
          setIsLoading(false);
          return;
        }
      }
      
      const codeVerifier = generateCodeVerifier();
      const { challenge, method } = await generateCodeChallenge(codeVerifier);
      sessionStorage.setItem('oauth2_code_verifier', codeVerifier);
      
      const authResponse = await fetch('/oauth2/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: 'w3suite-frontend',
          redirect_uri: window.location.origin + '/oauth2/callback',
          response_type: 'code',
          scope: 'openid profile email tenant_access admin',
          code_challenge: challenge,
          code_challenge_method: method,
          tenant_slug: propTenantCode || 'staging',
          username,
          password
        }),
      });

      if (!authResponse.ok) {
        const error = await authResponse.json();
        alert(error.message || 'Credenziali non valide');
        setIsLoading(false);
        return;
      }

      const authData = await authResponse.json();
      
      const tokenResponse = await fetch('/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: authData.code,
          redirect_uri: window.location.origin + '/oauth2/callback',
          client_id: 'w3suite-frontend',
          code_verifier: codeVerifier
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.json();
        alert(error.message || 'Errore durante l\'autenticazione');
        setIsLoading(false);
        return;
      }

      const tokens = await tokenResponse.json();
      
      // Save tokens in the format OAuth2Client expects
      const tokensWithExpiry = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type || 'Bearer',
        expires_in: tokens.expires_in || 3600,
        expires_at: Date.now() + ((tokens.expires_in || 3600) * 1000)
      };
      localStorage.setItem('oauth2_tokens', JSON.stringify(tokensWithExpiry));
      
      // Also save legacy keys for backwards compatibility
      localStorage.setItem('auth_token', tokens.access_token);
      if (tokens.refresh_token) localStorage.setItem('refresh_token', tokens.refresh_token);
      localStorage.setItem('currentTenant', propTenantCode || 'staging');
      
      window.location.href = returnUrl;
      
    } catch (error) {
      console.error('OAuth2 Login error:', error);
      alert('Errore durante il login. Riprova.');
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleOAuth2Login();
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F8F9FA',
      display: 'flex',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    }}>
      
      {/* Left Panel - Features (hidden on mobile) */}
      {!isMobile && (
        <div style={{
          flex: 1.3,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '3rem 4rem',
          maxWidth: '45rem'
        }}>
          {/* Logo W3 Suite - Centered */}
          <div style={{ marginBottom: '2.5rem', textAlign: 'center', width: '100%', maxWidth: '32.5rem' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <img 
                src={w3LogoOfficial} 
                alt="W3 Logo" 
                style={{ 
                  height: '4rem', 
                  width: 'auto',
                  mixBlendMode: 'multiply'
                }}
              />
              <span style={{ 
                fontSize: '2.75rem', 
                fontWeight: '700', 
                color: '#FF6900',
                letterSpacing: '-0.02rem',
                fontFamily: 'Inter, system-ui, sans-serif'
              }}>Suite</span>
            </div>
            <p style={{ 
              marginTop: '1rem', 
              fontSize: '0.9375rem', 
              color: '#6B7280',
              textAlign: 'center'
            }}>
              La piattaforma enterprise che trasforma il tuo business con intelligenza artificiale
            </p>
          </div>
          
          {/* Feature Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', width: '100%', maxWidth: '32.5rem' }}>
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              const colorRgb = feature.color.replace('#', '');
              const r = parseInt(colorRgb.slice(0, 2), 16);
              const g = parseInt(colorRgb.slice(2, 4), 16);
              const b = parseInt(colorRgb.slice(4, 6), 16);
              return (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    padding: '1.125rem 1.25rem',
                    background: `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, 0.12) 0%, rgba(255, 255, 255, 0.85) 70%)`,
                    backdropFilter: 'blur(0.75rem)',
                    WebkitBackdropFilter: 'blur(0.75rem)',
                    borderRadius: '0.875rem',
                    border: `1px solid rgba(${r}, ${g}, ${b}, 0.2)`,
                    boxShadow: `0 0.25rem 1.25rem rgba(${r}, ${g}, ${b}, 0.08)`,
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-0.125rem)';
                    e.currentTarget.style.boxShadow = `0 0.5rem 1.75rem rgba(${r}, ${g}, ${b}, 0.15)`;
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = `0 0.25rem 1.25rem rgba(${r}, ${g}, ${b}, 0.08)`;
                  }}
                >
                  <div style={{
                    width: '2.75rem',
                    height: '2.75rem',
                    borderRadius: '0.75rem',
                    background: feature.bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Icon style={{ width: '1.375rem', height: '1.375rem', color: feature.color }} />
                  </div>
                  <div>
                    <h3 style={{ 
                      margin: '0 0 0.25rem 0', 
                      fontSize: '0.9375rem', 
                      fontWeight: '600', 
                      color: '#1F2937' 
                    }}>
                      {feature.title}
                    </h3>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '0.8125rem', 
                      color: '#6B7280',
                      lineHeight: '1.5'
                    }}>
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Footer left */}
          <div style={{ marginTop: '3rem' }}>
            <p style={{ fontSize: '0.8125rem', color: '#9CA3AF' }}>
              © {new Date().getFullYear()} W3 Suite - Enterprise Platform
            </p>
          </div>
        </div>
      )}
      
      {/* Right Panel - Login Form */}
      <div style={{
        flex: isMobile ? 1 : 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: isMobile ? '2rem 1.5rem' : '3rem 4rem',
        background: '#FFFFFF'
      }}>
        {/* Form Card Container - Fixed Height */}
        <div style={{ 
          width: '100%', 
          maxWidth: '23.75rem',
          height: 'auto',
          maxHeight: '36.25rem',
          padding: '2.5rem 2.25rem',
          background: '#FFFFFF',
          borderRadius: '1.25rem',
          boxShadow: '0 0.5rem 2.5rem rgba(0, 0, 0, 0.08), 0 0.125rem 0.5rem rgba(0, 0, 0, 0.04)',
          border: '1px solid rgba(0, 0, 0, 0.06)'
        }}>
          
          {/* Mobile Logo */}
          {isMobile && (
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <img 
                  src={w3LogoOfficial} 
                  alt="W3 Logo" 
                  style={{ 
                    height: '2.5rem', 
                    width: 'auto',
                    mixBlendMode: 'multiply'
                  }}
                />
                <span style={{ 
                  fontSize: '1.75rem', 
                  fontWeight: '700', 
                  color: '#FF6900',
                  fontFamily: 'Inter, system-ui, sans-serif'
                }}>Suite</span>
              </div>
            </div>
          )}
          
          {/* Form Header */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              {!isMobile && (
                <img 
                  src={w3LogoOfficial} 
                  alt="W3 Logo" 
                  style={{ 
                    height: '2.25rem', 
                    width: 'auto',
                    mixBlendMode: 'multiply'
                  }}
                />
              )}
              <h1 style={{ 
                margin: 0, 
                fontSize: '1.625rem', 
                fontWeight: '600', 
                color: '#1F2937' 
              }}>
                Bentornato
              </h1>
            </div>
            <p style={{ 
              margin: 0, 
              fontSize: '0.9375rem', 
              color: '#6B7280' 
            }}>
              Accedi alla tua piattaforma aziendale
            </p>
          </div>
          
          {/* Login Form */}
          <div onKeyPress={handleKeyPress}>
            {/* Username Field */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Username o Email
              </label>
              <div style={{
                position: 'relative',
                background: '#F9FAFB',
                borderRadius: '0.625rem',
                border: '1px solid #E5E7EB',
                transition: 'all 0.2s ease'
              }}>
                <User style={{
                  position: 'absolute',
                  left: '0.875rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '1.125rem',
                  height: '1.125rem',
                  color: '#9CA3AF'
                }} />
                <input
                  type="text"
                  placeholder="Inserisci username o email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  data-testid="input-username"
                  style={{
                    width: '100%',
                    padding: '0.875rem 0.875rem 0.875rem 2.75rem',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '0.625rem',
                    fontSize: '0.875rem',
                    color: '#111827',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Password
              </label>
              <div style={{
                position: 'relative',
                background: '#F9FAFB',
                borderRadius: '0.625rem',
                border: '1px solid #E5E7EB'
              }}>
                <Lock style={{
                  position: 'absolute',
                  left: '0.875rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '1.125rem',
                  height: '1.125rem',
                  color: '#9CA3AF'
                }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  data-testid="input-password"
                  style={{
                    width: '100%',
                    padding: '0.875rem 2.75rem 0.875rem 2.75rem',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '0.625rem',
                    fontSize: '0.875rem',
                    color: '#111827',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password"
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {showPassword ? (
                    <EyeOff style={{ width: '1.125rem', height: '1.125rem', color: '#9CA3AF' }} />
                  ) : (
                    <Eye style={{ width: '1.125rem', height: '1.125rem', color: '#9CA3AF' }} />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div style={{ textAlign: 'right', marginBottom: '1.5rem' }}>
              <Link 
                href={`/${propTenantCode || 'staging'}/forgot-password`}
                style={{
                  fontSize: '0.8125rem',
                  color: '#6B7280',
                  textDecoration: 'none',
                  transition: 'color 0.2s ease'
                }}
                data-testid="link-forgot-password"
              >
                Password dimenticata?
              </Link>
            </div>

            {/* Login Button */}
            <button
              onClick={handleOAuth2Login}
              disabled={isLoading}
              data-testid="button-login"
              style={{
                width: '100%',
                padding: '0.875rem',
                background: isLoading 
                  ? '#D1D5DB' 
                  : 'linear-gradient(135deg, #FF6900 0%, #FF8533 100%)',
                border: 'none',
                borderRadius: '0.625rem',
                fontSize: '0.9375rem',
                fontWeight: '600',
                color: 'white',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isLoading ? 'none' : '0 0.25rem 1rem rgba(255, 105, 0, 0.3)'
              }}
            >
              {isLoading ? 'Autenticazione in corso...' : 'Accedi'}
            </button>
          </div>

          {/* Security Info */}
          <div style={{ 
            marginTop: '1.5rem',
            textAlign: 'center', 
            padding: '0.75rem 1rem',
            background: '#F9FAFB',
            borderRadius: '0.625rem',
            border: '1px solid #E5E7EB'
          }}>
            <p style={{
              fontSize: '0.75rem',
              color: '#9CA3AF',
              margin: 0
            }}>
              🔒 Connessione sicura OAuth2 Enterprise
            </p>
          </div>
          
          {/* Footer - crafted by */}
          <div style={{
            marginTop: '3rem',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '0.75rem', color: '#D1D5DB' }}>
              crafted by{' '}
              <a 
                href="https://www.easydigitalgroup.it" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  color: '#9CA3AF',
                  textDecoration: 'none',
                  transition: 'color 0.2s ease'
                }}
                data-testid="link-easydigitalgroup"
              >
                easydigitalgroup
              </a>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
