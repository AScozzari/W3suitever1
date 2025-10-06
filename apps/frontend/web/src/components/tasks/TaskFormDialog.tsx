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
  ChevronDown,
  ChevronUp,
  Eye,
  Trash2,
  FileText,
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
  { value: 'review', label: 'In revisione', color: 'bg-purple-100 text-purple-700' },
  { value: 'done', label: 'Completato', color: 'bg-green-100 text-green-700' },
  { value: 'archived', label: 'Archiviato', color: 'bg-gray-100 text-gray-400' },
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
  const [assignedUsers, setAssignedUsers] = useState<AssignedUser[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  const [peopleCollapsed, setPeopleCollapsed] = useState(false);
  const [checklistCollapsed, setChecklistCollapsed] = useState(false);
  const [attachmentsCollapsed, setAttachmentsCollapsed] = useState(false);
  
  const [userSearch, setUserSearch] = useState('');
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [newChecklistAssignee, setNewChecklistAssignee] = useState<string>('');
  
  const prevOpenRef = useRef(false);
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const { data: stores = [] } = useQuery<any[]>({
    queryKey: ['/api/stores'],
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
        if (user?.id && users.length > 0 && users.some(u => u.id === user.id)) {
          setAssignedUsers([{ userId: user.id, role: 'assignee' }]);
        } else {
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
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return fullName || user.email;
  };

  const getUserInitials = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return '?';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) return firstName[0].toUpperCase();
    if (user.email) return user.email[0].toUpperCase();
    return '?';
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
    setUserSearch('');
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
        assignedToUserId: (newChecklistAssignee && newChecklistAssignee !== 'unassigned') ? newChecklistAssignee : undefined,
        position: prev.length,
        isCompleted: false,
      },
    ]);
    setNewChecklistItem('');
    setNewChecklistAssignee('');
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

  const updateChecklistItemAssignee = (index: number, userId: string) => {
    setChecklistItems(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, assignedToUserId: userId || undefined } : item
      )
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const filteredUsers = users.filter(u => {
    const searchLower = userSearch.toLowerCase();
    const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim().toLowerCase();
    const email = u.email.toLowerCase();
    return fullName.includes(searchLower) || email.includes(searchLower);
  });

  const availableUsers = filteredUsers.filter(u => 
    !assignedUsers.some(au => au.userId === u.id)
  );

  const taskAssignees = assignedUsers.filter(u => u.role === 'assignee').map(u => u.userId);
  const completedCount = checklistItems.filter(item => item.isCompleted).length;
  const completionPercentage = checklistItems.length > 0 ? (completedCount / checklistItems.length) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] p-0 gap-0 bg-white border border-gray-200 overflow-hidden">
        <DialogHeader className="px-8 py-5 border-b border-gray-100 shrink-0 bg-gradient-to-r from-orange-50 to-purple-50">
          <DialogTitle className="text-2xl font-bold text-gray-900">
            {mode === 'create' ? '✨ Crea nuovo task' : '✏️ Modifica task'}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 mt-1">
            {mode === 'create' 
              ? 'Compila i campi per creare un nuovo task e assegnarlo al tuo team' 
              : 'Modifica i dettagli del task esistente'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-1 min-h-0">
            {/* MAIN CONTENT - 65% */}
            <div className="flex-[65] overflow-y-auto px-8 py-6 bg-white">
              <div className="space-y-6 max-w-3xl">
                {/* Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold text-gray-900">
                        Titolo del Task <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Es: Preparare report mensile vendite"
                          className="h-12 text-base border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
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
                      <FormLabel className="text-base font-semibold text-gray-900">
                        Descrizione
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Descrizione dettagliata del task, obiettivi e note aggiuntive..."
                          rows={5}
                          className="text-base border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 resize-none"
                          data-testid="input-task-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Status & Department */}
                <div className="grid grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold text-gray-900">
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
                              <SelectItem key={option.value} value={option.value} data-testid={`option-status-${option.value}`}>
                                <Badge className={cn("text-xs font-medium", option.color)}>{option.label}</Badge>
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
                        <FormLabel className="text-base font-semibold text-gray-900">Dipartimento</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} data-testid="select-department">
                          <FormControl>
                            <SelectTrigger className="h-11 border-gray-300">
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

                {/* Priority & Urgency Card */}
                <div className="p-6 rounded-xl bg-gradient-to-br from-orange-50 via-white to-purple-50 border-2 border-orange-200 shadow-sm">
                  <h3 className="text-lg font-bold mb-4 text-gray-900 flex items-center gap-2">
                    <span className="text-orange-600">🎯</span> Priorità & Urgenza
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold text-gray-900">
                            Priorità <span className="text-red-500">*</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} data-testid="select-priority">
                            <FormControl>
                              <SelectTrigger className="h-11 border-gray-300 bg-white">
                                <SelectValue placeholder="Seleziona priorità" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {priorityOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value} data-testid={`option-priority-${option.value}`}>
                                  <Badge className={cn("text-xs font-medium", option.color)}>{option.label}</Badge>
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
                          <FormLabel className="text-base font-semibold text-gray-900">
                            Urgenza <span className="text-red-500">*</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} data-testid="select-urgency">
                            <FormControl>
                              <SelectTrigger className="h-11 border-gray-300 bg-white">
                                <SelectValue placeholder="Seleziona urgenza" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {urgencyOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value} data-testid={`option-urgency-${option.value}`}>
                                  <Badge className={cn("text-xs font-medium", option.color)}>{option.label}</Badge>
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

                {/* Dates */}
                <div className="grid grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-base font-semibold text-gray-900 mb-2">Data Inizio</FormLabel>
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
                        <FormLabel className="text-base font-semibold text-gray-900 mb-2">Scadenza</FormLabel>
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
                <div className="grid grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold text-gray-900 flex items-center gap-2">
                          <Tag className="h-4 w-4" /> Tags
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="urgente, importante, cliente..."
                            className="h-11 border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
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
                        <FormLabel className="text-base font-semibold text-gray-900">Punto Vendita</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} data-testid="select-store">
                          <FormControl>
                            <SelectTrigger className="h-11 border-gray-300">
                              <SelectValue placeholder="Seleziona punto vendita" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {stores.map((store) => (
                              <SelectItem key={store.id} value={store.id} data-testid={`option-store-${store.id}`}>
                                {store.name}
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
            </div>

            {/* SIDEBAR - 35% */}
            <div className="flex-[35] border-l border-gray-200 bg-gradient-to-br from-orange-50 via-purple-50 to-white overflow-hidden flex flex-col">
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                  {/* PEOPLE SECTION */}
                  <div className="rounded-xl bg-white/80 backdrop-blur-sm border-2 border-orange-200 shadow-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setPeopleCollapsed(!peopleCollapsed)}
                      className="w-full px-5 py-4 flex items-center justify-between bg-gradient-to-r from-orange-500 to-purple-600 text-white hover:from-orange-600 hover:to-purple-700 transition-all"
                      data-testid="button-toggle-people"
                    >
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5" />
                        <span className="font-bold text-base">Persone</span>
                        <Badge variant="secondary" className="bg-white/20 text-white border-white/40">
                          {assignedUsers.length}
                        </Badge>
                      </div>
                      {peopleCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                    </button>

                    {!peopleCollapsed && (
                      <div className="p-5 space-y-4">
                        {/* User Search Command */}
                        <Command className="border-2 border-orange-200 rounded-lg">
                          <CommandInput 
                            placeholder="🔍 Cerca utente..." 
                            value={userSearch}
                            onValueChange={setUserSearch}
                            className="h-11"
                          />
                          <CommandEmpty className="py-3 text-sm text-gray-500">Nessun utente trovato</CommandEmpty>
                          {userSearch && availableUsers.length > 0 && (
                            <CommandGroup className="max-h-48 overflow-y-auto">
                              {availableUsers.map((u) => (
                                <CommandItem
                                  key={u.id}
                                  onSelect={() => addUser(u.id, 'assignee')}
                                  className="flex items-center justify-between cursor-pointer"
                                  data-testid={`user-search-item-${u.id}`}
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
                              ))}
                            </CommandGroup>
                          )}
                        </Command>

                        {/* Assigned Users List */}
                        {assignedUsers.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                              Assegnati ({assignedUsers.length})
                            </div>
                            {assignedUsers.map((au) => (
                              <div
                                key={au.userId}
                                className="flex items-center justify-between p-3 rounded-lg bg-white border border-gray-200 hover:border-orange-300 transition-colors"
                                data-testid={`assigned-user-${au.userId}`}
                              >
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-9 w-9">
                                    <AvatarFallback className="bg-gradient-to-br from-orange-400 to-purple-500 text-white text-xs font-bold">
                                      {getUserInitials(au.userId)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="text-sm">
                                    <div className="font-medium text-gray-900">{getUserDisplayName(au.userId)}</div>
                                    <Badge 
                                      variant={au.role === 'assignee' ? 'default' : 'secondary'}
                                      className={cn(
                                        "text-xs mt-1",
                                        au.role === 'assignee' 
                                          ? "bg-orange-100 text-orange-700 border-orange-300" 
                                          : "bg-purple-100 text-purple-700 border-purple-300"
                                      )}
                                    >
                                      {au.role === 'assignee' ? '👤 Assegnatario' : '👁️ Osservatore'}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleUserRole(au.userId)}
                                    className="h-8 w-8 p-0 hover:bg-orange-100"
                                    data-testid={`button-toggle-role-${au.userId}`}
                                  >
                                    {au.role === 'assignee' ? <Eye className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeUser(au.userId)}
                                    className="h-8 w-8 p-0 hover:bg-red-100 text-red-600"
                                    data-testid={`button-remove-user-${au.userId}`}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* CHECKLIST SECTION */}
                  <div className="rounded-xl bg-white/80 backdrop-blur-sm border-2 border-purple-200 shadow-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setChecklistCollapsed(!checklistCollapsed)}
                      className="w-full px-5 py-4 flex items-center justify-between bg-gradient-to-r from-purple-500 to-orange-500 text-white hover:from-purple-600 hover:to-orange-600 transition-all"
                      data-testid="button-toggle-checklist"
                    >
                      <div className="flex items-center gap-3">
                        <CheckSquare className="h-5 w-5" />
                        <span className="font-bold text-base">Checklist</span>
                        <Badge variant="secondary" className="bg-white/20 text-white border-white/40">
                          {checklistItems.length}
                        </Badge>
                      </div>
                      {checklistCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                    </button>

                    {!checklistCollapsed && (
                      <div className="p-5 space-y-4">
                        {/* Progress Bar */}
                        {checklistItems.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium text-gray-700">Completamento</span>
                              <span className="font-bold text-purple-600">{Math.round(completionPercentage)}%</span>
                            </div>
                            <Progress value={completionPercentage} className="h-3" />
                            <div className="text-xs text-gray-500">
                              {completedCount} di {checklistItems.length} completati
                            </div>
                          </div>
                        )}

                        {/* Add Checklist Item */}
                        <div className="space-y-3 p-4 rounded-lg bg-purple-50 border border-purple-200">
                          <Input
                            value={newChecklistItem}
                            onChange={(e) => setNewChecklistItem(e.target.value)}
                            placeholder="Nuovo elemento checklist..."
                            className="border-purple-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addChecklistItem();
                              }
                            }}
                            data-testid="input-new-checklist-item"
                          />
                          <Select value={newChecklistAssignee} onValueChange={setNewChecklistAssignee}>
                            <SelectTrigger className="border-purple-300" data-testid="select-checklist-assignee">
                              <SelectValue placeholder="Assegna a..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Non assegnato</SelectItem>
                              {taskAssignees.map((userId) => (
                                <SelectItem key={userId} value={userId}>
                                  {getUserDisplayName(userId)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            onClick={addChecklistItem}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                            disabled={!newChecklistItem.trim()}
                            data-testid="button-add-checklist-item"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Aggiungi elemento
                          </Button>
                        </div>

                        {/* Checklist Items */}
                        {checklistItems.length > 0 && (
                          <div className="space-y-2">
                            {checklistItems.map((item, index) => (
                              <div
                                key={index}
                                className={cn(
                                  "flex items-start gap-3 p-3 rounded-lg border transition-all",
                                  item.isCompleted 
                                    ? "bg-green-50 border-green-200" 
                                    : "bg-white border-gray-200 hover:border-purple-300"
                                )}
                                data-testid={`checklist-item-${index}`}
                              >
                                <Checkbox
                                  checked={item.isCompleted}
                                  onCheckedChange={() => toggleChecklistItem(index)}
                                  className="mt-1"
                                  data-testid={`checkbox-checklist-${index}`}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className={cn(
                                    "text-sm font-medium",
                                    item.isCompleted ? "line-through text-gray-500" : "text-gray-900"
                                  )}>
                                    {item.title}
                                  </div>
                                  {item.assignedToUserId && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      👤 {getUserDisplayName(item.assignedToUserId)}
                                    </div>
                                  )}
                                </div>
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
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ATTACHMENTS SECTION */}
                  <div className="rounded-xl bg-white/80 backdrop-blur-sm border-2 border-orange-200 shadow-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setAttachmentsCollapsed(!attachmentsCollapsed)}
                      className="w-full px-5 py-4 flex items-center justify-between bg-gradient-to-r from-orange-500 to-purple-600 text-white hover:from-orange-600 hover:to-purple-700 transition-all"
                      data-testid="button-toggle-attachments"
                    >
                      <div className="flex items-center gap-3">
                        <Paperclip className="h-5 w-5" />
                        <span className="font-bold text-base">Allegati</span>
                        <Badge variant="secondary" className="bg-white/20 text-white border-white/40">
                          {selectedFiles.length}
                        </Badge>
                      </div>
                      {attachmentsCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                    </button>

                    {!attachmentsCollapsed && (
                      <div className="p-5 space-y-4">
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
                          className="w-full h-24 border-2 border-dashed border-orange-300 hover:border-orange-500 hover:bg-orange-50 transition-all"
                          data-testid="button-upload-file"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <Paperclip className="h-6 w-6 text-orange-600" />
                            <span className="text-sm font-medium text-gray-700">Clicca per caricare file</span>
                          </div>
                        </Button>

                        {selectedFiles.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                              File selezionati ({selectedFiles.length})
                            </div>
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
                    )}
                  </div>
                </div>
              </ScrollArea>

              {/* FOOTER - Action Buttons */}
              <div className="shrink-0 p-6 border-t border-gray-200 bg-white">
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="flex-1 h-12 text-base font-semibold border-gray-300 hover:bg-gray-100"
                    disabled={isSubmitting}
                    data-testid="button-cancel-task"
                  >
                    Annulla
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 h-12 text-base font-semibold bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white shadow-lg"
                    data-testid="button-submit-task"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Salvataggio...
                      </>
                    ) : mode === 'create' ? (
                      '✨ Crea Task'
                    ) : (
                      '💾 Salva Modifiche'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
