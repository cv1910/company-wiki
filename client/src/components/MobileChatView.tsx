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
  Send,
  Smile,
  Reply,
  Pencil,
  Trash2,
  Pin,
  CheckSquare,
  Mic,
  Plus,
  Check,
  CheckCheck,
  Camera,
  Image as ImageIcon,
  FileText,
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
// DATE SEPARATOR - WhatsApp Style
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
    <div className="flex justify-center py-4">
      <span className="px-4 py-1.5 text-[11px] font-semibold tracking-wide text-gray-500 bg-white/90 dark:bg-gray-800/90 dark:text-gray-400 rounded-lg shadow-sm backdrop-blur-sm">
        {label}
      </span>
    </div>
  );
}

// ============================================================================
// BUBBLE TAIL SVG - WhatsApp Style
// ============================================================================

function BubbleTail({ isOwn, className = "" }: { isOwn: boolean; className?: string }) {
  if (isOwn) {
    return (
      <svg
        className={`absolute -right-2 bottom-0 w-3 h-4 ${className}`}
        viewBox="0 0 12 16"
        fill="currentColor"
      >
        <path d="M0 16V0C0 0 2 0 4 4C6 8 12 16 12 16H0Z" />
      </svg>
    );
  }
  return (
    <svg
      className={`absolute -left-2 bottom-0 w-3 h-4 ${className}`}
      viewBox="0 0 12 16"
      fill="currentColor"
    >
      <path d="M12 16V0C12 0 10 0 8 4C6 8 0 16 0 16H12Z" />
    </svg>
  );
}

// ============================================================================
// MESSAGE BUBBLE - WhatsApp Style
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
  const audioAttachment = attachments.find(a => a.mimeType?.startsWith("audio/"));
  const imageAttachments = attachments.filter(a => a.mimeType?.startsWith("image/"));
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
    delay: 350,
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
          className={`font-semibold ${isSelfMention ? "bg-yellow-200/50 dark:bg-yellow-500/30 px-0.5 rounded" : ""}`}
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

  // Check if message is just a voice message
  const isVoiceOnly = audioUrl && (message.ohweee.content === "[Sprachnachricht]" || message.ohweee.content.startsWith("🎙️"));

  return (
    <SwipeToReply onReply={onReply} isOwn={isOwn}>
      <div
        className={`flex items-end gap-1.5 px-3 ${isOwn ? "flex-row-reverse" : ""} ${
          isFirstInGroup ? "mt-2" : "mt-0.5"
        }`}
      >
        {/* Avatar */}
        {!isOwn && isLastInGroup ? (
          <Avatar className="w-7 h-7 flex-shrink-0 shadow-sm mb-0.5">
            <AvatarImage src={message.sender.avatarUrl || undefined} />
            <AvatarFallback className="text-[10px] font-bold bg-gradient-to-br from-rose-400 to-pink-500 text-white">
              {getInitials(message.sender.name || "?")}
            </AvatarFallback>
          </Avatar>
        ) : !isOwn ? (
          <div className="w-7 flex-shrink-0" />
        ) : null}

        {/* Bubble with long press */}
        <div className={`relative max-w-[78%] ${isOwn ? "mr-1" : "ml-1"}`}>
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
                className="relative select-none"
              >
                {/* Bubble */}
                <div
                  className={`relative shadow-sm ${
                    isOwn
                      ? "bg-rose-500 dark:bg-rose-600 text-white"
                      : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  } ${
                    isLastInGroup
                      ? isOwn ? "rounded-2xl rounded-br-md" : "rounded-2xl rounded-bl-md"
                      : "rounded-2xl"
                  } ${imageAttachments.length > 0 ? "overflow-hidden" : "px-3 py-2"}`}
                >
                  {/* Bubble tail - only on last message in group */}
                  {isLastInGroup && (
                    <BubbleTail
                      isOwn={isOwn}
                      className={isOwn ? "text-rose-500 dark:text-rose-600" : "text-white dark:text-gray-800"}
                    />
                  )}

                  {/* Image attachments */}
                  {imageAttachments.length > 0 && (
                    <div className={`${imageAttachments.length > 1 ? "grid grid-cols-2 gap-0.5" : ""}`}>
                      {imageAttachments.map((img, idx) => (
                        <img
                          key={idx}
                          src={img.url}
                          alt=""
                          className="w-full h-auto max-h-64 object-cover"
                        />
                      ))}
                    </div>
                  )}

                  {/* Content wrapper for padding when has images */}
                  <div className={imageAttachments.length > 0 ? "px-3 py-2" : ""}>
                    {/* Sender name - only for others in groups */}
                    {!isOwn && isFirstInGroup && (
                      <p className="text-[13px] font-semibold text-rose-500 dark:text-rose-400 mb-0.5">
                        {message.sender.name || "Unbekannt"}
                      </p>
                    )}

                    {/* Quoted message */}
                    {quotedMessage && (
                      <div
                        className={`mb-2 pl-2 border-l-[3px] rounded-r py-1.5 pr-2 ${
                          isOwn
                            ? "border-white/60 bg-white/15"
                            : "border-rose-400 bg-rose-50 dark:bg-rose-900/30"
                        }`}
                      >
                        <p className={`text-[12px] font-semibold ${isOwn ? "text-white/95" : "text-rose-600 dark:text-rose-400"}`}>
                          {quotedMessage.senderName}
                        </p>
                        <p className={`text-[13px] line-clamp-2 ${isOwn ? "text-white/75" : "text-gray-500 dark:text-gray-400"}`}>
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
                      !isVoiceOnly && (
                        <p className="text-[15px] leading-[1.35] whitespace-pre-wrap break-words">
                          {renderContent(message.ohweee.content)}
                        </p>
                      )
                    )}

                    {/* Time & Status - inline for short messages, separate line for long */}
                    <div className={`flex items-center gap-1.5 mt-1 ${
                      isOwn ? "justify-end text-white/70" : "justify-end text-gray-400"
                    }`}>
                      {message.ohweee.isEdited && (
                        <span className="text-[10px] italic">bearbeitet</span>
                      )}
                      {message.ohweee.isPinned && (
                        <Pin className="w-3 h-3" />
                      )}
                      <span className="text-[11px] font-medium">{time}</span>
                      {isOwn && (
                        <span className="ml-0.5">
                          {readReceipts && readReceipts.length > 0 ? (
                            <CheckCheck className="w-[18px] h-[18px] text-sky-200" />
                          ) : (
                            <Check className="w-[18px] h-[18px]" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align={isOwn ? "end" : "start"}
              className="w-52 shadow-2xl rounded-xl border-0 bg-white dark:bg-gray-800 py-1"
            >
              <DropdownMenuItem onClick={onReply} className="gap-3 py-2.5 px-3 cursor-pointer">
                <Reply className="w-4 h-4 text-gray-500" /> Antworten
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowQuickReactions(true)} className="gap-3 py-2.5 px-3 cursor-pointer">
                <Smile className="w-4 h-4 text-gray-500" /> Reagieren
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onPin} className="gap-3 py-2.5 px-3 cursor-pointer">
                <Pin className="w-4 h-4 text-gray-500" /> {message.ohweee.isPinned ? "Lösen" : "Anheften"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCreateTask} className="gap-3 py-2.5 px-3 cursor-pointer">
                <CheckSquare className="w-4 h-4 text-gray-500" /> Aufgabe erstellen
              </DropdownMenuItem>
              {isOwn && (
                <>
                  <DropdownMenuItem onClick={onEdit} className="gap-3 py-2.5 px-3 cursor-pointer">
                    <Pencil className="w-4 h-4 text-gray-500" /> Bearbeiten
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onDelete} className="gap-3 py-2.5 px-3 text-red-600 cursor-pointer">
                    <Trash2 className="w-4 h-4" /> Löschen
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Reactions Display */}
          {reactionsList.length > 0 && (
            <div className={`${isOwn ? "flex justify-end" : ""}`}>
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
// CHAT HEADER - WhatsApp Style
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
  const participantCount = room.participants?.length || 0;

  return (
    <div className="flex items-center gap-2 px-1 py-2 bg-rose-500 dark:bg-rose-600">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="h-10 w-10 p-0 text-white hover:bg-white/20 rounded-full"
      >
        <ChevronLeft className="h-7 w-7" />
      </Button>

      <div className="flex items-center gap-3 flex-1 min-w-0" onClick={onInfo}>
        <Avatar className="h-10 w-10 ring-2 ring-white/30">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="bg-white/20 text-white font-bold">
            {room.type === "group" || room.type === "team" ? "#" : getInitials(displayName)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-[17px] text-white truncate leading-tight">
            {displayName}
          </h1>
          <p className="text-[13px] text-white/75 truncate">
            {room.type === "direct" ? "online" : `${participantCount} Teilnehmer`}
          </p>
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onMenuClick || onInfo}
        className="h-10 w-10 p-0 text-white hover:bg-white/20 rounded-full"
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
  placeholder = "Nachricht",
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
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(24).fill(0.1));
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
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }

        if (!isCancelledRef.current && chunksRef.current.length > 0 && recordingTimeRef.current > 0) {
          const blobMimeType = chunksRef.current[0]?.type || 'audio/mp4';
          const blob = new Blob(chunksRef.current, { type: blobMimeType });

          if (onSendVoice) {
            onSendVoice(blob, recordingTimeRef.current);
          }
        }

        chunksRef.current = [];
        recordingTimeRef.current = 0;
        setRecordingTime(0);
        setSlideOffset(0);
        setAudioLevels(Array(24).fill(0.1));
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(30);

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

          const newLevels = Array(24).fill(0).map((_, i) => {
            const idx = Math.floor((i / 24) * dataArray.length);
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

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    chunksRef.current = [];
    recordingTimeRef.current = 0;
    setRecordingTime(0);
    setSlideOffset(0);
    setAudioLevels(Array(24).fill(0.1));
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
      if (navigator.vibrate) navigator.vibrate(20);
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
        className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-3 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center gap-3 h-12">
          {/* Cancel hint */}
          <div
            className="flex items-center gap-2 transition-opacity"
            style={{ opacity: 1 - cancelProgress }}
          >
            <span className="text-gray-400 text-[13px] font-medium whitespace-nowrap">
              ◀ Schieben zum Abbrechen
            </span>
          </div>

          {/* Waveform visualization */}
          <div className="flex-1 flex items-center justify-center gap-[2px] h-9 overflow-hidden">
            {audioLevels.map((level, i) => (
              <div
                key={i}
                className="w-[3px] bg-rose-500 rounded-full transition-all duration-75"
                style={{ height: `${Math.max(4, level * 32)}px` }}
              />
            ))}
          </div>

          {/* Recording time */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-500 font-mono font-bold text-[15px] min-w-[45px]">
              {formatDuration(recordingTime)}
            </span>
          </div>

          {/* Stop/Send button */}
          <button
            onClick={stopAndSendRecording}
            className="w-12 h-12 rounded-full bg-rose-500 hover:bg-rose-600 shadow-lg flex items-center justify-center text-white transition-all active:scale-95 shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-2">
        {/* Input container */}
        <div className="flex-1 flex items-center bg-white dark:bg-gray-800 rounded-full shadow-sm border border-gray-200 dark:border-gray-700">
          {/* Emoji button */}
          <button
            onClick={onShowEmoji}
            className="w-11 h-11 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-full"
          >
            <Smile className="w-6 h-6" />
          </button>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent outline-none text-[16px] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 py-2.5 min-w-0"
          />

          {/* Attachment button */}
          <button
            onClick={onAttach}
            className="w-11 h-11 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-full"
          >
            <Plus className="w-6 h-6" />
          </button>

          {/* Camera button */}
          <button
            onClick={onAttach}
            className="w-11 h-11 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-full mr-1"
          >
            <Camera className="w-5 h-5" />
          </button>
        </div>

        {/* Send or Mic button */}
        {hasText ? (
          <button
            onClick={onSend}
            disabled={isLoading}
            className="w-12 h-12 rounded-full bg-rose-500 hover:bg-rose-600 text-white shadow-md flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={startRecording}
            className="w-12 h-12 rounded-full bg-rose-500 hover:bg-rose-600 text-white shadow-md flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
          >
            <Mic className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ROOM LIST ITEM - WhatsApp Style
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
    ? room.lastMessage.content.replace(/@\[(.*?)\]\(\d+\)/g, "@$1").substring(0, 35)
    : "Keine Nachrichten";

  const isOwnLastMessage = room.lastMessage?.senderId === currentUserId;

  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 active:bg-gray-100 dark:active:bg-gray-800 transition-colors"
    >
      <div className="relative flex-shrink-0">
        {room.type === "group" || room.type === "team" ? (
          <div className="h-[52px] w-[52px] rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-sm">
            <span className="text-white text-xl font-bold">#</span>
          </div>
        ) : (
          <Avatar className="h-[52px] w-[52px] shadow-sm">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-rose-400 to-pink-500 text-white font-bold text-lg">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
        )}
        {room.unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1.5 bg-rose-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-900">
            {room.unreadCount > 99 ? "99+" : room.unreadCount}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0 text-left border-b border-gray-100 dark:border-gray-800 pb-3">
        <div className="flex items-center justify-between gap-2">
          <span className={`font-semibold text-[17px] truncate ${
            room.unreadCount > 0 ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"
          }`}>
            {displayName}
          </span>
          <span className={`text-[12px] flex-shrink-0 ${
            room.unreadCount > 0 ? "text-rose-500 font-semibold" : "text-gray-400"
          }`}>
            {lastMessageTime}
          </span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          {isOwnLastMessage && (
            <CheckCheck className={`w-[18px] h-[18px] flex-shrink-0 ${
              room.unreadCount === 0 ? "text-sky-500" : "text-gray-400"
            }`} />
          )}
          <p className={`text-[15px] truncate ${
            room.unreadCount > 0
              ? "text-gray-900 dark:text-gray-100 font-medium"
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
// AVATAR BAR - Story-like WhatsApp Style
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
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
        <div className="flex gap-4">
          <button onClick={onNewChat} className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className="h-[60px] w-[60px] rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all">
              <Plus className="h-7 w-7 text-gray-400" />
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
                  <div className={`p-[2.5px] rounded-full ${
                    room.unreadCount > 0
                      ? "bg-gradient-to-tr from-rose-500 via-pink-500 to-rose-400"
                      : "bg-gray-200 dark:bg-gray-700"
                  }`}>
                    <Avatar className="h-[55px] w-[55px] ring-[2.5px] ring-white dark:ring-gray-900">
                      <AvatarImage src={other?.avatarUrl || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-rose-400 to-pink-500 text-white font-bold">
                        {getInitials(name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  {room.unreadCount > 0 && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-900">
                      <span className="text-[10px] font-bold text-white">
                        {room.unreadCount > 9 ? "9+" : room.unreadCount}
                      </span>
                    </div>
                  )}
                </div>
                <span className="text-[11px] text-gray-600 dark:text-gray-400 max-w-[60px] truncate font-medium">
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
