import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LeadDetailModal } from './LeadDetailModal';
import { 
  Search, 
  Phone, 
  Mail, 
  Eye, 
  Store, 
  Calendar,
  User,
  Building,
  TrendingUp,
  X,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { LoadingState, ErrorState } from '@w3suite/frontend-kit/components/blocks';

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyName?: string;
  status: 'new' | 'qualified' | 'contacted' | 'converted' | 'lost';
  leadScore: number;
  conversionProbability?: number;
  originStoreName?: string;
  campaignName?: string;
  sourceChannel?: string;
  ownerName?: string;
  createdAt: string;
}

interface CampaignLeadsDialogProps {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  campaignName: string;
}

export function CampaignLeadsDialog({ 
  open, 
  onClose, 
  campaignId, 
  campaignName 
}: CampaignLeadsDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { data: leads, isLoading, error } = useQuery<Lead[]>({
    queryKey: ['/api/crm/leads', { campaign: campaignId }],
    enabled: open && !!campaignId
  });

  const filteredLeads = leads?.filter(lead => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      lead.firstName?.toLowerCase().includes(query) ||
      lead.lastName?.toLowerCase().includes(query) ||
      lead.email?.toLowerCase().includes(query) ||
      lead.companyName?.toLowerCase().includes(query) ||
      lead.phone?.includes(query)
    );
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'hsl(var(--brand-orange))';
      case 'qualified': return 'hsl(var(--brand-purple))';
      case 'contacted': return 'hsl(var(--info))';
      case 'converted': return 'hsl(var(--success))';
      case 'lost': return 'hsl(var(--text-tertiary))';
      default: return 'hsl(var(--text-secondary))';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new': return 'Nuovo';
      case 'qualified': return 'Qualificato';
      case 'contacted': return 'Contattato';
      case 'converted': return 'Convertito';
      case 'lost': return 'Perso';
      default: return status;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'hsl(var(--success))';
    if (score >= 50) return 'hsl(var(--warning))';
    return 'hsl(var(--error))';
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent 
          side="right" 
          className="w-full sm:max-w-[90vw] overflow-y-auto"
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderLeft: '1px solid var(--glass-card-border)'
          }}
        >
          <SheetHeader className="mb-6">
            <SheetTitle className="text-2xl font-bold flex items-center gap-2">
              <User className="h-6 w-6" style={{ color: 'hsl(var(--brand-orange))' }} />
              Lead della Campagna
            </SheetTitle>
            <SheetDescription className="text-base" style={{ color: 'var(--text-secondary)' }}>
              {campaignName}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
              <Input
                placeholder="Cerca per nome, email, azienda..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                style={{ 
                  background: 'var(--glass-bg-light)',
                  border: '1px solid var(--glass-card-border)'
                }}
                data-testid="input-search-campaign-leads"
              />
            </div>

            {leads && (
              <div 
                className="flex items-center gap-4 p-3 rounded-lg"
                style={{ 
                  background: 'var(--glass-bg-heavy)',
                  border: '1px solid var(--glass-card-border)'
                }}
              >
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" style={{ color: 'hsl(var(--brand-orange))' }} />
                  <span className="text-sm font-medium">Totali:</span>
                  <span className="font-bold">{leads.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" style={{ color: 'hsl(var(--success))' }} />
                  <span className="text-sm font-medium">Filtrati:</span>
                  <span className="font-bold">{filteredLeads.length}</span>
                </div>
              </div>
            )}
          </div>

          {isLoading && <LoadingState />}
          {error && <ErrorState message="Errore nel caricamento dei lead" />}

          {!isLoading && !error && filteredLeads.length === 0 && (
            <div className="text-center py-12">
              <User className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {searchQuery ? 'Nessun lead trovato con i filtri applicati' : 'Nessun lead in questa campagna'}
              </p>
            </div>
          )}

          {!isLoading && !error && filteredLeads.length > 0 && (
            <motion.div 
              className="space-y-3"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.03 }
                }
              }}
            >
              {filteredLeads.map((lead) => (
                <motion.div
                  key={lead.id}
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    visible: { opacity: 1, x: 0 }
                  }}
                  whileHover={{ scale: 1.01 }}
                  className="p-4 rounded-lg cursor-pointer"
                  style={{
                    background: 'var(--glass-card-bg)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid var(--glass-card-border)',
                    borderLeft: `4px solid ${getStatusColor(lead.status)}`
                  }}
                  onClick={() => {
                    setSelectedLead(lead);
                    setIsDetailOpen(true);
                  }}
                  data-testid={`lead-card-${lead.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback 
                          style={{ 
                            background: 'hsl(var(--brand-orange))',
                            color: 'white'
                          }}
                        >
                          {lead.firstName?.[0]}{lead.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold truncate">
                            {lead.firstName} {lead.lastName}
                          </h4>
                          <Badge 
                            variant="outline" 
                            className="text-xs"
                            style={{ 
                              borderColor: getStatusColor(lead.status),
                              color: getStatusColor(lead.status)
                            }}
                          >
                            {getStatusLabel(lead.status)}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {lead.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{lead.email}</span>
                            </div>
                          )}
                          {lead.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3" />
                              <span>{lead.phone}</span>
                            </div>
                          )}
                          {lead.companyName && (
                            <div className="flex items-center gap-2">
                              <Building className="h-3 w-3" />
                              <span className="truncate">{lead.companyName}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div 
                        className="text-2xl font-bold"
                        style={{ color: getScoreColor(lead.leadScore) }}
                      >
                        {lead.leadScore}
                      </div>
                      {lead.conversionProbability !== undefined && (
                        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          <Sparkles className="h-3 w-3" />
                          <span>{lead.conversionProbability}%</span>
                        </div>
                      )}
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLead(lead);
                          setIsDetailOpen(true);
                        }}
                        data-testid={`button-view-lead-${lead.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3 pt-3 border-t" style={{ borderColor: 'var(--glass-card-border)' }}>
                    {lead.originStoreName && (
                      <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        <Store className="h-3 w-3" />
                        <span>{lead.originStoreName}</span>
                      </div>
                    )}
                    {lead.ownerName && (
                      <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        <User className="h-3 w-3" />
                        <span>{lead.ownerName}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-xs ml-auto" style={{ color: 'var(--text-tertiary)' }}>
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(lead.createdAt), 'dd MMM yyyy', { locale: it })}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </SheetContent>
      </Sheet>

      {selectedLead && (
        <LeadDetailModal
          open={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedLead(null);
          }}
          leadId={selectedLead.id}
        />
      )}
    </>
  );
}
