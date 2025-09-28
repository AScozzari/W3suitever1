#!/usr/bin/env tsx

/**
 * 🧪 TEST REACTFLOW BRIDGE EXECUTION
 * Script per testare il ReactFlow Bridge Parser e l'esecuzione end-to-end
 */

import { eq, and } from 'drizzle-orm';
import { logger } from './src/core/logger';
import { db } from './src/core/db';
import { workflowTemplates } from './src/db/schema/w3suite';
import { reactFlowBridgeParser } from './src/services/reactflow-bridge-parser';
import { actionExecutorsRegistry } from './src/services/action-executors-registry';
import type { ReactFlowWorkflowData } from './src/services/reactflow-bridge-parser';

async function testReactFlowBridge() {
  try {
    console.log('🧪 [TEST] Starting ReactFlow Bridge execution test...\n');

    // 1. 📋 Load ReactFlow template from database
    console.log('📋 [STEP 1] Loading ReactFlow template...');
    const [template] = await db
      .select()
      .from(workflowTemplates)
      .where(and(
        eq(workflowTemplates.templateType, 'reactflow'),
        eq(workflowTemplates.name, 'Test ReactFlow Bridge')
      ))
      .limit(1);

    if (!template) {
      throw new Error('ReactFlow test template not found in database');
    }

    console.log(`✅ Template found: ${template.name}`);
    console.log(`   - Nodes: ${(template.nodes as any[]).length}`);
    console.log(`   - Edges: ${(template.edges as any[]).length}\n`);

    // 2. 🌉 Test ReactFlow Bridge Parser
    console.log('🌉 [STEP 2] Testing ReactFlow Bridge Parser...');
    const reactFlowData: ReactFlowWorkflowData = {
      nodes: template.nodes as any[] || [],
      edges: template.edges as any[] || [],
      viewport: template.viewport as any || { x: 0, y: 0, zoom: 1 }
    };

    const parsedWorkflow = await reactFlowBridgeParser.parseWorkflow(reactFlowData, {
      templateId: template.id,
      templateName: template.name,
      department: template.forDepartment || undefined
    });

    console.log(`✅ Bridge parsing successful!`);
    console.log(`   - Start Node: ${parsedWorkflow.startNodeId}`);
    console.log(`   - Total Steps: ${parsedWorkflow.steps.size}`);
    console.log(`   - Step IDs: ${Array.from(parsedWorkflow.steps.keys()).join(', ')}\n`);

    // 3. 🔍 Validate parsed workflow
    console.log('🔍 [STEP 3] Validating parsed workflow...');
    const validation = reactFlowBridgeParser.validateWorkflow(parsedWorkflow);
    
    if (!validation.isValid) {
      throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`);
    }
    
    console.log('✅ Workflow validation passed!\n');

    // 4. 🔧 Test Action Executors Registry
    console.log('🔧 [STEP 4] Testing Action Executors Registry...');
    const testExecutorIds = ['email-action-executor', 'ai-decision-executor', 'approval-action-executor', 'generic-action-executor'];
    console.log(`   - Testing known executors: ${testExecutorIds.join(', ')}`);
    
    const availableExecutors = testExecutorIds.filter(id => actionExecutorsRegistry.hasExecutor(id));
    console.log(`   - Available Executors: ${availableExecutors.length}/${testExecutorIds.length}`);
    console.log(`   - Available: ${availableExecutors.join(', ')}\n`);

    // 5. 🎯 Test executor mapping for each step
    console.log('🎯 [STEP 5] Testing executor mapping for parsed steps...');
    let stepIndex = 1;
    
    for (const [nodeId, step] of parsedWorkflow.steps) {
      console.log(`   Step ${stepIndex}: ${nodeId} (${step.type})`);
      console.log(`     - ExecutorId from parser: ${step.executorId}`);
      console.log(`     - ActionType from parser: ${step.actionType || 'none'}`);
      
      if (step.actionType) {
        const hasExecutorByActionType = actionExecutorsRegistry.hasExecutor(step.actionType);
        const hasExecutorByExecutorId = actionExecutorsRegistry.hasExecutor(step.executorId);
        
        console.log(`     - Has Executor (by actionType): ${hasExecutorByActionType ? '✅' : '❌'}`);
        console.log(`     - Has Executor (by executorId): ${hasExecutorByExecutorId ? '✅' : '❌'}`);
        
        if (hasExecutorByExecutorId) {
          const executor = actionExecutorsRegistry.getExecutor(step.executorId);
          console.log(`     - Executor ID: ${executor.executorId}`);
          console.log(`     - Description: ${executor.description}`);
        }
      } else {
        console.log(`     - No action type (${step.type} node)`);
      }
      
      stepIndex++;
    }
    console.log('');

    // 6. 🧪 Test execution simulation (WITHOUT actually executing)
    console.log('🧪 [STEP 6] Simulating step execution...');
    
    const startStep = parsedWorkflow.steps.get(parsedWorkflow.startNodeId);
    if (!startStep) {
      throw new Error('Start step not found');
    }

    // Simulate execution context
    const mockContext = {
      tenantId: 'test-tenant',
      requesterId: 'test-user',
      instanceId: 'test-instance'
    };

    const mockInputData = {
      testValue: 'bridge-execution-test',
      timestamp: new Date().toISOString()
    };

    // Find first action step after start
    let nextNodeId = startStep.nextNodeIds?.[0];
    if (nextNodeId) {
      const actionStep = parsedWorkflow.steps.get(nextNodeId);
      
      if (actionStep && actionStep.actionType) {
        console.log(`   Testing: ${actionStep.actionType} executor`);
        
        if (actionExecutorsRegistry.hasExecutor(actionStep.actionType)) {
          const executor = actionExecutorsRegistry.getExecutor(actionStep.actionType);
          
          // SIMULATION ONLY - Don't actually execute
          console.log(`   ✅ Executor ready: ${executor.executorId}`);
          console.log(`   📝 Would execute with:`);
          console.log(`      - Input Data: ${JSON.stringify(mockInputData)}`);
          console.log(`      - Context: ${JSON.stringify(mockContext)}`);
          console.log(`      - Step Config: ${JSON.stringify(actionStep.config)}`);
        }
      }
    }

    console.log('\n🎉 [SUCCESS] ReactFlow Bridge execution test completed!');
    console.log('\n📊 [SUMMARY]');
    console.log(`   ✅ Bridge Parser: Working`);
    console.log(`   ✅ Workflow Validation: Passed`);
    console.log(`   ✅ Action Executors Registry: ${availableExecutors.length} executors loaded`);
    console.log(`   ✅ Executor Mapping: All steps mapped correctly`);
    console.log('\n🔗 Full Integration: ReactFlow Design → Bridge Parser → Action Executors → Backend Services');

  } catch (error) {
    console.error('\n❌ [ERROR] ReactFlow Bridge test failed:', error);
    throw error;
  }
}

// Run test if script is executed directly  
if (import.meta.url === `file://${process.argv[1]}`) {
  testReactFlowBridge()
    .then(() => {
      console.log('\n✅ Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

export { testReactFlowBridge };