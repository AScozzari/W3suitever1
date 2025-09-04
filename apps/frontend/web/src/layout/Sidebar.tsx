import { X } from 'lucide-react';

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  active?: boolean;
}

interface SidebarProps {
  navigation: NavigationItem[];
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ navigation, isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="sidebar-glass border-r border-white/10 flex flex-col h-full">
          
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">W3</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gradient-brand">WindTre Suite</h1>
                <p className="text-xs text-neutral-500">Enterprise Platform</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item, index) => (
              <a
                key={index}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
                  item.active
                    ? 'bg-gradient-to-r from-orange-500/20 to-purple-600/20 border border-orange-500/30 text-orange-300'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
                }`}
              >
                <div className={`${item.active ? 'text-orange-400' : 'text-neutral-400 group-hover:text-neutral-300'}`}>
                  {item.icon}
                </div>
                <span className="text-sm font-medium">{item.label}</span>
              </a>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-white/10">
            <div className="glass rounded-xl p-4">
              <div className="text-center">
                <p className="text-xs text-neutral-400 mb-1">
                  W3 Suite v1.0.0
                </p>
                <p className="text-xs text-neutral-500">
                  Enterprise • OAuth2 • MFA
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={`fixed left-0 top-0 bottom-0 w-64 sidebar-glass z-50 lg:hidden transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          
          {/* Mobile Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">W3</span>
              </div>
              <span className="text-lg font-bold text-gradient-brand">WindTre Suite</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5 text-neutral-400" />
            </button>
          </div>

          {/* Mobile Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item, index) => (
              <a
                key={index}
                href={item.href}
                onClick={onClose}
                className={`flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                  item.active
                    ? 'bg-gradient-to-r from-orange-500/20 to-purple-600/20 border border-orange-500/30 text-orange-300'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
                }`}
              >
                <div className={`${item.active ? 'text-orange-400' : 'text-neutral-400'}`}>
                  {item.icon}
                </div>
                <span className="text-sm font-medium">{item.label}</span>
              </a>
            ))}
          </nav>

          {/* Mobile Footer */}
          <div className="p-4 border-t border-white/10">
            <div className="glass rounded-xl p-4 text-center">
              <p className="text-xs text-neutral-400">W3 Suite Enterprise</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}