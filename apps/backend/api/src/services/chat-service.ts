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
                lastName: users.lastName
              })
              .from(users)
              .where(eq(users.id, otherUserId))
              .limit(1);
            
            if (otherUser) {
              dmUserInfo = {
                id: otherUser.id,
                email: otherUser.email,
                name: otherUser.firstName && otherUser.lastName 
                  ? `${otherUser.firstName} ${otherUser.lastName}`
                  : otherUser.firstName || otherUser.lastName || otherUser.email
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
    const [message] = await db
      .insert(chatMessages)
      .values(messageData)
      .returning();

    await this.clearTypingIndicator(messageData.channelId, messageData.userId);

    logger.info('💬 Message sent', { 
      channelId: messageData.channelId, 
      messageId: message.id,
      userId: messageData.userId 
    });

    return message;
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
    let query = db
      .select()
      .from(chatMessages)
      .where(and(
        eq(chatMessages.channelId, channelId),
        eq(chatMessages.tenantId, tenantId),
        isNull(chatMessages.deletedAt)
      ))
      .orderBy(desc(chatMessages.createdAt));

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    return query;
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
    const now = new Date();
    
    const [presence] = await db
      .insert(userPresence)
      .values({
        userId,
        tenantId,
        status,
        lastSeenAt: now,
        lastHeartbeatAt: now
      })
      .onConflictDoUpdate({
        target: userPresence.userId,
        set: {
          status,
          lastSeenAt: now,
          lastHeartbeatAt: now
        }
      })
      .returning();
    
    logger.debug('🟢 Presence updated', { userId, status });
    return presence;
  }

  static async heartbeat(userId: string, tenantId: string): Promise<void> {
    await db
      .insert(userPresence)
      .values({
        userId,
        tenantId,
        status: 'online',
        lastHeartbeatAt: new Date()
      })
      .onConflictDoUpdate({
        target: userPresence.userId,
        set: {
          status: 'online',
          lastHeartbeatAt: new Date()
        }
      });
  }

  static async getUserPresence(userId: string, tenantId: string): Promise<UserPresence | null> {
    const [presence] = await db
      .select()
      .from(userPresence)
      .where(and(
        eq(userPresence.userId, userId),
        eq(userPresence.tenantId, tenantId)
      ))
      .limit(1);
    
    return presence || null;
  }

  static async getMultipleUserPresence(userIds: string[], tenantId: string): Promise<UserPresence[]> {
    if (userIds.length === 0) return [];
    
    return await db
      .select()
      .from(userPresence)
      .where(and(
        inArray(userPresence.userId, userIds),
        eq(userPresence.tenantId, tenantId)
      ));
  }

  static async setCustomStatus(
    userId: string,
    tenantId: string,
    customStatus: string,
    emoji?: string,
    expiresAt?: Date
  ): Promise<UserPresence> {
    const [presence] = await db
      .insert(userPresence)
      .values({
        userId,
        tenantId,
        customStatus,
        customStatusEmoji: emoji,
        customStatusExpiresAt: expiresAt
      })
      .onConflictDoUpdate({
        target: userPresence.userId,
        set: {
          customStatus,
          customStatusEmoji: emoji,
          customStatusExpiresAt: expiresAt
        }
      })
      .returning();
    
    return presence;
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
    const pinned = await db
      .select({
        pinnedAt: chatPinnedMessages.pinnedAt,
        pinnedByUserId: chatPinnedMessages.pinnedByUserId,
        message: chatMessages
      })
      .from(chatPinnedMessages)
      .innerJoin(chatMessages, eq(chatPinnedMessages.messageId, chatMessages.id))
      .where(eq(chatPinnedMessages.channelId, channelId))
      .orderBy(desc(chatPinnedMessages.pinnedAt));
    
    return pinned;
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
    // Get personal replies + team replies
    return await db
      .select()
      .from(chatSavedReplies)
      .where(and(
        eq(chatSavedReplies.tenantId, tenantId),
        or(
          eq(chatSavedReplies.userId, userId),
          teamIds && teamIds.length > 0 
            ? and(eq(chatSavedReplies.isPersonal, false), inArray(chatSavedReplies.teamId, teamIds))
            : undefined
        )
      ))
      .orderBy(desc(chatSavedReplies.usageCount));
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
