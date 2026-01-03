import { useState, useCallback } from 'react';
import { useQuery, useMutation, useInfiniteQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Heart, MessageCircle, Star, BookmarkPlus, BellOff, Pin, MoreHorizontal,
  ThumbsUp, Smile, PartyPopper, Megaphone, BarChart3, Award, Send,
  Users, UserPlus, Trophy, Medal, Sparkles, ChevronDown, Filter,
  Image as ImageIcon, Paperclip, AtSign, Hash, Check, Plus
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface FeedPost {
  id: string;
  postType: 'message' | 'announcement' | 'poll' | 'appreciation';
  title?: string;
  content: string;
  attachments: any[];
  mentionedUserIds: string[];
  tags: string[];
  authorId: string;
  teamId?: string;
  department?: string;
  isHighlighted: boolean;
  expiresAt?: string;
  badgeType?: string;
  awardeeUserIds: string[];
  isPinned: boolean;
  isActive: boolean;
  reactionsCount: number;
  commentsCount: number;
  viewsCount: number;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  } | null;
  recentComments: FeedComment[];
  reactions: Record<string, number>;
  userReactions: string[];
  isFavorited: boolean;
  isRead: boolean;
  isUnfollowed: boolean;
  poll?: {
    options: PollOption[];
    settings: PollSettings;
    totalVotes: number;
    hasVoted: boolean;
  };
  badgeAwardees: { id: string; name: string; avatar?: string }[];
}

interface FeedComment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  mentionedUserIds: string[];
  parentCommentId?: string;
  reactions: Record<string, number>;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

interface PollOption {
  id: string;
  optionText: string;
  voteCount: number;
  percentage: number;
  isSelected: boolean;
}

interface PollSettings {
  visibilityMode: 'public' | 'anonymous' | 'user_defined';
  allowMultipleChoices: boolean;
  allowVoteChange: boolean;
}

const REACTION_TYPES = [
  { type: 'like', icon: ThumbsUp, label: 'Mi piace', color: 'text-blue-500' },
  { type: 'love', icon: Heart, label: 'Love', color: 'text-red-500' },
  { type: 'celebrate', icon: PartyPopper, label: 'Celebra', color: 'text-yellow-500' },
  { type: 'support', icon: Sparkles, label: 'Supporto', color: 'text-purple-500' },
];

const BADGE_INFO: Record<string, { icon: any; label: string; color: string; bgColor: string }> = {
  'star_performer': { icon: Star, label: 'Star Performer', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  'team_player': { icon: Users, label: 'Team Player', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  'innovation': { icon: Sparkles, label: 'Innovatore', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  'customer_hero': { icon: Trophy, label: 'Customer Hero', color: 'text-green-600', bgColor: 'bg-green-100' },
  'mentor': { icon: Award, label: 'Mentore', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  'problem_solver': { icon: Medal, label: 'Problem Solver', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  'dedication': { icon: Heart, label: 'Dedizione', color: 'text-rose-600', bgColor: 'bg-rose-100' },
  'leadership': { icon: Trophy, label: 'Leadership', color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  'collaboration': { icon: Users, label: 'Collaborazione', color: 'text-teal-600', bgColor: 'bg-teal-100' },
  'creativity': { icon: Sparkles, label: 'Creatività', color: 'text-pink-600', bgColor: 'bg-pink-100' },
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Ora';
  if (diffMins < 60) return `${diffMins} min fa`;
  if (diffHours < 24) return `${diffHours}h fa`;
  if (diffDays === 1) return 'Ieri';
  if (diffDays < 7) return `${diffDays} giorni fa`;
  
  return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

function getAvatarUrl(user: { id: string; name: string; avatar?: string } | null): string | undefined {
  if (!user?.avatar) return undefined;
  if (user.avatar.startsWith('http')) return user.avatar;
  return `/api/avatars/serve/${user.avatar}`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function FeedPostCard({ 
  post, 
  onReaction, 
  onComment, 
  onFavorite, 
  onUnfollow, 
  onVote 
}: { 
  post: FeedPost;
  onReaction: (postId: string, type: string) => void;
  onComment: (postId: string, content: string) => void;
  onFavorite: (postId: string) => void;
  onUnfollow: (postId: string) => void;
  onVote: (postId: string, optionIds: string[]) => void;
}) {
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showReactions, setShowReactions] = useState(false);

  const handleSubmitComment = () => {
    if (commentText.trim()) {
      onComment(post.id, commentText);
      setCommentText('');
      setShowCommentInput(false);
    }
  };

  const isAnnouncement = post.postType === 'announcement';
  const isPoll = post.postType === 'poll';
  const isAppreciation = post.postType === 'appreciation';

  return (
    <Card className={`mb-4 ${post.isHighlighted ? 'border-l-4 border-l-green-500 bg-green-50/50' : ''} ${post.isPinned ? 'ring-2 ring-primary/20' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={getAvatarUrl(post.author)} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {post.author ? getInitials(post.author.name) : '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{post.author?.name || 'Utente'}</span>
                {post.isPinned && (
                  <Badge variant="secondary" className="text-xs py-0">
                    <Pin className="h-3 w-3 mr-1" />
                    Fissato
                  </Badge>
                )}
                {isAnnouncement && (
                  <Badge className="bg-orange-100 text-orange-700 text-xs py-0">
                    <Megaphone className="h-3 w-3 mr-1" />
                    Annuncio
                  </Badge>
                )}
                {isPoll && (
                  <Badge className="bg-blue-100 text-blue-700 text-xs py-0">
                    <BarChart3 className="h-3 w-3 mr-1" />
                    Sondaggio
                  </Badge>
                )}
                {isAppreciation && post.badgeType && (
                  <Badge className={`${BADGE_INFO[post.badgeType]?.bgColor || 'bg-gray-100'} ${BADGE_INFO[post.badgeType]?.color || 'text-gray-700'} text-xs py-0`}>
                    <Award className="h-3 w-3 mr-1" />
                    {BADGE_INFO[post.badgeType]?.label || 'Badge'}
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{formatRelativeTime(post.createdAt)}</span>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onFavorite(post.id)}>
                <BookmarkPlus className="h-4 w-4 mr-2" />
                {post.isFavorited ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUnfollow(post.id)}>
                <BellOff className="h-4 w-4 mr-2" />
                {post.isUnfollowed ? 'Segui post' : 'Non seguire'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                Segnala
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="py-2">
        {post.title && <h3 className="font-semibold mb-2">{post.title}</h3>}
        <p className="text-sm whitespace-pre-wrap">{post.content}</p>
        
        {isAppreciation && post.badgeAwardees.length > 0 && (
          <div className="mt-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-100">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              <span className="font-medium text-sm">Premiati:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {post.badgeAwardees.map(user => (
                <div key={user.id} className="flex items-center gap-2 bg-white rounded-full px-3 py-1 border">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={getAvatarUrl(user)} />
                    <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{user.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isPoll && post.poll && (
          <div className="mt-3 space-y-2">
            {post.poll.options.map(option => (
              <div 
                key={option.id}
                className={`relative p-3 border rounded-lg cursor-pointer transition-all ${option.isSelected ? 'border-primary bg-primary/5' : 'hover:border-gray-300'}`}
                onClick={() => !post.poll?.hasVoted && onVote(post.id, [option.id])}
              >
                <div className="flex items-center justify-between relative z-10">
                  <span className="text-sm font-medium">{option.optionText}</span>
                  <span className="text-sm text-muted-foreground">{option.percentage}%</span>
                </div>
                {post.poll.hasVoted && (
                  <Progress value={option.percentage} className="h-1.5 mt-2" />
                )}
                {option.isSelected && (
                  <Check className="absolute right-3 top-3 h-4 w-4 text-primary" />
                )}
              </div>
            ))}
            <p className="text-xs text-muted-foreground mt-2">
              {post.poll.totalVotes} {post.poll.totalVotes === 1 ? 'voto' : 'voti'}
              {post.poll.settings.visibilityMode === 'anonymous' && ' • Voto anonimo'}
            </p>
          </div>
        )}

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {post.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col pt-0">
        <div className="flex items-center justify-between w-full py-2 border-t">
          <div className="flex items-center gap-1">
            <div className="relative">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground gap-1"
                onMouseEnter={() => setShowReactions(true)}
                onMouseLeave={() => setShowReactions(false)}
                onClick={() => onReaction(post.id, 'like')}
              >
                <ThumbsUp className={`h-4 w-4 ${post.userReactions.includes('like') ? 'fill-blue-500 text-blue-500' : ''}`} />
                {post.reactionsCount > 0 && <span>{post.reactionsCount}</span>}
              </Button>
              
              {showReactions && (
                <div 
                  className="absolute bottom-full left-0 mb-1 bg-white border rounded-full shadow-lg p-1 flex gap-1 z-50"
                  onMouseEnter={() => setShowReactions(true)}
                  onMouseLeave={() => setShowReactions(false)}
                >
                  {REACTION_TYPES.map(reaction => (
                    <Button
                      key={reaction.type}
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 rounded-full hover:scale-125 transition-transform ${post.userReactions.includes(reaction.type) ? reaction.color : ''}`}
                      onClick={() => onReaction(post.id, reaction.type)}
                    >
                      <reaction.icon className={`h-4 w-4 ${post.userReactions.includes(reaction.type) ? 'fill-current' : ''}`} />
                    </Button>
                  ))}
                </div>
              )}
            </div>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-muted-foreground gap-1"
              onClick={() => setShowCommentInput(!showCommentInput)}
            >
              <MessageCircle className="h-4 w-4" />
              {post.commentsCount > 0 && <span>{post.commentsCount}</span>}
            </Button>
          </div>
          
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className={`h-8 w-8 ${post.isFavorited ? 'text-yellow-500' : 'text-muted-foreground'}`}
              onClick={() => onFavorite(post.id)}
            >
              <Star className={`h-4 w-4 ${post.isFavorited ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </div>

        {post.recentComments.length > 0 && (
          <div className="w-full space-y-2 pt-2">
            {post.recentComments.slice(0, 2).map(comment => (
              <div key={comment.id} className="flex gap-2 text-sm">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={getAvatarUrl(comment.user || null)} />
                  <AvatarFallback className="text-xs">
                    {comment.user ? getInitials(comment.user.name) : '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 bg-muted/50 rounded-lg px-3 py-1.5">
                  <span className="font-medium text-xs">{comment.user?.name}</span>
                  <p className="text-xs">{comment.content}</p>
                </div>
              </div>
            ))}
            {post.commentsCount > 2 && (
              <Button variant="link" size="sm" className="text-xs p-0 h-auto">
                Vedi tutti i {post.commentsCount} commenti
              </Button>
            )}
          </div>
        )}

        {showCommentInput && (
          <div className="w-full pt-2 flex gap-2">
            <Input
              placeholder="Scrivi un commento..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
              className="flex-1 h-9"
              data-testid="input-comment"
            />
            <Button 
              size="sm" 
              onClick={handleSubmitComment}
              disabled={!commentText.trim()}
              data-testid="button-submit-comment"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

function EmbeddedComposer() {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [postType, setPostType] = useState<'message' | 'announcement' | 'poll' | 'appreciation'>('message');
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [badgeType, setBadgeType] = useState('star_performer');
  const [awardeeIds, setAwardeeIds] = useState<string[]>([]);

  const createPostMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/feed/posts', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feed/posts'] });
      toast({ title: 'Post pubblicato!' });
      resetForm();
      setIsExpanded(false);
    },
    onError: () => {
      toast({ title: 'Errore nella pubblicazione', variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setPostType('message');
    setContent('');
    setTitle('');
    setIsHighlighted(false);
    setPollOptions(['', '']);
    setBadgeType('star_performer');
    setAwardeeIds([]);
  };

  const handleSubmit = () => {
    const data: any = {
      postType,
      content,
      title: title || undefined,
      isHighlighted,
      recipients: { isAllUsers: true, userIds: [], teamIds: [], departments: [] }
    };

    if (postType === 'poll') {
      data.pollOptions = pollOptions.filter(o => o.trim());
      data.pollSettings = {
        visibilityMode: 'public',
        allowMultipleChoices: false,
        allowVoteChange: true
      };
    }

    if (postType === 'appreciation') {
      data.badgeType = badgeType;
      data.awardeeUserIds = awardeeIds;
    }

    createPostMutation.mutate(data);
  };

  const getPlaceholder = () => {
    switch (postType) {
      case 'message': return 'Invia messaggio...';
      case 'announcement': return 'Scrivi un annuncio...';
      case 'poll': return 'Crea un sondaggio...';
      case 'appreciation': return 'Assegna un riconoscimento...';
      default: return 'Invia messaggio...';
    }
  };

  return (
    <Card className="mb-4 border shadow-sm">
      <Tabs value={postType} onValueChange={(v) => setPostType(v as any)}>
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto">
          <TabsTrigger 
            value="message" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm font-medium"
          >
            MESSAGGIO
          </TabsTrigger>
          <TabsTrigger 
            value="poll" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm font-medium"
          >
            SONDAGGIO
          </TabsTrigger>
          <TabsTrigger 
            value="announcement" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm font-medium"
          >
            ANNUNCIO
          </TabsTrigger>
          <TabsTrigger 
            value="appreciation" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm font-medium"
          >
            APPREZZAMENTO
          </TabsTrigger>
        </TabsList>

        <CardContent className="p-4">
          {!isExpanded ? (
            <div 
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => setIsExpanded(true)}
              data-testid="composer-collapsed"
            >
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">TU</AvatarFallback>
              </Avatar>
              <div className="flex-1 py-2.5 px-4 bg-muted/50 rounded-full text-muted-foreground text-sm hover:bg-muted transition-colors">
                {getPlaceholder()}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {(postType === 'announcement' || postType === 'poll') && (
                <Input
                  placeholder="Titolo (opzionale)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="font-medium"
                  data-testid="input-post-title"
                />
              )}

              <Textarea
                autoFocus
                placeholder={getPlaceholder()}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={postType === 'message' ? 3 : 4}
                className="resize-none"
                data-testid="input-post-content"
              />

              {postType === 'announcement' && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isHighlighted}
                    onChange={(e) => setIsHighlighted(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-muted-foreground">Evidenzia annuncio (sfondo verde)</span>
                </label>
              )}

              {postType === 'poll' && (
                <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Opzioni sondaggio
                  </p>
                  {pollOptions.map((option, index) => (
                    <Input
                      key={index}
                      placeholder={`Opzione ${index + 1}`}
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...pollOptions];
                        newOptions[index] = e.target.value;
                        setPollOptions(newOptions);
                      }}
                      className="bg-white"
                      data-testid={`input-poll-option-${index}`}
                    />
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPollOptions([...pollOptions, ''])}
                    className="w-full text-primary hover:text-primary"
                    data-testid="button-add-poll-option"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Aggiungi opzione
                  </Button>
                </div>
              )}

              {postType === 'appreciation' && (
                <div className="space-y-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-100">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Award className="h-4 w-4 text-yellow-600" />
                    Tipo di riconoscimento
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(BADGE_INFO).map(([key, info]) => (
                      <Button
                        key={key}
                        type="button"
                        variant={badgeType === key ? 'default' : 'outline'}
                        size="sm"
                        className={`justify-start text-xs ${badgeType === key ? '' : 'bg-white hover:bg-gray-50'}`}
                        onClick={() => setBadgeType(key)}
                        data-testid={`button-badge-${key}`}
                      >
                        <info.icon className="h-3.5 w-3.5 mr-1.5" />
                        {info.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" data-testid="button-attach-image">
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" data-testid="button-attach-file">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" data-testid="button-mention-user">
                    <AtSign className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" data-testid="button-add-tag">
                    <Hash className="h-4 w-4" />
                  </Button>
                  <Separator orientation="vertical" className="h-5 mx-1" />
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground gap-1" data-testid="button-select-recipients">
                    <Users className="h-3.5 w-3.5" />
                    Tutti
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      resetForm();
                      setIsExpanded(false);
                    }}
                    data-testid="button-cancel-post"
                  >
                    Annulla
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleSubmit}
                    disabled={!content.trim() || createPostMutation.isPending}
                    className="gap-1"
                    data-testid="button-publish-post"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {createPostMutation.isPending ? 'Invio...' : 'Invia'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Tabs>
    </Card>
  );
}

function LeaderboardCard() {
  const { data: leaderboard, isLoading } = useQuery<any[]>({
    queryKey: ['/api/feed/badges/leaderboard']
  });

  if (isLoading) {
    return (
      <Card className="p-4">
        <Skeleton className="h-4 w-24 mb-3" />
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="h-5 w-5 text-yellow-500" />
        <h3 className="font-semibold">Classifica Badge</h3>
      </div>
      {leaderboard && leaderboard.length > 0 ? (
        <div className="space-y-2">
          {leaderboard.slice(0, 5).map((user, index) => (
            <div key={user.userId} className="flex items-center gap-2">
              <span className={`text-sm font-bold w-5 ${index < 3 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                {index + 1}
              </span>
              <Avatar className="h-7 w-7">
                <AvatarImage src={user.userAvatar ? `/api/avatars/serve/${user.userAvatar}` : undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(user.userName || 'U')}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm flex-1 truncate">{user.userName}</span>
              <Badge variant="secondary" className="text-xs">
                {user.badgeCount}
              </Badge>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nessun badge assegnato
        </p>
      )}
    </Card>
  );
}

export function SocialFeed() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<'all' | 'announcements' | 'polls' | 'appreciation' | 'favorites'>('all');

  const { data: feedData, isLoading, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['/api/feed/posts', filter],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set('limit', '20');
      if (pageParam) params.set('cursor', pageParam);
      if (filter === 'announcements') params.set('postType', 'announcement');
      if (filter === 'polls') params.set('postType', 'poll');
      if (filter === 'appreciation') params.set('postType', 'appreciation');
      if (filter === 'favorites') params.set('favoritesOnly', 'true');
      
      return apiRequest(`/api/feed/posts?${params.toString()}`);
    },
    getNextPageParam: (lastPage: any) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined
  });

  const reactionMutation = useMutation({
    mutationFn: async ({ postId, reactionType }: { postId: string; reactionType: string }) => {
      return apiRequest(`/api/feed/posts/${postId}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ reactionType })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feed/posts'] });
    }
  });

  const commentMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      return apiRequest(`/api/feed/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feed/posts'] });
      toast({ title: 'Commento aggiunto' });
    }
  });

  const favoriteMutation = useMutation({
    mutationFn: async (postId: string) => {
      return apiRequest(`/api/feed/posts/${postId}/favorite`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feed/posts'] });
    }
  });

  const unfollowMutation = useMutation({
    mutationFn: async (postId: string) => {
      return apiRequest(`/api/feed/posts/${postId}/unfollow`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feed/posts'] });
    }
  });

  const voteMutation = useMutation({
    mutationFn: async ({ postId, optionIds }: { postId: string; optionIds: string[] }) => {
      return apiRequest(`/api/feed/posts/${postId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ optionIds })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feed/posts'] });
      toast({ title: 'Voto registrato' });
    }
  });

  const posts = feedData?.pages.flatMap(page => page.posts) || [];

  return (
    <div className="flex gap-6 h-full">
      <div className="flex-1 flex flex-col">
        <EmbeddedComposer />

        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-sm font-semibold text-muted-foreground">Feed</span>
          <div className="flex items-center gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              data-testid="button-filter-all"
            >
              Tutti
            </Button>
            <Button
              variant={filter === 'announcements' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('announcements')}
              data-testid="button-filter-announcements"
            >
              <Megaphone className="h-4 w-4 mr-1" />
              Annunci
            </Button>
            <Button
              variant={filter === 'polls' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('polls')}
              data-testid="button-filter-polls"
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              Sondaggi
            </Button>
            <Button
              variant={filter === 'appreciation' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('appreciation')}
              data-testid="button-filter-appreciation"
            >
              <Award className="h-4 w-4 mr-1" />
              Riconoscimenti
            </Button>
            <Button
              variant={filter === 'favorites' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('favorites')}
              data-testid="button-filter-favorites"
            >
              <Star className="h-4 w-4 mr-1" />
              Preferiti
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="pr-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-20 w-full" />
                  </Card>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">Nessun post trovato</p>
                <p className="text-sm mt-1">Crea il primo post per iniziare!</p>
              </div>
            ) : (
              <>
                {posts.map(post => (
                  <FeedPostCard
                    key={post.id}
                    post={post}
                    onReaction={(postId, type) => reactionMutation.mutate({ postId, reactionType: type })}
                    onComment={(postId, content) => commentMutation.mutate({ postId, content })}
                    onFavorite={(postId) => favoriteMutation.mutate(postId)}
                    onUnfollow={(postId) => unfollowMutation.mutate(postId)}
                    onVote={(postId, optionIds) => voteMutation.mutate({ postId, optionIds })}
                  />
                ))}
                {hasNextPage && (
                  <Button
                    variant="outline"
                    className="w-full mb-4"
                    onClick={() => fetchNextPage()}
                    data-testid="button-load-more"
                  >
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Carica altri post
                  </Button>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="w-72 shrink-0 space-y-4">
        <LeaderboardCard />
      </div>
    </div>
  );
}
