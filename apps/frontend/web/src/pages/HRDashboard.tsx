import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';

export default function HRDashboard() {
  // Mock data - stesso formato enterprise
  const stats = {
    totalEmployees: 127,
    activeEmployees: 119,
    onLeave: 8,
    pendingRequests: 15,
    attendanceRate: 94.2,
    turnoverRate: 8.5
  };

  const employees = [
    {
      id: 'emp-001',
      name: 'Mario Rossi',
      role: 'HR Manager',
      department: 'Risorse Umane',
      status: 'active',
      email: 'mario.rossi@w3suite.com',
      phone: '+39 335 123 4567',
    },
    {
      id: 'emp-002', 
      name: 'Giulia Bianchi',
      role: 'Software Engineer',
      department: 'Sviluppo',
      status: 'active',
      email: 'giulia.bianchi@w3suite.com',
      phone: '+39 347 987 6543',
    },
    {
      id: 'emp-003',
      name: 'Luca Verdi',
      role: 'Sales Manager',
      department: 'Vendite',
      status: 'leave',
      email: 'luca.verdi@w3suite.com', 
      phone: '+39 329 456 7890',
    },
  ];

  return (
    <Layout currentModule="hr" setCurrentModule={() => {}}>
      <div className="min-h-screen p-6 space-y-8" style={{background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'}}>
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2" data-testid="text-page-title">
            Dashboard HR
          </h1>
          <p className="text-lg text-gray-600">
            Gestione completa delle risorse umane per W3 Suite Enterprise
          </p>
        </div>

        {/* Quick Stats Row - Pure Tailwind */}
        <div className="grid gap-6 md:grid-cols-4">
          
          {/* Total Employees */}
          <div 
            className="rounded-xl border border-white/20 shadow-lg backdrop-blur-sm p-6 transition-all hover:shadow-xl"
            style={{background: 'rgba(255, 255, 255, 0.7)'}}
            data-testid="card-total-employees"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl" style={{background: 'rgba(59, 130, 246, 0.1)'}}>
                👥
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Dipendenti Totali</p>
                <p className="text-3xl font-bold text-gray-800" data-testid="text-total-employees">{stats.totalEmployees}</p>
              </div>
            </div>
          </div>

          {/* Active Employees */}
          <div 
            className="rounded-xl border border-white/20 shadow-lg backdrop-blur-sm p-6 transition-all hover:shadow-xl"
            style={{background: 'rgba(255, 255, 255, 0.7)'}}
            data-testid="card-active-employees"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl" style={{background: 'rgba(34, 197, 94, 0.1)'}}>
                ✅
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Presenti Oggi</p>
                <p className="text-3xl font-bold text-gray-800" data-testid="text-active-employees">{stats.activeEmployees}</p>
              </div>
            </div>
          </div>

          {/* On Leave */}
          <div 
            className="rounded-xl border border-white/20 shadow-lg backdrop-blur-sm p-6 transition-all hover:shadow-xl"
            style={{background: 'rgba(255, 255, 255, 0.7)'}}
            data-testid="card-on-leave"
          >
            <div className="flex items-center space-x-4">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                style={{background: 'rgba(255, 105, 0, 0.1)'}}
              >
                🏖️
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">In Ferie</p>
                <p className="text-3xl font-bold text-gray-800" data-testid="text-on-leave">{stats.onLeave}</p>
              </div>
            </div>
          </div>

          {/* Pending Requests */}
          <div 
            className="rounded-xl border border-white/20 shadow-lg backdrop-blur-sm p-6 transition-all hover:shadow-xl"
            style={{background: 'rgba(255, 255, 255, 0.7)'}}
            data-testid="card-pending-requests"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl" style={{background: 'rgba(239, 68, 68, 0.1)'}}>
                ⚠️
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Richieste Pendenti</p>
                <p className="text-3xl font-bold text-gray-800" data-testid="text-pending-requests">{stats.pendingRequests}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics - WindTre Colors */}
        <div className="grid gap-6 md:grid-cols-2">
          
          {/* Attendance Rate */}
          <div 
            className="rounded-xl border border-white/20 shadow-lg backdrop-blur-sm p-6"
            style={{background: 'rgba(255, 255, 255, 0.7)'}}
            data-testid="card-attendance-rate"
          >
            <div className="mb-4">
              <h3 className="text-xl font-semibold flex items-center text-gray-800">
                <span className="text-2xl mr-3">📈</span>
                Tasso di Presenza
              </h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-gray-800">{stats.attendanceRate}%</span>
                <div className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 border border-green-200">
                  📈 +2.3%
                </div>
              </div>
              {/* Progress Bar - Pure CSS */}
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="h-3 rounded-full transition-all duration-300"
                  style={{
                    width: `${stats.attendanceRate}%`,
                    background: 'linear-gradient(90deg, #FF6900 0%, #FFB366 100%)'
                  }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">
                Rispetto al mese precedente. Obiettivo: 95%
              </p>
            </div>
          </div>

          {/* Turnover Rate */}
          <div 
            className="rounded-xl border border-white/20 shadow-lg backdrop-blur-sm p-6"
            style={{background: 'rgba(255, 255, 255, 0.7)'}}
            data-testid="card-turnover-rate"
          >
            <div className="mb-4">
              <h3 className="text-xl font-semibold flex items-center text-gray-800">
                <span className="text-2xl mr-3">🎯</span>
                Tasso di Turnover
              </h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-gray-800">{stats.turnoverRate}%</span>
                <div className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 border border-green-200">
                  📉 -1.2%
                </div>
              </div>
              {/* Progress Bar - Purple WindTre */}
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="h-3 rounded-full transition-all duration-300"
                  style={{
                    width: `${100 - stats.turnoverRate}%`,
                    background: 'linear-gradient(90deg, #7B2CBF 0%, #A855F7 100%)'
                  }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">
                In diminuzione. Obiettivo annuale: &lt; 10%
              </p>
            </div>
          </div>
        </div>

        {/* Recent Employees - Pure Tailwind */}
        <div 
          className="rounded-xl border border-white/20 shadow-lg backdrop-blur-sm p-6"
          style={{background: 'rgba(255, 255, 255, 0.7)'}}
          data-testid="card-recent-employees"
        >
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-800">Dipendenti Recenti</h3>
          </div>
          <div className="space-y-4">
            {employees.map((employee) => (
              <div 
                key={employee.id}
                className="flex items-center justify-between p-4 rounded-lg transition-colors hover:bg-white/50"
                style={{background: 'rgba(248, 250, 252, 0.5)'}}
                data-testid={`row-employee-${employee.id}`}
              >
                <div className="flex items-center space-x-4">
                  <div 
                    className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{background: 'linear-gradient(135deg, #FF6900 0%, #7B2CBF 100%)'}}
                  >
                    {employee.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800" data-testid={`text-employee-name-${employee.id}`}>
                      {employee.name}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {employee.role} • {employee.department}
                    </p>
                    <div className="flex items-center space-x-4 mt-1">
                      <div className="flex items-center text-xs text-gray-500">
                        📧 {employee.email}
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        📱 {employee.phone}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div 
                    className={`px-3 py-1 rounded-full text-sm font-medium border ${
                      employee.status === 'active' 
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : 'bg-orange-100 text-orange-700 border-orange-200'
                    }`}
                    data-testid={`badge-status-${employee.id}`}
                  >
                    {employee.status === 'active' ? '✅ Attivo' : '🏖️ In Ferie'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions - WindTre Gradient */}
        <div 
          className="rounded-xl border border-white/20 shadow-lg backdrop-blur-sm p-6"
          style={{background: 'rgba(255, 255, 255, 0.7)'}}
          data-testid="card-quick-actions"
        >
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-800">Azioni Rapide</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            
            <button 
              className="h-20 flex flex-col items-center justify-center space-y-2 rounded-lg border transition-all hover:shadow-md"
              style={{
                background: 'rgba(59, 130, 246, 0.05)',
                borderColor: 'rgba(59, 130, 246, 0.2)'
              }}
              data-testid="button-add-employee"
            >
              <span className="text-2xl">👤</span>
              <span className="text-sm font-medium text-gray-700">Aggiungi Dipendente</span>
            </button>

            <button 
              className="h-20 flex flex-col items-center justify-center space-y-2 rounded-lg border transition-all hover:shadow-md"
              style={{
                background: 'rgba(34, 197, 94, 0.05)',
                borderColor: 'rgba(34, 197, 94, 0.2)'
              }}
              data-testid="button-approve-leaves"
            >
              <span className="text-2xl">📅</span>
              <span className="text-sm font-medium text-gray-700">Approva Ferie</span>
            </button>

            <button 
              className="h-20 flex flex-col items-center justify-center space-y-2 rounded-lg border transition-all hover:shadow-md"
              style={{
                background: 'rgba(255, 105, 0, 0.05)',
                borderColor: 'rgba(255, 105, 0, 0.2)'
              }}
              data-testid="button-review-expenses"
            >
              <span className="text-2xl">🧾</span>
              <span className="text-sm font-medium text-gray-700">Review Spese</span>
            </button>

            <button 
              className="h-20 flex flex-col items-center justify-center space-y-2 rounded-lg border transition-all hover:shadow-md"
              style={{
                background: 'rgba(123, 44, 191, 0.05)',
                borderColor: 'rgba(123, 44, 191, 0.2)'
              }}
              data-testid="button-generate-report"
            >
              <span className="text-2xl">📄</span>
              <span className="text-sm font-medium text-gray-700">Genera Report</span>
            </button>
          </div>
        </div>

        {/* Department Overview - WindTre Brand Colors */}
        <div 
          className="rounded-xl border border-white/20 shadow-lg backdrop-blur-sm p-6"
          style={{background: 'rgba(255, 255, 255, 0.7)'}}
          data-testid="card-departments"
        >
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-800">Panoramica Dipartimenti</h3>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            
            {/* Development */}
            <div 
              className="p-4 rounded-lg"
              style={{background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 197, 253, 0.1) 100%)'}}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">🏢</span>
                <div className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                  42 dipendenti
                </div>
              </div>
              <h4 className="font-bold text-lg mt-2 text-blue-900">Sviluppo</h4>
              <p className="text-sm text-blue-700">Frontend, Backend, DevOps</p>
            </div>
            
            {/* Sales */}
            <div 
              className="p-4 rounded-lg"
              style={{background: 'linear-gradient(135deg, rgba(255, 105, 0, 0.1) 0%, rgba(255, 154, 51, 0.1) 100%)'}}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">💰</span>
                <div className="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-700">
                  28 dipendenti
                </div>
              </div>
              <h4 className="font-bold text-lg mt-2 text-orange-900">Vendite</h4>
              <p className="text-sm text-orange-700">Account Manager, Sales Rep</p>
            </div>
            
            {/* Marketing */}
            <div 
              className="p-4 rounded-lg"
              style={{background: 'linear-gradient(135deg, rgba(123, 44, 191, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)'}}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">📚</span>
                <div className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700">
                  19 dipendenti
                </div>
              </div>
              <h4 className="font-bold text-lg mt-2 text-purple-900">Marketing</h4>
              <p className="text-sm text-purple-700">Digital, Content, Design</p>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}