import { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { Link, useParams } from 'wouter';

export default function ForgotPassword() {
  const params = useParams();
  const tenantSlug = (params as any)?.tenant || 'staging';
  
  const [identifier, setIdentifier] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'email-required' | 'success' | 'error'>('form');
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    if (!identifier.trim()) {
      setMessage('Inserisci il tuo username o email');
      setStep('error');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          tenantSlug,
          recoveryEmail: recoveryEmail.trim() || undefined
        })
      });

      const data = await response.json();

      if (data.requiresEmail) {
        setStep('email-required');
        setMessage(data.message);
      } else if (data.success) {
        setStep('success');
        setMessage(data.message);
      } else {
        setStep('error');
        setMessage(data.message || 'Errore durante la richiesta');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setStep('error');
      setMessage('Errore di connessione. Riprova.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitWithEmail = async () => {
    if (!recoveryEmail.trim() || !recoveryEmail.includes('@')) {
      setMessage('Inserisci un indirizzo email valido');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          tenantSlug,
          recoveryEmail: recoveryEmail.trim()
        })
      });

      const data = await response.json();

      if (data.success) {
        setStep('success');
        setMessage(data.message);
      } else {
        setMessage(data.message || 'Errore durante la richiesta');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setMessage('Errore di connessione. Riprova.');
    } finally {
      setIsLoading(false);
    }
  };

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
              Password dimenticata
            </h1>
          </div>
          <p style={{ 
            margin: 0, 
            fontSize: '0.875rem', 
            color: '#6B7280' 
          }}>
            Inserisci i tuoi dati per recuperare l'accesso
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: '2rem' }}>
          
          {/* Success State */}
          {step === 'success' && (
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
                Email inviata!
              </h2>
              <p style={{ 
                margin: '0 0 1.5rem', 
                fontSize: '0.875rem', 
                color: '#6B7280',
                lineHeight: '1.6'
              }}>
                {message || 'Se l\'account esiste, riceverai un\'email con le istruzioni per reimpostare la password.'}
              </p>
              <Link 
                href={`/${tenantSlug}/login`}
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
                data-testid="link-return-to-login"
              >
                Torna al login
              </Link>
            </div>
          )}

          {/* Error Message */}
          {step === 'error' && message && (
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
          {(step === 'form' || step === 'error') && (
            <>
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
                  border: '1px solid #E5E7EB'
                }}>
                  <Mail style={{
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
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (step === 'error') setStep('form');
                    }}
                    disabled={isLoading}
                    data-testid="input-identifier"
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
                    onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                  />
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={isLoading}
                data-testid="button-submit"
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
                {isLoading ? 'Invio in corso...' : 'Invia link di recupero'}
              </button>
            </>
          )}

          {/* Email Required State */}
          {step === 'email-required' && (
            <>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.875rem 1rem',
                background: 'rgba(245, 158, 11, 0.08)',
                borderRadius: '0.625rem',
                marginBottom: '1.25rem',
                border: '1px solid rgba(245, 158, 11, 0.2)'
              }}>
                <AlertCircle style={{ width: '1.125rem', height: '1.125rem', color: '#F59E0B', flexShrink: 0, marginTop: '0.0625rem' }} />
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#B45309' }}>
                  {message || 'Non è presente un indirizzo email nel tuo profilo. Inseriscine uno per ricevere le istruzioni.'}
                </p>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Email di recupero
                </label>
                <div style={{
                  position: 'relative',
                  background: '#F9FAFB',
                  borderRadius: '0.625rem',
                  border: '1px solid #E5E7EB'
                }}>
                  <Mail style={{
                    position: 'absolute',
                    left: '0.875rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '1.125rem',
                    height: '1.125rem',
                    color: '#9CA3AF'
                  }} />
                  <input
                    type="email"
                    placeholder="Inserisci la tua email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    disabled={isLoading}
                    data-testid="input-recovery-email"
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
                    onKeyPress={(e) => e.key === 'Enter' && handleSubmitWithEmail()}
                  />
                </div>
              </div>

              <button
                onClick={handleSubmitWithEmail}
                disabled={isLoading}
                data-testid="button-submit-with-email"
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
                {isLoading ? 'Invio in corso...' : 'Invia link di recupero'}
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
