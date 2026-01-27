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

// Mobile Date Separator - Basecamp style (centered pill badge)
export function MobileDateSeparator({ date }: { date: Date }) {
  let label = format(date, "d. MMMM yyyy", { locale: de });
  if (isToday(date)) {
    label = "HEUTE";
  } else if (isYesterday(date)) {
    label = "GESTERN";
  } else {
    label = format(date, "EEEE, d. MMMM", { locale: de }).toUpperCase();
  }

  return (
    <div className="flex items-center justify-center py-6">
      <span className="px-4 py-1.5 text-[11px] font-bold tracking-widest text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-full uppercase shadow-sm">
        {label}
      </span>
    </div>
  );
}

// Mobile Message Component - Basecamp style
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

  if (isOwn) {
    // Own message - right aligned with light blue background (Basecamp style)
    return (
      <div className={`px-4 ${isFirstInGroup ? 'pt-3' : 'pt-1'} pb-1`}>
        <div className="flex justify-end items-start gap-3">
          <div className="flex flex-col items-end max-w-[85%]">
            {/* Header: Time and Name - only show for first in group */}
            {isFirstInGroup && (
              <div className="flex items-center gap-2 mb-1.5 pr-1">
                <span className="text-[13px] text-gray-500 dark:text-gray-400">{time}</span>
                <span className="text-[13px] font-semibold text-gray-700 dark:text-gray-200">Ich</span>
              </div>
            )}

            {/* Message bubble - light blue like Basecamp */}
            <div className="relative group">
              <div className="bg-blue-50 dark:bg-blue-900/30 text-gray-900 dark:text-gray-100 rounded-2xl rounded-tr-md px-4 py-3 shadow-sm">
                {/* Quoted message */}
                {quotedMessage && (
                  <div className="mb-2 pl-3 border-l-2 border-blue-300 dark:border-blue-600">
                    <p className="text-[12px] font-semibold text-gray-600 dark:text-gray-400">{quotedMessage.senderName}</p>
                    <p className="text-[13px] text-gray-500 dark:text-gray-400 line-clamp-2">{quotedMessage.content}</p>
                  </div>
                )}
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                  {renderContent(message.ohweee.content)}
                </p>
                {message.ohweee.isEdited && (
                  <span className="text-[11px] text-gray-400 ml-1">(bearbeitet)</span>
                )}
              </div>
              
              {/* Action menu on hover/tap */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="absolute -left-8 top-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 shadow-lg">
                  <DropdownMenuItem onClick={onReply} className="gap-2">
                    <Reply className="h-4 w-4" />
                    Antworten
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAddReaction("👍")} className="gap-2">
                    <Smile className="h-4 w-4" />
                    Reagieren
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onEdit} className="gap-2">
                    <Pencil className="h-4 w-4" />
                    Bearbeiten
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onPin} className="gap-2">
                    <Pin className="h-4 w-4" />
                    {message.ohweee.isPinned ? "Lösen" : "Anheften"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onCreateTask} className="gap-2">
                    <CheckSquare className="h-4 w-4" />
                    Aufgabe erstellen
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onDelete} className="gap-2 text-red-600">
                    <Trash2 className="h-4 w-4" />
                    Löschen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Reactions */}
            {Object.keys(groupedReactions).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {Object.entries(groupedReactions).map(([emoji, users]) => (
                  <button
                    key={emoji}
                    onClick={() => onAddReaction(emoji)}
                    className="flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                  >
                    <span>{emoji}</span>
                    {users.length > 1 && <span className="text-xs text-gray-500">{users.length}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Avatar - only show for first in group */}
          {showAvatar && isFirstInGroup ? (
            <Avatar className="h-10 w-10 shrink-0 ring-2 ring-white dark:ring-gray-900 shadow-md">
              <AvatarImage src={message.sender.avatarUrl || undefined} className="object-cover" />
              <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                {getInitials(message.sender.name || message.sender.email || "")}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-10 shrink-0" />
          )}
        </div>
      </div>
    );
  }

  // Other's message - left aligned with light gray background (Basecamp style)
  return (
    <div className={`px-4 ${isFirstInGroup ? 'pt-3' : 'pt-1'} pb-1`}>
      <div className="flex items-start gap-3">
        {/* Avatar - only show for first in group */}
        {showAvatar && isFirstInGroup ? (
          <Avatar className="h-10 w-10 shrink-0 ring-2 ring-white dark:ring-gray-900 shadow-md">
            <AvatarImage src={message.sender.avatarUrl || undefined} className="object-cover" />
            <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-gray-400 to-gray-500 text-white">
              {getInitials(message.sender.name || message.sender.email || "")}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-10 shrink-0" />
        )}

        <div className="flex flex-col items-start max-w-[85%]">
          {/* Header: Name and Time - only show for first in group */}
          {isFirstInGroup && (
            <div className="flex items-center gap-2 mb-1.5 pl-1">
              <span className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">
                {message.sender.name || message.sender.email?.split("@")[0]}
              </span>
              <span className="text-[13px] text-gray-500 dark:text-gray-400">{time}</span>
            </div>
          )}

          {/* Message card - light gray background like Basecamp */}
          <div className="relative group">
            <div className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
              {/* Quoted message */}
              {quotedMessage && (
                <div className="mb-2 pl-3 border-l-2 border-gray-400 dark:border-gray-600">
                  <p className="text-[12px] font-semibold text-gray-600 dark:text-gray-400">{quotedMessage.senderName}</p>
                  <p className="text-[13px] text-gray-500 dark:text-gray-400 line-clamp-2">{quotedMessage.content}</p>
                </div>
              )}
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                {renderContent(message.ohweee.content)}
              </p>
              {message.ohweee.isEdited && (
                <span className="text-[11px] text-gray-400 ml-1">(bearbeitet)</span>
              )}
            </div>
            
            {/* Action menu on hover/tap */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="absolute -right-8 top-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44 shadow-lg">
                <DropdownMenuItem onClick={onReply} className="gap-2">
                  <Reply className="h-4 w-4" />
                  Antworten
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddReaction("👍")} className="gap-2">
                  <Smile className="h-4 w-4" />
                  Reagieren
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onPin} className="gap-2">
                  <Pin className="h-4 w-4" />
                  {message.ohweee.isPinned ? "Lösen" : "Anheften"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onCreateTask} className="gap-2">
                  <CheckSquare className="h-4 w-4" />
                  Aufgabe erstellen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Reactions */}
          {Object.keys(groupedReactions).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {Object.entries(groupedReactions).map(([emoji, users]) => (
                <button
                  key={emoji}
                  onClick={() => onAddReaction(emoji)}
                  className="flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
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
  const otherParticipant = room.type === "direct" && room.participants
    ? room.participants.find(p => p.id !== currentUserId)
    : null;
  
  const displayName = otherParticipant?.name || room.name || "Chat";

  return (
    <div className="flex items-center justify-between px-2 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shrink-0 shadow-sm">
      <Button variant="ghost" size="icon" onClick={onBack} className="h-10 w-10 shrink-0 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
        <ChevronLeft className="h-6 w-6" />
      </Button>
      
      <div className="flex-1 min-w-0 text-center">
        <h2 className="font-bold text-[17px] text-gray-900 dark:text-gray-100 truncate">{displayName}</h2>
      </div>
      
      <Button variant="ghost" size="icon" onClick={onMenuClick} className="h-10 w-10 shrink-0 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
        <Search className="h-5 w-5" />
      </Button>
    </div>
  );
}

// Mobile Chat Input - Basecamp style with clean rounded input
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
    <div className="px-3 py-3">
      <div className="flex items-end gap-2">
        {/* Attachment button */}
        {onAttach && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onAttach}
            className="h-10 w-10 shrink-0 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
        )}

        {/* Input field - Basecamp style with border */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="min-h-[44px] max-h-[120px] resize-none rounded-2xl px-4 py-2.5 text-[15px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-transparent shadow-sm"
            rows={1}
          />
        </div>

        {/* Send or action buttons */}
        {value.trim() ? (
          <Button
            onClick={onSend}
            disabled={isLoading}
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-md transition-all hover:scale-105"
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
                className="h-10 w-10 shrink-0 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              >
                <Mic className="h-5 w-5" />
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
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 active:bg-gray-100 dark:active:bg-gray-800 transition-colors text-left"
    >
      {/* Avatar */}
      <div className="relative">
        <Avatar className="h-12 w-12 ring-2 ring-white dark:ring-gray-900 shadow-md">
          <AvatarImage src={avatarUrl || undefined} className="object-cover" />
          <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            {room.type === "team" ? "#" : getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
        {room.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full ring-2 ring-white dark:ring-gray-900 shadow-sm">
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
          <span className="text-[12px] text-gray-500 shrink-0 ml-2">{lastMessageTime}</span>
        </div>
        {room.lastMessage && (
          <p className={`text-[14px] truncate mt-0.5 ${room.unreadCount > 0 ? "text-gray-700 dark:text-gray-300 font-medium" : "text-gray-500"}`}>
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
    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-1">
          {/* New chat button */}
          <button
            onClick={onNewChat}
            className="flex flex-col items-center gap-1.5 shrink-0"
          >
            <div className="h-14 w-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
              <Plus className="h-6 w-6 text-gray-500 dark:text-gray-400" />
            </div>
            <span className="text-[11px] text-gray-600 dark:text-gray-400 font-medium">Neu</span>
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
                className="flex flex-col items-center gap-1.5 shrink-0"
              >
                <div className="relative">
                  <Avatar className="h-14 w-14 ring-2 ring-white dark:ring-gray-900 shadow-md">
                    <AvatarImage src={avatarUrl || undefined} className="object-cover" />
                    <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-gray-400 to-gray-500 text-white">
                      {room.type === "team" ? "#" : getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  {room.unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-5 w-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full ring-2 ring-white dark:ring-gray-900 shadow-sm">
                      {room.unreadCount > 9 ? "9+" : room.unreadCount}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-gray-600 dark:text-gray-400 font-medium truncate max-w-[56px]">
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
