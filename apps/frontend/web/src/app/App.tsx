import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Simple App that just shows the login page
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LoginPage />
    </QueryClientProvider>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function LoginPage() {
  const handleLogin = () => {
    window.location.href = '/api/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
          
          {/* Logo WindTre Ufficiale */}
          <div className="text-center mb-8">
            <img 
              src="/windtre-logo.jpg" 
              alt="WindTre" 
              className="w-24 h-24 mx-auto mb-6 rounded-2xl object-contain"
            />
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              W3 Enterprise
            </h1>
            
            <p className="text-gray-600 text-sm">
              Accedi alla piattaforma aziendale
            </p>
          </div>

          {/* Form Login */}
          <div className="space-y-6">
            
            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                placeholder="nome@azienda.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••••"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              />
            </div>

            {/* Login Button */}
            <button
              onClick={handleLogin}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
            >
              Accedi
            </button>

            {/* Footer */}
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                WindTre Enterprise Platform
              </p>
              <p className="text-xs text-gray-400 mt-1">
                OAuth2 • Single Sign-On • MFA
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}