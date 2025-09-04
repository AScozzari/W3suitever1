import { Button } from "@/components/ui/button";
import { Bell, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Header() {
  const { user } = useAuth();

  return (
    <header className="glass border-b border-border p-6" data-testid="header">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Cross-Project Development Hub</h2>
          <p className="text-muted-foreground">Manage code sharing and references across W3 Suite applications</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="icon"
            className="hover:bg-accent"
            data-testid="button-notifications"
          >
            <Bell className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            className="hover:bg-accent"
            data-testid="button-settings"
          >
            <Settings className="w-5 h-5" />
          </Button>
          <div 
            className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center"
            data-testid="user-avatar"
          >
            {(user as any)?.firstName ? (user as any).firstName.charAt(0).toUpperCase() : 'U'}
          </div>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/api/logout'}
            data-testid="button-logout"
          >
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
