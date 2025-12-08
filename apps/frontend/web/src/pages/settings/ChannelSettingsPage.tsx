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
        className="flex flex-wrap gap-4 mb-8"
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
              whileHover={{ 
                scale: 1.03,
                y: -4,
                transition: { type: "spring", stiffness: 400, damping: 17 } 
              }}
              whileTap={{ scale: 0.97 }}
            >
              <Card 
                className={`
                  relative overflow-hidden
                  px-5 py-4
                  flex items-center gap-3
                  ${isSelected 
                    ? 'bg-white border-2 shadow-2xl' 
                    : 'bg-white border-2 border-gray-100 hover:border-gray-200 shadow-md hover:shadow-xl'
                  }
                  transition-all duration-300
                  cursor-pointer
                  group
                `}
                style={isSelected ? { borderColor: channel.color } : {}}
                onClick={() => handleChannelClick(channel.id)}
                data-testid={`card-channel-${channel.id}`}
              >
                {/* Gradient background overlay on hover */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300"
                  style={{ 
                    background: `linear-gradient(135deg, ${channel.color}20, ${channel.color}40)`
                  }}
                />
                
                {/* Colored left border indicator */}
                <div 
                  className={`absolute left-0 top-0 bottom-0 transition-all duration-300 ${
                    isSelected ? 'w-1.5' : 'w-0 group-hover:w-1'
                  }`}
                  style={{ backgroundColor: channel.color }}
                />
                
                {/* Icon with animated background */}
                <div 
                  className="p-2.5 rounded-xl flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 relative z-10"
                  style={{ 
                    backgroundColor: `${channel.color}20`,
                    boxShadow: `0 2px 8px ${channel.color}30`
                  }}
                >
                  <Icon className="w-6 h-6 transition-all duration-300" style={{ color: channel.color }} />
                </div>
                
                {/* Channel Name */}
                <div className="flex-1 min-w-0 relative z-10">
                  <h3 className="text-sm font-bold text-gray-800 truncate group-hover:text-gray-900 transition-colors duration-300">
                    {channel.name}
                  </h3>
                  {channel.configured && (
                    <p className="text-xs text-green-600 flex items-center gap-1 mt-1 font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      Configured
                    </p>
                  )}
                  {!channel.enabled && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1 font-medium">
                      Coming Soon
                    </p>
                  )}
                </div>
                
                {/* Status Badge with glow effect */}
                <div className="flex-shrink-0 relative z-10">
                  {channel.enabled ? (
                    <Badge 
                      variant="outline" 
                      className="text-xs font-semibold border-green-400 text-green-700 bg-green-50 group-hover:bg-green-100 transition-colors duration-300"
                      style={{ boxShadow: '0 0 10px rgba(34, 197, 94, 0.2)' }}
                    >
                      Active
                    </Badge>
                  ) : (
                    <Badge 
                      variant="outline" 
                      className="text-xs font-semibold border-amber-400 text-amber-700 bg-amber-50 group-hover:bg-amber-100 transition-colors duration-300"
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
