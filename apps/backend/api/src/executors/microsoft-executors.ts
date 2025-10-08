import { MicrosoftOAuthService } from '../services/microsoft-oauth-service';
import { logger } from '../core/logger';

/**
 * Microsoft 365 MCP Executors
 * 
 * 7 action executors for Microsoft 365 integration:
 * - Outlook: Send Email, Create Calendar Event (2)
 * - Teams: Send Message, Create Channel, Post Adaptive Card (3)
 * - OneDrive: Upload, Share (2)
 */

// ==================== OUTLOOK EXECUTORS ====================

export async function executeOutlookSendEmail(params: {
  serverId: string;
  tenantId: string;
  config: {
    to: string;
    subject: string;
    body: string;
    cc?: string;
    bcc?: string;
    attachments?: Array<{ name: string; contentBytes: string; contentType: string }>;
  };
}): Promise<{ messageId: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const accessToken = await MicrosoftOAuthService.getValidAccessToken({
      serverId,
      tenantId
    });

    const toRecipients = config.to.split(',').map(email => ({ emailAddress: { address: email.trim() } }));
    const ccRecipients = config.cc ? config.cc.split(',').map(email => ({ emailAddress: { address: email.trim() } })) : [];
    const bccRecipients = config.bcc ? config.bcc.split(',').map(email => ({ emailAddress: { address: email.trim() } })) : [];

    const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          subject: config.subject,
          body: {
            contentType: 'HTML',
            content: config.body
          },
          toRecipients,
          ccRecipients: ccRecipients.length > 0 ? ccRecipients : undefined,
          bccRecipients: bccRecipients.length > 0 ? bccRecipients : undefined,
          attachments: config.attachments
        },
        saveToSentItems: true
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Outlook send email failed: ${error}`);
    }

    logger.info('✅ [Outlook Send Email] Email sent successfully', {
      to: config.to
    });

    return { messageId: 'sent' };

  } catch (error) {
    logger.error('❌ [Outlook Send Email] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

export async function executeOutlookCreateCalendarEvent(params: {
  serverId: string;
  tenantId: string;
  config: {
    subject: string;
    startTime: string; // ISO 8601
    endTime: string; // ISO 8601
    attendees?: string[];
    location?: string;
    body?: string;
  };
}): Promise<{ eventId: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const accessToken = await MicrosoftOAuthService.getValidAccessToken({
      serverId,
      tenantId
    });

    const attendeeList = config.attendees?.map(email => ({
      emailAddress: { address: email },
      type: 'required'
    })) || [];

    const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subject: config.subject,
        start: {
          dateTime: config.startTime,
          timeZone: 'UTC'
        },
        end: {
          dateTime: config.endTime,
          timeZone: 'UTC'
        },
        location: config.location ? { displayName: config.location } : undefined,
        body: config.body ? {
          contentType: 'HTML',
          content: config.body
        } : undefined,
        attendees: attendeeList
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Outlook create event failed: ${error}`);
    }

    const data = await response.json();

    return { eventId: data.id };

  } catch (error) {
    logger.error('❌ [Outlook Create Calendar Event] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

// ==================== TEAMS EXECUTORS ====================

export async function executeTeamsSendMessage(params: {
  serverId: string;
  tenantId: string;
  config: {
    channelId: string;
    message: string;
    mentions?: Array<{ userId: string; displayName: string }>;
  };
}): Promise<{ messageId: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const accessToken = await MicrosoftOAuthService.getValidAccessToken({
      serverId,
      tenantId
    });

    // Teams channel message requires teamId - extract from channelId if needed
    const [teamId, actualChannelId] = config.channelId.includes(':') 
      ? config.channelId.split(':')
      : [config.channelId, 'general'];

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${actualChannelId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          body: {
            content: config.message,
            contentType: 'html'
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Teams send message failed: ${error}`);
    }

    const data = await response.json();

    return { messageId: data.id };

  } catch (error) {
    logger.error('❌ [Teams Send Message] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

export async function executeTeamsCreateChannel(params: {
  serverId: string;
  tenantId: string;
  config: {
    teamId: string;
    displayName: string;
    description?: string;
    membershipType?: 'standard' | 'private';
  };
}): Promise<{ channelId: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const accessToken = await MicrosoftOAuthService.getValidAccessToken({
      serverId,
      tenantId
    });

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/teams/${config.teamId}/channels`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          displayName: config.displayName,
          description: config.description,
          membershipType: config.membershipType || 'standard'
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Teams create channel failed: ${error}`);
    }

    const data = await response.json();

    return { channelId: data.id };

  } catch (error) {
    logger.error('❌ [Teams Create Channel] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

export async function executeTeamsPostAdaptiveCard(params: {
  serverId: string;
  tenantId: string;
  config: {
    channelId: string;
    cardJson: any;
  };
}): Promise<{ messageId: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const accessToken = await MicrosoftOAuthService.getValidAccessToken({
      serverId,
      tenantId
    });

    const [teamId, actualChannelId] = config.channelId.includes(':') 
      ? config.channelId.split(':')
      : [config.channelId, 'general'];

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${actualChannelId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          body: {
            contentType: 'html',
            content: '<attachment id="74d20c7f34aa4a7fb74e2b30004247c5"></attachment>'
          },
          attachments: [
            {
              id: '74d20c7f34aa4a7fb74e2b30004247c5',
              contentType: 'application/vnd.microsoft.card.adaptive',
              content: config.cardJson
            }
          ]
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Teams adaptive card failed: ${error}`);
    }

    const data = await response.json();

    return { messageId: data.id };

  } catch (error) {
    logger.error('❌ [Teams Post Adaptive Card] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

// ==================== ONEDRIVE EXECUTORS ====================

export async function executeOneDriveUpload(params: {
  serverId: string;
  tenantId: string;
  config: {
    fileName: string;
    fileContent: string; // Base64 encoded
    folderPath?: string;
  };
}): Promise<{ fileId: string; webUrl: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const accessToken = await MicrosoftOAuthService.getValidAccessToken({
      serverId,
      tenantId
    });

    const uploadPath = config.folderPath 
      ? `/me/drive/root:/${config.folderPath}/${config.fileName}:/content`
      : `/me/drive/root:/${config.fileName}:/content`;

    const fileBuffer = Buffer.from(config.fileContent, 'base64');

    const response = await fetch(
      `https://graph.microsoft.com/v1.0${uploadPath}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/octet-stream'
        },
        body: fileBuffer
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OneDrive upload failed: ${error}`);
    }

    const data = await response.json();

    return {
      fileId: data.id,
      webUrl: data.webUrl
    };

  } catch (error) {
    logger.error('❌ [OneDrive Upload] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

export async function executeOneDriveShare(params: {
  serverId: string;
  tenantId: string;
  config: {
    fileId: string;
    email: string;
    role?: 'read' | 'write';
    sendInvitation?: boolean;
  };
}): Promise<{ permissionId: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const accessToken = await MicrosoftOAuthService.getValidAccessToken({
      serverId,
      tenantId
    });

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/items/${config.fileId}/invite`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requireSignIn: true,
          sendInvitation: config.sendInvitation !== false,
          roles: [config.role || 'read'],
          recipients: [
            { email: config.email }
          ]
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OneDrive share failed: ${error}`);
    }

    const data = await response.json();

    return { permissionId: data.value[0]?.id || '' };

  } catch (error) {
    logger.error('❌ [OneDrive Share] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}
