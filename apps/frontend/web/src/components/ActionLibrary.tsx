import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  Play, 
  CheckCircle, 
  Settings, 
  Users, 
  FileText,
  Building,
  Shield,
  DollarSign,
  Wrench
} from 'lucide-react';

// Types for WorkflowAction from backend
interface WorkflowAction {
  id: string;
  name: string;
  description: string;
  category: string;
  required_permission: string;
  version: number;
  is_active: boolean;
  configuration_schema?: any;
  created_at: string;
  updated_at: string;
}

interface ActionLibraryProps {
  onActionDrag?: (action: WorkflowAction) => void;
}

// Category configurations with icons and colors
const CATEGORIES = {
  'HR': {
    icon: Users,
    color: 'bg-green-500',
    bgClass: 'bg-green-100 dark:bg-green-900',
    textClass: 'text-green-700 dark:text-green-300'
  },
  'Finance': {
    icon: DollarSign,
    color: 'bg-blue-500',
    bgClass: 'bg-blue-100 dark:bg-blue-900',
    textClass: 'text-blue-700 dark:text-blue-300'
  },
  'Operations': {
    icon: Settings,
    color: 'bg-orange-500',
    bgClass: 'bg-orange-100 dark:bg-orange-900',
    textClass: 'text-orange-700 dark:text-orange-300'
  },
  'Legal': {
    icon: Shield,
    color: 'bg-purple-500',
    bgClass: 'bg-purple-100 dark:bg-purple-900',
    textClass: 'text-purple-700 dark:text-purple-300'
  },
  'Procurement': {
    icon: FileText,
    color: 'bg-pink-500',
    bgClass: 'bg-pink-100 dark:bg-pink-900',
    textClass: 'text-pink-700 dark:text-pink-300'
  },
  'IT': {
    icon: Wrench,
    color: 'bg-cyan-500',
    bgClass: 'bg-cyan-100 dark:bg-cyan-900',
    textClass: 'text-cyan-700 dark:text-cyan-300'
  }
};

export default function ActionLibrary({ onActionDrag }: ActionLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Fetch workflow actions from backend
  const { data: actions = [], isLoading, error } = useQuery<WorkflowAction[]>({
    queryKey: ['/api/workflow-actions'],
  });

  // Filter actions by search and category
  const filteredActions = actions.filter((action) => {
    const matchesSearch = action.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         action.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || action.category === selectedCategory;
    return matchesSearch && matchesCategory && action.is_active;
  });

  // Group actions by category
  const actionsByCategory = filteredActions.reduce((acc: Record<string, WorkflowAction[]>, action: WorkflowAction) => {
    if (!acc[action.category]) {
      acc[action.category] = [];
    }
    acc[action.category].push(action);
    return acc;
  }, {});

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, action: WorkflowAction) => {
    e.dataTransfer.setData('application/json', JSON.stringify(action));
    e.dataTransfer.effectAllowed = 'copy';
    onActionDrag?.(action);
  };

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6 text-center">
          <p className="text-red-600 dark:text-red-400">
            Error loading workflow actions. Please try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search workflow actions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-actions"
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={selectedCategory === null ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(null)}
            data-testid="filter-all-categories"
          >
            All Categories ({actions.length})
          </Badge>
          {Object.entries(CATEGORIES).map(([category, config]) => {
            const Icon = config.icon;
            const count = actions.filter((action) => action.category === category).length;
            
            return (
              <Badge
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                className={`cursor-pointer ${selectedCategory === category ? config.textClass : ''}`}
                onClick={() => setSelectedCategory(category)}
                data-testid={`filter-category-${category.toLowerCase()}`}
              >
                <Icon className="w-3 h-3 mr-1" />
                {category} ({count})
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-3 w-full mb-2" />
                <Skeleton className="h-3 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Actions by Category */}
      {!isLoading && (
        <div className="space-y-6">
          {Object.entries(actionsByCategory).map(([category, categoryActions]) => {
            const config = CATEGORIES[category as keyof typeof CATEGORIES];
            if (!config) return null;
            
            const Icon = config.icon;

            return (
              <div key={category} className="space-y-3">
                {/* Category Header */}
                <div className="flex items-center gap-2 pb-2 border-b">
                  <div className={`p-2 rounded-lg ${config.bgClass}`}>
                    <Icon className={`w-4 h-4 ${config.textClass}`} />
                  </div>
                  <h3 className={`font-semibold ${config.textClass}`}>
                    {category}
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {categoryActions.length} actions
                  </Badge>
                </div>

                {/* Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {categoryActions.map((action) => (
                    <Card
                      key={action.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, action)}
                      className="cursor-grab hover:shadow-md transition-all duration-200 border-l-4"
                      style={{ borderLeftColor: config.color.replace('bg-', '#') }}
                      data-testid={`action-card-${action.id}`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <CardTitle className="text-sm font-medium line-clamp-2">
                              {action.name}
                            </CardTitle>
                            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                              {action.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            {action.is_active ? (
                              <CheckCircle className="w-3 h-3 text-green-500" />
                            ) : (
                              <div className="w-3 h-3 bg-slate-300 rounded-full" />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {action.required_permission}
                            </Badge>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            v{action.version}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredActions.length === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="p-8 text-center">
            <Play className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
              No Actions Found
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              {searchTerm || selectedCategory 
                ? "Try adjusting your search or filter criteria"
                : "No workflow actions are currently available"
              }
            </p>
            {(searchTerm || selectedCategory) && (
              <div className="flex justify-center gap-2">
                {searchTerm && (
                  <Badge 
                    variant="outline" 
                    className="cursor-pointer"
                    onClick={() => setSearchTerm('')}
                  >
                    Clear search
                  </Badge>
                )}
                {selectedCategory && (
                  <Badge 
                    variant="outline" 
                    className="cursor-pointer"
                    onClick={() => setSelectedCategory(null)}
                  >
                    Show all categories
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Drag Instructions */}
      {!isLoading && filteredActions.length > 0 && (
        <Card className="bg-slate-50 dark:bg-slate-900/50 border-dashed">
          <CardContent className="p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
              <strong>💡 Tip:</strong> Drag workflow actions to the canvas on the left to build your workflow
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}