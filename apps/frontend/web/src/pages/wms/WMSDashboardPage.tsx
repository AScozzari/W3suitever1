import { useState } from 'react';
import Layout from '../../components/Layout';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  ArrowRightLeft, 
  BarChart3, 
  Settings,
  Layers,
  FileText,
  Truck,
  PackagePlus
} from 'lucide-react';
import { InventoryContent } from './InventoryPage';
import { ReceivingTabContent } from '../../components/wms/ReceivingTabContent';


type TabId = 'carico' | 'inventario' | 'movimenti' | 'documenti' | 'analytics' | 'impostazioni';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

const TABS: Tab[] = [
  { id: 'carico', label: 'Carico Merce', icon: PackagePlus, description: 'Ricevimento e controllo merci' },
  { id: 'inventario', label: 'Inventario', icon: Package, description: 'Gestione stock e giacenze' },
  { id: 'movimenti', label: 'Movimenti', icon: ArrowRightLeft, description: 'Storico movimenti magazzino' },
  { id: 'documenti', label: 'Documenti', icon: FileText, description: 'DDT, ordini, bolle' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Report e statistiche' },
  { id: 'impostazioni', label: 'Impostazioni', icon: Settings, description: 'Configurazione WMS' },
];

export default function WMSDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>('carico');

  return (
    <Layout>
      <div className="flex flex-col h-full bg-white">
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3" data-testid="page-title">
                <Layers className="h-7 w-7 text-orange-500" />
                Magazzino
              </h1>
              <p className="text-gray-600 mt-1">Gestione completa del magazzino e delle giacenze</p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="outline"
                className="border-gray-300"
                data-testid="btn-new-movement"
              >
                <Truck className="h-4 w-4 mr-2" />
                Nuovo Movimento
              </Button>
            </div>
          </div>
          
          <div className="flex gap-1 mt-4">
            {TABS.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 ${activeTab === tab.id ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''}`}
                data-testid={`tab-${tab.id}`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'carico' && (
            <div className="p-6">
              <ReceivingTabContent />
            </div>
          )}
          
          {activeTab === 'inventario' && (
            <div className="p-6">
              <InventoryContent showHeader={false} />
            </div>
          )}
          
          {activeTab === 'movimenti' && (
            <div className="p-6">
              <div className="text-center py-12 text-gray-500">
                <ArrowRightLeft className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">Movimenti Magazzino</p>
                <p className="text-sm">Storico di tutti i movimenti di magazzino (in arrivo)</p>
              </div>
            </div>
          )}
          
          {activeTab === 'documenti' && (
            <div className="p-6">
              <div className="text-center py-12 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">Documenti</p>
                <p className="text-sm">Gestione DDT, ordini e bolle (in arrivo)</p>
              </div>
            </div>
          )}
          
          {activeTab === 'analytics' && (
            <div className="p-6">
              <div className="text-center py-12 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">Analytics Magazzino</p>
                <p className="text-sm">Report e statistiche avanzate (in arrivo)</p>
              </div>
            </div>
          )}
          
          {activeTab === 'impostazioni' && (
            <div className="p-6">
              <div className="text-center py-12 text-gray-500">
                <Settings className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">Impostazioni WMS</p>
                <p className="text-sm">Configurazione del sistema magazzino (in arrivo)</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
