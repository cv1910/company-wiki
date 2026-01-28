import { useRef, useState } from "react";
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
  Play,
  Pause,
  X,
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
    voiceDuration?: number;
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

// Helper: Check if content is "rich" (lists, long text)
function isRichContent(content: string): boolean {
  const hasListItems = /^[-•*]\s/m.test(content) || /^\d+\.\s/m.test(content);
  const hasMultipleLines = (content.match(/\n/g) || []).length >= 2;
  const isLong = content.length > 200;
  return hasListItems || (hasMultipleLines && isLong);
}

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
      <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

// Voice Message Player Component
function VoiceMessagePlayer({ 
  duration, 
  isOwn 
}: { 
  duration: number; 
  isOwn: boolean;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      const interval = setInterval(() => {
        setProgress(p => {
          if (p >= 100) {
            clearInterval(interval);
            setIsPlaying(false);
            return 0;
          }
          return p + (100 / duration);
        });
      }, 1000);
    }
  };

  const currentTime = (progress / 100) * duration;

  return (
    <div className="flex items-center gap-3 min-w-[200px]">
      <button
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
          isOwn 
            ? 'bg-blue-500 hover:bg-blue-600 text-white' 
            : 'bg-amber-500 hover:bg-amber-600 text-white'
        }`}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5" />
        ) : (
          <Play className="w-5 h-5 ml-0.5" />
        )}
      </button>
      
      <div className="flex-1 flex items-center gap-[2px] h-8">
        {Array.from({ length: 30 }).map((_, i) => {
          const height = Math.random() * 100;
          const isActive = (i / 30) * 100 <= progress;
          return (
            <div
              key={i}
              className={`w-[3px] rounded-full transition-all duration-150 ${
                isActive
                  ? isOwn ? 'bg-blue-500' : 'bg-amber-600'
                  : isOwn ? 'bg-blue-200' : 'bg-amber-200'
              }`}
              style={{ 
                height: `${Math.max(15, height * 0.8)}%`,
              }}
            />
          );
        })}
      </div>
      
      <span className="text-xs text-gray-500 min-w-[40px] text-right">
        {isPlaying ? formatTime(currentTime) : formatTime(duration)}
      </span>
    </div>
  );
}

// Mobile Message Component - Basecamp Style
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
  const isVoiceMessage = message.ohweee.voiceDuration && message.ohweee.voiceDuration > 0;
  const isRich = !isVoiceMessage && isRichContent(message.ohweee.content);

  const groupedReactions = reactions.reduce((acc, r) => {
    if (!acc[r.reaction.emoji]) {
      acc[r.reaction.emoji] = [];
    }
    acc[r.reaction.emoji].push(r.user);
    return acc;
  }, {} as Record<string, { id: number; name: string | null; avatarUrl: string | null }[]>);

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

  const getMessageBackground = () => {
    if (isOwn) {
      return 'bg-blue-50 dark:bg-blue-900/30';
    }
    if (isRich) {
      return 'bg-amber-50 dark:bg-amber-900/20';
    }
    return '';
  };

  return (
    <div className={`group px-4 ${isFirstInGroup ? 'pt-4' : 'pt-1'}`}>
      {isFirstInGroup && (
        <div className={`flex items-center gap-2 mb-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isOwn ? "end" : "start"} className="w-44 shadow-lg">
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
                Aufgabe erstellen
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
          <span className="text-[12px] text-gray-400 dark:text-gray-500">{time}</span>
          <span className="font-semibold text-[14px] text-gray-900 dark:text-gray-100">
            {isOwn ? "Du" : message.sender.name || "Unbekannt"}
          </span>
        </div>
      )}

      <div className={`flex items-start gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
        {isFirstInGroup ? (
          <Avatar className="h-11 w-11 shrink-0 ring-2 ring-white dark:ring-gray-800 shadow-sm">
            <AvatarImage src={message.sender.avatarUrl || undefined} />
            <AvatarFallback className={`text-sm font-semibold ${isOwn ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
              {getInitials(message.sender.name || "?")}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-11 shrink-0" />
        )}

        <div className={`flex-1 min-w-0 ${isOwn ? 'flex flex-col items-end' : ''}`}>
          {quotedMessage && (
            <div className="mb-2 pl-3 border-l-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 rounded-r py-1.5 pr-3 max-w-[85%]">
              <p className="text-[12px] font-medium text-gray-500 dark:text-gray-400">{quotedMessage.senderName}</p>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 line-clamp-2">{quotedMessage.content}</p>
            </div>
          )}

          <div className={`relative max-w-[85%] rounded-2xl ${isOwn ? 'rounded-tr-sm' : 'rounded-tl-sm'} ${getMessageBackground()} ${(isOwn || isRich) ? 'px-4 py-2.5' : ''}`}>
            {isVoiceMessage ? (
              <VoiceMessagePlayer 
                duration={message.ohweee.voiceDuration!} 
                isOwn={isOwn}
              />
            ) : (
              <p className={`text-[15px] leading-relaxed whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200`}>
                {renderContent(message.ohweee.content)}
                {message.ohweee.isEdited && (
                  <span className="text-[11px] text-gray-400 ml-1">(bearbeitet)</span>
                )}
              </p>
            )}
          </div>

          {Object.keys(groupedReactions).length > 0 && (
            <div className={`flex flex-wrap gap-1.5 mt-2 ${isOwn ? 'justify-end' : ''}`}>
              {Object.entries(groupedReactions).map(([emoji, users]) => (
                <button
                  key={emoji}
                  onClick={() => onAddReaction(emoji)}
                  className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full pl-1 pr-2 py-0.5 transition-colors"
                >
                  {users[0]?.avatarUrl ? (
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={users[0].avatarUrl} />
                      <AvatarFallback className="text-[9px] bg-gray-200">
                        {getInitials(users[0].name || "?")}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-[9px] font-medium text-gray-600 dark:text-gray-400">
                        {getInitials(users[0]?.name || "?")}
                      </span>
                    </div>
                  )}
                  <span className="text-sm">{emoji}</span>
                  {users.length > 1 && (
                    <span className="text-[11px] text-gray-500 font-medium">+{users.length - 1}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {readReceipts && readReceipts.length > 0 && isOwn && (
            <div className="flex items-center gap-1 mt-1.5">
              <span className="text-[10px] text-gray-400">Gelesen von</span>
              <div className="flex -space-x-1.5">
                {readReceipts.slice(0, 3).map((receipt) => (
                  <Avatar key={receipt.id} className="h-4 w-4 ring-1 ring-white dark:ring-gray-900">
                    <AvatarImage src={receipt.avatarUrl || undefined} />
                    <AvatarFallback className="text-[8px] bg-gray-200">
                      {getInitials(receipt.name || "?")}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {readReceipts.length > 3 && (
                <span className="text-[10px] text-gray-400">+{readReceipts.length - 3}</span>
              )}
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
  onInfo,
  onSearch,
}: {
  room: Room;
  currentUserId: number;
  onBack: () => void;
  onInfo?: () => void;
  onSearch?: () => void;
}) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const otherParticipant = room.type === "direct" && room.participants
    ? room.participants.find(p => p.id !== currentUserId)
    : null;
  
  const displayName = otherParticipant?.name || room.name || "Chat";

  return (
    <div className="flex items-center justify-between px-2 py-2 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onBack}
          className="h-9 w-9 p-0 text-blue-500"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
      </div>

      <div className="flex-1 text-center">
        <h1 className="font-semibold text-[16px] text-gray-900 dark:text-gray-100 truncate">
          {displayName}
        </h1>
      </div>

      <div className="flex items-center gap-1">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onInfo}
          className="h-9 w-9 p-0 text-gray-500 hover:text-gray-700"
        >
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

// Mobile Chat Input - Basecamp style with voice
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (value.trim() && !isLoading) {
        onSend();
      }
    }
  };

  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    const interval = setInterval(() => {
      setRecordingTime(t => t + 1);
    }, 1000);
    (window as any).__recordingInterval = interval;
  };

  const stopRecording = (send: boolean) => {
    setIsRecording(false);
    clearInterval((window as any).__recordingInterval);
    if (send && onVoice) {
      onVoice();
    }
    setRecordingTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isRecording) {
    return (
      <div className="px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-full h-12 px-4">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-600 dark:text-red-400 font-medium">{formatTime(recordingTime)}</span>
            <span className="text-gray-500 text-sm">Aufnahme läuft...</span>
          </div>
          <button
            onClick={() => stopRecording(false)}
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            onClick={() => stopRecording(true)}
            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full h-12 px-2">
        {onAttach && (
          <button
            type="button"
            onClick={onAttach}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <Paperclip className="h-5 w-5" />
          </button>
        )}
        
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent border-none outline-none text-[15px] text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
        />
        
        <div className="flex items-center">
          {value.trim() ? (
            <button
              type="button"
              onClick={onSend}
              disabled={isLoading}
              className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
            >
              <Mic className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Mobile Room List Item
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

  const otherParticipant = room.type === "direct" && room.participants
    ? room.participants.find(p => p.id !== currentUserId)
    : null;
  
  const displayName = otherParticipant?.name || room.name || "Chat";
  const avatarUrl = otherParticipant?.avatarUrl;

  const lastMessageTime = room.lastMessage?.createdAt
    ? format(new Date(room.lastMessage.createdAt), "HH:mm")
    : "";

  const lastMessagePreview = room.lastMessage?.content
    ? room.lastMessage.content.replace(/@\[(.*?)\]\(\d+\)/g, "@$1").substring(0, 50)
    : "Keine Nachrichten";

  const isOwnLastMessage = room.lastMessage?.senderId === currentUserId;

  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
    >
      <div className="relative shrink-0">
        {room.type === "group" || room.type === "team" ? (
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-sm">
            <span className="text-white text-sm font-bold">#</span>
          </div>
        ) : (
          <Avatar className="h-12 w-12 shadow-sm ring-2 ring-white dark:ring-gray-900">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="bg-amber-100 text-amber-700 font-semibold">
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

// Mobile Avatar Bar
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

  const directRooms = rooms
    .filter(r => r.type === "direct")
    .sort((a, b) => b.unreadCount - a.unreadCount)
    .slice(0, 10);

  return (
    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-3">
          <button
            onClick={onNewChat}
            className="flex flex-col items-center gap-1.5 shrink-0"
          >
            <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
              <Plus className="h-5 w-5 text-gray-400" />
            </div>
            <span className="text-[11px] text-gray-500">Neu</span>
          </button>

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
                  <Avatar className="h-12 w-12 shadow-sm ring-2 ring-white dark:ring-gray-900">
                    <AvatarImage src={otherParticipant?.avatarUrl || undefined} />
                    <AvatarFallback className="bg-amber-100 text-amber-700 font-semibold text-sm">
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
