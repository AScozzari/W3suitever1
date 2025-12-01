import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, Copy, Edit, Archive, Plus, Clock, Users, RefreshCw, Store as StoreIcon, Filter } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import ShiftTemplateCreateDialog from './ShiftTemplateCreateDialog';
import ShiftTemplateEditDialog from './ShiftTemplateEditDialog';
import ShiftTemplateDuplicateDialog from './ShiftTemplateDuplicateDialog';
import type { ShiftTemplate } from './shiftTemplateSchemas';

interface TimeSlot {
  segmentType: 'continuous' | 'split' | 'triple' | 'quad';
  startTime: string;
  endTime: string;
  block2StartTime?: string;
  block2EndTime?: string;
  block3StartTime?: string;
  block3EndTime?: string;
  block4StartTime?: string;
  block4EndTime?: string;
  breakMinutes?: number;
  clockInToleranceMinutes?: number;
  clockOutToleranceMinutes?: number;
}

interface LocalShiftTemplate {
  id: string;
  name: string;
  description?: string;
  storeId?: string;
  status?: 'active' | 'archived';
  timeSlots: TimeSlot[];
  color?: string;
  isActive: boolean;
  notes?: string;
}

interface Props {
  templates: LocalShiftTemplate[];
  storeId: string;
  onApplyTemplate: (templateId: string, startDate: Date, endDate: Date) => Promise<void>;
}

export default function ShiftTemplateManager({
  templates,
  storeId,
  onApplyTemplate
}: Props) {
  const [selectedTemplate, setSelectedTemplate] = useState<LocalShiftTemplate | null>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const [isDeletingTemplate, setIsDeletingTemplate] = useState<string | null>(null);
  const [applyDateRange, setApplyDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });
  
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editState, setEditState] = useState<{ isOpen: boolean; template: ShiftTemplate | null }>({ isOpen: false, template: null });
  const [duplicateState, setDuplicateState] = useState<{ isOpen: boolean; template: ShiftTemplate | null }>({ isOpen: false, template: null });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: stores, isLoading: storesLoading } = useQuery({
    queryKey: ['/api/stores']
  });
  
  const filteredTemplates = templates.filter(template => {
    const matchesStore = storeFilter === 'all' || template.storeId === storeFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && template.isActive) ||
      (statusFilter === 'archived' && !template.isActive);
    return matchesStore && matchesStatus;
  });
  
  const handleOpenCreateDialog = () => {
    setIsCreateOpen(true);
  };
  
  const handleCloseCreateDialog = () => {
    setIsCreateOpen(false);
  };
  
  const handleEditTemplate = (template: LocalShiftTemplate) => {
    setEditState({ isOpen: true, template: template as ShiftTemplate });
  };
  
  const handleDuplicateTemplate = (template: LocalShiftTemplate) => {
    setDuplicateState({ isOpen: true, template: template as ShiftTemplate });
  };
  
  const handleCloseEditDialog = () => {
    setEditState({ isOpen: false, template: null });
  };
  
  const handleCloseDuplicateDialog = () => {
    setDuplicateState({ isOpen: false, template: null });
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
      await apiRequest(`/api/hr/shift-templates/${templateId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: false })
      });
      
      toast({
        title: "Template archiviato",
        description: "Il template è stato archiviato"
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shift-templates'] });
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

  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Template Turni</h2>
        </div>
        <Button 
          onClick={handleOpenCreateDialog}
          className="bg-gradient-to-r from-orange-500 to-orange-600"
          data-testid="button-create-template"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Template
        </Button>
      </div>
      
      <Card className="windtre-glass-panel border-white/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5 text-gray-500" />
            <div className="flex gap-4 flex-1">
              <div className="flex-1">
                <Label className="text-sm mb-2 block">Punto Vendita</Label>
                <Select value={storeFilter} onValueChange={setStoreFilter}>
                  <SelectTrigger data-testid="filter-store">
                    <SelectValue placeholder="Tutti i punti vendita" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i punti vendita</SelectItem>
                    {stores?.map((store: any) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.nome || store.name} - {store.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1">
                <Label className="text-sm mb-2 block">Stato</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger data-testid="filter-status">
                    <SelectValue placeholder="Tutti gli stati" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti gli stati</SelectItem>
                    <SelectItem value="active">Attivo</SelectItem>
                    <SelectItem value="archived">Archiviato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {(storeFilter !== 'all' || statusFilter !== 'all') && (
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setStoreFilter('all');
                      setStatusFilter('all');
                    }}
                    data-testid="button-clear-filters"
                  >
                    Pulisci Filtri
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
            <span>Risultati: {filteredTemplates.length} di {templates.length}</span>
          </div>
        </CardContent>
      </Card>
      
      <Card className="windtre-glass-panel border-white/20 overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <TableHead className="font-semibold text-gray-700 py-4">Nome Template</TableHead>
                <TableHead className="font-semibold text-gray-700 py-4">Punto Vendita</TableHead>
                <TableHead className="font-semibold text-gray-700 py-4">Fasce Orarie</TableHead>
                <TableHead className="font-semibold text-gray-700 py-4 text-center">Stato</TableHead>
                <TableHead className="font-semibold text-gray-700 py-4 w-28 text-center">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Clock className="h-10 w-10 text-gray-300" />
                      <span className="text-gray-500 font-medium">Nessun template trovato</span>
                      <span className="text-gray-400 text-sm">Modifica i filtri o crea un nuovo template</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTemplates.map((template, index) => {
                  const store = stores?.find((s: any) => s.id === template.storeId);
                  const storeName = store?.nome || store?.name;
                  const isGlobal = !template.storeId || !storeName;
                  
                  return (
                    <TableRow 
                      key={template.id} 
                      className={cn(
                        "transition-all duration-200 hover:bg-orange-50/50",
                        index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                      )}
                      data-testid={`template-row-${template.id}`}
                    >
                      <TableCell className="py-4">
                        <div className="flex items-start gap-3">
                          <div 
                            className="w-1 h-12 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: template.color || '#f97316' }}
                          />
                          <div>
                            <div className="font-semibold text-gray-900">{template.name}</div>
                            {template.description && (
                              <div className="text-sm text-gray-500 mt-0.5 line-clamp-1">{template.description}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        {isGlobal ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-medium">
                            <StoreIcon className="h-3.5 w-3.5 mr-1.5" />
                            Globale
                          </Badge>
                        ) : (
                          <div className="flex items-center gap-2">
                            <StoreIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-700">{storeName}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="space-y-1.5">
                          {template.timeSlots?.map((slot, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5 w-fit">
                              <Clock className="h-3.5 w-3.5 text-orange-500" />
                              <div className="text-sm font-medium text-gray-700">
                                {slot.segmentType === 'split' ? (
                                  <span>
                                    {slot.startTime?.slice(0,5)} - {slot.endTime?.slice(0,5)}
                                    <span className="text-orange-500 mx-1.5">•</span>
                                    {slot.block2StartTime?.slice(0,5)} - {slot.block2EndTime?.slice(0,5)}
                                  </span>
                                ) : (
                                  <span>{slot.startTime?.slice(0,5)} - {slot.endTime?.slice(0,5)}</span>
                                )}
                              </div>
                              {slot.segmentType === 'split' && (
                                <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                                  Spezzato
                                </Badge>
                              )}
                              {slot.breakMinutes !== undefined && slot.breakMinutes > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {slot.breakMinutes}' pausa
                                </Badge>
                              )}
                            </div>
                          )) || (
                            <span className="text-sm text-gray-400 italic">Nessuna fascia</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <Badge 
                          variant={template.isActive ? "default" : "secondary"}
                          className={cn(
                            "font-medium",
                            template.isActive 
                              ? "bg-green-100 text-green-700 hover:bg-green-100" 
                              : "bg-gray-100 text-gray-500"
                          )}
                        >
                          {template.isActive ? 'Attivo' : 'Archiviato'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center justify-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 hover:bg-blue-100"
                                  onClick={() => handleEditTemplate(template)}
                                  data-testid={`button-edit-${template.id}`}
                                >
                                  <Edit className="h-4 w-4 text-blue-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Modifica (crea nuova versione)</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 hover:bg-purple-100"
                                  onClick={() => handleDuplicateTemplate(template)}
                                  data-testid={`button-duplicate-${template.id}`}
                                >
                                  <Copy className="h-4 w-4 text-purple-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Duplica template</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 hover:bg-amber-100"
                                  onClick={() => handleArchiveTemplate(template.id)}
                                  disabled={isDeletingTemplate === template.id}
                                  data-testid={`button-archive-${template.id}`}
                                >
                                  {isDeletingTemplate === template.id ? (
                                    <RefreshCw className="h-4 w-4 text-amber-600 animate-spin" />
                                  ) : (
                                    <Archive className="h-4 w-4 text-amber-600" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Archivia template</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      
      <ShiftTemplateCreateDialog 
        isOpen={isCreateOpen}
        onClose={handleCloseCreateDialog}
      />
      
      <ShiftTemplateEditDialog
        isOpen={editState.isOpen}
        onClose={handleCloseEditDialog}
        template={editState.template}
      />
      
      <ShiftTemplateDuplicateDialog
        isOpen={duplicateState.isOpen}
        onClose={handleCloseDuplicateDialog}
        template={duplicateState.template}
      />
      
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
                <div className="space-y-2 text-sm">
                  {selectedTemplate.timeSlots?.map((slot, idx) => (
                    <div key={idx}>
                      <strong>Fascia {idx + 1}:</strong>{' '}
                      {slot.segmentType === 'split' ? (
                        <>
                          {slot.startTime} - {slot.endTime} + {slot.block2StartTime} - {slot.block2EndTime}
                          {' '}(Spezzato)
                        </>
                      ) : (
                        <>{slot.startTime} - {slot.endTime}</>
                      )}
                      {slot.breakMinutes && slot.breakMinutes > 0 && (
                        <> - {slot.breakMinutes}min pausa</>
                      )}
                    </div>
                  ))}
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
