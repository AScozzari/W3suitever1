// Strategy Pattern - Centralized exports for all time attendance strategies
export { BaseStrategy } from './BaseStrategy';

// Individual Strategy Implementations
export { GPSStrategy, gpsStrategy } from './GPSStrategy';
export { NFCStrategy, nfcStrategy } from './NFCStrategy';
export { QRStrategy, qrStrategy } from './QRStrategy';
export { SmartStrategy, smartStrategy } from './SmartStrategy';
export { WebStrategy, webStrategy } from './WebStrategy';
export { BadgeStrategy, badgeStrategy } from './BadgeStrategy';

// Types from TimeAttendanceFSM
export type {
  TimeAttendanceStrategy,
  StrategyType,
  StrategyValidationResult,
  StrategyPrepareResult,
  StrategyPanelProps
} from '@/types/timeAttendanceFSM';

// Strategy Registry - All available strategies (lazy loaded to avoid circular imports)
export const ALL_STRATEGIES = {
  get gps() { return gpsStrategy; },
  get nfc() { return nfcStrategy; },
  get qr() { return qrStrategy; },
  get smart() { return smartStrategy; },
  get web() { return webStrategy; },
  get badge() { return badgeStrategy; },
} as const;

// Lazy loaded strategy list to prevent circular imports
export function getStrategyList() {
  return [
    gpsStrategy,
    nfcStrategy,
    qrStrategy,
    smartStrategy,
    webStrategy,
    badgeStrategy,
  ] as const;
}

// Helper functions
export function getStrategyByType(type: StrategyType): TimeAttendanceStrategy | undefined {
  return ALL_STRATEGIES[type];
}

export function getAvailableStrategies(): TimeAttendanceStrategy[] {
  return getStrategyList().filter(strategy => strategy.isAvailable());
}

export function getStrategyPriorities(): { strategy: TimeAttendanceStrategy; priority: number }[] {
  return getStrategyList()
    .map(strategy => ({ strategy, priority: strategy.priority }))
    .sort((a, b) => a.priority - b.priority);
}