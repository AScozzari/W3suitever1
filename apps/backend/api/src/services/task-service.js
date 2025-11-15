"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskService = void 0;
const db_js_1 = require("../core/db.js");
const w3suite_1 = require("../db/schema/w3suite");
const drizzle_orm_1 = require("drizzle-orm");
const logger_1 = require("../core/logger");
const object_storage_1 = require("@replit/object-storage");
const uuid_1 = require("uuid");
// Object Storage configuration
const PRIVATE_DIR = process.env.PRIVATE_OBJECT_DIR || '.private';
// Lazy singleton Object Storage Client
let objectStorageClient = null;
function getObjectStorageClient() {
    if (!objectStorageClient) {
        if (!process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID) {
            throw new Error('Object Storage non configurato. Contattare amministratore (manca DEFAULT_OBJECT_STORAGE_BUCKET_ID)');
        }
        objectStorageClient = new object_storage_1.Client();
        logger_1.logger.info('📦 Object Storage Client initialized');
    }
    return objectStorageClient;
}
class TaskService {
    static async createTask(taskData) {
        try {
            const [task] = await db_js_1.db
                .insert(w3suite_1.tasks)
                .values(taskData)
                .returning();
            logger_1.logger.info('📋 Task created', { taskId: task.id, title: task.title, tenantId: task.tenantId });
            return task;
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to create task', { error, taskData });
            throw error;
        }
    }
    static async createTaskComplete(data) {
        return await db_js_1.db.transaction(async (tx) => {
            const [task] = await tx
                .insert(w3suite_1.tasks)
                .values(data.task)
                .returning();
            const assignmentsToInsert = [
                ...(data.assigneeIds || []).map(userId => ({
                    taskId: task.id,
                    userId,
                    role: 'assignee',
                    tenantId: task.tenantId,
                    assignedBy: data.task.creatorId || task.tenantId,
                })),
                ...(data.watcherIds || []).map(userId => ({
                    taskId: task.id,
                    userId,
                    role: 'watcher',
                    tenantId: task.tenantId,
                    assignedBy: data.task.creatorId || task.tenantId,
                })),
            ];
            if (assignmentsToInsert.length > 0) {
                await tx.insert(w3suite_1.taskAssignments).values(assignmentsToInsert);
            }
            if (data.checklistItems && data.checklistItems.length > 0) {
                const checklistToInsert = data.checklistItems.map(item => ({
                    taskId: task.id,
                    tenantId: task.tenantId,
                    title: item.title,
                    assignedToUserId: item.assignedToUserId,
                    position: item.position,
                    isCompleted: false,
                }));
                await tx.insert(w3suite_1.taskChecklistItems).values(checklistToInsert);
            }
            logger_1.logger.info('📋 Task created (complete)', {
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
    static async duplicateTask(taskId, tenantId, userId) {
        return await db_js_1.db.transaction(async (tx) => {
            const [originalTask] = await tx
                .select()
                .from(w3suite_1.tasks)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_1.tasks.id, taskId), (0, drizzle_orm_1.eq)(w3suite_1.tasks.tenantId, tenantId)))
                .limit(1);
            if (!originalTask) {
                throw new Error('Task not found');
            }
            const originalAssignments = await tx
                .select()
                .from(w3suite_1.taskAssignments)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_1.taskAssignments.taskId, taskId), (0, drizzle_orm_1.eq)(w3suite_1.taskAssignments.tenantId, tenantId)));
            const originalChecklist = await tx
                .select()
                .from(w3suite_1.taskChecklistItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_1.taskChecklistItems.taskId, taskId), (0, drizzle_orm_1.eq)(w3suite_1.taskChecklistItems.tenantId, tenantId)));
            const { id, createdAt, updatedAt, completedAt, ...taskData } = originalTask;
            const [duplicatedTask] = await tx
                .insert(w3suite_1.tasks)
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
                await tx.insert(w3suite_1.taskAssignments).values(newAssignments);
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
                await tx.insert(w3suite_1.taskChecklistItems).values(newChecklist);
            }
            logger_1.logger.info('📋 Task duplicated', {
                originalId: taskId,
                duplicatedId: duplicatedTask.id,
                title: duplicatedTask.title,
                tenantId
            });
            return duplicatedTask;
        });
    }
    static async getTaskById(taskId, tenantId) {
        const [task] = await db_js_1.db
            .select()
            .from(w3suite_1.tasks)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_1.tasks.id, taskId), (0, drizzle_orm_1.eq)(w3suite_1.tasks.tenantId, tenantId)))
            .limit(1);
        if (!task)
            return null;
        // Fetch watchers inline
        const watchers = await db_js_1.db
            .select()
            .from(w3suite_1.taskAssignments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_1.taskAssignments.taskId, taskId), (0, drizzle_orm_1.eq)(w3suite_1.taskAssignments.tenantId, tenantId), (0, drizzle_orm_1.eq)(w3suite_1.taskAssignments.role, 'watcher')));
        // Fetch all related data in parallel
        const [assignees, checklist, comments, attachments, timeLogs] = await Promise.all([
            this.getTaskAssignments(taskId, tenantId),
            this.getChecklistItems(taskId, tenantId),
            this.getComments(taskId, tenantId),
            this.getAttachments(taskId, tenantId),
            this.getTimeLogs(taskId, tenantId)
        ]);
        // Return task with all relations
        return {
            ...task,
            assignees: assignees
                .filter(a => a.role === 'assignee')
                .map(a => ({
                id: a.userId,
                userId: a.userId,
                role: a.role,
                assignedAt: a.assignedAt
            })),
            checklist: checklist.map(c => ({
                id: c.id,
                title: c.title,
                completed: c.isCompleted,
                isCompleted: c.isCompleted,
                order: c.position,
                position: c.position,
                dueDate: c.dueDate,
                description: c.description,
                assignedToUserId: c.assignedToUserId
            })),
            comments: comments.map(c => ({
                id: c.id,
                content: c.content,
                createdAt: c.createdAt,
                userId: c.userId,
                user: { id: c.userId, name: c.userId }
            })),
            attachments: attachments.map(a => ({
                id: a.id,
                fileName: a.fileName,
                fileUrl: a.objectStorageKey,
                mimeType: a.mimeType,
                fileSize: a.fileSize,
                uploadedById: a.uploadedById,
                uploadedAt: a.uploadedAt
            })),
            watchers: watchers.map(w => ({
                id: w.userId,
                userId: w.userId,
                addedAt: w.assignedAt
            })),
            timeTracking: timeLogs.map(t => ({
                id: t.id,
                userId: t.userId,
                userName: t.userId,
                startTime: t.startTime,
                endTime: t.endTime,
                duration: t.durationMinutes
            }))
        };
    }
    static async getTasksForUser(userId, tenantId, filters) {
        const assignmentQuery = db_js_1.db
            .select({ taskId: w3suite_1.taskAssignments.taskId })
            .from(w3suite_1.taskAssignments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_1.taskAssignments.userId, userId), filters?.role ? (0, drizzle_orm_1.eq)(w3suite_1.taskAssignments.role, filters.role) : undefined));
        const taskIds = (await assignmentQuery).map((a) => a.taskId);
        if (taskIds.length === 0) {
            return [];
        }
        // Smart Priority Score
        const priorityScore = (0, drizzle_orm_1.sql) `
      CASE ${w3suite_1.tasks.urgency}
        WHEN 'critical' THEN 40
        WHEN 'high' THEN 30
        WHEN 'medium' THEN 20
        WHEN 'low' THEN 10
        ELSE 0
      END +
      CASE ${w3suite_1.tasks.priority}
        WHEN 'high' THEN 9
        WHEN 'medium' THEN 6
        WHEN 'low' THEN 3
        ELSE 0
      END
    `;
        let query = db_js_1.db
            .select()
            .from(w3suite_1.tasks)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_1.tasks.tenantId, tenantId), (0, drizzle_orm_1.inArray)(w3suite_1.tasks.id, taskIds), filters?.status ? (0, drizzle_orm_1.eq)(w3suite_1.tasks.status, filters.status) : undefined, filters?.priority ? (0, drizzle_orm_1.eq)(w3suite_1.tasks.priority, filters.priority) : undefined, filters?.urgency ? (0, drizzle_orm_1.eq)(w3suite_1.tasks.urgency, filters.urgency) : undefined, filters?.department ? (0, drizzle_orm_1.eq)(w3suite_1.tasks.department, filters.department) : undefined))
            .orderBy((0, drizzle_orm_1.desc)(priorityScore), (0, drizzle_orm_1.desc)(w3suite_1.tasks.createdAt));
        if (filters?.limit) {
            query = query.limit(filters.limit);
        }
        if (filters?.offset) {
            query = query.offset(filters.offset);
        }
        return query;
    }
    static async getTasksCreatedByUser(userId, tenantId, filters) {
        let query = db_js_1.db
            .select()
            .from(w3suite_1.tasks)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_1.tasks.tenantId, tenantId), (0, drizzle_orm_1.eq)(w3suite_1.tasks.creatorId, userId), filters?.status ? (0, drizzle_orm_1.eq)(w3suite_1.tasks.status, filters.status) : undefined))
            .orderBy((0, drizzle_orm_1.desc)(w3suite_1.tasks.createdAt));
        if (filters?.limit) {
            query = query.limit(filters.limit);
        }
        if (filters?.offset) {
            query = query.offset(filters.offset);
        }
        return query;
    }
    static async updateTask(taskId, tenantId, updates) {
        const [updated] = await db_js_1.db
            .update(w3suite_1.tasks)
            .set({
            ...updates,
            updatedAt: new Date()
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_1.tasks.id, taskId), (0, drizzle_orm_1.eq)(w3suite_1.tasks.tenantId, tenantId)))
            .returning();
        if (!updated) {
            throw new Error('Task not found');
        }
        logger_1.logger.info('📋 Task updated', { taskId, updates });
        return updated;
    }
    static async deleteTask(taskId, tenantId) {
        await db_js_1.db
            .delete(w3suite_1.tasks)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_1.tasks.id, taskId), (0, drizzle_orm_1.eq)(w3suite_1.tasks.tenantId, tenantId)));
        logger_1.logger.info('📋 Task deleted', { taskId, tenantId });
    }
    static async assignUser(taskId, tenantId, userId, role, assignedBy) {
        const [assignment] = await db_js_1.db
            .insert(w3suite_1.taskAssignments)
            .values({
            taskId,
            tenantId,
            userId,
            role,
            assignedBy
        })
            .returning();
        logger_1.logger.info('👤 User assigned to task', { taskId, userId, role });
        return assignment;
    }
    static async unassignUser(taskId, tenantId, userId, role) {
        await db_js_1.db
            .delete(w3suite_1.taskAssignments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_1.taskAssignments.taskId, taskId), (0, drizzle_orm_1.eq)(w3suite_1.taskAssignments.tenantId, tenantId), (0, drizzle_orm_1.eq)(w3suite_1.taskAssignments.userId, userId), (0, drizzle_orm_1.eq)(w3suite_1.taskAssignments.role, role)));
        logger_1.logger.info('👤 User unassigned from task', { taskId, userId, role });
    }
    static async addChecklistItem(itemData) {
        const [item] = await db_js_1.db
            .insert(w3suite_1.taskChecklistItems)
            .values(itemData)
            .returning();
        await this.recalculateProgress(itemData.taskId, itemData.tenantId);
        logger_1.logger.info('✅ Checklist item added', { taskId: itemData.taskId, itemId: item.id });
        return item;
    }
    static async recalculateProgress(taskId, tenantId) {
        const items = await this.getChecklistItems(taskId, tenantId);
        if (items.length === 0) {
            await db_js_1.db
                .update(w3suite_1.tasks)
                .set({ completionPercentage: 0 })
                .where((0, drizzle_orm_1.eq)(w3suite_1.tasks.id, taskId));
            return;
        }
        const completedCount = items.filter(i => i.isCompleted).length;
        const percentage = Math.round((completedCount / items.length) * 100);
        await db_js_1.db
            .update(w3suite_1.tasks)
            .set({
            completionPercentage: percentage,
            updatedAt: new Date()
        })
            .where((0, drizzle_orm_1.eq)(w3suite_1.tasks.id, taskId));
        logger_1.logger.debug('📊 Task progress recalculated', {
            taskId,
            percentage,
            completed: completedCount,
            total: items.length
        });
    }
    static async addComment(commentData) {
        const [comment] = await db_js_1.db
            .insert(w3suite_1.taskComments)
            .values(commentData)
            .returning();
        logger_1.logger.info('💬 Comment added to task', {
            taskId: commentData.taskId,
            commentId: comment.id
        });
        return comment;
    }
    static async updateComment(commentId, tenantId, content) {
        const [updated] = await db_js_1.db
            .update(w3suite_1.taskComments)
            .set({
            content,
            isEdited: true,
            updatedAt: new Date()
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_1.taskComments.id, commentId), (0, drizzle_orm_1.eq)(w3suite_1.taskComments.tenantId, tenantId)))
            .returning();
        if (!updated) {
            throw new Error('Comment not found');
        }
        return updated;
    }
    static async deleteComment(commentId, tenantId) {
        await db_js_1.db
            .update(w3suite_1.taskComments)
            .set({ deletedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_1.taskComments.id, commentId), (0, drizzle_orm_1.eq)(w3suite_1.taskComments.tenantId, tenantId)));
        logger_1.logger.info('💬 Comment deleted', { commentId });
    }
    static async getComments(taskId, tenantId) {
        return db_js_1.db
            .select()
            .from(w3suite_1.taskComments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_1.taskComments.taskId, taskId), (0, drizzle_orm_1.eq)(w3suite_1.taskComments.tenantId, tenantId), (0, drizzle_orm_1.isNull)(w3suite_1.taskComments.deletedAt)))
            .orderBy((0, drizzle_orm_1.desc)(w3suite_1.taskComments.createdAt));
    }
    static async startTimer(taskId, tenantId, userId, description) {
        const existing = await db_js_1.db
            .select()
            .from(w3suite_1.taskTimeLogs)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_1.taskTimeLogs.userId, userId), (0, drizzle_orm_1.isNull)(w3suite_1.taskTimeLogs.endedAt)))
            .limit(1);
        if (existing.length > 0) {
            throw new Error('User already has a running timer');
        }
        const [timeLog] = await db_js_1.db
            .insert(w3suite_1.taskTimeLogs)
            .values({
            taskId,
            tenantId,
            userId,
            startedAt: new Date(),
            description
        })
            .returning();
        logger_1.logger.info('⏱️ Timer started', { taskId, userId, logId: timeLog.id });
        return timeLog;
    }
    static async stopTimer(logId, tenantId, userId) {
        const endTime = new Date();
        const [log] = await db_js_1.db
            .select()
            .from(w3suite_1.taskTimeLogs)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_1.taskTimeLogs.id, logId), (0, drizzle_orm_1.eq)(w3suite_1.taskTimeLogs.tenantId, tenantId), (0, drizzle_orm_1.eq)(w3suite_1.taskTimeLogs.userId, userId)))
            .limit(1);
        if (!log) {
            throw new Error('Time log not found');
        }
        if (log.endedAt) {
            throw new Error('Timer already stopped');
        }
        const duration = Math.floor((endTime.getTime() - log.startedAt.getTime()) / 1000);
        const [updated] = await db_js_1.db
            .update(w3suite_1.taskTimeLogs)
            .set({
            endedAt: endTime,
            duration
        })
            .where((0, drizzle_orm_1.eq)(w3suite_1.taskTimeLogs.id, logId))
            .returning();
        await this.updateActualHours(log.taskId, tenantId);
        logger_1.logger.info('⏱️ Timer stopped', {
            logId,
            duration: `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`
        });
        return updated;
    }
    static async getTimeLogs(taskId, tenantId) {
        return db_js_1.db
            .select()
            .from(w3suite_1.taskTimeLogs)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_1.taskTimeLogs.taskId, taskId), (0, drizzle_orm_1.eq)(w3suite_1.taskTimeLogs.tenantId, tenantId)))
            .orderBy((0, drizzle_orm_1.desc)(w3suite_1.taskTimeLogs.startedAt));
    }
    static async updateActualHours(taskId, tenantId) {
        const logs = await this.getTimeLogs(taskId, tenantId);
        const totalSeconds = logs
            .filter(l => l.duration)
            .reduce((sum, l) => sum + (l.duration || 0), 0);
        const actualHours = totalSeconds / 3600;
        await db_js_1.db
            .update(w3suite_1.tasks)
            .set({
            actualHours,
            updatedAt: new Date()
        })
            .where((0, drizzle_orm_1.eq)(w3suite_1.tasks.id, taskId));
    }
    static async addDependency(dependencyData) {
        if (dependencyData.taskId === dependencyData.dependentTaskId) {
            throw new Error('Task cannot depend on itself');
        }
        const [dependency] = await db_js_1.db
            .insert(w3suite_1.taskDependencies)
            .values(dependencyData)
            .returning();
        logger_1.logger.info('🔗 Task dependency added', {
            taskId: dependencyData.taskId,
            dependsOn: dependencyData.dependentTaskId
        });
        return dependency;
    }
    static async removeDependency(dependencyId) {
        await db_js_1.db
            .delete(w3suite_1.taskDependencies)
            .where((0, drizzle_orm_1.eq)(w3suite_1.taskDependencies.id, dependencyId));
        logger_1.logger.info('🔗 Task dependency removed', { dependencyId });
    }
    static async getDependencies(taskId, tenantId) {
        return db_js_1.db
            .select()
            .from(w3suite_1.taskDependencies)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_1.taskDependencies.taskId, taskId), (0, drizzle_orm_1.eq)(w3suite_1.taskDependencies.tenantId, tenantId)));
    }
    static async addAttachment(attachmentData) {
        const [attachment] = await db_js_1.db
            .insert(w3suite_1.taskAttachments)
            .values(attachmentData)
            .returning();
        logger_1.logger.info('📎 Attachment added to task', {
            taskId: attachmentData.taskId,
            fileName: attachmentData.fileName
        });
        return attachment;
    }
    static async createAttachment(taskId, tenantId, userId, file) {
        try {
            // Validate file input
            if (!file || !file.buffer || !file.originalname || !file.mimetype) {
                throw new Error('File non valido: buffer, nome o mimetype mancanti');
            }
            // Get Object Storage client
            const client = getObjectStorageClient();
            // Generate unique object path
            const fileExt = file.originalname.split('.').pop() || '';
            const uniqueFileName = `${(0, uuid_1.v4)()}.${fileExt}`;
            const objectPath = `${PRIVATE_DIR}/tasks/${tenantId}/${taskId}/${uniqueFileName}`;
            // Upload to Object Storage
            const { ok, error } = await client.uploadFromBytes(objectPath, file.buffer);
            if (!ok) {
                logger_1.logger.error('❌ Failed to upload attachment to Object Storage', {
                    error,
                    taskId,
                    fileName: file.originalname
                });
                throw new Error('Errore durante upload file: ' + error);
            }
            // Save metadata to database
            const attachmentData = {
                taskId,
                tenantId,
                uploadedBy: userId,
                fileName: file.originalname,
                fileSize: file.size,
                mimeType: file.mimetype,
                fileUrl: objectPath
            };
            const [attachment] = await db_js_1.db
                .insert(w3suite_1.taskAttachments)
                .values(attachmentData)
                .returning();
            logger_1.logger.info('📎 Attachment uploaded successfully', {
                taskId,
                fileName: file.originalname,
                objectPath,
                size: file.size,
                attachmentId: attachment.id
            });
            return attachment;
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to create attachment', { error, taskId, fileName: file.originalname });
            throw error;
        }
    }
    static async deleteAttachment(attachmentId, tenantId) {
        try {
            // First get attachment to retrieve fileUrl
            const [attachment] = await db_js_1.db
                .select()
                .from(w3suite_1.taskAttachments)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_1.taskAttachments.id, attachmentId), (0, drizzle_orm_1.eq)(w3suite_1.taskAttachments.tenantId, tenantId)))
                .limit(1);
            if (!attachment) {
                throw new Error('Attachment not found');
            }
            // Delete from Object Storage
            if (attachment.fileUrl) {
                const client = getObjectStorageClient();
                const { ok, error } = await client.delete(attachment.fileUrl);
                if (!ok) {
                    logger_1.logger.error('❌ Failed to delete file from Object Storage', {
                        error,
                        fileUrl: attachment.fileUrl,
                        attachmentId
                    });
                    throw new Error(`Errore eliminazione file da Object Storage: ${error}`);
                }
                logger_1.logger.info('🗑️  File deleted from Object Storage', {
                    fileUrl: attachment.fileUrl
                });
            }
            // Delete from database
            await db_js_1.db
                .delete(w3suite_1.taskAttachments)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_1.taskAttachments.id, attachmentId), (0, drizzle_orm_1.eq)(w3suite_1.taskAttachments.tenantId, tenantId)));
            logger_1.logger.info('📎 Attachment deleted successfully', {
                attachmentId,
                fileName: attachment.fileName
            });
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to delete attachment', { error, attachmentId });
            throw error;
        }
    }
    static async getAttachments(taskId, tenantId) {
        return db_js_1.db
            .select()
            .from(w3suite_1.taskAttachments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_1.taskAttachments.taskId, taskId), (0, drizzle_orm_1.eq)(w3suite_1.taskAttachments.tenantId, tenantId)))
            .orderBy((0, drizzle_orm_1.desc)(w3suite_1.taskAttachments.uploadedAt));
    }
    static async createTemplate(templateData) {
        const [template] = await db_js_1.db
            .insert(w3suite_1.taskTemplates)
            .values(templateData)
            .returning();
        logger_1.logger.info('📝 Task template created', {
            templateId: template.id,
            name: template.name
        });
        return template;
    }
    static async instantiateTemplate(templateId, tenantId, creatorId, overrides) {
        const [template] = await db_js_1.db
            .select()
            .from(w3suite_1.taskTemplates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_1.taskTemplates.id, templateId), (0, drizzle_orm_1.eq)(w3suite_1.taskTemplates.tenantId, tenantId), (0, drizzle_orm_1.eq)(w3suite_1.taskTemplates.isActive, true)))
            .limit(1);
        if (!template) {
            throw new Error('Template not found or inactive');
        }
        const templateData = template.templateData;
        const taskData = {
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
        await db_js_1.db
            .update(w3suite_1.taskTemplates)
            .set({ lastInstantiatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(w3suite_1.taskTemplates.id, templateId));
        logger_1.logger.info('📝 Task created from template', {
            templateId,
            taskId: task.id
        });
        return task;
    }
    static async getTemplates(tenantId, department) {
        return db_js_1.db
            .select()
            .from(w3suite_1.taskTemplates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_1.taskTemplates.tenantId, tenantId), (0, drizzle_orm_1.eq)(w3suite_1.taskTemplates.isActive, true), department ? (0, drizzle_orm_1.eq)(w3suite_1.taskTemplates.department, department) : undefined))
            .orderBy((0, drizzle_orm_1.desc)(w3suite_1.taskTemplates.createdAt));
    }
    static async getTasks(tenantId, filters) {
        // Smart Priority Score: urgency*10 + priority*3
        // critical/high = 40+9=49 (TOP), urgent/medium = 30+6=36, etc.
        const priorityScore = (0, drizzle_orm_1.sql) `
      CASE ${w3suite_1.tasks.urgency}
        WHEN 'critical' THEN 40
        WHEN 'high' THEN 30
        WHEN 'medium' THEN 20
        WHEN 'low' THEN 10
        ELSE 0
      END +
      CASE ${w3suite_1.tasks.priority}
        WHEN 'high' THEN 9
        WHEN 'medium' THEN 6
        WHEN 'low' THEN 3
        ELSE 0
      END
    `;
        const assigneeCountSq = db_js_1.db
            .select({
            taskId: w3suite_1.taskAssignments.taskId,
            assigneeCount: (0, drizzle_orm_1.sql) `count(*)::int`.as('assigneeCount')
        })
            .from(w3suite_1.taskAssignments)
            .where((0, drizzle_orm_1.eq)(w3suite_1.taskAssignments.role, 'assignee'))
            .groupBy(w3suite_1.taskAssignments.taskId)
            .as('assignee_counts');
        const commentCountSq = db_js_1.db
            .select({
            taskId: w3suite_1.taskComments.taskId,
            commentCount: (0, drizzle_orm_1.sql) `count(*)::int`.as('commentCount')
        })
            .from(w3suite_1.taskComments)
            .groupBy(w3suite_1.taskComments.taskId)
            .as('comment_counts');
        const attachmentCountSq = db_js_1.db
            .select({
            taskId: w3suite_1.taskAttachments.taskId,
            attachmentCount: (0, drizzle_orm_1.sql) `count(*)::int`.as('attachmentCount')
        })
            .from(w3suite_1.taskAttachments)
            .groupBy(w3suite_1.taskAttachments.taskId)
            .as('attachment_counts');
        const checklistStatsSq = db_js_1.db
            .select({
            taskId: w3suite_1.taskChecklistItems.taskId,
            total: (0, drizzle_orm_1.sql) `count(*)::int`.as('total'),
            completed: (0, drizzle_orm_1.sql) `count(*) FILTER (WHERE ${w3suite_1.taskChecklistItems.isCompleted} = true)::int`.as('completed')
        })
            .from(w3suite_1.taskChecklistItems)
            .groupBy(w3suite_1.taskChecklistItems.taskId)
            .as('checklist_stats');
        let query = db_js_1.db
            .select({
            ...(0, drizzle_orm_1.getTableColumns)(w3suite_1.tasks),
            assigneeCount: (0, drizzle_orm_1.sql) `COALESCE(${assigneeCountSq.assigneeCount}, 0)`,
            commentCount: (0, drizzle_orm_1.sql) `COALESCE(${commentCountSq.commentCount}, 0)`,
            attachmentCount: (0, drizzle_orm_1.sql) `COALESCE(${attachmentCountSq.attachmentCount}, 0)`,
            checklistProgress: (0, drizzle_orm_1.sql) `
          CASE 
            WHEN ${checklistStatsSq.total} > 0 
            THEN json_build_object('completed', ${checklistStatsSq.completed}, 'total', ${checklistStatsSq.total})
            ELSE NULL
          END
        `
        })
            .from(w3suite_1.tasks)
            .leftJoin(assigneeCountSq, (0, drizzle_orm_1.eq)(w3suite_1.tasks.id, assigneeCountSq.taskId))
            .leftJoin(commentCountSq, (0, drizzle_orm_1.eq)(w3suite_1.tasks.id, commentCountSq.taskId))
            .leftJoin(attachmentCountSq, (0, drizzle_orm_1.eq)(w3suite_1.tasks.id, attachmentCountSq.taskId))
            .leftJoin(checklistStatsSq, (0, drizzle_orm_1.eq)(w3suite_1.tasks.id, checklistStatsSq.taskId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_1.tasks.tenantId, tenantId), filters?.status ? (0, drizzle_orm_1.eq)(w3suite_1.tasks.status, filters.status) : undefined, filters?.priority ? (0, drizzle_orm_1.eq)(w3suite_1.tasks.priority, filters.priority) : undefined, filters?.urgency ? (0, drizzle_orm_1.eq)(w3suite_1.tasks.urgency, filters.urgency) : undefined, filters?.createdByUserId ? (0, drizzle_orm_1.eq)(w3suite_1.tasks.creatorId, filters.createdByUserId) : undefined, filters?.department ? (0, drizzle_orm_1.eq)(w3suite_1.tasks.department, filters.department) : undefined, filters?.linkedWorkflowInstanceId ? (0, drizzle_orm_1.eq)(w3suite_1.tasks.linkedWorkflowInstanceId, filters.linkedWorkflowInstanceId) : undefined, filters?.dueBefore ? (0, drizzle_orm_1.lte)(w3suite_1.tasks.dueDate, new Date(filters.dueBefore)) : undefined, filters?.dueAfter ? (0, drizzle_orm_1.gte)(w3suite_1.tasks.dueDate, new Date(filters.dueAfter)) : undefined))
            .orderBy((0, drizzle_orm_1.desc)(priorityScore), (0, drizzle_orm_1.desc)(w3suite_1.tasks.createdAt));
        if (filters?.limit) {
            query = query.limit(filters.limit);
        }
        if (filters?.offset) {
            query = query.offset(filters.offset);
        }
        return query;
    }
    static async getMyTasks(userId, tenantId) {
        return this.getTasksForUser(userId, tenantId, { role: 'assignee' });
    }
    static async getCreatedByMe(userId, tenantId) {
        return this.getTasksCreatedByUser(userId, tenantId);
    }
    static async getWatchingTasks(userId, tenantId) {
        return this.getTasksForUser(userId, tenantId, { role: 'watcher' });
    }
    static async logTime(timeLogData) {
        const [timeLog] = await db_js_1.db
            .insert(w3suite_1.taskTimeLogs)
            .values(timeLogData)
            .returning();
        await this.updateActualHours(timeLog.taskId, timeLogData.tenantId);
        logger_1.logger.info('⏱️ Time logged', {
            taskId: timeLog.taskId,
            userId: timeLog.userId,
            duration: timeLog.endedAt && timeLog.startedAt
                ? (timeLog.endedAt.getTime() - timeLog.startedAt.getTime()) / (1000 * 60 * 60)
                : 0
        });
        return timeLog;
    }
    static async createTaskFromTemplate(templateId, tenantId, creatorId, overrides) {
        return this.instantiateTemplate(templateId, tenantId, creatorId, overrides);
    }
    static async bulkCreateTasks(tasksData) {
        return db_js_1.db.transaction(async (tx) => {
            const createdTasks = await tx
                .insert(w3suite_1.tasks)
                .values(tasksData)
                .returning();
            logger_1.logger.info('📋 Bulk tasks created', { count: createdTasks.length });
            return createdTasks;
        });
    }
    static async bulkUpdateTasks(taskIds, tenantId, updates) {
        return db_js_1.db.transaction(async (tx) => {
            const existingTasks = await tx
                .select()
                .from(w3suite_1.tasks)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(w3suite_1.tasks.id, taskIds), (0, drizzle_orm_1.eq)(w3suite_1.tasks.tenantId, tenantId)));
            if (existingTasks.length !== taskIds.length) {
                throw new Error('Some tasks not found or access denied');
            }
            const updatedTasks = await tx
                .update(w3suite_1.tasks)
                .set({
                ...updates,
                updatedAt: new Date()
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(w3suite_1.tasks.id, taskIds), (0, drizzle_orm_1.eq)(w3suite_1.tasks.tenantId, tenantId)))
                .returning();
            logger_1.logger.info('📋 Bulk tasks updated', { count: updatedTasks.length });
            return updatedTasks;
        });
    }
    static async bulkDeleteTasks(taskIds, tenantId) {
        return db_js_1.db.transaction(async (tx) => {
            const existingTasks = await tx
                .select()
                .from(w3suite_1.tasks)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(w3suite_1.tasks.id, taskIds), (0, drizzle_orm_1.eq)(w3suite_1.tasks.tenantId, tenantId)));
            if (existingTasks.length !== taskIds.length) {
                throw new Error('Some tasks not found or access denied');
            }
            await tx
                .delete(w3suite_1.taskAttachments)
                .where((0, drizzle_orm_1.inArray)(w3suite_1.taskAttachments.taskId, taskIds));
            await tx
                .delete(w3suite_1.taskDependencies)
                .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.inArray)(w3suite_1.taskDependencies.taskId, taskIds), (0, drizzle_orm_1.inArray)(w3suite_1.taskDependencies.dependentTaskId, taskIds)));
            await tx
                .delete(w3suite_1.taskAssignments)
                .where((0, drizzle_orm_1.inArray)(w3suite_1.taskAssignments.taskId, taskIds));
            await tx
                .delete(w3suite_1.taskChecklistItems)
                .where((0, drizzle_orm_1.inArray)(w3suite_1.taskChecklistItems.taskId, taskIds));
            await tx
                .delete(w3suite_1.taskTimeLogs)
                .where((0, drizzle_orm_1.inArray)(w3suite_1.taskTimeLogs.taskId, taskIds));
            await tx
                .delete(w3suite_1.taskComments)
                .where((0, drizzle_orm_1.inArray)(w3suite_1.taskComments.taskId, taskIds));
            await tx
                .delete(w3suite_1.tasks)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(w3suite_1.tasks.id, taskIds), (0, drizzle_orm_1.eq)(w3suite_1.tasks.tenantId, tenantId)));
            logger_1.logger.info('📋 Bulk tasks deleted', { count: taskIds.length });
        });
    }
    static async createTaskAssignment(assignmentData) {
        try {
            const [assignment] = await db_js_1.db
                .insert(w3suite_1.taskAssignments)
                .values(assignmentData)
                .returning();
            logger_1.logger.info('👤 Task assignment created', {
                taskId: assignment.taskId,
                userId: assignment.userId,
                role: assignment.role
            });
            return assignment;
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to create task assignment', { error, assignmentData });
            throw error;
        }
    }
    static async getTaskAssignments(taskId, tenantId) {
        try {
            const assignments = await db_js_1.db
                .select()
                .from(w3suite_1.taskAssignments)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_1.taskAssignments.taskId, taskId), (0, drizzle_orm_1.eq)(w3suite_1.taskAssignments.tenantId, tenantId)));
            return assignments;
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to get task assignments', { error, taskId });
            throw error;
        }
    }
    static async deleteTaskAssignment(taskId, userId, role, tenantId) {
        try {
            await db_js_1.db
                .delete(w3suite_1.taskAssignments)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_1.taskAssignments.taskId, taskId), (0, drizzle_orm_1.eq)(w3suite_1.taskAssignments.userId, userId), (0, drizzle_orm_1.eq)(w3suite_1.taskAssignments.role, role), (0, drizzle_orm_1.eq)(w3suite_1.taskAssignments.tenantId, tenantId)));
            logger_1.logger.info('👤 Task assignment deleted', { taskId, userId, role });
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to delete task assignment', { error, taskId, userId, role });
            throw error;
        }
    }
    static async createChecklistItem(itemData) {
        try {
            const [item] = await db_js_1.db
                .insert(w3suite_1.taskChecklistItems)
                .values(itemData)
                .returning();
            logger_1.logger.info('✅ Checklist item created', { taskId: item.taskId, itemId: item.id, title: item.title });
            return item;
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to create checklist item', { error, itemData });
            throw error;
        }
    }
    static async getChecklistItems(taskId, tenantId) {
        try {
            const items = await db_js_1.db
                .select()
                .from(w3suite_1.taskChecklistItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_1.taskChecklistItems.taskId, taskId), (0, drizzle_orm_1.eq)(w3suite_1.taskChecklistItems.tenantId, tenantId)))
                .orderBy((0, drizzle_orm_1.asc)(w3suite_1.taskChecklistItems.position));
            return items;
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to get checklist items', { error, taskId });
            throw error;
        }
    }
    static async updateChecklistItem(itemId, tenantId, updates) {
        try {
            const [updatedItem] = await db_js_1.db
                .update(w3suite_1.taskChecklistItems)
                .set(updates)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_1.taskChecklistItems.id, itemId), (0, drizzle_orm_1.eq)(w3suite_1.taskChecklistItems.tenantId, tenantId)))
                .returning();
            if (!updatedItem) {
                throw new Error('Checklist item not found');
            }
            logger_1.logger.info('✅ Checklist item updated', { itemId, updates });
            return updatedItem;
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to update checklist item', { error, itemId, updates });
            throw error;
        }
    }
    static async toggleChecklistItem(itemId, tenantId, userId) {
        try {
            const [item] = await db_js_1.db
                .select()
                .from(w3suite_1.taskChecklistItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_1.taskChecklistItems.id, itemId), (0, drizzle_orm_1.eq)(w3suite_1.taskChecklistItems.tenantId, tenantId)))
                .limit(1);
            if (!item) {
                throw new Error('Checklist item not found');
            }
            const isCompleted = !item.isCompleted;
            const [updatedItem] = await db_js_1.db
                .update(w3suite_1.taskChecklistItems)
                .set({
                isCompleted,
                completedAt: isCompleted ? new Date() : null,
                completedBy: isCompleted ? userId : null,
            })
                .where((0, drizzle_orm_1.eq)(w3suite_1.taskChecklistItems.id, itemId))
                .returning();
            logger_1.logger.info('✅ Checklist item toggled', { itemId, isCompleted });
            return updatedItem;
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to toggle checklist item', { error, itemId });
            throw error;
        }
    }
    static async deleteChecklistItem(itemId, tenantId) {
        try {
            await db_js_1.db
                .delete(w3suite_1.taskChecklistItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_1.taskChecklistItems.id, itemId), (0, drizzle_orm_1.eq)(w3suite_1.taskChecklistItems.tenantId, tenantId)));
            logger_1.logger.info('✅ Checklist item deleted', { itemId });
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to delete checklist item', { error, itemId });
            throw error;
        }
    }
    static async getTaskActivity(taskId, tenantId) {
        try {
            const activityLogs = await db_js_1.db
                .select()
                .from(w3suite_1.entityLogs)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_1.entityLogs.entityType, 'task'), (0, drizzle_orm_1.eq)(w3suite_1.entityLogs.entityId, taskId), (0, drizzle_orm_1.eq)(w3suite_1.entityLogs.tenantId, tenantId)))
                .orderBy((0, drizzle_orm_1.desc)(w3suite_1.entityLogs.createdAt));
            logger_1.logger.info('📋 Task activity retrieved', { taskId, count: activityLogs.length });
            return activityLogs;
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to get task activity', { error, taskId });
            throw error;
        }
    }
    static async getTaskAnalytics(tenantId) {
        try {
            const allTasks = await db_js_1.db
                .select()
                .from(w3suite_1.tasks)
                .where((0, drizzle_orm_1.eq)(w3suite_1.tasks.tenantId, tenantId));
            const now = new Date();
            const statusDistribution = allTasks.reduce((acc, task) => {
                const status = task.status || 'todo';
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {});
            const priorityDistribution = allTasks.reduce((acc, task) => {
                const priority = task.priority || 'medium';
                acc[priority] = (acc[priority] || 0) + 1;
                return acc;
            }, {});
            const departmentDistribution = allTasks.reduce((acc, task) => {
                const department = task.department || 'unassigned';
                acc[department] = (acc[department] || 0) + 1;
                return acc;
            }, {});
            const completedTasks = allTasks.filter(t => t.status === 'done');
            const overdueTasks = allTasks.filter(t => t.dueDate &&
                new Date(t.dueDate) < now &&
                t.status !== 'done' &&
                t.status !== 'archived');
            const completionTrend = {};
            for (let i = 29; i >= 0; i--) {
                const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                const dateStr = date.toISOString().split('T')[0];
                const completedOnDay = completedTasks.filter(t => {
                    if (!t.updatedAt)
                        return false;
                    const taskDate = new Date(t.updatedAt).toISOString().split('T')[0];
                    return taskDate === dateStr;
                }).length;
                completionTrend[dateStr] = completedOnDay;
            }
            const assigneeStats = await db_js_1.db
                .select({
                userId: w3suite_1.taskAssignments.userId,
                count: (0, drizzle_orm_1.sql) `count(*)::int`,
            })
                .from(w3suite_1.taskAssignments)
                .innerJoin(w3suite_1.tasks, (0, drizzle_orm_1.eq)(w3suite_1.tasks.id, w3suite_1.taskAssignments.taskId))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_1.tasks.tenantId, tenantId), (0, drizzle_orm_1.eq)(w3suite_1.taskAssignments.role, 'assignee')))
                .groupBy(w3suite_1.taskAssignments.userId)
                .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `count(*)`))
                .limit(10);
            const userIds = assigneeStats.map(s => s.userId);
            const usersData = userIds.length > 0 ? await db_js_1.db
                .select({
                id: w3suite_1.users.id,
                firstName: w3suite_1.users.firstName,
                lastName: w3suite_1.users.lastName,
            })
                .from(w3suite_1.users)
                .where((0, drizzle_orm_1.inArray)(w3suite_1.users.id, userIds)) : [];
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
            logger_1.logger.info('📊 Task analytics generated', {
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
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to get task analytics', { error });
            throw error;
        }
    }
}
exports.TaskService = TaskService;
