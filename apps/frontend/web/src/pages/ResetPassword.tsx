import { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'wouter';

export default function ResetPassword() {
  const params = useParams();
  const tenantSlug = (params as any)?.tenant || 'staging';
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'form' | 'success' | 'error' | 'invalid'>('form');
  const [message, setMessage] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    } else {
      setStatus('invalid');
      setMessage('Link non valido. Richiedi un nuovo link di reset.');
    }
  }, []);

  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = [];
    if (pwd.length < 8) errors.push('Almeno 8 caratteri');
    return errors;
  };

  const handleSubmit = async () => {
    const errors = validatePassword(newPassword);
    if (errors.length > 0) {
      setMessage(errors.join('. '));
      setStatus('error');
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage('Le password non coincidono');
      setStatus('error');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword
        })
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage(data.message);
      } else {
        setStatus('error');
        setMessage(data.message || 'Errore durante il reset');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setStatus('error');
      setMessage('Errore di connessione. Riprova.');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordErrors = newPassword ? validatePassword(newPassword) : [];
  const passwordsMatch = confirmPassword && newPassword === confirmPassword;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F8F9FA',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '26.25rem',
        background: '#FFFFFF',
        borderRadius: '1rem',
        boxShadow: '0 0.25rem 2rem rgba(0, 0, 0, 0.08)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '2rem 2rem 1.5rem',
          borderBottom: '1px solid #F3F4F6'
        }}>
          <Link 
            href={`/${tenantSlug}/login`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              color: '#6B7280',
              textDecoration: 'none',
              marginBottom: '1.25rem',
              transition: 'color 0.2s'
            }}
            data-testid="link-back-to-login"
          >
            <ArrowLeft style={{ width: '1rem', height: '1rem' }} />
            Torna al login
          </Link>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{
              width: '2.75rem',
              height: '2.75rem',
              borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, #FF6900 0%, #FF8533 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: '1rem', fontWeight: '700', color: '#fff' }}>W3</span>
            </div>
            <h1 style={{ 
              margin: 0, 
              fontSize: '1.375rem', 
              fontWeight: '600', 
              color: '#1F2937' 
            }}>
              Nuova password
            </h1>
          </div>
          <p style={{ 
            margin: 0, 
            fontSize: '0.875rem', 
            color: '#6B7280' 
          }}>
            Inserisci la tua nuova password
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: '2rem' }}>
          
          {/* Success State */}
          {status === 'success' && (
            <div style={{
              textAlign: 'center',
              padding: '1.5rem 0'
            }}>
              <div style={{
                width: '4rem',
                height: '4rem',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem'
              }}>
                <CheckCircle style={{ width: '2rem', height: '2rem', color: '#10B981' }} />
              </div>
              <h2 style={{ 
                margin: '0 0 0.75rem', 
                fontSize: '1.125rem', 
                fontWeight: '600', 
                color: '#1F2937' 
              }}>
                Password aggiornata!
              </h2>
              <p style={{ 
                margin: '0 0 1.5rem', 
                fontSize: '0.875rem', 
                color: '#6B7280',
                lineHeight: '1.6'
              }}>
                {message || 'La tua password è stata aggiornata con successo. Ora puoi effettuare il login.'}
              </p>
              <Link 
                href={`/${tenantSlug}/login`}
                style={{
                  display: 'inline-block',
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #FF6900 0%, #FF8533 100%)',
                  borderRadius: '0.625rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: 'white',
                  textDecoration: 'none',
                  boxShadow: '0 0.25rem 1rem rgba(255, 105, 0, 0.3)'
                }}
                data-testid="link-go-to-login"
              >
                Vai al login
              </Link>
            </div>
          )}

          {/* Invalid Token State */}
          {status === 'invalid' && (
            <div style={{
              textAlign: 'center',
              padding: '1.5rem 0'
            }}>
              <div style={{
                width: '4rem',
                height: '4rem',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem'
              }}>
                <AlertCircle style={{ width: '2rem', height: '2rem', color: '#EF4444' }} />
              </div>
              <h2 style={{ 
                margin: '0 0 0.75rem', 
                fontSize: '1.125rem', 
                fontWeight: '600', 
                color: '#1F2937' 
              }}>
                Link non valido
              </h2>
              <p style={{ 
                margin: '0 0 1.5rem', 
                fontSize: '0.875rem', 
                color: '#6B7280',
                lineHeight: '1.6'
              }}>
                {message || 'Il link di reset è scaduto o non valido. Richiedi un nuovo link.'}
              </p>
              <Link 
                href={`/${tenantSlug}/forgot-password`}
                style={{
                  display: 'inline-block',
                  padding: '0.75rem 1.5rem',
                  background: '#F3F4F6',
                  borderRadius: '0.625rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  textDecoration: 'none'
                }}
                data-testid="link-request-new"
              >
                Richiedi nuovo link
              </Link>
            </div>
          )}

          {/* Error Message */}
          {status === 'error' && message && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              padding: '0.875rem 1rem',
              background: 'rgba(239, 68, 68, 0.08)',
              borderRadius: '0.625rem',
              marginBottom: '1.25rem',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}>
              <AlertCircle style={{ width: '1.125rem', height: '1.125rem', color: '#EF4444', flexShrink: 0, marginTop: '0.0625rem' }} />
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#DC2626' }}>{message}</p>
            </div>
          )}

          {/* Form State */}
          {(status === 'form' || status === 'error') && (
            <>
              {/* New Password Field */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Nuova password
                </label>
                <div style={{
                  position: 'relative',
                  background: '#F9FAFB',
                  borderRadius: '0.625rem',
                  border: `1px solid ${passwordErrors.length > 0 && newPassword ? '#EF4444' : '#E5E7EB'}`
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
                    placeholder="Inserisci nuova password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (status === 'error') setStatus('form');
                    }}
                    disabled={isLoading}
                    data-testid="input-new-password"
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
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      display: 'flex'
                    }}
                  >
                    {showPassword ? (
                      <EyeOff style={{ width: '1.125rem', height: '1.125rem', color: '#9CA3AF' }} />
                    ) : (
                      <Eye style={{ width: '1.125rem', height: '1.125rem', color: '#9CA3AF' }} />
                    )}
                  </button>
                </div>
                {passwordErrors.length > 0 && newPassword && (
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#EF4444' }}>
                    {passwordErrors.join('. ')}
                  </p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Conferma password
                </label>
                <div style={{
                  position: 'relative',
                  background: '#F9FAFB',
                  borderRadius: '0.625rem',
                  border: `1px solid ${confirmPassword && !passwordsMatch ? '#EF4444' : passwordsMatch ? '#10B981' : '#E5E7EB'}`
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
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Conferma password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    data-testid="input-confirm-password"
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
                    onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      display: 'flex'
                    }}
                  >
                    {showConfirmPassword ? (
                      <EyeOff style={{ width: '1.125rem', height: '1.125rem', color: '#9CA3AF' }} />
                    ) : (
                      <Eye style={{ width: '1.125rem', height: '1.125rem', color: '#9CA3AF' }} />
                    )}
                  </button>
                </div>
                {confirmPassword && !passwordsMatch && (
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#EF4444' }}>
                    Le password non coincidono
                  </p>
                )}
                {passwordsMatch && (
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#10B981' }}>
                    ✓ Le password coincidono
                  </p>
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={isLoading || passwordErrors.length > 0 || !passwordsMatch}
                data-testid="button-submit"
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  background: (isLoading || passwordErrors.length > 0 || !passwordsMatch)
                    ? '#D1D5DB' 
                    : 'linear-gradient(135deg, #FF6900 0%, #FF8533 100%)',
                  border: 'none',
                  borderRadius: '0.625rem',
                  fontSize: '0.9375rem',
                  fontWeight: '600',
                  color: 'white',
                  cursor: (isLoading || passwordErrors.length > 0 || !passwordsMatch) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: (isLoading || passwordErrors.length > 0 || !passwordsMatch) ? 'none' : '0 0.25rem 1rem rgba(255, 105, 0, 0.3)'
                }}
              >
                {isLoading ? 'Aggiornamento in corso...' : 'Aggiorna password'}
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 2rem',
          borderTop: '1px solid #F3F4F6',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '0.75rem', color: '#D1D5DB' }}>
            crafted by{' '}
            <a 
              href="https://www.easydigitalgroup.it" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#9CA3AF', textDecoration: 'none' }}
            >
              easydigitalgroup
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}
