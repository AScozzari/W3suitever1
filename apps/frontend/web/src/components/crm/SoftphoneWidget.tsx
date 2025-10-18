import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  PhoneOff,
  PhoneIncoming,
  PhoneOutgoing,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Minimize2,
  Maximize2,
  X,
  Clock,
  User
} from 'lucide-react';

interface SoftphoneWidgetProps {
  extensionId?: string;
  onClose?: () => void;
}

type CallState = 'idle' | 'ringing' | 'connecting' | 'active' | 'ended';

export function SoftphoneWidget({ extensionId, onClose }: SoftphoneWidgetProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [callState, setCallState] = useState<CallState>('idle');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [currentCall, setCurrentCall] = useState<any>(null);

  // Call duration timer
  useEffect(() => {
    if (callState === 'active') {
      const interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCallDuration(0);
    }
  }, [callState]);

  // Format call duration (MM:SS)
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Mock SIP registration (TODO: Replace with real SIP.js)
  useEffect(() => {
    if (extensionId) {
      // Simulate SIP registration delay
      setTimeout(() => {
        setIsRegistered(true);
      }, 1500);
    }
  }, [extensionId]);

  const handleCall = () => {
    if (!phoneNumber) return;
    setCallState('connecting');
    
    // Mock call connection (TODO: Replace with real SIP.js call)
    setTimeout(() => {
      setCallState('active');
      setCurrentCall({
        number: phoneNumber,
        direction: 'outbound',
        startTime: new Date()
      });
    }, 2000);
  };

  const handleHangup = () => {
    setCallState('ended');
    setTimeout(() => {
      setCallState('idle');
      setPhoneNumber('');
      setCurrentCall(null);
    }, 1000);
  };

  const handleAnswer = () => {
    setCallState('active');
  };

  const handleReject = () => {
    setCallState('ended');
    setTimeout(() => {
      setCallState('idle');
      setCurrentCall(null);
    }, 1000);
  };

  const addDigit = (digit: string) => {
    setPhoneNumber((prev) => prev + digit);
  };

  const handleBackspace = () => {
    setPhoneNumber((prev) => prev.slice(0, -1));
  };

  if (isMinimized) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="fixed bottom-6 left-6 z-50"
        data-testid="softphone-widget-minimized"
      >
        <Button
          onClick={() => setIsMinimized(false)}
          className="rounded-full w-16 h-16 bg-green-600 hover:bg-green-700 shadow-lg"
          data-testid="button-maximize-softphone"
        >
          <Phone className="w-6 h-6 text-green-100" />
        </Button>
        {callState === 'active' && (
          <Badge className="absolute -top-1 -right-1 bg-red-600 text-white animate-pulse">
            {formatDuration(callDuration)}
          </Badge>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-6 left-6 z-50"
      data-testid="softphone-widget"
    >
      <Card className="w-80 bg-gray-900 border-gray-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-white" />
              <span className="font-semibold text-white">Softphone</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-white hover:bg-white/20"
                onClick={() => setIsMinimized(true)}
                data-testid="button-minimize-softphone"
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
              {onClose && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-white hover:bg-white/20"
                  onClick={onClose}
                  data-testid="button-close-softphone"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          
          {/* Status Badge */}
          <Badge 
            variant="outline" 
            className={`${
              isRegistered 
                ? 'bg-green-500/20 text-green-300 border-green-500/30' 
                : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
            }`}
          >
            <div className={`w-2 h-2 rounded-full mr-2 ${isRegistered ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
            {isRegistered ? 'Online' : 'Connecting...'}
          </Badge>
        </div>

        {/* Call Info / Dialer */}
        <div className="p-4 space-y-4">
          {callState === 'idle' && (
            <>
              <Input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter phone number"
                className="text-lg text-center bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
                data-testid="input-phone-number"
              />

              {/* Dialpad */}
              <div className="grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
                  <Button
                    key={digit}
                    variant="outline"
                    className="h-12 bg-gray-800 border-gray-700 hover:bg-gray-700 text-white"
                    onClick={() => addDigit(digit)}
                    data-testid={`button-dial-${digit}`}
                  >
                    {digit}
                  </Button>
                ))}
              </div>

              {/* Call Button */}
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
                onClick={handleCall}
                disabled={!phoneNumber || !isRegistered}
                data-testid="button-call"
              >
                <Phone className="w-5 h-5 mr-2" />
                Call
              </Button>
            </>
          )}

          {callState === 'ringing' && (
            <div className="text-center py-8">
              <PhoneIncoming className="w-16 h-16 mx-auto mb-4 text-blue-400 animate-pulse" />
              <p className="text-white font-semibold mb-2">Incoming Call</p>
              <p className="text-gray-400 mb-6">{currentCall?.number}</p>
              <div className="flex gap-4 justify-center">
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  size="lg"
                  onClick={handleAnswer}
                  data-testid="button-answer"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Answer
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  size="lg"
                  onClick={handleReject}
                  data-testid="button-reject"
                >
                  <PhoneOff className="w-5 h-5 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          )}

          {callState === 'connecting' && (
            <div className="text-center py-8">
              <PhoneOutgoing className="w-16 h-16 mx-auto mb-4 text-blue-400 animate-pulse" />
              <p className="text-white font-semibold mb-2">Connecting...</p>
              <p className="text-gray-400">{phoneNumber}</p>
            </div>
          )}

          {callState === 'active' && (
            <div className="text-center py-4">
              <div className="mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 mx-auto mb-4 flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
                <p className="text-white font-semibold mb-1">{currentCall?.number}</p>
                <div className="flex items-center justify-center gap-2 text-green-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-lg font-mono">{formatDuration(callDuration)}</span>
                </div>
              </div>

              {/* Call Controls */}
              <div className="flex gap-2 justify-center mb-4">
                <Button
                  variant="outline"
                  size="icon"
                  className={`rounded-full ${isMuted ? 'bg-red-600/20 border-red-600' : 'bg-gray-800 border-gray-700'}`}
                  onClick={() => setIsMuted(!isMuted)}
                  data-testid="button-mute"
                >
                  {isMuted ? <MicOff className="w-5 h-5 text-red-400" /> : <Mic className="w-5 h-5" />}
                </Button>
                
                <Button
                  variant="outline"
                  size="icon"
                  className={`rounded-full ${!isSpeakerOn ? 'bg-red-600/20 border-red-600' : 'bg-gray-800 border-gray-700'}`}
                  onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                  data-testid="button-speaker"
                >
                  {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-red-400" />}
                </Button>
              </div>

              {/* Hangup Button */}
              <Button
                className="w-full bg-red-600 hover:bg-red-700"
                size="lg"
                onClick={handleHangup}
                data-testid="button-hangup"
              >
                <PhoneOff className="w-5 h-5 mr-2" />
                End Call
              </Button>
            </div>
          )}

          {callState === 'ended' && (
            <div className="text-center py-8">
              <PhoneOff className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-white font-semibold">Call Ended</p>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="px-4 pb-4">
          <p className="text-xs text-gray-500 text-center">
            WebRTC Softphone (Beta) - SIP.js integration pending
          </p>
        </div>
      </Card>
    </motion.div>
  );
}
