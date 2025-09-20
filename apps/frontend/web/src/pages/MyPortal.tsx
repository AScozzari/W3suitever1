import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Coffee, Home, FileText, User, Calendar, BarChart3, AlertCircle, CheckCircle, PlayCircle, PauseCircle, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { DisplayUser, DisplayLeaveBalance, CurrentSession, getDisplayUser, getDisplayLeaveBalance } from '@/types';
import { apiRequest } from '@/lib/queryClient';

export default function MyPortal() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch user data
  const { data: userData } = useQuery({
    queryKey: ['/users/me'],
    select: (data) => getDisplayUser(data, null)
  });

  // Fetch current session
  const { data: currentSession, isLoading: sessionLoading } = useQuery<CurrentSession>({
    queryKey: ['/time-tracking/current-session']
  });

  // Fetch leave balance
  const { data: leaveBalance } = useQuery({
    queryKey: ['/users/me/leave-balance'],
    select: (data) => getDisplayLeaveBalance(data)
  });

  // Fetch recent requests
  const { data: recentRequests } = useQuery({
    queryKey: ['/hr-requests', 'recent'],
    queryFn: () => apiRequest('/hr-requests?limit=3&status=pending,approved')
  });

  // Clock In/Out Mutation
  const clockMutation = useMutation({
    mutationFn: (action: 'clock-in' | 'clock-out' | 'start-break' | 'end-break') => 
      apiRequest(`/time-tracking/${action}`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/time-tracking/current-session'] });
      toast({ title: 'Success', description: 'Time tracking updated successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update time tracking' });
    }
  });

  const displayUser = userData || {
    nome: 'Demo',
    cognome: 'User', 
    email: 'demo@windtre.it',
    ruolo: 'Employee',
    reparto: 'General',
    store: 'Milano Centro',
    foto: null
  } as DisplayUser;

  const displayBalance = leaveBalance || {
    ferieRimanenti: 18,
    permessiRimanenti: 20,
    ferieAnno: 26,
    ferieUsate: 8,
    permessiROL: 32,
    permessiUsati: 12
  } as DisplayLeaveBalance;

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getSessionStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'break': return 'bg-yellow-500';
      case 'overtime': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, hsl(210, 20%, 98%), hsl(210, 25%, 96%))',
      padding: '24px'
    }}>
      {/* Welcome Header */}
      <div style={{
        marginBottom: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FF6900, #ff8533)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '24px',
            fontWeight: 'bold'
          }}>
            {displayUser.foto ? (
              <img src={displayUser.foto} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              `${displayUser.nome[0]}${displayUser.cognome[0]}`
            )}
          </div>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
              Ciao, {displayUser.nome}! 👋
            </h1>
            <p style={{ color: '#6b7280', margin: '4px 0 0 0' }}>
              {displayUser.ruolo} • {displayUser.reparto} • {displayUser.store}
            </p>
          </div>
        </div>
        <div style={{
          padding: '12px 16px',
          background: 'hsla(255, 255, 255, 0.9)',
          borderRadius: '12px',
          border: '1px solid hsla(0, 0%, 0%, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
            {currentTime.toLocaleTimeString('it-IT')}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            {currentTime.toLocaleDateString('it-IT', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        
        {/* Time Tracking Card */}
        <Card style={{ background: 'hsla(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', border: '1px solid hsla(0, 0%, 0%, 0.1)' }}>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={20} style={{ color: '#FF6900' }} />
              Time Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessionLoading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                Loading session...
              </div>
            ) : currentSession ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Session Status */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: getSessionStatusColor(currentSession.status).replace('bg-', '').replace('-500', '')
                    }} />
                    <span style={{ fontWeight: '500', textTransform: 'capitalize' }}>
                      {currentSession.status === 'active' ? 'Attivo' : 
                       currentSession.status === 'break' ? 'In Pausa' : 
                       currentSession.status === 'overtime' ? 'Straordinario' : currentSession.status}
                    </span>
                  </div>
                  <Badge variant={currentSession.isOvertime ? 'destructive' : 'default'}>
                    {currentSession.isOvertime ? 'Overtime' : 'Regular'}
                  </Badge>
                </div>

                {/* Session Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Tempo Lavorato
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}>
                      {formatTime(currentSession.elapsedMinutes)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Pause
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}>
                      {formatTime(currentSession.breakMinutes)}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {currentSession.status === 'active' && (
                    <>
                      <Button
                        onClick={() => clockMutation.mutate('start-break')}
                        disabled={clockMutation.isPending}
                        variant="outline"
                        size="sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Coffee size={16} />
                        Inizia Pausa
                      </Button>
                      <Button
                        onClick={() => clockMutation.mutate('clock-out')}
                        disabled={clockMutation.isPending}
                        variant="destructive"
                        size="sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <StopCircle size={16} />
                        Termina Giornata
                      </Button>
                    </>
                  )}
                  {currentSession.status === 'break' && (
                    <Button
                      onClick={() => clockMutation.mutate('end-break')}
                      disabled={clockMutation.isPending}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <PlayCircle size={16} />
                      Fine Pausa
                    </Button>
                  )}
                </div>

                {currentSession.requiresBreak && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      È consigliabile fare una pausa dopo {Math.floor(currentSession.elapsedMinutes / 60)} ore di lavoro.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ color: '#6b7280' }}>Nessuna sessione attiva</div>
                <Button
                  onClick={() => clockMutation.mutate('clock-in')}
                  disabled={clockMutation.isPending}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
                >
                  <PlayCircle size={16} />
                  Inizia Giornata
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leave Balance Card */}
        <Card style={{ background: 'hsla(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', border: '1px solid hsla(0, 0%, 0%, 0.1)' }}>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={20} style={{ color: '#7B2CBF' }} />
              Saldo Ferie & Permessi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ textAlign: 'center', padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>
                  {displayBalance.ferieRimanenti}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Ferie Rimanenti</div>
                <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                  {displayBalance.ferieUsate}/{displayBalance.ferieAnno} usate
                </div>
              </div>
              <div style={{ textAlign: 'center', padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0ea5e9' }}>
                  {displayBalance.permessiRimanenti}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Permessi ROL</div>
                <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                  {displayBalance.permessiUsati}/{displayBalance.permessiROL} usati
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card style={{ background: 'hsla(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', border: '1px solid hsla(0, 0%, 0, 0.1)' }}>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={20} style={{ color: '#FF6900' }} />
              Azioni Rapide
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
              <Button variant="outline" style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '80px' }}>
                <Calendar size={20} />
                <span style={{ fontSize: '12px' }}>Richiedi Ferie</span>
              </Button>
              <Button variant="outline" style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '80px' }}>
                <FileText size={20} />
                <span style={{ fontSize: '12px' }}>I Miei Documenti</span>
              </Button>
              <Button variant="outline" style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '80px' }}>
                <User size={20} />
                <span style={{ fontSize: '12px' }}>Profilo</span>
              </Button>
              <Button variant="outline" style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '80px' }}>
                <Home size={20} />
                <span style={{ fontSize: '12px' }}>Buste Paga</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Requests Card */}
        <Card style={{ background: 'hsla(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', border: '1px solid hsla(0, 0%, 0, 0.1)' }}>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} style={{ color: '#7B2CBF' }} />
              Richieste Recenti
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentRequests && recentRequests.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentRequests.slice(0, 3).map((request: any) => (
                  <div key={request.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {request.stato === 'approved' ? (
                        <CheckCircle size={16} style={{ color: '#059669' }} />
                      ) : request.stato === 'pending' ? (
                        <Clock size={16} style={{ color: '#d97706' }} />
                      ) : (
                        <AlertCircle size={16} style={{ color: '#dc2626' }} />
                      )}
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '500' }}>
                          {request.type || 'Richiesta'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {new Date(request.createdAt || Date.now()).toLocaleDateString('it-IT')}
                        </div>
                      </div>
                    </div>
                    <Badge variant={
                      request.stato === 'approved' ? 'default' :
                      request.stato === 'pending' ? 'secondary' : 'destructive'
                    }>
                      {request.stato === 'approved' ? 'Approvata' :
                       request.stato === 'pending' ? 'In Attesa' : 'Rifiutata'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                Nessuna richiesta recente
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}