import { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useTabRouter } from '@/hooks/useTabRouter';
import { 
  BarChart3, 
  Trophy, 
  Building2,
  Settings,
  Award,
  Zap
} from 'lucide-react';
import AnalyticsTabContent from '@/components/commissioning/AnalyticsTabContent';
import DriversTabContent from '@/components/wms/DriversTabContent';
import GareOperatoreTabContent from '@/components/commissioning/GareOperatoreTabContent';
import GareInterneTabContent from '@/components/commissioning/GareInterneTabContent';
import ImpostazioniTabContent from '@/components/commissioning/ImpostazioniTabContent';

export default function CommissioningPage() {
  const [currentModule, setCurrentModule] = useState('commissioning');

  const validTabs = useMemo(() => [
    'analytics',
    'drivers',
    'gare-operatore',
    'gare-interne',
    'impostazioni'
  ], []);

  const tabConfigs = useMemo(() => [
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      testId: 'tab-analytics'
    },
    {
      id: 'drivers',
      label: 'Drivers',
      icon: Zap,
      testId: 'tab-drivers'
    },
    {
      id: 'gare-operatore',
      label: 'Gare Operatore',
      icon: Trophy,
      testId: 'tab-gare-operatore'
    },
    {
      id: 'gare-interne',
      label: 'Gare Interne',
      icon: Building2,
      testId: 'tab-gare-interne'
    },
    {
      id: 'impostazioni',
      label: 'Impostazioni',
      icon: Settings,
      testId: 'tab-impostazioni'
    }
  ], []);

  const { activeTab, setTab } = useTabRouter({
    defaultTab: 'analytics',
    validTabs,
    tabParam: 'tab'
  });

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="h-full flex flex-col">
        <div className="windtre-glass-panel border-b border-white/20 mb-6">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Award className="h-6 w-6 text-windtre-orange" />
                  Commissioning
                </h1>
                <p className="text-gray-600 mt-1">Gestione gare, incentivi e commissioni</p>
              </div>
            </div>
            
            <div className="flex gap-1 mt-4">
              {tabConfigs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? 'default' : 'ghost'}
                    onClick={() => setTab(tab.id)}
                    className="flex items-center gap-2"
                    data-testid={tab.testId}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-1 p-6">
          <Tabs value={activeTab} onValueChange={setTab}>
            <TabsContent value="analytics" className="mt-0">
              {activeTab === 'analytics' && <AnalyticsTabContent />}
            </TabsContent>
            
            <TabsContent value="drivers" className="mt-0">
              {activeTab === 'drivers' && <DriversTabContent />}
            </TabsContent>
            
            <TabsContent value="gare-operatore" className="mt-0">
              {activeTab === 'gare-operatore' && <GareOperatoreTabContent />}
            </TabsContent>
            
            <TabsContent value="gare-interne" className="mt-0">
              {activeTab === 'gare-interne' && <GareInterneTabContent />}
            </TabsContent>
            
            <TabsContent value="impostazioni" className="mt-0">
              {activeTab === 'impostazioni' && <ImpostazioniTabContent />}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
