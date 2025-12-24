import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Plus, Users, Award, AlertCircle } from 'lucide-react';

export default function GareInterneTabContent() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-500" />
            Gare Interne
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Gestione gare e incentivi interni aziendali per team e agenti
          </p>
        </div>
        <Button 
          disabled
          className="flex items-center gap-2"
          style={{ background: 'hsl(var(--brand-orange))', opacity: 0.5 }}
          data-testid="button-nuova-gara-interna"
        >
          <Plus className="h-4 w-4" />
          Nuova Gara Interna
        </Button>
      </div>

      <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
        <AlertCircle className="h-5 w-5 text-amber-600" />
        <div>
          <p className="font-medium text-amber-800">Sezione in sviluppo</p>
          <p className="text-sm text-amber-600">La gestione delle gare interne sarà disponibile a breve.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-dashed border-2 border-gray-300 bg-gray-50/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-gray-400">
              <Award className="h-5 w-5" />
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
              <Users className="h-5 w-5" />
              <CardTitle className="text-sm font-medium">Partecipanti</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-300">--</p>
          </CardContent>
        </Card>

        <Card className="border-dashed border-2 border-gray-300 bg-gray-50/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-gray-400">
              <Award className="h-5 w-5" />
              <CardTitle className="text-sm font-medium">Premi Erogati</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-300">--</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed border-2 border-gray-300 bg-gray-50/50">
        <CardHeader>
          <CardTitle className="text-gray-400">Elenco Gare Interne</CardTitle>
          <CardDescription>Tabella con le gare interne aziendali</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <Building2 className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Nessuna gara interna configurata</p>
            <p className="text-sm">Le gare interne saranno visualizzate qui</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
