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

// Mobile Date Separator (Pill style like Hey)
function MobileDateSeparator({ date }: { date: Date }) {
  let label = format(date, "EEEE, d. MMMM", { locale: de });
  if (isToday(date)) {
    label = "HEUTE";
  } else if (isYesterday(date)) {
    label = "GESTERN";
  } else {
    label = format(date, "d. MMM", { locale: de }).toUpperCase();
  }

  return (
    <div className="flex items-center justify-center my-6">
      <div className="relative flex items-center w-full">
        <div className="flex-1 border-t border-border/50" />
        <span className="mx-4 bg-amber-500/90 text-white text-[10px] font-bold px-3 py-1 rounded-full tracking-wider">
          {label}
        </span>
        <div className="flex-1 border-t border-border/50" />
      </div>
    </div>
  );
}

// Mobile Message Component (Basecamp style - no bubble background)
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
            isSelfMention ? "text-primary" : "text-blue-600 dark:text-blue-400"
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

  return (
    <div className="px-4 py-2">
      <div className="flex gap-3">
        {/* Large Avatar */}
        <Avatar className="h-12 w-12 shrink-0 ring-2 ring-background shadow-sm">
          <AvatarImage src={message.sender.avatarUrl || undefined} />
          <AvatarFallback className="text-sm font-medium bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800">
            {getInitials(message.sender.name || message.sender.email || "")}
          </AvatarFallback>
        </Avatar>

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          {/* Header: Name, Time, Menu */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-[15px] text-foreground">
              {message.sender.name || message.sender.email?.split("@")[0]}
            </span>
            <span className="text-xs text-muted-foreground">{time}</span>
            {message.ohweee.isEdited && (
              <span className="text-xs text-muted-foreground">(bearbeitet)</span>
            )}
            {message.ohweee.isPinned && (
              <Pin className="h-3 w-3 text-amber-500" />
            )}
            
            {/* Menu Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto opacity-60 hover:opacity-100">
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
          </div>

          {/* Message Text (no bubble background) */}
          <div className="text-[15px] leading-relaxed text-foreground whitespace-pre-wrap break-words">
            {renderContent(message.ohweee.content)}
          </div>

          {/* Reactions (Avatar + Emoji style) */}
          {Object.keys(groupedReactions).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(groupedReactions).map(([emoji, users]) => (
                <button
                  key={emoji}
                  onClick={() => onAddReaction(emoji)}
                  className="flex items-center gap-1 bg-muted/50 hover:bg-muted rounded-full pl-1 pr-2 py-0.5 transition-colors"
                >
                  {/* Show first user avatar */}
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={users[0]?.avatarUrl || undefined} />
                    <AvatarFallback className="text-[8px]">
                      {getInitials(users[0]?.name || "")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{emoji}</span>
                  {users.length > 1 && (
                    <span className="text-xs text-muted-foreground">+{users.length - 1}</span>
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
        <h1 className="font-bold text-[17px]">{displayName}</h1>
      </div>
      
      <Button variant="ghost" size="icon" onClick={onMenuClick} className="h-11 w-11 rounded-xl hover:bg-muted">
        <MoreHorizontal className="h-6 w-6" />
      </Button>
    </div>
  );
}

// Mobile Chat Input - Premium Design
export function MobileChatInput({
  value,
  onChange,
  onSend,
  onAttachment,
  onEmoji,
  onVoice,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onAttachment: () => void;
  onEmoji: () => void;
  onVoice: () => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="px-3 py-3 border-t bg-gradient-to-t from-background to-background/95 safe-area-bottom">
      <div className="flex items-center gap-2">
        {/* Attachment Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onAttachment}
          className="h-11 w-11 shrink-0 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        {/* Input Field - Premium Style */}
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Nachricht schreiben..."
            className="pr-11 rounded-2xl border-border/50 bg-muted/40 h-11 focus:bg-background focus:border-primary/30 transition-all"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            disabled={disabled}
          />
          
          {/* Emoji Button inside input */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onEmoji}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl text-muted-foreground hover:text-primary"
          >
            <Smile className="h-5 w-5" />
          </Button>
        </div>

        {/* Send or Voice Button - Premium Style */}
        {value.trim() ? (
          <Button
            size="icon"
            onClick={onSend}
            disabled={disabled}
            className="h-11 w-11 shrink-0 rounded-xl bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg active:scale-95 transition-all"
          >
            <Send className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={onVoice}
            className="h-11 w-11 shrink-0 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <Mic className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Mobile Room List Item - Premium Design
export function MobileRoomListItem({
  room,
  currentUserId,
  isSelected,
  onClick,
}: {
  room: Room;
  currentUserId: number;
  isSelected: boolean;
  onClick: () => void;
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (date: Date) => {
    if (isToday(date)) {
      return format(date, "HH:mm");
    } else if (isYesterday(date)) {
      return "Gestern";
    }
    return format(date, "d. MMM", { locale: de });
  };

  const displayName = getDisplayName();
  const gradient = getAvatarGradient(displayName);

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3.5 transition-all active:scale-[0.98] ${
        isSelected ? "bg-primary/5" : "hover:bg-muted/30"
      }`}
    >
      {/* Avatar - Premium Style */}
      <div className="relative">
        <Avatar className="h-14 w-14 ring-2 ring-background shadow-lg">
          <AvatarImage src={getAvatar() || undefined} className="object-cover" />
          <AvatarFallback className={`text-lg font-bold text-white bg-gradient-to-br ${gradient}`}>
            {getInitials(displayName)}
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
          <span className={`font-semibold text-[15px] truncate ${room.unreadCount > 0 ? "text-foreground" : "text-foreground/80"}`}>
            {displayName}
          </span>
          {room.lastMessage && (
            <span className={`text-xs shrink-0 ${room.unreadCount > 0 ? "text-primary font-semibold" : "text-muted-foreground"}`}>
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
