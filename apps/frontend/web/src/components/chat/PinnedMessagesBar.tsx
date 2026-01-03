import { useState } from 'react';
import { Pin, ChevronDown, ChevronUp, X } from 'lucide-react';
import { usePinnedMessages, useUnpinMessage } from '@/hooks/useChatFeatures';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface PinnedMessagesBarProps {
  channelId: string;
  canUnpin?: boolean;
}

export function PinnedMessagesBar({ channelId, canUnpin = false }: PinnedMessagesBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: pinnedMessages = [] } = usePinnedMessages(channelId);
  const unpinMutation = useUnpinMessage(channelId);

  if (pinnedMessages.length === 0) return null;

  const latestPinned = pinnedMessages[0];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center gap-2 text-sm">
            <Pin size={14} className="text-amber-600 shrink-0" />
            <span className="text-amber-800 font-medium">
              {pinnedMessages.length} messaggio/i fissato/i
            </span>
            <span className="text-amber-600 truncate flex-1 text-left ml-2">
              {latestPinned.message.content}
            </span>
            {isOpen ? (
              <ChevronUp size={16} className="text-amber-600 shrink-0" />
            ) : (
              <ChevronDown size={16} className="text-amber-600 shrink-0" />
            )}
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
            {pinnedMessages.map((pinned) => (
              <div 
                key={pinned.message.id}
                className="bg-white rounded-lg p-3 border border-amber-100 flex items-start gap-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 break-words">
                    {pinned.message.content}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Fissato il {new Date(pinned.pinnedAt).toLocaleDateString('it-IT')}
                  </p>
                </div>
                {canUnpin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 shrink-0"
                    onClick={() => unpinMutation.mutate(pinned.message.id)}
                    disabled={unpinMutation.isPending}
                  >
                    <X size={14} className="text-gray-400 hover:text-red-500" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
