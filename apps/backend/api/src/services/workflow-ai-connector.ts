/**
 * WorkflowAIConnector - AI-Powered Workflow Routing Service
 * 
 * Integra l'AI Registry centralizzato con il sistema di workflow esistente
 * per fornire routing intelligente automatico delle universalRequests.
 * 
 * Funzionalità:
 * - Usa workflow-assistant agent dal Brand Interface (centralizzato)
 * - Analizza universalRequests e determina approval chain automaticamente
 * - Si integra con teams esistenti e teamWorkflowAssignments
 * - Mantiene backward compatibility con workflow engine esistente
 */

import { AIRegistryService, RegistryAwareContext } from './ai-registry-service';
import { db, setTenantContext } from '../core/db.js';
import { 
  universalRequests, 
  teams, 
  teamWorkflowAssignments, 
  workflowInstances,
  workflowTemplates,
  users,
  type UniversalRequest,
  type Team,
  type TeamWorkflowAssignment
} from '../db/schema/w3suite.js';
import { eq, and, inArray } from 'drizzle-orm';
import type { AISettings } from '../db/schema/w3suite.js';

// ==================== TYPES ====================

export interface WorkflowRoutingDecision {
  selectedTeam: string;
  approvers: string[];
  flow: 'sequential' | 'parallel';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  sla: string;
  reasoning: string;
  autoApprove: boolean;
  escalationPath: string[];
}

export interface WorkflowContext {
  request: UniversalRequest;
  user: {
    id: string;
    department?: string;
    roleAssignments?: any[];
  };
  tenantId: string;
  eligibleTeams: Team[];
  teamAssignments: TeamWorkflowAssignment[];
}

export interface AIWorkflowResult {
  success: boolean;
  workflowInstanceId?: string;
  decision: WorkflowRoutingDecision;
  error?: string;
}

// ==================== SERVICE ====================

export class WorkflowAIConnector {
  private aiRegistry: AIRegistryService;
  private workflowAgentId = 'workflow-assistant'; // Agent centralizzato nel Brand Interface

  constructor(aiRegistryService: AIRegistryService) {
    this.aiRegistry = aiRegistryService;
  }

  /**
   * MAIN ENTRY POINT: Routing automatico AI per universalRequests
   */
  async routeRequest(
    requestId: string, 
    tenantId: string,
    aiSettings: AISettings
  ): Promise<AIWorkflowResult> {
    try {
      console.log(`[WORKFLOW-AI] 🎯 Starting AI routing for request ${requestId}, tenant ${tenantId}`);
      
      // Set tenant context per RLS
      await setTenantContext(tenantId);
      
      // 1. Carica contesto completo della richiesta
      const context = await this.loadWorkflowContext(requestId, tenantId);
      if (!context) {
        throw new Error('Request or context not found');
      }

      // 2. Usa AI per determinare routing ottimale
      const aiDecision = await this.getAIRoutingDecision(context, aiSettings);
      
      // 3. Valida e applica la decisione AI
      const result = await this.applyAIDecision(context, aiDecision);

      console.log(`[WORKFLOW-AI] ✅ AI routing completed:`, {
        requestId,
        selectedTeam: aiDecision.selectedTeam,
        flow: aiDecision.flow,
        autoApprove: aiDecision.autoApprove
      });

      return {
        success: true,
        workflowInstanceId: result.workflowInstanceId,
        decision: aiDecision
      };

    } catch (error) {
      console.error(`[WORKFLOW-AI] ❌ Error routing request ${requestId}:`, error);
      return {
        success: false,
        decision: {} as WorkflowRoutingDecision,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Carica contesto completo per decisione AI
   */
  private async loadWorkflowContext(requestId: string, tenantId: string): Promise<WorkflowContext | null> {
    try {
      // Carica richiesta con dati utente
      const [requestWithUser] = await db
        .select({
          request: universalRequests,
          user: users
        })
        .from(universalRequests)
        .leftJoin(users, eq(universalRequests.requesterId, users.id))
        .where(and(
          eq(universalRequests.id, requestId),
          eq(universalRequests.tenantId, tenantId)
        ));

      if (!requestWithUser) {
        console.error(`[WORKFLOW-AI] ❌ Request ${requestId} not found in tenant ${tenantId}`);
        return null;
      }

      // Carica teams attivi con auto-assign
      const eligibleTeams = await db
        .select()
        .from(teams)
        .where(and(
          eq(teams.tenantId, tenantId),
          eq(teams.isActive, true),
          eq(teams.autoAssignWorkflows, true)
        ));

      // Carica team workflow assignments con condizioni
      const teamAssignments = await db
        .select()
        .from(teamWorkflowAssignments)
        .where(and(
          eq(teamWorkflowAssignments.tenantId, tenantId),
          eq(teamWorkflowAssignments.isActive, true),
          eq(teamWorkflowAssignments.autoAssign, true)
        ));

      console.log(`[WORKFLOW-AI] 📊 Context loaded:`, {
        requestType: requestWithUser.request.requestType,
        category: requestWithUser.request.category,
        eligibleTeams: eligibleTeams.length,
        teamAssignments: teamAssignments.length
      });

      return {
        request: requestWithUser.request,
        user: {
          id: requestWithUser.user?.id || '',
          department: requestWithUser.user?.department || undefined
        },
        tenantId,
        eligibleTeams,
        teamAssignments
      };

    } catch (error) {
      console.error(`[WORKFLOW-AI] ❌ Error loading workflow context:`, error);
      return null;
    }
  }

  /**
   * Usa AI workflow-assistant per determinare routing ottimale
   */
  private async getAIRoutingDecision(context: WorkflowContext, aiSettings: AISettings): Promise<WorkflowRoutingDecision> {
    try {
      // Costruisci prompt strutturato per l'AI
      const aiPrompt = this.buildAIPrompt(context);
      
      // Usa AI Registry per invocare workflow-assistant centralizzato
      const aiContext: RegistryAwareContext = {
        agentId: this.workflowAgentId,
        tenantId: context.tenantId,
        userId: context.user.id,
        moduleContext: 'workflow' as any
      };

      console.log(`[WORKFLOW-AI] 🤖 Invoking workflow-assistant for decision...`);
      
      const aiResponse = await this.aiRegistry.createUnifiedResponse(
        aiPrompt,
        aiSettings,
        aiContext
      );

      // Parse della risposta AI (dovrebbe essere JSON strutturato)
      const responseContent = aiResponse.response || aiResponse.content || aiResponse.text || JSON.stringify(aiResponse);
      const decision = this.parseAIDecision(responseContent);
      
      console.log(`[WORKFLOW-AI] 💡 AI Decision:`, {
        selectedTeam: decision.selectedTeam,
        flow: decision.flow,
        autoApprove: decision.autoApprove,
        reasoning: decision.reasoning.substring(0, 100) + '...'
      });

      return decision;

    } catch (error) {
      console.error(`[WORKFLOW-AI] ❌ Error getting AI decision:`, error);
      
      // Fallback a decisione predefinita
      return this.getFallbackDecision(context);
    }
  }

  /**
   * Costruisce prompt strutturato per workflow-assistant
   */
  private buildAIPrompt(context: WorkflowContext): string {
    const { request, user, eligibleTeams, teamAssignments } = context;
    
    // Estrai business data rilevanti
    const requestData = {
      type: request.requestType,
      subtype: request.requestSubtype,
      category: request.category,
      priority: request.priority,
      days: this.extractDaysFromRequest(request),
      amount: this.extractAmountFromRequest(request),
      department: user.department,
      description: request.description
    };

    // Team disponibili con condizioni
    const teamsInfo = eligibleTeams.map(team => ({
      id: team.id,
      name: team.name,
      type: team.teamType,
      userMembers: team.userMembers,
      roleMembers: team.roleMembers,
      supervisor: team.primarySupervisor
    }));

    // Regole business da teamAssignments
    const businessRules = teamAssignments.map(assignment => ({
      teamId: assignment.teamId,
      conditions: assignment.conditions,
      priority: assignment.priority,
      overrides: assignment.overrides
    }));

    return `
ANALIZZA QUESTA RICHIESTA AZIENDALE E DETERMINA IL WORKFLOW OTTIMALE:

RICHIESTA:
- Tipo: ${requestData.type}
- Sottotipo: ${requestData.subtype || 'N/A'}
- Categoria: ${requestData.category}
- Priorità: ${requestData.priority}
- Giorni: ${requestData.days || 'N/A'}
- Importo: ${requestData.amount || 'N/A'}
- Dipartimento: ${requestData.department || 'N/A'}
- Descrizione: ${requestData.description || 'N/A'}

TEAMS DISPONIBILI:
${JSON.stringify(teamsInfo, null, 2)}

REGOLE BUSINESS:
${JSON.stringify(businessRules, null, 2)}

DETERMINA:
1. Quale team deve gestire la richiesta
2. Chi deve approvare (sequenziale o parallelo)
3. SLA appropriato in ore
4. Se auto-approvare in base alle regole
5. Path di escalation

Rispondi SOLO con JSON valido nel formato richiesto.
`;
  }

  /**
   * Parse risposta AI in formato strutturato
   */
  private parseAIDecision(aiResponseContent: string): WorkflowRoutingDecision {
    try {
      // Estrai JSON dalla risposta AI (potrebbero esserci spiegazioni aggiuntive)
      const jsonMatch = aiResponseContent.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : aiResponseContent;
      
      const parsed = JSON.parse(jsonString);
      
      // Valida campi obbligatori e fornisci defaults
      return {
        selectedTeam: parsed.selectedTeam || '',
        approvers: Array.isArray(parsed.approvers) ? parsed.approvers : [],
        flow: ['sequential', 'parallel'].includes(parsed.flow) ? parsed.flow : 'sequential',
        priority: ['low', 'normal', 'high', 'urgent'].includes(parsed.priority) ? parsed.priority : 'normal',
        sla: parsed.sla || '48',
        reasoning: parsed.reasoning || 'AI decision based on business rules',
        autoApprove: Boolean(parsed.autoApprove),
        escalationPath: Array.isArray(parsed.escalationPath) ? parsed.escalationPath : []
      };

    } catch (error) {
      console.error(`[WORKFLOW-AI] ❌ Error parsing AI decision:`, error);
      console.error(`[WORKFLOW-AI] Raw AI response:`, aiResponseContent);
      
      throw new Error('Invalid AI response format');
    }
  }

  /**
   * Applica decisione AI al sistema di workflow
   */
  private async applyAIDecision(context: WorkflowContext, decision: WorkflowRoutingDecision): Promise<{workflowInstanceId?: string}> {
    try {
      // Se auto-approve, aggiorna direttamente la richiesta
      if (decision.autoApprove) {
        console.log(`[WORKFLOW-AI] ⚡ Auto-approving request ${context.request.id}`);
        
        await db
          .update(universalRequests)
          .set({
            status: 'approved',
            currentApproverId: null,
            approvalChain: [{
              approverId: 'ai-system',
              action: 'approved',
              timestamp: new Date().toISOString(),
              reasoning: `AI Auto-approval: ${decision.reasoning}`
            }],
            updatedAt: new Date()
          })
          .where(eq(universalRequests.id, context.request.id));

        return {};
      }

      // Altrimenti, crea workflow instance se necessario
      console.log(`[WORKFLOW-AI] 🔄 Creating workflow instance for manual approval`);
      
      // TODO: Integrazione con workflow engine esistente
      // Per ora aggiorna solo lo status della richiesta
      await db
        .update(universalRequests)
        .set({
          status: 'pending',
          priority: decision.priority,
          dueDate: new Date(Date.now() + parseInt(decision.sla) * 60 * 60 * 1000), // SLA in ore
          updatedAt: new Date()
        })
        .where(eq(universalRequests.id, context.request.id));

      return {};

    } catch (error) {
      console.error(`[WORKFLOW-AI] ❌ Error applying AI decision:`, error);
      throw error;
    }
  }

  /**
   * Fallback decision se AI non disponibile
   */
  private getFallbackDecision(context: WorkflowContext): WorkflowRoutingDecision {
    console.log(`[WORKFLOW-AI] ⚠️ Using fallback decision for request ${context.request.id}`);
    
    // Logica semplificata basata su tipo richiesta
    const requestType = context.request.requestType;
    
    if (requestType === 'leave_request') {
      return {
        selectedTeam: context.eligibleTeams[0]?.id || '',
        approvers: ['manager', 'hr'],
        flow: 'sequential',
        priority: 'normal',
        sla: '48',
        reasoning: 'Fallback: Standard leave approval flow',
        autoApprove: false,
        escalationPath: ['hr_director']
      };
    }

    // Default fallback
    return {
      selectedTeam: context.eligibleTeams[0]?.id || '',
      approvers: ['manager'],
      flow: 'sequential',
      priority: 'normal',
      sla: '24',
      reasoning: 'Fallback: Default approval flow',
      autoApprove: false,
      escalationPath: []
    };
  }

  /**
   * Utility: Estrai giorni dalla richiesta (per ferie, congedi)
   */
  private extractDaysFromRequest(request: UniversalRequest): number | null {
    try {
      // Calcola giorni da startDate e endDate se presenti
      if (request.startDate && request.endDate) {
        const start = new Date(request.startDate);
        const end = new Date(request.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
      }

      // Cerca pattern nel description o requestData
      const requestData = request.requestData as any;
      if (requestData?.days) return requestData.days;
      if (requestData?.duration) return requestData.duration;

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Utility: Estrai importo dalla richiesta (per spese, budget)
   */
  private extractAmountFromRequest(request: UniversalRequest): number | null {
    try {
      const requestData = request.requestData as any;
      if (requestData?.amount) return requestData.amount;
      if (requestData?.total) return requestData.total;
      if (requestData?.cost) return requestData.cost;

      return null;
    } catch {
      return null;
    }
  }
}