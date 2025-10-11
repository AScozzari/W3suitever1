import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { CRMNavigationBar } from '@/components/crm/CRMNavigationBar';
import { CRMScopeBar } from '@/components/crm/CRMScopeBar';
import { CRMCommandPalette } from '@/components/crm/CRMCommandPalette';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Search, Plus, Filter } from 'lucide-react';
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

export default function PersonsPage() {
  const [currentModule, setCurrentModule] = useState('crm');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: persons, isLoading, error } = useQuery({
    queryKey: ['/api/crm/persons', searchQuery],
    initialData: []
  });

  if (isLoading) {
    return (
      <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
        <CRMCommandPalette />
        <div className="flex flex-col h-full">
          <CRMNavigationBar />
          <CRMScopeBar />
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
          <CRMScopeBar />
          <div className="flex-1 p-6 overflow-auto">
            <ErrorState message="Errore nel caricamento dei contatti" />
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
        <CRMScopeBar />
        
        <div className="flex-1 p-6 space-y-6 overflow-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="p-3 rounded-xl"
              style={{ 
                background: 'var(--brand-glass-orange)',
                backdropFilter: 'blur(8px)'
              }}
            >
              <Users className="h-6 w-6" style={{ color: 'hsl(var(--brand-orange))' }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: 'hsl(var(--brand-orange))' }}>
                Contatti
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Identity Graph - Gestione contatti centralizzata
              </p>
            </div>
          </div>
          <Button
            style={{ 
              background: 'hsl(var(--brand-orange))',
              color: 'white'
            }}
            data-testid="button-add-person"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Contatto
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
                  placeholder="Cerca per nome, email, telefono..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  style={{ 
                    background: 'var(--glass-bg-light)',
                    border: '1px solid var(--glass-card-border)'
                  }}
                  data-testid="input-search-persons"
                />
              </div>
              <Button variant="outline" data-testid="button-filters">
                <Filter className="h-4 w-4 mr-2" />
                Filtri
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Persons List - Coming Soon */}
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
            <Users className="h-16 w-16 mx-auto mb-4 opacity-50" style={{ color: 'hsl(var(--brand-orange))' }} />
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              DataTable Contatti in arrivo
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Sistema completo di gestione contatti con filtri avanzati, import/export e analytics
            </p>
          </Card>
        </motion.div>
        </div>
      </div>
    </Layout>
  );
}
