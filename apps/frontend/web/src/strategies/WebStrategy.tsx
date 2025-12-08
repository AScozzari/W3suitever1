// Web Strategy - Enterprise browser-based time tracking with device fingerprint and session validation
import React, { useState, useEffect } from 'react';
import { Globe, Shield, CheckCircle, AlertCircle, Loader2, Monitor, Wifi } from 'lucide-react';
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
import { cn } from '@/lib/utils';

interface DeviceFingerprint {
  userAgent: string;
  platform: string;
  language: string;
  timezone: string;
  screenResolution: string;
  colorDepth: number;
  cookieEnabled: boolean;
  doNotTrack: boolean;
  sessionId: string;
  browserHash: string;
}

interface WebMetadata {
  fingerprint: DeviceFingerprint;
  sessionValid: boolean;
  browserSupported: boolean;
  securityLevel: 'low' | 'medium' | 'high';
  riskFactors: string[];
}

export class WebStrategy extends BaseStrategy {
  readonly type = 'web' as const;
  readonly name = 'Web Browser';
  readonly description = 'Browser/device fingerprint with session validation';
  readonly priority = 4;
  readonly availability = {
    supported: typeof window !== 'undefined',
    requiresPermission: false,
    requiresHardware: false,
    requiresNetwork: true,
  };

  private fingerprint?: DeviceFingerprint;
  private sessionValid = false;
  private lastValidation = 0;
  private validationInterval = 5 * 60 * 1000; // 5 minutes

  // ==================== CORE STRATEGY METHODS ====================

  async prepare(context: TimeAttendanceContext): Promise<StrategyPrepareResult> {
    this.log('info', 'Preparing Web strategy');

    if (!this.isAvailable()) {
      return this.createPrepareError('Web environment not available');
    }

    try {
      // Generate device fingerprint
      this.fingerprint = await this.generateFingerprint();
      
      // Validate browser session
      await this.validateSession();
      
      return this.createPrepareSuccess({
        fingerprintGenerated: true,
        sessionValidated: this.sessionValid,
        browserHash: this.fingerprint.browserHash,
        securityLevel: this.calculateSecurityLevel()
      });
    } catch (error) {
      this.log('error', 'Web strategy preparation failed', error);
      return this.createPrepareError(`Web preparation failed: ${error}`);
    }
  }

  async validate(context: TimeAttendanceContext): Promise<StrategyValidationResult> {
    this.log('info', 'Validating Web strategy');

    if (!this.fingerprint) {
      return this.createError('Device fingerprint not generated');
    }

    // Check session validity
    const now = Date.now();
    if (now - this.lastValidation > this.validationInterval) {
      await this.validateSession();
      this.lastValidation = now;
    }

    if (!this.sessionValid) {
      return this.createError('Browser session is not valid');
    }

    // Analyze security level and risk factors
    const securityLevel = this.calculateSecurityLevel();
    const riskFactors = this.analyzeRiskFactors();

    if (securityLevel === 'low') {
      return {
        isValid: true,
        warnings: [`Low security level detected`, ...riskFactors],
        metadata: {
          securityLevel,
          riskFactors,
          fingerprint: this.fingerprint,
          requiresReview: true
        }
      };
    }

    return this.createSuccess({
      securityLevel,
      riskFactors,
      fingerprint: this.fingerprint,
      sessionValid: this.sessionValid,
      browserSupported: true
    });
  }

  async augmentPayload(
    basePayload: Partial<ClockInData>, 
    context: TimeAttendanceContext
  ): Promise<ClockInData> {
    this.log('info', 'Augmenting payload with Web data');

    // Ensure we have a fresh fingerprint
    if (!this.fingerprint) {
      this.fingerprint = await this.generateFingerprint();
    }

    const augmentedPayload: ClockInData = {
      ...basePayload,
      storeId: basePayload.storeId!,
      trackingMethod: 'web',
      deviceInfo: {
        ...basePayload.deviceInfo,
        deviceType: 'web',
        userAgent: this.fingerprint.userAgent,
        platform: this.fingerprint.platform,
        browserHash: this.fingerprint.browserHash,
        sessionId: this.fingerprint.sessionId,
        ipAddress: await this.getClientIP(),
        securityLevel: this.calculateSecurityLevel(),
        fingerprint: JSON.stringify(this.fingerprint)
      }
    };

    this.log('info', 'Web payload augmented', { 
      browserHash: this.fingerprint.browserHash,
      securityLevel: this.calculateSecurityLevel()
    });
    
    return augmentedPayload;
  }

  renderPanel(props: StrategyPanelProps): React.ReactElement {
    return <WebPanel {...props} strategy={this} />;
  }

  // ==================== LIFECYCLE METHODS ====================

  async cleanup(): Promise<void> {
    // No specific cleanup needed for web strategy
    this.log('info', 'Web strategy cleaned up');
  }

  reset(): void {
    this.fingerprint = undefined;
    this.sessionValid = false;
    this.lastValidation = 0;
    this.log('info', 'Web strategy reset');
  }

  // ==================== CAPABILITY CHECKS ====================

  isAvailable(): boolean {
    return this.availability.supported;
  }

  getRequiredPermissions(): string[] {
    return []; // Web strategy doesn't require special permissions
  }

  // ==================== WEB-SPECIFIC METHODS ====================

  private async generateFingerprint(): Promise<DeviceFingerprint> {
    const nav = navigator;
    const screen = window.screen;
    
    // Generate session ID
    const sessionId = this.generateSessionId();
    
    const fingerprint: DeviceFingerprint = {
      userAgent: nav.userAgent,
      platform: nav.platform,
      language: nav.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screenResolution: `${screen.width}x${screen.height}`,
      colorDepth: screen.colorDepth,
      cookieEnabled: nav.cookieEnabled,
      doNotTrack: nav.doNotTrack === '1',
      sessionId,
      browserHash: ''
    };

    // Generate browser hash from fingerprint components
    fingerprint.browserHash = await this.hashFingerprint(fingerprint);
    
    this.log('info', 'Device fingerprint generated', { 
      browserHash: fingerprint.browserHash,
      platform: fingerprint.platform
    });
    
    return fingerprint;
  }

  private async hashFingerprint(fingerprint: DeviceFingerprint): Promise<string> {
    const fingerprintString = [
      fingerprint.userAgent,
      fingerprint.platform,
      fingerprint.language,
      fingerprint.timezone,
      fingerprint.screenResolution,
      fingerprint.colorDepth.toString(),
      fingerprint.cookieEnabled.toString()
    ].join('|');

    // Simple hash function (in production, use crypto.subtle.digest)
    let hash = 0;
    for (let i = 0; i < fingerprintString.length; i++) {
      const char = fingerprintString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `WEB_${timestamp}_${random}`;
  }

  private async validateSession(): Promise<void> {
    try {
      // Check if cookies are enabled
      if (!navigator.cookieEnabled) {
        this.sessionValid = false;
        return;
      }

      // Check if local storage is available
      if (typeof Storage === 'undefined') {
        this.sessionValid = false;
        return;
      }

      // Validate browser capabilities
      const requiredAPIs = [
        'fetch',
        'JSON',
        'localStorage',
        'sessionStorage'
      ];

      const missingAPIs = requiredAPIs.filter(api => !(api in window));
      if (missingAPIs.length > 0) {
        this.log('warn', 'Missing browser APIs', { missingAPIs });
        this.sessionValid = false;
        return;
      }

      this.sessionValid = true;
      this.log('info', 'Browser session validated successfully');
    } catch (error) {
      this.log('error', 'Session validation failed', error);
      this.sessionValid = false;
    }
  }

  private calculateSecurityLevel(): 'low' | 'medium' | 'high' {
    if (!this.fingerprint) return 'low';

    let score = 0;

    // Browser security features
    if (this.fingerprint.cookieEnabled) score += 1;
    if (!this.fingerprint.doNotTrack) score += 1;
    if (this.fingerprint.userAgent.includes('Chrome') || this.fingerprint.userAgent.includes('Firefox')) score += 2;
    if (window.isSecureContext) score += 2;
    if ('serviceWorker' in navigator) score += 1;

    // Connection security
    if (location.protocol === 'https:') score += 2;
    if (typeof crypto !== 'undefined' && crypto.subtle) score += 1;

    if (score >= 7) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }

  private analyzeRiskFactors(): string[] {
    const risks: string[] = [];

    if (!this.fingerprint) return ['No fingerprint available'];

    // Check for common risk factors
    if (!this.fingerprint.cookieEnabled) {
      risks.push('Cookies disabled');
    }

    if (this.fingerprint.doNotTrack) {
      risks.push('Do Not Track enabled');
    }

    if (location.protocol !== 'https:') {
      risks.push('Insecure connection (HTTP)');
    }

    if (this.fingerprint.userAgent.includes('Headless') || 
        this.fingerprint.userAgent.includes('PhantomJS') ||
        this.fingerprint.userAgent.includes('Selenium')) {
      risks.push('Automated browser detected');
    }

    if (!window.isSecureContext) {
      risks.push('Non-secure context');
    }

    return risks;
  }

  private async getClientIP(): Promise<string | undefined> {
    try {
      // This would typically call an IP service
      // For demo purposes, we'll return undefined
      return undefined;
    } catch (error) {
      this.log('warn', 'Could not determine client IP', error);
      return undefined;
    }
  }

  getFingerprint(): DeviceFingerprint | undefined {
    return this.fingerprint;
  }

  isSessionValid(): boolean {
    return this.sessionValid;
  }

  getSecurityLevel(): 'low' | 'medium' | 'high' {
    return this.calculateSecurityLevel();
  }

  getRiskFactors(): string[] {
    return this.analyzeRiskFactors();
  }
}

// ==================== WEB PANEL COMPONENT ====================

interface WebPanelProps extends StrategyPanelProps {
  strategy: WebStrategy;
}

function WebPanel({ isActive, isLoading, context, onAction, compact, strategy }: WebPanelProps) {
  const [fingerprint, setFingerprint] = useState<DeviceFingerprint | undefined>(strategy.getFingerprint());
  const [sessionValid, setSessionValid] = useState<boolean>(strategy.isSessionValid());
  const [securityLevel, setSecurityLevel] = useState<'low' | 'medium' | 'high'>(strategy.getSecurityLevel());
  const [riskFactors, setRiskFactors] = useState<string[]>(strategy.getRiskFactors());

  useEffect(() => {
    if (isActive) {
      // Update state from strategy
      const fp = strategy.getFingerprint();
      const valid = strategy.isSessionValid();
      const level = strategy.getSecurityLevel();
      const risks = strategy.getRiskFactors();

      setFingerprint(fp);
      setSessionValid(valid);
      setSecurityLevel(level);
      setRiskFactors(risks);
    }
  }, [isActive]);

  const getSecurityBadgeVariant = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'high': return 'default';
      case 'medium': return 'warning';
      case 'low': return 'destructive';
    }
  };

  const getSecurityIcon = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'high': return <Shield className="h-3 w-3" />;
      case 'medium': return <AlertCircle className="h-3 w-3" />;
      case 'low': return <AlertCircle className="h-3 w-3" />;
    }
  };

  if (compact) {
    return (
      <div className="space-y-2" data-testid="web-panel-compact">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium">Web</span>
          <Badge variant={getSecurityBadgeVariant(securityLevel)} className="text-xs">
            {securityLevel}
          </Badge>
        </div>
        
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex items-center gap-1">
            {sessionValid ? (
              <CheckCircle className="h-3 w-3 text-green-500" />
            ) : (
              <AlertCircle className="h-3 w-3 text-red-500" />
            )}
            <span>{sessionValid ? 'Sessione valida' : 'Sessione non valida'}</span>
          </div>
          
          {fingerprint && (
            <div className="font-mono text-gray-500">
              ID: {fingerprint.browserHash.substring(0, 8)}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="h-full" data-testid="web-panel-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-green-500" />
            Web Browser
          </div>
          <Badge variant={getSecurityBadgeVariant(securityLevel)}>
            {getSecurityIcon(securityLevel)}
            {securityLevel.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-4">
        {/* Session Status */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            {sessionValid ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Sessione browser valida</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span>Sessione browser non valida</span>
              </>
            )}
          </div>
        </div>

        {/* Browser Information */}
        {fingerprint && (
          <div className="space-y-3">
            <div className="text-xs text-gray-600">Informazioni Browser:</div>
            
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Platform:</span>
                <span className="font-mono">{fingerprint.platform}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Risoluzione:</span>
                <span className="font-mono">{fingerprint.screenResolution}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Lingua:</span>
                <span className="font-mono">{fingerprint.language}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Timezone:</span>
                <span className="font-mono text-xs">{fingerprint.timezone}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">ID Browser:</span>
                <span className="font-mono">{fingerprint.browserHash}</span>
              </div>
            </div>
          </div>
        )}

        {/* Security Level Details */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-blue-500" />
            <span>Livello Sicurezza</span>
          </div>
          
          <Alert variant={securityLevel === 'low' ? "destructive" : "default"}>
            <Monitor className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Livello di sicurezza: <strong>{securityLevel.toUpperCase()}</strong>
              {securityLevel === 'low' && ' - Potenziali problemi di sicurezza rilevati'}
            </AlertDescription>
          </Alert>
        </div>

        {/* Risk Factors */}
        {riskFactors.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-gray-600">Fattori di rischio:</div>
            <div className="space-y-1">
              {riskFactors.map((risk, index) => (
                <div key={index} className="text-xs text-orange-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {risk}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Browser Capabilities */}
        <div className="space-y-2">
          <div className="text-xs text-gray-600">Caratteristiche:</div>
          <div className="flex flex-wrap gap-1">
            {fingerprint?.cookieEnabled && (
              <Badge variant="outline" className="text-xs">Cookies</Badge>
            )}
            {window.isSecureContext && (
              <Badge variant="outline" className="text-xs">Secure</Badge>
            )}
            {location.protocol === 'https:' && (
              <Badge variant="outline" className="text-xs">HTTPS</Badge>
            )}
            {'serviceWorker' in navigator && (
              <Badge variant="outline" className="text-xs">SW</Badge>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="text-xs text-gray-500">
          La timbratura web utilizza l'impronta digitale del browser per identificare il dispositivo
        </div>
      </CardContent>
    </Card>
  );
}

// Export singleton instance
export const webStrategy = new WebStrategy();