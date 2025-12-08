# 🚀 MCP System Architecture - Complete Design Document

## 📋 Executive Summary

Sistema MCP (Model Context Protocol) enterprise per W3 Suite che integra 6 ecosistemi esterni con 45 OUTBOUND actions + 20+ INBOUND triggers, OAuth2 flows, webhook integration, e AI orchestration.

## 🎯 Ecosistemi Supportati

1. **Google Workspace** (OAuth2)
2. **AWS Services** (IAM Credentials)
3. **Meta/Instagram** (OAuth2)
4. **Microsoft 365** (OAuth2)
5. **Stripe** (API Key + Webhooks)
6. **GTM/Analytics** (Service Account)

❌ **Rimossi:** Slack, GitHub (non richiesti)

---

## 🏗️ Backend Architecture

### **1. Node Types & Executors**

#### **OUTBOUND Nodes (45 total)**

| Ecosistema | Node Type ID | Executor ID | Descrizione |
|-----------|--------------|-------------|-------------|
| **Google Workspace (12 nodes)** ||||
| Gmail | `google-gmail-send` | `google-gmail-send-executor` | Invia email Gmail |
| Gmail | `google-gmail-search` | `google-gmail-search-executor` | Cerca email |
| Gmail | `google-gmail-delete` | `google-gmail-delete-executor` | Elimina email |
| Calendar | `google-calendar-event` | `google-calendar-event-executor` | Crea evento calendario |
| Calendar | `google-calendar-delete` | `google-calendar-delete-executor` | Elimina evento |
| Drive | `google-drive-upload` | `google-drive-upload-executor` | Carica file su Drive |
| Drive | `google-drive-download` | `google-drive-download-executor` | Scarica file da Drive |
| Drive | `google-drive-share` | `google-drive-share-executor` | Condividi file Drive |
| Drive | `google-drive-delete` | `google-drive-delete-executor` | Elimina file Drive |
| Docs | `google-docs-create` | `google-docs-create-executor` | Crea Google Doc |
| Sheets | `google-sheets-write` | `google-sheets-write-executor` | Scrivi celle Sheets |
| Sheets | `google-sheets-read` | `google-sheets-read-executor` | Leggi celle Sheets |
| **AWS Services (11 nodes)** ||||
| S3 | `aws-s3-upload` | `aws-s3-upload-executor` | Carica file S3 |
| S3 | `aws-s3-download` | `aws-s3-download-executor` | Scarica file S3 |
| S3 | `aws-s3-delete` | `aws-s3-delete-executor` | Elimina file S3 |
| S3 Tables | `aws-s3-tables-query` | `aws-s3-tables-query-executor` | Query S3 Tables |
| Lambda | `aws-lambda-invoke` | `aws-lambda-invoke-executor` | Invoca Lambda function |
| DynamoDB | `aws-dynamodb-put` | `aws-dynamodb-put-executor` | Inserisci item DynamoDB |
| DynamoDB | `aws-dynamodb-query` | `aws-dynamodb-query-executor` | Query DynamoDB |
| SQS | `aws-sqs-send` | `aws-sqs-send-executor` | Invia messaggio SQS |
| SNS | `aws-sns-publish` | `aws-sns-publish-executor` | Pubblica notifica SNS |
| CloudWatch | `aws-cloudwatch-log` | `aws-cloudwatch-log-executor` | Scrivi log CloudWatch |
| CloudWatch | `aws-cloudwatch-metric` | `aws-cloudwatch-metric-executor` | Invia metric CloudWatch |
| **Meta/Instagram (9 nodes)** ||||
| Instagram | `meta-instagram-post` | `meta-instagram-post-executor` | Pubblica post Instagram |
| Instagram | `meta-instagram-story` | `meta-instagram-story-executor` | Pubblica story Instagram |
| Instagram | `meta-instagram-delete` | `meta-instagram-delete-executor` | Elimina post Instagram |
| Facebook | `meta-facebook-post` | `meta-facebook-post-executor` | Pubblica post Facebook |
| Facebook | `meta-facebook-ad-create` | `meta-facebook-ad-create-executor` | Crea Facebook Ad |
| Facebook | `meta-facebook-insights` | `meta-facebook-insights-executor` | Recupera Facebook Insights |
| WhatsApp | `meta-whatsapp-send` | `meta-whatsapp-send-executor` | Invia messaggio WhatsApp |
| WhatsApp | `meta-whatsapp-template` | `meta-whatsapp-template-executor` | Invia template WhatsApp |
| Messenger | `meta-messenger-send` | `meta-messenger-send-executor` | Invia messaggio Messenger |
| **Microsoft 365 (7 nodes)** ||||
| Teams | `ms-teams-message` | `ms-teams-message-executor` | Invia messaggio Teams |
| Teams | `ms-teams-meeting` | `ms-teams-meeting-executor` | Crea meeting Teams |
| Outlook | `ms-outlook-send` | `ms-outlook-send-executor` | Invia email Outlook |
| OneDrive | `ms-onedrive-upload` | `ms-onedrive-upload-executor` | Carica file OneDrive |
| SharePoint | `ms-sharepoint-upload` | `ms-sharepoint-upload-executor` | Carica file SharePoint |
| Calendar | `ms-calendar-event` | `ms-calendar-event-executor` | Crea evento calendar |
| Planner | `ms-planner-task` | `ms-planner-task-executor` | Crea task Planner |
| **Stripe (6 nodes)** ||||
| Payment | `stripe-payment-create` | `stripe-payment-create-executor` | Crea pagamento |
| Payment | `stripe-payment-get` | `stripe-payment-get-executor` | Recupera payment |
| Payment | `stripe-refund-create` | `stripe-refund-create-executor` | Crea rimborso |
| Customer | `stripe-customer-create` | `stripe-customer-create-executor` | Crea cliente |
| Subscription | `stripe-subscription-create` | `stripe-subscription-create-executor` | Crea abbonamento |
| Invoice | `stripe-invoice-create` | `stripe-invoice-create-executor` | Crea fattura |

#### **INBOUND Trigger Nodes (20+ total)**

| Ecosistema | Trigger Type ID | Handler ID | Webhook Event Type |
|-----------|----------------|------------|-------------------|
| **Google Workspace** ||||
| Gmail | `google-gmail-received` | `google-gmail-received-handler` | `gmail.message_received` |
| Calendar | `google-calendar-event-trigger` | `google-calendar-event-handler` | `calendar.event_created` |
| Drive | `google-drive-file-change` | `google-drive-file-handler` | `drive.file_changed` |
| Forms | `google-form-submitted` | `google-form-submitted-handler` | `forms.response_received` |
| **AWS Services** ||||
| S3 | `aws-s3-object-created` | `aws-s3-object-created-handler` | `s3.object_created` |
| S3 | `aws-s3-object-deleted` | `aws-s3-object-deleted-handler` | `s3.object_deleted` |
| Lambda | `aws-lambda-completed` | `aws-lambda-completed-handler` | `lambda.execution_completed` |
| **Meta/Instagram** ||||
| Instagram | `meta-instagram-comment` | `meta-instagram-comment-handler` | `instagram.comment_received` |
| Instagram | `meta-instagram-dm` | `meta-instagram-dm-handler` | `instagram.message_received` |
| Facebook | `meta-facebook-lead` | `meta-facebook-lead-handler` | `facebook.lead_created` |
| WhatsApp | `meta-whatsapp-received` | `meta-whatsapp-received-handler` | `whatsapp.message_received` |
| **Microsoft 365** ||||
| Outlook | `ms-outlook-received` | `ms-outlook-received-handler` | `outlook.mail_received` |
| Teams | `ms-teams-message` | `ms-teams-message-handler` | `teams.message_posted` |
| Calendar | `ms-calendar-event-trigger` | `ms-calendar-event-handler` | `calendar.event_created` |
| **Stripe** ||||
| Payment | `stripe-payment-success` | `stripe-payment-success-handler` | `payment_intent.succeeded` |
| Payment | `stripe-payment-failed` | `stripe-payment-failed-handler` | `payment_intent.payment_failed` |
| Subscription | `stripe-subscription-created` | `stripe-subscription-created-handler` | `customer.subscription.created` |
| Invoice | `stripe-invoice-paid` | `stripe-invoice-paid-handler` | `invoice.paid` |
| **GTM/Analytics** ||||
| GA4 | `gtm-ga4-event` | `gtm-ga4-event-handler` | `ga4.event_tracked` |
| Conversion | `gtm-conversion` | `gtm-conversion-handler` | `gtm.conversion_completed` |

### **2. Webhook Integration**

#### **Webhook Endpoints**

```
POST /api/webhooks/mcp/google/:tenantId
POST /api/webhooks/mcp/aws/:tenantId
POST /api/webhooks/mcp/meta/:tenantId
POST /api/webhooks/mcp/microsoft/:tenantId
POST /api/webhooks/mcp/stripe/:tenantId
POST /api/webhooks/mcp/gtm/:tenantId
```

#### **Webhook → Workflow Trigger Flow**

```
1. External service sends webhook → POST /api/webhooks/mcp/:ecosystem/:tenantId
2. WebhookService validates signature + stores in webhook_events table
3. Match workflow_triggers by (tenantId, source='mcp-:ecosystem', eventType)
4. Create workflow_instance linked to webhook_event
5. Execute workflow with webhook payload as input
```

#### **Database Schema Updates Needed**

```typescript
// workflow_triggers table - Add MCP sources
triggerType: 'webhook' | 'mcp-google' | 'mcp-aws' | 'mcp-meta' | 'mcp-microsoft' | 'mcp-stripe' | 'mcp-gtm'

// webhook_events table - Already supports any source
source: 'mcp-google' | 'mcp-aws' | 'mcp-meta' | 'mcp-microsoft' | 'mcp-stripe' | 'mcp-gtm'
eventType: 'gmail.message_received' | 's3.object_created' | 'instagram.comment_received' | etc.
```

### **3. OAuth & Credentials Management**

#### **OAuth2 Flows (already implemented pattern)**

| Ecosistema | Client ID Secret | Scopes | Implemented |
|-----------|-----------------|--------|-------------|
| Google | GOOGLE_CLIENT_ID/SECRET | gmail, drive, calendar, docs, sheets | ✅ Yes |
| Meta | META_APP_ID/SECRET | instagram_basic, instagram_content_publish, pages_manage_posts | ❌ No |
| Microsoft | MS_CLIENT_ID/SECRET | Mail.Send, Calendars.ReadWrite, Files.ReadWrite, Chat.ReadWrite | ❌ No |

#### **API Key/Credentials (encryption needed)**

| Ecosistema | Credentials Type | Storage |
|-----------|-----------------|---------|
| AWS | Access Key + Secret Key + Region | Encrypted in mcp_server_credentials |
| Stripe | Secret Key + Webhook Secret | Encrypted in mcp_server_credentials |
| GTM | Service Account JSON | Encrypted in mcp_server_credentials |

---

## 🎨 Frontend Architecture

### **1. Settings Tab - Workflow Builder**

**Location:** WorkflowBuilder component → New Tab "Settings"

**Structure:**
```typescript
<Tabs>
  <TabsList>
    <TabsTrigger value="canvas">Canvas</TabsTrigger>
    <TabsTrigger value="nodes">Nodes</TabsTrigger>
    <TabsTrigger value="settings">⚙️ Settings</TabsTrigger>
    <TabsTrigger value="debug">Debug</TabsTrigger>
  </TabsList>
  
  <TabsContent value="settings">
    <MCPIntegrationsSettings />
  </TabsContent>
</Tabs>
```

**MCPIntegrationsSettings Component:**
```typescript
interface MCPEcosystem {
  id: 'google' | 'aws' | 'meta' | 'microsoft' | 'stripe' | 'gtm';
  name: string;
  status: 'connected' | 'configuring' | 'error' | 'disconnected';
  authType: 'oauth2' | 'credentials' | 'api_key';
  connectedAs?: string; // email or account name
  scopes?: string[];
  webhookUrl?: string;
  lastUsed?: Date;
}

<div className="space-y-6">
  {ecosystems.map(ecosystem => (
    <Card key={ecosystem.id}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <EcosystemIcon ecosystem={ecosystem.id} />
          <div>
            <h3>{ecosystem.name}</h3>
            <StatusBadge status={ecosystem.status} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {ecosystem.authType === 'oauth2' && (
          <Button onClick={() => startOAuth(ecosystem.id)}>
            Connect {ecosystem.name}
          </Button>
        )}
        {ecosystem.authType === 'credentials' && (
          <CredentialsForm ecosystem={ecosystem.id} />
        )}
        <WebhookConfig webhookUrl={ecosystem.webhookUrl} />
      </CardContent>
    </Card>
  ))}
</div>
```

### **2. Node Library - Organized by Ecosystem**

**Structure:**
```typescript
interface NodeCategory {
  ecosystem: 'google' | 'aws' | 'meta' | 'microsoft' | 'stripe' | 'gtm';
  badge: string; // '[G]', '[AWS]', '[META]', etc.
  color: string; // Brand color
  nodes: {
    outbound: NodeDefinition[];
    inbound: NodeDefinition[];
  }
}

<ScrollArea className="h-full">
  {categories.map(category => (
    <div key={category.ecosystem}>
      <CategoryHeader 
        badge={category.badge}
        color={category.color}
        name={category.name}
      />
      
      <div className="space-y-2">
        <h4>📤 Actions</h4>
        {category.nodes.outbound.map(node => (
          <NodeCard
            key={node.id}
            node={node}
            badge={category.badge}
            color={category.color}
            draggable
          />
        ))}
        
        <h4>📥 Triggers</h4>
        {category.nodes.inbound.map(node => (
          <NodeCard
            key={node.id}
            node={node}
            badge={category.badge}
            color={category.color}
            draggable
          />
        ))}
      </div>
    </div>
  ))}
</ScrollArea>
```

**Node Visual Design:**
```
┌──────────────────────┐
│  📧 [G] ✅          │  ← Badge + Status indicator
│  Gmail Send Email   │
├──────────────────────┤
│  to: {{email}}      │  ← Config preview
└──────────────────────┘
   ↑ Google Blue border
```

### **3. AI MCP Node - Simplified Modal**

**BEFORE (complex):**
```typescript
- AI Prompt
- MCP Server selection
- Credentials configuration
- Tools selection
- Model settings
```

**AFTER (simplified):**
```typescript
<Dialog>
  <DialogHeader>AI MCP Node Configuration</DialogHeader>
  <DialogContent>
    <Label>AI Instruction Prompt</Label>
    <Textarea 
      placeholder="Analyze customer request and send confirmation email via Gmail, then save contract to Google Drive..."
      rows={6}
    />
    
    <Label>AI Agent</Label>
    <Select>
      <SelectItem value="workflow-assistant">Workflow Assistant</SelectItem>
    </Select>
    
    <Label>Model Settings</Label>
    <Slider label="Temperature" min={0} max={1} step={0.1} />
    <Input label="Max Tokens" type="number" defaultValue={1000} />
    
    <Alert>
      <Info />
      <AlertDescription>
        Connected MCP Nodes (auto-detected):
        • Gmail Send Email (✅ connesso)
        • Drive Upload (✅ connesso)
        
        L'AI deciderà automaticamente quale eseguire in base al prompt.
      </AlertDescription>
    </Alert>
  </DialogContent>
</Dialog>
```

### **4. Node Configuration Modals (40+ modals)**

**Pattern per OUTBOUND nodes:**
```typescript
// Example: Gmail Send Email Modal
<Dialog>
  <DialogHeader>
    <div className="flex items-center gap-2">
      <Badge className="bg-google-blue">[G]</Badge>
      <h3>Gmail Send Email</h3>
    </div>
  </DialogHeader>
  
  <DialogContent>
    {/* Auth Status */}
    <Alert variant={isConnected ? 'success' : 'warning'}>
      {isConnected ? (
        <div>✅ Connesso come {userEmail}</div>
      ) : (
        <Button onClick={handleQuickConnect}>
          🔵 Connect Google Account
        </Button>
      )}
    </Alert>
    
    {/* Configuration Fields */}
    <Form>
      <FormField name="to">
        <Label>Destinatario</Label>
        <Input placeholder="email@example.com or {{variable}}" />
        <InfoTooltip>Supporta variabili dinamiche dal workflow</InfoTooltip>
      </FormField>
      
      <FormField name="subject">
        <Label>Oggetto</Label>
        <Input placeholder="Conferma ordine #{{orderNumber}}" />
      </FormField>
      
      <FormField name="body">
        <Label>Corpo Email</Label>
        <Textarea rows={10} />
      </FormField>
      
      <FormField name="attachments">
        <Label>Allegati</Label>
        <FileSelector variableSupport />
      </FormField>
    </Form>
  </DialogContent>
</Dialog>
```

**Pattern per INBOUND trigger nodes:**
```typescript
// Example: Stripe Payment Success Trigger
<Dialog>
  <DialogHeader>
    <div className="flex items-center gap-2">
      <Badge className="bg-stripe-purple">[💳]</Badge>
      <h3>Stripe Payment Success Trigger</h3>
    </div>
  </DialogHeader>
  
  <DialogContent>
    {/* Webhook Setup */}
    <Alert>
      <Info />
      <AlertDescription>
        Webhook URL (configuralo in Stripe Dashboard):
        <code className="block mt-2 p-2 bg-gray-100">
          https://tuodominio.replit.app/api/webhooks/mcp/stripe/{tenantId}
        </code>
        <Button onClick={copyWebhookUrl} variant="ghost">
          📋 Copy URL
        </Button>
      </AlertDescription>
    </Alert>
    
    {/* Trigger Conditions */}
    <Form>
      <FormField name="amountRange">
        <Label>Amount Range (optional)</Label>
        <div className="flex gap-2">
          <Input placeholder="Min" type="number" />
          <Input placeholder="Max" type="number" />
        </div>
        <InfoTooltip>Trigger solo per pagamenti in questo range</InfoTooltip>
      </FormField>
      
      <FormField name="currency">
        <Label>Currency (optional)</Label>
        <Select>
          <SelectItem value="">Any</SelectItem>
          <SelectItem value="eur">EUR</SelectItem>
          <SelectItem value="usd">USD</SelectItem>
        </Select>
      </FormField>
      
      <FormField name="metadata">
        <Label>Metadata Filter (optional)</Label>
        <KeyValueEditor />
        <InfoTooltip>Trigger solo se metadata contiene questi valori</InfoTooltip>
      </FormField>
    </Form>
    
    {/* Output Variables */}
    <Alert>
      <Sparkles />
      <AlertDescription>
        Variabili disponibili nel workflow:
        • {{payment.id}}
        • {{payment.amount}}
        • {{payment.customer.email}}
        • {{payment.metadata.*}}
      </AlertDescription>
    </Alert>
  </DialogContent>
</Dialog>
```

---

## 🔐 Security & Encryption

### **Two-Level Key Derivation** (already implemented)
```
Master Secret (env var)
  ↓
+ Tenant Salt
  ↓
= Tenant-Specific Key
  ↓
+ Key ID (rotation support)
  ↓
= Final Encryption Key
```

### **GDPR Compliance** (already implemented)
- destroyedAt timestamp tracking
- Key destruction audit trail
- Automatic credential invalidation

### **Webhook Signature Validation**
```typescript
// Per ogni ecosistema
validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: 'sha256' | 'sha1' | 'hmac-sha256'
): boolean
```

---

## 📊 Implementation Phases

### **FASE 1: Backend Core** ✅ COMPLETO
- [x] Database schema MCP
- [x] Two-level encryption
- [x] MCPClientService
- [x] Google OAuth flow
- [x] Executors base (mcp-connector, ai-mcp)

### **FASE 2: Settings Tab & OAuth Flows** 🔄 IN CORSO
- [ ] UI Settings Tab component
- [ ] Meta/Instagram OAuth2 implementation
- [ ] Microsoft 365 OAuth2 implementation
- [ ] AWS IAM credentials service
- [ ] Stripe API key + webhook signature

### **FASE 3: Node Types & Executors**
- [ ] Define all 40+ node type IDs
- [ ] Implement OUTBOUND executors (Gmail, S3, Instagram, Teams, Stripe)
- [ ] Implement INBOUND trigger handlers
- [ ] Register all executors in ActionExecutorsRegistry

### **FASE 4: Webhook System**
- [ ] MCP webhook endpoints (/api/webhooks/mcp/:ecosystem)
- [ ] Signature validation per ecosystem
- [ ] Webhook → Workflow trigger mapping
- [ ] Event deduplication & retry logic

### **FASE 5: UI Components**
- [ ] Node Library with ecosystem categories
- [ ] 40+ node configuration modals (OUTBOUND)
- [ ] 20+ trigger configuration modals (INBOUND)
- [ ] AI MCP modal semplificato
- [ ] Quick Connect flows

### **FASE 6: Testing & Polish**
- [ ] End-to-end test Google (OAuth + Send + Trigger)
- [ ] End-to-end test AWS (Credentials + Upload + Trigger)
- [ ] End-to-end test Stripe (API Key + Payment + Webhook)
- [ ] Error handling + retry logic
- [ ] Italian tooltips + documentation

---

## 🎯 Success Metrics

**User Experience:**
- ✅ Setup OAuth in < 30 seconds (click → authorize → done)
- ✅ Create workflow with MCP nodes in < 2 minutes
- ✅ Visual recognition immediate (badge + color coding)
- ✅ Zero configuration errors (user-friendly validation)

**Technical:**
- ✅ 100% encrypted credentials (two-level derivation)
- ✅ Webhook deduplication (no duplicate workflow triggers)
- ✅ < 500ms response time for MCP tool calls
- ✅ Auto-refresh tokens before expiry (no manual intervention)

---

## 📝 Notes & Decisions

1. **Removed Slack/GitHub:** Not required by user
2. **Reuse webhook system:** Existing webhook_events table perfect for MCP
3. **Executor pattern:** Follow existing MCPConnectorExecutor pattern
4. **UI modals:** Follow NodeConfigPanel.tsx pattern
5. **Settings centralized:** Better UX than per-node setup
6. **Quick Connect:** Fallback for rapid setup from nodes
7. **AI auto-detect:** Simplifies AI MCP modal dramatically

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-08  
**Author:** W3 Suite MCP Team  
