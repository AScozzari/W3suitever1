import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { 
  Filter, 
  X, 
  Calendar as CalendarIcon,
  Flag,
  CheckCircle2,
  User,
  Save,
  Bookmark
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface FilterPreset {
  id: string;
  name: string;
  filters: TaskFiltersState;
}

export interface TaskFiltersState {
  role?: 'assignee' | 'creator' | 'watcher';
  status?: string;
  priority?: string;
  urgency?: string;
  department?: string;
  assignedTo?: string;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  tags?: string[];
  linkedToWorkflow?: boolean;
}

export interface TaskFiltersProps {
  filters: TaskFiltersState;
  onChange: (filters: TaskFiltersState) => void;
  availableTags?: string[];
  availableAssignees?: Array<{ id: string; name: string }>;
  className?: string;
}

const roleOptions = [
  { value: 'all', label: 'Tutti i ruoli' },
  { value: 'assignee', label: 'Assegnato' },
  { value: 'creator', label: 'Creatore' },
  { value: 'watcher', label: 'Osservatore' },
];

const statusOptions = [
  { value: 'all', label: 'Tutti gli stati' },
  { value: 'todo', label: 'Da fare' },
  { value: 'in_progress', label: 'In corso' },
  { value: 'review', label: 'In revisione' },
  { value: 'done', label: 'Completato' },
  { value: 'archived', label: 'Archiviato' },
];

const priorityOptions = [
  { value: 'all', label: 'Tutte le priorità' },
  { value: 'low', label: 'Bassa' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
];

const urgencyOptions = [
  { value: 'all', label: 'Tutte le urgenze' },
  { value: 'low', label: 'Non urgente' },
  { value: 'medium', label: 'Moderata' },
  { value: 'high', label: 'Urgente' },
  { value: 'critical', label: 'Critica' },
];

const departmentOptions = [
  { value: 'all', label: 'Tutti i dipartimenti' },
  { value: 'hr', label: 'Risorse Umane' },
  { value: 'operations', label: 'Operazioni' },
  { value: 'support', label: 'Supporto' },
  { value: 'finance', label: 'Finanza' },
  { value: 'crm', label: 'CRM' },
  { value: 'sales', label: 'Vendite' },
  { value: 'marketing', label: 'Marketing' },
];

export function TaskFilters({
  filters,
  onChange,
  availableTags = [],
  availableAssignees = [],
  className
}: TaskFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [presetName, setPresetName] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('task-filter-presets');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const rehydrated = parsed.map((preset: FilterPreset) => ({
          ...preset,
          filters: {
            ...preset.filters,
            dueDateFrom: preset.filters.dueDateFrom ? new Date(preset.filters.dueDateFrom) : undefined,
            dueDateTo: preset.filters.dueDateTo ? new Date(preset.filters.dueDateTo) : undefined,
          }
        }));
        setPresets(rehydrated);
      } catch (e) {
        console.error('Failed to load presets', e);
      }
    }
  }, []);

  const activeFiltersCount = Object.values(filters).filter(v => {
    if (Array.isArray(v)) return v.length > 0;
    if (v === undefined || v === null) return false;
    return true;
  }).length;

  const clearFilter = (key: keyof TaskFiltersState) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onChange(newFilters);
  };

  const clearAllFilters = () => {
    onChange({});
  };

  const savePreset = () => {
    if (!presetName.trim()) return;
    
    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      filters: { ...filters }
    };
    
    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    localStorage.setItem('task-filter-presets', JSON.stringify(updatedPresets));
    setPresetName('');
    setShowSavePreset(false);
  };

  const loadPreset = (preset: FilterPreset) => {
    onChange(preset.filters);
    setIsOpen(false);
  };

  const deletePreset = (presetId: string) => {
    const updatedPresets = presets.filter(p => p.id !== presetId);
    setPresets(updatedPresets);
    localStorage.setItem('task-filter-presets', JSON.stringify(updatedPresets));
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            data-testid="button-filters"
            className="h-9"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtri
            {activeFiltersCount > 0 && (
              <Badge 
                variant="secondary" 
                className="ml-2 h-5 px-1.5 text-xs"
                data-testid="badge-filter-count"
              >
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            {presets.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Bookmark className="h-4 w-4 text-gray-500" />
                  Preset Salvati
                </h4>
                <div className="space-y-1">
                  {presets.map((preset) => (
                    <div 
                      key={preset.id} 
                      className="flex items-center justify-between gap-2 p-2 rounded hover:bg-gray-50"
                    >
                      <button
                        onClick={() => loadPreset(preset)}
                        className="flex-1 text-left text-sm font-medium text-gray-700 hover:text-gray-900"
                        data-testid={`button-load-preset-${preset.id}`}
                      >
                        {preset.name}
                      </button>
                      <button
                        onClick={() => deletePreset(preset.id)}
                        className="p-1 hover:bg-gray-200 rounded"
                        data-testid={`button-delete-preset-${preset.id}`}
                      >
                        <X className="h-3 w-3 text-gray-500" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeFiltersCount > 0 && !showSavePreset && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSavePreset(true)}
                className="w-full"
                data-testid="button-show-save-preset"
              >
                <Save className="h-4 w-4 mr-2" />
                Salva Preset
              </Button>
            )}

            {showSavePreset && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Save className="h-4 w-4 text-gray-500" />
                  Nuovo Preset
                </h4>
                <Input
                  placeholder="Nome preset..."
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && savePreset()}
                  data-testid="input-preset-name"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={savePreset}
                    disabled={!presetName.trim()}
                    data-testid="button-save-preset"
                  >
                    Salva
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowSavePreset(false);
                      setPresetName('');
                    }}
                    data-testid="button-cancel-preset"
                  >
                    Annulla
                  </Button>
                </div>
              </div>
            )}
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                Il Mio Ruolo
              </h4>
              <Select
                value={filters.role || 'all'}
                onValueChange={(value) => {
                  if (value === 'all') {
                    clearFilter('role');
                  } else {
                    onChange({ ...filters, role: value as any });
                  }
                }}
              >
                <SelectTrigger data-testid="select-role">
                  <SelectValue placeholder="Seleziona ruolo" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      data-testid={`select-option-role-${option.value}`}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-gray-500" />
                Stato
              </h4>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => {
                  if (value === 'all') {
                    clearFilter('status');
                  } else {
                    onChange({ ...filters, status: value });
                  }
                }}
              >
                <SelectTrigger data-testid="select-status">
                  <SelectValue placeholder="Seleziona stato" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      data-testid={`select-option-status-${option.value}`}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Flag className="h-4 w-4 text-gray-500" />
                  Priorità
                </h4>
                <Select
                  value={filters.priority || 'all'}
                  onValueChange={(value) => {
                    if (value === 'all') {
                      clearFilter('priority');
                    } else {
                      onChange({ ...filters, priority: value });
                    }
                  }}
                >
                  <SelectTrigger data-testid="select-priority">
                    <SelectValue placeholder="Priorità" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((option) => (
                      <SelectItem 
                        key={option.value} 
                        value={option.value}
                        data-testid={`select-option-priority-${option.value}`}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Flag className="h-4 w-4 text-gray-500" />
                  Urgenza
                </h4>
                <Select
                  value={filters.urgency || 'all'}
                  onValueChange={(value) => {
                    if (value === 'all') {
                      clearFilter('urgency');
                    } else {
                      onChange({ ...filters, urgency: value });
                    }
                  }}
                >
                  <SelectTrigger data-testid="select-urgency">
                    <SelectValue placeholder="Urgenza" />
                  </SelectTrigger>
                  <SelectContent>
                    {urgencyOptions.map((option) => (
                      <SelectItem 
                        key={option.value} 
                        value={option.value}
                        data-testid={`select-option-urgency-${option.value}`}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <Flag className="h-4 w-4 text-gray-500" />
                Dipartimento
              </h4>
              <Select
                value={filters.department || 'all'}
                onValueChange={(value) => {
                  if (value === 'all') {
                    clearFilter('department');
                  } else {
                    onChange({ ...filters, department: value });
                  }
                }}
              >
                <SelectTrigger data-testid="select-department">
                  <SelectValue placeholder="Seleziona dipartimento" />
                </SelectTrigger>
                <SelectContent>
                  {departmentOptions.map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      data-testid={`select-option-department-${option.value}`}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {availableAssignees.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  Assegnato a
                </h4>
                <Select
                  value={filters.assignedTo || 'all'}
                  onValueChange={(value) => {
                    if (value === 'all') {
                      clearFilter('assignedTo');
                    } else {
                      onChange({ ...filters, assignedTo: value });
                    }
                  }}
                >
                  <SelectTrigger data-testid="select-assignee">
                    <SelectValue placeholder="Seleziona utente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti gli utenti</SelectItem>
                    {availableAssignees.map((assignee) => (
                      <SelectItem 
                        key={assignee.id} 
                        value={assignee.id}
                        data-testid={`select-option-assignee-${assignee.id}`}
                      >
                        {assignee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-gray-500" />
                Scadenza
              </h4>
              <div className="space-y-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-left font-normal"
                      data-testid="button-date-from"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dueDateFrom ? (
                        format(filters.dueDateFrom, 'PPP', { locale: it })
                      ) : (
                        <span>Data inizio</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dueDateFrom}
                      onSelect={(date) => onChange({ ...filters, dueDateFrom: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-left font-normal"
                      data-testid="button-date-to"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dueDateTo ? (
                        format(filters.dueDateTo, 'PPP', { locale: it })
                      ) : (
                        <span>Data fine</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dueDateTo}
                      onSelect={(date) => onChange({ ...filters, dueDateTo: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="w-full"
                data-testid="button-clear-filters"
              >
                <X className="h-4 w-4 mr-2" />
                Rimuovi tutti i filtri
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {filters.role && (
        <Badge variant="secondary" className="gap-1" data-testid="badge-active-role">
          Ruolo: {roleOptions.find(o => o.value === filters.role)?.label}
          <button
            onClick={() => clearFilter('role')}
            className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
            data-testid="button-remove-role"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {filters.status && (
        <Badge variant="secondary" className="gap-1" data-testid="badge-active-status">
          Stato: {statusOptions.find(o => o.value === filters.status)?.label}
          <button
            onClick={() => clearFilter('status')}
            className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
            data-testid="button-remove-status"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {filters.priority && (
        <Badge variant="secondary" className="gap-1" data-testid="badge-active-priority">
          Priorità: {priorityOptions.find(o => o.value === filters.priority)?.label}
          <button
            onClick={() => clearFilter('priority')}
            className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
            data-testid="button-remove-priority"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {filters.urgency && (
        <Badge variant="secondary" className="gap-1" data-testid="badge-active-urgency">
          Urgenza: {urgencyOptions.find(o => o.value === filters.urgency)?.label}
          <button
            onClick={() => clearFilter('urgency')}
            className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
            data-testid="button-remove-urgency"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {filters.department && (
        <Badge variant="secondary" className="gap-1" data-testid="badge-active-department">
          Dipartimento: {departmentOptions.find(o => o.value === filters.department)?.label}
          <button
            onClick={() => clearFilter('department')}
            className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
            data-testid="button-remove-department"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {filters.assignedTo && (
        <Badge variant="secondary" className="gap-1" data-testid="badge-active-assignee">
          Assegnato: {availableAssignees.find(a => a.id === filters.assignedTo)?.name}
          <button
            onClick={() => clearFilter('assignedTo')}
            className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
            data-testid="button-remove-assignee"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {(filters.dueDateFrom || filters.dueDateTo) && (
        <Badge variant="secondary" className="gap-1" data-testid="badge-active-dates">
          Scadenza: {filters.dueDateFrom && format(filters.dueDateFrom, 'dd/MM/yy')}
          {filters.dueDateFrom && filters.dueDateTo && ' - '}
          {filters.dueDateTo && format(filters.dueDateTo, 'dd/MM/yy')}
          <button
            onClick={() => {
              const newFilters = { ...filters };
              delete newFilters.dueDateFrom;
              delete newFilters.dueDateTo;
              onChange(newFilters);
            }}
            className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
            data-testid="button-remove-dates"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
    </div>
  );
}
