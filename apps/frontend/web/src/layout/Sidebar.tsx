import { motion } from 'framer-motion';
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
      <aside className="hidden md:flex w-64 sidebar-glass fixed left-0 top-16 bottom-0 z-30">
        <div className="flex flex-col w-full p-4">
          
          {/* Tenant Info Card */}
          <Card variant="glass" size="sm" className="mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-brand flex items-center justify-center">
                <span className="text-white font-semibold text-sm">AC</span>
              </div>
              <div>
                <h3 className="font-medium text-sm text-neutral-900 dark:text-neutral-100">
                  Azienda Demo
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Piano Enterprise
                </p>
              </div>
            </div>
          </Card>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {navigation.map((item, index) => (
              <motion.a
                key={index}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                  item.active
                    ? 'bg-primary/20 border border-primary/30 text-primary-700 dark:text-primary-300'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-white/10 hover:text-neutral-900 dark:hover:text-neutral-100'
                }`}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                data-testid={`link-sidebar-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {item.icon}
                <span className="text-sm font-medium">{item.label}</span>
              </motion.a>
            ))}
          </nav>

          {/* Footer info */}
          <div className="pt-4 border-t border-white/20">
            <Card variant="glass" size="sm">
              <div className="text-center">
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                  W3 Suite v1.0.0
                </p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                  Enterprise Platform
                </p>
              </div>
            </Card>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: isOpen ? 0 : -300 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed left-0 top-0 bottom-0 w-64 sidebar-glass z-50 md:hidden"
      >
        <div className="flex flex-col h-full p-4">
          
          {/* Mobile header with close button */}
          <div className="flex items-center justify-between mb-6 pt-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center">
                <span className="text-white font-bold text-sm">W3</span>
              </div>
              <span className="font-semibold text-lg text-gradient-brand">
                Suite
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              data-testid="button-close-sidebar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Tenant Info Card */}
          <Card variant="glass" size="sm" className="mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-brand flex items-center justify-center">
                <span className="text-white font-semibold text-sm">AC</span>
              </div>
              <div>
                <h3 className="font-medium text-sm text-neutral-900 dark:text-neutral-100">
                  Azienda Demo
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Piano Enterprise
                </p>
              </div>
            </div>
          </Card>

          {/* Mobile Navigation */}
          <nav className="flex-1 space-y-2">
            {navigation.map((item, index) => (
              <motion.a
                key={index}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                  item.active
                    ? 'bg-primary/20 border border-primary/30 text-primary-700 dark:text-primary-300'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-white/10 hover:text-neutral-900 dark:hover:text-neutral-100'
                }`}
                onClick={onClose}
                whileTap={{ scale: 0.98 }}
                data-testid={`link-mobile-sidebar-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {item.icon}
                <span className="text-sm font-medium">{item.label}</span>
              </motion.a>
            ))}
          </nav>

          {/* Mobile footer */}
          <div className="pt-4 border-t border-white/20">
            <Card variant="glass" size="sm">
              <div className="text-center">
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                  W3 Suite v1.0.0
                </p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                  Enterprise Platform
                </p>
              </div>
            </Card>
          </div>
        </div>
      </motion.aside>
    </>
  );
}