import { useRef, useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { WhatsAppVoicePlayer } from "./WhatsAppVoicePlayer";
import { QuickReactions, ReactionsDisplay, useLongPress, SwipeToReply } from "./WhatsAppReactions";
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
// DESIGN TOKENS - WhatsApp-style green theme
// ============================================================================

const colors = {
  primary: "emerald-500",
  primaryHover: "emerald-600",
  primaryLight: "emerald-50",
  primaryDark: "emerald-900",
  ownBubble: "bg-emerald-500 dark:bg-emerald-600",
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
  onShowEmojiPicker,
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
  onShowEmojiPicker?: () => void;
  quotedMessage?: { senderName: string; content: string } | null;
  showAvatar?: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
}) {
  const [showQuickReactions, setShowQuickReactions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const time = formatMessageTime(message.ohweee.createdAt);

  // Parse attachments and find audio URL
  const attachments = (message.ohweee.attachments as { url: string; filename: string; mimeType: string; size: number }[] | null) || [];
  const audioAttachment = attachments.find(a => a.mimeType.startsWith("audio/"));
  const audioUrl = audioAttachment?.url || message.ohweee.voiceUrl;

  // Group reactions for display
  const groupedReactions = reactions.reduce(
    (acc, r) => {
      if (!acc[r.reaction.emoji]) {
        acc[r.reaction.emoji] = { users: [], hasReacted: false };
      }
      acc[r.reaction.emoji].users.push(r.user);
      if (r.user.id === currentUserId) {
        acc[r.reaction.emoji].hasReacted = true;
      }
      return acc;
    },
    {} as Record<string, { users: { id: number; name: string | null }[]; hasReacted: boolean }>
  );

  const reactionsList = Object.entries(groupedReactions).map(([emoji, data]) => ({
    emoji,
    users: data.users,
    hasReacted: data.hasReacted,
  }));

  // Long press handler for quick reactions
  const longPressHandlers = useLongPress({
    onLongPress: () => setShowQuickReactions(true),
    onClick: () => setShowMenu(true),
    delay: 400,
  });

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

  // Use emerald/green for WhatsApp style
  const bubbleColors = {
    own: "bg-emerald-500 dark:bg-emerald-600",
    ownText: "text-white",
    other: "bg-white dark:bg-gray-800",
    otherText: "text-gray-900 dark:text-gray-100",
  };

  return (
    <SwipeToReply onReply={onReply} isOwn={isOwn}>
      <div
        className={`flex items-end gap-2 px-3 ${isOwn ? "flex-row-reverse" : ""} ${
          isFirstInGroup ? "mt-3" : "mt-0.5"
        }`}
      >
        {/* Avatar */}
        {!isOwn && isLastInGroup ? (
          <Avatar className="w-8 h-8 flex-shrink-0 shadow-sm">
            <AvatarImage src={message.sender.avatarUrl || undefined} />
            <AvatarFallback className="text-xs font-semibold bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-300">
              {getInitials(message.sender.name || "?")}
            </AvatarFallback>
          </Avatar>
        ) : !isOwn ? (
          <div className="w-8 flex-shrink-0" />
        ) : null}

        {/* Bubble with long press */}
        <div className="relative max-w-[80%]">
          {/* Quick Reactions Popup */}
          <QuickReactions
            isVisible={showQuickReactions}
            onReaction={onAddReaction}
            onShowMore={() => onShowEmojiPicker?.()}
            onClose={() => setShowQuickReactions(false)}
            position="top"
            align={isOwn ? "right" : "left"}
          />

          <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
            <DropdownMenuTrigger asChild>
              <div
                {...longPressHandlers}
                className={`relative shadow-sm select-none ${
                  isOwn ? bubbleColors.own : bubbleColors.other
                } ${getBubbleRadius()} px-3 py-2`}
              >
                {/* Sender name */}
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
                        ? "border-white/50 bg-white/15"
                        : "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
                    }`}
                  >
                    <p className={`text-[11px] font-semibold ${isOwn ? "text-white/90" : "text-emerald-600"}`}>
                      {quotedMessage.senderName}
                    </p>
                    <p className={`text-[12px] line-clamp-2 ${isOwn ? "text-white/70" : "text-gray-500"}`}>
                      {quotedMessage.content}
                    </p>
                  </div>
                )}

                {/* Content - Voice Message or Text */}
                {audioUrl ? (
                  <WhatsAppVoicePlayer
                    url={audioUrl}
                    isOwn={isOwn}
                    senderAvatar={message.sender.avatarUrl || undefined}
                    senderName={message.sender.name || undefined}
                  />
                ) : (
                  <p className={`text-[15px] leading-relaxed whitespace-pre-wrap break-words ${
                    isOwn ? bubbleColors.ownText : bubbleColors.otherText
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
                        <CheckCheck className="w-4 h-4 text-sky-300" />
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
              <DropdownMenuItem onClick={() => setShowQuickReactions(true)} className="gap-3">
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

          {/* Reactions Display */}
          {reactionsList.length > 0 && (
            <div className={`mt-1 ${isOwn ? "flex justify-end" : ""}`}>
              <ReactionsDisplay
                reactions={reactionsList}
                onReactionClick={onAddReaction}
                isOwn={isOwn}
              />
            </div>
          )}
        </div>
      </div>
    </SwipeToReply>
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
  onMenuClick,
}: {
  room: Room;
  currentUserId: number;
  onBack: () => void;
  onInfo?: () => void;
  onMenuClick?: () => void;
  onSearch?: () => void;
}) {
  const otherParticipant =
    room.type === "direct" && room.participants
      ? room.participants.find((p) => p.id !== currentUserId)
      : null;

  const displayName = otherParticipant?.name || room.name || "Chat";
  const avatarUrl = otherParticipant?.avatarUrl;

  return (
    <div className="flex items-center gap-2 px-2 py-2 bg-emerald-600 dark:bg-emerald-700">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="h-9 w-9 p-0 text-white hover:bg-white/10 rounded-full"
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>

      <Avatar className="h-10 w-10 shadow-sm border-2 border-white/20">
        <AvatarImage src={avatarUrl || undefined} />
        <AvatarFallback className="bg-emerald-500 text-white font-semibold">
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0" onClick={onInfo}>
        <h1 className="font-semibold text-[16px] text-white truncate">
          {displayName}
        </h1>
        <p className="text-[12px] text-emerald-100">online</p>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onMenuClick || onInfo}
        className="h-9 w-9 p-0 text-white hover:bg-white/10 rounded-full"
      >
        <MoreVertical className="h-5 w-5" />
      </Button>
    </div>
  );
}

// ============================================================================
// CHAT INPUT - WhatsApp Style with Real Voice Recording
// ============================================================================

export function MobileChatInput({
  value,
  onChange,
  onSend,
  onSendVoice,
  onAttach,
  onShowEmoji,
  isLoading,
  placeholder = "Nachricht schreiben...",
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onSendVoice?: (blob: Blob, duration: number) => void;
  onAttach?: () => void;
  onShowEmoji?: () => void;
  isLoading?: boolean;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [slideOffset, setSlideOffset] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(20).fill(0.1));
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimeRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const startXRef = useRef(0);
  const isCancelledRef = useRef(false);

  const hasText = value.trim().length > 0;
  const CANCEL_THRESHOLD = 100;

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Audio analysis for visualization
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 64;
      source.connect(analyserRef.current);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      recordingTimeRef.current = 0;
      isCancelledRef.current = false;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }

        // Create blob and send (only if not cancelled)
        if (!isCancelledRef.current && chunksRef.current.length > 0 && recordingTimeRef.current > 0) {
          const blobMimeType = chunksRef.current[0]?.type || 'audio/mp4';
          const blob = new Blob(chunksRef.current, { type: blobMimeType });

          if (onSendVoice) {
            onSendVoice(blob, recordingTimeRef.current);
          }
        }

        // Reset
        chunksRef.current = [];
        recordingTimeRef.current = 0;
        setRecordingTime(0);
        setSlideOffset(0);
        setAudioLevels(Array(20).fill(0.1));
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Timer
      intervalRef.current = setInterval(() => {
        recordingTimeRef.current += 1;
        setRecordingTime(recordingTimeRef.current);
      }, 1000);

      // Visualization
      const updateLevels = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);

          const newLevels = Array(20).fill(0).map((_, i) => {
            const idx = Math.floor((i / 20) * dataArray.length);
            return Math.max(0.1, dataArray[idx] / 255);
          });
          setAudioLevels(newLevels);
        }
        animationRef.current = requestAnimationFrame(updateLevels);
      };
      updateLevels();

    } catch (err) {
      console.error("Mikrofon-Zugriff verweigert:", err);
      alert("Mikrofon-Zugriff wurde verweigert. Bitte erlaube den Zugriff in den Browser-Einstellungen.");
    }
  };

  // Stop recording and send
  const stopAndSendRecording = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);
  };

  // Cancel recording
  const cancelRecording = () => {
    isCancelledRef.current = true;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    // Stop stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    // Reset
    chunksRef.current = [];
    recordingTimeRef.current = 0;
    setRecordingTime(0);
    setSlideOffset(0);
    setAudioLevels(Array(20).fill(0.1));
    setIsRecording(false);
  };

  // Touch handlers for slide-to-cancel
  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isRecording) return;
    const diff = startXRef.current - e.touches[0].clientX;
    setSlideOffset(Math.max(0, Math.min(diff, CANCEL_THRESHOLD + 50)));

    if (diff > CANCEL_THRESHOLD) {
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(10);
      cancelRecording();
    }
  };

  const handleTouchEnd = () => {
    if (slideOffset < CANCEL_THRESHOLD && isRecording) {
      setSlideOffset(0);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && hasText && !isLoading) {
      e.preventDefault();
      onSend();
    }
  };

  // Recording UI - WhatsApp style
  if (isRecording) {
    const cancelProgress = Math.min(slideOffset / CANCEL_THRESHOLD, 1);

    return (
      <div
        ref={containerRef}
        className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center gap-3 h-12">
          {/* Slide to cancel */}
          <div
            className="flex items-center gap-2 transition-opacity"
            style={{ opacity: 1 - cancelProgress }}
          >
            <span className="text-gray-400 text-sm whitespace-nowrap">
              ◀ Zum Abbrechen schieben
            </span>
          </div>

          {/* Waveform visualization */}
          <div className="flex-1 flex items-center justify-center gap-[3px] h-8 overflow-hidden">
            {audioLevels.map((level, i) => (
              <div
                key={i}
                className="w-1 bg-red-500 rounded-full transition-all duration-75"
                style={{ height: `${Math.max(4, level * 28)}px` }}
              />
            ))}
          </div>

          {/* Recording time */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-500 font-mono font-semibold text-sm min-w-[40px]">
              {formatDuration(recordingTime)}
            </span>
          </div>

          {/* Stop/Send button */}
          <button
            onClick={stopAndSendRecording}
            className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-600 shadow-lg flex items-center justify-center text-white transition-all active:scale-95 shrink-0"
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
          <button
            onClick={onShowEmoji}
            className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Smile className="w-5 h-5" />
          </button>
        </div>

        {/* Send or Mic */}
        {hasText ? (
          <button
            onClick={onSend}
            disabled={isLoading}
            className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-md flex items-center justify-center transition-all active:scale-95 disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={startRecording}
            className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-md flex items-center justify-center transition-all active:scale-95"
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
          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm">
            <span className="text-white text-lg font-bold">#</span>
          </div>
        ) : (
          <Avatar className="h-14 w-14 shadow-sm">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="bg-emerald-100 text-emerald-600 font-semibold text-lg dark:bg-emerald-900 dark:text-emerald-300">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
        )}
        {room.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-6 w-6 bg-emerald-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-900">
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
          {isOwnLastMessage && <CheckCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
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
            <div className="h-14 w-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-emerald-400 hover:bg-emerald-50 transition-colors">
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
                      ? "bg-gradient-to-tr from-emerald-400 to-teal-500"
                      : "bg-gray-200 dark:bg-gray-700"
                  }`}>
                    <Avatar className="h-13 w-13 ring-2 ring-white dark:ring-gray-900">
                      <AvatarImage src={other?.avatarUrl || undefined} />
                      <AvatarFallback className="bg-emerald-100 text-emerald-600 font-semibold dark:bg-emerald-900 dark:text-emerald-300">
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
