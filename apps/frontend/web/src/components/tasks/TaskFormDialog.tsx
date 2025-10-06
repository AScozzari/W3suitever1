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
  User as UserIcon,
  Eye,
  Search,
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
  
  // Sidebar sections collapsed state
  const [peopleCollapsed, setPeopleCollapsed] = useState(false);
  const [checklistCollapsed, setChecklistCollapsed] = useState(false);
  const [attachmentsCollapsed, setAttachmentsCollapsed] = useState(false);
  
  // User search
  const [userSearch, setUserSearch] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);
  
  // Checklist input
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
      // Change role if different
      setAssignedUsers(prev => 
        prev.map(u => u.userId === userId ? { ...u, role } : u)
      );
    } else {
      setAssignedUsers(prev => [...prev, { userId, role }]);
    }
    setShowUserSearch(false);
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
        assignedToUserId: newChecklistAssignee || undefined,
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 gap-0 bg-white border border-gray-200 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-gray-100 shrink-0">
          <DialogTitle className="text-xl font-semibold text-gray-900">
            {mode === 'create' ? 'Crea nuovo task' : 'Modifica task'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-1 min-h-0">
            {/* Main Content - 60% */}
            <div className="flex-[3] overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {/* Title & Description */}
                <div className="space-y-4">
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
                            className="border-gray-200 focus:border-orange-500 focus:ring-orange-500"
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
                            rows={4}
                            className="border-gray-200 focus:border-orange-500 focus:ring-orange-500 resize-none"
                            data-testid="input-task-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Status & Department */}
                <div className="grid grid-cols-2 gap-4">
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
                              <SelectItem key={option.value} value={option.value} data-testid={`option-status-${option.value}`}>
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

                {/* Priority & Urgency */}
                <div className="p-4 rounded-lg bg-gradient-to-br from-orange-50 to-purple-50 border border-orange-200">
                  <h3 className="text-sm font-semibold mb-3 text-gray-900">Priorità & Urgenza</h3>
                  <div className="grid grid-cols-2 gap-4">
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
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-sm font-medium text-gray-700 mb-2">Data Inizio</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full justify-start text-left font-normal border-gray-200',
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
                                {field.value ? format(field.value, 'PPP', { locale: it }) : 'Seleziona data'}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Store & Tags */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="storeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Punto Vendita</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} data-testid="select-store">
                          <FormControl>
                            <SelectTrigger className="border-gray-200">
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

                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">
                          <Tag className="inline h-3.5 w-3.5 mr-1" />
                          Tag
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="es: frontend, urgente"
                            className="border-gray-200 focus:border-orange-500"
                            data-testid="input-task-tags"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Sidebar - 40% */}
            <div className="flex-[2] border-l border-gray-200 bg-gradient-to-br from-gray-50 to-orange-50/30 overflow-y-auto">
              <div className="p-4 space-y-4">
                {/* People Section */}
                <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setPeopleCollapsed(!peopleCollapsed)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-orange-600" />
                      <span className="font-semibold text-sm text-gray-900">Persone</span>
                      {assignedUsers.length > 0 && (
                        <Badge variant="secondary" className="h-5 px-2 text-xs">
                          {assignedUsers.length}
                        </Badge>
                      )}
                    </div>
                    {peopleCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>

                  {!peopleCollapsed && (
                    <div className="px-3 pb-3 space-y-3">
                      {/* User Search */}
                      {!showUserSearch && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowUserSearch(true)}
                          className="w-full border-dashed border-gray-300 hover:border-orange-500"
                          data-testid="button-add-user"
                        >
                          <Plus className="h-3.5 w-3.5 mr-2" />
                          Aggiungi utente
                        </Button>
                      )}

                      {showUserSearch && (
                        <div className="space-y-2">
                          <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <Input
                              value={userSearch}
                              onChange={(e) => setUserSearch(e.target.value)}
                              placeholder="Cerca utente..."
                              className="pl-9 text-sm"
                              autoFocus
                              data-testid="input-search-user"
                            />
                          </div>
                          
                          {availableUsers.length > 0 && (
                            <ScrollArea className="h-40 border border-gray-200 rounded-md">
                              <div className="p-2 space-y-1">
                                {availableUsers.map((user) => (
                                  <div
                                    key={user.id}
                                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer text-sm"
                                  >
                                    <div className="flex items-center gap-2 flex-1">
                                      <Avatar className="h-6 w-6">
                                        <AvatarFallback className="text-xs bg-orange-100 text-orange-700">
                                          {getUserInitials(user.id)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-sm truncate">{getUserDisplayName(user.id)}</span>
                                    </div>
                                    <div className="flex gap-1">
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => addUser(user.id, 'assignee')}
                                        className="h-7 px-2 text-xs"
                                        data-testid={`button-add-assignee-${user.id}`}
                                      >
                                        <UserIcon className="h-3 w-3 mr-1" />
                                        Assegna
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => addUser(user.id, 'watcher')}
                                        className="h-7 px-2 text-xs"
                                        data-testid={`button-add-watcher-${user.id}`}
                                      >
                                        <Eye className="h-3 w-3 mr-1" />
                                        Osserva
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          )}

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowUserSearch(false);
                              setUserSearch('');
                            }}
                            className="w-full text-xs"
                          >
                            Chiudi
                          </Button>
                        </div>
                      )}

                      <Separator />

                      {/* Assigned Users List */}
                      {assignedUsers.length > 0 ? (
                        <div className="space-y-2">
                          {assignedUsers.map((assignedUser) => (
                            <div
                              key={assignedUser.userId}
                              className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200"
                              data-testid={`assigned-user-${assignedUser.userId}`}
                            >
                              <Avatar className="h-7 w-7 shrink-0">
                                <AvatarFallback className="text-xs bg-orange-100 text-orange-700">
                                  {getUserInitials(assignedUser.userId)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{getUserDisplayName(assignedUser.userId)}</p>
                                <button
                                  type="button"
                                  onClick={() => toggleUserRole(assignedUser.userId)}
                                  className="text-xs text-gray-600 hover:text-orange-600"
                                  data-testid={`button-toggle-role-${assignedUser.userId}`}
                                >
                                  {assignedUser.role === 'assignee' ? (
                                    <Badge className="bg-orange-100 text-orange-700 text-xs">Assegnatario</Badge>
                                  ) : (
                                    <Badge className="bg-purple-100 text-purple-700 text-xs">Osservatore</Badge>
                                  )}
                                </button>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeUser(assignedUser.userId)}
                                className="h-7 w-7 p-0 shrink-0"
                                data-testid={`button-remove-user-${assignedUser.userId}`}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 text-center py-2">Nessun utente assegnato</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Checklist Section */}
                <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setChecklistCollapsed(!checklistCollapsed)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-purple-600" />
                      <span className="font-semibold text-sm text-gray-900">Checklist</span>
                      {checklistItems.length > 0 && (
                        <Badge variant="secondary" className="h-5 px-2 text-xs">
                          {completedCount}/{checklistItems.length}
                        </Badge>
                      )}
                    </div>
                    {checklistCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>

                  {!checklistCollapsed && (
                    <div className="px-3 pb-3 space-y-3">
                      {/* Add Checklist Item */}
                      <div className="space-y-2">
                        <Input
                          value={newChecklistItem}
                          onChange={(e) => setNewChecklistItem(e.target.value)}
                          placeholder="Nuova attività..."
                          className="text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addChecklistItem();
                            }
                          }}
                          data-testid="input-new-checklist-item"
                        />
                        <div className="flex gap-2">
                          <Select
                            value={newChecklistAssignee}
                            onValueChange={setNewChecklistAssignee}
                            disabled={taskAssignees.length === 0}
                          >
                            <SelectTrigger className="text-xs h-8" data-testid="select-checklist-assignee">
                              <SelectValue placeholder="Assegna a..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Nessuno</SelectItem>
                              {taskAssignees.map((userId) => (
                                <SelectItem key={userId} value={userId}>
                                  {getUserDisplayName(userId)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            size="sm"
                            onClick={addChecklistItem}
                            disabled={!newChecklistItem.trim()}
                            className="bg-orange-600 hover:bg-orange-700 text-white h-8 px-3"
                            data-testid="button-add-checklist-item"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {checklistItems.length > 0 && <Separator />}

                      {/* Progress Bar */}
                      {checklistItems.length > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>Progresso</span>
                            <span>{completedCount} di {checklistItems.length}</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 transition-all"
                              style={{ width: `${checklistItems.length > 0 ? (completedCount / checklistItems.length) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Checklist Items */}
                      {checklistItems.length > 0 ? (
                        <ScrollArea className="max-h-60">
                          <div className="space-y-2">
                            {checklistItems.map((item, index) => (
                              <div
                                key={index}
                                className={cn(
                                  "flex items-start gap-2 p-2 rounded border transition-colors",
                                  item.isCompleted 
                                    ? "bg-green-50 border-green-200" 
                                    : "bg-white border-gray-200"
                                )}
                                data-testid={`checklist-item-${index}`}
                              >
                                <Checkbox
                                  checked={item.isCompleted}
                                  onCheckedChange={() => toggleChecklistItem(index)}
                                  className="mt-0.5"
                                  data-testid={`checkbox-checklist-${index}`}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className={cn(
                                    "text-sm",
                                    item.isCompleted && "line-through text-gray-500"
                                  )}>
                                    {item.title}
                                  </p>
                                  {item.assignedToUserId && (
                                    <div className="flex items-center gap-1 mt-1">
                                      <Avatar className="h-4 w-4">
                                        <AvatarFallback className="text-[10px] bg-purple-100 text-purple-700">
                                          {getUserInitials(item.assignedToUserId)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-xs text-gray-600">{getUserDisplayName(item.assignedToUserId)}</span>
                                    </div>
                                  )}
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeChecklistItem(index)}
                                  className="h-6 w-6 p-0 shrink-0"
                                  data-testid={`button-remove-checklist-${index}`}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      ) : (
                        <p className="text-xs text-gray-500 text-center py-2">Nessuna attività nella checklist</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Attachments Section */}
                <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setAttachmentsCollapsed(!attachmentsCollapsed)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-blue-600" />
                      <span className="font-semibold text-sm text-gray-900">Allegati</span>
                      {selectedFiles.length > 0 && (
                        <Badge variant="secondary" className="h-5 px-2 text-xs">
                          {selectedFiles.length}
                        </Badge>
                      )}
                    </div>
                    {attachmentsCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>

                  {!attachmentsCollapsed && (
                    <div className="px-3 pb-3 space-y-3">
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
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full border-dashed border-gray-300 hover:border-blue-500"
                        data-testid="button-upload-file"
                      >
                        <Paperclip className="h-3.5 w-3.5 mr-2" />
                        Carica file
                      </Button>

                      {selectedFiles.length > 0 && <Separator />}

                      {selectedFiles.length > 0 ? (
                        <div className="space-y-2">
                          {selectedFiles.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200"
                              data-testid={`attachment-${index}`}
                            >
                              <Paperclip className="h-4 w-4 text-gray-400 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm truncate">{file.name}</p>
                                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(index)}
                                className="h-6 w-6 p-0 shrink-0"
                                data-testid={`button-remove-attachment-${index}`}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 text-center py-2">Nessun allegato</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        </Form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0 bg-white">
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
            onClick={form.handleSubmit(handleSubmit)}
            disabled={isSubmitting}
            className="bg-orange-600 hover:bg-orange-700 text-white"
            data-testid="button-submit"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Crea task' : 'Salva modifiche'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
