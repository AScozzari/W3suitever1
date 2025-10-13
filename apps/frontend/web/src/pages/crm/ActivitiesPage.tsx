import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { CRMCommandPalette } from '@/components/crm/CRMCommandPalette';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CheckSquare, 
  Plus, 
  Phone, 
  Mail, 
  MessageSquare, 
  Clock, 
  AlertCircle,
  CalendarIcon,
  User,
  LayoutDashboard,
  Megaphone,
  Target,
  UserPlus,
  Users,
  BarChart3
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { CRMSearchBar } from '@/components/crm/CRMSearchBar';
import { useLocation } from 'wouter';

interface Task {
  id: string;
  title: string;
  description: string;
  type: 'call' | 'email' | 'meeting' | 'follow_up';
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  status: 'pending' | 'completed' | 'overdue';
  assignedTo: string;
  relatedTo?: string;
  relatedType?: 'lead' | 'deal' | 'customer';
}

interface Interaction {
  id: string;
  type: 'call' | 'email' | 'whatsapp' | 'meeting';
  outcome: 'success' | 'no_answer' | 'scheduled' | 'rejected';
  duration?: number;
  notes: string;
  contactName: string;
  contactId: string;
  timestamp: string;
  ownerId: string;
  ownerName: string;
}

const TaskCard = ({ task, onComplete }: { task: Task; onComplete: (id: string) => void }) => {
  const typeConfig = {
    call: { icon: Phone, label: 'Chiamata', color: 'hsl(var(--brand-purple))' },
    email: { icon: Mail, label: 'Email', color: 'hsl(220, 90%, 56%)' },
    meeting: { icon: CalendarIcon, label: 'Meeting', color: 'hsl(var(--brand-orange))' },
    follow_up: { icon: CheckSquare, label: 'Follow-up', color: 'hsl(280, 65%, 60%)' }
  };

  const priorityConfig = {
    high: { label: 'Alta', color: 'hsl(0, 84%, 60%)' },
    medium: { label: 'Media', color: 'hsl(var(--brand-orange))' },
    low: { label: 'Bassa', color: 'hsl(142, 76%, 36%)' }
  };

  const config = typeConfig[task.type];
  const Icon = config.icon;
  const priority = priorityConfig[task.priority];
  const isOverdue = task.status === 'overdue';
  const isCompleted = task.status === 'completed';

  return (
    <Card 
      className="p-4 mb-3"
      style={{ 
        background: 'var(--glass-card-bg)',
        borderColor: isOverdue ? 'hsl(0, 84%, 60%)' : 'var(--glass-card-border)',
        opacity: isCompleted ? 0.6 : 1
      }}
      data-testid={`task-${task.id}`}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isCompleted}
          onCheckedChange={() => onComplete(task.id)}
          disabled={isCompleted}
          data-testid={`task-checkbox-${task.id}`}
        />
        <div 
          className="p-2 rounded-lg flex-shrink-0"
          style={{ background: 'var(--glass-bg-light)' }}
        >
          <Icon className="h-4 w-4" style={{ color: config.color }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={`font-medium ${isCompleted ? 'line-through' : ''}`}>
              {task.title}
            </h4>
            <Badge variant="outline" style={{ borderColor: priority.color, color: priority.color, fontSize: '10px' }}>
              {priority.label}
            </Badge>
            {isOverdue && (
              <Badge variant="outline" style={{ borderColor: 'hsl(0, 84%, 60%)', color: 'hsl(0, 84%, 60%)' }}>
                <AlertCircle className="h-3 w-3 mr-1" />
                Scaduto
              </Badge>
            )}
          </div>
          <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
            {task.description}
          </p>
          <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(task.dueDate).toLocaleDateString('it-IT')}
            </div>
            {task.relatedTo && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {task.relatedTo}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

const InteractionCard = ({ interaction }: { interaction: Interaction }) => {
  const typeConfig = {
    call: { icon: Phone, label: 'Chiamata', color: 'hsl(var(--brand-purple))' },
    email: { icon: Mail, label: 'Email', color: 'hsl(220, 90%, 56%)' },
    whatsapp: { icon: MessageSquare, label: 'WhatsApp', color: 'hsl(142, 76%, 36%)' },
    meeting: { icon: CalendarIcon, label: 'Meeting', color: 'hsl(var(--brand-orange))' }
  };

  const outcomeConfig = {
    success: { label: 'Successo', color: 'hsl(142, 76%, 36%)' },
    no_answer: { label: 'Non risponde', color: 'hsl(0, 84%, 60%)' },
    scheduled: { label: 'Pianificato', color: 'hsl(220, 90%, 56%)' },
    rejected: { label: 'Rifiutato', color: 'hsl(0, 84%, 60%)' }
  };

  const config = typeConfig[interaction.type];
  const Icon = config.icon;
  const outcome = outcomeConfig[interaction.outcome];

  return (
    <Card 
      className="p-4 mb-3"
      style={{ 
        background: 'var(--glass-card-bg)',
        borderColor: 'var(--glass-card-border)'
      }}
      data-testid={`interaction-${interaction.id}`}
    >
      <div className="flex items-start gap-3">
        <div 
          className="p-2 rounded-lg flex-shrink-0"
          style={{ background: 'var(--glass-bg-light)' }}
        >
          <Icon className="h-4 w-4" style={{ color: config.color }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium">{config.label} - {interaction.contactName}</h4>
            <Badge variant="outline" style={{ borderColor: outcome.color, color: outcome.color, fontSize: '10px' }}>
              {outcome.label}
            </Badge>
          </div>
          <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
            {interaction.notes}
          </p>
          <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(interaction.timestamp).toLocaleString('it-IT')}
            </div>
            {interaction.duration && (
              <span>{interaction.duration} min</span>
            )}
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-xs" style={{ background: 'hsl(var(--brand-purple))', color: 'white' }}>
                {interaction.ownerName[0]}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default function ActivitiesPage() {
  const [currentModule, setCurrentModule] = useState('crm');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const tenantSlug = window.location.pathname.split('/')[1];
  const [location, setLocation] = useLocation();

  // CRM Navigation Tabs
  const crmTabs = [
    { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: `/${tenantSlug}/crm` },
    { value: 'campaigns', label: 'Campagne', icon: Megaphone, path: `/${tenantSlug}/crm/campaigns` },
    { value: 'pipeline', label: 'Pipeline', icon: Target, path: `/${tenantSlug}/crm/pipeline` },
    { value: 'leads', label: 'Lead', icon: UserPlus, path: `/${tenantSlug}/crm/leads` },
    { value: 'customers', label: 'Clienti', icon: Users, path: `/${tenantSlug}/crm/customers` },
    { value: 'activities', label: 'Attività', icon: CheckSquare, path: `/${tenantSlug}/crm/activities` },
    { value: 'analytics', label: 'Report', icon: BarChart3, path: `/${tenantSlug}/crm/analytics` }
  ];

  const getActiveTab = () => {
    if (location.includes('/crm/campaigns')) return 'campaigns';
    if (location.includes('/crm/leads')) return 'leads';
    if (location.includes('/crm/pipeline')) return 'pipeline';
    if (location.includes('/crm/customers')) return 'customers';
    if (location.includes('/crm/activities')) return 'activities';
    if (location.includes('/crm/analytics')) return 'analytics';
    return 'dashboard';
  };

  const activeTab = getActiveTab();

  const { data: tasksResponse } = useQuery<Task[]>({
    queryKey: ['/api/crm/tasks'],
  });

  const tasks = tasksResponse || [];

  const { data: interactionsResponse } = useQuery<Interaction[]>({
    queryKey: ['/api/crm/interactions'],
  });

  const interactions = interactionsResponse || [];

  const handleCompleteTask = (id: string) => {
    console.log('Complete task:', id);
  };

  const todayTasks = tasks.filter(t => {
    const taskDate = new Date(t.dueDate);
    return taskDate.toDateString() === new Date().toDateString();
  });

  const overdueTasks = tasks.filter(t => t.status === 'overdue');

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <CRMCommandPalette />
      <div className="flex flex-col h-full">
        {/* WindTre Glassmorphism Header */}
        <div className="windtre-glass-panel border-b border-white/20 mb-6">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <CheckSquare className="h-6 w-6 text-windtre-orange" />
                  CRM - Attività e Tasks
                </h1>
                <p className="text-gray-600 mt-1">Gestione task, interazioni e calendario</p>
              </div>
            </div>
            
            {/* Navigation Tabs */}
            <div className="flex gap-1 mt-4">
              {crmTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => setLocation(tab.path)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-windtre-orange text-white' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        
        <CRMSearchBar 
          onSearch={setSearchQuery}
          placeholder="Cerca attività..."
        />
        <div className="flex-1 p-6 overflow-auto">
          <Tabs defaultValue="tasks" className="h-full">
            <div className="flex items-center justify-between mb-6">
              <TabsList>
                <TabsTrigger value="tasks" data-testid="tab-tasks">
                  <CheckSquare className="mr-2 h-4 w-4" />
                  Tasks
                </TabsTrigger>
                <TabsTrigger value="interactions" data-testid="tab-interactions">
                  <Phone className="mr-2 h-4 w-4" />
                  Interazioni
                </TabsTrigger>
                <TabsTrigger value="calendar" data-testid="tab-calendar">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  Calendario
                </TabsTrigger>
              </TabsList>

              <Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
                <DialogTrigger asChild>
                  <Button style={{ background: 'hsl(var(--brand-orange))' }} data-testid="create-task">
                    <Plus className="mr-2 h-4 w-4" />
                    Nuova Attività
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crea Nuova Attività</DialogTitle>
                    <DialogDescription>Pianifica una task o interazione con cliente</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select>
                        <SelectTrigger data-testid="task-type">
                          <SelectValue placeholder="Seleziona tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="call">Chiamata</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="follow_up">Follow-up</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Titolo</Label>
                      <Input placeholder="Es: Follow-up cliente X" data-testid="task-title" />
                    </div>
                    <div className="space-y-2">
                      <Label>Descrizione</Label>
                      <Textarea placeholder="Dettagli..." data-testid="task-description" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Priorità</Label>
                        <Select>
                          <SelectTrigger data-testid="task-priority">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">Alta</SelectItem>
                            <SelectItem value="medium">Media</SelectItem>
                            <SelectItem value="low">Bassa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Data Scadenza</Label>
                        <Input type="date" data-testid="task-due-date" />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCreateTaskOpen(false)}>
                      Annulla
                    </Button>
                    <Button style={{ background: 'hsl(var(--brand-orange))' }} data-testid="save-task">
                      Salva
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <TabsContent value="tasks" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {overdueTasks.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" style={{ color: 'hsl(0, 84%, 60%)' }} />
                        Scadute ({overdueTasks.length})
                      </h3>
                      {overdueTasks.map(task => (
                        <TaskCard key={task.id} task={task} onComplete={handleCompleteTask} />
                      ))}
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Oggi ({todayTasks.length})</h3>
                    {todayTasks.map(task => (
                      <TaskCard key={task.id} task={task} onComplete={handleCompleteTask} />
                    ))}
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Prossime</h3>
                    {tasks.filter(t => 
                      t.status === 'pending' && 
                      new Date(t.dueDate) > new Date() &&
                      new Date(t.dueDate).toDateString() !== new Date().toDateString()
                    ).map(task => (
                      <TaskCard key={task.id} task={task} onComplete={handleCompleteTask} />
                    ))}
                  </div>
                </div>

                <div>
                  <Card 
                    className="p-4"
                    style={{ 
                      background: 'var(--glass-card-bg)',
                      borderColor: 'var(--glass-card-border)'
                    }}
                  >
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      locale={it}
                      className="rounded-md"
                    />
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="interactions" className="mt-0">
              <div className="max-w-4xl">
                <h3 className="text-lg font-semibold mb-4">Ultime Interazioni</h3>
                {interactions.map(interaction => (
                  <InteractionCard key={interaction.id} interaction={interaction} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="calendar" className="mt-0">
              <div className="flex justify-center items-center h-[400px]">
                <p style={{ color: 'var(--text-tertiary)' }}>Vista calendario completa in arrivo...</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
