import { type InsertTask, type Task, type InsertTaskAssignment, type TaskAssignment, type InsertTaskChecklistItem, type TaskChecklistItem, type InsertTaskComment, type TaskComment, type InsertTaskTimeLog, type TaskTimeLog, type InsertTaskDependency, type TaskDependency, type InsertTaskAttachment, type TaskAttachment, type InsertTaskTemplate, type TaskTemplate, type EntityLog } from '../db/schema/w3suite';
export declare class TaskService {
    static createTask(taskData: InsertTask): Promise<Task>;
    static createTaskComplete(data: {
        task: InsertTask;
        assigneeIds?: string[];
        watcherIds?: string[];
        checklistItems?: Array<{
            title: string;
            assignedToUserId?: string;
            position: number;
        }>;
    }): Promise<Task>;
    static duplicateTask(taskId: string, tenantId: string, userId: string): Promise<Task>;
    static getTaskById(taskId: string, tenantId: string): Promise<any | null>;
    static getTasksForUser(userId: string, tenantId: string, filters?: {
        role?: 'assignee' | 'watcher';
        status?: string;
        priority?: string;
        urgency?: string;
        department?: string;
        limit?: number;
        offset?: number;
    }): Promise<Task[]>;
    static getTasksCreatedByUser(userId: string, tenantId: string, filters?: {
        status?: string;
        limit?: number;
        offset?: number;
    }): Promise<Task[]>;
    static updateTask(taskId: string, tenantId: string, updates: Partial<InsertTask>): Promise<Task>;
    static deleteTask(taskId: string, tenantId: string): Promise<void>;
    static assignUser(taskId: string, tenantId: string, userId: string, role: 'assignee' | 'watcher', assignedBy: string): Promise<TaskAssignment>;
    static unassignUser(taskId: string, tenantId: string, userId: string, role: 'assignee' | 'watcher'): Promise<void>;
    static addChecklistItem(itemData: InsertTaskChecklistItem): Promise<TaskChecklistItem>;
    private static recalculateProgress;
    static addComment(commentData: InsertTaskComment): Promise<TaskComment>;
    static updateComment(commentId: string, tenantId: string, content: string): Promise<TaskComment>;
    static deleteComment(commentId: string, tenantId: string): Promise<void>;
    static getComments(taskId: string, tenantId: string): Promise<TaskComment[]>;
    static startTimer(taskId: string, tenantId: string, userId: string, description?: string): Promise<TaskTimeLog>;
    static stopTimer(logId: string, tenantId: string, userId: string): Promise<TaskTimeLog>;
    static getTimeLogs(taskId: string, tenantId: string): Promise<TaskTimeLog[]>;
    private static updateActualHours;
    static addDependency(dependencyData: InsertTaskDependency): Promise<TaskDependency>;
    static removeDependency(dependencyId: string): Promise<void>;
    static getDependencies(taskId: string, tenantId: string): Promise<TaskDependency[]>;
    static addAttachment(attachmentData: InsertTaskAttachment): Promise<TaskAttachment>;
    static createAttachment(taskId: string, tenantId: string, userId: string, file: {
        buffer: Buffer;
        originalname: string;
        mimetype: string;
        size: number;
    }): Promise<TaskAttachment>;
    static deleteAttachment(attachmentId: string, tenantId: string): Promise<void>;
    static getAttachments(taskId: string, tenantId: string): Promise<TaskAttachment[]>;
    static createTemplate(templateData: InsertTaskTemplate): Promise<TaskTemplate>;
    static instantiateTemplate(templateId: string, tenantId: string, creatorId: string, overrides?: Partial<InsertTask>): Promise<Task>;
    static getTemplates(tenantId: string, department?: string): Promise<TaskTemplate[]>;
    static getTasks(tenantId: string, filters?: {
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
    }): Promise<any[]>;
    static getMyTasks(userId: string, tenantId: string): Promise<Task[]>;
    static getCreatedByMe(userId: string, tenantId: string): Promise<Task[]>;
    static getWatchingTasks(userId: string, tenantId: string): Promise<Task[]>;
    static logTime(timeLogData: InsertTaskTimeLog): Promise<TaskTimeLog>;
    static createTaskFromTemplate(templateId: string, tenantId: string, creatorId: string, overrides?: Partial<InsertTask>): Promise<Task>;
    static bulkCreateTasks(tasksData: InsertTask[]): Promise<Task[]>;
    static bulkUpdateTasks(taskIds: string[], tenantId: string, updates: Partial<InsertTask>): Promise<Task[]>;
    static bulkDeleteTasks(taskIds: string[], tenantId: string): Promise<void>;
    static createTaskAssignment(assignmentData: InsertTaskAssignment): Promise<TaskAssignment>;
    static getTaskAssignments(taskId: string, tenantId: string): Promise<TaskAssignment[]>;
    static deleteTaskAssignment(taskId: string, userId: string, role: 'assignee' | 'watcher', tenantId: string): Promise<void>;
    static createChecklistItem(itemData: InsertTaskChecklistItem): Promise<TaskChecklistItem>;
    static getChecklistItems(taskId: string, tenantId: string): Promise<TaskChecklistItem[]>;
    static updateChecklistItem(itemId: string, tenantId: string, updates: Partial<InsertTaskChecklistItem>): Promise<TaskChecklistItem>;
    static toggleChecklistItem(itemId: string, tenantId: string, userId: string): Promise<TaskChecklistItem>;
    static deleteChecklistItem(itemId: string, tenantId: string): Promise<void>;
    static getTaskActivity(taskId: string, tenantId: string): Promise<EntityLog[]>;
    static getTaskAnalytics(tenantId: string): Promise<any>;
}
//# sourceMappingURL=task-service.d.ts.map