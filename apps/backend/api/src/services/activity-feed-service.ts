import { db } from '../core/db.js';
import { 
  activityFeedEvents,
  activityFeedInteractions,
  type InsertActivityFeedEvent,
  type ActivityFeedEvent,
  type InsertActivityFeedInteraction,
  type ActivityFeedInteraction
} from '../db/schema/w3suite.js';
import { eq, and, desc, sql, inArray, or, isNull } from 'drizzle-orm';
import { logger } from '../core/logger';

export class ActivityFeedService {
  
  static async createEvent(eventData: Partial<InsertActivityFeedEvent> & {
    tenantId: string;
    category: 'TASK' | 'WORKFLOW' | 'HR' | 'CRM' | 'WEBHOOK' | 'SYSTEM';
    title: string;
  }): Promise<ActivityFeedEvent> {
    try {
      const [event] = await db
        .insert(activityFeedEvents)
        .values({
          eventType: eventData.eventType || 'generic_event',
          actorType: eventData.actorType || 'user',
          priority: eventData.priority || 'normal',
          eventData: eventData.eventData || {},
          ...eventData
        })
        .returning();
      
      logger.info('📰 Activity event created', { 
        eventId: event.id, 
        category: event.category,
        actorType: event.actorType,
        tenantId: event.tenantId 
      });
      
      return event;
    } catch (error) {
      logger.error('❌ Failed to create activity event', { error, eventData });
      throw error;
    }
  }

  static async getUserFeed(
    userId: string,
    tenantId: string,
    userDepartment?: string,
    filters?: {
      category?: ('TASK' | 'WORKFLOW' | 'HR' | 'CRM' | 'WEBHOOK' | 'SYSTEM')[];
      includeHidden?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<ActivityFeedEvent[]> {
    const hiddenEvents = filters?.includeHidden ? [] : await this.getHiddenEventIds(userId, tenantId);

    const visibilityConditions = [];
    
    visibilityConditions.push(isNull(activityFeedEvents.department));
    
    if (userDepartment) {
      visibilityConditions.push(eq(activityFeedEvents.department, userDepartment as any));
    }
    
    visibilityConditions.push(
      sql`${activityFeedEvents.visibleToUserIds} @> ARRAY[${userId}]::varchar[]`
    );

    let query = db
      .select()
      .from(activityFeedEvents)
      .where(and(
        eq(activityFeedEvents.tenantId, tenantId),
        or(...visibilityConditions),
        filters?.category?.length 
          ? inArray(activityFeedEvents.category, filters.category)
          : undefined,
        hiddenEvents.length > 0 
          ? sql`${activityFeedEvents.id} NOT IN (${sql.join(hiddenEvents.map(id => sql`${id}`), sql`, `)})`
          : undefined
      ))
      .orderBy(desc(activityFeedEvents.createdAt));

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.offset(filters.offset);
    }

    return query;
  }

  static async getEventById(eventId: string, tenantId: string): Promise<ActivityFeedEvent | null> {
    const [event] = await db
      .select()
      .from(activityFeedEvents)
      .where(and(
        eq(activityFeedEvents.id, eventId),
        eq(activityFeedEvents.tenantId, tenantId)
      ))
      .limit(1);
    
    return event || null;
  }

  static async addInteraction(
    eventId: string,
    tenantId: string,
    userId: string,
    interactionType: 'like' | 'comment' | 'share' | 'bookmark' | 'hide',
    commentContent?: string
  ): Promise<ActivityFeedInteraction> {
    try {
      const event = await this.getEventById(eventId, tenantId);
      if (!event) {
        throw new Error('Event not found or access denied');
      }

      const [interaction] = await db
        .insert(activityFeedInteractions)
        .values({
          eventId,
          tenantId,
          userId,
          interactionType,
          commentContent
        })
        .onConflictDoUpdate({
          target: [
            activityFeedInteractions.eventId,
            activityFeedInteractions.userId,
            activityFeedInteractions.interactionType
          ],
          set: {
            createdAt: new Date()
          }
        })
        .returning();

      logger.info('👍 Activity interaction added', { 
        eventId,
        userId,
        type: interactionType 
      });

      return interaction;
    } catch (error) {
      logger.error('❌ Failed to add interaction', { error, eventId, userId });
      throw error;
    }
  }

  static async removeInteraction(
    eventId: string,
    tenantId: string,
    userId: string,
    interactionType: 'like' | 'comment' | 'share' | 'bookmark' | 'hide'
  ): Promise<void> {
    const event = await this.getEventById(eventId, tenantId);
    if (!event) {
      throw new Error('Event not found or access denied');
    }

    await db
      .delete(activityFeedInteractions)
      .where(and(
        eq(activityFeedInteractions.eventId, eventId),
        eq(activityFeedInteractions.tenantId, tenantId),
        eq(activityFeedInteractions.userId, userId),
        eq(activityFeedInteractions.interactionType, interactionType)
      ));

    logger.info('👍 Activity interaction removed', { eventId, userId, interactionType });
  }

  static async getUserInteractions(
    userId: string,
    tenantId: string,
    interactionType?: 'like' | 'comment' | 'share' | 'bookmark' | 'hide'
  ): Promise<ActivityFeedInteraction[]> {
    return db
      .select()
      .from(activityFeedInteractions)
      .where(and(
        eq(activityFeedInteractions.userId, userId),
        eq(activityFeedInteractions.tenantId, tenantId),
        interactionType ? eq(activityFeedInteractions.interactionType, interactionType) : undefined
      ))
      .orderBy(desc(activityFeedInteractions.createdAt));
  }

  static async getEventInteractions(
    eventId: string,
    tenantId: string,
    interactionType?: 'like' | 'comment' | 'share' | 'bookmark' | 'hide'
  ): Promise<ActivityFeedInteraction[]> {
    return db
      .select()
      .from(activityFeedInteractions)
      .where(and(
        eq(activityFeedInteractions.eventId, eventId),
        eq(activityFeedInteractions.tenantId, tenantId),
        interactionType ? eq(activityFeedInteractions.interactionType, interactionType) : undefined
      ))
      .orderBy(desc(activityFeedInteractions.createdAt));
  }

  private static async getHiddenEventIds(userId: string, tenantId: string): Promise<string[]> {
    const hidden = await db
      .select({ eventId: activityFeedInteractions.eventId })
      .from(activityFeedInteractions)
      .where(and(
        eq(activityFeedInteractions.userId, userId),
        eq(activityFeedInteractions.tenantId, tenantId),
        eq(activityFeedInteractions.interactionType, 'hide')
      ));

    return hidden.map((h: { eventId: string }) => h.eventId);
  }

  static async getInteractionCounts(eventId: string, tenantId: string): Promise<{
    likes: number;
    comments: number;
    shares: number;
    bookmarks: number;
    hides: number;
  }> {
    const interactions = await this.getEventInteractions(eventId, tenantId);

    return {
      likes: interactions.filter(i => i.interactionType === 'like').length,
      comments: interactions.filter(i => i.interactionType === 'comment').length,
      shares: interactions.filter(i => i.interactionType === 'share').length,
      bookmarks: interactions.filter(i => i.interactionType === 'bookmark').length,
      hides: interactions.filter(i => i.interactionType === 'hide').length
    };
  }

  static async createTaskEvent(
    taskId: string,
    tenantId: string,
    actorUserId: string,
    title: string,
    description: string,
    eventData: Record<string, any>,
    department?: string,
    visibleToUserIds?: string[]
  ): Promise<ActivityFeedEvent> {
    return this.createEvent({
      tenantId,
      eventType: 'task_event',
      category: 'TASK',
      actorType: 'user',
      actorUserId,
      targetEntityType: 'task',
      targetEntityId: taskId,
      title,
      description,
      eventData,
      department: department as any,
      visibleToUserIds
    });
  }

  static async createWorkflowEvent(
    workflowInstanceId: string,
    tenantId: string,
    actorUserId: string,
    title: string,
    description: string,
    eventData: Record<string, any>,
    department?: string,
    visibleToUserIds?: string[]
  ): Promise<ActivityFeedEvent> {
    return this.createEvent({
      tenantId,
      eventType: 'workflow_event',
      category: 'WORKFLOW',
      actorType: 'user',
      actorUserId,
      targetEntityType: 'workflow',
      targetEntityId: workflowInstanceId,
      title,
      description,
      eventData,
      department: department as any,
      visibleToUserIds
    });
  }

  static async createHREvent(
    entityId: string,
    entityType: string,
    tenantId: string,
    actorUserId: string,
    title: string,
    description: string,
    eventData: Record<string, any>,
    department?: string,
    visibleToUserIds?: string[]
  ): Promise<ActivityFeedEvent> {
    return this.createEvent({
      tenantId,
      eventType: 'hr_event',
      category: 'HR',
      actorType: 'user',
      actorUserId,
      targetEntityType: entityType,
      targetEntityId: entityId,
      title,
      description,
      eventData,
      department: department as any,
      visibleToUserIds
    });
  }

  static async createWebhookEvent(
    webhookEventId: string,
    tenantId: string,
    source: string,
    title: string,
    description: string,
    eventData: Record<string, any>
  ): Promise<ActivityFeedEvent> {
    return this.createEvent({
      tenantId,
      eventType: 'webhook_event',
      category: 'WEBHOOK',
      actorType: 'webhook',
      targetEntityType: 'webhook',
      targetEntityId: webhookEventId,
      title,
      description,
      eventData
    });
  }

  static async createSystemEvent(
    tenantId: string,
    title: string,
    description: string,
    eventData: Record<string, any>,
    department?: string
  ): Promise<ActivityFeedEvent> {
    return this.createEvent({
      tenantId,
      eventType: 'system_event',
      category: 'SYSTEM',
      actorType: 'system',
      title,
      description,
      eventData,
      department: department as any
    });
  }

  static async aggregateSimilarEvents(
    category: 'TASK' | 'WORKFLOW' | 'HR' | 'CRM' | 'WEBHOOK' | 'SYSTEM',
    targetEntityId: string,
    tenantId: string,
    timeWindowMinutes: number = 60
  ): Promise<ActivityFeedEvent[]> {
    const windowStart = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

    const events = await db
      .select()
      .from(activityFeedEvents)
      .where(and(
        eq(activityFeedEvents.tenantId, tenantId),
        eq(activityFeedEvents.category, category),
        eq(activityFeedEvents.targetEntityId, targetEntityId),
        sql`${activityFeedEvents.createdAt} >= ${windowStart}`
      ))
      .orderBy(desc(activityFeedEvents.createdAt));

    return events;
  }

  static async getEventStats(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    groupBy: 'category' | 'actor' | 'day' = 'category'
  ): Promise<any[]> {
    const stats = await db
      .select({
        group: groupBy === 'category' 
          ? activityFeedEvents.category 
          : groupBy === 'actor'
          ? activityFeedEvents.actorUserId
          : sql<string>`DATE(${activityFeedEvents.createdAt})`,
        count: sql<number>`count(*)`
      })
      .from(activityFeedEvents)
      .where(and(
        eq(activityFeedEvents.tenantId, tenantId),
        sql`${activityFeedEvents.createdAt} >= ${startDate}`,
        sql`${activityFeedEvents.createdAt} <= ${endDate}`
      ))
      .groupBy(
        groupBy === 'category' 
          ? activityFeedEvents.category 
          : groupBy === 'actor'
          ? activityFeedEvents.actorUserId
          : sql`DATE(${activityFeedEvents.createdAt})`
      );

    return stats;
  }
}
