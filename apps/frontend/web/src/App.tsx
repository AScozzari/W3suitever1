import { useState } from 'react'

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  if (!isLoggedIn) {
    return <LoginScreen onLogin={() => setIsLoggedIn(true)} />
  }

  return <MainDashboard />
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen relative overflow-hidden">
      
      {/* Background glass orbs */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 windtre-gradient-subtle rounded-full blur-3xl opacity-60 animate-glass-float"></div>
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 windtre-gradient-subtle rounded-full blur-3xl opacity-40 animate-glass-float" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-white/5 rounded-full blur-2xl opacity-30 animate-glass-float" style={{animationDelay: '4s'}}></div>
      </div>

      {/* Login card */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          
          {/* Main glass card */}
          <div className="glass-card rounded-3xl p-8 animate-pulse-glow">
            
            {/* Logo section */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-2xl windtre-gradient shadow-2xl animate-glass-float">
                <img 
                  src="/windtre-logo.jpg" 
                  alt="WindTre" 
                  className="w-16 h-16 rounded-xl object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement!.innerHTML = '<span class="text-white font-bold text-2xl font-jetbrains">W3</span>';
                  }}
                />
              </div>
              
              <h1 className="text-4xl font-bold bg-gradient-to-r from-windtre-orange to-windtre-purple bg-clip-text text-transparent mb-3 font-inter">
                W3 Suite
              </h1>
              
              <p className="text-white/70 text-lg">
                Enterprise Platform
              </p>
              
              <div className="flex items-center justify-center space-x-2 mt-4 text-sm text-white/50">
                <div className="w-2 h-2 rounded-full bg-windtre-orange animate-pulse"></div>
                <span className="font-jetbrains">OAuth2 • MFA • RLS</span>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-6">
              
              {/* Email field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80 font-inter">
                  Email Aziendale
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    placeholder="nome@windtre.it"
                    className="w-full pl-10 pr-4 py-4 glass-input rounded-xl text-white placeholder-white/40 focus:outline-none font-inter"
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80 font-inter">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    placeholder="••••••••••"
                    className="w-full pl-10 pr-4 py-4 glass-input rounded-xl text-white placeholder-white/40 focus:outline-none font-inter"
                  />
                </div>
              </div>

              {/* Remember me */}
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-windtre-orange bg-white/10 border-white/30 rounded focus:ring-windtre-orange/50 focus:ring-2"
                  />
                  <span className="text-sm text-white/70 font-inter">
                    Ricorda accesso
                  </span>
                </label>
                
                <button className="text-sm text-windtre-orange hover:text-windtre-orange/80 transition-colors font-inter">
                  Password dimenticata?
                </button>
              </div>

              {/* Login button */}
              <button
                onClick={onLogin}
                className="w-full windtre-gradient text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-center space-x-3 group font-inter"
              >
                <span>Accedi alla Suite</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/20"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-transparent text-white/50 font-inter">oppure</span>
                </div>
              </div>

              {/* SSO button */}
              <button
                onClick={onLogin}
                className="w-full glass-button text-white/90 py-4 px-6 rounded-xl font-medium hover:scale-[1.02] transition-all duration-300 flex items-center justify-center space-x-3 font-inter"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Single Sign-On Aziendale</span>
              </button>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-white/20 text-center">
              <p className="text-xs text-white/50 mb-2 font-inter">
                W3 Suite Enterprise Platform © 2024
              </p>
              <p className="text-xs text-white/30 font-jetbrains">
                Multitenant • OAuth2/OIDC • MFA • PostgreSQL RLS
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MainDashboard() {
  return (
    <div className="min-h-screen relative">
      
      {/* Background ambient */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-windtre-dark via-gray-900 to-windtre-dark"></div>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 windtre-gradient-subtle rounded-full blur-3xl opacity-20"></div>
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-white/5 rounded-full blur-3xl opacity-10"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 glass-card border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          
          {/* Logo and title */}
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-lg windtre-gradient flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm font-jetbrains">W3</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white font-inter">WindTre Suite</h1>
              <p className="text-xs text-white/50 font-jetbrains">Enterprise Platform</p>
            </div>
          </div>
          
          {/* Search bar */}
          <div className="hidden md:flex items-center flex-1 max-w-lg mx-8">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Cerca in W3 Suite..."
                className="w-full pl-10 pr-4 py-2 glass-input rounded-lg text-white placeholder-white/40 focus:outline-none font-inter"
              />
            </div>
          </div>

          {/* User menu */}
          <div className="flex items-center space-x-4">
            <button className="relative p-2 glass-button rounded-lg hover:scale-110 transition-all">
              <svg className="h-6 w-6 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 11-15 0v5h5l-5 5-5-5h5V7a7.5 7.5 0 1115 0v10z" />
              </svg>
              <span className="absolute top-1 right-1 w-2 h-2 bg-windtre-orange rounded-full animate-pulse"></span>
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-white font-inter">Mario Rossi</p>
                <p className="text-xs text-white/50 font-jetbrains">Enterprise Admin</p>
              </div>
              <div className="w-10 h-10 rounded-full windtre-gradient flex items-center justify-center shadow-lg">
                <span className="text-white text-sm font-medium font-inter">MR</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="relative z-10 flex">
        
        {/* Sidebar */}
        <aside className="w-64 glass-card border-r border-white/10 min-h-screen p-6">
          <nav className="space-y-2">
            {[
              { name: 'Dashboard', icon: '📊', active: true },
              { name: 'POS / Cassa', icon: '🛒', active: false },
              { name: 'Magazzino', icon: '📦', active: false },
              { name: 'CRM', icon: '👥', active: false },
              { name: 'Analytics', icon: '📈', active: false },
              { name: 'HR', icon: '👤', active: false },
              { name: 'CMS', icon: '🌐', active: false },
              { name: 'Gare', icon: '🏢', active: false },
              { name: 'Impostazioni', icon: '⚙️', active: false },
            ].map((item) => (
              <button
                key={item.name}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 font-inter ${
                  item.active
                    ? 'windtre-gradient-subtle border border-windtre-orange/30 text-white shadow-lg'
                    : 'text-white/70 hover:text-white hover:bg-white/5 glass-button'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </button>
            ))}
          </nav>

          {/* Sidebar footer */}
          <div className="mt-8 p-4 glass-card rounded-xl">
            <div className="text-center">
              <div className="w-2 h-2 rounded-full bg-green-500 mx-auto mb-2 animate-pulse"></div>
              <p className="text-xs text-white/60 font-jetbrains">Sistema Operativo</p>
              <p className="text-xs text-white/40 font-jetbrains mt-1">v1.0.0</p>
            </div>
          </div>
        </aside>

        {/* Dashboard content */}
        <main className="flex-1 p-6">
          
          {/* Stats grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              { title: 'Vendite Dirette', value: '12.483', change: '+12%', icon: '🛒' },
              { title: 'Ordini', value: '8.327', change: '+8%', icon: '📋' },
              { title: 'Clienti', value: '3.516', change: '+5%', icon: '👥' },
              { title: 'Visualizzazioni', value: '1.284', change: '+15%', icon: '👁️' },
            ].map((stat, index) => (
              <div key={stat.title} className="glass-card rounded-2xl p-6 hover:scale-105 transition-all duration-300 animate-glass-float" style={{animationDelay: `${index * 0.2}s`}}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-white/60 mb-2 font-inter">{stat.title}</p>
                    <p className="text-3xl font-bold text-white mb-2 font-inter">{stat.value}</p>
                  </div>
                  <div className="text-3xl">{stat.icon}</div>
                </div>
                <div className="flex items-center">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-windtre-orange/20 text-windtre-orange font-jetbrains">
                    {stat.change}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Analytics widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            
            {/* Analytics Sheet */}
            <div className="glass-card rounded-2xl p-6 hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white font-inter">Analytics Sheet</h3>
                <span className="px-2 py-1 bg-windtre-purple/20 text-windtre-purple text-xs font-medium rounded-full font-jetbrains">
                  Analytics
                </span>
              </div>
              <div className="text-2xl font-bold text-white mb-4 font-inter">€2.4M</div>
              <div className="h-32 rounded-lg windtre-gradient-subtle flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-2">📊</div>
                  <p className="text-sm text-white/80 font-inter">Analytics Dashboard</p>
                </div>
              </div>
            </div>

            {/* Performance Data */}
            <div className="glass-card rounded-2xl p-6 hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white font-inter">Performance Data</h3>
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full font-jetbrains">
                  Performance
                </span>
              </div>
              <div className="text-2xl font-bold text-white mb-4 font-inter">99.9%</div>
              <div className="h-32 rounded-lg bg-gradient-to-br from-green-500/20 to-blue-500/20 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-2">📈</div>
                  <p className="text-sm text-white/80 font-inter">Sistema Performance</p>
                </div>
              </div>
            </div>

            {/* Nuove Attestazioni */}
            <div className="glass-card rounded-2xl p-6 hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white font-inter">Nuove Attestazioni</h3>
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full font-jetbrains">
                  Nuove
                </span>
              </div>
              <div className="text-2xl font-bold text-white mb-4 font-inter">284</div>
              <div className="h-32 rounded-lg bg-gradient-to-br from-blue-500/20 to-windtre-purple/20 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-2">📋</div>
                  <p className="text-sm text-white/80 font-inter">In elaborazione</p>
                </div>
              </div>
            </div>
          </div>

          {/* Seconda riga widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Dichiarazioni Client */}
            <div className="glass-card rounded-2xl p-6 hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white font-inter">Dichiarazioni Client</h3>
                <span className="px-2 py-1 bg-windtre-orange/20 text-windtre-orange text-xs font-medium rounded-full font-jetbrains">
                  Clienti
                </span>
              </div>
              <div className="text-2xl font-bold text-white mb-4 font-inter">12.483</div>
              <div className="h-32 rounded-lg bg-gradient-to-br from-windtre-orange/20 to-red-500/20 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-2">👥</div>
                  <p className="text-sm text-white/80 font-inter">Elaborate</p>
                </div>
              </div>
            </div>

            {/* Ticket Support */}
            <div className="glass-card rounded-2xl p-6 hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white font-inter">Ticket Support</h3>
                <span className="px-2 py-1 bg-windtre-purple/20 text-windtre-purple text-xs font-medium rounded-full font-jetbrains">
                  Support
                </span>
              </div>
              <div className="text-2xl font-bold text-white mb-4 font-inter">42</div>
              <div className="h-32 rounded-lg bg-gradient-to-br from-windtre-purple/20 to-pink-500/20 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-2">🎫</div>
                  <p className="text-sm text-white/80 font-inter">Aperti</p>
                </div>
              </div>
            </div>

            {/* Sistema Status */}
            <div className="glass-card rounded-2xl p-6 hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white font-inter">Sistema Status</h3>
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full font-jetbrains">
                  Online
                </span>
              </div>
              <div className="text-2xl font-bold text-green-400 mb-4 font-inter">100%</div>
              <div className="h-32 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-2">✅</div>
                  <p className="text-sm text-white/80 font-inter">Tutti i servizi attivi</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}