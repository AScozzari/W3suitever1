import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { User } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  CalendarIcon, 
  Loader2, 
  X, 
  Plus, 
  Users, 
  CheckSquare, 
  Paperclip,
  Tag,
  FileText,
  Trash2,
  UserPlus,
  ArrowLeftRight,
  Eye,
  UserCheck,
  Pencil,
  Check,
} from 'lucide-react';

const taskFormSchema = z.object({
  title: z.string().min(3, 'Il titolo deve contenere almeno 3 caratteri').max(255),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done', 'archived']),
  priority: z.enum(['low', 'medium', 'high']),
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
  department: z.enum(['hr', 'operations', 'support', 'finance', 'crm', 'sales', 'marketing']).optional(),
  dueDate: z.date().optional(),
  startDate: z.date().optional(),
  tags: z.string().optional(),
  storeId: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

interface ChecklistItem {
  id?: string;
  title: string;
  assignedToUserId?: string;
  position: number;
  isCompleted: boolean;
}

interface AssignedUser {
  userId: string;
  role: 'assignee' | 'watcher';
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
  { value: 'todo', label: 'Da fare', color: 'bg-gray-100 text-gray-700' },
  { value: 'in_progress', label: 'In corso', color: 'bg-blue-100 text-blue-700' },
  { value: 'review', label: 'In revisione', color: 'bg-rose-100 text-rose-700' },
  { value: 'done', label: 'Completato', color: 'bg-green-100 text-green-700' },
  { value: 'archived', label: 'Archiviato', color: 'bg-gray-100 text-gray-400' },
];

const priorityOptions = [
  { value: 'low', label: 'Bassa', color: 'bg-gray-100 text-gray-700' },
  { value: 'medium', label: 'Media', color: 'bg-blue-100 text-blue-700' },
  { value: 'high', label: 'Alta', color: 'bg-rose-100 text-rose-700' },
];

const urgencyOptions = [
  { value: 'low', label: 'Non urgente', color: 'bg-gray-100 text-gray-700' },
  { value: 'medium', label: 'Moderata', color: 'bg-blue-100 text-blue-700' },
  { value: 'high', label: 'Urgente', color: 'bg-rose-100 text-rose-700' },
  { value: 'critical', label: 'Critica', color: 'bg-red-100 text-red-700' },
];

const departmentOptions = [
  { value: 'hr', label: 'hr' },
  { value: 'operations', label: 'operations' },
  { value: 'support', label: 'support' },
  { value: 'finance', label: 'finance' },
  { value: 'crm', label: 'crm' },
  { value: 'sales', label: 'sales' },
  { value: 'marketing', label: 'marketing' },
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
  const [assignedUsers, setAssignedUsers] = useState<AssignedUser[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  
  const prevOpenRef = useRef(false);
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const { data: stores = [], isLoading: storesLoading } = useQuery<any[]>({
    queryKey: ['/api/stores'],
  });

  useEffect(() => {
    if (users && users.length > 0) {
      console.log('✅ USERS LOADED:', users.length, 'users');
    }
    if (stores && stores.length > 0) {
      console.log('✅ STORES LOADED:', stores.length, 'stores', stores[0]);
    }
  }, [users, stores]);

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
      startDate: undefined,
      tags: '',
      storeId: undefined,
      ...initialData,
    },
  });

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      if (mode === 'edit') {
        const existingUsers: AssignedUser[] = [
          ...(existingAssignees || []).map(id => ({ userId: id, role: 'assignee' as const })),
          ...(existingWatchers || []).map(id => ({ userId: id, role: 'watcher' as const })),
        ];
        setAssignedUsers(existingUsers);
        setChecklistItems(existingChecklistItems || []);
      } else {
        // In modalità create, aggiungi sempre l'utente corrente come creatore di default
        if (user?.id) {
          console.log('✅ CREATOR AUTO-ASSIGNED:', user.id, user.email);
          setAssignedUsers([{ userId: user.id, role: 'assignee' }]);
        } else {
          console.warn('⚠️ No user found for auto-assignment');
          setAssignedUsers([]);
        }
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
        startDate: undefined,
        tags: '',
        storeId: undefined,
        ...initialData,
      });
    }
    
    prevOpenRef.current = open;
  }, [open, mode, initialData, existingAssignees, existingWatchers, existingChecklistItems, form, user, users]);

  const handleSubmit = async (data: TaskFormData) => {
    const assignees = assignedUsers.filter(u => u.role === 'assignee').map(u => u.userId);
    const watchers = assignedUsers.filter(u => u.role === 'watcher').map(u => u.userId);
    
    await onSubmit({
      ...data,
      assignees,
      watchers,
      checklistItems,
      attachments: selectedFiles,
    });
    
    form.reset();
    setAssignedUsers([]);
    setChecklistItems([]);
    setSelectedFiles([]);
  };

  const getUserDisplayName = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return userId;
    return (user as any).displayName || (user as any).username || user.email || userId;
  };

  const getUserInitials = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return '?';
    const displayName = (user as any).displayName || (user as any).username || user.email || '';
    if (displayName.length >= 2) {
      const parts = displayName.split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return displayName.substring(0, 2).toUpperCase();
    }
    return displayName[0]?.toUpperCase() || '?';
  };

  const addUser = (userId: string, role: 'assignee' | 'watcher') => {
    const exists = assignedUsers.find(u => u.userId === userId);
    if (exists) {
      setAssignedUsers(prev => 
        prev.map(u => u.userId === userId ? { ...u, role } : u)
      );
    } else {
      setAssignedUsers(prev => [...prev, { userId, role }]);
    }
    setShowUserPicker(false);
  };

  const removeUser = (userId: string) => {
    setAssignedUsers(prev => prev.filter(u => u.userId !== userId));
  };

  const toggleUserRole = (userId: string) => {
    setAssignedUsers(prev => 
      prev.map(u => 
        u.userId === userId 
          ? { ...u, role: u.role === 'assignee' ? 'watcher' as const : 'assignee' as const } 
          : u
      )
    );
  };

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    
    setChecklistItems(prev => [
      ...prev,
      {
        title: newChecklistItem.trim(),
        position: prev.length,
        isCompleted: false,
      },
    ]);
    setNewChecklistItem('');
  };

  const removeChecklistItem = (index: number) => {
    setChecklistItems(prev => 
      prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, position: i }))
    );
  };

  const toggleChecklistItem = (index: number) => {
    setChecklistItems(prev => 
      prev.map((item, i) => 
        i === index ? { ...item, isCompleted: !item.isCompleted } : item
      )
    );
  };

  const startEditChecklistItem = (index: number) => {
    setEditingIndex(index);
    setEditingText(checklistItems[index].title);
  };

  const saveEditChecklistItem = () => {
    if (editingIndex === null || !editingText.trim()) return;
    setChecklistItems(prev => 
      prev.map((item, i) => 
        i === editingIndex ? { ...item, title: editingText.trim() } : item
      )
    );
    setEditingIndex(null);
    setEditingText('');
  };

  const cancelEditChecklistItem = () => {
    setEditingIndex(null);
    setEditingText('');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const availableUsers = users.filter(u => 
    !assignedUsers.some(au => au.userId === u.id)
  );

  const completedCount = checklistItems.filter(item => item.isCompleted).length;
  const completionPercentage = checklistItems.length > 0 ? (completedCount / checklistItems.length) * 100 : 0;

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
        {/* HEADER */}
        <DialogHeader className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-orange-100">
          <DialogTitle className="text-xl font-bold text-gray-900">
            {mode === 'create' ? '✨ Crea nuovo task' : '✏️ Modifica task'}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            {mode === 'create' 
              ? 'Compila i campi per creare un nuovo task e assegnarlo al tuo team' 
              : 'Modifica i dettagli del task esistente'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col">
            {/* SCROLLABLE CONTENT */}
            <ScrollArea className="max-h-[calc(90vh-180px)] px-6">
              <div className="py-6 space-y-8">
                
                {/* SEZIONE 1: DETTAGLI TASK */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b-2 border-orange-200">
                    <div className="w-1 h-6 bg-orange-500 rounded-full" />
                    <h3 className="text-lg font-bold text-gray-900">Dettagli Task</h3>
                  </div>

                  {/* Title */}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-gray-900">
                          Titolo <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Es: Preparare report mensile vendite"
                            className="h-11 border-gray-300 focus:border-orange-500 focus:ring-orange-200"
                            data-testid="input-task-title"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Description */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-gray-900">Descrizione</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Descrizione dettagliata del task, obiettivi e note aggiuntive..."
                            rows={4}
                            className="border-gray-300 focus:border-orange-500 focus:ring-orange-200 resize-none"
                            data-testid="input-task-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Status & Department */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-gray-900">
                            Stato <span className="text-red-500">*</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} data-testid="select-status">
                            <FormControl>
                              <SelectTrigger className="h-11 border-gray-300">
                                <SelectValue placeholder="Seleziona stato" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {statusOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  <Badge className={cn("text-xs", option.color)}>{option.label}</Badge>
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
                          <FormLabel className="text-sm font-semibold text-gray-900">Dipartimento</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} data-testid="select-department">
                            <FormControl>
                              <SelectTrigger className="h-11 border-gray-300">
                                <SelectValue placeholder="Seleziona dipartimento" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {departmentOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
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

                  {/* Priority & Urgency */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-gray-900">
                            Priorità <span className="text-red-500">*</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} data-testid="select-priority">
                            <FormControl>
                              <SelectTrigger className="h-11 border-gray-300">
                                <SelectValue placeholder="Seleziona priorità" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {priorityOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  <Badge className={cn("text-xs", option.color)}>{option.label}</Badge>
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
                          <FormLabel className="text-sm font-semibold text-gray-900">
                            Urgenza <span className="text-red-500">*</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} data-testid="select-urgency">
                            <FormControl>
                              <SelectTrigger className="h-11 border-gray-300">
                                <SelectValue placeholder="Seleziona urgenza" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {urgencyOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  <Badge className={cn("text-xs", option.color)}>{option.label}</Badge>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="text-sm font-semibold text-gray-900 mb-2">Data Inizio</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    'h-11 w-full justify-start text-left font-normal border-gray-300',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                  data-testid="button-start-date"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? format(field.value, 'PPP', { locale: it }) : 'Seleziona data'}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
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
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="text-sm font-semibold text-gray-900 mb-2">Scadenza</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    'h-11 w-full justify-start text-left font-normal border-gray-300',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                  data-testid="button-due-date"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? format(field.value, 'PPP', { locale: it }) : 'Seleziona data'}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Tags & Store */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="tags"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <Tag className="h-4 w-4" /> Tags
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="urgente, importante, cliente..."
                              className="h-11 border-gray-300 focus:border-orange-500 focus:ring-orange-200"
                              data-testid="input-tags"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="storeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-gray-900">Punto Vendita</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={storesLoading} data-testid="select-store">
                            <FormControl>
                              <SelectTrigger className="h-11 border-gray-300">
                                <SelectValue placeholder={storesLoading ? "Caricamento..." : stores.length === 0 ? "Nessun punto vendita disponibile" : "Seleziona punto vendita"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {stores.length === 0 && !storesLoading ? (
                                <div className="p-4 text-sm text-gray-500 text-center">
                                  Nessun punto vendita disponibile
                                </div>
                              ) : (
                                stores.map((store) => (
                                  <SelectItem key={store.id} value={store.id}>
                                    {store.nome || store.code || store.id}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* SEZIONE 2: TEAM */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-6 bg-orange-500 rounded-full" />
                      <h3 className="text-lg font-bold text-gray-900">Team</h3>
                      <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                        {assignedUsers.length}
                      </Badge>
                    </div>
                    <Popover open={showUserPicker} onOpenChange={setShowUserPicker}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 border-orange-300 text-orange-700 hover:bg-orange-50"
                          disabled={usersLoading}
                          data-testid="button-add-user"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          {usersLoading ? 'Caricamento...' : 'Aggiungi persona'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-0" align="end">
                        <Command>
                          <CommandInput placeholder="🔍 Cerca utente..." />
                          <CommandEmpty>
                            {usersLoading ? 'Caricamento utenti...' : 'Nessun utente trovato'}
                          </CommandEmpty>
                          <CommandGroup className="max-h-64 overflow-y-auto">
                            {usersLoading ? (
                              <div className="p-4 text-sm text-gray-500 text-center flex items-center justify-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Caricamento utenti...
                              </div>
                            ) : availableUsers.length === 0 ? (
                              <div className="p-4 text-sm text-gray-500 text-center">
                                Tutti gli utenti sono già stati aggiunti
                              </div>
                            ) : (
                              availableUsers.map((u) => (
                                <CommandItem
                                  key={u.id}
                                  value={`${getUserDisplayName(u.id)} ${u.email}`}
                                  onSelect={() => {
                                    addUser(u.id, 'assignee');
                                  }}
                                  className="flex items-center justify-between cursor-pointer hover:bg-orange-50"
                                >
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                      <AvatarFallback className="bg-orange-100 text-orange-700 text-xs font-bold">
                                        {getUserInitials(u.id)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="text-sm">
                                      <div className="font-medium">{getUserDisplayName(u.id)}</div>
                                      <div className="text-xs text-gray-500">{u.email}</div>
                                    </div>
                                  </div>
                                  <Plus className="h-4 w-4 text-orange-600" />
                                </CommandItem>
                              ))
                            )}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Creator Display */}
                  {user && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-gray-600 mb-2">Creatore</p>
                      <div
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 bg-orange-50 border-orange-400 w-fit"
                        data-testid="creator-pill"
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs font-bold bg-orange-300 text-orange-900">
                            {getUserInitials(user.id)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-gray-900">
                          {getUserDisplayName(user.id)}
                        </span>
                        <Badge variant="secondary" className="bg-orange-200 text-orange-800 text-xs font-semibold">
                          Creatore
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* Assigned Users Pills */}
                  {assignedUsers.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-gray-600 mb-2">Assegnatari e Osservatori</p>
                    </div>
                  )}
                  {assignedUsers.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {assignedUsers.map((au) => (
                        <div
                          key={au.userId}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all",
                            au.role === 'assignee' 
                              ? "bg-orange-50 border-orange-300" 
                              : "bg-orange-50 border-orange-300"
                          )}
                          data-testid={`user-pill-${au.userId}`}
                        >
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className={cn(
                              "text-xs font-bold",
                              au.role === 'assignee' 
                                ? "bg-orange-200 text-orange-800" 
                                : "bg-orange-200 text-orange-800"
                            )}>
                              {getUserInitials(au.userId)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-gray-900">
                            {getUserDisplayName(au.userId)}
                          </span>
                          <div className="flex items-center gap-1">
                            {au.role === 'assignee' ? (
                              <UserCheck className="h-4 w-4 text-orange-600" />
                            ) : (
                              <Eye className="h-4 w-4 text-orange-600" />
                            )}
                            <span className={cn(
                              "text-xs font-semibold",
                              au.role === 'assignee' ? "text-orange-700" : "text-orange-600"
                            )}>
                              {au.role === 'assignee' ? 'Assegnatario' : 'Osservatore'}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => toggleUserRole(au.userId)}
                            className={cn(
                              "h-7 px-2 gap-1 transition-all",
                              au.role === 'assignee' 
                                ? "border-orange-300 text-orange-700 hover:bg-orange-50" 
                                : "border-orange-300 text-orange-700 hover:bg-orange-50"
                            )}
                            title={au.role === 'assignee' ? 'Cambia in Osservatore' : 'Cambia in Assegnatario'}
                            data-testid={`button-toggle-role-${au.userId}`}
                          >
                            <ArrowLeftRight className="h-3 w-3" />
                            <span className="text-xs font-medium">
                              {au.role === 'assignee' ? 'Osservatore' : 'Assegnatario'}
                            </span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeUser(au.userId)}
                            className="h-6 w-6 p-0 hover:bg-red-100 text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Nessuna persona assegnata</p>
                  )}
                </div>

                <Separator />

                {/* SEZIONE 3: CHECKLIST */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-orange-500 rounded-full" />
                    <h3 className="text-lg font-bold text-gray-900">Checklist</h3>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                      {checklistItems.length}
                    </Badge>
                  </div>

                  {/* Progress Bar */}
                  {checklistItems.length > 0 && (
                    <div className="space-y-2 p-4 rounded-lg bg-orange-50 border border-orange-200">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700">Completamento</span>
                        <span className="font-bold text-orange-600">{Math.round(completionPercentage)}%</span>
                      </div>
                      <Progress value={completionPercentage} className="h-2 bg-orange-200" />
                      <div className="text-xs text-gray-600">
                        {completedCount} di {checklistItems.length} completati
                      </div>
                    </div>
                  )}

                  {/* Add Checklist Item */}
                  <div className="flex gap-2">
                    <Input
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      placeholder="Nuovo elemento checklist..."
                      className="flex-1 h-10 border-gray-300 focus:border-orange-500 focus:ring-orange-200"
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
                      onClick={addChecklistItem}
                      disabled={!newChecklistItem.trim()}
                      className="h-10 bg-orange-600 hover:bg-orange-700 text-white"
                      data-testid="button-add-checklist-item"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Checklist Items */}
                  {checklistItems.length > 0 && (
                    <div className="space-y-2">
                      {checklistItems.map((item, index) => (
                        <div
                          key={index}
                          className={cn(
                            "flex items-center gap-2 p-3 rounded-lg border transition-all",
                            item.isCompleted 
                              ? "bg-green-50 border-green-200" 
                              : "bg-white border-gray-200"
                          )}
                          data-testid={`checklist-item-${index}`}
                        >
                          {editingIndex === index ? (
                            <>
                              <Input
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                className="flex-1 h-8 text-sm border-orange-300 focus:border-orange-500"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    saveEditChecklistItem();
                                  } else if (e.key === 'Escape') {
                                    cancelEditChecklistItem();
                                  }
                                }}
                                data-testid={`input-edit-checklist-${index}`}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={saveEditChecklistItem}
                                className="h-7 w-7 p-0 hover:bg-green-100 text-green-600"
                                data-testid={`button-save-checklist-${index}`}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={cancelEditChecklistItem}
                                className="h-7 w-7 p-0 hover:bg-gray-100 text-gray-600"
                                data-testid={`button-cancel-edit-checklist-${index}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Checkbox
                                checked={item.isCompleted}
                                onCheckedChange={() => toggleChecklistItem(index)}
                                data-testid={`checkbox-checklist-${index}`}
                              />
                              <span className={cn(
                                "flex-1 text-sm",
                                item.isCompleted ? "line-through text-gray-500" : "text-gray-900 font-medium"
                              )}>
                                {item.title}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditChecklistItem(index)}
                                className="h-7 w-7 p-0 hover:bg-orange-100 text-orange-600"
                                data-testid={`button-edit-checklist-${index}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeChecklistItem(index)}
                                className="h-7 w-7 p-0 hover:bg-red-100 text-red-600"
                                data-testid={`button-remove-checklist-${index}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* SEZIONE 4: ALLEGATI */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-orange-500 rounded-full" />
                    <h3 className="text-lg font-bold text-gray-900">Allegati</h3>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                      {selectedFiles.length}
                    </Badge>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    data-testid="input-file-upload"
                  />
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full min-h-[100px] border-2 border-dashed border-orange-300 hover:border-orange-500 hover:bg-orange-50 py-6"
                    data-testid="button-upload-file"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <Paperclip className="h-6 w-6 text-orange-600" />
                      <span className="text-base font-semibold text-gray-700">Clicca per caricare file</span>
                      <span className="text-xs text-gray-500">PDF, immagini, documenti...</span>
                    </div>
                  </Button>

                  {selectedFiles.length > 0 && (
                    <div className="space-y-2">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-lg bg-white border border-gray-200 hover:border-orange-300 transition-colors"
                          data-testid={`attached-file-${index}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText className="h-5 w-5 text-orange-600 shrink-0" />
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {file.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {(file.size / 1024).toFixed(1)} KB
                              </div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="h-8 w-8 p-0 hover:bg-red-100 text-red-600 shrink-0"
                            data-testid={`button-remove-file-${index}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </ScrollArea>

            {/* FOOTER */}
            <div className="shrink-0 px-6 py-4 border-t border-gray-200 bg-white">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 h-11 font-semibold border-gray-300 hover:bg-gray-100"
                  disabled={isSubmitting}
                  data-testid="button-cancel-task"
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 h-11 font-semibold bg-orange-600 hover:bg-orange-700 text-white"
                  data-testid="button-submit-task"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvataggio...
                    </>
                  ) : (
                    <>✨ {mode === 'create' ? 'Crea Task' : 'Salva Modifiche'}</>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
