import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Euro, User, TrendingUp, GripVertical } from 'lucide-react';
import { motion } from 'framer-motion';

interface Deal {
  id: string;
  ownerUserId: string;
  estimatedValue?: number | null;
  probability?: number | null;
  agingDays?: number | null;
  stage: string;
  customerId?: string | null;
  sourceChannel?: string | null;
  preferredContactChannel?: string | null;
  ownerName?: string | null;
  customerName?: string | null;
  customerType?: 'b2b' | 'b2c' | null;
}

interface DealCardProps {
  deal: Deal;
}

// Helper: Format currency
const formatCurrency = (value?: number | null): string => {
  if (!value) return '€0';
  if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `€${(value / 1000).toFixed(0)}k`;
  return `€${value.toFixed(0)}`;
};

// Helper: Get aging color
const getAgingColor = (days?: number | null): string => {
  if (!days) return 'hsl(var(--muted))';
  if (days < 30) return '#10b981';
  if (days < 60) return '#f59e0b';
  return '#ef4444';
};

// Helper: Translate inbound channel to Italian
const translateInboundChannel = (channel?: string | null): string => {
  const translations: Record<string, string> = {
    'landing_page': 'Landing',
    'form_web': 'Form Web',
    'whatsapp_inbound': 'WhatsApp',
    'cold_call': 'Cold Call',
    'linkedin_campaign': 'LinkedIn',
    'partner_referral': 'Partner',
    'social': 'Social',
    'event': 'Evento'
  };
  return channel ? translations[channel] || channel : '';
};

// Helper: Translate outbound channel to Italian
const translateOutboundChannel = (channel?: string | null): string => {
  const translations: Record<string, string> = {
    'email': 'Email',
    'telegram': 'Telegram',
    'whatsapp': 'WhatsApp',
    'phone': 'Telefono',
    'linkedin': 'LinkedIn',
    'social_dm': 'Social DM',
    'sms': 'SMS'
  };
  return channel ? translations[channel] || channel : '';
};

export function DealCard({ deal }: DealCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const agingColor = getAgingColor(deal.agingDays);

  return (
    <div ref={setNodeRef} style={style} {...attributes} data-testid={`kanban-deal-${deal.id}`}>
      <Card
        className="p-3 cursor-move hover:shadow-md transition-shadow glass-card border-l-4"
        style={{ borderLeftColor: agingColor }}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1">
            <div
              className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
              style={{ background: 'hsl(var(--brand-orange) / 0.2)', color: 'hsl(var(--brand-orange))' }}
              title={deal.ownerName || 'Owner'}
            >
              {deal.ownerName ? deal.ownerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : deal.ownerUserId.slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate" title={deal.customerName || deal.customerType || undefined}>
                {deal.customerName || (deal.customerId ? `Cliente ${deal.customerId.slice(0, 8)}` : `Deal ${deal.id.slice(0, 8)}`)}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {deal.ownerName || `Owner: ${deal.ownerUserId.slice(0, 8)}`}
              </div>
            </div>
          </div>
          <div {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <Euro className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-semibold">{formatCurrency(deal.estimatedValue)}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {deal.probability || 0}%
          </Badge>
        </div>

        <div className="space-y-2">
          <Progress value={deal.probability || 0} className="h-1" />
          
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3 w-3" style={{ color: agingColor }} />
              <span className="text-xs" style={{ color: agingColor }}>
                {deal.agingDays || 0} giorni
              </span>
            </div>
          </div>
          
          {/* Channel badges */}
          {(deal.sourceChannel || deal.preferredContactChannel) && (
            <div className="flex flex-wrap gap-1 pt-1">
              {deal.sourceChannel && (
                <Badge 
                  variant="outline" 
                  className="text-[10px] px-1.5 py-0 h-4 border-green-600/30 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/20"
                  data-testid={`badge-inbound-${deal.id}`}
                >
                  ↓ {translateInboundChannel(deal.sourceChannel)}
                </Badge>
              )}
              {deal.preferredContactChannel && (
                <Badge 
                  variant="outline" 
                  className="text-[10px] px-1.5 py-0 h-4 border-blue-600/30 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20"
                  data-testid={`badge-outbound-${deal.id}`}
                >
                  ↑ {translateOutboundChannel(deal.preferredContactChannel)}
                </Badge>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
