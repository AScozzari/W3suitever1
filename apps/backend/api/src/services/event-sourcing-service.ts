import { db } from '../core/db';
import { 
  workflowStateEvents, 
  workflowStateSnapshots,
  workflowInstances,
  type InsertWorkflowStateEvent,
  type InsertWorkflowStateSnapshot,
  type WorkflowStateEvent,
  type WorkflowStateSnapshot
} from '../db/schema/w3suite';
import { eq, and, desc, asc, sql } from 'drizzle-orm';

export interface WorkflowState {
  status: string;
  currentStepId?: string;
  completedSteps: string[];
  pendingSteps: string[];
  executionContext: Record<string, any>;
  metadata: Record<string, any>;
}

export interface EventData {
  stepId?: string;
  previousState?: string;
  newState: string;
  executionData?: Record<string, any>;
  error?: any;
}

export class EventSourcingService {
  
  /**
   * Record a workflow state change event
   */
  async recordEvent(params: {
    tenantId: string;
    instanceId: string;
    eventType: 'state_changed' | 'step_completed' | 'step_failed' | 'workflow_paused' | 'workflow_resumed' | 'workflow_cancelled';
    previousState?: string;
    newState: string;
    stepId?: string;
    eventData?: Record<string, any>;
    metadata?: Record<string, any>;
    causedBy?: 'user' | 'system' | 'timer' | 'webhook';
    userId?: string;
  }): Promise<WorkflowStateEvent> {
    
    // Get next sequence number for this instance
    const lastEventResult = await db
      .select({ maxSeq: sql<number>`COALESCE(MAX(${workflowStateEvents.eventSequence}), 0)` })
      .from(workflowStateEvents)
      .where(eq(workflowStateEvents.instanceId, params.instanceId));
    
    const nextSequence = (lastEventResult[0]?.maxSeq || 0) + 1;

    const eventInsert: InsertWorkflowStateEvent = {
      tenantId: params.tenantId,
      instanceId: params.instanceId,
      eventType: params.eventType,
      eventSequence: nextSequence,
      previousState: params.previousState,
      newState: params.newState,
      stepId: params.stepId,
      eventData: params.eventData || {},
      metadata: params.metadata || {},
      causedBy: params.causedBy || 'system',
      userId: params.userId,
      isProcessed: true,
    };

    const [event] = await db
      .insert(workflowStateEvents)
      .values(eventInsert)
      .returning();

    return event;
  }

  /**
   * Create a state snapshot for fast recovery
   */
  async createSnapshot(params: {
    tenantId: string;
    instanceId: string;
    workflowState: WorkflowState;
  }): Promise<WorkflowStateSnapshot> {
    
    // Get last event sequence
    const lastEventResult = await db
      .select({ maxSeq: sql<number>`COALESCE(MAX(${workflowStateEvents.eventSequence}), 0)` })
      .from(workflowStateEvents)
      .where(eq(workflowStateEvents.instanceId, params.instanceId));
    
    const eventSequenceAt = lastEventResult[0]?.maxSeq || 0;

    // Get next snapshot sequence
    const lastSnapshotResult = await db
      .select({ maxSeq: sql<number>`COALESCE(MAX(${workflowStateSnapshots.snapshotSequence}), 0)` })
      .from(workflowStateSnapshots)
      .where(eq(workflowStateSnapshots.instanceId, params.instanceId));
    
    const nextSnapshotSequence = (lastSnapshotResult[0]?.maxSeq || 0) + 1;

    // Calculate snapshot size
    const snapshotJson = JSON.stringify(params.workflowState);
    const snapshotSizeBytes = Buffer.byteLength(snapshotJson, 'utf8');

    const snapshotInsert: InsertWorkflowStateSnapshot = {
      tenantId: params.tenantId,
      instanceId: params.instanceId,
      snapshotSequence: nextSnapshotSequence,
      eventSequenceAt: eventSequenceAt,
      workflowState: params.workflowState,
      executionContext: params.workflowState.executionContext || {},
      completedSteps: params.workflowState.completedSteps || [],
      pendingSteps: params.workflowState.pendingSteps || [],
      currentStatus: params.workflowState.status,
      currentStepId: params.workflowState.currentStepId,
      snapshotSizeBytes,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days expiry
    };

    const [snapshot] = await db
      .insert(workflowStateSnapshots)
      .values(snapshotInsert)
      .returning();

    return snapshot;
  }

  /**
   * Get all events for a workflow instance (ordered by sequence)
   */
  async getInstanceEvents(instanceId: string): Promise<WorkflowStateEvent[]> {
    return await db
      .select()
      .from(workflowStateEvents)
      .where(eq(workflowStateEvents.instanceId, instanceId))
      .orderBy(asc(workflowStateEvents.eventSequence));
  }

  /**
   * Get events since a specific sequence number
   */
  async getEventsSince(instanceId: string, sequenceNumber: number): Promise<WorkflowStateEvent[]> {
    return await db
      .select()
      .from(workflowStateEvents)
      .where(
        and(
          eq(workflowStateEvents.instanceId, instanceId),
          sql`${workflowStateEvents.eventSequence} > ${sequenceNumber}`
        )
      )
      .orderBy(asc(workflowStateEvents.eventSequence));
  }

  /**
   * Get latest snapshot for a workflow instance
   */
  async getLatestSnapshot(instanceId: string): Promise<WorkflowStateSnapshot | null> {
    const [snapshot] = await db
      .select()
      .from(workflowStateSnapshots)
      .where(eq(workflowStateSnapshots.instanceId, instanceId))
      .orderBy(desc(workflowStateSnapshots.snapshotSequence))
      .limit(1);

    return snapshot || null;
  }

  /**
   * Rebuild workflow state from events (with optional snapshot base)
   */
  async rebuildState(instanceId: string): Promise<WorkflowState | null> {
    
    // Try to get latest snapshot first
    const snapshot = await this.getLatestSnapshot(instanceId);
    
    let baseState: WorkflowState;
    let fromSequence = 0;

    if (snapshot) {
      // Start from snapshot
      baseState = snapshot.workflowState as WorkflowState;
      fromSequence = snapshot.eventSequenceAt;
    } else {
      // Start from scratch
      baseState = {
        status: 'pending',
        completedSteps: [],
        pendingSteps: [],
        executionContext: {},
        metadata: {},
      };
    }

    // Get events since snapshot (or all if no snapshot)
    const events = await this.getEventsSince(instanceId, fromSequence);

    // Replay events to rebuild state
    let currentState = { ...baseState };

    for (const event of events) {
      currentState = this.applyEvent(currentState, event);
    }

    return currentState;
  }

  /**
   * Apply an event to a state (state transition logic)
   */
  private applyEvent(state: WorkflowState, event: WorkflowStateEvent): WorkflowState {
    const newState = { ...state };

    switch (event.eventType) {
      case 'state_changed':
        newState.status = event.newState;
        break;

      case 'step_completed':
        if (event.stepId && !newState.completedSteps.includes(event.stepId)) {
          newState.completedSteps.push(event.stepId);
        }
        if (event.stepId && newState.pendingSteps.includes(event.stepId)) {
          newState.pendingSteps = newState.pendingSteps.filter(s => s !== event.stepId);
        }
        newState.currentStepId = undefined;
        break;

      case 'step_failed':
        newState.status = 'failed';
        newState.currentStepId = event.stepId || undefined;
        break;

      case 'workflow_paused':
        newState.status = 'paused';
        break;

      case 'workflow_resumed':
        newState.status = 'running';
        break;

      case 'workflow_cancelled':
        newState.status = 'cancelled';
        break;
    }

    // Merge event data into execution context
    if (event.eventData && typeof event.eventData === 'object') {
      newState.executionContext = {
        ...newState.executionContext,
        ...event.eventData,
      };
    }

    return newState;
  }

  /**
   * Clean up old snapshots (keep last N)
   */
  async cleanupOldSnapshots(instanceId: string, keepLast: number = 5): Promise<number> {
    
    // Get all snapshots ordered by sequence desc
    const allSnapshots = await db
      .select()
      .from(workflowStateSnapshots)
      .where(eq(workflowStateSnapshots.instanceId, instanceId))
      .orderBy(desc(workflowStateSnapshots.snapshotSequence));

    if (allSnapshots.length <= keepLast) {
      return 0; // Nothing to clean
    }

    // Delete old snapshots (keep only last N)
    const snapshotsToDelete = allSnapshots.slice(keepLast);
    const deleteIds = snapshotsToDelete.map(s => s.id);

    if (deleteIds.length === 0) return 0;

    const result = await db
      .delete(workflowStateSnapshots)
      .where(
        sql`${workflowStateSnapshots.id} = ANY(${deleteIds})`
      );

    return snapshotsToDelete.length;
  }

  /**
   * Get workflow event history with pagination
   */
  async getEventHistory(params: {
    instanceId: string;
    limit?: number;
    offset?: number;
  }): Promise<{ events: WorkflowStateEvent[]; total: number }> {
    
    const limit = params.limit || 50;
    const offset = params.offset || 0;

    const [events, countResult] = await Promise.all([
      db
        .select()
        .from(workflowStateEvents)
        .where(eq(workflowStateEvents.instanceId, params.instanceId))
        .orderBy(desc(workflowStateEvents.eventSequence))
        .limit(limit)
        .offset(offset),
      
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(workflowStateEvents)
        .where(eq(workflowStateEvents.instanceId, params.instanceId))
    ]);

    return {
      events,
      total: Number(countResult[0]?.count || 0),
    };
  }
}

export const eventSourcingService = new EventSourcingService();
