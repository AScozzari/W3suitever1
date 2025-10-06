// WebSocket Service for Real-time Notifications
import WebSocket, { WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { redisService } from './redis-service';
import { logger } from './logger';
import { config } from './config';

interface WebSocketClient {
  ws: WebSocket;
  userId: string;
  tenantId: string;
  sessionId: string;
  lastPing: number;
}

export class WebSocketService {
  private static instance: WebSocketService;
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocketClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  /**
   * Initialize WebSocket server
   */
  async initialize(server: any): Promise<void> {
    this.wss = new WebSocketServer({
      server,
      path: '/ws/notifications',
      verifyClient: this.verifyClient.bind(this)
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    this.startHeartbeat();

    // Subscribe to Redis notification events (graceful fallback if Redis not available)
    try {
      await this.subscribeToNotificationEvents();
      logger.info('🌐 WebSocket Service initialized with Redis subscription', {
        path: '/ws/notifications',
        environment: config.NODE_ENV
      });
    } catch (error) {
      logger.warn('🌐 WebSocket Service initialized without Redis (fallback mode)', {
        path: '/ws/notifications',
        environment: config.NODE_ENV,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Verify client authentication
   */
  private verifyClient(info: { req: IncomingMessage; origin: string }): boolean {
    try {
      const url = new URL(info.req.url!, `http://${info.req.headers.host}`);
      const userId = url.searchParams.get('userId');
      const tenantId = url.searchParams.get('tenantId');
      const token = url.searchParams.get('token');

      // In development mode, allow connection
      if (config.NODE_ENV === 'development') {
        return true;
      }

      // TODO: Add proper JWT token verification in production
      return !!(userId && tenantId && token);
    } catch (error) {
      logger.error('🌐 WebSocket verification failed', { error });
      return false;
    }
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
    try {
      const url = new URL(req.url!, `http://${req.headers.host}`);
      const userId = url.searchParams.get('userId') || 'demo-user';
      const tenantId = url.searchParams.get('tenantId') || '00000000-0000-0000-0000-000000000001';
      const sessionId = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const client: WebSocketClient = {
        ws,
        userId,
        tenantId,
        sessionId,
        lastPing: Date.now()
      };

      this.clients.set(sessionId, client);

      // Register session in Redis (graceful fallback if Redis not available)
      try {
        await redisService.registerWebSocketSession(userId, tenantId, sessionId);
      } catch (redisError) {
        logger.debug('🌐 Redis session registration failed (fallback mode)', { sessionId });
      }

      // Setup client event handlers
      ws.on('message', (data) => this.handleMessage(sessionId, data));
      ws.on('close', () => this.handleDisconnection(sessionId));
      ws.on('error', (error) => this.handleError(sessionId, error));

      // Send connection confirmation
      this.sendToClient(sessionId, {
        type: 'connection_established',
        sessionId,
        timestamp: new Date().toISOString()
      });

      logger.info('🌐 WebSocket client connected', {
        sessionId,
        userId,
        tenantId,
        totalClients: this.clients.size
      });

    } catch (error) {
      logger.error('🌐 WebSocket connection error', { error });
      ws.close(1011, 'Connection setup failed');
    }
  }

  /**
   * Handle incoming messages from clients
   */
  private handleMessage(sessionId: string, data: WebSocket.Data): void {
    try {
      const client = this.clients.get(sessionId);
      if (!client) return;

      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'ping':
          client.lastPing = Date.now();
          this.sendToClient(sessionId, { type: 'pong', timestamp: new Date().toISOString() });
          break;

        case 'subscribe_notifications':
          // Client wants to receive notifications for specific categories
          this.handleSubscriptionRequest(sessionId, message.categories);
          break;

        case 'mark_notification_read':
          // Handle notification read acknowledgment
          this.handleNotificationRead(sessionId, message.notificationId);
          break;

        case 'subscribe_hr_shifts':
          // Client wants to receive shift assignment updates
          this.handleHRShiftSubscription(sessionId, message.storeIds);
          break;

        case 'unsubscribe_hr_shifts':
          // Client wants to stop receiving shift assignment updates
          this.handleHRShiftUnsubscription(sessionId);
          break;

        case 'join_chat_channel':
          // Client wants to receive chat messages for specific channel
          this.handleChatChannelJoin(sessionId, message.channelId);
          break;

        case 'leave_chat_channel':
          // Client wants to stop receiving chat messages for specific channel
          this.handleChatChannelLeave(sessionId, message.channelId);
          break;

        case 'chat_typing_start':
          // Broadcast typing indicator to channel members
          this.handleChatTypingStart(sessionId, message.channelId);
          break;

        case 'chat_typing_stop':
          // Stop broadcasting typing indicator
          this.handleChatTypingStop(sessionId, message.channelId);
          break;

        default:
          logger.warn('🌐 Unknown WebSocket message type', { type: message.type, sessionId });
      }
    } catch (error) {
      logger.error('🌐 WebSocket message handling error', { error, sessionId });
    }
  }

  /**
   * Handle client disconnection
   */
  private async handleDisconnection(sessionId: string): Promise<void> {
    const client = this.clients.get(sessionId);
    if (!client) return;

    try {
      // Unregister session from Redis (graceful fallback if Redis not available)
      try {
        await redisService.removeWebSocketSession(client.userId, client.tenantId, sessionId);
      } catch (redisError) {
        logger.debug('🌐 Redis session removal failed (fallback mode)', { sessionId });
      }

      this.clients.delete(sessionId);

      logger.info('🌐 WebSocket client disconnected', {
        sessionId,
        userId: client.userId,
        tenantId: client.tenantId,
        totalClients: this.clients.size
      });
    } catch (error) {
      logger.error('🌐 WebSocket disconnection error', { error, sessionId });
    }
  }

  /**
   * Handle WebSocket errors
   */
  private handleError(sessionId: string, error: Error): void {
    logger.error('🌐 WebSocket client error', { error: error.message, sessionId });
  }

  /**
   * Send message to specific client
   */
  private sendToClient(sessionId: string, message: any): void {
    const client = this.clients.get(sessionId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      logger.error('🌐 Failed to send message to client', { error, sessionId });
    }
  }

  /**
   * Broadcast notification to user's active sessions
   */
  async broadcastNotificationToUser(
    userId: string,
    tenantId: string,
    notification: {
      id: string;
      title: string;
      message: string;
      category: string;
      priority: string;
      url?: string;
      data?: any;
    }
  ): Promise<void> {
    try {
      // Get user's active sessions (with Redis fallback)
      let activeSessions: string[] = [];
      try {
        activeSessions = await redisService.getWebSocketSessions(userId, tenantId);
      } catch (redisError) {
        // Fallback: use all connected client session IDs
        activeSessions = Array.from(this.clients.values())
          .filter(c => c.userId === userId && c.tenantId === tenantId)
          .map(c => c.sessionId);
      }

      // Find connected clients
      const userClients = Array.from(this.clients.values()).filter(
        client => 
          client.userId === userId && 
          client.tenantId === tenantId &&
          activeSessions.includes(client.sessionId)
      );

      if (userClients.length === 0) {
        logger.debug('🌐 No active WebSocket sessions for user', { userId, tenantId });
        return;
      }

      const message = {
        type: 'new_notification',
        notification: {
          ...notification,
          timestamp: new Date().toISOString()
        }
      };

      // Send to all user's sessions
      for (const client of userClients) {
        this.sendToClient(client.sessionId, message);
      }

      logger.debug('🌐 Notification broadcasted via WebSocket', {
        userId,
        tenantId,
        notificationId: notification.id,
        sessionsCount: userClients.length
      });

    } catch (error) {
      logger.error('🌐 Failed to broadcast notification', { error, userId, tenantId });
    }
  }

  /**
   * Subscribe to Redis notification events
   */
  private async subscribeToNotificationEvents(): Promise<void> {
    try {
      // Subscribe to all tenant channels (pattern matching)
      const tenants = ['00000000-0000-0000-0000-000000000001']; // TODO: Get from database

      for (const tenantId of tenants) {
        await redisService.subscribeToNotifications(tenantId, (event) => {
          this.handleRedisNotificationEvent(event);
        });
      }

      logger.info('🌐 Successfully subscribed to Redis notification events', { 
        tenantsCount: tenants.length 
      });
    } catch (error) {
      logger.error('🌐 Failed to subscribe to Redis notification events', { error });
      throw error; // Re-throw to be caught by the caller
    }
  }

  /**
   * Handle notification events from Redis
   */
  private async handleRedisNotificationEvent(event: any): Promise<void> {
    try {
      switch (event.type) {
        case 'new_notification':
          if (event.userId) {
            await this.broadcastNotificationToUser(event.userId, event.tenantId, event.data);
          } else {
            // Broadcast to all users in tenant
            await this.broadcastToTenant(event.tenantId, event.data);
          }
          break;

        case 'notification_read':
          await this.broadcastNotificationUpdate(event.tenantId, event.userId, {
            type: 'notification_read',
            notificationId: event.notificationId
          });
          break;

        default:
          logger.warn('🌐 Unknown Redis notification event', { type: event.type });
      }
    } catch (error) {
      logger.error('🌐 Redis notification event handling error', { error, event });
    }
  }

  /**
   * Broadcast to all users in tenant
   */
  private async broadcastToTenant(tenantId: string, notification: any): Promise<void> {
    const tenantClients = Array.from(this.clients.values()).filter(
      client => client.tenantId === tenantId
    );

    const message = {
      type: 'tenant_notification',
      notification: {
        ...notification,
        timestamp: new Date().toISOString()
      }
    };

    for (const client of tenantClients) {
      this.sendToClient(client.sessionId, message);
    }

    logger.debug('🌐 Tenant-wide notification broadcasted', {
      tenantId,
      clientsCount: tenantClients.length
    });
  }

  /**
   * Handle subscription requests
   */
  private handleSubscriptionRequest(sessionId: string, categories: string[]): void {
    // TODO: Store user's category preferences
    this.sendToClient(sessionId, {
      type: 'subscription_confirmed',
      categories,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle notification read acknowledgment
   */
  private async handleNotificationRead(sessionId: string, notificationId: string): Promise<void> {
    const client = this.clients.get(sessionId);
    if (!client) return;

    // Publish read event to Redis (graceful fallback if not available)
    try {
      await redisService.publishNotification({
        type: 'notification_read',
        tenantId: client.tenantId,
        userId: client.userId,
        notificationId,
        data: { readAt: new Date().toISOString() }
      });
    } catch (redisError) {
      logger.debug('🌐 Redis notification publish failed (fallback mode)', { sessionId });
    }
  }

  /**
   * Broadcast notification update
   */
  private async broadcastNotificationUpdate(tenantId: string, userId: string, update: any): Promise<void> {
    const userClients = Array.from(this.clients.values()).filter(
      client => client.userId === userId && client.tenantId === tenantId
    );

    for (const client of userClients) {
      this.sendToClient(client.sessionId, {
        type: 'notification_update',
        ...update,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Start heartbeat to keep connections alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const staleClients: string[] = [];

      for (const [sessionId, client] of this.clients.entries()) {
        // Check if client is stale (no ping for 30 seconds)
        if (now - client.lastPing > 30000) {
          staleClients.push(sessionId);
        }
      }

      // Remove stale clients
      for (const sessionId of staleClients) {
        this.handleDisconnection(sessionId);
      }

      logger.debug('🌐 WebSocket heartbeat', {
        activeClients: this.clients.size,
        removedStale: staleClients.length
      });

    }, 15000); // Every 15 seconds
  }

  /**
   * Handle HR shift subscription requests
   */
  private async handleHRShiftSubscription(sessionId: string, storeIds: string[]): Promise<void> {
    const client = this.clients.get(sessionId);
    if (!client) return;

    // Store subscription preferences in Redis (graceful fallback if not available)
    try {
      await redisService.setWebSocketSubscription(
        client.userId, 
        client.tenantId, 
        sessionId, 
        'hr_shifts', 
        { storeIds }
      );
    } catch (redisError) {
      logger.debug('🌐 Redis subscription storage failed (fallback mode)', { sessionId });
    }

    this.sendToClient(sessionId, {
      type: 'hr_shifts_subscription_confirmed',
      storeIds,
      timestamp: new Date().toISOString()
    });

    logger.debug('🌐 HR shifts subscription registered', { sessionId, storeIds });
  }

  /**
   * Handle HR shift unsubscription requests
   */
  private async handleHRShiftUnsubscription(sessionId: string): Promise<void> {
    const client = this.clients.get(sessionId);
    if (!client) return;

    try {
      await redisService.removeWebSocketSubscription(
        client.userId, 
        client.tenantId, 
        sessionId, 
        'hr_shifts'
      );
    } catch (redisError) {
      logger.debug('🌐 Redis unsubscription failed (fallback mode)', { sessionId });
    }

    this.sendToClient(sessionId, {
      type: 'hr_shifts_unsubscribed',
      timestamp: new Date().toISOString()
    });

    logger.debug('🌐 HR shifts unsubscription processed', { sessionId });
  }

  /**
   * Broadcast shift assignment changes to subscribed clients
   */
  async broadcastShiftUpdate(
    tenantId: string,
    updateType: 'assignment_created' | 'assignment_updated' | 'assignment_deleted' | 'shift_created' | 'shift_updated' | 'shift_deleted',
    data: {
      shiftId?: string;
      assignmentId?: string;
      employeeId?: string;
      storeId?: string;
      date?: string;
      assignment?: any;
      shift?: any;
      conflicts?: any[];
    }
  ): Promise<void> {
    try {
      // Get all clients subscribed to HR shifts for this tenant
      const tenantClients = Array.from(this.clients.values()).filter(
        client => client.tenantId === tenantId
      );

      if (tenantClients.length === 0) {
        logger.debug('🌐 No WebSocket clients for shift update broadcast', { tenantId });
        return;
      }

      // Filter clients based on store subscription (with Redis fallback)
      const subscribedClients = [];
      for (const client of tenantClients) {
        let subscription = null;
        try {
          subscription = await redisService.getWebSocketSubscription(
            client.userId, 
            client.tenantId, 
            client.sessionId, 
            'hr_shifts'
          );
        } catch (redisError) {
          // Fallback: assume all clients are subscribed when Redis is unavailable
          subscription = { storeIds: [] };
        }

        // If client is subscribed to HR shifts and has access to the store
        if (subscription && (!data.storeId || !subscription.storeIds || subscription.storeIds.includes(data.storeId))) {
          subscribedClients.push(client);
        }
      }

      if (subscribedClients.length === 0) {
        logger.debug('🌐 No subscribed clients for shift update', { tenantId, updateType, storeId: data.storeId });
        return;
      }

      const message = {
        type: 'hr_shift_update',
        updateType,
        data: {
          ...data,
          timestamp: new Date().toISOString()
        }
      };

      // Send to all subscribed clients
      for (const client of subscribedClients) {
        this.sendToClient(client.sessionId, message);
      }

      logger.debug('🌐 Shift update broadcasted via WebSocket', {
        tenantId,
        updateType,
        clientsCount: subscribedClients.length,
        storeId: data.storeId
      });

    } catch (error) {
      logger.error('🌐 Failed to broadcast shift update', { error, tenantId, updateType });
    }
  }

  /**
   * Broadcast conflict detection results
   */
  async broadcastConflictUpdate(
    tenantId: string,
    conflicts: any[],
    affectedEmployees: string[],
    storeId?: string
  ): Promise<void> {
    try {
      const tenantClients = Array.from(this.clients.values()).filter(
        client => client.tenantId === tenantId
      );

      const subscribedClients = [];
      for (const client of tenantClients) {
        let subscription = null;
        try {
          subscription = await redisService.getWebSocketSubscription(
            client.userId, 
            client.tenantId, 
            client.sessionId, 
            'hr_shifts'
          );
        } catch (redisError) {
          // Fallback: assume all clients are subscribed when Redis is unavailable
          subscription = { storeIds: [] };
        }

        if (subscription && (!storeId || !subscription.storeIds || subscription.storeIds.includes(storeId))) {
          subscribedClients.push(client);
        }
      }

      if (subscribedClients.length === 0) return;

      const message = {
        type: 'hr_conflicts_update',
        data: {
          conflicts,
          affectedEmployees,
          storeId,
          timestamp: new Date().toISOString()
        }
      };

      for (const client of subscribedClients) {
        this.sendToClient(client.sessionId, message);
      }

      logger.debug('🌐 Conflicts update broadcasted', {
        tenantId,
        clientsCount: subscribedClients.length,
        conflictsCount: conflicts.length
      });

    } catch (error) {
      logger.error('🌐 Failed to broadcast conflicts update', { error, tenantId });
    }
  }

  // ==================== CHAT SYSTEM METHODS ====================

  /**
   * Handle chat channel join
   */
  private async handleChatChannelJoin(sessionId: string, channelId: string): Promise<void> {
    const client = this.clients.get(sessionId);
    if (!client) return;

    try {
      await redisService.setWebSocketSubscription(
        client.userId,
        client.tenantId,
        sessionId,
        'chat_channel',
        { channelId }
      );
    } catch (redisError) {
      logger.debug('🌐 Redis chat subscription storage failed (fallback mode)', { sessionId, channelId });
    }

    this.sendToClient(sessionId, {
      type: 'chat_channel_joined',
      channelId,
      timestamp: new Date().toISOString()
    });

    logger.debug('💬 Chat channel joined', { sessionId, channelId });
  }

  /**
   * Handle chat channel leave
   */
  private async handleChatChannelLeave(sessionId: string, channelId: string): Promise<void> {
    const client = this.clients.get(sessionId);
    if (!client) return;

    try {
      await redisService.removeWebSocketSubscription(
        client.userId,
        client.tenantId,
        sessionId,
        'chat_channel'
      );
    } catch (redisError) {
      logger.debug('🌐 Redis chat unsubscription failed (fallback mode)', { sessionId, channelId });
    }

    this.sendToClient(sessionId, {
      type: 'chat_channel_left',
      channelId,
      timestamp: new Date().toISOString()
    });

    logger.debug('💬 Chat channel left', { sessionId, channelId });
  }

  /**
   * Handle typing start
   */
  private async handleChatTypingStart(sessionId: string, channelId: string): Promise<void> {
    const client = this.clients.get(sessionId);
    if (!client) return;

    // Broadcast typing indicator to other channel members
    await this.broadcastToChannel(channelId, client.tenantId, {
      type: 'chat_typing',
      channelId,
      userId: client.userId,
      isTyping: true
    }, [client.userId]);

    logger.debug('💬 Typing indicator started', { sessionId, channelId, userId: client.userId });
  }

  /**
   * Handle typing stop
   */
  private async handleChatTypingStop(sessionId: string, channelId: string): Promise<void> {
    const client = this.clients.get(sessionId);
    if (!client) return;

    // Broadcast typing stopped to other channel members
    await this.broadcastToChannel(channelId, client.tenantId, {
      type: 'chat_typing',
      channelId,
      userId: client.userId,
      isTyping: false
    }, [client.userId]);

    logger.debug('💬 Typing indicator stopped', { sessionId, channelId, userId: client.userId });
  }

  /**
   * Broadcast new message to channel members
   */
  async broadcastChatMessage(
    channelId: string,
    tenantId: string,
    message: {
      id: string;
      userId: string;
      content: string;
      createdAt: string;
      attachments?: any[];
      mentionedUserIds?: string[];
    }
  ): Promise<void> {
    try {
      await this.broadcastToChannel(channelId, tenantId, {
        type: 'chat_message_new',
        channelId,
        message
      });

      logger.debug('💬 Chat message broadcasted', {
        channelId,
        messageId: message.id,
        tenantId
      });
    } catch (error) {
      logger.error('💬 Failed to broadcast chat message', { error, channelId });
    }
  }

  /**
   * Broadcast message update
   */
  async broadcastMessageUpdate(
    channelId: string,
    tenantId: string,
    messageId: string,
    content: string
  ): Promise<void> {
    try {
      await this.broadcastToChannel(channelId, tenantId, {
        type: 'chat_message_updated',
        channelId,
        messageId,
        content,
        isEdited: true
      });

      logger.debug('💬 Message update broadcasted', { channelId, messageId });
    } catch (error) {
      logger.error('💬 Failed to broadcast message update', { error, channelId, messageId });
    }
  }

  /**
   * Broadcast message deletion
   */
  async broadcastMessageDelete(
    channelId: string,
    tenantId: string,
    messageId: string
  ): Promise<void> {
    try {
      await this.broadcastToChannel(channelId, tenantId, {
        type: 'chat_message_deleted',
        channelId,
        messageId
      });

      logger.debug('💬 Message deletion broadcasted', { channelId, messageId });
    } catch (error) {
      logger.error('💬 Failed to broadcast message deletion', { error, channelId, messageId });
    }
  }

  /**
   * Broadcast reaction change
   */
  async broadcastReactionChange(
    channelId: string,
    tenantId: string,
    messageId: string,
    reactions: Record<string, string[]>
  ): Promise<void> {
    try {
      await this.broadcastToChannel(channelId, tenantId, {
        type: 'chat_reaction_changed',
        channelId,
        messageId,
        reactions
      });

      logger.debug('💬 Reaction change broadcasted', { channelId, messageId });
    } catch (error) {
      logger.error('💬 Failed to broadcast reaction change', { error, channelId, messageId });
    }
  }

  /**
   * Broadcast member joined
   */
  async broadcastMemberJoined(
    channelId: string,
    tenantId: string,
    member: {
      userId: string;
      role: string;
      joinedAt: Date;
    }
  ): Promise<void> {
    try {
      await this.broadcastToChannel(channelId, tenantId, {
        type: 'chat_member_joined',
        channelId,
        member
      });

      logger.debug('💬 Member joined broadcasted', { channelId, userId: member.userId });
    } catch (error) {
      logger.error('💬 Failed to broadcast member joined', { error, channelId });
    }
  }

  /**
   * Broadcast member left
   */
  async broadcastMemberLeft(
    channelId: string,
    tenantId: string,
    userId: string
  ): Promise<void> {
    try {
      await this.broadcastToChannel(channelId, tenantId, {
        type: 'chat_member_left',
        channelId,
        userId
      });

      logger.debug('💬 Member left broadcasted', { channelId, userId });
    } catch (error) {
      logger.error('💬 Failed to broadcast member left', { error, channelId, userId });
    }
  }

  /**
   * Broadcast unread count update to user
   */
  async broadcastUnreadCountUpdate(
    userId: string,
    tenantId: string,
    unreadCount: number
  ): Promise<void> {
    try {
      const userClients = Array.from(this.clients.values()).filter(
        client => client.userId === userId && client.tenantId === tenantId
      );

      const message = {
        type: 'chat_unread_changed',
        unreadCount,
        timestamp: new Date().toISOString()
      };

      for (const client of userClients) {
        this.sendToClient(client.sessionId, message);
      }

      logger.debug('💬 Unread count broadcasted', { userId, unreadCount });
    } catch (error) {
      logger.error('💬 Failed to broadcast unread count', { error, userId });
    }
  }

  /**
   * Broadcast message to all channel members
   */
  private async broadcastToChannel(
    channelId: string,
    tenantId: string,
    message: any,
    excludeUserIds: string[] = []
  ): Promise<void> {
    // Get all clients in this tenant
    const tenantClients = Array.from(this.clients.values()).filter(
      client => client.tenantId === tenantId && !excludeUserIds.includes(client.userId)
    );

    // Filter clients who are subscribed to this channel
    const subscribedClients = [];
    for (const client of tenantClients) {
      try {
        const subscription = await redisService.getWebSocketSubscription(
          client.userId,
          client.tenantId,
          client.sessionId,
          'chat_channel'
        );

        if (subscription && subscription.channelId === channelId) {
          subscribedClients.push(client);
        }
      } catch (redisError) {
        // Fallback: assume all clients are subscribed
        subscribedClients.push(client);
      }
    }

    // Send to all subscribed clients
    for (const client of subscribedClients) {
      this.sendToClient(client.sessionId, {
        ...message,
        timestamp: new Date().toISOString()
      });
    }

    logger.debug('💬 Broadcasted to channel', {
      channelId,
      clientsCount: subscribedClients.length
    });
  }

  /**
   * Get connection statistics
   */
  getStats(): { totalConnections: number; connectionsByTenant: Record<string, number> } {
    const connectionsByTenant: Record<string, number> = {};

    for (const client of this.clients.values()) {
      connectionsByTenant[client.tenantId] = (connectionsByTenant[client.tenantId] || 0) + 1;
    }

    return {
      totalConnections: this.clients.size,
      connectionsByTenant
    };
  }

  /**
   * Shutdown WebSocket service
   */
  async shutdown(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.wss) {
      this.wss.close();
    }

    this.clients.clear();
    logger.info('🌐 WebSocket Service shutdown completed');
  }
}

export const webSocketService = WebSocketService.getInstance();