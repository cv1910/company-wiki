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

// Mobile Chat Header
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

  return (
    <div className="flex items-center justify-between px-2 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 safe-area-top">
      <Button variant="ghost" size="icon" onClick={onBack} className="h-10 w-10">
        <ChevronLeft className="h-6 w-6 text-primary" />
      </Button>
      
      <div className="flex-1 text-center">
        <h1 className="font-semibold text-[17px]">{getDisplayName()}</h1>
      </div>
      
      <Button variant="ghost" size="icon" onClick={onMenuClick} className="h-10 w-10">
        <MoreHorizontal className="h-6 w-6" />
      </Button>
    </div>
  );
}

// Mobile Chat Input
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
    <div className="px-3 py-2 border-t bg-background safe-area-bottom">
      <div className="flex items-center gap-2">
        {/* Attachment Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onAttachment}
          className="h-10 w-10 shrink-0 text-muted-foreground"
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        {/* Input Field */}
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Nachricht schreiben..."
            className="pr-10 rounded-full border-muted-foreground/20 bg-muted/30 h-10"
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
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground"
          >
            <Smile className="h-5 w-5" />
          </Button>
        </div>

        {/* Send or Voice Button */}
        {value.trim() ? (
          <Button
            size="icon"
            onClick={onSend}
            disabled={disabled}
            className="h-10 w-10 shrink-0 rounded-full"
          >
            <Send className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={onVoice}
            className="h-10 w-10 shrink-0 text-muted-foreground"
          >
            <Mic className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Mobile Room List Item
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

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors active:bg-muted/50 ${
        isSelected ? "bg-primary/5" : ""
      }`}
    >
      {/* Avatar */}
      <div className="relative">
        <Avatar className="h-14 w-14 ring-2 ring-background shadow-sm">
          <AvatarImage src={getAvatar() || undefined} />
          <AvatarFallback className="text-lg font-medium bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800">
            {getInitials(getDisplayName())}
          </AvatarFallback>
        </Avatar>
        {room.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
            {room.unreadCount > 9 ? "9+" : room.unreadCount}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between gap-2">
          <span className={`font-semibold text-[15px] truncate ${room.unreadCount > 0 ? "text-foreground" : "text-foreground/90"}`}>
            {getDisplayName()}
          </span>
          {room.lastMessage && (
            <span className="text-xs text-muted-foreground shrink-0">
              {formatTime(new Date(room.lastMessage.createdAt))}
            </span>
          )}
        </div>
        {room.lastMessage && (
          <p className={`text-sm truncate mt-0.5 ${room.unreadCount > 0 ? "text-foreground/80 font-medium" : "text-muted-foreground"}`}>
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
    <div className="px-3 py-4 border-b overflow-x-auto">
      <div className="flex gap-4">
        {/* New Chat Button */}
        <button
          onClick={onNewChat}
          className="flex flex-col items-center gap-1 shrink-0"
        >
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-dashed border-primary/30">
            <Plus className="h-7 w-7 text-primary" />
          </div>
          <span className="text-xs text-muted-foreground font-medium">Neu</span>
        </button>

        {/* Recent Contacts */}
        {recentDMs.map((room) => {
          const otherUser = room.participants?.find((p) => p.id !== currentUserId);
          const name = otherUser?.name || "Chat";
          const firstName = name.split(" ")[0];
          
          return (
            <button
              key={room.id}
              onClick={() => onRoomSelect(room.id)}
              className="flex flex-col items-center gap-1 shrink-0"
            >
              <div className="relative">
                <Avatar className="h-16 w-16 ring-2 ring-background shadow-md">
                  <AvatarImage src={otherUser?.avatarUrl || undefined} />
                  <AvatarFallback className="text-lg font-medium bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800">
                    {getInitials(name)}
                  </AvatarFallback>
                </Avatar>
                {room.unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center ring-2 ring-background">
                    {room.unreadCount > 9 ? "9+" : room.unreadCount}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground font-medium truncate max-w-[64px]">
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
