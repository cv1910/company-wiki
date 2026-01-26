import { useState, useRef, useCallback, useEffect } from "react";
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
  Plus,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { de } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";

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

// Mobile Date Separator - Basecamp style (pill badge centered)
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
    <div className="flex items-center justify-center py-4">
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      <span className="mx-4 px-4 py-1.5 text-xs font-bold tracking-wider text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400 rounded-full uppercase">
        {label}
      </span>
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
    </div>
  );
}

// Mobile Message Component - Basecamp/Hey style with card background
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
    // Own message - right aligned with blue bubble
    return (
      <div className="px-4 py-1.5" {...handlers}>
        <div 
          className="flex justify-end items-start gap-2"
          style={{ transform: `translateX(${swipeOffset * 0.3}px)` }}
        >
          <div className="flex flex-col items-end max-w-[80%]">
            {/* Header: Menu, Time, Name */}
            <div className="flex items-center gap-2 mb-1 pr-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-gray-400 hover:text-gray-600">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
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
                  <DropdownMenuItem onClick={onDelete} className="text-red-600">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Löschen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <span className="text-xs text-gray-500">{time}</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Me</span>
            </div>

            {/* Message bubble - blue background */}
            <div className="bg-blue-500 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm">
              {/* Quoted message */}
              {quotedMessage && (
                <div className="mb-2 pl-3 border-l-2 border-blue-300 opacity-80">
                  <p className="text-xs font-semibold">{quotedMessage.senderName}</p>
                  <p className="text-sm line-clamp-2">{quotedMessage.content}</p>
                </div>
              )}
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                {renderContent(message.ohweee.content)}
              </p>
              {message.ohweee.isEdited && (
                <span className="text-xs opacity-70 ml-1">(bearbeitet)</span>
              )}
            </div>

            {/* Reactions */}
            {Object.keys(groupedReactions).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {Object.entries(groupedReactions).map(([emoji, users]) => (
                  <button
                    key={emoji}
                    onClick={() => onAddReaction(emoji)}
                    className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span>{emoji}</span>
                    {users.length > 1 && <span className="text-xs text-gray-500">{users.length}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Avatar */}
          <Avatar className="h-9 w-9 shrink-0 ring-2 ring-white dark:ring-gray-900 shadow-sm">
            <AvatarImage src={message.sender.avatarUrl || undefined} className="object-cover" />
            <AvatarFallback className="text-xs font-bold bg-blue-600 text-white">
              {getInitials(message.sender.name || message.sender.email || "")}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    );
  }

  // Other's message - left aligned with gray card background
  return (
    <div className="px-4 py-1.5" {...handlers}>
      <div 
        className="flex items-start gap-2"
        style={{ transform: `translateX(${swipeOffset * 0.3}px)` }}
      >
        {/* Avatar */}
        <Avatar className="h-9 w-9 shrink-0 ring-2 ring-white dark:ring-gray-900 shadow-sm">
          <AvatarImage src={message.sender.avatarUrl || undefined} className="object-cover" />
          <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-gray-400 to-gray-500 text-white">
            {getInitials(message.sender.name || message.sender.email || "")}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col items-start max-w-[80%]">
          {/* Header: Name, Time, Menu */}
          <div className="flex items-center gap-2 mb-1 pl-1">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {message.sender.name || message.sender.email?.split("@")[0]}
            </span>
            <span className="text-xs text-gray-500">{time}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-gray-400 hover:text-gray-600">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
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

          {/* Message card - gray background like Basecamp */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
            {/* Quoted message */}
            {quotedMessage && (
              <div className="mb-2 pl-3 border-l-2 border-gray-400 dark:border-gray-600">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{quotedMessage.senderName}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{quotedMessage.content}</p>
              </div>
            )}
            <p className="text-[15px] text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap">
              {renderContent(message.ohweee.content)}
            </p>
            {message.ohweee.isEdited && (
              <span className="text-xs text-gray-500 ml-1">(bearbeitet)</span>
            )}
          </div>

          {/* Reactions */}
          {Object.keys(groupedReactions).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(groupedReactions).map(([emoji, users]) => (
                <button
                  key={emoji}
                  onClick={() => onAddReaction(emoji)}
                  className="flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  <span>{emoji}</span>
                  {users.length > 1 && <span className="text-xs text-gray-500">{users.length}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Mobile Chat Header - Basecamp style with centered name
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
  // Get display name for direct chats
  const displayName = room.type === "direct" && room.participants
    ? room.participants.find(p => p.id !== currentUserId)?.name || room.name
    : room.name;

  return (
    <div className="flex items-center justify-between px-2 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
      <Button variant="ghost" size="icon" onClick={onBack} className="h-10 w-10 shrink-0 text-blue-600">
        <ChevronLeft className="h-6 w-6" />
      </Button>
      
      <div className="flex-1 min-w-0 text-center">
        <h2 className="font-bold text-lg text-gray-900 dark:text-gray-100 truncate">{displayName}</h2>
      </div>
      
      <Button variant="ghost" size="icon" onClick={onMenuClick} className="h-10 w-10 shrink-0 text-blue-600">
        <MoreHorizontal className="h-6 w-6" />
      </Button>
    </div>
  );
}

// Mobile Chat Input - Basecamp style with rounded input field
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

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [value]);

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 shrink-0">
      <div className="flex items-end gap-2">
        {/* Attachment button */}
        {onAttach && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onAttach}
            className="h-9 w-9 shrink-0 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-full"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
        )}

        {/* Input field - rounded like Basecamp */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="min-h-[40px] max-h-[120px] resize-none rounded-2xl px-4 py-2 text-[15px] bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-transparent"
            rows={1}
          />
        </div>

        {/* Send or action buttons */}
        {value.trim() ? (
          <Button
            onClick={onSend}
            disabled={isLoading}
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        ) : (
          <div className="flex items-center">
            {onVoice && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onVoice}
                className="h-9 w-9 shrink-0 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-full"
              >
                <Mic className="h-5 w-5" />
              </Button>
            )}
            {onPoll && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onPoll}
                className="h-9 w-9 shrink-0 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-full"
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

// Mobile Room List Item - Basecamp style
export function MobileRoomListItem({
  room,
  currentUserId,
  onSelect,
}: {
  room: Room;
  currentUserId: number;
  onSelect: () => void;
}) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Get display info for direct chats
  const otherParticipant = room.type === "direct" && room.participants
    ? room.participants.find(p => p.id !== currentUserId)
    : null;
  
  const displayName = otherParticipant?.name || room.name || "Chat";
  const avatarUrl = otherParticipant?.avatarUrl;

  const lastMessageTime = room.lastMessage?.createdAt
    ? format(new Date(room.lastMessage.createdAt), "HH:mm")
    : "";

  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
    >
      {/* Avatar */}
      <div className="relative">
        <Avatar className="h-12 w-12 ring-2 ring-white dark:ring-gray-900 shadow-sm">
          <AvatarImage src={avatarUrl || undefined} className="object-cover" />
          <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            {room.type === "team" ? "#" : getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
        {room.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full ring-2 ring-white dark:ring-gray-900">
            {room.unreadCount > 9 ? "9+" : room.unreadCount}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={`font-semibold text-[15px] truncate ${room.unreadCount > 0 ? "text-gray-900 dark:text-gray-100" : "text-gray-700 dark:text-gray-300"}`}>
            {displayName}
          </span>
          <span className="text-xs text-gray-500 shrink-0 ml-2">{lastMessageTime}</span>
        </div>
        {room.lastMessage && (
          <p className={`text-sm truncate mt-0.5 ${room.unreadCount > 0 ? "text-gray-700 dark:text-gray-300 font-medium" : "text-gray-500"}`}>
            {room.lastMessage.senderName && room.type !== "direct" && (
              <span className="font-medium">{room.lastMessage.senderName}: </span>
            )}
            {room.lastMessage.content}
          </p>
        )}
      </div>
    </button>
  );
}

// Mobile Avatar Bar - horizontal scrollable avatars for quick access
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

  // Sort by unread first, then by last message time
  const sortedRooms = [...rooms].sort((a, b) => {
    if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
    if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
    const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  return (
    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-1">
          {/* New chat button */}
          <button
            onClick={onNewChat}
            className="flex flex-col items-center gap-1 shrink-0"
          >
            <div className="h-14 w-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center border-2 border-dashed border-blue-400 dark:border-blue-600">
              <Plus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Neu</span>
          </button>

          {/* Room avatars */}
          {sortedRooms.slice(0, 10).map((room) => {
            const otherParticipant = room.type === "direct" && room.participants
              ? room.participants.find(p => p.id !== currentUserId)
              : null;
            
            const displayName = otherParticipant?.name || room.name || "Chat";
            const avatarUrl = otherParticipant?.avatarUrl;
            const firstName = displayName.split(" ")[0];

            return (
              <button
                key={room.id}
                onClick={() => onRoomSelect(room.id)}
                className="flex flex-col items-center gap-1 shrink-0"
              >
                <div className="relative">
                  <Avatar className="h-14 w-14 ring-2 ring-white dark:ring-gray-900 shadow-sm">
                    <AvatarImage src={avatarUrl || undefined} className="object-cover" />
                    <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-gray-400 to-gray-500 text-white">
                      {room.type === "team" ? "#" : getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  {room.unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-5 w-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full ring-2 ring-white dark:ring-gray-900">
                      {room.unreadCount > 9 ? "9+" : room.unreadCount}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium truncate max-w-[56px]">
                  {firstName}
                </span>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
