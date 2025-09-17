// Expense Report Form Component
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useExpenseReports } from '@/hooks/useExpenseManagement';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CalendarIcon, Plus, X, Upload, Receipt } from 'lucide-react';

const expenseReportSchema = z.object({
  title: z.string().min(3, 'Il titolo deve avere almeno 3 caratteri'),
  description: z.string().optional(),
  startDate: z.date({
    required_error: 'La data di inizio è obbligatoria',
  }),
  endDate: z.date({
    required_error: 'La data di fine è obbligatoria',
  }),
  totalAmount: z.number().min(0, 'L\'importo deve essere positivo'),
  items: z.array(z.object({
    description: z.string().min(1, 'Descrizione obbligatoria'),
    category: z.string().min(1, 'Categoria obbligatoria'),
    amount: z.number().min(0, 'Importo deve essere positivo'),
    date: z.date(),
    hasReceipt: z.boolean()
  })).min(1, 'Aggiungi almeno una voce di spesa'),
  notes: z.string().optional()
});

type ExpenseReportFormValues = z.infer<typeof expenseReportSchema>;

interface ExpenseReportFormProps {
  initialData?: Partial<ExpenseReportFormValues>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ExpenseReportForm({ 
  initialData, 
  onSuccess, 
  onCancel 
}: ExpenseReportFormProps) {
  const { toast } = useToast();
  const { createReport, updateReport } = useExpenseReports();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ExpenseReportFormValues>({
    resolver: zodResolver(expenseReportSchema),
    defaultValues: initialData || {
      title: '',
      description: '',
      startDate: new Date(),
      endDate: new Date(),
      totalAmount: 0,
      items: [],
      notes: ''
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  });

  const categories = [
    'Trasporti',
    'Vitto',
    'Alloggio',
    'Materiali',
    'Formazione',
    'Marketing',
    'Altro'
  ];

  const onSubmit = async (data: ExpenseReportFormValues) => {
    setIsSubmitting(true);
    try {
      if (initialData?.id) {
        await updateReport.mutateAsync({ id: initialData.id, ...data });
        toast({
          title: 'Nota spese aggiornata',
          description: 'La nota spese è stata aggiornata con successo',
        });
      } else {
        await createReport.mutateAsync(data);
        toast({
          title: 'Nota spese creata',
          description: 'La nuova nota spese è stata creata con successo',
        });
      }
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore durante il salvataggio',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addExpenseItem = () => {
    append({
      description: '',
      category: '',
      amount: 0,
      date: new Date(),
      hasReceipt: false
    });
  };

  const calculateTotal = () => {
    const items = form.watch('items');
    const total = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    form.setValue('totalAmount', total);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titolo Nota Spese</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="es. Trasferta Milano Febbraio 2024" 
                      {...field} 
                      data-testid="input-expense-title"
                    />
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
                    <Textarea 
                      placeholder="Descrizione della nota spese..." 
                      {...field}
                      data-testid="textarea-expense-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data Inizio</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                            data-testid="button-start-date"
                          >
                            {field.value ? (
                              format(field.value, 'PPP', { locale: it })
                            ) : (
                              <span>Seleziona data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date('1900-01-01')
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data Fine</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                            data-testid="button-end-date"
                          >
                            {field.value ? (
                              format(field.value, 'PPP', { locale: it })
                            ) : (
                              <span>Seleziona data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date('1900-01-01')
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Expense Items */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Voci di Spesa</h3>
              <Button 
                type="button" 
                onClick={addExpenseItem}
                size="sm"
                data-testid="button-add-expense"
              >
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi Voce
              </Button>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => (
                <Card key={field.id}>
                  <CardContent className="pt-4">
                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`items.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Descrizione</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="es. Pranzo di lavoro" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`items.${index}.category`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Categoria</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleziona categoria" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {categories.map((cat) => (
                                    <SelectItem key={cat} value={cat}>
                                      {cat}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4 items-end">
                        <FormField
                          control={form.control}
                          name={`items.${index}.amount`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Importo (€)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.01"
                                  {...field} 
                                  onChange={(e) => {
                                    field.onChange(parseFloat(e.target.value));
                                    calculateTotal();
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`items.${index}.hasReceipt`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Button
                                  type="button"
                                  variant={field.value ? 'default' : 'outline'}
                                  onClick={() => field.onChange(!field.value)}
                                  size="sm"
                                >
                                  <Receipt className="h-4 w-4 mr-2" />
                                  Scontrino
                                </Button>
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            remove(index);
                            calculateTotal();
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {fields.length === 0 && (
                <Alert>
                  <AlertDescription>
                    Nessuna voce di spesa aggiunta. Clicca su "Aggiungi Voce" per iniziare.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Total */}
            <div className="mt-6 pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">Totale</span>
                <span className="text-2xl font-bold">
                  € {form.watch('totalAmount')?.toFixed(2) || '0.00'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardContent className="pt-6">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note Aggiuntive</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Note o commenti aggiuntivi..." 
                      {...field}
                      data-testid="textarea-expense-notes"
                    />
                  </FormControl>
                  <FormDescription>
                    Aggiungi eventuali note o chiarimenti sulla nota spese
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            data-testid="button-cancel"
          >
            Annulla
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            data-testid="button-submit"
          >
            {isSubmitting ? 'Salvataggio...' : initialData?.id ? 'Aggiorna' : 'Crea Nota Spese'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Fix for missing import
import { useFieldArray } from 'react-hook-form';