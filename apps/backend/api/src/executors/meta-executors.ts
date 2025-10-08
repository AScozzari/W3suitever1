import { MetaOAuthService } from '../services/meta-oauth-service';
import { logger } from '../core/logger';

/**
 * Meta/Instagram MCP Executors
 * 
 * 9 action executors for Meta/Instagram integration:
 * - Instagram: Post Image, Post Video, Post Story, Reply Comment, Reply DM, Get Insights (6)
 * - Facebook: Post, Comment, Send Message (3)
 */

// ==================== INSTAGRAM EXECUTORS ====================

export async function executeInstagramPostImage(params: {
  serverId: string;
  tenantId: string;
  config: {
    imageUrl: string;
    caption: string;
    location?: string;
    userTags?: Array<{ username: string; x: number; y: number }>;
  };
}): Promise<{ mediaId: string; permalink: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const accessToken = await MetaOAuthService.getValidAccessToken({
      serverId,
      tenantId
    });

    // Step 1: Create media container
    const containerResponse = await fetch(
      `https://graph.instagram.com/v21.0/me/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: config.imageUrl,
          caption: config.caption,
          access_token: accessToken
        })
      }
    );

    if (!containerResponse.ok) {
      const error = await containerResponse.text();
      throw new Error(`Instagram create container failed: ${error}`);
    }

    const containerData = await containerResponse.json();

    // Step 2: Publish media
    const publishResponse = await fetch(
      `https://graph.instagram.com/v21.0/me/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerData.id,
          access_token: accessToken
        })
      }
    );

    if (!publishResponse.ok) {
      const error = await publishResponse.text();
      throw new Error(`Instagram publish failed: ${error}`);
    }

    const publishData = await publishResponse.json();

    logger.info('✅ [Instagram Post Image] Posted successfully', {
      mediaId: publishData.id
    });

    return {
      mediaId: publishData.id,
      permalink: `https://www.instagram.com/p/${publishData.id}/`
    };

  } catch (error) {
    logger.error('❌ [Instagram Post Image] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

export async function executeInstagramPostVideo(params: {
  serverId: string;
  tenantId: string;
  config: {
    videoUrl: string;
    caption: string;
    coverImageUrl?: string;
    location?: string;
  };
}): Promise<{ mediaId: string; permalink: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const accessToken = await MetaOAuthService.getValidAccessToken({
      serverId,
      tenantId
    });

    const containerResponse = await fetch(
      `https://graph.instagram.com/v21.0/me/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'VIDEO',
          video_url: config.videoUrl,
          caption: config.caption,
          ...(config.coverImageUrl ? { cover_url: config.coverImageUrl } : {}),
          access_token: accessToken
        })
      }
    );

    if (!containerResponse.ok) {
      const error = await containerResponse.text();
      throw new Error(`Instagram video container failed: ${error}`);
    }

    const containerData = await containerResponse.json();

    const publishResponse = await fetch(
      `https://graph.instagram.com/v21.0/me/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerData.id,
          access_token: accessToken
        })
      }
    );

    if (!publishResponse.ok) {
      const error = await publishResponse.text();
      throw new Error(`Instagram video publish failed: ${error}`);
    }

    const publishData = await publishResponse.json();

    return {
      mediaId: publishData.id,
      permalink: `https://www.instagram.com/p/${publishData.id}/`
    };

  } catch (error) {
    logger.error('❌ [Instagram Post Video] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

export async function executeInstagramPostStory(params: {
  serverId: string;
  tenantId: string;
  config: {
    mediaUrl: string;
    stickers?: any[];
    interactiveElements?: any[];
  };
}): Promise<{ storyId: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const accessToken = await MetaOAuthService.getValidAccessToken({
      serverId,
      tenantId
    });

    // Step 1: Create story container
    const containerResponse = await fetch(
      `https://graph.instagram.com/v21.0/me/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'STORIES',
          image_url: config.mediaUrl,
          access_token: accessToken
        })
      }
    );

    if (!containerResponse.ok) {
      const error = await containerResponse.text();
      throw new Error(`Instagram story container failed: ${error}`);
    }

    const containerData = await containerResponse.json();

    // Step 2: Publish story (CRITICAL FIX)
    const publishResponse = await fetch(
      `https://graph.instagram.com/v21.0/me/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerData.id,
          access_token: accessToken
        })
      }
    );

    if (!publishResponse.ok) {
      const error = await publishResponse.text();
      throw new Error(`Instagram story publish failed: ${error}`);
    }

    const publishData = await publishResponse.json();

    logger.info('✅ [Instagram Post Story] Story published successfully', {
      storyId: publishData.id
    });

    return { storyId: publishData.id };

  } catch (error) {
    logger.error('❌ [Instagram Post Story] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

export async function executeInstagramReplyComment(params: {
  serverId: string;
  tenantId: string;
  config: {
    commentId: string;
    message: string;
  };
}): Promise<{ replyId: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const accessToken = await MetaOAuthService.getValidAccessToken({
      serverId,
      tenantId
    });

    const response = await fetch(
      `https://graph.instagram.com/v21.0/${config.commentId}/replies`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: config.message,
          access_token: accessToken
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Instagram reply comment failed: ${error}`);
    }

    const data = await response.json();

    return { replyId: data.id };

  } catch (error) {
    logger.error('❌ [Instagram Reply Comment] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

export async function executeInstagramReplyDM(params: {
  serverId: string;
  tenantId: string;
  config: {
    conversationId: string;
    message: string;
    attachments?: any[];
  };
}): Promise<{ messageId: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const accessToken = await MetaOAuthService.getValidAccessToken({
      serverId,
      tenantId
    });

    const response = await fetch(
      `https://graph.instagram.com/v21.0/me/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: config.conversationId },
          message: { text: config.message },
          access_token: accessToken
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Instagram DM reply failed: ${error}`);
    }

    const data = await response.json();

    return { messageId: data.message_id };

  } catch (error) {
    logger.error('❌ [Instagram Reply DM] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

export async function executeInstagramGetInsights(params: {
  serverId: string;
  tenantId: string;
  config: {
    mediaId: string;
    metrics?: string[];
  };
}): Promise<{ impressions: number; reach: number; engagement: number }> {
  const { serverId, tenantId, config } = params;

  try {
    const accessToken = await MetaOAuthService.getValidAccessToken({
      serverId,
      tenantId
    });

    const metrics = config.metrics || ['impressions', 'reach', 'engagement'];
    const metricsParam = metrics.join(',');

    const response = await fetch(
      `https://graph.instagram.com/v21.0/${config.mediaId}/insights?metric=${metricsParam}&access_token=${accessToken}`
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Instagram insights failed: ${error}`);
    }

    const data = await response.json();
    const insights: Record<string, number> = {};

    for (const insight of data.data || []) {
      insights[insight.name] = insight.values[0]?.value || 0;
    }

    return {
      impressions: insights.impressions || 0,
      reach: insights.reach || 0,
      engagement: insights.engagement || 0
    };

  } catch (error) {
    logger.error('❌ [Instagram Get Insights] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

// ==================== FACEBOOK EXECUTORS ====================

export async function executeFacebookPost(params: {
  serverId: string;
  tenantId: string;
  config: {
    message: string;
    link?: string;
    imageUrl?: string;
  };
}): Promise<{ postId: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const accessToken = await MetaOAuthService.getValidAccessToken({
      serverId,
      tenantId
    });

    const response = await fetch(
      `https://graph.facebook.com/v21.0/me/feed`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: config.message,
          link: config.link,
          ...(config.imageUrl ? { picture: config.imageUrl } : {}),
          access_token: accessToken
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Facebook post failed: ${error}`);
    }

    const data = await response.json();

    return { postId: data.id };

  } catch (error) {
    logger.error('❌ [Facebook Post] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

export async function executeFacebookComment(params: {
  serverId: string;
  tenantId: string;
  config: {
    postId: string;
    message: string;
  };
}): Promise<{ commentId: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const accessToken = await MetaOAuthService.getValidAccessToken({
      serverId,
      tenantId
    });

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${config.postId}/comments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: config.message,
          access_token: accessToken
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Facebook comment failed: ${error}`);
    }

    const data = await response.json();

    return { commentId: data.id };

  } catch (error) {
    logger.error('❌ [Facebook Comment] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

export async function executeFacebookSendMessage(params: {
  serverId: string;
  tenantId: string;
  config: {
    recipientId: string;
    message: string;
    quickReplies?: Array<{ content_type: string; title: string; payload: string }>;
  };
}): Promise<{ messageId: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const accessToken = await MetaOAuthService.getValidAccessToken({
      serverId,
      tenantId
    });

    const response = await fetch(
      `https://graph.facebook.com/v21.0/me/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: config.recipientId },
          message: {
            text: config.message,
            ...(config.quickReplies ? { quick_replies: config.quickReplies } : {})
          },
          access_token: accessToken
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Facebook message failed: ${error}`);
    }

    const data = await response.json();

    return { messageId: data.message_id };

  } catch (error) {
    logger.error('❌ [Facebook Send Message] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}
