// Expense Policies Component
import { useState } from 'react';
import type { ExpensePolicy } from '@/services/expenseService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useExpensePolicies } from '@/hooks/useExpenseManagement';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Settings,
  Info,
  Euro,
  Clock,
  FileText,
  Shield,
  Save,
  AlertCircle,
  Plus,
  X
} from 'lucide-react';

interface ExpensePoliciesProps {
  canEdit?: boolean;
}

export default function ExpensePolicies({ canEdit = false }: ExpensePoliciesProps) {
  const { toast } = useToast();
  const { policy, isLoading, updatePolicy } = useExpensePolicies();
  const [editMode, setEditMode] = useState(false);
  const [localPolicies, setLocalPolicies] = useState<Partial<ExpensePolicy>>(policy || {});

  const handleSave = async () => {
    try {
      await updatePolicy.mutateAsync(localPolicies);
      toast({
        title: 'Politiche aggiornate',
        description: 'Le politiche di rimborso sono state aggiornate con successo',
      });
      setEditMode(false);
    } catch (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare le politiche',
        variant: 'destructive',
      });
    }
  };

  const defaultPolicies = {
    maxAmountPerCategory: {
      'Trasporti': 500,
      'Vitto': 50,
      'Alloggio': 150,
      'Materiali': 1000,
      'Formazione': 2000,
      'Marketing': 5000,
      'Altro': 100
    },
    requireReceipt: {
      enabled: true,
      minAmount: 25
    },
    approvalLevels: [
      { maxAmount: 500, approver: 'TEAM_LEADER' },
      { maxAmount: 2000, approver: 'STORE_MANAGER' },
      { maxAmount: 5000, approver: 'AREA_MANAGER' },
      { maxAmount: null, approver: 'HR_MANAGER' }
    ],
    autoApprove: {
      enabled: false,
      maxAmount: 0
    },
    reimbursementTimeline: {
      approvalDeadline: 7,
      paymentDeadline: 30
    }
  };

  const currentPolicies = localPolicies || policy || defaultPolicies;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="h-32">
          <CardContent className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Caricamento politiche...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="expense-policies">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Politiche di Rimborso</h3>
          <p className="text-sm text-muted-foreground">
            Configura le regole e i limiti per le note spese
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            {editMode ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setLocalPolicies(policy || {});
                    setEditMode(false);
                  }}
                  data-testid="button-cancel-policies"
                >
                  <X className="h-4 w-4 mr-2" />
                  Annulla
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updatePolicy.isPending}
                  data-testid="button-save-policies"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salva Modifiche
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={() => setEditMode(true)}
                data-testid="button-edit-policies"
              >
                <Settings className="h-4 w-4 mr-2" />
                Modifica
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Category Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Euro className="h-5 w-5" />
            Limiti per Categoria
          </CardTitle>
          <CardDescription>
            Importi massimi rimborsabili per categoria di spesa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(currentPolicies.maxAmountPerCategory || {}).map(([category, limit]) => (
              <div key={category} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{category}</Badge>
                </div>
                {editMode ? (
                  <Input
                    type="number"
                    value={limit}
                    onChange={(e) => {
                      setLocalPolicies({
                        ...localPolicies,
                        maxAmountPerCategory: {
                          ...localPolicies.maxAmountPerCategory,
                          [category]: Number(e.target.value)
                        }
                      });
                    }}
                    className="w-32"
                    data-testid={`input-limit-${category}`}
                  />
                ) : (
                  <span className="font-semibold">€ {limit}</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Receipt Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Requisiti Scontrini
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Richiedi scontrino</p>
                <p className="text-sm text-muted-foreground">
                  Obbligatorio per spese sopra un certo importo
                </p>
              </div>
              {editMode ? (
                <Switch
                  checked={currentPolicies.requireReceipt?.enabled}
                  onCheckedChange={(checked) => {
                    setLocalPolicies({
                      ...localPolicies,
                      requireReceipt: {
                        ...localPolicies.requireReceipt,
                        enabled: checked
                      }
                    });
                  }}
                  data-testid="switch-require-receipt"
                />
              ) : (
                <Badge variant={currentPolicies.requireReceipt?.enabled ? 'default' : 'secondary'}>
                  {currentPolicies.requireReceipt?.enabled ? 'Attivo' : 'Disattivo'}
                </Badge>
              )}
            </div>
            
            {currentPolicies.requireReceipt?.enabled && (
              <div className="flex items-center justify-between pl-6">
                <p className="text-sm">Importo minimo</p>
                {editMode ? (
                  <Input
                    type="number"
                    value={currentPolicies.requireReceipt?.minAmount}
                    onChange={(e) => {
                      setLocalPolicies({
                        ...localPolicies,
                        requireReceipt: {
                          ...localPolicies.requireReceipt,
                          minAmount: Number(e.target.value)
                        }
                      });
                    }}
                    className="w-32"
                    data-testid="input-min-amount-receipt"
                  />
                ) : (
                  <span className="font-semibold">€ {currentPolicies.requireReceipt?.minAmount}</span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Approval Levels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Livelli di Approvazione
          </CardTitle>
          <CardDescription>
            Definisce chi può approvare le note spese in base all'importo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {currentPolicies.approvalLevels?.map((level, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge>{level.approver}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {level.maxAmount ? `fino a € ${level.maxAmount}` : 'Qualsiasi importo'}
                  </span>
                </div>
                {editMode && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newLevels = [...localPolicies.approvalLevels];
                      newLevels.splice(index, 1);
                      setLocalPolicies({
                        ...localPolicies,
                        approvalLevels: newLevels
                      });
                    }}
                    data-testid={`button-remove-level-${index}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Timeline Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Tempistiche
          </CardTitle>
          <CardDescription>
            Termini per approvazione e pagamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Termine approvazione</p>
                <p className="text-sm text-muted-foreground">
                  Giorni massimi per approvare una nota spese
                </p>
              </div>
              {editMode ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={currentPolicies.reimbursementTimeline?.approvalDeadline}
                    onChange={(e) => {
                      setLocalPolicies({
                        ...localPolicies,
                        reimbursementTimeline: {
                          ...localPolicies.reimbursementTimeline,
                          approvalDeadline: Number(e.target.value)
                        }
                      });
                    }}
                    className="w-20"
                    data-testid="input-approval-deadline"
                  />
                  <span className="text-sm">giorni</span>
                </div>
              ) : (
                <Badge variant="outline">
                  {currentPolicies.reimbursementTimeline?.approvalDeadline} giorni
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Termine pagamento</p>
                <p className="text-sm text-muted-foreground">
                  Giorni massimi per il rimborso dopo l'approvazione
                </p>
              </div>
              {editMode ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={currentPolicies.reimbursementTimeline?.paymentDeadline}
                    onChange={(e) => {
                      setLocalPolicies({
                        ...localPolicies,
                        reimbursementTimeline: {
                          ...localPolicies.reimbursementTimeline,
                          paymentDeadline: Number(e.target.value)
                        }
                      });
                    }}
                    className="w-20"
                    data-testid="input-payment-deadline"
                  />
                  <span className="text-sm">giorni</span>
                </div>
              ) : (
                <Badge variant="outline">
                  {currentPolicies.reimbursementTimeline?.paymentDeadline} giorni
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Alert */}
      {!editMode && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Le modifiche alle politiche di rimborso hanno effetto immediato su tutte le nuove note spese.
            Le note spese già inviate mantengono le politiche in vigore al momento della creazione.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}