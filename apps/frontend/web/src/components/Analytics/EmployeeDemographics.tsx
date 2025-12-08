// Employee Demographics Component
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useEmployeeDemographics } from '@/hooks/useHRAnalytics';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar
} from 'recharts';
import {
  Users,
  UserCheck,
  TrendingUp,
  TrendingDown,
  Briefcase,
  Calendar,
  Award,
  Globe,
  Target
} from 'lucide-react';

interface EmployeeDemographicsProps {
  filters?: any;
}

export default function EmployeeDemographics({ filters }: EmployeeDemographicsProps) {
  const { data, isLoading, error } = useEmployeeDemographics(filters);

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
        <AlertDescription>
          Errore nel caricamento dei dati demografici. Riprova più tardi.
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertDescription>Nessun dato demografico disponibile.</AlertDescription>
      </Alert>
    );
  }

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const diversityColor = data.diversityScore > 80 ? 'text-green-600' : 
                         data.diversityScore > 60 ? 'text-yellow-600' : 
                         'text-red-600';

  const turnoverColor = data.turnoverRate < 10 ? 'text-green-600' :
                        data.turnoverRate < 20 ? 'text-yellow-600' :
                        'text-red-600';

  return (
    <div className="space-y-6" data-testid="employee-demographics">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale Dipendenti</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">
              Organico attuale
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Età Media</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.averageAge} anni</div>
            <p className="text-xs text-muted-foreground">
              Range 18-65 anni
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anzianità Media</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.averageTenure} anni</div>
            <p className="text-xs text-muted-foreground">
              Tempo medio in azienda
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Turnover Rate</CardTitle>
            {data.turnoverRate < 10 ? (
              <TrendingDown className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingUp className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span className={turnoverColor}>
                {data.turnoverRate?.toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Ultimi 12 mesi
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gender Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuzione per Genere</CardTitle>
          <CardDescription>
            Analisi della diversità di genere nell'organizzazione
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data.byGender}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ percentage }) => `${percentage.toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.byGender?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-4">
              {data.byGender?.map((item, index) => (
                <div key={item.gender} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span>{item.gender}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{item.count}</span>
                    <Badge variant="secondary">{item.percentage}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Age Groups Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuzione per Fascia d'Età</CardTitle>
          <CardDescription>
            Composizione anagrafica del personale
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.byAgeGroup}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="group" />
              <YAxis />
              <Tooltip />
              <Bar 
                dataKey="count" 
                fill="#3b82f6" 
                name="Dipendenti"
                radius={[8, 8, 0, 0]}
              >
                {data.byAgeGroup?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Contract Type Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Tipologia Contrattuale</CardTitle>
          <CardDescription>
            Distribuzione per tipo di contratto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.byContractType?.map((contract) => (
              <div key={contract.type}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{contract.type}</span>
                  <span className="text-sm text-muted-foreground">
                    {contract.count} ({contract.percentage}%)
                  </span>
                </div>
                <Progress value={contract.percentage} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Department Distribution */}
      {data.byDepartment && data.byDepartment.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribuzione per Dipartimento</CardTitle>
            <CardDescription>
              Organico suddiviso per area aziendale
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={data.byDepartment} 
                layout="horizontal"
                margin={{ left: 100 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="department" type="category" />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" name="Dipendenti" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Diversity Score */}
      <Card>
        <CardHeader>
          <CardTitle>Indicatori di Diversità e Inclusione</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span className="font-medium">Diversity Score</span>
                </div>
                <span className={cn("text-2xl font-bold", diversityColor)}>
                  {data.diversityScore}/100
                </span>
              </div>
              <Progress value={data.diversityScore} className="h-3" />
              <p className="text-xs text-muted-foreground mt-1">
                Basato su genere, età, nazionalità e background
              </p>
            </div>

            {data.diversityScore < 70 && (
              <Alert>
                <AlertDescription>
                  Il diversity score è sotto la media del settore (70). 
                  Considera di implementare politiche di inclusione più efficaci.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Seniority Distribution */}
      {data.bySeniority && data.bySeniority.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribuzione per Anzianità</CardTitle>
            <CardDescription>
              Anni di servizio in azienda
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.bySeniority}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#8b5cf6" 
                  fill="#8b5cf6" 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Metriche Chiave</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Full-time employees</span>
                <span className="font-medium">
                  {data.byContractType?.find(c => c.type === 'Full-time')?.percentage || 0}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Gender balance</span>
                <span className="font-medium">
                  {Math.abs(50 - (data.byGender?.[0]?.percentage || 50)).toFixed(1)}% variance
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">New hires (last year)</span>
                <span className="font-medium">
                  {Math.floor(data.totalEmployees * data.turnoverRate / 100)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Retention rate</span>
                <span className="font-medium">
                  {(100 - data.turnoverRate).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}