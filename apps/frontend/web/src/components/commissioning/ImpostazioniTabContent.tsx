import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Settings, Bell, Calculator, Users, Shield, AlertCircle } from 'lucide-react';

export default function ImpostazioniTabContent() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-600" />
            Impostazioni Commissioning
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Configurazioni generali per gare, commissioni e incentivi
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
        <AlertCircle className="h-5 w-5 text-amber-600" />
        <div>
          <p className="font-medium text-amber-800">Sezione in sviluppo</p>
          <p className="text-sm text-amber-600">Le impostazioni saranno disponibili a breve.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-dashed border-2 border-gray-300 bg-gray-50/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100">
                <Calculator className="h-5 w-5 text-gray-400" />
              </div>
              <div>
                <CardTitle className="text-gray-400">Regole Calcolo Commissioni</CardTitle>
                <CardDescription>Definisci come vengono calcolate le commissioni</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400">Configurazione in arrivo...</p>
          </CardContent>
        </Card>

        <Card className="border-dashed border-2 border-gray-300 bg-gray-50/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100">
                <Bell className="h-5 w-5 text-gray-400" />
              </div>
              <div>
                <CardTitle className="text-gray-400">Notifiche</CardTitle>
                <CardDescription>Gestisci notifiche per gare e obiettivi</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400">Configurazione in arrivo...</p>
          </CardContent>
        </Card>

        <Card className="border-dashed border-2 border-gray-300 bg-gray-50/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100">
                <Users className="h-5 w-5 text-gray-400" />
              </div>
              <div>
                <CardTitle className="text-gray-400">Gruppi Partecipanti</CardTitle>
                <CardDescription>Configura gruppi e team per le gare</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400">Configurazione in arrivo...</p>
          </CardContent>
        </Card>

        <Card className="border-dashed border-2 border-gray-300 bg-gray-50/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100">
                <Shield className="h-5 w-5 text-gray-400" />
              </div>
              <div>
                <CardTitle className="text-gray-400">Permessi e Ruoli</CardTitle>
                <CardDescription>Gestisci chi può creare e modificare gare</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400">Configurazione in arrivo...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
