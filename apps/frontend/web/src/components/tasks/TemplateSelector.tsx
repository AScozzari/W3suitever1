import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, ChevronDown, Sparkles } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description?: string | null;
  taskTitle: string;
  taskDescription?: string | null;
  defaultPriority?: string | null;
  defaultDueInDays?: number | null;
  defaultChecklist?: Array<{ title: string; position: number }>;
  defaultAssignees?: string[];
  defaultTags?: string[];
  isActive: boolean;
  department?: string | null;
}

export function TemplateSelector() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ['/api/task-templates'],
    enabled: open,
  });

  const createFromTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      return apiRequest(`/api/task-templates/${templateId}/use`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setOpen(false);
      toast({
        title: 'Task creato da template',
        description: 'Il task è stato creato con successo',
      });
    },
    onError: () => {
      toast({
        title: 'Errore',
        description: 'Impossibile creare il task dal template',
        variant: 'destructive',
      });
    },
  });

  const activeTemplates = templates.filter(t => t.isActive);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" data-testid="button-template-selector">
          <Sparkles className="h-4 w-4 mr-2" />
          Da Template
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Crea da Template</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {isLoading ? (
          <div className="p-4 text-sm text-gray-500 text-center">
            Caricamento templates...
          </div>
        ) : activeTemplates.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 text-center">
            Nessun template disponibile
          </div>
        ) : (
          activeTemplates.map((template) => (
            <DropdownMenuItem
              key={template.id}
              onClick={() => createFromTemplateMutation.mutate(template.id)}
              className="flex flex-col items-start gap-2 p-3 cursor-pointer"
              data-testid={`template-item-${template.id}`}
            >
              <div className="flex items-start justify-between w-full gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <span className="font-medium text-sm">{template.name}</span>
                </div>
                {template.defaultPriority && (
                  <Badge
                    variant="outline"
                    className={
                      template.defaultPriority === 'high'
                        ? 'text-orange-600 bg-orange-50 border-orange-200'
                        : template.defaultPriority === 'medium'
                        ? 'text-blue-600 bg-blue-50 border-blue-200'
                        : 'text-gray-600 bg-gray-50 border-gray-200'
                    }
                  >
                    {template.defaultPriority === 'high'
                      ? 'Alta'
                      : template.defaultPriority === 'medium'
                      ? 'Media'
                      : 'Bassa'}
                  </Badge>
                )}
              </div>
              
              {template.description && (
                <p className="text-xs text-gray-500 line-clamp-1 w-full">
                  {template.description}
                </p>
              )}
              
              <div className="flex flex-wrap gap-2 w-full">
                {template.taskTitle && (
                  <div className="text-xs text-gray-600">
                    <span className="font-medium">Task:</span> {template.taskTitle}
                  </div>
                )}
              </div>
              
              {(template.defaultChecklist && template.defaultChecklist.length > 0) && (
                <div className="text-xs text-gray-500">
                  📋 {template.defaultChecklist.length} checklist items
                </div>
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
