import { useState, useRef, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  MoreHorizontal,
  Paperclip,
  Send,
  Plus,
  Smile,
  Reply,
  Pencil,
  Trash2,
  Pin,
  CheckSquare,
  Sparkles,
  Check,
  CheckCheck,
  Mic,
  Image as ImageIcon,
  Camera,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { de } from "date-fns/locale";

// Types
type Message = {
  ohweee: {
    id: number;
    content: string;
    createdAt: Date;
    isEdited: boolean;
    isPinned: boolean;
    parentId: number | null;
    attachments: unknown;
  };
  sender: {
    id: number;
    name: string | null;
    email: string | null;
    avatarUrl: string | null;
  };
};

type ReactionData = {
  reaction: { id: number; ohweeeId: number; userId: number; emoji: string };
  user: { id: number; name: string | null; avatarUrl: string | null };
};

type Room = {
  id: number;
  name: string | null;
  type: "direct" | "group" | "team";
  participants?: { id: number; name: string | null; avatarUrl: string | null }[];
  unreadCount: number;
  lastMessage?: {
    content: string;
    createdAt: Date;
    senderId: number;
    senderName: string | null;
  };
};

type ReadReceipt = {
  id: number;
  name: string | null;
  avatarUrl: string | null;
  readAt: Date;
};

// Swipe gesture hook for message actions
function useSwipeGesture(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  threshold = 80
) {
  const startX = useRef(0);
  const currentX = useRef(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = e.touches[0].clientX;
    setIsSwiping(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping) return;
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    // Limit swipe distance with rubber band effect
    const limitedDiff = Math.sign(diff) * Math.min(Math.abs(diff), threshold * 1.5);
    setSwipeOffset(limitedDiff);
  }, [isSwiping, threshold]);

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping) return;
    const diff = currentX.current - startX.current;
    
    if (diff > threshold && onSwipeRight) {
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(10);
      onSwipeRight();
    } else if (diff < -threshold && onSwipeLeft) {
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(10);
      onSwipeLeft();
    }
    
    setSwipeOffset(0);
    setIsSwiping(false);
  }, [isSwiping, threshold, onSwipeLeft, onSwipeRight]);

  return {
    swipeOffset,
    isSwiping,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}

// Mobile Date Separator - Slack style (simple, clean)
function MobileDateSeparator({ date }: { date: Date }) {
  let label = format(date, "EEEE, d. MMMM", { locale: de });
  if (isToday(date)) {
    label = "Heute";
  } else if (isYesterday(date)) {
    label = "Gestern";
  }

  return (
    <div className="flex items-center justify-center my-4 px-4">
      <div className="flex-1 h-px bg-border" />
      <span className="mx-3 text-xs font-medium text-muted-foreground bg-background px-2">
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

// Mobile Message Component - Slack style (clean, minimal)
function MobileMessage({
  message,
  isOwn,
  currentUserId,
  reactions,
  readReceipts,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onAddReaction,
  onCreateTask,
}: {
  message: Message;
  isOwn: boolean;
  currentUserId: number;
  reactions: ReactionData[];
  readReceipts?: ReadReceipt[];
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPin: () => void;
  onAddReaction: (emoji: string) => void;
  onCreateTask: () => void;
}) {
  // Swipe gestures: right = reply, left = delete (own) or react (others)
  const { swipeOffset, handlers } = useSwipeGesture(
    isOwn ? onDelete : () => onAddReaction(""),
    onReply,
    60
  );
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const time = format(new Date(message.ohweee.createdAt), "HH:mm");

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, r) => {
    if (!acc[r.reaction.emoji]) {
      acc[r.reaction.emoji] = [];
    }
    acc[r.reaction.emoji].push(r.user);
    return acc;
  }, {} as Record<string, { id: number; name: string | null; avatarUrl: string | null }[]>);

  // Render content with mentions
  const renderContent = (content: string) => {
    const mentionRegex = /@\[(.*?)\]\((\d+)\)/g;
    const parts: (string | React.ReactElement)[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }
      
      const userName = match[1];
      const userId = parseInt(match[2], 10);
      const isSelfMention = userId === currentUserId;
      
      parts.push(
        <span
          key={`mention-${match.index}`}
          className={`font-semibold ${
            isSelfMention 
              ? "text-primary bg-primary/10 px-1 rounded" 
              : "text-blue-600 dark:text-blue-400"
          }`}
        >
          @{userName}
        </span>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : content;
  };

  // Read receipt display logic
  const showReadReceipts = isOwn && readReceipts && readReceipts.length > 0;
  const readByOthers = readReceipts?.filter(r => r.id !== currentUserId) || [];

  return (
    <div 
      className="group px-4 py-1.5 hover:bg-muted/30 transition-colors relative"
      {...handlers}
    >
      {/* Swipe action indicators */}
      {swipeOffset !== 0 && (
        <>
          {swipeOffset > 20 && (
            <div 
              className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-2 text-primary transition-opacity"
              style={{ opacity: Math.min(Math.abs(swipeOffset) / 60, 1) }}
            >
              <Reply className="h-4 w-4" />
            </div>
          )}
          {swipeOffset < -20 && (
            <div 
              className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 transition-opacity ${isOwn ? "text-destructive" : "text-amber-500"}`}
              style={{ opacity: Math.min(Math.abs(swipeOffset) / 60, 1) }}
            >
              {isOwn ? <Trash2 className="h-4 w-4" /> : <Smile className="h-4 w-4" />}
            </div>
          )}
        </>
      )}
      
      <div 
        className="flex gap-3 transition-transform"
        style={{ transform: `translateX(${swipeOffset * 0.3}px)` }}
      >
        {/* Avatar */}
        <Avatar className="h-9 w-9 shrink-0 mt-0.5">
          <AvatarImage src={message.sender.avatarUrl || undefined} className="object-cover" />
          <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
            {getInitials(message.sender.name || message.sender.email || "")}
          </AvatarFallback>
        </Avatar>

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          {/* Header: Name and Time */}
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-sm text-foreground">
              {isOwn ? "Du" : (message.sender.name || message.sender.email?.split("@")[0])}
            </span>
            <span className="text-xs text-muted-foreground">{time}</span>
            {message.ohweee.isEdited && (
              <span className="text-xs text-muted-foreground">(bearbeitet)</span>
            )}
            {message.ohweee.isPinned && (
              <Pin className="h-3 w-3 text-amber-500" />
            )}
            
            {/* Actions Menu - visible on hover/touch */}
            <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={onReply}>
                    <Reply className="h-4 w-4 mr-2" />
                    Antworten
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAddReaction("👍")}>
                    <Smile className="h-4 w-4 mr-2" />
                    Reagieren
                  </DropdownMenuItem>
                  {isOwn && (
                    <DropdownMenuItem onClick={onEdit}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Bearbeiten
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={onPin}>
                    <Pin className="h-4 w-4 mr-2" />
                    {message.ohweee.isPinned ? "Lösen" : "Anheften"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onCreateTask}>
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Aufgabe erstellen
                  </DropdownMenuItem>
                  {isOwn && (
                    <DropdownMenuItem onClick={onDelete} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Löschen
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Message Text */}
          <div className="text-sm text-foreground leading-relaxed mt-0.5 break-words">
            {renderContent(message.ohweee.content)}
          </div>

          {/* Reactions */}
          {Object.keys(groupedReactions).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {Object.entries(groupedReactions).map(([emoji, users]) => (
                <button
                  key={emoji}
                  onClick={() => onAddReaction(emoji)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted hover:bg-muted/80 transition-colors border border-border/50"
                >
                  <span>{emoji}</span>
                  <span className="text-muted-foreground font-medium">{users.length}</span>
                </button>
              ))}
            </div>
          )}

          {/* Read Receipts */}
          {showReadReceipts && readByOthers.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5">
              <CheckCheck className="h-3 w-3 text-blue-500" />
              <div className="flex -space-x-1">
                {readByOthers.slice(0, 3).map((reader) => (
                  <Avatar key={reader.id} className="h-4 w-4 border border-background">
                    <AvatarImage src={reader.avatarUrl || undefined} />
                    <AvatarFallback className="text-[8px]">
                      {reader.name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {readByOthers.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{readByOthers.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Mobile Chat Header - Slack style (clean, minimal)
export function MobileChatHeader({
  room,
  currentUserId,
  onBack,
  onMenuClick,
}: {
  room: Room;
  currentUserId: number;
  onBack: () => void;
  onMenuClick: () => void;
}) {
  const getDisplayName = () => {
    if (room.type === "direct") {
      const otherUser = room.participants?.find((p) => p.id !== currentUserId);
      return otherUser?.name || "Chat";
    }
    return room.name || "Gruppe";
  };

  const getAvatar = () => {
    if (room.type === "direct") {
      const otherUser = room.participants?.find((p) => p.id !== currentUserId);
      return otherUser?.avatarUrl;
    }
    return null;
  };

  const displayName = getDisplayName();
  const gradient = getAvatarGradient(displayName);
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-2 px-2 py-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shrink-0">
      <Button variant="ghost" size="icon" onClick={onBack} className="h-10 w-10 shrink-0">
        <ChevronLeft className="h-5 w-5" />
      </Button>
      
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={getAvatar() || undefined} className="object-cover" />
        <AvatarFallback className={`text-sm font-semibold text-white bg-gradient-to-br ${gradient}`}>
          {initials}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <h2 className="font-semibold text-sm truncate">{displayName}</h2>
        <p className="text-xs text-muted-foreground truncate">
          {room.type === "direct" ? "Direktnachricht" : `${room.participants?.length || 0} Mitglieder`}
        </p>
      </div>
      
      <Button variant="ghost" size="icon" onClick={onMenuClick} className="h-10 w-10 shrink-0">
        <MoreHorizontal className="h-5 w-5" />
      </Button>
    </div>
  );
}

// Mobile Chat Input - Slack style (clean, functional)
export function MobileChatInput({
  value,
  onChange,
  onSend,
  onAttach,
  onVoice,
  onEmoji,
  isLoading,
  placeholder = "Nachricht schreiben...",
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onAttach?: () => void;
  onVoice?: () => void;
  onEmoji?: () => void;
  isLoading?: boolean;
  placeholder?: string;
}) {
  const hasText = value.trim().length > 0;
  
  return (
    <div className="border-t bg-background shrink-0">
      {/* Input Area */}
      <div className="px-3 py-2">
        <div className="flex items-end gap-2 bg-muted/50 rounded-2xl border border-border/50 px-3 py-2">
          {/* Attachment Button */}
          {onAttach && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onAttach}
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-5 w-5" />
            </Button>
          )}
          
          {/* Text Input */}
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={1}
            className="flex-1 bg-transparent border-0 resize-none text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-0 min-h-[24px] max-h-[120px] py-1"
            style={{ 
              height: 'auto',
              overflow: value.split('\n').length > 4 ? 'auto' : 'hidden'
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (hasText) onSend();
              }
            }}
          />
          
          {/* Right side buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {onEmoji && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onEmoji}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <Smile className="h-5 w-5" />
              </Button>
            )}
            
            {hasText ? (
              <Button
                size="icon"
                onClick={onSend}
                disabled={isLoading}
                className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90"
              >
                <Send className="h-4 w-4" />
              </Button>
            ) : onVoice ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={onVoice}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <Mic className="h-5 w-5" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      
      {/* Safe area spacer for iOS */}
      <div className="pb-safe" />
    </div>
  );
}

// Mobile Room List Item - Slack style
export function MobileRoomListItem({
  room,
  currentUserId,
  onSelect,
}: {
  room: Room;
  currentUserId: number;
  onSelect: () => void;
}) {
  const getDisplayName = () => {
    if (room.type === "direct") {
      const otherUser = room.participants?.find((p) => p.id !== currentUserId);
      return otherUser?.name || "Chat";
    }
    return room.name || "Gruppe";
  };

  const getAvatar = () => {
    if (room.type === "direct") {
      const otherUser = room.participants?.find((p) => p.id !== currentUserId);
      return otherUser?.avatarUrl;
    }
    return null;
  };

  const displayName = getDisplayName();
  const gradient = getAvatarGradient(displayName);
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const formatTime = (date: Date) => {
    if (isToday(date)) {
      return format(date, "HH:mm");
    } else if (isYesterday(date)) {
      return "Gestern";
    }
    return format(date, "dd.MM");
  };

  // Clean up message content for preview
  const getMessagePreview = (content: string) => {
    return content
      .replace(/@\[.*?\]\(\d+\)/g, (match) => {
        const nameMatch = match.match(/@\[(.*?)\]/);
        return nameMatch ? `@${nameMatch[1]}` : match;
      })
      .substring(0, 50);
  };

  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 active:bg-muted transition-colors"
    >
      {/* Avatar with unread indicator */}
      <div className="relative shrink-0">
        <Avatar className="h-12 w-12">
          <AvatarImage src={getAvatar() || undefined} className="object-cover" />
          <AvatarFallback className={`text-base font-semibold text-white bg-gradient-to-br ${gradient}`}>
            {initials}
          </AvatarFallback>
        </Avatar>
        {room.unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center ring-2 ring-background">
            {room.unreadCount > 9 ? "9+" : room.unreadCount}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between gap-2">
          <span className={`font-semibold text-sm truncate ${room.unreadCount > 0 ? "text-foreground" : "text-foreground/80"}`}>
            {displayName}
          </span>
          {room.lastMessage && (
            <span className="text-xs text-muted-foreground shrink-0">
              {formatTime(new Date(room.lastMessage.createdAt))}
            </span>
          )}
        </div>
        {room.lastMessage && (
          <p className={`text-sm truncate mt-0.5 ${room.unreadCount > 0 ? "text-foreground/80 font-medium" : "text-muted-foreground"}`}>
            {getMessagePreview(room.lastMessage.content)}
          </p>
        )}
      </div>
    </button>
  );
}

// Avatar gradient colors based on name hash
const AVATAR_GRADIENTS = [
  "from-orange-400 to-orange-600",
  "from-blue-400 to-blue-600",
  "from-green-400 to-green-600",
  "from-purple-400 to-purple-600",
  "from-pink-400 to-pink-600",
  "from-teal-400 to-teal-600",
  "from-amber-400 to-amber-600",
  "from-indigo-400 to-indigo-600",
];

function getAvatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

// Horizontal Avatar Bar for Quick Access
export function MobileAvatarBar({
  rooms,
  currentUserId,
  onRoomSelect,
  onNewChat,
}: {
  rooms: Room[];
  currentUserId: number;
  onRoomSelect: (roomId: number) => void;
  onNewChat: () => void;
}) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Get recent direct chats
  const recentDMs = rooms
    .filter((r) => r.type === "direct")
    .slice(0, 8);

  return (
    <div className="px-4 py-3 border-b overflow-x-auto shrink-0">
      <div className="flex gap-4">
        {/* New Chat Button */}
        <button
          onClick={onNewChat}
          className="flex flex-col items-center gap-1.5 shrink-0"
        >
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border hover:border-primary/50 transition-colors">
            <Plus className="h-6 w-6 text-muted-foreground" />
          </div>
          <span className="text-xs text-muted-foreground font-medium">Neu</span>
        </button>

        {/* Recent Contacts */}
        {recentDMs.map((room) => {
          const otherUser = room.participants?.find((p) => p.id !== currentUserId);
          const name = otherUser?.name || "Chat";
          const firstName = name.split(" ")[0];
          const gradient = getAvatarGradient(name);
          
          return (
            <button
              key={room.id}
              onClick={() => onRoomSelect(room.id)}
              className="flex flex-col items-center gap-1.5 shrink-0"
            >
              <div className="relative">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={otherUser?.avatarUrl || undefined} className="object-cover" />
                  <AvatarFallback className={`text-base font-semibold text-white bg-gradient-to-br ${gradient}`}>
                    {getInitials(name)}
                  </AvatarFallback>
                </Avatar>
                {room.unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center ring-2 ring-background">
                    {room.unreadCount > 9 ? "9+" : room.unreadCount}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground font-medium truncate max-w-[56px]">
                {firstName}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { MobileDateSeparator, MobileMessage };
