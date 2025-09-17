// Time Tracking Custom Hooks - Enterprise HR Management
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  timeTrackingService,
  CurrentSession,
  TimeTrackingEntry,
  TimeTrackingReport,
  ClockInData,
  ClockOutData,
} from '@/services/timeTrackingService';
import {
  geolocationManager,
  GeoPosition,
  GeofenceZone,
} from '@/utils/geolocationManager';

// ==================== SESSION HOOK ====================
export function useCurrentSession() {
  const { data: session, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/hr/time-tracking/current'],
    queryFn: () => timeTrackingService.getCurrentSession(),
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 1,
  });

  const isActive = !!session && !('clockOut' in (session as any) && (session as any).clockOut);
  const elapsedMinutes = session?.elapsedMinutes || 0;
  const isOnBreak = !!session?.currentBreak;
  const requiresBreak = elapsedMinutes > 360; // 6 hours
  const isOvertime = elapsedMinutes > 480; // 8 hours

  return {
    session,
    isActive,
    elapsedMinutes,
    isOnBreak,
    requiresBreak,
    isOvertime,
    isLoading,
    error,
    refetch,
  };
}

// ==================== TIME BALANCE HOOK ====================
export function useTimeBalance(userId?: string, period?: { start: string; end: string }) {
  const [balance, setBalance] = useState({
    totalHours: 0,
    regularHours: 0,
    overtimeHours: 0,
    holidayHours: 0,
    targetHours: 0,
    balanceHours: 0,
    percentComplete: 0,
  });

  const { data: entries, isLoading } = useQuery({
    queryKey: ['/api/hr/time-tracking/entries', userId, period],
    queryFn: () =>
      timeTrackingService.getEntries({
        userId,
        startDate: period?.start,
        endDate: period?.end,
      }),
    enabled: !!userId && !!period,
  });

  useEffect(() => {
    if (entries) {
      const totalMinutes = entries.reduce(
        (sum, entry) => sum + (entry.totalMinutes || 0),
        0
      );
      const overtimeMinutes = entries.reduce(
        (sum, entry) => sum + (entry.overtimeMinutes || 0),
        0
      );
      const holidayMinutes = entries.reduce(
        (sum, entry) => sum + (entry.holidayBonus ? entry.totalMinutes || 0 : 0),
        0
      );

      const totalHours = totalMinutes / 60;
      const overtimeHours = overtimeMinutes / 60;
      const holidayHours = holidayMinutes / 60;
      const regularHours = totalHours - overtimeHours - holidayHours;

      // Calculate target based on working days (assuming 8 hours/day)
      const workingDays = entries.length;
      const targetHours = workingDays * 8;
      const balanceHours = totalHours - targetHours;
      const percentComplete = targetHours > 0 ? (totalHours / targetHours) * 100 : 0;

      setBalance({
        totalHours,
        regularHours,
        overtimeHours,
        holidayHours,
        targetHours,
        balanceHours,
        percentComplete,
      });
    }
  }, [entries]);

  return {
    balance,
    entries,
    isLoading,
  };
}

// ==================== GEOFENCING HOOK ====================
export function useGeofencing(zones?: GeofenceZone[]) {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [isWithinZone, setIsWithinZone] = useState(false);
  const [nearestZone, setNearestZone] = useState<GeofenceZone | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startTracking = useCallback(async () => {
    try {
      setIsTracking(true);
      setError(null);

      // Initialize geolocation
      const initialized = await geolocationManager.initialize();
      if (!initialized) {
        throw new Error('Geolocation permission denied');
      }

      // Add zones if provided
      if (zones) {
        zones.forEach((zone) => geolocationManager.addGeofence(zone));
      }

      // Start watching position
      geolocationManager.startWatching(
        (pos) => {
          setPosition(pos);
          
          if (zones) {
            const validation = geolocationManager.validateLocation(pos, zones);
            setIsWithinZone(validation.isWithinGeofence);
            setNearestZone(validation.nearestZone || null);
            setDistance(validation.distance || null);
          }
        },
        (err) => {
          setError(err);
          setIsTracking(false);
        },
        true // High accuracy
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start tracking');
      setIsTracking(false);
    }
  }, [zones]);

  const stopTracking = useCallback(() => {
    geolocationManager.stopWatching();
    setIsTracking(false);
  }, []);

  const checkCurrentPosition = useCallback(async () => {
    try {
      const pos = await geolocationManager.getCurrentPosition();
      if (pos) {
        setPosition(pos);
        
        if (zones) {
          const validation = geolocationManager.validateLocation(pos, zones);
          setIsWithinZone(validation.isWithinGeofence);
          setNearestZone(validation.nearestZone || null);
          setDistance(validation.distance || null);
        }
        
        return pos;
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get position');
      return null;
    }
  }, [zones]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isTracking) {
        stopTracking();
      }
    };
  }, [isTracking, stopTracking]);

  return {
    position,
    isWithinZone,
    nearestZone,
    distance,
    isTracking,
    error,
    startTracking,
    stopTracking,
    checkCurrentPosition,
  };
}

// ==================== PERMISSIONS HOOK ====================
export function useTimeTrackingPermissions(userId?: string, userRole?: string) {
  const [permissions, setPermissions] = useState({
    canClockIn: false,
    canClockOut: false,
    canEditOwn: false,
    canEditTeam: false,
    canEditAll: false,
    canApproveTeam: false,
    canApproveAll: false,
    canViewReports: false,
    canExport: false,
    canManageSettings: false,
  });

  useEffect(() => {
    if (!userRole) return;

    const perms = {
      canClockIn: true, // All authenticated users
      canClockOut: true,
      canEditOwn: true,
      canEditTeam: false,
      canEditAll: false,
      canApproveTeam: false,
      canApproveAll: false,
      canViewReports: false,
      canExport: false,
      canManageSettings: false,
    };

    switch (userRole) {
      case 'ADMIN':
        Object.keys(perms).forEach((key) => {
          perms[key as keyof typeof perms] = true;
        });
        break;
      
      case 'HR_MANAGER':
        perms.canEditAll = true;
        perms.canApproveAll = true;
        perms.canViewReports = true;
        perms.canExport = true;
        perms.canManageSettings = true;
        break;
      
      case 'STORE_MANAGER':
      case 'AREA_MANAGER':
        perms.canEditTeam = true;
        perms.canApproveTeam = true;
        perms.canViewReports = true;
        perms.canExport = true;
        break;
      
      case 'TEAM_LEADER':
        perms.canEditTeam = true;
        perms.canApproveTeam = true;
        break;
    }

    setPermissions(perms);
  }, [userRole]);

  return permissions;
}

// ==================== CLOCK IN/OUT HOOKS ====================
export function useClockIn() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: ClockInData) => timeTrackingService.clockIn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/time-tracking/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/time-tracking/entries'] });
      toast({
        title: 'Timbratura Registrata',
        description: 'Entrata registrata con successo',
      });
    },
    onError: (error) => {
      toast({
        title: 'Errore Timbratura',
        description: error instanceof Error ? error.message : 'Impossibile registrare entrata',
        variant: 'destructive',
      });
    },
  });
}

export function useClockOut() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: ClockOutData }) =>
      timeTrackingService.clockOut(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/time-tracking/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/time-tracking/entries'] });
      toast({
        title: 'Timbratura Registrata',
        description: 'Uscita registrata con successo',
      });
    },
    onError: (error) => {
      toast({
        title: 'Errore Timbratura',
        description: error instanceof Error ? error.message : 'Impossibile registrare uscita',
        variant: 'destructive',
      });
    },
  });
}

// ==================== ENTRIES HOOKS ====================
export function useTimeEntries(filters?: {
  userId?: string;
  storeId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ['/api/hr/time-tracking/entries', filters],
    queryFn: () => timeTrackingService.getEntries(filters),
  });
}

export function useUpdateEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TimeTrackingEntry> }) =>
      timeTrackingService.updateEntry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/time-tracking/entries'] });
      toast({
        title: 'Timbratura Aggiornata',
        description: 'Le modifiche sono state salvate',
      });
    },
    onError: (error) => {
      toast({
        title: 'Errore Aggiornamento',
        description: error instanceof Error ? error.message : 'Impossibile salvare le modifiche',
        variant: 'destructive',
      });
    },
  });
}

export function useApproveEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, comments }: { id: string; comments?: string }) =>
      timeTrackingService.approveEntry(id, comments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/time-tracking/entries'] });
      toast({
        title: 'Timbratura Approvata',
        description: 'La timbratura è stata approvata',
      });
    },
    onError: (error) => {
      toast({
        title: 'Errore Approvazione',
        description: error instanceof Error ? error.message : 'Impossibile approvare',
        variant: 'destructive',
      });
    },
  });
}

export function useDisputeEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      timeTrackingService.disputeEntry(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/time-tracking/entries'] });
      toast({
        title: 'Disputa Inviata',
        description: 'La disputa è stata registrata',
      });
    },
    onError: (error) => {
      toast({
        title: 'Errore Disputa',
        description: error instanceof Error ? error.message : 'Impossibile inviare disputa',
        variant: 'destructive',
      });
    },
  });
}

// ==================== REPORTS HOOK ====================
export function useTimeReports(
  userId: string,
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: ['/api/hr/time-tracking/reports', userId, startDate, endDate],
    queryFn: () => timeTrackingService.getReport(userId, startDate, endDate),
    enabled: !!userId && !!startDate && !!endDate,
  });
}

export function useTeamReports(
  storeId: string,
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: ['/api/hr/time-tracking/reports/team', storeId, startDate, endDate],
    queryFn: () => timeTrackingService.getTeamReport(storeId, startDate, endDate),
    enabled: !!storeId && !!startDate && !!endDate,
  });
}

// ==================== EXPORT HOOK ====================
export function useExportEntries() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      filters,
      format = 'csv',
    }: {
      filters: any;
      format?: 'csv' | 'pdf';
    }) => timeTrackingService.exportEntries(filters, format),
    onSuccess: (blob, { format }) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `time-tracking-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'Export Completato',
        description: `File ${format.toUpperCase()} scaricato con successo`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Errore Export',
        description: error instanceof Error ? error.message : 'Impossibile esportare i dati',
        variant: 'destructive',
      });
    },
  });
}