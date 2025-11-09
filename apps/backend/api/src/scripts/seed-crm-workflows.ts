/**
 * Script to seed CRM workflow templates
 * Run with: tsx apps/backend/api/src/scripts/seed-crm-workflows.ts
 */

import { db } from '../core/db';
import { workflowTemplates } from '../db/schema/w3suite';
import { sql } from 'drizzle-orm';

const CRM_WORKFLOW_TEMPLATES = [
  {
    name: 'Welcome Email - Nuovo Lead',
    description: 'Invia automaticamente email di benvenuto quando viene creato un nuovo lead',
    category: 'crm',
    templateType: 'lead_welcome',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: {
          label: 'Nuovo Lead Creato',
          triggerType: 'entity_created',
          entityType: 'lead',
        }
      },
      {
        id: 'action-1',
        type: 'action',
        position: { x: 350, y: 100 },
        data: {
          label: 'Invia Email Benvenuto',
          actionType: 'send_email',
          emailTemplate: 'welcome_lead',
        }
      },
    ],
    edges: [
      {
        id: 'e1-2',
        source: 'trigger-1',
        target: 'action-1',
        type: 'smoothstep'
      }
    ],
  },
  {
    name: 'Lead Scoring Automatico',
    description: 'Calcola e aggiorna automaticamente il punteggio del lead basato sulle interazioni',
    category: 'crm',
    templateType: 'lead_scoring',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: {
          label: 'Lead Aggiornato',
          triggerType: 'entity_updated',
          entityType: 'lead',
        }
      },
      {
        id: 'action-1',
        type: 'ai-action',
        position: { x: 350, y: 100 },
        data: {
          label: 'AI Lead Scoring',
          actionType: 'calculate_lead_score',
        }
      },
      {
        id: 'action-2',
        type: 'action',
        position: { x: 600, y: 100 },
        data: {
          label: 'Aggiorna Score Lead',
          actionType: 'update_entity',
          entityType: 'lead',
          fields: ['leadScore'],
        }
      },
    ],
    edges: [
      {
        id: 'e1-2',
        source: 'trigger-1',
        target: 'action-1',
        type: 'smoothstep'
      },
      {
        id: 'e2-3',
        source: 'action-1',
        target: 'action-2',
        type: 'smoothstep'
      }
    ],
  },
  {
    name: 'Follow-up Deal Stagnante',
    description: 'Invia notifica quando un deal rimane nella stessa fase per troppo tempo',
    category: 'crm',
    templateType: 'deal_follow_up',
    nodes: [
      {
        id: 'trigger-1',
        type: 'timer',
        position: { x: 100, y: 100 },
        data: {
          label: 'Controlla Deal Stagnanti',
          schedule: 'daily',
          time: '09:00',
        }
      },
      {
        id: 'condition-1',
        type: 'condition',
        position: { x: 350, y: 100 },
        data: {
          label: 'Deal Stagnante > 7 giorni',
          condition: 'deal.agingDays > 7',
        }
      },
      {
        id: 'action-1',
        type: 'action',
        position: { x: 600, y: 100 },
        data: {
          label: 'Notifica Owner',
          actionType: 'send_notification',
          notificationType: 'deal_stale',
        }
      },
    ],
    edges: [
      {
        id: 'e1-2',
        source: 'trigger-1',
        target: 'condition-1',
        type: 'smoothstep'
      },
      {
        id: 'e2-3',
        source: 'condition-1',
        target: 'action-1',
        type: 'smoothstep',
        label: 'true'
      }
    ],
  },
  {
    name: 'Deal Won - Celebrazione',
    description: 'Workflow automatico quando un deal viene vinto',
    category: 'crm',
    templateType: 'deal_won',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: {
          label: 'Deal Vinto',
          triggerType: 'deal_stage_changed',
          toStage: 'won',
        }
      },
      {
        id: 'action-1',
        type: 'action',
        position: { x: 350, y: 50 },
        data: {
          label: 'Invia Email Cliente',
          actionType: 'send_email',
          emailTemplate: 'deal_won_customer',
        }
      },
      {
        id: 'action-2',
        type: 'action',
        position: { x: 350, y: 150 },
        data: {
          label: 'Notifica Team',
          actionType: 'send_notification',
          notificationType: 'deal_won_team',
        }
      },
      {
        id: 'action-3',
        type: 'action',
        position: { x: 600, y: 100 },
        data: {
          label: 'Crea Task Follow-up',
          actionType: 'create_task',
          taskType: 'customer_onboarding',
        }
      },
    ],
    edges: [
      {
        id: 'e1-2',
        source: 'trigger-1',
        target: 'action-1',
        type: 'smoothstep'
      },
      {
        id: 'e1-3',
        source: 'trigger-1',
        target: 'action-2',
        type: 'smoothstep'
      },
      {
        id: 'e2-4',
        source: 'action-1',
        target: 'action-3',
        type: 'smoothstep'
      }
    ],
  },
  {
    name: 'Campagna Email Nurturing',
    description: 'Sequenza automatica di email nurturing per lead qualificati',
    category: 'crm',
    templateType: 'email_nurturing',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: {
          label: 'Lead Qualificato',
          triggerType: 'lead_status_changed',
          toStatus: 'qualified',
        }
      },
      {
        id: 'action-1',
        type: 'action',
        position: { x: 350, y: 100 },
        data: {
          label: 'Email 1 - Benvenuto',
          actionType: 'send_email',
          emailTemplate: 'nurture_email_1',
        }
      },
      {
        id: 'wait-1',
        type: 'wait',
        position: { x: 600, y: 100 },
        data: {
          label: 'Attendi 3 giorni',
          duration: 3,
          unit: 'days',
        }
      },
      {
        id: 'action-2',
        type: 'action',
        position: { x: 850, y: 100 },
        data: {
          label: 'Email 2 - Case Study',
          actionType: 'send_email',
          emailTemplate: 'nurture_email_2',
        }
      },
    ],
    edges: [
      {
        id: 'e1-2',
        source: 'trigger-1',
        target: 'action-1',
        type: 'smoothstep'
      },
      {
        id: 'e2-3',
        source: 'action-1',
        target: 'wait-1',
        type: 'smoothstep'
      },
      {
        id: 'e3-4',
        source: 'wait-1',
        target: 'action-2',
        type: 'smoothstep'
      }
    ],
  },
  {
    name: 'Assegnazione Lead Automatica',
    description: 'Assegna automaticamente i nuovi lead al commerciale disponibile',
    category: 'crm',
    templateType: 'lead_assignment',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: {
          label: 'Nuovo Lead',
          triggerType: 'entity_created',
          entityType: 'lead',
        }
      },
      {
        id: 'router-1',
        type: 'ai-lead-routing',
        position: { x: 350, y: 100 },
        data: {
          label: 'AI Lead Routing',
          routingStrategy: 'round_robin_with_skills',
        }
      },
      {
        id: 'action-1',
        type: 'action',
        position: { x: 600, y: 100 },
        data: {
          label: 'Assegna a Commerciale',
          actionType: 'assign_owner',
        }
      },
      {
        id: 'action-2',
        type: 'action',
        position: { x: 850, y: 100 },
        data: {
          label: 'Notifica Assegnazione',
          actionType: 'send_notification',
          notificationType: 'lead_assigned',
        }
      },
    ],
    edges: [
      {
        id: 'e1-2',
        source: 'trigger-1',
        target: 'router-1',
        type: 'smoothstep'
      },
      {
        id: 'e2-3',
        source: 'router-1',
        target: 'action-1',
        type: 'smoothstep'
      },
      {
        id: 'e3-4',
        source: 'action-1',
        target: 'action-2',
        type: 'smoothstep'
      }
    ],
  },
  {
    name: 'Promemoria Appuntamento',
    description: 'Invia promemoria automatici prima degli appuntamenti con i clienti',
    category: 'crm',
    templateType: 'appointment_reminder',
    nodes: [
      {
        id: 'trigger-1',
        type: 'timer',
        position: { x: 100, y: 100 },
        data: {
          label: 'Check Appuntamenti',
          schedule: 'hourly',
        }
      },
      {
        id: 'condition-1',
        type: 'condition',
        position: { x: 350, y: 100 },
        data: {
          label: 'Appuntamento tra 24h',
          condition: 'appointment.hoursUntil <= 24',
        }
      },
      {
        id: 'action-1',
        type: 'action',
        position: { x: 600, y: 50 },
        data: {
          label: 'SMS Promemoria Cliente',
          actionType: 'send_sms',
        }
      },
      {
        id: 'action-2',
        type: 'action',
        position: { x: 600, y: 150 },
        data: {
          label: 'Notifica Commerciale',
          actionType: 'send_notification',
        }
      },
    ],
    edges: [
      {
        id: 'e1-2',
        source: 'trigger-1',
        target: 'condition-1',
        type: 'smoothstep'
      },
      {
        id: 'e2-3',
        source: 'condition-1',
        target: 'action-1',
        type: 'smoothstep',
        label: 'true'
      },
      {
        id: 'e2-4',
        source: 'condition-1',
        target: 'action-2',
        type: 'smoothstep',
        label: 'true'
      }
    ],
  },
  {
    name: 'Customer Onboarding',
    description: 'Processo di onboarding automatico per nuovi clienti',
    category: 'crm',
    templateType: 'customer_onboarding',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: {
          label: 'Nuovo Cliente',
          triggerType: 'entity_created',
          entityType: 'customer',
        }
      },
      {
        id: 'action-1',
        type: 'action',
        position: { x: 350, y: 50 },
        data: {
          label: 'Crea Account Portale',
          actionType: 'create_portal_account',
        }
      },
      {
        id: 'action-2',
        type: 'action',
        position: { x: 350, y: 150 },
        data: {
          label: 'Invia Kit Benvenuto',
          actionType: 'send_welcome_kit',
        }
      },
      {
        id: 'action-3',
        type: 'action',
        position: { x: 600, y: 100 },
        data: {
          label: 'Schedula Call Onboarding',
          actionType: 'schedule_call',
        }
      },
      {
        id: 'action-4',
        type: 'action',
        position: { x: 850, y: 100 },
        data: {
          label: 'Assegna Account Manager',
          actionType: 'assign_account_manager',
        }
      },
    ],
    edges: [
      {
        id: 'e1-2',
        source: 'trigger-1',
        target: 'action-1',
        type: 'smoothstep'
      },
      {
        id: 'e1-3',
        source: 'trigger-1',
        target: 'action-2',
        type: 'smoothstep'
      },
      {
        id: 'e2-4',
        source: 'action-1',
        target: 'action-3',
        type: 'smoothstep'
      },
      {
        id: 'e3-4',
        source: 'action-2',
        target: 'action-3',
        type: 'smoothstep'
      },
      {
        id: 'e4-5',
        source: 'action-3',
        target: 'action-4',
        type: 'smoothstep'
      }
    ],
  }
];

async function seedCRMWorkflows() {
  console.log('🚀 Starting CRM workflow templates seeding...');
  
  try {
    // Use the staging tenant ID (same as used in the app)
    const tenantId = '00000000-0000-0000-0000-000000000001';
    
    for (const template of CRM_WORKFLOW_TEMPLATES) {
      const [existing] = await db
        .select()
        .from(workflowTemplates)
        .where(sql`tenant_id = ${tenantId} AND name = ${template.name}`)
        .limit(1);
      
      if (existing) {
        console.log(`⏭️  Template "${template.name}" already exists, skipping...`);
        continue;
      }
      
      await db.insert(workflowTemplates).values({
        tenantId,
        ...template,
        isGlobal: false,
        isSystem: false,
        isDeletable: true,
        isCustomizable: true,
        createdByBrand: false,
        isActive: true,
        viewport: { x: 0, y: 0, zoom: 1 },
        tags: ['crm', 'automation'],
      });
      
      console.log(`✅ Created template: ${template.name}`);
    }
    
    console.log('🎉 CRM workflow templates seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding CRM workflows:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seedCRMWorkflows();