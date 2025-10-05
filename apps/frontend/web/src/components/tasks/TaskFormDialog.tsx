import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { CalendarIcon, Loader2, X, Plus, Trash2 } from 'lucide-react';

const taskFormSchema = z.object({
  title: z.string().min(3, 'Il titolo deve contenere almeno 3 caratteri').max(255),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done', 'archived']),
  priority: z.enum(['low', 'medium', 'high']),
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
  department: z.enum(['hr', 'operations', 'support', 'finance', 'crm', 'sales', 'marketing']).optional(),
  dueDate: z.date().optional(),
  tags: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

interface User {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

interface ChecklistItem {
  id?: string;
  title: string;
  assignedToUserId?: string;
  position: number;
}

export interface TaskFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData & {
    assignees: string[];
    watchers: string[];
    checklistItems: ChecklistItem[];
  }) => Promise<void>;
  initialData?: Partial<TaskFormData>;
  mode?: 'create' | 'edit';
  isSubmitting?: boolean;
}

const statusOptions = [
  { value: 'todo', label: 'Da fare' },
  { value: 'in_progress', label: 'In corso' },
  { value: 'review', label: 'In revisione' },
  { value: 'done', label: 'Completato' },
  { value: 'archived', label: 'Archiviato' },
];

const priorityOptions = [
  { value: 'low', label: 'Bassa' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
];

const urgencyOptions = [
  { value: 'low', label: 'Non urgente' },
  { value: 'medium', label: 'Moderata' },
  { value: 'high', label: 'Urgente' },
  { value: 'critical', label: 'Critica' },
];

const departmentOptions = [
  { value: 'hr', label: 'Risorse Umane' },
  { value: 'operations', label: 'Operazioni' },
  { value: 'support', label: 'Supporto' },
  { value: 'finance', label: 'Finanza' },
  { value: 'crm', label: 'CRM' },
  { value: 'sales', label: 'Vendite' },
  { value: 'marketing', label: 'Marketing' },
];

export function TaskFormDialog({
  open,
  onClose,
  onSubmit,
  initialData,
  mode = 'create',
  isSubmitting = false,
}: TaskFormDialogProps) {
  const [assignees, setAssignees] = useState<string[]>([]);
  const [watchers, setWatchers] = useState<string[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      urgency: 'medium',
      department: undefined,
      dueDate: undefined,
      tags: '',
      ...initialData,
    },
  });

  useEffect(() => {
    if (open && initialData) {
      form.reset({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        urgency: 'medium',
        department: undefined,
        dueDate: undefined,
        tags: '',
        ...initialData,
      });
      setAssignees([]);
      setWatchers([]);
      setChecklistItems([]);
    }
  }, [open, initialData, form]);

  const handleSubmit = async (data: TaskFormData) => {
    await onSubmit({
      ...data,
      assignees,
      watchers,
      checklistItems,
    });
    form.reset();
    setAssignees([]);
    setWatchers([]);
    setChecklistItems([]);
  };

  const toggleAssignee = (userId: string) => {
    setAssignees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleWatcher = (userId: string) => {
    setWatchers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    setChecklistItems((prev) => [
      ...prev,
      {
        title: newChecklistItem.trim(),
        position: prev.length,
      },
    ]);
    setNewChecklistItem('');
  };

  const removeChecklistItem = (index: number) => {
    setChecklistItems((prev) => prev.filter((_, i) => i !== index).map((item, i) => ({
      ...item,
      position: i,
    })));
  };

  const updateChecklistItemAssignee = (index: number, userId: string) => {
    setChecklistItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, assignedToUserId: userId || undefined } : item
      )
    );
  };

  const getUserDisplayName = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return userId;
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || userId;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Crea nuovo task' : 'Modifica task'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Titolo <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Inserisci il titolo del task"
                      data-testid="input-task-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Descrizione dettagliata del task"
                      rows={3}
                      data-testid="input-task-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stato <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} data-testid="select-status">
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona stato" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value} data-testid={`option-status-${option.value}`}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dipartimento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} data-testid="select-department">
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona dipartimento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departmentOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value} data-testid={`option-department-${option.value}`}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priorità <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} data-testid="select-priority">
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona priorità" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {priorityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value} data-testid={`option-priority-${option.value}`}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="urgency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Urgenza <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} data-testid="select-urgency">
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona urgenza" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {urgencyOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value} data-testid={`option-urgency-${option.value}`}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Scadenza</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                            data-testid="button-due-date"
                          >
                            {field.value ? (
                              format(field.value, 'PPP', { locale: it })
                            ) : (
                              <span>Seleziona data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tag</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="es: frontend, urgente (separati da virgola)"
                        data-testid="input-task-tags"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-3">Assegnatari (Destinatari del Task)</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`assignee-${user.id}`}
                        checked={assignees.includes(user.id)}
                        onCheckedChange={() => toggleAssignee(user.id)}
                        data-testid={`checkbox-assignee-${user.id}`}
                      />
                      <label htmlFor={`assignee-${user.id}`} className="text-sm cursor-pointer">
                        {getUserDisplayName(user.id)}
                      </label>
                    </div>
                  ))}
                </div>
                {assignees.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {assignees.map((userId) => (
                      <Badge key={userId} variant="default" className="gap-1">
                        {getUserDisplayName(userId)}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => toggleAssignee(userId)} />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-3">Osservatori (Watcher)</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`watcher-${user.id}`}
                        checked={watchers.includes(user.id)}
                        onCheckedChange={() => toggleWatcher(user.id)}
                        data-testid={`checkbox-watcher-${user.id}`}
                      />
                      <label htmlFor={`watcher-${user.id}`} className="text-sm cursor-pointer">
                        {getUserDisplayName(user.id)}
                      </label>
                    </div>
                  ))}
                </div>
                {watchers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {watchers.map((userId) => (
                      <Badge key={userId} variant="secondary" className="gap-1">
                        {getUserDisplayName(userId)}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => toggleWatcher(userId)} />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Checklist (Subtask)</h3>
              <div className="flex gap-2">
                <Input
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  placeholder="Aggiungi item alla checklist..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addChecklistItem();
                    }
                  }}
                  data-testid="input-new-checklist-item"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={addChecklistItem}
                  data-testid="button-add-checklist-item"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {checklistItems.length > 0 && (
                <div className="space-y-2 border rounded-md p-3">
                  {checklistItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded" data-testid={`checklist-item-${index}`}>
                      <span className="flex-1 text-sm">{item.title}</span>
                      <Select
                        value={item.assignedToUserId || ''}
                        onValueChange={(value) => updateChecklistItemAssignee(index, value)}
                      >
                        <SelectTrigger className="w-[200px] h-8 text-xs">
                          <SelectValue placeholder="Assegna a..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Nessuno</SelectItem>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {getUserDisplayName(user.id)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeChecklistItem(index)}
                        className="h-8 w-8"
                        data-testid={`button-remove-checklist-${index}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                data-testid="button-cancel"
              >
                Annulla
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                data-testid="button-submit-task"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'create' ? 'Crea task' : 'Salva modifiche'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
