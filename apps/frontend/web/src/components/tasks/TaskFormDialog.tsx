import { useState, useEffect, useRef } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  CalendarIcon, 
  UserPlus, 
  Trash2, 
  Upload, 
  X, 
  FileText, 
  Paperclip,
  Search,
  UserCheck,
  Eye,
  Check,
  Plus,
  Pencil,
  CheckSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ChecklistItem {
  title: string;
  isCompleted: boolean;
  position: number;
}

interface AssignedUser {
  userId: string;
  role: 'assignee' | 'watcher';
}

const taskFormSchema = z.object({
  title: z.string().min(1, 'Il titolo è obbligatorio'),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done', 'archived']),
  priority: z.enum(['low', 'medium', 'high']),
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
  department: z.enum(['hr', 'operations', 'sales', 'marketing', 'it', 'finance', 'other']).optional(),
  dueDate: z.date().optional(),
  startDate: z.date().optional(),
  tags: z.string().optional(),
  storeId: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

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
  { value: 'hr', label: 'Hr' },
  { value: 'operations', label: 'Operations' },
  { value: 'sales', label: 'Sales' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'it', label: 'It' },
  { value: 'finance', label: 'Finance' },
  { value: 'other', label: 'Altro' }
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
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, 'assignee' | 'watcher'>>({});
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [editingChecklistIndex, setEditingChecklistIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevOpenRef = useRef(open);
  
  const { user } = useAuth();

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
    },
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: open,
  });

  const { data: stores = [] } = useQuery<any[]>({
    queryKey: ['/api/stores'],
    enabled: open,
  });

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      if (existingAssignees) {
        const assignees = existingAssignees.map(userId => ({ userId, role: 'assignee' as const }));
        setAssignedUsers(prev => [...prev.filter(u => u.role === 'watcher'), ...assignees]);
      }

      if (existingWatchers) {
        const watchers = existingWatchers.map(userId => ({ userId, role: 'watcher' as const }));
        setAssignedUsers(prev => [...prev.filter(u => u.role === 'assignee'), ...watchers]);
      }

      if (existingChecklistItems) {
        setChecklistItems(existingChecklistItems);
      }

      if (mode === 'create' && user && !assignedUsers.some(au => au.userId === user.id)) {
        setAssignedUsers(prev => [...prev, { userId: user.id, role: 'assignee' }]);
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
    
    const firstName = (user as any).firstName || (user as any).first_name || '';
    const lastName = (user as any).lastName || (user as any).last_name || '';
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    if (firstName) return firstName;
    if (lastName) return lastName;
    return user.email || userId;
  };

  const getUserInitials = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return '?';
    
    const firstName = (user as any).firstName || (user as any).first_name || '';
    const lastName = (user as any).lastName || (user as any).last_name || '';
    
    if (firstName && lastName) {
      return (firstName[0] + lastName[0]).toUpperCase();
    }
    if (firstName) return firstName.substring(0, 2).toUpperCase();
    if (user.email) return user.email.substring(0, 2).toUpperCase();
    return '?';
  };

  const removeUser = (userId: string) => {
    setAssignedUsers(prev => prev.filter(u => u.userId !== userId));
  };

  const handleUserSelectorConfirm = () => {
    const newUsers = selectedUserIds.map(userId => ({
      userId,
      role: userRoles[userId] || 'assignee' as const
    }));
    
    setAssignedUsers(prev => {
      const existingIds = prev.map(u => u.userId);
      const filtered = prev.filter(u => !selectedUserIds.includes(u.userId));
      const toAdd = newUsers.filter(nu => !existingIds.includes(nu.userId));
      return [...filtered, ...newUsers.filter(nu => existingIds.includes(nu.userId)), ...toAdd];
    });
    
    setShowUserSelector(false);
    setSelectedUserIds([]);
    setUserRoles({});
    setUserSearchQuery('');
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
    setChecklistItems(prev => prev.filter((_, i) => i !== index));
  };

  const toggleChecklistItem = (index: number) => {
    setChecklistItems(prev => 
      prev.map((item, i) => 
        i === index ? { ...item, isCompleted: !item.isCompleted } : item
      )
    );
  };

  const startEditChecklistItem = (index: number) => {
    setEditingChecklistIndex(index);
    setEditingText(checklistItems[index].title);
  };

  const saveChecklistItemEdit = () => {
    if (editingChecklistIndex !== null && editingText.trim()) {
      setChecklistItems(prev => 
        prev.map((item, i) => 
          i === editingChecklistIndex ? { ...item, title: editingText.trim() } : item
        )
      );
    }
    setEditingChecklistIndex(null);
    setEditingText('');
  };

  const cancelChecklistItemEdit = () => {
    setEditingChecklistIndex(null);
    setEditingText('');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const availableUsers = users.filter(u => !assignedUsers.some(au => au.userId === u.id));
  const filteredUsers = userSearchQuery 
    ? availableUsers.filter(u => 
        getUserDisplayName(u.id).toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
      )
    : availableUsers;

  const completedCount = checklistItems.filter(item => item.isCompleted).length;
  const completionPercentage = checklistItems.length > 0 ? (completedCount / checklistItems.length) * 100 : 0;

  const assignees = assignedUsers.filter(u => u.role === 'assignee');
  const watchers = assignedUsers.filter(u => u.role === 'watcher');

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-orange-600" />
              {mode === 'create' ? 'Crea nuovo task' : 'Modifica task'}
            </DialogTitle>
            <DialogDescription>
              {mode === 'create' 
                ? 'Compila i campi per creare un nuovo task' 
                : 'Modifica i dettagli del task esistente'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-4">
              {/* Titolo */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titolo</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Es: Preparare report mensile vendite"
                        data-testid="input-task-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Descrizione */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrizione</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Descrivi i dettagli del task..."
                        className="resize-none min-h-[80px]"
                        data-testid="input-task-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status, Priority, Urgency */}
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stato</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-task-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {statusOptions.map(option => (
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

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priorità</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-task-priority">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {priorityOptions.map(option => (
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

                <FormField
                  control={form.control}
                  name="urgency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Urgenza</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-task-urgency">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {urgencyOptions.map(option => (
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

              {/* Department & Store */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dipartimento</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-task-department">
                            <SelectValue placeholder="Seleziona dipartimento" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departmentOptions.map(dept => (
                            <SelectItem key={dept.value} value={dept.value}>
                              {dept.label}
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
                  name="storeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Punto Vendita</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-task-store">
                            <SelectValue placeholder="Seleziona store" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-64">
                          {stores.map(store => (
                            <SelectItem key={store.id} value={store.id}>
                              {store.nome || store.name}
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
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data Inizio</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="button-select-start-date"
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: it })
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
                            disabled={(date) => date < new Date("1900-01-01")}
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
                      <FormLabel>Scadenza</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="button-select-due-date"
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: it })
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
                            disabled={(date) => date < new Date("1900-01-01")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Tags */}
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Es: urgente, vendite, report"
                        data-testid="input-task-tags"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Team Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Team</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUserSelector(true)}
                    data-testid="button-add-user"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Aggiungi persona
                  </Button>
                </div>

                {user && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-600">Creatore</p>
                    <div className="flex flex-wrap gap-2">
                      <div
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-orange-500 text-white"
                        data-testid={`creator-pill-${user.id}`}
                      >
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-xs bg-orange-600 text-white">
                            {getUserInitials(user.id)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {getUserDisplayName(user.id)}
                        </span>
                        <Badge className="bg-orange-600 hover:bg-orange-600 text-white text-xs px-1.5 py-0">
                          Creatore
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                {assignees.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-600">Assegnati</p>
                    <div className="flex flex-wrap gap-2">
                      {assignees.map((au) => (
                        <div
                          key={au.userId}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-orange-50 border border-orange-200"
                          data-testid={`user-pill-${au.userId}`}
                        >
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-xs bg-orange-500 text-white">
                              {getUserInitials(au.userId)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-gray-900">
                            {getUserDisplayName(au.userId)}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeUser(au.userId)}
                            className="h-4 w-4 p-0 hover:bg-orange-100"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {watchers.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-600">Osservatori</p>
                    <div className="flex flex-wrap gap-2">
                      {watchers.map((au) => (
                        <div
                          key={au.userId}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-50 border border-blue-200"
                          data-testid={`user-pill-${au.userId}`}
                        >
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-xs bg-blue-500 text-white">
                              {getUserInitials(au.userId)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-gray-900">
                            {getUserDisplayName(au.userId)}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeUser(au.userId)}
                            className="h-4 w-4 p-0 hover:bg-blue-100"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Checklist */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Checklist</h3>
                  {checklistItems.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {completedCount}/{checklistItems.length}
                    </span>
                  )}
                </div>

                {checklistItems.length > 0 && (
                  <div className="space-y-1">
                    <Progress value={completionPercentage} className="h-2" />
                    <p className="text-xs text-gray-500">
                      {Math.round(completionPercentage)}% completato
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    placeholder="Nuovo elemento..."
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
                    size="sm"
                    data-testid="button-add-checklist-item"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {checklistItems.length > 0 && (
                  <div className="space-y-2">
                    {checklistItems.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 rounded border"
                        data-testid={`checklist-item-${index}`}
                      >
                        <Checkbox
                          checked={item.isCompleted}
                          onCheckedChange={() => toggleChecklistItem(index)}
                          data-testid={`checkbox-checklist-${index}`}
                        />
                        {editingChecklistIndex === index ? (
                          <>
                            <Input
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              className="flex-1"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  saveChecklistItemEdit();
                                } else if (e.key === 'Escape') {
                                  cancelChecklistItemEdit();
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={saveChecklistItemEdit}
                              className="h-6 w-6 p-0"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={cancelChecklistItemEdit}
                              className="h-6 w-6 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className={cn("flex-1 text-sm", item.isCompleted && "line-through text-gray-400")}>
                              {item.title}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditChecklistItem(index)}
                              className="h-6 w-6 p-0"
                              data-testid={`button-edit-checklist-${index}`}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeChecklistItem(index)}
                              className="h-6 w-6 p-0"
                              data-testid={`button-remove-checklist-${index}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Allegati */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Allegati</h3>
                  {selectedFiles.length > 0 && (
                    <span className="text-xs text-gray-500">{selectedFiles.length} file</span>
                  )}
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
                  className="w-full"
                  data-testid="button-upload-file"
                >
                  <Paperclip className="h-4 w-4 mr-2" />
                  Carica file
                </Button>

                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 rounded border text-sm"
                        data-testid={`attached-file-${index}`}
                      >
                        <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                        <span className="flex-1 truncate">{file.name}</span>
                        <span className="text-xs text-gray-500 shrink-0">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="h-6 w-6 p-0 shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-orange-600 hover:bg-orange-700"
                  data-testid="button-submit-task"
                >
                  {isSubmitting ? 'Salvataggio...' : mode === 'create' ? 'Crea Task' : 'Salva'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* User Selector Dialog */}
      <Dialog open={showUserSelector} onOpenChange={setShowUserSelector}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Seleziona Persone</DialogTitle>
            <DialogDescription>
              Scegli chi assegnare o chi deve osservare il task
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Cerca..."
                className="pl-9"
              />
            </div>

            <div className="max-h-[400px] overflow-y-auto border rounded-md">
              {usersLoading ? (
                <p className="text-sm text-gray-500 text-center py-8">Caricamento...</p>
              ) : filteredUsers.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  Nessun utente disponibile
                </p>
              ) : (
                <div className="divide-y">
                  {filteredUsers.map((u) => {
                    const isSelected = selectedUserIds.includes(u.id);
                    const currentRole = userRoles[u.id] || 'assignee';
                    
                    return (
                      <div
                        key={u.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedUserIds(prev => [...prev, u.id]);
                              setUserRoles(prev => ({ ...prev, [u.id]: 'assignee' }));
                            } else {
                              setSelectedUserIds(prev => prev.filter(id => id !== u.id));
                              setUserRoles(prev => {
                                const newRoles = { ...prev };
                                delete newRoles[u.id];
                                return newRoles;
                              });
                            }
                          }}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">
                            {getUserInitials(u.id)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{getUserDisplayName(u.id)}</div>
                          <div className="text-xs text-gray-500 truncate">{u.email}</div>
                        </div>
                        {isSelected && (
                          <Select
                            value={currentRole}
                            onValueChange={(value: 'assignee' | 'watcher') => {
                              setUserRoles(prev => ({ ...prev, [u.id]: value }));
                            }}
                          >
                            <SelectTrigger className="w-32 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="assignee">Assegnato</SelectItem>
                              <SelectItem value="watcher">Osservatore</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowUserSelector(false);
                setSelectedUserIds([]);
                setUserRoles({});
                setUserSearchQuery('');
              }}
            >
              Annulla
            </Button>
            <Button
              type="button"
              onClick={handleUserSelectorConfirm}
              className="bg-orange-600 hover:bg-orange-700"
              disabled={selectedUserIds.length === 0}
            >
              Conferma ({selectedUserIds.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
