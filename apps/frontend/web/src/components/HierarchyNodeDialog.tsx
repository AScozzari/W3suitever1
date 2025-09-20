import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface HierarchyNode {
  id?: string;
  name: string;
  type: 'position' | 'department' | 'team';
  parentId: string | null;
  metadata: {
    roleId?: string;
    description?: string;
  };
}

interface HierarchyNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node?: HierarchyNode | null;
  parentId?: string | null;
  onSave: (node: HierarchyNode) => Promise<void>;
  availableRoles?: Array<{ id: string; name: string }>;
}

export function HierarchyNodeDialog({
  open,
  onOpenChange,
  node,
  parentId,
  onSave,
  availableRoles = []
}: HierarchyNodeDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<HierarchyNode>({
    name: '',
    type: 'position',
    parentId: parentId || null,
    metadata: {}
  });

  useEffect(() => {
    if (node) {
      setFormData(node);
    } else {
      setFormData({
        name: '',
        type: 'position',
        parentId: parentId || null,
        metadata: {}
      });
    }
  }, [node, parentId]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Errore',
        description: 'Il nome è obbligatorio',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
      toast({
        title: 'Successo',
        description: node ? 'Nodo aggiornato con successo' : 'Nodo creato con successo'
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile salvare il nodo',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {node ? 'Modifica Nodo Gerarchico' : 'Nuovo Nodo Gerarchico'}
          </DialogTitle>
          <DialogDescription>
            {node 
              ? 'Modifica le informazioni del nodo selezionato' 
              : 'Inserisci le informazioni per creare un nuovo nodo nell\'organigramma'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Nome <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="es. Direzione Generale, Team Marketing"
              data-testid="hierarchy-node-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo di Nodo</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value as 'position' | 'department' | 'team' })}
            >
              <SelectTrigger id="type" data-testid="hierarchy-node-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="department">Dipartimento</SelectItem>
                <SelectItem value="team">Team</SelectItem>
                <SelectItem value="position">Posizione</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {availableRoles.length > 0 && formData.type === 'position' && (
            <div className="space-y-2">
              <Label htmlFor="role">Ruolo Associato</Label>
              <Select
                value={formData.metadata.roleId || ''}
                onValueChange={(value) => setFormData({ 
                  ...formData, 
                  metadata: { ...formData.metadata, roleId: value }
                })}
              >
                <SelectTrigger id="role" data-testid="hierarchy-node-role">
                  <SelectValue placeholder="Seleziona un ruolo" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Descrizione</Label>
            <Textarea
              id="description"
              value={formData.metadata.description || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                metadata: { ...formData.metadata, description: e.target.value }
              })}
              placeholder="Descrizione opzionale del nodo"
              rows={3}
              data-testid="hierarchy-node-description"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            data-testid="hierarchy-dialog-cancel"
          >
            Annulla
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            data-testid="hierarchy-dialog-save"
          >
            {loading ? 'Salvataggio...' : node ? 'Aggiorna' : 'Crea'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HierarchyNodeDialog;