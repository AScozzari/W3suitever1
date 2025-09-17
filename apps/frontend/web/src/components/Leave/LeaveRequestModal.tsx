// Leave Request Modal - Modal for creating/editing leave requests
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Upload, AlertCircle, Users, CheckCircle, XCircle } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { LeaveRequest } from '@/services/leaveService';
import { leaveService } from '@/services/leaveService';
import { 
  useCreateLeaveRequest, 
  useUpdateLeaveRequest, 
  useLeaveValidation, 
  useTeamCoverage,
  useLeavePolicies 
} from '@/hooks/useLeaveManagement';
import { motion, AnimatePresence } from 'framer-motion';

interface LeaveRequestModalProps {
  request?: LeaveRequest | null;
  onClose: () => void;
}

export function LeaveRequestModal({ request, onClose }: LeaveRequestModalProps) {
  const isEditing = !!request;
  
  // Form state
  const [formData, setFormData] = useState({
    leaveType: request?.leaveType || 'vacation',
    startDate: request?.startDate ? new Date(request.startDate) : null,
    endDate: request?.endDate ? new Date(request.endDate) : null,
    reason: request?.reason || '',
    notes: request?.notes || '',
    coveredBy: request?.coveredBy || '',
    attachments: []
  });
  
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [businessDays, setBusinessDays] = useState(0);
  
  // Hooks
  const createRequest = useCreateLeaveRequest();
  const updateRequest = useUpdateLeaveRequest();
  const { validateRequest, calculateBusinessDays } = useLeaveValidation();
  const { data: policies } = useLeavePolicies();
  const { getConflicts } = useTeamCoverage();
  
  // Calculate business days when dates change
  useEffect(() => {
    if (formData.startDate && formData.endDate && policies) {
      const days = calculateBusinessDays(formData.startDate, formData.endDate);
      setBusinessDays(days);
      
      // Check for conflicts
      const conflicts = getConflicts(formData.startDate, formData.endDate);
      if (conflicts.length > 0) {
        setErrors(prev => [
          ...prev.filter(e => !e.includes('conflitto')),
          `Attenzione: ${conflicts.length} giorni con conflitti di copertura team`
        ]);
      }
    }
  }, [formData.startDate, formData.endDate, calculateBusinessDays, getConflicts, policies]);
  
  // Validate form
  const handleValidation = () => {
    const validation = validateRequest(formData as any, null, policies);
    setErrors(validation.errors);
    return validation.valid;
  };
  
  // Handle submit
  const handleSubmit = async () => {
    if (!handleValidation()) {
      return;
    }
    
    const requestData = {
      ...formData,
      startDate: formData.startDate?.toISOString().split('T')[0],
      endDate: formData.endDate?.toISOString().split('T')[0],
      totalDays: businessDays
    };
    
    try {
      if (isEditing) {
        await updateRequest.mutateAsync({
          id: request.id,
          updates: requestData
        });
      } else {
        await createRequest.mutateAsync(requestData);
      }
      onClose();
    } catch (error) {
      console.error('Error saving request:', error);
    }
  };
  
  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...files]
    }));
  };
  
  // Leave type options
  const leaveTypes = [
    { value: 'vacation', label: 'Ferie', icon: '🏖️', requiresBalance: true },
    { value: 'sick', label: 'Malattia', icon: '🏥', requiresCertificate: true },
    { value: 'personal', label: 'Personale', icon: '👤', requiresBalance: true },
    { value: 'maternity', label: 'Maternità', icon: '👶' },
    { value: 'paternity', label: 'Paternità', icon: '👨‍👧' },
    { value: 'bereavement', label: 'Lutto', icon: '🕊️' },
    { value: 'unpaid', label: 'Non retribuito', icon: '📋' },
    { value: 'other', label: 'Altro', icon: '📝' }
  ];
  
  const selectedType = leaveTypes.find(t => t.value === formData.leaveType);
  
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {isEditing ? 'Modifica Richiesta' : 'Nuova Richiesta Ferie/Permesso'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Leave Type Selection */}
          <div className="space-y-2">
            <Label>Tipo di Permesso</Label>
            <Select
              value={formData.leaveType}
              onValueChange={(value) => setFormData(prev => ({ ...prev, leaveType: value }))}
            >
              <SelectTrigger data-testid="select-leave-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {leaveTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <span>{type.icon}</span>
                      <span>{type.label}</span>
                      {type.requiresBalance && (
                        <Badge variant="outline" className="ml-2 text-xs">Richiede saldo</Badge>
                      )}
                      {type.requiresCertificate && (
                        <Badge variant="outline" className="ml-2 text-xs">Certificato</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Date Range Selection */}
          <div className="space-y-2">
            <Label>Periodo</Label>
            <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.startDate && "text-muted-foreground"
                  )}
                  data-testid="button-date-range"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.startDate && formData.endDate ? (
                    <>
                      {format(formData.startDate, 'dd MMM yyyy', { locale: it })} - 
                      {format(formData.endDate, 'dd MMM yyyy', { locale: it })}
                    </>
                  ) : (
                    <span>Seleziona date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{
                    from: formData.startDate,
                    to: formData.endDate
                  }}
                  onSelect={(range) => {
                    setFormData(prev => ({
                      ...prev,
                      startDate: range?.from || null,
                      endDate: range?.to || null
                    }));
                  }}
                  locale={it}
                  initialFocus
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today;
                  }}
                />
              </PopoverContent>
            </Popover>
            
            {businessDays > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary">
                  {businessDays} giorni lavorativi
                </Badge>
                {policies && businessDays > policies.maximumConsecutiveDays && (
                  <Badge variant="destructive">
                    Supera il massimo di {policies.maximumConsecutiveDays} giorni consecutivi
                  </Badge>
                )}
              </div>
            )}
          </div>
          
          {/* Reason (for specific types) */}
          {['personal', 'other', 'unpaid'].includes(formData.leaveType) && (
            <div className="space-y-2">
              <Label>Motivazione *</Label>
              <Input
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Inserisci la motivazione"
                data-testid="input-reason"
              />
            </div>
          )}
          
          {/* Notes */}
          <div className="space-y-2">
            <Label>Note aggiuntive</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Eventuali note o dettagli..."
              rows={3}
              data-testid="textarea-notes"
            />
          </div>
          
          {/* Coverage */}
          <div className="space-y-2">
            <Label>Sostituto (opzionale)</Label>
            <Select
              value={formData.coveredBy}
              onValueChange={(value) => setFormData(prev => ({ ...prev, coveredBy: value }))}
            >
              <SelectTrigger data-testid="select-coverage">
                <SelectValue placeholder="Seleziona sostituto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nessuno</SelectItem>
                {/* TODO: Load team members */}
                <SelectItem value="user1">Mario Rossi</SelectItem>
                <SelectItem value="user2">Laura Bianchi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* File Upload for certificates */}
          {selectedType?.requiresCertificate && (
            <div className="space-y-2">
              <Label>Certificato medico</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <input
                  type="file"
                  id="certificate"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                />
                <label
                  htmlFor="certificate"
                  className="flex flex-col items-center cursor-pointer"
                >
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">
                    Clicca per caricare o trascina il file qui
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    PDF, JPG, PNG (max 5MB)
                  </span>
                </label>
                
                {formData.attachments.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {formData.attachments.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>{file.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Validation Errors */}
          <AnimatePresence>
            {errors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1">
                      {errors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Team Coverage Warning */}
          {formData.startDate && formData.endDate && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900">Copertura Team</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Verifica la disponibilità del team nel periodo selezionato
                  </p>
                  {/* TODO: Show team calendar preview */}
                </div>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            data-testid="button-cancel"
          >
            Annulla
          </Button>
          <Button
            className="bg-orange-600 hover:bg-orange-700"
            onClick={handleSubmit}
            disabled={createRequest.isPending || updateRequest.isPending}
            data-testid="button-submit"
          >
            {createRequest.isPending || updateRequest.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Salvataggio...
              </>
            ) : (
              isEditing ? 'Aggiorna Richiesta' : 'Invia Richiesta'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}