/**
 * Test script: Send email via Google Gmail using OAuth credentials
 * Usage: tsx apps/backend/api/src/test-gmail-send.ts
 */

// Load environment variables
import 'dotenv/config';

import { db } from './core/db';
import { mcpServerCredentials } from './db/schema/w3suite';
import { eq } from 'drizzle-orm';
import { decryptMCPCredentials } from './services/mcp-credential-encryption';
import { google } from 'googleapis';

async function sendTestEmail() {
  try {
    console.log('📧 [Gmail Test] Starting email send test...');

    // 1. Fetch OAuth credentials from database
    const credentials = await db
      .select()
      .from(mcpServerCredentials)
      .where(eq(mcpServerCredentials.oauthProvider, 'google'))
      .limit(1);

    if (credentials.length === 0) {
      throw new Error('No Google OAuth credentials found in database');
    }

    const cred = credentials[0];
    console.log('✅ [Gmail Test] Found credentials for:', cred.accountEmail);

    // 2. Decrypt credentials
    const decryptedCreds = await decryptMCPCredentials(
      cred.encryptedCredentials as any,
      cred.tenantId
    );

    console.log('✅ [Gmail Test] Credentials decrypted successfully');

    // 3. Initialize OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'https://your-redirect-uri.com' // Not needed for API calls
    );

    // Set credentials
    oauth2Client.setCredentials({
      access_token: decryptedCreds.access_token,
      refresh_token: decryptedCreds.refresh_token,
      token_type: decryptedCreds.token_type,
      expiry_date: decryptedCreds.expiry_date
    });

    console.log('✅ [Gmail Test] OAuth2 client initialized');

    // 4. Initialize Gmail API
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // 5. Compose email
    const to = 'a.scozzari@easydigitalgroup.it';
    const subject = 'Test Email from W3 Suite';
    const body = 'Ciao Ti sto scrivendo da w3 suite sono il piu forte di tutti';

    const rawMessage = [
      `To: ${to}`,
      `From: ${cred.accountEmail}`,
      `Subject: ${subject}`,
      '',
      body
    ].join('\n');

    // Encode in base64url
    const encodedMessage = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    console.log('📧 [Gmail Test] Sending email...');
    console.log('   From:', cred.accountEmail);
    console.log('   To:', to);
    console.log('   Subject:', subject);

    // 6. Send email
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    console.log('✅ [Gmail Test] Email sent successfully!');
    console.log('   Message ID:', result.data.id);
    console.log('   Thread ID:', result.data.threadId);

    return result.data;

  } catch (error) {
    console.error('❌ [Gmail Test] Failed to send email:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack:', error.stack);
    }
    throw error;
  }
}

// Run test
sendTestEmail()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  });
