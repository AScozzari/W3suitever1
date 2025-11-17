import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import BrandLayout from '../components/BrandLayout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { Badge } from '../components/ui/badge';
import DeploymentWizard from '../components/DeploymentWizard';
import { 
  Package, Users, ShoppingCart, BarChart3, 
  Rocket, GitBranch, ChevronLeft
} from 'lucide-react';
import { useLocation } from 'wouter';

interface DeployCommit {
  id: string;
  tool: 'crm' | 'wms' | 'pos' | 'analytics';
  resourceType: string;
  resourceId: string;
  name: string;
  version: string;
  status: 'ready' | 'deployed' | 'failed';
  metadata: any;
  createdAt: string;
}

export default function ReadyQueue() {
  const [, setLocation] = useLocation();
  const [selectedCommits, setSelectedCommits] = useState<Set<string>>(new Set());
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const { data: commitsResponse, isLoading } = useQuery<{ data: DeployCommit[] }>({
    queryKey: ['/brand-api/deploy/commits', { status: 'ready' }]
  });

  const { data: branchesResponse } = useQuery<{ data: any[] }>({
    queryKey: ['/brand-api/deploy/branches']
  });

  const readyCommits = commitsResponse?.data || [];
  const branches = branchesResponse?.data || [];

  const toolColors: Record<string, string> = {
    crm: 'hsl(25, 95%, 53%)',
    wms: 'hsl(274, 65%, 46%)',
    pos: 'hsl(142, 76%, 36%)',
    analytics: 'hsl(220, 90%, 56%)',
    hr: 'hsl(340, 75%, 55%)',
  };

  const toolIcons: Record<string, any> = {
    crm: Users,
    wms: Package,
    pos: ShoppingCart,
    analytics: BarChart3,
    hr: Users,
  };

  const handleToggleCommit = (commitId: string) => {
    const newSelected = new Set(selectedCommits);
    if (newSelected.has(commitId)) {
      newSelected.delete(commitId);
    } else {
      newSelected.add(commitId);
    }
    setSelectedCommits(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedCommits.size === readyCommits.length) {
      setSelectedCommits(new Set());
    } else {
      setSelectedCommits(new Set(readyCommits.map(c => c.id)));
    }
  };

  return (
    <BrandLayout>
      <div style={{ padding: '2rem', width: '100%' }}>
        {/* Header */}
        <div style={{
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Button
              variant="ghost"
              onClick={() => setLocation('/deploy-center')}
              style={{ padding: '0.5rem' }}
              data-testid="button-back"
            >
              <ChevronLeft size={24} />
            </Button>
            <div>
              <h1 style={{
                fontSize: '2rem',
                fontWeight: '700',
                color: 'hsl(var(--foreground))',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}
              data-testid="heading-ready-queue">
                <Rocket size={32} style={{ color: 'hsl(var(--brand-orange))' }} />
                Ready Queue
              </h1>
              <p style={{
                fontSize: '1rem',
                color: 'hsl(var(--muted-foreground))'
              }}
              data-testid="text-queue-subtitle">
                {readyCommits.length} commit pronti per il deployment
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button
              variant="outline"
              onClick={handleSelectAll}
              disabled={readyCommits.length === 0}
              data-testid="button-select-all"
            >
              {selectedCommits.size === readyCommits.length ? 'Deseleziona Tutto' : 'Seleziona Tutto'}
            </Button>
            <Button
              onClick={() => setIsWizardOpen(true)}
              disabled={selectedCommits.size === 0}
              style={{
                background: selectedCommits.size > 0 
                  ? 'linear-gradient(135deg, hsl(25, 95%, 53%), hsl(25, 100%, 60%))' 
                  : 'hsl(var(--muted))',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: 'none',
                cursor: selectedCommits.size > 0 ? 'pointer' : 'not-allowed'
              }}
              data-testid="button-deploy-selected"
            >
              <Rocket size={20} />
              Deploy {selectedCommits.size > 0 ? `(${selectedCommits.size})` : ''}
            </Button>
          </div>
        </div>

        {/* Commits List */}
        {isLoading ? (
          <Card style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            borderRadius: '12px',
            padding: '3rem',
            textAlign: 'center'
          }}>
            <p style={{ color: 'hsl(var(--muted-foreground))' }}>
              Caricamento commit pronti...
            </p>
          </Card>
        ) : readyCommits.length === 0 ? (
          <Card style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            borderRadius: '12px',
            padding: '3rem',
            textAlign: 'center'
          }}>
            <GitBranch size={48} style={{ color: 'hsl(var(--muted-foreground))', margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>
              Nessun Commit Pronto
            </h3>
            <p style={{ color: 'hsl(var(--muted-foreground))' }}>
              Tutti i commit sono stati deployati o non ci sono commit ready
            </p>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {readyCommits.map(commit => {
              const Icon = toolIcons[commit.tool];
              const color = toolColors[commit.tool];
              const isSelected = selectedCommits.has(commit.id);

              return (
                <Card
                  key={commit.id}
                  onClick={() => handleToggleCommit(commit.id)}
                  style={{
                    background: isSelected 
                      ? 'rgba(255, 255, 255, 0.15)'
                      : 'rgba(255, 255, 255, 0.08)',
                    backdropFilter: 'blur(24px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                    border: isSelected 
                      ? `2px solid ${color}`
                      : '1px solid rgba(255, 255, 255, 0.25)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.5rem'
                  }}
                  data-testid={`commit-card-${commit.id}`}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleToggleCommit(commit.id)}
                    data-testid={`checkbox-${commit.id}`}
                  />
                  
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '10px',
                    background: `${color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Icon size={24} style={{ color }} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                      <h3 style={{
                        fontSize: '1.125rem',
                        fontWeight: '700',
                        color: 'hsl(var(--foreground))'
                      }}
                      data-testid={`text-commit-name-${commit.id}`}>
                        {commit.name}
                      </h3>
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: color,
                          color,
                          textTransform: 'uppercase',
                          fontSize: '0.75rem',
                          fontWeight: '700'
                        }}
                        data-testid={`badge-tool-${commit.id}`}
                      >
                        {commit.tool}
                      </Badge>
                      <Badge
                        variant="outline"
                        data-testid={`badge-version-${commit.id}`}
                      >
                        v{commit.version}
                      </Badge>
                    </div>
                    <div style={{ display: 'flex', gap: '2rem', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                      <span data-testid={`text-type-${commit.id}`}>
                        Type: {commit.resourceType}
                      </span>
                      <span data-testid={`text-id-${commit.id}`}>
                        ID: {commit.resourceId}
                      </span>
                      <span data-testid={`text-date-${commit.id}`}>
                        {new Date(commit.createdAt).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Deployment Wizard */}
      <DeploymentWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        selectedCommits={readyCommits.filter(c => selectedCommits.has(c.id))}
        branches={branches}
      />
    </BrandLayout>
  );
}
