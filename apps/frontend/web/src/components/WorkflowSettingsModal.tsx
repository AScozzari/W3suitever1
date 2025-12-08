/**
 * Workflow Settings Modal
 * Used for creating and editing workflow template metadata including action tags
 */

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
import { ActionTagsSelector } from './ActionTagsSelector';
import { DEPARTMENT_LABELS, ALL_DEPARTMENTS, type Department } from '@/lib/action-tags';
import { Settings, FileText, Tag, Save } from 'lucide-react';

export interface WorkflowSettings {
  name: string;
  description: string;
  category: string;
  actionTags: string[];
  customAction: string | null;
}

interface WorkflowSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: WorkflowSettings) => void;
  initialSettings?: Partial<WorkflowSettings>;
  mode: 'create' | 'edit';
  isSaving?: boolean;
}

const DEPARTMENT_OPTIONS = ALL_DEPARTMENTS.map(dept => ({
  value: dept,
  label: DEPARTMENT_LABELS[dept]
}));

export function WorkflowSettingsModal({
  isOpen,
  onClose,
  onSave,
  initialSettings,
  mode,
  isSaving = false
}: WorkflowSettingsModalProps) {
  const [name, setName] = useState(initialSettings?.name || '');
  const [description, setDescription] = useState(initialSettings?.description || '');
  const [category, setCategory] = useState(initialSettings?.category || '');
  const [actionTags, setActionTags] = useState<string[]>(initialSettings?.actionTags || []);
  const [customAction, setCustomAction] = useState<string | null>(initialSettings?.customAction || null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && initialSettings) {
      setName(initialSettings.name || '');
      setDescription(initialSettings.description || '');
      setCategory(initialSettings.category || '');
      setActionTags(initialSettings.actionTags || []);
      setCustomAction(initialSettings.customAction || null);
      setErrors({});
    }
  }, [isOpen, initialSettings]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Il nome è obbligatorio';
    }

    if (!category) {
      newErrors.category = 'Seleziona un dipartimento';
    }

    if (actionTags.length === 0 && !customAction) {
      newErrors.actionTags = 'Seleziona almeno un\'azione o inserisci un\'azione personalizzata';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    onSave({
      name: name.trim(),
      description: description.trim(),
      category,
      actionTags,
      customAction
    });
  };

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    setActionTags([]);
    setCustomAction(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] windtre-glass-panel border-white/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <Settings className="h-5 w-5 text-orange-500" />
            {mode === 'create' ? 'Nuovo Workflow Template' : 'Impostazioni Workflow'}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {mode === 'create' 
              ? 'Configura le proprietà del nuovo workflow template'
              : 'Modifica le proprietà del workflow template'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="workflow-name" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Nome Workflow <span className="text-red-500">*</span>
            </Label>
            <Input
              id="workflow-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es: Richiesta Ferie Annuali"
              className={errors.name ? 'border-red-500' : ''}
              data-testid="workflow-name-input"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="workflow-description">Descrizione</Label>
            <Textarea
              id="workflow-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrivi brevemente lo scopo di questo workflow..."
              rows={3}
              data-testid="workflow-description-input"
            />
          </div>

          {/* Category/Department Field */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Dipartimento <span className="text-red-500">*</span>
            </Label>
            <Select 
              value={category} 
              onValueChange={handleCategoryChange}
              disabled={mode === 'edit'}
            >
              <SelectTrigger 
                className={errors.category ? 'border-red-500' : ''}
                data-testid="workflow-category-select"
              >
                <SelectValue placeholder="Seleziona dipartimento..." />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENT_OPTIONS.map(option => (
                  <SelectItem 
                    key={option.value} 
                    value={option.value}
                    data-testid={`category-option-${option.value}`}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-red-500">{errors.category}</p>
            )}
            {mode === 'edit' && (
              <p className="text-xs text-gray-500">
                Il dipartimento non può essere modificato dopo la creazione
              </p>
            )}
          </div>

          {/* Action Tags Selector */}
          <div className={`space-y-2 ${!category ? 'opacity-50' : ''}`}>
            <ActionTagsSelector
              department={category}
              selectedTags={actionTags}
              customAction={customAction}
              onTagsChange={setActionTags}
              onCustomActionChange={setCustomAction}
              disabled={!category}
            />
            {errors.actionTags && (
              <p className="text-sm text-red-500">{errors.actionTags}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Annulla
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-orange-500 hover:bg-orange-600"
            data-testid="save-workflow-settings-button"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Salvataggio...' : (mode === 'create' ? 'Crea Workflow' : 'Salva Modifiche')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default WorkflowSettingsModal;
