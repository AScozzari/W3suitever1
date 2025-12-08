// useTimeAttendanceFSM - Enterprise Finite State Machine Hook
// Centralized Time Attendance State Management with Type Safety

import { useReducer, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentTenantId } from '@/contexts/TenantContext';
import { encryptionManager } from '@/utils/encryptionManager';
import {
  TimeAttendanceState,
  TimeAttendanceEvent,
  TimeAttendanceContext,
  UseTimeAttendanceFSM,
  TrackingMethod,
  StateGuards,
  SideEffects,
  FSMConfig,
  DEFAULT_FSM_CONFIG,
  EventPayload,
  FSM_TRANSITIONS
} from '@/types/timeAttendanceFSM';
import {
  timeTrackingService,
  ClockInData,
  ClockOutData,
  NearbyStore
} from '@/services/timeTrackingService';

// ==================== FSM ACTION TYPES ====================
type FSMAction = 
  | { type: TimeAttendanceEvent.SELECT_METHOD; payload: EventPayload[TimeAttendanceEvent.SELECT_METHOD] }
  | { type: TimeAttendanceEvent.SELECT_STORE; payload: EventPayload[TimeAttendanceEvent.SELECT_STORE] }
  | { type: TimeAttendanceEvent.CLOCK_IN_ATTEMPT; payload: EventPayload[TimeAttendanceEvent.CLOCK_IN_ATTEMPT] }
  | { type: TimeAttendanceEvent.CLOCK_IN_SUCCESS; payload: EventPayload[TimeAttendanceEvent.CLOCK_IN_SUCCESS] }
  | { type: TimeAttendanceEvent.CLOCK_IN_FAIL; payload: EventPayload[TimeAttendanceEvent.CLOCK_IN_FAIL] }
  | { type: TimeAttendanceEvent.CLOCK_OUT_ATTEMPT; payload: EventPayload[TimeAttendanceEvent.CLOCK_OUT_ATTEMPT] }
  | { type: TimeAttendanceEvent.CLOCK_OUT_SUCCESS; payload: EventPayload[TimeAttendanceEvent.CLOCK_OUT_SUCCESS] }
  | { type: TimeAttendanceEvent.CLOCK_OUT_FAIL; payload: EventPayload[TimeAttendanceEvent.CLOCK_OUT_FAIL] }
  | { type: TimeAttendanceEvent.BREAK_START; payload: EventPayload[TimeAttendanceEvent.BREAK_START] }
  | { type: TimeAttendanceEvent.BREAK_END; payload: EventPayload[TimeAttendanceEvent.BREAK_END] }
  | { type: TimeAttendanceEvent.TIMEOUT; payload: EventPayload[TimeAttendanceEvent.TIMEOUT] }
  | { type: TimeAttendanceEvent.OVERTIME; payload: EventPayload[TimeAttendanceEvent.OVERTIME] }
  | { type: TimeAttendanceEvent.ERROR_OCCURRED; payload: EventPayload[TimeAttendanceEvent.ERROR_OCCURRED] }
  | { type: TimeAttendanceEvent.RESET; payload: EventPayload[TimeAttendanceEvent.RESET] }
  | { type: TimeAttendanceEvent.RETRY; payload: EventPayload[TimeAttendanceEvent.RETRY] }
  | { type: 'TICK'; payload: { timestamp: Date } }
  | { type: 'CLEAR_ERROR'; payload: {} }
  | { type: 'SET_LOADING'; payload: { isLoading: boolean; action?: string } }
  | { type: 'UPDATE_GEOLOCATION_VALID'; payload: { isValid: boolean } };

// ==================== INITIAL CONTEXT ====================
function createInitialContext(userId: string, tenantId: string): TimeAttendanceContext {
  return {
    sessionId: null,
    startTime: null,
    endTime: null,
    elapsedSeconds: 0,
    
    selectedMethod: null,
    selectedStore: null,
    
    clockInData: null,
    clockOutData: null,
    
    isOnBreak: false,
    breakStartTime: null,
    totalBreakSeconds: 0,
    
    isOvertime: false,
    requiresBreak: false,
    
    error: null,
    lastError: null,
    retryCount: 0,
    
    isStoreValid: false,
    isMethodValid: false,
    isGeoLocationValid: false,
    
    timestamp: new Date(),
    tenantId,
    userId
  };
}

// ==================== STATE GUARDS IMPLEMENTATION ====================
function createStateGuards(config: FSMConfig): StateGuards {
  return {
    canClockIn: (context) => {
      return context.selectedMethod !== null && 
             context.selectedStore !== null &&
             context.sessionId === null;
    },
    
    canClockOut: (context) => {
      return context.sessionId !== null && 
             !context.isOnBreak;
    },
    
    canStartBreak: (context) => {
      return context.sessionId !== null && 
             !context.isOnBreak &&
             context.elapsedSeconds >= (config.breakRequiredAfterMinutes * 60);
    },
    
    canEndBreak: (context) => {
      return context.sessionId !== null && 
             context.isOnBreak;
    },
    
    isWithinGeofence: (context) => {
      if (!config.enableGeofencing || !context.selectedStore) return true;
      return context.isGeoLocationValid;
    },
    
    hasValidMethod: (context) => {
      return context.selectedMethod !== null;
    },
    
    hasValidStore: (context) => {
      return context.selectedStore !== null;
    },
    
    isOvertimeAllowed: (context) => {
      return config.enableOvertimeDetection;
    },
    
    needsBreak: (context) => {
      return config.enableBreakTracking && 
             context.elapsedSeconds >= (config.breakRequiredAfterMinutes * 60) &&
             !context.isOnBreak;
    }
  };
}

// ==================== SIDE EFFECTS IMPLEMENTATION ====================
function createSideEffects(
  toast: ReturnType<typeof useToast>['toast'],
  queryClient: ReturnType<typeof useQueryClient>,
  tenantId: string
): SideEffects {
  return {
    // API Effects
    apiClockIn: async (context) => {
      if (!context.clockInData) throw new Error('Clock in data not available');
      
      // Ensure encryption is initialized before API call
      if (encryptionManager.isSupported()) {
        await encryptionManager.initialize(tenantId);
      }
      
      await timeTrackingService.clockIn(context.clockInData);
      
      // Invalidate cache to refresh current session and entries
      queryClient.invalidateQueries({ queryKey: ['/api/hr/time-tracking/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/time-tracking/entries'] });
    },
    
    apiClockOut: async (context) => {
      if (!context.sessionId) throw new Error('No active session');
      
      // Ensure encryption is initialized before API call
      if (encryptionManager.isSupported()) {
        await encryptionManager.initialize(tenantId);
      }
      
      await timeTrackingService.clockOut(context.sessionId, context.clockOutData);
      
      // Invalidate cache to refresh current session and entries
      queryClient.invalidateQueries({ queryKey: ['/api/hr/time-tracking/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/time-tracking/entries'] });
    },
    
    apiStartBreak: async (context) => {
      if (!context.sessionId) throw new Error('No active session');
      
      // Ensure encryption is initialized before API call
      if (encryptionManager.isSupported()) {
        await encryptionManager.initialize(tenantId);
      }
      
      await timeTrackingService.startBreak(context.sessionId);
      
      // Invalidate cache to refresh current session state
      queryClient.invalidateQueries({ queryKey: ['/api/hr/time-tracking/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/time-tracking/entries'] });
    },
    
    apiEndBreak: async (context) => {
      if (!context.sessionId) throw new Error('No active session');
      
      // Ensure encryption is initialized before API call
      if (encryptionManager.isSupported()) {
        await encryptionManager.initialize(tenantId);
      }
      
      await timeTrackingService.endBreak(context.sessionId);
      
      // Invalidate cache to refresh current session state
      queryClient.invalidateQueries({ queryKey: ['/api/hr/time-tracking/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/time-tracking/entries'] });
    },
    
    // Timer Effects
    startTimer: () => {
      // Timer is managed by useEffect in the hook
    },
    
    stopTimer: () => {
      // Timer is managed by useEffect in the hook
    },
    
    pauseTimer: () => {
      // Timer is managed by useEffect in the hook
    },
    
    resumeTimer: () => {
      // Timer is managed by useEffect in the hook
    },
    
    // Notification Effects
    notifyOvertimeStart: () => {
      toast({
        title: 'Straordinario Iniziato',
        description: 'Hai superato le 8 ore di lavoro',
        variant: 'default'
      });
    },
    
    notifyBreakRequired: () => {
      toast({
        title: 'Pausa Richiesta',
        description: 'Hai lavorato più di 6 ore, è richiesta una pausa',
        variant: 'default'
      });
    },
    
    notifyClockInSuccess: () => {
      toast({
        title: 'Entrata Registrata',
        description: 'Timbratura di entrata completata con successo',
        variant: 'default'
      });
    },
    
    notifyClockOutSuccess: () => {
      toast({
        title: 'Uscita Registrata', 
        description: 'Timbratura di uscita completata con successo',
        variant: 'default'
      });
    },
    
    notifyError: (context) => {
      toast({
        title: 'Errore Timbratura',
        description: context.error || 'Si è verificato un errore',
        variant: 'destructive'
      });
    },
    
    // Storage Effects
    saveSession: (context) => {
      if (context.sessionId) {
        localStorage.setItem('w3_fsm_session', JSON.stringify({
          sessionId: context.sessionId,
          startTime: context.startTime,
          selectedStore: context.selectedStore,
          selectedMethod: context.selectedMethod
        }));
      }
    },
    
    clearSession: () => {
      localStorage.removeItem('w3_fsm_session');
    },
    
    // Validation Effects
    validateGeolocation: async () => {
      // Implementation would depend on geolocation service
      return true;
    },
    
    validateStore: async () => {
      // Implementation would depend on store validation service
      return true;
    },
    
    validateMethod: async () => {
      // Implementation would depend on method validation service
      return true;
    }
  };
}

// ==================== FSM REDUCER ====================
function fsmReducer(
  state: { currentState: TimeAttendanceState; context: TimeAttendanceContext; isLoading: boolean; loadingAction: string | null },
  action: FSMAction
): { currentState: TimeAttendanceState; context: TimeAttendanceContext; isLoading: boolean; loadingAction: string | null } {
  
  const { currentState, context } = state;
  let newState = currentState;
  let newContext = { ...context };
  let isLoading = state.isLoading;
  let loadingAction = state.loadingAction;

  // Handle special actions
  switch (action.type) {
    case 'TICK':
      if (currentState === TimeAttendanceState.ACTIVE && !context.isOnBreak && context.startTime) {
        newContext.elapsedSeconds = Math.floor((action.payload.timestamp.getTime() - context.startTime.getTime()) / 1000);
        newContext.timestamp = action.payload.timestamp;
        
        // Check for overtime
        if (!context.isOvertime && newContext.elapsedSeconds >= (DEFAULT_FSM_CONFIG.overtimeThresholdMinutes * 60)) {
          newContext.isOvertime = true;
        }
        
        // Check for break requirement
        if (newContext.elapsedSeconds >= (DEFAULT_FSM_CONFIG.breakRequiredAfterMinutes * 60)) {
          newContext.requiresBreak = true;
        }
      }
      break;
      
    case 'CLEAR_ERROR':
      newContext.error = null;
      newContext.lastError = null;
      break;
      
    case 'SET_LOADING':
      isLoading = action.payload.isLoading;
      loadingAction = action.payload.action || null;
      break;
      
    case 'UPDATE_GEOLOCATION_VALID':
      newContext.isGeoLocationValid = action.payload.isValid;
      break;
  }

  // ✅ FIX: Handle context-only updates (no state transition required)
  // These events update context without changing FSM state
  switch (action.type) {
    case TimeAttendanceEvent.SELECT_METHOD:
      newContext.selectedMethod = action.payload.method;
      newContext.isMethodValid = true;
      break;
      
    case TimeAttendanceEvent.SELECT_STORE:
      newContext.selectedStore = action.payload.store;
      newContext.isStoreValid = true;
      break;
  }

  // Process FSM events that require state transitions
  const transition = FSM_TRANSITIONS.find(t => 
    t.from === currentState && t.event === action.type
  );

  if (transition) {
    newState = transition.to;
    
    // Update context based on events that change state
    switch (action.type) {
        
      case TimeAttendanceEvent.CLOCK_IN_ATTEMPT:
        newContext.clockInData = action.payload.clockInData;
        newContext.error = null;
        break;
        
      case TimeAttendanceEvent.CLOCK_IN_SUCCESS:
        newContext.sessionId = action.payload.sessionId;
        newContext.startTime = action.payload.startTime;
        newContext.elapsedSeconds = 0;
        newContext.error = null;
        newContext.retryCount = 0;
        break;
        
      case TimeAttendanceEvent.CLOCK_IN_FAIL:
        newContext.error = action.payload.error;
        newContext.retryCount += 1;
        newContext.sessionId = null;
        newContext.startTime = null;
        break;
        
      case TimeAttendanceEvent.CLOCK_OUT_ATTEMPT:
        newContext.clockOutData = action.payload.clockOutData;
        newContext.error = null;
        break;
        
      case TimeAttendanceEvent.CLOCK_OUT_SUCCESS:
        newContext.endTime = action.payload.endTime;
        newContext.sessionId = null;
        newContext.startTime = null;
        newContext.elapsedSeconds = 0;
        newContext.isOnBreak = false;
        newContext.breakStartTime = null;
        newContext.totalBreakSeconds = 0;
        newContext.isOvertime = false;
        newContext.requiresBreak = false;
        newContext.error = null;
        break;
        
      case TimeAttendanceEvent.CLOCK_OUT_FAIL:
        newContext.error = action.payload.error;
        break;
        
      case TimeAttendanceEvent.BREAK_START:
        newContext.isOnBreak = true;
        newContext.breakStartTime = action.payload.breakStartTime;
        break;
        
      case TimeAttendanceEvent.BREAK_END:
        newContext.isOnBreak = false;
        newContext.totalBreakSeconds += action.payload.breakDuration;
        newContext.breakStartTime = null;
        break;
        
      case TimeAttendanceEvent.ERROR_OCCURRED:
        newContext.error = action.payload.error.message;
        newContext.lastError = action.payload.error;
        break;
        
      case TimeAttendanceEvent.RESET:
        newContext = createInitialContext(context.userId, context.tenantId);
        break;
        
      case TimeAttendanceEvent.RETRY:
        newContext.retryCount += 1;
        newContext.error = null;
        break;
    }
  }

  return {
    currentState: newState,
    context: newContext,
    isLoading,
    loadingAction
  };
}

// ==================== MAIN HOOK ====================
export function useTimeAttendanceFSM(
  userId: string,
  config: Partial<FSMConfig> = {}
): UseTimeAttendanceFSM {
  
  const finalConfig = { ...DEFAULT_FSM_CONFIG, ...config };
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = useCurrentTenantId();
  
  // Guard: Ensure tenant is available
  if (!tenantId) {
    throw new Error('Tenant context is required for FSM initialization. Please ensure user is properly authenticated.');
  }
  
  // Initialize state
  const [state, dispatch] = useReducer(
    fsmReducer,
    {
      currentState: finalConfig.initialState,
      context: createInitialContext(userId, tenantId),
      isLoading: false,
      loadingAction: null
    }
  );
  
  const { currentState, context, isLoading, loadingAction } = state;
  
  // Create guards and side effects
  const guards = createStateGuards(finalConfig);
  const sideEffects = createSideEffects(toast, queryClient, tenantId);
  
  // Timer management
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Timer effect
  useEffect(() => {
    if (currentState === TimeAttendanceState.ACTIVE && !context.isOnBreak) {
      timerRef.current = setInterval(() => {
        dispatch({ type: 'TICK', payload: { timestamp: new Date() } });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentState, context.isOnBreak]);
  
  // Overtime notification effect
  useEffect(() => {
    if (context.isOvertime && currentState === TimeAttendanceState.ACTIVE) {
      sideEffects.notifyOvertimeStart(context);
    }
  }, [context.isOvertime]);
  
  // Break requirement notification effect
  useEffect(() => {
    if (context.requiresBreak && !context.isOnBreak && currentState === TimeAttendanceState.ACTIVE) {
      sideEffects.notifyBreakRequired(context);
    }
  }, [context.requiresBreak]);
  
  // Session persistence effect
  useEffect(() => {
    if (context.sessionId) {
      sideEffects.saveSession(context);
    } else {
      sideEffects.clearSession(context);
    }
  }, [context.sessionId]);
  
  // Encryption manager initialization effect
  useEffect(() => {
    const initializeEncryption = async () => {
      try {
        if (!encryptionManager.isSupported()) {
          console.warn('⚠️ [FSM] Encryption not supported in this browser');
          return;
        }
        
        const success = await encryptionManager.initialize(tenantId);
        if (!success) {
          console.error('🔴 [FSM] Failed to initialize encryption manager for tenant:', tenantId);
        } else {
          console.log('🔐 [FSM] Encryption manager initialized successfully for tenant:', tenantId);
        }
      } catch (error) {
        console.error('🔴 [FSM] Encryption initialization error:', error);
      }
    };
    
    initializeEncryption();
  }, [tenantId]);
  
  // Load saved session on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('w3_fsm_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed.sessionId) {
          dispatch({
            type: TimeAttendanceEvent.CLOCK_IN_SUCCESS,
            payload: {
              sessionId: parsed.sessionId,
              startTime: new Date(parsed.startTime)
            }
          });
          
          if (parsed.selectedStore) {
            dispatch({
              type: TimeAttendanceEvent.SELECT_STORE,
              payload: { store: parsed.selectedStore }
            });
          }
          
          if (parsed.selectedMethod) {
            dispatch({
              type: TimeAttendanceEvent.SELECT_METHOD,
              payload: { method: parsed.selectedMethod }
            });
          }
        }
      } catch (error) {
        console.error('Failed to load saved session:', error);
      }
    }
  }, []);

  // ==================== EVENT HANDLERS ====================
  const selectMethod = useCallback((method: TrackingMethod) => {
    dispatch({
      type: TimeAttendanceEvent.SELECT_METHOD,
      payload: { method }
    });
  }, []);

  const selectStore = useCallback((store: NearbyStore) => {
    dispatch({
      type: TimeAttendanceEvent.SELECT_STORE,
      payload: { store }
    });
  }, []);

  const clockIn = useCallback(async (data: ClockInData) => {
    if (!guards.canClockIn(context)) {
      throw new Error('Cannot clock in at this time');
    }
    
    try {
      dispatch({ type: 'SET_LOADING', payload: { isLoading: true, action: 'clockingIn' } });
      dispatch({
        type: TimeAttendanceEvent.CLOCK_IN_ATTEMPT,
        payload: { clockInData: data }
      });
      
      await sideEffects.apiClockIn({ ...context, clockInData: data });
      
      const response = await timeTrackingService.getCurrentSession();
      if (response) {
        dispatch({
          type: TimeAttendanceEvent.CLOCK_IN_SUCCESS,
          payload: {
            sessionId: response.id,
            startTime: new Date(response.clockIn)
          }
        });
        sideEffects.notifyClockInSuccess(context);
      }
    } catch (error) {
      dispatch({
        type: TimeAttendanceEvent.CLOCK_IN_FAIL,
        payload: { error: error instanceof Error ? error.message : 'Clock in failed' }
      });
      sideEffects.notifyError(context);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { isLoading: false } });
    }
  }, [context, guards, sideEffects]);

  const clockOut = useCallback(async (data?: ClockOutData) => {
    if (!guards.canClockOut(context)) {
      throw new Error('Cannot clock out at this time');
    }
    
    try {
      dispatch({ type: 'SET_LOADING', payload: { isLoading: true, action: 'clockingOut' } });
      dispatch({
        type: TimeAttendanceEvent.CLOCK_OUT_ATTEMPT,
        payload: { clockOutData: data }
      });
      
      await sideEffects.apiClockOut({ ...context, clockOutData: data });
      
      dispatch({
        type: TimeAttendanceEvent.CLOCK_OUT_SUCCESS,
        payload: {
          endTime: new Date(),
          totalMinutes: Math.floor(context.elapsedSeconds / 60)
        }
      });
      sideEffects.notifyClockOutSuccess(context);
    } catch (error) {
      dispatch({
        type: TimeAttendanceEvent.CLOCK_OUT_FAIL,
        payload: { error: error instanceof Error ? error.message : 'Clock out failed' }
      });
      sideEffects.notifyError(context);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { isLoading: false } });
    }
  }, [context, guards, sideEffects]);

  const startBreak = useCallback(async () => {
    if (!guards.canStartBreak(context)) {
      throw new Error('Cannot start break at this time');
    }
    
    try {
      await sideEffects.apiStartBreak(context);
      dispatch({
        type: TimeAttendanceEvent.BREAK_START,
        payload: { breakStartTime: new Date() }
      });
    } catch (error) {
      dispatch({
        type: TimeAttendanceEvent.ERROR_OCCURRED,
        payload: { error: error instanceof Error ? error : new Error('Break start failed') }
      });
    }
  }, [context, guards, sideEffects]);

  const endBreak = useCallback(async () => {
    if (!guards.canEndBreak(context)) {
      throw new Error('Cannot end break at this time');
    }
    
    try {
      await sideEffects.apiEndBreak(context);
      const breakDuration = context.breakStartTime 
        ? Math.floor((Date.now() - context.breakStartTime.getTime()) / 1000)
        : 0;
      
      dispatch({
        type: TimeAttendanceEvent.BREAK_END,
        payload: { 
          breakEndTime: new Date(),
          breakDuration
        }
      });
    } catch (error) {
      dispatch({
        type: TimeAttendanceEvent.ERROR_OCCURRED,
        payload: { error: error instanceof Error ? error : new Error('Break end failed') }
      });
    }
  }, [context, guards, sideEffects]);

  const reset = useCallback(() => {
    dispatch({
      type: TimeAttendanceEvent.RESET,
      payload: {}
    });
  }, []);

  const retry = useCallback(() => {
    if (context.retryCount < finalConfig.maxRetryAttempts) {
      dispatch({
        type: TimeAttendanceEvent.RETRY,
        payload: {}
      });
    }
  }, [context.retryCount, finalConfig.maxRetryAttempts]);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR', payload: {} });
  }, []);

  const updateGeolocationValid = useCallback((isValid: boolean) => {
    dispatch({ 
      type: 'UPDATE_GEOLOCATION_VALID', 
      payload: { isValid } 
    });
  }, []);

  // ==================== COMPUTED PROPERTIES ====================
  const elapsedTime = {
    hours: Math.floor(context.elapsedSeconds / 3600),
    minutes: Math.floor((context.elapsedSeconds % 3600) / 60),
    seconds: context.elapsedSeconds % 60,
    totalSeconds: context.elapsedSeconds
  };

  const breakTime = {
    hours: Math.floor(context.totalBreakSeconds / 3600),
    minutes: Math.floor((context.totalBreakSeconds % 3600) / 60),
    seconds: context.totalBreakSeconds % 60,
    totalSeconds: context.totalBreakSeconds
  };

  // ==================== RETURN HOOK INTERFACE ====================
  return {
    // Current State
    state: currentState,
    context,
    
    // State Queries
    isIdle: currentState === TimeAttendanceState.IDLE,
    isClockingIn: currentState === TimeAttendanceState.CLOCKING_IN,
    isActive: currentState === TimeAttendanceState.ACTIVE,
    isOnBreak: currentState === TimeAttendanceState.ON_BREAK,
    isClockingOut: currentState === TimeAttendanceState.CLOCKING_OUT,
    isError: currentState === TimeAttendanceState.ERROR,
    
    // Business State
    canClockIn: guards.canClockIn(context),
    canClockOut: guards.canClockOut(context),
    canStartBreak: guards.canStartBreak(context),
    canEndBreak: guards.canEndBreak(context),
    needsBreak: guards.needsBreak(context),
    isOvertime: context.isOvertime,
    
    // Event Dispatchers
    selectMethod,
    selectStore,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    reset,
    retry,
    updateGeolocationValid,
    
    // Computed Properties
    elapsedTime,
    breakTime,
    
    // Error Handling
    error: context.error,
    clearError,
    
    // Loading States
    isLoading,
    loadingAction
  };
}