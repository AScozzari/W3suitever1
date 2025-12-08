import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DeployStatusMatrix } from '../deploy/DeployStatusMatrix';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { 
  Package, Users, ShoppingCart, BarChart3,
  TrendingUp, AlertTriangle, CheckCircle2
} from 'lucide-react';

interface GapAnalysis {
  tool: string;
  latestVersion: string;
  deployedVersions: Array<{
    version: string;
    tenantCount: number;
    storeCount: number;
    isLatest: boolean;
  }>;
}

export default function StatusRealTimeTab() {
  const [viewMode, setViewMode] = useState<'matrix' | 'gap'>('matrix');

  const { data: gapData } = useQuery<{ data: GapAnalysis[] }>({
    queryKey: ['/brand-api/deploy/gap-analysis']
  });

  const gaps = gapData?.data || [];

  const toolIcons: Record<string, any> = {
    crm: Users,
    wms: Package,
    pos: ShoppingCart,
    analytics: BarChart3,
  };

  const toolColors: Record<string, string> = {
    crm: 'hsl(25, 95%, 53%)',
    wms: 'hsl(274, 65%, 46%)',
    pos: 'hsl(142, 76%, 36%)',
    analytics: 'hsl(220, 90%, 56%)',
  };

  return (
    <div style={{ padding: '0 2rem 2rem' }}>
      {/* Tab Selector */}
      <div style={{ marginBottom: '2rem' }}>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <TabsList>
            <TabsTrigger value="matrix" data-testid="tab-matrix">
              Deployment Matrix
            </TabsTrigger>
            <TabsTrigger value="gap" data-testid="tab-gap">
              Gap Analysis
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Matrix View */}
      {viewMode === 'matrix' && <DeployStatusMatrix />}

      {/* Gap Analysis View */}
      {viewMode === 'gap' && (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: 'hsl(var(--foreground))',
              marginBottom: '0.5rem'
            }}>
              Version Gap Analysis
            </h2>
            <p style={{
              fontSize: '0.875rem',
              color: 'hsl(var(--muted-foreground))'
            }}>
              Analisi delle versioni deployate per tool - identifica tenant con versioni obsolete
            </p>
          </div>

          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {gaps.map(gap => {
              const Icon = toolIcons[gap.tool] || Package;
              const color = toolColors[gap.tool] || 'hsl(var(--muted-foreground))';
              const outdatedTenants = gap.deployedVersions
                .filter(v => !v.isLatest)
                .reduce((sum, v) => sum + v.tenantCount, 0);

              return (
                <Card
                  key={gap.tool}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    backdropFilter: 'blur(24px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    borderRadius: '12px',
                    padding: '1.5rem'
                  }}
                  data-testid={`gap-card-${gap.tool}`}
                >
                  {/* Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '10px',
                        background: `${color}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Icon size={24} style={{ color }} />
                      </div>
                      <div>
                        <h3 style={{
                          fontSize: '1.125rem',
                          fontWeight: '700',
                          color: 'hsl(var(--foreground))',
                          textTransform: 'uppercase',
                          marginBottom: '0.25rem'
                        }}>
                          {gap.tool}
                        </h3>
                        <p style={{
                          fontSize: '0.875rem',
                          color: 'hsl(var(--muted-foreground))'
                        }}>
                          Latest: v{gap.latestVersion}
                        </p>
                      </div>
                    </div>

                    <Badge
                      variant={outdatedTenants > 0 ? 'destructive' : 'default'}
                      style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      {outdatedTenants > 0 ? (
                        <>
                          <AlertTriangle size={16} />
                          {outdatedTenants} tenant outdated
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={16} />
                          All up-to-date
                        </>
                      )}
                    </Badge>
                  </div>

                  {/* Version Distribution */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {gap.deployedVersions.map(versionData => (
                      <div
                        key={versionData.version}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.75rem',
                          borderRadius: '8px',
                          background: versionData.isLatest 
                            ? 'hsla(142, 76%, 36%, 0.1)' 
                            : 'hsla(0, 84%, 60%, 0.1)',
                          border: `1px solid ${versionData.isLatest 
                            ? 'hsla(142, 76%, 36%, 0.3)' 
                            : 'hsla(0, 84%, 60%, 0.3)'}`
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          {versionData.isLatest ? (
                            <CheckCircle2 size={20} style={{ color: 'hsl(142, 76%, 36%)' }} />
                          ) : (
                            <TrendingUp size={20} style={{ color: 'hsl(0, 84%, 60%)' }} />
                          )}
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: 'hsl(var(--foreground))'
                          }}>
                            v{versionData.version}
                          </span>
                          {versionData.isLatest && (
                            <Badge variant="outline" style={{
                              borderColor: 'hsl(142, 76%, 36%)',
                              color: 'hsl(142, 76%, 36%)',
                              fontSize: '0.7rem'
                            }}>
                              LATEST
                            </Badge>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem' }}>
                          <span style={{ color: 'hsl(var(--foreground))' }}>
                            <strong>{versionData.tenantCount}</strong> tenant
                          </span>
                          <span style={{ color: 'hsl(var(--muted-foreground))' }}>
                            {versionData.storeCount} store
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>

          {gaps.length === 0 && (
            <Card style={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(24px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              borderRadius: '12px',
              padding: '3rem',
              textAlign: 'center'
            }}>
              <p style={{ color: 'hsl(var(--muted-foreground))' }}>
                Nessun dato di gap analysis disponibile
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
