/**
 * 📊 COVERAGE DASHBOARD V2 - 5-Level Analysis + Health Checks
 * 
 * Complete coverage analysis for workflow & team management:
 * - L1: Team Coverage - Every department has at least one team
 * - L2: User Coverage - Every user belongs to at least one team
 * - L3: Action Coverage - Actions have active flows configured
 * - L4: Team-Action Coverage - Teams are covered by active actions
 * - L5: Workflow Health - Workflows are active and being used
 * - Health Checks: Critical issues requiring attention
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Building2,
  Users,
  Settings,
  Workflow,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Activity,
  Clock,
  Shield,
  UserX,
  RefreshCw,
  Layers
} from 'lucide-react';

interface CoverageDashboardV2Props {
  onNavigateToTeam?: (teamId: string) => void;
  onNavigateToAction?: (actionId: string) => void;
  onNavigateToWorkflow?: (workflowId: string) => void;
}

interface CoverageData {
  overview: {
    overallScore: number;
    overallHealth: 'healthy' | 'warning' | 'critical';
    scores: {
      level1: number;
      level2: number;
      level3: number;
      level4: number;
      level5: number;
    };
    totalIssues: number;
  };
  healthChecks: {
    teamsWithoutSupervisor: Array<{ id: string; name: string; type: string }>;
    actionsWithoutSLA: Array<{ id: string; name: string; department: string; type: string }>;
    disabledWorkflowsInUse: Array<{ id: string; name: string; usedInActions: number; type: string }>;
    teamsWithoutMembers: Array<{ id: string; name: string; type: string }>;
    teamsWithoutObservers: Array<{ id: string; name: string; type: string }>;
  };
  level1: {
    name: string;
    description: string;
    summary: {
      totalDepartments: number;
      coveredDepartments: number;
      uncoveredDepartments: number;
    };
    data: Array<{
      departmentId: string;
      departmentCode: string;
      departmentName: string;
      hasTeams: boolean;
      teamCount: number;
      teams: Array<{ id: string; name: string; memberCount: number; hasSupervisor: boolean }>;
      status: 'ok' | 'warning' | 'critical';
    }>;
  };
  level2: {
    name: string;
    description: string;
    summary: {
      totalUsers: number;
      usersWithTeam: number;
      usersWithoutTeam: number;
    };
    data: {
      summary: { totalUsers: number; usersWithTeam: number; usersWithoutTeam: number };
      usersWithoutTeam: Array<{
        userId: string;
        userName: string;
        userEmail: string;
        userRole: string;
      }>;
      departmentBreakdown: Array<{
        departmentCode: string;
        departmentName: string;
        usersWithCoverage: number;
        usersWithoutCoverage: number;
        coveragePercent: number;
      }>;
    };
  };
  level3: {
    name: string;
    description: string;
    summary: {
      totalActions: number;
      activeActions: number;
      inactiveActions: number;
      withWorkflow: number;
      withDefault: number;
    };
    data: Array<{
      departmentCode: string;
      departmentName: string;
      totalActions: number;
      activeActions: number;
      inactiveActions: number;
      coveragePercent: number;
      actions: Array<{
        id: string;
        actionId: string;
        actionName: string;
        flowType: string;
        isActive: boolean;
        teamCount: number;
        hasWorkflow: boolean;
        slaHours: number | null;
      }>;
      status: 'ok' | 'warning' | 'critical';
    }>;
  };
  level4: {
    name: string;
    description: string;
    summary: {
      totalTeams: number;
      teamsCoveredByActions: number;
      teamsNotCovered: number;
    };
    data: Array<{
      teamId: string;
      teamName: string;
      teamType: string;
      departments: string[];
      memberCount: number;
      hasSupervisor: boolean;
      hasSecondarySupervisor: boolean;
      observerCount: number;
      coveredByActions: number;
      actions: Array<{ actionId: string; actionName: string; flowType: string }>;
      status: 'ok' | 'warning' | 'critical';
    }>;
  };
  level5: {
    name: string;
    description: string;
    summary: {
      totalWorkflows: number;
      activeWorkflows: number;
      disabledWorkflows: number;
      neverUsed: number;
      usedButDisabled: number;
    };
    data: Array<{
      workflowId: string;
      workflowName: string;
      category: string;
      isActive: boolean;
      usageCount: number;
      lastUsed: string | null;
      usedInActionsCount: number;
      isUsedButDisabled: boolean;
      neverUsed: boolean;
      status: 'ok' | 'warning' | 'critical';
    }>;
  };
}

export default function CoverageDashboardV2({
  onNavigateToTeam,
  onNavigateToAction,
  onNavigateToWorkflow
}: CoverageDashboardV2Props) {
  const [expandedLevels, setExpandedLevels] = useState<Record<string, boolean>>({
    level1: false,
    level2: false,
    level3: false,
    level4: false,
    level5: false,
    health: true
  });

  const { data, isLoading, refetch, isFetching } = useQuery<CoverageData>({
    queryKey: ['/api/admin/coverage-dashboard-v2']
  });

  const toggleLevel = (level: string) => {
    setExpandedLevels(prev => ({ ...prev, [level]: !prev[level] }));
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthBg = (health: string) => {
    switch (health) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: 'ok' | 'warning' | 'critical') => {
    switch (status) {
      case 'ok': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical': return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: 'ok' | 'warning' | 'critical') => {
    switch (status) {
      case 'ok': return <Badge className="bg-green-100 text-green-700 border-green-200">OK</Badge>;
      case 'warning': return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Attenzione</Badge>;
      case 'critical': return <Badge className="bg-red-100 text-red-700 border-red-200">Critico</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-windtre-orange"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="windtre-glass-panel">
        <CardContent className="py-8 text-center text-gray-500">
          Nessun dato disponibile
        </CardContent>
      </Card>
    );
  }

  const totalHealthIssues = 
    data.healthChecks.teamsWithoutSupervisor.length +
    data.healthChecks.actionsWithoutSLA.length +
    data.healthChecks.disabledWorkflowsInUse.length +
    data.healthChecks.teamsWithoutMembers.length;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* ==================== HEADER SEMAFORO ==================== */}
        <Card className={`windtre-glass-panel border-l-4 ${
          data.overview.overallHealth === 'critical' ? 'border-l-red-500' :
          data.overview.overallHealth === 'warning' ? 'border-l-yellow-500' :
          'border-l-green-500'
        }`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${getHealthBg(data.overview.overallHealth)}`}>
                  <span className="text-2xl font-bold text-white">{data.overview.overallScore}%</span>
                </div>
                <div>
                  <CardTitle className="text-xl">Coverage Dashboard V2</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <span className={`font-medium ${getHealthColor(data.overview.overallHealth)}`}>
                      {data.overview.overallHealth === 'healthy' ? 'Sistema Sano' :
                       data.overview.overallHealth === 'warning' ? 'Richiede Attenzione' :
                       'Problemi Critici'}
                    </span>
                    {totalHealthIssues > 0 && (
                      <Badge variant="destructive" className="ml-2">
                        {totalHealthIssues} issue{totalHealthIssues > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                data-testid="button-refresh-coverage"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                Aggiorna
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4 mt-4">
              {[
                { label: 'L1: Team', score: data.overview.scores.level1, icon: Building2 },
                { label: 'L2: Utenti', score: data.overview.scores.level2, icon: Users },
                { label: 'L3: Azioni', score: data.overview.scores.level3, icon: Settings },
                { label: 'L4: Copertura', score: data.overview.scores.level4, icon: Layers },
                { label: 'L5: Workflow', score: data.overview.scores.level5, icon: Workflow }
              ].map((item, idx) => (
                <div key={idx} className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <item.icon className="h-4 w-4 text-gray-500" />
                    <span className="text-xs text-gray-600">{item.label}</span>
                  </div>
                  <Progress value={item.score} className="h-2" />
                  <span className="text-sm font-medium">{item.score}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ==================== HEALTH CHECKS ==================== */}
        {totalHealthIssues > 0 && (
          <Collapsible open={expandedLevels.health} onOpenChange={() => toggleLevel('health')}>
            <Card className="windtre-glass-panel border-l-4 border-l-red-500">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      Health Checks
                      <Badge variant="destructive">{totalHealthIssues}</Badge>
                    </div>
                    {expandedLevels.health ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </CardTitle>
                  <CardDescription>Problemi che richiedono attenzione immediata</CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="space-y-3">
                    {data.healthChecks.teamsWithoutSupervisor.length > 0 && (
                      <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                        <h4 className="font-medium text-red-700 flex items-center gap-2 mb-2">
                          <Shield className="h-4 w-4" />
                          Team senza Supervisore ({data.healthChecks.teamsWithoutSupervisor.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {data.healthChecks.teamsWithoutSupervisor.map(team => (
                            <Badge 
                              key={team.id} 
                              variant="outline" 
                              className="cursor-pointer hover:bg-red-100"
                              onClick={() => onNavigateToTeam?.(team.id)}
                              data-testid={`health-team-no-supervisor-${team.id}`}
                            >
                              {team.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {data.healthChecks.teamsWithoutMembers.length > 0 && (
                      <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <h4 className="font-medium text-yellow-700 flex items-center gap-2 mb-2">
                          <UserX className="h-4 w-4" />
                          Team senza Membri ({data.healthChecks.teamsWithoutMembers.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {data.healthChecks.teamsWithoutMembers.map(team => (
                            <Badge 
                              key={team.id} 
                              variant="outline" 
                              className="cursor-pointer hover:bg-yellow-100"
                              onClick={() => onNavigateToTeam?.(team.id)}
                              data-testid={`health-team-no-members-${team.id}`}
                            >
                              {team.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {data.healthChecks.actionsWithoutSLA.length > 0 && (
                      <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <h4 className="font-medium text-orange-700 flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4" />
                          Azioni senza SLA ({data.healthChecks.actionsWithoutSLA.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {data.healthChecks.actionsWithoutSLA.map(action => (
                            <Badge 
                              key={action.id} 
                              variant="outline" 
                              className="cursor-pointer hover:bg-orange-100"
                              onClick={() => onNavigateToAction?.(action.id)}
                              data-testid={`health-action-no-sla-${action.id}`}
                            >
                              {action.name} ({action.department})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {data.healthChecks.disabledWorkflowsInUse.length > 0 && (
                      <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                        <h4 className="font-medium text-red-700 flex items-center gap-2 mb-2">
                          <XCircle className="h-4 w-4" />
                          Workflow Disabilitati in Uso ({data.healthChecks.disabledWorkflowsInUse.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {data.healthChecks.disabledWorkflowsInUse.map(wf => (
                            <Badge 
                              key={wf.id} 
                              variant="outline" 
                              className="cursor-pointer hover:bg-red-100"
                              onClick={() => onNavigateToWorkflow?.(wf.id)}
                              data-testid={`health-workflow-disabled-${wf.id}`}
                            >
                              {wf.name} (usato in {wf.usedInActions} azioni)
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* ==================== LEVEL 1: TEAM COVERAGE ==================== */}
        <Collapsible open={expandedLevels.level1} onOpenChange={() => toggleLevel('level1')}>
          <Card className={`windtre-glass-panel border-l-4 ${
            data.overview.scores.level1 === 100 ? 'border-l-green-500' :
            data.overview.scores.level1 >= 50 ? 'border-l-yellow-500' :
            'border-l-red-500'
          }`}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-windtre-purple" />
                    {data.level1.name}
                    <Badge variant="outline">
                      {data.level1.summary.coveredDepartments}/{data.level1.summary.totalDepartments}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{data.overview.scores.level1}%</span>
                    {expandedLevels.level1 ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </div>
                </CardTitle>
                <CardDescription>{data.level1.description}</CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.level1.data.map(dept => (
                    <div 
                      key={dept.departmentId}
                      className={`p-4 rounded-lg border-2 ${
                        dept.status === 'critical' ? 'border-red-300 bg-red-50' :
                        dept.status === 'warning' ? 'border-yellow-300 bg-yellow-50' :
                        'border-green-300 bg-green-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">{dept.departmentName}</h4>
                        {getStatusBadge(dept.status)}
                      </div>
                      
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600">Team:</span>
                        <span className={`font-medium ${dept.teamCount === 0 ? 'text-red-600' : 'text-gray-900'}`}>
                          {dept.teamCount}
                        </span>
                      </div>

                      {dept.teams.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="space-y-1">
                            {dept.teams.slice(0, 3).map(team => (
                              <div 
                                key={team.id} 
                                className="flex items-center gap-2 text-xs cursor-pointer hover:bg-white/50 p-1 rounded"
                                onClick={() => onNavigateToTeam?.(team.id)}
                              >
                                <Users className="h-3 w-3 text-gray-400" />
                                <span>{team.name}</span>
                                <span className="text-gray-400">({team.memberCount})</span>
                                {team.hasSupervisor && <Shield className="h-3 w-3 text-green-500" />}
                              </div>
                            ))}
                            {dept.teams.length > 3 && (
                              <span className="text-xs text-gray-500">+{dept.teams.length - 3} altri</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* ==================== LEVEL 2: USER COVERAGE ==================== */}
        <Collapsible open={expandedLevels.level2} onOpenChange={() => toggleLevel('level2')}>
          <Card className={`windtre-glass-panel border-l-4 ${
            data.overview.scores.level2 === 100 ? 'border-l-green-500' :
            data.overview.scores.level2 >= 50 ? 'border-l-yellow-500' :
            'border-l-red-500'
          }`}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-windtre-orange" />
                    {data.level2.name}
                    <Badge variant="outline">
                      {data.level2.summary.usersWithTeam}/{data.level2.summary.totalUsers}
                    </Badge>
                    {data.level2.summary.usersWithoutTeam > 0 && (
                      <Badge variant="destructive">{data.level2.summary.usersWithoutTeam} orfani</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{data.overview.scores.level2}%</span>
                    {expandedLevels.level2 ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </div>
                </CardTitle>
                <CardDescription>{data.level2.description}</CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                {data.level2.data.usersWithoutTeam.length > 0 && (
                  <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
                    <h4 className="font-medium text-red-700 mb-2">Utenti senza Team</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {data.level2.data.usersWithoutTeam.slice(0, 6).map(user => (
                        <div key={user.userId} className="flex items-center gap-2 text-sm">
                          <UserX className="h-4 w-4 text-red-400" />
                          <span>{user.userName}</span>
                          <span className="text-gray-400">({user.userRole})</span>
                        </div>
                      ))}
                      {data.level2.data.usersWithoutTeam.length > 6 && (
                        <span className="text-sm text-gray-500">+{data.level2.data.usersWithoutTeam.length - 6} altri</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.level2.data.departmentBreakdown.map(dept => (
                    <div key={dept.departmentCode} className="p-4 rounded-lg border bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{dept.departmentName}</h4>
                        <span className="text-sm font-medium">{dept.coveragePercent}%</span>
                      </div>
                      <Progress value={dept.coveragePercent} className="h-2" />
                      <div className="flex justify-between mt-2 text-xs text-gray-500">
                        <span>{dept.usersWithCoverage} coperti</span>
                        <span>{dept.usersWithoutCoverage} mancanti</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* ==================== LEVEL 3: ACTION COVERAGE ==================== */}
        <Collapsible open={expandedLevels.level3} onOpenChange={() => toggleLevel('level3')}>
          <Card className={`windtre-glass-panel border-l-4 ${
            data.overview.scores.level3 === 100 ? 'border-l-green-500' :
            data.overview.scores.level3 >= 50 ? 'border-l-yellow-500' :
            'border-l-red-500'
          }`}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-blue-500" />
                    {data.level3.name}
                    <Badge variant="outline">
                      {data.level3.summary.activeActions}/{data.level3.summary.totalActions}
                    </Badge>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="secondary">
                          {data.level3.summary.withWorkflow} workflow
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        {data.level3.summary.withDefault} con flusso default
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{data.overview.scores.level3}%</span>
                    {expandedLevels.level3 ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </div>
                </CardTitle>
                <CardDescription>{data.level3.description}</CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-4">
                  {data.level3.data.map(dept => (
                    <div key={dept.departmentCode} className={`p-4 rounded-lg border-2 ${
                      dept.status === 'critical' ? 'border-red-200 bg-red-50' :
                      dept.status === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                      'border-green-200 bg-green-50'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">{dept.departmentName}</h4>
                          {getStatusBadge(dept.status)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {dept.activeActions}/{dept.totalActions} attive ({dept.coveragePercent}%)
                        </div>
                      </div>
                      
                      {dept.actions.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {dept.actions.slice(0, 4).map(action => (
                            <div 
                              key={action.id} 
                              className="flex items-center justify-between p-2 bg-white/50 rounded cursor-pointer hover:bg-white/80"
                              onClick={() => onNavigateToAction?.(action.id)}
                            >
                              <div className="flex items-center gap-2">
                                {action.isActive ? 
                                  <CheckCircle className="h-4 w-4 text-green-500" /> : 
                                  <XCircle className="h-4 w-4 text-gray-300" />
                                }
                                <span className="text-sm">{action.actionName}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {action.hasWorkflow && (
                                  <Badge variant="outline" className="text-xs">workflow</Badge>
                                )}
                                {action.flowType === 'default' && (
                                  <Badge variant="secondary" className="text-xs">default</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                          {dept.actions.length > 4 && (
                            <span className="text-sm text-gray-500 p-2">+{dept.actions.length - 4} altre azioni</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* ==================== LEVEL 4: TEAM-ACTION COVERAGE ==================== */}
        <Collapsible open={expandedLevels.level4} onOpenChange={() => toggleLevel('level4')}>
          <Card className={`windtre-glass-panel border-l-4 ${
            data.overview.scores.level4 === 100 ? 'border-l-green-500' :
            data.overview.scores.level4 >= 50 ? 'border-l-yellow-500' :
            'border-l-red-500'
          }`}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-purple-500" />
                    {data.level4.name}
                    <Badge variant="outline">
                      {data.level4.summary.teamsCoveredByActions}/{data.level4.summary.totalTeams}
                    </Badge>
                    {data.level4.summary.teamsNotCovered > 0 && (
                      <Badge variant="destructive">{data.level4.summary.teamsNotCovered} non coperti</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{data.overview.scores.level4}%</span>
                    {expandedLevels.level4 ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </div>
                </CardTitle>
                <CardDescription>{data.level4.description}</CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {data.level4.data.sort((a, b) => a.coveredByActions - b.coveredByActions).map(team => (
                      <div 
                        key={team.teamId}
                        className={`p-4 rounded-lg border ${
                          team.status === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                          'border-green-200 bg-green-50'
                        } cursor-pointer hover:shadow-md transition-shadow`}
                        onClick={() => onNavigateToTeam?.(team.teamId)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900">{team.teamName}</h4>
                            <Badge variant="outline" className="text-xs">{team.teamType}</Badge>
                            {getStatusIcon(team.status)}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Users className="h-4 w-4" />
                            <span>{team.memberCount}</span>
                            {team.hasSupervisor && <Shield className="h-4 w-4 text-green-500" />}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                          <span>Dipartimenti: {team.departments.join(', ') || 'Nessuno'}</span>
                        </div>

                        {team.coveredByActions > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {team.actions.slice(0, 3).map((action, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {action.actionName}
                              </Badge>
                            ))}
                            {team.actions.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{team.actions.length - 3}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-yellow-600">Nessuna azione configurata per questo team</span>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* ==================== LEVEL 5: WORKFLOW HEALTH ==================== */}
        <Collapsible open={expandedLevels.level5} onOpenChange={() => toggleLevel('level5')}>
          <Card className={`windtre-glass-panel border-l-4 ${
            data.overview.scores.level5 === 100 ? 'border-l-green-500' :
            data.overview.scores.level5 >= 50 ? 'border-l-yellow-500' :
            'border-l-red-500'
          }`}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Workflow className="h-5 w-5 text-indigo-500" />
                    {data.level5.name}
                    <Badge variant="outline">
                      {data.level5.summary.activeWorkflows}/{data.level5.summary.totalWorkflows}
                    </Badge>
                    {data.level5.summary.usedButDisabled > 0 && (
                      <Badge variant="destructive">{data.level5.summary.usedButDisabled} critici</Badge>
                    )}
                    {data.level5.summary.neverUsed > 0 && (
                      <Badge variant="secondary">{data.level5.summary.neverUsed} mai usati</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{data.overview.scores.level5}%</span>
                    {expandedLevels.level5 ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </div>
                </CardTitle>
                <CardDescription>{data.level5.description}</CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <ScrollArea className="h-[350px]">
                  <div className="space-y-2">
                    {data.level5.data.sort((a, b) => {
                      if (a.isUsedButDisabled !== b.isUsedButDisabled) return a.isUsedButDisabled ? -1 : 1;
                      if (a.neverUsed !== b.neverUsed) return a.neverUsed ? -1 : 1;
                      return b.usageCount - a.usageCount;
                    }).map(wf => (
                      <div 
                        key={wf.workflowId}
                        className={`p-3 rounded-lg border flex items-center justify-between ${
                          wf.isUsedButDisabled ? 'border-red-200 bg-red-50' :
                          wf.neverUsed ? 'border-yellow-200 bg-yellow-50' :
                          'border-green-200 bg-green-50'
                        } cursor-pointer hover:shadow-md transition-shadow`}
                        onClick={() => onNavigateToWorkflow?.(wf.workflowId)}
                      >
                        <div className="flex items-center gap-3">
                          {getStatusIcon(wf.status)}
                          <div>
                            <span className="font-medium">{wf.workflowName}</span>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>{wf.category}</span>
                              {wf.isActive ? (
                                <Badge className="bg-green-100 text-green-700 text-xs">Attivo</Badge>
                              ) : (
                                <Badge variant="destructive" className="text-xs">Disattivato</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-sm">
                            <Activity className="h-4 w-4 text-gray-400" />
                            <span>{wf.usageCount} esecuzioni</span>
                          </div>
                          {wf.usedInActionsCount > 0 && (
                            <span className="text-xs text-gray-500">
                              In uso in {wf.usedInActionsCount} azioni
                            </span>
                          )}
                          {wf.lastUsed && (
                            <div className="text-xs text-gray-400">
                              Ultimo: {new Date(wf.lastUsed).toLocaleDateString('it-IT')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </TooltipProvider>
  );
}
