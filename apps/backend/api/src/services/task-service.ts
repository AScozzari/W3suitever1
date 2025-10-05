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
  entityLogs,
  users,
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
  type TaskTemplate,
  type EntityLog
} from '../db/schema/w3suite';
import { eq, and, or, desc, asc, sql, inArray, isNull, lte, gte, getTableColumns } from 'drizzle-orm';
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

  static async createTaskComplete(data: {
    task: InsertTask;
    assigneeIds?: string[];
    watcherIds?: string[];
    checklistItems?: Array<{ title: string; assignedToUserId?: string; position: number }>;
  }): Promise<Task> {
    return await db.transaction(async (tx) => {
      const [task] = await tx
        .insert(tasks)
        .values(data.task)
        .returning();

      const assignmentsToInsert: InsertTaskAssignment[] = [
        ...(data.assigneeIds || []).map(userId => ({
          taskId: task.id,
          userId,
          role: 'assignee' as const,
          tenantId: task.tenantId,
          assignedBy: data.task.creatorId || task.tenantId,
        })),
        ...(data.watcherIds || []).map(userId => ({
          taskId: task.id,
          userId,
          role: 'watcher' as const,
          tenantId: task.tenantId,
          assignedBy: data.task.creatorId || task.tenantId,
        })),
      ];

      if (assignmentsToInsert.length > 0) {
        await tx.insert(taskAssignments).values(assignmentsToInsert);
      }

      if (data.checklistItems && data.checklistItems.length > 0) {
        const checklistToInsert: InsertTaskChecklistItem[] = data.checklistItems.map(item => ({
          taskId: task.id,
          tenantId: task.tenantId,
          title: item.title,
          assignedToUserId: item.assignedToUserId,
          position: item.position,
          isCompleted: false,
        }));

        await tx.insert(taskChecklistItems).values(checklistToInsert);
      }

      logger.info('📋 Task created (complete)', { 
        taskId: task.id, 
        title: task.title, 
        assignees: data.assigneeIds?.length || 0,
        watchers: data.watcherIds?.length || 0,
        checklistItems: data.checklistItems?.length || 0,
        tenantId: task.tenantId 
      });

      return task;
    });
  }

  static async duplicateTask(taskId: string, tenantId: string, userId: string): Promise<Task> {
    return await db.transaction(async (tx) => {
      const [originalTask] = await tx
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, taskId), eq(tasks.tenantId, tenantId)))
        .limit(1);

      if (!originalTask) {
        throw new Error('Task not found');
      }

      const originalAssignments = await tx
        .select()
        .from(taskAssignments)
        .where(and(
          eq(taskAssignments.taskId, taskId),
          eq(taskAssignments.tenantId, tenantId)
        ));

      const originalChecklist = await tx
        .select()
        .from(taskChecklistItems)
        .where(and(
          eq(taskChecklistItems.taskId, taskId),
          eq(taskChecklistItems.tenantId, tenantId)
        ));

      const { id, createdAt, updatedAt, completedAt, ...taskData } = originalTask;
      
      const [duplicatedTask] = await tx
        .insert(tasks)
        .values({
          ...taskData,
          title: `${taskData.title} (Copia)`,
          status: 'todo',
          creatorId: userId,
          tenantId,
        })
        .returning();

      if (originalAssignments.length > 0) {
        const newAssignments = originalAssignments.map(assignment => ({
          taskId: duplicatedTask.id,
          userId: assignment.userId,
          role: assignment.role,
          tenantId,
          assignedBy: userId,
        }));
        await tx.insert(taskAssignments).values(newAssignments);
      }

      if (originalChecklist.length > 0) {
        const newChecklist = originalChecklist.map(item => ({
          taskId: duplicatedTask.id,
          tenantId,
          title: item.title,
          description: item.description,
          assignedToUserId: item.assignedToUserId,
          position: item.position,
          isCompleted: false,
        }));
        await tx.insert(taskChecklistItems).values(newChecklist);
      }

      logger.info('📋 Task duplicated', { 
        originalId: taskId, 
        duplicatedId: duplicatedTask.id,
        title: duplicatedTask.title,
        tenantId 
      });

      return duplicatedTask;
    });
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
      urgency?: string;
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

    // Smart Priority Score
    const priorityScore = sql`
      CASE ${tasks.urgency}
        WHEN 'critical' THEN 40
        WHEN 'high' THEN 30
        WHEN 'medium' THEN 20
        WHEN 'low' THEN 10
        ELSE 0
      END +
      CASE ${tasks.priority}
        WHEN 'high' THEN 9
        WHEN 'medium' THEN 6
        WHEN 'low' THEN 3
        ELSE 0
      END
    `;

    let query = db
      .select()
      .from(tasks)
      .where(and(
        eq(tasks.tenantId, tenantId),
        inArray(tasks.id, taskIds),
        filters?.status ? eq(tasks.status, filters.status as any) : undefined,
        filters?.priority ? eq(tasks.priority, filters.priority as any) : undefined,
        filters?.urgency ? eq(tasks.urgency, filters.urgency as any) : undefined,
        filters?.department ? eq(tasks.department, filters.department as any) : undefined
      ))
      .orderBy(desc(priorityScore), desc(tasks.createdAt)) as any;

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
      .orderBy(desc(tasks.createdAt)) as any;

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

  static async getTasks(
    tenantId: string,
    filters?: {
      status?: string;
      priority?: string;
      urgency?: string;
      assignedUserId?: string;
      createdByUserId?: string;
      department?: string;
      linkedWorkflowInstanceId?: string;
      dueBefore?: string;
      dueAfter?: string;
      tags?: string[];
      search?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<any[]> {
    // Smart Priority Score: urgency*10 + priority*3
    // critical/high = 40+9=49 (TOP), urgent/medium = 30+6=36, etc.
    const priorityScore = sql`
      CASE ${tasks.urgency}
        WHEN 'critical' THEN 40
        WHEN 'high' THEN 30
        WHEN 'medium' THEN 20
        WHEN 'low' THEN 10
        ELSE 0
      END +
      CASE ${tasks.priority}
        WHEN 'high' THEN 9
        WHEN 'medium' THEN 6
        WHEN 'low' THEN 3
        ELSE 0
      END
    `;

    const assigneeCountSq = db
      .select({ 
        taskId: taskAssignments.taskId, 
        assigneeCount: sql<number>`count(*)::int`.as('assigneeCount') 
      })
      .from(taskAssignments)
      .where(eq(taskAssignments.role, 'assignee'))
      .groupBy(taskAssignments.taskId)
      .as('assignee_counts');

    const commentCountSq = db
      .select({ 
        taskId: taskComments.taskId, 
        commentCount: sql<number>`count(*)::int`.as('commentCount') 
      })
      .from(taskComments)
      .groupBy(taskComments.taskId)
      .as('comment_counts');

    const attachmentCountSq = db
      .select({ 
        taskId: taskAttachments.taskId, 
        attachmentCount: sql<number>`count(*)::int`.as('attachmentCount') 
      })
      .from(taskAttachments)
      .groupBy(taskAttachments.taskId)
      .as('attachment_counts');

    const checklistStatsSq = db
      .select({
        taskId: taskChecklistItems.taskId,
        total: sql<number>`count(*)::int`.as('total'),
        completed: sql<number>`count(*) FILTER (WHERE ${taskChecklistItems.isCompleted} = true)::int`.as('completed')
      })
      .from(taskChecklistItems)
      .groupBy(taskChecklistItems.taskId)
      .as('checklist_stats');

    let query = db
      .select({
        ...getTableColumns(tasks),
        assigneeCount: sql<number>`COALESCE(${assigneeCountSq.assigneeCount}, 0)`,
        commentCount: sql<number>`COALESCE(${commentCountSq.commentCount}, 0)`,
        attachmentCount: sql<number>`COALESCE(${attachmentCountSq.attachmentCount}, 0)`,
        checklistProgress: sql<any>`
          CASE 
            WHEN ${checklistStatsSq.total} > 0 
            THEN json_build_object('completed', ${checklistStatsSq.completed}, 'total', ${checklistStatsSq.total})
            ELSE NULL
          END
        `
      })
      .from(tasks)
      .leftJoin(assigneeCountSq, eq(tasks.id, assigneeCountSq.taskId))
      .leftJoin(commentCountSq, eq(tasks.id, commentCountSq.taskId))
      .leftJoin(attachmentCountSq, eq(tasks.id, attachmentCountSq.taskId))
      .leftJoin(checklistStatsSq, eq(tasks.id, checklistStatsSq.taskId))
      .where(and(
        eq(tasks.tenantId, tenantId),
        filters?.status ? eq(tasks.status, filters.status as any) : undefined,
        filters?.priority ? eq(tasks.priority, filters.priority as any) : undefined,
        filters?.urgency ? eq(tasks.urgency, filters.urgency as any) : undefined,
        filters?.createdByUserId ? eq(tasks.creatorId, filters.createdByUserId) : undefined,
        filters?.department ? eq(tasks.department, filters.department as any) : undefined,
        filters?.linkedWorkflowInstanceId ? eq(tasks.linkedWorkflowInstanceId, filters.linkedWorkflowInstanceId) : undefined,
        filters?.dueBefore ? lte(tasks.dueDate, new Date(filters.dueBefore)) : undefined,
        filters?.dueAfter ? gte(tasks.dueDate, new Date(filters.dueAfter)) : undefined
      ))
      .orderBy(desc(priorityScore), desc(tasks.createdAt)) as any;

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.offset(filters.offset);
    }

    return query;
  }

  static async getMyTasks(userId: string, tenantId: string): Promise<Task[]> {
    return this.getTasksForUser(userId, tenantId, { role: 'assignee' });
  }

  static async getCreatedByMe(userId: string, tenantId: string): Promise<Task[]> {
    return this.getTasksCreatedByUser(userId, tenantId);
  }

  static async getWatchingTasks(userId: string, tenantId: string): Promise<Task[]> {
    return this.getTasksForUser(userId, tenantId, { role: 'watcher' });
  }

  static async logTime(timeLogData: InsertTaskTimeLog): Promise<TaskTimeLog> {
    const [timeLog] = await db
      .insert(taskTimeLogs)
      .values(timeLogData)
      .returning();

    await this.updateActualHours(timeLog.taskId, timeLogData.tenantId);

    logger.info('⏱️ Time logged', { 
      taskId: timeLog.taskId, 
      userId: timeLog.userId,
      duration: timeLog.endedAt && timeLog.startedAt 
        ? (timeLog.endedAt.getTime() - timeLog.startedAt.getTime()) / (1000 * 60 * 60) 
        : 0
    });

    return timeLog;
  }

  static async createTaskFromTemplate(
    templateId: string,
    tenantId: string,
    creatorId: string,
    overrides?: Partial<InsertTask>
  ): Promise<Task> {
    return this.instantiateTemplate(templateId, tenantId, creatorId, overrides);
  }

  static async bulkCreateTasks(tasksData: InsertTask[]): Promise<Task[]> {
    return db.transaction(async (tx) => {
      const createdTasks = await tx
        .insert(tasks)
        .values(tasksData)
        .returning();

      logger.info('📋 Bulk tasks created', { count: createdTasks.length });
      return createdTasks;
    });
  }

  static async bulkUpdateTasks(
    taskIds: string[],
    tenantId: string,
    updates: Partial<InsertTask>
  ): Promise<Task[]> {
    return db.transaction(async (tx) => {
      const existingTasks = await tx
        .select()
        .from(tasks)
        .where(and(
          inArray(tasks.id, taskIds),
          eq(tasks.tenantId, tenantId)
        ));

      if (existingTasks.length !== taskIds.length) {
        throw new Error('Some tasks not found or access denied');
      }

      const updatedTasks = await tx
        .update(tasks)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(and(
          inArray(tasks.id, taskIds),
          eq(tasks.tenantId, tenantId)
        ))
        .returning();

      logger.info('📋 Bulk tasks updated', { count: updatedTasks.length });
      return updatedTasks;
    });
  }

  static async bulkDeleteTasks(taskIds: string[], tenantId: string): Promise<void> {
    return db.transaction(async (tx) => {
      const existingTasks = await tx
        .select()
        .from(tasks)
        .where(and(
          inArray(tasks.id, taskIds),
          eq(tasks.tenantId, tenantId)
        ));

      if (existingTasks.length !== taskIds.length) {
        throw new Error('Some tasks not found or access denied');
      }

      await tx
        .delete(taskAttachments)
        .where(inArray(taskAttachments.taskId, taskIds));

      await tx
        .delete(taskDependencies)
        .where(or(
          inArray(taskDependencies.taskId, taskIds),
          inArray(taskDependencies.dependsOnTaskId, taskIds)
        ));

      await tx
        .delete(taskAssignments)
        .where(inArray(taskAssignments.taskId, taskIds));

      await tx
        .delete(taskChecklistItems)
        .where(inArray(taskChecklistItems.taskId, taskIds));

      await tx
        .delete(taskTimeLogs)
        .where(inArray(taskTimeLogs.taskId, taskIds));

      await tx
        .delete(taskComments)
        .where(inArray(taskComments.taskId, taskIds));

      await tx
        .delete(tasks)
        .where(and(
          inArray(tasks.id, taskIds),
          eq(tasks.tenantId, tenantId)
        ));

      logger.info('📋 Bulk tasks deleted', { count: taskIds.length });
    });
  }

  static async createTaskAssignment(assignmentData: InsertTaskAssignment): Promise<TaskAssignment> {
    try {
      const [assignment] = await db
        .insert(taskAssignments)
        .values(assignmentData)
        .returning();
      
      logger.info('👤 Task assignment created', { 
        taskId: assignment.taskId, 
        userId: assignment.userId, 
        role: assignment.role 
      });
      return assignment;
    } catch (error) {
      logger.error('❌ Failed to create task assignment', { error, assignmentData });
      throw error;
    }
  }

  static async getTaskAssignments(taskId: string, tenantId: string): Promise<TaskAssignment[]> {
    try {
      const assignments = await db
        .select()
        .from(taskAssignments)
        .where(and(
          eq(taskAssignments.taskId, taskId),
          eq(taskAssignments.tenantId, tenantId)
        ));
      
      return assignments;
    } catch (error) {
      logger.error('❌ Failed to get task assignments', { error, taskId });
      throw error;
    }
  }

  static async deleteTaskAssignment(taskId: string, userId: string, role: 'assignee' | 'watcher', tenantId: string): Promise<void> {
    try {
      await db
        .delete(taskAssignments)
        .where(and(
          eq(taskAssignments.taskId, taskId),
          eq(taskAssignments.userId, userId),
          eq(taskAssignments.role, role),
          eq(taskAssignments.tenantId, tenantId)
        ));
      
      logger.info('👤 Task assignment deleted', { taskId, userId, role });
    } catch (error) {
      logger.error('❌ Failed to delete task assignment', { error, taskId, userId, role });
      throw error;
    }
  }

  static async createChecklistItem(itemData: InsertTaskChecklistItem): Promise<TaskChecklistItem> {
    try {
      const [item] = await db
        .insert(taskChecklistItems)
        .values(itemData)
        .returning();
      
      logger.info('✅ Checklist item created', { taskId: item.taskId, itemId: item.id, title: item.title });
      return item;
    } catch (error) {
      logger.error('❌ Failed to create checklist item', { error, itemData });
      throw error;
    }
  }

  static async getChecklistItems(taskId: string, tenantId: string): Promise<TaskChecklistItem[]> {
    try {
      const items = await db
        .select()
        .from(taskChecklistItems)
        .where(and(
          eq(taskChecklistItems.taskId, taskId),
          eq(taskChecklistItems.tenantId, tenantId)
        ))
        .orderBy(asc(taskChecklistItems.position));
      
      return items;
    } catch (error) {
      logger.error('❌ Failed to get checklist items', { error, taskId });
      throw error;
    }
  }

  static async updateChecklistItem(itemId: string, tenantId: string, updates: Partial<InsertTaskChecklistItem>): Promise<TaskChecklistItem> {
    try {
      const [updatedItem] = await db
        .update(taskChecklistItems)
        .set(updates)
        .where(and(
          eq(taskChecklistItems.id, itemId),
          eq(taskChecklistItems.tenantId, tenantId)
        ))
        .returning();
      
      if (!updatedItem) {
        throw new Error('Checklist item not found');
      }

      logger.info('✅ Checklist item updated', { itemId, updates });
      return updatedItem;
    } catch (error) {
      logger.error('❌ Failed to update checklist item', { error, itemId, updates });
      throw error;
    }
  }

  static async toggleChecklistItem(itemId: string, tenantId: string, userId: string): Promise<TaskChecklistItem> {
    try {
      const [item] = await db
        .select()
        .from(taskChecklistItems)
        .where(and(
          eq(taskChecklistItems.id, itemId),
          eq(taskChecklistItems.tenantId, tenantId)
        ))
        .limit(1);

      if (!item) {
        throw new Error('Checklist item not found');
      }

      const isCompleted = !item.isCompleted;
      const [updatedItem] = await db
        .update(taskChecklistItems)
        .set({
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
          completedBy: isCompleted ? userId : null,
        })
        .where(eq(taskChecklistItems.id, itemId))
        .returning();

      logger.info('✅ Checklist item toggled', { itemId, isCompleted });
      return updatedItem;
    } catch (error) {
      logger.error('❌ Failed to toggle checklist item', { error, itemId });
      throw error;
    }
  }

  static async deleteChecklistItem(itemId: string, tenantId: string): Promise<void> {
    try {
      await db
        .delete(taskChecklistItems)
        .where(and(
          eq(taskChecklistItems.id, itemId),
          eq(taskChecklistItems.tenantId, tenantId)
        ));
      
      logger.info('✅ Checklist item deleted', { itemId });
    } catch (error) {
      logger.error('❌ Failed to delete checklist item', { error, itemId });
      throw error;
    }
  }

  static async getTaskActivity(taskId: string, tenantId: string): Promise<EntityLog[]> {
    try {
      const activityLogs = await db
        .select()
        .from(entityLogs)
        .where(and(
          eq(entityLogs.entityType, 'task'),
          eq(entityLogs.entityId, taskId),
          eq(entityLogs.tenantId, tenantId)
        ))
        .orderBy(desc(entityLogs.createdAt));
      
      logger.info('📋 Task activity retrieved', { taskId, count: activityLogs.length });
      return activityLogs;
    } catch (error) {
      logger.error('❌ Failed to get task activity', { error, taskId });
      throw error;
    }
  }

  static async getTaskAnalytics(tenantId: string): Promise<any> {
    try {
      const allTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.tenantId, tenantId));

      const now = new Date();

      const statusDistribution = allTasks.reduce((acc, task) => {
        const status = task.status || 'todo';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const priorityDistribution = allTasks.reduce((acc, task) => {
        const priority = task.priority || 'medium';
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const departmentDistribution = allTasks.reduce((acc, task) => {
        const department = task.department || 'unassigned';
        acc[department] = (acc[department] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const completedTasks = allTasks.filter(t => t.status === 'done');
      const overdueTasks = allTasks.filter(t => 
        t.dueDate && 
        new Date(t.dueDate) < now && 
        t.status !== 'done' && 
        t.status !== 'archived'
      );

      const completionTrend: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const completedOnDay = completedTasks.filter(t => {
          if (!t.updatedAt) return false;
          const taskDate = new Date(t.updatedAt).toISOString().split('T')[0];
          return taskDate === dateStr;
        }).length;
        completionTrend[dateStr] = completedOnDay;
      }

      const assigneeStats = await db
        .select({
          userId: taskAssignments.userId,
          count: sql<number>`count(*)::int`,
        })
        .from(taskAssignments)
        .innerJoin(tasks, eq(tasks.id, taskAssignments.taskId))
        .where(and(
          eq(tasks.tenantId, tenantId),
          eq(taskAssignments.role, 'assignee')
        ))
        .groupBy(taskAssignments.userId)
        .orderBy(desc(sql`count(*)`))
        .limit(10);

      const userIds = assigneeStats.map(s => s.userId);
      const usersData = userIds.length > 0 ? await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(users)
        .where(inArray(users.id, userIds)) : [];

      const topAssignees = assigneeStats.map(stat => {
        const user = usersData.find(u => u.id === stat.userId);
        const userName = user 
          ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User'
          : 'Unknown User';
        return {
          userId: stat.userId,
          userName,
          taskCount: stat.count,
        };
      });

      logger.info('📊 Task analytics generated', { 
        totalTasks: allTasks.length,
        completed: completedTasks.length,
        overdue: overdueTasks.length
      });

      return {
        overview: {
          totalTasks: allTasks.length,
          completedTasks: completedTasks.length,
          inProgressTasks: allTasks.filter(t => t.status === 'in_progress').length,
          overdueTasks: overdueTasks.length,
        },
        statusDistribution,
        priorityDistribution,
        departmentDistribution,
        completionTrend,
        topAssignees,
      };
    } catch (error) {
      logger.error('❌ Failed to get task analytics', { error });
      throw error;
    }
  }
}
