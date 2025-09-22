import { db, setTenantContext } from "./db";
import { eq, and, sql, inArray, desc, count } from "drizzle-orm";
import { 
  notifications, 
  notificationTemplates, 
  notificationPreferences,
  users,
  tenants,
  hrRequests,
  InsertNotification,
  InsertNotificationTemplate,
  InsertNotificationPreference,
  Notification,
  NotificationTemplate,
  NotificationPreference
} from "../db/schema/w3suite";
import { logger } from "./logger";
import { config } from "./config";
import * as sgMail from '@sendgrid/mail';
import * as AWS from 'aws-sdk';

// URL Security and Validation
class NotificationURLValidator {
  /**
   * Validate and normalize notification URLs to prevent security issues
   */
  static validateNotificationURL(
    url: string | undefined,
    tenantId: string,
    tenantSlug?: string
  ): string | undefined {
    if (!url) {
      return undefined;
    }

    try {
      // Normalize URL - trim whitespace and convert to lowercase for analysis
      const normalizedUrl = url.trim();
      if (!normalizedUrl) {
        return undefined;
      }

      // Check for dangerous protocols
      if (this.hasUnsafeProtocol(normalizedUrl)) {
        logger.warn('🚨 Blocked unsafe protocol in notification URL', {
          url: normalizedUrl,
          tenantId
        });
        return undefined;
      }

      // Handle relative URLs - make them absolute with tenant context
      if (this.isRelativeURL(normalizedUrl)) {
        return this.makeTenantSafeURL(normalizedUrl, tenantId, tenantSlug);
      }

      // For absolute URLs, validate they're tenant-scoped
      if (this.isAbsoluteURL(normalizedUrl)) {
        return this.validateAbsoluteURL(normalizedUrl, tenantId, tenantSlug);
      }

      // If we can't determine URL type, treat as relative for safety
      return this.makeTenantSafeURL(normalizedUrl, tenantId, tenantSlug);

    } catch (error) {
      logger.error('❌ URL validation failed', {
        error: error instanceof Error ? error.message : String(error),
        url,
        tenantId
      });
      return undefined;
    }
  }

  /**
   * Check if URL uses unsafe protocols
   */
  private static hasUnsafeProtocol(url: string): boolean {
    const unsafeProtocols = [
      'javascript:',
      'data:',
      'vbscript:',
      'file:',
      'ftp:'
    ];
    
    const lowerUrl = url.toLowerCase();
    return unsafeProtocols.some(protocol => lowerUrl.startsWith(protocol));
  }

  /**
   * Check if URL is relative (starts with / or doesn't have protocol)
   */
  private static isRelativeURL(url: string): boolean {
    return url.startsWith('/') || (!url.includes('://') && !url.startsWith('mailto:'));
  }

  /**
   * Check if URL is absolute (has protocol)
   */
  private static isAbsoluteURL(url: string): boolean {
    return url.includes('://') || url.startsWith('mailto:');
  }

  /**
   * Make URL tenant-safe by prefixing with tenant context
   */
  private static makeTenantSafeURL(
    url: string,
    tenantId: string,
    tenantSlug?: string
  ): string {
    // Remove leading slash if present for consistent handling
    const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
    
    // Use tenant slug if available, otherwise use tenant ID
    const tenantIdentifier = tenantSlug || tenantId;
    
    // Ensure tenant context is always present - use direct tenant path to match frontend routing /:tenant/...
    return `/${tenantIdentifier}/${cleanUrl}`;
  }

  /**
   * Validate absolute URLs for tenant safety
   */
  private static validateAbsoluteURL(
    url: string,
    tenantId: string,
    tenantSlug?: string
  ): string | undefined {
    try {
      // Allow mailto links
      if (url.startsWith('mailto:')) {
        return url;
      }

      const urlObj = new URL(url);
      
      // Check if it's our own domain - if so, ensure tenant scoping
      if (this.isOwnDomain(urlObj.hostname)) {
        // Check if URL already includes tenant context
        const tenantIdentifier = tenantSlug || tenantId;
        const expectedTenantPath = `/${tenantIdentifier}`;
        
        if (!urlObj.pathname.startsWith(expectedTenantPath)) {
          logger.warn('🔒 Adding tenant context to internal URL', {
            originalUrl: url,
            tenantId,
            expectedPath: expectedTenantPath
          });
          
          // Reconstruct URL with tenant context
          urlObj.pathname = expectedTenantPath + urlObj.pathname;
          return urlObj.toString();
        }
        
        return url; // Already tenant-scoped
      }

      // External URLs - log for security monitoring but allow
      logger.info('🌐 External notification URL detected', {
        url: urlObj.hostname,
        tenantId,
        fullUrl: url
      });
      
      return url;

    } catch (error) {
      logger.error('❌ Failed to parse absolute URL', {
        error: error instanceof Error ? error.message : String(error),
        url,
        tenantId
      });
      return undefined;
    }
  }

  /**
   * Check if hostname belongs to our application
   */
  private static isOwnDomain(hostname: string): boolean {
    // Define our application domains
    const ownDomains = [
      'localhost',
      '127.0.0.1',
      'w3suite.com',
      'replit.dev', // For Replit deployment
      process.env.APP_DOMAIN
    ].filter(Boolean);

    return ownDomains.some(domain => 
      hostname === domain || 
      hostname.endsWith(`.${domain}`)
    );
  }

  /**
   * Validate notification URL with additional context
   */
  static validateWithContext(
    url: string | undefined,
    context: {
      tenantId: string;
      tenantSlug?: string;
      userId?: string;
      requestType?: string;
    }
  ): string | undefined {
    const validatedUrl = this.validateNotificationURL(
      url,
      context.tenantId,
      context.tenantSlug
    );

    if (validatedUrl && context.requestType) {
      logger.debug('🔗 Validated notification URL', {
        originalUrl: url,
        validatedUrl,
        tenantId: context.tenantId,
        userId: context.userId,
        requestType: context.requestType
      });
    }

    return validatedUrl;
  }

  /**
   * Test URL generation for development validation
   */
  static testUrlGeneration(): { success: boolean; results: any[] } {
    const testCases = [
      { input: '/notifications', tenantId: 'tenant1', tenantSlug: 'acme', expected: '/acme/notifications' },
      { input: 'dashboard', tenantId: 'tenant2', tenantSlug: 'demo', expected: '/demo/dashboard' },
      { input: '/hr/requests', tenantId: 'tenant3', expected: '/tenant3/hr/requests' },
      { input: 'https://external.com/link', tenantId: 'tenant4', tenantSlug: 'test', expected: 'https://external.com/link' },
      { input: 'mailto:test@example.com', tenantId: 'tenant5', expected: 'mailto:test@example.com' }
    ];

    const results = testCases.map(testCase => {
      try {
        const actual = NotificationURLValidator.validateNotificationURL(
          testCase.input,
          testCase.tenantId,
          testCase.tenantSlug
        );
        
        const success = actual === testCase.expected;
        
        return {
          ...testCase,
          actual,
          success,
          error: null
        };
      } catch (error) {
        return {
          ...testCase,
          actual: null,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });

    const allSuccessful = results.every(r => r.success);
    
    logger.info('🧪 URL Generation Test Results', {
      totalTests: results.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      allPassed: allSuccessful,
      results: results
    });

    return { success: allSuccessful, results };
  }
}

// Email service interface (can be extended for different providers)
interface EmailProvider {
  sendEmail(to: string, subject: string, htmlBody: string, textBody?: string): Promise<boolean>;
  isConfigured(): boolean;
  getProviderName(): string;
}

// Mock email provider for development
class MockEmailProvider implements EmailProvider {
  async sendEmail(to: string, subject: string, htmlBody: string, textBody?: string): Promise<boolean> {
    logger.info('📧 Mock Email Sent (DEVELOPMENT ONLY)', {
      to,
      subject,
      htmlBody: htmlBody.substring(0, 100) + '...',
      textBody: textBody?.substring(0, 100) + '...',
      environment: config.NODE_ENV
    });
    return true;
  }

  isConfigured(): boolean {
    return config.NODE_ENV !== 'production';
  }

  getProviderName(): string {
    return 'MockEmailProvider (DEVELOPMENT ONLY)';
  }
}

// SendGrid email provider for production
class SendGridEmailProvider implements EmailProvider {
  private apiKey: string | undefined;
  private fromEmail: string;
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // 1 second base delay

  constructor() {
    this.apiKey = process.env.SENDGRID_API_KEY;
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.FROM_EMAIL || 'noreply@w3suite.com';
    
    // Configure SendGrid API key if available
    if (this.apiKey) {
      sgMail.setApiKey(this.apiKey);
    }
  }

  async sendEmail(to: string, subject: string, htmlBody: string, textBody?: string): Promise<boolean> {
    if (!this.isConfigured()) {
      logger.error('❌ SendGrid not configured - cannot send email', { to, subject });
      return false;
    }

    const msg = {
      to,
      from: {
        email: this.fromEmail,
        name: 'W3 Suite Notifications'
      },
      subject,
      html: htmlBody,
      text: textBody || this.stripHtmlTags(htmlBody)
    };

    // Implement retry logic for better reliability
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.debug('📤 Attempting to send SendGrid email', {
          to,
          subject,
          attempt,
          maxRetries: this.maxRetries,
          from: this.fromEmail
        });

        const response = await sgMail.send(msg);
        
        // SendGrid returns an array of responses
        if (response && response.length > 0) {
          const [res] = response;
          
          logger.info('✅ SendGrid email sent successfully', {
            to,
            subject,
            messageId: res.headers?.['x-message-id'],
            statusCode: res.statusCode,
            attempt,
            provider: 'SendGrid'
          });
          
          return true;
        }
        
        logger.warn('⚠️ SendGrid returned empty response', {
          to,
          subject,
          attempt,
          response: response
        });
        
      } catch (error: any) {
        logger.error(`❌ SendGrid email attempt ${attempt}/${this.maxRetries} failed`, {
          to,
          subject,
          attempt,
          error: error.message,
          statusCode: error.code,
          responseBody: error.response?.body,
          provider: 'SendGrid'
        });

        // If this is the last attempt, return false
        if (attempt === this.maxRetries) {
          logger.error('💥 SendGrid email failed after all retries', {
            to,
            subject,
            totalAttempts: this.maxRetries,
            finalError: error.message
          });
          return false;
        }

        // Wait before retrying (exponential backoff)
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        logger.info(`⏳ Retrying SendGrid email in ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`, {
          to,
          subject,
          delay
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return false;
  }

  private stripHtmlTags(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&')  // Replace HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  isConfigured(): boolean {
    const configured = !!this.apiKey && this.apiKey.length > 0 && !!this.fromEmail;
    
    if (!configured) {
      logger.debug('SendGrid configuration check failed', {
        hasApiKey: !!this.apiKey,
        hasFromEmail: !!this.fromEmail,
        apiKeyLength: this.apiKey?.length || 0
      });
    }
    
    return configured;
  }

  getProviderName(): string {
    return 'SendGrid';
  }
}

// AWS SES email provider for production
class AWSEmailProvider implements EmailProvider {
  private accessKeyId: string | undefined;
  private secretAccessKey: string | undefined;
  private region: string;
  private fromEmail: string;
  private ses: AWS.SES | undefined;
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // 1 second base delay

  constructor() {
    this.accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    this.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.fromEmail = process.env.AWS_SES_FROM_EMAIL || process.env.FROM_EMAIL || 'noreply@w3suite.com';
    
    // Configure AWS SES if credentials are available
    if (this.isConfigured()) {
      try {
        AWS.config.update({
          accessKeyId: this.accessKeyId,
          secretAccessKey: this.secretAccessKey,
          region: this.region
        });
        
        this.ses = new AWS.SES({ region: this.region });
        
        logger.debug('📧 AWS SES client configured', {
          region: this.region,
          fromEmail: this.fromEmail
        });
      } catch (error) {
        logger.error('❌ Failed to configure AWS SES client', {
          error: error instanceof Error ? error.message : String(error),
          region: this.region
        });
      }
    }
  }

  async sendEmail(to: string, subject: string, htmlBody: string, textBody?: string): Promise<boolean> {
    if (!this.isConfigured() || !this.ses) {
      logger.error('❌ AWS SES not configured - cannot send email', { to, subject });
      return false;
    }

    const params: AWS.SES.SendEmailRequest = {
      Destination: {
        ToAddresses: [to]
      },
      Message: {
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: htmlBody
          },
          Text: {
            Charset: 'UTF-8',
            Data: textBody || this.stripHtmlTags(htmlBody)
          }
        },
        Subject: {
          Charset: 'UTF-8',
          Data: subject
        }
      },
      Source: `W3 Suite Notifications <${this.fromEmail}>`,
      ReplyToAddresses: [this.fromEmail]
    };

    // Implement retry logic for better reliability
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.debug('📤 Attempting to send AWS SES email', {
          to,
          subject,
          attempt,
          maxRetries: this.maxRetries,
          from: this.fromEmail,
          region: this.region
        });

        const result = await this.ses.sendEmail(params).promise();
        
        logger.info('✅ AWS SES email sent successfully', {
          to,
          subject,
          messageId: result.MessageId,
          attempt,
          provider: 'AWS SES',
          region: this.region
        });
        
        return true;
        
      } catch (error: any) {
        logger.error(`❌ AWS SES email attempt ${attempt}/${this.maxRetries} failed`, {
          to,
          subject,
          attempt,
          error: error.message,
          errorCode: error.code,
          statusCode: error.statusCode,
          requestId: error.requestId,
          provider: 'AWS SES'
        });

        // If this is the last attempt, return false
        if (attempt === this.maxRetries) {
          logger.error('💥 AWS SES email failed after all retries', {
            to,
            subject,
            totalAttempts: this.maxRetries,
            finalError: error.message,
            errorCode: error.code
          });
          return false;
        }

        // For certain AWS errors, don't retry (e.g., invalid email, quota exceeded)
        if (this.isNonRetryableError(error)) {
          logger.error('🚫 AWS SES non-retryable error - aborting retries', {
            to,
            subject,
            errorCode: error.code,
            error: error.message
          });
          return false;
        }

        // Wait before retrying (exponential backoff)
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        logger.info(`⏳ Retrying AWS SES email in ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`, {
          to,
          subject,
          delay
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return false;
  }

  private stripHtmlTags(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&')  // Replace HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  private isNonRetryableError(error: any): boolean {
    const nonRetryableCodes = [
      'InvalidParameterValue',
      'MessageRejected',
      'MailFromDomainNotVerified',
      'ConfigurationSetDoesNotExist',
      'ReputationTrackingDisabled',
      'InvalidDeliveryOptions'
    ];
    
    return nonRetryableCodes.includes(error.code);
  }

  isConfigured(): boolean {
    const configured = !!this.accessKeyId && !!this.secretAccessKey && !!this.fromEmail;
    
    if (!configured) {
      logger.debug('AWS SES configuration check failed', {
        hasAccessKeyId: !!this.accessKeyId,
        hasSecretAccessKey: !!this.secretAccessKey,
        hasFromEmail: !!this.fromEmail,
        region: this.region
      });
    }
    
    return configured;
  }

  getProviderName(): string {
    return 'AWS SES';
  }
}

// Template variable substitution interface
export interface NotificationVariables {
  [key: string]: string | number | boolean | undefined;
  // Common HR request variables
  requestId?: string;
  requestTitle?: string;
  requestType?: string;
  requestCategory?: string;
  requesterName?: string;
  managerName?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  priority?: string;
  comments?: string;
  url?: string;
  // User variables
  userFirstName?: string;
  userLastName?: string;
  userEmail?: string;
  // Tenant variables
  tenantName?: string;
  tenantSlug?: string;
}

// Notification delivery options
export interface NotificationDeliveryOptions {
  inApp?: boolean;
  email?: boolean;
  push?: boolean; // For future push notification support
  sms?: boolean;  // For future SMS support
  priority?: 'low' | 'medium' | 'high' | 'critical';
  expiresAt?: Date;
  url?: string; // Deep link URL
  grouping?: string; // For batching notifications
}

// Notification targeting options
export interface NotificationTargeting {
  userIds?: string[];
  roles?: string[];
  broadcast?: boolean; // Send to all tenant users
  tenantId: string;
}

export class NotificationService {
  private emailProvider: EmailProvider;

  constructor() {
    // Initialize email provider based on configuration and environment
    this.emailProvider = this.initializeEmailProvider();
    
    // Comprehensive validation for production readiness
    this.validateConfiguration();
    
    // Log email provider status
    const providerName = this.emailProvider.getProviderName();
    const isConfigured = this.emailProvider.isConfigured();
    
    if (config.NODE_ENV === 'production') {
      if (!isConfigured) {
        logger.error('🚨 CRITICAL: No email provider configured for production', {
          environment: config.NODE_ENV,
          provider: providerName,
          configured: isConfigured
        });
        logger.error('💡 Configure SENDGRID_API_KEY or AWS credentials for production email delivery');
      } else {
        logger.info('✅ Production email provider configured', {
          provider: providerName,
          environment: config.NODE_ENV
        });
      }
    } else {
      logger.info('📧 Email provider initialized', {
        provider: providerName,
        environment: config.NODE_ENV,
        configured: isConfigured
      });
    }
  }

  /**
   * Comprehensive validation for production readiness
   */
  private validateConfiguration(): void {
    const validationResults = {
      emailProviders: {
        sendGrid: {
          hasApiKey: !!process.env.SENDGRID_API_KEY,
          hasFromEmail: !!(process.env.SENDGRID_FROM_EMAIL || process.env.FROM_EMAIL),
          configured: false
        },
        aws: {
          hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
          hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
          hasRegion: !!process.env.AWS_REGION,
          hasFromEmail: !!(process.env.AWS_SES_FROM_EMAIL || process.env.FROM_EMAIL),
          configured: false
        }
      },
      urlGeneration: {
        tested: false,
        working: false
      },
      environment: config.NODE_ENV,
      productionReady: false
    };

    // Test email provider configurations
    const sendGridProvider = new SendGridEmailProvider();
    const awsProvider = new AWSEmailProvider();
    
    validationResults.emailProviders.sendGrid.configured = sendGridProvider.isConfigured();
    validationResults.emailProviders.aws.configured = awsProvider.isConfigured();

    // Test URL generation with sample data
    try {
      const testUrl = '/notifications';
      const testTenantId = 'test-tenant';
      const testTenantSlug = 'test-slug';
      
      const generatedUrl = NotificationURLValidator.validateNotificationURL(
        testUrl, 
        testTenantId, 
        testTenantSlug
      );
      
      validationResults.urlGeneration.tested = true;
      validationResults.urlGeneration.working = generatedUrl === '/test-slug/notifications';
      
      if (!validationResults.urlGeneration.working) {
        logger.warn('⚠️ URL generation test failed', {
          input: testUrl,
          expected: '/test-slug/notifications',
          actual: generatedUrl
        });
      }
    } catch (error) {
      logger.error('❌ URL generation validation failed', {
        error: error instanceof Error ? error.message : String(error)
      });
    }

    // Determine if production ready
    const hasWorkingEmailProvider = validationResults.emailProviders.sendGrid.configured || 
                                   validationResults.emailProviders.aws.configured;
    
    validationResults.productionReady = hasWorkingEmailProvider && 
                                       validationResults.urlGeneration.working;

    // Log comprehensive validation results
    logger.info('🔍 Notification system validation completed', {
      ...validationResults,
      summary: {
        emailProviderReady: hasWorkingEmailProvider,
        urlGenerationReady: validationResults.urlGeneration.working,
        overallStatus: validationResults.productionReady ? 'READY' : 'NOT_READY'
      }
    });

    // Production-specific warnings
    if (config.NODE_ENV === 'production') {
      if (!validationResults.productionReady) {
        logger.error('🚨 PRODUCTION DEPLOYMENT BLOCKED', {
          reason: 'Notification system not production-ready',
          requiredFixes: [
            !hasWorkingEmailProvider ? 'Configure email provider (SendGrid or AWS SES)' : null,
            !validationResults.urlGeneration.working ? 'Fix URL generation for frontend routing' : null
          ].filter(Boolean)
        });
      } else {
        logger.info('✅ Notification system PRODUCTION READY', {
          emailProvider: validationResults.emailProviders.sendGrid.configured ? 'SendGrid' : 'AWS SES',
          urlGeneration: 'Working',
          status: 'All systems operational'
        });
      }
    }
  }

  private initializeEmailProvider(): EmailProvider {
    if (config.NODE_ENV === 'production') {
      // Production environment - prefer real providers
      
      // Try SendGrid first
      const sendGridProvider = new SendGridEmailProvider();
      if (sendGridProvider.isConfigured()) {
        logger.info('🟢 Using SendGrid email provider for production');
        return sendGridProvider;
      }
      
      // Try AWS SES second
      const awsProvider = new AWSEmailProvider();
      if (awsProvider.isConfigured()) {
        logger.info('🟠 Using AWS SES email provider for production');
        return awsProvider;
      }
      
      // No production providers configured - this is a critical issue
      logger.error('❌ PRODUCTION BLOCKER: No email provider configured');
      logger.error('💡 Set SENDGRID_API_KEY or AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY');
      logger.error('⚠️  Falling back to mock provider - emails will not be delivered');
      
      return new MockEmailProvider();
    } else {
      // Development/test environment - use mock provider
      logger.info('🔧 Using mock email provider for development');
      return new MockEmailProvider();
    }
  }

  /**
   * Send a notification using a template
   */
  async sendTemplatedNotification(
    templateKey: string,
    variables: NotificationVariables,
    targeting: NotificationTargeting,
    options: NotificationDeliveryOptions = {}
  ): Promise<string[]> {
    try {
      // Set tenant context
      await setTenantContext(targeting.tenantId);

      // Get notification template
      const template = await this.getTemplate(targeting.tenantId, templateKey);
      if (!template) {
        throw new Error(`Notification template not found: ${templateKey}`);
      }

      // Get tenant details for URL validation
      const tenant = await db.select().from(tenants).where(eq(tenants.id, targeting.tenantId)).limit(1);
      const tenantSlug = tenant.length > 0 ? tenant[0].slug : undefined;

      // Render template with variables and URL validation
      const renderedContent = this.renderTemplate(template, variables, targeting.tenantId, tenantSlug);

      // Get target users and their preferences
      const targetUsers = await this.getTargetUsers(targeting);
      
      // PERFORMANCE OPTIMIZATION: Batch retrieve preferences to avoid N+1 queries
      const userIds = targetUsers.map(user => user.id);
      const preferencesMap = await this.getBatchUserPreferences(targeting.tenantId, userIds);
      
      // Send notifications
      const notificationIds: string[] = [];
      
      for (const user of targetUsers) {
        // Get user notification preferences from batch map (no N+1 query)
        const preferences = preferencesMap.get(user.id);
        if (!preferences) {
          logger.warn('⚠️ No preferences found for user in batch retrieval', {
            userId: user.id,
            tenantId: targeting.tenantId
          });
          continue;
        }
        
        // Check if user wants this type of notification
        if (!this.shouldSendNotification(template, preferences, options)) {
          continue;
        }

        // Create in-app notification
        if (options.inApp !== false && preferences.inAppEnabled) {
          const notificationId = await this.createInAppNotification(
            targeting.tenantId,
            user.id,
            template,
            renderedContent,
            options
          );
          notificationIds.push(notificationId);
        }

        // Send email notification
        if (options.email !== false && preferences.emailEnabled && template.emailSubject) {
          await this.sendEmailNotification(
            user,
            template,
            renderedContent,
            options
          );
        }
      }

      logger.info('📢 Templated notifications sent', {
        templateKey,
        targetUserCount: targetUsers.length,
        notificationIds: notificationIds.length,
        tenantId: targeting.tenantId
      });

      return notificationIds;

    } catch (error) {
      logger.error('❌ Failed to send templated notification', {
        templateKey,
        error: error instanceof Error ? error.message : String(error),
        targeting,
        options
      });
      throw error;
    }
  }

  /**
   * Send a direct notification without template
   */
  async sendDirectNotification(
    tenantId: string,
    targetUserId: string,
    title: string,
    message: string,
    options: NotificationDeliveryOptions = {}
  ): Promise<string> {
    try {
      await setTenantContext(tenantId);

      // Get tenant details for URL validation
      const tenant = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
      const tenantSlug = tenant.length > 0 ? tenant[0].slug : undefined;

      // Validate and secure the notification URL
      const safeUrl = NotificationURLValidator.validateWithContext(options.url, {
        tenantId,
        tenantSlug,
        userId: targetUserId,
        requestType: 'direct_notification'
      });

      const notification: InsertNotification = {
        tenantId,
        targetUserId,
        type: 'custom',
        priority: options.priority || 'medium',
        title,
        message,
        url: safeUrl,
        data: {},
        expiresAt: options.expiresAt
      };

      const result = await db.insert(notifications).values(notification).returning({ id: notifications.id });
      const notificationId = result[0].id;

      logger.info('📨 Direct notification sent', {
        notificationId,
        targetUserId,
        title,
        tenantId,
        originalUrl: options.url,
        validatedUrl: safeUrl
      });

      return notificationId;

    } catch (error) {
      logger.error('❌ Failed to send direct notification', {
        error: error instanceof Error ? error.message : String(error),
        tenantId,
        targetUserId,
        title
      });
      throw error;
    }
  }

  /**
   * Get user notifications with pagination and filtering
   */
  async getUserNotifications(
    tenantId: string,
    userId: string,
    filters: {
      status?: 'read' | 'unread';
      type?: string;
      priority?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Notification[]> {
    try {
      await setTenantContext(tenantId);

      let query = db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.tenantId, tenantId),
            eq(notifications.targetUserId, userId)
          )
        )
        .orderBy(desc(notifications.createdAt));

      // Apply filters
      if (filters.status) {
        query = query.where(
          and(
            eq(notifications.tenantId, tenantId),
            eq(notifications.targetUserId, userId),
            eq(notifications.status, filters.status)
          )
        );
      }

      if (filters.type) {
        query = query.where(
          and(
            eq(notifications.tenantId, tenantId),
            eq(notifications.targetUserId, userId),
            eq(notifications.type, filters.type)
          )
        );
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        query = query.offset(filters.offset);
      }

      const results = await query;
      
      logger.debug('📋 Retrieved user notifications', {
        userId,
        tenantId,
        count: results.length,
        filters
      });

      return results;

    } catch (error) {
      logger.error('❌ Failed to get user notifications', {
        error: error instanceof Error ? error.message : String(error),
        tenantId,
        userId,
        filters
      });
      throw error;
    }
  }

  /**
   * Get unread notification count for user
   */
  async getUnreadCount(tenantId: string, userId: string): Promise<number> {
    try {
      await setTenantContext(tenantId);

      const result = await db
        .select({ count: count() })
        .from(notifications)
        .where(
          and(
            eq(notifications.tenantId, tenantId),
            eq(notifications.targetUserId, userId),
            eq(notifications.status, 'unread')
          )
        );

      const unreadCount = result[0]?.count || 0;

      logger.debug('🔢 Retrieved unread count', {
        userId,
        tenantId,
        unreadCount
      });

      return unreadCount;

    } catch (error) {
      logger.error('❌ Failed to get unread count', {
        error: error instanceof Error ? error.message : String(error),
        tenantId,
        userId
      });
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(tenantId: string, notificationId: string, userId: string): Promise<void> {
    try {
      await setTenantContext(tenantId);

      await db
        .update(notifications)
        .set({ status: 'read' })
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.tenantId, tenantId),
            eq(notifications.targetUserId, userId)
          )
        );

      logger.debug('✅ Notification marked as read', {
        notificationId,
        userId,
        tenantId
      });

    } catch (error) {
      logger.error('❌ Failed to mark notification as read', {
        error: error instanceof Error ? error.message : String(error),
        tenantId,
        notificationId,
        userId
      });
      throw error;
    }
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(tenantId: string, userId: string): Promise<void> {
    try {
      await setTenantContext(tenantId);

      await db
        .update(notifications)
        .set({ status: 'read' })
        .where(
          and(
            eq(notifications.tenantId, tenantId),
            eq(notifications.targetUserId, userId),
            eq(notifications.status, 'unread')
          )
        );

      logger.info('✅ All notifications marked as read', {
        userId,
        tenantId
      });

    } catch (error) {
      logger.error('❌ Failed to mark all notifications as read', {
        error: error instanceof Error ? error.message : String(error),
        tenantId,
        userId
      });
      throw error;
    }
  }

  /**
   * Create or update notification template
   */
  async upsertTemplate(
    tenantId: string,
    templateKey: string,
    templateData: Partial<InsertNotificationTemplate>
  ): Promise<string> {
    try {
      await setTenantContext(tenantId);

      const existing = await this.getTemplate(tenantId, templateKey);
      
      if (existing) {
        // Update existing template
        await db
          .update(notificationTemplates)
          .set({
            ...templateData,
            updatedAt: new Date()
          })
          .where(
            and(
              eq(notificationTemplates.tenantId, tenantId),
              eq(notificationTemplates.templateKey, templateKey)
            )
          );

        logger.info('📝 Notification template updated', {
          tenantId,
          templateKey,
          id: existing.id
        });

        return existing.id;
      } else {
        // Create new template
        const template: InsertNotificationTemplate = {
          tenantId,
          templateKey,
          ...templateData
        } as InsertNotificationTemplate;

        const result = await db.insert(notificationTemplates).values(template).returning({ id: notificationTemplates.id });
        const templateId = result[0].id;

        logger.info('📝 Notification template created', {
          tenantId,
          templateKey,
          id: templateId
        });

        return templateId;
      }

    } catch (error) {
      logger.error('❌ Failed to upsert notification template', {
        error: error instanceof Error ? error.message : String(error),
        tenantId,
        templateKey,
        templateData
      });
      throw error;
    }
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(tenantId: string, userId: string): Promise<NotificationPreference> {
    try {
      await setTenantContext(tenantId);

      const existing = await db
        .select()
        .from(notificationPreferences)
        .where(
          and(
            eq(notificationPreferences.tenantId, tenantId),
            eq(notificationPreferences.userId, userId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return existing[0];
      }

      // Create default preferences
      const defaultPrefs: InsertNotificationPreference = {
        tenantId,
        userId,
        inAppEnabled: true,
        emailEnabled: true,
        minPriorityInApp: 'low',
        minPriorityEmail: 'medium',
        quietHoursEnabled: false,
        dailyDigestEnabled: false,
        weeklyDigestEnabled: true,
        digestDeliveryTime: '09:00',
        categoryPreferences: {}
      };

      const result = await db.insert(notificationPreferences).values(defaultPrefs).returning();
      
      logger.info('🔧 Created default notification preferences', {
        tenantId,
        userId
      });

      return result[0];

    } catch (error) {
      logger.error('❌ Failed to get user preferences', {
        error: error instanceof Error ? error.message : String(error),
        tenantId,
        userId
      });
      throw error;
    }
  }

  /**
   * Batch retrieve notification preferences for multiple users (Performance Optimization)
   */
  async getBatchUserPreferences(tenantId: string, userIds: string[]): Promise<Map<string, NotificationPreference>> {
    try {
      await setTenantContext(tenantId);

      const preferencesMap = new Map<string, NotificationPreference>();

      if (userIds.length === 0) {
        return preferencesMap;
      }

      // Fetch existing preferences for all users in one query
      const existingPreferences = await db
        .select()
        .from(notificationPreferences)
        .where(
          and(
            eq(notificationPreferences.tenantId, tenantId),
            inArray(notificationPreferences.userId, userIds)
          )
        );

      // Map existing preferences
      existingPreferences.forEach(pref => {
        preferencesMap.set(pref.userId, pref);
      });

      // Find users without preferences and create defaults
      const usersWithoutPrefs = userIds.filter(userId => !preferencesMap.has(userId));
      
      if (usersWithoutPrefs.length > 0) {
        // Create default preferences for users who don't have them
        const defaultPrefs: InsertNotificationPreference[] = usersWithoutPrefs.map(userId => ({
          tenantId,
          userId,
          inAppEnabled: true,
          emailEnabled: true,
          minPriorityInApp: 'low',
          minPriorityEmail: 'medium',
          quietHoursEnabled: false,
          dailyDigestEnabled: false,
          weeklyDigestEnabled: true,
          digestDeliveryTime: '09:00',
          categoryPreferences: {}
        }));

        // Batch insert default preferences
        const createdPrefs = await db.insert(notificationPreferences).values(defaultPrefs).returning();
        
        // Add created preferences to map
        createdPrefs.forEach(pref => {
          preferencesMap.set(pref.userId, pref);
        });

        logger.info('🔧 Created default notification preferences for multiple users', {
          tenantId,
          userIds: usersWithoutPrefs,
          count: usersWithoutPrefs.length
        });
      }

      logger.debug('📊 Batch retrieved user preferences', {
        tenantId,
        requestedUsers: userIds.length,
        foundPreferences: preferencesMap.size
      });

      return preferencesMap;

    } catch (error) {
      logger.error('❌ Failed to batch get user preferences', {
        error: error instanceof Error ? error.message : String(error),
        tenantId,
        userIds,
        userCount: userIds.length
      });
      throw error;
    }
  }

  // Private helper methods

  private async getTemplate(tenantId: string, templateKey: string): Promise<NotificationTemplate | null> {
    const templates = await db
      .select()
      .from(notificationTemplates)
      .where(
        and(
          eq(notificationTemplates.tenantId, tenantId),
          eq(notificationTemplates.templateKey, templateKey),
          eq(notificationTemplates.isActive, true)
        )
      )
      .limit(1);

    return templates.length > 0 ? templates[0] : null;
  }

  private renderTemplate(
    template: NotificationTemplate, 
    variables: NotificationVariables,
    tenantId: string,
    tenantSlug?: string
  ): {
    title: string;
    message: string;
    emailSubject?: string;
    emailBodyHtml?: string;
    emailBodyText?: string;
    url?: string;
  } {
    const interpolate = (text: string): string => {
      return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        const value = variables[key];
        return value !== undefined ? String(value) : match;
      });
    };

    // Render the URL and validate for security
    const rawUrl = template.inAppUrl ? interpolate(template.inAppUrl) : undefined;
    const safeUrl = NotificationURLValidator.validateWithContext(rawUrl, {
      tenantId,
      tenantSlug,
      requestType: template.category || 'template_notification'
    });

    return {
      title: interpolate(template.inAppTitle),
      message: interpolate(template.inAppMessage),
      emailSubject: template.emailSubject ? interpolate(template.emailSubject) : undefined,
      emailBodyHtml: template.emailBodyHtml ? interpolate(template.emailBodyHtml) : undefined,
      emailBodyText: template.emailBodyText ? interpolate(template.emailBodyText) : undefined,
      url: safeUrl
    };
  }

  private async getTargetUsers(targeting: NotificationTargeting) {
    let query = db
      .select()
      .from(users)
      .where(eq(users.tenantId, targeting.tenantId));

    if (targeting.userIds && targeting.userIds.length > 0) {
      query = query.where(
        and(
          eq(users.tenantId, targeting.tenantId),
          inArray(users.id, targeting.userIds)
        )
      );
    }

    // TODO: Add role-based filtering when RBAC is implemented
    if (targeting.roles && targeting.roles.length > 0) {
      // For now, just return all users in tenant
      // This will be enhanced when role system is fully implemented
    }

    if (!targeting.broadcast && !targeting.userIds && !targeting.roles) {
      return []; // No targeting specified
    }

    return await query;
  }

  private shouldSendNotification(
    template: NotificationTemplate,
    preferences: NotificationPreference,
    options: NotificationDeliveryOptions
  ): boolean {
    // Check priority filtering
    const priorityOrder = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
    const notificationPriority = options.priority || template.defaultPriority;
    
    if (priorityOrder[notificationPriority] < priorityOrder[preferences.minPriorityInApp]) {
      return false;
    }

    // Check category preferences
    if (preferences.categoryPreferences && typeof preferences.categoryPreferences === 'object') {
      const categoryPrefs = preferences.categoryPreferences as Record<string, any>;
      const categoryPref = categoryPrefs[template.category];
      if (categoryPref && categoryPref.enabled === false) {
        return false;
      }
    }

    // TODO: Check quiet hours
    // TODO: Check other preference rules

    return true;
  }

  private async createInAppNotification(
    tenantId: string,
    userId: string,
    template: NotificationTemplate,
    renderedContent: any,
    options: NotificationDeliveryOptions
  ): Promise<string> {
    // The URL in renderedContent is already validated by renderTemplate method
    const notification: InsertNotification = {
      tenantId,
      targetUserId: userId,
      type: template.category === 'hr_request' ? 'custom' : 'system',
      priority: options.priority || template.defaultPriority,
      title: renderedContent.title,
      message: renderedContent.message,
      url: renderedContent.url, // Already validated by renderTemplate
      data: {
        templateKey: template.templateKey,
        category: template.category
      },
      expiresAt: options.expiresAt
    };

    const result = await db.insert(notifications).values(notification).returning({ id: notifications.id });
    return result[0].id;
  }

  private async sendEmailNotification(
    user: any,
    template: NotificationTemplate,
    renderedContent: any,
    options: NotificationDeliveryOptions
  ): Promise<void> {
    if (!template.emailSubject || !renderedContent.emailBodyHtml) {
      return; // No email template
    }

    try {
      await this.emailProvider.sendEmail(
        user.email,
        renderedContent.emailSubject,
        renderedContent.emailBodyHtml,
        renderedContent.emailBodyText
      );

      logger.info('📧 Email notification sent', {
        userId: user.id,
        email: user.email,
        subject: renderedContent.emailSubject,
        templateKey: template.templateKey
      });

    } catch (error) {
      logger.error('❌ Failed to send email notification', {
        error: error instanceof Error ? error.message : String(error),
        userId: user.id,
        email: user.email,
        templateKey: template.templateKey
      });
    }
  }
}

// Singleton instance
export const notificationService = new NotificationService();

// HR Request notification helpers
export class HRNotificationHelper {
  /**
   * Send notification when HR request status changes
   */
  static async notifyStatusChange(
    tenantId: string,
    hrRequestId: string,
    fromStatus: string | null,
    toStatus: string,
    changedBy: string,
    reason?: string
  ): Promise<void> {
    try {
      // Get HR request details
      await setTenantContext(tenantId);
      const hrRequest = await db
        .select({
          id: hrRequests.id,
          title: hrRequests.title,
          type: hrRequests.type,
          category: hrRequests.category,
          priority: hrRequests.priority,
          requesterId: hrRequests.requesterId,
          currentApproverId: hrRequests.currentApproverId,
          requester: {
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email
          }
        })
        .from(hrRequests)
        .leftJoin(users, eq(hrRequests.requesterId, users.id))
        .where(eq(hrRequests.id, hrRequestId))
        .limit(1);

      if (hrRequest.length === 0) {
        throw new Error(`HR request not found: ${hrRequestId}`);
      }

      const request = hrRequest[0];
      
      // Determine notification template based on status change
      let templateKey = '';
      let targetUsers: string[] = [];
      let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium';

      switch (toStatus) {
        case 'pending':
          if (fromStatus === 'draft') {
            // Employee submitted request - notify managers
            templateKey = 'hr_request_submitted';
            targetUsers = [request.currentApproverId].filter(Boolean) as string[];
            priority = request.priority === 'urgent' ? 'high' : 'medium';
          }
          break;

        case 'approved':
          // Request approved - notify employee
          templateKey = 'hr_request_approved';
          targetUsers = [request.requesterId];
          priority = 'medium';
          break;

        case 'rejected':
          // Request rejected - notify employee
          templateKey = 'hr_request_rejected';
          targetUsers = [request.requesterId];
          priority = 'high';
          break;

        case 'cancelled':
          // Request cancelled - notify relevant parties
          templateKey = 'hr_request_cancelled';
          targetUsers = [request.requesterId, request.currentApproverId].filter(Boolean) as string[];
          priority = 'low';
          break;

        default:
          // Generic status change notification
          templateKey = 'hr_request_status_change';
          targetUsers = [request.requesterId];
          priority = 'medium';
      }

      if (templateKey && targetUsers.length > 0) {
        const variables: NotificationVariables = {
          requestId: request.id,
          requestTitle: request.title,
          requestType: request.type,
          requestCategory: request.category,
          requesterName: `${request.requester?.firstName} ${request.requester?.lastName}`.trim(),
          status: toStatus,
          fromStatus: fromStatus || undefined,
          priority: request.priority,
          reason,
          url: `/staging/hr/requests/${request.id}` // Deep link to request details
        };

        await notificationService.sendTemplatedNotification(
          templateKey,
          variables,
          {
            tenantId,
            userIds: targetUsers
          },
          {
            priority,
            inApp: true,
            email: true
          }
        );

        logger.info('🎯 HR request status change notification sent', {
          hrRequestId,
          templateKey,
          fromStatus,
          toStatus,
          targetUsers: targetUsers.length,
          tenantId
        });
      }

    } catch (error) {
      logger.error('❌ Failed to send HR status change notification', {
        error: error instanceof Error ? error.message : String(error),
        tenantId,
        hrRequestId,
        fromStatus,
        toStatus
      });
    }
  }

  /**
   * Send notification for urgent requests requiring immediate attention
   */
  static async notifyUrgentRequest(
    tenantId: string,
    hrRequestId: string,
    targetManagerIds: string[]
  ): Promise<void> {
    try {
      await setTenantContext(tenantId);
      
      const hrRequest = await db
        .select({
          id: hrRequests.id,
          title: hrRequests.title,
          type: hrRequests.type,
          category: hrRequests.category,
          requesterId: hrRequests.requesterId,
          requester: {
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email
          }
        })
        .from(hrRequests)
        .leftJoin(users, eq(hrRequests.requesterId, users.id))
        .where(eq(hrRequests.id, hrRequestId))
        .limit(1);

      if (hrRequest.length === 0) {
        throw new Error(`HR request not found: ${hrRequestId}`);
      }

      const request = hrRequest[0];

      const variables: NotificationVariables = {
        requestId: request.id,
        requestTitle: request.title,
        requestType: request.type,
        requestCategory: request.category,
        requesterName: `${request.requester?.firstName} ${request.requester?.lastName}`.trim(),
        priority: 'urgent',
        url: `/staging/hr/requests/${request.id}`
      };

      await notificationService.sendTemplatedNotification(
        'hr_request_urgent',
        variables,
        {
          tenantId,
          userIds: targetManagerIds
        },
        {
          priority: 'critical',
          inApp: true,
          email: true
        }
      );

      logger.info('🚨 Urgent HR request notification sent', {
        hrRequestId,
        targetManagerCount: targetManagerIds.length,
        tenantId
      });

    } catch (error) {
      logger.error('❌ Failed to send urgent HR request notification', {
        error: error instanceof Error ? error.message : String(error),
        tenantId,
        hrRequestId,
        targetManagerIds
      });
    }
  }

  /**
   * Send notification when HR pushes a document to a user
   */
  static async notifyDocumentPushed(
    tenantId: string,
    documentId: string,
    documentTitle: string,
    targetUserId: string,
    pushedBy: string,
    message?: string
  ): Promise<void> {
    try {
      await setTenantContext(tenantId);
      
      // Get pusher details for notification context
      const pusher = await db
        .select({
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email
        })
        .from(users)
        .where(eq(users.id, pushedBy))
        .limit(1);

      const pusherName = pusher.length > 0 
        ? `${pusher[0].firstName} ${pusher[0].lastName}`.trim()
        : 'HR';

      const variables: NotificationVariables = {
        requestId: documentId,
        requestTitle: documentTitle,
        requestType: 'document_push',
        requestCategory: 'document',
        requesterName: pusherName,
        status: 'new',
        priority: 'medium',
        comments: message || undefined,
        url: `/staging/documents?highlight=${documentId}` // Deep link to documents with highlight
      };

      await notificationService.sendTemplatedNotification(
        'hr_document_pushed',
        variables,
        {
          tenantId,
          userIds: [targetUserId]
        },
        {
          priority: 'medium',
          inApp: true,
          email: true
        }
      );

      logger.info('📄 HR document push notification sent', {
        documentId,
        documentTitle,
        targetUserId,
        pushedBy: pusherName,
        tenantId
      });

    } catch (error) {
      logger.error('❌ Failed to send HR document push notification', {
        error: error instanceof Error ? error.message : String(error),
        tenantId,
        documentId,
        targetUserId,
        pushedBy
      });
    }
  }
}