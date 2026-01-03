import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Smile, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface Reaction {
  emoji: string;
  count: number;
  userIds: string[];
  reacted: boolean;
}

interface EmojiReactionsProps {
  messageId: string;
  channelId: string;
  reactions: Record<string, string[]>;
  currentUserId: string;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🔥'];

const ALL_EMOJIS = [
  ['👍', '👎', '👏', '🙌', '🤝', '✌️', '🤙', '💪'],
  ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍'],
  ['😀', '😃', '😄', '😁', '😅', '🤣', '😂', '🙂'],
  ['😮', '😲', '🤯', '😱', '😨', '😰', '😢', '😭'],
  ['😡', '🤬', '😤', '😠', '🙄', '😒', '😑', '😐'],
  ['🎉', '🎊', '🎁', '🏆', '🥇', '⭐', '🌟', '💫'],
  ['🔥', '💯', '✅', '❌', '❓', '❗', '💡', '📌'],
  ['☕', '🍕', '🍔', '🎂', '🍿', '🍩', '🍺', '🥂']
];

export function EmojiReactions({ 
  messageId, 
  channelId,
  reactions, 
  currentUserId 
}: EmojiReactionsProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const reactionMutation = useMutation({
    mutationFn: ({ emoji }: { emoji: string }) =>
      apiRequest(`/api/chat/messages/${messageId}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ emoji })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat/channels/${channelId}/messages`] });
    }
  });

  const removeReactionMutation = useMutation({
    mutationFn: ({ emoji }: { emoji: string }) =>
      apiRequest(`/api/chat/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, {
        method: 'DELETE'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat/channels/${channelId}/messages`] });
    }
  });

  const handleReaction = (emoji: string) => {
    const userIds = reactions[emoji] || [];
    const hasReacted = userIds.includes(currentUserId);
    
    if (hasReacted) {
      removeReactionMutation.mutate({ emoji });
    } else {
      reactionMutation.mutate({ emoji });
    }
    setPickerOpen(false);
  };

  const reactionList: Reaction[] = Object.entries(reactions || {}).map(([emoji, userIds]) => ({
    emoji,
    count: userIds.length,
    userIds,
    reacted: userIds.includes(currentUserId)
  }));

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {reactionList.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => handleReaction(reaction.emoji)}
          data-testid={`reaction-${reaction.emoji}`}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
            reaction.reacted 
              ? 'bg-windtre-orange/20 border border-windtre-orange/40'
              : 'bg-gray-100 hover:bg-gray-200 border border-transparent'
          }`}
        >
          <span>{reaction.emoji}</span>
          <span className={reaction.reacted ? 'text-windtre-orange font-medium' : 'text-gray-600'}>
            {reaction.count}
          </span>
        </button>
      ))}
      
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 rounded-full hover:bg-gray-100"
            data-testid="button-add-reaction"
          >
            {reactionList.length > 0 ? (
              <Plus size={14} className="text-gray-400" />
            ) : (
              <Smile size={14} className="text-gray-400" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          align="start" 
          className="w-auto p-2"
          data-testid="emoji-picker"
        >
          <div className="flex flex-col gap-2">
            <div className="flex gap-1 pb-2 border-b">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-lg transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-8 gap-1">
              {ALL_EMOJIS.flat().map((emoji, index) => (
                <button
                  key={`${emoji}-${index}`}
                  onClick={() => handleReaction(emoji)}
                  className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded text-base transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
