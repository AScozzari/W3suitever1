import { Search, Bell, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export const EnterpriseHeader = () => {
  return (
    <header className="h-16 glass-strong border-b border-border/50 flex items-center justify-between px-6">
      {/* Logo e Brand */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">W</span>
        </div>
        <div>
          <h1 className="text-lg font-bold text-windtre-orange">WindTre Suite</h1>
          <p className="text-xs text-muted-foreground">Multitenant Dashboard</p>
        </div>
      </div>

      {/* Barra di ricerca centrale */}
      <div className="flex-1 max-w-md mx-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca clienti, contratti, fatture..."
            className="pl-10 glass border-border/50 focus:border-windtre-orange/50"
          />
        </div>
      </div>

      {/* Sezione destra */}
      <div className="flex items-center gap-4">
        {/* Windtre Milano */}
        <div className="hidden md:flex items-center gap-2 text-sm">
          <div className="w-2 h-2 bg-success rounded-full"></div>
          <span className="font-medium">Windtre Milano</span>
        </div>

        {/* Notifiche */}
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-windtre-orange text-white">
            3
          </Badge>
        </Button>

        {/* Profilo utente */}
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-secondary rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
          </div>
          <span className="hidden md:inline text-sm font-medium">Admin</span>
        </Button>
      </div>
    </header>
  );
};