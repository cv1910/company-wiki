import { useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
  Search,
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

// Mobile Date Separator - Clean, minimal like Basecamp
export function MobileDateSeparator({ date }: { date: Date }) {
  let label = format(date, "d. MMMM yyyy", { locale: de });
  if (isToday(date)) {
    label = "Heute";
  } else if (isYesterday(date)) {
    label = "Gestern";
  } else {
    label = format(date, "EEEE, d. MMMM", { locale: de });
  }

  return (
    <div className="flex items-center justify-center py-4">
      <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
        {label}
      </span>
    </div>
  );
}

// Mobile Message Component - Clean Basecamp/Slack style
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
  showAvatar = true,
  isFirstInGroup = true,
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
  showAvatar?: boolean;
  isFirstInGroup?: boolean;
}) {
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
          className={`font-medium ${
            isSelfMention 
              ? "text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 px-1 rounded" 
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

  // Basecamp-style: Own messages with light blue background, others without
  return (
    <div className={`group px-4 ${isFirstInGroup ? 'pt-4' : 'pt-1'}`}>
      <div className={`flex items-start gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
        {/* Avatar - only show for first message in group */}
        {isFirstInGroup ? (
          <Avatar className="h-10 w-10 shrink-0 shadow-sm">
            <AvatarImage src={message.sender.avatarUrl || undefined} />
            <AvatarFallback className={`text-sm font-semibold ${isOwn ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700'}`}>
              {getInitials(message.sender.name || "?")}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-10 shrink-0" />
        )}

        <div className={`flex-1 min-w-0 ${isOwn ? 'flex flex-col items-end' : ''}`}>
          {/* Header: Name and Time - only for first in group */}
          {isFirstInGroup && (
            <div className={`flex items-baseline gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
              <span className="font-semibold text-[14px] text-gray-900 dark:text-gray-100">
                {isOwn ? "Du" : message.sender.name || "Unbekannt"}
              </span>
              <span className="text-[12px] text-gray-400 dark:text-gray-500">{time}</span>
            </div>
          )}

          {/* Quoted message */}
          {quotedMessage && (
            <div className="mb-2 pl-3 border-l-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 rounded-r py-1.5 pr-3 max-w-[85%]">
              <p className="text-[12px] font-medium text-gray-500 dark:text-gray-400">{quotedMessage.senderName}</p>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 line-clamp-2">{quotedMessage.content}</p>
            </div>
          )}

          {/* Message content - Basecamp style with colored background for own messages */}
          <div className={`relative max-w-[85%] ${isOwn ? 'bg-blue-50 dark:bg-blue-900/30 rounded-2xl rounded-tr-md px-4 py-2.5' : ''}`}>
            <p className={`text-[15px] leading-relaxed whitespace-pre-wrap break-words ${isOwn ? 'text-gray-800 dark:text-gray-100' : 'text-gray-800 dark:text-gray-200'}`}>
              {renderContent(message.ohweee.content)}
              {message.ohweee.isEdited && (
                <span className="text-[11px] text-gray-400 ml-1">(bearbeitet)</span>
              )}
            </p>

            {/* Action menu - appears on hover */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="absolute -right-2 -top-1 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-md"
                >
                  <MoreHorizontal className="h-4 w-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 shadow-lg">
                <DropdownMenuItem onClick={onReply} className="gap-2 text-[13px]">
                  <Reply className="h-4 w-4" />
                  Antworten
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddReaction("👍")} className="gap-2 text-[13px]">
                  <Smile className="h-4 w-4" />
                  Reagieren
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onPin} className="gap-2 text-[13px]">
                  <Pin className="h-4 w-4" />
                  {message.ohweee.isPinned ? "Lösen" : "Anheften"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onCreateTask} className="gap-2 text-[13px]">
                  <CheckSquare className="h-4 w-4" />
                  Aufgabe
                </DropdownMenuItem>
                {isOwn && (
                  <>
                    <DropdownMenuItem onClick={onEdit} className="gap-2 text-[13px]">
                      <Pencil className="h-4 w-4" />
                      Bearbeiten
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onDelete} className="gap-2 text-[13px] text-red-600">
                      <Trash2 className="h-4 w-4" />
                      Löschen
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Reactions */}
          {Object.keys(groupedReactions).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
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

          {/* Read receipts for own messages */}
          {isOwn && readReceipts && readReceipts.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <span className="text-[11px] text-gray-400">Gelesen von</span>
              <div className="flex -space-x-1">
                {readReceipts.slice(0, 3).map((receipt) => (
                  <Avatar key={receipt.id} className="h-4 w-4 border border-white dark:border-gray-900">
                    <AvatarImage src={receipt.avatarUrl || undefined} />
                    <AvatarFallback className="text-[8px] bg-gray-200">{getInitials(receipt.name || "?")}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {readReceipts.length > 3 && (
                <span className="text-[11px] text-gray-400">+{readReceipts.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Mobile Chat Header - Clean, minimal Basecamp style
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
  const otherParticipant = room.type === "direct" && room.participants
    ? room.participants.find(p => p.id !== currentUserId)
    : null;
  
  const displayName = otherParticipant?.name || room.name || "Chat";

  return (
    <div className="flex items-center justify-between px-4 py-3 shrink-0">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onBack} 
        className="h-10 w-10 shrink-0 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 rounded-full"
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>
      
      <h2 className="font-semibold text-[17px] text-gray-900 dark:text-gray-100">{displayName}</h2>
      
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onMenuClick} 
        className="h-10 w-10 shrink-0 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 rounded-full"
      >
        <Search className="h-5 w-5" />
      </Button>
    </div>
  );
}

// Mobile Chat Input - Clean single-line Basecamp style
export function MobileChatInput({
  value,
  onChange,
  onSend,
  onAttach,
  onVoice,
  onPoll,
  isLoading,
  placeholder = "Nachricht schreiben...",
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
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (value.trim() && !isLoading) {
        onSend();
      }
    }
  };

  return (
    <div className="px-4 py-3 bg-white dark:bg-gray-900">
      <div className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg h-12 px-4">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent border-none outline-none text-[15px] text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
        />
        
        <div className="flex items-center gap-2">
          {onAttach && (
            <button
              type="button"
              onClick={onAttach}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <Paperclip className="h-6 w-6" />
            </button>
          )}
          <button
            type="button"
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <Smile className="h-6 w-6" />
          </button>
          {value.trim() && (
            <button
              type="button"
              onClick={onSend}
              disabled={isLoading}
              className="p-2 text-blue-500 hover:text-blue-600 transition-colors disabled:opacity-50"
            >
              <Send className="h-6 w-6" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Mobile Room List Item - Clean Basecamp style
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

  // Format last message time
  const lastMessageTime = room.lastMessage?.createdAt
    ? format(new Date(room.lastMessage.createdAt), "HH:mm")
    : "";

  // Get last message preview
  const lastMessagePreview = room.lastMessage?.content
    ? room.lastMessage.content.replace(/@\[(.*?)\]\(\d+\)/g, "@$1").substring(0, 50)
    : "Keine Nachrichten";

  const isOwnLastMessage = room.lastMessage?.senderId === currentUserId;

  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        {room.type === "group" || room.type === "team" ? (
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-sm">
            <span className="text-white text-sm font-bold">#</span>
          </div>
        ) : (
          <Avatar className="h-12 w-12 shadow-sm">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="bg-gray-100 text-gray-700 font-semibold">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
        )}
        {room.unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-900">
            {room.unreadCount > 9 ? "9+" : room.unreadCount}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`font-semibold text-[15px] truncate ${room.unreadCount > 0 ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
            {displayName}
          </span>
          <span className="text-[12px] text-gray-400 shrink-0">{lastMessageTime}</span>
        </div>
        <p className={`text-[13px] truncate mt-0.5 ${room.unreadCount > 0 ? 'text-gray-600 dark:text-gray-400 font-medium' : 'text-gray-500 dark:text-gray-500'}`}>
          {isOwnLastMessage && <span className="text-gray-400">Du: </span>}
          {lastMessagePreview}
        </p>
      </div>
    </button>
  );
}

// Mobile Avatar Bar - Horizontal scrollable avatars
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

  // Get direct chat rooms with unread messages first
  const directRooms = rooms
    .filter(r => r.type === "direct")
    .sort((a, b) => b.unreadCount - a.unreadCount)
    .slice(0, 10);

  return (
    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-3">
          {/* New chat button */}
          <button
            onClick={onNewChat}
            className="flex flex-col items-center gap-1.5 shrink-0"
          >
            <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
              <Plus className="h-5 w-5 text-gray-400" />
            </div>
            <span className="text-[11px] text-gray-500">Neu</span>
          </button>

          {/* Avatar list */}
          {directRooms.map((room) => {
            const otherParticipant = room.participants?.find(p => p.id !== currentUserId);
            const displayName = otherParticipant?.name || "?";
            const firstName = displayName.split(" ")[0];
            
            return (
              <button
                key={room.id}
                onClick={() => onRoomSelect(room.id)}
                className="flex flex-col items-center gap-1.5 shrink-0"
              >
                <div className="relative">
                  <Avatar className="h-12 w-12 shadow-sm">
                    <AvatarImage src={otherParticipant?.avatarUrl || undefined} />
                    <AvatarFallback className="bg-gray-100 text-gray-700 font-semibold text-sm">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  {room.unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-blue-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-900">
                      {room.unreadCount > 9 ? "9+" : room.unreadCount}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-gray-600 dark:text-gray-400 max-w-[48px] truncate">{firstName}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
