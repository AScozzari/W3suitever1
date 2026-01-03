/**
 * Email Service for W3 Suite
 * Handles transactional emails (password reset, notifications)
 * Supports SMTP with nodemailer
 */

import nodemailer from 'nodemailer';
import { logger } from '../core/logger';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: {
    name: string;
    email: string;
  };
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig | null = null;

  /**
   * Initialize email service with SMTP configuration
   */
  initialize() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      logger.warn('⚠️ Email service not configured - missing SMTP credentials');
      return;
    }

    this.config = {
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      from: {
        name: process.env.SMTP_FROM_NAME || 'W3 Suite',
        email: process.env.SMTP_FROM_EMAIL || 'noreply@w3suite.it'
      }
    };

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth,
    });

    logger.info('✅ Email service initialized', { host: this.config.host });
  }

  /**
   * Send an email
   */
  async send(options: SendEmailOptions): Promise<boolean> {
    if (!this.transporter || !this.config) {
      logger.error('❌ Email service not initialized');
      return false;
    }

    try {
      const result = await this.transporter.sendMail({
        from: `"${this.config.from.name}" <${this.config.from.email}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
      });

      logger.info('📧 Email sent successfully', {
        to: options.to,
        subject: options.subject,
        messageId: result.messageId
      });

      return true;
    } catch (error) {
      logger.error('❌ Failed to send email', {
        error: error instanceof Error ? error.message : String(error),
        to: options.to
      });
      return false;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(params: {
    to: string;
    firstName: string;
    resetLink: string;
    expiresInMinutes: number;
  }): Promise<boolean> {
    const { to, firstName, resetLink, expiresInMinutes } = params;

    const html = this.getPasswordResetTemplate({
      firstName,
      resetLink,
      expiresInMinutes
    });

    return this.send({
      to,
      subject: 'Recupero password W3 Suite',
      html
    });
  }

  /**
   * Password reset email template - modern and professional
   */
  private getPasswordResetTemplate(params: {
    firstName: string;
    resetLink: string;
    expiresInMinutes: number;
  }): string {
    const { firstName, resetLink, expiresInMinutes } = params;
    const expiresText = expiresInMinutes >= 60 
      ? `${Math.floor(expiresInMinutes / 60)} ora${expiresInMinutes >= 120 ? 'e' : ''}`
      : `${expiresInMinutes} minuti`;

    return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recupero Password - W3 Suite</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 520px; border-collapse: collapse;">
          
          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <table role="presentation" style="border-collapse: collapse;">
                <tr>
                  <td style="background: linear-gradient(135deg, #FF6900 0%, #FF8533 100%); border-radius: 12px; padding: 12px 16px;">
                    <span style="font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">W3</span>
                    <span style="font-size: 24px; font-weight: 400; color: #ffffff; margin-left: 4px;">Suite</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main Card -->
          <tr>
            <td style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); overflow: hidden;">
              
              <!-- Card Header -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 40px 40px 24px 40px;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1a1a1a; line-height: 1.3;">
                      Ciao ${firstName || 'Utente'},
                    </h1>
                    <p style="margin: 16px 0 0 0; font-size: 16px; color: #666666; line-height: 1.6;">
                      Abbiamo ricevuto una richiesta di recupero password per il tuo account W3 Suite.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 8px 40px 32px 40px;">
                    <a href="${resetLink}" 
                       style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #FF6900 0%, #FF8533 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 10px; box-shadow: 0 4px 12px rgba(255, 105, 0, 0.35);">
                      Reimposta la tua password
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Info Box -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 0 40px 32px 40px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f8f9fa; border-radius: 10px;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="margin: 0; font-size: 14px; color: #666666; line-height: 1.5;">
                            ⏱️ Il link scade tra <strong>${expiresText}</strong>
                          </p>
                          <p style="margin: 12px 0 0 0; font-size: 14px; color: #666666; line-height: 1.5;">
                            🔒 Se non hai richiesto tu il reset, puoi ignorare questa email in sicurezza.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Alternative Link -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 0 40px 32px 40px;">
                    <p style="margin: 0; font-size: 13px; color: #999999; line-height: 1.5;">
                      Se il bottone non funziona, copia e incolla questo link nel browser:
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 12px; color: #FF6900; word-break: break-all;">
                      ${resetLink}
                    </p>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 32px 20px;">
              <p style="margin: 0; font-size: 13px; color: #999999;">
                W3 Suite Team
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #cccccc;">
                © ${new Date().getFullYear()} W3 Suite - Tutti i diritti riservati
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * Strip HTML tags for plain text version
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>.*<\/style>/gi, '')
      .replace(/<script[^>]*>.*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Check if email service is ready
   */
  isReady(): boolean {
    return this.transporter !== null;
  }

  /**
   * Verify SMTP connection
   */
  async verify(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      logger.info('✅ SMTP connection verified');
      return true;
    } catch (error) {
      logger.error('❌ SMTP connection failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
}

export const emailService = new EmailService();
