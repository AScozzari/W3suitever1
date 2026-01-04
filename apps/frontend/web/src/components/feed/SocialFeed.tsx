import { useState, useCallback, useRef, useEffect } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Heart, MessageCircle, Star, BookmarkPlus, BellOff, Pin, MoreHorizontal,
  ThumbsUp, ThumbsDown, Smile, PartyPopper, Megaphone, BarChart3, Award, Send,
  Users, UserPlus, Trophy, Medal, Sparkles, ChevronDown, Filter, CornerDownRight,
  Image as ImageIcon, Paperclip, AtSign, Hash, Check, Plus, X, Upload,
  Bold, Italic, Underline, Strikethrough, List, ListOrdered, Link2, Quote,
  Type, Palette, Undo, Redo, Table, Video, FileText, Building2, File,
  Download, Eye, Trash2, RefreshCw
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '../hooks/useAuth';
import { useUserAvatar } from '@/hooks/useUserAvatar';

// Emoji categories for picker (no duplicates)
const EMOJI_CATEGORIES = {
  'Faccine': ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕'],
  'Gesti': ['👍', '👎', '👌', '🤌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿'],
  'Simboli': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💯', '✅', '❌', '⭐', '🌟', '💫', '⚡', '🔥', '💥', '🎉', '🎊', '🏆', '🥇', '🥈', '🥉', '🏅', '🎯', '💡', '📌', '📍'],
  'Oggetti': ['💼', '📁', '📂', '🗂️', '📋', '📄', '📃', '📑', '📊', '📈', '📉', '🗒️', '🗓️', '📆', '📅', '📇', '🗃️', '🗳️', '🗄️', '📬', '📭', '📮', '📯', '📨', '📩', '📧', '💻', '🖥️', '🖨️', '⌨️', '🖱️', '💾', '💿', '📱', '☎️', '📞', '📠', '📺', '📻']
};

// Badge types for appreciation posts
const BADGE_TYPES = {
  'star_performer': { icon: Star, label: 'Star Performer', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  'team_player': { icon: Users, label: 'Team Player', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  'innovator': { icon: Sparkles, label: 'Innovatore', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  'problem_solver': { icon: Trophy, label: 'Problem Solver', color: 'text-green-600', bgColor: 'bg-green-50' },
  'mentor': { icon: UserPlus, label: 'Mentor', color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  'go_getter': { icon: Award, label: 'Go Getter', color: 'text-orange-600', bgColor: 'bg-orange-50' },
  'customer_champion': { icon: Heart, label: 'Customer Champion', color: 'text-red-600', bgColor: 'bg-red-50' },
  'rising_star': { icon: Medal, label: 'Rising Star', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  'excellence': { icon: Trophy, label: 'Eccellenza', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  'dedication': { icon: Star, label: 'Dedizione', color: 'text-cyan-600', bgColor: 'bg-cyan-50' }
};


interface FeedAttachment {
  id: string;
  objectKey: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  downloadUrl: string;
  previewUrl?: string | null;
}

interface FeedUser {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  avatar?: string;
  displayName?: string;
}

interface FeedTeam {
  id: string;
  name: string;
  description?: string;
}

interface FeedDepartment {
  id: string;
  name: string;
  code: string;
  description?: string;
}

interface RecipientSelection {
  mode: 'all' | 'users' | 'teams';
  userIds: string[];
  teamIds: string[];
  departmentId?: string;
}

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
    firstName?: string;
    lastName?: string;
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
  badgeAwardees: { id: string; firstName?: string; lastName?: string; avatar?: string }[];
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
    firstName?: string;
    lastName?: string;
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

// Reaction types with icons for feed interactions (Bitrix24 style)
const REACTION_ICONS = [
  { type: 'like', icon: ThumbsUp, label: 'Mi piace', color: 'text-blue-500' },
  { type: 'love', icon: Heart, label: 'Love', color: 'text-red-500' },
  { type: 'celebrate', icon: PartyPopper, label: 'Festeggia', color: 'text-yellow-500' },
  { type: 'support', icon: Sparkles, label: 'Supporto', color: 'text-purple-500' },
  { type: 'insightful', icon: Award, label: 'Interessante', color: 'text-green-500' },
  { type: 'funny', icon: Smile, label: 'Divertente', color: 'text-orange-500' },
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

function getAvatarUrl(user: { avatar?: string; avatarUrl?: string } | null | undefined): string | undefined {
  // Use avatarUrl (signed URL from Object Storage) if available
  if (user?.avatarUrl) return user.avatarUrl;
  // Fallback to avatar if it's a full HTTP URL
  if (user?.avatar && user.avatar.startsWith('http')) return user.avatar;
  return undefined;
}

function getDisplayName(user: { firstName?: string; lastName?: string; email?: string } | null | undefined): string {
  if (!user) return 'Utente';
  if (user.firstName || user.lastName) {
    return [user.firstName, user.lastName].filter(Boolean).join(' ');
  }
  return user.email?.split('@')[0] || 'Utente';
}

function getInitials(user: { firstName?: string; lastName?: string; email?: string } | null | undefined): string {
  if (!user) return '?';
  if (user.firstName || user.lastName) {
    const parts = [user.firstName, user.lastName].filter(Boolean);
    return parts.map(n => n![0]).join('').toUpperCase().slice(0, 2);
  }
  return (user.email?.[0] || '?').toUpperCase();
}

function FeedPostCard({ 
  post, 
  onReaction, 
  onComment, 
  onCommentReaction,
  onFavorite, 
  onUnfollow, 
  onVote 
}: { 
  post: FeedPost;
  onReaction: (postId: string, type: string) => void;
  onComment: (postId: string, content: string, parentCommentId?: string) => void;
  onCommentReaction: (commentId: string, type: 'like' | 'dislike') => void;
  onFavorite: (postId: string) => void;
  onUnfollow: (postId: string) => void;
  onVote: (postId: string, optionIds: string[]) => void;
}) {
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showReactions, setShowReactions] = useState(false);
  const [replyToComment, setReplyToComment] = useState<FeedComment | null>(null);
  const [showAllComments, setShowAllComments] = useState(false);

  const handleSubmitComment = () => {
    if (commentText.trim()) {
      onComment(post.id, commentText, replyToComment?.id);
      setCommentText('');
      setShowCommentInput(false);
      setReplyToComment(null);
    }
  };

  const handleReplyToComment = (comment: FeedComment) => {
    setReplyToComment(comment);
    setShowCommentInput(true);
    setCommentText('');
  };

  // Organize comments into parent-child structure
  const parentComments = post.recentComments.filter(c => !c.parentCommentId);
  const repliesMap = post.recentComments.reduce((acc, c) => {
    if (c.parentCommentId) {
      if (!acc[c.parentCommentId]) acc[c.parentCommentId] = [];
      acc[c.parentCommentId].push(c);
    }
    return acc;
  }, {} as Record<string, FeedComment[]>);

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
                {getInitials(post.author)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{getDisplayName(post.author)}</span>
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
                    <AvatarFallback className="text-xs">{getInitials(user)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{getDisplayName(user)}</span>
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
        {/* Reactions summary */}
        {post.reactionsCount > 0 && (
          <div className="w-full py-2 border-t flex items-center gap-2">
            <div className="flex -space-x-1">
              {Object.entries(post.reactions || {}).slice(0, 3).map(([type, count]) => {
                const reactionInfo = REACTION_ICONS.find(r => r.type === type);
                if (!reactionInfo || count === 0) return null;
                return (
                  <span key={type} className={`inline-flex items-center justify-center h-5 w-5 rounded-full bg-white border ${reactionInfo.color}`}>
                    <reactionInfo.icon className="h-3 w-3" />
                  </span>
                );
              })}
            </div>
            <span className="text-xs text-muted-foreground">{post.reactionsCount}</span>
            {post.commentsCount > 0 && (
              <span className="text-xs text-muted-foreground ml-auto">{post.commentsCount} commenti</span>
            )}
          </div>
        )}
        
        {/* Action buttons - Bitrix24 style */}
        <div className="flex items-center justify-between w-full py-2 border-t">
          <div className="flex items-center gap-0.5">
            {/* Mi piace with reactions hover */}
            <div className="relative">
              <Button 
                variant="ghost" 
                size="sm" 
                className={`text-muted-foreground gap-1.5 h-8 px-3 ${post.userReactions.length > 0 ? 'text-blue-600' : ''}`}
                onMouseEnter={() => setShowReactions(true)}
                onMouseLeave={() => setShowReactions(false)}
                onClick={() => onReaction(post.id, 'like')}
                data-testid={`button-like-${post.id}`}
              >
                <ThumbsUp className={`h-4 w-4 ${post.userReactions.includes('like') ? 'fill-current' : ''}`} />
                <span className="text-xs font-medium">Mi piace</span>
              </Button>
              
              {showReactions && (
                <div 
                  className="absolute bottom-full left-0 mb-1 bg-white border rounded-full shadow-lg p-1.5 flex gap-0.5 z-50"
                  onMouseEnter={() => setShowReactions(true)}
                  onMouseLeave={() => setShowReactions(false)}
                  data-testid={`reaction-picker-${post.id}`}
                >
                  {REACTION_ICONS.map(reaction => (
                    <Button
                      key={reaction.type}
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 rounded-full hover:scale-125 transition-transform ${post.userReactions.includes(reaction.type) ? reaction.color : ''}`}
                      onClick={() => onReaction(post.id, reaction.type)}
                      title={reaction.label}
                      data-testid={`reaction-${reaction.type}-${post.id}`}
                    >
                      <reaction.icon className={`h-4 w-4 ${post.userReactions.includes(reaction.type) ? 'fill-current' : ''}`} />
                    </Button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Commenta */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-muted-foreground gap-1.5 h-8 px-3"
              onClick={() => setShowCommentInput(!showCommentInput)}
              data-testid={`button-comment-${post.id}`}
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs font-medium">Commenta</span>
              {post.commentsCount > 0 && <span className="text-xs text-muted-foreground">({post.commentsCount})</span>}
            </Button>
            
            {/* Non seguire più */}
            <Button 
              variant="ghost" 
              size="sm" 
              className={`text-muted-foreground gap-1.5 h-8 px-3 ${post.isUnfollowed ? 'text-orange-600' : ''}`}
              onClick={() => onUnfollow(post.id)}
              data-testid={`button-unfollow-${post.id}`}
            >
              <BellOff className={`h-4 w-4 ${post.isUnfollowed ? 'text-orange-600' : ''}`} />
              <span className="text-xs font-medium">{post.isUnfollowed ? 'Segui' : 'Non seguire'}</span>
            </Button>
          </div>
          
          <div className="flex items-center gap-0.5">
            {/* Preferiti */}
            <Button 
              variant="ghost" 
              size="sm" 
              className={`h-8 px-2 ${post.isFavorited ? 'text-yellow-500' : 'text-muted-foreground'}`}
              onClick={() => onFavorite(post.id)}
              title={post.isFavorited ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
              data-testid={`button-favorite-${post.id}`}
            >
              <Star className={`h-4 w-4 ${post.isFavorited ? 'fill-current' : ''}`} />
            </Button>
            
            {/* Altro */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground" data-testid={`button-more-${post.id}`}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1" align="end">
                <div className="space-y-0.5">
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8" data-testid={`button-pin-${post.id}`}>
                    <Pin className="h-4 w-4" />
                    <span className="text-xs">{post.isPinned ? 'Rimuovi pin' : 'Fissa in alto'}</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8" onClick={() => onFavorite(post.id)} data-testid={`button-save-favorite-${post.id}`}>
                    <BookmarkPlus className="h-4 w-4" />
                    <span className="text-xs">{post.isFavorited ? 'Rimuovi da preferiti' : 'Salva nei preferiti'}</span>
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {post.recentComments.length > 0 && (
          <div className="w-full space-y-2 pt-2">
            {(showAllComments ? parentComments : parentComments.slice(0, 2)).map(comment => (
              <div key={comment.id} className="space-y-2">
                {/* Parent comment */}
                <div className="flex gap-2 text-sm group">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={getAvatarUrl(comment.user || null)} />
                    <AvatarFallback className="text-xs">
                      {getInitials(comment.user)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="bg-muted/50 rounded-lg px-3 py-1.5">
                      <span className="font-medium text-xs">{getDisplayName(comment.user)}</span>
                      <p className="text-xs">{comment.content}</p>
                    </div>
                    {/* Comment actions: reactions and reply */}
                    <div className="flex items-center gap-3 mt-1 ml-1">
                      <button 
                        className={`text-xs flex items-center gap-1 ${(comment.reactions?.like || 0) > 0 ? 'text-blue-600' : 'text-muted-foreground hover:text-blue-600'}`}
                        onClick={() => onCommentReaction(comment.id, 'like')}
                        data-testid={`button-like-comment-${comment.id}`}
                      >
                        <ThumbsUp className="h-3 w-3" />
                        {(comment.reactions?.like || 0) > 0 && <span>{comment.reactions.like}</span>}
                        <span>Mi piace</span>
                      </button>
                      <button 
                        className={`text-xs flex items-center gap-1 ${(comment.reactions?.dislike || 0) > 0 ? 'text-red-600' : 'text-muted-foreground hover:text-red-600'}`}
                        onClick={() => onCommentReaction(comment.id, 'dislike')}
                        data-testid={`button-dislike-comment-${comment.id}`}
                      >
                        <ThumbsDown className="h-3 w-3" />
                        {(comment.reactions?.dislike || 0) > 0 && <span>{comment.reactions.dislike}</span>}
                      </button>
                      <button 
                        className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                        onClick={() => handleReplyToComment(comment)}
                        data-testid={`button-reply-comment-${comment.id}`}
                      >
                        <CornerDownRight className="h-3 w-3" />
                        <span>Rispondi</span>
                      </button>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(comment.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Nested replies */}
                {repliesMap[comment.id]?.map(reply => (
                  <div key={reply.id} className="flex gap-2 text-sm ml-8 group">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={getAvatarUrl(reply.user || null)} />
                      <AvatarFallback className="text-xs">
                        {getInitials(reply.user)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="bg-muted/30 rounded-lg px-3 py-1.5">
                        <span className="font-medium text-xs">{getDisplayName(reply.user)}</span>
                        <p className="text-xs">{reply.content}</p>
                      </div>
                      {/* Reply actions */}
                      <div className="flex items-center gap-3 mt-1 ml-1">
                        <button 
                          className={`text-xs flex items-center gap-1 ${(reply.reactions?.like || 0) > 0 ? 'text-blue-600' : 'text-muted-foreground hover:text-blue-600'}`}
                          onClick={() => onCommentReaction(reply.id, 'like')}
                          data-testid={`button-like-reply-${reply.id}`}
                        >
                          <ThumbsUp className="h-3 w-3" />
                          {(reply.reactions?.like || 0) > 0 && <span>{reply.reactions.like}</span>}
                        </button>
                        <button 
                          className={`text-xs flex items-center gap-1 ${(reply.reactions?.dislike || 0) > 0 ? 'text-red-600' : 'text-muted-foreground hover:text-red-600'}`}
                          onClick={() => onCommentReaction(reply.id, 'dislike')}
                          data-testid={`button-dislike-reply-${reply.id}`}
                        >
                          <ThumbsDown className="h-3 w-3" />
                          {(reply.reactions?.dislike || 0) > 0 && <span>{reply.reactions.dislike}</span>}
                        </button>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(reply.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
            {post.commentsCount > 2 && !showAllComments && (
              <Button 
                variant="link" 
                size="sm" 
                className="text-xs p-0 h-auto"
                onClick={() => setShowAllComments(true)}
              >
                Vedi tutti i {post.commentsCount} commenti
              </Button>
            )}
          </div>
        )}

        {showCommentInput && (
          <div className="w-full pt-2 space-y-2">
            {replyToComment && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                <CornerDownRight className="h-3 w-3" />
                <span>Rispondi a <strong>{getDisplayName(replyToComment.user)}</strong></span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-5 w-5 p-0 ml-auto"
                  onClick={() => setReplyToComment(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder={replyToComment ? `Rispondi a ${getDisplayName(replyToComment.user)}...` : "Scrivi un commento..."}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
                className="flex-1 h-9"
                data-testid="input-comment"
                autoFocus
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
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

function EmbeddedComposer() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { avatarUrl, initials, gradient, isLoading: avatarLoading } = useUserAvatar(user ? {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    avatarObjectPath: user.avatarObjectPath
  } : null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [postType, setPostType] = useState<'message' | 'announcement' | 'poll' | 'appreciation'>('message');
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [badgeType, setBadgeType] = useState('star_performer');
  const [awardeeIds, setAwardeeIds] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<FeedAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [mentionedUsers, setMentionedUsers] = useState<FeedUser[]>([]);
  const [showToolbarMention, setShowToolbarMention] = useState(false);
  const [toolbarMentionSearch, setToolbarMentionSearch] = useState('');
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionStartPos, setMentionStartPos] = useState<number | null>(null);
  const [recipientSelection, setRecipientSelection] = useState<RecipientSelection>({
    mode: 'all', userIds: [], teamIds: [], departmentId: undefined
  });
  const [showRecipientDialog, setShowRecipientDialog] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedUsers, setSelectedUsers] = useState<FeedUser[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<FeedTeam[]>([]);

  // Fetch users for inline @ mention (typing in textarea)
  const { data: inlineMentionUsers } = useQuery<FeedUser[]>({
    queryKey: ['/api/feed/users/search', mentionSearch],
    queryFn: async () => {
      const res = await apiRequest(`/api/feed/users/search?q=${encodeURIComponent(mentionSearch)}&limit=10`);
      return res;
    },
    enabled: mentionStartPos !== null
  });

  // Fetch users for toolbar @ button and recipient dialog
  const { data: usersData } = useQuery<FeedUser[]>({
    queryKey: ['/api/feed/users/search', 'toolbar', toolbarMentionSearch],
    queryFn: async () => {
      const res = await apiRequest(`/api/feed/users/search?q=${encodeURIComponent(toolbarMentionSearch)}&limit=10`);
      return res;
    },
    enabled: showToolbarMention || showRecipientDialog
  });

  // Fetch departments
  const { data: departmentsData } = useQuery<FeedDepartment[]>({
    queryKey: ['/api/feed/departments'],
    enabled: showRecipientDialog
  });

  // Fetch teams (filtered by department if selected)
  const { data: teamsData } = useQuery<FeedTeam[]>({
    queryKey: ['/api/feed/teams/search', selectedDepartment],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedDepartment) params.set('departmentId', selectedDepartment);
      return apiRequest(`/api/feed/teams/search?${params.toString()}`);
    },
    enabled: showRecipientDialog
  });

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
    setAttachments([]);
    setMentionedUsers([]);
    setRecipientSelection({ mode: 'all', userIds: [], teamIds: [], departmentId: undefined });
    setSelectedUsers([]);
    setSelectedTeams([]);
  };

  const handleSubmit = () => {
    const data: any = {
      postType,
      content,
      title: title || undefined,
      isHighlighted,
      attachments: attachments.map(a => ({ id: a.id, fileName: a.fileName, objectKey: a.objectKey, contentType: a.contentType, fileSize: a.fileSize })),
      mentionedUserIds: mentionedUsers.map(u => u.id),
      recipients: {
        isAllUsers: recipientSelection.mode === 'all',
        userIds: recipientSelection.mode === 'users' ? selectedUsers.map(u => u.id) : [],
        teamIds: recipientSelection.mode === 'teams' ? selectedTeams.map(t => t.id) : [],
        departments: []
      }
    };

    if (postType === 'poll') {
      data.pollOptions = pollOptions.filter(o => o.trim());
      data.pollSettings = { visibilityMode: 'public', allowMultipleChoices: false, allowVoteChange: true };
    }

    if (postType === 'appreciation') {
      data.badgeType = badgeType;
      data.awardeeUserIds = awardeeIds;
    }

    createPostMutation.mutate(data);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const attachment = await apiRequest('/api/feed/attachments/upload', {
          method: 'POST',
          body: formData
        });
        setAttachments(prev => [...prev, attachment]);
        toast({ title: `File "${file.name}" caricato` });
      } catch (error) {
        toast({ title: `Errore caricamento ${file.name}`, variant: 'destructive' });
      }
    }
    setIsUploading(false);
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.slice(0, start) + emoji + content.slice(end);
      setContent(newContent);
      setTimeout(() => {
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
        textarea.focus();
      }, 0);
    } else {
      setContent(content + emoji);
    }
    setShowEmojiPicker(false);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const cursorPos = e.target.selectionStart;
    setContent(newContent);
    
    // Detect @ mention trigger
    const textBeforeCursor = newContent.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(atIndex + 1);
      // Check if there's no space after @ (still typing mention)
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionStartPos(atIndex);
        setMentionSearch(textAfterAt);
        return;
      }
    }
    
    // Close inline mention if no active mention
    setMentionStartPos(null);
    setMentionSearch('');
  };

  // Insert mention from inline dropdown (typing @ in textarea)
  const insertInlineMention = (user: FeedUser) => {
    const displayName = user.displayName || user.firstName || user.email.split('@')[0];
    
    if (mentionStartPos !== null) {
      // Replace @search with @displayName
      const beforeMention = content.slice(0, mentionStartPos);
      const cursorPos = textareaRef.current?.selectionStart || content.length;
      const afterMention = content.slice(cursorPos);
      const newContent = `${beforeMention}@${displayName} ${afterMention}`;
      setContent(newContent);
      
      // Move cursor after the mention
      setTimeout(() => {
        const newPos = mentionStartPos + displayName.length + 2;
        textareaRef.current?.setSelectionRange(newPos, newPos);
        textareaRef.current?.focus();
      }, 0);
    }
    
    if (!mentionedUsers.find(u => u.id === user.id)) {
      setMentionedUsers([...mentionedUsers, user]);
    }
    setMentionSearch('');
    setMentionStartPos(null);
  };

  // Insert mention from toolbar button
  const insertToolbarMention = (user: FeedUser) => {
    const displayName = user.displayName || user.firstName || user.email.split('@')[0];
    
    // Insert at cursor position or at end
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const newContent = content.slice(0, start) + `@${displayName} ` + content.slice(start);
      setContent(newContent);
      setTimeout(() => {
        const newPos = start + displayName.length + 2;
        textarea.setSelectionRange(newPos, newPos);
        textarea.focus();
      }, 0);
    } else {
      setContent(content + `@${displayName} `);
    }
    
    if (!mentionedUsers.find(u => u.id === user.id)) {
      setMentionedUsers([...mentionedUsers, user]);
    }
    setShowToolbarMention(false);
    setToolbarMentionSearch('');
  };

  const applyFormatting = (format: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.slice(start, end);
    
    let formattedText = '';
    switch (format) {
      case 'bold': formattedText = `**${selectedText}**`; break;
      case 'italic': formattedText = `_${selectedText}_`; break;
      case 'underline': formattedText = `__${selectedText}__`; break;
      case 'strike': formattedText = `~~${selectedText}~~`; break;
      case 'quote': formattedText = `> ${selectedText}`; break;
      case 'bullet': formattedText = `\n• ${selectedText}`; break;
      case 'numbered': formattedText = `\n1. ${selectedText}`; break;
      default: formattedText = selectedText;
    }
    
    const newContent = content.slice(0, start) + formattedText + content.slice(end);
    setContent(newContent);
    textarea.focus();
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

  const getRecipientLabel = () => {
    if (recipientSelection.mode === 'all') return 'Tutti';
    if (recipientSelection.mode === 'users') return `${selectedUsers.length} utent${selectedUsers.length === 1 ? 'e' : 'i'}`;
    if (recipientSelection.mode === 'teams') return `${selectedTeams.length} team`;
    return 'Tutti';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className="mb-4 border shadow-sm">
      <Tabs value={postType} onValueChange={(v) => setPostType(v as any)}>
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto">
          <TabsTrigger value="message" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm font-medium">
            MESSAGGIO
          </TabsTrigger>
          <TabsTrigger value="poll" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm font-medium">
            SONDAGGIO
          </TabsTrigger>
          <TabsTrigger value="announcement" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm font-medium">
            ANNUNCIO
          </TabsTrigger>
          <TabsTrigger value="appreciation" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm font-medium">
            APPREZZAMENTO
          </TabsTrigger>
        </TabsList>

        <CardContent className="p-4">
          {!isExpanded ? (
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setIsExpanded(true)} data-testid="composer-collapsed">
              <Avatar className="h-9 w-9">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={initials} />
                ) : null}
                <AvatarFallback 
                  className="text-white text-sm font-medium"
                  style={{ background: gradient }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 py-2.5 px-4 bg-muted/50 rounded-full text-muted-foreground text-sm hover:bg-muted transition-colors">
                {getPlaceholder()}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Rich Text Toolbar */}
              <div className="flex flex-wrap items-center gap-0.5 p-1 bg-muted/30 rounded-lg border" data-testid="rich-text-toolbar">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => applyFormatting('bold')} title="Grassetto" data-testid="button-format-bold">
                  <Bold className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => applyFormatting('italic')} title="Corsivo" data-testid="button-format-italic">
                  <Italic className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => applyFormatting('underline')} title="Sottolineato" data-testid="button-format-underline">
                  <Underline className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => applyFormatting('strike')} title="Barrato" data-testid="button-format-strike">
                  <Strikethrough className="h-3.5 w-3.5" />
                </Button>
                <Separator orientation="vertical" className="h-5 mx-1" />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => applyFormatting('bullet')} title="Elenco puntato" data-testid="button-format-bullet">
                  <List className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => applyFormatting('numbered')} title="Elenco numerato" data-testid="button-format-numbered">
                  <ListOrdered className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => applyFormatting('quote')} title="Citazione" data-testid="button-format-quote">
                  <Quote className="h-3.5 w-3.5" />
                </Button>
                <Separator orientation="vertical" className="h-5 mx-1" />
                <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" onChange={(e) => handleFileUpload(e.target.files)} data-testid="input-file-upload" />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => fileInputRef.current?.click()} title="Allega file" disabled={isUploading} data-testid="button-attach-file">
                  <Paperclip className="h-3.5 w-3.5" />
                </Button>
                <Popover open={showToolbarMention} onOpenChange={setShowToolbarMention}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Menziona utente" data-testid="button-mention-user">
                      <AtSign className="h-3.5 w-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Cerca utente..." value={toolbarMentionSearch} onValueChange={setToolbarMentionSearch} />
                      <CommandList>
                        <CommandEmpty>Nessun utente trovato</CommandEmpty>
                        <CommandGroup>
                          {usersData?.map(u => (
                            <CommandItem key={u.id} onSelect={() => insertToolbarMention(u)}>
                              <Avatar className="h-6 w-6 mr-2">
                                <AvatarFallback className="text-xs">{getInitials(u)}</AvatarFallback>
                              </Avatar>
                              <span>{u.displayName || u.email}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Emoji" data-testid="button-emoji-picker">
                      <Smile className="h-3.5 w-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-2" align="start" data-testid="emoji-picker-content">
                    <ScrollArea className="h-48">
                      {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                        <div key={category} className="mb-2">
                          <p className="text-xs font-medium text-muted-foreground mb-1">{category}</p>
                          <div className="flex flex-wrap gap-0.5">
                            {emojis.map(emoji => (
                              <button key={emoji} className="text-lg hover:bg-muted rounded p-0.5" onClick={() => insertEmoji(emoji)} data-testid={`emoji-${emoji}`}>
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Aggiungi tag" data-testid="button-add-tag">
                  <Hash className="h-3.5 w-3.5" />
                </Button>
              </div>

              {(postType === 'announcement' || postType === 'poll') && (
                <Input placeholder="Titolo (opzionale)" value={title} onChange={(e) => setTitle(e.target.value)} className="font-medium" data-testid="input-post-title" />
              )}

              <div className="relative">
                <Textarea ref={textareaRef} autoFocus placeholder={getPlaceholder()} value={content} onChange={handleContentChange} rows={postType === 'message' ? 4 : 5} className="resize-none min-h-[100px]" data-testid="input-post-content" />
                
                {/* Inline @mention autocomplete - appears when typing @ in textarea */}
                {mentionStartPos !== null && inlineMentionUsers && inlineMentionUsers.length > 0 && (
                  <div className="absolute left-0 top-full mt-1 z-50 w-64 bg-white dark:bg-slate-900 rounded-lg border shadow-lg p-1 max-h-48 overflow-auto">
                    <p className="text-xs text-muted-foreground px-2 py-1">Menziona utente</p>
                    {inlineMentionUsers.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-left"
                        onClick={() => insertInlineMention(u)}
                        data-testid={`mention-user-${u.id}`}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={u.avatarUrl || undefined} />
                          <AvatarFallback className="text-xs">{(u.firstName?.[0] || u.email[0]).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{u.displayName || `${u.firstName} ${u.lastName}`}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Character count */}
              <div className="flex justify-end">
                <span className={`text-xs ${content.length > 5000 ? 'text-red-500' : 'text-muted-foreground'}`}>
                  {content.length} / 5000 caratteri
                </span>
              </div>

              {/* Mentioned users */}
              {mentionedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {mentionedUsers.map(user => (
                    <Badge key={user.id} variant="secondary" className="gap-1">
                      <AtSign className="h-3 w-3" />
                      {user.displayName || user.email}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setMentionedUsers(mentionedUsers.filter(u => u.id !== user.id))} />
                    </Badge>
                  ))}
                </div>
              )}

              {/* File attachments with preview */}
              {attachments.length > 0 && (
                <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-dashed">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Paperclip className="h-3 w-3" />
                    File allegati ({attachments.length})
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {attachments.map(file => (
                      <div key={file.id} className="relative group bg-white rounded-lg border overflow-hidden">
                        {file.contentType.startsWith('image/') ? (
                          <div className="aspect-square relative">
                            <img 
                              src={file.previewUrl || file.downloadUrl} 
                              alt={file.fileName}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => removeAttachment(file.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 flex flex-col items-center gap-2">
                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                              <FileText className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <span className="text-xs text-center truncate w-full">{file.fileName}</span>
                            <span className="text-[10px] text-muted-foreground">{formatFileSize(file.fileSize)}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 absolute top-1 right-1" onClick={() => removeAttachment(file.id)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isUploading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Caricamento file in corso...
                </div>
              )}

              {postType === 'announcement' && (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={isHighlighted} onCheckedChange={(checked) => setIsHighlighted(checked === true)} />
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
                    <div key={index} className="flex gap-2">
                      <Input placeholder={`Opzione ${index + 1}`} value={option} onChange={(e) => { const newOptions = [...pollOptions]; newOptions[index] = e.target.value; setPollOptions(newOptions); }} className="bg-white" data-testid={`input-poll-option-${index}`} />
                      {pollOptions.length > 2 && (
                        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== index))}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="ghost" size="sm" onClick={() => setPollOptions([...pollOptions, ''])} className="w-full text-primary" data-testid="button-add-poll-option">
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
                      <Button key={key} type="button" variant={badgeType === key ? 'default' : 'outline'} size="sm" className={`justify-start text-xs ${badgeType === key ? '' : 'bg-white hover:bg-gray-50'}`} onClick={() => setBadgeType(key)} data-testid={`button-badge-${key}`}>
                        <info.icon className="h-3.5 w-3.5 mr-1.5" />
                        {info.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recipients Row - Bitrix24 style */}
              <div className="flex items-center gap-2 p-2 bg-blue-50/50 rounded-lg border border-blue-100">
                <span className="text-sm font-medium text-blue-700">A:</span>
                <Dialog open={showRecipientDialog} onOpenChange={setShowRecipientDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1 text-blue-600 border-blue-200 hover:bg-blue-50">
                      {recipientSelection.mode === 'all' && <Users className="h-3.5 w-3.5" />}
                      {recipientSelection.mode === 'users' && <UserPlus className="h-3.5 w-3.5" />}
                      {recipientSelection.mode === 'teams' && <Building2 className="h-3.5 w-3.5" />}
                      {getRecipientLabel()}
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Seleziona destinatari</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Chi può vedere questo post?</Label>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50">
                            <input type="radio" name="recipientMode" checked={recipientSelection.mode === 'all'} onChange={() => setRecipientSelection({ ...recipientSelection, mode: 'all' })} />
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>Tutti gli utenti del tenant</span>
                          </label>
                          <label className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50">
                            <input type="radio" name="recipientMode" checked={recipientSelection.mode === 'users'} onChange={() => setRecipientSelection({ ...recipientSelection, mode: 'users' })} />
                            <UserPlus className="h-4 w-4 text-muted-foreground" />
                            <span>Utenti specifici</span>
                          </label>
                          <label className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50">
                            <input type="radio" name="recipientMode" checked={recipientSelection.mode === 'teams'} onChange={() => setRecipientSelection({ ...recipientSelection, mode: 'teams' })} />
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>Team (con filtro dipartimento)</span>
                          </label>
                        </div>
                      </div>

                      {recipientSelection.mode === 'users' && (
                        <div className="space-y-2">
                          <Label>Seleziona utenti</Label>
                          <Command className="border rounded-lg">
                            <CommandInput placeholder="Cerca utente..." onValueChange={setMentionSearch} />
                            <CommandList className="max-h-40">
                              <CommandEmpty>Nessun utente trovato</CommandEmpty>
                              <CommandGroup>
                                {usersData?.map(user => (
                                  <CommandItem key={user.id} onSelect={() => {
                                    if (!selectedUsers.find(u => u.id === user.id)) {
                                      setSelectedUsers([...selectedUsers, user]);
                                    }
                                  }}>
                                    <Avatar className="h-6 w-6 mr-2">
                                      <AvatarFallback className="text-xs">{getInitials(user)}</AvatarFallback>
                                    </Avatar>
                                    {user.displayName}
                                    {selectedUsers.find(u => u.id === user.id) && <Check className="h-4 w-4 ml-auto" />}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                          {selectedUsers.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {selectedUsers.map(user => (
                                <Badge key={user.id} variant="secondary" className="gap-1">
                                  {user.displayName}
                                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedUsers(selectedUsers.filter(u => u.id !== user.id))} />
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {recipientSelection.mode === 'teams' && (
                        <div className="space-y-3">
                          <div>
                            <Label>Filtra per dipartimento (opzionale)</Label>
                            <select className="w-full mt-1 p-2 border rounded-md text-sm" value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)}>
                              <option value="">Tutti i dipartimenti</option>
                              {departmentsData?.map(dept => (
                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label>Seleziona team</Label>
                            <div className="space-y-1 mt-1 max-h-40 overflow-y-auto border rounded-md p-2">
                              {teamsData?.map(team => (
                                <label key={team.id} className="flex items-center gap-2 p-1 rounded hover:bg-muted/50 cursor-pointer">
                                  <Checkbox checked={selectedTeams.some(t => t.id === team.id)} onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedTeams([...selectedTeams, team]);
                                    } else {
                                      setSelectedTeams(selectedTeams.filter(t => t.id !== team.id));
                                    }
                                  }} />
                                  <span className="text-sm">{team.name}</span>
                                </label>
                              ))}
                              {(!teamsData || teamsData.length === 0) && (
                                <p className="text-sm text-muted-foreground text-center py-2">Nessun team trovato</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <Button className="w-full" onClick={() => setShowRecipientDialog(false)}>
                        Conferma
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                
                {/* Show selected recipients preview */}
                {recipientSelection.mode !== 'all' && (
                  <div className="flex flex-wrap gap-1">
                    {selectedUsers.slice(0, 3).map(user => (
                      <Badge key={user.id} variant="outline" className="text-xs">{user.displayName}</Badge>
                    ))}
                    {selectedTeams.slice(0, 3).map(team => (
                      <Badge key={team.id} variant="outline" className="text-xs">{team.name}</Badge>
                    ))}
                    {(selectedUsers.length > 3 || selectedTeams.length > 3) && (
                      <Badge variant="outline" className="text-xs">+{selectedUsers.length + selectedTeams.length - 3}</Badge>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { resetForm(); setIsExpanded(false); }} data-testid="button-cancel-post">
                    Annulla
                  </Button>
                </div>
                <Button size="sm" onClick={handleSubmit} disabled={!content.trim() || createPostMutation.isPending || content.length > 5000} className="gap-1" data-testid="button-publish-post">
                  <Send className="h-3.5 w-3.5" />
                  {createPostMutation.isPending ? 'Invio...' : 'INVIA'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Tabs>
    </Card>
  );
}

function BadgeModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'my-badges' | 'badge-types'>('leaderboard');
  
  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery<any[]>({
    queryKey: ['/api/feed/badges/leaderboard'],
    enabled: open
  });

  const { data: myBadges, isLoading: myBadgesLoading } = useQuery<any[]>({
    queryKey: ['/api/feed/badges/my'],
    enabled: open && activeTab === 'my-badges'
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Badge e Riconoscimenti
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="leaderboard" data-testid="tab-leaderboard">
              <Trophy className="h-4 w-4 mr-1" />
              Classifica
            </TabsTrigger>
            <TabsTrigger value="my-badges" data-testid="tab-my-badges">
              <Medal className="h-4 w-4 mr-1" />
              I miei badge
            </TabsTrigger>
            <TabsTrigger value="badge-types" data-testid="tab-badge-types">
              <Award className="h-4 w-4 mr-1" />
              Tipi
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="leaderboard" className="mt-4">
            {leaderboardLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-5 w-8" />
                  </div>
                ))}
              </div>
            ) : leaderboard && leaderboard.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {leaderboard.map((user, index) => (
                  <div key={user.userId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <span className={`text-lg font-bold w-6 text-center ${index < 3 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                    </span>
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.userAvatar?.startsWith('http') ? user.userAvatar : undefined} />
                      <AvatarFallback className="text-sm">
                        {getInitials(user.userName || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 font-medium truncate">{user.userName}</span>
                    <Badge variant="secondary" className="text-sm px-3">
                      {user.badgeCount} badge
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Nessun badge assegnato ancora</p>
                <p className="text-sm mt-1">Inizia a riconoscere i tuoi colleghi!</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="my-badges" className="mt-4">
            {myBadgesLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
              </div>
            ) : myBadges && myBadges.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                {myBadges.map((badge) => {
                  const badgeInfo = BADGE_TYPES[badge.badgeType as keyof typeof BADGE_TYPES];
                  const BadgeIcon = badgeInfo?.icon || Award;
                  return (
                    <div key={badge.id} className={`p-3 rounded-lg border ${badgeInfo?.bgColor || 'bg-gray-100'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <BadgeIcon className={`h-5 w-5 ${badgeInfo?.color || 'text-gray-600'}`} />
                        <span className="font-medium text-sm">{badgeInfo?.label || badge.badgeType}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Ricevuto {badge.count || 1} volta
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Medal className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Non hai ancora ricevuto badge</p>
                <p className="text-sm mt-1">Continua così, arriveranno!</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="badge-types" className="mt-4">
            <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
              {Object.entries(BADGE_TYPES).map(([key, badge]) => {
                const BadgeIcon = badge.icon;
                return (
                  <div key={key} className={`p-3 rounded-lg border ${badge.bgColor}`}>
                    <div className="flex items-center gap-2">
                      <BadgeIcon className={`h-5 w-5 ${badge.color}`} />
                      <span className="font-medium text-sm">{badge.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export function SocialFeed() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<'all' | 'announcements' | 'polls' | 'appreciation' | 'favorites'>('all');
  const [badgeModalOpen, setBadgeModalOpen] = useState(false);

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
    mutationFn: async ({ postId, content, parentCommentId }: { postId: string; content: string; parentCommentId?: string }) => {
      return apiRequest(`/api/feed/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content, parentCommentId })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feed/posts'] });
      toast({ title: 'Commento aggiunto' });
    }
  });

  const commentReactionMutation = useMutation({
    mutationFn: async ({ commentId, reactionType }: { commentId: string; reactionType: 'like' | 'dislike' }) => {
      return apiRequest(`/api/feed/comments/${commentId}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ reactionType })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feed/posts'] });
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
    <div className="flex flex-col h-full w-full">
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
          
          <Separator orientation="vertical" className="h-6 mx-1" />
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBadgeModalOpen(true)}
            className="gap-1"
            data-testid="button-open-badges"
          >
            <Trophy className="h-4 w-4 text-yellow-500" />
            Badge
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
                  onComment={(postId, content, parentCommentId) => commentMutation.mutate({ postId, content, parentCommentId })}
                  onCommentReaction={(commentId, type) => commentReactionMutation.mutate({ commentId, reactionType: type })}
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
      
      <BadgeModal open={badgeModalOpen} onOpenChange={setBadgeModalOpen} />
    </div>
  );
}
