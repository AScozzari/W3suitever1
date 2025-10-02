import { db } from '../core/db.js';
import { 
  tasks, 
  taskAssignments, 
  taskChecklistItems, 
  taskComments, 
  taskTimeLogs, 
  taskDependencies, 
  taskAttachments, 
  taskTemplates,
  type InsertTask,
  type Task,
  type InsertTaskAssignment,
  type TaskAssignment,
  type InsertTaskChecklistItem,
  type TaskChecklistItem,
  type InsertTaskComment,
  type TaskComment,
  type InsertTaskTimeLog,
  type TaskTimeLog,
  type InsertTaskDependency,
  type TaskDependency,
  type InsertTaskAttachment,
  type TaskAttachment,
  type InsertTaskTemplate,
  type TaskTemplate
} from '../db/schema/w3suite';
import { eq, and, or, desc, asc, sql, inArray, isNull } from 'drizzle-orm';
import { logger } from '../core/logger';

export class TaskService {
  
  static async createTask(taskData: InsertTask): Promise<Task> {
    try {
      const [task] = await db
        .insert(tasks)
        .values(taskData)
        .returning();
      
      logger.info('📋 Task created', { taskId: task.id, title: task.title, tenantId: task.tenantId });
      return task;
    } catch (error) {
      logger.error('❌ Failed to create task', { error, taskData });
      throw error;
    }
  }

  static async getTaskById(taskId: string, tenantId: string): Promise<Task | null> {
    const [task] = await db
      .select()
      .from(tasks)
      .where(and(
        eq(tasks.id, taskId),
        eq(tasks.tenantId, tenantId)
      ))
      .limit(1);
    
    return task || null;
  }

  static async getTasksForUser(
    userId: string,
    tenantId: string,
    filters?: {
      role?: 'assignee' | 'watcher';
      status?: string;
      priority?: string;
      department?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<Task[]> {
    const assignmentQuery = db
      .select({ taskId: taskAssignments.taskId })
      .from(taskAssignments)
      .where(and(
        eq(taskAssignments.userId, userId),
        filters?.role ? eq(taskAssignments.role, filters.role) : undefined
      ));

    const taskIds = (await assignmentQuery).map((a: { taskId: string }) => a.taskId);

    if (taskIds.length === 0) {
      return [];
    }

    let query = db
      .select()
      .from(tasks)
      .where(and(
        eq(tasks.tenantId, tenantId),
        inArray(tasks.id, taskIds),
        filters?.status ? eq(tasks.status, filters.status as any) : undefined,
        filters?.priority ? eq(tasks.priority, filters.priority as any) : undefined,
        filters?.department ? eq(tasks.department, filters.department as any) : undefined
      ))
      .orderBy(desc(tasks.createdAt));

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.offset(filters.offset);
    }

    return query;
  }

  static async getTasksCreatedByUser(
    userId: string,
    tenantId: string,
    filters?: {
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<Task[]> {
    let query = db
      .select()
      .from(tasks)
      .where(and(
        eq(tasks.tenantId, tenantId),
        eq(tasks.creatorId, userId),
        filters?.status ? eq(tasks.status, filters.status as any) : undefined
      ))
      .orderBy(desc(tasks.createdAt));

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.offset(filters.offset);
    }

    return query;
  }

  static async updateTask(
    taskId: string,
    tenantId: string,
    updates: Partial<InsertTask>
  ): Promise<Task> {
    const [updated] = await db
      .update(tasks)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(and(
        eq(tasks.id, taskId),
        eq(tasks.tenantId, tenantId)
      ))
      .returning();

    if (!updated) {
      throw new Error('Task not found');
    }

    logger.info('📋 Task updated', { taskId, updates });
    return updated;
  }

  static async deleteTask(taskId: string, tenantId: string): Promise<void> {
    await db
      .delete(tasks)
      .where(and(
        eq(tasks.id, taskId),
        eq(tasks.tenantId, tenantId)
      ));

    logger.info('📋 Task deleted', { taskId, tenantId });
  }

  static async assignUser(
    taskId: string,
    tenantId: string,
    userId: string,
    role: 'assignee' | 'watcher',
    assignedBy: string
  ): Promise<TaskAssignment> {
    const [assignment] = await db
      .insert(taskAssignments)
      .values({
        taskId,
        tenantId,
        userId,
        role,
        assignedBy
      })
      .returning();

    logger.info('👤 User assigned to task', { taskId, userId, role });
    return assignment;
  }

  static async unassignUser(
    taskId: string,
    tenantId: string,
    userId: string,
    role: 'assignee' | 'watcher'
  ): Promise<void> {
    await db
      .delete(taskAssignments)
      .where(and(
        eq(taskAssignments.taskId, taskId),
        eq(taskAssignments.tenantId, tenantId),
        eq(taskAssignments.userId, userId),
        eq(taskAssignments.role, role)
      ));

    logger.info('👤 User unassigned from task', { taskId, userId, role });
  }

  static async getTaskAssignments(
    taskId: string,
    tenantId: string,
    role?: 'assignee' | 'watcher'
  ): Promise<TaskAssignment[]> {
    return db
      .select()
      .from(taskAssignments)
      .where(and(
        eq(taskAssignments.taskId, taskId),
        eq(taskAssignments.tenantId, tenantId),
        role ? eq(taskAssignments.role, role) : undefined
      ));
  }

  static async addChecklistItem(
    itemData: InsertTaskChecklistItem
  ): Promise<TaskChecklistItem> {
    const [item] = await db
      .insert(taskChecklistItems)
      .values(itemData)
      .returning();

    await this.recalculateProgress(itemData.taskId, itemData.tenantId);

    logger.info('✅ Checklist item added', { taskId: itemData.taskId, itemId: item.id });
    return item;
  }

  static async updateChecklistItem(
    itemId: string,
    tenantId: string,
    updates: Partial<InsertTaskChecklistItem>
  ): Promise<TaskChecklistItem> {
    const [item] = await db
      .update(taskChecklistItems)
      .set(updates)
      .where(and(
        eq(taskChecklistItems.id, itemId),
        eq(taskChecklistItems.tenantId, tenantId)
      ))
      .returning();

    if (!item) {
      throw new Error('Checklist item not found');
    }

    await this.recalculateProgress(item.taskId, tenantId);

    return item;
  }

  static async toggleChecklistItem(
    itemId: string,
    tenantId: string,
    userId: string
  ): Promise<TaskChecklistItem> {
    const [current] = await db
      .select()
      .from(taskChecklistItems)
      .where(and(
        eq(taskChecklistItems.id, itemId),
        eq(taskChecklistItems.tenantId, tenantId)
      ))
      .limit(1);

    if (!current) {
      throw new Error('Checklist item not found');
    }

    const [updated] = await db
      .update(taskChecklistItems)
      .set({
        isCompleted: !current.isCompleted,
        completedAt: !current.isCompleted ? new Date() : null,
        completedBy: !current.isCompleted ? userId : null
      })
      .where(eq(taskChecklistItems.id, itemId))
      .returning();

    await this.recalculateProgress(current.taskId, tenantId);

    logger.info('✅ Checklist item toggled', { 
      itemId, 
      isCompleted: updated.isCompleted 
    });

    return updated;
  }

  static async deleteChecklistItem(itemId: string, tenantId: string): Promise<void> {
    const [item] = await db
      .select()
      .from(taskChecklistItems)
      .where(and(
        eq(taskChecklistItems.id, itemId),
        eq(taskChecklistItems.tenantId, tenantId)
      ))
      .limit(1);

    if (!item) return;

    await db
      .delete(taskChecklistItems)
      .where(eq(taskChecklistItems.id, itemId));

    await this.recalculateProgress(item.taskId, tenantId);

    logger.info('✅ Checklist item deleted', { itemId });
  }

  static async getChecklistItems(taskId: string, tenantId: string): Promise<TaskChecklistItem[]> {
    return db
      .select()
      .from(taskChecklistItems)
      .where(and(
        eq(taskChecklistItems.taskId, taskId),
        eq(taskChecklistItems.tenantId, tenantId)
      ))
      .orderBy(asc(taskChecklistItems.position));
  }

  private static async recalculateProgress(
    taskId: string,
    tenantId: string
  ): Promise<void> {
    const items = await this.getChecklistItems(taskId, tenantId);
    
    if (items.length === 0) {
      await db
        .update(tasks)
        .set({ completionPercentage: 0 })
        .where(eq(tasks.id, taskId));
      return;
    }

    const completedCount = items.filter(i => i.isCompleted).length;
    const percentage = Math.round((completedCount / items.length) * 100);

    await db
      .update(tasks)
      .set({ 
        completionPercentage: percentage,
        updatedAt: new Date()
      })
      .where(eq(tasks.id, taskId));

    logger.debug('📊 Task progress recalculated', { 
      taskId, 
      percentage, 
      completed: completedCount, 
      total: items.length 
    });
  }

  static async addComment(commentData: InsertTaskComment): Promise<TaskComment> {
    const [comment] = await db
      .insert(taskComments)
      .values(commentData)
      .returning();

    logger.info('💬 Comment added to task', { 
      taskId: commentData.taskId, 
      commentId: comment.id 
    });

    return comment;
  }

  static async updateComment(
    commentId: string,
    tenantId: string,
    content: string
  ): Promise<TaskComment> {
    const [updated] = await db
      .update(taskComments)
      .set({
        content,
        isEdited: true,
        updatedAt: new Date()
      })
      .where(and(
        eq(taskComments.id, commentId),
        eq(taskComments.tenantId, tenantId)
      ))
      .returning();

    if (!updated) {
      throw new Error('Comment not found');
    }

    return updated;
  }

  static async deleteComment(commentId: string, tenantId: string): Promise<void> {
    await db
      .update(taskComments)
      .set({ deletedAt: new Date() })
      .where(and(
        eq(taskComments.id, commentId),
        eq(taskComments.tenantId, tenantId)
      ));

    logger.info('💬 Comment deleted', { commentId });
  }

  static async getComments(taskId: string, tenantId: string): Promise<TaskComment[]> {
    return db
      .select()
      .from(taskComments)
      .where(and(
        eq(taskComments.taskId, taskId),
        eq(taskComments.tenantId, tenantId),
        isNull(taskComments.deletedAt)
      ))
      .orderBy(desc(taskComments.createdAt));
  }

  static async startTimer(
    taskId: string,
    tenantId: string,
    userId: string,
    description?: string
  ): Promise<TaskTimeLog> {
    const existing = await db
      .select()
      .from(taskTimeLogs)
      .where(and(
        eq(taskTimeLogs.userId, userId),
        isNull(taskTimeLogs.endedAt)
      ))
      .limit(1);

    if (existing.length > 0) {
      throw new Error('User already has a running timer');
    }

    const [timeLog] = await db
      .insert(taskTimeLogs)
      .values({
        taskId,
        tenantId,
        userId,
        startedAt: new Date(),
        description
      })
      .returning();

    logger.info('⏱️ Timer started', { taskId, userId, logId: timeLog.id });
    return timeLog;
  }

  static async stopTimer(
    logId: string,
    tenantId: string,
    userId: string
  ): Promise<TaskTimeLog> {
    const endTime = new Date();

    const [log] = await db
      .select()
      .from(taskTimeLogs)
      .where(and(
        eq(taskTimeLogs.id, logId),
        eq(taskTimeLogs.tenantId, tenantId),
        eq(taskTimeLogs.userId, userId)
      ))
      .limit(1);

    if (!log) {
      throw new Error('Time log not found');
    }

    if (log.endedAt) {
      throw new Error('Timer already stopped');
    }

    const duration = Math.floor((endTime.getTime() - log.startedAt.getTime()) / 1000);

    const [updated] = await db
      .update(taskTimeLogs)
      .set({
        endedAt: endTime,
        duration
      })
      .where(eq(taskTimeLogs.id, logId))
      .returning();

    await this.updateActualHours(log.taskId, tenantId);

    logger.info('⏱️ Timer stopped', { 
      logId, 
      duration: `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m` 
    });

    return updated;
  }

  static async getTimeLogs(taskId: string, tenantId: string): Promise<TaskTimeLog[]> {
    return db
      .select()
      .from(taskTimeLogs)
      .where(and(
        eq(taskTimeLogs.taskId, taskId),
        eq(taskTimeLogs.tenantId, tenantId)
      ))
      .orderBy(desc(taskTimeLogs.startedAt));
  }

  private static async updateActualHours(taskId: string, tenantId: string): Promise<void> {
    const logs = await this.getTimeLogs(taskId, tenantId);
    const totalSeconds = logs
      .filter(l => l.duration)
      .reduce((sum, l) => sum + (l.duration || 0), 0);

    const actualHours = totalSeconds / 3600;

    await db
      .update(tasks)
      .set({ 
        actualHours,
        updatedAt: new Date()
      })
      .where(eq(tasks.id, taskId));
  }

  static async addDependency(
    dependencyData: InsertTaskDependency
  ): Promise<TaskDependency> {
    if (dependencyData.taskId === dependencyData.dependsOnTaskId) {
      throw new Error('Task cannot depend on itself');
    }

    const [dependency] = await db
      .insert(taskDependencies)
      .values(dependencyData)
      .returning();

    logger.info('🔗 Task dependency added', { 
      taskId: dependencyData.taskId, 
      dependsOn: dependencyData.dependsOnTaskId 
    });

    return dependency;
  }

  static async removeDependency(dependencyId: string): Promise<void> {
    await db
      .delete(taskDependencies)
      .where(eq(taskDependencies.id, dependencyId));

    logger.info('🔗 Task dependency removed', { dependencyId });
  }

  static async getDependencies(taskId: string, tenantId: string): Promise<TaskDependency[]> {
    return db
      .select()
      .from(taskDependencies)
      .where(and(
        eq(taskDependencies.taskId, taskId),
        eq(taskDependencies.tenantId, tenantId)
      ));
  }

  static async addAttachment(
    attachmentData: InsertTaskAttachment
  ): Promise<TaskAttachment> {
    const [attachment] = await db
      .insert(taskAttachments)
      .values(attachmentData)
      .returning();

    logger.info('📎 Attachment added to task', { 
      taskId: attachmentData.taskId, 
      fileName: attachmentData.fileName 
    });

    return attachment;
  }

  static async deleteAttachment(attachmentId: string, tenantId: string): Promise<void> {
    await db
      .delete(taskAttachments)
      .where(and(
        eq(taskAttachments.id, attachmentId),
        eq(taskAttachments.tenantId, tenantId)
      ));

    logger.info('📎 Attachment deleted', { attachmentId });
  }

  static async getAttachments(taskId: string, tenantId: string): Promise<TaskAttachment[]> {
    return db
      .select()
      .from(taskAttachments)
      .where(and(
        eq(taskAttachments.taskId, taskId),
        eq(taskAttachments.tenantId, tenantId)
      ))
      .orderBy(desc(taskAttachments.uploadedAt));
  }

  static async createTemplate(
    templateData: InsertTaskTemplate
  ): Promise<TaskTemplate> {
    const [template] = await db
      .insert(taskTemplates)
      .values(templateData)
      .returning();

    logger.info('📝 Task template created', { 
      templateId: template.id, 
      name: template.name 
    });

    return template;
  }

  static async instantiateTemplate(
    templateId: string,
    tenantId: string,
    creatorId: string,
    overrides?: Partial<InsertTask>
  ): Promise<Task> {
    const [template] = await db
      .select()
      .from(taskTemplates)
      .where(and(
        eq(taskTemplates.id, templateId),
        eq(taskTemplates.tenantId, tenantId),
        eq(taskTemplates.isActive, true)
      ))
      .limit(1);

    if (!template) {
      throw new Error('Template not found or inactive');
    }

    const templateData = template.templateData as any;

    const taskData: InsertTask = {
      tenantId,
      creatorId,
      title: templateData.title,
      description: templateData.description,
      priority: templateData.priority || 'medium',
      status: 'todo',
      estimatedHours: templateData.estimatedHours,
      tags: templateData.tags || [],
      customFields: templateData.customFields || {},
      department: templateData.department,
      ...overrides
    };

    const task = await this.createTask(taskData);

    if (templateData.defaultAssigneeUserIds) {
      for (const userId of templateData.defaultAssigneeUserIds) {
        await this.assignUser(task.id, tenantId, userId, 'assignee', creatorId);
      }
    }

    if (templateData.defaultWatcherUserIds) {
      for (const userId of templateData.defaultWatcherUserIds) {
        await this.assignUser(task.id, tenantId, userId, 'watcher', creatorId);
      }
    }

    if (templateData.checklistItems) {
      for (let i = 0; i < templateData.checklistItems.length; i++) {
        const item = templateData.checklistItems[i];
        await this.addChecklistItem({
          taskId: task.id,
          tenantId,
          title: item.title,
          position: i,
          dueDate: item.dueOffsetDays 
            ? new Date(Date.now() + item.dueOffsetDays * 24 * 60 * 60 * 1000)
            : undefined
        });
      }
    }

    await db
      .update(taskTemplates)
      .set({ lastInstantiatedAt: new Date() })
      .where(eq(taskTemplates.id, templateId));

    logger.info('📝 Task created from template', { 
      templateId, 
      taskId: task.id 
    });

    return task;
  }

  static async getTemplates(
    tenantId: string,
    department?: string
  ): Promise<TaskTemplate[]> {
    return db
      .select()
      .from(taskTemplates)
      .where(and(
        eq(taskTemplates.tenantId, tenantId),
        eq(taskTemplates.isActive, true),
        department ? eq(taskTemplates.department, department as any) : undefined
      ))
      .orderBy(desc(taskTemplates.createdAt));
  }
}
