// ============================================================================
// W3 SUITE - HR WORKFLOW SEED DATA
// Populate initial HR workflow actions and triggers for RBAC integration
// ============================================================================

import { db } from '../core/db';
import { workflowActions, workflowTriggers } from './schema/w3suite';
import { eq, and } from 'drizzle-orm';

const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';

// HR Workflow Actions with RBAC permissions
const HR_WORKFLOW_ACTIONS = [
  {
    tenantId: DEMO_TENANT_ID,
    category: 'hr',
    actionId: 'approve_vacation',
    name: 'Approva Ferie',
    description: 'Approva la richiesta di ferie di un dipendente',
    requiredPermission: 'workflow.action.hr.approve_vacation',
    actionType: 'approval',
    constraints: {
      maxDays: 30,
      excludedPeriods: ['2025-12-24', '2025-12-31'],
      requiresJustification: false
    },
    priority: 100,
    isActive: true
  },
  {
    tenantId: DEMO_TENANT_ID,
    category: 'hr',
    actionId: 'reject_vacation',
    name: 'Rifiuta Ferie',
    description: 'Rifiuta la richiesta di ferie con motivazione obbligatoria',
    requiredPermission: 'workflow.action.hr.reject_vacation',
    actionType: 'rejection',
    constraints: {
      requiresJustification: true,
      minJustificationLength: 50
    },
    priority: 110,
    isActive: true
  },
  {
    tenantId: DEMO_TENANT_ID,
    category: 'hr',
    actionId: 'approve_sick_leave',
    name: 'Approva Malattia',
    description: 'Approva la richiesta di congedo per malattia',
    requiredPermission: 'workflow.action.hr.approve_sick_leave',
    actionType: 'approval',
    constraints: {
      requiresMedicalCertificate: true,
      maxDaysWithoutCertificate: 3
    },
    priority: 90,
    isActive: true
  },
  {
    tenantId: DEMO_TENANT_ID,
    category: 'hr',
    actionId: 'approve_training_request',
    name: 'Approva Formazione',
    description: 'Approva la richiesta di partecipazione a corsi di formazione',
    requiredPermission: 'workflow.action.hr.approve_training_request',
    actionType: 'approval',
    constraints: {
      maxBudget: 5000,
      requiresBusinessCase: true,
      requiresManagerApproval: true
    },
    priority: 120,
    isActive: true
  },
  {
    tenantId: DEMO_TENANT_ID,
    category: 'hr',
    actionId: 'approve_expense',
    name: 'Approva Spesa',
    description: 'Approva rimborsi spese e note spese',
    requiredPermission: 'workflow.action.hr.approve_expense',
    actionType: 'approval',
    constraints: {
      maxAmount: 10000,
      requiresReceipts: true,
      categories: ['travel', 'meals', 'accommodation', 'training', 'equipment']
    },
    priority: 100,
    isActive: true
  },
  {
    tenantId: DEMO_TENANT_ID,
    category: 'hr',
    actionId: 'delegate_approval',
    name: 'Delega Approvazione',
    description: 'Delega l\'approvazione ad un altro responsabile',
    requiredPermission: 'workflow.action.hr.delegate_approval',
    actionType: 'delegation',
    constraints: {
      canDelegateToSameLevel: false,
      canDelegateToLowerLevel: false,
      requiresJustification: true
    },
    priority: 150,
    isActive: true
  },
  {
    tenantId: DEMO_TENANT_ID,
    category: 'hr',
    actionId: 'approve_overtime',
    name: 'Approva Straordinari',
    description: 'Approva le ore di lavoro straordinario',
    requiredPermission: 'workflow.action.hr.approve_overtime',
    actionType: 'approval',
    constraints: {
      maxHoursPerMonth: 40,
      maxHoursPerWeek: 10,
      requiresJustification: true
    },
    priority: 95,
    isActive: true
  },
  {
    tenantId: DEMO_TENANT_ID,
    category: 'hr',
    actionId: 'approve_remote_work',
    name: 'Approva Smart Working',
    description: 'Approva la richiesta di lavoro da remoto',
    requiredPermission: 'workflow.action.hr.approve_remote_work',
    actionType: 'approval',
    constraints: {
      maxDaysPerWeek: 3,
      requiresEquipmentCheck: true,
      requiresSecurityApproval: false
    },
    priority: 105,
    isActive: true
  }
];

// HR Workflow Triggers for automation
const HR_WORKFLOW_TRIGGERS = [
  {
    tenantId: DEMO_TENANT_ID,
    category: 'hr',
    triggerId: 'notify_team',
    name: 'Notifica Team',
    description: 'Invia notifiche al team riguardo approvazioni e cambiamenti',
    requiredPermission: 'workflow.trigger.hr.notify_team',
    triggerType: 'notification',
    config: {
      channels: ['email', 'in-app'],
      templates: {
        approved: 'La tua richiesta è stata approvata',
        rejected: 'La tua richiesta è stata rifiutata',
        pending: 'Nuova richiesta in attesa di approvazione'
      },
      includeManagers: true,
      includeHR: false
    },
    isAsync: false,
    retryPolicy: {
      maxRetries: 3,
      backoff: 'linear'
    },
    timeout: 30000,
    priority: 100,
    isActive: true
  },
  {
    tenantId: DEMO_TENANT_ID,
    category: 'hr',
    triggerId: 'update_calendar',
    name: 'Aggiorna Calendario',
    description: 'Aggiorna automaticamente il calendario aziendale con ferie e assenze',
    requiredPermission: 'workflow.trigger.hr.update_calendar',
    triggerType: 'integration',
    config: {
      calendarSystem: 'internal',
      syncWithGoogle: false,
      syncWithOutlook: false,
      updateTypes: ['vacation', 'sick_leave', 'training', 'remote_work'],
      visibility: 'team'
    },
    isAsync: true,
    retryPolicy: {
      maxRetries: 5,
      backoff: 'exponential'
    },
    timeout: 60000,
    priority: 100,
    isActive: true
  },
  {
    tenantId: DEMO_TENANT_ID,
    category: 'hr',
    triggerId: 'send_reminder',
    name: 'Invia Promemoria',
    description: 'Invia promemoria automatici per scadenze e approvazioni',
    requiredPermission: 'workflow.trigger.hr.send_reminder',
    triggerType: 'timer',
    config: {
      reminderTypes: ['pending_approval', 'expiring_leave', 'training_deadline'],
      frequency: 'daily',
      sendAt: '09:00',
      escalationAfterDays: 3,
      includeWeekends: false
    },
    isAsync: true,
    retryPolicy: {
      maxRetries: 1,
      backoff: 'none'
    },
    timeout: 30000,
    priority: 100,
    isActive: true
  },
  {
    tenantId: DEMO_TENANT_ID,
    category: 'hr',
    triggerId: 'escalate_to_manager',
    name: 'Escalation Manager',
    description: 'Escalation automatica al manager superiore dopo timeout',
    requiredPermission: 'workflow.trigger.hr.escalate_to_manager',
    triggerType: 'conditional',
    config: {
      conditions: {
        timeoutHours: 48,
        skipWeekends: true,
        skipHolidays: true
      },
      escalationPath: 'hierarchical',
      notifyOriginalApprover: true,
      notifyRequester: true
    },
    isAsync: false,
    retryPolicy: {
      maxRetries: 1,
      backoff: 'none'
    },
    timeout: 10000,
    priority: 100,
    isActive: true
  },
  {
    tenantId: DEMO_TENANT_ID,
    category: 'hr',
    triggerId: 'auto_approve_small_request',
    name: 'Approvazione Automatica',
    description: 'Approva automaticamente richieste sotto determinate soglie',
    requiredPermission: 'workflow.trigger.hr.auto_approve_small_request',
    triggerType: 'conditional',
    config: {
      autoApproveConditions: {
        vacationDays: { max: 2, requiresNoBlackout: true },
        expenseAmount: { max: 100, requiresReceipt: true },
        overtimeHours: { max: 2, requiresPreApproval: false }
      },
      requiresAuditLog: true,
      notifyManager: true
    },
    isAsync: false,
    retryPolicy: {
      maxRetries: 1,
      backoff: 'none'
    },
    timeout: 10000,
    priority: 100,
    isActive: true
  },
  {
    tenantId: DEMO_TENANT_ID,
    category: 'hr',
    triggerId: 'generate_report',
    name: 'Genera Report',
    description: 'Genera report automatici per HR e management',
    requiredPermission: 'workflow.trigger.hr.generate_report',
    triggerType: 'timer',
    config: {
      reportTypes: ['monthly_leaves', 'expense_summary', 'training_completion'],
      schedule: 'monthly',
      dayOfMonth: 1,
      recipients: ['hr_manager', 'finance_manager'],
      format: 'pdf'
    },
    isAsync: true,
    retryOnFailure: true,
    maxRetries: 3,
    isActive: true
  },
  {
    tenantId: DEMO_TENANT_ID,
    category: 'hr',
    triggerId: 'sync_payroll',
    name: 'Sincronizza Buste Paga',
    description: 'Sincronizza dati con sistema paghe esterno',
    requiredPermission: 'workflow.trigger.hr.sync_payroll',
    triggerType: 'integration',
    config: {
      payrollSystem: 'external',
      syncTypes: ['overtime', 'leaves', 'expenses'],
      frequency: 'biweekly',
      validation: 'required',
      errorHandling: 'notify_hr'
    },
    isAsync: true,
    retryPolicy: {
      maxRetries: 5,
      backoff: 'exponential'
    },
    timeout: 60000,
    priority: 100,
    isActive: true
  },
  {
    tenantId: DEMO_TENANT_ID,
    category: 'hr',
    triggerId: 'check_compliance',
    name: 'Verifica Compliance',
    description: 'Verifica conformità con policy aziendali e normative',
    requiredPermission: 'workflow.trigger.hr.check_compliance',
    triggerType: 'conditional',
    config: {
      checks: {
        maxConsecutiveVacationDays: 15,
        minRestBetweenShifts: 11,
        maxWeeklyHours: 48,
        requiredDocuments: ['contract', 'privacy_consent', 'safety_training']
      },
      blockNonCompliant: true,
      notifyCompliance: true
    },
    isAsync: false,
    retryPolicy: {
      maxRetries: 1,
      backoff: 'none'
    },
    timeout: 10000,
    priority: 100,
    isActive: true
  }
];

export async function seedHRWorkflowData() {
  console.log('🔄 Starting HR Workflow data seed...');
  
  try {
    // Check if workflow actions already exist for tenant
    const existingActions = await db
      .select()
      .from(workflowActions)
      .where(and(
        eq(workflowActions.tenantId, DEMO_TENANT_ID),
        eq(workflowActions.category, 'hr')
      ))
      .limit(1);

    if (existingActions.length === 0) {
      console.log('📝 Inserting HR workflow actions...');
      await db.insert(workflowActions).values(HR_WORKFLOW_ACTIONS);
      console.log(`✅ Inserted ${HR_WORKFLOW_ACTIONS.length} HR workflow actions`);
    } else {
      console.log('⏭️  HR workflow actions already exist, skipping...');
    }

    // Check if workflow triggers already exist for tenant
    const existingTriggers = await db
      .select()
      .from(workflowTriggers)
      .where(and(
        eq(workflowTriggers.tenantId, DEMO_TENANT_ID),
        eq(workflowTriggers.category, 'hr')
      ))
      .limit(1);

    if (existingTriggers.length === 0) {
      console.log('🔔 Inserting HR workflow triggers...');
      await db.insert(workflowTriggers).values(HR_WORKFLOW_TRIGGERS);
      console.log(`✅ Inserted ${HR_WORKFLOW_TRIGGERS.length} HR workflow triggers`);
    } else {
      console.log('⏭️  HR workflow triggers already exist, skipping...');
    }

    console.log('✅ HR Workflow data seed completed successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Error seeding HR workflow data:', error);
    throw error;
  }
}

// Allow running directly
seedHRWorkflowData()
  .then(() => {
    console.log('✅ HR Workflow seed completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ HR Workflow seed failed:', error);
    process.exit(1);
  });