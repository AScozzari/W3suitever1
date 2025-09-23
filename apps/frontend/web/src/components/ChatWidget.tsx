import React, { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Send, X, Minimize2, Bot, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Tippy SVG Icon Component
const TippyIcon = ({ size = 40, style = {} }: { size?: number; style?: React.CSSProperties }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 100 100" 
    style={style}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Gradient definitions */}
    <defs>
      <radialGradient id="tippyGradient" cx="50%" cy="40%" r="50%">
        <stop offset="0%" stopColor="#ff8533" />
        <stop offset="100%" stopColor="#FF6900" />
      </radialGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    
    {/* Main head circle */}
    <circle 
      cx="50" 
      cy="50" 
      r="35" 
      fill="url(#tippyGradient)"
      filter="url(#glow)"
    />
    
    {/* White highlight for 3D effect */}
    <ellipse 
      cx="45" 
      cy="35" 
      rx="15" 
      ry="12" 
      fill="rgba(255,255,255,0.3)"
    />
    
    {/* Eyes */}
    <circle cx="38" cy="45" r="5" fill="white" />
    <circle cx="62" cy="45" r="5" fill="white" />
    <circle cx="39" cy="46" r="3" fill="#333" />
    <circle cx="61" cy="46" r="3" fill="#333" />
    
    {/* Smile */}
    <path 
      d="M 35 58 Q 50 68 65 58" 
      stroke="#333" 
      strokeWidth="2.5" 
      fill="none" 
      strokeLinecap="round"
    />
    
    {/* Small antenna/hair on top */}
    <ellipse cx="50" cy="18" rx="3" ry="5" fill="#FF6900" />
    <circle cx="50" cy="14" r="2" fill="#ff8533" />
  </svg>
);

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  isTyping?: boolean;
}

interface ChatWidgetProps {
  currentPage?: string;
  currentModule?: string;
}

export default function ChatWidget({ currentPage = '', currentModule = '' }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: `Ciao! Sono Tippy, il tuo assistente WindTre 🧡 

Posso aiutarti con:
• 📋 Informazioni su offerte e piani WindTre
• 💼 Supporto vendite e costruzione pitch
• 📊 Domande sui dati e documenti caricati
• 🌐 Ricerche in tempo reale

Come posso aiutarti oggi?`,
      sender: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatWidgetRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Chat mutation per inviare messaggi al backend
  const chatMutation = useMutation({
    mutationFn: async ({ message, context }: { message: string; context: any }) => {
      return await apiRequest('/api/ai/chat', {
        method: 'POST',
        body: { 
          message, 
          context,
          includeDocuments: true,
          includeWebSearch: true 
        },
      });
    },
    onSuccess: (response) => {
      setIsTyping(false);
      const assistantMessage: Message = {
        id: Date.now().toString(),
        content: response.data?.response || 'Mi dispiace, non sono riuscito a elaborare la tua richiesta.',
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => prev.map(msg => 
        msg.isTyping ? assistantMessage : msg
      ));
    },
    onError: (error: Error) => {
      setIsTyping(false);
      setMessages(prev => prev.filter(msg => !msg.isTyping));
      toast({
        title: "❌ Errore Chat",
        description: "Non sono riuscito a rispondere. Riprova tra poco.",
        variant: "destructive",
        duration: 3000,
      });
    }
  });

  // Auto-scroll ai nuovi messaggi
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Chiudi chat se clicchi fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatWidgetRef.current && !chatWidgetRef.current.contains(event.target as Node)) {
        if (isOpen && !isMinimized) {
          setIsMinimized(true);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, isMinimized]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    const typingMessage: Message = {
      id: 'typing',
      content: 'Tippy sta scrivendo...',
      sender: 'assistant',
      timestamp: new Date(),
      isTyping: true
    };

    setMessages(prev => [...prev, userMessage, typingMessage]);
    setIsTyping(true);
    
    // Context per l'AI
    const context = {
      currentPage,
      currentModule,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      pageTitle: document.title
    };

    chatMutation.mutate({ message: inputValue.trim(), context });
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Floating button quando chiuso
  if (!isOpen) {
    return (
      <div 
        ref={chatWidgetRef}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 1000
        }}
      >
        <button
          onClick={() => setIsOpen(true)}
          className="group"
          style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #FF6900, #ff8533)',
            borderRadius: '50%',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 8px 25px rgba(255, 105, 0, 0.3)',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'pulse 2s infinite'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 12px 35px rgba(255, 105, 0, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 105, 0, 0.3)';
          }}
          title="Chiedimi qualsiasi cosa!"
          data-testid="button-open-chat"
        >
          <TippyIcon size={40} />
        </button>
        
        {/* CSS for pulse animation */}
        <style jsx>{`
          @keyframes pulse {
            0% {
              box-shadow: 0 8px 25px rgba(255, 105, 0, 0.3);
            }
            50% {
              box-shadow: 0 8px 25px rgba(255, 105, 0, 0.6);
            }
            100% {
              box-shadow: 0 8px 25px rgba(255, 105, 0, 0.3);
            }
          }
        `}</style>
      </div>
    );
  }

  // Chat window aperto
  return (
    <div 
      ref={chatWidgetRef}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '380px',
        height: isMinimized ? '60px' : '500px',
        zIndex: 1000,
        transition: 'all 0.3s ease'
      }}
    >
      <div
        style={{
          background: 'hsla(0, 0%, 100%, 0.95)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid hsla(0, 0%, 100%, 0.2)',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #FF6900, #ff8533)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: '16px 16px 0 0'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <TippyIcon size={28} />
            </div>
            <div>
              <p style={{ color: 'white', fontWeight: 600, fontSize: '14px', margin: 0 }}>
                Tippy
              </p>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', margin: 0 }}>
                Assistente AI
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '6px',
                padding: '6px',
                cursor: 'pointer',
                color: 'white'
              }}
              title={isMinimized ? "Espandi" : "Minimizza"}
              data-testid="button-minimize-chat"
            >
              <Minimize2 size={16} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '6px',
                padding: '6px',
                cursor: 'pointer',
                color: 'white'
              }}
              title="Chiudi chat"
              data-testid="button-close-chat"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        {!isMinimized && (
          <>
            <div
              style={{
                flex: 1,
                padding: '16px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    flexDirection: message.sender === 'user' ? 'row-reverse' : 'row'
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: message.sender === 'user' 
                        ? 'linear-gradient(135deg, #7B2CBF, #9747ff)' 
                        : 'linear-gradient(135deg, #FF6900, #ff8533)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {message.sender === 'user' ? (
                      <User size={16} color="white" />
                    ) : (
                      <TippyIcon size={20} />
                    )}
                  </div>
                  
                  <div
                    style={{
                      background: message.sender === 'user' 
                        ? 'rgba(123, 44, 191, 0.1)' 
                        : 'rgba(255, 105, 0, 0.1)',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      maxWidth: '250px',
                      fontSize: '14px',
                      lineHeight: '1.4',
                      whiteSpace: 'pre-wrap',
                      opacity: message.isTyping ? 0.7 : 1,
                      animation: message.isTyping ? 'pulse 1.5s infinite' : 'none'
                    }}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div
              style={{
                padding: '12px 16px',
                borderTop: '1px solid rgba(0,0,0,0.1)',
                background: 'rgba(255,255,255,0.5)'
              }}
            >
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Scrivi il tuo messaggio..."
                  disabled={chatMutation.isPending}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid rgba(0,0,0,0.15)',
                    borderRadius: '12px',
                    fontSize: '14px',
                    resize: 'none',
                    outline: 'none',
                    maxHeight: '80px',
                    minHeight: '40px',
                    background: 'white'
                  }}
                  rows={1}
                  data-testid="input-chat-message"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || chatMutation.isPending}
                  style={{
                    background: inputValue.trim() && !chatMutation.isPending 
                      ? 'linear-gradient(135deg, #FF6900, #ff8533)' 
                      : '#e5e7eb',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px',
                    cursor: inputValue.trim() && !chatMutation.isPending ? 'pointer' : 'not-allowed',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Invia messaggio"
                  data-testid="button-send-message"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}