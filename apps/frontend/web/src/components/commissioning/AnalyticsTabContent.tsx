import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3, TrendingUp, Users, Target, AlertCircle } from 'lucide-react';

export default function AnalyticsTabContent() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
        <AlertCircle className="h-5 w-5 text-amber-600" />
        <div>
          <p className="font-medium text-amber-800">Sezione in sviluppo</p>
          <p className="text-sm text-amber-600">Le analytics saranno disponibili a breve con dashboard interattive e report dettagliati.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-dashed border-2 border-gray-300 bg-gray-50/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-gray-400">
              <TrendingUp className="h-5 w-5" />
              <CardTitle className="text-sm font-medium">Performance Vendite</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-300">--</p>
            <p className="text-xs text-gray-400">In arrivo</p>
          </CardContent>
        </Card>

        <Card className="border-dashed border-2 border-gray-300 bg-gray-50/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-gray-400">
              <Users className="h-5 w-5" />
              <CardTitle className="text-sm font-medium">Agenti Attivi</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-300">--</p>
            <p className="text-xs text-gray-400">In arrivo</p>
          </CardContent>
        </Card>

        <Card className="border-dashed border-2 border-gray-300 bg-gray-50/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-gray-400">
              <Target className="h-5 w-5" />
              <CardTitle className="text-sm font-medium">Obiettivi Raggiunti</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-300">--</p>
            <p className="text-xs text-gray-400">In arrivo</p>
          </CardContent>
        </Card>

        <Card className="border-dashed border-2 border-gray-300 bg-gray-50/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-gray-400">
              <BarChart3 className="h-5 w-5" />
              <CardTitle className="text-sm font-medium">Commissioni Totali</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-300">--</p>
            <p className="text-xs text-gray-400">In arrivo</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed border-2 border-gray-300 bg-gray-50/50">
        <CardHeader>
          <CardTitle className="text-gray-400">Grafici e Report</CardTitle>
          <CardDescription>Dashboard analitica completa in sviluppo</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Prossimamente</p>
            <p className="text-sm">Grafici interattivi, trend e analisi dettagliate</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
