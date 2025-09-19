// Time Attendance Strategies Manager Hook - Centralized strategy coordination
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  StrategyType,
  TimeAttendanceStrategy,
  StrategyValidationResult,
  StrategyPrepareResult,
  TimeAttendanceContext
} from '@/types/timeAttendanceFSM';
import { ClockInData } from '@/services/timeTrackingService';
import { ALL_STRATEGIES, getAvailableStrategies, getStrategyPriorities } from '@/strategies';

export interface StrategyManagerState {
  // Current Strategy
  selectedStrategy: TimeAttendanceStrategy | null;
  selectedType: StrategyType | null;
  
  // Strategy States
  isInitialized: boolean;
  isPreparing: boolean;
  isValidating: boolean;
  
  // Results
  prepareResult: StrategyPrepareResult | null;
  validationResult: StrategyValidationResult | null;
  
  // Available Strategies
  availableStrategies: TimeAttendanceStrategy[];
  
  // Error Handling
  error: string | null;
  lastError: Error | null;
}

export interface StrategyManagerActions {
  // Strategy Selection
  selectStrategy: (type: StrategyType) => Promise<boolean>;
  clearStrategy: () => void;
  
  // Strategy Operations
  prepareStrategy: (context: TimeAttendanceContext) => Promise<StrategyPrepareResult>;
  validateStrategy: (context: TimeAttendanceContext) => Promise<StrategyValidationResult>;
  augmentPayload: (basePayload: Partial<ClockInData>, context: TimeAttendanceContext) => Promise<ClockInData>;
  
  // Auto Selection
  autoSelectBestStrategy: (context: TimeAttendanceContext) => Promise<StrategyType | null>;
  
  // Lifecycle
  cleanup: () => Promise<void>;
  reset: () => void;
  
  // Utilities
  isStrategyAvailable: (type: StrategyType) => boolean;
  getRequiredPermissions: (type?: StrategyType) => string[];
}

export interface UseTimeAttendanceStrategiesOptions {
  autoInitialize?: boolean;
  context?: TimeAttendanceContext;
  onStrategyChange?: (strategy: TimeAttendanceStrategy | null) => void;
  onError?: (error: Error) => void;
}

export function useTimeAttendanceStrategies(
  options: UseTimeAttendanceStrategiesOptions = {}
): [StrategyManagerState, StrategyManagerActions] {
  
  const {
    autoInitialize = true,
    context,
    onStrategyChange,
    onError
  } = options;

  // State Management
  const [state, setState] = useState<StrategyManagerState>({
    selectedStrategy: null,
    selectedType: null,
    isInitialized: false,
    isPreparing: false,
    isValidating: false,
    prepareResult: null,
    validationResult: null,
    availableStrategies: [],
    error: null,
    lastError: null,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  // Update available strategies when component mounts
  useEffect(() => {
    const availableStrategies = getAvailableStrategies();
    setState(prev => ({
      ...prev,
      availableStrategies,
      isInitialized: true
    }));
  }, []);

  // Helper to update state safely
  const updateState = useCallback((updater: Partial<StrategyManagerState> | ((prev: StrategyManagerState) => Partial<StrategyManagerState>)) => {
    setState(prev => {
      const updates = typeof updater === 'function' ? updater(prev) : updater;
      return { ...prev, ...updates };
    });
  }, []);

  // Error handler
  const handleError = useCallback((error: Error, customMessage?: string) => {
    const errorMessage = customMessage || error.message;
    console.error('[StrategyManager]', errorMessage, error);
    
    updateState({
      error: errorMessage,
      lastError: error,
      isPreparing: false,
      isValidating: false
    });

    onError?.(error);
  }, [updateState, onError]);

  // Strategy Selection
  const selectStrategy = useCallback(async (type: StrategyType): Promise<boolean> => {
    try {
      const strategy = ALL_STRATEGIES[type];
      
      if (!strategy) {
        throw new Error(`Strategy type '${type}' not found`);
      }

      if (!strategy.isAvailable()) {
        throw new Error(`Strategy '${type}' is not available`);
      }

      // Clear previous state
      await stateRef.current.selectedStrategy?.cleanup?.();

      updateState({
        selectedStrategy: strategy,
        selectedType: type,
        prepareResult: null,
        validationResult: null,
        error: null,
        lastError: null
      });

      onStrategyChange?.(strategy);
      
      console.log(`[StrategyManager] Selected strategy: ${type}`);
      return true;
    } catch (error) {
      handleError(error as Error, `Failed to select strategy '${type}'`);
      return false;
    }
  }, [updateState, handleError, onStrategyChange]);

  // Clear Strategy
  const clearStrategy = useCallback(() => {
    const currentStrategy = stateRef.current.selectedStrategy;
    
    currentStrategy?.cleanup?.().catch(error => {
      console.warn('[StrategyManager] Cleanup failed:', error);
    });

    updateState({
      selectedStrategy: null,
      selectedType: null,
      prepareResult: null,
      validationResult: null,
      error: null,
      lastError: null,
      isPreparing: false,
      isValidating: false
    });

    onStrategyChange?.(null);
    console.log('[StrategyManager] Strategy cleared');
  }, [updateState, onStrategyChange]);

  // Prepare Strategy
  const prepareStrategy = useCallback(async (context: TimeAttendanceContext): Promise<StrategyPrepareResult> => {
    const { selectedStrategy } = stateRef.current;
    
    if (!selectedStrategy) {
      const errorResult = { success: false, error: 'No strategy selected' };
      updateState({ prepareResult: errorResult });
      return errorResult;
    }

    try {
      updateState({ isPreparing: true, error: null });
      
      const result = await selectedStrategy.prepare(context);
      
      updateState({
        isPreparing: false,
        prepareResult: result
      });

      console.log(`[StrategyManager] Strategy prepared:`, result);
      return result;
    } catch (error) {
      const errorResult = { 
        success: false, 
        error: `Preparation failed: ${(error as Error).message}` 
      };
      
      updateState({
        isPreparing: false,
        prepareResult: errorResult
      });

      handleError(error as Error, 'Strategy preparation failed');
      return errorResult;
    }
  }, [updateState, handleError]);

  // Validate Strategy
  const validateStrategy = useCallback(async (context: TimeAttendanceContext): Promise<StrategyValidationResult> => {
    const { selectedStrategy } = stateRef.current;
    
    if (!selectedStrategy) {
      const errorResult = { isValid: false, error: 'No strategy selected' };
      updateState({ validationResult: errorResult });
      return errorResult;
    }

    try {
      updateState({ isValidating: true, error: null });
      
      const result = await selectedStrategy.validate(context);
      
      updateState({
        isValidating: false,
        validationResult: result
      });

      console.log(`[StrategyManager] Strategy validated:`, result);
      return result;
    } catch (error) {
      const errorResult = { 
        isValid: false, 
        error: `Validation failed: ${(error as Error).message}` 
      };
      
      updateState({
        isValidating: false,
        validationResult: errorResult
      });

      handleError(error as Error, 'Strategy validation failed');
      return errorResult;
    }
  }, [updateState, handleError]);

  // Augment Payload
  const augmentPayload = useCallback(async (
    basePayload: Partial<ClockInData>,
    context: TimeAttendanceContext
  ): Promise<ClockInData> => {
    const { selectedStrategy } = stateRef.current;
    
    if (!selectedStrategy) {
      throw new Error('No strategy selected for payload augmentation');
    }

    try {
      const augmentedPayload = await selectedStrategy.augmentPayload(basePayload, context);
      console.log(`[StrategyManager] Payload augmented by ${selectedStrategy.type}:`, augmentedPayload);
      return augmentedPayload;
    } catch (error) {
      handleError(error as Error, 'Payload augmentation failed');
      throw error;
    }
  }, [handleError]);

  // Auto Select Best Strategy
  const autoSelectBestStrategy = useCallback(async (context: TimeAttendanceContext): Promise<StrategyType | null> => {
    try {
      console.log('[StrategyManager] Starting auto-selection...');
      
      const prioritizedStrategies = getStrategyPriorities();
      
      for (const { strategy } of prioritizedStrategies) {
        if (!strategy.isAvailable()) {
          console.log(`[StrategyManager] Skipping ${strategy.type} - not available`);
          continue;
        }

        try {
          console.log(`[StrategyManager] Testing ${strategy.type}...`);
          
          // Test preparation
          const prepareResult = await strategy.prepare(context);
          if (!prepareResult.success) {
            console.log(`[StrategyManager] ${strategy.type} preparation failed:`, prepareResult.error);
            continue;
          }

          // Test validation
          const validationResult = await strategy.validate(context);
          if (!validationResult.isValid) {
            console.log(`[StrategyManager] ${strategy.type} validation failed:`, validationResult.error);
            continue;
          }

          // Found working strategy
          console.log(`[StrategyManager] Auto-selected: ${strategy.type}`);
          await selectStrategy(strategy.type);
          return strategy.type;
        } catch (error) {
          console.log(`[StrategyManager] ${strategy.type} test failed:`, error);
          continue;
        }
      }

      console.log('[StrategyManager] No suitable strategy found');
      return null;
    } catch (error) {
      handleError(error as Error, 'Auto-selection failed');
      return null;
    }
  }, [selectStrategy, handleError]);

  // Cleanup
  const cleanup = useCallback(async () => {
    try {
      await stateRef.current.selectedStrategy?.cleanup?.();
      console.log('[StrategyManager] Cleanup completed');
    } catch (error) {
      console.warn('[StrategyManager] Cleanup failed:', error);
    }
  }, []);

  // Reset
  const reset = useCallback(() => {
    const { selectedStrategy } = stateRef.current;
    selectedStrategy?.reset?.();
    
    updateState({
      prepareResult: null,
      validationResult: null,
      error: null,
      lastError: null,
      isPreparing: false,
      isValidating: false
    });

    console.log('[StrategyManager] State reset');
  }, [updateState]);

  // Utility Functions
  const isStrategyAvailable = useCallback((type: StrategyType): boolean => {
    const strategy = ALL_STRATEGIES[type];
    return strategy?.isAvailable() ?? false;
  }, []);

  const getRequiredPermissions = useCallback((type?: StrategyType): string[] => {
    if (type) {
      const strategy = ALL_STRATEGIES[type];
      return strategy?.getRequiredPermissions() ?? [];
    }
    
    // Return all unique permissions from available strategies
    const allPermissions = stateRef.current.availableStrategies
      .flatMap(strategy => strategy.getRequiredPermissions());
    
    return [...new Set(allPermissions)];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Actions object
  const actions: StrategyManagerActions = {
    selectStrategy,
    clearStrategy,
    prepareStrategy,
    validateStrategy,
    augmentPayload,
    autoSelectBestStrategy,
    cleanup,
    reset,
    isStrategyAvailable,
    getRequiredPermissions,
  };

  return [state, actions];
}

// Convenience hook for specific strategy types
export function useStrategy(type: StrategyType, context?: TimeAttendanceContext) {
  const [state, actions] = useTimeAttendanceStrategies({
    autoInitialize: true,
    context
  });

  useEffect(() => {
    if (state.isInitialized && !state.selectedStrategy) {
      actions.selectStrategy(type);
    }
  }, [state.isInitialized, state.selectedStrategy, type, actions]);

  return [state, actions] as const;
}

export default useTimeAttendanceStrategies;