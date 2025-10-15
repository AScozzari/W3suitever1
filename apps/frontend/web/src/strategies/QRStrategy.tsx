// QR Strategy - Enterprise QR-based time tracking with token validation and countdown
import React, { useState, useEffect, useRef } from 'react';
import { QrCode, CheckCircle, AlertCircle, Loader2, RefreshCw, Timer, Camera } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
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
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface QRMetadata {
  currentCode: string;
  expiresAt: number;
  timeRemaining: number;
  generationCount: number;
  isValid: boolean;
}

export class QRStrategy extends BaseStrategy {
  readonly type = 'qr' as const;
  readonly name = 'QR Code';
  readonly description = 'QR scanner/generator with token validation and countdown';
  readonly priority = 2;
  readonly availability = {
    supported: true, // QR codes work universally
    requiresPermission: false,
    requiresHardware: false,
    requiresNetwork: true, // For token validation
  };

  private currentCode = '';
  private expiresAt = 0;
  private generationInterval?: NodeJS.Timeout;
  private countdownInterval?: NodeJS.Timeout;
  private tokenLifetime = 30000; // 30 seconds
  private generationCount = 0;

  // ==================== CORE STRATEGY METHODS ====================

  async prepare(context: TimeAttendanceContext): Promise<StrategyPrepareResult> {
    this.log('info', 'Preparing QR strategy');

    if (!context.selectedStore) {
      return this.createPrepareError('Store must be selected before generating QR codes');
    }

    try {
      // Generate initial QR code
      await this.generateQRCode(context.selectedStore.id);
      
      // Start auto-regeneration
      this.startAutoRegeneration(context.selectedStore.id);
      
      return this.createPrepareSuccess({
        codeGenerated: true,
        autoRegenerationActive: true,
        tokenLifetime: this.tokenLifetime,
        initialCode: this.currentCode
      });
    } catch (error) {
      this.log('error', 'QR preparation failed', error);
      return this.createPrepareError(`QR preparation failed: ${error}`);
    }
  }

  async validate(context: TimeAttendanceContext): Promise<StrategyValidationResult> {
    this.log('info', 'Validating QR strategy');

    if (!context.selectedStore) {
      return this.createError('No store selected for QR validation');
    }

    if (!this.currentCode) {
      return this.createError('No QR code generated yet');
    }

    // Check if current code is expired
    const now = Date.now();
    if (now >= this.expiresAt) {
      return {
        isValid: true,
        warnings: ['QR code expired - new code will be generated'],
        metadata: {
          expired: true,
          willRegenerate: true
        }
      };
    }

    // Validate code format (allow hyphens for UUID store IDs)
    const codePattern = /^W3-[A-Za-z0-9-]+-\d+-[A-Za-z0-9]+$/;
    if (!codePattern.test(this.currentCode)) {
      return this.createError(`Invalid QR code format: ${this.currentCode}`);
    }

    const timeRemaining = this.expiresAt - now;
    return this.createSuccess({
      code: this.currentCode,
      expiresAt: this.expiresAt,
      timeRemaining,
      isValid: true,
      storeId: context.selectedStore.id
    });
  }

  async augmentPayload(
    basePayload: Partial<ClockInData>, 
    context: TimeAttendanceContext
  ): Promise<ClockInData> {
    this.log('info', 'Augmenting payload with QR data');

    // Ensure we have a fresh QR code
    if (!this.currentCode || Date.now() >= this.expiresAt) {
      if (context.selectedStore) {
        await this.generateQRCode(context.selectedStore.id);
      }
    }

    const augmentedPayload: ClockInData = {
      ...basePayload,
      storeId: basePayload.storeId!,
      trackingMethod: 'qr',
      deviceInfo: {
        ...basePayload.deviceInfo,
        deviceType: 'web',
        qrCode: this.currentCode,
        qrExpiresAt: this.expiresAt,
        qrGenerationCount: this.generationCount,
        userAgent: navigator.userAgent,
      },
      notes: `QR Code: ${this.currentCode}`
    };

    this.log('info', 'QR payload augmented', { 
      code: this.currentCode, 
      expiresAt: this.expiresAt,
      generationCount: this.generationCount 
    });
    
    return augmentedPayload;
  }

  renderPanel(props: StrategyPanelProps): React.ReactElement {
    return <QRPanel {...props} strategy={this} />;
  }

  // ==================== LIFECYCLE METHODS ====================

  async cleanup(): Promise<void> {
    if (this.generationInterval) {
      clearInterval(this.generationInterval);
      this.generationInterval = undefined;
    }
    
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = undefined;
    }
    
    this.log('info', 'QR strategy cleaned up');
  }

  reset(): void {
    this.currentCode = '';
    this.expiresAt = 0;
    this.generationCount = 0;
    this.log('info', 'QR strategy reset');
  }

  // ==================== CAPABILITY CHECKS ====================

  isAvailable(): boolean {
    return this.availability.supported;
  }

  getRequiredPermissions(): string[] {
    return []; // QR codes don't require special permissions
  }

  // ==================== QR-SPECIFIC METHODS ====================

  private async generateQRCode(storeId: string): Promise<void> {
    try {
      // Get tenant ID from localStorage (set by TenantProvider)
      const tenantData = localStorage.getItem('current-tenant');
      const tenantId = tenantData ? JSON.parse(tenantData).id : '00000000-0000-0000-0000-000000000001';
      
      // Fetch server-signed token with proper authentication headers
      const response = await fetch(`/api/hr/time-tracking/qr-token?storeId=${storeId}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId,
          'X-Auth-Session': 'authenticated',
          'X-Demo-User': 'admin-user'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to generate QR token: ${response.statusText}`);
      }

      const data = await response.json();
      
      this.currentCode = data.url; // Server-generated URL with signed token
      this.expiresAt = data.expiresAt;
      this.generationCount++;
      
      this.log('info', 'QR code generated from server', {
        url: data.url,
        expiresAt: this.expiresAt,
        generationCount: this.generationCount
      });
    } catch (error) {
      this.log('error', 'Failed to generate QR code', { error });
      throw error;
    }
  }

  private startAutoRegeneration(storeId: string): void {
    // Clear existing interval
    if (this.generationInterval) {
      clearInterval(this.generationInterval);
    }

    // Regenerate every 30 seconds
    this.generationInterval = setInterval(() => {
      this.generateQRCode(storeId);
    }, this.tokenLifetime);

    this.log('info', 'QR auto-regeneration started');
  }

  private stopAutoRegeneration(): void {
    if (this.generationInterval) {
      clearInterval(this.generationInterval);
      this.generationInterval = undefined;
      this.log('info', 'QR auto-regeneration stopped');
    }
  }

  getCurrentCode(): string {
    return this.currentCode;
  }

  getTimeRemaining(): number {
    return Math.max(0, this.expiresAt - Date.now());
  }

  getExpiresAt(): number {
    return this.expiresAt;
  }

  getGenerationCount(): number {
    return this.generationCount;
  }

  isCodeValid(): boolean {
    return Date.now() < this.expiresAt && this.currentCode.length > 0;
  }

  async manualRegenerate(storeId: string): Promise<void> {
    await this.generateQRCode(storeId);
    this.log('info', 'QR code manually regenerated');
  }
}

// ==================== QR PANEL COMPONENT ====================

interface QRPanelProps extends StrategyPanelProps {
  strategy: QRStrategy;
}

function QRPanel({ isActive, isLoading, context, onAction, compact, strategy }: QRPanelProps) {
  const [code, setCode] = useState<string>(strategy.getCurrentCode());
  const [timeRemaining, setTimeRemaining] = useState<number>(strategy.getTimeRemaining());
  const [isExpired, setIsExpired] = useState<boolean>(!strategy.isCodeValid());
  const [generationCount, setGenerationCount] = useState<number>(strategy.getGenerationCount());
  const qrRef = useRef<HTMLDivElement>(null);

  // 🔧 FIX: Attiva la strategy quando viene selezionato un punto vendita
  useEffect(() => {
    if (context.selectedStore) {
      console.log('[QR-PANEL] Store detected, preparing QR:', context.selectedStore.id);
      strategy.prepare(context).then(() => {
        const newCode = strategy.getCurrentCode();
        console.log('[QR-PANEL] QR code generated:', newCode);
        setCode(newCode);
        setTimeRemaining(strategy.getTimeRemaining());
        setIsExpired(!strategy.isCodeValid());
        setGenerationCount(strategy.getGenerationCount());
      }).catch(err => {
        console.error('[QR-PANEL] Failed to prepare strategy:', err);
      });
    }
  }, [context.selectedStore?.id, strategy]);

  useEffect(() => {
    if (!isActive) return;

    // Update QR code state every second
    const updateInterval = setInterval(() => {
      const currentCode = strategy.getCurrentCode();
      const remaining = strategy.getTimeRemaining();
      const expired = !strategy.isCodeValid();
      const count = strategy.getGenerationCount();

      setCode(currentCode);
      setTimeRemaining(remaining);
      setIsExpired(expired);
      setGenerationCount(count);

      // Notify parent of updates
      if (currentCode !== code) {
        onAction?.('qr_code_updated', { 
          code: currentCode, 
          timeRemaining: remaining,
          generationCount: count 
        });
      }
    }, 1000);

    return () => clearInterval(updateInterval);
  }, [isActive, code]);

  const handleManualRegenerate = async () => {
    if (context.selectedStore) {
      await strategy.manualRegenerate(context.selectedStore.id);
      onAction?.('qr_code_regenerated', { newCode: strategy.getCurrentCode() });
    }
  };

  const formatTimeRemaining = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  };

  const getProgressPercentage = (): number => {
    if (timeRemaining <= 0) return 0;
    return (timeRemaining / 30000) * 100; // 30 seconds = 100%
  };

  if (compact) {
    return (
      <div className="space-y-2" data-testid="qr-panel-compact">
        <div className="flex items-center gap-2">
          <QrCode className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-medium">QR Code</span>
          {code && (
            <Badge 
              variant={isExpired ? "destructive" : timeRemaining < 10000 ? "warning" : "default"} 
              className="text-xs"
            >
              {isExpired ? 'Scaduto' : formatTimeRemaining(timeRemaining)}
            </Badge>
          )}
        </div>
        
        {code ? (
          <div className="space-y-1">
            {/* Mini Scannable QR Code */}
            <div className="w-24 h-24 bg-white border-2 border-purple-300 rounded p-1 flex items-center justify-center">
              {!isExpired ? (
                <QRCodeSVG 
                  value={code} 
                  size={80}
                  level="M"
                  includeMargin={false}
                />
              ) : (
                <QrCode className="h-8 w-8 text-red-400" />
              )}
            </div>
            
            <div className="text-xs space-y-1">
              <div className="font-mono text-gray-600">{code.substring(0, 12)}...</div>
              <Progress value={getProgressPercentage()} className="h-1" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-purple-600">
            <Loader2 className="h-3 w-3 animate-spin" />
            Generazione QR...
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="h-full" data-testid="qr-panel-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-purple-500" />
            QR Code
            <Badge variant="secondary">#{generationCount}</Badge>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleManualRegenerate}
            disabled={isLoading || !context.selectedStore}
            data-testid="button-qr-regenerate"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-4">
        {/* QR Code Display */}
        {code ? (
          <div className="space-y-3">
            {/* Real Scannable QR Code */}
            <div 
              ref={qrRef}
              className={cn(
                "w-48 h-48 mx-auto border-4 rounded-lg p-3 bg-white flex items-center justify-center",
                isExpired 
                  ? "border-red-300" 
                  : timeRemaining < 10000 
                    ? "border-yellow-300" 
                    : "border-purple-300"
              )}
            >
              {!isExpired ? (
                <QRCodeSVG 
                  value={code} 
                  size={168}
                  level="H"
                  includeMargin={false}
                  data-testid="qr-code-image"
                />
              ) : (
                <div className="text-center">
                  <QrCode className="h-20 w-20 mx-auto text-red-400" />
                  <p className="text-xs text-red-600 mt-2">QR Scaduto</p>
                </div>
              )}
            </div>

            {/* Timer and Status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4" />
                  <span>Scadenza:</span>
                </div>
                <Badge 
                  variant={isExpired ? "destructive" : timeRemaining < 10000 ? "warning" : "default"}
                >
                  {isExpired ? 'SCADUTO' : formatTimeRemaining(timeRemaining)}
                </Badge>
              </div>
              
              <Progress 
                value={getProgressPercentage()} 
                className={cn(
                  "h-2",
                  isExpired && "bg-red-100",
                  timeRemaining < 10000 && !isExpired && "bg-yellow-100"
                )}
              />
            </div>

            {/* Code Information */}
            <div className="space-y-2">
              <div className="text-xs text-gray-600">Codice corrente:</div>
              <div className="font-mono text-xs bg-gray-50 p-2 rounded border break-all">
                {code}
              </div>
              <div className="text-xs text-gray-500">
                Generazione #{generationCount}
              </div>
            </div>

            {/* Expiration Warning */}
            {timeRemaining < 10000 && timeRemaining > 0 && (
              <Alert variant="default">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Il codice scadrà tra {formatTimeRemaining(timeRemaining)}
                </AlertDescription>
              </Alert>
            )}

            {isExpired && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Codice scaduto - nuovo codice in generazione
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-purple-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Generazione QR code...</span>
            </div>
            
            {!context.selectedStore && (
              <Alert variant="warning">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Seleziona un punto vendita per generare il QR code
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-gray-500">
          Il QR code si rigenera automaticamente ogni 30 secondi per motivi di sicurezza
        </div>
      </CardContent>
    </Card>
  );
}

// Export singleton instance
export const qrStrategy = new QRStrategy();