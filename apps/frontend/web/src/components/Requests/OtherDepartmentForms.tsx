import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FileUploadField from './FileUploadField';

type Department = 'operations' | 'support' | 'crm' | 'sales' | 'marketing';

interface DepartmentFormProps {
  department: Department;
  onSubmit: (data: any) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export default function OtherDepartmentForms({ department, onSubmit, onBack, isSubmitting }: DepartmentFormProps) {
  const [formData, setFormData] = useState<any>({
    attachments: []
  });

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const baseData = {
      department,
      category: getCategory(),
      type: formData.type || 'general',
      title: formData.title || generateTitle(),
      description: formData.description || '',
      requestData: formData,
      attachments: formData.attachments || [],
      priority: formData.priority || 'normal'
    };

    onSubmit(baseData);
  };

  const getCategory = () => {
    if (department === 'operations') return 'maintenance';
    if (department === 'support') return 'access';
    if (department === 'crm') return 'complaint';
    if (department === 'sales') return 'discount';
    if (department === 'marketing') return 'campaign';
    return 'general';
  };

  const generateTitle = () => {
    if (department === 'operations') return `Richiesta Operazioni - ${formData.asset || 'Asset'}`;
    if (department === 'support') return `Richiesta IT - ${formData.system || 'Sistema'}`;
    if (department === 'crm') return `Caso CRM - ${formData.caseType || 'Cliente'}`;
    if (department === 'sales') return `Richiesta Vendite - ${formData.opportunity || 'Cliente'}`;
    if (department === 'marketing') return `Richiesta Marketing - ${formData.requestType || 'Campagna'}`;
    return 'Nuova Richiesta';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {department === 'operations' && 'Richiesta Operazioni'}
        {department === 'support' && 'Richiesta IT Support'}
        {department === 'crm' && 'Richiesta CRM'}
        {department === 'sales' && 'Richiesta Vendite'}
        {department === 'marketing' && 'Richiesta Marketing'}
      </h3>

      {/* OPERATIONS FORM */}
      {department === 'operations' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="asset">
                Asset/Attrezzatura <span className="text-red-500">*</span>
              </Label>
              <Input
                id="asset"
                required
                value={formData.asset || ''}
                onChange={(e) => updateField('asset', e.target.value)}
                placeholder="es. Muletto, Scaffalatura, Impianto"
                data-testid="input-operations-asset"
              />
            </div>

            <div>
              <Label htmlFor="store">Punto Vendita</Label>
              <Input
                id="store"
                value={formData.store || ''}
                onChange={(e) => updateField('store', e.target.value)}
                placeholder="Nome punto vendita"
                data-testid="input-operations-store"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">
                Tipo Richiesta <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.type || ''}
                onValueChange={(value) => updateField('type', value)}
                required
              >
                <SelectTrigger data-testid="select-operations-type">
                  <SelectValue placeholder="Seleziona tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maintenance">Manutenzione</SelectItem>
                  <SelectItem value="repair">Riparazione</SelectItem>
                  <SelectItem value="logistics">Logistics</SelectItem>
                  <SelectItem value="inventory">Inventario</SelectItem>
                  <SelectItem value="facility">Facility</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">
                Priorità <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.priority || 'normal'}
                onValueChange={(value) => updateField('priority', value)}
                required
              >
                <SelectTrigger data-testid="select-operations-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Bassa</SelectItem>
                  <SelectItem value="normal">Normale</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">
              Descrizione Tecnica <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              required
              value={formData.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Dettagli del problema o intervento richiesto..."
              rows={4}
              data-testid="textarea-operations-description"
            />
          </div>

          <FileUploadField
            label="Allegati (Foto, Documenti)"
            value={formData.attachments || []}
            onChange={(files) => updateField('attachments', files)}
            accept="image/*,.pdf"
            maxFiles={5}
          />
        </>
      )}

      {/* IT SUPPORT FORM */}
      {department === 'support' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="system">
                Sistema/Applicazione <span className="text-red-500">*</span>
              </Label>
              <Input
                id="system"
                required
                value={formData.system || ''}
                onChange={(e) => updateField('system', e.target.value)}
                placeholder="es. ERP, CRM, Email, VPN"
                data-testid="input-support-system"
              />
            </div>

            <div>
              <Label htmlFor="accessType">
                Tipo Accesso <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.accessType || ''}
                onValueChange={(value) => updateField('accessType', value)}
                required
              >
                <SelectTrigger data-testid="select-support-access-type">
                  <SelectValue placeholder="Seleziona tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Nuovo Accesso</SelectItem>
                  <SelectItem value="modify">Modifica Accesso</SelectItem>
                  <SelectItem value="remove">Rimozione Accesso</SelectItem>
                  <SelectItem value="reset">Reset Password</SelectItem>
                  <SelectItem value="hardware">Hardware/Software</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="accessLevel">Livello Accesso</Label>
              <Select
                value={formData.accessLevel || ''}
                onValueChange={(value) => updateField('accessLevel', value)}
              >
                <SelectTrigger data-testid="select-support-access-level">
                  <SelectValue placeholder="Seleziona livello" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="read">Lettura</SelectItem>
                  <SelectItem value="write">Scrittura</SelectItem>
                  <SelectItem value="admin">Amministratore</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="duration">Durata Accesso</Label>
              <Input
                id="duration"
                value={formData.duration || ''}
                onChange={(e) => updateField('duration', e.target.value)}
                placeholder="es. Permanente, 6 mesi"
                data-testid="input-support-duration"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="businessReason">
              Motivazione Business <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="businessReason"
              required
              value={formData.businessReason || ''}
              onChange={(e) => updateField('businessReason', e.target.value)}
              placeholder="Giustificazione dell'accesso richiesto..."
              rows={3}
              data-testid="textarea-support-business-reason"
            />
          </div>

          <FileUploadField
            label="Allegati (Screenshot, Documentazione)"
            value={formData.attachments || []}
            onChange={(files) => updateField('attachments', files)}
            accept="image/*,.pdf"
            maxFiles={5}
          />
        </>
      )}

      {/* CRM FORM */}
      {department === 'crm' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customer">
                Cliente/Lead <span className="text-red-500">*</span>
              </Label>
              <Input
                id="customer"
                required
                value={formData.customer || ''}
                onChange={(e) => updateField('customer', e.target.value)}
                placeholder="Nome cliente o azienda"
                data-testid="input-crm-customer"
              />
            </div>

            <div>
              <Label htmlFor="caseType">
                Tipo Caso <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.caseType || ''}
                onValueChange={(value) => updateField('caseType', value)}
                required
              >
                <SelectTrigger data-testid="select-crm-case-type">
                  <SelectValue placeholder="Seleziona tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="complaint">Reclamo</SelectItem>
                  <SelectItem value="escalation">Escalation</SelectItem>
                  <SelectItem value="support">Assistenza</SelectItem>
                  <SelectItem value="refund">Rimborso</SelectItem>
                  <SelectItem value="feedback">Feedback</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="channel">Canale</Label>
              <Select
                value={formData.channel || ''}
                onValueChange={(value) => updateField('channel', value)}
              >
                <SelectTrigger data-testid="select-crm-channel">
                  <SelectValue placeholder="Seleziona canale" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">Telefono</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="chat">Chat</SelectItem>
                  <SelectItem value="instore">In Store</SelectItem>
                  <SelectItem value="social">Social Media</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="severity">Gravità</Label>
              <Select
                value={formData.severity || ''}
                onValueChange={(value) => updateField('severity', value)}
              >
                <SelectTrigger data-testid="select-crm-severity">
                  <SelectValue placeholder="Seleziona gravità" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Bassa</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="critical">Critica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="issueDescription">
              Descrizione Problema <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="issueDescription"
              required
              value={formData.issueDescription || ''}
              onChange={(e) => updateField('issueDescription', e.target.value)}
              placeholder="Dettagli del problema o richiesta cliente..."
              rows={4}
              data-testid="textarea-crm-issue-description"
            />
          </div>

          <div>
            <Label htmlFor="resolution">Risoluzione Richiesta</Label>
            <Textarea
              id="resolution"
              value={formData.resolution || ''}
              onChange={(e) => updateField('resolution', e.target.value)}
              placeholder="Soluzione proposta o richiesta..."
              rows={2}
              data-testid="textarea-crm-resolution"
            />
          </div>

          <FileUploadField
            label="Allegati (Screenshot, Email, Documenti)"
            value={formData.attachments || []}
            onChange={(files) => updateField('attachments', files)}
            accept="image/*,.pdf"
            maxFiles={5}
          />
        </>
      )}

      {/* SALES FORM */}
      {department === 'sales' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="opportunity">
                Cliente/Opportunità <span className="text-red-500">*</span>
              </Label>
              <Input
                id="opportunity"
                required
                value={formData.opportunity || ''}
                onChange={(e) => updateField('opportunity', e.target.value)}
                placeholder="Nome cliente o deal"
                data-testid="input-sales-opportunity"
              />
            </div>

            <div>
              <Label htmlFor="contractValue">
                Valore Contratto (€) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="contractValue"
                type="number"
                step="0.01"
                required
                value={formData.contractValue || ''}
                onChange={(e) => updateField('contractValue', e.target.value)}
                placeholder="10000.00"
                data-testid="input-sales-contract-value"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="discountPercentage">
                Sconto Richiesto (%) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="discountPercentage"
                type="number"
                step="0.01"
                required
                value={formData.discountPercentage || ''}
                onChange={(e) => updateField('discountPercentage', e.target.value)}
                placeholder="15"
                data-testid="input-sales-discount-percentage"
              />
            </div>

            <div>
              <Label htmlFor="requestType">Tipo Richiesta</Label>
              <Select
                value={formData.requestType || ''}
                onValueChange={(value) => updateField('requestType', value)}
              >
                <SelectTrigger data-testid="select-sales-request-type">
                  <SelectValue placeholder="Seleziona tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discount">Approvazione Sconto</SelectItem>
                  <SelectItem value="contract">Modifica Contratto</SelectItem>
                  <SelectItem value="terms">Condizioni Pagamento</SelectItem>
                  <SelectItem value="exception">Eccezione Policy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="commercialReason">
              Motivazione Commerciale <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="commercialReason"
              required
              value={formData.commercialReason || ''}
              onChange={(e) => updateField('commercialReason', e.target.value)}
              placeholder="Giustificazione commerciale della richiesta..."
              rows={4}
              data-testid="textarea-sales-commercial-reason"
            />
          </div>

          <FileUploadField
            label="Allegati (Offerta, Contratto, Email)"
            value={formData.attachments || []}
            onChange={(files) => updateField('attachments', files)}
            accept="image/*,.pdf"
            maxFiles={5}
          />
        </>
      )}

      {/* MARKETING FORM */}
      {department === 'marketing' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="requestType">
                Tipo Richiesta <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.requestType || ''}
                onValueChange={(value) => updateField('requestType', value)}
                required
              >
                <SelectTrigger data-testid="select-marketing-request-type">
                  <SelectValue placeholder="Seleziona tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="campaign">Nuova Campagna</SelectItem>
                  <SelectItem value="content">Creazione Contenuti</SelectItem>
                  <SelectItem value="branding">Materiale Branding</SelectItem>
                  <SelectItem value="event">Evento/Sponsorizzazione</SelectItem>
                  <SelectItem value="digital">Digital Marketing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="channel">Canale</Label>
              <Select
                value={formData.channel || ''}
                onValueChange={(value) => updateField('channel', value)}
              >
                <SelectTrigger data-testid="select-marketing-channel">
                  <SelectValue placeholder="Seleziona canale" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="social">Social Media</SelectItem>
                  <SelectItem value="email">Email Marketing</SelectItem>
                  <SelectItem value="web">Web/SEO</SelectItem>
                  <SelectItem value="print">Stampa</SelectItem>
                  <SelectItem value="radio">Radio/TV</SelectItem>
                  <SelectItem value="outdoor">Outdoor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="budget">Budget (€)</Label>
              <Input
                id="budget"
                type="number"
                step="0.01"
                value={formData.budget || ''}
                onChange={(e) => updateField('budget', e.target.value)}
                placeholder="5000.00"
                data-testid="input-marketing-budget"
              />
            </div>

            <div>
              <Label htmlFor="deadline">Deadline Campagna</Label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline || ''}
                onChange={(e) => updateField('deadline', e.target.value)}
                data-testid="input-marketing-deadline"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="targetAudience">Target Audience</Label>
            <Input
              id="targetAudience"
              value={formData.targetAudience || ''}
              onChange={(e) => updateField('targetAudience', e.target.value)}
              placeholder="es. Età 25-45, Professionisti, Famiglie"
              data-testid="input-marketing-target-audience"
            />
          </div>

          <div>
            <Label htmlFor="campaignDescription">
              Descrizione Campagna <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="campaignDescription"
              required
              value={formData.campaignDescription || ''}
              onChange={(e) => updateField('campaignDescription', e.target.value)}
              placeholder="Obiettivi, messaggi chiave, deliverables..."
              rows={4}
              data-testid="textarea-marketing-campaign-description"
            />
          </div>

          <FileUploadField
            label="Allegati (Brief, Mockup, Riferimenti)"
            value={formData.attachments || []}
            onChange={(files) => updateField('attachments', files)}
            accept="image/*,.pdf"
            maxFiles={10}
          />
        </>
      )}

      {/* Footer Buttons */}
      <div className="flex justify-between gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
          data-testid="button-back"
        >
          Indietro
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700"
          data-testid={`button-submit-${department}`}
        >
          {isSubmitting ? 'Invio...' : 'Invia Richiesta'}
        </Button>
      </div>
    </form>
  );
}
