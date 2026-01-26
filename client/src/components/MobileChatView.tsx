import { useState, useRef, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  Smile,
  Reply,
  Pencil,
  Trash2,
  Pin,
  CheckSquare,
  Mic,
  BarChart3,
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
    const limitedDiff = Math.sign(diff) * Math.min(Math.abs(diff), threshold * 1.5);
    setSwipeOffset(limitedDiff);
  }, [isSwiping, threshold]);

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping) return;
    const diff = currentX.current - startX.current;
    
    if (diff > threshold && onSwipeRight) {
      if (navigator.vibrate) navigator.vibrate(10);
      onSwipeRight();
    } else if (diff < -threshold && onSwipeLeft) {
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

// Mobile Date Separator - Basecamp style (pill badge)
export function MobileDateSeparator({ date }: { date: Date }) {
  let label = format(date, "d. MMMM", { locale: de });
  if (isToday(date)) {
    label = "HEUTE";
  } else if (isYesterday(date)) {
    label = "GESTERN";
  } else {
    label = format(date, "d. MMMM", { locale: de }).toUpperCase();
  }

  return (
    <div className="flex items-center justify-center my-6">
      <div className="flex-1 h-px bg-border/50" />
      <span className="mx-4 px-4 py-1.5 text-xs font-bold tracking-wide text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400 rounded-full">
        {label}
      </span>
      <div className="flex-1 h-px bg-border/50" />
    </div>
  );
}

// Mobile Message Component - Basecamp/Hey style
export function MobileMessage({
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
  quotedMessage,
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
  quotedMessage?: { senderName: string; content: string } | null;
}) {
  const { swipeOffset, handlers } = useSwipeGesture(
    isOwn ? onDelete : () => onAddReaction("👍"),
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
              ? "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 px-1 rounded" 
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
  const readByOthers = readReceipts?.filter(r => r.id !== currentUserId) || [];

  if (isOwn) {
    // Own message - right aligned with blue background
    return (
      <div className="flex justify-end px-4 py-2" {...handlers}>
        <div 
          className="flex flex-row-reverse items-start gap-3 max-w-[85%]"
          style={{ transform: `translateX(${swipeOffset * 0.3}px)` }}
        >
          {/* Avatar */}
          <Avatar className="h-11 w-11 shrink-0 ring-2 ring-white dark:ring-gray-800 shadow-sm">
            <AvatarImage src={message.sender.avatarUrl || undefined} className="object-cover" />
            <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              {getInitials(message.sender.name || message.sender.email || "")}
            </AvatarFallback>
          </Avatar>

          {/* Message bubble */}
          <div className="flex flex-col items-end">
            {/* Time and menu */}
            <div className="flex items-center gap-2 mb-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 px-1 text-muted-foreground hover:text-foreground">
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
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Bearbeiten
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onPin}>
                    <Pin className="h-4 w-4 mr-2" />
                    {message.ohweee.isPinned ? "Lösen" : "Anheften"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onCreateTask}>
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Aufgabe erstellen
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onDelete} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Löschen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <span className="text-sm text-muted-foreground">{time}</span>
              <span className="text-sm font-semibold text-foreground">Me</span>
            </div>

            {/* Message content */}
            <div className="bg-blue-100 dark:bg-blue-900/40 rounded-2xl rounded-tr-md px-4 py-3 shadow-sm">
              {/* Quoted message */}
              {quotedMessage && (
                <div className="mb-2 pl-3 border-l-2 border-blue-300 dark:border-blue-600">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                    {quotedMessage.senderName}
                  </p>
                  <p className="text-sm text-blue-600/80 dark:text-blue-400/80 line-clamp-2">
                    {quotedMessage.content}
                  </p>
                </div>
              )}
              <p className="text-base text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap">
                {renderContent(message.ohweee.content)}
              </p>
            </div>

            {/* Reactions */}
            {Object.keys(groupedReactions).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 justify-end">
                {Object.entries(groupedReactions).map(([emoji, users]) => (
                  <button
                    key={emoji}
                    onClick={() => onAddReaction(emoji)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Avatar className="h-5 w-5 -ml-0.5">
                      <AvatarImage src={users[0]?.avatarUrl || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {users[0]?.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-base">{emoji}</span>
                    {users.length > 1 && (
                      <span className="text-xs text-muted-foreground font-medium">{users.length}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Other's message - left aligned with gray background
  return (
    <div className="px-4 py-2" {...handlers}>
      <div 
        className="flex items-start gap-3 max-w-[85%]"
        style={{ transform: `translateX(${swipeOffset * 0.3}px)` }}
      >
        {/* Avatar */}
        <Avatar className="h-11 w-11 shrink-0 ring-2 ring-white dark:ring-gray-800 shadow-sm">
          <AvatarImage src={message.sender.avatarUrl || undefined} className="object-cover" />
          <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-gray-400 to-gray-500 text-white">
            {getInitials(message.sender.name || message.sender.email || "")}
          </AvatarFallback>
        </Avatar>

        {/* Message content */}
        <div className="flex flex-col">
          {/* Name, time and menu */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-foreground">
              {message.sender.name || message.sender.email?.split("@")[0]}
            </span>
            <span className="text-sm text-muted-foreground">{time}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-1 text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem onClick={onReply}>
                  <Reply className="h-4 w-4 mr-2" />
                  Antworten
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddReaction("👍")}>
                  <Smile className="h-4 w-4 mr-2" />
                  Reagieren
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onPin}>
                  <Pin className="h-4 w-4 mr-2" />
                  {message.ohweee.isPinned ? "Lösen" : "Anheften"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onCreateTask}>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Aufgabe erstellen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Message bubble */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
            {/* Quoted message */}
            {quotedMessage && (
              <div className="mb-2 pl-3 border-l-2 border-gray-300 dark:border-gray-600">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {quotedMessage.senderName}
                </p>
                <p className="text-sm text-gray-600/80 dark:text-gray-400/80 line-clamp-2">
                  {quotedMessage.content}
                </p>
              </div>
            )}
            <p className="text-base text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap">
              {renderContent(message.ohweee.content)}
            </p>
          </div>

          {/* Reactions */}
          {Object.keys(groupedReactions).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {Object.entries(groupedReactions).map(([emoji, users]) => (
                <button
                  key={emoji}
                  onClick={() => onAddReaction(emoji)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Avatar className="h-5 w-5 -ml-0.5">
                    <AvatarImage src={users[0]?.avatarUrl || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {users[0]?.name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-base">{emoji}</span>
                  {users.length > 1 && (
                    <span className="text-xs text-muted-foreground font-medium">{users.length}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Avatar gradient helper
function getAvatarGradient(name: string): string {
  const gradients = [
    "from-blue-500 to-blue-600",
    "from-green-500 to-green-600",
    "from-purple-500 to-purple-600",
    "from-orange-500 to-orange-600",
    "from-pink-500 to-pink-600",
    "from-teal-500 to-teal-600",
  ];
  const index = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % gradients.length;
  return gradients[index];
}

// Mobile Chat Header - Basecamp style
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
    <div className="flex items-center gap-3 px-2 py-3 border-b bg-white dark:bg-gray-900 shrink-0">
      <Button variant="ghost" size="icon" onClick={onBack} className="h-10 w-10 shrink-0 text-blue-600">
        <ChevronLeft className="h-6 w-6" />
      </Button>
      
      <div className="flex-1 min-w-0 text-center">
        <h2 className="font-bold text-lg truncate">{displayName}</h2>
      </div>
      
      <Button variant="ghost" size="icon" onClick={onMenuClick} className="h-10 w-10 shrink-0 text-blue-600">
        <MoreHorizontal className="h-6 w-6" />
      </Button>
    </div>
  );
}

// Mobile Chat Input - Basecamp style
export function MobileChatInput({
  value,
  onChange,
  onSend,
  onAttach,
  onVoice,
  onPoll,
  isLoading,
  placeholder = "Say something...",
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onAttach?: () => void;
  onVoice?: () => void;
  onPoll?: () => void;
  isLoading?: boolean;
  placeholder?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading) {
        onSend();
      }
    }
  };

  return (
    <div className="border-t bg-white dark:bg-gray-900 px-4 py-3 shrink-0 pb-safe">
      <div className="flex items-end gap-2">
        {/* Attachment button */}
        {onAttach && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onAttach}
            className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
        )}

        {/* Input field */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="min-h-[44px] max-h-[120px] resize-none rounded-full px-4 py-2.5 text-base bg-gray-100 dark:bg-gray-800 border-0 focus-visible:ring-1 focus-visible:ring-blue-500"
            rows={1}
          />
        </div>

        {/* Send or action buttons */}
        {value.trim() ? (
          <Button
            onClick={onSend}
            disabled={isLoading}
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Send className="h-5 w-5" />
          </Button>
        ) : (
          <div className="flex items-center gap-1">
            {onVoice && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onVoice}
                className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
              >
                <Mic className="h-5 w-5" />
              </Button>
            )}
            {onPoll && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onPoll}
                className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
              >
                <BarChart3 className="h-5 w-5" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Export all components
export { MobileDateSeparator as DateSeparator };


// Room type for list
type RoomForList = {
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

// Helper functions
function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Jetzt";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return format(date, "d.M.", { locale: de });
}

function getMessagePreview(content: string): string {
  // Remove mentions
  const withoutMentions = content.replace(/@\[(.*?)\]\(\d+\)/g, "@$1");
  return withoutMentions.length > 50 ? withoutMentions.substring(0, 50) + "..." : withoutMentions;
}

// Mobile Room List Item - Basecamp style
export function MobileRoomListItem({
  room,
  currentUserId,
  onSelect,
}: {
  room: RoomForList;
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

  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 active:bg-muted transition-colors"
    >
      {/* Avatar with unread indicator */}
      <div className="relative shrink-0">
        <Avatar className="h-12 w-12 ring-2 ring-white dark:ring-gray-800 shadow-sm">
          <AvatarImage src={getAvatar() || undefined} className="object-cover" />
          <AvatarFallback className={`text-base font-bold text-white bg-gradient-to-br ${gradient}`}>
            {initials}
          </AvatarFallback>
        </Avatar>
        {room.unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center ring-2 ring-background">
            {room.unreadCount > 9 ? "9+" : room.unreadCount}
          </span>
        )}
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between gap-2">
          <span className={`font-semibold text-base truncate ${room.unreadCount > 0 ? "text-foreground" : "text-foreground/80"}`}>
            {displayName}
          </span>
          {room.lastMessage && (
            <span className="text-sm text-muted-foreground shrink-0">
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

// Horizontal Avatar Bar for Quick Access - Basecamp style
export function MobileAvatarBar({
  rooms,
  currentUserId,
  onRoomSelect,
  onNewChat,
}: {
  rooms: RoomForList[];
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
    <div className="px-4 py-3 border-b overflow-x-auto shrink-0 bg-white dark:bg-gray-900">
      <div className="flex gap-4">
        {/* New Chat Button */}
        <button
          onClick={onNewChat}
          className="flex flex-col items-center gap-1.5 shrink-0"
        >
          <div className="h-14 w-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center border-2 border-dashed border-blue-300 dark:border-blue-700 hover:border-blue-500 transition-colors">
            <Send className="h-6 w-6 text-blue-600 dark:text-blue-400" />
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
                <Avatar className="h-14 w-14 ring-2 ring-white dark:ring-gray-800 shadow-sm">
                  <AvatarImage src={otherUser?.avatarUrl || undefined} className="object-cover" />
                  <AvatarFallback className={`text-base font-bold text-white bg-gradient-to-br ${gradient}`}>
                    {getInitials(name)}
                  </AvatarFallback>
                </Avatar>
                {room.unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center ring-2 ring-background">
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
