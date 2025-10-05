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
  }) => Promise<void>;
  initialData?: Partial<TaskFormData>;
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
  { value: 'low', label: 'Bassa', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'medium', label: 'Media', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'high', label: 'Alta', color: 'bg-red-100 text-red-800 border-red-200' },
];

const urgencyOptions = [
  { value: 'low', label: 'Non urgente', color: 'bg-blue-50 text-blue-700' },
  { value: 'medium', label: 'Moderata', color: 'bg-orange-50 text-orange-700' },
  { value: 'high', label: 'Urgente', color: 'bg-red-50 text-red-700' },
  { value: 'critical', label: 'Critica', color: 'bg-red-100 text-red-900 font-semibold' },
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
  const [activeTab, setActiveTab] = useState('details');
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
    if (open) {
      setActiveTab('details');
      if (initialData) {
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
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 overflow-hidden">
        <DialogHeader className="px-6 py-5 border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-purple-600 bg-clip-text text-transparent">
            {mode === 'create' ? '✨ Crea nuovo task' : '📝 Modifica task'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col h-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="mx-6 mt-4 grid w-auto grid-cols-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200/50">
                <TabsTrigger 
                  value="details" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-purple-500 data-[state=active]:text-white transition-all"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Dettagli
                </TabsTrigger>
                <TabsTrigger 
                  value="people" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-purple-500 data-[state=active]:text-white transition-all"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Persone
                  {(assignees.length > 0 || watchers.length > 0) && (
                    <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {assignees.length + watchers.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="checklist" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-purple-500 data-[state=active]:text-white transition-all"
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Checklist
                  {checklistItems.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {checklistItems.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 px-6">
                <TabsContent value="details" className="space-y-6 mt-6 pb-6">
                  <div className="p-5 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-gray-200/50 shadow-lg transition-all hover:shadow-xl">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold flex items-center gap-2">
                            <Tag className="h-4 w-4 text-orange-500" />
                            Titolo <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Inserisci il titolo del task"
                              className="text-lg font-medium border-2 focus:border-orange-500 transition-all"
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
                        <FormItem className="mt-5">
                          <FormLabel className="text-base font-semibold">Descrizione</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Descrizione dettagliata del task"
                              rows={4}
                              className="border-2 focus:border-purple-500 transition-all resize-none"
                              data-testid="input-task-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-gray-200/50 shadow-lg">
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold">Stato <span className="text-red-500">*</span></FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} data-testid="select-status">
                              <FormControl>
                                <SelectTrigger className="border-2">
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

                    <div className="p-5 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-gray-200/50 shadow-lg">
                      <FormField
                        control={form.control}
                        name="department"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold">Dipartimento</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} data-testid="select-department">
                              <FormControl>
                                <SelectTrigger className="border-2">
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

                  <div className="p-5 rounded-xl bg-gradient-to-br from-orange-50 to-purple-50 dark:from-orange-900/20 dark:to-purple-900/20 backdrop-blur-xl border border-orange-200/50 shadow-lg">
                    <h3 className="text-sm font-bold mb-4 text-orange-900 dark:text-orange-100">⚡ Priorità & Urgenza (Eisenhower Matrix)</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold">Priorità <span className="text-red-500">*</span></FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} data-testid="select-priority">
                              <FormControl>
                                <SelectTrigger className="border-2">
                                  <SelectValue placeholder="Seleziona priorità" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {priorityOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value} data-testid={`option-priority-${option.value}`}>
                                    <span className={cn("px-2 py-1 rounded text-xs font-medium", option.color)}>
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
                            <FormLabel className="text-sm font-semibold">Urgenza <span className="text-red-500">*</span></FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} data-testid="select-urgency">
                              <FormControl>
                                <SelectTrigger className="border-2">
                                  <SelectValue placeholder="Seleziona urgenza" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {urgencyOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value} data-testid={`option-urgency-${option.value}`}>
                                    <span className={cn("px-2 py-1 rounded text-xs font-medium", option.color)}>
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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-gray-200/50 shadow-lg">
                      <FormField
                        control={form.control}
                        name="dueDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="text-base font-semibold flex items-center gap-2">
                              <Clock className="h-4 w-4 text-orange-500" />
                              Scadenza
                            </FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      'w-full pl-3 text-left font-normal border-2',
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
                    </div>

                    <div className="p-5 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-gray-200/50 shadow-lg">
                      <FormField
                        control={form.control}
                        name="tags"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold flex items-center gap-2">
                              <Tag className="h-4 w-4 text-purple-500" />
                              Tag
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="es: frontend, urgente"
                                className="border-2"
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

                <TabsContent value="people" className="space-y-6 mt-6 pb-6">
                  <div className="p-6 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 backdrop-blur-xl border-2 border-orange-300/50 shadow-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-orange-500 text-white">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-orange-900 dark:text-orange-100">Assegnatari</h3>
                        <p className="text-sm text-orange-700 dark:text-orange-300">Persone responsabili del task</p>
                      </div>
                    </div>
                    <ScrollArea className="max-h-60 rounded-lg bg-white/70 dark:bg-gray-900/70 border p-4">
                      <div className="space-y-3">
                        {users.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-orange-100/50 dark:hover:bg-orange-900/20 transition-all cursor-pointer"
                            onClick={() => toggleAssignee(user.id)}
                          >
                            <Checkbox
                              id={`assignee-${user.id}`}
                              checked={assignees.includes(user.id)}
                              onCheckedChange={() => toggleAssignee(user.id)}
                              data-testid={`checkbox-assignee-${user.id}`}
                              className="border-2"
                            />
                            <label htmlFor={`assignee-${user.id}`} className="text-sm font-medium cursor-pointer flex-1">
                              {getUserDisplayName(user.id)}
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    {assignees.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {assignees.map((userId) => (
                          <Badge key={userId} className="bg-orange-500 hover:bg-orange-600 text-white gap-2 py-1.5 px-3">
                            {getUserDisplayName(userId)}
                            <X className="h-3 w-3 cursor-pointer" onClick={() => toggleAssignee(userId)} />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-6 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 backdrop-blur-xl border-2 border-purple-300/50 shadow-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-purple-500 text-white">
                        <Eye className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-purple-900 dark:text-purple-100">Osservatori</h3>
                        <p className="text-sm text-purple-700 dark:text-purple-300">Persone che ricevono notifiche</p>
                      </div>
                    </div>
                    <ScrollArea className="max-h-60 rounded-lg bg-white/70 dark:bg-gray-900/70 border p-4">
                      <div className="space-y-3">
                        {users.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-purple-100/50 dark:hover:bg-purple-900/20 transition-all cursor-pointer"
                            onClick={() => toggleWatcher(user.id)}
                          >
                            <Checkbox
                              id={`watcher-${user.id}`}
                              checked={watchers.includes(user.id)}
                              onCheckedChange={() => toggleWatcher(user.id)}
                              data-testid={`checkbox-watcher-${user.id}`}
                              className="border-2"
                            />
                            <label htmlFor={`watcher-${user.id}`} className="text-sm font-medium cursor-pointer flex-1">
                              {getUserDisplayName(user.id)}
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    {watchers.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {watchers.map((userId) => (
                          <Badge key={userId} variant="secondary" className="bg-purple-100 text-purple-900 border-purple-300 gap-2 py-1.5 px-3">
                            {getUserDisplayName(userId)}
                            <X className="h-3 w-3 cursor-pointer" onClick={() => toggleWatcher(userId)} />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="checklist" className="space-y-4 mt-6 pb-6">
                  <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 backdrop-blur-xl border-2 border-blue-300/50 shadow-xl">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="p-2 rounded-lg bg-blue-500 text-white">
                        <CheckSquare className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100">Checklist Subtask</h3>
                        <p className="text-sm text-blue-700 dark:text-blue-300">Suddividi il task in step più piccoli</p>
                      </div>
                    </div>

                    <div className="flex gap-2 mb-4">
                      <Input
                        value={newChecklistItem}
                        onChange={(e) => setNewChecklistItem(e.target.value)}
                        placeholder="Aggiungi un nuovo item..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addChecklistItem();
                          }
                        }}
                        className="border-2 border-blue-300 focus:border-blue-500"
                        data-testid="input-new-checklist-item"
                      />
                      <Button
                        type="button"
                        onClick={addChecklistItem}
                        className="bg-blue-500 hover:bg-blue-600"
                        data-testid="button-add-checklist-item"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Aggiungi
                      </Button>
                    </div>

                    {checklistItems.length > 0 ? (
                      <div className="space-y-3">
                        {checklistItems.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-4 bg-white/80 dark:bg-gray-900/80 rounded-lg border-2 border-blue-200 hover:border-blue-400 hover:shadow-md transition-all"
                            data-testid={`checklist-item-${index}`}
                          >
                            <div className="flex-1 flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-300">
                                {index + 1}
                              </div>
                              <span className="flex-1 text-sm font-medium">{item.title}</span>
                            </div>
                            <Select
                              value={item.assignedToUserId || ''}
                              onValueChange={(value) => updateChecklistItemAssignee(index, value)}
                            >
                              <SelectTrigger className="w-[200px] border-2">
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
                              className="hover:bg-red-100 hover:text-red-600"
                              data-testid={`button-remove-checklist-${index}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <CheckSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Nessun item nella checklist</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>

            <div className="px-6 py-4 border-t bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="border-2"
                data-testid="button-cancel"
              >
                Annulla
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-orange-500 to-purple-500 hover:from-orange-600 hover:to-purple-600 text-white font-semibold px-6 shadow-lg"
                data-testid="button-submit-task"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'create' ? '✨ Crea task' : '💾 Salva modifiche'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
