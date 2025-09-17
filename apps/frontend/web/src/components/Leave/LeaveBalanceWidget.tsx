// Leave Balance Widget - Visual component for leave balances
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarDays, TrendingDown, Clock, AlertCircle, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLeaveBalance } from '@/hooks/useLeaveManagement';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface LeaveBalanceWidgetProps {
  userId?: string;
  compact?: boolean;
  className?: string;
}

export function LeaveBalanceWidget({ userId, compact = false, className }: LeaveBalanceWidgetProps) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  const { data: balance, isLoading, error } = useLeaveBalance(targetUserId);
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card className={cn("backdrop-blur-sm bg-white/90", className)}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !balance) {
    return (
      <Card className={cn("backdrop-blur-sm bg-white/90", className)}>
        <CardContent className="py-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Impossibile caricare i saldi ferie
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const vacationPercentage = (balance.vacationDaysUsed / balance.vacationDaysEntitled) * 100;
  const remainingPercentage = (balance.vacationDaysRemaining / balance.vacationDaysEntitled) * 100;
  
  const currentDate = new Date();
  const yearProgress = ((currentDate.getMonth() + 1) / 12) * 100;
  const expectedUsage = (balance.vacationDaysEntitled * (currentDate.getMonth() + 1)) / 12;
  const usageTrend = balance.vacationDaysUsed - expectedUsage;
  
  // Calculate expiration warning
  const yearEnd = new Date(currentDate.getFullYear(), 11, 31);
  const daysUntilYearEnd = Math.floor((yearEnd.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
  const showExpirationWarning = balance.vacationDaysRemaining > 0 && daysUntilYearEnd < 60;

  if (compact) {
    return (
      <Card className={cn("backdrop-blur-sm bg-white/90 hover:shadow-lg transition-shadow", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Ferie</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {balance.vacationDaysRemaining}/{balance.vacationDaysEntitled}
            </Badge>
          </div>
          <Progress value={vacationPercentage} className="h-2" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn(
        "backdrop-blur-md bg-white/95 border-gray-200/50 shadow-xl",
        "hover:shadow-2xl transition-all duration-300",
        className
      )}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-orange-500" />
              <span>Saldi Ferie {currentDate.getFullYear()}</span>
            </div>
            <Badge variant="outline" className="font-normal">
              Ultimo aggiornamento: {new Date(balance.updatedAt).toLocaleDateString('it-IT')}
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Vacation Days Section */}
          <motion.div
            className="space-y-3"
            onHoverStart={() => setHoveredSection('vacation')}
            onHoverEnd={() => setHoveredSection(null)}
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Ferie Annuali</span>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-500">Usati: {balance.vacationDaysUsed}</span>
                <span className="font-semibold text-green-600">
                  Disponibili: {balance.vacationDaysRemaining}
                </span>
                <span className="text-gray-500">/ {balance.vacationDaysEntitled}</span>
              </div>
            </div>
            
            <div className="relative">
              <Progress 
                value={vacationPercentage} 
                className="h-8"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-medium text-white mix-blend-difference">
                  {Math.round(vacationPercentage)}% utilizzato
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {balance.vacationDaysEntitled}
                </div>
                <div className="text-xs text-gray-600">Totale</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {balance.vacationDaysUsed}
                </div>
                <div className="text-xs text-gray-600">Usati</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {balance.vacationDaysRemaining}
                </div>
                <div className="text-xs text-gray-600">Disponibili</div>
              </div>
            </div>
          </motion.div>

          {/* Other Leave Types */}
          <div className="space-y-3 border-t pt-4">
            <h4 className="text-sm font-medium text-gray-600">Altri Permessi</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div>
                  <div className="text-sm text-gray-600">Malattia</div>
                  <div className="text-lg font-semibold text-yellow-700">
                    {balance.sickDaysUsed} giorni
                  </div>
                </div>
                <div className="text-2xl">🏥</div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div>
                  <div className="text-sm text-gray-600">Personali</div>
                  <div className="text-lg font-semibold text-purple-700">
                    {balance.personalDaysUsed} giorni
                  </div>
                </div>
                <div className="text-2xl">👤</div>
              </div>
            </div>
          </div>

          {/* Time Balances */}
          {(balance.overtimeHours > 0 || balance.compTimeHours > 0) && (
            <div className="space-y-3 border-t pt-4">
              <h4 className="text-sm font-medium text-gray-600">Saldi Ore</h4>
              
              <div className="grid grid-cols-2 gap-3">
                {balance.overtimeHours > 0 && (
                  <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                    <div>
                      <div className="text-sm text-gray-600">Straordinari</div>
                      <div className="text-lg font-semibold text-indigo-700">
                        {Math.floor(balance.overtimeHours / 60)}h {balance.overtimeHours % 60}m
                      </div>
                    </div>
                    <Clock className="h-6 w-6 text-indigo-500" />
                  </div>
                )}
                
                {balance.compTimeHours > 0 && (
                  <div className="flex items-center justify-between p-3 bg-teal-50 rounded-lg">
                    <div>
                      <div className="text-sm text-gray-600">Recuperi</div>
                      <div className="text-lg font-semibold text-teal-700">
                        {Math.floor(balance.compTimeHours / 60)}h {balance.compTimeHours % 60}m
                      </div>
                    </div>
                    <Clock className="h-6 w-6 text-teal-500" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Year Progress Indicator */}
          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Progresso Anno</span>
              <span className="text-gray-500">{Math.round(yearProgress)}%</span>
            </div>
            <Progress value={yearProgress} className="h-2" />
            
            {usageTrend !== 0 && (
              <div className="flex items-center gap-2 pt-1">
                <TrendingDown className={cn(
                  "h-4 w-4",
                  usageTrend > 2 ? "text-orange-500" : "text-green-500"
                )} />
                <span className="text-xs text-gray-600">
                  {usageTrend > 0 
                    ? `${Math.abs(Math.round(usageTrend))} giorni sotto la media attesa`
                    : `${Math.abs(Math.round(usageTrend))} giorni sopra la media attesa`
                  }
                </span>
              </div>
            )}
          </div>

          {/* Warnings and Alerts */}
          {showExpirationWarning && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Attenzione:</strong> Hai {balance.vacationDaysRemaining} giorni di ferie 
                non utilizzati che scadranno tra {daysUntilYearEnd} giorni.
              </AlertDescription>
            </Alert>
          )}

          {/* Adjustments History */}
          {balance.adjustments && balance.adjustments.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <h4 className="text-sm font-medium text-gray-600">Ultimi Aggiustamenti</h4>
              <div className="space-y-1">
                {balance.adjustments.slice(-3).map((adj, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      {new Date(adj.date).toLocaleDateString('it-IT')} - {adj.reason}
                    </span>
                    <Badge variant={adj.amount > 0 ? "default" : "destructive"} className="text-xs">
                      {adj.amount > 0 ? '+' : ''}{adj.amount} giorni
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}