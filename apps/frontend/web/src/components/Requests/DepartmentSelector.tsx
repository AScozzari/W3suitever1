import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  DollarSign, 
  Wrench, 
  Monitor, 
  MessageSquare, 
  TrendingUp, 
  Megaphone 
} from 'lucide-react';

export type Department = 'hr' | 'finance' | 'operations' | 'support' | 'crm' | 'sales' | 'marketing';

interface DepartmentOption {
  id: Department;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgGradient: string;
}

const DEPARTMENTS: DepartmentOption[] = [
  {
    id: 'hr',
    name: 'Human Resources',
    description: 'Ferie, permessi, congedi, cambio turno',
    icon: Users,
    color: '#FF6900',
    bgGradient: 'from-orange-500/10 to-orange-600/5'
  },
  {
    id: 'finance',
    name: 'Finanza',
    description: 'Note spesa, validazioni, sconti cassa',
    icon: DollarSign,
    color: '#7B2CBF',
    bgGradient: 'from-purple-500/10 to-purple-600/5'
  },
  {
    id: 'operations',
    name: 'Operazioni',
    description: 'Manutenzione, logistics, inventory',
    icon: Wrench,
    color: '#10B981',
    bgGradient: 'from-green-500/10 to-green-600/5'
  },
  {
    id: 'support',
    name: 'IT Support',
    description: 'Accessi, hardware, software, sistemi',
    icon: Monitor,
    color: '#3B82F6',
    bgGradient: 'from-blue-500/10 to-blue-600/5'
  },
  {
    id: 'crm',
    name: 'Customer Relations',
    description: 'Reclami, escalation, assistenza clienti',
    icon: MessageSquare,
    color: '#F59E0B',
    bgGradient: 'from-amber-500/10 to-amber-600/5'
  },
  {
    id: 'sales',
    name: 'Vendite',
    description: 'Sconti, contratti, opportunità',
    icon: TrendingUp,
    color: '#EF4444',
    bgGradient: 'from-red-500/10 to-red-600/5'
  },
  {
    id: 'marketing',
    name: 'Marketing',
    description: 'Campagne, contenuti, branding',
    icon: Megaphone,
    color: '#8B5CF6',
    bgGradient: 'from-violet-500/10 to-violet-600/5'
  }
];

interface DepartmentSelectorProps {
  onSelect: (department: Department) => void;
}

export default function DepartmentSelector({ onSelect }: DepartmentSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Seleziona Dipartimento</h3>
        <p className="text-sm text-gray-600">Scegli il dipartimento per la tua richiesta</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2">
        {DEPARTMENTS.map((dept) => {
          const Icon = dept.icon;
          return (
            <Card
              key={dept.id}
              className={`
                cursor-pointer transition-all duration-200 
                hover:scale-[1.02] hover:shadow-lg
                bg-gradient-to-br ${dept.bgGradient}
                border-2 border-transparent hover:border-gray-200
                backdrop-blur-sm
              `}
              onClick={() => onSelect(dept.id)}
              data-testid={`card-department-${dept.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div 
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${dept.color}15` }}
                  >
                    <Icon 
                      className="h-6 w-6" 
                      style={{ color: dept.color }}
                    />
                  </div>
                  <CardTitle className="text-lg">{dept.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <CardDescription className="text-sm">
                  {dept.description}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
