// Device Simulator Component - Hardware Testing Utilities
import { useState } from 'react';
import {
  CreditCard,
  Wifi,
  Smartphone,
  Fingerprint,
  QrCode,
  Scan,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  Shield,
  Settings,
  Terminal,
  Activity,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface DeviceSimulatorProps {
  onDeviceRead?: (type: string, data: any) => void;
  showInProduction?: boolean;
  className?: string;
}

interface SimulatedDevice {
  id: string;
  type: 'badge' | 'nfc' | 'qr' | 'biometric';
  label: string;
  value?: string;
  status: 'idle' | 'scanning' | 'success' | 'error';
  lastRead?: Date;
}

const MOCK_BADGES = [
  { id: 'BADGE001', name: 'Mario Rossi', role: 'Sales' },
  { id: 'BADGE002', name: 'Laura Bianchi', role: 'Manager' },
  { id: 'BADGE003', name: 'Giuseppe Verdi', role: 'HR' },
  { id: 'BADGE004', name: 'Anna Russo', role: 'Support' },
];

const MOCK_NFC_TAGS = [
  { uid: 'NFC:04:5A:2B:C3:D4:E5:F6', type: 'MIFARE', memory: '1KB' },
  { uid: 'NFC:08:1B:3C:4D:5E:6F:7A', type: 'NTAG215', memory: '504B' },
  { uid: 'NFC:0C:2D:4E:6F:8A:9B:1C', type: 'DESFire', memory: '4KB' },
];

const MOCK_QR_CODES = [
  { code: 'QR:STORE:MI001', location: 'Milano Duomo', type: 'store' },
  { code: 'QR:STORE:RM001', location: 'Roma Colosseo', type: 'store' },
  { code: 'QR:EVENT:2024001', event: 'Team Meeting', type: 'event' },
];

export default function DeviceSimulator({
  onDeviceRead,
  showInProduction = false,
  className,
}: DeviceSimulatorProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('badge');
  const [devices, setDevices] = useState<SimulatedDevice[]>([
    { id: '1', type: 'badge', label: 'RFID Reader', status: 'idle' },
    { id: '2', type: 'nfc', label: 'NFC Scanner', status: 'idle' },
    { id: '3', type: 'qr', label: 'QR Scanner', status: 'idle' },
    { id: '4', type: 'biometric', label: 'Fingerprint', status: 'idle' },
  ]);
  const [customBadgeId, setCustomBadgeId] = useState('');
  const [customNfcUid, setCustomNfcUid] = useState('');
  const [customQrCode, setCustomQrCode] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);

  // Hide in production unless explicitly allowed
  if (process.env.NODE_ENV === 'production' && !showInProduction) {
    return null;
  }

  const simulateRead = async (
    deviceId: string,
    type: 'badge' | 'nfc' | 'qr' | 'biometric',
    customValue?: string
  ) => {
    setIsSimulating(true);
    
    // Update device status to scanning
    setDevices((prev) =>
      prev.map((d) =>
        d.id === deviceId ? { ...d, status: 'scanning' as const } : d
      )
    );

    // Simulate scanning delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    let result: any = null;
    let success = true;

    try {
      switch (type) {
        case 'badge':
          const badgeId = customValue || MOCK_BADGES[Math.floor(Math.random() * MOCK_BADGES.length)].id;
          const badge = MOCK_BADGES.find(b => b.id === badgeId) || MOCK_BADGES[0];
          result = {
            type: 'badge',
            id: badge.id,
            data: badge,
            timestamp: new Date().toISOString(),
          };
          break;

        case 'nfc':
          const nfcTag = customValue
            ? { uid: customValue, type: 'Custom', memory: 'Unknown' }
            : MOCK_NFC_TAGS[Math.floor(Math.random() * MOCK_NFC_TAGS.length)];
          result = {
            type: 'nfc',
            uid: nfcTag.uid,
            data: nfcTag,
            timestamp: new Date().toISOString(),
          };
          break;

        case 'qr':
          const qrCode = customValue || MOCK_QR_CODES[Math.floor(Math.random() * MOCK_QR_CODES.length)].code;
          const qrData = MOCK_QR_CODES.find(q => q.code === qrCode) || { code: qrCode };
          result = {
            type: 'qr',
            code: qrCode,
            data: qrData,
            timestamp: new Date().toISOString(),
          };
          break;

        case 'biometric':
          // Simulate fingerprint with 95% success rate
          success = Math.random() > 0.05;
          if (success) {
            result = {
              type: 'biometric',
              method: 'fingerprint',
              userId: 'USER' + Math.floor(Math.random() * 1000),
              confidence: 0.95 + Math.random() * 0.05,
              timestamp: new Date().toISOString(),
            };
          }
          break;
      }

      if (success && result) {
        // Update device status to success
        setDevices((prev) =>
          prev.map((d) =>
            d.id === deviceId
              ? { ...d, status: 'success' as const, value: JSON.stringify(result), lastRead: new Date() }
              : d
          )
        );

        // Call callback
        if (onDeviceRead) {
          onDeviceRead(type, result);
        }

        toast({
          title: "Lettura Dispositivo",
          description: `${type.toUpperCase()} letto con successo`,
          data: { testid: 'toast-device-read-success' },
        });
      } else {
        throw new Error('Read failed');
      }
    } catch (error) {
      // Update device status to error
      setDevices((prev) =>
        prev.map((d) =>
          d.id === deviceId ? { ...d, status: 'error' as const } : d
        )
      );

      toast({
        title: "Errore Lettura",
        description: "Impossibile leggere il dispositivo",
        variant: "destructive",
        data: { testid: 'toast-device-read-error' },
      });
    } finally {
      setIsSimulating(false);

      // Reset status after 3 seconds
      setTimeout(() => {
        setDevices((prev) =>
          prev.map((d) =>
            d.id === deviceId ? { ...d, status: 'idle' as const } : d
          )
        );
      }, 3000);
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'badge':
        return <CreditCard className="w-5 h-5" />;
      case 'nfc':
        return <Wifi className="w-5 h-5" />;
      case 'qr':
        return <QrCode className="w-5 h-5" />;
      case 'biometric':
        return <Fingerprint className="w-5 h-5" />;
      default:
        return <Smartphone className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scanning':
        return 'text-blue-400';
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <Card
      className={cn(
        "p-6 bg-white/5 backdrop-blur-xl border-white/10",
        className
      )}
      data-testid="device-simulator"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Terminal className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold">Device Simulator</h3>
          <Badge variant="warning" className="text-xs">
            DEVELOPMENT
          </Badge>
        </div>
        <Badge variant="outline" className="text-xs">
          <Activity className="w-3 h-3 mr-1" />
          {devices.filter(d => d.status === 'scanning').length} Active
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="badge" className="text-xs">
            <CreditCard className="w-4 h-4 mr-1" />
            Badge
          </TabsTrigger>
          <TabsTrigger value="nfc" className="text-xs">
            <Wifi className="w-4 h-4 mr-1" />
            NFC
          </TabsTrigger>
          <TabsTrigger value="qr" className="text-xs">
            <QrCode className="w-4 h-4 mr-1" />
            QR
          </TabsTrigger>
          <TabsTrigger value="biometric" className="text-xs">
            <Fingerprint className="w-4 h-4 mr-1" />
            Bio
          </TabsTrigger>
        </TabsList>

        {/* Badge RFID */}
        <TabsContent value="badge" className="space-y-4">
          <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <h4 className="text-sm font-medium mb-3">RFID Badge Reader</h4>
            
            {/* Quick Badges */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {MOCK_BADGES.map((badge) => (
                <Button
                  key={badge.id}
                  variant="outline"
                  size="sm"
                  onClick={() => simulateRead('1', 'badge', badge.id)}
                  disabled={isSimulating}
                  className="justify-start"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  <div className="text-left">
                    <div className="text-xs font-medium">{badge.id}</div>
                    <div className="text-xs text-gray-400">{badge.name}</div>
                  </div>
                </Button>
              ))}
            </div>

            {/* Custom Badge */}
            <div className="flex gap-2">
              <Input
                placeholder="Custom Badge ID..."
                value={customBadgeId}
                onChange={(e) => setCustomBadgeId(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={() => simulateRead('1', 'badge', customBadgeId)}
                disabled={isSimulating || !customBadgeId}
              >
                <Scan className="w-4 h-4 mr-2" />
                Read
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* NFC */}
        <TabsContent value="nfc" className="space-y-4">
          <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
            <h4 className="text-sm font-medium mb-3">NFC Tag Scanner</h4>
            
            {/* Quick NFC Tags */}
            <div className="space-y-2 mb-4">
              {MOCK_NFC_TAGS.map((tag) => (
                <Button
                  key={tag.uid}
                  variant="outline"
                  size="sm"
                  onClick={() => simulateRead('2', 'nfc', tag.uid)}
                  disabled={isSimulating}
                  className="w-full justify-start"
                >
                  <Wifi className="w-4 h-4 mr-2" />
                  <div className="text-left flex-1">
                    <div className="text-xs font-mono">{tag.uid}</div>
                    <div className="text-xs text-gray-400">
                      {tag.type} • {tag.memory}
                    </div>
                  </div>
                </Button>
              ))}
            </div>

            {/* Custom NFC */}
            <div className="flex gap-2">
              <Input
                placeholder="NFC UID (XX:XX:XX:XX:XX:XX:XX)"
                value={customNfcUid}
                onChange={(e) => setCustomNfcUid(e.target.value)}
                className="flex-1 font-mono text-xs"
              />
              <Button
                onClick={() => simulateRead('2', 'nfc', customNfcUid)}
                disabled={isSimulating || !customNfcUid}
              >
                <Scan className="w-4 h-4 mr-2" />
                Scan
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* QR Code */}
        <TabsContent value="qr" className="space-y-4">
          <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <h4 className="text-sm font-medium mb-3">QR Code Scanner</h4>
            
            {/* Quick QR Codes */}
            <div className="space-y-2 mb-4">
              {MOCK_QR_CODES.map((qr) => (
                <Button
                  key={qr.code}
                  variant="outline"
                  size="sm"
                  onClick={() => simulateRead('3', 'qr', qr.code)}
                  disabled={isSimulating}
                  className="w-full justify-start"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  <div className="text-left flex-1">
                    <div className="text-xs font-mono">{qr.code}</div>
                    <div className="text-xs text-gray-400">
                      {qr.location || qr.event}
                    </div>
                  </div>
                </Button>
              ))}
            </div>

            {/* Custom QR */}
            <div className="flex gap-2">
              <Input
                placeholder="QR Code Data..."
                value={customQrCode}
                onChange={(e) => setCustomQrCode(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={() => simulateRead('3', 'qr', customQrCode)}
                disabled={isSimulating || !customQrCode}
              >
                <Scan className="w-4 h-4 mr-2" />
                Scan
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Biometric */}
        <TabsContent value="biometric" className="space-y-4">
          <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
            <h4 className="text-sm font-medium mb-3">Biometric Scanner</h4>
            
            <div className="text-center py-8">
              <motion.div
                animate={{
                  scale: isSimulating ? [1, 1.1, 1] : 1,
                }}
                transition={{
                  duration: 1,
                  repeat: isSimulating ? Infinity : 0,
                }}
                className="inline-block"
              >
                <Fingerprint className="w-24 h-24 text-red-400 mx-auto mb-4" />
              </motion.div>
              
              <p className="text-sm text-gray-400 mb-4">
                Simula scansione impronte digitali
              </p>
              
              <Button
                onClick={() => simulateRead('4', 'biometric')}
                disabled={isSimulating}
                className="w-full"
              >
                {isSimulating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4 mr-2" />
                    Scan Fingerprint
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Device Status */}
      <div className="mt-6 space-y-2">
        <h4 className="text-sm font-medium mb-2">Device Status</h4>
        {devices.map((device) => (
          <motion.div
            key={device.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-between p-2 bg-white/5 rounded"
          >
            <div className="flex items-center gap-2">
              {getDeviceIcon(device.type)}
              <span className="text-sm">{device.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {device.lastRead && (
                <span className="text-xs text-gray-400">
                  {new Date(device.lastRead).toLocaleTimeString()}
                </span>
              )}
              <Badge
                variant="outline"
                className={cn('text-xs', getStatusColor(device.status))}
              >
                {device.status === 'scanning' && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
                {device.status === 'success' && <Check className="w-3 h-3 mr-1" />}
                {device.status === 'error' && <X className="w-3 h-3 mr-1" />}
                {device.status === 'idle' && <Shield className="w-3 h-3 mr-1" />}
                {device.status}
              </Badge>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Last Read Data */}
      <AnimatePresence>
        {devices.some(d => d.value) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 p-3 bg-green-500/10 rounded-lg border border-green-500/20"
          >
            <h5 className="text-xs font-medium text-green-400 mb-2">Last Read Data</h5>
            <pre className="text-xs font-mono text-gray-300 overflow-x-auto">
              {JSON.stringify(
                JSON.parse(devices.find(d => d.value)?.value || '{}'),
                null,
                2
              )}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}