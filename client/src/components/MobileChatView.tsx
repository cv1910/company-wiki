import { useState, useRef, useEffect } from "react";
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
  Mic,
  Reply,
  Pencil,
  Trash2,
  Pin,
  BookmarkPlus,
  CheckSquare,
  Sparkles,
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

// Mobile Date Separator (Basecamp style - amber pill with lines)
function MobileDateSeparator({ date }: { date: Date }) {
  let label = format(date, "EEEE, d. MMMM", { locale: de });
  if (isToday(date)) {
    label = "TODAY";
  } else if (isYesterday(date)) {
    label = "YESTERDAY";
  } else {
    label = format(date, "d. MMM", { locale: de }).toUpperCase();
  }

  return (
    <div className="flex items-center justify-center my-6">
      <div className="relative flex items-center w-full">
        <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
        <span className="mx-4 bg-amber-500 text-white text-[11px] font-bold px-4 py-1.5 rounded-full tracking-wider shadow-sm">
          {label}
        </span>
        <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
      </div>
    </div>
  );
}

// Mobile Message Component (Basecamp style - bubble backgrounds)
function MobileMessage({
  message,
  isOwn,
  currentUserId,
  reactions,
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
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPin: () => void;
  onAddReaction: (emoji: string) => void;
  onCreateTask: () => void;
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

  // Render content with mentions (show avatar emoji inline)
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
      
      // Basecamp style: show small avatar + name
      parts.push(
        <span
          key={`mention-${match.index}`}
          className="inline-flex items-center gap-0.5"
        >
          <span className="inline-block w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-600 text-[8px] font-bold flex items-center justify-center">
            {userName.charAt(0).toUpperCase()}
          </span>
          <span className={`font-semibold ${
            isSelfMention ? "text-primary" : "text-gray-700 dark:text-gray-300"
          }`}>
            {userName}
          </span>
        </span>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : content;
  };

  // Basecamp colors
  const bubbleClass = isOwn 
    ? "bg-[#D4E5F7] dark:bg-blue-900/40" // Light blue for own messages
    : "bg-[#F5F0E8] dark:bg-amber-900/20"; // Beige/cream for others

  return (
    <div className={`px-4 py-2 ${isOwn ? "flex justify-end" : ""}`}>
      <div className={`flex gap-3 max-w-[85%] ${isOwn ? "flex-row-reverse" : ""}`}>
        {/* Avatar */}
        <Avatar className="h-10 w-10 shrink-0 ring-2 ring-white dark:ring-gray-800 shadow-sm">
          <AvatarImage src={message.sender.avatarUrl || undefined} className="object-cover" />
          <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 text-gray-700 dark:text-gray-200">
            {getInitials(message.sender.name || message.sender.email || "")}
          </AvatarFallback>
        </Avatar>

        {/* Message Bubble */}
        <div className="flex-1 min-w-0">
          {/* Header: Name/Me, Time, Menu */}
          <div className={`flex items-center gap-2 mb-1 ${isOwn ? "flex-row-reverse" : ""}`}>
            {/* Menu Button (three dots) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5 opacity-40 hover:opacity-100">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isOwn ? "start" : "end"} className="w-48">
                <DropdownMenuItem onClick={onReply}>
                  <Reply className="h-4 w-4 mr-2" />
                  Antworten
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddReaction("👍")}>
                  <Smile className="h-4 w-4 mr-2" />
                  Reaktion
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onPin}>
                  <Pin className="h-4 w-4 mr-2" />
                  {message.ohweee.isPinned ? "Loslösen" : "Anheften"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onCreateTask}>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Aufgabe erstellen
                </DropdownMenuItem>
                {isOwn && (
                  <>
                    <DropdownMenuItem onClick={onEdit}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Bearbeiten
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onDelete} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Löschen
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <span className="text-xs text-gray-500">{time}</span>
            <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">
              {isOwn ? "Me" : (message.sender.name || message.sender.email?.split("@")[0])}
            </span>
          </div>

          {/* Message Bubble with background */}
          <div className={`rounded-2xl px-4 py-2.5 ${bubbleClass} ${isOwn ? "rounded-tr-md" : "rounded-tl-md"}`}>
            {message.ohweee.isPinned && (
              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs mb-1">
                <Pin className="h-3 w-3" />
                <span>Angepinnt</span>
              </div>
            )}
            
            {/* Message Text */}
            <div className="text-[15px] leading-relaxed text-gray-800 dark:text-gray-100 whitespace-pre-wrap break-words">
              {renderContent(message.ohweee.content)}
            </div>
            
            {message.ohweee.isEdited && (
              <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 block">(bearbeitet)</span>
            )}
          </div>

          {/* Reactions (Basecamp style: Avatar + Emoji pills) */}
          {Object.keys(groupedReactions).length > 0 && (
            <div className={`flex flex-wrap gap-1.5 mt-2 ${isOwn ? "justify-end" : ""}`}>
              {Object.entries(groupedReactions).map(([emoji, users]) => (
                <button
                  key={emoji}
                  onClick={() => onAddReaction(emoji)}
                  className="flex items-center gap-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 rounded-full pl-0.5 pr-2 py-0.5 transition-colors shadow-sm"
                >
                  {/* Show first user avatar */}
                  <Avatar className="h-5 w-5 ring-1 ring-white dark:ring-gray-800">
                    <AvatarImage src={users[0]?.avatarUrl || undefined} className="object-cover" />
                    <AvatarFallback className="text-[8px] font-semibold bg-gray-200 dark:bg-gray-700">
                      {getInitials(users[0]?.name || "")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{emoji}</span>
                  {users.length > 1 && (
                    <span className="text-[10px] text-gray-500 font-medium">+{users.length - 1}</span>
                  )}
                </button>
              ))}
              {/* Add reaction button */}
              <button
                onClick={() => onAddReaction("")}
                className="flex items-center justify-center h-6 w-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 rounded-full transition-colors shadow-sm"
              >
                <Sparkles className="h-3 w-3 text-gray-400" />
              </button>
            </div>
          )}
          
          {/* Add reaction button when no reactions */}
          {Object.keys(groupedReactions).length === 0 && (
            <div className={`mt-1 ${isOwn ? "text-right" : ""}`}>
              <button
                onClick={() => onAddReaction("")}
                className="inline-flex items-center justify-center h-6 w-6 opacity-0 hover:opacity-100 focus:opacity-100 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full transition-all shadow-sm group-hover:opacity-40"
              >
                <Sparkles className="h-3 w-3 text-gray-400" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Mobile Chat Header - Premium Design
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
    <div className="flex items-center justify-between px-2 py-3 border-b bg-gradient-to-b from-background to-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 safe-area-top">
      <Button variant="ghost" size="icon" onClick={onBack} className="h-11 w-11 rounded-xl hover:bg-primary/10">
        <ChevronLeft className="h-6 w-6 text-primary" />
      </Button>
      
      <div className="flex-1 flex items-center justify-center gap-3">
        <Avatar className="h-9 w-9 ring-2 ring-background shadow-md">
          <AvatarImage src={getAvatar() || undefined} className="object-cover" />
          <AvatarFallback className={`text-sm font-bold text-white bg-gradient-to-br ${gradient}`}>
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="text-center">
          <h2 className="font-bold text-base">{displayName}</h2>
          <p className="text-xs text-muted-foreground">Chat</p>
        </div>
      </div>
      
      <Button variant="ghost" size="icon" onClick={onMenuClick} className="h-11 w-11 rounded-xl hover:bg-primary/10">
        <MoreHorizontal className="h-5 w-5" />
      </Button>
    </div>
  );
}

// Mobile Chat Input - Premium Design (Basecamp style)
export function MobileChatInput({
  value,
  onChange,
  onSend,
  onAttach,
  onVoice,
  onEmoji,
  isLoading,
  placeholder = "Say something...",
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
  return (
    <div className="px-3 py-3 border-t bg-background safe-area-bottom">
      <div className="flex items-center gap-2">
        {/* Attachment Button */}
        {onAttach && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onAttach}
            className="h-10 w-10 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
        )}
        
        {/* Input Field - Basecamp style rounded pill */}
        <div className="flex-1 relative">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="h-11 rounded-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 pl-4 pr-12 text-[15px] focus:ring-2 focus:ring-primary/20 focus:border-primary"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
          />
          
          {/* Send Button inside input */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onSend}
            disabled={!value.trim() || isLoading}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full text-primary hover:bg-primary/10 disabled:opacity-30"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Mobile Room List Item - Premium Design
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

  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-muted/50 active:bg-muted transition-colors border-b border-border/50"
    >
      {/* Avatar with unread indicator */}
      <div className="relative">
        <Avatar className="h-14 w-14 ring-2 ring-background shadow-md">
          <AvatarImage src={getAvatar() || undefined} className="object-cover" />
          <AvatarFallback className={`text-lg font-bold text-white bg-gradient-to-br ${gradient}`}>
            {initials}
          </AvatarFallback>
        </Avatar>
        {room.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-6 w-6 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center ring-2 ring-background shadow-md">
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
            <span className="text-xs text-muted-foreground shrink-0">
              {formatTime(new Date(room.lastMessage.createdAt))}
            </span>
          )}
        </div>
        {room.lastMessage && (
          <p className={`text-sm truncate mt-1 leading-relaxed ${room.unreadCount > 0 ? "text-foreground/80 font-medium" : "text-muted-foreground"}`}>
            {room.lastMessage.content.replace(/@\[.*?\]\(\d+\)/g, (match) => {
              const nameMatch = match.match(/@\[(.*?)\]/);
              return nameMatch ? `@${nameMatch[1]}` : match;
            }).substring(0, 60)}
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

// Horizontal Avatar Bar for Quick Access - Premium Design
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
    <div className="px-3 py-4 border-b bg-gradient-to-b from-muted/30 to-transparent overflow-x-auto">
      <div className="flex gap-4">
        {/* New Chat Button - Premium Style */}
        <button
          onClick={onNewChat}
          className="flex flex-col items-center gap-2 shrink-0 group"
        >
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border-2 border-dashed border-primary/40 group-hover:border-primary/60 group-active:scale-95 transition-all shadow-sm">
            <Plus className="h-7 w-7 text-primary" />
          </div>
          <span className="text-xs text-muted-foreground font-semibold">Neu</span>
        </button>

        {/* Recent Contacts - Premium Avatars */}
        {recentDMs.map((room) => {
          const otherUser = room.participants?.find((p) => p.id !== currentUserId);
          const name = otherUser?.name || "Chat";
          const firstName = name.split(" ")[0];
          const gradient = getAvatarGradient(name);
          
          return (
            <button
              key={room.id}
              onClick={() => onRoomSelect(room.id)}
              className="flex flex-col items-center gap-2 shrink-0 group"
            >
              <div className="relative group-active:scale-95 transition-transform">
                <Avatar className="h-16 w-16 ring-2 ring-background shadow-lg">
                  <AvatarImage src={otherUser?.avatarUrl || undefined} className="object-cover" />
                  <AvatarFallback className={`text-lg font-bold text-white bg-gradient-to-br ${gradient}`}>
                    {getInitials(name)}
                  </AvatarFallback>
                </Avatar>
                {room.unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-6 w-6 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center ring-2 ring-background shadow-md">
                    {room.unreadCount > 9 ? "9+" : room.unreadCount}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground font-semibold truncate max-w-[64px]">
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
