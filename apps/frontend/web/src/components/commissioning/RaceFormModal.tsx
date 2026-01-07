import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Lock, Trophy, Building2 } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Race {
  id: string;
  tenantId: string | null;
  raceType: 'operatore' | 'interna';
  name: string;
  description: string | null;
  validFrom: string;
  validTo: string | null;
  isEvergreen: boolean;
  operatorId: string | null;
  channelId: string | null;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
}

interface RaceFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  race: Race | null;
  raceType: 'operatore' | 'interna';
}

const formSchema = z.object({
  name: z.string().min(1, 'Nome obbligatorio').max(255),
  description: z.string().optional(),
  validFrom: z.date({ required_error: 'Data inizio obbligatoria' }),
  validTo: z.date().optional().nullable(),
  isEvergreen: z.boolean().default(false),
  operatorId: z.string().optional().nullable(),
  channelId: z.string().optional().nullable(),
  status: z.enum(['draft', 'active', 'completed', 'cancelled']).default('draft'),
});

type FormValues = z.infer<typeof formSchema>;

export default function RaceFormModal({ open, onOpenChange, race, raceType }: RaceFormModalProps) {
  const { toast } = useToast();
  const isBrandPushed = race?.tenantId === null;
  const isViewOnly = isBrandPushed;

  const { data: operators = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['/api/operators'],
    enabled: raceType === 'operatore',
  });

  const { data: channels = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['/api/channels'],
    enabled: raceType === 'operatore',
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: race?.name || '',
      description: race?.description || '',
      validFrom: race?.validFrom ? new Date(race.validFrom) : new Date(),
      validTo: race?.validTo ? new Date(race.validTo) : null,
      isEvergreen: race?.isEvergreen || false,
      operatorId: race?.operatorId || null,
      channelId: race?.channelId || null,
      status: race?.status || 'draft',
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      if (isViewOnly) {
        throw new Error('Cannot modify brand-pushed races');
      }
      const payload = {
        ...data,
        raceType,
        validFrom: format(data.validFrom, 'yyyy-MM-dd'),
        validTo: data.validTo ? format(data.validTo, 'yyyy-MM-dd') : null,
      };
      if (race) {
        return apiRequest(`/api/commissioning/races/${race.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      }
      return apiRequest('/api/commissioning/races', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/commissioning/races'] });
      toast({ title: race ? 'Gara aggiornata' : 'Gara creata', description: 'Operazione completata con successo' });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'Errore', description: 'Impossibile salvare la gara', variant: 'destructive' });
    },
  });

  const handleSubmit = (data: FormValues) => {
    if (isViewOnly) return;
    mutation.mutate(data);
  };

  const isEvergreen = form.watch('isEvergreen');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {raceType === 'operatore' ? (
              <Trophy className="h-5 w-5 text-amber-500" />
            ) : (
              <Building2 className="h-5 w-5 text-blue-500" />
            )}
            {race ? (isViewOnly ? 'Visualizza Gara' : 'Modifica Gara') : 'Nuova Gara'}
            {isBrandPushed && (
              <Badge className="ml-2 bg-gray-100 text-gray-700">
                <Lock className="h-3 w-3 mr-1" />
                Brand-Pushed
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Gara *</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isViewOnly} placeholder="Es: Gara Q1 2026 WindTre" data-testid="input-race-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione</FormLabel>
                  <FormControl>
                    <Textarea {...field} disabled={isViewOnly} placeholder="Descrizione della gara..." rows={3} data-testid="input-race-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {raceType === 'operatore' && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="operatorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Operatore</FormLabel>
                      <Select value={field.value || ''} onValueChange={field.onChange} disabled={isViewOnly}>
                        <FormControl>
                          <SelectTrigger data-testid="select-operator">
                            <SelectValue placeholder="Seleziona operatore" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {operators.map((op) => (
                            <SelectItem key={op.id} value={op.id}>{op.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="channelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Canale</FormLabel>
                      <Select value={field.value || ''} onValueChange={field.onChange} disabled={isViewOnly}>
                        <FormControl>
                          <SelectTrigger data-testid="select-channel">
                            <SelectValue placeholder="Seleziona canale" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {channels.map((ch) => (
                            <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="validFrom"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data Inizio *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            disabled={isViewOnly}
                            className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                            data-testid="btn-valid-from"
                          >
                            {field.value ? format(field.value, 'dd/MM/yyyy') : 'Seleziona data'}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="validTo"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data Fine</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            disabled={isViewOnly || isEvergreen}
                            className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                            data-testid="btn-valid-to"
                          >
                            {isEvergreen ? 'Evergreen' : field.value ? format(field.value, 'dd/MM/yyyy') : 'Seleziona data'}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center justify-between">
              <FormField
                control={form.control}
                name="isEvergreen"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isViewOnly} data-testid="switch-evergreen" />
                    </FormControl>
                    <FormLabel className="!mt-0">Gara Evergreen (senza scadenza)</FormLabel>
                  </FormItem>
                )}
              />

              {race && (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <Select value={field.value} onValueChange={field.onChange} disabled={isViewOnly}>
                        <FormControl>
                          <SelectTrigger className="w-[150px]" data-testid="select-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Bozza</SelectItem>
                          <SelectItem value="active">Attiva</SelectItem>
                          <SelectItem value="completed">Completata</SelectItem>
                          <SelectItem value="cancelled">Annullata</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="btn-cancel">
                {isViewOnly ? 'Chiudi' : 'Annulla'}
              </Button>
              {!isViewOnly && (
                <Button 
                  type="submit" 
                  disabled={mutation.isPending}
                  style={{ background: 'hsl(var(--brand-orange))' }}
                  data-testid="btn-save-race"
                >
                  {mutation.isPending ? 'Salvataggio...' : race ? 'Salva Modifiche' : 'Crea Gara'}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
