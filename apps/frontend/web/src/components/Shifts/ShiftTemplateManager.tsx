import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, Copy, Edit, Trash, Plus, Clock, Users, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import ShiftTemplateModal from './ShiftTemplateModal';

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
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const [isDeletingTemplate, setIsDeletingTemplate] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | null>(null);
  const [applyDateRange, setApplyDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });
  
  const { toast } = useToast();
  
  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setEditingTemplate(null);
  };
  
  const handleEditTemplate = (template: ShiftTemplate) => {
    setEditingTemplate(template);
    setIsCreateModalOpen(true);
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
    
    setIsApplyingTemplate(true);
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
    } finally {
      setIsApplyingTemplate(false);
    }
  };
  
  const handleDeleteTemplate = async (templateId: string) => {
    setIsDeletingTemplate(templateId);
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
    } finally {
      setIsDeletingTemplate(null);
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
            disabled={isApplyingTemplate}
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
            onClick={() => handleEditTemplate(template)}
            data-testid={`button-edit-${template.id}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteTemplate(template.id)}
            disabled={isDeletingTemplate === template.id}
            data-testid={`button-delete-${template.id}`}
          >
            {isDeletingTemplate === template.id ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Trash className="h-4 w-4 text-red-500" />
            )}
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
      
      {/* Advanced Template Modal */}
      <ShiftTemplateModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModal}
        template={editingTemplate}
      />
      
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
              disabled={!applyDateRange.from || !applyDateRange.to || isApplyingTemplate}
            >
              {isApplyingTemplate ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CalendarIcon className="h-4 w-4 mr-2" />
              )}
              {isApplyingTemplate ? 'Applicando...' : 'Applica Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}