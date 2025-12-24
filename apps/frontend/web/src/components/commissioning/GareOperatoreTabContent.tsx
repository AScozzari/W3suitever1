import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Plus, Calendar, Target, AlertCircle } from 'lucide-react';

export default function GareOperatoreTabContent() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Gare Operatore
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Gestione gare e incentivi degli operatori telco (WindTre, VeryMobile, etc.)
          </p>
        </div>
        <Button 
          disabled
          className="flex items-center gap-2"
          style={{ background: 'hsl(var(--brand-orange))', opacity: 0.5 }}
          data-testid="button-nuova-gara-operatore"
        >
          <Plus className="h-4 w-4" />
          Nuova Gara
        </Button>
      </div>

      <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
        <AlertCircle className="h-5 w-5 text-amber-600" />
        <div>
          <p className="font-medium text-amber-800">Sezione in sviluppo</p>
          <p className="text-sm text-amber-600">La gestione delle gare operatore sarà disponibile a breve.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-dashed border-2 border-gray-300 bg-gray-50/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-gray-400">
              <Trophy className="h-5 w-5" />
              <CardTitle className="text-sm font-medium">Gare Attive</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-300">--</p>
          </CardContent>
        </Card>

        <Card className="border-dashed border-2 border-gray-300 bg-gray-50/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-gray-400">
              <Calendar className="h-5 w-5" />
              <CardTitle className="text-sm font-medium">In Scadenza</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-300">--</p>
          </CardContent>
        </Card>

        <Card className="border-dashed border-2 border-gray-300 bg-gray-50/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-gray-400">
              <Target className="h-5 w-5" />
              <CardTitle className="text-sm font-medium">Obiettivi Completati</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-300">--</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed border-2 border-gray-300 bg-gray-50/50">
        <CardHeader>
          <CardTitle className="text-gray-400">Elenco Gare Operatore</CardTitle>
          <CardDescription>Tabella con le gare degli operatori telco</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <Trophy className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Nessuna gara configurata</p>
            <p className="text-sm">Le gare operatore saranno visualizzate qui</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
