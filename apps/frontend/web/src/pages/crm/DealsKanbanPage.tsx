import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { CRMNavigationBar } from '@/components/crm/CRMNavigationBar';
import { CRMSearchBar } from '@/components/crm/CRMSearchBar';
import { CRMCommandPalette } from '@/components/crm/CRMCommandPalette';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, Plus, Settings } from 'lucide-react';
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

export default function DealsKanbanPage() {
  const [currentModule, setCurrentModule] = useState('crm');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: deals, isLoading, error } = useQuery({
    queryKey: ['/api/crm/deals'],
    initialData: []
  });

  if (isLoading) {
    return (
      <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
        <CRMCommandPalette />
        <div className="flex flex-col h-full">
          <CRMNavigationBar />
          <CRMSearchBar 
            onSearch={setSearchQuery}
            placeholder="Cerca deal..."
          />
          <div className="flex-1 p-6 overflow-auto">
            <LoadingState />
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
        <CRMCommandPalette />
        <div className="flex flex-col h-full">
          <CRMNavigationBar />
          <CRMSearchBar 
            onSearch={setSearchQuery}
            placeholder="Cerca deal..."
          />
          <div className="flex-1 p-6 overflow-auto">
            <ErrorState message="Errore nel caricamento dei deal" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <CRMCommandPalette />
      <div className="flex flex-col h-full">
        <CRMNavigationBar />
        <CRMSearchBar 
          onSearch={setSearchQuery}
          placeholder="Cerca deal..."
        />
        
        <div className="flex-1 p-6 space-y-6 overflow-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="p-3 rounded-xl"
              style={{ 
                background: 'var(--brand-glass-gradient)',
                backdropFilter: 'blur(8px)'
              }}
            >
              <Target className="h-6 w-6" style={{ color: 'hsl(var(--brand-orange))' }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: 'hsl(var(--brand-orange))' }}>
                Deals Kanban
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Pipeline visiva con drag & drop - Gestione trattative
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" data-testid="button-pipeline-settings">
              <Settings className="h-4 w-4 mr-2" />
              Pipeline Settings
            </Button>
            <Button
              style={{ 
                background: 'hsl(var(--brand-orange))',
                color: 'white'
              }}
              data-testid="button-add-deal"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Deal
            </Button>
          </div>
        </div>

        {/* Kanban Board - Coming Soon */}
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
            <Target className="h-16 w-16 mx-auto mb-4 opacity-50" style={{ color: 'hsl(var(--brand-orange))' }} />
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Kanban Dinamico in arrivo
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Visualizzazione Kanban con stage dinamici, drag & drop Framer Motion e pipeline automation
            </p>
          </Card>
        </motion.div>
        </div>
      </div>
    </Layout>
  );
}
