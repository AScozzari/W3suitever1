import { useState, type KeyboardEvent } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, ArrowRight, Globe, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function OrganizationRequired() {
  const [orgSlug, setOrgSlug] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);

  const handleNavigate = () => {
    if (orgSlug.trim()) {
      setIsNavigating(true);
      const cleanSlug = orgSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      window.location.href = `/${cleanSlug}/dashboard`;
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNavigate();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" 
         style={{
           background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
         }}
         data-testid="page-organization-required">
      
      <Card className="max-w-2xl w-full" 
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08)',
            }}>
        <CardContent className="p-12 text-center">
          
          <div className="mb-8 flex justify-center">
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #FF6900 0%, #FF8533 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 30px rgba(255, 105, 0, 0.25)',
            }}>
              <Building2 className="h-16 w-16 text-white" />
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-3"
              style={{
                background: 'linear-gradient(135deg, #FF6900, #E55A00)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
            W3 Suite Enterprise
          </h1>

          <h2 className="text-xl font-medium text-gray-700 mb-2">
            Indirizzo Organizzazione Richiesto
          </h2>
          
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            Per accedere alla piattaforma, inserisci l'indirizzo della tua organizzazione nell'URL.
          </p>

          <div className="mb-8 p-6 rounded-xl"
               style={{
                 background: 'rgba(255, 105, 0, 0.04)',
                 border: '1px solid rgba(255, 105, 0, 0.1)',
               }}>
            <div className="flex items-center justify-center gap-2 mb-4">
              <Globe className="h-5 w-5 text-orange-500" />
              <span className="text-sm font-medium text-gray-700">Formato URL corretto:</span>
            </div>
            <code className="text-lg font-mono px-4 py-2 rounded-lg inline-block"
                  style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    color: '#374151',
                    border: '1px solid rgba(0,0,0,0.1)',
                  }}>
              <span className="text-gray-400">https://</span>
              <span className="text-gray-600">dominio.it</span>
              <span className="text-orange-500 font-bold">/nome-organizzazione</span>
              <span className="text-gray-400">/dashboard</span>
            </code>
          </div>

          <div className="mb-8 max-w-md mx-auto">
            <label className="block text-sm font-medium text-gray-600 mb-2 text-left">
              Inserisci il nome della tua organizzazione:
            </label>
            <div className="flex gap-3">
              <Input
                type="text"
                placeholder="es. windtre, staging, demo..."
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
                style={{
                  height: '48px',
                  fontSize: '16px',
                  borderColor: 'rgba(255, 105, 0, 0.3)',
                }}
                data-testid="input-organization-slug"
              />
              <Button
                onClick={handleNavigate}
                disabled={!orgSlug.trim() || isNavigating}
                style={{
                  height: '48px',
                  background: 'linear-gradient(135deg, #FF6900 0%, #E55A00 100%)',
                  border: 'none',
                }}
                data-testid="button-navigate-organization"
              >
                {isNavigating ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Vai <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="text-left max-w-md mx-auto mb-8">
            <div className="flex items-start gap-3 p-4 rounded-lg"
                 style={{
                   background: 'rgba(59, 130, 246, 0.05)',
                   border: '1px solid rgba(59, 130, 246, 0.1)',
                 }}>
              <HelpCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-sm font-medium text-gray-700 block mb-1">
                  Non conosci il nome della tua organizzazione?
                </span>
                <span className="text-sm text-gray-500">
                  Contatta l'amministratore IT della tua azienda o verifica l'email di benvenuto ricevuta durante la registrazione.
                </span>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-200">
            <p className="text-xs text-gray-400">
              W3 Suite Enterprise Platform
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Contatta il supporto: <a href="mailto:support@w3suite.it" className="text-orange-500 hover:underline">support@w3suite.it</a>
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full"
             style={{
               background: 'radial-gradient(circle, rgba(255, 105, 0, 0.08) 0%, transparent 70%)',
               animation: 'float 20s ease-in-out infinite',
             }} />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full"
             style={{
               background: 'radial-gradient(circle, rgba(255, 105, 0, 0.06) 0%, transparent 70%)',
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
