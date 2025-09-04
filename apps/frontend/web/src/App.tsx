import { useState } from 'react'
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  BarChart3, 
  FileText,
  TrendingUp,
  Bell,
  Search,
  Menu,
  X,
  ChevronRight,
  Activity,
  DollarSign,
  CreditCard,
  Settings,
  LogOut
} from 'lucide-react'

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  if (!isLoggedIn) {
    return <LoginPage onLogin={() => setIsLoggedIn(true)} />
  }

  return <Dashboard sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
}

function LoginPage({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse animation-delay-4000"></div>
      </div>

      {/* Login Card with Glassmorphism */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-purple-600 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl"></div>
        <div className="relative bg-white bg-opacity-10 backdrop-blur-lg border border-white border-opacity-20 shadow-2xl rounded-3xl p-8 sm:p-12 max-w-md w-full">
          
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="bg-gradient-to-br from-orange-500 to-purple-600 w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl">
              <span className="text-white text-3xl font-bold">W3</span>
            </div>
          </div>
          
          {/* Title */}
          <h2 className="text-center text-3xl font-extrabold text-white mb-2">
            W3 Suite Enterprise
          </h2>
          <p className="text-center text-gray-300 mb-8">
            Piattaforma di gestione aziendale
          </p>

          {/* Form */}
          <form onSubmit={(e) => { e.preventDefault(); onLogin(); }} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-2">
                Email aziendale
              </label>
              <input
                id="email"
                type="email"
                required
                className="w-full px-4 py-3 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent backdrop-blur-sm"
                placeholder="nome@azienda.it"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                className="w-full px-4 py-3 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent backdrop-blur-sm"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:from-orange-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-transparent transform transition hover:scale-105"
            >
              Accedi al Dashboard
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">
              © 2024 WindTre Enterprise. Tutti i diritti riservati.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Dashboard({ sidebarOpen, setSidebarOpen }: { sidebarOpen: boolean, setSidebarOpen: (open: boolean) => void }) {
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', active: true },
    { icon: ShoppingCart, label: 'POS / Cassa', active: false },
    { icon: Package, label: 'Magazzino', active: false },
    { icon: Users, label: 'CRM', active: false },
    { icon: BarChart3, label: 'Analytics', active: false },
    { icon: FileText, label: 'Reports', active: false },
    { icon: Settings, label: 'Impostazioni', active: false },
  ]

  const stats = [
    { title: 'Vendite Totali', value: '€2.4M', change: '+12%', icon: DollarSign, color: 'from-orange-400 to-orange-600' },
    { title: 'Ordini', value: '8,327', change: '+8%', icon: ShoppingCart, color: 'from-purple-400 to-purple-600' },
    { title: 'Clienti Attivi', value: '3,516', change: '+5%', icon: Users, color: 'from-blue-400 to-blue-600' },
    { title: 'Tasso Conversione', value: '24.8%', change: '+15%', icon: TrendingUp, color: 'from-green-400 to-green-600' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-40 h-screen transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} w-64`}>
        <div className="h-full bg-black bg-opacity-50 backdrop-blur-xl border-r border-white border-opacity-10">
          
          {/* Logo */}
          <div className="p-6 border-b border-white border-opacity-10">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-orange-500 to-purple-600 w-10 h-10 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">W3</span>
              </div>
              <span className="text-white font-semibold text-lg">W3 Suite</span>
            </div>
          </div>

          {/* Menu */}
          <nav className="p-4 space-y-2">
            {menuItems.map((item, idx) => (
              <button
                key={idx}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                  item.active 
                    ? 'bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-lg' 
                    : 'text-gray-400 hover:bg-white hover:bg-opacity-10 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
                {item.active && <ChevronRight className="w-4 h-4 ml-auto" />}
              </button>
            ))}
          </nav>

          {/* Logout */}
          <div className="absolute bottom-0 w-full p-4 border-t border-white border-opacity-10">
            <button className="w-full flex items-center space-x-3 px-4 py-3 text-gray-400 hover:bg-white hover:bg-opacity-10 hover:text-white rounded-lg transition-all">
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Esci</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        
        {/* Top Bar */}
        <header className="bg-black bg-opacity-50 backdrop-blur-xl border-b border-white border-opacity-10">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              
              {/* Left side */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="text-white hover:bg-white hover:bg-opacity-10 p-2 rounded-lg transition-all"
                >
                  {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
                
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Cerca..."
                    className="pl-10 pr-4 py-2 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 backdrop-blur-sm"
                  />
                </div>
              </div>

              {/* Right side */}
              <div className="flex items-center space-x-4">
                <button className="relative text-white hover:bg-white hover:bg-opacity-10 p-2 rounded-lg transition-all">
                  <Bell className="w-6 h-6" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
                
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">Mario Rossi</p>
                    <p className="text-xs text-gray-400">Amministratore</p>
                  </div>
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">MR</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-6">
          
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-gray-400">Panoramica delle performance aziendali</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="bg-white bg-opacity-10 backdrop-blur-lg border border-white border-opacity-20 rounded-xl p-6 hover:transform hover:scale-105 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className={`bg-gradient-to-br ${stat.color} p-3 rounded-lg`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className={`text-sm font-semibold ${stat.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                    {stat.change}
                  </span>
                </div>
                <h3 className="text-gray-400 text-sm mb-1">{stat.title}</h3>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            
            {/* Revenue Chart */}
            <div className="bg-white bg-opacity-10 backdrop-blur-lg border border-white border-opacity-20 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Andamento Ricavi</h2>
                <button className="text-gray-400 hover:text-white transition-colors">
                  <BarChart3 className="w-5 h-5" />
                </button>
              </div>
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <Activity className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Grafico ricavi mensili</p>
                </div>
              </div>
            </div>

            {/* Orders Chart */}
            <div className="bg-white bg-opacity-10 backdrop-blur-lg border border-white border-opacity-20 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Ordini Recenti</h2>
                <button className="text-gray-400 hover:text-white transition-colors">
                  <FileText className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                {[
                  { id: '#12483', customer: 'Azienda ABC', amount: '€1,234', status: 'Completato' },
                  { id: '#12484', customer: 'Cliente XYZ', amount: '€567', status: 'In elaborazione' },
                  { id: '#12485', customer: 'Società 123', amount: '€890', status: 'Spedito' },
                  { id: '#12486', customer: 'Impresa DEF', amount: '€2,345', status: 'Completato' },
                ].map((order, idx) => (
                  <div key={idx} className="flex items-center justify-between py-3 border-b border-white border-opacity-10">
                    <div>
                      <p className="text-white font-medium">{order.id}</p>
                      <p className="text-gray-400 text-sm">{order.customer}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">{order.amount}</p>
                      <p className="text-xs text-gray-400">{order.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="bg-white bg-opacity-10 backdrop-blur-lg border border-white border-opacity-20 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Attività Recenti</h2>
            <div className="space-y-4">
              {[
                { action: 'Nuovo ordine ricevuto', detail: 'Ordine #12487 da Cliente ABC', time: '5 minuti fa', icon: ShoppingCart },
                { action: 'Report generato', detail: 'Report vendite Q4 2024', time: '1 ora fa', icon: FileText },
                { action: 'Cliente aggiunto', detail: 'Nuova registrazione: Azienda XYZ', time: '2 ore fa', icon: Users },
                { action: 'Fattura inviata', detail: 'Fattura #3456 a Società 123', time: '3 ore fa', icon: CreditCard },
              ].map((activity, idx) => (
                <div key={idx} className="flex items-start space-x-4">
                  <div className="bg-gradient-to-br from-orange-500 to-purple-600 p-2 rounded-lg">
                    <activity.icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{activity.action}</p>
                    <p className="text-gray-400 text-sm">{activity.detail}</p>
                  </div>
                  <span className="text-gray-500 text-xs">{activity.time}</span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}