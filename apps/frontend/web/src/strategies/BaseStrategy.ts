// Base Strategy Implementation - Abstract base class for all tracking strategies
import { 
  TimeAttendanceStrategy, 
  StrategyType, 
  StrategyValidationResult,
  StrategyPrepareResult,
  StrategyPanelProps,
  TimeAttendanceContext 
} from '@/types/timeAttendanceFSM';
import { ClockInData } from '@/services/timeTrackingService';

export abstract class BaseStrategy implements TimeAttendanceStrategy {
  abstract readonly type: StrategyType;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly priority: number;
  abstract readonly availability: {
    supported: boolean;
    requiresPermission: boolean;
    requiresHardware: boolean;
    requiresNetwork: boolean;
  };

  // Abstract methods that must be implemented by concrete strategies
  abstract prepare(context: TimeAttendanceContext): Promise<StrategyPrepareResult>;
  abstract validate(context: TimeAttendanceContext): Promise<StrategyValidationResult>;
  abstract augmentPayload(basePayload: Partial<ClockInData>, context: TimeAttendanceContext): Promise<ClockInData>;
  abstract renderPanel(props: StrategyPanelProps): React.ReactElement;

  // Default implementations for optional methods
  async cleanup(): Promise<void> {
    // Default: no cleanup needed
  }

  reset(): void {
    // Default: no reset needed
  }

  abstract isAvailable(): boolean;
  abstract getRequiredPermissions(): string[];

  // Utility methods available to all strategies
  protected createError(message: string, code?: string): StrategyValidationResult {
    return {
      isValid: false,
      error: message,
      metadata: { code }
    };
  }

  protected createSuccess(metadata?: Record<string, unknown>): StrategyValidationResult {
    return {
      isValid: true,
      metadata
    };
  }

  protected createPrepareError(message: string, metadata?: Record<string, unknown>): StrategyPrepareResult {
    return {
      success: false,
      error: message,
      metadata
    };
  }

  protected createPrepareSuccess(metadata?: Record<string, unknown>): StrategyPrepareResult {
    return {
      success: true,
      metadata
    };
  }

  protected log(level: 'info' | 'warn' | 'error', message: string, data?: unknown): void {
    const logMessage = `[${this.type.toUpperCase()}_STRATEGY] ${message}`;
    console[level](logMessage, data);
  }
}