// Strategy Pattern - Centralized exports for all time attendance strategies
export { BaseStrategy } from './BaseStrategy';

// Types from TimeAttendanceFSM
export type {
  TimeAttendanceStrategy,
  StrategyType,
  StrategyValidationResult,
  StrategyPrepareResult,
  StrategyPanelProps
} from '@/types/timeAttendanceFSM';

// Individual Strategy Implementations
export { GPSStrategy, gpsStrategy } from './GPSStrategy';
export { NFCStrategy, nfcStrategy } from './NFCStrategy';
export { QRStrategy, qrStrategy } from './QRStrategy';
export { SmartStrategy, smartStrategy } from './SmartStrategy';
export { WebStrategy, webStrategy } from './WebStrategy';
export { BadgeStrategy, badgeStrategy } from './BadgeStrategy';

// Import strategy instances to use in functions
import { gpsStrategy } from './GPSStrategy';
import { nfcStrategy } from './NFCStrategy';
import { qrStrategy } from './QRStrategy';
import { smartStrategy } from './SmartStrategy';
import { webStrategy } from './WebStrategy';
import { badgeStrategy } from './BadgeStrategy';
import type { TimeAttendanceStrategy, StrategyType } from '@/types/timeAttendanceFSM';

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