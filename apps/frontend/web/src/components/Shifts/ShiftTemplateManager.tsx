import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, Copy, Edit, Archive, Plus, Clock, Users, RefreshCw, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
  
  const handleArchiveTemplate = async (templateId: string) => {
    setIsDeletingTemplate(templateId);
    try {
      const response = await fetch(`/api/hr/shift-templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false })
      });
      
      if (!response.ok) throw new Error('Failed to archive template');
      
      toast({
        title: "Template archiviato",
        description: "Il template è stato archiviato"
      });
      
      // Refresh page
      window.location.reload();
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile archiviare il template",
        variant: "destructive"
      });
    } finally {
      setIsDeletingTemplate(null);
    }
  };

  const handleDuplicateTemplate = async (template: ShiftTemplate) => {
    try {
      const duplicatedTemplate = {
        ...template,
        name: `${template.name} (Copia)`,
        id: undefined // Remove ID to create new
      };
      
      const response = await fetch('/api/hr/shift-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicatedTemplate)
      });
      
      if (!response.ok) throw new Error('Failed to duplicate template');
      
      toast({
        title: "Template duplicato",
        description: "Il template è stato copiato con successo"
      });
      
      // Refresh page
      window.location.reload();
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile duplicare il template",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Template Turni</h2>
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
      
      {/* Template Filters */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">Tutti</TabsTrigger>
          <TabsTrigger value="active">Attivi</TabsTrigger>
          <TabsTrigger value="archived">Archiviati</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4">
          <Card className="windtre-glass-panel border-white/20">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200">
                    <TableHead className="font-semibold text-gray-900">Nome</TableHead>
                    <TableHead className="font-semibold text-gray-900">Fasce Orarie</TableHead>
                    <TableHead className="font-semibold text-gray-900">Giorni</TableHead>

                    <TableHead className="font-semibold text-gray-900">Pattern</TableHead>
                    <TableHead className="font-semibold text-gray-900">Stato</TableHead>
                    <TableHead className="font-semibold text-gray-900 w-24">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id} className="border-gray-100 hover:bg-gray-50/50" data-testid={`template-row-${template.id}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900">{template.name}</div>
                          {template.description && (
                            <div className="text-sm text-gray-600">{template.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{template.defaultStartTime} - {template.defaultEndTime}</span>
                          {template.defaultBreakMinutes && (
                            <Badge variant="outline" className="text-xs ml-2">
                              {template.defaultBreakMinutes}min pausa
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {template.rules?.daysOfWeek?.map(day => (
                            <Badge key={day} variant="secondary" className="text-xs">
                              {DAYS_OF_WEEK.find(d => d.value === day)?.label}
                            </Badge>
                          )) || <span className="text-sm text-gray-400">Tutti i giorni</span>}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {PATTERN_OPTIONS.find(p => p.value === template.pattern)?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={template.isActive ? "default" : "secondary"}>
                          {template.isActive ? 'Attivo' : 'Archiviato'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" data-testid={`button-actions-${template.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedTemplate(template);
                              setIsApplyModalOpen(true);
                            }}>
                              <CalendarIcon className="h-4 w-4 mr-2" />
                              Applica
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Modifica
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateTemplate(template)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplica
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleArchiveTemplate(template.id)}
                              disabled={isDeletingTemplate === template.id}
                            >
                              {isDeletingTemplate === template.id ? (
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Archive className="h-4 w-4 mr-2" />
                              )}
                              Archivia
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="active" className="mt-4">
          <Card className="windtre-glass-panel border-white/20">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200">
                    <TableHead className="font-semibold text-gray-900">Nome</TableHead>
                    <TableHead className="font-semibold text-gray-900">Fasce Orarie</TableHead>
                    <TableHead className="font-semibold text-gray-900">Giorni</TableHead>

                    <TableHead className="font-semibold text-gray-900">Pattern</TableHead>
                    <TableHead className="font-semibold text-gray-900 w-24">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.filter(t => t.isActive).map((template) => (
                    <TableRow key={template.id} className="border-gray-100 hover:bg-gray-50/50" data-testid={`template-row-${template.id}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900">{template.name}</div>
                          {template.description && (
                            <div className="text-sm text-gray-600">{template.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{template.defaultStartTime} - {template.defaultEndTime}</span>
                          {template.defaultBreakMinutes && (
                            <Badge variant="outline" className="text-xs ml-2">
                              {template.defaultBreakMinutes}min pausa
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {template.rules?.daysOfWeek?.map(day => (
                            <Badge key={day} variant="secondary" className="text-xs">
                              {DAYS_OF_WEEK.find(d => d.value === day)?.label}
                            </Badge>
                          )) || <span className="text-sm text-gray-400">Tutti i giorni</span>}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {PATTERN_OPTIONS.find(p => p.value === template.pattern)?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" data-testid={`button-actions-${template.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedTemplate(template);
                              setIsApplyModalOpen(true);
                            }}>
                              <CalendarIcon className="h-4 w-4 mr-2" />
                              Applica
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Modifica
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateTemplate(template)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplica
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleArchiveTemplate(template.id)}
                              disabled={isDeletingTemplate === template.id}
                            >
                              {isDeletingTemplate === template.id ? (
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Archive className="h-4 w-4 mr-2" />
                              )}
                              Archivia
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="active" className="mt-4">
          <Card className="windtre-glass-panel border-white/20">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200">
                    <TableHead className="font-semibold text-gray-900">Nome</TableHead>
                    <TableHead className="font-semibold text-gray-900">Fasce Orarie</TableHead>
                    <TableHead className="font-semibold text-gray-900">Giorni</TableHead>
                    <TableHead className="font-semibold text-gray-900">Pattern</TableHead>
                    <TableHead className="font-semibold text-gray-900">Stato</TableHead>
                    <TableHead className="font-semibold text-gray-900 w-24">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.filter(t => t.isActive).map((template) => (
                    <TableRow key={template.id} className="border-gray-100 hover:bg-gray-50/50" data-testid={`template-row-${template.id}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900">{template.name}</div>
                          {template.description && (
                            <div className="text-sm text-gray-600">{template.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{template.defaultStartTime} - {template.defaultEndTime}</span>
                          {template.defaultBreakMinutes && (
                            <Badge variant="outline" className="text-xs ml-2">
                              {template.defaultBreakMinutes}min pausa
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {template.rules?.daysOfWeek?.map(day => (
                            <Badge key={day} variant="secondary" className="text-xs">
                              {DAYS_OF_WEEK.find(d => d.value === day)?.label}
                            </Badge>
                          )) || <span className="text-sm text-gray-400">Tutti i giorni</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {PATTERN_OPTIONS.find(p => p.value === template.pattern)?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">
                          Attivo
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" data-testid={`button-actions-${template.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedTemplate(template);
                              setIsApplyModalOpen(true);
                            }}>
                              <CalendarIcon className="h-4 w-4 mr-2" />
                              Applica
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Modifica
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateTemplate(template)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplica
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleArchiveTemplate(template.id)}
                              disabled={isDeletingTemplate === template.id}
                            >
                              {isDeletingTemplate === template.id ? (
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Archive className="h-4 w-4 mr-2" />
                              )}
                              Archivia
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="archived" className="mt-4">
          <Card className="windtre-glass-panel border-white/20">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200">
                    <TableHead className="font-semibold text-gray-900">Nome</TableHead>
                    <TableHead className="font-semibold text-gray-900">Fasce Orarie</TableHead>
                    <TableHead className="font-semibold text-gray-900">Giorni</TableHead>
                    <TableHead className="font-semibold text-gray-900">Pattern</TableHead>
                    <TableHead className="font-semibold text-gray-900">Stato</TableHead>
                    <TableHead className="font-semibold text-gray-900 w-24">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.filter(t => !t.isActive).map((template) => (
                    <TableRow key={template.id} className="border-gray-100 hover:bg-gray-50/50 opacity-75" data-testid={`template-row-${template.id}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900">{template.name}</div>
                          {template.description && (
                            <div className="text-sm text-gray-600">{template.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{template.defaultStartTime} - {template.defaultEndTime}</span>
                          {template.defaultBreakMinutes && (
                            <Badge variant="outline" className="text-xs ml-2">
                              {template.defaultBreakMinutes}min pausa
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {template.rules?.daysOfWeek?.map(day => (
                            <Badge key={day} variant="secondary" className="text-xs">
                              {DAYS_OF_WEEK.find(d => d.value === day)?.label}
                            </Badge>
                          )) || <span className="text-sm text-gray-400">Tutti i giorni</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {PATTERN_OPTIONS.find(p => p.value === template.pattern)?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          Archiviato
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" data-testid={`button-actions-${template.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Modifica
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateTemplate(template)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplica
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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