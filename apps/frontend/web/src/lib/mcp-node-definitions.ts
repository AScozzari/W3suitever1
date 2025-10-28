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
 * - OUTBOUND actions: Google 5, AWS 11, Meta 9, MS 7, Stripe 6, GTM 6, PostgreSQL 9
 * - INBOUND triggers: Google 5, AWS 5, Meta 6, MS 4, Stripe 4, GTM 15, PostgreSQL 6
 */

import { BaseNodeDefinition } from '../types/workflow-nodes';
import { z } from 'zod';

// 🎨 Ecosystem Colors & Badges
export const MCP_ECOSYSTEMS = {
  google: { badge: '[G]', color: '#4285F4', name: 'Google Workspace' },
  aws: { badge: '[AWS]', color: '#FF9900', name: 'AWS Services' },
  meta: { badge: '[META]', color: '#E4405F', name: 'Meta/Instagram' },
  microsoft: { badge: '[MS]', color: '#0078D4', name: 'Microsoft 365' },
  stripe: { badge: '[STRIPE]', color: '#635BFF', name: 'Stripe' },
  gtm: { badge: '[GTM]', color: '#4CAF50', name: 'GTM/Analytics' },
  postgresql: { badge: '[PG]', color: '#336791', name: 'PostgreSQL' }
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
    version: '1.0.0',
    configSchema: z.object({
      serverId: z.string().min(1, 'MCP Server connection required'),
      toolName: z.string().default('gmail_send'),
      to: z.array(z.string().email()),
      subject: z.string(),
      body: z.string(),
      attachments: z.array(z.string()).optional()
    }),
    defaultConfig: { serverId: '', toolName: 'gmail_send', to: [], subject: '', body: '' }
  },
  {
    id: 'mcp-google-drive-upload',
    name: '[G] Drive Upload',
    description: 'Upload file to Google Drive folder',
    category: 'mcp-outbound',
    ecosystem: 'google',
    icon: 'Upload',
    color: MCP_ECOSYSTEMS.google.color,
    version: '1.0.0',
    configSchema: z.object({
      fileName: z.string(),
      fileContent: z.string(),
      folderId: z.string().optional(),
      mimeType: z.string().optional()
    }),
    defaultConfig: { fileName: '', fileContent: '' }
  },
  {
    id: 'mcp-google-calendar-create',
    name: '[G] Calendar Create Event',
    description: 'Create Google Calendar event with attendees',
    category: 'mcp-outbound',
    ecosystem: 'google',
    icon: 'Calendar',
    color: MCP_ECOSYSTEMS.google.color,
    version: '1.0.0',
    configSchema: z.object({
      summary: z.string(),
      startDateTime: z.string(),
      endDateTime: z.string(),
      calendarId: z.string().optional(), // Default: 'primary' (backend magic value)
      attendees: z.array(z.string().email()).optional()
    }),
    defaultConfig: { summary: '', startDateTime: '', endDateTime: '' }
  },
  {
    id: 'mcp-google-sheets-append',
    name: '[G] Sheets Append Row',
    description: 'Append row to Google Sheets spreadsheet',
    category: 'mcp-outbound',
    ecosystem: 'google',
    icon: 'Table',
    color: MCP_ECOSYSTEMS.google.color,
    version: '1.0.0',
    configSchema: z.object({
      spreadsheetId: z.string(),
      range: z.string(),
      values: z.array(z.array(z.any()))
    }),
    defaultConfig: { spreadsheetId: '', range: 'Sheet1!A1', values: [[]] }
  },
  {
    id: 'mcp-google-docs-create',
    name: '[G] Docs Create Document',
    description: 'Create new Google Doc from template or content',
    category: 'mcp-outbound',
    ecosystem: 'google',
    icon: 'FileText',
    color: MCP_ECOSYSTEMS.google.color,
    version: '1.0.0',
    configSchema: z.object({
      title: z.string(),
      content: z.string()
    }),
    defaultConfig: { title: '', content: '' }
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
    version: '1.0.0',
    configSchema: z.object({
      bucket: z.string(),
      key: z.string(),
      body: z.string(),
      contentType: z.string().optional(),
      acl: z.string().optional()
    }),
    defaultConfig: { bucket: '', key: '', body: '' }
  },
  {
    id: 'mcp-aws-lambda-invoke',
    name: '[AWS] Lambda Invoke',
    description: 'Invoke AWS Lambda function with payload',
    category: 'mcp-outbound',
    ecosystem: 'aws',
    icon: 'Zap',
    color: MCP_ECOSYSTEMS.aws.color,
    version: '1.0.0',
    configSchema: z.object({
      functionName: z.string(),
      payload: z.record(z.any()),
      invocationType: z.enum(['RequestResponse', 'Event', 'DryRun']).optional()
    }),
    defaultConfig: { functionName: '', payload: {}, invocationType: 'RequestResponse' }
  },
  {
    id: 'mcp-aws-sns-publish',
    name: '[AWS] SNS Publish Message',
    description: 'Publish message to SNS topic for fan-out',
    category: 'mcp-outbound',
    ecosystem: 'aws',
    icon: 'MessageSquare',
    color: MCP_ECOSYSTEMS.aws.color,
    version: '1.0.0',
    configSchema: z.object({
      topicArn: z.string(),
      message: z.string(),
      subject: z.string().optional()
    }),
    defaultConfig: { topicArn: '', message: '' }
  },
  {
    id: 'mcp-aws-sqs-send',
    name: '[AWS] SQS Send Message',
    description: 'Send message to SQS queue for processing',
    category: 'mcp-outbound',
    ecosystem: 'aws',
    icon: 'Inbox',
    color: MCP_ECOSYSTEMS.aws.color,
    version: '1.0.0',
    configSchema: z.object({
      queueUrl: z.string(),
      messageBody: z.string(),
      delaySeconds: z.number().optional()
    }),
    defaultConfig: { queueUrl: '', messageBody: '' }
  },
  {
    id: 'mcp-aws-dynamodb-put',
    name: '[AWS] DynamoDB Put Item',
    description: 'Insert/update item in DynamoDB table',
    category: 'mcp-outbound',
    ecosystem: 'aws',
    icon: 'Database',
    color: MCP_ECOSYSTEMS.aws.color,
    version: '1.0.0',
    configSchema: z.object({
      tableName: z.string(),
      item: z.record(z.any())
    }),
    defaultConfig: { tableName: '', item: {} }
  }
];

// 🔴 META/INSTAGRAM OUTBOUND (9 nodes)
export const META_OUTBOUND_NODES: BaseNodeDefinition[] = [
  {
    id: 'mcp-meta-instagram-post',
    name: '[META] Instagram Create Post',
    description: 'Publish image/carousel post to Instagram Feed',
    category: 'mcp-outbound',
    ecosystem: 'meta',
    icon: 'Image',
    color: MCP_ECOSYSTEMS.meta.color,
    version: '1.0.0',
    configSchema: z.object({
      instagramAccountId: z.string().optional(), // Backend uses 'primary' (first connected account) if omitted
      caption: z.string(),
      imageUrl: z.string().url(),
      coverUrl: z.string().url().optional()
    }),
    defaultConfig: { caption: '', imageUrl: '' }
  },
  {
    id: 'mcp-meta-instagram-story',
    name: '[META] Instagram Publish Story',
    description: 'Publish photo/video story (24h lifespan)',
    category: 'mcp-outbound',
    ecosystem: 'meta',
    icon: 'Camera',
    color: MCP_ECOSYSTEMS.meta.color,
    version: '1.0.0',
    configSchema: z.object({
      instagramAccountId: z.string().optional(), // Backend uses 'primary' (first connected account) if omitted
      mediaUrl: z.string().url(),
      mediaType: z.enum(['IMAGE', 'VIDEO']),
      coverUrl: z.string().url().optional()
    }),
    defaultConfig: { mediaUrl: '', mediaType: 'IMAGE' }
  },
  {
    id: 'mcp-meta-instagram-comment',
    name: '[META] Instagram Reply Comment',
    description: 'Reply to Instagram comment with text',
    category: 'mcp-outbound',
    ecosystem: 'meta',
    icon: 'MessageCircle',
    color: MCP_ECOSYSTEMS.meta.color,
    version: '1.0.0',
    configSchema: z.object({
      instagramAccountId: z.string().optional(), // Backend uses 'primary' (first connected account) if omitted
      commentId: z.string(),
      message: z.string()
    }),
    defaultConfig: { commentId: '', message: '' }
  },
  {
    id: 'mcp-meta-instagram-message',
    name: '[META] Instagram Send DM',
    description: 'Send direct message to Instagram user',
    category: 'mcp-outbound',
    ecosystem: 'meta',
    icon: 'Send',
    color: MCP_ECOSYSTEMS.meta.color,
    version: '1.0.0',
    configSchema: z.object({
      instagramAccountId: z.string().optional(), // Backend uses 'primary' (first connected account) if omitted
      recipientId: z.string(),
      message: z.string()
    }),
    defaultConfig: { recipientId: '', message: '' }
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
    version: '1.0.0',
    configSchema: z.object({
      to: z.array(z.string().email()),
      subject: z.string(),
      body: z.string(),
      bodyType: z.enum(['Text', 'HTML']).optional()
    }),
    defaultConfig: { to: [], subject: '', body: '', bodyType: 'HTML' }
  },
  {
    id: 'mcp-ms-onedrive-upload',
    name: '[MS] OneDrive Upload File',
    description: 'Upload file to OneDrive folder',
    category: 'mcp-outbound',
    ecosystem: 'microsoft',
    icon: 'Upload',
    color: MCP_ECOSYSTEMS.microsoft.color,
    version: '1.0.0',
    configSchema: z.object({
      fileName: z.string(),
      fileContent: z.string(),
      folderId: z.string().optional()
    }),
    defaultConfig: { fileName: '', fileContent: '' }
  },
  {
    id: 'mcp-ms-teams-message',
    name: '[MS] Teams Send Message',
    description: 'Send message to Teams channel or chat',
    category: 'mcp-outbound',
    ecosystem: 'microsoft',
    icon: 'MessageSquare',
    color: MCP_ECOSYSTEMS.microsoft.color,
    version: '1.0.0',
    configSchema: z.object({
      channelId: z.string(),
      message: z.string()
    }),
    defaultConfig: { channelId: '', message: '' }
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
    version: '1.0.0',
    configSchema: z.object({
      amount: z.number(),
      currency: z.string(),
      description: z.string().optional(),
      metadata: z.record(z.string()).optional()
    }),
    defaultConfig: { amount: 0, currency: 'eur' }
  },
  {
    id: 'mcp-stripe-subscription-create',
    name: '[STRIPE] Create Subscription',
    description: 'Create recurring subscription for customer',
    category: 'mcp-outbound',
    ecosystem: 'stripe',
    icon: 'Repeat',
    color: MCP_ECOSYSTEMS.stripe.color,
    version: '1.0.0',
    configSchema: z.object({
      customerId: z.string(),
      priceId: z.string(),
      trialDays: z.number().optional()
    }),
    defaultConfig: { customerId: '', priceId: '' }
  },
  {
    id: 'mcp-stripe-invoice-create',
    name: '[STRIPE] Create Invoice',
    description: 'Generate invoice for customer with line items',
    category: 'mcp-outbound',
    ecosystem: 'stripe',
    icon: 'FileText',
    color: MCP_ECOSYSTEMS.stripe.color,
    version: '1.0.0',
    configSchema: z.object({
      customerId: z.string(),
      items: z.array(z.object({
        description: z.string(),
        amount: z.number(),
        quantity: z.number()
      }))
    }),
    defaultConfig: { customerId: '', items: [] }
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
    version: '1.0.0',
    configSchema: z.object({
      eventName: z.string(),
      eventCategory: z.string().optional(),
      eventLabel: z.string().optional(),
      eventValue: z.number().optional()
    }),
    defaultConfig: { eventName: '' }
  },
  {
    id: 'mcp-gtm-track-pageview',
    name: '[GTM] Track Page View',
    description: 'Track page view via Google Analytics',
    category: 'mcp-outbound',
    ecosystem: 'gtm',
    icon: 'Eye',
    color: MCP_ECOSYSTEMS.gtm.color,
    version: '1.0.0',
    configSchema: z.object({
      pageUrl: z.string(),
      pageTitle: z.string().optional(),
      referrer: z.string().optional()
    }),
    defaultConfig: { pageUrl: '' }
  },
  {
    id: 'mcp-gtm-track-conversion',
    name: '[GTM] Track Conversion',
    description: 'Track conversion event via Google Analytics',
    category: 'mcp-outbound',
    ecosystem: 'gtm',
    icon: 'Target',
    color: MCP_ECOSYSTEMS.gtm.color,
    version: '1.0.0',
    configSchema: z.object({
      conversionLabel: z.string(),
      conversionValue: z.number().optional(),
      currency: z.string().optional()
    }),
    defaultConfig: { conversionLabel: '' }
  },
  {
    id: 'mcp-gtm-setup-tag',
    name: '[GTM] Setup Tag',
    description: 'Create GTM tag configuration',
    category: 'mcp-outbound',
    ecosystem: 'gtm',
    icon: 'Tags',
    color: MCP_ECOSYSTEMS.gtm.color,
    version: '1.0.0',
    configSchema: z.object({
      tagName: z.string(),
      tagType: z.string(),
      accountId: z.string(),
      containerId: z.string()
    }),
    defaultConfig: { tagName: '', tagType: '', accountId: '', containerId: '' }
  },
  {
    id: 'mcp-gtm-update-tag',
    name: '[GTM] Update Tag',
    description: 'Update existing GTM tag',
    category: 'mcp-outbound',
    ecosystem: 'gtm',
    icon: 'Edit',
    color: MCP_ECOSYSTEMS.gtm.color,
    version: '1.0.0',
    configSchema: z.object({
      tagId: z.string(),
      tagName: z.string().optional(),
      tagConfiguration: z.record(z.any()).optional()
    }),
    defaultConfig: { tagId: '' }
  },
  {
    id: 'mcp-gtm-delete-tag',
    name: '[GTM] Delete Tag',
    description: 'Delete GTM tag',
    category: 'mcp-outbound',
    ecosystem: 'gtm',
    icon: 'Trash2',
    color: MCP_ECOSYSTEMS.gtm.color,
    version: '1.0.0',
    configSchema: z.object({
      tagId: z.string(),
      accountId: z.string(),
      containerId: z.string()
    }),
    defaultConfig: { tagId: '', accountId: '', containerId: '' }
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
    version: '1.0.0',
    configSchema: z.object({
      query: z.string(),
      parameters: z.array(z.any()).optional()
    }),
    defaultConfig: { query: 'SELECT * FROM table_name' }
  },
  {
    id: 'mcp-postgresql-execute-raw-sql',
    name: '[PG] Execute Raw SQL',
    description: 'Execute raw SQL statement',
    category: 'mcp-outbound',
    ecosystem: 'postgresql',
    icon: 'Terminal',
    color: MCP_ECOSYSTEMS.postgresql.color,
    version: '1.0.0',
    configSchema: z.object({
      sql: z.string(),
      parameters: z.array(z.any()).optional()
    }),
    defaultConfig: { sql: '' }
  },
  {
    id: 'mcp-postgresql-insert-row',
    name: '[PG] Insert Row',
    description: 'Insert new row into table',
    category: 'mcp-outbound',
    ecosystem: 'postgresql',
    icon: 'PlusCircle',
    color: MCP_ECOSYSTEMS.postgresql.color,
    version: '1.0.0',
    configSchema: z.object({
      table: z.string(),
      data: z.record(z.any()),
      returning: z.array(z.string()).optional()
    }),
    defaultConfig: { table: '', data: {} }
  },
  {
    id: 'mcp-postgresql-update-row',
    name: '[PG] Update Row',
    description: 'Update existing row',
    category: 'mcp-outbound',
    ecosystem: 'postgresql',
    icon: 'Edit',
    color: MCP_ECOSYSTEMS.postgresql.color,
    version: '1.0.0',
    configSchema: z.object({
      table: z.string(),
      where: z.record(z.any()),
      data: z.record(z.any()),
      returning: z.array(z.string()).optional()
    }),
    defaultConfig: { table: '', where: {}, data: {} }
  },
  {
    id: 'mcp-postgresql-delete-row',
    name: '[PG] Delete Row',
    description: 'Delete row from table',
    category: 'mcp-outbound',
    ecosystem: 'postgresql',
    icon: 'Trash2',
    color: MCP_ECOSYSTEMS.postgresql.color,
    version: '1.0.0',
    configSchema: z.object({
      table: z.string(),
      where: z.record(z.any()),
      returning: z.array(z.string()).optional()
    }),
    defaultConfig: { table: '', where: {} }
  },
  {
    id: 'mcp-postgresql-begin-transaction',
    name: '[PG] Begin Transaction',
    description: 'Start database transaction',
    category: 'mcp-outbound',
    ecosystem: 'postgresql',
    icon: 'Lock',
    color: MCP_ECOSYSTEMS.postgresql.color,
    version: '1.0.0',
    configSchema: z.object({
      isolationLevel: z.enum(['READ UNCOMMITTED', 'READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE']).optional()
    }),
    defaultConfig: {}
  },
  {
    id: 'mcp-postgresql-commit-transaction',
    name: '[PG] Commit Transaction',
    description: 'Commit active transaction',
    category: 'mcp-outbound',
    ecosystem: 'postgresql',
    icon: 'Check',
    color: MCP_ECOSYSTEMS.postgresql.color,
    version: '1.0.0',
    configSchema: z.object({
      transactionId: z.string()
    }),
    defaultConfig: { transactionId: '' }
  },
  {
    id: 'mcp-postgresql-rollback-transaction',
    name: '[PG] Rollback Transaction',
    description: 'Rollback active transaction',
    category: 'mcp-outbound',
    ecosystem: 'postgresql',
    icon: 'RotateCcw',
    color: MCP_ECOSYSTEMS.postgresql.color,
    version: '1.0.0',
    configSchema: z.object({
      transactionId: z.string()
    }),
    defaultConfig: { transactionId: '' }
  },
  {
    id: 'mcp-postgresql-create-table',
    name: '[PG] Create Table',
    description: 'Create new database table',
    category: 'mcp-outbound',
    ecosystem: 'postgresql',
    icon: 'Table',
    color: MCP_ECOSYSTEMS.postgresql.color,
    version: '1.0.0',
    configSchema: z.object({
      tableName: z.string(),
      columns: z.array(z.object({
        name: z.string(),
        type: z.string(),
        constraints: z.array(z.string()).optional()
      })),
      ifNotExists: z.boolean().optional()
    }),
    defaultConfig: { tableName: '', columns: [] }
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

// 🔄 Export all MCP nodes
export const MCP_OUTBOUND_NODES = [
  ...GOOGLE_OUTBOUND_NODES,
  ...AWS_OUTBOUND_NODES,
  ...META_OUTBOUND_NODES,
  ...MICROSOFT_OUTBOUND_NODES,
  ...STRIPE_OUTBOUND_NODES,
  ...GTM_OUTBOUND_NODES,
  ...POSTGRESQL_OUTBOUND_NODES
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
  ...MCP_INBOUND_NODES
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
