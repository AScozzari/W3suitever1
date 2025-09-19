// NFC Strategy - Enterprise NFC-based time tracking with Web NFC API integration
import React, { useState, useEffect } from 'react';
import { Wifi, CreditCard, CheckCircle, AlertCircle, Loader2, RefreshCw, Smartphone } from 'lucide-react';
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

interface NFCMetadata {
  hasNFCSupport: boolean;
  isScanning: boolean;
  lastBadgeId?: string;
  simulationMode: boolean;
  badgeHistory: string[];
}

// Declare global NFC types for TypeScript
declare global {
  interface Window {
    NDEFReader: any;
  }
}

export class NFCStrategy extends BaseStrategy {
  readonly type = 'nfc' as const;
  readonly name = 'NFC Badge';
  readonly description = 'Web NFC API integration with badge simulation fallback';
  readonly priority = 3;
  readonly availability = {
    supported: typeof window !== 'undefined' && 'NDEFReader' in window,
    requiresPermission: true,
    requiresHardware: true,
    requiresNetwork: false,
  };

  private ndefReader?: any;
  private isScanning = false;
  private lastBadgeId?: string;
  private scanTimeout?: NodeJS.Timeout;
  private simulationMode = false;

  // ==================== CORE STRATEGY METHODS ====================

  async prepare(context: TimeAttendanceContext): Promise<StrategyPrepareResult> {
    this.log('info', 'Preparing NFC strategy');

    // Check Web NFC API support
    if (!this.isAvailable()) {
      // Fallback to simulation mode for testing/compatibility
      this.simulationMode = true;
      this.log('warn', 'Web NFC not supported, enabling simulation mode');
      
      return this.createPrepareSuccess({
        hasNFCSupport: false,
        simulationMode: true,
        fallbackMode: 'badge_simulation'
      });
    }

    try {
      // Initialize NDEFReader
      this.ndefReader = new window.NDEFReader();
      
      // Request permissions by attempting to scan
      await this.ndefReader.scan();
      this.log('info', 'NFC permissions granted and reader initialized');
      
      return this.createPrepareSuccess({
        hasNFCSupport: true,
        simulationMode: false,
        readerInitialized: true
      });
    } catch (error) {
      this.log('error', 'NFC preparation failed, falling back to simulation', error);
      
      // Fallback to simulation mode
      this.simulationMode = true;
      return this.createPrepareSuccess({
        hasNFCSupport: false,
        simulationMode: true,
        fallbackReason: `NFC error: ${error}`,
        fallbackMode: 'badge_simulation'
      });
    }
  }

  async validate(context: TimeAttendanceContext): Promise<StrategyValidationResult> {
    this.log('info', 'Validating NFC strategy');

    if (!context.selectedStore) {
      return this.createError('No store selected for NFC validation');
    }

    // In simulation mode, we just check if a badge ID is provided
    if (this.simulationMode) {
      return this.createSuccess({
        simulationMode: true,
        supported: true,
        message: 'NFC simulation mode active - badge input required'
      });
    }

    // For real NFC, check if we have a recent badge scan
    if (!this.lastBadgeId) {
      return {
        isValid: true,
        warnings: ['No NFC badge detected yet - scan required'],
        metadata: {
          requiresBadgeScan: true,
          isScanning: this.isScanning
        }
      };
    }

    // Validate badge ID format (example: alphanumeric, 8-16 chars)
    const badgeIdPattern = /^[A-Za-z0-9]{8,16}$/;
    if (!badgeIdPattern.test(this.lastBadgeId)) {
      return this.createError(`Invalid badge ID format: ${this.lastBadgeId}`);
    }

    return this.createSuccess({
      badgeId: this.lastBadgeId,
      validFormat: true,
      scanTime: Date.now()
    });
  }

  async augmentPayload(
    basePayload: Partial<ClockInData>, 
    context: TimeAttendanceContext
  ): Promise<ClockInData> {
    this.log('info', 'Augmenting payload with NFC data');

    const badgeId = this.lastBadgeId || 'SIMULATED_BADGE';

    const augmentedPayload: ClockInData = {
      ...basePayload,
      storeId: basePayload.storeId!,
      trackingMethod: 'nfc',
      deviceInfo: {
        ...basePayload.deviceInfo,
        deviceType: 'web',
        nfcBadgeId: badgeId,
        nfcMode: this.simulationMode ? 'simulation' : 'hardware',
        userAgent: navigator.userAgent,
      },
      // Store badge ID in notes for audit purposes
      notes: `NFC Badge: ${badgeId}${this.simulationMode ? ' (Simulated)' : ''}`
    };

    this.log('info', 'NFC payload augmented', { badgeId, simulationMode: this.simulationMode });
    return augmentedPayload;
  }

  renderPanel(props: StrategyPanelProps): React.ReactElement {
    return <NFCPanel {...props} strategy={this} />;
  }

  // ==================== LIFECYCLE METHODS ====================

  async cleanup(): Promise<void> {
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = undefined;
    }
    
    if (this.ndefReader && this.isScanning) {
      try {
        await this.ndefReader.stop?.();
      } catch (error) {
        this.log('warn', 'Error stopping NFC scan', error);
      }
    }
    
    this.isScanning = false;
    this.log('info', 'NFC strategy cleaned up');
  }

  reset(): void {
    this.lastBadgeId = undefined;
    this.isScanning = false;
    this.log('info', 'NFC strategy reset');
  }

  // ==================== CAPABILITY CHECKS ====================

  isAvailable(): boolean {
    return this.availability.supported || this.simulationMode;
  }

  getRequiredPermissions(): string[] {
    return this.simulationMode ? [] : ['nfc'];
  }

  // ==================== NFC-SPECIFIC METHODS ====================

  async startScanning(): Promise<void> {
    if (this.simulationMode) {
      this.log('info', 'NFC simulation mode - manual badge input required');
      return;
    }

    if (!this.ndefReader || this.isScanning) return;

    try {
      this.isScanning = true;
      
      this.ndefReader.addEventListener('reading', this.handleNFCRead.bind(this));
      this.ndefReader.addEventListener('readingerror', this.handleNFCError.bind(this));
      
      await this.ndefReader.scan();
      this.log('info', 'NFC scanning started');

      // Auto-stop scanning after 30 seconds
      this.scanTimeout = setTimeout(() => {
        this.stopScanning();
      }, 30000);
    } catch (error) {
      this.isScanning = false;
      this.log('error', 'Failed to start NFC scanning', error);
      throw error;
    }
  }

  async stopScanning(): Promise<void> {
    if (!this.isScanning) return;

    try {
      if (this.ndefReader) {
        this.ndefReader.removeEventListener('reading', this.handleNFCRead);
        this.ndefReader.removeEventListener('readingerror', this.handleNFCError);
      }
      
      if (this.scanTimeout) {
        clearTimeout(this.scanTimeout);
        this.scanTimeout = undefined;
      }
      
      this.isScanning = false;
      this.log('info', 'NFC scanning stopped');
    } catch (error) {
      this.log('error', 'Error stopping NFC scan', error);
    }
  }

  private handleNFCRead(event: any): void {
    try {
      const message = event.message;
      const serialNumber = event.serialNumber;
      
      // Extract badge ID from NFC data
      let badgeId = serialNumber;
      
      // Try to extract from NDEF records if available
      if (message && message.records && message.records.length > 0) {
        const textRecord = message.records.find((r: any) => r.recordType === 'text');
        if (textRecord) {
          const decoder = new TextDecoder();
          badgeId = decoder.decode(textRecord.data);
        }
      }
      
      this.lastBadgeId = badgeId;
      this.log('info', 'NFC badge read', { badgeId, serialNumber });
      
      // Auto-stop scanning after successful read
      this.stopScanning();
    } catch (error) {
      this.log('error', 'Error processing NFC read', error);
    }
  }

  private handleNFCError(event: any): void {
    this.log('error', 'NFC read error', event);
    this.isScanning = false;
  }

  setSimulatedBadgeId(badgeId: string): void {
    this.lastBadgeId = badgeId;
    this.log('info', 'Simulated badge ID set', { badgeId });
  }

  getLastBadgeId(): string | undefined {
    return this.lastBadgeId;
  }

  isSimulationMode(): boolean {
    return this.simulationMode;
  }

  isCurrentlyScanning(): boolean {
    return this.isScanning;
  }
}

// ==================== NFC PANEL COMPONENT ====================

interface NFCPanelProps extends StrategyPanelProps {
  strategy: NFCStrategy;
}

function NFCPanel({ isActive, isLoading, context, onAction, compact, strategy }: NFCPanelProps) {
  const [badgeId, setBadgeId] = useState<string>(strategy.getLastBadgeId() || '');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [simulatedBadgeInput, setSimulatedBadgeInput] = useState('');
  const simulationMode = strategy.isSimulationMode();

  useEffect(() => {
    if (isActive && !simulationMode) {
      // Auto-start scanning when panel becomes active
      handleStartScan();
    }

    return () => {
      strategy.stopScanning();
    };
  }, [isActive]);

  const handleStartScan = async () => {
    if (simulationMode) return;
    
    try {
      setIsScanning(true);
      setScanError(null);
      await strategy.startScanning();
      
      // Check for badge ID updates
      const checkBadgeId = setInterval(() => {
        const currentBadgeId = strategy.getLastBadgeId();
        if (currentBadgeId && currentBadgeId !== badgeId) {
          setBadgeId(currentBadgeId);
          setIsScanning(false);
          clearInterval(checkBadgeId);
          onAction?.('nfc_badge_detected', { badgeId: currentBadgeId });
        }
        
        if (!strategy.isCurrentlyScanning()) {
          setIsScanning(false);
          clearInterval(checkBadgeId);
        }
      }, 500);
      
      // Auto-clear interval after 30 seconds
      setTimeout(() => clearInterval(checkBadgeId), 30000);
    } catch (error) {
      setIsScanning(false);
      setScanError(`Scan failed: ${error}`);
    }
  };

  const handleStopScan = async () => {
    await strategy.stopScanning();
    setIsScanning(false);
  };

  const handleSimulatedBadge = () => {
    if (simulatedBadgeInput.trim()) {
      strategy.setSimulatedBadgeId(simulatedBadgeInput.trim());
      setBadgeId(simulatedBadgeInput.trim());
      onAction?.('nfc_badge_simulated', { badgeId: simulatedBadgeInput.trim() });
      setSimulatedBadgeInput('');
    }
  };

  if (compact) {
    return (
      <div className="space-y-2" data-testid="nfc-panel-compact">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium">NFC</span>
          {simulationMode && (
            <Badge variant="secondary" className="text-xs">Sim</Badge>
          )}
          {badgeId && (
            <Badge variant="default" className="text-xs font-mono">
              {badgeId.substring(0, 8)}...
            </Badge>
          )}
        </div>
        
        {simulationMode ? (
          <div className="flex gap-1">
            <Input
              placeholder="Badge ID"
              value={simulatedBadgeInput}
              onChange={(e) => setSimulatedBadgeInput(e.target.value)}
              className="text-xs h-7"
              data-testid="input-badge-id"
            />
            <Button
              size="sm"
              onClick={handleSimulatedBadge}
              disabled={!simulatedBadgeInput.trim()}
              className="h-7 px-2"
              data-testid="button-simulate-badge"
            >
              ✓
            </Button>
          </div>
        ) : (
          <div className="text-xs">
            {isScanning ? (
              <div className="flex items-center gap-1 text-blue-600">
                <Loader2 className="h-3 w-3 animate-spin" />
                Scansione...
              </div>
            ) : badgeId ? (
              <div className="text-green-600">Badge rilevato</div>
            ) : (
              <div className="text-gray-500">Avvicina badge</div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="h-full" data-testid="nfc-panel-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-blue-500" />
            NFC Badge
            {simulationMode && (
              <Badge variant="secondary">Simulation</Badge>
            )}
          </div>
          {!simulationMode && (
            <Button
              size="sm"
              variant="ghost"
              onClick={isScanning ? handleStopScan : handleStartScan}
              disabled={isLoading}
              data-testid="button-nfc-scan"
            >
              {isScanning ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-4">
        {/* NFC Status */}
        {simulationMode ? (
          <Alert>
            <Smartphone className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Modalità simulazione - NFC hardware non disponibile
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              {isScanning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <span>Scansione NFC attiva</span>
                </>
              ) : badgeId ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Badge rilevato</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span>In attesa di badge</span>
                </>
              )}
            </div>
            
            {scanError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{scanError}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Badge Input for Simulation */}
        {simulationMode && (
          <div className="space-y-2">
            <label className="text-xs text-gray-600">Badge ID:</label>
            <div className="flex gap-2">
              <Input
                placeholder="Inserisci ID badge (es: BADGE001)"
                value={simulatedBadgeInput}
                onChange={(e) => setSimulatedBadgeInput(e.target.value)}
                className="text-sm"
                data-testid="input-badge-id-full"
              />
              <Button
                onClick={handleSimulatedBadge}
                disabled={!simulatedBadgeInput.trim()}
                data-testid="button-simulate-badge-full"
              >
                Simula
              </Button>
            </div>
          </div>
        )}

        {/* Current Badge Info */}
        {badgeId && (
          <div className="space-y-2">
            <div className="text-xs text-gray-600">Badge corrente:</div>
            <div className="font-mono text-sm bg-gray-50 p-2 rounded border">
              {badgeId}
            </div>
            <div className="text-xs text-gray-500">
              {simulationMode ? 'Simulato' : 'Hardware NFC'}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-gray-500">
          {simulationMode ? (
            "Inserisci manualmente l'ID del badge per la timbratura"
          ) : isScanning ? (
            "Avvicina il badge NFC al dispositivo"
          ) : (
            "Premi il pulsante per iniziare la scansione NFC"
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Export singleton instance
export const nfcStrategy = new NFCStrategy();