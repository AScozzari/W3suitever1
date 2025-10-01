// QR Check-in Page - Handles QR code scanning with multiple actions
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { CheckCircle, XCircle, Loader2, Clock, Coffee, LogOut, LogIn } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';

type CheckinStatus = 'loading' | 'success' | 'error' | 'expired' | 'auth_required' | 'choose_action';
type QRAction = 'clock-in' | 'clock-out' | 'break-start' | 'break-end';

export default function QRCheckinPage() {
  const [, navigate] = useLocation();
  
  const [status, setStatus] = useState<CheckinStatus>('loading');
  const [message, setMessage] = useState<string>('');
  const [details, setDetails] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [actionType, setActionType] = useState<QRAction>('clock-in');

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

    // Try automatic clock-in first
    processQRAction(tokenParam, 'clock-in');
  }, [user]);

  const processQRAction = async (qrToken: string, action: QRAction) => {
    try {
      setStatus('loading');
      setActionType(action);
      
      const actionMessages = {
        'clock-in': 'Timbratura ingresso in corso...',
        'clock-out': 'Timbratura uscita in corso...',
        'break-start': 'Inizio pausa in corso...',
        'break-end': 'Fine pausa in corso...'
      };
      
      setMessage(actionMessages[action]);

      const response = await fetch('/api/hr/time-tracking/qr-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ token: qrToken, action })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus('success');
        
        const successMessages = {
          'clock-in': 'Ingresso registrato con successo!',
          'clock-out': 'Uscita registrata con successo!',
          'break-start': 'Pausa iniziata!',
          'break-end': 'Pausa terminata!'
        };
        
        setMessage(successMessages[action]);
        setDetails(data.data);
        
        // Redirect to my-portal after 3 seconds
        setTimeout(() => {
          const tenantSlug = localStorage.getItem('currentTenant') || 'staging';
          navigate(`/${tenantSlug}/my-portal`);
        }, 3000);
      } else {
        // Check error type
        const errorMsg = data.error || 'Errore durante la timbratura';
        
        // If clock-in failed because already clocked in, show action choices
        if (action === 'clock-in' && errorMsg.includes('already have an active clock-in')) {
          setStatus('choose_action');
          setMessage('Sei già in servizio. Scegli un\'azione:');
        } else if (errorMsg.includes('expired') || errorMsg.includes('scaduto')) {
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

  const handleActionChoice = (action: QRAction) => {
    if (token) {
      processQRAction(token, action);
    }
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
      case 'choose_action':
        return <Clock className="h-16 w-16 text-blue-500" />;
      case 'error':
        return <XCircle className="h-16 w-16 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800';
      case 'expired':
        return 'bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800';
      case 'auth_required':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800';
      case 'choose_action':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800';
      case 'error':
        return 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800';
      default:
        return 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800';
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
            {status === 'success' && 'Operazione Completata'}
            {status === 'expired' && 'QR Code Scaduto'}
            {status === 'auth_required' && 'Accesso Richiesto'}
            {status === 'choose_action' && 'Scegli Azione'}
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
              {details.storeName && <p><strong>Negozio:</strong> {details.storeName}</p>}
              {details.timestamp && (
                <p><strong>Orario:</strong> {new Date(details.timestamp).toLocaleString('it-IT')}</p>
              )}
              {details.action && (
                <p><strong>Azione:</strong> {
                  details.action === 'clock-in' ? 'Ingresso' :
                  details.action === 'clock-out' ? 'Uscita' :
                  details.action === 'break-start' ? 'Inizio Pausa' :
                  details.action === 'break-end' ? 'Fine Pausa' : details.action
                }</p>
              )}
              <p><strong>Metodo:</strong> QR Code</p>
            </div>
          )}

          {status === 'success' && (
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              Reindirizzamento al portale in corso...
            </p>
          )}

          {status === 'choose_action' && (
            <div className="grid grid-cols-1 gap-3">
              <Button
                onClick={() => handleActionChoice('clock-out')}
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
                data-testid="button-clock-out"
              >
                <LogOut className="h-4 w-4" />
                Timbratura Uscita
              </Button>
              <Button
                onClick={() => handleActionChoice('break-start')}
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
                data-testid="button-break-start"
              >
                <Coffee className="h-4 w-4" />
                Inizio Pausa
              </Button>
              <Button
                onClick={() => handleActionChoice('break-end')}
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
                data-testid="button-break-end"
              >
                <CheckCircle className="h-4 w-4" />
                Fine Pausa
              </Button>
            </div>
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
