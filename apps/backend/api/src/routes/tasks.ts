import express, { Request, Response } from 'express';
import { TaskService } from '../services/task-service';
import { tenantMiddleware, rbacMiddleware, requirePermission } from '../middleware/tenant';
import { handleApiError, validateRequestBody, parseUUIDParam } from '../core/error-utils';
import { z } from 'zod';
import {
  insertTaskSchema,
  insertTaskAssignmentSchema,
  insertTaskChecklistItemSchema,
  insertTaskCommentSchema,
  insertTaskTimeLogSchema,
  insertTaskDependencySchema,
  insertTaskAttachmentSchema,
  insertTaskTemplateSchema,
  InsertTask,
  InsertTaskAssignment,
  InsertTaskChecklistItem,
  InsertTaskComment,
  InsertTaskTimeLog,
  InsertTaskDependency,
  InsertTaskAttachment,
  InsertTaskTemplate
} from '../db/schema/w3suite';

const router = express.Router();

router.use(tenantMiddleware);
router.use(rbacMiddleware);

const createTaskBodySchema = insertTaskSchema.omit({ tenantId: true });
const updateTaskBodySchema = insertTaskSchema.omit({ tenantId: true }).partial();

const taskFiltersSchema = z.object({
  status: z.enum(['todo', 'in_progress', 'review', 'done', 'archived']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  urgency: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assignedUserId: z.string().uuid().optional(),
  createdByUserId: z.string().uuid().optional(),
  department: z.enum(['hr', 'operations', 'support', 'finance', 'crm', 'sales', 'marketing']).optional(),
  linkedWorkflowInstanceId: z.string().uuid().optional(),
  dueBefore: z.string().datetime().optional(),
  dueAfter: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional()
});

router.get('/tasks', requirePermission('task.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const filters = taskFiltersSchema.parse(req.query);
    
    const tasks = await TaskService.getTasks(tenantId, filters);
    
    res.json(tasks);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch tasks');
  }
});

router.get('/tasks/my-tasks', requirePermission('task.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    
    const tasks = await TaskService.getMyTasks(userId, tenantId);
    
    res.json(tasks);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch my tasks');
  }
});

router.get('/tasks/created-by-me', requirePermission('task.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    
    const tasks = await TaskService.getCreatedByMe(userId, tenantId);
    
    res.json(tasks);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch created tasks');
  }
});

router.get('/tasks/watching', requirePermission('task.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    
    const tasks = await TaskService.getWatchingTasks(userId, tenantId);
    
    res.json(tasks);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch watching tasks');
  }
});

router.get('/tasks/analytics', requirePermission('task.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const analytics = await TaskService.getTaskAnalytics(tenantId);
    res.json(analytics);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch task analytics');
  }
});

router.get('/tasks/:id', requirePermission('task.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const taskId = parseUUIDParam(req.params.id, 'Task ID');
    
    const task = await TaskService.getTaskById(taskId, tenantId);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(task);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch task');
  }
});

router.post('/tasks/complete', requirePermission('task.create'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    
    const { task: taskData, assignees, watchers, checklistItems } = req.body;
    
    if (!taskData || typeof taskData !== 'object') {
      return res.status(400).json({ error: 'Task data is required' });
    }
    
    const taskBodySchema = insertTaskSchema.omit({ 
      id: true, 
      tenantId: true, 
      createdBy: true, 
      createdAt: true, 
      updatedAt: true 
    });
    const parsedTask = taskBodySchema.parse(taskData);
    
    const task = await TaskService.createTaskComplete({
      task: {
        ...parsedTask,
        tenantId,
        createdBy: userId,
      } as InsertTask,
      assigneeIds: Array.isArray(assignees) ? assignees : [],
      watcherIds: Array.isArray(watchers) ? watchers : [],
      checklistItems: Array.isArray(checklistItems) ? checklistItems : [],
    });
    
    res.status(201).json(task);
  } catch (error) {
    handleApiError(error, res, 'Failed to create complete task');
  }
});

router.post('/tasks', requirePermission('task.create'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const parsed = createTaskBodySchema.parse(req.body);
    
    const task = await TaskService.createTask({
      ...parsed,
      tenantId
    } as InsertTask);
    
    res.status(201).json(task);
  } catch (error) {
    handleApiError(error, res, 'Failed to create task');
  }
});

router.patch('/tasks/:id', requirePermission('task.update'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const taskId = parseUUIDParam(req.params.id, 'Task ID');
    const parsed = updateTaskBodySchema.parse(req.body);
    
    const task = await TaskService.updateTask(taskId, tenantId, parsed);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(task);
  } catch (error) {
    handleApiError(error, res, 'Failed to update task');
  }
});

router.post('/tasks/:id/duplicate', requirePermission('task.create'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    const taskId = parseUUIDParam(req.params.id, 'Task ID');
    
    const duplicatedTask = await TaskService.duplicateTask(taskId, tenantId, userId);
    
    res.status(201).json(duplicatedTask);
  } catch (error) {
    handleApiError(error, res, 'Failed to duplicate task');
  }
});

router.delete('/tasks/:id', requirePermission('task.delete'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const taskId = parseUUIDParam(req.params.id, 'Task ID');
    
    await TaskService.deleteTask(taskId, tenantId);
    
    res.status(204).send();
  } catch (error) {
    handleApiError(error, res, 'Failed to delete task');
  }
});

router.post('/tasks/:id/assign', requirePermission('task.assign'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const taskId = parseUUIDParam(req.params.id, 'Task ID');
    const assignedBy = req.user!.id;
    const { userId, role = 'assignee' } = req.body;
    
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const assignment = await TaskService.assignUser(taskId, tenantId, userId, role, assignedBy);
    
    res.status(201).json(assignment);
  } catch (error) {
    handleApiError(error, res, 'Failed to assign user');
  }
});

router.delete('/tasks/:id/assign/:userId', requirePermission('task.assign'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const taskId = parseUUIDParam(req.params.id, 'Task ID');
    const userId = parseUUIDParam(req.params.userId, 'User ID');
    
    await TaskService.unassignUser(taskId, tenantId, userId, 'assignee');
    
    res.status(204).send();
  } catch (error) {
    handleApiError(error, res, 'Failed to unassign user');
  }
});

router.get('/tasks/:id/assignments', requirePermission('task.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const taskId = parseUUIDParam(req.params.id, 'Task ID');
    
    const assignments = await TaskService.getTaskAssignments(taskId, tenantId);
    
    res.json(assignments);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch assignments');
  }
});

const createChecklistItemBodySchema = insertTaskChecklistItemSchema
  .omit({ 
    taskId: true,
    tenantId: true
  })
  .extend({
    dueDate: z.preprocess(
      (val) => val ? new Date(val as string) : undefined,
      z.date().optional()
    ).optional()
  });

router.post('/tasks/:id/checklist', requirePermission('task.update'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const taskId = parseUUIDParam(req.params.id, 'Task ID');
    const parsed = createChecklistItemBodySchema.parse(req.body);
    
    const item = await TaskService.addChecklistItem({
      ...parsed,
      taskId,
      tenantId
    } as InsertTaskChecklistItem);
    
    res.status(201).json(item);
  } catch (error) {
    handleApiError(error, res, 'Failed to add checklist item');
  }
});

router.patch('/tasks/:id/checklist/:itemId', requirePermission('task.update'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const taskId = parseUUIDParam(req.params.id, 'Task ID');
    const itemId = parseUUIDParam(req.params.itemId, 'Item ID');
    const parsed = createChecklistItemBodySchema.partial().parse(req.body);
    
    const item = await TaskService.updateChecklistItem(itemId, tenantId, parsed);
    
    if (!item) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }
    
    res.json(item);
  } catch (error) {
    handleApiError(error, res, 'Failed to update checklist item');
  }
});

router.delete('/tasks/:id/checklist/:itemId', requirePermission('task.update'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const taskId = parseUUIDParam(req.params.id, 'Task ID');
    const itemId = parseUUIDParam(req.params.itemId, 'Item ID');
    
    await TaskService.deleteChecklistItem(itemId, tenantId);
    
    res.status(204).send();
  } catch (error) {
    handleApiError(error, res, 'Failed to delete checklist item');
  }
});

router.get('/tasks/:id/checklist', requirePermission('task.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const taskId = parseUUIDParam(req.params.id, 'Task ID');
    
    const items = await TaskService.getChecklistItems(taskId, tenantId);
    
    res.json(items);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch checklist items');
  }
});

const createCommentBodySchema = insertTaskCommentSchema.omit({ 
  taskId: true,
  userId: true,
  tenantId: true
});

router.post('/tasks/:id/comments', requirePermission('task.comment'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const taskId = parseUUIDParam(req.params.id, 'Task ID');
    const userId = req.user!.id;
    const parsed = createCommentBodySchema.parse(req.body);
    
    const comment = await TaskService.addComment({
      ...parsed,
      taskId,
      tenantId,
      userId
    } as InsertTaskComment);
    
    res.status(201).json(comment);
  } catch (error) {
    handleApiError(error, res, 'Failed to add comment');
  }
});

router.get('/tasks/:id/comments', requirePermission('task.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const taskId = parseUUIDParam(req.params.id, 'Task ID');
    
    const comments = await TaskService.getComments(taskId, tenantId);
    
    res.json(comments);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch comments');
  }
});

const createTimeLogBodySchema = insertTaskTimeLogSchema
  .omit({ 
    taskId: true,
    userId: true,
    tenantId: true
  })
  .partial({ startedAt: true })
  .transform((data) => ({
    ...data,
    startedAt: data.startedAt || new Date()
  }));

router.post('/tasks/:id/time-logs', requirePermission('task.time-log'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const taskId = parseUUIDParam(req.params.id, 'Task ID');
    const userId = req.user!.id;
    const parsed = createTimeLogBodySchema.parse(req.body);
    
    const timeLog = await TaskService.logTime({
      ...parsed,
      taskId,
      tenantId,
      userId
    } as InsertTaskTimeLog);
    
    res.status(201).json(timeLog);
  } catch (error) {
    handleApiError(error, res, 'Failed to log time');
  }
});

router.get('/tasks/:id/time-logs', requirePermission('task.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const taskId = parseUUIDParam(req.params.id, 'Task ID');
    
    const timeLogs = await TaskService.getTimeLogs(taskId, tenantId);
    
    res.json(timeLogs);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch time logs');
  }
});

router.post('/tasks/:id/timer/start', requirePermission('task.time-log'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const taskId = parseUUIDParam(req.params.id, 'Task ID');
    const userId = req.user!.id;
    const { description } = req.body;
    
    const timeLog = await TaskService.startTimer(taskId, tenantId, userId, description);
    
    res.status(201).json(timeLog);
  } catch (error) {
    handleApiError(error, res, 'Failed to start timer');
  }
});

router.post('/tasks/:id/timer/stop/:logId', requirePermission('task.time-log'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const taskId = parseUUIDParam(req.params.id, 'Task ID');
    const userId = req.user!.id;
    const logId = parseUUIDParam(req.params.logId, 'Log ID');
    
    const timeLog = await TaskService.stopTimer(logId, tenantId, userId);
    
    res.json(timeLog);
  } catch (error) {
    handleApiError(error, res, 'Failed to stop timer');
  }
});

const createDependencyBodySchema = insertTaskDependencySchema.omit({ 
  taskId: true,
  tenantId: true
});

router.post('/tasks/:id/dependencies', requirePermission('task.update'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const taskId = parseUUIDParam(req.params.id, 'Task ID');
    const parsed = createDependencyBodySchema.parse(req.body);
    
    const dependency = await TaskService.addDependency({
      ...parsed,
      taskId,
      tenantId
    } as InsertTaskDependency);
    
    res.status(201).json(dependency);
  } catch (error) {
    handleApiError(error, res, 'Failed to add dependency');
  }
});

router.delete('/tasks/:id/dependencies/:dependencyId', requirePermission('task.update'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const taskId = parseUUIDParam(req.params.id, 'Task ID');
    const dependencyId = parseUUIDParam(req.params.dependencyId, 'Dependency ID');
    
    await TaskService.removeDependency(dependencyId);
    
    res.status(204).send();
  } catch (error) {
    handleApiError(error, res, 'Failed to remove dependency');
  }
});

router.get('/tasks/:id/dependencies', requirePermission('task.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const taskId = parseUUIDParam(req.params.id, 'Task ID');
    
    const dependencies = await TaskService.getDependencies(taskId, tenantId);
    
    res.json(dependencies);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch dependencies');
  }
});

router.get('/tasks/:id/activity', requirePermission('task.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const taskId = parseUUIDParam(req.params.id, 'Task ID');
    
    const activity = await TaskService.getTaskActivity(taskId, tenantId);
    
    res.json(activity);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch task activity');
  }
});

const createAttachmentBodySchema = insertTaskAttachmentSchema.omit({ 
  taskId: true,
  uploadedBy: true,
  tenantId: true
});

router.post('/tasks/:id/attachments', requirePermission('task.update'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const taskId = parseUUIDParam(req.params.id, 'Task ID');
    const userId = req.user!.id;
    const parsed = createAttachmentBodySchema.parse(req.body);
    
    const attachment = await TaskService.addAttachment({
      ...parsed,
      taskId,
      tenantId,
      uploadedBy: userId
    } as InsertTaskAttachment);
    
    res.status(201).json(attachment);
  } catch (error) {
    handleApiError(error, res, 'Failed to add attachment');
  }
});

router.delete('/tasks/:id/attachments/:attachmentId', requirePermission('task.update'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const taskId = parseUUIDParam(req.params.id, 'Task ID');
    const attachmentId = parseUUIDParam(req.params.attachmentId, 'Attachment ID');
    
    await TaskService.deleteAttachment(attachmentId, tenantId);
    
    res.status(204).send();
  } catch (error) {
    handleApiError(error, res, 'Failed to delete attachment');
  }
});

router.get('/tasks/:id/attachments', requirePermission('task.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const taskId = parseUUIDParam(req.params.id, 'Task ID');
    
    const attachments = await TaskService.getAttachments(taskId, tenantId);
    
    res.json(attachments);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch attachments');
  }
});

const createTemplateBodySchema = insertTaskTemplateSchema.omit({ 
  createdBy: true,
  tenantId: true
});

router.post('/task-templates', requirePermission('task-template.create'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    const parsed = createTemplateBodySchema.parse(req.body);
    
    const template = await TaskService.createTemplate({
      ...parsed,
      tenantId,
      createdBy: userId
    } as InsertTaskTemplate);
    
    res.status(201).json(template);
  } catch (error) {
    handleApiError(error, res, 'Failed to create template');
  }
});

router.get('/task-templates', requirePermission('task-template.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const { department } = req.query;
    
    const templates = await TaskService.getTemplates(tenantId, department as string | undefined);
    
    res.json(templates);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch templates');
  }
});

router.post('/task-templates/:id/use', requirePermission('task.create'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const templateId = parseUUIDParam(req.params.id, 'Template ID');
    const overrides = req.body;
    
    const task = await TaskService.createTaskFromTemplate(templateId, tenantId, overrides);
    
    res.status(201).json(task);
  } catch (error) {
    handleApiError(error, res, 'Failed to create task from template');
  }
});

router.post('/tasks/bulk', requirePermission('task.create'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const { tasks } = req.body;
    
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: 'Tasks array is required and must not be empty' });
    }
    
    const parsedTasks = tasks.map((task: any) => 
      createTaskBodySchema.parse(task)
    ).map((task: any) => ({
      ...task,
      tenantId
    }));
    
    const createdTasks = await TaskService.bulkCreateTasks(parsedTasks as InsertTask[]);
    
    res.status(201).json(createdTasks);
  } catch (error) {
    handleApiError(error, res, 'Failed to bulk create tasks');
  }
});

router.patch('/tasks/bulk', requirePermission('task.update'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const { taskIds, updates } = req.body;
    
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ error: 'Task IDs array is required and must not be empty' });
    }
    
    const parsedUpdates = updateTaskBodySchema.parse(updates);
    
    const updatedTasks = await TaskService.bulkUpdateTasks(taskIds, tenantId, parsedUpdates);
    
    res.json(updatedTasks);
  } catch (error) {
    handleApiError(error, res, 'Failed to bulk update tasks');
  }
});

router.delete('/tasks/bulk', requirePermission('task.delete'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const { taskIds } = req.body;
    
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ error: 'Task IDs array is required and must not be empty' });
    }
    
    await TaskService.bulkDeleteTasks(taskIds, tenantId);
    
    res.status(204).send();
  } catch (error) {
    handleApiError(error, res, 'Failed to bulk delete tasks');
  }
});

router.get('/tasks/analytics', requirePermission('task.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const analytics = await TaskService.getTaskAnalytics(tenantId);
    res.json(analytics);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch task analytics');
  }
});

router.get('/tasks/:taskId/assignments', requirePermission('task.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const taskId = parseUUIDParam(req.params.taskId, 'Task ID');
    
    const assignments = await TaskService.getTaskAssignments(taskId, tenantId);
    res.json(assignments);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch task assignments');
  }
});

router.post('/tasks/:taskId/assignments', requirePermission('task.update'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const taskId = parseUUIDParam(req.params.taskId, 'Task ID');
    const userId = req.user!.id;
    
    const bodySchema = insertTaskAssignmentSchema.omit({ 
      taskId: true, 
      tenantId: true, 
      assignedBy: true, 
      assignedAt: true 
    });
    const parsed = bodySchema.parse(req.body);
    
    const assignment = await TaskService.createTaskAssignment({
      ...parsed,
      taskId,
      tenantId,
      assignedBy: userId
    } as InsertTaskAssignment);
    
    res.status(201).json(assignment);
  } catch (error) {
    handleApiError(error, res, 'Failed to create task assignment');
  }
});

router.delete('/tasks/:taskId/assignments/:userId/:role', requirePermission('task.update'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const taskId = parseUUIDParam(req.params.taskId, 'Task ID');
    const userId = req.params.userId;
    const role = req.params.role as 'assignee' | 'watcher';
    
    if (role !== 'assignee' && role !== 'watcher') {
      return res.status(400).json({ error: 'Invalid role. Must be assignee or watcher' });
    }
    
    await TaskService.deleteTaskAssignment(taskId, userId, role, tenantId);
    res.status(204).send();
  } catch (error) {
    handleApiError(error, res, 'Failed to delete task assignment');
  }
});

router.get('/tasks/:taskId/checklist', requirePermission('task.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const taskId = parseUUIDParam(req.params.taskId, 'Task ID');
    
    const items = await TaskService.getChecklistItems(taskId, tenantId);
    res.json(items);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch checklist items');
  }
});

router.post('/tasks/:taskId/checklist', requirePermission('task.update'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const taskId = parseUUIDParam(req.params.taskId, 'Task ID');
    
    const bodySchema = insertTaskChecklistItemSchema.omit({ 
      taskId: true, 
      tenantId: true 
    });
    const parsed = bodySchema.parse(req.body);
    
    const item = await TaskService.createChecklistItem({
      ...parsed,
      taskId,
      tenantId
    } as InsertTaskChecklistItem);
    
    res.status(201).json(item);
  } catch (error) {
    handleApiError(error, res, 'Failed to create checklist item');
  }
});

router.put('/tasks/:taskId/checklist/:itemId', requirePermission('task.update'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const itemId = parseUUIDParam(req.params.itemId, 'Item ID');
    
    const bodySchema = insertTaskChecklistItemSchema.omit({ 
      taskId: true, 
      tenantId: true 
    }).partial();
    const parsed = bodySchema.parse(req.body);
    
    const item = await TaskService.updateChecklistItem(itemId, tenantId, parsed);
    res.json(item);
  } catch (error) {
    handleApiError(error, res, 'Failed to update checklist item');
  }
});

router.put('/tasks/:taskId/checklist/:itemId/toggle', requirePermission('task.update'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const itemId = parseUUIDParam(req.params.itemId, 'Item ID');
    const userId = req.user!.id;
    
    const item = await TaskService.toggleChecklistItem(itemId, tenantId, userId);
    res.json(item);
  } catch (error) {
    handleApiError(error, res, 'Failed to toggle checklist item');
  }
});

router.delete('/tasks/:taskId/checklist/:itemId', requirePermission('task.update'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const itemId = parseUUIDParam(req.params.itemId, 'Item ID');
    
    await TaskService.deleteChecklistItem(itemId, tenantId);
    res.status(204).send();
  } catch (error) {
    handleApiError(error, res, 'Failed to delete checklist item');
  }
});

export default router;
