// Smart Strategy - Enterprise auto-detection time tracking (NFC > GPS geofence > Web)
import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle, AlertCircle, Loader2, Brain, Zap, Target } from 'lucide-react';
import { BaseStrategy } from './BaseStrategy';
import { 
  StrategyValidationResult,
  StrategyPrepareResult,
  StrategyPanelProps,
  TimeAttendanceContext 
} from '@/types/timeAttendanceFSM';
import { ClockInData } from '@/services/timeTrackingService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// Import strategy instances directly to fix circular dependency
import { gpsStrategy } from './GPSStrategy';
import { nfcStrategy } from './NFCStrategy';
import { webStrategy } from './WebStrategy';

interface SmartDetectionResult {
  selectedStrategy: 'nfc' | 'gps' | 'web' | null;
  confidence: number;
  availableStrategies: string[];
  detectionReasons: string[];
  fallbackOrder: string[];
}

export class SmartStrategy extends BaseStrategy {
  readonly type = 'smart' as const;
  readonly name = 'Smart Auto-Detect';
  readonly description = 'Auto-select best available method (NFC > GPS geofence > Web)';
  readonly priority = 5;
  readonly availability = {
    supported: true, // Smart strategy always supported as it delegates
    requiresPermission: false, // Permissions handled by delegated strategies
    requiresHardware: false,
    requiresNetwork: false,
  };

  private detectionResult?: SmartDetectionResult;
  private delegatedStrategy?: BaseStrategy;
  private isDetecting = false;
  private detectionTimeout = 15000; // 15 seconds

  // Strategy priority order: NFC > GPS > Web (as specified)
  private strategyPriority = [
    { name: 'nfc' as const },
    { name: 'gps' as const },
    { name: 'web' as const }
  ];

  // ==================== CORE STRATEGY METHODS ====================

  async prepare(context: TimeAttendanceContext): Promise<StrategyPrepareResult> {
    this.log('info', 'Preparing Smart strategy - starting auto-detection');

    if (!context.selectedStore) {
      return this.createPrepareError('Store must be selected before smart detection');
    }

    try {
      this.isDetecting = true;
      
      // Perform auto-detection
      this.detectionResult = await this.performSmartDetection(context);
      
      if (!this.detectionResult.selectedStrategy) {
        return this.createPrepareError('No suitable strategy detected automatically');
      }

      // Prepare the selected strategy
      this.delegatedStrategy = this.getStrategyByName(this.detectionResult.selectedStrategy);
      
      if (this.delegatedStrategy) {
        const prepareResult = await this.delegatedStrategy.prepare(context);
        
        return this.createPrepareSuccess({
          autoDetected: true,
          selectedStrategy: this.detectionResult.selectedStrategy,
          confidence: this.detectionResult.confidence,
          availableStrategies: this.detectionResult.availableStrategies,
          detectionReasons: this.detectionResult.detectionReasons,
          delegatedPrepareResult: prepareResult
        });
      }

      return this.createPrepareError('Failed to initialize detected strategy');
    } catch (error) {
      this.log('error', 'Smart strategy preparation failed', error);
      return this.createPrepareError(`Smart detection failed: ${error}`);
    } finally {
      this.isDetecting = false;
    }
  }

  async validate(context: TimeAttendanceContext): Promise<StrategyValidationResult> {
    this.log('info', 'Validating Smart strategy');

    if (!this.detectionResult || !this.delegatedStrategy) {
      return this.createError('No strategy selected through smart detection');
    }

    // Delegate validation to the selected strategy
    try {
      const validationResult = await this.delegatedStrategy.validate(context);
      
      // Enhance result with smart detection metadata
      return {
        ...validationResult,
        metadata: {
          ...validationResult.metadata,
          smartDetection: true,
          selectedStrategy: this.detectionResult.selectedStrategy,
          confidence: this.detectionResult.confidence,
          detectionReasons: this.detectionResult.detectionReasons,
          delegatedValidation: validationResult
        }
      };
    } catch (error) {
      this.log('error', 'Delegated validation failed', error);
      
      // Try fallback strategy
      const fallbackResult = await this.tryFallbackStrategy(context);
      if (fallbackResult) {
        return fallbackResult;
      }
      
      return this.createError(`Smart validation failed: ${error}`);
    }
  }

  async augmentPayload(
    basePayload: Partial<ClockInData>, 
    context: TimeAttendanceContext
  ): Promise<ClockInData> {
    this.log('info', 'Augmenting payload with Smart strategy data');

    if (!this.delegatedStrategy || !this.detectionResult) {
      throw new Error('No strategy selected for smart delegation');
    }

    // Delegate to the selected strategy
    const augmentedPayload = await this.delegatedStrategy.augmentPayload(basePayload, context);

    // Add smart detection metadata
    return {
      ...augmentedPayload,
      trackingMethod: 'smart', // Override to indicate smart detection
      deviceInfo: {
        ...augmentedPayload.deviceInfo,
        smartDetection: true,
        selectedStrategy: this.detectionResult.selectedStrategy,
        confidence: this.detectionResult.confidence,
        detectionReasons: this.detectionResult.detectionReasons,
        availableStrategies: this.detectionResult.availableStrategies,
        delegatedMethod: this.delegatedStrategy.type
      },
      notes: `Smart Auto-Detect: ${this.detectionResult.selectedStrategy.toUpperCase()} (${this.detectionResult.confidence}% confidence)`
    };
  }

  renderPanel(props: StrategyPanelProps): React.ReactElement {
    return <SmartPanel {...props} strategy={this} />;
  }

  // ==================== LIFECYCLE METHODS ====================

  async cleanup(): Promise<void> {
    if (this.delegatedStrategy) {
      await this.delegatedStrategy.cleanup?.();
    }
    this.detectionResult = undefined;
    this.delegatedStrategy = undefined;
    this.isDetecting = false;
    this.log('info', 'Smart strategy cleaned up');
  }

  reset(): void {
    this.detectionResult = undefined;
    this.delegatedStrategy = undefined;
    this.isDetecting = false;
    if (this.delegatedStrategy) {
      this.delegatedStrategy.reset?.();
    }
    this.log('info', 'Smart strategy reset');
  }

  // ==================== CAPABILITY CHECKS ====================

  isAvailable(): boolean {
    // Smart strategy is available if at least one sub-strategy is available
    return this.strategyPriority.some(({ name }) => {
      const strategy = this.getStrategyByName(name);
      return strategy?.isAvailable() ?? false;
    });
  }

  getRequiredPermissions(): string[] {
    // Aggregate permissions from all available strategies
    const allPermissions = this.strategyPriority
      .map(({ name }) => this.getStrategyByName(name))
      .filter((strategy) => strategy?.isAvailable())
      .flatMap((strategy) => strategy!.getRequiredPermissions());
    
    return [...new Set(allPermissions)]; // Remove duplicates
  }

  // ==================== SMART DETECTION LOGIC ====================

  private async performSmartDetection(context: TimeAttendanceContext): Promise<SmartDetectionResult> {
    this.log('info', 'Starting smart detection process');

    const availableStrategies: string[] = [];
    const detectionReasons: string[] = [];
    let selectedStrategy: 'nfc' | 'gps' | 'web' | null = null;
    let confidence = 0;

    // Test strategies in priority order
    for (const { name } of this.strategyPriority) {
      try {
        this.log('info', `Testing strategy: ${name}`);
        
        const strategy = this.getStrategyByName(name);
        if (!strategy) {
          detectionReasons.push(`${name.toUpperCase()}: Strategy not found`);
          continue;
        }
        
        if (!strategy.isAvailable()) {
          detectionReasons.push(`${name.toUpperCase()}: Not available`);
          continue;
        }

        availableStrategies.push(name);

        // Test strategy preparation
        const prepareResult = await this.testStrategyPreparation(strategy, context);
        
        if (prepareResult.success) {
          // Test validation
          const validationResult = await this.testStrategyValidation(strategy, context);
          
          if (validationResult.isValid) {
            selectedStrategy = name;
            confidence = this.calculateConfidence(name, prepareResult, validationResult);
            detectionReasons.push(`${name.toUpperCase()}: Ready (${confidence}% confidence)`);
            break; // Use first successful strategy (highest priority)
          } else {
            detectionReasons.push(`${name.toUpperCase()}: Validation failed - ${validationResult.error}`);
          }
        } else {
          detectionReasons.push(`${name.toUpperCase()}: Preparation failed - ${prepareResult.error}`);
        }
      } catch (error) {
        detectionReasons.push(`${name.toUpperCase()}: Error - ${error}`);
        this.log('warn', `Strategy ${name} detection failed`, error);
      }
    }

    const result: SmartDetectionResult = {
      selectedStrategy,
      confidence,
      availableStrategies,
      detectionReasons,
      fallbackOrder: availableStrategies
    };

    this.log('info', 'Smart detection completed', result);
    return result;
  }

  private async testStrategyPreparation(strategy: BaseStrategy, context: TimeAttendanceContext): Promise<StrategyPrepareResult> {
    try {
      return await Promise.race([
        strategy.prepare(context),
        new Promise<StrategyPrepareResult>((_, reject) => 
          setTimeout(() => reject(new Error('Preparation timeout')), 5000)
        )
      ]);
    } catch (error) {
      return {
        success: false,
        error: `Preparation test failed: ${error}`
      };
    }
  }

  private async testStrategyValidation(strategy: BaseStrategy, context: TimeAttendanceContext): Promise<StrategyValidationResult> {
    try {
      return await Promise.race([
        strategy.validate(context),
        new Promise<StrategyValidationResult>((_, reject) => 
          setTimeout(() => reject(new Error('Validation timeout')), 3000)
        )
      ]);
    } catch (error) {
      return {
        isValid: false,
        error: `Validation test failed: ${error}`
      };
    }
  }

  private calculateConfidence(
    strategyName: string, 
    prepareResult: StrategyPrepareResult, 
    validationResult: StrategyValidationResult
  ): number {
    let confidence = 50; // Base confidence

    // Strategy-specific confidence boosts
    switch (strategyName) {
      case 'nfc':
        confidence += 30; // NFC gets highest priority boost
        break;
      case 'gps':
        confidence += 20; // GPS gets medium priority boost
        break;
      case 'web':
        confidence += 10; // Web gets lowest priority boost
        break;
    }

    // Boost based on validation quality
    if (validationResult.warnings?.length === 0) {
      confidence += 15; // No warnings
    } else if (validationResult.warnings && validationResult.warnings.length > 0) {
      confidence -= validationResult.warnings.length * 5; // Reduce for warnings
    }

    // Boost based on preparation success metadata
    if (prepareResult.metadata) {
      confidence += 5; // Has additional metadata
    }

    return Math.max(0, Math.min(100, confidence));
  }

  private async tryFallbackStrategy(context: TimeAttendanceContext): Promise<StrategyValidationResult | null> {
    if (!this.detectionResult) return null;

    for (const strategyName of this.detectionResult.fallbackOrder) {
      if (strategyName === this.detectionResult.selectedStrategy) continue;

      try {
        const strategy = this.getStrategyByName(strategyName as 'nfc' | 'gps' | 'web');
        if (strategy) {
          this.log('info', `Trying fallback strategy: ${strategyName}`);
          
          await strategy.prepare(context);
          const validationResult = await strategy.validate(context);
          
          if (validationResult.isValid) {
            this.delegatedStrategy = strategy;
            this.detectionResult.selectedStrategy = strategyName as 'nfc' | 'gps' | 'web';
            this.detectionResult.confidence = 25; // Lower confidence for fallback
            
            return {
              ...validationResult,
              metadata: {
                ...validationResult.metadata,
                fallbackUsed: true,
                originalStrategy: this.detectionResult.selectedStrategy
              }
            };
          }
        }
      } catch (error) {
        this.log('warn', `Fallback strategy ${strategyName} failed`, error);
      }
    }

    return null;
  }

  private getStrategyByName(name: 'nfc' | 'gps' | 'web'): BaseStrategy | undefined {
    // Use direct strategy instance references to avoid circular dependency issues
    try {
      switch (name) {
        case 'gps':
          return gpsStrategy;
        case 'nfc':
          return nfcStrategy;
        case 'web':
          return webStrategy;
        default:
          return undefined;
      }
    } catch (error) {
      this.log('error', `Failed to access strategy: ${name}`, error);
      return undefined;
    }
  }

  // ==================== PUBLIC GETTERS ====================

  getDetectionResult(): SmartDetectionResult | undefined {
    return this.detectionResult;
  }

  getDelegatedStrategy(): BaseStrategy | undefined {
    return this.delegatedStrategy;
  }

  isCurrentlyDetecting(): boolean {
    return this.isDetecting;
  }

  async redetect(context: TimeAttendanceContext): Promise<SmartDetectionResult> {
    this.log('info', 'Re-running smart detection');
    this.detectionResult = await this.performSmartDetection(context);
    
    if (this.detectionResult.selectedStrategy) {
      this.delegatedStrategy = this.getStrategyByName(this.detectionResult.selectedStrategy);
    }
    
    return this.detectionResult;
  }
}

// ==================== SMART PANEL COMPONENT ====================

interface SmartPanelProps extends StrategyPanelProps {
  strategy: SmartStrategy;
}

function SmartPanel({ isActive, isLoading, context, onAction, compact, strategy }: SmartPanelProps) {
  const [detectionResult, setDetectionResult] = useState<SmartDetectionResult | undefined>(strategy.getDetectionResult());
  const [isDetecting, setIsDetecting] = useState<boolean>(strategy.isCurrentlyDetecting());
  const [detectionProgress, setDetectionProgress] = useState<number>(0);

  useEffect(() => {
    if (isActive) {
      // Update detection state
      const result = strategy.getDetectionResult();
      const detecting = strategy.isCurrentlyDetecting();
      
      setDetectionResult(result);
      setIsDetecting(detecting);

      // Simulate detection progress
      if (detecting) {
        let progress = 0;
        const progressInterval = setInterval(() => {
          progress += 10;
          setDetectionProgress(progress);
          
          if (progress >= 100 || !strategy.isCurrentlyDetecting()) {
            clearInterval(progressInterval);
            setIsDetecting(false);
            setDetectionResult(strategy.getDetectionResult());
          }
        }, 500);

        return () => clearInterval(progressInterval);
      }
    }
  }, [isActive, isDetecting]);

  const handleRedetect = async () => {
    if (context.selectedStore) {
      setIsDetecting(true);
      setDetectionProgress(0);
      
      try {
        const result = await strategy.redetect(context);
        setDetectionResult(result);
        onAction?.('smart_redetection_complete', result);
      } catch (error) {
        console.error('Smart redetection failed:', error);
      } finally {
        setIsDetecting(false);
      }
    }
  };

  if (compact) {
    return (
      <div className="space-y-2" data-testid="smart-panel-compact">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-pink-500" />
          <span className="text-sm font-medium">Smart</span>
          {detectionResult?.selectedStrategy && (
            <Badge variant="default" className="text-xs">
              {detectionResult.selectedStrategy.toUpperCase()}
            </Badge>
          )}
        </div>
        
        {isDetecting ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-pink-600">
              <Loader2 className="h-3 w-3 animate-spin" />
              Rilevamento...
            </div>
            <Progress value={detectionProgress} className="h-1" />
          </div>
        ) : detectionResult?.selectedStrategy ? (
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>{detectionResult.selectedStrategy.toUpperCase()} selezionato</span>
            </div>
            <div className="text-gray-500">
              Confidenza: {detectionResult.confidence}%
            </div>
          </div>
        ) : (
          <div className="text-xs text-orange-600">
            Nessun metodo rilevato automaticamente
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="h-full" data-testid="smart-panel-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-pink-500" />
            Smart Auto-Detect
            {detectionResult && (
              <Badge variant="secondary">
                {detectionResult.availableStrategies.length} disponibili
              </Badge>
            )}
          </div>
          <button
            onClick={handleRedetect}
            disabled={isDetecting || isLoading || !context.selectedStore}
            className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
            data-testid="button-smart-redetect"
          >
            Rileva di nuovo
          </button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-4">
        {/* Detection Status */}
        {isDetecting ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Brain className="h-4 w-4 text-pink-500 animate-pulse" />
              <span>Rilevamento intelligente in corso...</span>
            </div>
            <Progress value={detectionProgress} className="h-2" />
            <div className="text-xs text-gray-500">
              Analizzando NFC, GPS e Web capabilities...
            </div>
          </div>
        ) : detectionResult ? (
          <div className="space-y-3">
            {/* Selected Strategy */}
            {detectionResult.selectedStrategy ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Target className="h-4 w-4 text-green-500" />
                  <span>Strategia selezionata:</span>
                </div>
                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <strong>{detectionResult.selectedStrategy.toUpperCase()}</strong> - 
                    Confidenza: {detectionResult.confidence}%
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Nessuna strategia adatta rilevata automaticamente
                </AlertDescription>
              </Alert>
            )}

            {/* Available Strategies */}
            <div className="space-y-2">
              <div className="text-xs text-gray-600">Strategie disponibili:</div>
              <div className="flex flex-wrap gap-1">
                {detectionResult.availableStrategies.map((strategy) => (
                  <Badge 
                    key={strategy} 
                    variant={strategy === detectionResult.selectedStrategy ? "default" : "outline"}
                    className="text-xs"
                  >
                    {strategy.toUpperCase()}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Detection Reasons */}
            <div className="space-y-2">
              <div className="text-xs text-gray-600">Risultati rilevamento:</div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {detectionResult.detectionReasons.map((reason, index) => (
                  <div key={index} className="text-xs text-gray-700 p-1 bg-gray-50 rounded">
                    {reason}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-sm text-gray-500">
            Rilevamento non ancora eseguito
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-gray-500">
          Lo Smart Auto-Detect analizza automaticamente NFC, GPS e Web capabilities per scegliere il metodo migliore
        </div>
      </CardContent>
    </Card>
  );
}

// Export singleton instance
export const smartStrategy = new SmartStrategy();