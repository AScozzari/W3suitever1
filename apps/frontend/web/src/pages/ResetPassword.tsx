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
      padding: '24px',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: '#FFFFFF',
        borderRadius: '16px',
        boxShadow: '0 4px 32px rgba(0, 0, 0, 0.08)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '32px 32px 24px',
          borderBottom: '1px solid #F3F4F6'
        }}>
          <Link 
            href={`/${tenantSlug}/login`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: '#6B7280',
              textDecoration: 'none',
              marginBottom: '20px',
              transition: 'color 0.2s'
            }}
            data-testid="link-back-to-login"
          >
            <ArrowLeft style={{ width: '16px', height: '16px' }} />
            Torna al login
          </Link>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #FF6900 0%, #FF8533 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>W3</span>
            </div>
            <h1 style={{ 
              margin: 0, 
              fontSize: '22px', 
              fontWeight: '600', 
              color: '#1F2937' 
            }}>
              Nuova password
            </h1>
          </div>
          <p style={{ 
            margin: 0, 
            fontSize: '14px', 
            color: '#6B7280' 
          }}>
            Inserisci la tua nuova password
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: '32px' }}>
          
          {/* Success State */}
          {status === 'success' && (
            <div style={{
              textAlign: 'center',
              padding: '24px 0'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px'
              }}>
                <CheckCircle style={{ width: '32px', height: '32px', color: '#10B981' }} />
              </div>
              <h2 style={{ 
                margin: '0 0 12px', 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#1F2937' 
              }}>
                Password aggiornata!
              </h2>
              <p style={{ 
                margin: '0 0 24px', 
                fontSize: '14px', 
                color: '#6B7280',
                lineHeight: '1.6'
              }}>
                {message || 'La tua password è stata aggiornata con successo. Ora puoi effettuare il login.'}
              </p>
              <Link 
                href={`/${tenantSlug}/login`}
                style={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #FF6900 0%, #FF8533 100%)',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'white',
                  textDecoration: 'none',
                  boxShadow: '0 4px 16px rgba(255, 105, 0, 0.3)'
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
              padding: '24px 0'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px'
              }}>
                <AlertCircle style={{ width: '32px', height: '32px', color: '#EF4444' }} />
              </div>
              <h2 style={{ 
                margin: '0 0 12px', 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#1F2937' 
              }}>
                Link non valido
              </h2>
              <p style={{ 
                margin: '0 0 24px', 
                fontSize: '14px', 
                color: '#6B7280',
                lineHeight: '1.6'
              }}>
                {message || 'Il link di reset è scaduto o non valido. Richiedi un nuovo link.'}
              </p>
              <Link 
                href={`/${tenantSlug}/forgot-password`}
                style={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  background: '#F3F4F6',
                  borderRadius: '10px',
                  fontSize: '14px',
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
              gap: '12px',
              padding: '14px 16px',
              background: 'rgba(239, 68, 68, 0.08)',
              borderRadius: '10px',
              marginBottom: '20px',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}>
              <AlertCircle style={{ width: '18px', height: '18px', color: '#EF4444', flexShrink: 0, marginTop: '1px' }} />
              <p style={{ margin: 0, fontSize: '14px', color: '#DC2626' }}>{message}</p>
            </div>
          )}

          {/* Form State */}
          {(status === 'form' || status === 'error') && (
            <>
              {/* New Password Field */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Nuova password
                </label>
                <div style={{
                  position: 'relative',
                  background: '#F9FAFB',
                  borderRadius: '10px',
                  border: `1px solid ${passwordErrors.length > 0 && newPassword ? '#EF4444' : '#E5E7EB'}`
                }}>
                  <Lock style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '18px',
                    height: '18px',
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
                      padding: '14px 44px 14px 44px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '10px',
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
                      display: 'flex'
                    }}
                  >
                    {showPassword ? (
                      <EyeOff style={{ width: '18px', height: '18px', color: '#9CA3AF' }} />
                    ) : (
                      <Eye style={{ width: '18px', height: '18px', color: '#9CA3AF' }} />
                    )}
                  </button>
                </div>
                {passwordErrors.length > 0 && newPassword && (
                  <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#EF4444' }}>
                    {passwordErrors.join('. ')}
                  </p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Conferma password
                </label>
                <div style={{
                  position: 'relative',
                  background: '#F9FAFB',
                  borderRadius: '10px',
                  border: `1px solid ${confirmPassword && !passwordsMatch ? '#EF4444' : passwordsMatch ? '#10B981' : '#E5E7EB'}`
                }}>
                  <Lock style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '18px',
                    height: '18px',
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
                      padding: '14px 44px 14px 44px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '14px',
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
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex'
                    }}
                  >
                    {showConfirmPassword ? (
                      <EyeOff style={{ width: '18px', height: '18px', color: '#9CA3AF' }} />
                    ) : (
                      <Eye style={{ width: '18px', height: '18px', color: '#9CA3AF' }} />
                    )}
                  </button>
                </div>
                {confirmPassword && !passwordsMatch && (
                  <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#EF4444' }}>
                    Le password non coincidono
                  </p>
                )}
                {passwordsMatch && (
                  <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#10B981' }}>
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
                  padding: '14px',
                  background: (isLoading || passwordErrors.length > 0 || !passwordsMatch)
                    ? '#D1D5DB' 
                    : 'linear-gradient(135deg, #FF6900 0%, #FF8533 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: 'white',
                  cursor: (isLoading || passwordErrors.length > 0 || !passwordsMatch) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: (isLoading || passwordErrors.length > 0 || !passwordsMatch) ? 'none' : '0 4px 16px rgba(255, 105, 0, 0.3)'
                }}
              >
                {isLoading ? 'Aggiornamento in corso...' : 'Aggiorna password'}
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 32px',
          borderTop: '1px solid #F3F4F6',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '12px', color: '#D1D5DB' }}>
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
