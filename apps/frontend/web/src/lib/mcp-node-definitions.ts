/**
 * 🔌 MCP NODE DEFINITIONS - Model Context Protocol
 * 
 * Zero-Config Philosophy: Nodes contain ONLY business logic (to, subject, body).
 * Backend executors use magic values for technical IDs:
 * - Gmail: userId="me" (authenticated user)
 * - Calendar: calendarId="primary" (user's primary calendar)
 * - Drive: folderId="root" (user's My Drive root)
 * 
 * Node counts by ecosystem:
 * - OUTBOUND actions: Google 5, AWS 11, Meta 3, MS 8, Stripe 6, GTM 6, PostgreSQL 9, Telegram 8, WhatsApp 7, Twilio 10
 * - INBOUND triggers: Google 5, AWS 5, Meta 6, MS 4, Stripe 4, GTM 15, PostgreSQL 6
 * - TOTAL: 106 nodes (70 outbound + 36 inbound triggers)
 * - NOTE: Instagram comment reply disabled (tool not available in Instagram MCP Server)
 */

import { BaseNodeDefinition } from '../types/workflow-nodes';
import { z } from 'zod';

// 🔧 MCP Server Configuration Schema Helper
// Shared schema fragment for all OUTBOUND MCP nodes to ensure consistency
export const MCP_SERVER_CONFIG = {
  schema: {
    serverId: z.string().min(1, 'MCP Server connection required'),
    toolName: z.string().optional(), // Can be derived from node ID if not provided
  },
  defaults: {
    serverId: '',
    toolName: '',
  }
} as const;

// Helper to merge server config with node-specific config
export function withServerConfig<T extends z.ZodRawShape>(nodeSchema: T) {
  return z.object({
    ...MCP_SERVER_CONFIG.schema,
    ...nodeSchema
  });
}

// 🎨 Ecosystem Colors & Badges
export const MCP_ECOSYSTEMS = {
  google: { badge: '[G]', color: '#4285F4', name: 'Google Workspace' },
  aws: { badge: '[AWS]', color: '#FF9900', name: 'AWS Services' },
  meta: { badge: '[META]', color: '#E4405F', name: 'Meta/Instagram' },
  microsoft: { badge: '[MS]', color: '#0078D4', name: 'Microsoft 365' },
  stripe: { badge: '[STRIPE]', color: '#635BFF', name: 'Stripe' },
  gtm: { badge: '[GTM]', color: '#4CAF50', name: 'GTM/Analytics' },
  postgresql: { badge: '[PG]', color: '#336791', name: 'PostgreSQL' },
  telegram: { badge: '[TG]', color: '#0088CC', name: 'Telegram' },
  whatsapp: { badge: '[WA]', color: '#25D366', name: 'WhatsApp Business' },
  twilio: { badge: '[TWILIO]', color: '#F22F46', name: 'Twilio' }
} as const;

// 🔵 GOOGLE WORKSPACE OUTBOUND (12 nodes)
export const GOOGLE_OUTBOUND_NODES: BaseNodeDefinition[] = [
  {
    id: 'mcp-google-gmail-send',
    name: '[G] Gmail Send',
    description: 'Send email via Gmail API with attachments and templates',
    category: 'mcp-outbound',
    ecosystem: 'google',
    icon: 'Mail',
    color: MCP_ECOSYSTEMS.google.color,
    version: '1.1.0', // Updated for server config support
    toolName: 'gmail_send', // MCP tool name for server filtering
    configSchema: withServerConfig({
      to: z.array(z.string().email()),
      subject: z.string(),
      body: z.string(),
      attachments: z.array(z.string()).optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, to: [], subject: '', body: '' }
  },
  {
    id: 'mcp-google-drive-upload',
    name: '[G] Drive Upload',
    description: 'Upload file to Google Drive folder',
    category: 'mcp-outbound',
    ecosystem: 'google',
    icon: 'Upload',
    color: MCP_ECOSYSTEMS.google.color,
    version: '1.1.0',
    configSchema: withServerConfig({
      fileName: z.string(),
      fileContent: z.string(),
      folderId: z.string().optional(),
      mimeType: z.string().optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, fileName: '', fileContent: '' }
  },
  {
    id: 'mcp-google-calendar-create',
    name: '[G] Calendar Create Event',
    description: 'Create Google Calendar event with attendees',
    category: 'mcp-outbound',
    ecosystem: 'google',
    icon: 'Calendar',
    color: MCP_ECOSYSTEMS.google.color,
    version: '1.1.0',
    configSchema: withServerConfig({
      summary: z.string(),
      startDateTime: z.string(),
      endDateTime: z.string(),
      calendarId: z.string().optional(), // Default: 'primary' (backend magic value)
      attendees: z.array(z.string().email()).optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, summary: '', startDateTime: '', endDateTime: '' }
  },
  {
    id: 'mcp-google-sheets-append',
    name: '[G] Sheets Append Row',
    description: 'Append row to Google Sheets spreadsheet',
    category: 'mcp-outbound',
    ecosystem: 'google',
    icon: 'Table',
    color: MCP_ECOSYSTEMS.google.color,
    version: '1.1.0',
    configSchema: withServerConfig({
      spreadsheetId: z.string(),
      range: z.string(),
      values: z.array(z.array(z.any()))
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, spreadsheetId: '', range: 'Sheet1!A1', values: [[]] }
  },
  {
    id: 'mcp-google-docs-create',
    name: '[G] Docs Create Document',
    description: 'Create new Google Doc from template or content',
    category: 'mcp-outbound',
    ecosystem: 'google',
    icon: 'FileText',
    color: MCP_ECOSYSTEMS.google.color,
    version: '1.1.0',
    configSchema: withServerConfig({
      title: z.string(),
      content: z.string()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, title: '', content: '' }
  }
];

// 🟠 AWS OUTBOUND (11 nodes)
export const AWS_OUTBOUND_NODES: BaseNodeDefinition[] = [
  {
    id: 'mcp-aws-s3-upload',
    name: '[AWS] S3 Upload Object',
    description: 'Upload file to S3 bucket with ACL and metadata',
    category: 'mcp-outbound',
    ecosystem: 'aws',
    icon: 'Database',
    color: MCP_ECOSYSTEMS.aws.color,
    version: '1.1.0',
    configSchema: withServerConfig({
      bucket: z.string(),
      key: z.string(),
      body: z.string(),
      contentType: z.string().optional(),
      acl: z.string().optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, bucket: '', key: '', body: '' }
  },
  {
    id: 'mcp-aws-lambda-invoke',
    name: '[AWS] Lambda Invoke',
    description: 'Invoke AWS Lambda function with payload',
    category: 'mcp-outbound',
    ecosystem: 'aws',
    icon: 'Zap',
    color: MCP_ECOSYSTEMS.aws.color,
    version: '1.1.0',
    configSchema: withServerConfig({
      functionName: z.string(),
      payload: z.record(z.any()),
      invocationType: z.enum(['RequestResponse', 'Event', 'DryRun']).optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, functionName: '', payload: {}, invocationType: 'RequestResponse' }
  },
  {
    id: 'mcp-aws-sns-publish',
    name: '[AWS] SNS Publish Message',
    description: 'Publish message to SNS topic for fan-out',
    category: 'mcp-outbound',
    ecosystem: 'aws',
    icon: 'MessageSquare',
    color: MCP_ECOSYSTEMS.aws.color,
    version: '1.1.0',
    configSchema: withServerConfig({
      topicArn: z.string(),
      message: z.string(),
      subject: z.string().optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, topicArn: '', message: '' }
  },
  {
    id: 'mcp-aws-sqs-send',
    name: '[AWS] SQS Send Message',
    description: 'Send message to SQS queue for processing',
    category: 'mcp-outbound',
    ecosystem: 'aws',
    icon: 'Inbox',
    color: MCP_ECOSYSTEMS.aws.color,
    version: '1.1.0',
    configSchema: withServerConfig({
      queueUrl: z.string(),
      messageBody: z.string(),
      delaySeconds: z.number().optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, queueUrl: '', messageBody: '' }
  },
  {
    id: 'mcp-aws-dynamodb-put',
    name: '[AWS] DynamoDB Put Item',
    description: 'Insert/update item in DynamoDB table',
    category: 'mcp-outbound',
    ecosystem: 'aws',
    icon: 'Database',
    color: MCP_ECOSYSTEMS.aws.color,
    version: '1.1.0',
    configSchema: withServerConfig({
      tableName: z.string(),
      item: z.record(z.any())
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, tableName: '', item: {} }
  }
];

// 🔴 META/INSTAGRAM OUTBOUND (9 nodes)
export const META_OUTBOUND_NODES: BaseNodeDefinition[] = [
  {
    id: 'mcp-meta-instagram-post',
    name: '[META] Instagram Create Post',
    description: 'Publish image/carousel post to Instagram Feed (Instagram MCP Server)',
    category: 'mcp-outbound',
    ecosystem: 'meta',
    icon: 'Image',
    color: MCP_ECOSYSTEMS.meta.color,
    version: '1.2.0', // Updated with toolName
    toolName: 'publish_media', // Instagram MCP server (jlbadano)
    configSchema: withServerConfig({
      instagramAccountId: z.string().optional(), // Backend uses 'primary' (first connected account) if omitted
      caption: z.string(),
      imageUrl: z.string().url(),
      coverUrl: z.string().url().optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, caption: '', imageUrl: '' }
  },
  {
    id: 'mcp-meta-instagram-story',
    name: '[META] Instagram Publish Story',
    description: 'Publish photo/video story (24h lifespan) (Instagram MCP Server)',
    category: 'mcp-outbound',
    ecosystem: 'meta',
    icon: 'Camera',
    color: MCP_ECOSYSTEMS.meta.color,
    version: '1.2.0',
    toolName: 'publish_media', // Instagram MCP server (jlbadano) - same tool, different media type
    configSchema: withServerConfig({
      instagramAccountId: z.string().optional(), // Backend uses 'primary' (first connected account) if omitted
      mediaUrl: z.string().url(),
      mediaType: z.enum(['IMAGE', 'VIDEO']),
      coverUrl: z.string().url().optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, mediaUrl: '', mediaType: 'IMAGE' }
  },
  // NOTE: Instagram MCP Server (jlbadano) does NOT have a dedicated "reply to comment" tool
  // Available tools are: get_profile_info, get_media_posts, get_media_insights, publish_media, 
  // get_engagement_metrics, list_facebook_pages, read_direct_messages, send_direct_message
  // Comment moderation might require Graph API direct access or Meta Ads MCP
  // Keeping this node disabled until proper tool is identified or added to Instagram MCP
  /*{
    id: 'mcp-meta-instagram-comment',
    name: '[META] Instagram Reply Comment',
    description: 'Reply to Instagram comment with text (DISABLED - tool not available in Instagram MCP Server)',
    category: 'mcp-outbound',
    ecosystem: 'meta',
    icon: 'MessageCircle',
    color: MCP_ECOSYSTEMS.meta.color,
    version: '1.2.0',
    toolName: 'DISABLED', // Instagram MCP server does not support comment replies
    configSchema: withServerConfig({
      instagramAccountId: z.string().optional(),
      commentId: z.string(),
      message: z.string()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, commentId: '', message: '' }
  },*/
  {
    id: 'mcp-meta-instagram-message',
    name: '[META] Instagram Send DM',
    description: 'Send direct message to Instagram user (Instagram MCP Server)',
    category: 'mcp-outbound',
    ecosystem: 'meta',
    icon: 'Send',
    color: MCP_ECOSYSTEMS.meta.color,
    version: '1.2.0',
    toolName: 'send_direct_message', // Instagram MCP server (jlbadano)
    configSchema: withServerConfig({
      instagramAccountId: z.string().optional(), // Backend uses 'primary' (first connected account) if omitted
      recipientId: z.string(),
      message: z.string()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, recipientId: '', message: '' }
  }
];

// 🟣 MICROSOFT 365 OUTBOUND (7 nodes)
export const MICROSOFT_OUTBOUND_NODES: BaseNodeDefinition[] = [
  {
    id: 'mcp-ms-outlook-send',
    name: '[MS] Outlook Send Email',
    description: 'Send email via Outlook with attachments',
    category: 'mcp-outbound',
    ecosystem: 'microsoft',
    icon: 'Mail',
    color: MCP_ECOSYSTEMS.microsoft.color,
    version: '1.1.0',
    configSchema: withServerConfig({
      to: z.array(z.string().email()),
      subject: z.string(),
      body: z.string(),
      bodyType: z.enum(['Text', 'HTML']).optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, to: [], subject: '', body: '', bodyType: 'HTML' }
  },
  {
    id: 'mcp-ms-onedrive-upload',
    name: '[MS] OneDrive Upload File',
    description: 'Upload file to OneDrive folder',
    category: 'mcp-outbound',
    ecosystem: 'microsoft',
    icon: 'Upload',
    color: MCP_ECOSYSTEMS.microsoft.color,
    version: '1.1.0',
    configSchema: withServerConfig({
      fileName: z.string(),
      fileContent: z.string(),
      folderId: z.string().optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, fileName: '', fileContent: '' }
  },
  {
    id: 'mcp-ms-teams-message',
    name: '[MS] Teams Send Message',
    description: 'Send message to Teams channel or chat',
    category: 'mcp-outbound',
    ecosystem: 'microsoft',
    icon: 'MessageSquare',
    color: MCP_ECOSYSTEMS.microsoft.color,
    version: '1.1.0',
    configSchema: withServerConfig({
      channelId: z.string(),
      message: z.string()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, channelId: '', message: '' }
  },
  {
    id: 'mcp-ms-sharepoint-upload',
    name: '[MS] SharePoint Upload',
    description: 'Upload document to SharePoint site library',
    category: 'mcp-outbound',
    ecosystem: 'microsoft',
    icon: 'Upload',
    color: MCP_ECOSYSTEMS.microsoft.color,
    version: '1.0.0',
    configSchema: withServerConfig({
      siteId: z.string(),
      fileName: z.string(),
      fileContent: z.string(),
      folderId: z.string().optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, siteId: '', fileName: '', fileContent: '' }
  },
  {
    id: 'mcp-ms-planner-create-task',
    name: '[MS] Planner Create Task',
    description: 'Create task in Microsoft Planner board',
    category: 'mcp-outbound',
    ecosystem: 'microsoft',
    icon: 'CheckSquare',
    color: MCP_ECOSYSTEMS.microsoft.color,
    version: '1.0.0',
    configSchema: withServerConfig({
      planId: z.string(),
      title: z.string(),
      dueDate: z.string().optional(),
      assignedTo: z.array(z.string()).optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, planId: '', title: '' }
  },
  {
    id: 'mcp-ms-todo-add-item',
    name: '[MS] To Do Add Item',
    description: 'Add task to Microsoft To Do list',
    category: 'mcp-outbound',
    ecosystem: 'microsoft',
    icon: 'ListTodo',
    color: MCP_ECOSYSTEMS.microsoft.color,
    version: '1.0.0',
    configSchema: withServerConfig({
      listId: z.string(),
      title: z.string(),
      dueDate: z.string().optional(),
      reminder: z.string().optional(),
      importance: z.enum(['low', 'normal', 'high']).optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, listId: '', title: '' }
  },
  {
    id: 'mcp-ms-excel-write-cells',
    name: '[MS] Excel Write Cells',
    description: 'Write data to Excel spreadsheet cells',
    category: 'mcp-outbound',
    ecosystem: 'microsoft',
    icon: 'Table',
    color: MCP_ECOSYSTEMS.microsoft.color,
    version: '1.0.0',
    configSchema: withServerConfig({
      workbookId: z.string(),
      worksheetName: z.string(),
      range: z.string(),
      values: z.array(z.array(z.any()))
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, workbookId: '', worksheetName: '', range: 'A1', values: [[]] }
  },
  {
    id: 'mcp-ms-onenote-create-page',
    name: '[MS] OneNote Create Page',
    description: 'Create new page in OneNote notebook',
    category: 'mcp-outbound',
    ecosystem: 'microsoft',
    icon: 'FileText',
    color: MCP_ECOSYSTEMS.microsoft.color,
    version: '1.0.0',
    configSchema: withServerConfig({
      sectionId: z.string(),
      title: z.string(),
      content: z.string()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, sectionId: '', title: '', content: '' }
  }
];

// 🟪 STRIPE OUTBOUND (6 nodes)
export const STRIPE_OUTBOUND_NODES: BaseNodeDefinition[] = [
  {
    id: 'mcp-stripe-payment-create',
    name: '[STRIPE] Create Payment Intent',
    description: 'Create Stripe payment intent for checkout',
    category: 'mcp-outbound',
    ecosystem: 'stripe',
    icon: 'CreditCard',
    color: MCP_ECOSYSTEMS.stripe.color,
    version: '1.1.0',
    configSchema: withServerConfig({
      amount: z.number(),
      currency: z.string(),
      description: z.string().optional(),
      metadata: z.record(z.string()).optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, amount: 0, currency: 'eur' }
  },
  {
    id: 'mcp-stripe-subscription-create',
    name: '[STRIPE] Create Subscription',
    description: 'Create recurring subscription for customer',
    category: 'mcp-outbound',
    ecosystem: 'stripe',
    icon: 'Repeat',
    color: MCP_ECOSYSTEMS.stripe.color,
    version: '1.1.0',
    configSchema: withServerConfig({
      customerId: z.string(),
      priceId: z.string(),
      trialDays: z.number().optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, customerId: '', priceId: '' }
  },
  {
    id: 'mcp-stripe-invoice-create',
    name: '[STRIPE] Create Invoice',
    description: 'Generate invoice for customer with line items',
    category: 'mcp-outbound',
    ecosystem: 'stripe',
    icon: 'FileText',
    color: MCP_ECOSYSTEMS.stripe.color,
    version: '1.1.0',
    configSchema: withServerConfig({
      customerId: z.string(),
      items: z.array(z.object({
        description: z.string(),
        amount: z.number(),
        quantity: z.number()
      }))
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, customerId: '', items: [] }
  }
];

// 🔵 GOOGLE WORKSPACE INBOUND (5 triggers)
export const GOOGLE_INBOUND_TRIGGERS: BaseNodeDefinition[] = [
  {
    id: 'mcp-trigger-gmail-received',
    name: '[G] Gmail Received',
    description: 'Triggered when new email received in Gmail',
    category: 'mcp-inbound',
    ecosystem: 'google',
    icon: 'Mail',
    color: MCP_ECOSYSTEMS.google.color,
    version: '1.0.0',
    configSchema: z.object({
      filters: z.object({
        from: z.string().optional(),
        subject: z.string().optional(),
        labelIds: z.array(z.string()).optional()
      }).optional()
    }),
    defaultConfig: { filters: {} }
  },
  {
    id: 'mcp-trigger-drive-file-created',
    name: '[G] Drive File Created',
    description: 'Triggered when file created in Google Drive',
    category: 'mcp-inbound',
    ecosystem: 'google',
    icon: 'FileUp',
    color: MCP_ECOSYSTEMS.google.color,
    version: '1.0.0',
    configSchema: z.object({
      folderId: z.string().optional(),
      mimeType: z.string().optional()
    }),
    defaultConfig: {}
  },
  {
    id: 'mcp-trigger-calendar-event-created',
    name: '[G] Calendar Event Created',
    description: 'Triggered when event created in Google Calendar',
    category: 'mcp-inbound',
    ecosystem: 'google',
    icon: 'Calendar',
    color: MCP_ECOSYSTEMS.google.color,
    version: '1.0.0',
    configSchema: z.object({
      calendarId: z.string().optional()
    }),
    defaultConfig: {}
  },
  {
    id: 'mcp-trigger-sheets-row-added',
    name: '[G] Sheets Row Added',
    description: 'Triggered when row added to Google Sheets spreadsheet',
    category: 'mcp-inbound',
    ecosystem: 'google',
    icon: 'Table',
    color: MCP_ECOSYSTEMS.google.color,
    version: '1.0.0',
    configSchema: z.object({
      spreadsheetId: z.string(),
      sheetName: z.string().optional()
    }),
    defaultConfig: { spreadsheetId: '' }
  },
  {
    id: 'mcp-trigger-docs-document-created',
    name: '[G] Docs Document Created',
    description: 'Triggered when document created in Google Docs',
    category: 'mcp-inbound',
    ecosystem: 'google',
    icon: 'FileText',
    color: MCP_ECOSYSTEMS.google.color,
    version: '1.0.0',
    configSchema: z.object({
      folderId: z.string().optional()
    }),
    defaultConfig: {}
  }
];

// 🟠 AWS INBOUND (5 triggers)
export const AWS_INBOUND_TRIGGERS: BaseNodeDefinition[] = [
  {
    id: 'mcp-trigger-s3-object-created',
    name: '[AWS] S3 Object Created',
    description: 'Triggered when object uploaded to S3 bucket',
    category: 'mcp-inbound',
    ecosystem: 'aws',
    icon: 'Upload',
    color: MCP_ECOSYSTEMS.aws.color,
    version: '1.0.0',
    configSchema: z.object({
      bucket: z.string(),
      prefix: z.string().optional()
    }),
    defaultConfig: { bucket: '' }
  },
  {
    id: 'mcp-trigger-sqs-message-received',
    name: '[AWS] SQS Message Received',
    description: 'Triggered when message arrives in SQS queue',
    category: 'mcp-inbound',
    ecosystem: 'aws',
    icon: 'Inbox',
    color: MCP_ECOSYSTEMS.aws.color,
    version: '1.0.0',
    configSchema: z.object({
      queueUrl: z.string()
    }),
    defaultConfig: { queueUrl: '' }
  }
];

// 🔴 META/INSTAGRAM INBOUND (6 triggers)
export const META_INBOUND_TRIGGERS: BaseNodeDefinition[] = [
  {
    id: 'mcp-trigger-instagram-comment',
    name: '[META] Instagram Comment',
    description: 'Triggered when comment posted on Instagram',
    category: 'mcp-inbound',
    ecosystem: 'meta',
    icon: 'MessageCircle',
    color: MCP_ECOSYSTEMS.meta.color,
    version: '1.0.0',
    configSchema: z.object({
      mediaId: z.string().optional()
    }),
    defaultConfig: {}
  },
  {
    id: 'mcp-trigger-instagram-message',
    name: '[META] Instagram Direct Message',
    description: 'Triggered when DM received on Instagram',
    category: 'mcp-inbound',
    ecosystem: 'meta',
    icon: 'Send',
    color: MCP_ECOSYSTEMS.meta.color,
    version: '1.0.0',
    configSchema: z.object({
      recipientId: z.string().optional()
    }),
    defaultConfig: {}
  },
  {
    id: 'mcp-trigger-instagram-post-published',
    name: '[META] Instagram Post Published',
    description: 'Triggered when post published on Instagram',
    category: 'mcp-inbound',
    ecosystem: 'meta',
    icon: 'Image',
    color: MCP_ECOSYSTEMS.meta.color,
    version: '1.0.0',
    configSchema: z.object({
      accountId: z.string().optional()
    }),
    defaultConfig: {}
  },
  {
    id: 'mcp-trigger-instagram-story-published',
    name: '[META] Instagram Story Published',
    description: 'Triggered when story published on Instagram',
    category: 'mcp-inbound',
    ecosystem: 'meta',
    icon: 'Camera',
    color: MCP_ECOSYSTEMS.meta.color,
    version: '1.0.0',
    configSchema: z.object({
      accountId: z.string().optional()
    }),
    defaultConfig: {}
  },
  {
    id: 'mcp-trigger-meta-ads-insights',
    name: '[META] Ads Insights Updated',
    description: 'Triggered when Meta Ads insights data updated',
    category: 'mcp-inbound',
    ecosystem: 'meta',
    icon: 'BarChart',
    color: MCP_ECOSYSTEMS.meta.color,
    version: '1.0.0',
    configSchema: z.object({
      campaignId: z.string().optional(),
      metric: z.enum(['impressions', 'clicks', 'conversions', 'spend']).optional()
    }),
    defaultConfig: {}
  },
  {
    id: 'mcp-trigger-instagram-engagement',
    name: '[META] Instagram Engagement',
    description: 'Triggered when post receives like, share, or save',
    category: 'mcp-inbound',
    ecosystem: 'meta',
    icon: 'Heart',
    color: MCP_ECOSYSTEMS.meta.color,
    version: '1.0.0',
    configSchema: z.object({
      mediaId: z.string().optional(),
      engagementType: z.enum(['like', 'share', 'save']).optional()
    }),
    defaultConfig: {}
  }
];

// 🟣 MICROSOFT 365 INBOUND (4 triggers)
export const MICROSOFT_INBOUND_TRIGGERS: BaseNodeDefinition[] = [
  {
    id: 'mcp-trigger-outlook-email-received',
    name: '[MS] Outlook Email Received',
    description: 'Triggered when email received in Outlook',
    category: 'mcp-inbound',
    ecosystem: 'microsoft',
    icon: 'Mail',
    color: MCP_ECOSYSTEMS.microsoft.color,
    version: '1.0.0',
    configSchema: z.object({
      from: z.string().optional(),
      subject: z.string().optional()
    }),
    defaultConfig: {}
  },
  {
    id: 'mcp-trigger-teams-message-received',
    name: '[MS] Teams Message Received',
    description: 'Triggered when message posted in Teams channel',
    category: 'mcp-inbound',
    ecosystem: 'microsoft',
    icon: 'MessageSquare',
    color: MCP_ECOSYSTEMS.microsoft.color,
    version: '1.0.0',
    configSchema: z.object({
      channelId: z.string().optional(),
      teamId: z.string().optional()
    }),
    defaultConfig: {}
  },
  {
    id: 'mcp-trigger-sharepoint-file-created',
    name: '[MS] SharePoint File Created',
    description: 'Triggered when file created in SharePoint',
    category: 'mcp-inbound',
    ecosystem: 'microsoft',
    icon: 'FileUp',
    color: MCP_ECOSYSTEMS.microsoft.color,
    version: '1.0.0',
    configSchema: z.object({
      siteId: z.string().optional(),
      listId: z.string().optional()
    }),
    defaultConfig: {}
  },
  {
    id: 'mcp-trigger-onedrive-file-modified',
    name: '[MS] OneDrive File Modified',
    description: 'Triggered when file modified in OneDrive',
    category: 'mcp-inbound',
    ecosystem: 'microsoft',
    icon: 'RefreshCw',
    color: MCP_ECOSYSTEMS.microsoft.color,
    version: '1.0.0',
    configSchema: z.object({
      folderId: z.string().optional()
    }),
    defaultConfig: {}
  }
];

// 🟪 STRIPE INBOUND (4 triggers)
export const STRIPE_INBOUND_TRIGGERS: BaseNodeDefinition[] = [
  {
    id: 'mcp-trigger-stripe-payment-succeeded',
    name: '[STRIPE] Payment Succeeded',
    description: 'Triggered when payment succeeds',
    category: 'mcp-inbound',
    ecosystem: 'stripe',
    icon: 'CheckCircle',
    color: MCP_ECOSYSTEMS.stripe.color,
    version: '1.0.0',
    configSchema: z.object({
      minAmount: z.number().optional(),
      currency: z.string().optional()
    }),
    defaultConfig: {}
  },
  {
    id: 'mcp-trigger-stripe-payment-failed',
    name: '[STRIPE] Payment Failed',
    description: 'Triggered when payment fails',
    category: 'mcp-inbound',
    ecosystem: 'stripe',
    icon: 'XCircle',
    color: MCP_ECOSYSTEMS.stripe.color,
    version: '1.0.0',
    configSchema: z.object({
      failureCode: z.string().optional()
    }),
    defaultConfig: {}
  },
  {
    id: 'mcp-trigger-stripe-subscription-created',
    name: '[STRIPE] Subscription Created',
    description: 'Triggered when customer subscription created',
    category: 'mcp-inbound',
    ecosystem: 'stripe',
    icon: 'RefreshCcw',
    color: MCP_ECOSYSTEMS.stripe.color,
    version: '1.0.0',
    configSchema: z.object({
      priceId: z.string().optional(),
      planName: z.string().optional()
    }),
    defaultConfig: {}
  },
  {
    id: 'mcp-trigger-stripe-invoice-paid',
    name: '[STRIPE] Invoice Paid',
    description: 'Triggered when invoice successfully paid',
    category: 'mcp-inbound',
    ecosystem: 'stripe',
    icon: 'DollarSign',
    color: MCP_ECOSYSTEMS.stripe.color,
    version: '1.0.0',
    configSchema: z.object({
      customerId: z.string().optional(),
      minAmount: z.number().optional()
    }),
    defaultConfig: {}
  }
];

// 🟢 GTM/ANALYTICS OUTBOUND (6 actions)
export const GTM_OUTBOUND_NODES: BaseNodeDefinition[] = [
  {
    id: 'mcp-gtm-track-event',
    name: '[GTM] Track Event',
    description: 'Track custom event via Google Analytics',
    category: 'mcp-outbound',
    ecosystem: 'gtm',
    icon: 'Activity',
    color: MCP_ECOSYSTEMS.gtm.color,
    version: '1.1.0',
    configSchema: withServerConfig({
      eventName: z.string(),
      eventCategory: z.string().optional(),
      eventLabel: z.string().optional(),
      eventValue: z.number().optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, eventName: '' }
  },
  {
    id: 'mcp-gtm-track-pageview',
    name: '[GTM] Track Page View',
    description: 'Track page view via Google Analytics',
    category: 'mcp-outbound',
    ecosystem: 'gtm',
    icon: 'Eye',
    color: MCP_ECOSYSTEMS.gtm.color,
    version: '1.1.0',
    configSchema: withServerConfig({
      pageUrl: z.string(),
      pageTitle: z.string().optional(),
      referrer: z.string().optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, pageUrl: '' }
  },
  {
    id: 'mcp-gtm-track-conversion',
    name: '[GTM] Track Conversion',
    description: 'Track conversion event via Google Analytics',
    category: 'mcp-outbound',
    ecosystem: 'gtm',
    icon: 'Target',
    color: MCP_ECOSYSTEMS.gtm.color,
    version: '1.1.0',
    configSchema: withServerConfig({
      conversionLabel: z.string(),
      conversionValue: z.number().optional(),
      currency: z.string().optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, conversionLabel: '' }
  },
  {
    id: 'mcp-gtm-setup-tag',
    name: '[GTM] Setup Tag',
    description: 'Create GTM tag configuration',
    category: 'mcp-outbound',
    ecosystem: 'gtm',
    icon: 'Tags',
    color: MCP_ECOSYSTEMS.gtm.color,
    version: '1.1.0',
    configSchema: withServerConfig({
      tagName: z.string(),
      tagType: z.string(),
      accountId: z.string(),
      containerId: z.string()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, tagName: '', tagType: '', accountId: '', containerId: '' }
  },
  {
    id: 'mcp-gtm-update-tag',
    name: '[GTM] Update Tag',
    description: 'Update existing GTM tag',
    category: 'mcp-outbound',
    ecosystem: 'gtm',
    icon: 'Edit',
    color: MCP_ECOSYSTEMS.gtm.color,
    version: '1.1.0',
    configSchema: withServerConfig({
      tagId: z.string(),
      tagName: z.string().optional(),
      tagConfiguration: z.record(z.any()).optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, tagId: '' }
  },
  {
    id: 'mcp-gtm-delete-tag',
    name: '[GTM] Delete Tag',
    description: 'Delete GTM tag',
    category: 'mcp-outbound',
    ecosystem: 'gtm',
    icon: 'Trash2',
    color: MCP_ECOSYSTEMS.gtm.color,
    version: '1.1.0',
    configSchema: withServerConfig({
      tagId: z.string(),
      accountId: z.string(),
      containerId: z.string()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, tagId: '', accountId: '', containerId: '' }
  }
];

// 🟢 GTM/ANALYTICS INBOUND (15 triggers)
export const GTM_INBOUND_TRIGGERS: BaseNodeDefinition[] = [
  {
    id: 'mcp-trigger-gtm-pageview',
    name: '[GTM] Page View Event',
    description: 'Triggered when GTM page view tracked',
    category: 'mcp-inbound',
    ecosystem: 'gtm',
    icon: 'Eye',
    color: MCP_ECOSYSTEMS.gtm.color,
    version: '1.0.0',
    configSchema: z.object({
      pageUrl: z.string().optional(),
      referrer: z.string().optional()
    }),
    defaultConfig: {}
  },
  {
    id: 'mcp-trigger-gtm-conversion',
    name: '[GTM] Conversion Event',
    description: 'Triggered when GTM conversion tracked',
    category: 'mcp-inbound',
    ecosystem: 'gtm',
    icon: 'Target',
    color: MCP_ECOSYSTEMS.gtm.color,
    version: '1.0.0',
    configSchema: z.object({
      conversionType: z.string().optional(),
      value: z.number().optional()
    }),
    defaultConfig: {}
  },
  {
    id: 'mcp-trigger-gtm-form-submission',
    name: '[GTM] Form Submission',
    description: 'Triggered when form is submitted',
    category: 'mcp-inbound',
    ecosystem: 'gtm',
    icon: 'CheckSquare',
    color: MCP_ECOSYSTEMS.gtm.color,
    version: '1.0.0',
    configSchema: z.object({
      formId: z.string().optional()
    }),
    defaultConfig: {}
  },
  {
    id: 'mcp-trigger-gtm-product-view',
    name: '[GTM] Product View',
    description: 'Triggered when product is viewed',
    category: 'mcp-inbound',
    ecosystem: 'gtm',
    icon: 'Package',
    color: MCP_ECOSYSTEMS.gtm.color,
    version: '1.0.0',
    configSchema: z.object({
      productId: z.string().optional()
    }),
    defaultConfig: {}
  },
  {
    id: 'mcp-trigger-gtm-add-to-cart',
    name: '[GTM] Add to Cart',
    description: 'Triggered when item added to cart',
    category: 'mcp-inbound',
    ecosystem: 'gtm',
    icon: 'ShoppingCart',
    color: MCP_ECOSYSTEMS.gtm.color,
    version: '1.0.0',
    configSchema: z.object({
      productId: z.string().optional(),
      quantity: z.number().optional()
    }),
    defaultConfig: {}
  },
  {
    id: 'mcp-trigger-gtm-remove-from-cart',
    name: '[GTM] Remove from Cart',
    description: 'Triggered when item removed from cart',
    category: 'mcp-inbound',
    ecosystem: 'gtm',
    icon: 'Trash2',
    color: MCP_ECOSYSTEMS.gtm.color,
    version: '1.0.0',
    configSchema: z.object({
      productId: z.string().optional()
    }),
    defaultConfig: {}
  },
  {
    id: 'mcp-trigger-gtm-checkout-started',
    name: '[GTM] Checkout Started',
    description: 'Triggered when checkout begins',
    category: 'mcp-inbound',
    ecosystem: 'gtm',
    icon: 'CreditCard',
    color: MCP_ECOSYSTEMS.gtm.color,
    version: '1.0.0',
    configSchema: z.object({
      cartValue: z.number().optional()
    }),
    defaultConfig: {}
  },
  {
    id: 'mcp-trigger-gtm-purchase-completed',
    name: '[GTM] Purchase Completed',
    description: 'Triggered when purchase is completed',
    category: 'mcp-inbound',
    ecosystem: 'gtm',
    icon: 'CheckCircle',
    color: MCP_ECOSYSTEMS.gtm.color,
    version: '1.0.0',
    configSchema: z.object({
      orderId: z.string().optional(),
      totalAmount: z.number().optional()
    }),
    defaultConfig: {}
  },
  {
    id: 'mcp-trigger-gtm-scroll-depth',
    name: '[GTM] Scroll Depth',
    description: 'Triggered on scroll milestone',
    category: 'mcp-inbound',
    ecosystem: 'gtm',
    icon: 'ArrowDown',
    color: MCP_ECOSYSTEMS.gtm.color,
    version: '1.0.0',
    configSchema: z.object({
      scrollPercentage: z.number().optional()
    }),
    defaultConfig: {}
  },
  {
    id: 'mcp-trigger-gtm-video-play',
    name: '[GTM] Video Play',
    description: 'Triggered when video starts',
    category: 'mcp-inbound',
    ecosystem: 'gtm',
    icon: 'Play',
    color: MCP_ECOSYSTEMS.gtm.color,
    version: '1.0.0',
    configSchema: z.object({
      videoId: z.string().optional()
    }),
    defaultConfig: {}
  },
  {
    id: 'mcp-trigger-gtm-video-complete',
    name: '[GTM] Video Complete',
    description: 'Triggered when video completes',
    category: 'mcp-inbound',
    ecosystem: 'gtm',
    icon: 'CheckCircle',
    color: MCP_ECOSYSTEMS.gtm.color,
    version: '1.0.0',
    configSchema: z.object({
      videoId: z.string().optional()
    }),
    defaultConfig: {}
  },
  {
    id: 'mcp-trigger-gtm-link-click',
    name: '[GTM] Link Click',
    description: 'Triggered when link is clicked',
    category: 'mcp-inbound',
    ecosystem: 'gtm',
    icon: 'MousePointer',
    color: MCP_ECOSYSTEMS.gtm.color,
    version: '1.0.0',
    configSchema: z.object({
      linkUrl: z.string().optional()
    }),
    defaultConfig: {}
  },
  {
    id: 'mcp-trigger-gtm-custom-event',
    name: '[GTM] Custom Event',
    description: 'Triggered for custom tracking',
    category: 'mcp-inbound',
    ecosystem: 'gtm',
    icon: 'Zap',
    color: MCP_ECOSYSTEMS.gtm.color,
    version: '1.0.0',
    configSchema: z.object({
      eventName: z.string().optional()
    }),
    defaultConfig: {}
  },
  {
    id: 'mcp-trigger-gtm-error-tracking',
    name: '[GTM] Error Tracking',
    description: 'Triggered on JavaScript error',
    category: 'mcp-inbound',
    ecosystem: 'gtm',
    icon: 'AlertTriangle',
    color: MCP_ECOSYSTEMS.gtm.color,
    version: '1.0.0',
    configSchema: z.object({
      errorMessage: z.string().optional()
    }),
    defaultConfig: {}
  },
  {
    id: 'mcp-trigger-gtm-user-timing',
    name: '[GTM] User Timing',
    description: 'Triggered for performance measurements',
    category: 'mcp-inbound',
    ecosystem: 'gtm',
    icon: 'Clock',
    color: MCP_ECOSYSTEMS.gtm.color,
    version: '1.0.0',
    configSchema: z.object({
      timingCategory: z.string().optional()
    }),
    defaultConfig: {}
  }
];

// 🔵 POSTGRESQL OUTBOUND (9 actions)
export const POSTGRESQL_OUTBOUND_NODES: BaseNodeDefinition[] = [
  {
    id: 'mcp-postgresql-execute-query',
    name: '[PG] Execute Query',
    description: 'Execute SELECT query on PostgreSQL database',
    category: 'mcp-outbound',
    ecosystem: 'postgresql',
    icon: 'Search',
    color: MCP_ECOSYSTEMS.postgresql.color,
    version: '1.1.0',
    configSchema: withServerConfig({
      query: z.string(),
      parameters: z.array(z.any()).optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, query: 'SELECT * FROM table_name' }
  },
  {
    id: 'mcp-postgresql-execute-raw-sql',
    name: '[PG] Execute Raw SQL',
    description: 'Execute raw SQL statement',
    category: 'mcp-outbound',
    ecosystem: 'postgresql',
    icon: 'Terminal',
    color: MCP_ECOSYSTEMS.postgresql.color,
    version: '1.1.0',
    configSchema: withServerConfig({
      sql: z.string(),
      parameters: z.array(z.any()).optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, sql: '' }
  },
  {
    id: 'mcp-postgresql-insert-row',
    name: '[PG] Insert Row',
    description: 'Insert new row into table',
    category: 'mcp-outbound',
    ecosystem: 'postgresql',
    icon: 'PlusCircle',
    color: MCP_ECOSYSTEMS.postgresql.color,
    version: '1.1.0',
    configSchema: withServerConfig({
      table: z.string(),
      data: z.record(z.any()),
      returning: z.array(z.string()).optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, table: '', data: {} }
  },
  {
    id: 'mcp-postgresql-update-row',
    name: '[PG] Update Row',
    description: 'Update existing row',
    category: 'mcp-outbound',
    ecosystem: 'postgresql',
    icon: 'Edit',
    color: MCP_ECOSYSTEMS.postgresql.color,
    version: '1.1.0',
    configSchema: withServerConfig({
      table: z.string(),
      where: z.record(z.any()),
      data: z.record(z.any()),
      returning: z.array(z.string()).optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, table: '', where: {}, data: {} }
  },
  {
    id: 'mcp-postgresql-delete-row',
    name: '[PG] Delete Row',
    description: 'Delete row from table',
    category: 'mcp-outbound',
    ecosystem: 'postgresql',
    icon: 'Trash2',
    color: MCP_ECOSYSTEMS.postgresql.color,
    version: '1.1.0',
    configSchema: withServerConfig({
      table: z.string(),
      where: z.record(z.any()),
      returning: z.array(z.string()).optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, table: '', where: {} }
  },
  {
    id: 'mcp-postgresql-begin-transaction',
    name: '[PG] Begin Transaction',
    description: 'Start database transaction',
    category: 'mcp-outbound',
    ecosystem: 'postgresql',
    icon: 'Lock',
    color: MCP_ECOSYSTEMS.postgresql.color,
    version: '1.1.0',
    configSchema: withServerConfig({
      isolationLevel: z.enum(['READ UNCOMMITTED', 'READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE']).optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults }
  },
  {
    id: 'mcp-postgresql-commit-transaction',
    name: '[PG] Commit Transaction',
    description: 'Commit active transaction',
    category: 'mcp-outbound',
    ecosystem: 'postgresql',
    icon: 'Check',
    color: MCP_ECOSYSTEMS.postgresql.color,
    version: '1.1.0',
    configSchema: withServerConfig({
      transactionId: z.string()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, transactionId: '' }
  },
  {
    id: 'mcp-postgresql-rollback-transaction',
    name: '[PG] Rollback Transaction',
    description: 'Rollback active transaction',
    category: 'mcp-outbound',
    ecosystem: 'postgresql',
    icon: 'RotateCcw',
    color: MCP_ECOSYSTEMS.postgresql.color,
    version: '1.1.0',
    configSchema: withServerConfig({
      transactionId: z.string()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, transactionId: '' }
  },
  {
    id: 'mcp-postgresql-create-table',
    name: '[PG] Create Table',
    description: 'Create new database table',
    category: 'mcp-outbound',
    ecosystem: 'postgresql',
    icon: 'Table',
    color: MCP_ECOSYSTEMS.postgresql.color,
    version: '1.1.0',
    configSchema: withServerConfig({
      tableName: z.string(),
      columns: z.array(z.object({
        name: z.string(),
        type: z.string(),
        constraints: z.array(z.string()).optional()
      })),
      ifNotExists: z.boolean().optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, tableName: '', columns: [] }
  }
];

// 🔵 POSTGRESQL INBOUND (6 triggers)
export const POSTGRESQL_INBOUND_TRIGGERS: BaseNodeDefinition[] = [
  {
    id: 'mcp-trigger-postgresql-row-inserted',
    name: '[PG] Row Inserted',
    description: 'Triggered when row is inserted',
    category: 'mcp-inbound',
    ecosystem: 'postgresql',
    icon: 'PlusCircle',
    color: MCP_ECOSYSTEMS.postgresql.color,
    version: '1.0.0',
    configSchema: z.object({
      table: z.string().optional()
    }),
    defaultConfig: {}
  },
  {
    id: 'mcp-trigger-postgresql-row-updated',
    name: '[PG] Row Updated',
    description: 'Triggered when row is updated',
    category: 'mcp-inbound',
    ecosystem: 'postgresql',
    icon: 'Edit',
    color: MCP_ECOSYSTEMS.postgresql.color,
    version: '1.0.0',
    configSchema: z.object({
      table: z.string().optional()
    }),
    defaultConfig: {}
  },
  {
    id: 'mcp-trigger-postgresql-row-deleted',
    name: '[PG] Row Deleted',
    description: 'Triggered when row is deleted',
    category: 'mcp-inbound',
    ecosystem: 'postgresql',
    icon: 'Trash2',
    color: MCP_ECOSYSTEMS.postgresql.color,
    version: '1.0.0',
    configSchema: z.object({
      table: z.string().optional()
    }),
    defaultConfig: {}
  },
  {
    id: 'mcp-trigger-postgresql-query-executed',
    name: '[PG] Query Executed',
    description: 'Triggered when query is executed',
    category: 'mcp-inbound',
    ecosystem: 'postgresql',
    icon: 'Activity',
    color: MCP_ECOSYSTEMS.postgresql.color,
    version: '1.0.0',
    configSchema: z.object({}),
    defaultConfig: {}
  },
  {
    id: 'mcp-trigger-postgresql-table-created',
    name: '[PG] Table Created',
    description: 'Triggered when table is created',
    category: 'mcp-inbound',
    ecosystem: 'postgresql',
    icon: 'Table',
    color: MCP_ECOSYSTEMS.postgresql.color,
    version: '1.0.0',
    configSchema: z.object({}),
    defaultConfig: {}
  },
  {
    id: 'mcp-trigger-postgresql-table-dropped',
    name: '[PG] Table Dropped',
    description: 'Triggered when table is dropped',
    category: 'mcp-inbound',
    ecosystem: 'postgresql',
    icon: 'XCircle',
    color: MCP_ECOSYSTEMS.postgresql.color,
    version: '1.0.0',
    configSchema: z.object({}),
    defaultConfig: {}
  }
];

// 📱 TELEGRAM OUTBOUND (8 nodes)
export const TELEGRAM_OUTBOUND_NODES: BaseNodeDefinition[] = [
  {
    id: 'mcp-telegram-send-message',
    name: '[TG] Send Message',
    description: 'Send text or media message to Telegram chat/channel',
    category: 'mcp-outbound',
    ecosystem: 'telegram',
    icon: 'Send',
    color: MCP_ECOSYSTEMS.telegram.color,
    version: '1.0.0',
    toolName: 'send_message',
    configSchema: withServerConfig({
      chatId: z.string(),
      message: z.string(),
      parseMode: z.enum(['Markdown', 'HTML', 'MarkdownV2']).optional(),
      disableNotification: z.boolean().optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, chatId: '', message: '' }
  },
  {
    id: 'mcp-telegram-edit-message',
    name: '[TG] Edit Message',
    description: 'Edit existing message content in Telegram',
    category: 'mcp-outbound',
    ecosystem: 'telegram',
    icon: 'Edit',
    color: MCP_ECOSYSTEMS.telegram.color,
    version: '1.0.0',
    toolName: 'edit_message',
    configSchema: withServerConfig({
      chatId: z.string(),
      messageId: z.string(),
      newMessage: z.string(),
      parseMode: z.enum(['Markdown', 'HTML', 'MarkdownV2']).optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, chatId: '', messageId: '', newMessage: '' }
  },
  {
    id: 'mcp-telegram-delete-message',
    name: '[TG] Delete Message',
    description: 'Delete message from Telegram chat',
    category: 'mcp-outbound',
    ecosystem: 'telegram',
    icon: 'Trash2',
    color: MCP_ECOSYSTEMS.telegram.color,
    version: '1.0.0',
    toolName: 'delete_message',
    configSchema: withServerConfig({
      chatId: z.string(),
      messageId: z.string()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, chatId: '', messageId: '' }
  },
  {
    id: 'mcp-telegram-search-chats',
    name: '[TG] Search Chats',
    description: 'Search across all Telegram chats for messages or contacts',
    category: 'mcp-outbound',
    ecosystem: 'telegram',
    icon: 'Search',
    color: MCP_ECOSYSTEMS.telegram.color,
    version: '1.0.0',
    toolName: 'search_chats',
    configSchema: withServerConfig({
      query: z.string(),
      limit: z.number().optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, query: '' }
  },
  {
    id: 'mcp-telegram-get-chat-history',
    name: '[TG] Get Chat History',
    description: 'Retrieve message history from Telegram chat',
    category: 'mcp-outbound',
    ecosystem: 'telegram',
    icon: 'MessageSquare',
    color: MCP_ECOSYSTEMS.telegram.color,
    version: '1.0.0',
    toolName: 'get_chat_history',
    configSchema: withServerConfig({
      chatId: z.string(),
      limit: z.number().optional(),
      offsetDate: z.string().optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, chatId: '' }
  },
  {
    id: 'mcp-telegram-download-media',
    name: '[TG] Download Media',
    description: 'Download photos, videos, or files from Telegram messages',
    category: 'mcp-outbound',
    ecosystem: 'telegram',
    icon: 'Download',
    color: MCP_ECOSYSTEMS.telegram.color,
    version: '1.0.0',
    toolName: 'download_media',
    configSchema: withServerConfig({
      messageId: z.string(),
      chatId: z.string(),
      destination: z.string().optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, messageId: '', chatId: '' }
  },
  {
    id: 'mcp-telegram-create-draft',
    name: '[TG] Create Draft',
    description: 'Save draft message in Telegram chat',
    category: 'mcp-outbound',
    ecosystem: 'telegram',
    icon: 'FileText',
    color: MCP_ECOSYSTEMS.telegram.color,
    version: '1.0.0',
    toolName: 'create_draft',
    configSchema: withServerConfig({
      chatId: z.string(),
      message: z.string(),
      parseMode: z.enum(['Markdown', 'HTML', 'MarkdownV2']).optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, chatId: '', message: '' }
  },
  {
    id: 'mcp-telegram-manage-groups',
    name: '[TG] Manage Groups',
    description: 'Create or manage Telegram groups (members, settings)',
    category: 'mcp-outbound',
    ecosystem: 'telegram',
    icon: 'Users',
    color: MCP_ECOSYSTEMS.telegram.color,
    version: '1.0.0',
    toolName: 'manage_groups',
    configSchema: withServerConfig({
      action: z.enum(['create', 'add_member', 'remove_member', 'update_settings']),
      groupId: z.string().optional(),
      groupTitle: z.string().optional(),
      userId: z.string().optional(),
      settings: z.record(z.any()).optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, action: 'create' }
  }
];

// 💬 WHATSAPP OUTBOUND (7 nodes)
export const WHATSAPP_OUTBOUND_NODES: BaseNodeDefinition[] = [
  {
    id: 'mcp-whatsapp-send-message',
    name: '[WA] Send Message',
    description: 'Send text message via WhatsApp Business API',
    category: 'mcp-outbound',
    ecosystem: 'whatsapp',
    icon: 'Send',
    color: MCP_ECOSYSTEMS.whatsapp.color,
    version: '1.0.0',
    toolName: 'send_message',
    configSchema: withServerConfig({
      to: z.string(),
      message: z.string()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, to: '', message: '' }
  },
  {
    id: 'mcp-whatsapp-create-group',
    name: '[WA] Create Group',
    description: 'Create new WhatsApp group',
    category: 'mcp-outbound',
    ecosystem: 'whatsapp',
    icon: 'Users',
    color: MCP_ECOSYSTEMS.whatsapp.color,
    version: '1.0.0',
    toolName: 'create_group',
    configSchema: withServerConfig({
      groupName: z.string(),
      participants: z.array(z.string())
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, groupName: '', participants: [] }
  },
  {
    id: 'mcp-whatsapp-add-member',
    name: '[WA] Add Group Member',
    description: 'Add member to WhatsApp group',
    category: 'mcp-outbound',
    ecosystem: 'whatsapp',
    icon: 'UserPlus',
    color: MCP_ECOSYSTEMS.whatsapp.color,
    version: '1.0.0',
    toolName: 'add_group_member',
    configSchema: withServerConfig({
      groupId: z.string(),
      userId: z.string()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, groupId: '', userId: '' }
  },
  {
    id: 'mcp-whatsapp-remove-member',
    name: '[WA] Remove Group Member',
    description: 'Remove member from WhatsApp group',
    category: 'mcp-outbound',
    ecosystem: 'whatsapp',
    icon: 'UserMinus',
    color: MCP_ECOSYSTEMS.whatsapp.color,
    version: '1.0.0',
    toolName: 'remove_group_member',
    configSchema: withServerConfig({
      groupId: z.string(),
      userId: z.string()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, groupId: '', userId: '' }
  },
  {
    id: 'mcp-whatsapp-get-contacts',
    name: '[WA] Get Contacts',
    description: 'Retrieve WhatsApp contacts list',
    category: 'mcp-outbound',
    ecosystem: 'whatsapp',
    icon: 'Book',
    color: MCP_ECOSYSTEMS.whatsapp.color,
    version: '1.0.0',
    toolName: 'get_contacts',
    configSchema: withServerConfig({
      limit: z.number().optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults }
  },
  {
    id: 'mcp-whatsapp-get-history',
    name: '[WA] Get Chat History',
    description: 'Retrieve chat message history',
    category: 'mcp-outbound',
    ecosystem: 'whatsapp',
    icon: 'MessageSquare',
    color: MCP_ECOSYSTEMS.whatsapp.color,
    version: '1.0.0',
    toolName: 'get_chat_history',
    configSchema: withServerConfig({
      chatId: z.string(),
      limit: z.number().optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, chatId: '' }
  },
  {
    id: 'mcp-whatsapp-send-media',
    name: '[WA] Send Media',
    description: 'Send photo, video, or document via WhatsApp',
    category: 'mcp-outbound',
    ecosystem: 'whatsapp',
    icon: 'Image',
    color: MCP_ECOSYSTEMS.whatsapp.color,
    version: '1.0.0',
    toolName: 'send_media',
    configSchema: withServerConfig({
      to: z.string(),
      mediaUrl: z.string().url(),
      mediaType: z.enum(['image', 'video', 'document']),
      caption: z.string().optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, to: '', mediaUrl: '', mediaType: 'image' }
  }
];

// 📞 TWILIO OUTBOUND (10 nodes)
export const TWILIO_OUTBOUND_NODES: BaseNodeDefinition[] = [
  {
    id: 'mcp-twilio-send-sms',
    name: '[TWILIO] Send SMS',
    description: 'Send SMS message via Twilio',
    category: 'mcp-outbound',
    ecosystem: 'twilio',
    icon: 'MessageSquare',
    color: MCP_ECOSYSTEMS.twilio.color,
    version: '1.0.0',
    toolName: 'send_sms',
    configSchema: withServerConfig({
      to: z.string(),
      from: z.string(),
      message: z.string()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, to: '', from: '', message: '' }
  },
  {
    id: 'mcp-twilio-make-call',
    name: '[TWILIO] Make Voice Call',
    description: 'Initiate voice call via Twilio',
    category: 'mcp-outbound',
    ecosystem: 'twilio',
    icon: 'Phone',
    color: MCP_ECOSYSTEMS.twilio.color,
    version: '1.0.0',
    toolName: 'make_voice_call',
    configSchema: withServerConfig({
      to: z.string(),
      from: z.string(),
      twimlUrl: z.string().url().optional(),
      message: z.string().optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, to: '', from: '' }
  },
  {
    id: 'mcp-twilio-send-whatsapp',
    name: '[TWILIO] Send WhatsApp',
    description: 'Send WhatsApp message via Twilio Business API',
    category: 'mcp-outbound',
    ecosystem: 'twilio',
    icon: 'MessageCircle',
    color: MCP_ECOSYSTEMS.twilio.color,
    version: '1.0.0',
    toolName: 'send_whatsapp_message',
    configSchema: withServerConfig({
      to: z.string(),
      from: z.string(),
      message: z.string(),
      mediaUrl: z.string().url().optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, to: '', from: '', message: '' }
  },
  {
    id: 'mcp-twilio-send-email',
    name: '[TWILIO] Send Email',
    description: 'Send email via Twilio SendGrid',
    category: 'mcp-outbound',
    ecosystem: 'twilio',
    icon: 'Mail',
    color: MCP_ECOSYSTEMS.twilio.color,
    version: '1.0.0',
    toolName: 'send_email',
    configSchema: withServerConfig({
      to: z.array(z.string().email()),
      from: z.string().email(),
      subject: z.string(),
      body: z.string(),
      bodyType: z.enum(['text', 'html']).optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, to: [], from: '', subject: '', body: '' }
  },
  {
    id: 'mcp-twilio-verify-otp',
    name: '[TWILIO] Verify OTP',
    description: 'Send and verify 2FA OTP code via Twilio Verify',
    category: 'mcp-outbound',
    ecosystem: 'twilio',
    icon: 'Shield',
    color: MCP_ECOSYSTEMS.twilio.color,
    version: '1.0.0',
    toolName: 'verify_otp',
    configSchema: withServerConfig({
      to: z.string(),
      channel: z.enum(['sms', 'call', 'email']),
      code: z.string().optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, to: '', channel: 'sms' }
  },
  {
    id: 'mcp-twilio-create-video-room',
    name: '[TWILIO] Create Video Room',
    description: 'Create video conference room via Twilio Video',
    category: 'mcp-outbound',
    ecosystem: 'twilio',
    icon: 'Video',
    color: MCP_ECOSYSTEMS.twilio.color,
    version: '1.0.0',
    toolName: 'create_video_room',
    configSchema: withServerConfig({
      roomName: z.string(),
      roomType: z.enum(['group', 'peer-to-peer', 'group-small']).optional(),
      maxParticipants: z.number().optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, roomName: '' }
  },
  {
    id: 'mcp-twilio-execute-function',
    name: '[TWILIO] Execute Serverless Function',
    description: 'Execute Twilio Serverless function',
    category: 'mcp-outbound',
    ecosystem: 'twilio',
    icon: 'Code',
    color: MCP_ECOSYSTEMS.twilio.color,
    version: '1.0.0',
    toolName: 'execute_serverless_function',
    configSchema: withServerConfig({
      functionUrl: z.string().url(),
      parameters: z.record(z.any()).optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, functionUrl: '' }
  },
  {
    id: 'mcp-twilio-manage-studio',
    name: '[TWILIO] Manage Studio Flow',
    description: 'Control Twilio Studio workflow execution',
    category: 'mcp-outbound',
    ecosystem: 'twilio',
    icon: 'Workflow',
    color: MCP_ECOSYSTEMS.twilio.color,
    version: '1.0.0',
    toolName: 'manage_studio_flow',
    configSchema: withServerConfig({
      flowSid: z.string(),
      to: z.string(),
      from: z.string(),
      parameters: z.record(z.any()).optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults, flowSid: '', to: '', from: '' }
  },
  {
    id: 'mcp-twilio-get-logs',
    name: '[TWILIO] Get Message Logs',
    description: 'Retrieve message delivery logs and status',
    category: 'mcp-outbound',
    ecosystem: 'twilio',
    icon: 'FileText',
    color: MCP_ECOSYSTEMS.twilio.color,
    version: '1.0.0',
    toolName: 'get_message_logs',
    configSchema: withServerConfig({
      messageSid: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      limit: z.number().optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults }
  },
  {
    id: 'mcp-twilio-list-phones',
    name: '[TWILIO] List Phone Numbers',
    description: 'Get available Twilio phone numbers',
    category: 'mcp-outbound',
    ecosystem: 'twilio',
    icon: 'Hash',
    color: MCP_ECOSYSTEMS.twilio.color,
    version: '1.0.0',
    toolName: 'list_phone_numbers',
    configSchema: withServerConfig({
      countryCode: z.string().optional(),
      areaCode: z.string().optional(),
      capabilities: z.array(z.enum(['voice', 'sms', 'mms', 'fax'])).optional()
    }),
    defaultConfig: { ...MCP_SERVER_CONFIG.defaults }
  }
];

// 🗄️ W3SUITE DATA OPERATIONS (Database nodes with RLS)
export const W3SUITE_DATA_NODES: BaseNodeDefinition[] = [
  {
    id: 'w3-database-operation',
    name: '[W3] Database Operation',
    description: 'Read or write data from w3suite schema with RLS enforcement',
    category: 'data-operations',
    ecosystem: 'w3suite',
    icon: 'Database',
    color: '#FF6900', // WindTre orange
    version: '1.0.0',
    configSchema: z.object({
      operation: z.enum(['SELECT', 'INSERT', 'UPDATE', 'DELETE']), // EXECUTE_QUERY disabled for security (see replit.md)
      table: z.string().min(1, 'Table required'),
      // Dynamic fields based on operation type
      columns: z.array(z.string()).optional(), // For SELECT
      filters: z.array(z.object({
        column: z.string(),
        operator: z.enum(['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN', 'IS NULL', 'IS NOT NULL']),
        value: z.any().optional(),
      })).optional(), // For SELECT, UPDATE, DELETE
      values: z.record(z.any()).optional(), // For INSERT, UPDATE
      limit: z.number().int().positive().max(1000).default(100).optional(), // For SELECT
      returnId: z.boolean().default(true).optional(), // For INSERT
      requireConfirmation: z.boolean().default(true).optional(), // For DELETE
      query: z.string().optional(), // For EXECUTE_QUERY
      params: z.array(z.any()).optional(), // For EXECUTE_QUERY
      readOnly: z.boolean().default(false).optional(), // For EXECUTE_QUERY
    }),
    defaultConfig: {
      operation: 'SELECT',
      table: '',
      limit: 100,
      returnId: true,
      requireConfirmation: true,
      readOnly: false,
    }
  }
];

// 🔄 Export all MCP nodes
export const MCP_OUTBOUND_NODES = [
  ...GOOGLE_OUTBOUND_NODES,
  ...AWS_OUTBOUND_NODES,
  ...META_OUTBOUND_NODES,
  ...MICROSOFT_OUTBOUND_NODES,
  ...STRIPE_OUTBOUND_NODES,
  ...GTM_OUTBOUND_NODES,
  ...POSTGRESQL_OUTBOUND_NODES,
  ...TELEGRAM_OUTBOUND_NODES,
  ...WHATSAPP_OUTBOUND_NODES,
  ...TWILIO_OUTBOUND_NODES
];

export const MCP_INBOUND_NODES = [
  ...GOOGLE_INBOUND_TRIGGERS,
  ...AWS_INBOUND_TRIGGERS,
  ...META_INBOUND_TRIGGERS,
  ...MICROSOFT_INBOUND_TRIGGERS,
  ...STRIPE_INBOUND_TRIGGERS,
  ...GTM_INBOUND_TRIGGERS,
  ...POSTGRESQL_INBOUND_TRIGGERS
];

export const ALL_MCP_NODES = [
  ...MCP_OUTBOUND_NODES,
  ...MCP_INBOUND_NODES,
  ...W3SUITE_DATA_NODES
];

// 🎯 Helper functions
export function getMCPNodesByEcosystem(ecosystem: keyof typeof MCP_ECOSYSTEMS) {
  return ALL_MCP_NODES.filter(node => node.ecosystem === ecosystem);
}

export function getMCPNodesByCategory(category: 'mcp-outbound' | 'mcp-inbound') {
  return ALL_MCP_NODES.filter(node => node.category === category);
}

export function getMCPNodeById(id: string): BaseNodeDefinition | undefined {
  return ALL_MCP_NODES.find(node => node.id === id);
}
