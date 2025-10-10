import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserPlus, Search, Plus, Filter } from 'lucide-react';
import { LoadingState, ErrorState } from '@w3suite/frontend-kit/components/blocks';
import { useState } from 'react';

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 15 }
  }
};

export default function LeadsPage() {
  const [currentModule, setCurrentModule] = useState('crm');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: leads, isLoading, error } = useQuery({
    queryKey: ['/api/crm/leads', searchQuery],
    initialData: []
  });

  if (isLoading) {
    return (
      <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
        <LoadingState />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
        <ErrorState message="Errore nel caricamento dei lead" />
      </Layout>
    );
  }

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="p-3 rounded-xl"
              style={{ 
                background: 'var(--brand-glass-purple)',
                backdropFilter: 'blur(8px)'
              }}
            >
              <UserPlus className="h-6 w-6" style={{ color: 'hsl(var(--brand-purple))' }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: 'hsl(var(--brand-purple))' }}>
                Lead
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Gestione opportunità e qualifica lead
              </p>
            </div>
          </div>
          <Button
            style={{ 
              background: 'hsl(var(--brand-purple))',
              color: 'white'
            }}
            data-testid="button-add-lead"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Lead
          </Button>
        </div>

        {/* Search & Filters */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <Card 
            className="glass-card p-4 border-0"
            style={{ 
              background: 'var(--glass-card-bg)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid var(--glass-card-border)',
              boxShadow: 'var(--shadow-glass-sm)'
            }}
          >
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
                <Input
                  placeholder="Cerca lead per nome, azienda, prodotto..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  style={{ 
                    background: 'var(--glass-bg-light)',
                    border: '1px solid var(--glass-card-border)'
                  }}
                  data-testid="input-search-leads"
                />
              </div>
              <Button variant="outline" data-testid="button-filters">
                <Filter className="h-4 w-4 mr-2" />
                Filtri Pipeline
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Leads List - Coming Soon */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <Card 
            className="glass-card p-12 border-0 text-center"
            style={{ 
              background: 'var(--glass-card-bg)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid var(--glass-card-border)',
              boxShadow: 'var(--shadow-glass)'
            }}
          >
            <UserPlus className="h-16 w-16 mx-auto mb-4 opacity-50" style={{ color: 'hsl(var(--brand-purple))' }} />
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              DataTable Lead in arrivo
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Gestione completa lead con qualifica, scoring AI e workflow automation
            </p>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
}
