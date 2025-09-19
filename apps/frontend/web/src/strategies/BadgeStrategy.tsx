// Badge Strategy - Enterprise keyboard-wedge input simulation with badge ID validation
import React, { useState, useEffect, useRef } from 'react';
import { CreditCard, CheckCircle, AlertCircle, Loader2, Keyboard, Shield, Hash } from 'lucide-react';
import { BaseStrategy } from './BaseStrategy';
import { 
  StrategyValidationResult,
  StrategyPrepareResult,
  StrategyPanelProps,
  TimeAttendanceContext 
} from '@/types/timeAttendanceFSM';
import { ClockInData } from '@/services/timeTrackingService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface BadgeMetadata {
  badgeId: string;
  inputMethod: 'keyboard' | 'scanner' | 'manual';
  validationLevel: 'weak' | 'medium' | 'strong';
  inputHistory: string[];
  lastValidation: number;
}

export class BadgeStrategy extends BaseStrategy {
  readonly type = 'badge' as const;
  readonly name = 'Badge ID';
  readonly description = 'Keyboard-wedge input simulation with badge ID validation';
  readonly priority = 6;
  readonly availability = {
    supported: true, // Badge input always supported
    requiresPermission: false,
    requiresHardware: false,
    requiresNetwork: false,
  };

  private currentBadgeId = '';
  private inputHistory: string[] = [];
  private keyboardEventListener?: (event: KeyboardEvent) => void;
  private isListening = false;
  private bufferTimeout?: NodeJS.Timeout;
  private inputBuffer = '';
  private lastInputTime = 0;
  private maxInputDelay = 100; // Max delay between keystrokes for scanner detection
  private minBadgeLength = 4;
  private maxBadgeLength = 32;

  // Badge ID validation patterns
  private validationPatterns = {
    // Common badge formats
    numeric: /^\d{4,16}$/,                    // 4-16 digits
    alphanumeric: /^[A-Za-z0-9]{4,20}$/,     // 4-20 alphanumeric
    hex: /^[A-Fa-f0-9]{6,32}$/,             // 6-32 hex characters
    windtre: /^(WT|WTB|W3)[A-Za-z0-9]{4,12}$/, // WindTre specific format
    employee: /^(EMP|EID)[0-9]{4,8}$/,       // Employee ID format
    generic: /^[A-Za-z0-9\-_]{4,32}$/        // Generic with hyphens/underscores
  };

  // ==================== CORE STRATEGY METHODS ====================

  async prepare(context: TimeAttendanceContext): Promise<StrategyPrepareResult> {
    this.log('info', 'Preparing Badge strategy');

    try {
      // Initialize keyboard listener for scanner input
      this.setupKeyboardListener();
      
      // Load any stored badge history
      this.loadBadgeHistory();
      
      return this.createPrepareSuccess({
        keyboardListenerActive: this.isListening,
        supportedFormats: Object.keys(this.validationPatterns),
        inputHistoryCount: this.inputHistory.length,
        scannerDetectionEnabled: true
      });
    } catch (error) {
      this.log('error', 'Badge strategy preparation failed', error);
      return this.createPrepareError(`Badge preparation failed: ${error}`);
    }
  }

  async validate(context: TimeAttendanceContext): Promise<StrategyValidationResult> {
    this.log('info', 'Validating Badge strategy');

    if (!this.currentBadgeId) {
      return {
        isValid: true,
        warnings: ['No badge ID provided yet - input required'],
        metadata: {
          requiresBadgeInput: true,
          supportedFormats: Object.keys(this.validationPatterns)
        }
      };
    }

    // Validate badge ID format
    const validationResult = this.validateBadgeId(this.currentBadgeId);
    
    if (!validationResult.isValid) {
      return this.createError(`Invalid badge ID: ${validationResult.reason}`);
    }

    // Check for suspicious patterns (repeated characters, too simple, etc.)
    const securityCheck = this.performSecurityValidation(this.currentBadgeId);
    
    if (securityCheck.warnings.length > 0) {
      return {
        isValid: true,
        warnings: securityCheck.warnings,
        metadata: {
          badgeId: this.currentBadgeId,
          format: validationResult.format,
          validationLevel: securityCheck.level,
          securityFlags: securityCheck.flags
        }
      };
    }

    return this.createSuccess({
      badgeId: this.currentBadgeId,
      format: validationResult.format,
      validationLevel: securityCheck.level,
      inputMethod: this.detectInputMethod(),
      isValid: true
    });
  }

  async augmentPayload(
    basePayload: Partial<ClockInData>, 
    context: TimeAttendanceContext
  ): Promise<ClockInData> {
    this.log('info', 'Augmenting payload with Badge data');

    if (!this.currentBadgeId) {
      throw new Error('No badge ID provided');
    }

    const validation = this.validateBadgeId(this.currentBadgeId);
    const inputMethod = this.detectInputMethod();

    const augmentedPayload: ClockInData = {
      ...basePayload,
      storeId: basePayload.storeId!,
      trackingMethod: 'badge',
      deviceInfo: {
        ...basePayload.deviceInfo,
        deviceType: 'web',
        badgeId: this.currentBadgeId,
        badgeFormat: validation.format,
        inputMethod,
        validationLevel: this.performSecurityValidation(this.currentBadgeId).level,
        userAgent: navigator.userAgent,
      },
      notes: `Badge ID: ${this.currentBadgeId} (${validation.format})`
    };

    // Add to input history
    this.addToHistory(this.currentBadgeId);

    this.log('info', 'Badge payload augmented', { 
      badgeId: this.currentBadgeId,
      format: validation.format,
      inputMethod 
    });
    
    return augmentedPayload;
  }

  renderPanel(props: StrategyPanelProps): React.ReactElement {
    return <BadgePanel {...props} strategy={this} />;
  }

  // ==================== LIFECYCLE METHODS ====================

  async cleanup(): Promise<void> {
    this.removeKeyboardListener();
    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout);
      this.bufferTimeout = undefined;
    }
    this.log('info', 'Badge strategy cleaned up');
  }

  reset(): void {
    this.currentBadgeId = '';
    this.inputBuffer = '';
    this.lastInputTime = 0;
    this.log('info', 'Badge strategy reset');
  }

  // ==================== CAPABILITY CHECKS ====================

  isAvailable(): boolean {
    return this.availability.supported;
  }

  getRequiredPermissions(): string[] {
    return []; // Badge input doesn't require special permissions
  }

  // ==================== BADGE-SPECIFIC METHODS ====================

  private setupKeyboardListener(): void {
    if (this.isListening) return;

    this.keyboardEventListener = (event: KeyboardEvent) => {
      this.handleKeyboardInput(event);
    };

    document.addEventListener('keydown', this.keyboardEventListener);
    this.isListening = true;
    this.log('info', 'Keyboard listener for badge scanner activated');
  }

  private removeKeyboardListener(): void {
    if (this.keyboardEventListener) {
      document.removeEventListener('keydown', this.keyboardEventListener);
      this.keyboardEventListener = undefined;
      this.isListening = false;
      this.log('info', 'Keyboard listener removed');
    }
  }

  private handleKeyboardInput(event: KeyboardEvent): void {
    const now = Date.now();
    const timeSinceLastInput = now - this.lastInputTime;

    // Detect scanner vs manual input based on timing
    const isLikelyScannerInput = timeSinceLastInput < this.maxInputDelay && this.inputBuffer.length > 0;

    if (event.key === 'Enter') {
      // Process complete input
      if (this.inputBuffer.length >= this.minBadgeLength) {
        this.processBadgeInput(this.inputBuffer, isLikelyScannerInput ? 'scanner' : 'keyboard');
      }
      this.inputBuffer = '';
    } else if (event.key.length === 1) {
      // Accumulate characters
      this.inputBuffer += event.key;
      
      // Auto-submit after max length or timeout
      if (this.inputBuffer.length >= this.maxBadgeLength) {
        this.processBadgeInput(this.inputBuffer, isLikelyScannerInput ? 'scanner' : 'keyboard');
        this.inputBuffer = '';
      } else {
        // Set timeout to auto-process buffer
        if (this.bufferTimeout) {
          clearTimeout(this.bufferTimeout);
        }
        this.bufferTimeout = setTimeout(() => {
          if (this.inputBuffer.length >= this.minBadgeLength) {
            this.processBadgeInput(this.inputBuffer, 'keyboard');
          }
          this.inputBuffer = '';
        }, 2000);
      }
    } else if (event.key === 'Backspace') {
      this.inputBuffer = this.inputBuffer.slice(0, -1);
    }

    this.lastInputTime = now;
  }

  private processBadgeInput(badgeId: string, inputMethod: 'keyboard' | 'scanner'): void {
    const cleanBadgeId = badgeId.trim().toUpperCase();
    
    if (cleanBadgeId.length < this.minBadgeLength) {
      this.log('warn', 'Badge ID too short', { badgeId: cleanBadgeId, length: cleanBadgeId.length });
      return;
    }

    this.currentBadgeId = cleanBadgeId;
    this.log('info', 'Badge ID processed', { badgeId: cleanBadgeId, inputMethod });
  }

  private validateBadgeId(badgeId: string): { isValid: boolean; format?: string; reason?: string } {
    if (!badgeId || badgeId.length < this.minBadgeLength) {
      return { isValid: false, reason: 'Badge ID too short' };
    }

    if (badgeId.length > this.maxBadgeLength) {
      return { isValid: false, reason: 'Badge ID too long' };
    }

    // Test against validation patterns
    for (const [format, pattern] of Object.entries(this.validationPatterns)) {
      if (pattern.test(badgeId)) {
        return { isValid: true, format };
      }
    }

    return { isValid: false, reason: 'Badge ID format not recognized' };
  }

  private performSecurityValidation(badgeId: string): { 
    level: 'weak' | 'medium' | 'strong'; 
    warnings: string[];
    flags: string[];
  } {
    const warnings: string[] = [];
    const flags: string[] = [];
    let score = 0;

    // Check for repeated characters
    const repeated = /(.)\1{3,}/.test(badgeId);
    if (repeated) {
      warnings.push('Badge contains repeated characters');
      flags.push('repeated_chars');
    } else {
      score += 1;
    }

    // Check for sequential patterns
    const sequential = this.hasSequentialPattern(badgeId);
    if (sequential) {
      warnings.push('Badge contains sequential pattern');
      flags.push('sequential');
    } else {
      score += 1;
    }

    // Check for common weak patterns
    const commonWeak = ['1234', '0000', 'ABCD', 'TEST', 'DEMO'];
    const isWeak = commonWeak.some(pattern => badgeId.includes(pattern));
    if (isWeak) {
      warnings.push('Badge contains common weak pattern');
      flags.push('weak_pattern');
    } else {
      score += 1;
    }

    // Check length and complexity
    if (badgeId.length >= 8) score += 1;
    if (/[A-Za-z]/.test(badgeId) && /\d/.test(badgeId)) score += 1; // Mixed alpha-numeric

    let level: 'weak' | 'medium' | 'strong';
    if (score >= 4) level = 'strong';
    else if (score >= 2) level = 'medium';
    else level = 'weak';

    return { level, warnings, flags };
  }

  private hasSequentialPattern(input: string): boolean {
    // Check for ascending sequences (123, ABC)
    for (let i = 0; i < input.length - 2; i++) {
      const char1 = input.charCodeAt(i);
      const char2 = input.charCodeAt(i + 1);
      const char3 = input.charCodeAt(i + 2);
      
      if (char2 === char1 + 1 && char3 === char2 + 1) {
        return true;
      }
    }
    return false;
  }

  private detectInputMethod(): 'keyboard' | 'scanner' | 'manual' {
    // This is a simplified detection - in reality, scanner detection
    // would be based on input timing and patterns
    if (this.inputBuffer.length === 0) {
      return 'manual'; // Direct setting via UI
    }
    
    const timingBased = this.lastInputTime > 0 && 
                       (Date.now() - this.lastInputTime) < this.maxInputDelay;
    
    return timingBased ? 'scanner' : 'keyboard';
  }

  private addToHistory(badgeId: string): void {
    if (!this.inputHistory.includes(badgeId)) {
      this.inputHistory.unshift(badgeId);
      // Keep only last 10 entries
      if (this.inputHistory.length > 10) {
        this.inputHistory = this.inputHistory.slice(0, 10);
      }
      this.saveBadgeHistory();
    }
  }

  private loadBadgeHistory(): void {
    try {
      const stored = localStorage.getItem('w3_badge_history');
      if (stored) {
        this.inputHistory = JSON.parse(stored);
      }
    } catch (error) {
      this.log('warn', 'Failed to load badge history', error);
      this.inputHistory = [];
    }
  }

  private saveBadgeHistory(): void {
    try {
      localStorage.setItem('w3_badge_history', JSON.stringify(this.inputHistory));
    } catch (error) {
      this.log('warn', 'Failed to save badge history', error);
    }
  }

  // ==================== PUBLIC GETTERS ====================

  setBadgeId(badgeId: string): void {
    this.currentBadgeId = badgeId.trim().toUpperCase();
    this.log('info', 'Badge ID set manually', { badgeId: this.currentBadgeId });
  }

  getCurrentBadgeId(): string {
    return this.currentBadgeId;
  }

  getInputHistory(): string[] {
    return [...this.inputHistory];
  }

  isKeyboardListening(): boolean {
    return this.isListening;
  }

  getValidationPatterns(): Record<string, RegExp> {
    return { ...this.validationPatterns };
  }
}

// ==================== BADGE PANEL COMPONENT ====================

interface BadgePanelProps extends StrategyPanelProps {
  strategy: BadgeStrategy;
}

function BadgePanel({ isActive, isLoading, context, onAction, compact, strategy }: BadgePanelProps) {
  const [badgeId, setBadgeId] = useState<string>(strategy.getCurrentBadgeId());
  const [manualInput, setManualInput] = useState<string>('');
  const [validation, setValidation] = useState<any>(null);
  const [inputHistory, setInputHistory] = useState<string[]>(strategy.getInputHistory());
  const [isListening, setIsListening] = useState<boolean>(strategy.isKeyboardListening());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isActive) {
      // Update state from strategy
      const currentBadge = strategy.getCurrentBadgeId();
      const history = strategy.getInputHistory();
      const listening = strategy.isKeyboardListening();

      setBadgeId(currentBadge);
      setInputHistory(history);
      setIsListening(listening);

      // Validate current badge if exists
      if (currentBadge) {
        setValidation(strategy.validateBadgeId ? strategy.validateBadgeId(currentBadge) : null);
      }

      // Listen for badge updates from keyboard scanner
      const checkForUpdates = setInterval(() => {
        const newBadge = strategy.getCurrentBadgeId();
        if (newBadge !== badgeId) {
          setBadgeId(newBadge);
          setInputHistory(strategy.getInputHistory());
          onAction?.('badge_detected', { badgeId: newBadge });
        }
      }, 500);

      return () => clearInterval(checkForUpdates);
    }
  }, [isActive, badgeId]);

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      strategy.setBadgeId(manualInput.trim());
      setBadgeId(manualInput.trim());
      setManualInput('');
      onAction?.('badge_manual_input', { badgeId: manualInput.trim() });
    }
  };

  const handleHistorySelect = (historicalBadgeId: string) => {
    strategy.setBadgeId(historicalBadgeId);
    setBadgeId(historicalBadgeId);
    onAction?.('badge_history_selected', { badgeId: historicalBadgeId });
  };

  const getValidationBadgeVariant = (validation: any) => {
    if (!validation) return 'secondary';
    return validation.isValid ? 'default' : 'destructive';
  };

  if (compact) {
    return (
      <div className="space-y-2" data-testid="badge-panel-compact">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-medium">Badge</span>
          {isListening && (
            <Badge variant="outline" className="text-xs">
              <Keyboard className="h-2 w-2 mr-1" />
              Live
            </Badge>
          )}
        </div>
        
        {badgeId ? (
          <div className="space-y-1">
            <div className="font-mono text-xs bg-gray-100 p-1 rounded">
              {badgeId.length > 12 ? `${badgeId.substring(0, 12)}...` : badgeId}
            </div>
            {validation && (
              <Badge variant={getValidationBadgeVariant(validation)} className="text-xs">
                {validation.isValid ? validation.format : 'Invalid'}
              </Badge>
            )}
          </div>
        ) : (
          <div className="flex gap-1">
            <Input
              placeholder="Badge ID"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              className="text-xs h-7"
              data-testid="input-badge-manual"
            />
            <Button
              size="sm"
              onClick={handleManualSubmit}
              disabled={!manualInput.trim()}
              className="h-7 px-2"
              data-testid="button-badge-submit"
            >
              ✓
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="h-full" data-testid="badge-panel-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-purple-500" />
            Badge ID
            {isListening && (
              <Badge variant="outline">
                <Keyboard className="h-3 w-3 mr-1" />
                Scanner Ready
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-4">
        {/* Scanner Status */}
        <div className="space-y-2">
          <Alert>
            <Keyboard className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {isListening 
                ? "Scanner pronto - scansiona un badge o inserisci manualmente" 
                : "Scanner non attivo - solo input manuale disponibile"
              }
            </AlertDescription>
          </Alert>
        </div>

        {/* Manual Input */}
        <div className="space-y-2">
          <label className="text-xs text-gray-600">Input manuale:</label>
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder="Inserisci Badge ID (es: WT001234)"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
              className="text-sm"
              data-testid="input-badge-manual-full"
            />
            <Button
              onClick={handleManualSubmit}
              disabled={!manualInput.trim()}
              data-testid="button-badge-submit-full"
            >
              Conferma
            </Button>
          </div>
        </div>

        {/* Current Badge */}
        {badgeId && (
          <div className="space-y-2">
            <div className="text-xs text-gray-600">Badge corrente:</div>
            <div className="font-mono text-sm bg-gray-50 p-2 rounded border">
              {badgeId}
            </div>
            
            {validation && (
              <div className="flex items-center gap-2">
                {validation.isValid ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-green-600">
                      Formato valido: {validation.format}
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-xs text-red-600">
                      {validation.reason}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Input History */}
        {inputHistory.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-gray-600">Badge recenti:</div>
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {inputHistory.slice(0, 5).map((historicalBadgeId, index) => (
                <button
                  key={index}
                  onClick={() => handleHistorySelect(historicalBadgeId)}
                  className="w-full text-left text-xs font-mono bg-gray-50 hover:bg-gray-100 p-1 rounded border"
                  data-testid={`button-badge-history-${index}`}
                >
                  {historicalBadgeId}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Security Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-blue-500" />
            <span>Formati supportati</span>
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <div>• Numerico (4-16 cifre)</div>
            <div>• Alfanumerico (4-20 caratteri)</div>
            <div>• Formato WindTre (WT/WTB/W3...)</div>
            <div>• Formato Dipendente (EMP/EID...)</div>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-xs text-gray-500">
          {isListening 
            ? "Scansiona un badge con uno scanner barcode/NFC o inserisci manualmente l'ID"
            : "Inserisci manualmente l'ID del badge nel campo sopra"
          }
        </div>
      </CardContent>
    </Card>
  );
}

// Export singleton instance
export const badgeStrategy = new BadgeStrategy();