import { ArrowRight, User, Lock, Shield } from 'lucide-react';

export function LoginPage() {
  const handleLogin = () => {
    window.location.href = '/api/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Glassmorphism background orbs */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-orange-500/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-gradient-to-r from-purple-600/20 to-orange-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-gradient-to-r from-orange-500/10 to-purple-600/10 rounded-full blur-2xl animate-pulse delay-500"></div>
      </div>

      {/* Main login card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
          
          {/* Logo section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-orange-500 to-purple-600 shadow-2xl">
              <span className="text-white font-bold text-3xl">W3</span>
            </div>
            
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent mb-3">
              W3 Suite
            </h1>
            
            <p className="text-neutral-300 text-lg">
              Enterprise Platform
            </p>
            
            <div className="flex items-center justify-center space-x-2 mt-4 text-sm text-neutral-400">
              <Shield className="h-4 w-4" />
              <span>OAuth2 + MFA Security</span>
            </div>
          </div>

          {/* Login form */}
          <div className="space-y-6">
            
            {/* Email field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-200">
                Email Aziendale
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400" />
                <input
                  type="email"
                  placeholder="nome@azienda.com"
                  className="w-full pl-10 pr-4 py-4 backdrop-blur-xl bg-white/5 border border-white/20 rounded-xl text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-300"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-200">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400" />
                <input
                  type="password"
                  placeholder="••••••••••"
                  className="w-full pl-10 pr-4 py-4 backdrop-blur-xl bg-white/5 border border-white/20 rounded-xl text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-300"
                />
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-orange-500 bg-white/10 border-white/30 rounded focus:ring-orange-500/50 focus:ring-2"
                />
                <span className="text-sm text-neutral-300">
                  Ricorda accesso
                </span>
              </label>
              
              <button className="text-sm text-orange-400 hover:text-orange-300 transition-colors">
                Password dimenticata?
              </button>
            </div>

            {/* Login button */}
            <button
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-orange-500 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-center space-x-3 group"
            >
              <span>Accedi alla Suite</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-transparent text-neutral-400">oppure</span>
              </div>
            </div>

            {/* SSO button */}
            <button
              onClick={handleLogin}
              className="w-full backdrop-blur-xl bg-white/5 border border-white/20 text-neutral-200 py-4 px-6 rounded-xl font-medium hover:bg-white/10 hover:border-white/30 transition-all duration-300 flex items-center justify-center space-x-3"
            >
              <Shield className="h-5 w-5" />
              <span>Single Sign-On Aziendale</span>
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/20 text-center">
            <p className="text-xs text-neutral-400 mb-2">
              W3 Suite Enterprise Platform © 2024
            </p>
            <p className="text-xs text-neutral-500">
              Multitenant • RLS • OAuth2/OIDC • MFA
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}