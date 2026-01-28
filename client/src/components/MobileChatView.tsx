import { useRef, useState, useEffect, useCallback } from "react";
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
  Phone,
  Video,
  Image,
  Camera,
  FileText,
} from "lucide-react";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
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
// DATE SEPARATOR - Minimal, elegant
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
      <span className="px-3 py-1 text-[11px] font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 rounded-full shadow-sm">
        {label}
      </span>
    </div>
  );
}

// ============================================================================
// VOICE MESSAGE PLAYER - WhatsApp Style
// ============================================================================

function VoicePlayer({
  duration,
  isOwn,
  url,
}: {
  duration: number;
  isOwn: boolean;
  url?: string;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Generate consistent waveform bars
  const waveformBars = useRef(
    Array.from({ length: 40 }, () => 15 + Math.random() * 85)
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
    <div className="flex items-center gap-3 min-w-[200px] max-w-[280px]">
      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-95 ${
          isOwn
            ? "bg-white/30 hover:bg-white/40 text-white"
            : "bg-emerald-500 hover:bg-emerald-600 text-white"
        }`}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 fill-current" />
        ) : (
          <Play className="w-5 h-5 fill-current ml-0.5" />
        )}
      </button>

      {/* Waveform */}
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-center gap-[2px] h-8">
          {waveformBars.map((height, i) => {
            const barProgress = (i / waveformBars.length) * 100;
            const isActive = barProgress <= progress;
            return (
              <div
                key={i}
                className={`w-[3px] rounded-full transition-colors duration-75 ${
                  isOwn
                    ? isActive
                      ? "bg-white"
                      : "bg-white/40"
                    : isActive
                      ? "bg-emerald-600"
                      : "bg-gray-300 dark:bg-gray-600"
                }`}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>
        <span
          className={`text-[11px] ${isOwn ? "text-white/80" : "text-gray-500"}`}
        >
          {formatDuration(displayTime)}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// MESSAGE BUBBLE - WhatsApp/iMessage Style with Tails
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
  showAvatar = true,
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

  // Group reactions
  const groupedReactions = reactions.reduce(
    (acc, r) => {
      if (!acc[r.reaction.emoji]) acc[r.reaction.emoji] = [];
      acc[r.reaction.emoji].push(r.user);
      return acc;
    },
    {} as Record<string, { id: number; name: string | null; avatarUrl: string | null }[]>
  );

  // Render mentions
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
              ? "bg-yellow-200/50 dark:bg-yellow-900/30 px-0.5 rounded"
              : ""
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

  // Bubble styling
  const bubbleBase = "relative max-w-[85%] shadow-sm";
  const bubbleOwn = "bg-emerald-500 dark:bg-emerald-600 text-white";
  const bubbleOther = "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100";
  
  // Rounded corners based on position in group
  const getRadius = () => {
    if (isOwn) {
      if (isFirstInGroup && isLastInGroup) return "rounded-2xl rounded-tr-md";
      if (isFirstInGroup) return "rounded-2xl rounded-tr-md rounded-br-md";
      if (isLastInGroup) return "rounded-2xl rounded-tr-md";
      return "rounded-2xl rounded-r-md";
    } else {
      if (isFirstInGroup && isLastInGroup) return "rounded-2xl rounded-tl-md";
      if (isFirstInGroup) return "rounded-2xl rounded-tl-md rounded-bl-md";
      if (isLastInGroup) return "rounded-2xl rounded-tl-md";
      return "rounded-2xl rounded-l-md";
    }
  };

  return (
    <div
      className={`flex items-end gap-2 px-3 ${
        isOwn ? "flex-row-reverse" : ""
      } ${isFirstInGroup ? "mt-3" : "mt-0.5"}`}
    >
      {/* Avatar - only for other users, only on last message in group */}
      {!isOwn && isLastInGroup ? (
        <Avatar className="w-8 h-8 flex-shrink-0 ring-2 ring-white dark:ring-gray-900 shadow-sm">
          <AvatarImage src={message.sender.avatarUrl || undefined} />
          <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-violet-400 to-purple-500 text-white">
            {getInitials(message.sender.name || "?")}
          </AvatarFallback>
        </Avatar>
      ) : !isOwn ? (
        <div className="w-8 flex-shrink-0" />
      ) : null}

      {/* Message Bubble */}
      <div className={`${bubbleBase} ${isOwn ? bubbleOwn : bubbleOther} ${getRadius()} px-3 py-2`}>
        {/* Sender name for groups (only first in group, only for others) */}
        {!isOwn && isFirstInGroup && (
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
            {message.sender.name || "Unbekannt"}
          </p>
        )}

        {/* Quoted message */}
        {quotedMessage && (
          <div
            className={`mb-2 pl-2 border-l-2 rounded-r py-1 pr-2 ${
              isOwn
                ? "border-white/50 bg-white/10"
                : "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
            }`}
          >
            <p className={`text-[11px] font-semibold ${isOwn ? "text-white/90" : "text-emerald-600 dark:text-emerald-400"}`}>
              {quotedMessage.senderName}
            </p>
            <p className={`text-[12px] line-clamp-2 ${isOwn ? "text-white/70" : "text-gray-600 dark:text-gray-400"}`}>
              {quotedMessage.content}
            </p>
          </div>
        )}

        {/* Content */}
        {isVoice ? (
          <VoicePlayer
            duration={message.ohweee.voiceDuration!}
            isOwn={isOwn}
            url={message.ohweee.voiceUrl}
          />
        ) : (
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
            {renderContent(message.ohweee.content)}
          </p>
        )}

        {/* Time & Status - WhatsApp style inline */}
        <div className={`flex items-center justify-end gap-1 mt-1 -mb-0.5 ${isOwn ? "text-white/70" : "text-gray-400"}`}>
          {message.ohweee.isEdited && (
            <span className="text-[10px]">bearbeitet</span>
          )}
          <span className="text-[10px]">{time}</span>
          {isOwn && (
            <span className="ml-0.5">
              {readReceipts && readReceipts.length > 0 ? (
                <CheckCheck className="w-4 h-4 text-sky-300" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </span>
          )}
        </div>

        {/* Long-press action menu trigger (hidden, activated by context) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="absolute inset-0 w-full h-full opacity-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align={isOwn ? "end" : "start"}
            className="w-48 shadow-xl rounded-xl"
          >
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
      </div>

      {/* Reactions - floating below bubble */}
      {Object.keys(groupedReactions).length > 0 && (
        <div
          className={`absolute -bottom-3 ${isOwn ? "right-4" : "left-12"} flex gap-1`}
        >
          {Object.entries(groupedReactions).map(([emoji, users]) => (
            <button
              key={emoji}
              onClick={() => onAddReaction(emoji)}
              className="flex items-center gap-0.5 bg-white dark:bg-gray-800 shadow-md rounded-full px-1.5 py-0.5 border border-gray-100 dark:border-gray-700"
            >
              <span className="text-sm">{emoji}</span>
              {users.length > 1 && (
                <span className="text-[10px] text-gray-500 font-medium">
                  {users.length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CHAT HEADER - Clean, WhatsApp/Telegram Style
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
}) {
  const otherParticipant =
    room.type === "direct" && room.participants
      ? room.participants.find((p) => p.id !== currentUserId)
      : null;

  const displayName = otherParticipant?.name || room.name || "Chat";
  const avatarUrl = otherParticipant?.avatarUrl;
  const isOnline = true; // TODO: real online status

  return (
    <div className="flex items-center gap-3 px-2 py-2 bg-emerald-600 dark:bg-gray-900 text-white shadow-md">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="h-10 w-10 p-0 text-white hover:bg-white/10 rounded-full"
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>

      {/* Avatar */}
      <div className="relative">
        <Avatar className="h-10 w-10 ring-2 ring-white/20">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="bg-emerald-700 text-white font-semibold">
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
        {isOnline && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full ring-2 ring-emerald-600 dark:ring-gray-900" />
        )}
      </div>

      {/* Name & Status */}
      <div className="flex-1 min-w-0" onClick={onInfo}>
        <h1 className="font-semibold text-[16px] truncate">{displayName}</h1>
        <p className="text-[12px] text-white/70">
          {isOnline ? "online" : "zuletzt heute um 12:00"}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0 text-white hover:bg-white/10 rounded-full"
        >
          <Video className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0 text-white hover:bg-white/10 rounded-full"
        >
          <Phone className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onInfo}
          className="h-10 w-10 p-0 text-white hover:bg-white/10 rounded-full"
        >
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// CHAT INPUT - WhatsApp Style with Hold-to-Record
// ============================================================================

export function MobileChatInput({
  value,
  onChange,
  onSend,
  onSendVoice,
  onAttach,
  isLoading,
  placeholder = "Nachricht",
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onSendVoice?: (duration: number) => void;
  onAttach?: () => void;
  isLoading?: boolean;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [slideToCancel, setSlideToCancel] = useState(0);
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);
  const startX = useRef(0);

  const hasText = value.trim().length > 0;

  // Start recording on touch/mouse down
  const startRecording = useCallback((clientX: number) => {
    setIsRecording(true);
    setRecordingTime(0);
    setSlideToCancel(0);
    startX.current = clientX;
    recordingInterval.current = setInterval(() => {
      setRecordingTime((t) => t + 1);
    }, 1000);
  }, []);

  // Stop recording - send or cancel
  const stopRecording = useCallback(
    (cancelled: boolean) => {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
      if (!cancelled && recordingTime > 0 && onSendVoice) {
        onSendVoice(recordingTime);
      }
      setIsRecording(false);
      setRecordingTime(0);
      setSlideToCancel(0);
    },
    [recordingTime, onSendVoice]
  );

  // Handle drag while recording
  const handleRecordingMove = useCallback((clientX: number) => {
    const diff = startX.current - clientX;
    setSlideToCancel(Math.max(0, Math.min(100, diff / 2)));
  }, []);

  // Touch handlers for mic button
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!hasText) {
      e.preventDefault();
      startRecording(e.touches[0].clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isRecording) {
      handleRecordingMove(e.touches[0].clientX);
    }
  };

  const handleTouchEnd = () => {
    if (isRecording) {
      stopRecording(slideToCancel > 50);
    }
  };

  // Mouse handlers (for desktop)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!hasText) {
      e.preventDefault();
      startRecording(e.clientX);
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isRecording) {
      handleRecordingMove(e.clientX);
    }
  };

  const handleMouseUp = () => {
    if (isRecording) {
      stopRecording(slideToCancel > 50);
    }
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && hasText && !isLoading) {
      e.preventDefault();
      onSend();
    }
  };

  // Recording UI
  if (isRecording) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <div className="flex-1 flex items-center gap-3">
          {/* Cancel hint */}
          <div
            className="flex items-center gap-2 transition-opacity"
            style={{ opacity: 1 - slideToCancel / 100 }}
          >
            <span className="text-gray-400 text-sm">
              ← Wischen zum Abbrechen
            </span>
          </div>

          {/* Recording indicator */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-500 font-mono font-medium">
              {formatDuration(recordingTime)}
            </span>
          </div>
        </div>

        {/* Mic button (still held) */}
        <div
          className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center shadow-lg"
          style={{
            transform: `translateX(${-slideToCancel}px)`,
            opacity: slideToCancel > 50 ? 0.5 : 1,
          }}
        >
          <Mic className="w-6 h-6 text-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      {/* Attachment button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onAttach}
        className="h-11 w-11 p-0 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-200 dark:hover:bg-gray-800"
      >
        <Plus className="w-6 h-6" />
      </Button>

      {/* Input field */}
      <div className="flex-1 flex items-center bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 px-4 py-2 min-h-[44px]">
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
          <Smile className="w-6 h-6" />
        </button>
      </div>

      {/* Send or Mic button */}
      {hasText ? (
        <Button
          onClick={onSend}
          disabled={isLoading}
          className="h-11 w-11 p-0 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-md"
        >
          <Send className="w-5 h-5" />
        </Button>
      ) : (
        <button
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          className="h-11 w-11 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-md flex items-center justify-center transition-transform active:scale-110"
        >
          <Mic className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// ROOM LIST ITEM - Clean, modern
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
    ? room.lastMessage.content
        .replace(/@\[(.*?)\]\(\d+\)/g, "@$1")
        .substring(0, 40)
    : "Keine Nachrichten";

  const isOwnLastMessage = room.lastMessage?.senderId === currentUserId;

  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 active:bg-gray-100 dark:active:bg-gray-800 transition-colors"
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {room.type === "group" || room.type === "team" ? (
          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm">
            <span className="text-white text-lg font-bold">#</span>
          </div>
        ) : (
          <Avatar className="h-14 w-14 shadow-sm">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-violet-400 to-purple-500 text-white font-semibold text-lg">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
        )}
        {room.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-6 w-6 bg-emerald-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-900 shadow-sm">
            {room.unreadCount > 99 ? "99+" : room.unreadCount}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`font-semibold text-[16px] truncate ${
              room.unreadCount > 0
                ? "text-gray-900 dark:text-gray-100"
                : "text-gray-700 dark:text-gray-300"
            }`}
          >
            {displayName}
          </span>
          <span className="text-[12px] text-gray-400 flex-shrink-0">
            {lastMessageTime}
          </span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          {isOwnLastMessage && (
            <CheckCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          )}
          <p
            className={`text-[14px] truncate ${
              room.unreadCount > 0
                ? "text-gray-800 dark:text-gray-200 font-medium"
                : "text-gray-500 dark:text-gray-500"
            }`}
          >
            {lastMessagePreview}
          </p>
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// AVATAR BAR - Stories/WhatsApp Status Style
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
          {/* New chat */}
          <button
            onClick={onNewChat}
            className="flex flex-col items-center gap-1.5 flex-shrink-0"
          >
            <div className="h-14 w-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
              <Plus className="h-6 w-6 text-gray-400" />
            </div>
            <span className="text-[11px] text-gray-500 font-medium">Neu</span>
          </button>

          {/* Recent chats */}
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
                  <div
                    className={`p-0.5 rounded-full ${
                      room.unreadCount > 0
                        ? "bg-gradient-to-tr from-emerald-400 to-teal-500"
                        : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  >
                    <Avatar className="h-14 w-14 ring-2 ring-white dark:ring-gray-900">
                      <AvatarImage src={other?.avatarUrl || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-violet-400 to-purple-500 text-white font-semibold">
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
