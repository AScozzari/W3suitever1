/**
 * Action Tags Selector Component
 * Multiselect for predefined action tags + custom action field
 * Used in workflow template editor to define what the workflow DOES
 */

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, ChevronDown, Tags, Plus } from 'lucide-react';
import { getActionTagsForDepartment, getActionTagLabel, DEPARTMENT_LABELS, type Department } from '@/lib/action-tags';

interface ActionTagsSelectorProps {
  department: string;
  selectedTags: string[];
  customAction: string | null;
  onTagsChange: (tags: string[]) => void;
  onCustomActionChange: (action: string | null) => void;
  disabled?: boolean;
}

export function ActionTagsSelector({
  department,
  selectedTags,
  customAction,
  onTagsChange,
  onCustomActionChange,
  disabled = false
}: ActionTagsSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(!!customAction);
  const [localCustomAction, setLocalCustomAction] = useState(customAction || '');

  const availableTags = getActionTagsForDepartment(department);
  const departmentLabel = DEPARTMENT_LABELS[department.toLowerCase() as Department] || department;

  useEffect(() => {
    setLocalCustomAction(customAction || '');
    setShowCustomInput(!!customAction);
  }, [customAction]);

  const handleTagToggle = (tagValue: string) => {
    if (selectedTags.includes(tagValue)) {
      onTagsChange(selectedTags.filter(t => t !== tagValue));
    } else {
      onTagsChange([...selectedTags, tagValue]);
    }
  };

  const handleRemoveTag = (tagValue: string) => {
    onTagsChange(selectedTags.filter(t => t !== tagValue));
  };

  const handleCustomActionSave = () => {
    if (localCustomAction.trim()) {
      onCustomActionChange(localCustomAction.trim());
    } else {
      onCustomActionChange(null);
      setShowCustomInput(false);
    }
  };

  const handleClearCustomAction = () => {
    setLocalCustomAction('');
    onCustomActionChange(null);
    setShowCustomInput(false);
  };

  if (!department) {
    return (
      <div className="text-sm text-gray-500 italic">
        Seleziona prima un dipartimento per vedere le azioni disponibili
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <Tags className="h-4 w-4" />
        Azioni del Workflow ({departmentLabel})
      </Label>
      
      <div className="space-y-2">
        {/* Selected Tags Display */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedTags.map(tagValue => (
              <Badge 
                key={tagValue} 
                variant="secondary"
                className="bg-orange-100 text-orange-800 hover:bg-orange-200 flex items-center gap-1"
              >
                {getActionTagLabel(tagValue, department)}
                {!disabled && (
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-orange-900" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTag(tagValue);
                    }}
                  />
                )}
              </Badge>
            ))}
          </div>
        )}

        {/* Custom Action Display */}
        {customAction && (
          <Badge 
            variant="outline"
            className="bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1"
          >
            Custom: {customAction}
            {!disabled && (
              <X 
                className="h-3 w-3 cursor-pointer hover:text-purple-900" 
                onClick={handleClearCustomAction}
              />
            )}
          </Badge>
        )}

        {/* Tag Selector Dropdown */}
        {!disabled && (
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-between text-left font-normal"
                data-testid="action-tags-trigger"
              >
                <span className="text-gray-500">
                  {selectedTags.length > 0 
                    ? `${selectedTags.length} azione/i selezionata/e` 
                    : 'Seleziona le azioni del workflow...'}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
              <ScrollArea className="h-64 p-4">
                <div className="space-y-3">
                  {availableTags.length > 0 ? (
                    availableTags.map(tag => (
                      <div key={tag.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`tag-${tag.value}`}
                          checked={selectedTags.includes(tag.value)}
                          onCheckedChange={() => handleTagToggle(tag.value)}
                          data-testid={`action-tag-checkbox-${tag.value}`}
                        />
                        <label 
                          htmlFor={`tag-${tag.value}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {tag.label}
                        </label>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">
                      Nessuna azione predefinita per questo dipartimento
                    </p>
                  )}
                </div>
              </ScrollArea>
              
              {/* Custom Action Section */}
              <div className="border-t p-3">
                {!showCustomInput ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                    onClick={() => setShowCustomInput(true)}
                    data-testid="add-custom-action-button"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Aggiungi azione personalizzata
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Input
                      placeholder="Es: Approvazione budget Q1..."
                      value={localCustomAction}
                      onChange={(e) => setLocalCustomAction(e.target.value)}
                      className="text-sm"
                      data-testid="custom-action-input"
                    />
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setShowCustomInput(false);
                          setLocalCustomAction(customAction || '');
                        }}
                      >
                        Annulla
                      </Button>
                      <Button 
                        size="sm"
                        onClick={handleCustomActionSave}
                        disabled={!localCustomAction.trim()}
                        data-testid="save-custom-action-button"
                      >
                        Salva
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Helper text */}
      {!disabled && (
        <p className="text-xs text-gray-500">
          Le azioni aiutano a identificare lo scopo del workflow nella Coverage Dashboard
        </p>
      )}
    </div>
  );
}

export default ActionTagsSelector;
