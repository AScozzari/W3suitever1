// Compliance Dashboard Component
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useComplianceMetrics } from '@/hooks/useHRAnalytics';
import { cn } from '@/lib/utils';
import {
  RadialBarChart,
  RadialBar,
  PolarGrid,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  FileWarning,
  Clock,
  Award,
  FileText,
  UserCheck,
  AlertCircle,
  Info,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';

interface ComplianceDashboardProps {
  showDetails?: boolean;
}

export default function ComplianceDashboard({ showDetails = true }: ComplianceDashboardProps) {
  const { data, isLoading, error } = useComplianceMetrics();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Errore nel caricamento delle metriche di compliance. Riprova più tardi.
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertDescription>Nessun dato di compliance disponibile.</AlertDescription>
      </Alert>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { variant: 'success' as const, label: 'Ottimo' };
    if (score >= 70) return { variant: 'warning' as const, label: 'Attenzione' };
    return { variant: 'destructive' as const, label: 'Critico' };
  };

  const overallStatus = getScoreBadge(data.overallScore);
  
  const radialData = [{
    name: 'Compliance',
    value: data.overallScore,
    fill: data.overallScore >= 90 ? '#10b981' : data.overallScore >= 70 ? '#f59e0b' : '#ef4444'
  }];

  const complianceAreas = [
    {
      name: 'Documenti',
      score: data.documentCompliance?.score || 0,
      icon: FileText
    },
    {
      name: 'Orario Lavoro',
      score: data.workingTimeCompliance?.score || 0,
      icon: Clock
    },
    {
      name: 'Formazione',
      score: data.trainingCompliance?.score || 0,
      icon: Award
    },
    {
      name: 'Contratti',
      score: data.contractCompliance?.score || 0,
      icon: FileText
    }
  ];

  return (
    <div className="space-y-6" data-testid="compliance-dashboard">
      {/* Overall Compliance Score */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Compliance Score Generale</CardTitle>
              <CardDescription>
                Valutazione complessiva della conformità normativa
              </CardDescription>
            </div>
            <Badge variant={overallStatus.variant} className="text-lg px-3 py-1">
              {overallStatus.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Radial Score Chart */}
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={radialData}>
                  <PolarGrid />
                  <RadialBar dataKey="value" cornerRadius={10} fill={radialData[0].fill} />
                  <PolarRadiusAxis 
                    tick={false} 
                    domain={[0, 100]} 
                    axisLine={false}
                  />
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-current">
                    <tspan x="50%" dy="-0.5em" className="text-3xl font-bold">
                      {data.overallScore}%
                    </tspan>
                    <tspan x="50%" dy="1.5em" className="text-sm text-muted-foreground">
                      Compliance
                    </tspan>
                  </text>
                </RadialBarChart>
              </ResponsiveContainer>
            </div>

            {/* Issues Summary */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-red-600" />
                  <span className="font-medium">Criticità</span>
                </div>
                <Badge variant="destructive">{data.issues?.critical || 0}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium">Avvertimenti</span>
                </div>
                <Badge variant="warning">{data.issues?.warning || 0}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Informazioni</span>
                </div>
                <Badge variant="secondary">{data.issues?.info || 0}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Areas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {complianceAreas.map((area) => {
          const Icon = area.icon;
          const scoreStatus = getScoreBadge(area.score);
          
          return (
            <Card key={area.name}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{area.name}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <span className={getScoreColor(area.score)}>
                    {area.score}%
                  </span>
                </div>
                <Progress value={area.score} className="h-2 mt-2" />
                <Badge variant={scoreStatus.variant} className="mt-2 text-xs">
                  {scoreStatus.label}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Compliance Sections */}
      {showDetails && (
        <>
          {/* Document Compliance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Compliance Documentale
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Documenti Scaduti</p>
                    <p className="text-2xl font-bold text-red-600">
                      {data.documentCompliance?.expiredDocuments || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">In Scadenza (30gg)</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {data.documentCompliance?.upcomingExpirations || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Score</p>
                    <p className="text-2xl font-bold">
                      {data.documentCompliance?.score || 0}%
                    </p>
                  </div>
                </div>
                
                {data.documentCompliance?.expiredDocuments > 0 && (
                  <Alert variant="destructive">
                    <FileWarning className="h-4 w-4" />
                    <AlertTitle>Azione Richiesta</AlertTitle>
                    <AlertDescription>
                      Ci sono {data.documentCompliance.expiredDocuments} documenti scaduti 
                      che richiedono rinnovo immediato.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Working Time Compliance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Compliance Orario di Lavoro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Violazioni Totali</p>
                    <p className="text-2xl font-bold text-red-600">
                      {data.workingTimeCompliance?.violations || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Riposi Violati</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {data.workingTimeCompliance?.restPeriodViolations || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Straordinari Eccessivi</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {data.workingTimeCompliance?.overtimeViolations || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Score</p>
                    <p className="text-2xl font-bold">
                      {data.workingTimeCompliance?.score || 0}%
                    </p>
                  </div>
                </div>
                
                {data.workingTimeCompliance?.violations > 0 && (
                  <Alert variant="warning">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Rilevate violazioni delle normative sull'orario di lavoro. 
                      Verificare i turni e i riposi del personale.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Training Compliance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Compliance Formativa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Certificazioni Scadute</p>
                    <p className="text-2xl font-bold text-red-600">
                      {data.trainingCompliance?.expiredCertifications || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Formazione in Programma</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {data.trainingCompliance?.upcomingTraining || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Score</p>
                    <p className="text-2xl font-bold">
                      {data.trainingCompliance?.score || 0}%
                    </p>
                  </div>
                </div>
                
                {data.trainingCompliance?.expiredCertifications > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {data.trainingCompliance.expiredCertifications} dipendenti hanno 
                      certificazioni scadute che necessitano rinnovo.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contract Compliance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Compliance Contrattuale
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Contratti Scaduti</p>
                    <p className="text-2xl font-bold text-red-600">
                      {data.contractCompliance?.expiredContracts || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rinnovi in Sospeso</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {data.contractCompliance?.renewalsPending || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Score</p>
                    <p className="text-2xl font-bold">
                      {data.contractCompliance?.score || 0}%
                    </p>
                  </div>
                </div>
                
                {data.contractCompliance?.renewalsPending > 0 && (
                  <Alert>
                    <AlertDescription>
                      Ci sono {data.contractCompliance.renewalsPending} contratti 
                      in attesa di rinnovo.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Quick Actions */}
      {(data.issues?.critical > 0 || data.issues?.warning > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Azioni Consigliate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.documentCompliance?.expiredDocuments > 0 && (
                <Button variant="outline" className="w-full justify-start">
                  <FileWarning className="h-4 w-4 mr-2" />
                  Gestisci Documenti Scaduti ({data.documentCompliance.expiredDocuments})
                </Button>
              )}
              {data.workingTimeCompliance?.violations > 0 && (
                <Button variant="outline" className="w-full justify-start">
                  <Clock className="h-4 w-4 mr-2" />
                  Rivedi Violazioni Orario ({data.workingTimeCompliance.violations})
                </Button>
              )}
              {data.trainingCompliance?.expiredCertifications > 0 && (
                <Button variant="outline" className="w-full justify-start">
                  <Award className="h-4 w-4 mr-2" />
                  Programma Formazione ({data.trainingCompliance.expiredCertifications})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}