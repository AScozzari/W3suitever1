/**
 * MCP Node Types & Constants
 * 
 * Complete registry of:
 * - 54 OUTBOUND action node types (API calls to external services)
 * - 49 INBOUND trigger node types (webhook events from external services)
 * 
 * Organized by ecosystem: Google, AWS, Meta, Microsoft, Stripe, GTM, PostgreSQL
 */

// ==================== ECOSYSTEMS ====================
export enum MCPEcosystem {
  GOOGLE = 'google',
  AWS = 'aws',
  META = 'meta',
  MICROSOFT = 'microsoft',
  STRIPE = 'stripe',
  GTM = 'gtm',
  POSTGRESQL = 'postgresql'
}

export const EcosystemMetadata = {
  [MCPEcosystem.GOOGLE]: {
    name: 'Google Workspace',
    badge: 'G',
    color: '#4285F4',
    authType: 'oauth2'
  },
  [MCPEcosystem.AWS]: {
    name: 'AWS Services',
    badge: 'AWS',
    color: '#FF9900',
    authType: 'iam-credentials'
  },
  [MCPEcosystem.META]: {
    name: 'Meta/Instagram',
    badge: 'META',
    color: '#E4405F',
    authType: 'oauth2'
  },
  [MCPEcosystem.MICROSOFT]: {
    name: 'Microsoft 365',
    badge: 'MS',
    color: '#0078D4',
    authType: 'oauth2'
  },
  [MCPEcosystem.STRIPE]: {
    name: 'Stripe',
    badge: 'STRIPE',
    color: '#635BFF',
    authType: 'api-key'
  },
  [MCPEcosystem.GTM]: {
    name: 'GTM/Analytics',
    badge: 'GTM',
    color: '#FF6F00',
    authType: 'service-account'
  },
  [MCPEcosystem.POSTGRESQL]: {
    name: 'PostgreSQL',
    badge: 'PG',
    color: '#336791',
    authType: 'database-credentials'
  }
} as const;

// ==================== OUTBOUND ACTION NODES (54 total) ====================

/**
 * Google Workspace Actions (12)
 */
export enum GoogleAction {
  // Gmail (4)
  GMAIL_SEND = 'google.gmail.send',
  GMAIL_SEARCH = 'google.gmail.search',
  GMAIL_READ = 'google.gmail.read',
  GMAIL_ADD_LABEL = 'google.gmail.add-label',
  
  // Drive (4)
  DRIVE_UPLOAD = 'google.drive.upload',
  DRIVE_DOWNLOAD = 'google.drive.download',
  DRIVE_SHARE = 'google.drive.share',
  DRIVE_CREATE_FOLDER = 'google.drive.create-folder',
  
  // Calendar (2)
  CALENDAR_CREATE_EVENT = 'google.calendar.create-event',
  CALENDAR_UPDATE_EVENT = 'google.calendar.update-event',
  
  // Sheets (2)
  SHEETS_APPEND_ROW = 'google.sheets.append-row',
  SHEETS_READ_RANGE = 'google.sheets.read-range'
}

/**
 * AWS Services Actions (11)
 */
export enum AWSAction {
  // S3 (4)
  S3_UPLOAD = 'aws.s3.upload',
  S3_DOWNLOAD = 'aws.s3.download',
  S3_DELETE = 'aws.s3.delete',
  S3_LIST_OBJECTS = 'aws.s3.list-objects',
  
  // SNS (2)
  SNS_PUBLISH = 'aws.sns.publish',
  SNS_CREATE_TOPIC = 'aws.sns.create-topic',
  
  // SQS (2)
  SQS_SEND_MESSAGE = 'aws.sqs.send-message',
  SQS_RECEIVE_MESSAGE = 'aws.sqs.receive-message',
  
  // Lambda (2)
  LAMBDA_INVOKE = 'aws.lambda.invoke',
  LAMBDA_INVOKE_ASYNC = 'aws.lambda.invoke-async',
  
  // DynamoDB (1)
  DYNAMODB_PUT_ITEM = 'aws.dynamodb.put-item'
}

/**
 * Meta/Instagram Actions (9)
 */
export enum MetaAction {
  // Instagram (6)
  INSTAGRAM_POST_IMAGE = 'meta.instagram.post-image',
  INSTAGRAM_POST_VIDEO = 'meta.instagram.post-video',
  INSTAGRAM_POST_STORY = 'meta.instagram.post-story',
  INSTAGRAM_REPLY_COMMENT = 'meta.instagram.reply-comment',
  INSTAGRAM_REPLY_DM = 'meta.instagram.reply-dm',
  INSTAGRAM_GET_INSIGHTS = 'meta.instagram.get-insights',
  
  // Facebook (3)
  FACEBOOK_POST = 'meta.facebook.post',
  FACEBOOK_COMMENT = 'meta.facebook.comment',
  FACEBOOK_SEND_MESSAGE = 'meta.facebook.send-message'
}

/**
 * Microsoft 365 Actions (7)
 */
export enum MicrosoftAction {
  // Outlook (2)
  OUTLOOK_SEND_EMAIL = 'microsoft.outlook.send-email',
  OUTLOOK_CREATE_CALENDAR_EVENT = 'microsoft.outlook.create-calendar-event',
  
  // Teams (3)
  TEAMS_SEND_MESSAGE = 'microsoft.teams.send-message',
  TEAMS_CREATE_CHANNEL = 'microsoft.teams.create-channel',
  TEAMS_POST_ADAPTIVE_CARD = 'microsoft.teams.post-adaptive-card',
  
  // OneDrive (2)
  ONEDRIVE_UPLOAD = 'microsoft.onedrive.upload',
  ONEDRIVE_SHARE = 'microsoft.onedrive.share'
}

/**
 * Stripe Actions (6)
 */
export enum StripeAction {
  CREATE_PAYMENT_INTENT = 'stripe.create-payment-intent',
  CREATE_CUSTOMER = 'stripe.create-customer',
  CREATE_SUBSCRIPTION = 'stripe.create-subscription',
  CANCEL_SUBSCRIPTION = 'stripe.cancel-subscription',
  REFUND_PAYMENT = 'stripe.refund-payment',
  CREATE_INVOICE = 'stripe.create-invoice'
}

/**
 * GTM/Analytics Actions (0 - primarily INBOUND)
 */
export enum GTMAction {
  // GTM is primarily for inbound events (form submissions, conversions)
  // No outbound actions needed
}

/**
 * PostgreSQL Actions (9)
 */
export enum PostgreSQLAction {
  // Query operations (2)
  EXECUTE_QUERY = 'postgresql.execute-query',
  EXECUTE_RAW_SQL = 'postgresql.execute-raw-sql',
  
  // CRUD operations (3)
  INSERT_ROW = 'postgresql.insert-row',
  UPDATE_ROW = 'postgresql.update-row',
  DELETE_ROW = 'postgresql.delete-row',
  
  // Transaction management (3)
  BEGIN_TRANSACTION = 'postgresql.begin-transaction',
  COMMIT_TRANSACTION = 'postgresql.commit-transaction',
  ROLLBACK_TRANSACTION = 'postgresql.rollback-transaction',
  
  // Schema operations (1)
  CREATE_TABLE = 'postgresql.create-table'
}

// ==================== INBOUND TRIGGER NODES (49 total) ====================

/**
 * Google Workspace Triggers (5)
 */
export enum GoogleTrigger {
  GMAIL_RECEIVED = 'google.gmail.received',
  DRIVE_FILE_CREATED = 'google.drive.file-created',
  DRIVE_FILE_UPDATED = 'google.drive.file-updated',
  CALENDAR_EVENT_CREATED = 'google.calendar.event-created',
  CALENDAR_EVENT_UPDATED = 'google.calendar.event-updated'
}

/**
 * AWS Triggers (4)
 */
export enum AWSTrigger {
  S3_OBJECT_CREATED = 'aws.s3.object-created',
  S3_OBJECT_DELETED = 'aws.s3.object-deleted',
  SNS_MESSAGE_PUBLISHED = 'aws.sns.message-published',
  SQS_MESSAGE_RECEIVED = 'aws.sqs.message-received'
}

/**
 * Meta/Instagram Triggers (6)
 */
export enum MetaTrigger {
  INSTAGRAM_COMMENT_CREATED = 'meta.instagram.comment-created',
  INSTAGRAM_DM_RECEIVED = 'meta.instagram.dm-received',
  INSTAGRAM_MENTION = 'meta.instagram.mention',
  INSTAGRAM_STORY_MENTION = 'meta.instagram.story-mention',
  FACEBOOK_POST_CREATED = 'meta.facebook.post-created',
  FACEBOOK_COMMENT_CREATED = 'meta.facebook.comment-created'
}

/**
 * Microsoft 365 Triggers (4)
 */
export enum MicrosoftTrigger {
  OUTLOOK_EMAIL_RECEIVED = 'microsoft.outlook.email-received',
  TEAMS_MESSAGE_POSTED = 'microsoft.teams.message-posted',
  TEAMS_CHANNEL_CREATED = 'microsoft.teams.channel-created',
  ONEDRIVE_FILE_UPDATED = 'microsoft.onedrive.file-updated'
}

/**
 * Stripe Triggers (6)
 */
export enum StripeTrigger {
  PAYMENT_INTENT_SUCCEEDED = 'stripe.payment_intent.succeeded',
  PAYMENT_INTENT_FAILED = 'stripe.payment_intent.failed',
  CUSTOMER_CREATED = 'stripe.customer.created',
  SUBSCRIPTION_CREATED = 'stripe.customer.subscription.created',
  SUBSCRIPTION_DELETED = 'stripe.customer.subscription.deleted',
  INVOICE_PAID = 'stripe.invoice.paid'
}

/**
 * GTM/Analytics Triggers (15)
 */
export enum GTMTrigger {
  // Basic tracking (3)
  FORM_SUBMISSION = 'gtm.form.submission',
  CONVERSION_EVENT = 'gtm.conversion.event',
  PAGE_VIEW = 'gtm.page.view',
  
  // E-commerce tracking (5)
  PRODUCT_VIEW = 'gtm.ecommerce.product-view',
  ADD_TO_CART = 'gtm.ecommerce.add-to-cart',
  REMOVE_FROM_CART = 'gtm.ecommerce.remove-from-cart',
  CHECKOUT_STARTED = 'gtm.ecommerce.checkout-started',
  PURCHASE_COMPLETED = 'gtm.ecommerce.purchase-completed',
  
  // User engagement (4)
  SCROLL_DEPTH = 'gtm.engagement.scroll-depth',
  VIDEO_PLAY = 'gtm.engagement.video-play',
  VIDEO_COMPLETE = 'gtm.engagement.video-complete',
  LINK_CLICK = 'gtm.engagement.link-click',
  
  // Custom & Error tracking (3)
  CUSTOM_EVENT = 'gtm.custom.event',
  ERROR_TRACKING = 'gtm.error.tracking',
  USER_TIMING = 'gtm.timing.user'
}

/**
 * PostgreSQL Triggers (6)
 */
export enum PostgreSQLTrigger {
  ROW_INSERTED = 'postgresql.row.inserted',
  ROW_UPDATED = 'postgresql.row.updated',
  ROW_DELETED = 'postgresql.row.deleted',
  QUERY_EXECUTED = 'postgresql.query.executed',
  TABLE_CREATED = 'postgresql.table.created',
  TABLE_DROPPED = 'postgresql.table.dropped'
}

// ==================== UNIFIED NODE TYPE ENUM ====================

export type MCPNodeType = 
  | GoogleAction | AWSAction | MetaAction | MicrosoftAction | StripeAction | GTMAction | PostgreSQLAction
  | GoogleTrigger | AWSTrigger | MetaTrigger | MicrosoftTrigger | StripeTrigger | GTMTrigger | PostgreSQLTrigger;

// ==================== NODE METADATA ====================

export interface MCPNodeMetadata {
  id: MCPNodeType;
  ecosystem: MCPEcosystem;
  category: 'action' | 'trigger';
  name: string;
  description: string;
  icon: string;
  requiredFields: string[];
  optionalFields: string[];
  outputVariables: string[];
  requiresAuth: boolean;
  webhookSupport?: boolean;
}

/**
 * Complete metadata registry for all 65+ MCP nodes
 */
export const MCPNodeRegistry: Record<string, MCPNodeMetadata> = {
  // ==================== GOOGLE WORKSPACE ACTIONS ====================
  [GoogleAction.GMAIL_SEND]: {
    id: GoogleAction.GMAIL_SEND,
    ecosystem: MCPEcosystem.GOOGLE,
    category: 'action',
    name: 'Send Email',
    description: 'Send email via Gmail',
    icon: 'Mail',
    requiredFields: ['to', 'subject', 'body'],
    optionalFields: ['cc', 'bcc', 'attachments'],
    outputVariables: ['messageId', 'threadId'],
    requiresAuth: true
  },
  [GoogleAction.GMAIL_SEARCH]: {
    id: GoogleAction.GMAIL_SEARCH,
    ecosystem: MCPEcosystem.GOOGLE,
    category: 'action',
    name: 'Search Emails',
    description: 'Search Gmail messages',
    icon: 'Search',
    requiredFields: ['query'],
    optionalFields: ['maxResults', 'labelIds'],
    outputVariables: ['messages', 'resultCount'],
    requiresAuth: true
  },
  [GoogleAction.GMAIL_READ]: {
    id: GoogleAction.GMAIL_READ,
    ecosystem: MCPEcosystem.GOOGLE,
    category: 'action',
    name: 'Read Email',
    description: 'Read specific Gmail message',
    icon: 'MailOpen',
    requiredFields: ['messageId'],
    optionalFields: ['format'],
    outputVariables: ['from', 'to', 'subject', 'body', 'attachments'],
    requiresAuth: true
  },
  [GoogleAction.GMAIL_ADD_LABEL]: {
    id: GoogleAction.GMAIL_ADD_LABEL,
    ecosystem: MCPEcosystem.GOOGLE,
    category: 'action',
    name: 'Add Label',
    description: 'Add label to Gmail message',
    icon: 'Tag',
    requiredFields: ['messageId', 'labelId'],
    optionalFields: [],
    outputVariables: ['success'],
    requiresAuth: true
  },
  [GoogleAction.DRIVE_UPLOAD]: {
    id: GoogleAction.DRIVE_UPLOAD,
    ecosystem: MCPEcosystem.GOOGLE,
    category: 'action',
    name: 'Upload File',
    description: 'Upload file to Google Drive',
    icon: 'Upload',
    requiredFields: ['fileName', 'fileContent'],
    optionalFields: ['folderId', 'mimeType'],
    outputVariables: ['fileId', 'fileUrl'],
    requiresAuth: true
  },
  [GoogleAction.DRIVE_DOWNLOAD]: {
    id: GoogleAction.DRIVE_DOWNLOAD,
    ecosystem: MCPEcosystem.GOOGLE,
    category: 'action',
    name: 'Download File',
    description: 'Download file from Google Drive',
    icon: 'Download',
    requiredFields: ['fileId'],
    optionalFields: ['mimeType'],
    outputVariables: ['fileContent', 'fileName'],
    requiresAuth: true
  },
  [GoogleAction.DRIVE_SHARE]: {
    id: GoogleAction.DRIVE_SHARE,
    ecosystem: MCPEcosystem.GOOGLE,
    category: 'action',
    name: 'Share File',
    description: 'Share Google Drive file',
    icon: 'Share2',
    requiredFields: ['fileId', 'email', 'role'],
    optionalFields: ['sendNotification'],
    outputVariables: ['permissionId'],
    requiresAuth: true
  },
  [GoogleAction.DRIVE_CREATE_FOLDER]: {
    id: GoogleAction.DRIVE_CREATE_FOLDER,
    ecosystem: MCPEcosystem.GOOGLE,
    category: 'action',
    name: 'Create Folder',
    description: 'Create folder in Google Drive',
    icon: 'FolderPlus',
    requiredFields: ['folderName'],
    optionalFields: ['parentFolderId'],
    outputVariables: ['folderId', 'folderUrl'],
    requiresAuth: true
  },
  [GoogleAction.CALENDAR_CREATE_EVENT]: {
    id: GoogleAction.CALENDAR_CREATE_EVENT,
    ecosystem: MCPEcosystem.GOOGLE,
    category: 'action',
    name: 'Create Calendar Event',
    description: 'Create Google Calendar event',
    icon: 'CalendarPlus',
    requiredFields: ['summary', 'startTime', 'endTime'],
    optionalFields: ['description', 'attendees', 'location'],
    outputVariables: ['eventId', 'eventLink'],
    requiresAuth: true
  },
  [GoogleAction.CALENDAR_UPDATE_EVENT]: {
    id: GoogleAction.CALENDAR_UPDATE_EVENT,
    ecosystem: MCPEcosystem.GOOGLE,
    category: 'action',
    name: 'Update Calendar Event',
    description: 'Update Google Calendar event',
    icon: 'CalendarCheck',
    requiredFields: ['eventId'],
    optionalFields: ['summary', 'startTime', 'endTime', 'description'],
    outputVariables: ['success'],
    requiresAuth: true
  },
  [GoogleAction.SHEETS_APPEND_ROW]: {
    id: GoogleAction.SHEETS_APPEND_ROW,
    ecosystem: MCPEcosystem.GOOGLE,
    category: 'action',
    name: 'Append Row to Sheet',
    description: 'Append row to Google Sheet',
    icon: 'TableProperties',
    requiredFields: ['spreadsheetId', 'range', 'values'],
    optionalFields: ['valueInputOption'],
    outputVariables: ['updatedRange', 'updatedRows'],
    requiresAuth: true
  },
  [GoogleAction.SHEETS_READ_RANGE]: {
    id: GoogleAction.SHEETS_READ_RANGE,
    ecosystem: MCPEcosystem.GOOGLE,
    category: 'action',
    name: 'Read Sheet Range',
    description: 'Read range from Google Sheet',
    icon: 'Table',
    requiredFields: ['spreadsheetId', 'range'],
    optionalFields: [],
    outputVariables: ['values', 'rowCount'],
    requiresAuth: true
  },

  // ==================== AWS ACTIONS ====================
  [AWSAction.S3_UPLOAD]: {
    id: AWSAction.S3_UPLOAD,
    ecosystem: MCPEcosystem.AWS,
    category: 'action',
    name: 'Upload to S3',
    description: 'Upload file to S3 bucket',
    icon: 'Upload',
    requiredFields: ['bucket', 'key', 'body'],
    optionalFields: ['contentType', 'acl'],
    outputVariables: ['etag', 'location'],
    requiresAuth: true
  },
  [AWSAction.S3_DOWNLOAD]: {
    id: AWSAction.S3_DOWNLOAD,
    ecosystem: MCPEcosystem.AWS,
    category: 'action',
    name: 'Download from S3',
    description: 'Download file from S3 bucket',
    icon: 'Download',
    requiredFields: ['bucket', 'key'],
    optionalFields: [],
    outputVariables: ['body', 'contentType'],
    requiresAuth: true
  },
  [AWSAction.S3_DELETE]: {
    id: AWSAction.S3_DELETE,
    ecosystem: MCPEcosystem.AWS,
    category: 'action',
    name: 'Delete from S3',
    description: 'Delete file from S3 bucket',
    icon: 'Trash2',
    requiredFields: ['bucket', 'key'],
    optionalFields: [],
    outputVariables: ['success'],
    requiresAuth: true
  },
  [AWSAction.S3_LIST_OBJECTS]: {
    id: AWSAction.S3_LIST_OBJECTS,
    ecosystem: MCPEcosystem.AWS,
    category: 'action',
    name: 'List S3 Objects',
    description: 'List objects in S3 bucket',
    icon: 'List',
    requiredFields: ['bucket'],
    optionalFields: ['prefix', 'maxKeys'],
    outputVariables: ['objects', 'count'],
    requiresAuth: true
  },
  [AWSAction.SNS_PUBLISH]: {
    id: AWSAction.SNS_PUBLISH,
    ecosystem: MCPEcosystem.AWS,
    category: 'action',
    name: 'Publish SNS Message',
    description: 'Publish message to SNS topic',
    icon: 'Bell',
    requiredFields: ['topicArn', 'message'],
    optionalFields: ['subject', 'messageAttributes'],
    outputVariables: ['messageId'],
    requiresAuth: true
  },
  [AWSAction.SNS_CREATE_TOPIC]: {
    id: AWSAction.SNS_CREATE_TOPIC,
    ecosystem: MCPEcosystem.AWS,
    category: 'action',
    name: 'Create SNS Topic',
    description: 'Create SNS topic',
    icon: 'PlusCircle',
    requiredFields: ['name'],
    optionalFields: ['displayName'],
    outputVariables: ['topicArn'],
    requiresAuth: true
  },
  [AWSAction.SQS_SEND_MESSAGE]: {
    id: AWSAction.SQS_SEND_MESSAGE,
    ecosystem: MCPEcosystem.AWS,
    category: 'action',
    name: 'Send SQS Message',
    description: 'Send message to SQS queue',
    icon: 'Send',
    requiredFields: ['queueUrl', 'messageBody'],
    optionalFields: ['delaySeconds', 'messageAttributes'],
    outputVariables: ['messageId'],
    requiresAuth: true
  },
  [AWSAction.SQS_RECEIVE_MESSAGE]: {
    id: AWSAction.SQS_RECEIVE_MESSAGE,
    ecosystem: MCPEcosystem.AWS,
    category: 'action',
    name: 'Receive SQS Message',
    description: 'Receive message from SQS queue',
    icon: 'Inbox',
    requiredFields: ['queueUrl'],
    optionalFields: ['maxMessages', 'waitTimeSeconds'],
    outputVariables: ['messages'],
    requiresAuth: true
  },
  [AWSAction.LAMBDA_INVOKE]: {
    id: AWSAction.LAMBDA_INVOKE,
    ecosystem: MCPEcosystem.AWS,
    category: 'action',
    name: 'Invoke Lambda',
    description: 'Invoke Lambda function synchronously',
    icon: 'Zap',
    requiredFields: ['functionName', 'payload'],
    optionalFields: [],
    outputVariables: ['response', 'statusCode'],
    requiresAuth: true
  },
  [AWSAction.LAMBDA_INVOKE_ASYNC]: {
    id: AWSAction.LAMBDA_INVOKE_ASYNC,
    ecosystem: MCPEcosystem.AWS,
    category: 'action',
    name: 'Invoke Lambda (Async)',
    description: 'Invoke Lambda function asynchronously',
    icon: 'Workflow',
    requiredFields: ['functionName', 'payload'],
    optionalFields: [],
    outputVariables: ['requestId'],
    requiresAuth: true
  },
  [AWSAction.DYNAMODB_PUT_ITEM]: {
    id: AWSAction.DYNAMODB_PUT_ITEM,
    ecosystem: MCPEcosystem.AWS,
    category: 'action',
    name: 'Put DynamoDB Item',
    description: 'Put item in DynamoDB table',
    icon: 'Database',
    requiredFields: ['tableName', 'item'],
    optionalFields: ['conditionExpression'],
    outputVariables: ['success'],
    requiresAuth: true
  },

  // ==================== META/INSTAGRAM ACTIONS ====================
  [MetaAction.INSTAGRAM_POST_IMAGE]: {
    id: MetaAction.INSTAGRAM_POST_IMAGE,
    ecosystem: MCPEcosystem.META,
    category: 'action',
    name: 'Post Instagram Image',
    description: 'Post image to Instagram',
    icon: 'Image',
    requiredFields: ['imageUrl', 'caption'],
    optionalFields: ['location', 'userTags'],
    outputVariables: ['mediaId', 'permalink'],
    requiresAuth: true
  },
  [MetaAction.INSTAGRAM_POST_VIDEO]: {
    id: MetaAction.INSTAGRAM_POST_VIDEO,
    ecosystem: MCPEcosystem.META,
    category: 'action',
    name: 'Post Instagram Video',
    description: 'Post video to Instagram',
    icon: 'Video',
    requiredFields: ['videoUrl', 'caption'],
    optionalFields: ['coverImageUrl', 'location'],
    outputVariables: ['mediaId', 'permalink'],
    requiresAuth: true
  },
  [MetaAction.INSTAGRAM_POST_STORY]: {
    id: MetaAction.INSTAGRAM_POST_STORY,
    ecosystem: MCPEcosystem.META,
    category: 'action',
    name: 'Post Instagram Story',
    description: 'Post story to Instagram',
    icon: 'Sparkles',
    requiredFields: ['mediaUrl'],
    optionalFields: ['stickers', 'interactiveElements'],
    outputVariables: ['storyId'],
    requiresAuth: true
  },
  [MetaAction.INSTAGRAM_REPLY_COMMENT]: {
    id: MetaAction.INSTAGRAM_REPLY_COMMENT,
    ecosystem: MCPEcosystem.META,
    category: 'action',
    name: 'Reply to Instagram Comment',
    description: 'Reply to Instagram comment',
    icon: 'MessageCircle',
    requiredFields: ['commentId', 'message'],
    optionalFields: [],
    outputVariables: ['replyId'],
    requiresAuth: true
  },
  [MetaAction.INSTAGRAM_REPLY_DM]: {
    id: MetaAction.INSTAGRAM_REPLY_DM,
    ecosystem: MCPEcosystem.META,
    category: 'action',
    name: 'Reply to Instagram DM',
    description: 'Reply to Instagram direct message',
    icon: 'Mail',
    requiredFields: ['conversationId', 'message'],
    optionalFields: ['attachments'],
    outputVariables: ['messageId'],
    requiresAuth: true
  },
  [MetaAction.INSTAGRAM_GET_INSIGHTS]: {
    id: MetaAction.INSTAGRAM_GET_INSIGHTS,
    ecosystem: MCPEcosystem.META,
    category: 'action',
    name: 'Get Instagram Insights',
    description: 'Get Instagram post insights',
    icon: 'BarChart3',
    requiredFields: ['mediaId'],
    optionalFields: ['metrics'],
    outputVariables: ['impressions', 'reach', 'engagement'],
    requiresAuth: true
  },
  [MetaAction.FACEBOOK_POST]: {
    id: MetaAction.FACEBOOK_POST,
    ecosystem: MCPEcosystem.META,
    category: 'action',
    name: 'Post to Facebook',
    description: 'Create Facebook post',
    icon: 'FileText',
    requiredFields: ['message'],
    optionalFields: ['link', 'imageUrl'],
    outputVariables: ['postId'],
    requiresAuth: true
  },
  [MetaAction.FACEBOOK_COMMENT]: {
    id: MetaAction.FACEBOOK_COMMENT,
    ecosystem: MCPEcosystem.META,
    category: 'action',
    name: 'Comment on Facebook Post',
    description: 'Comment on Facebook post',
    icon: 'MessageSquare',
    requiredFields: ['postId', 'message'],
    optionalFields: [],
    outputVariables: ['commentId'],
    requiresAuth: true
  },
  [MetaAction.FACEBOOK_SEND_MESSAGE]: {
    id: MetaAction.FACEBOOK_SEND_MESSAGE,
    ecosystem: MCPEcosystem.META,
    category: 'action',
    name: 'Send Facebook Message',
    description: 'Send Facebook Messenger message',
    icon: 'Send',
    requiredFields: ['recipientId', 'message'],
    optionalFields: ['quickReplies'],
    outputVariables: ['messageId'],
    requiresAuth: true
  },

  // ==================== MICROSOFT 365 ACTIONS ====================
  [MicrosoftAction.OUTLOOK_SEND_EMAIL]: {
    id: MicrosoftAction.OUTLOOK_SEND_EMAIL,
    ecosystem: MCPEcosystem.MICROSOFT,
    category: 'action',
    name: 'Send Outlook Email',
    description: 'Send email via Outlook',
    icon: 'Mail',
    requiredFields: ['to', 'subject', 'body'],
    optionalFields: ['cc', 'bcc', 'attachments'],
    outputVariables: ['messageId'],
    requiresAuth: true
  },
  [MicrosoftAction.OUTLOOK_CREATE_CALENDAR_EVENT]: {
    id: MicrosoftAction.OUTLOOK_CREATE_CALENDAR_EVENT,
    ecosystem: MCPEcosystem.MICROSOFT,
    category: 'action',
    name: 'Create Outlook Event',
    description: 'Create Outlook calendar event',
    icon: 'Calendar',
    requiredFields: ['subject', 'startTime', 'endTime'],
    optionalFields: ['attendees', 'location', 'body'],
    outputVariables: ['eventId'],
    requiresAuth: true
  },
  [MicrosoftAction.TEAMS_SEND_MESSAGE]: {
    id: MicrosoftAction.TEAMS_SEND_MESSAGE,
    ecosystem: MCPEcosystem.MICROSOFT,
    category: 'action',
    name: 'Send Teams Message',
    description: 'Send message to Teams channel',
    icon: 'MessageSquare',
    requiredFields: ['channelId', 'message'],
    optionalFields: ['mentions'],
    outputVariables: ['messageId'],
    requiresAuth: true
  },
  [MicrosoftAction.TEAMS_CREATE_CHANNEL]: {
    id: MicrosoftAction.TEAMS_CREATE_CHANNEL,
    ecosystem: MCPEcosystem.MICROSOFT,
    category: 'action',
    name: 'Create Teams Channel',
    description: 'Create Teams channel',
    icon: 'Hash',
    requiredFields: ['teamId', 'displayName'],
    optionalFields: ['description', 'membershipType'],
    outputVariables: ['channelId'],
    requiresAuth: true
  },
  [MicrosoftAction.TEAMS_POST_ADAPTIVE_CARD]: {
    id: MicrosoftAction.TEAMS_POST_ADAPTIVE_CARD,
    ecosystem: MCPEcosystem.MICROSOFT,
    category: 'action',
    name: 'Post Teams Adaptive Card',
    description: 'Post Adaptive Card to Teams',
    icon: 'Layout',
    requiredFields: ['channelId', 'cardJson'],
    optionalFields: [],
    outputVariables: ['messageId'],
    requiresAuth: true
  },
  [MicrosoftAction.ONEDRIVE_UPLOAD]: {
    id: MicrosoftAction.ONEDRIVE_UPLOAD,
    ecosystem: MCPEcosystem.MICROSOFT,
    category: 'action',
    name: 'Upload to OneDrive',
    description: 'Upload file to OneDrive',
    icon: 'Upload',
    requiredFields: ['fileName', 'fileContent'],
    optionalFields: ['folderPath'],
    outputVariables: ['fileId', 'webUrl'],
    requiresAuth: true
  },
  [MicrosoftAction.ONEDRIVE_SHARE]: {
    id: MicrosoftAction.ONEDRIVE_SHARE,
    ecosystem: MCPEcosystem.MICROSOFT,
    category: 'action',
    name: 'Share OneDrive File',
    description: 'Share OneDrive file',
    icon: 'Share2',
    requiredFields: ['fileId', 'email'],
    optionalFields: ['role', 'sendInvitation'],
    outputVariables: ['permissionId'],
    requiresAuth: true
  },

  // ==================== STRIPE ACTIONS ====================
  [StripeAction.CREATE_PAYMENT_INTENT]: {
    id: StripeAction.CREATE_PAYMENT_INTENT,
    ecosystem: MCPEcosystem.STRIPE,
    category: 'action',
    name: 'Create Payment Intent',
    description: 'Create Stripe payment intent',
    icon: 'CreditCard',
    requiredFields: ['amount', 'currency'],
    optionalFields: ['customerId', 'description', 'metadata'],
    outputVariables: ['paymentIntentId', 'clientSecret'],
    requiresAuth: true
  },
  [StripeAction.CREATE_CUSTOMER]: {
    id: StripeAction.CREATE_CUSTOMER,
    ecosystem: MCPEcosystem.STRIPE,
    category: 'action',
    name: 'Create Customer',
    description: 'Create Stripe customer',
    icon: 'User',
    requiredFields: ['email'],
    optionalFields: ['name', 'phone', 'metadata'],
    outputVariables: ['customerId'],
    requiresAuth: true
  },
  [StripeAction.CREATE_SUBSCRIPTION]: {
    id: StripeAction.CREATE_SUBSCRIPTION,
    ecosystem: MCPEcosystem.STRIPE,
    category: 'action',
    name: 'Create Subscription',
    description: 'Create Stripe subscription',
    icon: 'Repeat',
    requiredFields: ['customerId', 'priceId'],
    optionalFields: ['trialDays', 'metadata'],
    outputVariables: ['subscriptionId', 'status'],
    requiresAuth: true
  },
  [StripeAction.CANCEL_SUBSCRIPTION]: {
    id: StripeAction.CANCEL_SUBSCRIPTION,
    ecosystem: MCPEcosystem.STRIPE,
    category: 'action',
    name: 'Cancel Subscription',
    description: 'Cancel Stripe subscription',
    icon: 'XCircle',
    requiredFields: ['subscriptionId'],
    optionalFields: ['cancelAtPeriodEnd'],
    outputVariables: ['status'],
    requiresAuth: true
  },
  [StripeAction.REFUND_PAYMENT]: {
    id: StripeAction.REFUND_PAYMENT,
    ecosystem: MCPEcosystem.STRIPE,
    category: 'action',
    name: 'Refund Payment',
    description: 'Refund Stripe payment',
    icon: 'RotateCcw',
    requiredFields: ['paymentIntentId'],
    optionalFields: ['amount', 'reason'],
    outputVariables: ['refundId', 'status'],
    requiresAuth: true
  },
  [StripeAction.CREATE_INVOICE]: {
    id: StripeAction.CREATE_INVOICE,
    ecosystem: MCPEcosystem.STRIPE,
    category: 'action',
    name: 'Create Invoice',
    description: 'Create Stripe invoice',
    icon: 'FileText',
    requiredFields: ['customerId'],
    optionalFields: ['dueDate', 'description'],
    outputVariables: ['invoiceId', 'invoiceUrl'],
    requiresAuth: true
  },

  // ==================== GOOGLE WORKSPACE TRIGGERS ====================
  [GoogleTrigger.GMAIL_RECEIVED]: {
    id: GoogleTrigger.GMAIL_RECEIVED,
    ecosystem: MCPEcosystem.GOOGLE,
    category: 'trigger',
    name: 'Gmail Received',
    description: 'Triggered when Gmail receives new email',
    icon: 'Mail',
    requiredFields: [],
    optionalFields: ['from', 'subject', 'hasAttachment'],
    outputVariables: ['messageId', 'from', 'to', 'subject', 'body'],
    requiresAuth: true,
    webhookSupport: true
  },
  [GoogleTrigger.DRIVE_FILE_CREATED]: {
    id: GoogleTrigger.DRIVE_FILE_CREATED,
    ecosystem: MCPEcosystem.GOOGLE,
    category: 'trigger',
    name: 'Drive File Created',
    description: 'Triggered when file is created in Drive',
    icon: 'FilePlus',
    requiredFields: [],
    optionalFields: ['folderId', 'fileType'],
    outputVariables: ['fileId', 'fileName', 'mimeType'],
    requiresAuth: true,
    webhookSupport: true
  },
  [GoogleTrigger.DRIVE_FILE_UPDATED]: {
    id: GoogleTrigger.DRIVE_FILE_UPDATED,
    ecosystem: MCPEcosystem.GOOGLE,
    category: 'trigger',
    name: 'Drive File Updated',
    description: 'Triggered when file is updated in Drive',
    icon: 'FileEdit',
    requiredFields: [],
    optionalFields: ['folderId', 'fileType'],
    outputVariables: ['fileId', 'fileName', 'modifiedBy'],
    requiresAuth: true,
    webhookSupport: true
  },
  [GoogleTrigger.CALENDAR_EVENT_CREATED]: {
    id: GoogleTrigger.CALENDAR_EVENT_CREATED,
    ecosystem: MCPEcosystem.GOOGLE,
    category: 'trigger',
    name: 'Calendar Event Created',
    description: 'Triggered when calendar event is created',
    icon: 'CalendarPlus',
    requiredFields: [],
    optionalFields: ['calendarId'],
    outputVariables: ['eventId', 'summary', 'startTime'],
    requiresAuth: true,
    webhookSupport: true
  },
  [GoogleTrigger.CALENDAR_EVENT_UPDATED]: {
    id: GoogleTrigger.CALENDAR_EVENT_UPDATED,
    ecosystem: MCPEcosystem.GOOGLE,
    category: 'trigger',
    name: 'Calendar Event Updated',
    description: 'Triggered when calendar event is updated',
    icon: 'CalendarCheck',
    requiredFields: [],
    optionalFields: ['calendarId'],
    outputVariables: ['eventId', 'summary', 'changedBy'],
    requiresAuth: true,
    webhookSupport: true
  },

  // ==================== AWS TRIGGERS ====================
  [AWSTrigger.S3_OBJECT_CREATED]: {
    id: AWSTrigger.S3_OBJECT_CREATED,
    ecosystem: MCPEcosystem.AWS,
    category: 'trigger',
    name: 'S3 Object Created',
    description: 'Triggered when S3 object is created',
    icon: 'FilePlus',
    requiredFields: ['bucket'],
    optionalFields: ['prefix', 'suffix'],
    outputVariables: ['key', 'bucket', 'etag', 'size'],
    requiresAuth: true,
    webhookSupport: true
  },
  [AWSTrigger.S3_OBJECT_DELETED]: {
    id: AWSTrigger.S3_OBJECT_DELETED,
    ecosystem: MCPEcosystem.AWS,
    category: 'trigger',
    name: 'S3 Object Deleted',
    description: 'Triggered when S3 object is deleted',
    icon: 'Trash2',
    requiredFields: ['bucket'],
    optionalFields: ['prefix', 'suffix'],
    outputVariables: ['key', 'bucket'],
    requiresAuth: true,
    webhookSupport: true
  },
  [AWSTrigger.SNS_MESSAGE_PUBLISHED]: {
    id: AWSTrigger.SNS_MESSAGE_PUBLISHED,
    ecosystem: MCPEcosystem.AWS,
    category: 'trigger',
    name: 'SNS Message Published',
    description: 'Triggered when SNS message is published',
    icon: 'Bell',
    requiredFields: ['topicArn'],
    optionalFields: [],
    outputVariables: ['message', 'subject', 'messageId'],
    requiresAuth: true,
    webhookSupport: true
  },
  [AWSTrigger.SQS_MESSAGE_RECEIVED]: {
    id: AWSTrigger.SQS_MESSAGE_RECEIVED,
    ecosystem: MCPEcosystem.AWS,
    category: 'trigger',
    name: 'SQS Message Received',
    description: 'Triggered when SQS message is received',
    icon: 'Inbox',
    requiredFields: ['queueUrl'],
    optionalFields: [],
    outputVariables: ['messageBody', 'messageId'],
    requiresAuth: true,
    webhookSupport: true
  },

  // ==================== META/INSTAGRAM TRIGGERS ====================
  [MetaTrigger.INSTAGRAM_COMMENT_CREATED]: {
    id: MetaTrigger.INSTAGRAM_COMMENT_CREATED,
    ecosystem: MCPEcosystem.META,
    category: 'trigger',
    name: 'Instagram Comment',
    description: 'Triggered when someone comments on Instagram',
    icon: 'MessageCircle',
    requiredFields: [],
    optionalFields: ['mediaId'],
    outputVariables: ['commentId', 'text', 'username'],
    requiresAuth: true,
    webhookSupport: true
  },
  [MetaTrigger.INSTAGRAM_DM_RECEIVED]: {
    id: MetaTrigger.INSTAGRAM_DM_RECEIVED,
    ecosystem: MCPEcosystem.META,
    category: 'trigger',
    name: 'Instagram DM Received',
    description: 'Triggered when Instagram DM is received',
    icon: 'Mail',
    requiredFields: [],
    optionalFields: [],
    outputVariables: ['conversationId', 'message', 'sender'],
    requiresAuth: true,
    webhookSupport: true
  },
  [MetaTrigger.INSTAGRAM_MENTION]: {
    id: MetaTrigger.INSTAGRAM_MENTION,
    ecosystem: MCPEcosystem.META,
    category: 'trigger',
    name: 'Instagram Mention',
    description: 'Triggered when account is mentioned',
    icon: 'AtSign',
    requiredFields: [],
    optionalFields: [],
    outputVariables: ['mediaId', 'caption', 'username'],
    requiresAuth: true,
    webhookSupport: true
  },
  [MetaTrigger.INSTAGRAM_STORY_MENTION]: {
    id: MetaTrigger.INSTAGRAM_STORY_MENTION,
    ecosystem: MCPEcosystem.META,
    category: 'trigger',
    name: 'Instagram Story Mention',
    description: 'Triggered when mentioned in story',
    icon: 'Sparkles',
    requiredFields: [],
    optionalFields: [],
    outputVariables: ['storyId', 'username'],
    requiresAuth: true,
    webhookSupport: true
  },
  [MetaTrigger.FACEBOOK_POST_CREATED]: {
    id: MetaTrigger.FACEBOOK_POST_CREATED,
    ecosystem: MCPEcosystem.META,
    category: 'trigger',
    name: 'Facebook Post Created',
    description: 'Triggered when Facebook post is created',
    icon: 'FileText',
    requiredFields: [],
    optionalFields: [],
    outputVariables: ['postId', 'message'],
    requiresAuth: true,
    webhookSupport: true
  },
  [MetaTrigger.FACEBOOK_COMMENT_CREATED]: {
    id: MetaTrigger.FACEBOOK_COMMENT_CREATED,
    ecosystem: MCPEcosystem.META,
    category: 'trigger',
    name: 'Facebook Comment',
    description: 'Triggered when someone comments on Facebook',
    icon: 'MessageSquare',
    requiredFields: [],
    optionalFields: ['postId'],
    outputVariables: ['commentId', 'message', 'username'],
    requiresAuth: true,
    webhookSupport: true
  },

  // ==================== MICROSOFT 365 TRIGGERS ====================
  [MicrosoftTrigger.OUTLOOK_EMAIL_RECEIVED]: {
    id: MicrosoftTrigger.OUTLOOK_EMAIL_RECEIVED,
    ecosystem: MCPEcosystem.MICROSOFT,
    category: 'trigger',
    name: 'Outlook Email Received',
    description: 'Triggered when Outlook email is received',
    icon: 'Mail',
    requiredFields: [],
    optionalFields: ['from', 'subject'],
    outputVariables: ['messageId', 'from', 'subject', 'body'],
    requiresAuth: true,
    webhookSupport: true
  },
  [MicrosoftTrigger.TEAMS_MESSAGE_POSTED]: {
    id: MicrosoftTrigger.TEAMS_MESSAGE_POSTED,
    ecosystem: MCPEcosystem.MICROSOFT,
    category: 'trigger',
    name: 'Teams Message Posted',
    description: 'Triggered when Teams message is posted',
    icon: 'MessageSquare',
    requiredFields: ['channelId'],
    optionalFields: [],
    outputVariables: ['messageId', 'message', 'from'],
    requiresAuth: true,
    webhookSupport: true
  },
  [MicrosoftTrigger.TEAMS_CHANNEL_CREATED]: {
    id: MicrosoftTrigger.TEAMS_CHANNEL_CREATED,
    ecosystem: MCPEcosystem.MICROSOFT,
    category: 'trigger',
    name: 'Teams Channel Created',
    description: 'Triggered when Teams channel is created',
    icon: 'Hash',
    requiredFields: ['teamId'],
    optionalFields: [],
    outputVariables: ['channelId', 'displayName'],
    requiresAuth: true,
    webhookSupport: true
  },
  [MicrosoftTrigger.ONEDRIVE_FILE_UPDATED]: {
    id: MicrosoftTrigger.ONEDRIVE_FILE_UPDATED,
    ecosystem: MCPEcosystem.MICROSOFT,
    category: 'trigger',
    name: 'OneDrive File Updated',
    description: 'Triggered when OneDrive file is updated',
    icon: 'FileEdit',
    requiredFields: [],
    optionalFields: ['folderPath'],
    outputVariables: ['fileId', 'fileName', 'modifiedBy'],
    requiresAuth: true,
    webhookSupport: true
  },

  // ==================== STRIPE TRIGGERS ====================
  [StripeTrigger.PAYMENT_INTENT_SUCCEEDED]: {
    id: StripeTrigger.PAYMENT_INTENT_SUCCEEDED,
    ecosystem: MCPEcosystem.STRIPE,
    category: 'trigger',
    name: 'Payment Succeeded',
    description: 'Triggered when payment succeeds',
    icon: 'CheckCircle',
    requiredFields: [],
    optionalFields: [],
    outputVariables: ['paymentIntentId', 'amount', 'customerId'],
    requiresAuth: true,
    webhookSupport: true
  },
  [StripeTrigger.PAYMENT_INTENT_FAILED]: {
    id: StripeTrigger.PAYMENT_INTENT_FAILED,
    ecosystem: MCPEcosystem.STRIPE,
    category: 'trigger',
    name: 'Payment Failed',
    description: 'Triggered when payment fails',
    icon: 'XCircle',
    requiredFields: [],
    optionalFields: [],
    outputVariables: ['paymentIntentId', 'failureReason'],
    requiresAuth: true,
    webhookSupport: true
  },
  [StripeTrigger.CUSTOMER_CREATED]: {
    id: StripeTrigger.CUSTOMER_CREATED,
    ecosystem: MCPEcosystem.STRIPE,
    category: 'trigger',
    name: 'Customer Created',
    description: 'Triggered when customer is created',
    icon: 'UserPlus',
    requiredFields: [],
    optionalFields: [],
    outputVariables: ['customerId', 'email'],
    requiresAuth: true,
    webhookSupport: true
  },
  [StripeTrigger.SUBSCRIPTION_CREATED]: {
    id: StripeTrigger.SUBSCRIPTION_CREATED,
    ecosystem: MCPEcosystem.STRIPE,
    category: 'trigger',
    name: 'Subscription Created',
    description: 'Triggered when subscription is created',
    icon: 'Repeat',
    requiredFields: [],
    optionalFields: [],
    outputVariables: ['subscriptionId', 'customerId', 'status'],
    requiresAuth: true,
    webhookSupport: true
  },
  [StripeTrigger.SUBSCRIPTION_DELETED]: {
    id: StripeTrigger.SUBSCRIPTION_DELETED,
    ecosystem: MCPEcosystem.STRIPE,
    category: 'trigger',
    name: 'Subscription Deleted',
    description: 'Triggered when subscription is deleted',
    icon: 'XCircle',
    requiredFields: [],
    optionalFields: [],
    outputVariables: ['subscriptionId', 'customerId'],
    requiresAuth: true,
    webhookSupport: true
  },
  [StripeTrigger.INVOICE_PAID]: {
    id: StripeTrigger.INVOICE_PAID,
    ecosystem: MCPEcosystem.STRIPE,
    category: 'trigger',
    name: 'Invoice Paid',
    description: 'Triggered when invoice is paid',
    icon: 'DollarSign',
    requiredFields: [],
    optionalFields: [],
    outputVariables: ['invoiceId', 'customerId', 'amountPaid'],
    requiresAuth: true,
    webhookSupport: true
  },

  // ==================== GTM/ANALYTICS TRIGGERS ====================
  [GTMTrigger.FORM_SUBMISSION]: {
    id: GTMTrigger.FORM_SUBMISSION,
    ecosystem: MCPEcosystem.GTM,
    category: 'trigger',
    name: 'Form Submission',
    description: 'Triggered when GTM form is submitted',
    icon: 'CheckSquare',
    requiredFields: ['formId'],
    optionalFields: [],
    outputVariables: ['formId', 'formData', 'userId'],
    requiresAuth: false,
    webhookSupport: true
  },
  [GTMTrigger.CONVERSION_EVENT]: {
    id: GTMTrigger.CONVERSION_EVENT,
    ecosystem: MCPEcosystem.GTM,
    category: 'trigger',
    name: 'Conversion Event',
    description: 'Triggered when conversion event occurs',
    icon: 'Target',
    requiredFields: ['eventName'],
    optionalFields: [],
    outputVariables: ['eventName', 'eventValue', 'userId'],
    requiresAuth: false,
    webhookSupport: true
  },
  [GTMTrigger.PAGE_VIEW]: {
    id: GTMTrigger.PAGE_VIEW,
    ecosystem: MCPEcosystem.GTM,
    category: 'trigger',
    name: 'Page View',
    description: 'Triggered when page is viewed',
    icon: 'Eye',
    requiredFields: ['pageUrl'],
    optionalFields: [],
    outputVariables: ['pageUrl', 'pageTitle', 'userId'],
    requiresAuth: false,
    webhookSupport: true
  },
  
  // E-commerce tracking
  [GTMTrigger.PRODUCT_VIEW]: {
    id: GTMTrigger.PRODUCT_VIEW,
    ecosystem: MCPEcosystem.GTM,
    category: 'trigger',
    name: 'Product View',
    description: 'Triggered when product is viewed',
    icon: 'Package',
    requiredFields: ['productId'],
    optionalFields: [],
    outputVariables: ['productId', 'productName', 'price', 'category'],
    requiresAuth: false,
    webhookSupport: true
  },
  [GTMTrigger.ADD_TO_CART]: {
    id: GTMTrigger.ADD_TO_CART,
    ecosystem: MCPEcosystem.GTM,
    category: 'trigger',
    name: 'Add to Cart',
    description: 'Triggered when item is added to cart',
    icon: 'ShoppingCart',
    requiredFields: ['productId', 'quantity'],
    optionalFields: [],
    outputVariables: ['productId', 'quantity', 'price', 'cartValue'],
    requiresAuth: false,
    webhookSupport: true
  },
  [GTMTrigger.REMOVE_FROM_CART]: {
    id: GTMTrigger.REMOVE_FROM_CART,
    ecosystem: MCPEcosystem.GTM,
    category: 'trigger',
    name: 'Remove from Cart',
    description: 'Triggered when item is removed from cart',
    icon: 'Trash2',
    requiredFields: ['productId'],
    optionalFields: [],
    outputVariables: ['productId', 'quantity', 'cartValue'],
    requiresAuth: false,
    webhookSupport: true
  },
  [GTMTrigger.CHECKOUT_STARTED]: {
    id: GTMTrigger.CHECKOUT_STARTED,
    ecosystem: MCPEcosystem.GTM,
    category: 'trigger',
    name: 'Checkout Started',
    description: 'Triggered when checkout process begins',
    icon: 'CreditCard',
    requiredFields: ['cartValue'],
    optionalFields: [],
    outputVariables: ['cartValue', 'itemCount', 'userId'],
    requiresAuth: false,
    webhookSupport: true
  },
  [GTMTrigger.PURCHASE_COMPLETED]: {
    id: GTMTrigger.PURCHASE_COMPLETED,
    ecosystem: MCPEcosystem.GTM,
    category: 'trigger',
    name: 'Purchase Completed',
    description: 'Triggered when purchase is completed',
    icon: 'CheckCircle',
    requiredFields: ['orderId', 'totalAmount'],
    optionalFields: [],
    outputVariables: ['orderId', 'totalAmount', 'items', 'userId'],
    requiresAuth: false,
    webhookSupport: true
  },
  
  // User engagement
  [GTMTrigger.SCROLL_DEPTH]: {
    id: GTMTrigger.SCROLL_DEPTH,
    ecosystem: MCPEcosystem.GTM,
    category: 'trigger',
    name: 'Scroll Depth',
    description: 'Triggered when user scrolls to specific depth',
    icon: 'ArrowDown',
    requiredFields: ['scrollPercentage'],
    optionalFields: [],
    outputVariables: ['scrollPercentage', 'pageUrl'],
    requiresAuth: false,
    webhookSupport: true
  },
  [GTMTrigger.VIDEO_PLAY]: {
    id: GTMTrigger.VIDEO_PLAY,
    ecosystem: MCPEcosystem.GTM,
    category: 'trigger',
    name: 'Video Play',
    description: 'Triggered when video playback starts',
    icon: 'Play',
    requiredFields: ['videoId'],
    optionalFields: [],
    outputVariables: ['videoId', 'videoTitle', 'duration'],
    requiresAuth: false,
    webhookSupport: true
  },
  [GTMTrigger.VIDEO_COMPLETE]: {
    id: GTMTrigger.VIDEO_COMPLETE,
    ecosystem: MCPEcosystem.GTM,
    category: 'trigger',
    name: 'Video Complete',
    description: 'Triggered when video playback completes',
    icon: 'CheckCircle',
    requiredFields: ['videoId'],
    optionalFields: [],
    outputVariables: ['videoId', 'watchTime', 'completionRate'],
    requiresAuth: false,
    webhookSupport: true
  },
  [GTMTrigger.LINK_CLICK]: {
    id: GTMTrigger.LINK_CLICK,
    ecosystem: MCPEcosystem.GTM,
    category: 'trigger',
    name: 'Link Click',
    description: 'Triggered when link is clicked',
    icon: 'MousePointer',
    requiredFields: ['linkUrl'],
    optionalFields: [],
    outputVariables: ['linkUrl', 'linkText', 'isExternal'],
    requiresAuth: false,
    webhookSupport: true
  },
  
  // Custom & Error tracking
  [GTMTrigger.CUSTOM_EVENT]: {
    id: GTMTrigger.CUSTOM_EVENT,
    ecosystem: MCPEcosystem.GTM,
    category: 'trigger',
    name: 'Custom Event',
    description: 'Triggered for custom tracking events',
    icon: 'Zap',
    requiredFields: ['eventName'],
    optionalFields: ['eventData'],
    outputVariables: ['eventName', 'eventData', 'timestamp'],
    requiresAuth: false,
    webhookSupport: true
  },
  [GTMTrigger.ERROR_TRACKING]: {
    id: GTMTrigger.ERROR_TRACKING,
    ecosystem: MCPEcosystem.GTM,
    category: 'trigger',
    name: 'Error Tracking',
    description: 'Triggered when JavaScript error occurs',
    icon: 'AlertTriangle',
    requiredFields: ['errorMessage'],
    optionalFields: [],
    outputVariables: ['errorMessage', 'errorStack', 'pageUrl'],
    requiresAuth: false,
    webhookSupport: true
  },
  [GTMTrigger.USER_TIMING]: {
    id: GTMTrigger.USER_TIMING,
    ecosystem: MCPEcosystem.GTM,
    category: 'trigger',
    name: 'User Timing',
    description: 'Triggered for performance timing measurements',
    icon: 'Clock',
    requiredFields: ['timingCategory', 'timingValue'],
    optionalFields: [],
    outputVariables: ['timingCategory', 'timingValue', 'timingLabel'],
    requiresAuth: false,
    webhookSupport: true
  },
  
  // ==================== POSTGRESQL ACTIONS ====================
  [PostgreSQLAction.EXECUTE_QUERY]: {
    id: PostgreSQLAction.EXECUTE_QUERY,
    ecosystem: MCPEcosystem.POSTGRESQL,
    category: 'action',
    name: 'Execute Query',
    description: 'Execute SELECT query',
    icon: 'Search',
    requiredFields: ['query'],
    optionalFields: ['parameters'],
    outputVariables: ['rows', 'rowCount'],
    requiresAuth: true
  },
  [PostgreSQLAction.EXECUTE_RAW_SQL]: {
    id: PostgreSQLAction.EXECUTE_RAW_SQL,
    ecosystem: MCPEcosystem.POSTGRESQL,
    category: 'action',
    name: 'Execute Raw SQL',
    description: 'Execute raw SQL statement',
    icon: 'Terminal',
    requiredFields: ['sql'],
    optionalFields: ['parameters'],
    outputVariables: ['result', 'affectedRows'],
    requiresAuth: true
  },
  [PostgreSQLAction.INSERT_ROW]: {
    id: PostgreSQLAction.INSERT_ROW,
    ecosystem: MCPEcosystem.POSTGRESQL,
    category: 'action',
    name: 'Insert Row',
    description: 'Insert new row into table',
    icon: 'PlusCircle',
    requiredFields: ['table', 'data'],
    optionalFields: ['returning'],
    outputVariables: ['insertedId', 'insertedRow'],
    requiresAuth: true
  },
  [PostgreSQLAction.UPDATE_ROW]: {
    id: PostgreSQLAction.UPDATE_ROW,
    ecosystem: MCPEcosystem.POSTGRESQL,
    category: 'action',
    name: 'Update Row',
    description: 'Update existing row',
    icon: 'Edit',
    requiredFields: ['table', 'where', 'data'],
    optionalFields: ['returning'],
    outputVariables: ['updatedCount', 'updatedRows'],
    requiresAuth: true
  },
  [PostgreSQLAction.DELETE_ROW]: {
    id: PostgreSQLAction.DELETE_ROW,
    ecosystem: MCPEcosystem.POSTGRESQL,
    category: 'action',
    name: 'Delete Row',
    description: 'Delete row from table',
    icon: 'Trash2',
    requiredFields: ['table', 'where'],
    optionalFields: ['returning'],
    outputVariables: ['deletedCount', 'deletedRows'],
    requiresAuth: true
  },
  [PostgreSQLAction.BEGIN_TRANSACTION]: {
    id: PostgreSQLAction.BEGIN_TRANSACTION,
    ecosystem: MCPEcosystem.POSTGRESQL,
    category: 'action',
    name: 'Begin Transaction',
    description: 'Start database transaction',
    icon: 'Lock',
    requiredFields: [],
    optionalFields: ['isolationLevel'],
    outputVariables: ['transactionId'],
    requiresAuth: true
  },
  [PostgreSQLAction.COMMIT_TRANSACTION]: {
    id: PostgreSQLAction.COMMIT_TRANSACTION,
    ecosystem: MCPEcosystem.POSTGRESQL,
    category: 'action',
    name: 'Commit Transaction',
    description: 'Commit active transaction',
    icon: 'Check',
    requiredFields: ['transactionId'],
    optionalFields: [],
    outputVariables: ['success'],
    requiresAuth: true
  },
  [PostgreSQLAction.ROLLBACK_TRANSACTION]: {
    id: PostgreSQLAction.ROLLBACK_TRANSACTION,
    ecosystem: MCPEcosystem.POSTGRESQL,
    category: 'action',
    name: 'Rollback Transaction',
    description: 'Rollback active transaction',
    icon: 'RotateCcw',
    requiredFields: ['transactionId'],
    optionalFields: [],
    outputVariables: ['success'],
    requiresAuth: true
  },
  [PostgreSQLAction.CREATE_TABLE]: {
    id: PostgreSQLAction.CREATE_TABLE,
    ecosystem: MCPEcosystem.POSTGRESQL,
    category: 'action',
    name: 'Create Table',
    description: 'Create new database table',
    icon: 'Table',
    requiredFields: ['tableName', 'columns'],
    optionalFields: ['ifNotExists'],
    outputVariables: ['success', 'tableName'],
    requiresAuth: true
  },
  
  // ==================== POSTGRESQL TRIGGERS ====================
  [PostgreSQLTrigger.ROW_INSERTED]: {
    id: PostgreSQLTrigger.ROW_INSERTED,
    ecosystem: MCPEcosystem.POSTGRESQL,
    category: 'trigger',
    name: 'Row Inserted',
    description: 'Triggered when row is inserted',
    icon: 'PlusCircle',
    requiredFields: ['table'],
    optionalFields: [],
    outputVariables: ['insertedRow', 'tableName'],
    requiresAuth: true,
    webhookSupport: true
  },
  [PostgreSQLTrigger.ROW_UPDATED]: {
    id: PostgreSQLTrigger.ROW_UPDATED,
    ecosystem: MCPEcosystem.POSTGRESQL,
    category: 'trigger',
    name: 'Row Updated',
    description: 'Triggered when row is updated',
    icon: 'Edit',
    requiredFields: ['table'],
    optionalFields: [],
    outputVariables: ['oldRow', 'newRow', 'tableName'],
    requiresAuth: true,
    webhookSupport: true
  },
  [PostgreSQLTrigger.ROW_DELETED]: {
    id: PostgreSQLTrigger.ROW_DELETED,
    ecosystem: MCPEcosystem.POSTGRESQL,
    category: 'trigger',
    name: 'Row Deleted',
    description: 'Triggered when row is deleted',
    icon: 'Trash2',
    requiredFields: ['table'],
    optionalFields: [],
    outputVariables: ['deletedRow', 'tableName'],
    requiresAuth: true,
    webhookSupport: true
  },
  [PostgreSQLTrigger.QUERY_EXECUTED]: {
    id: PostgreSQLTrigger.QUERY_EXECUTED,
    ecosystem: MCPEcosystem.POSTGRESQL,
    category: 'trigger',
    name: 'Query Executed',
    description: 'Triggered when query is executed',
    icon: 'Activity',
    requiredFields: [],
    optionalFields: [],
    outputVariables: ['query', 'duration', 'rowCount'],
    requiresAuth: true,
    webhookSupport: true
  },
  [PostgreSQLTrigger.TABLE_CREATED]: {
    id: PostgreSQLTrigger.TABLE_CREATED,
    ecosystem: MCPEcosystem.POSTGRESQL,
    category: 'trigger',
    name: 'Table Created',
    description: 'Triggered when table is created',
    icon: 'Table',
    requiredFields: [],
    optionalFields: [],
    outputVariables: ['tableName', 'schema'],
    requiresAuth: true,
    webhookSupport: true
  },
  [PostgreSQLTrigger.TABLE_DROPPED]: {
    id: PostgreSQLTrigger.TABLE_DROPPED,
    ecosystem: MCPEcosystem.POSTGRESQL,
    category: 'trigger',
    name: 'Table Dropped',
    description: 'Triggered when table is dropped',
    icon: 'XCircle',
    requiredFields: [],
    optionalFields: [],
    outputVariables: ['tableName'],
    requiresAuth: true,
    webhookSupport: true
  }
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Get all node types for a specific ecosystem
 */
export function getNodesByEcosystem(ecosystem: MCPEcosystem): MCPNodeMetadata[] {
  return Object.values(MCPNodeRegistry).filter(node => node.ecosystem === ecosystem);
}

/**
 * Get all action nodes
 */
export function getActionNodes(): MCPNodeMetadata[] {
  return Object.values(MCPNodeRegistry).filter(node => node.category === 'action');
}

/**
 * Get all trigger nodes
 */
export function getTriggerNodes(): MCPNodeMetadata[] {
  return Object.values(MCPNodeRegistry).filter(node => node.category === 'trigger');
}

/**
 * Get node metadata by ID
 */
export function getNodeMetadata(nodeType: MCPNodeType): MCPNodeMetadata | undefined {
  return MCPNodeRegistry[nodeType];
}

/**
 * Check if node type requires authentication
 */
export function requiresAuth(nodeType: MCPNodeType): boolean {
  const metadata = MCPNodeRegistry[nodeType];
  return metadata?.requiresAuth ?? false;
}

/**
 * Get ecosystem for node type
 */
export function getNodeEcosystem(nodeType: MCPNodeType): MCPEcosystem | undefined {
  return MCPNodeRegistry[nodeType]?.ecosystem;
}
