import { useState } from 'react';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { CRMCommandPalette } from '@/components/crm/CRMCommandPalette';
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
  LayoutDashboard,
  Megaphone,
  UserPlus,
  TrendingUp,
  Users,
  CheckSquare,
  BarChart3,
  Zap,
  Shield,
  CheckCircle2
} from 'lucide-react';
import { useTenantNavigation } from '@/hooks/useTenantSafety';
import { useLocation } from 'wouter';

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
    gradient: 'from-green-500/20 to-emerald-600/20',
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
    gradient: 'from-green-400/20 to-green-500/20',
    enabled: false,
    configured: false,
    features: ['Business API', 'Templates', 'Automation', 'Analytics']
  },
  {
    id: 'email',
    name: 'Email',
    description: 'Professional email campaigns with templates and tracking',
    icon: Mail,
    color: '#3b82f6', // blue
    gradient: 'from-blue-500/20 to-indigo-600/20',
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
    gradient: 'from-cyan-500/20 to-blue-600/20',
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
    gradient: 'from-red-500/20 to-rose-600/20',
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
  const [currentModule, setCurrentModule] = useState('crm');
  const [location] = useLocation();
  const { navigate, buildUrl } = useTenantNavigation();

  const [isPhoneConfigOpen, setIsPhoneConfigOpen] = useState(false);

  // Navigation tabs for CRM
  const tabs = [
    { icon: LayoutDashboard, label: 'Dashboard', path: buildUrl('crm/dashboard') },
    { icon: Megaphone, label: 'Campaigns', path: buildUrl('crm/campaigns') },
    { icon: TrendingUp, label: 'Pipeline', path: buildUrl('crm/pipeline') },
    { icon: UserPlus, label: 'Leads', path: buildUrl('crm/leads') },
    { icon: Users, label: 'Customers', path: buildUrl('crm/customers') },
    { icon: CheckSquare, label: 'Activities', path: buildUrl('crm/activities') },
    { icon: BarChart3, label: 'Analytics', path: buildUrl('crm/analytics') },
    { icon: Settings, label: 'Channels', path: buildUrl('crm/channels'), active: true }
  ];

  const handleChannelClick = (channelId: string) => {
    if (channelId === 'phone') {
      setIsPhoneConfigOpen(true);
    } else {
      // Future: open config dialog for other channels
      console.log(`Channel ${channelId} configuration coming soon`);
    }
  };

  return (
    <Layout 
      currentModule={currentModule} 
      onModuleChange={setCurrentModule}
      tabs={tabs}
      showModuleSwitcher={true}
    >
      <CRMCommandPalette />
      
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-orange-500/20 backdrop-blur-sm border border-white/10">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">
              Channel Settings
            </h1>
            <p className="text-gray-400 text-sm">
              Configure communication channels for your CRM
            </p>
          </div>
        </div>
      </div>

      {/* Channels Grid */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {channels.map((channel) => {
          const Icon = channel.icon;
          return (
            <motion.div
              key={channel.id}
              variants={cardVariants}
              whileHover={{ y: -8, transition: { type: "spring", stiffness: 400 } }}
            >
              <Card 
                className={`
                  p-6 h-full
                  bg-gradient-to-br ${channel.gradient} backdrop-blur-md
                  border border-white/10 hover:border-white/20
                  transition-all duration-300
                  ${channel.enabled ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}
                `}
                onClick={() => channel.enabled && handleChannelClick(channel.id)}
                data-testid={`card-channel-${channel.id}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div 
                    className="p-3 rounded-xl"
                    style={{ 
                      background: `linear-gradient(135deg, ${channel.color}20, ${channel.color}40)`,
                      border: `1px solid ${channel.color}30`
                    }}
                  >
                    <Icon className="w-8 h-8" style={{ color: channel.color }} />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {channel.enabled ? (
                      <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/30">
                        <Zap className="w-3 h-3 mr-1" />
                        Available
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                        Coming Soon
                      </Badge>
                    )}
                    
                    {channel.configured && (
                      <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Configured
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {channel.name}
                  </h3>
                  <p className="text-sm text-gray-300 mb-4">
                    {channel.description}
                  </p>

                  {/* Features List */}
                  <div className="space-y-2">
                    {channel.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-gray-400">
                        <CheckCircle2 className="w-3 h-3 text-green-400" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                {channel.enabled && (
                  <Button 
                    className="w-full mt-4"
                    variant="outline"
                    style={{ 
                      borderColor: `${channel.color}50`,
                      color: channel.color
                    }}
                    data-testid={`button-configure-${channel.id}`}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Configure Channel
                  </Button>
                )}
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

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

      {/* Phone Config Dialog (Task 4) */}
      {isPhoneConfigOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="w-full max-w-4xl mx-4 p-6 bg-gray-900 border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Phone (VoIP) Configuration</h2>
              <Button 
                variant="ghost" 
                onClick={() => setIsPhoneConfigOpen(false)}
                data-testid="button-close-phone-config"
              >
                Close
              </Button>
            </div>
            <p className="text-gray-400">VoIP configuration dialog will be implemented in Task 4</p>
          </Card>
        </div>
      )}
    </Layout>
  );
}
