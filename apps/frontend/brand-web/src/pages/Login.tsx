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
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{
           background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
         }}>
      
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0"
             style={{
               backgroundImage: `
                 radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.2) 0%, transparent 50%),
                 radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.15) 0%, transparent 50%)
               `
             }} />
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-md z-10">
        <div className="glass-card p-8 shadow-2xl">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="glass-button rounded-full p-3">
                <Shield className="w-8 h-8 text-white drop-shadow" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Brand Interface
            </h1>
            <p className="text-white/70 text-sm">
              Accesso riservato al team W3 Suite
            </p>
          </div>

          {/* Seed User Info */}
          <div className="mb-6 p-4 rounded-lg bg-orange-500/20 border border-orange-500/30">
            <p className="text-orange-200 text-sm font-medium mb-2">
              🚀 Demo Credentials
            </p>
            <p className="text-orange-100 text-xs">
              Email: admin@w3suite.com<br />
              Password: admin123
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Email */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60 drop-shadow" />
                <input
                  type="email"
                  value={credentials.email}
                  onChange={(e) => setCredentials({
                    ...credentials,
                    email: e.target.value
                  })}
                  className="w-full pl-10 pr-4 py-3 glass-button rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  placeholder="admin@w3suite.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60 drop-shadow" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={credentials.password}
                  onChange={(e) => setCredentials({
                    ...credentials,
                    password: e.target.value
                  })}
                  className="w-full pl-10 pr-12 py-3 glass-button rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white/80"
                >
                  {showPassword ? <EyeOff className="w-5 h-5 drop-shadow" /> : <Eye className="w-5 h-5 drop-shadow" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 disabled:opacity-50"
              style={{
                background: isLoading 
                  ? 'rgba(255, 105, 0, 0.3)' 
                  : 'linear-gradient(135deg, #FF6900 0%, #7B2CBF 100%)',
                color: 'white'
              }}
            >
              {isLoading ? 'Accesso in corso...' : 'Accedi alla Brand Interface'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-white/50 text-xs">
              © 2024 W3 Suite Enterprise Platform
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}