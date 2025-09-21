import React, { useState } from 'react';
import WorkflowBuilder from '../components/WorkflowBuilder';
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
                    <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
                      {/* ===== 6 CATEGORIE SPECIFICHE BUSINESS-ALIGNED ===== */}
                      
                      {/* 1. HR - Leave, Attendance, Scheduling */}
                      <div>
                        <h4 className="font-medium text-sm text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          HR - Leave & Attendance
                        </h4>
                        <div className="space-y-1 text-xs">
                          <Badge variant="outline" className="w-full justify-start p-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" data-testid="action-hr-leave-approve">
                            <CheckCircle className="w-3 h-3 mr-2 text-green-500" />
                            hr.leave.approve.max_5d
                          </Badge>
                          <Badge variant="outline" className="w-full justify-start p-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" data-testid="action-hr-attendance-check">
                            <Clock className="w-3 h-3 mr-2 text-green-500" />
                            hr.attendance.validate.daily
                          </Badge>
                          <Badge variant="outline" className="w-full justify-start p-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" data-testid="action-hr-schedule-publish">
                            <Activity className="w-3 h-3 mr-2 text-green-500" />
                            hr.schedule.publish.weekly
                          </Badge>
                        </div>
                      </div>

                      {/* 2. Finance/Expenses - Budget Thresholds */}
                      <div>
                        <h4 className="font-medium text-sm text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          Finance/Expenses
                        </h4>
                        <div className="space-y-1 text-xs">
                          <Badge variant="outline" className="w-full justify-start p-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" data-testid="action-finance-expense-approve">
                            <CheckCircle className="w-3 h-3 mr-2 text-blue-500" />
                            finance.expense.approve.le_1000
                          </Badge>
                          <Badge variant="outline" className="w-full justify-start p-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" data-testid="action-finance-budget-validate">
                            <Target className="w-3 h-3 mr-2 text-blue-500" />
                            finance.budget.validate.monthly
                          </Badge>
                          <Badge variant="outline" className="w-full justify-start p-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" data-testid="action-finance-payment-authorize">
                            <Zap className="w-3 h-3 mr-2 text-blue-500" />
                            finance.payment.authorize.urgent
                          </Badge>
                        </div>
                      </div>

                      {/* 3. Operations/Store - Shifts, Publishing, Notifications */}
                      <div>
                        <h4 className="font-medium text-sm text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                          Operations/Store
                        </h4>
                        <div className="space-y-1 text-xs">
                          <Badge variant="outline" className="w-full justify-start p-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" data-testid="action-ops-shift-publish">
                            <Activity className="w-3 h-3 mr-2 text-orange-500" />
                            ops.shift.publish.store
                          </Badge>
                          <Badge variant="outline" className="w-full justify-start p-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" data-testid="action-ops-notification-send">
                            <Zap className="w-3 h-3 mr-2 text-orange-500" />
                            ops.notification.send.broadcast
                          </Badge>
                          <Badge variant="outline" className="w-full justify-start p-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" data-testid="action-ops-inventory-update">
                            <Settings className="w-3 h-3 mr-2 text-orange-500" />
                            ops.inventory.update.critical
                          </Badge>
                        </div>
                      </div>

                      {/* 4. Legal/Compliance - Policies, Privacy 231 */}
                      <div>
                        <h4 className="font-medium text-sm text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                          Legal/Compliance
                        </h4>
                        <div className="space-y-1 text-xs">
                          <Badge variant="outline" className="w-full justify-start p-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" data-testid="action-legal-policy-ack">
                            <CheckCircle className="w-3 h-3 mr-2 text-red-500" />
                            legal.policy.ack.tenant
                          </Badge>
                          <Badge variant="outline" className="w-full justify-start p-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" data-testid="action-legal-privacy-validate">
                            <AlertCircle className="w-3 h-3 mr-2 text-red-500" />
                            legal.privacy.validate.231
                          </Badge>
                          <Badge variant="outline" className="w-full justify-start p-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" data-testid="action-legal-gdpr-process">
                            <Users className="w-3 h-3 mr-2 text-red-500" />
                            legal.gdpr.process.request
                          </Badge>
                        </div>
                      </div>

                      {/* 5. Procurement/Suppliers - PO Approvals */}
                      <div>
                        <h4 className="font-medium text-sm text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                          Procurement/Suppliers
                        </h4>
                        <div className="space-y-1 text-xs">
                          <Badge variant="outline" className="w-full justify-start p-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" data-testid="action-procurement-supplier-create">
                            <Plus className="w-3 h-3 mr-2 text-purple-500" />
                            procurement.supplier.create
                          </Badge>
                          <Badge variant="outline" className="w-full justify-start p-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" data-testid="action-procurement-po-approve">
                            <CheckCircle className="w-3 h-3 mr-2 text-purple-500" />
                            procurement.po.approve.le_5000
                          </Badge>
                          <Badge variant="outline" className="w-full justify-start p-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" data-testid="action-procurement-contract-validate">
                            <Target className="w-3 h-3 mr-2 text-purple-500" />
                            procurement.contract.validate
                          </Badge>
                        </div>
                      </div>

                      {/* 6. IT/Security - Access, Device Provisioning */}
                      <div>
                        <h4 className="font-medium text-sm text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                          IT/Security
                        </h4>
                        <div className="space-y-1 text-xs">
                          <Badge variant="outline" className="w-full justify-start p-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" data-testid="action-it-access-grant">
                            <CheckCircle className="w-3 h-3 mr-2 text-cyan-500" />
                            it.access.grant.store
                          </Badge>
                          <Badge variant="outline" className="w-full justify-start p-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" data-testid="action-it-device-provision">
                            <Settings className="w-3 h-3 mr-2 text-cyan-500" />
                            it.device.provision.laptop
                          </Badge>
                          <Badge variant="outline" className="w-full justify-start p-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" data-testid="action-it-account-create">
                            <Users className="w-3 h-3 mr-2 text-cyan-500" />
                            it.account.create.domain
                          </Badge>
                        </div>
                      </div>

                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: TEAM MANAGEMENT */}
            <TabsContent value="teams" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* HYBRID TEAM COMPOSITION - Ruoli E/O Utenti */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-500" />
                      Team Composition (Hybrid)
                    </CardTitle>
                    <CardDescription>
                      Seleziona posizioni per ruoli E/O utenti individuali
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        <Button className="w-full" data-testid="button-create-team">
                          <Plus className="w-4 h-4 mr-2" />
                          Nuovo Team
                        </Button>
                        <Button variant="outline" className="w-full" data-testid="button-assign-workflows">
                          <Settings className="w-4 h-4 mr-2" />
                          Assegna Workflows
                        </Button>
                      </div>
                      
                      {/* MOCK TEAM LIST con N:M relationships */}
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Team Attivi:</h4>
                        
                        <div className="border rounded p-3 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">HR Approvals Team</span>
                            <Badge variant="outline" className="text-xs">3 workflows</Badge>
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">
                            <div><strong>Ruoli:</strong> hr_manager, senior_hr</div>
                            <div><strong>Utenti:</strong> Maria Rossi, Giuseppe Verdi</div>
                            <div><strong>Supervisore:</strong> Anna Bianchi (hr.supervisor)</div>
                          </div>
                        </div>
                        
                        <div className="border rounded p-3 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Finance Control Team</span>
                            <Badge variant="outline" className="text-xs">2 workflows</Badge>
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">
                            <div><strong>Ruoli:</strong> finance_manager</div>
                            <div><strong>Utenti:</strong> Luca Ferrari</div>
                            <div><strong>Supervisore:</strong> Mario Rossi (finance.approve_all)</div>
                          </div>
                        </div>
                        
                        <div className="border rounded p-3 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">IT Support Team</span>
                            <Badge variant="outline" className="text-xs">4 workflows</Badge>
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">
                            <div><strong>Ruoli:</strong> it_admin, it_support</div>
                            <div><strong>Utenti:</strong> -</div>
                            <div><strong>Supervisore:</strong> Paolo Neri (it.manage_all)</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* RBAC-VALIDATED SUPERVISOR SELECTION */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5 text-blue-500" />
                      Supervisor Selection (RBAC)
                    </CardTitle>
                    <CardDescription>
                      Solo utenti con permessi team.manage per categoria
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-sm">
                        <h4 className="font-medium mb-2">Supervisori Disponibili per Categoria:</h4>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between items-center p-2 border rounded">
                            <div>
                              <span className="font-medium">HR - Anna Bianchi</span>
                              <br />
                              <span className="text-xs text-slate-600">Permessi: hr.supervisor, team.manage.hr</span>
                            </div>
                            <Badge variant="default" className="bg-green-500">Attivo</Badge>
                          </div>
                          
                          <div className="flex justify-between items-center p-2 border rounded">
                            <div>
                              <span className="font-medium">Finance - Mario Rossi</span>
                              <br />
                              <span className="text-xs text-slate-600">Permessi: finance.approve_all, team.manage.finance</span>
                            </div>
                            <Badge variant="default" className="bg-green-500">Attivo</Badge>
                          </div>
                          
                          <div className="flex justify-between items-center p-2 border rounded">
                            <div>
                              <span className="font-medium">IT - Paolo Neri</span>
                              <br />
                              <span className="text-xs text-slate-600">Permessi: it.manage_all, team.manage.it</span>
                            </div>
                            <Badge variant="default" className="bg-green-500">Attivo</Badge>
                          </div>
                        </div>
                      </div>
                      
                      <Button variant="outline" className="w-full" data-testid="button-manage-supervisors">
                        <Settings className="w-4 h-4 mr-2" />
                        Gestisci Supervisori RBAC
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
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