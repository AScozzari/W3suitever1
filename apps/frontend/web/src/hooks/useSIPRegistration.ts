import { useState, useEffect, useRef, useCallback } from 'react';
import { UserAgent, Registerer, Inviter, Invitation, Session, SessionState, RegistererState } from 'sip.js';
import { useQuery } from '@tanstack/react-query';
import { useTenant } from '@/contexts/TenantContext';

export interface SIPCredentials {
  sipUsername: string;
  sipPassword: string; // Plaintext - decrypted from backend
  sipServer: string;
  sipPort: number;
  wsPort: number;
  transport: string;
  authRealm: string;
  extension: string;
  displayName: string | null;
}

export interface SIPSessionInfo {
  id: string;
  direction: 'inbound' | 'outbound';
  remoteIdentity: string;
  state: SessionState;
  startTime?: Date;
}

interface CallData {
  callId: string;
  direction: 'inbound' | 'outbound';
  fromUri: string;
  toUri: string;
  startTs: Date;
  answerTs?: Date;
  endTs?: Date;
}

export interface UseSIPRegistrationReturn {
  isRegistered: boolean;
  isRegistering: boolean;
  registrationError: string | null;
  currentSession: SIPSessionInfo | null;
  makeCall: (phoneNumber: string) => Promise<void>;
  hangup: () => Promise<void>;
  answer: () => Promise<void>;
  reject: () => Promise<void>;
  mute: () => void;
  unmute: () => void;
  sendDTMF: (digit: string) => void;
  credentials: SIPCredentials | null;
}

export function useSIPRegistration(): UseSIPRegistrationReturn {
  const { currentTenant } = useTenant();
  const [isRegistered, setIsRegistered] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<SIPSessionInfo | null>(null);

  const userAgentRef = useRef<UserAgent | null>(null);
  const registererRef = useRef<Registerer | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const callDataRef = useRef<CallData | null>(null);

  // Fetch SIP credentials from backend
  // Note: queryClient automatically unwraps { data: ... } responses, so we get SIPCredentials directly
  const { data: credentials, isLoading, error } = useQuery<SIPCredentials>({
    queryKey: ['/api/voip/extensions/me'],
    refetchOnWindowFocus: false,
    retry: false, // Don't retry on 404 (no extension assigned)
    enabled: true, // Always try to fetch credentials
  });

  // Debug logging
  useEffect(() => {
    console.log('🔍 [SIP Hook] Query state:', {
      isLoading,
      hasError: !!error,
      hasCredentials: !!credentials,
      credentials: credentials
    });
    
    if (error) {
      console.error('❌ [SIP Hook] Query error:', error);
    }
  }, [isLoading, error, credentials]);

  // Create CDR after call ends
  const createCDR = useCallback(async (callData: CallData, disposition: 'answered' | 'no_answer' | 'busy' | 'failed') => {
    if (!credentials) return;

    try {
      const billsec = callData.answerTs && callData.endTs 
        ? Math.floor((callData.endTs.getTime() - callData.answerTs.getTime()) / 1000)
        : 0;

      const cdrPayload = {
        sipDomain: credentials.authRealm,
        callId: callData.callId,
        direction: callData.direction,
        fromUri: callData.fromUri,
        toUri: callData.toUri,
        startTs: callData.startTs.toISOString(),
        answerTs: callData.answerTs?.toISOString(),
        endTs: callData.endTs?.toISOString(),
        billsec,
        disposition,
        extNumber: credentials.extension,
      };

      console.log('📊 Creating CDR:', cdrPayload);

      const response = await fetch('/api/voip/cdr/client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Session': 'authenticated',
          ...(currentTenant?.id && { 'X-Tenant-ID': currentTenant.id }),
        },
        credentials: 'include',
        body: JSON.stringify(cdrPayload),
      });

      if (!response.ok) {
        throw new Error('Failed to create CDR');
      }

      const result = await response.json();
      console.log('✅ CDR created:', result.data?.id);
    } catch (err) {
      console.error('❌ Failed to create CDR:', err);
    }
  }, [credentials, currentTenant]);

  // Initialize remote audio element
  useEffect(() => {
    if (!remoteAudioRef.current) {
      const audio = new Audio();
      audio.autoplay = true;
      remoteAudioRef.current = audio;
    }
  }, []);

  // Setup SIP.js UserAgent and Registration
  useEffect(() => {
    if (!credentials || isLoading || error) {
      console.log('⏸️ [SIP Hook] Skipping setup:', { 
        hasCredentials: !!credentials, 
        isLoading, 
        hasError: !!error 
      });
      return;
    }

    const setupSIP = async () => {
      try {
        console.log('🚀 [SIP Hook] Starting SIP setup with credentials:', {
          sipServer: credentials.sipServer,
          wsPort: credentials.wsPort,
          extension: credentials.extension,
          transport: credentials.transport
        });
        
        setIsRegistering(true);
        setRegistrationError(null);

        // Determine WebSocket URL based on transport
        const wsPort = credentials.wsPort || 7443;
        const transport = credentials.transport?.toLowerCase() || 'wss';
        const protocol = transport === 'ws' ? 'ws' : 'wss';
        const wsServer = `${protocol}://${credentials.sipServer}:${wsPort}`;
        
        console.log('📡 [SIP Hook] Connecting to:', wsServer, `(transport: ${transport})`);

        // Create UserAgent configuration
        const userAgent = new UserAgent({
          uri: UserAgent.makeURI(`sip:${credentials.sipUsername}@${credentials.authRealm}`),
          transportOptions: {
            server: wsServer,
            connectionTimeout: 10
          },
          authorizationUsername: credentials.sipUsername,
          authorizationPassword: credentials.sipPassword,
          displayName: credentials.displayName || credentials.extension,
          logLevel: 'warn',
          delegate: {
            onInvite: (invitation: Invitation) => {
              console.log('📞 Incoming call from:', invitation.remoteIdentity.uri.toString());
              
              // Setup session tracking
              setupSession(invitation, 'inbound');
              
              // You can trigger UI notification here
              // For now, we just log it - the UI will react to currentSession state
            },
          },
        });

        // Start UserAgent
        await userAgent.start();
        console.log('✅ SIP UserAgent started');

        // Create Registerer
        const registerer = new Registerer(userAgent);
        
        // Setup registerer state change handler
        registerer.stateChange.addListener((state) => {
          console.log('📡 Registration state:', state);
          
          if (state === RegistererState.Registered) {
            setIsRegistered(true);
            setIsRegistering(false);
            setRegistrationError(null);
            console.log('✅ SIP Registered successfully');
          } else if (state === RegistererState.Unregistered) {
            setIsRegistered(false);
            setIsRegistering(false);
          }
        });

        // Register
        await registerer.register();

        // Store refs
        userAgentRef.current = userAgent;
        registererRef.current = registerer;

      } catch (err: any) {
        console.error('❌ SIP setup failed:', err);
        setRegistrationError(err.message || 'Failed to connect to SIP server');
        setIsRegistering(false);
        setIsRegistered(false);
      }
    };

    setupSIP();

    // Cleanup on unmount
    return () => {
      if (registererRef.current) {
        registererRef.current.unregister().catch(console.error);
      }
      if (userAgentRef.current) {
        userAgentRef.current.stop().catch(console.error);
      }
    };
  }, [credentials, isLoading, error]);

  // Setup session (outbound or inbound)
  const setupSession = useCallback((session: Session, direction: 'inbound' | 'outbound') => {
    sessionRef.current = session;

    // Initialize call tracking data
    const fromUri = direction === 'outbound' 
      ? `${credentials?.extension}@${credentials?.authRealm}`
      : session.remoteIdentity.uri.toString();
    const toUri = direction === 'outbound'
      ? session.remoteIdentity.uri.toString()
      : `${credentials?.extension}@${credentials?.authRealm}`;

    callDataRef.current = {
      callId: session.id,
      direction,
      fromUri,
      toUri,
      startTs: new Date(),
    };

    console.log('📊 Call tracking initialized:', callDataRef.current);

    // Track session state
    const updateSessionInfo = () => {
      setCurrentSession({
        id: session.id,
        direction,
        remoteIdentity: session.remoteIdentity.uri.toString(),
        state: session.state,
        startTime: session.state === SessionState.Established ? new Date() : undefined,
      });
    };

    updateSessionInfo();

    // Listen to state changes
    session.stateChange.addListener((state: SessionState) => {
      console.log('📞 Session state changed:', state);
      updateSessionInfo();

      // Track answer time when call is established
      if (state === SessionState.Established && callDataRef.current) {
        callDataRef.current.answerTs = new Date();
        console.log('📊 Call answered at:', callDataRef.current.answerTs);
      }

      // Create CDR when call ends
      if (state === SessionState.Terminated) {
        if (callDataRef.current) {
          callDataRef.current.endTs = new Date();
          
          // Determine disposition based on whether call was answered
          const disposition = callDataRef.current.answerTs ? 'answered' : 'no_answer';
          
          console.log('📊 Call ended, creating CDR...');
          createCDR(callDataRef.current, disposition);
        }
        
        sessionRef.current = null;
        setCurrentSession(null);
        callDataRef.current = null;
      }
    });

    // Setup remote audio stream
    const setupRemoteMedia = () => {
      const remoteStream = new MediaStream();
      const peerConnection = session.sessionDescriptionHandler?.peerConnection;

      if (peerConnection) {
        peerConnection.getReceivers().forEach((receiver) => {
          if (receiver.track) {
            remoteStream.addTrack(receiver.track);
          }
        });

        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
        }
      }
    };

    // Setup media when session is established
    if (session.state === SessionState.Established) {
      setupRemoteMedia();
    } else {
      session.stateChange.addListener((state: SessionState) => {
        if (state === SessionState.Established) {
          setupRemoteMedia();
        }
      });
    }
  }, [createCDR, credentials]);

  // Make outbound call
  const makeCall = useCallback(async (phoneNumber: string) => {
    if (!userAgentRef.current || !isRegistered) {
      throw new Error('SIP not registered');
    }

    try {
      const targetURI = UserAgent.makeURI(`sip:${phoneNumber}@${credentials?.authRealm}`);
      if (!targetURI) {
        throw new Error('Invalid phone number');
      }

      const inviter = new Inviter(userAgentRef.current, targetURI);
      setupSession(inviter, 'outbound');

      await inviter.invite();
      console.log('📞 Outbound call initiated to:', phoneNumber);
    } catch (err: any) {
      console.error('❌ Failed to make call:', err);
      throw err;
    }
  }, [isRegistered, credentials, setupSession]);

  // Hangup current call
  const hangup = useCallback(async () => {
    if (!sessionRef.current) return;

    try {
      switch (sessionRef.current.state) {
        case SessionState.Initial:
        case SessionState.Establishing:
          if (sessionRef.current instanceof Inviter) {
            await sessionRef.current.cancel();
          } else if (sessionRef.current instanceof Invitation) {
            await sessionRef.current.reject();
          }
          break;
        case SessionState.Established:
          await sessionRef.current.bye();
          break;
        default:
          break;
      }
      console.log('📞 Call ended');
    } catch (err: any) {
      console.error('❌ Failed to hangup:', err);
    }
  }, []);

  // Answer incoming call
  const answer = useCallback(async () => {
    if (!sessionRef.current || !(sessionRef.current instanceof Invitation)) return;

    try {
      await sessionRef.current.accept();
      console.log('📞 Incoming call answered');
    } catch (err: any) {
      console.error('❌ Failed to answer call:', err);
    }
  }, []);

  // Reject incoming call
  const reject = useCallback(async () => {
    if (!sessionRef.current || !(sessionRef.current instanceof Invitation)) return;

    try {
      await sessionRef.current.reject();
      console.log('📞 Incoming call rejected');
    } catch (err: any) {
      console.error('❌ Failed to reject call:', err);
    }
  }, []);

  // Mute microphone
  const mute = useCallback(() => {
    if (!sessionRef.current) return;

    const peerConnection = sessionRef.current.sessionDescriptionHandler?.peerConnection;
    if (peerConnection) {
      peerConnection.getSenders().forEach((sender) => {
        if (sender.track && sender.track.kind === 'audio') {
          sender.track.enabled = false;
        }
      });
      console.log('🔇 Microphone muted');
    }
  }, []);

  // Unmute microphone
  const unmute = useCallback(() => {
    if (!sessionRef.current) return;

    const peerConnection = sessionRef.current.sessionDescriptionHandler?.peerConnection;
    if (peerConnection) {
      peerConnection.getSenders().forEach((sender) => {
        if (sender.track && sender.track.kind === 'audio') {
          sender.track.enabled = true;
        }
      });
      console.log('🔊 Microphone unmuted');
    }
  }, []);

  // Send DTMF tone
  const sendDTMF = useCallback((digit: string) => {
    if (!sessionRef.current || sessionRef.current.state !== SessionState.Established) return;

    try {
      const peerConnection = sessionRef.current.sessionDescriptionHandler?.peerConnection;
      if (peerConnection) {
        const sender = peerConnection.getSenders().find(s => s.track?.kind === 'audio');
        if (sender && sender.dtmf) {
          sender.dtmf.insertDTMF(digit, 100, 70);
          console.log('📟 DTMF sent:', digit);
        }
      }
    } catch (err: any) {
      console.error('❌ Failed to send DTMF:', err);
    }
  }, []);

  return {
    isRegistered,
    isRegistering,
    registrationError,
    currentSession,
    makeCall,
    hangup,
    answer,
    reject,
    mute,
    unmute,
    sendDTMF,
    credentials,
  };
}
