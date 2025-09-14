import React, { useState } from 'react';
import { useBrandAuth } from '../contexts/BrandAuthContext';
import { useLocation } from 'wouter';
import { Shield, Mail, Lock, Eye, EyeOff, Sparkles, Activity, Users, TrendingUp } from 'lucide-react';

export default function Login() {
  const { login } = useBrandAuth();
  const [, setLocation] = useLocation();
  const [credentials, setCredentials] = useState({
    email: 'sbadmin@w3suite.com',
    password: 'Brand123!'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const success = await login(credentials);
      if (success) {
        console.log('🎉 Login success - SPA navigate to dashboard via wouter');
        setLocation('/dashboard');
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
    <div className="brand-login-container">
      {/* Left Panel - Brand Showcase */}
      <div className="brand-login-panel">
        <div className="brand-login-pattern"></div>
        
        <div className="brand-login-content">
          <div className="brand-logo-container">
            <div className="brand-logo-icon">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div className="brand-logo-text">
              <h1 className="brand-logo-title">Brand Interface</h1>
              <p className="brand-logo-subtitle">W3 Suite Enterprise HQ</p>
            </div>
          </div>

          <div className="brand-features">
            <div className="brand-feature-card">
              <Activity className="brand-feature-icon" />
              <div>
                <h3 className="brand-feature-title">Real-time Analytics</h3>
                <p className="brand-feature-description">Monitor performance across all tenants</p>
              </div>
            </div>
            
            <div className="brand-feature-card">
              <Users className="brand-feature-icon" />
              <div>
                <h3 className="brand-feature-title">Multi-tenant Control</h3>
                <p className="brand-feature-description">Manage organizations from one dashboard</p>
              </div>
            </div>
            
            <div className="brand-feature-card">
              <TrendingUp className="brand-feature-icon" />
              <div>
                <h3 className="brand-feature-title">Business Intelligence</h3>
                <p className="brand-feature-description">Drive growth with data insights</p>
              </div>
            </div>
          </div>

          <div className="brand-footer">
            <p>© 2024 W3 Suite Enterprise Platform</p>
            <p className="brand-footer-small">Powering digital transformation</p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="brand-login-form-panel">
        <div className="brand-login-form-container">
          <div className="brand-login-form-card">
            {/* Form Header */}
            <div className="brand-form-header">
              <div className="brand-form-icon">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="brand-form-title">Bentornato</h2>
              <p className="brand-form-subtitle">Accedi al tuo account Brand Interface</p>
            </div>

            {/* Demo Credentials */}
            <div className="brand-demo-box">
              <div className="brand-demo-header">
                <span className="brand-demo-badge">DEMO</span>
                <span className="brand-demo-title">Test Credentials</span>
              </div>
              <div className="brand-demo-content">
                <div className="brand-demo-line">
                  <Mail className="w-3 h-3" />
                  <span>sbadmin@w3suite.com</span>
                </div>
                <div className="brand-demo-line">
                  <Lock className="w-3 h-3" />
                  <span>Brand123!</span>
                </div>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="brand-form">
              {/* Email Field */}
              <div className="brand-field">
                <label className="brand-label">Email</label>
                <div className="brand-input-group">
                  <Mail className="brand-input-icon" />
                  <input
                    type="email"
                    value={credentials.email}
                    onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                    className="brand-input"
                    placeholder="Inserisci la tua email"
                    required
                    data-testid="input-email"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="brand-field">
                <label className="brand-label">Password</label>
                <div className="brand-input-group">
                  <Lock className="brand-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    className="brand-input"
                    placeholder="••••••••"
                    required
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="brand-input-toggle"
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember & Forgot */}
              <div className="brand-form-options">
                <label className="brand-checkbox-label">
                  <input type="checkbox" className="brand-checkbox" />
                  <span>Ricordami</span>
                </label>
                <button type="button" className="brand-link">
                  Password dimenticata?
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="brand-error-box">
                  <p className="brand-error-text">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`brand-submit-button ${isLoading ? 'loading' : ''}`}
                data-testid="button-submit"
              >
                {isLoading ? (
                  <span className="brand-button-loading">
                    <div className="brand-spinner"></div>
                    Accesso in corso...
                  </span>
                ) : (
                  <span className="brand-button-text">
                    Accedi alla piattaforma
                  </span>
                )}
              </button>
            </form>

            {/* Form Footer */}
            <div className="brand-form-footer">
              <p>
                Hai bisogno di aiuto? 
                <button type="button" className="brand-link ml-1">
                  Contatta il supporto
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}