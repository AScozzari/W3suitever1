import { db } from '../core/db.js';
import { 
  chatChannels,
  chatChannelMembers,
  chatMessages,
  chatTypingIndicators,
  type InsertChatChannel,
  type ChatChannel,
  type InsertChatChannelMember,
  type ChatChannelMember,
  type InsertChatMessage,
  type ChatMessage,
  type InsertChatTypingIndicator,
  type ChatTypingIndicator
} from '../db/schema/w3suite.js';
import { eq, and, desc, isNull, lt, inArray, sql } from 'drizzle-orm';
import { logger } from '../core/logger';

export class ChatService {
  
  static async createChannel(channelData: InsertChatChannel): Promise<ChatChannel> {
    try {
      const [channel] = await db
        .insert(chatChannels)
        .values(channelData)
        .returning();
      
      await this.addMember(channel.id, channel.tenantId, {
        userId: channelData.createdBy,
        role: 'owner'
      });
      
      logger.info('💬 Chat channel created', { 
        channelId: channel.id, 
        type: channel.channelType,
        tenantId: channel.tenantId 
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
  ): Promise<ChatChannel[]> {
    const memberChannels = await db
      .select({ channelId: chatChannelMembers.channelId })
      .from(chatChannelMembers)
      .where(eq(chatChannelMembers.userId, userId));

    const channelIds = memberChannels.map(m => m.channelId);

    if (channelIds.length === 0) {
      return [];
    }

    return db
      .select()
      .from(chatChannels)
      .where(and(
        eq(chatChannels.tenantId, tenantId),
        inArray(chatChannels.id, channelIds),
        filters?.type ? eq(chatChannels.channelType, filters.type) : undefined,
        eq(chatChannels.isArchived, filters?.archived ?? false)
      ))
      .orderBy(desc(chatChannels.createdAt));
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

  static async getChannelMembers(channelId: string, tenantId: string): Promise<ChatChannelMember[]> {
    return db
      .select({
        id: chatChannelMembers.id,
        channelId: chatChannelMembers.channelId,
        userId: chatChannelMembers.userId,
        role: chatChannelMembers.role,
        joinedAt: chatChannelMembers.joinedAt,
        lastReadAt: chatChannelMembers.lastReadAt,
        notificationPreference: chatChannelMembers.notificationPreference
      })
      .from(chatChannelMembers)
      .innerJoin(chatChannels, eq(chatChannelMembers.channelId, chatChannels.id))
      .where(and(
        eq(chatChannelMembers.channelId, channelId),
        eq(chatChannels.tenantId, tenantId)
      ))
      .orderBy(desc(chatChannelMembers.joinedAt));
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
        .select({ count: sql<number>`count(*)` })
        .from(chatMessages)
        .where(and(
          eq(chatMessages.channelId, channelId),
          eq(chatMessages.tenantId, tenantId)
        ));
      
      return messages[0]?.count || 0;
    }

    const unread = await db
      .select({ count: sql<number>`count(*)` })
      .from(chatMessages)
      .where(and(
        eq(chatMessages.channelId, channelId),
        eq(chatMessages.tenantId, tenantId),
        sql`${chatMessages.createdAt} > ${member.lastReadAt}`
      ));

    return unread[0]?.count || 0;
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
    tenantId: string
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
      createdBy: userId1
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
}
