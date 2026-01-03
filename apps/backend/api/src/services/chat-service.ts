import { db } from '../core/db.js';
import { 
  chatChannels,
  chatChannelMembers,
  chatMessages,
  chatTypingIndicators,
  userPresence,
  chatReadReceipts,
  chatPinnedMessages,
  chatSavedReplies,
  users,
  type InsertChatChannel,
  type ChatChannel,
  type InsertChatChannelMember,
  type ChatChannelMember,
  type InsertChatMessage,
  type ChatMessage,
  type InsertChatTypingIndicator,
  type ChatTypingIndicator,
  type UserPresence,
  type InsertUserPresence,
  type ChatReadReceipt,
  type ChatPinnedMessage,
  type ChatSavedReply
} from '../db/schema/w3suite.js';
import { eq, and, desc, isNull, lt, inArray, sql, gte, like, or, asc } from 'drizzle-orm';
import { logger } from '../core/logger';

export class ChatService {
  
  static async createChannel(channelData: InsertChatChannel, memberUserIds: string[] = []): Promise<ChatChannel> {
    try {
      const [channel] = await db
        .insert(chatChannels)
        .values(channelData)
        .returning();
      
      await this.addMember(channel.id, channel.tenantId, {
        userId: channelData.createdBy,
        role: 'owner'
      });
      
      for (const userId of memberUserIds) {
        if (userId !== channelData.createdBy) {
          await this.addMember(channel.id, channel.tenantId, {
            userId,
            role: 'member',
            inviteStatus: 'accepted'
          });
        }
      }
      
      logger.info('💬 Chat channel created', { 
        channelId: channel.id, 
        type: channel.channelType,
        tenantId: channel.tenantId,
        membersAdded: memberUserIds.length 
      });
      
      return channel;
    } catch (error) {
      logger.error('❌ Failed to create chat channel', { error, channelData });
      throw error;
    }
  }

  static async getChannelById(channelId: string, tenantId: string): Promise<ChatChannel | null> {
    const [channel] = await db
      .select()
      .from(chatChannels)
      .where(and(
        eq(chatChannels.id, channelId),
        eq(chatChannels.tenantId, tenantId)
      ))
      .limit(1);
    
    return channel || null;
  }

  static async getUserChannels(
    userId: string,
    tenantId: string,
    filters?: {
      type?: 'team' | 'dm' | 'task_thread' | 'general';
      archived?: boolean;
    }
  ): Promise<any[]> {
    // Get user's channel memberships with lastReadAt
    const memberChannels = await db
      .select({ 
        channelId: chatChannelMembers.channelId,
        lastReadAt: chatChannelMembers.lastReadAt
      })
      .from(chatChannelMembers)
      .where(eq(chatChannelMembers.userId, userId));

    const channelIds = memberChannels.map(m => m.channelId);

    if (channelIds.length === 0) {
      return [];
    }

    // Get channels with basic info
    const channels = await db
      .select()
      .from(chatChannels)
      .where(and(
        eq(chatChannels.tenantId, tenantId),
        inArray(chatChannels.id, channelIds),
        filters?.type ? eq(chatChannels.channelType, filters.type) : undefined,
        eq(chatChannels.isArchived, filters?.archived ?? false)
      ));

    // For each channel, get last message and unread count
    const channelsWithDetails = await Promise.all(
      channels.map(async (channel) => {
        const memberInfo = memberChannels.find(m => m.channelId === channel.id);
        
        // Get last message
        const [lastMessage] = await db
          .select({
            id: chatMessages.id,
            content: chatMessages.content,
            createdAt: chatMessages.createdAt,
            userId: chatMessages.userId
          })
          .from(chatMessages)
          .where(and(
            eq(chatMessages.channelId, channel.id),
            isNull(chatMessages.deletedAt)
          ))
          .orderBy(desc(chatMessages.createdAt))
          .limit(1);

        // Get unread count
        const lastReadAt = memberInfo?.lastReadAt;
        const unreadMessages = lastReadAt 
          ? await db
              .select({ count: sql<number>`count(*)::int` })
              .from(chatMessages)
              .where(and(
                eq(chatMessages.channelId, channel.id),
                isNull(chatMessages.deletedAt),
                sql`${chatMessages.createdAt} > ${lastReadAt}`
              ))
          : [];
        
        const unreadCount = unreadMessages[0]?.count || 0;

        // Get member count
        const [memberCountResult] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(chatChannelMembers)
          .where(eq(chatChannelMembers.channelId, channel.id));
        
        const memberCount = memberCountResult?.count || 0;

        // For DM channels, get the other user's info
        let dmUserInfo = null;
        if (channel.channelType === 'dm') {
          const members = await db
            .select({ userId: chatChannelMembers.userId })
            .from(chatChannelMembers)
            .where(eq(chatChannelMembers.channelId, channel.id));
          
          const otherUserId = members.find(m => m.userId !== userId)?.userId;
          
          if (otherUserId) {
            const [otherUser] = await db
              .select({
                id: users.id,
                email: users.email,
                firstName: users.firstName,
                lastName: users.lastName,
                avatarObjectPath: users.avatarObjectPath
              })
              .from(users)
              .where(eq(users.id, otherUserId))
              .limit(1);
            
            if (otherUser) {
              // Build proper avatar URL from object storage path
              let avatarUrl: string | null = null;
              if (otherUser.avatarObjectPath) {
                const filename = otherUser.avatarObjectPath.split('/').pop();
                avatarUrl = `/api/avatars/serve/${tenantId}/${filename}`;
              }
              
              dmUserInfo = {
                id: otherUser.id,
                email: otherUser.email,
                name: otherUser.firstName && otherUser.lastName 
                  ? `${otherUser.firstName} ${otherUser.lastName}`
                  : otherUser.firstName || otherUser.lastName || otherUser.email,
                avatarUrl
              };
            }
          }
        }

        return {
          ...channel,
          lastMessage: lastMessage || null,
          lastMessageAt: lastMessage?.createdAt || channel.createdAt,
          unreadCount,
          memberCount,
          dmUser: dmUserInfo
        };
      })
    );

    // Sort by lastMessageAt descending (most recent first)
    return channelsWithDetails.sort((a, b) => 
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
  }

  static async updateChannel(
    channelId: string,
    tenantId: string,
    updates: Partial<InsertChatChannel>
  ): Promise<ChatChannel> {
    const [updated] = await db
      .update(chatChannels)
      .set(updates)
      .where(and(
        eq(chatChannels.id, channelId),
        eq(chatChannels.tenantId, tenantId)
      ))
      .returning();

    if (!updated) {
      throw new Error('Channel not found');
    }

    logger.info('💬 Chat channel updated', { channelId, updates });
    return updated;
  }

  static async archiveChannel(channelId: string, tenantId: string): Promise<void> {
    await this.updateChannel(channelId, tenantId, { isArchived: true });
    logger.info('💬 Chat channel archived', { channelId });
  }

  static async deleteChannel(channelId: string, tenantId: string): Promise<void> {
    await db
      .delete(chatChannels)
      .where(and(
        eq(chatChannels.id, channelId),
        eq(chatChannels.tenantId, tenantId)
      ));

    logger.info('💬 Chat channel deleted', { channelId });
  }

  static async addMember(
    channelId: string,
    tenantId: string,
    memberData: Omit<InsertChatChannelMember, 'channelId'>
  ): Promise<ChatChannelMember> {
    const channel = await this.getChannelById(channelId, tenantId);
    if (!channel) {
      throw new Error('Channel not found or access denied');
    }

    const [member] = await db
      .insert(chatChannelMembers)
      .values({
        ...memberData,
        channelId
      })
      .returning();

    logger.info('👤 Member added to channel', { 
      channelId, 
      userId: memberData.userId,
      role: memberData.role 
    });

    return member;
  }

  static async removeMember(channelId: string, tenantId: string, userId: string): Promise<void> {
    const channel = await this.getChannelById(channelId, tenantId);
    if (!channel) {
      throw new Error('Channel not found or access denied');
    }

    await db
      .delete(chatChannelMembers)
      .where(and(
        eq(chatChannelMembers.channelId, channelId),
        eq(chatChannelMembers.userId, userId)
      ));

    logger.info('👤 Member removed from channel', { channelId, userId });
  }

  static async getChannelMembers(channelId: string, tenantId: string): Promise<any[]> {
    const members = await db
      .select({
        id: chatChannelMembers.id,
        channelId: chatChannelMembers.channelId,
        userId: chatChannelMembers.userId,
        role: chatChannelMembers.role,
        joinedAt: chatChannelMembers.joinedAt,
        lastReadAt: chatChannelMembers.lastReadAt,
        notificationPreference: chatChannelMembers.notificationPreference,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName
        }
      })
      .from(chatChannelMembers)
      .innerJoin(chatChannels, eq(chatChannelMembers.channelId, chatChannels.id))
      .leftJoin(users, eq(chatChannelMembers.userId, users.id))
      .where(and(
        eq(chatChannelMembers.channelId, channelId),
        eq(chatChannels.tenantId, tenantId)
      ))
      .orderBy(desc(chatChannelMembers.joinedAt));
    
    logger.info('🔍 GET CHANNEL MEMBERS', { 
      channelId, 
      tenantId, 
      count: members.length,
      members: members.map(m => ({ id: m.id, userId: m.userId, role: m.role, userName: m.user ? `${m.user.firstName} ${m.user.lastName}` : 'N/A' }))
    });
    
    return members;
  }

  static async updateMemberRole(
    channelId: string,
    tenantId: string,
    userId: string,
    role: 'owner' | 'admin' | 'member'
  ): Promise<ChatChannelMember> {
    const channel = await this.getChannelById(channelId, tenantId);
    if (!channel) {
      throw new Error('Channel not found or access denied');
    }

    const [updated] = await db
      .update(chatChannelMembers)
      .set({ role })
      .where(and(
        eq(chatChannelMembers.channelId, channelId),
        eq(chatChannelMembers.userId, userId)
      ))
      .returning();

    if (!updated) {
      throw new Error('Member not found');
    }

    logger.info('👤 Member role updated', { channelId, userId, role });
    return updated;
  }

  static async markAsRead(channelId: string, tenantId: string, userId: string): Promise<void> {
    const channel = await this.getChannelById(channelId, tenantId);
    if (!channel) {
      throw new Error('Channel not found or access denied');
    }

    await db
      .update(chatChannelMembers)
      .set({ lastReadAt: new Date() })
      .where(and(
        eq(chatChannelMembers.channelId, channelId),
        eq(chatChannelMembers.userId, userId)
      ));
  }

  static async getUnreadCount(channelId: string, tenantId: string, userId: string): Promise<number> {
    const channel = await this.getChannelById(channelId, tenantId);
    if (!channel) {
      throw new Error('Channel not found or access denied');
    }

    const [member] = await db
      .select()
      .from(chatChannelMembers)
      .where(and(
        eq(chatChannelMembers.channelId, channelId),
        eq(chatChannelMembers.userId, userId)
      ))
      .limit(1);

    if (!member || !member.lastReadAt) {
      const messages = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(chatMessages)
        .where(and(
          eq(chatMessages.channelId, channelId),
          eq(chatMessages.tenantId, tenantId)
        ));
      
      return Number(messages[0]?.count) || 0;
    }

    const unread = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(chatMessages)
      .where(and(
        eq(chatMessages.channelId, channelId),
        eq(chatMessages.tenantId, tenantId),
        sql`${chatMessages.createdAt} > ${member.lastReadAt}`
      ));

    return Number(unread[0]?.count) || 0;
  }

  static async sendMessage(messageData: InsertChatMessage): Promise<ChatMessage> {
    try {
      // Use raw SQL to match actual DB columns
      const result = await db.execute(sql`
        INSERT INTO w3suite.chat_messages (
          channel_id, tenant_id, user_id, content, 
          mentioned_user_ids, attachments, parent_message_id,
          is_voice_message, voice_duration_seconds, voice_url
        ) VALUES (
          ${messageData.channelId}::uuid,
          ${messageData.tenantId}::uuid,
          ${messageData.userId},
          ${messageData.content},
          ${messageData.mentionedUserIds ? sql`ARRAY[${sql.join(messageData.mentionedUserIds.map(id => sql`${id}`), sql`, `)}]::text[]` : sql`'{}'::text[]`},
          ${messageData.attachments ? JSON.stringify(messageData.attachments) : '[]'}::jsonb,
          ${(messageData as any).replyToMessageId || null}::uuid,
          ${(messageData as any).isVoiceMessage || false},
          ${(messageData as any).voiceDurationSeconds || null},
          ${(messageData as any).voiceUrl || null}
        )
        RETURNING id, channel_id, tenant_id, user_id, content, 
                  mentioned_user_ids, attachments, parent_message_id,
                  is_voice_message, voice_duration_seconds, voice_url,
                  is_edited, created_at, updated_at
      `);
      
      const row = result.rows?.[0] as any;
      const message = {
        id: row.id,
        channelId: row.channel_id,
        tenantId: row.tenant_id,
        userId: row.user_id,
        content: row.content,
        mentionedUserIds: row.mentioned_user_ids,
        attachments: row.attachments,
        replyToMessageId: row.parent_message_id,
        isVoiceMessage: row.is_voice_message,
        voiceDurationSeconds: row.voice_duration_seconds,
        voiceUrl: row.voice_url,
        isEdited: row.is_edited,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      } as ChatMessage;

      await this.clearTypingIndicator(messageData.channelId, messageData.userId);

      logger.info('💬 Message sent', { 
        channelId: messageData.channelId, 
        messageId: message.id,
        userId: messageData.userId 
      });

      return message;
    } catch (error) {
      logger.error('Failed to send message', { error, messageData });
      throw error;
    }
  }

  static async editMessage(
    messageId: string,
    tenantId: string,
    userId: string,
    content: string
  ): Promise<ChatMessage> {
    const [updated] = await db
      .update(chatMessages)
      .set({
        content,
        isEdited: true,
        updatedAt: new Date()
      })
      .where(and(
        eq(chatMessages.id, messageId),
        eq(chatMessages.tenantId, tenantId),
        eq(chatMessages.userId, userId),
        isNull(chatMessages.deletedAt)
      ))
      .returning();

    if (!updated) {
      throw new Error('Message not found or unauthorized');
    }

    logger.info('💬 Message edited', { messageId });
    return updated;
  }

  static async deleteMessage(
    messageId: string,
    tenantId: string,
    userId: string
  ): Promise<void> {
    await db
      .update(chatMessages)
      .set({ deletedAt: new Date() })
      .where(and(
        eq(chatMessages.id, messageId),
        eq(chatMessages.tenantId, tenantId),
        eq(chatMessages.userId, userId)
      ));

    logger.info('💬 Message deleted', { messageId });
  }

  static async getMessages(
    channelId: string,
    tenantId: string,
    options?: {
      limit?: number;
      beforeMessageId?: string;
      afterMessageId?: string;
    }
  ): Promise<ChatMessage[]> {
    try {
      // Use raw SQL to avoid Drizzle schema mismatch issues with columns that may not exist
      const limit = options?.limit || 50;
      
      const result = await db.execute(sql`
        SELECT 
          id, channel_id, tenant_id, user_id, content,
          attachments, mentioned_user_ids, reactions, parent_message_id,
          is_edited, is_voice_message, voice_duration_seconds, voice_url,
          created_at, updated_at, deleted_at
        FROM w3suite.chat_messages
        WHERE channel_id = ${channelId}
          AND tenant_id = ${tenantId}::uuid
          AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT ${limit}
      `);
      
      // Map snake_case to camelCase
      return (result.rows || []).map((row: any) => ({
        id: row.id,
        channelId: row.channel_id,
        tenantId: row.tenant_id,
        userId: row.user_id,
        content: row.content,
        messageType: row.is_voice_message ? 'voice' : 'text',
        attachments: row.attachments,
        mentionedUserIds: row.mentioned_user_ids,
        reactions: row.reactions,
        replyToMessageId: row.parent_message_id,
        isEdited: row.is_edited,
        isVoiceMessage: row.is_voice_message,
        voiceDurationSeconds: row.voice_duration_seconds,
        voiceUrl: row.voice_url,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        deletedAt: row.deleted_at
      })) as ChatMessage[];
    } catch (error) {
      logger.error('Failed to fetch messages', { error, channelId, tenantId });
      throw error;
    }
  }

  static async addReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<ChatMessage> {
    const [message] = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.id, messageId))
      .limit(1);

    if (!message) {
      throw new Error('Message not found');
    }

    const reactions = message.reactions as Record<string, string[]> || {};
    
    if (!reactions[emoji]) {
      reactions[emoji] = [];
    }

    if (!reactions[emoji].includes(userId)) {
      reactions[emoji].push(userId);
    }

    const [updated] = await db
      .update(chatMessages)
      .set({ reactions })
      .where(eq(chatMessages.id, messageId))
      .returning();

    logger.info('👍 Reaction added', { messageId, emoji, userId });
    return updated;
  }

  static async removeReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<ChatMessage> {
    const [message] = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.id, messageId))
      .limit(1);

    if (!message) {
      throw new Error('Message not found');
    }

    const reactions = message.reactions as Record<string, string[]> || {};
    
    if (reactions[emoji]) {
      reactions[emoji] = reactions[emoji].filter((id: string) => id !== userId);
      
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    }

    const [updated] = await db
      .update(chatMessages)
      .set({ reactions })
      .where(eq(chatMessages.id, messageId))
      .returning();

    logger.info('👍 Reaction removed', { messageId, emoji, userId });
    return updated;
  }

  static async setTypingIndicator(
    channelId: string,
    userId: string,
    expiresInSeconds: number = 3
  ): Promise<ChatTypingIndicator> {
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    try {
      const [indicator] = await db
        .insert(chatTypingIndicators)
        .values({
          channelId,
          userId,
          expiresAt
        })
        .onConflictDoUpdate({
          target: [chatTypingIndicators.channelId, chatTypingIndicators.userId],
          set: {
            startedAt: new Date(),
            expiresAt
          }
        })
        .returning();

      return indicator;
    } catch (error) {
      logger.error('❌ Failed to set typing indicator', { error, channelId, userId });
      throw error;
    }
  }

  static async clearTypingIndicator(channelId: string, userId: string): Promise<void> {
    await db
      .delete(chatTypingIndicators)
      .where(and(
        eq(chatTypingIndicators.channelId, channelId),
        eq(chatTypingIndicators.userId, userId)
      ));
  }

  static async getTypingUsers(channelId: string): Promise<string[]> {
    await db
      .delete(chatTypingIndicators)
      .where(lt(chatTypingIndicators.expiresAt, new Date()));

    const typing = await db
      .select()
      .from(chatTypingIndicators)
      .where(eq(chatTypingIndicators.channelId, channelId));

    return typing.map(t => t.userId);
  }

  static async createDMChannel(
    userId1: string,
    userId2: string,
    tenantId: string,
    metadata?: { headerColor?: string; backgroundPattern?: string }
  ): Promise<ChatChannel> {
    const existingChannels = await db
      .select()
      .from(chatChannels)
      .where(and(
        eq(chatChannels.tenantId, tenantId),
        eq(chatChannels.channelType, 'dm')
      ));

    for (const channel of existingChannels) {
      const members = await this.getChannelMembers(channel.id, tenantId);
      const memberIds = members.map((m: { userId: string }) => m.userId).sort();
      const expectedIds = [userId1, userId2].sort();

      if (memberIds.length === 2 && memberIds[0] === expectedIds[0] && memberIds[1] === expectedIds[1]) {
        logger.info('💬 Existing DM channel found', { channelId: channel.id });
        return channel;
      }
    }

    const channel = await this.createChannel({
      tenantId,
      channelType: 'dm',
      createdBy: userId1,
      ...(metadata && { metadata })
    });

    await this.addMember(channel.id, tenantId, {
      userId: userId2,
      role: 'member'
    });

    logger.info('💬 New DM channel created', { channelId: channel.id, users: [userId1, userId2] });
    return channel;
  }

  static async createTaskThread(
    taskId: string,
    tenantId: string,
    creatorId: string
  ): Promise<ChatChannel> {
    const existing = await db
      .select()
      .from(chatChannels)
      .where(and(
        eq(chatChannels.tenantId, tenantId),
        eq(chatChannels.taskId, taskId),
        eq(chatChannels.channelType, 'task_thread')
      ))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    const channel = await this.createChannel({
      tenantId,
      channelType: 'task_thread',
      taskId,
      name: `Task Discussion #${taskId.slice(0, 8)}`,
      createdBy: creatorId
    });

    logger.info('💬 Task thread created', { channelId: channel.id, taskId });
    return channel;
  }

  // ==================== PRESENCE MANAGEMENT ====================

  static async updatePresence(
    userId: string, 
    tenantId: string, 
    status: 'online' | 'away' | 'busy' | 'offline'
  ): Promise<UserPresence> {
    try {
      const result = await db.execute(sql`
        INSERT INTO w3suite.user_presence (user_id, tenant_id, status, last_seen_at, updated_at)
        VALUES (${userId}, ${tenantId}::uuid, ${status}, NOW(), NOW())
        ON CONFLICT (tenant_id, user_id) DO UPDATE SET
          status = EXCLUDED.status,
          last_seen_at = NOW(),
          updated_at = NOW()
        RETURNING id, user_id, tenant_id, status, custom_status, emoji,
                  last_seen_at, expires_at, manual_override, created_at, updated_at
      `);
      
      const row = result.rows?.[0] as any;
      logger.debug('🟢 Presence updated', { userId, status });
      return {
        id: row?.id,
        userId: row?.user_id,
        tenantId: row?.tenant_id,
        status: row?.status || status,
        customStatus: row?.custom_status,
        customEmoji: row?.emoji,
        lastSeenAt: row?.last_seen_at,
        statusExpiresAt: row?.expires_at
      } as UserPresence;
    } catch (error) {
      logger.error('Failed to update presence', { error, userId, status });
      return { userId, tenantId, status } as UserPresence;
    }
  }

  static async heartbeat(userId: string, tenantId: string): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO w3suite.user_presence (user_id, tenant_id, status, last_seen_at, updated_at)
        VALUES (${userId}, ${tenantId}::uuid, 'online', NOW(), NOW())
        ON CONFLICT (tenant_id, user_id) DO UPDATE SET
          status = 'online',
          last_seen_at = NOW(),
          updated_at = NOW()
      `);
    } catch (error) {
      logger.error('Failed to update heartbeat', { error, userId });
    }
  }

  static async getUserPresence(userId: string, tenantId: string): Promise<UserPresence | null> {
    try {
      const result = await db.execute(sql`
        SELECT id, user_id, tenant_id, status, custom_status, emoji,
               last_seen_at, expires_at, manual_override, created_at, updated_at
        FROM w3suite.user_presence
        WHERE user_id = ${userId}
          AND tenant_id = ${tenantId}::uuid
        LIMIT 1
      `);
      
      if (!result.rows || result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0] as any;
      return {
        id: row.id,
        userId: row.user_id,
        tenantId: row.tenant_id,
        status: row.status || 'offline',
        customStatus: row.custom_status,
        customEmoji: row.emoji,
        lastSeenAt: row.last_seen_at,
        statusExpiresAt: row.expires_at,
        manualOverride: row.manual_override,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      } as UserPresence;
    } catch (error) {
      logger.error('Failed to fetch user presence', { error, userId, tenantId });
      return null;
    }
  }

  static async getMultipleUserPresence(userIds: string[], tenantId: string): Promise<UserPresence[]> {
    if (userIds.length === 0) return [];
    
    try {
      const result = await db.execute(sql`
        SELECT id, user_id, tenant_id, status, custom_status, emoji,
               last_seen_at, expires_at, manual_override, created_at, updated_at
        FROM w3suite.user_presence
        WHERE user_id = ANY(${userIds}::text[])
          AND tenant_id = ${tenantId}::uuid
      `);
      
      return (result.rows || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        tenantId: row.tenant_id,
        status: row.status || 'offline',
        customStatus: row.custom_status,
        customEmoji: row.emoji,
        lastSeenAt: row.last_seen_at,
        statusExpiresAt: row.expires_at,
        manualOverride: row.manual_override,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })) as UserPresence[];
    } catch (error) {
      logger.error('Failed to fetch multiple user presence', { error, userIds, tenantId });
      return [];
    }
  }

  static async setCustomStatus(
    userId: string,
    tenantId: string,
    customStatus: string,
    emoji?: string,
    expiresAt?: Date
  ): Promise<UserPresence> {
    try {
      const expiresAtValue = expiresAt ? expiresAt.toISOString() : null;
      const result = await db.execute(sql`
        INSERT INTO w3suite.user_presence (user_id, tenant_id, custom_status, emoji, expires_at, updated_at)
        VALUES (${userId}, ${tenantId}::uuid, ${customStatus}, ${emoji || null}, ${expiresAtValue}::timestamp, NOW())
        ON CONFLICT (tenant_id, user_id) DO UPDATE SET
          custom_status = EXCLUDED.custom_status,
          emoji = EXCLUDED.emoji,
          expires_at = EXCLUDED.expires_at,
          updated_at = NOW()
        RETURNING id, user_id, tenant_id, status, custom_status, emoji,
                  last_seen_at, expires_at, manual_override, created_at, updated_at
      `);
      
      const row = result.rows?.[0] as any;
      return {
        id: row?.id,
        userId: row?.user_id,
        tenantId: row?.tenant_id,
        status: row?.status || 'online',
        customStatus: row?.custom_status,
        customEmoji: row?.emoji,
        lastSeenAt: row?.last_seen_at,
        statusExpiresAt: row?.expires_at
      } as UserPresence;
    } catch (error) {
      logger.error('Failed to set custom status', { error, userId });
      return { userId, tenantId, customStatus } as UserPresence;
    }
  }

  // ==================== READ RECEIPTS ====================

  static async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    await db
      .insert(chatReadReceipts)
      .values({ messageId, userId })
      .onConflictDoNothing();
  }

  static async markChannelAsRead(channelId: string, userId: string): Promise<void> {
    // Get all unread messages in channel
    const messages = await db
      .select({ id: chatMessages.id })
      .from(chatMessages)
      .leftJoin(chatReadReceipts, and(
        eq(chatReadReceipts.messageId, chatMessages.id),
        eq(chatReadReceipts.userId, userId)
      ))
      .where(and(
        eq(chatMessages.channelId, channelId),
        isNull(chatReadReceipts.id)
      ));
    
    if (messages.length > 0) {
      await db
        .insert(chatReadReceipts)
        .values(messages.map(m => ({ messageId: m.id, userId })))
        .onConflictDoNothing();
    }
    
    // Update lastReadAt in channel membership
    await db
      .update(chatChannelMembers)
      .set({ lastReadAt: new Date() })
      .where(and(
        eq(chatChannelMembers.channelId, channelId),
        eq(chatChannelMembers.userId, userId)
      ));
  }

  static async getMessageReadReceipts(messageId: string): Promise<ChatReadReceipt[]> {
    return await db
      .select()
      .from(chatReadReceipts)
      .where(eq(chatReadReceipts.messageId, messageId));
  }

  static async getMessageReadBy(messageId: string): Promise<{ userId: string; readAt: Date }[]> {
    const receipts = await db
      .select({
        userId: chatReadReceipts.userId,
        readAt: chatReadReceipts.readAt
      })
      .from(chatReadReceipts)
      .where(eq(chatReadReceipts.messageId, messageId));
    
    return receipts;
  }

  // ==================== PINNED MESSAGES ====================

  static async pinMessage(
    channelId: string,
    messageId: string,
    userId: string
  ): Promise<ChatPinnedMessage> {
    const [pinned] = await db
      .insert(chatPinnedMessages)
      .values({
        channelId,
        messageId,
        pinnedByUserId: userId
      })
      .onConflictDoNothing()
      .returning();
    
    logger.info('📌 Message pinned', { channelId, messageId, userId });
    return pinned;
  }

  static async unpinMessage(channelId: string, messageId: string): Promise<void> {
    await db
      .delete(chatPinnedMessages)
      .where(and(
        eq(chatPinnedMessages.channelId, channelId),
        eq(chatPinnedMessages.messageId, messageId)
      ));
    
    logger.info('📌 Message unpinned', { channelId, messageId });
  }

  static async getPinnedMessages(channelId: string): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          p.pinned_at,
          p.pinned_by,
          m.id as message_id,
          m.content as message_content,
          m.user_id as message_user_id,
          m.created_at as message_created_at
        FROM w3suite.chat_pinned_messages p
        INNER JOIN w3suite.chat_messages m ON p.message_id = m.id
        WHERE p.channel_id = ${channelId}::uuid
        ORDER BY p.pinned_at DESC
      `);
      
      return (result.rows || []).map((row: any) => ({
        pinnedAt: row.pinned_at,
        pinnedByUserId: row.pinned_by,
        message: {
          id: row.message_id,
          content: row.message_content,
          userId: row.message_user_id,
          createdAt: row.message_created_at
        }
      }));
    } catch (error) {
      logger.error('Failed to fetch pinned messages', { error, channelId });
      return [];
    }
  }

  // ==================== MESSAGE SEARCH ====================

  static async searchMessages(
    tenantId: string,
    userId: string,
    query: string,
    filters?: {
      channelId?: string;
      fromUserId?: string;
      fromDate?: Date;
      toDate?: Date;
      hasAttachments?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<ChatMessage[]> {
    // Get user's channels first
    const userChannels = await db
      .select({ channelId: chatChannelMembers.channelId })
      .from(chatChannelMembers)
      .where(eq(chatChannelMembers.userId, userId));
    
    const channelIds = userChannels.map(c => c.channelId);
    
    if (channelIds.length === 0) return [];
    
    let baseQuery = db
      .select()
      .from(chatMessages)
      .where(and(
        eq(chatMessages.tenantId, tenantId),
        inArray(chatMessages.channelId, filters?.channelId ? [filters.channelId] : channelIds),
        isNull(chatMessages.deletedAt),
        like(chatMessages.content, `%${query}%`),
        filters?.fromUserId ? eq(chatMessages.userId, filters.fromUserId) : undefined,
        filters?.fromDate ? gte(chatMessages.createdAt, filters.fromDate) : undefined,
        filters?.toDate ? lt(chatMessages.createdAt, filters.toDate) : undefined
      ))
      .orderBy(desc(chatMessages.createdAt))
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0);
    
    return await baseQuery;
  }

  // ==================== SAVED REPLIES ====================

  static async createSavedReply(
    tenantId: string,
    userId: string,
    data: { title: string; content: string; shortcut?: string; isPersonal?: boolean; teamId?: string }
  ): Promise<ChatSavedReply> {
    const [reply] = await db
      .insert(chatSavedReplies)
      .values({
        tenantId,
        userId,
        title: data.title,
        content: data.content,
        shortcut: data.shortcut,
        isPersonal: data.isPersonal ?? true,
        teamId: data.teamId
      })
      .returning();
    
    logger.info('💾 Saved reply created', { replyId: reply.id, userId });
    return reply;
  }

  static async getSavedReplies(
    tenantId: string,
    userId: string,
    teamIds?: string[]
  ): Promise<ChatSavedReply[]> {
    try {
      // Get personal replies + global replies using raw SQL
      const result = await db.execute(sql`
        SELECT id, tenant_id, user_id, title, content, category,
               is_global, usage_count, created_at, updated_at
        FROM w3suite.chat_saved_replies
        WHERE tenant_id = ${tenantId}::uuid
          AND (user_id = ${userId} OR is_global = true)
        ORDER BY usage_count DESC
      `);
      
      return (result.rows || []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        userId: row.user_id,
        title: row.title,
        content: row.content,
        category: row.category,
        isGlobal: row.is_global,
        usageCount: row.usage_count,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })) as ChatSavedReply[];
    } catch (error) {
      logger.error('Failed to fetch saved replies', { error, tenantId, userId });
      return [];
    }
  }

  static async updateSavedReply(
    replyId: string,
    userId: string,
    data: Partial<{ title: string; content: string; shortcut: string }>
  ): Promise<ChatSavedReply | null> {
    const [updated] = await db
      .update(chatSavedReplies)
      .set({ ...data, updatedAt: new Date() })
      .where(and(
        eq(chatSavedReplies.id, replyId),
        eq(chatSavedReplies.userId, userId)
      ))
      .returning();
    
    return updated || null;
  }

  static async deleteSavedReply(replyId: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(chatSavedReplies)
      .where(and(
        eq(chatSavedReplies.id, replyId),
        eq(chatSavedReplies.userId, userId)
      ));
    
    return true;
  }

  static async incrementSavedReplyUsage(replyId: string): Promise<void> {
    await db
      .update(chatSavedReplies)
      .set({ usageCount: sql`${chatSavedReplies.usageCount} + 1` })
      .where(eq(chatSavedReplies.id, replyId));
  }

  // ==================== MESSAGE EDIT/DELETE ====================

  static async editMessage(
    messageId: string,
    userId: string,
    newContent: string
  ): Promise<ChatMessage | null> {
    const [message] = await db
      .select()
      .from(chatMessages)
      .where(and(
        eq(chatMessages.id, messageId),
        eq(chatMessages.userId, userId),
        isNull(chatMessages.deletedAt)
      ))
      .limit(1);
    
    if (!message) return null;
    
    const [updated] = await db
      .update(chatMessages)
      .set({
        content: newContent,
        isEdited: true,
        updatedAt: new Date()
      })
      .where(eq(chatMessages.id, messageId))
      .returning();
    
    logger.info('✏️ Message edited', { messageId, userId });
    return updated;
  }

  static async softDeleteMessage(messageId: string, userId: string): Promise<boolean> {
    const [message] = await db
      .select()
      .from(chatMessages)
      .where(and(
        eq(chatMessages.id, messageId),
        eq(chatMessages.userId, userId)
      ))
      .limit(1);
    
    if (!message) return false;
    
    await db
      .update(chatMessages)
      .set({ deletedAt: new Date() })
      .where(eq(chatMessages.id, messageId));
    
    logger.info('🗑️ Message soft deleted', { messageId, userId });
    return true;
  }
}
