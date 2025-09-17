import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, Copy, Edit, Trash, Plus, FileText, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ShiftTemplate {
  id: string;
  name: string;
  description?: string;
  pattern: 'daily' | 'weekly' | 'monthly' | 'custom';
  defaultStartTime: string;
  defaultEndTime: string;
  defaultRequiredStaff: number;
  defaultBreakMinutes?: number;
  defaultSkills?: string[];
  rules?: {
    daysOfWeek?: number[];
    datesOfMonth?: number[];
    customPattern?: string;
  };
  isActive: boolean;
}

interface Props {
  templates: ShiftTemplate[];
  storeId: string;
  onApplyTemplate: (templateId: string, startDate: Date, endDate: Date) => Promise<void>;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Gio' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sab' },
  { value: 0, label: 'Dom' }
];

const PATTERN_OPTIONS = [
  { value: 'daily', label: 'Giornaliero', description: 'Ripeti ogni giorno' },
  { value: 'weekly', label: 'Settimanale', description: 'Ripeti giorni specifici della settimana' },
  { value: 'monthly', label: 'Mensile', description: 'Ripeti date specifiche del mese' },
  { value: 'custom', label: 'Personalizzato', description: 'Pattern personalizzato' }
];

export default function ShiftTemplateManager({
  templates,
  storeId,
  onApplyTemplate
}: Props) {
  const [selectedTemplate, setSelectedTemplate] = useState<ShiftTemplate | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applyDateRange, setApplyDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });
  
  const [newTemplate, setNewTemplate] = useState<Partial<ShiftTemplate>>({
    name: '',
    pattern: 'weekly',
    defaultStartTime: '09:00',
    defaultEndTime: '17:00',
    defaultRequiredStaff: 2,
    defaultBreakMinutes: 30,
    rules: { daysOfWeek: [1, 2, 3, 4, 5] }
  });
  
  const { toast } = useToast();
  
  const handleCreateTemplate = async () => {
    if (!newTemplate.name) {
      toast({
        title: "Nome richiesto",
        description: "Inserisci un nome per il template",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const response = await fetch('/api/hr/shift-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate)
      });
      
      if (!response.ok) throw new Error('Failed to create template');
      
      toast({
        title: "Template creato",
        description: "Il template è stato salvato con successo"
      });
      
      setIsCreateModalOpen(false);
      setNewTemplate({
        name: '',
        pattern: 'weekly',
        defaultStartTime: '09:00',
        defaultEndTime: '17:00',
        defaultRequiredStaff: 2,
        defaultBreakMinutes: 30,
        rules: { daysOfWeek: [1, 2, 3, 4, 5] }
      });
      
      // Refresh page to show new template
      window.location.reload();
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile creare il template",
        variant: "destructive"
      });
    }
  };
  
  const handleApplyTemplate = async () => {
    if (!selectedTemplate || !applyDateRange.from || !applyDateRange.to) {
      toast({
        title: "Dati mancanti",
        description: "Seleziona un template e un periodo",
        variant: "destructive"
      });
      return;
    }
    
    try {
      await onApplyTemplate(selectedTemplate.id, applyDateRange.from, applyDateRange.to);
      setIsApplyModalOpen(false);
      setApplyDateRange({ from: undefined, to: undefined });
      setSelectedTemplate(null);
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile applicare il template",
        variant: "destructive"
      });
    }
  };
  
  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/hr/shift-templates/${templateId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete template');
      
      toast({
        title: "Template eliminato",
        description: "Il template è stato rimosso"
      });
      
      // Refresh page
      window.location.reload();
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile eliminare il template",
        variant: "destructive"
      });
    }
  };
  
  const renderTemplateCard = (template: ShiftTemplate) => (
    <Card key={template.id} className="relative" data-testid={`template-${template.id}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{template.name}</CardTitle>
          <Badge variant={template.isActive ? "default" : "secondary"}>
            {template.isActive ? 'Attivo' : 'Inattivo'}
          </Badge>
        </div>
        {template.description && (
          <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{template.defaultStartTime} - {template.defaultEndTime}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{template.defaultRequiredStaff} persone</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {PATTERN_OPTIONS.find(p => p.value === template.pattern)?.label}
          </Badge>
          {template.rules?.daysOfWeek && (
            <div className="flex gap-1">
              {template.rules.daysOfWeek.map(day => (
                <Badge key={day} variant="secondary" className="text-xs">
                  {DAYS_OF_WEEK.find(d => d.value === day)?.label}
                </Badge>
              ))}
            </div>
          )}
        </div>
        
        {template.defaultSkills && template.defaultSkills.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {template.defaultSkills.map(skill => (
              <Badge key={skill} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))}
          </div>
        )}
        
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedTemplate(template);
              setIsApplyModalOpen(true);
            }}
            data-testid={`button-apply-${template.id}`}
          >
            <CalendarIcon className="h-4 w-4 mr-1" />
            Applica
          </Button>
          <Button
            variant="ghost"
            size="sm"
            data-testid={`button-clone-${template.id}`}
          >
            <Copy className="h-4 w-4 mr-1" />
            Clona
          </Button>
          <Button
            variant="ghost"
            size="sm"
            data-testid={`button-edit-${template.id}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteTemplate(template.id)}
            data-testid={`button-delete-${template.id}`}
          >
            <Trash className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Template Turni</h2>
          <p className="text-sm text-muted-foreground">
            Crea e gestisci template ricorrenti per generare turni automaticamente
          </p>
        </div>
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-gradient-to-r from-orange-500 to-orange-600"
          data-testid="button-create-template"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Template
        </Button>
      </div>
      
      {/* Template Categories */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">Tutti</TabsTrigger>
          <TabsTrigger value="daily">Giornalieri</TabsTrigger>
          <TabsTrigger value="weekly">Settimanali</TabsTrigger>
          <TabsTrigger value="monthly">Mensili</TabsTrigger>
          <TabsTrigger value="seasonal">Stagionali</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(template => renderTemplateCard(template))}
          </div>
        </TabsContent>
        
        <TabsContent value="daily" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.filter(t => t.pattern === 'daily').map(template => renderTemplateCard(template))}
          </div>
        </TabsContent>
        
        <TabsContent value="weekly" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.filter(t => t.pattern === 'weekly').map(template => renderTemplateCard(template))}
          </div>
        </TabsContent>
        
        <TabsContent value="monthly" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.filter(t => t.pattern === 'monthly').map(template => renderTemplateCard(template))}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Create Template Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crea Nuovo Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome Template</Label>
                <Input
                  id="name"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="es. Turno Mattina Standard"
                />
              </div>
              <div>
                <Label htmlFor="pattern">Pattern</Label>
                <Select
                  value={newTemplate.pattern}
                  onValueChange={(v) => setNewTemplate({ ...newTemplate, pattern: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PATTERN_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">Descrizione</Label>
              <Input
                id="description"
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                placeholder="Descrizione opzionale"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="startTime">Ora Inizio</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={newTemplate.defaultStartTime}
                  onChange={(e) => setNewTemplate({ ...newTemplate, defaultStartTime: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="endTime">Ora Fine</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={newTemplate.defaultEndTime}
                  onChange={(e) => setNewTemplate({ ...newTemplate, defaultEndTime: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="requiredStaff">Staff Richiesto</Label>
                <Input
                  id="requiredStaff"
                  type="number"
                  min="1"
                  value={newTemplate.defaultRequiredStaff}
                  onChange={(e) => setNewTemplate({ 
                    ...newTemplate, 
                    defaultRequiredStaff: parseInt(e.target.value) 
                  })}
                />
              </div>
            </div>
            
            {newTemplate.pattern === 'weekly' && (
              <div>
                <Label>Giorni della Settimana</Label>
                <div className="flex gap-2 mt-2">
                  {DAYS_OF_WEEK.map(day => (
                    <label
                      key={day.value}
                      className="flex items-center gap-1 cursor-pointer"
                    >
                      <Checkbox
                        checked={newTemplate.rules?.daysOfWeek?.includes(day.value)}
                        onCheckedChange={(checked) => {
                          const days = newTemplate.rules?.daysOfWeek || [];
                          setNewTemplate({
                            ...newTemplate,
                            rules: {
                              ...newTemplate.rules,
                              daysOfWeek: checked
                                ? [...days, day.value]
                                : days.filter(d => d !== day.value)
                            }
                          });
                        }}
                      />
                      <span className="text-sm">{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleCreateTemplate} className="bg-gradient-to-r from-orange-500 to-orange-600">
              Crea Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Apply Template Modal */}
      <Dialog open={isApplyModalOpen} onOpenChange={setIsApplyModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Applica Template: {selectedTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Periodo di Applicazione</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !applyDateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {applyDateRange.from ? (
                      applyDateRange.to ? (
                        <>
                          {format(applyDateRange.from, "dd MMM yyyy", { locale: it })} -{" "}
                          {format(applyDateRange.to, "dd MMM yyyy", { locale: it })}
                        </>
                      ) : (
                        format(applyDateRange.from, "dd MMM yyyy", { locale: it })
                      )
                    ) : (
                      <span>Seleziona periodo</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={applyDateRange.from}
                    selected={applyDateRange}
                    onSelect={setApplyDateRange}
                    numberOfMonths={2}
                    locale={it}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            {selectedTemplate && (
              <div className="bg-muted p-3 rounded-lg">
                <h4 className="font-medium mb-2">Riepilogo Template</h4>
                <div className="space-y-1 text-sm">
                  <div>Orario: {selectedTemplate.defaultStartTime} - {selectedTemplate.defaultEndTime}</div>
                  <div>Staff richiesto: {selectedTemplate.defaultRequiredStaff}</div>
                  {selectedTemplate.rules?.daysOfWeek && (
                    <div>
                      Giorni: {selectedTemplate.rules.daysOfWeek.map(day => 
                        DAYS_OF_WEEK.find(d => d.value === day)?.label
                      ).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
              <p className="text-sm">
                <strong>Nota:</strong> Verranno creati turni per il periodo selezionato 
                seguendo il pattern del template. I turni esistenti non verranno modificati.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApplyModalOpen(false)}>
              Annulla
            </Button>
            <Button 
              onClick={handleApplyTemplate} 
              className="bg-gradient-to-r from-orange-500 to-orange-600"
              disabled={!applyDateRange.from || !applyDateRange.to}
            >
              Applica Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}