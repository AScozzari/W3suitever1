import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Smile, Coffee, Briefcase, Plane, Moon, Clock, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface CustomStatusInputProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStatus?: string;
  currentMessage?: string;
}

const STATUS_PRESETS = [
  { icon: Coffee, label: 'In pausa', emoji: '☕', message: 'In pausa caffè' },
  { icon: Briefcase, label: 'In riunione', emoji: '📅', message: 'In riunione, rispondo dopo' },
  { icon: Plane, label: 'In viaggio', emoji: '✈️', message: 'In viaggio di lavoro' },
  { icon: Moon, label: 'Non disturbare', emoji: '🌙', message: 'Non disturbare' },
  { icon: Clock, label: 'Torno subito', emoji: '⏰', message: 'Torno tra poco' }
];

export function CustomStatusInput({ open, onOpenChange, currentStatus, currentMessage }: CustomStatusInputProps) {
  const [emoji, setEmoji] = useState('💬');
  const [message, setMessage] = useState('');
  const [clearAfter, setClearAfter] = useState<'1h' | '4h' | 'today' | 'never'>('4h');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (open && currentMessage) {
      setMessage(currentMessage);
    }
  }, [open, currentMessage]);

  const updateStatusMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/chat/presence/status', {
        method: 'PATCH',
        body: JSON.stringify({
          status: currentStatus || 'online',
          customMessage: message.trim() || null,
          customEmoji: emoji,
          clearAfter: clearAfter === 'never' ? null : clearAfter
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/presence'] });
      toast({ title: 'Stato aggiornato' });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare lo stato',
        variant: 'destructive'
      });
    }
  });

  const clearStatusMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/chat/presence/status', {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'online',
          customMessage: null,
          customEmoji: null
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/presence'] });
      setMessage('');
      setEmoji('💬');
      toast({ title: 'Stato cancellato' });
      onOpenChange(false);
    }
  });

  const applyPreset = (preset: typeof STATUS_PRESETS[0]) => {
    setEmoji(preset.emoji);
    setMessage(preset.message);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smile className="h-5 w-5 text-windtre-orange" />
            Imposta stato personalizzato
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {STATUS_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                onClick={() => applyPreset(preset)}
                className="flex items-center gap-1.5"
              >
                <span>{preset.emoji}</span>
                <span className="text-xs">{preset.label}</span>
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Il tuo stato</Label>
            <div className="flex gap-2">
              <div className="relative">
                <Input
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value.slice(0, 2))}
                  className="w-14 text-center text-xl"
                  maxLength={2}
                  data-testid="input-status-emoji"
                />
              </div>
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Cosa stai facendo?"
                className="flex-1"
                maxLength={100}
                data-testid="input-status-message"
              />
            </div>
            <p className="text-xs text-gray-500">{message.length}/100 caratteri</p>
          </div>

          <div className="space-y-2">
            <Label>Cancella dopo</Label>
            <div className="flex gap-2">
              {[
                { value: '1h', label: '1 ora' },
                { value: '4h', label: '4 ore' },
                { value: 'today', label: 'Oggi' },
                { value: 'never', label: 'Mai' }
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={clearAfter === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setClearAfter(option.value as any)}
                  className="flex-1"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {currentMessage && (
            <Button
              variant="outline"
              onClick={() => clearStatusMutation.mutate()}
              disabled={clearStatusMutation.isPending}
              className="text-red-600"
            >
              <X className="h-4 w-4 mr-1" />
              Cancella stato
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button
            onClick={() => updateStatusMutation.mutate()}
            disabled={updateStatusMutation.isPending || !message.trim()}
            className="bg-windtre-orange hover:bg-windtre-orange-dark"
            data-testid="button-save-status"
          >
            {updateStatusMutation.isPending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              'Salva'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
