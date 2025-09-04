import { useState } from 'react'

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  if (!isLoggedIn) {
    return <LoginPage onLogin={() => setIsLoggedIn(true)} />
  }

  return <Dashboard />
}

function LoginPage({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-orange-500 mb-2">
              W3 Enterprise
            </h1>
            <p className="text-gray-600">
              Accedi alla piattaforma aziendale
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                placeholder="nome@azienda.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••••"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <button
              onClick={onLogin}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
            >
              Accedi
            </button>

            <div className="text-center text-xs text-gray-500 pt-4 border-t">
              <p>I tuoi dati sono protetti</p>
              <p className="mt-1">Versione 1.0 BETA</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Header gradiente */}
      <div className="bg-gradient-to-r from-orange-500 via-orange-400 to-purple-500 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Benvenuto nel Dashboard Enterprise</h1>
          <p className="text-white/90">Gestisci tutti i tuoi servizi WindTre da un'unica piattaforma</p>
          
          <div className="flex gap-4 mt-6">
            <button className="bg-white/20 backdrop-blur border border-white/30 px-4 py-2 rounded-lg hover:bg-white/30 transition-all">
              Guida introduttiva
            </button>
            <button className="bg-white/20 backdrop-blur border border-white/30 px-4 py-2 rounded-lg hover:bg-white/30 transition-all">
              Ultimi aggiornamenti
            </button>
          </div>
        </div>
      </div>

      {/* Navbar secondaria */}
      <div className="bg-white border-b px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-2xl">🏠</span>
            <span className="font-medium">WindTre Suite</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-gray-600 hover:text-gray-900">Filtri</button>
            <button className="bg-gray-100 px-4 py-2 rounded-lg text-sm">Ricerca</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        
        {/* Prima riga - Azioni Rapide */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Azioni Rapide</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Nuovo Ordine */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Nuovo Ordine</p>
                  <p className="text-xs text-gray-500">Crea ordine rapidamente</p>
                </div>
                <span className="bg-orange-100 text-orange-600 text-xs px-2 py-1 rounded">Ordini</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-4">€2.4M</div>
              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <span className="text-4xl">📦</span>
                <p className="text-xs text-gray-600 mt-2">Ordini questo mese: 1.234</p>
              </div>
            </div>

            {/* Invia Fattura */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Invia Fattura</p>
                  <p className="text-xs text-gray-500">Fatturazione rapida</p>
                </div>
                <span className="bg-purple-100 text-purple-600 text-xs px-2 py-1 rounded">Fatture</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-4">8.927</div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <span className="text-4xl">📄</span>
                <p className="text-xs text-gray-600 mt-2">Inviate oggi: 42</p>
              </div>
            </div>

            {/* Gestisci Clienti */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Gestisci Clienti</p>
                  <p className="text-xs text-gray-500">Database clienti</p>
                </div>
                <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded">CRM</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-4">3.516</div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <span className="text-4xl">👥</span>
                <p className="text-xs text-gray-600 mt-2">Nuovi questa settimana: 89</p>
              </div>
            </div>

            {/* Report Dati */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Report Dati</p>
                  <p className="text-xs text-gray-500">Analisi in tempo reale</p>
                </div>
                <span className="bg-green-100 text-green-600 text-xs px-2 py-1 rounded">Report</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-4">1.284</div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <span className="text-4xl">📊</span>
                <p className="text-xs text-gray-600 mt-2">Visualizzazioni oggi: 284</p>
              </div>
            </div>
          </div>
        </div>

        {/* Seconda sezione - Statistiche Generali */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Statistiche Generali</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Vendite Dirette */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm text-gray-600">Vendite Dirette</p>
                <span className="bg-orange-100 text-orange-600 text-xs px-2 py-1 rounded">+12%</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-2">12.483</div>
              <p className="text-xs text-gray-500">Rispetto mese precedente</p>
            </div>

            {/* Ordini Ricevuti */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm text-gray-600">Ordini Ricevuti</p>
                <span className="bg-purple-100 text-purple-600 text-xs px-2 py-1 rounded">+8%</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-2">8.327</div>
              <p className="text-xs text-gray-500">Crescita mensile</p>
            </div>

            {/* Clienti Attivi */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm text-gray-600">Clienti Attivi</p>
                <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded">+5%</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-2">3.516</div>
              <p className="text-xs text-gray-500">Totale clienti attivi</p>
            </div>

            {/* Visualizzazioni */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm text-gray-600">Visualizzazioni</p>
                <span className="bg-green-100 text-green-600 text-xs px-2 py-1 rounded">+15%</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-2">1.284</div>
              <p className="text-xs text-gray-500">Engagement rate</p>
            </div>
          </div>
        </div>

        {/* Analytics & Reports */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Analytics e Reports</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Andamento Ricavi */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <p className="font-medium text-gray-700">Andamento Ricavi</p>
                <button className="text-xs text-blue-600">Vedi dettaglio →</button>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-8 text-center">
                <div className="text-4xl font-bold text-orange-600 mb-2">€2.4M</div>
                <p className="text-sm text-gray-600">Revenue YTD</p>
                <div className="mt-4 flex justify-center gap-2">
                  <div className="w-2 h-20 bg-orange-300 rounded"></div>
                  <div className="w-2 h-16 bg-orange-300 rounded"></div>
                  <div className="w-2 h-24 bg-orange-400 rounded"></div>
                  <div className="w-2 h-20 bg-orange-300 rounded"></div>
                  <div className="w-2 h-28 bg-orange-500 rounded"></div>
                </div>
              </div>
            </div>

            {/* Dichiarazioni Client */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <p className="font-medium text-gray-700">Dichiarazioni Client</p>
                <button className="text-xs text-purple-600">Vedi tutte →</button>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-8 text-center">
                <div className="text-4xl font-bold text-purple-600 mb-2">12.483</div>
                <p className="text-sm text-gray-600">Dichiarazioni elaborate</p>
                <div className="mt-4 flex justify-center gap-2">
                  <div className="w-2 h-16 bg-purple-300 rounded"></div>
                  <div className="w-2 h-20 bg-purple-300 rounded"></div>
                  <div className="w-2 h-24 bg-purple-400 rounded"></div>
                  <div className="w-2 h-28 bg-purple-500 rounded"></div>
                  <div className="w-2 h-20 bg-purple-300 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Terza riga - Altri widget */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Performance Rate */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <p className="font-medium text-gray-700">Performance Rate</p>
              <span className="bg-green-100 text-green-600 text-xs px-2 py-1 rounded">Performance</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">99.9%</div>
            <div className="bg-gray-100 rounded-lg p-4 text-center">
              <span className="text-3xl">📈</span>
              <p className="text-xs text-gray-600 mt-2">Sistema performance ottimale</p>
            </div>
          </div>

          {/* Nuove Attestazioni */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <p className="font-medium text-gray-700">Nuove Attestazioni</p>
              <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded">Attestazioni</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">284</div>
            <div className="bg-gray-100 rounded-lg p-4 text-center">
              <span className="text-3xl">📋</span>
              <p className="text-xs text-gray-600 mt-2">Richieste in elaborazione</p>
            </div>
          </div>

          {/* Ticket Support */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <p className="font-medium text-gray-700">Ticket Support</p>
              <span className="bg-purple-100 text-purple-600 text-xs px-2 py-1 rounded">Support</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">42</div>
            <div className="bg-gray-100 rounded-lg p-4 text-center">
              <span className="text-3xl">🎫</span>
              <p className="text-xs text-gray-600 mt-2">Ticket aperti da risolvere</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}