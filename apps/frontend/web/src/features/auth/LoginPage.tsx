import { ArrowRight, User, Lock } from 'lucide-react';

export function LoginPage() {
  const handleLogin = () => {
    window.location.href = '/api/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-orange-50 to-purple-50 dark:from-neutral-950 dark:via-orange-950 dark:to-purple-950 flex items-center justify-center p-4">
      
      {/* Glassmorphism background pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl animate-pulse"></div>
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="glass rounded-2xl p-8 shadow-2xl border border-white/20">
          
          {/* Logo e Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-orange-500 to-purple-600 shadow-lg">
              <span className="text-white font-bold text-2xl">W3</span>
            </div>
            
            <h1 className="text-3xl font-bold text-gradient-brand mb-2">
              W3 Suite
            </h1>
            
            <p className="text-neutral-600 dark:text-neutral-400">
              Accedi alla piattaforma enterprise
            </p>
          </div>

          {/* Modulo Login */}
          <div className="space-y-6">
            
            {/* Campo Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Email aziendale
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400" />
                <input
                  type="email"
                  placeholder="nome@azienda.com"
                  className="w-full pl-10 pr-4 py-3 glass rounded-lg border border-white/20 bg-white/10 text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-300"
                />
              </div>
            </div>

            {/* Campo Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 glass rounded-lg border border-white/20 bg-white/10 text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-300"
                />
              </div>
            </div>

            {/* Ricorda credenziali */}
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-orange-500 bg-white/20 border-white/30 rounded focus:ring-orange-500/50 focus:ring-2"
                />
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  Ricorda accesso
                </span>
              </label>
              
              <button className="text-sm text-orange-500 hover:text-orange-400 transition-colors">
                Password dimenticata?
              </button>
            </div>

            {/* Pulsante Login */}
            <button
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-orange-500 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center space-x-2 group"
            >
              <span>Accedi alla Suite</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* SSO Alternative */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-transparent text-neutral-500">oppure</span>
              </div>
            </div>

            <button
              onClick={handleLogin}
              className="w-full glass border border-white/20 text-neutral-700 dark:text-neutral-300 py-3 px-6 rounded-lg font-medium hover:bg-white/10 transition-all duration-300 flex items-center justify-center space-x-2"
            >
              <span>Accedi con SSO Aziendale</span>
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/20 text-center">
            <p className="text-xs text-neutral-500">
              W3 Suite Enterprise Platform © 2024
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Sicurezza enterprise con autenticazione multifactor
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}