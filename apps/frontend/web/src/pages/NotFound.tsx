// NotFound.tsx - Enterprise 404 Page with WindTre Glassmorphism
// Security-focused design that doesn't expose sensitive routing information

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Home, ArrowLeft, Shield, Search, HelpCircle } from 'lucide-react';
import { useLocation, useRoute } from 'wouter';

export default function NotFound() {
  const [, setLocation] = useLocation();
  const [currentPath, setCurrentPath] = useState('');
  const [showDebug] = useState(false); // Never show debug info in production
  
  useEffect(() => {
    // Get the current path but sanitize it for security
    const path = window.location.pathname;
    // Only show the first segment to avoid exposing internal structure
    const segments = path.split('/').filter(Boolean);
    const sanitizedPath = segments.length > 0 ? `/${segments[0]}/***` : '/';
    setCurrentPath(sanitizedPath);
    
    // Log the 404 event for monitoring (without exposing full path)
    console.warn(`[404] Page not found - segment: ${segments[0] || 'root'}`);
  }, []);

  const handleGoHome = () => {
    // Safely redirect to tenant root without exposing structure
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    const tenant = pathSegments[0];
    
    // Validate tenant format (basic UUID check)
    const isValidTenant = tenant && (
      tenant === 'staging' || 
      tenant === 'demo' || 
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenant)
    );
    
    if (isValidTenant) {
      setLocation(`/${tenant}/dashboard`);
    } else {
      // If no valid tenant, go to root
      setLocation('/');
    }
  };

  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" 
         style={{
           background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
         }}>
      {/* Main 404 Card */}
      <Card className="max-w-2xl w-full" 
            style={{
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
            }}>
        <CardContent className="p-12 text-center">
          {/* Error Icon */}
          <div className="mb-8 flex justify-center">
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #FF6900 0%, #7B2CBF 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 30px rgba(255, 105, 0, 0.3)',
            }}>
              <AlertTriangle className="h-16 w-16 text-white" />
            </div>
          </div>

          {/* Error Code */}
          <h1 className="text-8xl font-bold mb-4"
              style={{
                background: 'linear-gradient(135deg, #FF6900, #7B2CBF)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
            404
          </h1>

          {/* Error Message */}
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">
            Pagina Non Trovata
          </h2>
          
          {/* Security-conscious error description */}
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            La risorsa richiesta non è disponibile. Questo potrebbe essere dovuto a:
          </p>

          {/* Possible reasons - generic to avoid information disclosure */}
          <div className="mb-8 text-left max-w-md mx-auto">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-600">
                  Autorizzazioni insufficienti per accedere alla risorsa
                </span>
              </div>
              <div className="flex items-start gap-3">
                <Search className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-600">
                  La pagina potrebbe essere stata spostata o rimossa
                </span>
              </div>
              <div className="flex items-start gap-3">
                <HelpCircle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-600">
                  Link non valido o errore di digitazione nell'URL
                </span>
              </div>
            </div>
          </div>

          {/* Security notice - subtle but important */}
          <div className="mb-8 p-4 rounded-lg"
               style={{
                 background: 'rgba(123, 44, 191, 0.05)',
                 border: '1px solid rgba(123, 44, 191, 0.1)',
               }}>
            <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
              <Shield className="h-3 w-3" />
              Per motivi di sicurezza, i dettagli specifici non sono mostrati
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={handleGoBack}
              variant="outline"
              className="min-w-[140px]"
              data-testid="button-go-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Torna Indietro
            </Button>
            
            <Button 
              onClick={handleGoHome}
              className="min-w-[140px] bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700"
              data-testid="button-go-home"
            >
              <Home className="h-4 w-4 mr-2" />
              Vai alla Home
            </Button>
          </div>

          {/* Request ID for support - hashed for security */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-xs text-gray-400">
              ID Richiesta: {btoa(Date.now().toString()).substring(0, 12).toUpperCase()}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Contatta il supporto IT se il problema persiste
            </p>
          </div>

          {/* Debug info - only in development, never in production */}
          {showDebug && process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-left">
              <code className="text-gray-600">
                Protected Path: {currentPath}
              </code>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Animated background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full"
             style={{
               background: 'radial-gradient(circle, rgba(255, 105, 0, 0.1) 0%, transparent 70%)',
               animation: 'float 20s ease-in-out infinite',
             }} />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full"
             style={{
               background: 'radial-gradient(circle, rgba(123, 44, 191, 0.1) 0%, transparent 70%)',
               animation: 'float 25s ease-in-out infinite reverse',
             }} />
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
      `}</style>
    </div>
  );
}