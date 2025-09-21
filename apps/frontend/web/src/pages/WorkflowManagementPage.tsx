import React, { useState } from 'react';
import WorkflowBuilder from '../components/WorkflowBuilder';
import PositionsManager from '../components/PositionsManager';
import ActionLibrary from '../components/ActionLibrary';
import Layout from '../components/Layout';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  Workflow,
  Users,
  FileText,
  Activity,
  Plus,
  Play,
  Pause,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  Target,
  BarChart3
} from 'lucide-react';

/**
 * WORKFLOW MANAGEMENT PAGE
 * 
 * Universal scalable approval hierarchy system per W3 Suite
 * Architettura team-based supervision con RBAC integration
 * 
 * 4 TAB PRINCIPALI:
 * 1. Workflow Builder - Visual workflow creation con React Flow
 * 2. Team Management - Teams, supervisors, assignments N:M
 * 3. Templates - Libreria template predefiniti per 6 categorie
 * 4. Execution Monitor - Monitoring workflow attivi e analytics
 */
export default function WorkflowManagementPage() {
  const [activeTab, setActiveTab] = useState('builder');
  const [currentModule, setCurrentModule] = useState('workflow-management');

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* HEADER SECTION */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-purple-600">
                <Workflow className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  Workflow Management
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  Universal approval hierarchy system with team-based supervision
                </p>
              </div>
            </div>
            
            {/* QUICK STATS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="border-l-4 border-l-orange-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Active Workflows
                      </p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        12
                      </p>
                    </div>
                    <Activity className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Teams Assigned
                      </p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        8
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Templates
                      </p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        24
                      </p>
                    </div>
                    <FileText className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Success Rate
                      </p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        94%
                      </p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* MAIN TABS */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4 h-auto">
              <TabsTrigger 
                value="builder" 
                className="flex items-center gap-2 h-12"
                data-testid="tab-workflow-builder"
              >
                <Zap className="w-4 h-4" />
                <span className="hidden sm:inline">Workflow Builder</span>
                <span className="sm:hidden">Builder</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="teams" 
                className="flex items-center gap-2 h-12"
                data-testid="tab-team-management"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Team Management</span>
                <span className="sm:hidden">Teams</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="templates" 
                className="flex items-center gap-2 h-12"
                data-testid="tab-templates"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Templates</span>
                <span className="sm:hidden">Templates</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="monitor" 
                className="flex items-center gap-2 h-12"
                data-testid="tab-execution-monitor"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Execution Monitor</span>
                <span className="sm:hidden">Monitor</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: WORKFLOW BUILDER */}
            <TabsContent value="builder" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Visual Builder Area */}
                <div className="lg:col-span-2">
                  <Card className="h-[600px]">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-orange-500" />
                        Visual Workflow Builder
                      </CardTitle>
                      <CardDescription>
                        Drag and drop workflow components to create approval chains
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="h-[500px] rounded-b-lg overflow-hidden">
                        <WorkflowBuilder 
                          onSave={(nodes, edges) => {
                            console.log('Workflow saved:', { nodes, edges });
                            // TODO: Save to database via API
                          }}
                          onRun={(nodes, edges) => {
                            console.log('Workflow running:', { nodes, edges });
                            // TODO: Execute workflow via API
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Action Library Sidebar */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Action Library</CardTitle>
                      <CardDescription>
                        Drag actions into your workflow
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4">
                      <ActionLibrary
                        onActionDrag={(action) => {
                          console.log('Action dragged from library:', action);
                          // TODO: Integrate with WorkflowBuilder drag-and-drop
                        }}
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: TEAM MANAGEMENT - POSITIONS SYSTEM */}
            <TabsContent value="teams" className="space-y-6">
              <PositionsManager
                onPositionSelect={(position) => {
                  console.log('Position selected for workflow assignment:', position);
                  // TODO: Integrate with workflow builder for node assignment
                }}
              />
            </TabsContent>

            {/* TAB 3: TEMPLATES */}
            <TabsContent value="templates" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-500" />
                    Workflow Templates
                  </CardTitle>
                  <CardDescription>
                    Pre-built templates for HR, Finance, Operations, IT, CRM, Support, and Sales
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { category: 'HR', count: 12, color: 'bg-green-500', description: 'Ferie, permessi, malattie, valutazioni' },
                      { category: 'Finance', count: 8, color: 'bg-blue-500', description: 'Spese, budget, pagamenti, approvazioni' },
                      { category: 'Operations', count: 6, color: 'bg-orange-500', description: 'Magazzino, produzione, logistica' },
                      { category: 'IT', count: 5, color: 'bg-purple-500', description: 'Hardware, software, accessi, sicurezza' },
                      { category: 'CRM', count: 4, color: 'bg-pink-500', description: 'Sconti, contratti, lead management' },
                      { category: 'Support', count: 3, color: 'bg-yellow-500', description: 'Rimborsi, escalation, ticket priority' },
                      { category: 'Sales', count: 7, color: 'bg-cyan-500', description: 'Preventivi, commissioni, autorizzazioni' }
                    ].map((template) => (
                      <Card key={template.category} className="cursor-pointer hover:shadow-md transition-shadow" data-testid={`template-${template.category.toLowerCase()}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">{template.category}</h3>
                            <div className={`w-3 h-3 rounded-full ${template.color}`} />
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                            {template.description}
                          </p>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">{template.count} templates</span>
                            <Badge variant="outline" className="text-xs">RBAC</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 4: EXECUTION MONITOR */}
            <TabsContent value="monitor" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-green-500" />
                        Active Workflow Executions
                      </CardTitle>
                      <CardDescription>
                        Real-time monitoring and analytics
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Mock active workflows */}
                        {[
                          { id: '1', name: 'Leave Request - Maria Rossi', status: 'pending', step: '2/3' },
                          { id: '2', name: 'Expense Approval - Budget Q3', status: 'running', step: '1/4' },
                          { id: '3', name: 'IT Support - New Hardware', status: 'paused', step: '3/3' }
                        ].map((workflow) => (
                          <div key={workflow.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`workflow-execution-${workflow.id}`}>
                            <div>
                              <p className="font-medium">{workflow.name}</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                Step {workflow.step}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={workflow.status === 'pending' ? 'outline' : 
                                        workflow.status === 'running' ? 'default' : 'secondary'}
                              >
                                {workflow.status === 'running' && <Play className="w-3 h-3 mr-1" />}
                                {workflow.status === 'paused' && <Pause className="w-3 h-3 mr-1" />}
                                {workflow.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                                {workflow.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">System Health</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Workflow Engine</span>
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Healthy
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Database</span>
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Connected
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Queue System</span>
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button variant="outline" className="w-full justify-start" data-testid="button-pause-all">
                        <Pause className="w-4 h-4 mr-2" />
                        Pause All Workflows
                      </Button>
                      <Button variant="outline" className="w-full justify-start" data-testid="button-export-logs">
                        <FileText className="w-4 h-4 mr-2" />
                        Export Execution Logs
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}