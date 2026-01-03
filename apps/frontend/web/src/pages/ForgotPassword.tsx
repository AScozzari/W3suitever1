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
              Password dimenticata
            </h1>
          </div>
          <p style={{ 
            margin: 0, 
            fontSize: '14px', 
            color: '#6B7280' 
          }}>
            Inserisci i tuoi dati per recuperare l'accesso
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: '32px' }}>
          
          {/* Success State */}
          {step === 'success' && (
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
                Email inviata!
              </h2>
              <p style={{ 
                margin: '0 0 24px', 
                fontSize: '14px', 
                color: '#6B7280',
                lineHeight: '1.6'
              }}>
                {message || 'Se l\'account esiste, riceverai un\'email con le istruzioni per reimpostare la password.'}
              </p>
              <Link 
                href={`/${tenantSlug}/login`}
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
          {(step === 'form' || step === 'error') && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Username o Email
                </label>
                <div style={{
                  position: 'relative',
                  background: '#F9FAFB',
                  borderRadius: '10px',
                  border: '1px solid #E5E7EB'
                }}>
                  <Mail style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '18px',
                    height: '18px',
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
                      padding: '14px 14px 14px 44px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '14px',
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
                  padding: '14px',
                  background: isLoading 
                    ? '#D1D5DB' 
                    : 'linear-gradient(135deg, #FF6900 0%, #FF8533 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: 'white',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isLoading ? 'none' : '0 4px 16px rgba(255, 105, 0, 0.3)'
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
                gap: '12px',
                padding: '14px 16px',
                background: 'rgba(245, 158, 11, 0.08)',
                borderRadius: '10px',
                marginBottom: '20px',
                border: '1px solid rgba(245, 158, 11, 0.2)'
              }}>
                <AlertCircle style={{ width: '18px', height: '18px', color: '#F59E0B', flexShrink: 0, marginTop: '1px' }} />
                <p style={{ margin: 0, fontSize: '14px', color: '#B45309' }}>
                  {message || 'Non è presente un indirizzo email nel tuo profilo. Inseriscine uno per ricevere le istruzioni.'}
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Email di recupero
                </label>
                <div style={{
                  position: 'relative',
                  background: '#F9FAFB',
                  borderRadius: '10px',
                  border: '1px solid #E5E7EB'
                }}>
                  <Mail style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '18px',
                    height: '18px',
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
                      padding: '14px 14px 14px 44px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '14px',
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
                  padding: '14px',
                  background: isLoading 
                    ? '#D1D5DB' 
                    : 'linear-gradient(135deg, #FF6900 0%, #FF8533 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: 'white',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isLoading ? 'none' : '0 4px 16px rgba(255, 105, 0, 0.3)'
                }}
              >
                {isLoading ? 'Invio in corso...' : 'Invia link di recupero'}
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
