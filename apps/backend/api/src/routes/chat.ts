import express, { Request, Response } from 'express';
import { ChatService } from '../services/chat-service';
import { chatAttachmentService, chatFileUploadSchema } from '../services/chat-attachment-service';
import { tenantMiddleware, rbacMiddleware, requirePermission } from '../middleware/tenant';
import { handleApiError, parseUUIDParam } from '../core/error-utils';
import { webSocketService } from '../core/websocket-service';
import { z } from 'zod';
import {
  insertChatChannelSchema,
  insertChatMessageSchema,
  insertChatChannelMemberSchema,
  type InsertChatChannel,
  type InsertChatMessage,
  type InsertChatChannelMember
} from '../db/schema/w3suite';

const router = express.Router();

router.use(tenantMiddleware);
router.use(rbacMiddleware);

// ==================== VALIDATION SCHEMAS ====================

const createChannelBodySchema = insertChatChannelSchema
  .omit({ tenantId: true, createdBy: true })
  .extend({
    channelType: z.enum(['team', 'dm', 'task_thread', 'general']),
    visibility: z.enum(['public', 'private']).default('private'),
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    teamId: z.string().uuid().optional(),
    taskId: z.string().uuid().optional(),
    memberUserIds: z.array(z.string()).default([])
  });

const updateChannelBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  visibility: z.enum(['public', 'private']).optional(),
  metadata: z.object({
    headerColor: z.string().optional(),
    backgroundPattern: z.string().optional(),
    avatarUrl: z.string().optional()
  }).optional()
});

const createDMBodySchema = z.object({
  userId: z.string(),
  metadata: z.object({
    headerColor: z.string().optional(),
    backgroundPattern: z.string().optional()
  }).optional()
});

const createMessageBodySchema = z.object({
  content: z.string().min(1).max(10000),
  parentMessageId: z.string().uuid().optional(),
  mentionedUserIds: z.array(z.string()).default([]),
  attachments: z.array(z.any()).default([])
});

const updateMessageBodySchema = z.object({
  content: z.string().min(1).max(10000)
});

const addReactionBodySchema = z.object({
  emoji: z.string().min(1).max(10)
});

const addMemberBodySchema = z.object({
  userId: z.string(),
  role: z.enum(['owner', 'admin', 'member']).default('member')
});

const updateMemberBodySchema = z.object({
  role: z.enum(['owner', 'admin', 'member']).optional(),
  inviteStatus: z.enum(['pending', 'accepted', 'declined']).optional()
});

const updatePresenceBodySchema = z.object({
  status: z.enum(['online', 'away', 'busy', 'offline'])
});

const setCustomStatusBodySchema = z.object({
  customStatus: z.string().max(200),
  emoji: z.string().max(10).optional(),
  expiresAt: z.string().datetime().optional()
});

const searchMessagesQuerySchema = z.object({
  q: z.string().min(1),
  channelId: z.string().uuid().optional(),
  fromUserId: z.string().optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0)
});

const createSavedReplyBodySchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(1),
  shortcut: z.string().max(50).optional(),
  isPersonal: z.boolean().default(true),
  teamId: z.string().uuid().optional()
});

const updateSavedReplyBodySchema = z.object({
  title: z.string().min(1).max(100).optional(),
  content: z.string().min(1).optional(),
  shortcut: z.string().max(50).optional()
});

// ==================== CHANNEL ROUTES ====================

// GET /api/chat/channels - List user's channels
router.get('/channels', requirePermission('chat.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    
    const channels = await ChatService.getUserChannels(userId, tenantId);
    
    res.json(channels);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch chat channels');
  }
});

// POST /api/chat/channels - Create new channel
router.post('/channels', requirePermission('chat.create'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    
    const parsed = createChannelBodySchema.parse(req.body);
    const { memberUserIds, ...channelData } = parsed;
    
    const channel = await ChatService.createChannel({
      ...channelData,
      tenantId,
      createdBy: userId
    }, memberUserIds);
    
    res.status(201).json(channel);
  } catch (error) {
    handleApiError(error, res, 'Failed to create chat channel');
  }
});

// POST /api/chat/channels/dm - Create or get DM channel
router.post('/channels/dm', requirePermission('chat.create'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    
    const parsed = createDMBodySchema.parse(req.body);
    
    const channel = await ChatService.createDMChannel(userId, parsed.userId, tenantId, parsed.metadata);
    
    res.status(201).json(channel);
  } catch (error) {
    handleApiError(error, res, 'Failed to create DM channel');
  }
});

// GET /api/chat/channels/:id - Get channel by ID
router.get('/channels/:id', requirePermission('chat.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const channelId = parseUUIDParam(req.params.id, 'Channel ID');
    
    const channel = await ChatService.getChannelById(channelId, tenantId);
    
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    res.json(channel);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch channel');
  }
});

// PATCH /api/chat/channels/:id - Update channel
router.patch('/channels/:id', requirePermission('chat.update'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const channelId = parseUUIDParam(req.params.id, 'Channel ID');
    
    const parsed = updateChannelBodySchema.parse(req.body);
    
    const channel = await ChatService.updateChannel(channelId, tenantId, parsed);
    
    res.json(channel);
  } catch (error) {
    handleApiError(error, res, 'Failed to update channel');
  }
});

// POST /api/chat/channels/:id/archive - Archive channel
router.post('/channels/:id/archive', requirePermission('chat.delete'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const channelId = parseUUIDParam(req.params.id, 'Channel ID');
    
    await ChatService.archiveChannel(channelId, tenantId);
    
    res.status(204).send();
  } catch (error) {
    handleApiError(error, res, 'Failed to archive channel');
  }
});

// DELETE /api/chat/channels/:id - Permanently delete channel
router.delete('/channels/:id', requirePermission('chat.delete'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const channelId = parseUUIDParam(req.params.id, 'Channel ID');
    
    await ChatService.deleteChannel(channelId, tenantId);
    
    res.status(204).send();
  } catch (error) {
    handleApiError(error, res, 'Failed to delete channel');
  }
});

// POST /api/chat/channels/:id/read - Mark channel as read
router.post('/channels/:id/read', requirePermission('chat.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    const channelId = parseUUIDParam(req.params.id, 'Channel ID');
    
    await ChatService.markAsRead(channelId, tenantId, userId);
    
    res.status(204).send();
  } catch (error) {
    handleApiError(error, res, 'Failed to mark channel as read');
  }
});

// GET /api/chat/unread-count - Get total unread count across all channels
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    // Return 0 if not authenticated (graceful degradation)
    if (!req.tenant || !req.user) {
      return res.json({ unreadCount: 0 });
    }
    
    const tenantId = req.tenant.id;
    const userId = req.user.id;
    
    const channels = await ChatService.getUserChannels(userId, tenantId);
    
    let totalUnread = 0;
    for (const channel of channels) {
      const count = await ChatService.getUnreadCount(channel.id, tenantId, userId);
      totalUnread += Number(count) || 0;
    }
    
    res.json({ unreadCount: Number(totalUnread) });
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch unread count');
  }
});

// ==================== MESSAGE ROUTES ====================

// GET /api/chat/channels/:id/messages - Get messages for channel
router.get('/channels/:id/messages', requirePermission('chat.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const channelId = parseUUIDParam(req.params.id, 'Channel ID');
    
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    
    const messages = await ChatService.getMessages(channelId, tenantId, { limit });
    
    res.json(messages);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch messages');
  }
});

// POST /api/chat/channels/:id/messages - Send message
router.post('/channels/:id/messages', requirePermission('chat.create'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    const channelId = parseUUIDParam(req.params.id, 'Channel ID');
    
    const parsed = createMessageBodySchema.parse(req.body);
    
    const message = await ChatService.sendMessage({
      ...parsed,
      channelId,
      tenantId,
      userId
    });
    
    // Broadcast message to channel members via WebSocket
    await webSocketService.broadcastChatMessage(channelId, tenantId, {
      id: message.id,
      userId: message.userId,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
      attachments: Array.isArray(message.attachments) ? message.attachments : [],
      mentionedUserIds: Array.isArray(message.mentionedUserIds) ? message.mentionedUserIds : []
    });
    
    res.status(201).json(message);
  } catch (error) {
    handleApiError(error, res, 'Failed to send message');
  }
});

// PATCH /api/chat/messages/:id - Edit message
router.patch('/messages/:id', requirePermission('chat.update'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    const messageId = parseUUIDParam(req.params.id, 'Message ID');
    
    const parsed = updateMessageBodySchema.parse(req.body);
    
    const message = await ChatService.editMessage(messageId, tenantId, userId, parsed.content);
    
    // Broadcast message update via WebSocket
    await webSocketService.broadcastMessageUpdate(message.channelId, tenantId, messageId, parsed.content);
    
    res.json(message);
  } catch (error) {
    handleApiError(error, res, 'Failed to edit message');
  }
});

// DELETE /api/chat/messages/:id - Delete message
router.delete('/messages/:id', requirePermission('chat.delete'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    const messageId = parseUUIDParam(req.params.id, 'Message ID');
    
    // Get channel ID before deletion
    const channel = await ChatService.getChannelById(req.params.channelId || '', tenantId);
    
    await ChatService.deleteMessage(messageId, tenantId, userId);
    
    // Broadcast message deletion via WebSocket
    if (channel) {
      await webSocketService.broadcastMessageDelete(channel.id, tenantId, messageId);
    }
    
    res.status(204).send();
  } catch (error) {
    handleApiError(error, res, 'Failed to delete message');
  }
});

// POST /api/chat/messages/:id/reactions - Add reaction
router.post('/messages/:id/reactions', requirePermission('chat.create'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    const messageId = parseUUIDParam(req.params.id, 'Message ID');
    
    const parsed = addReactionBodySchema.parse(req.body);
    
    const message = await ChatService.addReaction(messageId, userId, parsed.emoji);
    
    // Broadcast reaction change via WebSocket
    await webSocketService.broadcastReactionChange(
      message.channelId,
      tenantId,
      messageId,
      message.reactions as Record<string, string[]>
    );
    
    res.json(message);
  } catch (error) {
    handleApiError(error, res, 'Failed to add reaction');
  }
});

// DELETE /api/chat/messages/:id/reactions/:emoji - Remove reaction
router.delete('/messages/:id/reactions/:emoji', requirePermission('chat.delete'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    const messageId = parseUUIDParam(req.params.id, 'Message ID');
    const emoji = req.params.emoji;
    
    const message = await ChatService.removeReaction(messageId, userId, emoji);
    
    // Broadcast reaction change via WebSocket
    await webSocketService.broadcastReactionChange(
      message.channelId,
      tenantId,
      messageId,
      message.reactions as Record<string, string[]>
    );
    
    res.json(message);
  } catch (error) {
    handleApiError(error, res, 'Failed to remove reaction');
  }
});

// ==================== MEMBER ROUTES ====================

// GET /api/chat/channels/:id/members - Get channel members
router.get('/channels/:id/members', requirePermission('chat.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const channelId = parseUUIDParam(req.params.id, 'Channel ID');
    
    const members = await ChatService.getChannelMembers(channelId, tenantId);
    
    res.json(members);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch channel members');
  }
});

// POST /api/chat/channels/:id/members - Add member (invite)
router.post('/channels/:id/members', requirePermission('chat.create'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const channelId = parseUUIDParam(req.params.id, 'Channel ID');
    
    const parsed = addMemberBodySchema.parse(req.body);
    
    const member = await ChatService.addMember(channelId, tenantId, {
      userId: parsed.userId,
      role: parsed.role,
      inviteStatus: 'accepted'
    });
    
    // Fetch complete member data with user info
    const members = await ChatService.getChannelMembers(channelId, tenantId);
    const memberWithUser = members.find(m => m.userId === member.userId);
    
    // Broadcast member joined via WebSocket
    await webSocketService.broadcastMemberJoined(channelId, tenantId, {
      userId: member.userId,
      role: member.role,
      joinedAt: member.joinedAt
    });
    
    res.status(201).json(memberWithUser || member);
  } catch (error) {
    handleApiError(error, res, 'Failed to add member');
  }
});

// PATCH /api/chat/channels/:id/members/:userId - Update member (accept/decline invite or change role)
router.patch('/channels/:id/members/:userId', requirePermission('chat.update'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const channelId = parseUUIDParam(req.params.id, 'Channel ID');
    const userId = req.params.userId;
    
    const parsed = updateMemberBodySchema.parse(req.body);
    
    if (parsed.role) {
      const member = await ChatService.updateMemberRole(channelId, tenantId, userId, parsed.role);
      return res.json(member);
    }
    
    res.status(400).json({ error: 'No valid update fields provided' });
  } catch (error) {
    handleApiError(error, res, 'Failed to update member');
  }
});

// DELETE /api/chat/channels/:id/members/:userId - Remove member or leave channel
router.delete('/channels/:id/members/:userId', requirePermission('chat.delete'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const channelId = parseUUIDParam(req.params.id, 'Channel ID');
    const userId = req.params.userId;
    
    await ChatService.removeMember(channelId, tenantId, userId);
    
    // Broadcast member left via WebSocket
    await webSocketService.broadcastMemberLeft(channelId, tenantId, userId);
    
    res.status(204).send();
  } catch (error) {
    handleApiError(error, res, 'Failed to remove member');
  }
});

// ==================== TYPING INDICATOR ROUTES ====================

// POST /api/chat/channels/:id/typing - Set typing indicator
router.post('/channels/:id/typing', requirePermission('chat.create'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const channelId = parseUUIDParam(req.params.id, 'Channel ID');
    
    await ChatService.setTypingIndicator(channelId, userId);
    
    res.status(204).send();
  } catch (error) {
    handleApiError(error, res, 'Failed to set typing indicator');
  }
});

// GET /api/chat/channels/:id/typing - Get typing users
router.get('/channels/:id/typing', requirePermission('chat.read'), async (req: Request, res: Response) => {
  try {
    const channelId = parseUUIDParam(req.params.id, 'Channel ID');
    
    const typingUsers = await ChatService.getTypingUsers(channelId);
    
    res.json({ typingUsers });
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch typing users');
  }
});

// ==================== FILE ATTACHMENT ROUTES ====================

// POST /api/chat/attachments/prepare - Prepare file upload
router.post('/attachments/prepare', requirePermission('chat.create'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    
    const parsed = chatFileUploadSchema.parse(req.body);
    
    // Require channelId to prepare upload
    const { channelId, messageId } = req.body;
    if (!channelId) {
      return res.status(400).json({ error: 'channelId è richiesto' });
    }
    
    const uploadData = await chatAttachmentService.generateUploadUrl(
      parsed,
      userId,
      tenantId,
      channelId,
      messageId
    );
    
    res.json(uploadData);
  } catch (error) {
    handleApiError(error, res, 'Failed to prepare file upload');
  }
});

// GET /api/chat/attachments/:objectPath - Get attachment metadata
router.get('/attachments/*', requirePermission('chat.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const objectPath = req.params[0]; // Capture full path after /attachments/
    
    const metadata = await chatAttachmentService.getAttachmentMetadata(objectPath, tenantId);
    
    if (!metadata) {
      return res.status(404).json({ error: 'Attachment non trovato' });
    }
    
    res.json(metadata);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch attachment metadata');
  }
});

// DELETE /api/chat/attachments/:objectPath - Delete attachment
router.delete('/attachments/*', requirePermission('chat.delete'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    const objectPath = req.params[0]; // Capture full path after /attachments/
    
    const success = await chatAttachmentService.deleteAttachment(objectPath, userId, tenantId);
    
    if (!success) {
      return res.status(403).json({ error: 'Non autorizzato a eliminare questo allegato' });
    }
    
    res.status(204).send();
  } catch (error) {
    handleApiError(error, res, 'Failed to delete attachment');
  }
});

// ==================== PRESENCE ROUTES ====================

// POST /api/chat/presence/heartbeat - Send heartbeat to maintain online status
router.post('/presence/heartbeat', requirePermission('chat.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    
    await ChatService.heartbeat(userId, tenantId);
    
    res.json({ success: true });
  } catch (error) {
    handleApiError(error, res, 'Failed to update heartbeat');
  }
});

// PUT /api/chat/presence/status - Update user presence status
router.put('/presence/status', requirePermission('chat.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    
    const parsed = updatePresenceBodySchema.parse(req.body);
    const presence = await ChatService.updatePresence(userId, tenantId, parsed.status);
    
    res.json(presence);
  } catch (error) {
    handleApiError(error, res, 'Failed to update presence status');
  }
});

// PUT /api/chat/presence/custom-status - Set custom status
router.put('/presence/custom-status', requirePermission('chat.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    
    const parsed = setCustomStatusBodySchema.parse(req.body);
    const presence = await ChatService.setCustomStatus(
      userId,
      tenantId,
      parsed.customStatus,
      parsed.emoji,
      parsed.expiresAt ? new Date(parsed.expiresAt) : undefined
    );
    
    res.json(presence);
  } catch (error) {
    handleApiError(error, res, 'Failed to set custom status');
  }
});

// GET /api/chat/presence/:userId - Get user presence
router.get('/presence/:userId', requirePermission('chat.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.params.userId;
    
    const presence = await ChatService.getUserPresence(userId, tenantId);
    
    res.json(presence || { status: 'offline' });
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch user presence');
  }
});

// POST /api/chat/presence/bulk - Get multiple users presence
router.post('/presence/bulk', requirePermission('chat.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const { userIds } = req.body;
    
    if (!Array.isArray(userIds)) {
      return res.status(400).json({ error: 'userIds deve essere un array' });
    }
    
    const presences = await ChatService.getMultipleUserPresence(userIds, tenantId);
    
    res.json(presences);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch users presence');
  }
});

// ==================== READ RECEIPTS ROUTES ====================

// POST /api/chat/messages/:id/read - Mark message as read
router.post('/messages/:id/read', requirePermission('chat.read'), async (req: Request, res: Response) => {
  try {
    const messageId = parseUUIDParam(req.params.id, 'Message ID');
    const userId = req.user!.id;
    
    await ChatService.markMessageAsRead(messageId, userId);
    
    res.json({ success: true });
  } catch (error) {
    handleApiError(error, res, 'Failed to mark message as read');
  }
});

// POST /api/chat/channels/:id/read-all - Mark all channel messages as read
router.post('/channels/:id/read-all', requirePermission('chat.read'), async (req: Request, res: Response) => {
  try {
    const channelId = parseUUIDParam(req.params.id, 'Channel ID');
    const userId = req.user!.id;
    
    await ChatService.markChannelAsRead(channelId, userId);
    
    res.json({ success: true });
  } catch (error) {
    handleApiError(error, res, 'Failed to mark channel as read');
  }
});

// GET /api/chat/messages/:id/read-receipts - Get read receipts for message
router.get('/messages/:id/read-receipts', requirePermission('chat.read'), async (req: Request, res: Response) => {
  try {
    const messageId = parseUUIDParam(req.params.id, 'Message ID');
    
    const readBy = await ChatService.getMessageReadBy(messageId);
    
    res.json(readBy);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch read receipts');
  }
});

// ==================== PINNED MESSAGES ROUTES ====================

// POST /api/chat/channels/:id/pin/:messageId - Pin a message
router.post('/channels/:id/pin/:messageId', requirePermission('chat.create'), async (req: Request, res: Response) => {
  try {
    const channelId = parseUUIDParam(req.params.id, 'Channel ID');
    const messageId = parseUUIDParam(req.params.messageId, 'Message ID');
    const userId = req.user!.id;
    
    const pinned = await ChatService.pinMessage(channelId, messageId, userId);
    
    res.status(201).json(pinned);
  } catch (error) {
    handleApiError(error, res, 'Failed to pin message');
  }
});

// DELETE /api/chat/channels/:id/pin/:messageId - Unpin a message
router.delete('/channels/:id/pin/:messageId', requirePermission('chat.delete'), async (req: Request, res: Response) => {
  try {
    const channelId = parseUUIDParam(req.params.id, 'Channel ID');
    const messageId = parseUUIDParam(req.params.messageId, 'Message ID');
    
    await ChatService.unpinMessage(channelId, messageId);
    
    res.status(204).send();
  } catch (error) {
    handleApiError(error, res, 'Failed to unpin message');
  }
});

// GET /api/chat/channels/:id/pinned - Get pinned messages
router.get('/channels/:id/pinned', requirePermission('chat.read'), async (req: Request, res: Response) => {
  try {
    const channelId = parseUUIDParam(req.params.id, 'Channel ID');
    
    const pinnedMessages = await ChatService.getPinnedMessages(channelId);
    
    res.json(pinnedMessages);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch pinned messages');
  }
});

// ==================== SEARCH ROUTES ====================

// GET /api/chat/search - Search messages
router.get('/search', requirePermission('chat.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    
    const parsed = searchMessagesQuerySchema.parse(req.query);
    
    const messages = await ChatService.searchMessages(tenantId, userId, parsed.q, {
      channelId: parsed.channelId,
      fromUserId: parsed.fromUserId,
      fromDate: parsed.fromDate ? new Date(parsed.fromDate) : undefined,
      toDate: parsed.toDate ? new Date(parsed.toDate) : undefined,
      limit: parsed.limit,
      offset: parsed.offset
    });
    
    res.json(messages);
  } catch (error) {
    handleApiError(error, res, 'Failed to search messages');
  }
});

// ==================== SAVED REPLIES ROUTES ====================

// GET /api/chat/saved-replies - Get user's saved replies
router.get('/saved-replies', requirePermission('chat.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    
    const replies = await ChatService.getSavedReplies(tenantId, userId);
    
    res.json(replies);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch saved replies');
  }
});

// POST /api/chat/saved-replies - Create saved reply
router.post('/saved-replies', requirePermission('chat.create'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    
    const parsed = createSavedReplyBodySchema.parse(req.body);
    const reply = await ChatService.createSavedReply(tenantId, userId, parsed);
    
    res.status(201).json(reply);
  } catch (error) {
    handleApiError(error, res, 'Failed to create saved reply');
  }
});

// PUT /api/chat/saved-replies/:id - Update saved reply
router.put('/saved-replies/:id', requirePermission('chat.update'), async (req: Request, res: Response) => {
  try {
    const replyId = parseUUIDParam(req.params.id, 'Reply ID');
    const userId = req.user!.id;
    
    const parsed = updateSavedReplyBodySchema.parse(req.body);
    const reply = await ChatService.updateSavedReply(replyId, userId, parsed);
    
    if (!reply) {
      return res.status(404).json({ error: 'Risposta salvata non trovata' });
    }
    
    res.json(reply);
  } catch (error) {
    handleApiError(error, res, 'Failed to update saved reply');
  }
});

// DELETE /api/chat/saved-replies/:id - Delete saved reply
router.delete('/saved-replies/:id', requirePermission('chat.delete'), async (req: Request, res: Response) => {
  try {
    const replyId = parseUUIDParam(req.params.id, 'Reply ID');
    const userId = req.user!.id;
    
    await ChatService.deleteSavedReply(replyId, userId);
    
    res.status(204).send();
  } catch (error) {
    handleApiError(error, res, 'Failed to delete saved reply');
  }
});

// POST /api/chat/saved-replies/:id/use - Increment usage count
router.post('/saved-replies/:id/use', requirePermission('chat.read'), async (req: Request, res: Response) => {
  try {
    const replyId = parseUUIDParam(req.params.id, 'Reply ID');
    
    await ChatService.incrementSavedReplyUsage(replyId);
    
    res.json({ success: true });
  } catch (error) {
    handleApiError(error, res, 'Failed to increment usage count');
  }
});

// ==================== MESSAGE EDIT/DELETE ROUTES ====================

// PUT /api/chat/messages/:id - Edit message
router.put('/messages/:id', requirePermission('chat.update'), async (req: Request, res: Response) => {
  try {
    const messageId = parseUUIDParam(req.params.id, 'Message ID');
    const userId = req.user!.id;
    
    const parsed = updateMessageBodySchema.parse(req.body);
    const message = await ChatService.editMessage(messageId, userId, parsed.content);
    
    if (!message) {
      return res.status(404).json({ error: 'Messaggio non trovato o non autorizzato' });
    }
    
    // Notify via WebSocket
    webSocketService.broadcastToChannel(message.channelId, {
      type: 'message_edited',
      messageId: message.id,
      content: message.content,
      isEdited: true,
      updatedAt: message.updatedAt
    });
    
    res.json(message);
  } catch (error) {
    handleApiError(error, res, 'Failed to edit message');
  }
});

// DELETE /api/chat/messages/:id - Soft delete message
router.delete('/messages/:id', requirePermission('chat.delete'), async (req: Request, res: Response) => {
  try {
    const messageId = parseUUIDParam(req.params.id, 'Message ID');
    const userId = req.user!.id;
    
    // Get message first to get channelId for broadcast
    const success = await ChatService.softDeleteMessage(messageId, userId);
    
    if (!success) {
      return res.status(404).json({ error: 'Messaggio non trovato o non autorizzato' });
    }
    
    res.status(204).send();
  } catch (error) {
    handleApiError(error, res, 'Failed to delete message');
  }
});

export default router;
