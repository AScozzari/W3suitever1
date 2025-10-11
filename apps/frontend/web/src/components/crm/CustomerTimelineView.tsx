import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  UserPlus,
  Target,
  Megaphone,
  Mail,
  Phone,
  MessageSquare,
  Calendar,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';

interface CustomerTimelineViewProps {
  customerId: string;
}

export function CustomerTimelineView({ customerId }: CustomerTimelineViewProps) {
  // Fetch interactions
  const { data: interactions, isLoading: loadingInteractions } = useQuery({
    queryKey: ['/api/crm/interactions', { entityId: customerId }],
  });

  // Fetch leads
  const { data: leads } = useQuery({
    queryKey: ['/api/crm/leads', { customerId }],
  });

  // Fetch deals
  const { data: deals } = useQuery({
    queryKey: ['/api/crm/deals', { customerId }],
  });

  // Combine all events into timeline
  const timelineEvents = [
    ...(interactions?.data?.map((i: any) => ({
      type: 'interaction',
      icon: getInteractionIcon(i.channel),
      color: getInteractionColor(i.channel),
      title: `${i.channel} - ${i.direction}`,
      description: i.notes || i.outcome,
      date: new Date(i.occurredAt),
      metadata: { duration: i.durationSeconds, outcome: i.outcome }
    })) || []),
    ...(leads?.data?.map((l: any) => ({
      type: 'lead',
      icon: UserPlus,
      color: 'hsl(var(--brand-purple))',
      title: `Nuovo Lead: ${l.firstName} ${l.lastName}`,
      description: `Fonte: ${l.sourceChannel || 'N/A'} | Campagna: ${l.campaignId || 'N/A'}`,
      date: new Date(l.createdAt),
      metadata: { status: l.status, score: l.leadScore }
    })) || []),
    ...(deals?.data?.map((d: any) => ({
      type: 'deal',
      icon: Target,
      color: 'hsl(var(--brand-orange))',
      title: `Deal ${d.status}: €${d.estimatedValue?.toLocaleString()}`,
      description: `Pipeline: ${d.stage} | Probabilità: ${d.probability}%`,
      date: new Date(d.createdAt),
      metadata: { status: d.status, value: d.estimatedValue }
    })) || []),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  if (loadingInteractions) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (timelineEvents.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Clock className="h-12 w-12 mx-auto mb-4" style={{ color: '#9ca3af' }} />
        <p className="text-lg font-medium" style={{ color: '#6b7280' }}>
          Nessun evento nella timeline
        </p>
        <p className="text-sm mt-2" style={{ color: '#9ca3af' }}>
          Inizia a interagire con questo cliente per vedere la sua storia
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-6" style={{ color: '#1a1a1a' }}>
        Customer Journey Timeline
      </h3>

      <div className="relative">
        {/* Vertical Timeline Line */}
        <div 
          className="absolute left-8 top-0 bottom-0 w-0.5"
          style={{ background: 'linear-gradient(to bottom, hsl(var(--brand-purple)), hsl(var(--brand-orange)))' }}
        />

        {/* Timeline Events */}
        <div className="space-y-6">
          {timelineEvents.map((event, index) => {
            const Icon = event.icon;
            return (
              <div key={index} className="relative pl-20">
                {/* Icon Circle */}
                <div 
                  className="absolute left-0 flex items-center justify-center w-16 h-16 rounded-full"
                  style={{
                    background: `${event.color}15`,
                    border: `2px solid ${event.color}`,
                  }}
                >
                  <Icon className="h-6 w-6" style={{ color: event.color }} />
                </div>

                {/* Event Card */}
                <Card 
                  className="p-4 transition-all hover:shadow-md"
                  style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${event.color}30`,
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold" style={{ color: '#1a1a1a' }}>
                        {event.title}
                      </h4>
                      <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
                        {event.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium" style={{ color: '#9ca3af' }}>
                        {event.date.toLocaleDateString('it-IT')}
                      </p>
                      <p className="text-xs" style={{ color: '#9ca3af' }}>
                        {event.date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {/* Metadata */}
                  {event.metadata && (
                    <div className="flex gap-2 mt-3">
                      {event.metadata.status && (
                        <Badge 
                          variant={event.metadata.status === 'won' ? 'default' : 'outline'}
                          className="text-xs"
                        >
                          {event.metadata.status}
                        </Badge>
                      )}
                      {event.metadata.score && (
                        <Badge variant="outline" className="text-xs">
                          Score: {event.metadata.score}
                        </Badge>
                      )}
                      {event.metadata.duration && (
                        <Badge variant="outline" className="text-xs">
                          {Math.floor(event.metadata.duration / 60)}m {event.metadata.duration % 60}s
                        </Badge>
                      )}
                    </div>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function getInteractionIcon(channel: string) {
  const icons: Record<string, any> = {
    email: Mail,
    phone: Phone,
    sms: MessageSquare,
    whatsapp: MessageSquare,
    meeting: Calendar,
    default: MessageSquare,
  };
  return icons[channel] || icons.default;
}

function getInteractionColor(channel: string) {
  const colors: Record<string, string> = {
    email: '#3b82f6',
    phone: '#10b981',
    sms: '#8b5cf6',
    whatsapp: '#22c55e',
    meeting: '#f59e0b',
    default: '#6b7280',
  };
  return colors[channel] || colors.default;
}
