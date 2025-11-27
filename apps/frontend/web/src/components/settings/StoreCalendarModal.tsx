import { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Copy,
  Sun,
  Moon,
  Coffee,
  AlertCircle,
  Save,
  RotateCcw,
  Settings,
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

interface OpeningRule {
  dayOfWeek: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  hasBreak: boolean;
  breakStartTime: string;
  breakEndTime: string;
}

interface CalendarOverride {
  date: string;
  overrideType: 'closed' | 'special_hours' | 'holiday';
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
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

const DEFAULT_OPENING_RULES: OpeningRule[] = DAYS_OF_WEEK.map(day => ({
  dayOfWeek: day.key,
  isOpen: day.key !== 'sunday',
  openTime: '09:00',
  closeTime: '20:00',
  hasBreak: false,
  breakStartTime: '13:00',
  breakEndTime: '14:00',
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
        headers: { 'x-tenant-id': tenantId }
      });
      if (response.ok) {
        const responseData = await response.json();
        const data = responseData.data || responseData;
        if (data.openingRules?.length > 0) {
          setOpeningRules(data.openingRules);
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
          'x-tenant-id': tenantId 
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
          'x-tenant-id': tenantId 
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

  const updateRule = (dayKey: string, field: keyof OpeningRule, value: any) => {
    setOpeningRules(prev => prev.map(rule => 
      rule.dayOfWeek === dayKey ? { ...rule, [field]: value } : rule
    ));
  };

  const applyToAllDays = (sourceDay: string, field: 'times' | 'break') => {
    const sourceRule = openingRules.find(r => r.dayOfWeek === sourceDay);
    if (!sourceRule) return;
    
    setOpeningRules(prev => prev.map(rule => {
      if (rule.dayOfWeek === sourceDay) return rule;
      if (field === 'times') {
        return { ...rule, openTime: sourceRule.openTime, closeTime: sourceRule.closeTime };
      } else {
        return { 
          ...rule, 
          hasBreak: sourceRule.hasBreak, 
          breakStartTime: sourceRule.breakStartTime, 
          breakEndTime: sourceRule.breakEndTime 
        };
      }
    }));
    toast({
      title: "Applicato",
      description: field === 'times' ? "Orari copiati su tutti i giorni" : "Pausa copiata su tutti i giorni"
    });
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
    
    if (dayOfWeek === 'sunday' && settings.autoCloseSundays && !rule?.isOpen) {
      return 'closed';
    }
    
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
          ? { ...o, overrideType: type, isOpen: type === 'special_hours' }
          : o
      ));
    } else {
      setOverrides(prev => [...prev, {
        date: selectedDate,
        overrideType: type,
        isOpen: type === 'special_hours',
        openTime: '09:00',
        closeTime: '20:00',
        reason: ''
      }]);
    }
  };

  const removeOverride = (dateStr: string) => {
    setOverrides(prev => prev.filter(o => o.date !== dateStr));
  };

  const calendarDays = useMemo(() => getDaysInMonth(currentMonth), [currentMonth]);

  if (!open) return null;

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
        width: '90%',
        maxWidth: '900px',
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 32px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Calendar size={24} style={{ color: 'white' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: 0 }}>
                Calendario Orari
              </h2>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                {storeName}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {allStores.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCopyModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Copy size={14} />
                Copia su altri negozi
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={isSaving}
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Save size={14} />
              {isSaving ? 'Salvataggio...' : 'Salva'}
            </Button>
            <button
              onClick={onClose}
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
          padding: '16px 32px',
          borderBottom: '1px solid #e5e7eb',
          background: '#fafafa'
        }}>
          {[
            { id: 'rules', label: 'Orari Settimanali', icon: Clock },
            { id: 'calendar', label: 'Calendario', icon: Calendar },
            { id: 'exceptions', label: 'Eccezioni', icon: AlertCircle }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === tab.id ? '#3b82f6' : 'transparent',
                color: activeTab === tab.id ? 'white' : '#6b7280',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
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
                    padding: '20px',
                    marginBottom: '24px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '16px' }}>
                      Regole Automatiche
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <Switch
                          checked={settings.autoCloseSundays}
                          onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoCloseSundays: checked }))}
                        />
                        <span style={{ fontSize: '14px', color: '#374151' }}>Chiuso la Domenica</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <Switch
                          checked={settings.autoCloseNationalHolidays}
                          onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoCloseNationalHolidays: checked }))}
                        />
                        <span style={{ fontSize: '14px', color: '#374151' }}>Chiuso Festivi Nazionali</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <Switch
                          checked={settings.autoCloseReligiousHolidays}
                          onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoCloseReligiousHolidays: checked }))}
                        />
                        <span style={{ fontSize: '14px', color: '#374151' }}>Chiuso Festivi Religiosi</span>
                      </label>
                    </div>
                  </div>

                  {/* Weekly Schedule */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {DAYS_OF_WEEK.map((day, idx) => {
                      const rule = openingRules.find(r => r.dayOfWeek === day.key) || DEFAULT_OPENING_RULES[idx];
                      return (
                        <div
                          key={day.key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            padding: '16px 20px',
                            background: rule.isOpen ? '#f0fdf4' : '#fef2f2',
                            borderRadius: '12px',
                            border: `1px solid ${rule.isOpen ? '#bbf7d0' : '#fecaca'}`
                          }}
                        >
                          {/* Day Name */}
                          <div style={{ width: '100px', fontWeight: '600', color: '#374151' }}>
                            {day.label}
                          </div>

                          {/* Open/Closed Toggle */}
                          <Switch
                            checked={rule.isOpen}
                            onCheckedChange={(checked) => updateRule(day.key, 'isOpen', checked)}
                          />
                          <span style={{ 
                            fontSize: '13px', 
                            color: rule.isOpen ? '#16a34a' : '#dc2626',
                            fontWeight: '500',
                            width: '60px'
                          }}>
                            {rule.isOpen ? 'Aperto' : 'Chiuso'}
                          </span>

                          {rule.isOpen && (
                            <>
                              {/* Opening Hours */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Sun size={16} style={{ color: '#f59e0b' }} />
                                <input
                                  type="time"
                                  value={rule.openTime}
                                  onChange={(e) => updateRule(day.key, 'openTime', e.target.value)}
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid #d1d5db',
                                    fontSize: '14px'
                                  }}
                                />
                                <span style={{ color: '#6b7280' }}>-</span>
                                <Moon size={16} style={{ color: '#6366f1' }} />
                                <input
                                  type="time"
                                  value={rule.closeTime}
                                  onChange={(e) => updateRule(day.key, 'closeTime', e.target.value)}
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid #d1d5db',
                                    fontSize: '14px'
                                  }}
                                />
                              </div>

                              {/* Break Toggle */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px' }}>
                                <Coffee size={16} style={{ color: '#8b5cf6' }} />
                                <Switch
                                  checked={rule.hasBreak}
                                  onCheckedChange={(checked) => updateRule(day.key, 'hasBreak', checked)}
                                />
                                {rule.hasBreak && (
                                  <>
                                    <input
                                      type="time"
                                      value={rule.breakStartTime}
                                      onChange={(e) => updateRule(day.key, 'breakStartTime', e.target.value)}
                                      style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '13px',
                                        width: '90px'
                                      }}
                                    />
                                    <span style={{ color: '#6b7280', fontSize: '13px' }}>-</span>
                                    <input
                                      type="time"
                                      value={rule.breakEndTime}
                                      onChange={(e) => updateRule(day.key, 'breakEndTime', e.target.value)}
                                      style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '13px',
                                        width: '90px'
                                      }}
                                    />
                                  </>
                                )}
                              </div>

                              {/* Apply to All Button */}
                              {idx === 0 && (
                                <button
                                  onClick={() => applyToAllDays(day.key, 'times')}
                                  style={{
                                    marginLeft: 'auto',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid #d1d5db',
                                    background: 'white',
                                    fontSize: '12px',
                                    color: '#6b7280',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                  title="Applica questi orari a tutti i giorni"
                                >
                                  <RotateCcw size={12} />
                                  Applica a tutti
                                </button>
                              )}
                            </>
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
                      width: '280px',
                      background: '#f8fafc',
                      borderRadius: '12px',
                      padding: '20px',
                      border: '1px solid #e2e8f0'
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

                      {getOverride(new Date(selectedDate)) ? (
                        <div>
                          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>
                            Questo giorno ha un override manuale
                          </p>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeOverride(selectedDate)}
                          >
                            Rimuovi Override
                          </Button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addOverride('closed')}
                          >
                            Imposta come Chiuso
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addOverride('special_hours')}
                          >
                            Imposta Orario Speciale
                          </Button>
                        </div>
                      )}
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
                                ? `Aperto: ${override.openTime} - ${override.closeTime}`
                                : 'Chiuso'}
                              {override.reason && ` - ${override.reason}`}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOverride(override.date)}
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
                  />
                  <Store size={16} style={{ color: '#6b7280' }} />
                  <span style={{ fontSize: '14px', color: '#111827' }}>{store.nome}</span>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => setShowCopyModal(false)}>
                Annulla
              </Button>
              <Button
                onClick={handleCopyToStores}
                disabled={selectedStoresForCopy.length === 0 || isSaving}
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
