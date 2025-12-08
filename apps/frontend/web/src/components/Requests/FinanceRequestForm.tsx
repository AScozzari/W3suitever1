import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, Receipt, CheckCircle } from 'lucide-react';
import FileUploadField from './FileUploadField';

type FinanceRequestType = 'expense_report' | 'expense_validation' | 'cash_discount';

interface FinanceRequestFormProps {
  onSubmit: (data: any) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export default function FinanceRequestForm({ onSubmit, onBack, isSubmitting }: FinanceRequestFormProps) {
  const [requestType, setRequestType] = useState<FinanceRequestType | ''>('');
  const [formData, setFormData] = useState<any>({
    attachments: []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const baseData = {
      department: 'finance',
      category: requestType === 'expense_report' ? 'expense_report' : 
                requestType === 'expense_validation' ? 'expense_validation' : 'discount',
      type: requestType,
      title: formData.title || generateTitle(),
      description: formData.description || '',
      requestData: {
        ...formData,
        requestType
      },
      attachments: formData.attachments || [],
      priority: formData.priority || 'normal'
    };

    onSubmit(baseData);
  };

  const generateTitle = () => {
    if (requestType === 'expense_report') return 'Nota Spesa Dipendente';
    if (requestType === 'expense_validation') return 'Validazione Nota Spesa';
    if (requestType === 'cash_discount') return 'Sconto in Cassa';
    return 'Richiesta Finance';
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  // Step 1: Select Finance Request Type
  if (!requestType) {
    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Tipo Richiesta Finance</h3>
          <p className="text-sm text-gray-600">Seleziona il tipo di richiesta finanziaria</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* Nota Spesa Dipendente */}
          <Card
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-2 border-transparent hover:border-purple-200"
            onClick={() => setRequestType('expense_report')}
            data-testid="card-finance-expense-report"
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-purple-100">
                  <Receipt className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">Nota Spesa Dipendente</h4>
                  <p className="text-sm text-gray-600">Richiesta rimborso spese sostenute</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Validazione Nota Spesa */}
          <Card
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] bg-gradient-to-br from-green-500/10 to-green-600/5 border-2 border-transparent hover:border-green-200"
            onClick={() => setRequestType('expense_validation')}
            data-testid="card-finance-expense-validation"
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-100">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">Validazione Nota Spesa</h4>
                  <p className="text-sm text-gray-600">Approvazione nota spesa esistente</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sconto in Cassa */}
          <Card
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-2 border-transparent hover:border-orange-200"
            onClick={() => setRequestType('cash_discount')}
            data-testid="card-finance-cash-discount"
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-orange-100">
                  <DollarSign className="h-6 w-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">Sconto in Cassa</h4>
                  <p className="text-sm text-gray-600">Richiesta autorizzazione sconto</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onBack} data-testid="button-back">
            Indietro
          </Button>
        </div>
      </div>
    );
  }

  // Step 2: Form based on request type
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {requestType === 'expense_report' && 'Nota Spesa Dipendente'}
          {requestType === 'expense_validation' && 'Validazione Nota Spesa'}
          {requestType === 'cash_discount' && 'Sconto in Cassa'}
        </h3>
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          onClick={() => setRequestType('')}
          data-testid="button-change-type"
        >
          Cambia Tipo
        </Button>
      </div>

      {/* EXPENSE REPORT FORM */}
      {requestType === 'expense_report' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">
                Importo Totale (€) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                required
                value={formData.amount || ''}
                onChange={(e) => updateField('amount', e.target.value)}
                placeholder="150.00"
                data-testid="input-finance-amount"
              />
            </div>

            <div>
              <Label htmlFor="expenseType">
                Tipo Spesa <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.expenseType || ''}
                onValueChange={(value) => updateField('expenseType', value)}
                required
              >
                <SelectTrigger data-testid="select-finance-expense-type">
                  <SelectValue placeholder="Seleziona tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="travel">Viaggio</SelectItem>
                  <SelectItem value="meal">Pasto</SelectItem>
                  <SelectItem value="accommodation">Alloggio</SelectItem>
                  <SelectItem value="fuel">Carburante</SelectItem>
                  <SelectItem value="supplies">Materiale d'ufficio</SelectItem>
                  <SelectItem value="entertainment">Rappresentanza</SelectItem>
                  <SelectItem value="other">Altro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="expenseDate">
                Data Spesa <span className="text-red-500">*</span>
              </Label>
              <Input
                id="expenseDate"
                type="date"
                required
                value={formData.expenseDate || ''}
                onChange={(e) => updateField('expenseDate', e.target.value)}
                data-testid="input-finance-expense-date"
              />
            </div>

            <div>
              <Label htmlFor="costCenter">Centro di Costo</Label>
              <Input
                id="costCenter"
                value={formData.costCenter || ''}
                onChange={(e) => updateField('costCenter', e.target.value)}
                placeholder="CC-001"
                data-testid="input-finance-cost-center"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Descrizione</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Dettagli della spesa..."
              rows={3}
              data-testid="textarea-finance-description"
            />
          </div>

          <FileUploadField
            label="Allegati (Ricevute/Fatture)"
            value={formData.attachments || []}
            onChange={(files) => updateField('attachments', files)}
            required
            accept="image/*,.pdf"
            maxFiles={5}
          />
        </>
      )}

      {/* EXPENSE VALIDATION FORM */}
      {requestType === 'expense_validation' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="totalAmount">
                Importo Totale (€) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="totalAmount"
                type="number"
                step="0.01"
                required
                value={formData.totalAmount || ''}
                onChange={(e) => updateField('totalAmount', e.target.value)}
                placeholder="500.00"
                data-testid="input-finance-total-amount"
              />
            </div>

            <div>
              <Label htmlFor="employeeName">Nome Dipendente</Label>
              <Input
                id="employeeName"
                value={formData.employeeName || ''}
                onChange={(e) => updateField('employeeName', e.target.value)}
                placeholder="Mario Rossi"
                data-testid="input-finance-employee-name"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="validationNotes">Note di Validazione</Label>
            <Textarea
              id="validationNotes"
              value={formData.validationNotes || ''}
              onChange={(e) => updateField('validationNotes', e.target.value)}
              placeholder="Controlli effettuati, conformità policy..."
              rows={3}
              data-testid="textarea-finance-validation-notes"
            />
          </div>

          <FileUploadField
            label="Documentazione Nota Spesa"
            value={formData.attachments || []}
            onChange={(files) => updateField('attachments', files)}
            required
            accept="image/*,.pdf"
            maxFiles={10}
          />
        </>
      )}

      {/* CASH DISCOUNT FORM */}
      {requestType === 'cash_discount' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="originalAmount">
                Importo Originale (€) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="originalAmount"
                type="number"
                step="0.01"
                required
                value={formData.originalAmount || ''}
                onChange={(e) => updateField('originalAmount', e.target.value)}
                placeholder="100.00"
                data-testid="input-finance-original-amount"
              />
            </div>

            <div>
              <Label htmlFor="discountPercentage">
                Sconto (%) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="discountPercentage"
                type="number"
                step="0.01"
                required
                value={formData.discountPercentage || ''}
                onChange={(e) => updateField('discountPercentage', e.target.value)}
                placeholder="10"
                data-testid="input-finance-discount-percentage"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="customerName">Cliente</Label>
            <Input
              id="customerName"
              value={formData.customerName || ''}
              onChange={(e) => updateField('customerName', e.target.value)}
              placeholder="Nome cliente o azienda"
              data-testid="input-finance-customer-name"
            />
          </div>

          <div>
            <Label htmlFor="reason">
              Motivazione <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              required
              value={formData.reason || ''}
              onChange={(e) => updateField('reason', e.target.value)}
              placeholder="Motivo della richiesta di sconto..."
              rows={3}
              data-testid="textarea-finance-reason"
            />
          </div>

          <FileUploadField
            label="Allegati (Ricevuta/Documentazione)"
            value={formData.attachments || []}
            onChange={(files) => updateField('attachments', files)}
            accept="image/*,.pdf"
            maxFiles={3}
          />
        </>
      )}

      {/* Footer Buttons */}
      <div className="flex justify-between gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => setRequestType('')}
          disabled={isSubmitting}
          data-testid="button-back-to-type"
        >
          Indietro
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
          data-testid="button-submit-finance"
        >
          {isSubmitting ? 'Invio...' : 'Invia Richiesta'}
        </Button>
      </div>
    </form>
  );
}
