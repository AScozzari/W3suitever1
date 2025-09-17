// Leave Policies Configuration - HR Admin panel for managing leave policies
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Settings, Calendar as CalendarIcon, Users, Shield, AlertCircle, Save, Plus, X, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useLeavePolicies, useUpdateLeavePolicies } from '@/hooks/useLeaveManagement';
import { LeavePolicies } from '@/services/leaveService';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export function LeavePoliciesConfig() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: policies, isLoading } = useLeavePolicies();
  const updatePolicies = useUpdateLeavePolicies();
  
  // Form state
  const [formData, setFormData] = useState<LeavePolicies | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [newBlackoutDate, setNewBlackoutDate] = useState<Date | undefined>(undefined);
  const [newHoliday, setNewHoliday] = useState<Date | undefined>(undefined);
  const [newApprovalLevel, setNewApprovalLevel] = useState({
    level: 1,
    role: '',
    daysThreshold: 0
  });
  
  // Initialize form data when policies load
  useState(() => {
    if (policies && !formData) {
      setFormData(policies);
    }
  }, [policies]);
  
  // Check permissions
  const canEdit = user?.role === 'HR_MANAGER' || user?.role === 'ADMIN';
  
  // Update field
  const updateField = (field: string, value: any) => {
    setFormData(prev => {
      if (!prev) return null;
      return { ...prev, [field]: value };
    });
    setIsDirty(true);
  };
  
  // Add blackout date
  const addBlackoutDate = () => {
    if (!newBlackoutDate) return;
    
    const dateStr = format(newBlackoutDate, 'yyyy-MM-dd');
    setFormData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        blackoutDates: [...(prev.blackoutDates || []), dateStr].sort()
      };
    });
    setNewBlackoutDate(undefined);
    setIsDirty(true);
  };
  
  // Remove blackout date
  const removeBlackoutDate = (date: string) => {
    setFormData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        blackoutDates: prev.blackoutDates.filter(d => d !== date)
      };
    });
    setIsDirty(true);
  };
  
  // Add holiday
  const addHoliday = () => {
    if (!newHoliday) return;
    
    const dateStr = format(newHoliday, 'yyyy-MM-dd');
    setFormData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        publicHolidays: [...(prev.publicHolidays || []), dateStr].sort()
      };
    });
    setNewHoliday(undefined);
    setIsDirty(true);
  };
  
  // Remove holiday
  const removeHoliday = (date: string) => {
    setFormData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        publicHolidays: prev.publicHolidays.filter(d => d !== date)
      };
    });
    setIsDirty(true);
  };
  
  // Add approval level
  const addApprovalLevel = () => {
    if (!newApprovalLevel.role) return;
    
    setFormData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        approvalLevels: [...(prev.approvalLevels || []), newApprovalLevel].sort((a, b) => a.level - b.level)
      };
    });
    setNewApprovalLevel({ level: 1, role: '', daysThreshold: 0 });
    setIsDirty(true);
  };
  
  // Remove approval level
  const removeApprovalLevel = (index: number) => {
    setFormData(prev => {
      if (!prev) return null;
      const levels = [...(prev.approvalLevels || [])];
      levels.splice(index, 1);
      return { ...prev, approvalLevels: levels };
    });
    setIsDirty(true);
  };
  
  // Save changes
  const handleSave = async () => {
    if (!formData || !isDirty) return;
    
    try {
      await updatePolicies.mutateAsync(formData);
      setIsDirty(false);
      toast({
        title: "Policy salvate",
        description: "Le policy ferie sono state aggiornate con successo",
      });
    } catch (error) {
      console.error('Error saving policies:', error);
    }
  };
  
  // Reset changes
  const handleReset = () => {
    if (policies) {
      setFormData(policies);
      setIsDirty(false);
    }
  };
  
  if (isLoading || !formData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }
  
  if (!canEdit) {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Non hai i permessi per modificare le policy ferie.
          Solo HR Manager e Amministratori possono accedere a questa sezione.
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-6" data-testid="leave-policies-config">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Configurazione Policy Ferie
          </h2>
          <p className="text-gray-600 mt-1">
            Gestisci le policy aziendali per ferie e permessi
          </p>
        </div>
        
        {isDirty && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>
              Annulla
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={handleSave}
              disabled={updatePolicies.isPending}
              data-testid="button-save-policies"
            >
              <Save className="h-4 w-4 mr-2" />
              {updatePolicies.isPending ? 'Salvataggio...' : 'Salva Modifiche'}
            </Button>
          </div>
        )}
      </div>
      
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full lg:w-auto">
          <TabsTrigger value="general">Generale</TabsTrigger>
          <TabsTrigger value="blackout">Blackout</TabsTrigger>
          <TabsTrigger value="holidays">Festività</TabsTrigger>
          <TabsTrigger value="approval">Approvazioni</TabsTrigger>
        </TabsList>
        
        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Impostazioni Generali</CardTitle>
              <CardDescription>
                Configura le regole base per le richieste ferie
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Vacation Days Per Year */}
                <div className="space-y-2">
                  <Label>Giorni Ferie Annuali</Label>
                  <Input
                    type="number"
                    value={formData.vacationDaysPerYear}
                    onChange={(e) => updateField('vacationDaysPerYear', parseInt(e.target.value))}
                    min={0}
                    max={365}
                    data-testid="input-vacation-days"
                  />
                  <p className="text-sm text-gray-500">
                    Numero di giorni ferie maturati per anno
                  </p>
                </div>
                
                {/* Minimum Advance Days */}
                <div className="space-y-2">
                  <Label>Preavviso Minimo (giorni)</Label>
                  <Input
                    type="number"
                    value={formData.minimumAdvanceDays}
                    onChange={(e) => updateField('minimumAdvanceDays', parseInt(e.target.value))}
                    min={0}
                    max={90}
                    data-testid="input-advance-days"
                  />
                  <p className="text-sm text-gray-500">
                    Giorni di anticipo richiesti per la richiesta
                  </p>
                </div>
                
                {/* Maximum Consecutive Days */}
                <div className="space-y-2">
                  <Label>Giorni Consecutivi Max</Label>
                  <Input
                    type="number"
                    value={formData.maximumConsecutiveDays}
                    onChange={(e) => updateField('maximumConsecutiveDays', parseInt(e.target.value))}
                    min={1}
                    max={60}
                    data-testid="input-max-consecutive"
                  />
                  <p className="text-sm text-gray-500">
                    Massimo numero di giorni consecutivi
                  </p>
                </div>
                
                {/* Carryover Days */}
                <div className="space-y-2">
                  <Label>Giorni Riportabili</Label>
                  <Input
                    type="number"
                    value={formData.carryoverDays}
                    onChange={(e) => updateField('carryoverDays', parseInt(e.target.value))}
                    min={0}
                    max={30}
                    data-testid="input-carryover"
                  />
                  <p className="text-sm text-gray-500">
                    Giorni trasferibili all'anno successivo
                  </p>
                </div>
                
                {/* Sick Days Certificate */}
                <div className="space-y-2">
                  <Label>Certificato Malattia (giorni)</Label>
                  <Input
                    type="number"
                    value={formData.sickDaysRequireCertificate}
                    onChange={(e) => updateField('sickDaysRequireCertificate', parseInt(e.target.value))}
                    min={1}
                    max={30}
                    data-testid="input-sick-certificate"
                  />
                  <p className="text-sm text-gray-500">
                    Giorni di malattia che richiedono certificato
                  </p>
                </div>
                
                {/* Max Team Absence */}
                <div className="space-y-2">
                  <Label>Max Assenze Team</Label>
                  <Input
                    type="number"
                    value={formData.maxTeamAbsence || 2}
                    onChange={(e) => updateField('maxTeamAbsence', parseInt(e.target.value))}
                    min={1}
                    max={10}
                    data-testid="input-max-team-absence"
                  />
                  <p className="text-sm text-gray-500">
                    Numero massimo di persone assenti per team
                  </p>
                </div>
              </div>
              
              {/* Notification Settings */}
              <div className="border-t pt-6">
                <h4 className="font-medium mb-4">Impostazioni Notifiche</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Notifiche</Label>
                      <p className="text-sm text-gray-500">Invia notifiche via email</p>
                    </div>
                    <Switch
                      checked={formData.notificationSettings?.emailEnabled || false}
                      onCheckedChange={(checked) => 
                        updateField('notificationSettings', {
                          ...formData.notificationSettings,
                          emailEnabled: checked
                        })
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Push Notifiche</Label>
                      <p className="text-sm text-gray-500">Invia notifiche push</p>
                    </div>
                    <Switch
                      checked={formData.notificationSettings?.pushEnabled || false}
                      onCheckedChange={(checked) => 
                        updateField('notificationSettings', {
                          ...formData.notificationSettings,
                          pushEnabled: checked
                        })
                      }
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Reminder (ore)</Label>
                    <Input
                      type="number"
                      value={formData.notificationSettings?.reminderHours || 48}
                      onChange={(e) => 
                        updateField('notificationSettings', {
                          ...formData.notificationSettings,
                          reminderHours: parseInt(e.target.value)
                        })
                      }
                      min={1}
                      max={168}
                    />
                    <p className="text-sm text-gray-500">
                      Ore di attesa prima del reminder
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Blackout Dates */}
        <TabsContent value="blackout">
          <Card>
            <CardHeader>
              <CardTitle>Date di Blackout</CardTitle>
              <CardDescription>
                Periodi in cui non è possibile richiedere ferie
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new blackout date */}
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newBlackoutDate 
                        ? format(newBlackoutDate, 'dd MMM yyyy', { locale: it })
                        : 'Seleziona data'
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newBlackoutDate}
                      onSelect={setNewBlackoutDate}
                      locale={it}
                    />
                  </PopoverContent>
                </Popover>
                <Button
                  onClick={addBlackoutDate}
                  disabled={!newBlackoutDate}
                  data-testid="button-add-blackout"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi
                </Button>
              </div>
              
              {/* List of blackout dates */}
              <div className="space-y-2">
                {formData.blackoutDates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nessuna data di blackout configurata
                  </div>
                ) : (
                  formData.blackoutDates.map((date) => (
                    <motion.div
                      key={date}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <CalendarIcon className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">
                          {format(new Date(date), 'EEEE d MMMM yyyy', { locale: it })}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBlackoutDate(date)}
                        className="text-red-600 hover:text-red-700"
                        data-testid={`button-remove-blackout-${date}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ))
                )}
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Durante le date di blackout non sarà possibile richiedere ferie.
                  Utile per periodi di alta stagione o eventi aziendali importanti.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Public Holidays */}
        <TabsContent value="holidays">
          <Card>
            <CardHeader>
              <CardTitle>Festività Pubbliche</CardTitle>
              <CardDescription>
                Giorni festivi riconosciuti dall'azienda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new holiday */}
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newHoliday 
                        ? format(newHoliday, 'dd MMM yyyy', { locale: it })
                        : 'Seleziona festività'
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newHoliday}
                      onSelect={setNewHoliday}
                      locale={it}
                    />
                  </PopoverContent>
                </Popover>
                <Button
                  onClick={addHoliday}
                  disabled={!newHoliday}
                  data-testid="button-add-holiday"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi
                </Button>
              </div>
              
              {/* List of holidays */}
              <div className="space-y-2">
                {formData.publicHolidays.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nessuna festività configurata
                  </div>
                ) : (
                  formData.publicHolidays.map((date) => {
                    const d = new Date(date);
                    const holidayName = getHolidayName(d);
                    
                    return (
                      <motion.div
                        key={date}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">🎉</div>
                          <div>
                            <div className="font-medium">{holidayName}</div>
                            <div className="text-sm text-gray-600">
                              {format(d, 'EEEE d MMMM yyyy', { locale: it })}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeHoliday(date)}
                          className="text-red-600 hover:text-red-700"
                          data-testid={`button-remove-holiday-${date}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Approval Workflow */}
        <TabsContent value="approval">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Approvazione</CardTitle>
              <CardDescription>
                Configura la catena di approvazione per le richieste
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add approval level */}
              <div className="grid grid-cols-4 gap-2">
                <Input
                  type="number"
                  value={newApprovalLevel.level}
                  onChange={(e) => setNewApprovalLevel(prev => ({
                    ...prev,
                    level: parseInt(e.target.value)
                  }))}
                  placeholder="Livello"
                  min={1}
                />
                <Select
                  value={newApprovalLevel.role}
                  onValueChange={(value) => setNewApprovalLevel(prev => ({
                    ...prev,
                    role: value
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Ruolo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TEAM_LEADER">Team Leader</SelectItem>
                    <SelectItem value="STORE_MANAGER">Store Manager</SelectItem>
                    <SelectItem value="HR_MANAGER">HR Manager</SelectItem>
                    <SelectItem value="DIRECTOR">Director</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={newApprovalLevel.daysThreshold}
                  onChange={(e) => setNewApprovalLevel(prev => ({
                    ...prev,
                    daysThreshold: parseInt(e.target.value)
                  }))}
                  placeholder="Giorni soglia"
                  min={0}
                />
                <Button
                  onClick={addApprovalLevel}
                  disabled={!newApprovalLevel.role}
                  data-testid="button-add-approval"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi
                </Button>
              </div>
              
              {/* Approval chain visualization */}
              <div className="space-y-2">
                {(!formData.approvalLevels || formData.approvalLevels.length === 0) ? (
                  <div className="text-center py-8 text-gray-500">
                    Nessun livello di approvazione configurato
                  </div>
                ) : (
                  formData.approvalLevels.map((level, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-4 bg-blue-50 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center h-8 w-8 bg-blue-600 text-white rounded-full font-bold">
                          {level.level}
                        </div>
                        <div>
                          <div className="font-medium">{level.role}</div>
                          {level.daysThreshold > 0 && (
                            <div className="text-sm text-gray-600">
                              Per richieste &gt; {level.daysThreshold} giorni
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeApprovalLevel(idx)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ))
                )}
              </div>
              
              <Alert>
                <Users className="h-4 w-4" />
                <AlertDescription>
                  Le richieste passeranno attraverso ogni livello di approvazione in ordine.
                  I livelli con soglia giorni si applicano solo alle richieste superiori a quella durata.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper function to get Italian holiday names
function getHolidayName(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  const holidays: { [key: string]: string } = {
    '1-1': 'Capodanno',
    '1-6': 'Epifania',
    '4-21': 'Pasqua',
    '4-25': 'Festa della Liberazione',
    '5-1': 'Festa dei Lavoratori',
    '6-2': 'Festa della Repubblica',
    '8-15': 'Ferragosto',
    '11-1': 'Ognissanti',
    '12-8': 'Immacolata Concezione',
    '12-25': 'Natale',
    '12-26': 'Santo Stefano'
  };
  
  return holidays[`${month}-${day}`] || 'Festività';
}