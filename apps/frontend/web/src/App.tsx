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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900 flex items-center justify-center p-6">
      
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-orange-500/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-gradient-to-r from-purple-600/20 to-orange-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
          
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-orange-500 to-purple-600 shadow-2xl">
              <img 
                src="/windtre-logo.jpg" 
                alt="WindTre" 
                className="w-16 h-16 rounded-xl object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.parentElement!.innerHTML = '<span class="text-white font-bold text-2xl">W3</span>';
                }}
              />
            </div>
            
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent mb-3">
              W3 Suite
            </h1>
            
            <p className="text-white/70 text-lg">
              Enterprise Platform
            </p>
          </div>

          {/* Form */}
          <div className="space-y-6">
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">
                Email Aziendale
              </label>
              <input
                type="email"
                placeholder="nome@windtre.it"
                className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••••"
                className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
              />
            </div>

            <button
              onClick={onLogin}
              className="w-full bg-gradient-to-r from-orange-500 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300"
            >
              Accedi alla Suite
            </button>

            <div className="text-center pt-4 border-t border-white/20">
              <p className="text-xs text-white/50">
                WindTre Enterprise Platform © 2024
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Dashboard() {
  return (
    <div className="min-h-screen bg-slate-50">
      
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">W3</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">WindTre Suite</h1>
              <p className="text-xs text-slate-500">Enterprise Platform</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900">Mario Rossi</p>
              <p className="text-xs text-slate-500">Amministratore</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-sm font-medium">MR</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="flex">
        
        {/* Sidebar */}
        <aside className="w-64 bg-white/90 backdrop-blur-xl border-r border-slate-200 min-h-screen p-6">
          <nav className="space-y-2">
            {[
              { name: 'Dashboard', icon: '📊', active: true },
              { name: 'POS / Cassa', icon: '🛒', active: false },
              { name: 'Magazzino', icon: '📦', active: false },
              { name: 'CRM', icon: '👥', active: false },
              { name: 'Analytics', icon: '📈', active: false },
              { name: 'HR', icon: '👤', active: false },
              { name: 'CMS', icon: '🌐', active: false },
              { name: 'Gare', icon: '🏢', active: false }
            ].map((item) => (
              <button
                key={item.name}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                  item.active
                    ? 'bg-gradient-to-r from-orange-500/10 to-purple-600/10 border border-orange-500/20 text-orange-600'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 p-6">
          
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              { title: 'Vendite Dirette', value: '12.483', change: '+12%', color: 'orange' },
              { title: 'Ordini', value: '8.327', change: '+8%', color: 'purple' },
              { title: 'Clienti', value: '3.516', change: '+5%', color: 'blue' },
              { title: 'Visualizzazioni', value: '1.284', change: '+15%', color: 'green' }
            ].map((stat) => (
              <div key={stat.title} className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 border border-slate-200 shadow-sm">
                <p className="text-sm text-slate-600 mb-2">{stat.title}</p>
                <p className="text-3xl font-bold text-slate-900 mb-2">{stat.value}</p>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {stat.change}
                </span>
              </div>
            ))}
          </div>

          {/* Widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            
            {/* Analytics */}
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Analytics Sheet</h3>
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">Analytics</span>
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-4">€2.4M</div>
              <div className="h-32 rounded-lg bg-gradient-to-br from-orange-100 to-purple-100 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-2">📊</div>
                  <p className="text-sm text-slate-600">Dati Analytics</p>
                </div>
              </div>
            </div>

            {/* Performance */}
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Performance Data</h3>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Performance</span>
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-4">99.9%</div>
              <div className="h-32 rounded-lg bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-2">📈</div>
                  <p className="text-sm text-slate-600">Performance ottimale</p>
                </div>
              </div>
            </div>

            {/* Attestazioni */}
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Nuove Attestazioni</h3>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">Nuove</span>
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-4">284</div>
              <div className="h-32 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-2">📋</div>
                  <p className="text-sm text-slate-600">In elaborazione</p>
                </div>
              </div>
            </div>
          </div>

          {/* Seconda riga */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Dichiarazioni */}
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Dichiarazioni Client</h3>
                <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">Clienti</span>
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-4">12.483</div>
              <div className="h-32 rounded-lg bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-2">👥</div>
                  <p className="text-sm text-slate-600">Elaborate</p>
                </div>
              </div>
            </div>

            {/* Support */}
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Ticket Support</h3>
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">Support</span>
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-4">42</div>
              <div className="h-32 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-2">🎫</div>
                  <p className="text-sm text-slate-600">Aperti</p>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Sistema Status</h3>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Online</span>
              </div>
              <div className="text-2xl font-bold text-green-600 mb-4">100%</div>
              <div className="h-32 rounded-lg bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-2">✅</div>
                  <p className="text-sm text-slate-600">Operativo</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}