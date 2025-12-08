import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DepartmentSelector, { type Department } from './DepartmentSelector';
import HRRequestForm from './HRRequestForm';
import FinanceRequestForm from './FinanceRequestForm';
import OtherDepartmentForms from './OtherDepartmentForms';

interface UniversalRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

export default function UniversalRequestModal({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting
}: UniversalRequestModalProps) {
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  const handleDepartmentSelect = (department: Department) => {
    setSelectedDepartment(department);
  };

  const handleBack = () => {
    setSelectedDepartment(null);
  };

  const handleSubmit = (data: any) => {
    onSubmit(data);
    // Reset on successful submit
    setSelectedDepartment(null);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset when modal closes
      setSelectedDepartment(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {!selectedDepartment ? 'Nuova Richiesta' : 'Compila Richiesta'}
          </DialogTitle>
          <DialogDescription>
            {!selectedDepartment 
              ? 'Seleziona il dipartimento di riferimento per la tua richiesta'
              : 'Compila i dettagli della richiesta'}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {/* Step 1: Department Selection */}
          {!selectedDepartment && (
            <DepartmentSelector onSelect={handleDepartmentSelect} />
          )}

          {/* Step 2: Department-Specific Form */}
          {selectedDepartment === 'hr' && (
            <HRRequestForm
              onSubmit={handleSubmit}
              onBack={handleBack}
              isSubmitting={isSubmitting}
            />
          )}

          {selectedDepartment === 'finance' && (
            <FinanceRequestForm
              onSubmit={handleSubmit}
              onBack={handleBack}
              isSubmitting={isSubmitting}
            />
          )}

          {(selectedDepartment === 'operations' || 
            selectedDepartment === 'support' || 
            selectedDepartment === 'crm' || 
            selectedDepartment === 'sales' || 
            selectedDepartment === 'marketing') && (
            <OtherDepartmentForms
              department={selectedDepartment}
              onSubmit={handleSubmit}
              onBack={handleBack}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
