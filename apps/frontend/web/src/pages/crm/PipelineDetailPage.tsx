import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { CRMNavigationBar } from '@/components/crm/CRMNavigationBar';
import { CRMSearchBar } from '@/components/crm/CRMSearchBar';
import { CRMCommandPalette } from '@/components/crm/CRMCommandPalette';
import { Button } from '@/components/ui/button';
import DealsDataTable from '@/components/crm/DealsDataTable';
import DealsKanban from '@/components/crm/DealsKanban';
import DealsGantt from '@/components/crm/DealsGantt';
import { 
  LayoutGrid, 
  Table as TableIcon, 
  GanttChartSquare,
  Plus, 
  Target,
  Settings,
  ChevronLeft
} from 'lucide-react';
import { LoadingState, ErrorState } from '@w3suite/frontend-kit/components/blocks';
import { Link } from 'wouter';

type ViewMode = 'table' | 'kanban' | 'gantt';

const STORAGE_KEY = 'pipeline-view-mode';

export default function PipelineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [currentModule, setCurrentModule] = useState('crm');
  
  // Initialize view mode from localStorage
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      return (saved as ViewMode) || 'table';
    }
    return 'table';
  });

  // Persist view mode to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, viewMode);
  }, [viewMode]);

  // Fetch pipeline details
  const { data: pipelineResponse, isLoading, error } = useQuery({
    queryKey: [`/api/crm/pipelines/${id}`],
  });

  const pipeline = pipelineResponse;

  if (isLoading) {
    return (
      <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
        <CRMCommandPalette />
        <div className="flex flex-col h-full">
          <CRMNavigationBar />
          <CRMSearchBar 
            onSearch={() => {}}
            placeholder="Cerca deal..."
          />
          <div className="flex-1 p-6">
            <LoadingState />
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !id) {
    return (
      <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
        <CRMCommandPalette />
        <div className="flex flex-col h-full">
          <CRMNavigationBar />
          <CRMSearchBar 
            onSearch={() => {}}
            placeholder="Cerca deal..."
          />
          <div className="flex-1 p-6">
            <ErrorState message="Errore nel caricamento della pipeline" />
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
          onSearch={setGlobalFilter}
          placeholder="Cerca deal..."
        />
        
        <div className="flex-1 p-6 space-y-6 overflow-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/staging/crm/pipelines">
                <Button variant="ghost" size="sm" data-testid="button-back">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </Link>
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
                    {pipeline?.name || 'Pipeline'}
                  </h1>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {deals.length} deal attivi • Driver: {pipeline?.driver || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--glass-bg-heavy)' }}>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  data-testid="toggle-table-view"
                  style={viewMode === 'table' ? {
                    background: 'hsl(var(--brand-orange))',
                    color: 'white'
                  } : {}}
                >
                  <TableIcon className="h-4 w-4 mr-2" />
                  Tabella
                </Button>
                <Button
                  variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('kanban')}
                  data-testid="toggle-kanban-view"
                  style={viewMode === 'kanban' ? {
                    background: 'hsl(var(--brand-orange))',
                    color: 'white'
                  } : {}}
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Kanban
                </Button>
                <Button
                  variant={viewMode === 'gantt' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('gantt')}
                  data-testid="toggle-gantt-view"
                  style={viewMode === 'gantt' ? {
                    background: 'hsl(var(--brand-orange))',
                    color: 'white'
                  } : {}}
                >
                  <GanttChartSquare className="h-4 w-4 mr-2" />
                  Gantt
                </Button>
              </div>

              <Button
                variant="outline"
                data-testid="button-pipeline-settings"
              >
                <Settings className="h-4 w-4 mr-2" />
                Impostazioni
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

          {/* Render selected view */}
          {viewMode === 'table' && <DealsDataTable pipelineId={id} />}
          {viewMode === 'kanban' && <DealsKanban pipelineId={id} />}
          {viewMode === 'gantt' && <DealsGantt pipelineId={id} />}
        </div>
      </div>
    </Layout>
  );
}
