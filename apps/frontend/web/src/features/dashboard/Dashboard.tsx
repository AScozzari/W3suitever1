import { BarChart3, TrendingUp, Users, ShoppingCart, Package, Eye } from 'lucide-react';

export function Dashboard() {
  return (
    <div className="p-6 space-y-6 bg-neutral-50 dark:bg-neutral-900 min-h-screen">
      
      {/* Header con statistiche */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Vendite Dirette */}
        <div className="glass rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Vendite Dirette</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">12.483</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex items-center">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              +12%
            </span>
          </div>
        </div>

        {/* Ordini */}
        <div className="glass rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Ordini</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">8.327</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <Package className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex items-center">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              +8%
            </span>
          </div>
        </div>

        {/* Clienti */}
        <div className="glass rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Clienti</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">3.516</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Users className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex items-center">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              +5%
            </span>
          </div>
        </div>

        {/* Visualizzazioni */}
        <div className="glass rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Visualizzazioni</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">1.284</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
              <Eye className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex items-center">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              +15%
            </span>
          </div>
        </div>
      </div>

      {/* Analytics e Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Analytics Sheet */}
        <div className="glass rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Analytics Sheet
            </h3>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Analytics
            </span>
          </div>
          <div className="space-y-3">
            <div className="text-2xl font-bold text-neutral-900 dark:text-white">€2.4M</div>
            <div className="h-32 rounded-lg bg-gradient-to-br from-orange-100 to-purple-100 dark:from-orange-900/20 dark:to-purple-900/20 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-orange-500 mx-auto mb-2" />
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Dati Analytics in caricamento
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Data */}
        <div className="glass rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Performance Data
            </h3>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Performance
            </span>
          </div>
          <div className="space-y-3">
            <div className="text-2xl font-bold text-neutral-900 dark:text-white">99.9%</div>
            <div className="h-32 rounded-lg bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/20 dark:to-blue-900/20 flex items-center justify-center">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Sistema Performance ottimale
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Nuove Attestazioni */}
        <div className="glass rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Nuove Attestazioni
            </h3>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Nuove
            </span>
          </div>
          <div className="space-y-3">
            <div className="text-2xl font-bold text-neutral-900 dark:text-white">284</div>
            <div className="h-32 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 flex items-center justify-center">
              <div className="text-center">
                <Package className="h-12 w-12 text-blue-500 mx-auto mb-2" />
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Attestazioni in elaborazione
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seconda riga di analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Dichiarazioni Client */}
        <div className="glass rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Dichiarazioni Client
            </h3>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              Clienti
            </span>
          </div>
          <div className="space-y-3">
            <div className="text-2xl font-bold text-neutral-900 dark:text-white">12.483</div>
            <div className="h-32 rounded-lg bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/20 dark:to-red-900/20 flex items-center justify-center">
              <div className="text-center">
                <Users className="h-12 w-12 text-orange-500 mx-auto mb-2" />
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Dichiarazioni elaborate
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Ticket Support */}
        <div className="glass rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Ticket Support
            </h3>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Support
            </span>
          </div>
          <div className="space-y-3">
            <div className="text-2xl font-bold text-neutral-900 dark:text-white">42</div>
            <div className="h-32 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 flex items-center justify-center">
              <div className="text-center">
                <Package className="h-12 w-12 text-purple-500 mx-auto mb-2" />
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Ticket aperti
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Placeholder card */}
        <div className="glass rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Sistema Status
            </h3>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Online
            </span>
          </div>
          <div className="space-y-3">
            <div className="text-2xl font-bold text-green-600">100%</div>
            <div className="h-32 rounded-lg bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Tutti i servizi operativi
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}