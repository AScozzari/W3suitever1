// QR Check-in Page - Handles QR code scanning from generic QR apps
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';

type CheckinStatus = 'loading' | 'success' | 'error' | 'expired' | 'auth_required';

export default function QRCheckinPage() {
  const [, navigate] = useLocation();
  
  const [status, setStatus] = useState<CheckinStatus>('loading');
  const [message, setMessage] = useState<string>('');
  const [details, setDetails] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  // Check if user is authenticated
  const { data: user } = useQuery({
    queryKey: ['/api/users/me'],
    retry: false
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');

    if (!tokenParam) {
      setStatus('error');
      setMessage('QR code mancante o non valido');
      return;
    }

    setToken(tokenParam);

    // Check authentication
    if (!user) {
      setStatus('auth_required');
      setMessage('Accesso richiesto. Effettua il login per completare la timbratura.');
      return;
    }

    // Process QR check-in
    processQRCheckin(tokenParam);
  }, [user]);

  const processQRCheckin = async (qrToken: string) => {
    try {
      setStatus('loading');
      setMessage('Elaborazione QR code in corso...');

      const response = await fetch('/api/hr/time-tracking/qr-checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ token: qrToken })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus('success');
        setMessage('Timbratura effettuata con successo!');
        setDetails(data.data);
        
        // Redirect to my-portal after 3 seconds (dynamic tenant)
        setTimeout(() => {
          const tenantSlug = localStorage.getItem('currentTenant') || 'staging';
          navigate(`/${tenantSlug}/my-portal`);
        }, 3000);
      } else {
        // Check error type
        const errorMsg = data.error || 'Errore durante la timbratura';
        
        if (errorMsg.includes('expired') || errorMsg.includes('scaduto')) {
          setStatus('expired');
          setMessage('QR code scaduto. Richiedi un nuovo codice.');
        } else if (response.status === 401) {
          setStatus('auth_required');
          setMessage('Accesso richiesto. Effettua il login per completare la timbratura.');
        } else {
          setStatus('error');
          setMessage(errorMsg);
        }
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Errore durante la timbratura');
    }
  };

  const handleLogin = () => {
    // Redirect to login preserving token
    const returnUrl = encodeURIComponent(`/qr-checkin?token=${token}`);
    const tenantSlug = localStorage.getItem('currentTenant') || 'staging';
    navigate(`/${tenantSlug}/login?return=${returnUrl}`);
  };

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-16 w-16 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-16 w-16 text-green-500" />;
      case 'expired':
        return <Clock className="h-16 w-16 text-orange-500" />;
      case 'auth_required':
        return <XCircle className="h-16 w-16 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-16 w-16 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'expired':
        return 'bg-orange-50 border-orange-200';
      case 'auth_required':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Card className={`w-full max-w-md ${getStatusColor()} border-2`}>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getIcon()}
          </div>
          <CardTitle className="text-2xl">
            {status === 'loading' && 'Elaborazione...'}
            {status === 'success' && 'Timbratura Completata'}
            {status === 'expired' && 'QR Code Scaduto'}
            {status === 'auth_required' && 'Accesso Richiesto'}
            {status === 'error' && 'Errore'}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert className={getStatusColor()}>
            <AlertDescription className="text-center text-lg">
              {message}
            </AlertDescription>
          </Alert>

          {details && (
            <div className="space-y-2 text-sm">
              <p><strong>Negozio:</strong> {details.storeName}</p>
              <p><strong>Orario:</strong> {new Date(details.timestamp).toLocaleString('it-IT')}</p>
              <p><strong>Metodo:</strong> QR Code</p>
            </div>
          )}

          {status === 'success' && (
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              Reindirizzamento al portale in corso...
            </p>
          )}

          {status === 'auth_required' && (
            <div className="flex gap-2">
              <Button
                onClick={handleLogin}
                className="w-full"
                data-testid="button-login"
              >
                Effettua Login
              </Button>
            </div>
          )}

          {(status === 'error' || status === 'expired') && (
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  const tenantSlug = localStorage.getItem('currentTenant') || 'staging';
                  navigate(`/${tenantSlug}/my-portal`);
                }}
                className="w-full"
                data-testid="button-return-portal"
              >
                Torna al Portale
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
