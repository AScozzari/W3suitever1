import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { ScrollArea } from './ui/scroll-area';
import { 
  Rocket, ChevronRight, ChevronLeft, Check, 
  GitBranch, Package, Users, ShoppingCart, BarChart3,
  AlertCircle
} from 'lucide-react';
import { apiRequest } from '../lib/queryClient';
import { useToast } from '../hooks/use-toast';

interface DeployCommit {
  id: string;
  tool: 'crm' | 'wms' | 'pos' | 'analytics' | 'hr';
  resourceType: string;
  resourceId: string;
  name: string;
  version: string;
}

interface Branch {
  id: string;
  branchName: string;
  tenantId: string | null;
  pdvId: string | null;
  isMainBranch: boolean;
}

interface DeploymentWizardProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCommits: DeployCommit[];
  branches: Branch[];
}

export default function DeploymentWizard({
  isOpen,
  onClose,
  selectedCommits,
  branches
}: DeploymentWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedBranches, setSelectedBranches] = useState<Set<string>>(new Set());
  const [sessionName, setSessionName] = useState('');
  const [description, setDescription] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/brand-api/deploy/sessions', {
        method: 'POST',
        body: JSON.stringify({
          sessionName: sessionName || `Deployment ${new Date().toISOString()}`,
          description: description || 'Deployment created via wizard',
          commitIds: selectedCommits.map(c => c.id),
          targetBranches: Array.from(selectedBranches),
        })
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Deployment Session Created',
        description: `Session ${data.data.id} created with ${data.data.totalBranches} deployments`
      });
      queryClient.invalidateQueries({ queryKey: ['/brand-api/deploy/sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/brand-api/deploy/commits'] });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Deployment Failed',
        description: error.message || 'Failed to create deployment session',
        variant: 'destructive'
      });
    }
  });

  const handleClose = () => {
    setStep(1);
    setSelectedBranches(new Set());
    setSessionName('');
    setDescription('');
    onClose();
  };

  const handleToggleBranch = (branchName: string) => {
    const newSelected = new Set(selectedBranches);
    if (newSelected.has(branchName)) {
      newSelected.delete(branchName);
    } else {
      newSelected.add(branchName);
    }
    setSelectedBranches(newSelected);
  };

  const handleLaunch = () => {
    createSessionMutation.mutate();
  };

  const renderStep1 = () => (
    <div>
      <DialogHeader>
        <DialogTitle style={{ 
          fontSize: '1.5rem', 
          fontWeight: '700', 
          color: 'hsl(var(--foreground))',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <Rocket size={24} style={{ color: 'hsl(var(--brand-orange))' }} />
          Step 1: Review Commits
        </DialogTitle>
        <DialogDescription>
          Review the selected commits before deployment
        </DialogDescription>
      </DialogHeader>

      <ScrollArea style={{ height: '400px', marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {selectedCommits.map(commit => {
            const Icon = toolIcons[commit.tool];
            const color = toolColors[commit.tool];

            return (
              <div
                key={commit.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(24px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  borderRadius: '8px',
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}
                data-testid={`wizard-commit-${commit.id}`}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: `${color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Icon size={20} style={{ color }} />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: '600',
                    color: 'hsl(var(--foreground))',
                    marginBottom: '0.25rem'
                  }}>
                    {commit.name}
                  </div>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: 'hsl(var(--muted-foreground))',
                    display: 'flex',
                    gap: '1rem'
                  }}>
                    <Badge variant="outline" style={{ borderColor: color, color }}>
                      {commit.tool}
                    </Badge>
                    <span>v{commit.version}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <DialogFooter style={{ marginTop: '1.5rem' }}>
        <Button variant="outline" onClick={handleClose} data-testid="wizard-cancel">
          Cancel
        </Button>
        <Button 
          onClick={() => setStep(2)}
          data-testid="wizard-next-step-1"
          style={{
            background: 'linear-gradient(135deg, hsl(25, 95%, 53%), hsl(25, 100%, 60%))',
            color: 'white'
          }}
        >
          Next
          <ChevronRight size={16} style={{ marginLeft: '0.5rem' }} />
        </Button>
      </DialogFooter>
    </div>
  );

  const renderStep2 = () => (
    <div>
      <DialogHeader>
        <DialogTitle style={{ 
          fontSize: '1.5rem', 
          fontWeight: '700', 
          color: 'hsl(var(--foreground))',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <GitBranch size={24} style={{ color: 'hsl(var(--brand-purple))' }} />
          Step 2: Select Branches
        </DialogTitle>
        <DialogDescription>
          Choose which branches to deploy to ({selectedBranches.size} selected)
        </DialogDescription>
      </DialogHeader>

      <ScrollArea style={{ height: '400px', marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {branches.map(branch => {
            const isSelected = selectedBranches.has(branch.branchName);

            return (
              <div
                key={branch.id}
                onClick={() => handleToggleBranch(branch.branchName)}
                style={{
                  background: isSelected 
                    ? 'rgba(255, 255, 255, 0.15)'
                    : 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(24px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                  border: isSelected 
                    ? '2px solid hsl(var(--brand-purple))'
                    : '1px solid rgba(255, 255, 255, 0.25)',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                data-testid={`wizard-branch-${branch.branchName}`}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => handleToggleBranch(branch.branchName)}
                  data-testid={`checkbox-${branch.branchName}`}
                />

                <GitBranch size={16} style={{ color: 'hsl(var(--brand-purple))' }} />

                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: '600',
                    color: 'hsl(var(--foreground))'
                  }}>
                    {branch.branchName}
                  </div>
                  {branch.isMainBranch && (
                    <Badge variant="outline" style={{ fontSize: '0.65rem', marginTop: '0.25rem' }}>
                      Main Branch
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <DialogFooter style={{ marginTop: '1.5rem' }}>
        <Button variant="outline" onClick={() => setStep(1)} data-testid="wizard-back-step-2">
          <ChevronLeft size={16} style={{ marginRight: '0.5rem' }} />
          Back
        </Button>
        <Button 
          onClick={() => setStep(3)}
          disabled={selectedBranches.size === 0}
          data-testid="wizard-next-step-2"
          style={{
            background: selectedBranches.size > 0
              ? 'linear-gradient(135deg, hsl(25, 95%, 53%), hsl(25, 100%, 60%))'
              : 'hsl(var(--muted))',
            color: 'white'
          }}
        >
          Next
          <ChevronRight size={16} style={{ marginLeft: '0.5rem' }} />
        </Button>
      </DialogFooter>
    </div>
  );

  const renderStep3 = () => {
    const totalDeployments = selectedCommits.length * selectedBranches.size;

    return (
      <div>
        <DialogHeader>
          <DialogTitle style={{ 
            fontSize: '1.5rem', 
            fontWeight: '700', 
            color: 'hsl(var(--foreground))',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <Check size={24} style={{ color: 'hsl(var(--brand-green))' }} />
            Step 3: Review & Launch
          </DialogTitle>
          <DialogDescription>
            Confirm deployment details before launching
          </DialogDescription>
        </DialogHeader>

        <div style={{ marginTop: '1.5rem' }}>
          {/* Session Details */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1rem'
          }}>
            <h3 style={{ 
              fontSize: '0.875rem', 
              fontWeight: '700',
              color: 'hsl(var(--foreground))',
              marginBottom: '1rem'
            }}>
              Deployment Summary
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: 'hsl(var(--muted-foreground))',
                  marginBottom: '0.25rem'
                }}>
                  Commits
                </div>
                <div style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: '700',
                  color: 'hsl(var(--brand-orange))'
                }}>
                  {selectedCommits.length}
                </div>
              </div>

              <div>
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: 'hsl(var(--muted-foreground))',
                  marginBottom: '0.25rem'
                }}>
                  Branches
                </div>
                <div style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: '700',
                  color: 'hsl(var(--brand-purple))'
                }}>
                  {selectedBranches.size}
                </div>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: 'hsl(var(--muted-foreground))',
                  marginBottom: '0.25rem'
                }}>
                  Total Deployments
                </div>
                <div style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: '700',
                  color: 'hsl(var(--brand-green))'
                }}>
                  {totalDeployments}
                </div>
              </div>
            </div>
          </div>

          {/* Warning */}
          {totalDeployments > 50 && (
            <div style={{
              background: 'rgba(255, 165, 0, 0.1)',
              border: '1px solid hsl(var(--brand-orange))',
              borderRadius: '8px',
              padding: '1rem',
              display: 'flex',
              gap: '0.75rem',
              marginBottom: '1rem'
            }}>
              <AlertCircle size={20} style={{ color: 'hsl(var(--brand-orange))', flexShrink: 0 }} />
              <div style={{ fontSize: '0.875rem', color: 'hsl(var(--foreground))' }}>
                <strong>Large Deployment:</strong> This will create {totalDeployments} individual deployments. 
                Consider deploying to fewer branches for better manageability.
              </div>
            </div>
          )}

          {/* Optional Session Name */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              fontSize: '0.875rem', 
              fontWeight: '600',
              color: 'hsl(var(--foreground))',
              marginBottom: '0.5rem',
              display: 'block'
            }}>
              Session Name (Optional)
            </label>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder={`Deployment ${new Date().toLocaleDateString()}`}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '6px',
                color: 'hsl(var(--foreground))',
                fontSize: '0.875rem'
              }}
              data-testid="wizard-session-name"
            />
          </div>

          <div>
            <label style={{ 
              fontSize: '0.875rem', 
              fontWeight: '600',
              color: 'hsl(var(--foreground))',
              marginBottom: '0.5rem',
              display: 'block'
            }}>
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about this deployment..."
              rows={3}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '6px',
                color: 'hsl(var(--foreground))',
                fontSize: '0.875rem',
                resize: 'vertical'
              }}
              data-testid="wizard-description"
            />
          </div>
        </div>

        <DialogFooter style={{ marginTop: '1.5rem' }}>
          <Button variant="outline" onClick={() => setStep(2)} data-testid="wizard-back-step-3">
            <ChevronLeft size={16} style={{ marginRight: '0.5rem' }} />
            Back
          </Button>
          <Button 
            onClick={handleLaunch}
            disabled={createSessionMutation.isPending}
            data-testid="wizard-launch"
            style={{
              background: 'linear-gradient(135deg, hsl(142, 76%, 36%), hsl(142, 76%, 43%))',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {createSessionMutation.isPending ? (
              'Launching...'
            ) : (
              <>
                <Rocket size={16} />
                Launch Deployment
              </>
            )}
          </Button>
        </DialogFooter>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent style={{
        background: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '16px',
        maxWidth: '600px',
        width: '90vw'
      }}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </DialogContent>
    </Dialog>
  );
}
