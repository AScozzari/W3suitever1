import React, { useState } from 'react';
import { useBrandAuth } from '../contexts/BrandAuthContext';
import { Shield, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const { login } = useBrandAuth();
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Inline CSS fallback for immediate visual fix
  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    },
    backgroundPattern: {
      position: 'absolute' as const,
      inset: '0',
      opacity: '0.1',
      pointerEvents: 'none' as const,
      backgroundImage: `
        radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.2) 0%, transparent 50%),
        radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.15) 0%, transparent 50%)
      `
    },
    card: {
      position: 'relative' as const,
      width: '100%',
      maxWidth: '28rem',
      zIndex: '10',
      background: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      padding: '2rem',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
    },
    iconContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '1rem',
      background: 'rgba(255, 255, 255, 0.12)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '50%',
      padding: '0.75rem'
    },
    title: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      color: 'white',
      marginBottom: '0.5rem',
      textAlign: 'center' as const,
      textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
    },
    subtitle: {
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: '0.875rem',
      textAlign: 'center' as const,
      marginBottom: '2rem'
    },
    demoBox: {
      marginBottom: '1.5rem',
      padding: '1rem',
      borderRadius: '0.5rem',
      background: 'rgba(255, 105, 0, 0.2)',
      border: '1px solid rgba(255, 105, 0, 0.3)'
    },
    demoTitle: {
      color: 'rgba(255, 180, 150, 1)',
      fontSize: '0.875rem',
      fontWeight: '500',
      marginBottom: '0.5rem'
    },
    demoText: {
      color: 'rgba(255, 255, 255, 0.9)',
      fontSize: '0.75rem',
      lineHeight: '1.5'
    },
    form: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '1.5rem'
    },
    label: {
      display: 'block',
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: '0.875rem',
      fontWeight: '500',
      marginBottom: '0.5rem'
    },
    inputContainer: {
      position: 'relative' as const
    },
    input: {
      width: '100%',
      padding: '0.75rem 1rem 0.75rem 2.5rem',
      background: 'rgba(255, 255, 255, 0.12)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '0.5rem',
      color: 'white',
      fontSize: '1rem',
      outline: 'none',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
    },
    inputFocus: {
      borderColor: 'rgba(255, 105, 0, 0.5)',
      boxShadow: '0 0 0 2px rgba(255, 105, 0, 0.2)'
    },
    icon: {
      position: 'absolute' as const,
      left: '0.75rem',
      top: '50%',
      transform: 'translateY(-50%)',
      color: 'rgba(255, 255, 255, 0.6)',
      filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))'
    },
    eyeIcon: {
      position: 'absolute' as const,
      right: '0.75rem',
      top: '50%',
      transform: 'translateY(-50%)',
      color: 'rgba(255, 255, 255, 0.6)',
      cursor: 'pointer',
      padding: '0.25rem'
    },
    errorBox: {
      padding: '0.75rem',
      borderRadius: '0.5rem',
      background: 'rgba(239, 68, 68, 0.2)',
      border: '1px solid rgba(239, 68, 68, 0.3)'
    },
    errorText: {
      color: 'rgba(255, 200, 200, 1)',
      fontSize: '0.875rem'
    },
    button: {
      width: '100%',
      padding: '0.75rem 1rem',
      borderRadius: '0.5rem',
      fontWeight: '500',
      transition: 'all 0.2s',
      border: 'none',
      cursor: 'pointer',
      color: 'white',
      background: isLoading 
        ? 'rgba(255, 105, 0, 0.3)' 
        : 'linear-gradient(135deg, #FF6900 0%, #7B2CBF 100%)',
      opacity: isLoading ? 0.5 : 1
    },
    footer: {
      marginTop: '2rem',
      textAlign: 'center' as const
    },
    footerText: {
      color: 'rgba(255, 255, 255, 0.5)',
      fontSize: '0.75rem'
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const success = await login(credentials);
      if (success) {
        // SPA navigation invece di full page reload
        console.log('🎉 Login success - SPA navigate to dashboard');
        window.history.replaceState({}, '', '/brandinterface');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else {
        setError('Credenziali non valide. Riprova.');
      }
    } catch (err) {
      setError('Errore durante il login. Riprova.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Background Pattern */}
      <div style={styles.backgroundPattern} />

      {/* Login Card */}
      <div style={styles.card}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={styles.iconContainer}>
            <Shield style={{ width: '2rem', height: '2rem', color: 'white', filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))' }} />
          </div>
          <h1 style={styles.title}>Brand Interface</h1>
          <p style={styles.subtitle}>Accesso riservato al team W3 Suite</p>
        </div>

        {/* Seed User Info */}
        <div style={styles.demoBox}>
          <p style={styles.demoTitle}>🚀 Demo Credentials</p>
          <p style={styles.demoText}>
            Email: brand.superadmin@windtre.it<br />
            Password: Brand123!
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Email */}
          <div>
            <label style={styles.label}>Email</label>
            <div style={styles.inputContainer}>
              <Mail style={styles.icon} size={20} />
              <input
                type="email"
                value={credentials.email}
                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                style={styles.input}
                placeholder="sbadmin@w3suite.com"
                required
                data-testid="input-email"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={styles.label}>Password</label>
            <div style={styles.inputContainer}>
              <Lock style={styles.icon} size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                style={styles.input}
                placeholder="••••••••"
                required
                data-testid="input-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
                data-testid="button-toggle-password"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div style={styles.errorBox}>
              <p style={styles.errorText}>{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={styles.button}
            data-testid="button-submit"
          >
            {isLoading ? 'Accesso in corso...' : 'Accedi alla Brand Interface'}
          </button>
        </form>

        {/* Footer */}
        <div style={styles.footer}>
          <p style={styles.footerText}>© 2024 W3 Suite Enterprise Platform</p>
        </div>
      </div>
    </div>
  );
}