import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useTenantNavigation } from '@/hooks/useTenantSafety';
import { 
  UserPlus, 
  Target, 
  CheckSquare, 
  Building, 
  User, 
  Megaphone,
  BarChart3,
  Settings
} from 'lucide-react';

export function CRMCommandPalette() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { navigate, buildUrl } = useTenantNavigation();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = (callback: () => void) => {
    setOpen(false);
    callback();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Cerca o crea..." />
      <CommandList>
        <CommandEmpty>Nessun risultato trovato.</CommandEmpty>
        
        <CommandGroup heading="Quick Create">
          <CommandItem
            onSelect={() => handleSelect(() => {
              console.log('Create lead');
              // TODO: Open create lead dialog
            })}
            data-testid="cmd-create-lead"
          >
            <UserPlus className="mr-2 h-4 w-4" style={{ color: 'hsl(var(--brand-purple))' }} />
            <span>Nuovo Lead</span>
          </CommandItem>
          
          <CommandItem
            onSelect={() => handleSelect(() => {
              console.log('Create deal');
              // TODO: Open create deal dialog
            })}
            data-testid="cmd-create-deal"
          >
            <Target className="mr-2 h-4 w-4" style={{ color: 'hsl(var(--brand-orange))' }} />
            <span>Nuovo Deal</span>
          </CommandItem>
          
          <CommandItem
            onSelect={() => handleSelect(() => {
              console.log('Create task');
              // TODO: Open create task dialog
            })}
            data-testid="cmd-create-task"
          >
            <CheckSquare className="mr-2 h-4 w-4" style={{ color: 'hsl(220, 90%, 56%)' }} />
            <span>Nuova Attività</span>
          </CommandItem>
          
          <CommandItem
            onSelect={() => handleSelect(() => {
              console.log('Create account');
              // TODO: Open create account dialog
            })}
            data-testid="cmd-create-account"
          >
            <Building className="mr-2 h-4 w-4" style={{ color: 'hsl(var(--brand-orange))' }} />
            <span>Nuovo Account</span>
          </CommandItem>
          
          <CommandItem
            onSelect={() => handleSelect(() => {
              console.log('Create contact');
              // TODO: Open create contact dialog
            })}
            data-testid="cmd-create-contact"
          >
            <User className="mr-2 h-4 w-4" style={{ color: 'hsl(var(--brand-purple))' }} />
            <span>Nuovo Contatto</span>
          </CommandItem>
          
          <CommandItem
            onSelect={() => handleSelect(() => {
              console.log('Create campaign');
              // TODO: Open create campaign dialog
            })}
            data-testid="cmd-create-campaign"
          >
            <Megaphone className="mr-2 h-4 w-4" style={{ color: 'hsl(280, 65%, 60%)' }} />
            <span>Nuova Campagna</span>
          </CommandItem>
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Navigazione CRM">
          <CommandItem
            onSelect={() => handleSelect(() => navigate(buildUrl('crm').replace(/^\/[^/]+\//, '')))}
            data-testid="cmd-nav-dashboard"
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            <span>Dashboard CRM</span>
          </CommandItem>
          
          <CommandItem
            onSelect={() => handleSelect(() => navigate(buildUrl('crm/leads').replace(/^\/[^/]+\//, '')))}
            data-testid="cmd-nav-leads"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            <span>Lead</span>
          </CommandItem>
          
          <CommandItem
            onSelect={() => handleSelect(() => navigate(buildUrl('crm/pipeline/board').replace(/^\/[^/]+\//, '')))}
            data-testid="cmd-nav-pipeline"
          >
            <Target className="mr-2 h-4 w-4" />
            <span>Pipeline Board</span>
          </CommandItem>
          
          <CommandItem
            onSelect={() => handleSelect(() => navigate(buildUrl('crm/deals').replace(/^\/[^/]+\//, '')))}
            data-testid="cmd-nav-deals"
          >
            <Target className="mr-2 h-4 w-4" />
            <span>Deals</span>
          </CommandItem>
          
          <CommandItem
            onSelect={() => handleSelect(() => navigate(buildUrl('crm/customers').replace(/^\/[^/]+\//, '')))}
            data-testid="cmd-nav-customers"
          >
            <User className="mr-2 h-4 w-4" />
            <span>Clienti</span>
          </CommandItem>
          
          <CommandItem
            onSelect={() => handleSelect(() => navigate(buildUrl('crm/activities').replace(/^\/[^/]+\//, '')))}
            data-testid="cmd-nav-activities"
          >
            <CheckSquare className="mr-2 h-4 w-4" />
            <span>Attività</span>
          </CommandItem>
          
          <CommandItem
            onSelect={() => handleSelect(() => navigate(buildUrl('crm/campaigns').replace(/^\/[^/]+\//, '')))}
            data-testid="cmd-nav-campaigns"
          >
            <Megaphone className="mr-2 h-4 w-4" />
            <span>Campagne</span>
          </CommandItem>
          
          <CommandItem
            onSelect={() => handleSelect(() => navigate(buildUrl('crm/analytics').replace(/^\/[^/]+\//, '')))}
            data-testid="cmd-nav-analytics"
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            <span>Report</span>
          </CommandItem>
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Impostazioni">
          <CommandItem
            onSelect={() => handleSelect(() => console.log('Pipeline settings'))}
            data-testid="cmd-settings-pipeline"
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Pipeline & Stage</span>
          </CommandItem>
          
          <CommandItem
            onSelect={() => handleSelect(() => console.log('Playbook settings'))}
            data-testid="cmd-settings-playbook"
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Playbook Regole</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
