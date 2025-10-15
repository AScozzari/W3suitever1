// QR Check-in Page - Handles QR code scanning with multiple actions
import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2, Clock, Coffee, LogOut, LogIn } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';
import { useTenantNavigation } from '@/hooks/useTenantSafety';
import { apiRequest } from '@/lib/queryClient';

type CheckinStatus = 'loading' | 'success' | 'error' | 'expired' | 'auth_required' | 'choose_action';
type QRAction = 'clock-in' | 'clock-out' | 'break-start' | 'break-end';

function TimeTracker({ startTime }: { startTime?: string }) {
  const [elapsed, setElapsed] = useState<number>(0);

  useEffect(() => {
    if (!startTime) return;

    const start = new Date(startTime).getTime();
    
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.floor((now - start) / 1000);
      setElapsed(diff);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="text-center">
      <p className="text-4xl font-bold bg-gradient-to-r from-[#FF6900] to-[#7B2CBF] bg-clip-text text-transparent">
        {formatTime(elapsed)}
      </p>
    </div>
  );
}

export default function QRCheckinPage() {
  const { navigate } = useTenantNavigation();
  
  const [status, setStatus] = useState<CheckinStatus>('loading');
  const [message, setMessage] = useState<string>('');
  const [details, setDetails] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [actionType, setActionType] = useState<QRAction>('clock-in');

  // Check if user is authenticated (skip in development mode)
  const isDevelopment = import.meta.env.MODE === 'development';
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['/api/users/me'],
    retry: false,
    enabled: !isDevelopment // Skip auth check in development mode
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

    // In development mode, skip auth check and process directly
    if (isDevelopment) {
      console.log('[QR-CHECKIN] Development mode - skipping auth check');
      processQRAction(tokenParam, 'clock-in');
      return;
    }

    // Check authentication (only in production)
    if (!user && !userLoading) {
      setStatus('auth_required');
      setMessage('Accesso richiesto. Effettua il login per completare la timbratura.');
      return;
    }

    // User authenticated, process QR action
    if (user) {
      processQRAction(tokenParam, 'clock-in');
    }
  }, [user, userLoading, isDevelopment]);

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

      const data = await apiRequest('/api/hr/time-tracking/qr-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: qrToken, action })
      });

      if (data.success) {
        setStatus('success');
        
        const successMessages = {
          'clock-in': 'Ingresso registrato con successo!',
          'clock-out': 'Uscita registrata con successo!',
          'break-start': 'Pausa iniziata!',
          'break-end': 'Pausa terminata!'
        };
        
        setMessage(successMessages[action]);
        setDetails(data.data);
      } else if (data.error) {
        // Handle error in successful response
        const errorMsg = data.error;
        
        // If clock-in failed because already clocked in, show action choices
        if (action === 'clock-in' && errorMsg.includes('already have an active clock-in')) {
          setStatus('choose_action');
          setMessage('Sei già in servizio. Scegli un\'azione:');
        } else if (errorMsg.includes('expired') || errorMsg.includes('scaduto')) {
          setStatus('expired');
          setMessage('QR code scaduto. Richiedi un nuovo codice.');
        } else {
          setStatus('error');
          setMessage(errorMsg);
        }
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Errore durante la timbratura';
      
      // Check for auth errors
      if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
        setStatus('auth_required');
        setMessage('Accesso richiesto. Effettua il login per completare la timbratura.');
      } else if (errorMsg.includes('expired') || errorMsg.includes('scaduto')) {
        setStatus('expired');
        setMessage('QR code scaduto. Richiedi un nuovo codice.');
      } else {
        setStatus('error');
        setMessage(errorMsg);
      }
    }
  };

  const handleLogin = () => {
    // Redirect to login preserving token
    const returnUrl = encodeURIComponent(`/qr-checkin?token=${token}`);
    window.location.href = `/login?return=${returnUrl}`;
  };

  const handleActionChoice = (action: QRAction) => {
    if (token) {
      processQRAction(token, action);
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-16 w-16 animate-spin text-[#FF6900]" />;
      case 'success':
        return <CheckCircle className="h-16 w-16 text-green-500" />;
      case 'expired':
        return <Clock className="h-16 w-16 text-[#FF6900]" />;
      case 'auth_required':
        return <XCircle className="h-16 w-16 text-[#7B2CBF]" />;
      case 'choose_action':
        return <Clock className="h-16 w-16 text-[#FF6900]" />;
      case 'error':
        return <XCircle className="h-16 w-16 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    // WindTre glassmorphism design
    switch (status) {
      case 'success':
        return 'bg-white/80 backdrop-blur-xl border-green-200 shadow-xl';
      case 'expired':
        return 'bg-white/80 backdrop-blur-xl border-[#FF6900]/30 shadow-xl';
      case 'auth_required':
        return 'bg-white/80 backdrop-blur-xl border-[#7B2CBF]/30 shadow-xl';
      case 'choose_action':
        return 'bg-white/80 backdrop-blur-xl border-[#FF6900]/30 shadow-xl';
      case 'error':
        return 'bg-white/80 backdrop-blur-xl border-red-200 shadow-xl';
      default:
        return 'bg-white/80 backdrop-blur-xl border-[#FF6900]/30 shadow-xl';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-orange-50 via-purple-50 to-orange-100">
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

          {status === 'success' && actionType === 'clock-in' && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-[#FF6900]/10 to-[#7B2CBF]/10 rounded-lg border border-[#FF6900]/20">
                <p className="text-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  🕐 Tempo in Turno
                </p>
                <TimeTracker startTime={details?.timestamp} />
              </div>
              <Button
                onClick={() => navigate('my-portal')}
                className="w-full bg-gradient-to-r from-[#FF6900] to-[#7B2CBF] text-white"
                data-testid="button-back-portal"
              >
                Torna al Portale
              </Button>
            </div>
          )}

          {status === 'success' && actionType !== 'clock-in' && (
            <Button
              onClick={() => navigate('my-portal')}
              className="w-full bg-gradient-to-r from-[#FF6900] to-[#7B2CBF] text-white"
              data-testid="button-back-portal"
            >
              Torna al Portale
            </Button>
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
                className="w-full bg-gradient-to-r from-[#FF6900] to-[#7B2CBF] hover:from-[#FF6900]/90 hover:to-[#7B2CBF]/90 text-white"
                data-testid="button-login"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Effettua Login
              </Button>
            </div>
          )}

          {(status === 'error' || status === 'expired') && (
            <div className="flex gap-2">
              <Button
                onClick={() => navigate('my-portal')}
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
