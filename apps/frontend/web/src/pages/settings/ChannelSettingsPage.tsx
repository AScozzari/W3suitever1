import { useState } from 'react';
import { motion } from 'framer-motion';
import { PhoneVoIPConfig } from '@/components/crm/PhoneVoIPConfig';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  Mail, 
  MessageCircle,
  MessageSquare,
  Send,
  Settings,
  Zap,
  Shield,
  CheckCircle2
} from 'lucide-react';

// Import WhatsApp icon from react-icons
import { FaWhatsapp, FaTelegram } from 'react-icons/fa';

interface ChannelCard {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  gradient: string;
  enabled: boolean;
  configured: boolean;
  features: string[];
}

const channels: ChannelCard[] = [
  {
    id: 'phone',
    name: 'Phone (VoIP)',
    description: 'Enterprise telephony with WebRTC softphone, multi-store trunks, and call recording',
    icon: Phone,
    color: '#10b981', // green
    gradient: 'from-green-500/40 to-emerald-600/50',
    enabled: true,
    configured: false,
    features: ['WebRTC Softphone', 'Multi-trunk SIP', 'Call Recording', 'CDR Analytics']
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Send and receive WhatsApp messages with automated responses',
    icon: FaWhatsapp,
    color: '#25d366', // WhatsApp green
    gradient: 'from-green-400/40 to-green-500/50',
    enabled: false,
    configured: false,
    features: ['Business API', 'Templates', 'Automation', 'Analytics']
  },
  {
    id: 'email',
    name: 'Email',
    description: 'Professional email campaigns with templates and tracking',
    icon: Mail,
    color: '#6366f1', // indigo (più saturo)
    gradient: 'from-indigo-500/40 to-purple-600/50',
    enabled: false,
    configured: false,
    features: ['SMTP Config', 'Templates', 'Tracking', 'Analytics']
  },
  {
    id: 'telegram',
    name: 'Telegram Bot',
    description: 'Automated Telegram bot for customer support and notifications',
    icon: FaTelegram,
    color: '#0088cc', // Telegram blue
    gradient: 'from-cyan-500/40 to-blue-600/50',
    enabled: false,
    configured: false,
    features: ['Bot API', 'Commands', 'Automation', 'Inline Buttons']
  },
  {
    id: 'sms',
    name: 'SMS (Twilio)',
    description: 'Send SMS messages for notifications and 2FA',
    icon: MessageSquare,
    color: '#ef4444', // red
    gradient: 'from-red-500/40 to-pink-600/50',
    enabled: false,
    configured: false,
    features: ['Twilio Integration', '2FA', 'Notifications', 'Templates']
  }
];

// Framer Motion Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
};

export default function ChannelSettingsPage() {
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);

  const handleChannelClick = (channelId: string) => {
    // Toggle: if clicking on already selected channel, close it
    if (selectedChannel === channelId) {
      setSelectedChannel(null);
    } else {
      setSelectedChannel(channelId);
    }
  };

  return (
    <div>

      {/* Channels Menu Bar - Horizontal Compact Cards */}
      <motion.div 
        className="flex flex-wrap gap-3 mb-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {channels.map((channel) => {
          const Icon = channel.icon;
          const isSelected = selectedChannel === channel.id;
          return (
            <motion.div
              key={channel.id}
              variants={cardVariants}
              whileHover={{ scale: channel.enabled ? 1.02 : 1, transition: { type: "spring", stiffness: 300 } }}
              whileTap={{ scale: channel.enabled ? 0.98 : 1 }}
            >
              <Card 
                className={`
                  relative overflow-hidden
                  px-4 py-3
                  flex items-center gap-3
                  ${isSelected 
                    ? 'bg-white border-2 shadow-lg' 
                    : 'bg-white/80 backdrop-blur-sm border border-gray-200 hover:border-gray-300'
                  }
                  transition-all duration-200
                  ${channel.enabled ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}
                `}
                style={isSelected ? { borderColor: channel.color } : {}}
                onClick={() => channel.enabled && handleChannelClick(channel.id)}
                data-testid={`card-channel-${channel.id}`}
              >
                {/* Colored left border indicator */}
                {isSelected && (
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-1"
                    style={{ backgroundColor: channel.color }}
                  />
                )}
                
                {/* Icon */}
                <div 
                  className="p-2 rounded-lg flex-shrink-0"
                  style={{ 
                    backgroundColor: `${channel.color}15`,
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color: channel.color }} />
                </div>
                
                {/* Channel Name */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-800 truncate">
                    {channel.name}
                  </h3>
                  {channel.enabled && channel.configured && (
                    <p className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                      Configured
                    </p>
                  )}
                </div>
                
                {/* Status Badge */}
                <div className="flex-shrink-0">
                  {channel.enabled ? (
                    <Badge 
                      variant="outline" 
                      className="text-xs border-green-300 text-green-700 bg-green-50"
                    >
                      Active
                    </Badge>
                  ) : (
                    <Badge 
                      variant="outline" 
                      className="text-xs border-gray-300 text-gray-500 bg-gray-50"
                    >
                      Soon
                    </Badge>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Phone/VoIP Configuration - Embedded */}
      {selectedChannel === 'phone' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <PhoneVoIPConfig 
            visible={true} 
            onClose={() => setSelectedChannel(null)} 
          />
        </motion.div>
      )}

      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8"
      >
        <Card className="p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-md border border-white/10">
          <div className="flex items-start gap-4">
            <Shield className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
            <div>
              <h4 className="text-white font-semibold mb-2">
                Secure Multi-Channel Communication
              </h4>
              <p className="text-gray-300 text-sm">
                All communication channels are encrypted and comply with GDPR regulations. 
                Configure each channel separately to enable seamless customer engagement across multiple platforms.
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
