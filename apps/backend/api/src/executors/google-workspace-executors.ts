import { GoogleOAuthService } from '../services/google-oauth-service';
import { logger } from '../core/logger';

/**
 * Google Workspace MCP Executors
 * 
 * 12 action executors for Google Workspace integration:
 * - Gmail: Send, Search, Read, Add Label (4)
 * - Drive: Upload, Download, Share, Create Folder (4)
 * - Calendar: Create Event, Update Event (2)
 * - Sheets: Append Row, Read Range (2)
 */

// ==================== GMAIL EXECUTORS ====================

export async function executeGmailSend(params: {
  serverId: string;
  tenantId: string;
  config: {
    to: string;
    subject: string;
    body: string;
    cc?: string;
    bcc?: string;
    attachments?: Array<{ filename: string; content: string; mimeType: string }>;
  };
}): Promise<{ messageId: string; threadId: string }> {
  const { serverId, tenantId, config } = params;

  try {
    // Get OAuth token
    const accessToken = await GoogleOAuthService.getValidAccessToken({
      serverId,
      tenantId
    });

    // Build email message
    const emailLines = [
      `To: ${config.to}`,
      config.cc ? `Cc: ${config.cc}` : '',
      config.bcc ? `Bcc: ${config.bcc}` : '',
      `Subject: ${config.subject}`,
      '',
      config.body
    ].filter(Boolean);

    const rawMessage = emailLines.join('\r\n');
    const encodedMessage = Buffer.from(rawMessage).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    // Send email via Gmail API
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw: encodedMessage })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gmail Send failed: ${error}`);
    }

    const data = await response.json();

    logger.info('✅ [Gmail Send] Email sent successfully', {
      messageId: data.id,
      to: config.to
    });

    return {
      messageId: data.id,
      threadId: data.threadId
    };

  } catch (error) {
    logger.error('❌ [Gmail Send] Failed', {
      error: error instanceof Error ? error.message : String(error),
      serverId,
      tenantId
    });
    throw error;
  }
}

export async function executeGmailSearch(params: {
  serverId: string;
  tenantId: string;
  config: {
    query: string;
    maxResults?: number;
    labelIds?: string[];
  };
}): Promise<{ messages: any[]; resultCount: number }> {
  const { serverId, tenantId, config } = params;

  try {
    const accessToken = await GoogleOAuthService.getValidAccessToken({
      serverId,
      tenantId
    });

    const queryParams = new URLSearchParams({
      q: config.query,
      maxResults: (config.maxResults || 10).toString(),
      ...(config.labelIds ? { labelIds: config.labelIds.join(',') } : {})
    });

    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${queryParams}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gmail Search failed: ${error}`);
    }

    const data = await response.json();

    logger.info('✅ [Gmail Search] Search completed', {
      query: config.query,
      resultCount: data.messages?.length || 0
    });

    return {
      messages: data.messages || [],
      resultCount: data.messages?.length || 0
    };

  } catch (error) {
    logger.error('❌ [Gmail Search] Failed', {
      error: error instanceof Error ? error.message : String(error),
      serverId,
      tenantId
    });
    throw error;
  }
}

export async function executeGmailRead(params: {
  serverId: string;
  tenantId: string;
  config: {
    messageId: string;
    format?: 'full' | 'raw' | 'minimal';
  };
}): Promise<{ from: string; to: string; subject: string; body: string; attachments?: any[] }> {
  const { serverId, tenantId, config } = params;

  try {
    const accessToken = await GoogleOAuthService.getValidAccessToken({
      serverId,
      tenantId
    });

    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${config.messageId}?format=${config.format || 'full'}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gmail Read failed: ${error}`);
    }

    const data = await response.json();
    const headers = data.payload?.headers || [];
    
    const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    return {
      from: getHeader('from'),
      to: getHeader('to'),
      subject: getHeader('subject'),
      body: data.snippet || '',
      attachments: data.payload?.parts?.filter((p: any) => p.filename) || []
    };

  } catch (error) {
    logger.error('❌ [Gmail Read] Failed', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

export async function executeGmailAddLabel(params: {
  serverId: string;
  tenantId: string;
  config: {
    messageId: string;
    labelId: string;
  };
}): Promise<{ success: boolean }> {
  const { serverId, tenantId, config } = params;

  try {
    const accessToken = await GoogleOAuthService.getValidAccessToken({
      serverId,
      tenantId
    });

    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${config.messageId}/modify`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ addLabelIds: [config.labelId] })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gmail Add Label failed: ${error}`);
    }

    return { success: true };

  } catch (error) {
    logger.error('❌ [Gmail Add Label] Failed', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

// ==================== GOOGLE DRIVE EXECUTORS ====================

export async function executeDriveUpload(params: {
  serverId: string;
  tenantId: string;
  config: {
    fileName: string;
    fileContent: string; // Base64 encoded
    folderId?: string;
    mimeType?: string;
  };
}): Promise<{ fileId: string; fileUrl: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const accessToken = await GoogleOAuthService.getValidAccessToken({
      serverId,
      tenantId
    });

    const metadata = {
      name: config.fileName,
      ...(config.folderId ? { parents: [config.folderId] } : {})
    };

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', new Blob([Buffer.from(config.fileContent, 'base64')], { type: config.mimeType || 'application/octet-stream' }));

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` },
      body: formData as any
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Drive Upload failed: ${error}`);
    }

    const data = await response.json();

    return {
      fileId: data.id,
      fileUrl: `https://drive.google.com/file/d/${data.id}/view`
    };

  } catch (error) {
    logger.error('❌ [Drive Upload] Failed', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

export async function executeDriveDownload(params: {
  serverId: string;
  tenantId: string;
  config: {
    fileId: string;
    mimeType?: string;
  };
}): Promise<{ fileContent: string; fileName: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const accessToken = await GoogleOAuthService.getValidAccessToken({
      serverId,
      tenantId
    });

    // Get file metadata
    const metadataResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${config.fileId}?fields=name,mimeType`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    const metadata = await metadataResponse.json();

    // Download file content
    const downloadResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${config.fileId}?alt=media`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    const content = await downloadResponse.arrayBuffer();
    const base64Content = Buffer.from(content).toString('base64');

    return {
      fileContent: base64Content,
      fileName: metadata.name
    };

  } catch (error) {
    logger.error('❌ [Drive Download] Failed', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

export async function executeDriveShare(params: {
  serverId: string;
  tenantId: string;
  config: {
    fileId: string;
    email: string;
    role: 'reader' | 'writer' | 'commenter';
    sendNotification?: boolean;
  };
}): Promise<{ permissionId: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const accessToken = await GoogleOAuthService.getValidAccessToken({
      serverId,
      tenantId
    });

    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${config.fileId}/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'user',
        role: config.role,
        emailAddress: config.email,
        sendNotificationEmail: config.sendNotification !== false
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Drive Share failed: ${error}`);
    }

    const data = await response.json();

    return { permissionId: data.id };

  } catch (error) {
    logger.error('❌ [Drive Share] Failed', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

export async function executeDriveCreateFolder(params: {
  serverId: string;
  tenantId: string;
  config: {
    folderName: string;
    parentFolderId?: string;
  };
}): Promise<{ folderId: string; folderUrl: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const accessToken = await GoogleOAuthService.getValidAccessToken({
      serverId,
      tenantId
    });

    const response = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: config.folderName,
        mimeType: 'application/vnd.google-apps.folder',
        ...(config.parentFolderId ? { parents: [config.parentFolderId] } : {})
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Drive Create Folder failed: ${error}`);
    }

    const data = await response.json();

    return {
      folderId: data.id,
      folderUrl: `https://drive.google.com/drive/folders/${data.id}`
    };

  } catch (error) {
    logger.error('❌ [Drive Create Folder] Failed', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

// ==================== GOOGLE CALENDAR EXECUTORS ====================

export async function executeCalendarCreateEvent(params: {
  serverId: string;
  tenantId: string;
  config: {
    summary: string;
    startTime: string; // ISO 8601
    endTime: string; // ISO 8601
    description?: string;
    attendees?: string[]; // Email addresses
    location?: string;
  };
}): Promise<{ eventId: string; eventLink: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const accessToken = await GoogleOAuthService.getValidAccessToken({
      serverId,
      tenantId
    });

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        summary: config.summary,
        description: config.description,
        location: config.location,
        start: { dateTime: config.startTime },
        end: { dateTime: config.endTime },
        attendees: config.attendees?.map(email => ({ email }))
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Calendar Create Event failed: ${error}`);
    }

    const data = await response.json();

    return {
      eventId: data.id,
      eventLink: data.htmlLink
    };

  } catch (error) {
    logger.error('❌ [Calendar Create Event] Failed', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

export async function executeCalendarUpdateEvent(params: {
  serverId: string;
  tenantId: string;
  config: {
    eventId: string;
    summary?: string;
    startTime?: string;
    endTime?: string;
    description?: string;
  };
}): Promise<{ success: boolean }> {
  const { serverId, tenantId, config } = params;

  try {
    const accessToken = await GoogleOAuthService.getValidAccessToken({
      serverId,
      tenantId
    });

    const updateData: any = {};
    if (config.summary) updateData.summary = config.summary;
    if (config.description) updateData.description = config.description;
    if (config.startTime) updateData.start = { dateTime: config.startTime };
    if (config.endTime) updateData.end = { dateTime: config.endTime };

    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${config.eventId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Calendar Update Event failed: ${error}`);
    }

    return { success: true };

  } catch (error) {
    logger.error('❌ [Calendar Update Event] Failed', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

// ==================== GOOGLE SHEETS EXECUTORS ====================

export async function executeSheetsAppendRow(params: {
  serverId: string;
  tenantId: string;
  config: {
    spreadsheetId: string;
    range: string; // e.g., "Sheet1!A1:D1"
    values: string[][]; // 2D array of values
    valueInputOption?: 'RAW' | 'USER_ENTERED';
  };
}): Promise<{ updatedRange: string; updatedRows: number }> {
  const { serverId, tenantId, config } = params;

  try {
    const accessToken = await GoogleOAuthService.getValidAccessToken({
      serverId,
      tenantId
    });

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${config.range}:append?valueInputOption=${config.valueInputOption || 'USER_ENTERED'}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: config.values })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Sheets Append Row failed: ${error}`);
    }

    const data = await response.json();

    return {
      updatedRange: data.updates.updatedRange,
      updatedRows: data.updates.updatedRows
    };

  } catch (error) {
    logger.error('❌ [Sheets Append Row] Failed', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

export async function executeSheetsReadRange(params: {
  serverId: string;
  tenantId: string;
  config: {
    spreadsheetId: string;
    range: string; // e.g., "Sheet1!A1:D10"
  };
}): Promise<{ values: string[][]; rowCount: number }> {
  const { serverId, tenantId, config } = params;

  try {
    const accessToken = await GoogleOAuthService.getValidAccessToken({
      serverId,
      tenantId
    });

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${config.range}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Sheets Read Range failed: ${error}`);
    }

    const data = await response.json();

    return {
      values: data.values || [],
      rowCount: data.values?.length || 0
    };

  } catch (error) {
    logger.error('❌ [Sheets Read Range] Failed', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}
