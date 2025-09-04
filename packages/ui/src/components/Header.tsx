import * as React from "react";
import { motion } from "framer-motion";
import { Menu, X, Search, Bell, User, Settings } from "lucide-react";
import { cn } from "../utils/cn";
import { Button } from "./Button";
import { Card } from "./Card";

export interface HeaderProps extends React.HTMLAttributes<HTMLElement> {
  logo?: React.ReactNode;
  navigation?: Array<{ 
    label: string; 
    href: string; 
    active?: boolean; 
    icon?: React.ReactNode;
  }>;
  actions?: React.ReactNode;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  tenant?: {
    name: string;
    logo?: string;
  };
  onMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
  searchable?: boolean;
  notifications?: number;
}

const Header = React.forwardRef<HTMLElement, HeaderProps>(
  ({ 
    className,
    logo,
    navigation = [],
    actions,
    user,
    tenant,
    onMenuToggle,
    isMobileMenuOpen = false,
    searchable = true,
    notifications = 0,
    ...props 
  }, ref) => {
    const [isSearchOpen, setIsSearchOpen] = React.useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);

    return (
      <motion.header
        ref={ref}
        className={cn(
          // Glassmorphism header with fixed positioning
          "fixed top-0 left-0 right-0 z-50",
          "bg-white/10 dark:bg-black/10 backdrop-blur-lg",
          "border-b border-white/20 dark:border-white/10",
          "shadow-[0_8px_32px_rgba(31,38,135,0.37)]",
          className
        )}
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        {...(props as any)}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            
            {/* Mobile menu button */}
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon-sm"
                className="md:hidden"
                onClick={onMenuToggle}
                data-testid="button-mobile-menu"
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>

              {/* Logo and tenant */}
              <div className="flex items-center space-x-3">
                {logo && (
                  <div className="flex-shrink-0" data-testid="header-logo">
                    {logo}
                  </div>
                )}
                
                {tenant && (
                  <div className="hidden sm:flex items-center space-x-2 text-neutral-700 dark:text-neutral-300">
                    {tenant.logo && (
                      <img 
                        src={tenant.logo} 
                        alt={tenant.name}
                        className="h-6 w-6 rounded-full"
                        data-testid="img-tenant-logo"
                      />
                    )}
                    <span className="text-sm font-medium" data-testid="text-tenant-name">
                      {tenant.name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Desktop navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navigation.map((item, index) => (
                <Button
                  key={index}
                  variant={item.active ? "primary" : "ghost"}
                  size="sm"
                  className="flex items-center space-x-2"
                  data-testid={`link-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Button>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center space-x-2">
              
              {/* Search */}
              {searchable && (
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setIsSearchOpen(!isSearchOpen)}
                    data-testid="button-search"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                  
                  {isSearchOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="absolute right-0 top-full mt-2 w-80"
                    >
                      <Card variant="elevated" size="sm">
                        <input
                          type="text"
                          placeholder="Cerca..."
                          className="w-full bg-transparent border-none outline-none text-sm placeholder:text-neutral-500"
                          autoFocus
                          data-testid="input-search"
                        />
                      </Card>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Notifications */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  data-testid="button-notifications"
                >
                  <Bell className="h-4 w-4" />
                  {notifications > 0 && (
                    <span 
                      className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
                      data-testid="text-notification-count"
                    >
                      {notifications > 9 ? '9+' : notifications}
                    </span>
                  )}
                </Button>
              </div>

              {/* Custom actions */}
              {actions}

              {/* User menu */}
              {user && (
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center space-x-2"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    data-testid="button-user-menu"
                  >
                    {user.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt={user.name}
                        className="h-6 w-6 rounded-full"
                        data-testid="img-user-avatar"
                      />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                    <span className="hidden sm:block text-sm" data-testid="text-user-name">
                      {user.name}
                    </span>
                  </Button>

                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="absolute right-0 top-full mt-2 w-64"
                    >
                      <Card variant="elevated" size="sm">
                        <div className="space-y-2">
                          <div className="pb-2 border-b border-white/20">
                            <p className="font-medium text-sm" data-testid="text-user-name-menu">
                              {user.name}
                            </p>
                            <p className="text-xs text-neutral-500" data-testid="text-user-email">
                              {user.email}
                            </p>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                            data-testid="button-profile"
                          >
                            <User className="h-4 w-4 mr-2" />
                            Profilo
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                            data-testid="button-settings"
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Impostazioni
                          </Button>
                          
                          <div className="pt-2 border-t border-white/20">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-error-600"
                              data-testid="button-logout"
                            >
                              Logout
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile navigation */}
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/20"
          >
            <div className="container mx-auto px-4 py-4">
              <div className="space-y-2">
                {navigation.map((item, index) => (
                  <Button
                    key={index}
                    variant={item.active ? "primary" : "ghost"}
                    size="sm"
                    className="w-full justify-start"
                    data-testid={`link-mobile-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {item.icon}
                    <span className="ml-2">{item.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </motion.header>
    );
  }
);

Header.displayName = "Header";

export { Header };