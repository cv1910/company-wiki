import { useRef, useState, useEffect } from "react";
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
  MoreVertical,
  Paperclip,
  Send,
  Smile,
  Reply,
  Pencil,
  Trash2,
  Pin,
  CheckSquare,
  Mic,
  Plus,
  Play,
  Pause,
  Check,
  CheckCheck,
  X,
  Square,
  Image,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { de } from "date-fns/locale";

// ============================================================================
// TYPES
// ============================================================================

type Message = {
  ohweee: {
    id: number;
    content: string;
    createdAt: Date;
    isEdited: boolean;
    isPinned: boolean;
    parentId: number | null;
    attachments: unknown;
    voiceUrl?: string;
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

// ============================================================================
// DESIGN TOKENS - Pink/Rose theme matching app
// ============================================================================

const colors = {
  primary: "rose-500",
  primaryHover: "rose-600",
  primaryLight: "rose-50",
  primaryDark: "rose-900",
  ownBubble: "bg-rose-500 dark:bg-rose-600",
  ownBubbleText: "text-white",
  otherBubble: "bg-white dark:bg-gray-800",
  otherBubbleText: "text-gray-900 dark:text-gray-100",
};

// ============================================================================
// UTILITIES
// ============================================================================

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const formatMessageTime = (date: Date) => format(new Date(date), "HH:mm");

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

// ============================================================================
// DATE SEPARATOR
// ============================================================================

export function MobileDateSeparator({ date }: { date: Date }) {
  let label: string;
  if (isToday(date)) {
    label = "HEUTE";
  } else if (isYesterday(date)) {
    label = "GESTERN";
  } else {
    label = format(date, "d. MMMM yyyy", { locale: de }).toUpperCase();
  }

  return (
    <div className="flex justify-center py-3">
      <span className="px-3 py-1 text-[11px] font-semibold text-gray-500 bg-white/80 dark:bg-gray-800/80 dark:text-gray-400 rounded-full shadow-sm backdrop-blur-sm">
        {label}
      </span>
    </div>
  );
}

// ============================================================================
// VOICE MESSAGE PLAYER
// ============================================================================

function VoicePlayer({
  duration,
  isOwn,
}: {
  duration: number;
  isOwn: boolean;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const waveformBars = useRef(
    Array.from({ length: 35 }, () => 20 + Math.random() * 80)
  ).current;

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else {
      setIsPlaying(true);
      intervalRef.current = setInterval(() => {
        setCurrentTime((t) => {
          const newTime = t + 0.1;
          if (newTime >= duration) {
            setIsPlaying(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
            setProgress(0);
            return 0;
          }
          setProgress((newTime / duration) * 100);
          return newTime;
        });
      }, 100);
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const displayTime = isPlaying ? currentTime : duration;

  return (
    <div className="flex items-center gap-3 min-w-[180px] max-w-[260px]">
      <button
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-95 ${
          isOwn
            ? "bg-white/25 hover:bg-white/35 text-white"
            : "bg-rose-500 hover:bg-rose-600 text-white"
        }`}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 fill-current" />
        ) : (
          <Play className="w-5 h-5 fill-current ml-0.5" />
        )}
      </button>

      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-center gap-[2px] h-7">
          {waveformBars.map((height, i) => {
            const barProgress = (i / waveformBars.length) * 100;
            const isActive = barProgress <= progress;
            return (
              <div
                key={i}
                className={`w-[3px] rounded-full transition-colors duration-100 ${
                  isOwn
                    ? isActive ? "bg-white" : "bg-white/40"
                    : isActive ? "bg-rose-500" : "bg-gray-300 dark:bg-gray-600"
                }`}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>
        <span className={`text-[11px] ${isOwn ? "text-white/70" : "text-gray-500"}`}>
          {formatDuration(displayTime)}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// MESSAGE BUBBLE
// ============================================================================

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
  isFirstInGroup = true,
  isLastInGroup = true,
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
  isLastInGroup?: boolean;
}) {
  const time = formatMessageTime(message.ohweee.createdAt);
  const isVoice = message.ohweee.voiceDuration && message.ohweee.voiceDuration > 0;

  const groupedReactions = reactions.reduce(
    (acc, r) => {
      if (!acc[r.reaction.emoji]) acc[r.reaction.emoji] = [];
      acc[r.reaction.emoji].push(r.user);
      return acc;
    },
    {} as Record<string, { id: number; name: string | null; avatarUrl: string | null }[]>
  );

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
          className={`font-semibold ${isSelfMention ? "bg-yellow-200/50 px-0.5 rounded" : ""}`}
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

  const getBubbleRadius = () => {
    if (isOwn) {
      if (isFirstInGroup && isLastInGroup) return "rounded-2xl rounded-br-sm";
      if (isFirstInGroup) return "rounded-2xl rounded-br-sm";
      if (isLastInGroup) return "rounded-2xl rounded-br-sm";
      return "rounded-2xl rounded-r-sm";
    } else {
      if (isFirstInGroup && isLastInGroup) return "rounded-2xl rounded-bl-sm";
      if (isFirstInGroup) return "rounded-2xl rounded-bl-sm";
      if (isLastInGroup) return "rounded-2xl rounded-bl-sm";
      return "rounded-2xl rounded-l-sm";
    }
  };

  return (
    <div
      className={`flex items-end gap-2 px-3 ${isOwn ? "flex-row-reverse" : ""} ${
        isFirstInGroup ? "mt-3" : "mt-0.5"
      }`}
    >
      {/* Avatar */}
      {!isOwn && isLastInGroup ? (
        <Avatar className="w-8 h-8 flex-shrink-0 shadow-sm">
          <AvatarImage src={message.sender.avatarUrl || undefined} />
          <AvatarFallback className="text-xs font-semibold bg-rose-100 text-rose-600 dark:bg-rose-900 dark:text-rose-300">
            {getInitials(message.sender.name || "?")}
          </AvatarFallback>
        </Avatar>
      ) : !isOwn ? (
        <div className="w-8 flex-shrink-0" />
      ) : null}

      {/* Bubble */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div
            className={`relative max-w-[80%] shadow-sm cursor-pointer active:opacity-90 ${
              isOwn ? colors.ownBubble : colors.otherBubble
            } ${getBubbleRadius()} px-3 py-2`}
          >
            {/* Sender name */}
            {!isOwn && isFirstInGroup && (
              <p className="text-xs font-semibold text-rose-500 dark:text-rose-400 mb-1">
                {message.sender.name || "Unbekannt"}
              </p>
            )}

            {/* Quoted message */}
            {quotedMessage && (
              <div
                className={`mb-2 pl-2 border-l-2 rounded-r py-1 pr-2 ${
                  isOwn
                    ? "border-white/50 bg-white/15"
                    : "border-rose-400 bg-rose-50 dark:bg-rose-900/20"
                }`}
              >
                <p className={`text-[11px] font-semibold ${isOwn ? "text-white/90" : "text-rose-600"}`}>
                  {quotedMessage.senderName}
                </p>
                <p className={`text-[12px] line-clamp-2 ${isOwn ? "text-white/70" : "text-gray-500"}`}>
                  {quotedMessage.content}
                </p>
              </div>
            )}

            {/* Content */}
            {isVoice ? (
              <VoicePlayer duration={message.ohweee.voiceDuration!} isOwn={isOwn} />
            ) : (
              <p className={`text-[15px] leading-relaxed whitespace-pre-wrap break-words ${
                isOwn ? colors.ownBubbleText : colors.otherBubbleText
              }`}>
                {renderContent(message.ohweee.content)}
              </p>
            )}

            {/* Time & Status */}
            <div className={`flex items-center justify-end gap-1 mt-1 ${
              isOwn ? "text-white/70" : "text-gray-400"
            }`}>
              {message.ohweee.isEdited && <span className="text-[10px]">bearbeitet</span>}
              <span className="text-[10px]">{time}</span>
              {isOwn && (
                <span className="ml-0.5">
                  {readReceipts && readReceipts.length > 0 ? (
                    <CheckCheck className="w-4 h-4 text-white/90" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                </span>
              )}
            </div>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={isOwn ? "end" : "start"} className="w-48 shadow-xl rounded-xl">
          <DropdownMenuItem onClick={onReply} className="gap-3">
            <Reply className="w-4 h-4" /> Antworten
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAddReaction("👍")} className="gap-3">
            <Smile className="w-4 h-4" /> Reagieren
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onPin} className="gap-3">
            <Pin className="w-4 h-4" /> {message.ohweee.isPinned ? "Lösen" : "Anheften"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onCreateTask} className="gap-3">
            <CheckSquare className="w-4 h-4" /> Aufgabe erstellen
          </DropdownMenuItem>
          {isOwn && (
            <>
              <DropdownMenuItem onClick={onEdit} className="gap-3">
                <Pencil className="w-4 h-4" /> Bearbeiten
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="gap-3 text-red-600">
                <Trash2 className="w-4 h-4" /> Löschen
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Reactions */}
      {Object.keys(groupedReactions).length > 0 && (
        <div className={`flex gap-1 ${isOwn ? "mr-2" : "ml-2"}`}>
          {Object.entries(groupedReactions).map(([emoji, users]) => (
            <button
              key={emoji}
              onClick={() => onAddReaction(emoji)}
              className="flex items-center gap-0.5 bg-white dark:bg-gray-800 shadow-md rounded-full px-1.5 py-0.5 border border-gray-100 dark:border-gray-700"
            >
              <span className="text-sm">{emoji}</span>
              {users.length > 1 && (
                <span className="text-[10px] text-gray-500 font-medium">{users.length}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CHAT HEADER
// ============================================================================

export function MobileChatHeader({
  room,
  currentUserId,
  onBack,
  onInfo,
}: {
  room: Room;
  currentUserId: number;
  onBack: () => void;
  onInfo?: () => void;
  onSearch?: () => void;
}) {
  const otherParticipant =
    room.type === "direct" && room.participants
      ? room.participants.find((p) => p.id !== currentUserId)
      : null;

  const displayName = otherParticipant?.name || room.name || "Chat";
  const avatarUrl = otherParticipant?.avatarUrl;

  return (
    <div className="flex items-center gap-2 px-2 py-2 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="h-9 w-9 p-0 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-full"
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>

      <Avatar className="h-10 w-10 shadow-sm">
        <AvatarImage src={avatarUrl || undefined} />
        <AvatarFallback className="bg-rose-100 text-rose-600 font-semibold dark:bg-rose-900 dark:text-rose-300">
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0" onClick={onInfo}>
        <h1 className="font-semibold text-[16px] text-gray-900 dark:text-gray-100 truncate">
          {displayName}
        </h1>
        <p className="text-[12px] text-gray-500">online</p>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onInfo}
        className="h-9 w-9 p-0 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
      >
        <MoreVertical className="h-5 w-5" />
      </Button>
    </div>
  );
}

// ============================================================================
// CHAT INPUT - Fixed above bottom nav, simple voice toggle
// ============================================================================

export function MobileChatInput({
  value,
  onChange,
  onSend,
  onSendVoice,
  onVoice,
  onAttach,
  isLoading,
  placeholder = "Nachricht schreiben...",
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onSendVoice?: (duration: number) => void;
onVoice?: () => void;
  onVoice?: () => void;
  onAttach?: () => void;
  isLoading?: boolean;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const hasText = value.trim().length > 0;

  // Start/Stop recording toggle
  const toggleRecording = () => {
    if (isRecording) {
      // Stop and send
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (recordingTime > 0 && onSendVoice) {
        onSendVoice(recordingTime);
      }
      setIsRecording(false);
      setRecordingTime(0);
    } else {
      // Start recording
      setIsRecording(true);
      setRecordingTime(0);
      intervalRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    }
  };

  const cancelRecording = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRecording(false);
    setRecordingTime(0);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && hasText && !isLoading) {
      e.preventDefault();
      onSend();
    }
  };

  // Recording UI
  if (isRecording) {
    return (
      <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 rounded-full px-4 py-2 h-12">
          {/* Cancel button */}
          <button
            onClick={cancelRecording}
            className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Recording indicator */}
          <div className="flex-1 flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-600 dark:text-red-400 font-mono font-semibold text-sm">
              {formatDuration(recordingTime)}
            </span>
            <span className="text-gray-500 text-sm">Aufnahme...</span>
          </div>

          {/* Send button */}
          <button
            onClick={onVoice || toggleRecording}
            className="w-10 h-10 rounded-full bg-rose-500 hover:bg-rose-600 shadow-md flex items-center justify-center text-white transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-2">
        {/* Attachment */}
        <button
          onClick={onAttach}
          className="w-10 h-10 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
        >
          <Plus className="w-6 h-6" />
        </button>

        {/* Input */}
        <div className="flex-1 flex items-center bg-gray-100 dark:bg-gray-800 rounded-full px-4 h-11">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent outline-none text-[15px] text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
          />
          <button className="ml-2 text-gray-400 hover:text-gray-600">
            <Smile className="w-5 h-5" />
          </button>
        </div>

        {/* Send or Mic */}
        {hasText ? (
          <button
            onClick={onSend}
            disabled={isLoading}
            className="w-10 h-10 rounded-full bg-rose-500 hover:bg-rose-600 text-white shadow-md flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={onVoice || toggleRecording}
            className="w-10 h-10 rounded-full bg-rose-500 hover:bg-rose-600 text-white shadow-md flex items-center justify-center transition-colors"
          >
            <Mic className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ROOM LIST ITEM
// ============================================================================

export function MobileRoomListItem({
  room,
  currentUserId,
  onSelect,
}: {
  room: Room;
  currentUserId: number;
  onSelect: () => void;
}) {
  const otherParticipant =
    room.type === "direct" && room.participants
      ? room.participants.find((p) => p.id !== currentUserId)
      : null;

  const displayName = otherParticipant?.name || room.name || "Chat";
  const avatarUrl = otherParticipant?.avatarUrl;

  const lastMessageTime = room.lastMessage?.createdAt
    ? format(new Date(room.lastMessage.createdAt), "HH:mm")
    : "";

  const lastMessagePreview = room.lastMessage?.content
    ? room.lastMessage.content.replace(/@\[(.*?)\]\(\d+\)/g, "@$1").substring(0, 40)
    : "Keine Nachrichten";

  const isOwnLastMessage = room.lastMessage?.senderId === currentUserId;

  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 active:bg-gray-100 transition-colors"
    >
      <div className="relative flex-shrink-0">
        {room.type === "group" || room.type === "team" ? (
          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-sm">
            <span className="text-white text-lg font-bold">#</span>
          </div>
        ) : (
          <Avatar className="h-14 w-14 shadow-sm">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="bg-rose-100 text-rose-600 font-semibold text-lg dark:bg-rose-900 dark:text-rose-300">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
        )}
        {room.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-6 w-6 bg-rose-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-900">
            {room.unreadCount > 99 ? "99+" : room.unreadCount}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between gap-2">
          <span className={`font-semibold text-[16px] truncate ${
            room.unreadCount > 0 ? "text-gray-900 dark:text-gray-100" : "text-gray-700 dark:text-gray-300"
          }`}>
            {displayName}
          </span>
          <span className="text-[12px] text-gray-400 flex-shrink-0">{lastMessageTime}</span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          {isOwnLastMessage && <CheckCheck className="w-4 h-4 text-rose-500 flex-shrink-0" />}
          <p className={`text-[14px] truncate ${
            room.unreadCount > 0
              ? "text-gray-800 dark:text-gray-200 font-medium"
              : "text-gray-500"
          }`}>
            {lastMessagePreview}
          </p>
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// AVATAR BAR
// ============================================================================

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
  const directRooms = rooms
    .filter((r) => r.type === "direct")
    .sort((a, b) => b.unreadCount - a.unreadCount)
    .slice(0, 10);

  return (
    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-4">
          <button onClick={onNewChat} className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className="h-14 w-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-rose-400 hover:bg-rose-50 transition-colors">
              <Plus className="h-6 w-6 text-gray-400" />
            </div>
            <span className="text-[11px] text-gray-500 font-medium">Neu</span>
          </button>

          {directRooms.map((room) => {
            const other = room.participants?.find((p) => p.id !== currentUserId);
            const name = other?.name || "?";
            const firstName = name.split(" ")[0];

            return (
              <button
                key={room.id}
                onClick={() => onRoomSelect(room.id)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0"
              >
                <div className="relative">
                  <div className={`p-0.5 rounded-full ${
                    room.unreadCount > 0
                      ? "bg-gradient-to-tr from-rose-400 to-pink-500"
                      : "bg-gray-200 dark:bg-gray-700"
                  }`}>
                    <Avatar className="h-13 w-13 ring-2 ring-white dark:ring-gray-900">
                      <AvatarImage src={other?.avatarUrl || undefined} />
                      <AvatarFallback className="bg-rose-100 text-rose-600 font-semibold dark:bg-rose-900 dark:text-rose-300">
                        {getInitials(name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                <span className="text-[11px] text-gray-600 dark:text-gray-400 max-w-[56px] truncate font-medium">
                  {firstName}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
