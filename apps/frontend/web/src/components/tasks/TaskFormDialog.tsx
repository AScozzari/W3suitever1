import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  CalendarIcon, 
  Loader2, 
  X, 
  Plus, 
  Trash2, 
  Users, 
  Eye, 
  CheckSquare, 
  FileText,
  Tag,
  Clock
} from 'lucide-react';

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
    attachments: File[];
  }) => Promise<void>;
  initialData?: Partial<TaskFormData>;
  existingAssignees?: string[];
  existingWatchers?: string[];
  existingChecklistItems?: ChecklistItem[];
  mode?: 'create' | 'edit';
  isSubmitting?: boolean;
}

const statusOptions = [
  { value: 'todo', label: 'Da fare', color: 'text-gray-600' },
  { value: 'in_progress', label: 'In corso', color: 'text-blue-600' },
  { value: 'review', label: 'In revisione', color: 'text-purple-600' },
  { value: 'done', label: 'Completato', color: 'text-green-600' },
  { value: 'archived', label: 'Archiviato', color: 'text-gray-400' },
];

const priorityOptions = [
  { value: 'low', label: 'Bassa', color: 'bg-gray-100 text-gray-700' },
  { value: 'medium', label: 'Media', color: 'bg-blue-100 text-blue-700' },
  { value: 'high', label: 'Alta', color: 'bg-orange-100 text-orange-700' },
];

const urgencyOptions = [
  { value: 'low', label: 'Non urgente', color: 'bg-gray-100 text-gray-700' },
  { value: 'medium', label: 'Moderata', color: 'bg-blue-100 text-blue-700' },
  { value: 'high', label: 'Urgente', color: 'bg-orange-100 text-orange-700' },
  { value: 'critical', label: 'Critica', color: 'bg-red-100 text-red-700' },
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
  existingAssignees,
  existingWatchers,
  existingChecklistItems,
  mode = 'create',
  isSubmitting = false,
}: TaskFormDialogProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [assignees, setAssignees] = useState<string[]>([]);
  const [watchers, setWatchers] = useState<string[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [newChecklistItemAssignee, setNewChecklistItemAssignee] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  const prevOpenRef = useRef(false);

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
    if (open && !prevOpenRef.current) {
      setActiveTab('details');
      
      if (mode === 'edit') {
        setAssignees(existingAssignees || []);
        setWatchers(existingWatchers || []);
        setChecklistItems(existingChecklistItems || []);
      } else {
        setAssignees([]);
        setWatchers([]);
        setChecklistItems([]);
        setSelectedFiles([]);
      }
      
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
    }
    
    prevOpenRef.current = open;
  }, [open, mode, initialData, existingAssignees, existingWatchers, existingChecklistItems, form]);

  const handleSubmit = async (data: TaskFormData) => {
    await onSubmit({
      ...data,
      assignees,
      watchers,
      checklistItems,
      attachments: selectedFiles,
    });
    form.reset();
    setAssignees([]);
    setWatchers([]);
    setChecklistItems([]);
    setSelectedFiles([]);
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
        assignedToUserId: newChecklistItemAssignee || undefined,
        position: prev.length,
      },
    ]);
    setNewChecklistItem('');
    setNewChecklistItemAssignee('');
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
      <DialogContent className="max-w-[90vw] w-[90vw] h-[90vh] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 bg-white border border-gray-200">
        <DialogHeader className="px-6 py-4 border-b border-gray-100 shrink-0">
          <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center">
            <FileText className="h-5 w-5 text-orange-500 mr-2" />
            {mode === 'create' ? 'Crea nuovo task' : 'Modifica task'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <TabsList className="mx-6 mt-3 grid w-auto grid-cols-4 bg-gray-50 border border-gray-200 shrink-0">
                <TabsTrigger 
                  value="details" 
                  className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Dettagli
                </TabsTrigger>
                <TabsTrigger 
                  value="people" 
                  className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Persone
                  {(assignees.length > 0 || watchers.length > 0) && (
                    <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5 flex items-center justify-center text-xs">
                      {assignees.length + watchers.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="checklist" 
                  className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Checklist
                  {checklistItems.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5 flex items-center justify-center text-xs">
                      {checklistItems.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="attachments" 
                  className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
                  data-testid="tab-trigger-attachments"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Allegati
                  {selectedFiles.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5 flex items-center justify-center text-xs">
                      {selectedFiles.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto px-6">
                <TabsContent value="details" className="m-0 space-y-4 mt-4 pb-6">
                  <div className="space-y-4 p-3 rounded-lg bg-white border border-gray-200">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Titolo <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Inserisci il titolo del task"
                              className="border-gray-200 focus:border-orange-500"
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
                          <FormLabel className="text-sm font-medium text-gray-700">Descrizione</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Descrizione dettagliata del task"
                              rows={3}
                              className="border-gray-200 focus:border-orange-500 resize-none"
                              data-testid="input-task-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-white border border-gray-200">
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Stato <span className="text-red-500">*</span>
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} data-testid="select-status">
                              <FormControl>
                                <SelectTrigger className="border-gray-200">
                                  <SelectValue placeholder="Seleziona stato" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {statusOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value} className={option.color} data-testid={`option-status-${option.value}`}>
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

                    <div className="p-3 rounded-lg bg-white border border-gray-200">
                      <FormField
                        control={form.control}
                        name="department"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Dipartimento</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} data-testid="select-department">
                              <FormControl>
                                <SelectTrigger className="border-gray-200">
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
                  </div>

                  <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                    <h3 className="text-sm font-semibold mb-3 text-orange-900">Priorità & Urgenza</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Priorità <span className="text-red-500">*</span>
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} data-testid="select-priority">
                              <FormControl>
                                <SelectTrigger className="border-gray-200 bg-white">
                                  <SelectValue placeholder="Seleziona priorità" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {priorityOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value} data-testid={`option-priority-${option.value}`}>
                                    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", option.color)}>
                                      {option.label}
                                    </span>
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
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Urgenza <span className="text-red-500">*</span>
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} data-testid="select-urgency">
                              <FormControl>
                                <SelectTrigger className="border-gray-200 bg-white">
                                  <SelectValue placeholder="Seleziona urgenza" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {urgencyOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value} data-testid={`option-urgency-${option.value}`}>
                                    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", option.color)}>
                                      {option.label}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-white border border-gray-200 h-full">
                      <FormField
                        control={form.control}
                        name="dueDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="text-sm font-medium text-gray-700 mb-2">Scadenza</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      'w-full justify-start text-left font-normal border-gray-200',
                                      !field.value && 'text-muted-foreground'
                                    )}
                                    data-testid="button-due-date"
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? (
                                      format(field.value, 'PPP', { locale: it })
                                    ) : (
                                      <span>Seleziona data</span>
                                    )}
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
                    </div>

                    <div className="p-3 rounded-lg bg-white border border-gray-200 h-full">
                      <FormField
                        control={form.control}
                        name="tags"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Tag</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="es: frontend, urgente"
                                className="border-gray-200"
                                data-testid="input-task-tags"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="people" className="m-0 mt-4 pb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-white border border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-600" />
                        Seleziona utenti
                      </h3>
                      <ScrollArea className="h-96 border border-gray-100 rounded-lg">
                        <div className="p-2 space-y-1">
                          {users.map((user) => {
                            const isAssignee = assignees.includes(user.id);
                            const isWatcher = watchers.includes(user.id);
                            return (
                              <div
                                key={user.id}
                                className={cn(
                                  "flex items-center space-x-2 p-2 rounded-md transition-colors",
                                  isAssignee || isWatcher ? 'bg-orange-50' : 'hover:bg-gray-50'
                                )}
                              >
                                <Checkbox
                                  checked={isAssignee}
                                  onCheckedChange={() => toggleAssignee(user.id)}
                                  className="border-gray-300"
                                  data-testid={`checkbox-assignee-${user.id}`}
                                />
                                <span className="flex-1 text-sm text-gray-700 cursor-pointer" onClick={() => toggleAssignee(user.id)}>
                                  {getUserDisplayName(user.id)}
                                </span>
                                <Checkbox
                                  checked={isWatcher}
                                  onCheckedChange={() => toggleWatcher(user.id)}
                                  className="border-gray-300"
                                  data-testid={`checkbox-watcher-${user.id}`}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                      <div className="mt-2 text-xs text-gray-500 flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Checkbox className="h-3 w-3" disabled /> Assegnatario
                        </span>
                        <span className="flex items-center gap-1">
                          <Checkbox className="h-3 w-3" disabled /> Osservatore
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="p-3 rounded-lg bg-white border border-gray-200">
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="h-4 w-4 text-orange-600" />
                          <h3 className="text-sm font-semibold text-gray-900">
                            Assegnatari ({assignees.length})
                          </h3>
                        </div>
                        {assignees.length > 0 ? (
                          <div className="space-y-2">
                            {assignees.map((userId) => (
                              <div 
                                key={userId}
                                className="flex items-center gap-2 p-2 rounded-md bg-orange-50 border border-orange-200"
                                data-testid={`selected-assignee-${userId}`}
                              >
                                <Users className="h-4 w-4 text-orange-600 shrink-0" />
                                <span className="flex-1 text-sm text-gray-900 font-medium">
                                  {getUserDisplayName(userId)}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleAssignee(userId)}
                                  className="h-6 w-6 p-0 hover:bg-orange-100"
                                  data-testid={`remove-assignee-${userId}`}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500">Nessun assegnatario selezionato</p>
                        )}
                      </div>

                      <div className="p-3 rounded-lg bg-white border border-gray-200">
                        <div className="flex items-center gap-2 mb-3">
                          <Eye className="h-4 w-4 text-blue-600" />
                          <h3 className="text-sm font-semibold text-gray-900">
                            Osservatori ({watchers.length})
                          </h3>
                        </div>
                        {watchers.length > 0 ? (
                          <div className="space-y-2">
                            {watchers.map((userId) => (
                              <div 
                                key={userId}
                                className="flex items-center gap-2 p-2 rounded-md bg-blue-50 border border-blue-200"
                                data-testid={`selected-watcher-${userId}`}
                              >
                                <Eye className="h-4 w-4 text-blue-600 shrink-0" />
                                <span className="flex-1 text-sm text-gray-900 font-medium">
                                  {getUserDisplayName(userId)}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleWatcher(userId)}
                                  className="h-6 w-6 p-0 hover:bg-blue-100"
                                  data-testid={`remove-watcher-${userId}`}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500">Nessun osservatore selezionato</p>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="checklist" className="m-0 mt-4 pb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-white border border-gray-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Plus className="h-4 w-4 text-purple-600" />
                        <h3 className="text-sm font-semibold text-gray-900">Aggiungi attività</h3>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Titolo attività</label>
                          <Input
                            placeholder="es: Rivedere documento..."
                            value={newChecklistItem}
                            onChange={(e) => setNewChecklistItem(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                addChecklistItem();
                              }
                            }}
                            className="border-gray-200 text-sm"
                            data-testid="input-checklist-item"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Assegna a</label>
                          <Select
                            value={newChecklistItemAssignee}
                            onValueChange={setNewChecklistItemAssignee}
                          >
                            <SelectTrigger className="w-full border-gray-200">
                              <SelectValue placeholder="Seleziona utente..." />
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
                        </div>

                        <Button
                          type="button"
                          onClick={addChecklistItem}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                          disabled={!newChecklistItem.trim()}
                          data-testid="button-add-checklist-item"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Aggiungi alla lista
                        </Button>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-white border border-gray-200">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckSquare className="h-4 w-4 text-purple-600" />
                        <h3 className="text-sm font-semibold text-gray-900">
                          Attività ({checklistItems.length})
                        </h3>
                      </div>

                      {checklistItems.length > 0 ? (
                        <ScrollArea className="h-80">
                          <div className="space-y-2 pr-3">
                            {checklistItems.map((item, index) => (
                              <div
                                key={index}
                                className="flex items-start gap-2 p-2 rounded-md bg-purple-50 border border-purple-200"
                                data-testid={`checklist-item-${index}`}
                              >
                                <CheckSquare className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-900 font-medium">{item.title}</p>
                                  {item.assignedToUserId && (
                                    <p className="text-xs text-gray-600 mt-0.5">
                                      Assegnato a: {getUserDisplayName(item.assignedToUserId)}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeChecklistItem(index)}
                                  className="h-6 w-6 p-0 shrink-0 hover:bg-purple-100"
                                  data-testid={`button-remove-checklist-${index}`}
                                >
                                  <X className="h-3 w-3 text-red-500" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      ) : (
                        <div className="text-center py-12 text-gray-400">
                          <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Nessuna attività in checklist</p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="attachments" className="m-0 mt-4 pb-6">
                  <div className="p-3 rounded-lg bg-white border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <h3 className="text-sm font-semibold text-gray-900">Aggiungi file</h3>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-400 transition-colors">
                        <Input
                          type="file"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            setSelectedFiles(prev => [...prev, ...files]);
                            e.target.value = '';
                          }}
                          className="hidden"
                          id="file-upload"
                          data-testid="input-file-upload"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm font-medium text-gray-700">Clicca per selezionare file</p>
                          <p className="text-xs text-gray-500 mt-1">o trascina i file qui</p>
                        </label>
                      </div>

                      {selectedFiles.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-700">File selezionati ({selectedFiles.length})</h4>
                          <div className="space-y-2 max-h-80 overflow-y-auto">
                            {selectedFiles.map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 p-2 rounded-md bg-blue-50 border border-blue-200"
                                data-testid={`attachment-preview-${index}`}
                              >
                                <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-900 font-medium truncate">{file.name}</p>
                                  <p className="text-xs text-gray-600">
                                    {(file.size / 1024).toFixed(1)} KB
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
                                  className="h-6 w-6 p-0 shrink-0 hover:bg-blue-100"
                                  data-testid={`button-remove-attachment-${index}`}
                                >
                                  <X className="h-3 w-3 text-red-500" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
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
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                data-testid="button-submit"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvataggio...
                  </>
                ) : mode === 'create' ? (
                  'Crea task'
                ) : (
                  'Salva modifiche'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
