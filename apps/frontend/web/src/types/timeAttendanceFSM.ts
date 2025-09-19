// Time Attendance Finite State Machine - Type Definitions
// Enterprise Time Tracking System with Type-Safe State Management

import { ClockInData, ClockOutData, NearbyStore } from '@/services/timeTrackingService';

// ==================== FSM STATES ====================
export enum TimeAttendanceState {
  IDLE = 'idle',
  CLOCKING_IN = 'clockingIn', 
  ACTIVE = 'active',
  ON_BREAK = 'onBreak',
  CLOCKING_OUT = 'clockingOut',
  ERROR = 'error'
}

// ==================== FSM EVENTS ====================
export enum TimeAttendanceEvent {
  // Selection Events
  SELECT_METHOD = 'selectMethod',
  SELECT_STORE = 'selectStore',
  
  // Clock Events
  CLOCK_IN_ATTEMPT = 'clockInAttempt',
  CLOCK_IN_SUCCESS = 'clockInSuccess',
  CLOCK_IN_FAIL = 'clockInFail',
  
  CLOCK_OUT_ATTEMPT = 'clockOutAttempt', 
  CLOCK_OUT_SUCCESS = 'clockOutSuccess',
  CLOCK_OUT_FAIL = 'clockOutFail',
  
  // Break Events
  BREAK_START = 'breakStart',
  BREAK_END = 'breakEnd',
  
  // System Events
  TIMEOUT = 'timeout',
  OVERTIME = 'overtime',
  RESET = 'reset',
  ERROR_OCCURRED = 'errorOccurred',
  RETRY = 'retry'
}

// ==================== TRACKING METHODS ====================
export type TrackingMethod = 'badge' | 'nfc' | 'app' | 'gps' | 'manual' | 'biometric' | 'qr' | 'smart' | 'web';

// ==================== STRATEGY PATTERN TYPES ====================
export type StrategyType = 'gps' | 'nfc' | 'qr' | 'smart' | 'web' | 'badge';

export interface StrategyValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
  metadata?: Record<string, unknown>;
}

export interface StrategyPrepareResult {
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface StrategyPayloadData {
  method: StrategyType;
  data: Record<string, unknown>;
  metadata?: {
    accuracy?: number;
    confidence?: number;
    timestamp: number;
    source: string;
  };
}

export interface StrategyPanelProps {
  isActive: boolean;
  isLoading: boolean;
  context: TimeAttendanceContext;
  onAction?: (action: string, data?: unknown) => void;
  compact?: boolean;
}

export interface TimeAttendanceStrategy {
  readonly type: StrategyType;
  readonly name: string;
  readonly description: string;
  readonly priority: number;
  readonly availability: {
    supported: boolean;
    requiresPermission: boolean;
    requiresHardware: boolean;
    requiresNetwork: boolean;
  };

  // Core Strategy Methods
  prepare(context: TimeAttendanceContext): Promise<StrategyPrepareResult>;
  validate(context: TimeAttendanceContext): Promise<StrategyValidationResult>;
  augmentPayload(basePayload: Partial<ClockInData>, context: TimeAttendanceContext): Promise<ClockInData>;
  renderPanel(props: StrategyPanelProps): React.ReactElement;

  // Lifecycle Methods
  cleanup?(): Promise<void>;
  reset?(): void;
  
  // Capability Checks
  isAvailable(): boolean;
  getRequiredPermissions(): string[];
}

// ==================== FSM CONTEXT ====================
export interface TimeAttendanceContext {
  sessionId: string | null;
  startTime: Date | null;
  endTime: Date | null;
  elapsedSeconds: number;
  
  // Selection State
  selectedMethod: TrackingMethod | null;
  selectedStore: NearbyStore | null;
  
  // Clock Data
  clockInData: ClockInData | null;
  clockOutData: ClockOutData | null;
  
  // Break Tracking
  isOnBreak: boolean;
  breakStartTime: Date | null;
  totalBreakSeconds: number;
  
  // Business Logic States
  isOvertime: boolean;
  requiresBreak: boolean;
  
  // Error Handling
  error: string | null;
  lastError: Error | null;
  retryCount: number;
  
  // Validation States
  isStoreValid: boolean;
  isMethodValid: boolean;
  isGeoLocationValid: boolean;
  
  // Metadata
  timestamp: Date;
  tenantId: string;
  userId: string;
}

// ==================== TRANSITION DEFINITIONS ====================
export interface StateTransition {
  from: TimeAttendanceState;
  to: TimeAttendanceState;
  event: TimeAttendanceEvent;
  guard?: (context: TimeAttendanceContext) => boolean;
  action?: (context: TimeAttendanceContext) => Promise<void> | void;
}

// ==================== STATE GUARDS ====================
export interface StateGuards {
  canClockIn: (context: TimeAttendanceContext) => boolean;
  canClockOut: (context: TimeAttendanceContext) => boolean;
  canStartBreak: (context: TimeAttendanceContext) => boolean;
  canEndBreak: (context: TimeAttendanceContext) => boolean;
  isWithinGeofence: (context: TimeAttendanceContext) => boolean;
  hasValidMethod: (context: TimeAttendanceContext) => boolean;
  hasValidStore: (context: TimeAttendanceContext) => boolean;
  isOvertimeAllowed: (context: TimeAttendanceContext) => boolean;
  needsBreak: (context: TimeAttendanceContext) => boolean;
}

// ==================== SIDE EFFECTS ====================
export interface SideEffects {
  // API Effects
  apiClockIn: (context: TimeAttendanceContext) => Promise<void>;
  apiClockOut: (context: TimeAttendanceContext) => Promise<void>;
  apiStartBreak: (context: TimeAttendanceContext) => Promise<void>;
  apiEndBreak: (context: TimeAttendanceContext) => Promise<void>;
  
  // Timer Effects
  startTimer: (context: TimeAttendanceContext) => void;
  stopTimer: (context: TimeAttendanceContext) => void;
  pauseTimer: (context: TimeAttendanceContext) => void;
  resumeTimer: (context: TimeAttendanceContext) => void;
  
  // Notification Effects
  notifyOvertimeStart: (context: TimeAttendanceContext) => void;
  notifyBreakRequired: (context: TimeAttendanceContext) => void;
  notifyClockInSuccess: (context: TimeAttendanceContext) => void;
  notifyClockOutSuccess: (context: TimeAttendanceContext) => void;
  notifyError: (context: TimeAttendanceContext) => void;
  
  // Storage Effects
  saveSession: (context: TimeAttendanceContext) => void;
  clearSession: (context: TimeAttendanceContext) => void;
  
  // Validation Effects
  validateGeolocation: (context: TimeAttendanceContext) => Promise<boolean>;
  validateStore: (context: TimeAttendanceContext) => Promise<boolean>;
  validateMethod: (context: TimeAttendanceContext) => Promise<boolean>;
}

// ==================== EVENT PAYLOADS ====================
export interface EventPayload {
  [TimeAttendanceEvent.SELECT_METHOD]: {
    method: TrackingMethod;
  };
  
  [TimeAttendanceEvent.SELECT_STORE]: {
    store: NearbyStore;
  };
  
  [TimeAttendanceEvent.CLOCK_IN_ATTEMPT]: {
    clockInData: ClockInData;
  };
  
  [TimeAttendanceEvent.CLOCK_IN_SUCCESS]: {
    sessionId: string;
    startTime: Date;
  };
  
  [TimeAttendanceEvent.CLOCK_IN_FAIL]: {
    error: string;
  };
  
  [TimeAttendanceEvent.CLOCK_OUT_ATTEMPT]: {
    clockOutData?: ClockOutData;
  };
  
  [TimeAttendanceEvent.CLOCK_OUT_SUCCESS]: {
    endTime: Date;
    totalMinutes: number;
  };
  
  [TimeAttendanceEvent.CLOCK_OUT_FAIL]: {
    error: string;
  };
  
  [TimeAttendanceEvent.BREAK_START]: {
    breakStartTime: Date;
  };
  
  [TimeAttendanceEvent.BREAK_END]: {
    breakEndTime: Date;
    breakDuration: number;
  };
  
  [TimeAttendanceEvent.TIMEOUT]: {
    timeoutType: 'session' | 'break' | 'overtime';
  };
  
  [TimeAttendanceEvent.OVERTIME]: {
    overtimeStartTime: Date;
  };
  
  [TimeAttendanceEvent.ERROR_OCCURRED]: {
    error: Error;
    context?: string;
  };
  
  [TimeAttendanceEvent.RESET]: {};
  [TimeAttendanceEvent.RETRY]: {};
}

// ==================== FSM CONFIGURATION ====================
export interface FSMConfig {
  // State Machine Definition
  states: TimeAttendanceState[];
  initialState: TimeAttendanceState;
  transitions: StateTransition[];
  
  // Business Rules
  overtimeThresholdMinutes: number;
  breakRequiredAfterMinutes: number;
  maxRetryAttempts: number;
  sessionTimeoutMinutes: number;
  
  // Validation Rules
  geofenceRadiusMeters: number;
  requiredAccuracyMeters: number;
  allowManualOverride: boolean;
  
  // Feature Flags
  enableBreakTracking: boolean;
  enableOvertimeDetection: boolean;
  enableGeofencing: boolean;
  enableEncryption: boolean;
}

// ==================== HOOK RETURN TYPE ====================
export interface UseTimeAttendanceFSM {
  // Current State
  state: TimeAttendanceState;
  context: TimeAttendanceContext;
  
  // State Queries
  isIdle: boolean;
  isClockingIn: boolean;
  isActive: boolean;
  isOnBreak: boolean;
  isClockingOut: boolean;
  isError: boolean;
  
  // Business State
  canClockIn: boolean;
  canClockOut: boolean;
  canStartBreak: boolean;
  canEndBreak: boolean;
  needsBreak: boolean;
  isOvertime: boolean;
  
  // Event Dispatchers
  selectMethod: (method: TrackingMethod) => void;
  selectStore: (store: NearbyStore) => void;
  clockIn: (data: ClockInData) => Promise<void>;
  clockOut: (data?: ClockOutData) => Promise<void>;
  startBreak: () => Promise<void>;
  endBreak: () => Promise<void>;
  reset: () => void;
  retry: () => void;
  updateGeolocationValid: (isValid: boolean) => void;
  
  // Computed Properties
  elapsedTime: {
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
  };
  
  breakTime: {
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
  };
  
  // Error Handling
  error: string | null;
  clearError: () => void;
  
  // Loading States
  isLoading: boolean;
  loadingAction: string | null;
}

// ==================== TRANSITION MAP ====================
export const FSM_TRANSITIONS: StateTransition[] = [
  // From IDLE
  {
    from: TimeAttendanceState.IDLE,
    to: TimeAttendanceState.CLOCKING_IN,
    event: TimeAttendanceEvent.CLOCK_IN_ATTEMPT
  },
  
  // From CLOCKING_IN
  {
    from: TimeAttendanceState.CLOCKING_IN,
    to: TimeAttendanceState.ACTIVE,
    event: TimeAttendanceEvent.CLOCK_IN_SUCCESS
  },
  {
    from: TimeAttendanceState.CLOCKING_IN,
    to: TimeAttendanceState.ERROR,
    event: TimeAttendanceEvent.CLOCK_IN_FAIL
  },
  
  // From ACTIVE
  {
    from: TimeAttendanceState.ACTIVE,
    to: TimeAttendanceState.ON_BREAK,
    event: TimeAttendanceEvent.BREAK_START
  },
  {
    from: TimeAttendanceState.ACTIVE,
    to: TimeAttendanceState.CLOCKING_OUT,
    event: TimeAttendanceEvent.CLOCK_OUT_ATTEMPT
  },
  {
    from: TimeAttendanceState.ACTIVE,
    to: TimeAttendanceState.ERROR,
    event: TimeAttendanceEvent.ERROR_OCCURRED
  },
  
  // From ON_BREAK
  {
    from: TimeAttendanceState.ON_BREAK,
    to: TimeAttendanceState.ACTIVE,
    event: TimeAttendanceEvent.BREAK_END
  },
  {
    from: TimeAttendanceState.ON_BREAK,
    to: TimeAttendanceState.ERROR,
    event: TimeAttendanceEvent.ERROR_OCCURRED
  },
  
  // From CLOCKING_OUT
  {
    from: TimeAttendanceState.CLOCKING_OUT,
    to: TimeAttendanceState.IDLE,
    event: TimeAttendanceEvent.CLOCK_OUT_SUCCESS
  },
  {
    from: TimeAttendanceState.CLOCKING_OUT,
    to: TimeAttendanceState.ERROR,
    event: TimeAttendanceEvent.CLOCK_OUT_FAIL
  },
  
  // From ERROR
  {
    from: TimeAttendanceState.ERROR,
    to: TimeAttendanceState.IDLE,
    event: TimeAttendanceEvent.RESET
  },
  {
    from: TimeAttendanceState.ERROR,
    to: TimeAttendanceState.CLOCKING_IN,
    event: TimeAttendanceEvent.RETRY
  },
  
  // Global Reset
  {
    from: TimeAttendanceState.ACTIVE,
    to: TimeAttendanceState.IDLE,
    event: TimeAttendanceEvent.RESET
  },
  {
    from: TimeAttendanceState.ON_BREAK,
    to: TimeAttendanceState.IDLE,
    event: TimeAttendanceEvent.RESET
  },
  {
    from: TimeAttendanceState.CLOCKING_OUT,
    to: TimeAttendanceState.IDLE,
    event: TimeAttendanceEvent.RESET
  }
];

// ==================== DEFAULT CONFIGURATION ====================
export const DEFAULT_FSM_CONFIG: FSMConfig = {
  states: Object.values(TimeAttendanceState),
  initialState: TimeAttendanceState.IDLE,
  transitions: FSM_TRANSITIONS,
  
  // Business Rules (matching Italian labor law)
  overtimeThresholdMinutes: 480, // 8 hours
  breakRequiredAfterMinutes: 360, // 6 hours
  maxRetryAttempts: 3,
  sessionTimeoutMinutes: 720, // 12 hours max session
  
  // Validation Rules
  geofenceRadiusMeters: 100,
  requiredAccuracyMeters: 50,
  allowManualOverride: true,
  
  // Feature Flags
  enableBreakTracking: true,
  enableOvertimeDetection: true,
  enableGeofencing: true,
  enableEncryption: true
};