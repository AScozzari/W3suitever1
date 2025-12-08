import { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Copy,
  Plus,
  Trash2,
  AlertCircle,
  Save,
  Store
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

interface StoreCalendarModalProps {
  open: boolean;
  storeId: string | null;
  storeName: string;
  onClose: () => void;
  tenantId: string;
  allStores?: Array<{ id: string; nome: string }>;
}

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
}

interface OpeningRule {
  dayOfWeek: string;
  isOpen: boolean;
  timeSlots: TimeSlot[];
}

interface CalendarOverride {
  date: string;
  overrideType: 'closed' | 'special_hours' | 'holiday';
  isOpen: boolean;
  timeSlots: TimeSlot[];
  reason?: string;
  holidayName?: string;
}

interface CalendarSettings {
  autoCloseSundays: boolean;
  autoCloseNationalHolidays: boolean;
  autoCloseReligiousHolidays: boolean;
  patronSaintDay?: string;
  patronSaintName?: string;
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Lunedì', short: 'Lun' },
  { key: 'tuesday', label: 'Martedì', short: 'Mar' },
  { key: 'wednesday', label: 'Mercoledì', short: 'Mer' },
  { key: 'thursday', label: 'Giovedì', short: 'Gio' },
  { key: 'friday', label: 'Venerdì', short: 'Ven' },
  { key: 'saturday', label: 'Sabato', short: 'Sab' },
  { key: 'sunday', label: 'Domenica', short: 'Dom' },
];

const ITALIAN_HOLIDAYS_2025 = [
  { date: '2025-01-01', name: 'Capodanno', type: 'national' },
  { date: '2025-01-06', name: 'Epifania', type: 'religious' },
  { date: '2025-04-20', name: 'Pasqua', type: 'religious' },
  { date: '2025-04-21', name: 'Lunedì dell\'Angelo', type: 'religious' },
  { date: '2025-04-25', name: 'Festa della Liberazione', type: 'national' },
  { date: '2025-05-01', name: 'Festa del Lavoro', type: 'national' },
  { date: '2025-06-02', name: 'Festa della Repubblica', type: 'national' },
  { date: '2025-08-15', name: 'Ferragosto', type: 'religious' },
  { date: '2025-11-01', name: 'Tutti i Santi', type: 'religious' },
  { date: '2025-12-08', name: 'Immacolata Concezione', type: 'religious' },
  { date: '2025-12-25', name: 'Natale', type: 'religious' },
  { date: '2025-12-26', name: 'Santo Stefano', type: 'religious' },
];

const generateId = () => Math.random().toString(36).substr(2, 9);

const createDefaultTimeSlots = (): TimeSlot[] => [
  { id: generateId(), startTime: '09:00', endTime: '13:00' },
  { id: generateId(), startTime: '15:00', endTime: '19:30' }
];

const DEFAULT_OPENING_RULES: OpeningRule[] = DAYS_OF_WEEK.map(day => ({
  dayOfWeek: day.key,
  isOpen: day.key !== 'sunday',
  timeSlots: day.key !== 'sunday' ? createDefaultTimeSlots() : []
}));

const DEFAULT_SETTINGS: CalendarSettings = {
  autoCloseSundays: true,
  autoCloseNationalHolidays: true,
  autoCloseReligiousHolidays: false,
};

export function StoreCalendarModal({ 
  open, 
  storeId, 
  storeName, 
  onClose, 
  tenantId,
  allStores = []
}: StoreCalendarModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'rules' | 'calendar' | 'exceptions'>('rules');
  const [openingRules, setOpeningRules] = useState<OpeningRule[]>(DEFAULT_OPENING_RULES);
  const [settings, setSettings] = useState<CalendarSettings>(DEFAULT_SETTINGS);
  const [overrides, setOverrides] = useState<CalendarOverride[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [selectedStoresForCopy, setSelectedStoresForCopy] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [holidays, setHolidays] = useState<Array<{ date: string; name: string; type: string }>>(ITALIAN_HOLIDAYS_2025);

  useEffect(() => {
    if (open && storeId) {
      loadCalendarData();
    }
  }, [open, storeId]);

  const loadCalendarData = async () => {
    if (!storeId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/stores/${storeId}/calendar`, {
        headers: { 
          'x-tenant-id': tenantId,
          'X-Auth-Session': 'authenticated'
        }
      });
      if (response.ok) {
        const responseData = await response.json();
        const data = responseData.data || responseData;
        if (data.openingRules?.length > 0) {
          const convertedRules = data.openingRules.map((rule: any) => {
            if (rule.timeSlots) {
              return rule;
            }
            const timeSlots: TimeSlot[] = [];
            if (rule.isOpen) {
              if (rule.hasBreak) {
                timeSlots.push({ id: generateId(), startTime: rule.openTime || '09:00', endTime: rule.breakStartTime || '13:00' });
                timeSlots.push({ id: generateId(), startTime: rule.breakEndTime || '14:00', endTime: rule.closeTime || '19:30' });
              } else {
                timeSlots.push({ id: generateId(), startTime: rule.openTime || '09:00', endTime: rule.closeTime || '19:30' });
              }
            }
            return {
              dayOfWeek: rule.dayOfWeek,
              isOpen: rule.isOpen,
              timeSlots
            };
          });
          setOpeningRules(convertedRules);
        }
        if (data.settings) {
          setSettings(data.settings);
        }
        if (data.overrides) {
          setOverrides(data.overrides);
        }
        if (data.holidays?.length > 0) {
          setHolidays(data.holidays);
        }
      }
    } catch (error) {
      console.log('No existing calendar data, using defaults');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!storeId) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/stores/${storeId}/calendar`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
          'X-Auth-Session': 'authenticated'
        },
        body: JSON.stringify({
          openingRules,
          settings,
          overrides
        })
      });
      
      if (response.ok) {
        toast({
          title: "Salvato!",
          description: "Orari e calendario aggiornati con successo",
        });
      } else {
        throw new Error('Save failed');
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile salvare le modifiche",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyToStores = async () => {
    if (selectedStoresForCopy.length === 0) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/stores/${storeId}/calendar/copy`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
          'X-Auth-Session': 'authenticated'
        },
        body: JSON.stringify({
          targetStoreIds: selectedStoresForCopy,
          copyRules: true,
          copySettings: true
        })
      });
      
      if (response.ok) {
        toast({
          title: "Copiato!",
          description: `Configurazione copiata su ${selectedStoresForCopy.length} negozi`,
        });
        setShowCopyModal(false);
        setSelectedStoresForCopy([]);
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile copiare la configurazione",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateDayOpen = (dayKey: string, isOpen: boolean) => {
    setOpeningRules(prev => prev.map(rule => {
      if (rule.dayOfWeek !== dayKey) return rule;
      return {
        ...rule,
        isOpen,
        timeSlots: isOpen && rule.timeSlots.length === 0 ? createDefaultTimeSlots() : rule.timeSlots
      };
    }));
  };

  const addTimeSlot = (dayKey: string) => {
    setOpeningRules(prev => prev.map(rule => {
      if (rule.dayOfWeek !== dayKey) return rule;
      const lastSlot = rule.timeSlots[rule.timeSlots.length - 1];
      const newStart = lastSlot ? lastSlot.endTime : '09:00';
      return {
        ...rule,
        timeSlots: [...rule.timeSlots, { id: generateId(), startTime: newStart, endTime: '19:30' }]
      };
    }));
  };

  const removeTimeSlot = (dayKey: string, slotId: string) => {
    setOpeningRules(prev => prev.map(rule => {
      if (rule.dayOfWeek !== dayKey) return rule;
      return {
        ...rule,
        timeSlots: rule.timeSlots.filter(s => s.id !== slotId)
      };
    }));
  };

  const updateTimeSlot = (dayKey: string, slotId: string, field: 'startTime' | 'endTime', value: string) => {
    setOpeningRules(prev => prev.map(rule => {
      if (rule.dayOfWeek !== dayKey) return rule;
      return {
        ...rule,
        timeSlots: rule.timeSlots.map(s => s.id === slotId ? { ...s, [field]: value } : s)
      };
    }));
  };

  const applyToAllDays = (sourceDay: string) => {
    const sourceRule = openingRules.find(r => r.dayOfWeek === sourceDay);
    if (!sourceRule) return;
    
    setOpeningRules(prev => prev.map(rule => {
      if (rule.dayOfWeek === sourceDay) return rule;
      if (rule.dayOfWeek === 'sunday' && settings.autoCloseSundays) return rule;
      return {
        ...rule,
        isOpen: sourceRule.isOpen,
        timeSlots: sourceRule.timeSlots.map(s => ({ ...s, id: generateId() }))
      };
    }));
    toast({
      title: "Applicato",
      description: "Orari copiati su tutti i giorni lavorativi"
    });
  };

  const handleSettingChange = (setting: keyof CalendarSettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [setting]: value }));
    
    if (setting === 'autoCloseSundays') {
      setOpeningRules(prev => prev.map(rule => {
        if (rule.dayOfWeek !== 'sunday') return rule;
        return {
          ...rule,
          isOpen: !value,
          timeSlots: !value && rule.timeSlots.length === 0 ? createDefaultTimeSlots() : rule.timeSlots
        };
      }));
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7;
    
    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const isHoliday = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return holidays.find(h => h.date === dateStr);
  };

  const getOverride = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return overrides.find(o => o.date === dateStr);
  };

  const getDayStatus = (date: Date) => {
    const override = getOverride(date);
    if (override) {
      return override.isOpen ? 'override_open' : 'override_closed';
    }
    
    const holiday = isHoliday(date);
    if (holiday) {
      if (holiday.type === 'national' && settings.autoCloseNationalHolidays) return 'holiday_closed';
      if (holiday.type === 'religious' && settings.autoCloseReligiousHolidays) return 'holiday_closed';
    }
    
    const dayOfWeek = DAYS_OF_WEEK[(date.getDay() + 6) % 7].key;
    const rule = openingRules.find(r => r.dayOfWeek === dayOfWeek);
    
    return rule?.isOpen ? 'open' : 'closed';
  };

  const handleDateClick = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    setSelectedDate(dateStr);
  };

  const addOverride = (type: 'closed' | 'special_hours') => {
    if (!selectedDate) return;
    
    const existing = overrides.find(o => o.date === selectedDate);
    if (existing) {
      setOverrides(prev => prev.map(o => 
        o.date === selectedDate 
          ? { 
              ...o, 
              overrideType: type, 
              isOpen: type === 'special_hours',
              timeSlots: type === 'special_hours' && o.timeSlots.length === 0 
                ? createDefaultTimeSlots() 
                : o.timeSlots
            }
          : o
      ));
    } else {
      setOverrides(prev => [...prev, {
        date: selectedDate,
        overrideType: type,
        isOpen: type === 'special_hours',
        timeSlots: type === 'special_hours' ? createDefaultTimeSlots() : [],
        reason: ''
      }]);
    }
  };

  const addOverrideTimeSlot = (dateStr: string) => {
    setOverrides(prev => prev.map(o => {
      if (o.date !== dateStr) return o;
      const lastSlot = o.timeSlots[o.timeSlots.length - 1];
      const newStart = lastSlot ? lastSlot.endTime : '09:00';
      return {
        ...o,
        timeSlots: [...o.timeSlots, { id: generateId(), startTime: newStart, endTime: '19:30' }]
      };
    }));
  };

  const removeOverrideTimeSlot = (dateStr: string, slotId: string) => {
    setOverrides(prev => prev.map(o => {
      if (o.date !== dateStr) return o;
      return {
        ...o,
        timeSlots: o.timeSlots.filter(s => s.id !== slotId)
      };
    }));
  };

  const updateOverrideTimeSlot = (dateStr: string, slotId: string, field: 'startTime' | 'endTime', value: string) => {
    setOverrides(prev => prev.map(o => {
      if (o.date !== dateStr) return o;
      return {
        ...o,
        timeSlots: o.timeSlots.map(s => s.id === slotId ? { ...s, [field]: value } : s)
      };
    }));
  };

  const updateOverrideReason = (dateStr: string, reason: string) => {
    setOverrides(prev => prev.map(o => 
      o.date === dateStr ? { ...o, reason } : o
    ));
  };

  const removeOverride = (dateStr: string) => {
    setOverrides(prev => prev.filter(o => o.date !== dateStr));
  };

  const calendarDays = useMemo(() => getDaysInMonth(currentMonth), [currentMonth]);

  if (!open) return null;

  const isSundayClosed = settings.autoCloseSundays;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        width: '95%',
        maxWidth: '1000px',
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Calendar size={22} style={{ color: 'white' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: 0 }}>
                Calendario Orari
              </h2>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                {storeName}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {allStores.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCopyModal(true)}
                data-testid="btn-copy-config"
              >
                <Copy size={14} className="mr-1" />
                Copia
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="sm"
              data-testid="btn-save-calendar"
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: 'white'
              }}
            >
              <Save size={14} className="mr-1" />
              {isSaving ? 'Salvo...' : 'Salva'}
            </Button>
            <button
              onClick={onClose}
              data-testid="btn-close-calendar"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '8px'
              }}
            >
              <X size={20} style={{ color: '#6b7280' }} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '4px',
          padding: '12px 24px',
          borderBottom: '1px solid #e5e7eb',
          background: '#fafafa',
          flexShrink: 0
        }}>
          {[
            { id: 'rules', label: 'Orari Settimanali', icon: Clock },
            { id: 'calendar', label: 'Calendario', icon: Calendar },
            { id: 'exceptions', label: 'Eccezioni', icon: AlertCircle }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              data-testid={`tab-${tab.id}`}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === tab.id ? '#3b82f6' : 'transparent',
                color: activeTab === tab.id ? 'white' : '#6b7280',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
              <div style={{ color: '#6b7280' }}>Caricamento...</div>
            </div>
          ) : (
            <>
              {/* Tab: Orari Settimanali */}
              {activeTab === 'rules' && (
                <div>
                  {/* Quick Settings */}
                  <div style={{
                    background: '#f8fafc',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '20px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
                      Regole Automatiche
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <Switch
                          checked={settings.autoCloseSundays}
                          onCheckedChange={(checked) => handleSettingChange('autoCloseSundays', checked)}
                          data-testid="switch-sunday-closed"
                        />
                        <span style={{ fontSize: '13px', color: '#374151' }}>Chiuso la Domenica</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <Switch
                          checked={settings.autoCloseNationalHolidays}
                          onCheckedChange={(checked) => handleSettingChange('autoCloseNationalHolidays', checked)}
                          data-testid="switch-national-holidays"
                        />
                        <span style={{ fontSize: '13px', color: '#374151' }}>Chiuso Festivi Nazionali</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <Switch
                          checked={settings.autoCloseReligiousHolidays}
                          onCheckedChange={(checked) => handleSettingChange('autoCloseReligiousHolidays', checked)}
                          data-testid="switch-religious-holidays"
                        />
                        <span style={{ fontSize: '13px', color: '#374151' }}>Chiuso Festivi Religiosi</span>
                      </label>
                    </div>
                  </div>

                  {/* Apply to All Button */}
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => applyToAllDays('monday')}
                      data-testid="btn-apply-all-days"
                    >
                      <Copy size={12} className="mr-1" />
                      Copia Lunedì su tutti i giorni
                    </Button>
                  </div>

                  {/* Weekly Schedule */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {DAYS_OF_WEEK.map((day) => {
                      const rule = openingRules.find(r => r.dayOfWeek === day.key);
                      const isDisabledByRule = day.key === 'sunday' && isSundayClosed;
                      const effectivelyOpen = rule?.isOpen && !isDisabledByRule;
                      
                      return (
                        <div
                          key={day.key}
                          data-testid={`day-row-${day.key}`}
                          style={{
                            padding: '12px 16px',
                            background: effectivelyOpen ? '#f0fdf4' : '#fef2f2',
                            borderRadius: '10px',
                            border: `1px solid ${effectivelyOpen ? '#bbf7d0' : '#fecaca'}`,
                            opacity: isDisabledByRule ? 0.6 : 1
                          }}
                        >
                          {/* Day Header Row */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: effectivelyOpen ? '10px' : 0 }}>
                            <div style={{ width: '90px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                              {day.label}
                            </div>
                            
                            <Switch
                              checked={rule?.isOpen || false}
                              onCheckedChange={(checked) => updateDayOpen(day.key, checked)}
                              disabled={isDisabledByRule}
                              data-testid={`switch-day-${day.key}`}
                            />
                            <span style={{ 
                              fontSize: '12px', 
                              color: effectivelyOpen ? '#16a34a' : '#dc2626',
                              fontWeight: '500',
                              minWidth: '50px'
                            }}>
                              {effectivelyOpen ? 'Aperto' : 'Chiuso'}
                            </span>
                            
                            {isDisabledByRule && (
                              <span style={{ fontSize: '11px', color: '#9ca3af', fontStyle: 'italic' }}>
                                (disattiva "Chiuso la Domenica" per configurare)
                              </span>
                            )}
                          </div>

                          {/* Time Slots */}
                          {effectivelyOpen && rule && (
                            <div style={{ marginLeft: '102px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {rule.timeSlots.map((slot, idx) => (
                                  <div key={slot.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '11px', color: '#6b7280', width: '60px' }}>
                                      Fascia {idx + 1}:
                                    </span>
                                    <input
                                      type="time"
                                      value={slot.startTime}
                                      onChange={(e) => updateTimeSlot(day.key, slot.id, 'startTime', e.target.value)}
                                      data-testid={`input-start-${day.key}-${idx}`}
                                      style={{
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '13px',
                                        width: '100px'
                                      }}
                                    />
                                    <span style={{ color: '#6b7280', fontSize: '12px' }}>-</span>
                                    <input
                                      type="time"
                                      value={slot.endTime}
                                      onChange={(e) => updateTimeSlot(day.key, slot.id, 'endTime', e.target.value)}
                                      data-testid={`input-end-${day.key}-${idx}`}
                                      style={{
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '13px',
                                        width: '100px'
                                      }}
                                    />
                                    {rule.timeSlots.length > 1 && (
                                      <button
                                        onClick={() => removeTimeSlot(day.key, slot.id)}
                                        data-testid={`btn-remove-slot-${day.key}-${idx}`}
                                        style={{
                                          padding: '4px',
                                          borderRadius: '4px',
                                          border: 'none',
                                          background: '#fee2e2',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center'
                                        }}
                                      >
                                        <Trash2 size={12} style={{ color: '#dc2626' }} />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                              
                              <button
                                onClick={() => addTimeSlot(day.key)}
                                data-testid={`btn-add-slot-${day.key}`}
                                style={{
                                  marginTop: '8px',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  border: '1px dashed #d1d5db',
                                  background: 'white',
                                  fontSize: '11px',
                                  color: '#6b7280',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Plus size={12} />
                                Aggiungi fascia oraria
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab: Calendario */}
              {activeTab === 'calendar' && (
                <div style={{ display: 'flex', gap: '24px' }}>
                  {/* Calendar Grid */}
                  <div style={{ flex: 1 }}>
                    {/* Month Navigation */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '20px'
                    }}>
                      <button
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                        data-testid="btn-prev-month"
                        style={{
                          padding: '8px',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          background: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                        {currentMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                      </h3>
                      <button
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                        data-testid="btn-next-month"
                        style={{
                          padding: '8px',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          background: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>

                    {/* Days Header */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      gap: '4px',
                      marginBottom: '8px'
                    }}>
                      {DAYS_OF_WEEK.map(day => (
                        <div
                          key={day.key}
                          style={{
                            textAlign: 'center',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#6b7280',
                            padding: '8px'
                          }}
                        >
                          {day.short}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Days */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      gap: '4px'
                    }}>
                      {calendarDays.map((date, idx) => {
                        if (!date) {
                          return <div key={`empty-${idx}`} style={{ aspectRatio: '1' }} />;
                        }
                        
                        const status = getDayStatus(date);
                        const holiday = isHoliday(date);
                        const override = getOverride(date);
                        const dateStr = date.toISOString().split('T')[0];
                        const isSelected = selectedDate === dateStr;
                        
                        let bgColor = '#f0fdf4';
                        let borderColor = '#bbf7d0';
                        let textColor = '#16a34a';
                        
                        if (status === 'closed' || status === 'holiday_closed' || status === 'override_closed') {
                          bgColor = '#fef2f2';
                          borderColor = '#fecaca';
                          textColor = '#dc2626';
                        }
                        if (status === 'override_open' || status === 'override_closed') {
                          bgColor = '#fef9c3';
                          borderColor = '#fde047';
                          textColor = '#ca8a04';
                        }
                        
                        return (
                          <button
                            key={dateStr}
                            onClick={() => handleDateClick(date)}
                            data-testid={`calendar-day-${dateStr}`}
                            style={{
                              aspectRatio: '1',
                              borderRadius: '8px',
                              border: isSelected ? '2px solid #3b82f6' : `1px solid ${borderColor}`,
                              background: bgColor,
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '4px',
                              position: 'relative',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <span style={{
                              fontSize: '14px',
                              fontWeight: '600',
                              color: textColor
                            }}>
                              {date.getDate()}
                            </span>
                            {holiday && (
                              <span style={{
                                fontSize: '8px',
                                color: '#dc2626',
                                marginTop: '2px',
                                maxWidth: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {holiday.name.split(' ')[0]}
                              </span>
                            )}
                            {override && (
                              <div style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: '#f59e0b'
                              }} />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Legend */}
                    <div style={{
                      display: 'flex',
                      gap: '16px',
                      marginTop: '20px',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: '#f0fdf4', border: '1px solid #bbf7d0' }} />
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>Aperto</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: '#fef2f2', border: '1px solid #fecaca' }} />
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>Chiuso</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: '#fef9c3', border: '1px solid #fde047' }} />
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>Override</span>
                      </div>
                    </div>
                  </div>

                  {/* Selected Day Panel */}
                  {selectedDate && (
                    <div style={{
                      width: '320px',
                      background: '#f8fafc',
                      borderRadius: '12px',
                      padding: '20px',
                      border: '1px solid #e2e8f0',
                      maxHeight: '400px',
                      overflow: 'auto'
                    }}>
                      <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
                        {new Date(selectedDate).toLocaleDateString('it-IT', { 
                          weekday: 'long', 
                          day: 'numeric', 
                          month: 'long' 
                        })}
                      </h4>
                      
                      {isHoliday(new Date(selectedDate)) && (
                        <div style={{
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: '8px',
                          padding: '12px',
                          marginBottom: '16px'
                        }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#dc2626' }}>
                            🎉 {isHoliday(new Date(selectedDate))?.name}
                          </div>
                        </div>
                      )}

                      {(() => {
                        const override = getOverride(new Date(selectedDate));
                        if (override) {
                          return (
                            <div>
                              {override.overrideType === 'closed' ? (
                                <div style={{
                                  background: '#fef2f2',
                                  borderRadius: '8px',
                                  padding: '12px',
                                  marginBottom: '12px'
                                }}>
                                  <p style={{ fontSize: '13px', color: '#dc2626', fontWeight: '600' }}>
                                    Giorno impostato come CHIUSO
                                  </p>
                                </div>
                              ) : (
                                <div>
                                  <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px', fontWeight: '500' }}>
                                    Orario speciale per questo giorno:
                                  </p>
                                  
                                  {/* Time Slots Editor */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                                    {override.timeSlots.map((slot, idx) => (
                                      <div key={slot.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '11px', color: '#6b7280', width: '50px' }}>
                                          Fascia {idx + 1}:
                                        </span>
                                        <input
                                          type="time"
                                          value={slot.startTime}
                                          onChange={(e) => updateOverrideTimeSlot(selectedDate, slot.id, 'startTime', e.target.value)}
                                          data-testid={`override-start-${idx}`}
                                          style={{
                                            padding: '4px 6px',
                                            borderRadius: '4px',
                                            border: '1px solid #d1d5db',
                                            fontSize: '12px',
                                            width: '85px'
                                          }}
                                        />
                                        <span style={{ color: '#6b7280', fontSize: '11px' }}>-</span>
                                        <input
                                          type="time"
                                          value={slot.endTime}
                                          onChange={(e) => updateOverrideTimeSlot(selectedDate, slot.id, 'endTime', e.target.value)}
                                          data-testid={`override-end-${idx}`}
                                          style={{
                                            padding: '4px 6px',
                                            borderRadius: '4px',
                                            border: '1px solid #d1d5db',
                                            fontSize: '12px',
                                            width: '85px'
                                          }}
                                        />
                                        {override.timeSlots.length > 1 && (
                                          <button
                                            onClick={() => removeOverrideTimeSlot(selectedDate, slot.id)}
                                            data-testid={`btn-remove-override-slot-${idx}`}
                                            style={{
                                              padding: '3px',
                                              borderRadius: '4px',
                                              border: 'none',
                                              background: '#fee2e2',
                                              cursor: 'pointer',
                                              display: 'flex',
                                              alignItems: 'center'
                                            }}
                                          >
                                            <Trash2 size={10} style={{ color: '#dc2626' }} />
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                  
                                  <button
                                    onClick={() => addOverrideTimeSlot(selectedDate)}
                                    data-testid="btn-add-override-slot"
                                    style={{
                                      width: '100%',
                                      padding: '6px',
                                      borderRadius: '6px',
                                      border: '1px dashed #d1d5db',
                                      background: 'white',
                                      fontSize: '11px',
                                      color: '#6b7280',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '4px',
                                      marginBottom: '12px'
                                    }}
                                  >
                                    <Plus size={12} />
                                    Aggiungi fascia oraria
                                  </button>

                                  {/* Reason input */}
                                  <div style={{ marginBottom: '12px' }}>
                                    <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                                      Motivo (opzionale):
                                    </label>
                                    <input
                                      type="text"
                                      value={override.reason || ''}
                                      onChange={(e) => updateOverrideReason(selectedDate, e.target.value)}
                                      placeholder="Es: Inventario, Evento speciale..."
                                      data-testid="input-override-reason"
                                      style={{
                                        width: '100%',
                                        padding: '6px 8px',
                                        borderRadius: '6px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '12px'
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                              
                              <div style={{ display: 'flex', gap: '8px' }}>
                                {override.overrideType === 'closed' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addOverride('special_hours')}
                                    data-testid="btn-change-to-special"
                                    style={{ flex: 1, fontSize: '11px' }}
                                  >
                                    Cambia in Orario Speciale
                                  </Button>
                                )}
                                {override.overrideType === 'special_hours' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addOverride('closed')}
                                    data-testid="btn-change-to-closed"
                                    style={{ flex: 1, fontSize: '11px' }}
                                  >
                                    Imposta Chiuso
                                  </Button>
                                )}
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => removeOverride(selectedDate)}
                                  data-testid="btn-remove-override"
                                  style={{ fontSize: '11px' }}
                                >
                                  Rimuovi
                                </Button>
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => addOverride('closed')}
                                data-testid="btn-set-closed"
                              >
                                Imposta come Chiuso
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => addOverride('special_hours')}
                                data-testid="btn-set-special"
                              >
                                Imposta Orario Speciale
                              </Button>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Eccezioni */}
              {activeTab === 'exceptions' && (
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
                    Override e Eccezioni Manuali
                  </h3>
                  
                  {overrides.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '40px',
                      background: '#f8fafc',
                      borderRadius: '12px',
                      color: '#6b7280'
                    }}>
                      <Calendar size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                      <p>Nessuna eccezione configurata</p>
                      <p style={{ fontSize: '13px' }}>
                        Vai al tab Calendario per aggiungere override su date specifiche
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {overrides.map(override => (
                        <div
                          key={override.date}
                          data-testid={`exception-${override.date}`}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '16px 20px',
                            background: override.isOpen ? '#f0fdf4' : '#fef2f2',
                            borderRadius: '12px',
                            border: `1px solid ${override.isOpen ? '#bbf7d0' : '#fecaca'}`
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: '600', color: '#111827' }}>
                              {new Date(override.date).toLocaleDateString('it-IT', { 
                                weekday: 'long', 
                                day: 'numeric', 
                                month: 'long',
                                year: 'numeric'
                              })}
                            </div>
                            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                              {override.isOpen 
                                ? `Aperto: ${override.timeSlots.map(s => `${s.startTime}-${s.endTime}`).join(', ')}`
                                : 'Chiuso'}
                              {override.reason && ` - ${override.reason}`}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOverride(override.date)}
                            data-testid={`btn-remove-exception-${override.date}`}
                          >
                            <X size={16} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Copy to Stores Modal */}
      {showCopyModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            width: '400px',
            maxHeight: '500px',
            overflow: 'auto'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              Copia Configurazione
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
              Seleziona i negozi su cui copiare la configurazione orari
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {allStores.filter(s => s.id !== storeId).map(store => (
                <label
                  key={store.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    background: selectedStoresForCopy.includes(store.id) ? '#f0f9ff' : '#f8fafc',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    border: `1px solid ${selectedStoresForCopy.includes(store.id) ? '#3b82f6' : '#e2e8f0'}`
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedStoresForCopy.includes(store.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStoresForCopy(prev => [...prev, store.id]);
                      } else {
                        setSelectedStoresForCopy(prev => prev.filter(id => id !== store.id));
                      }
                    }}
                    data-testid={`checkbox-store-${store.id}`}
                  />
                  <Store size={16} style={{ color: '#6b7280' }} />
                  <span style={{ fontSize: '14px', color: '#111827' }}>{store.nome}</span>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => setShowCopyModal(false)} data-testid="btn-cancel-copy">
                Annulla
              </Button>
              <Button
                onClick={handleCopyToStores}
                disabled={selectedStoresForCopy.length === 0 || isSaving}
                data-testid="btn-confirm-copy"
              >
                {isSaving ? 'Copiando...' : `Copia su ${selectedStoresForCopy.length} negozi`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StoreCalendarModal;
