import { useRef, useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { WhatsAppVoicePlayer } from "./WhatsAppVoicePlayer";
import { QuickReactions, ReactionsDisplay, useLongPress, SwipeToReply } from "./WhatsAppReactions";
import {
  ChevronLeft,
  MoreVertical,
  Send,
  Smile,
  Mic,
  Plus,
  Check,
  CheckCheck,
  X,
  Reply,
  Pencil,
  Trash2,
  Pin,
  Copy,
  Star,
  Forward,
  ListTodo,
  Paperclip,
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

type ReadReceipt = {
  id: number;
  name: string | null;
  avatarUrl: string | null;
  readAt: Date;
};

// Utils
const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

const formatTime = (date: Date) => format(new Date(date), "HH:mm");

const formatDuration = (s: number) =>
  `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

// Date Separator
export function MobileDateSeparator({ date }: { date: Date }) {
  const label = isToday(date)
    ? "Heute"
    : isYesterday(date)
    ? "Gestern"
    : format(date, "d. MMMM yyyy", { locale: de });

  return (
    <div className="flex justify-center py-4">
      <span className="px-4 py-1.5 text-xs font-medium text-white bg-gray-800/60 dark:bg-gray-700 rounded-full">
        {label}
      </span>
    </div>
  );
}

// Message Bubble - Clean WhatsApp Style
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
  onShowEmojiPicker,
  quotedMessage,
  showSenderName = false,
  isMenuOpen = false,
  onMenuOpen,
  onMenuClose,
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
  onCreateTask?: () => void;
  onShowEmojiPicker?: () => void;
  quotedMessage?: { senderName: string; content: string } | null;
  showSenderName?: boolean;
  isMenuOpen?: boolean;
  onMenuOpen?: () => void;
  onMenuClose?: () => void;
}) {
  const time = formatTime(message.ohweee.createdAt);

  const attachments = (message.ohweee.attachments as { url: string; mimeType: string }[] | null) || [];
  const audioUrl = attachments.find((a) => a.mimeType?.startsWith("audio/"))?.url;
  const imageUrls = attachments.filter((a) => a.mimeType?.startsWith("image/")).map((a) => a.url);

  const groupedReactions = reactions.reduce((acc, r) => {
    if (!acc[r.reaction.emoji]) acc[r.reaction.emoji] = { users: [], hasReacted: false };
    acc[r.reaction.emoji].users.push(r.user);
    if (r.user.id === currentUserId) acc[r.reaction.emoji].hasReacted = true;
    return acc;
  }, {} as Record<string, { users: { id: number; name: string | null }[]; hasReacted: boolean }>);

  const reactionsList = Object.entries(groupedReactions).map(([emoji, data]) => ({
    emoji, users: data.users, hasReacted: data.hasReacted,
  }));

  const longPress = useLongPress({
    onLongPress: () => onMenuOpen?.(),
    delay: 400,
  });

  const isVoiceMessage = audioUrl && message.ohweee.content.includes("Sprachnachricht");

  const handleClose = () => onMenuClose?.();

  const handleCopy = () => {
    navigator.clipboard.writeText(message.ohweee.content.replace(/@\[(.*?)\]\(\d+\)/g, "@$1"));
    handleClose();
  };

  return (
    <SwipeToReply onReply={onReply} isOwn={isOwn}>
      <div className={`flex px-3 mb-0.5 ${isOwn ? "justify-end" : "justify-start"}`}>
        <div className="relative max-w-[85%]">
          {/* WhatsApp-style Menu (Quick Reactions + Actions) */}
          {isMenuOpen && (
            <div
              className={`absolute ${isOwn ? "right-0" : "left-0"} bottom-full mb-2 z-50 animate-in fade-in zoom-in-95 duration-150`}
            >
              {/* Quick Reactions Bar */}
              <div className="flex items-center bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 p-1 mb-2">
                {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => { onAddReaction(emoji); handleClose(); }}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-90 transition-transform"
                  >
                    <span className="text-2xl leading-none">{emoji}</span>
                  </button>
                ))}
                <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-0.5" />
                <button
                  onClick={() => { onShowEmojiPicker?.(); handleClose(); }}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Plus className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Actions Menu */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[200px]">
                <button
                  onClick={() => { onReply(); handleClose(); }}
                  className="w-full px-4 py-3 text-left text-[15px] flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <span>Antworten</span>
                  <Reply className="w-5 h-5 text-gray-400" />
                </button>
                <button
                  onClick={handleCopy}
                  className="w-full px-4 py-3 text-left text-[15px] flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <span>Kopieren</span>
                  <Copy className="w-5 h-5 text-gray-400" />
                </button>
                <button
                  onClick={() => { onPin(); handleClose(); }}
                  className="w-full px-4 py-3 text-left text-[15px] flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <span>{message.ohweee.isPinned ? "Markierung entfernen" : "Mit Stern markieren"}</span>
                  <Star className={`w-5 h-5 ${message.ohweee.isPinned ? "text-yellow-500 fill-yellow-500" : "text-gray-400"}`} />
                </button>
                {isOwn && (
                  <>
                    <button
                      onClick={() => { onEdit(); handleClose(); }}
                      className="w-full px-4 py-3 text-left text-[15px] flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <span>Bearbeiten</span>
                      <Pencil className="w-5 h-5 text-gray-400" />
                    </button>
                    <button
                      onClick={() => { onDelete(); handleClose(); }}
                      className="w-full px-4 py-3 text-left text-[15px] flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500"
                    >
                      <span>Löschen</span>
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Backdrop to close menu */}
          {isMenuOpen && (
            <div
              className="fixed inset-0 z-40"
              onClick={handleClose}
              onTouchStart={handleClose}
            />
          )}

          {/* Bubble */}
          <div
            {...longPress}
            className={`relative px-3 py-1.5 rounded-2xl select-none ${
              isOwn
                ? "bg-rose-500 text-white rounded-br-sm"
                : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm shadow-sm"
            }`}
          >
            {/* Sender name in groups */}
            {showSenderName && !isOwn && (
              <p className="text-[13px] font-semibold text-rose-500 mb-0.5">
                {message.sender.name}
              </p>
            )}

            {/* Quoted reply */}
            {quotedMessage && (
              <div className={`mb-1.5 pl-2 border-l-2 py-1 pr-2 rounded-r text-[13px] ${
                isOwn ? "border-white/50 bg-white/15" : "border-rose-400 bg-rose-50 dark:bg-rose-900/30"
              }`}>
                <p className={`font-semibold ${isOwn ? "text-white/90" : "text-rose-600"}`}>
                  {quotedMessage.senderName}
                </p>
                <p className={`line-clamp-1 ${isOwn ? "text-white/70" : "text-gray-500"}`}>
                  {quotedMessage.content}
                </p>
              </div>
            )}

            {/* Images */}
            {imageUrls.length > 0 && (
              <div className={`mb-1.5 -mx-3 -mt-1.5 rounded-t-2xl overflow-hidden ${imageUrls.length > 1 ? "grid grid-cols-2 gap-0.5" : ""}`}>
                {imageUrls.map((url, i) => (
                  <img key={i} src={url} alt="" className="w-full object-cover max-h-52" />
                ))}
              </div>
            )}

            {/* Voice or Text */}
            {audioUrl ? (
              <WhatsAppVoicePlayer url={audioUrl} isOwn={isOwn} />
            ) : !isVoiceMessage && (
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                {message.ohweee.content.replace(/@\[(.*?)\]\(\d+\)/g, "@$1")}
              </p>
            )}

            {/* Time & Status */}
            <div className={`flex items-center gap-1 mt-0.5 justify-end text-[11px] ${isOwn ? "text-white/60" : "text-gray-400"}`}>
              {message.ohweee.isEdited && <span>bearbeitet</span>}
              <span>{time}</span>
              {isOwn && (
                readReceipts && readReceipts.length > 0
                  ? <CheckCheck className="w-4 h-4 text-sky-200" />
                  : <Check className="w-4 h-4" />
              )}
            </div>
          </div>

          {/* Reactions */}
          {reactionsList.length > 0 && (
            <ReactionsDisplay reactions={reactionsList} onReactionClick={onAddReaction} isOwn={isOwn} />
          )}
        </div>
      </div>
    </SwipeToReply>
  );
}

// Chat Header
export function MobileChatHeader({
  room, currentUserId, onBack, onInfo,
}: {
  room: Room;
  currentUserId: number;
  onBack: () => void;
  onInfo?: () => void;
  onMenuClick?: () => void;
}) {
  const other = room.type === "direct" && room.participants
    ? room.participants.find((p) => p.id !== currentUserId)
    : null;
  const name = other?.name || room.name || "Chat";

  return (
    <div className="flex items-center gap-2 px-2 py-2 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shrink-0">
      <button onClick={onBack} className="p-2 -ml-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
        <ChevronLeft className="h-6 w-6" />
      </button>

      <Avatar className="h-9 w-9" onClick={onInfo}>
        <AvatarImage src={other?.avatarUrl || undefined} />
        <AvatarFallback className="bg-rose-100 text-rose-600 text-sm font-semibold">
          {room.type === "group" ? "#" : getInitials(name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0" onClick={onInfo}>
        <h1 className="font-semibold text-base truncate">{name}</h1>
        <p className="text-xs text-gray-500">
          {room.type === "direct" ? "online" : `${room.participants?.length || 0} Teilnehmer`}
        </p>
      </div>

      <button onClick={onInfo} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
        <MoreVertical className="h-5 w-5 text-gray-500" />
      </button>
    </div>
  );
}

// Reply Preview Component
function ReplyPreview({
  senderName,
  content,
  onCancel
}: {
  senderName: string;
  content: string;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 border-l-4 border-rose-500">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-rose-500">{senderName}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{content}</p>
      </div>
      <button onClick={onCancel} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
        <X className="w-5 h-5 text-gray-500" />
      </button>
    </div>
  );
}

// Chat Input with Reply, Edit, and Task Creation
export function MobileChatInput({
  value,
  onChange,
  onSend,
  onSendVoice,
  onAttach,
  onShowEmoji,
  isLoading,
  replyTo,
  onCancelReply,
  isEditing,
  onCancelEdit,
  onCreateTask,
  placeholder = "Nachricht",
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onSendVoice?: (blob: Blob, duration: number) => void;
  onAttach?: () => void;
  onShowEmoji?: () => void;
  isLoading?: boolean;
  replyTo?: { senderName: string; content: string } | null;
  onCancelReply?: () => void;
  isEditing?: boolean;
  onCancelEdit?: () => void;
  onCreateTask?: () => void;
  placeholder?: string;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(20).fill(0.1));
  const [slideOffset, setSlideOffset] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingTimeRef = useRef(0);
  const startXRef = useRef(0);
  const cancelledRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasText = value.trim().length > 0;
  const [showPlusMenu, setShowPlusMenu] = useState(false);

  // Focus input when replying or editing
  useEffect(() => {
    if (replyTo || isEditing) inputRef.current?.focus();
  }, [replyTo, isEditing]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 64;
      source.connect(analyserRef.current);

      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recordingTimeRef.current = 0;
      cancelledRef.current = false;

      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      recorder.onstop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        audioContextRef.current?.close();

        if (!cancelledRef.current && chunksRef.current.length > 0 && recordingTimeRef.current > 0) {
          const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || "audio/mp4" });
          onSendVoice?.(blob, recordingTimeRef.current);
        }
        chunksRef.current = [];
        setRecordingTime(0);
        setAudioLevels(Array(20).fill(0.1));
      };

      recorder.start();
      setIsRecording(true);
      if (navigator.vibrate) navigator.vibrate(20);

      intervalRef.current = setInterval(() => {
        recordingTimeRef.current += 1;
        setRecordingTime(recordingTimeRef.current);
      }, 1000);

      const updateLevels = () => {
        if (analyserRef.current) {
          const data = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(data);
          setAudioLevels(Array(20).fill(0).map((_, i) => Math.max(0.1, data[Math.floor((i / 20) * data.length)] / 255)));
        }
        animationRef.current = requestAnimationFrame(updateLevels);
      };
      updateLevels();
    } catch {
      alert("Mikrofon-Zugriff wurde verweigert");
    }
  };

  const stopRecording = () => {
    intervalRef.current && clearInterval(intervalRef.current);
    animationRef.current && cancelAnimationFrame(animationRef.current);
    mediaRecorderRef.current?.state !== "inactive" && mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setSlideOffset(0);
  };

  const cancelRecording = () => {
    cancelledRef.current = true;
    stopRecording();
  };

  useEffect(() => {
    return () => {
      intervalRef.current && clearInterval(intervalRef.current);
      animationRef.current && cancelAnimationFrame(animationRef.current);
    };
  }, []);

  if (isRecording) {
    return (
      <div
        className="shrink-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-3 py-2"
        onTouchStart={(e) => { startXRef.current = e.touches[0].clientX; }}
        onTouchMove={(e) => {
          const diff = startXRef.current - e.touches[0].clientX;
          setSlideOffset(Math.max(0, Math.min(diff, 120)));
          if (diff > 100) cancelRecording();
        }}
        onTouchEnd={() => slideOffset < 100 && setSlideOffset(0)}
      >
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm" style={{ opacity: 1 - slideOffset / 100 }}>
            ◀ Abbrechen
          </span>

          <div className="flex-1 flex items-center justify-center gap-0.5 h-8">
            {audioLevels.map((l, i) => (
              <div key={i} className="w-1 bg-rose-500 rounded-full" style={{ height: `${Math.max(4, l * 28)}px` }} />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-500 font-mono font-semibold">{formatDuration(recordingTime)}</span>
          </div>

          <button onClick={stopRecording} className="w-11 h-11 rounded-full bg-rose-500 text-white flex items-center justify-center shadow active:scale-95">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
      {/* Reply Preview */}
      {replyTo && !isEditing && (
        <ReplyPreview senderName={replyTo.senderName} content={replyTo.content} onCancel={onCancelReply || (() => {})} />
      )}

      {/* Edit Preview */}
      {isEditing && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
          <Pencil className="w-4 h-4 text-amber-600" />
          <span className="flex-1 text-sm text-amber-700 dark:text-amber-400">Nachricht bearbeiten</span>
          <button onClick={onCancelEdit} className="p-1 rounded-full hover:bg-amber-200 dark:hover:bg-amber-800">
            <X className="w-4 h-4 text-amber-600" />
          </button>
        </div>
      )}

      <div className="px-2 py-2 relative">
        {/* Plus Menu */}
        {showPlusMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowPlusMenu(false)} />
            <div className="absolute bottom-full right-2 mb-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[180px] z-50">
              <button
                onClick={() => { onAttach?.(); setShowPlusMenu(false); }}
                className="w-full px-4 py-3 text-left text-[15px] flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Paperclip className="w-5 h-5 text-gray-500" />
                <span>Datei anhängen</span>
              </button>
              {onCreateTask && (
                <button
                  onClick={() => { onCreateTask(); setShowPlusMenu(false); }}
                  className="w-full px-4 py-3 text-left text-[15px] flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <ListTodo className="w-5 h-5 text-gray-500" />
                  <span>Aufgabe erstellen</span>
                </button>
              )}
            </div>
          </>
        )}

        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center bg-gray-100 dark:bg-gray-800 rounded-full px-1">
            <button onClick={onShowEmoji} className="w-10 h-10 flex items-center justify-center text-gray-500">
              <Smile className="w-6 h-6" />
            </button>
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && hasText && !isLoading && onSend()}
              placeholder={isEditing ? "Nachricht bearbeiten..." : placeholder}
              className="flex-1 bg-transparent outline-none text-base py-2.5"
            />
            <button onClick={() => setShowPlusMenu(!showPlusMenu)} className="w-10 h-10 flex items-center justify-center text-gray-500">
              <Plus className="w-6 h-6" />
            </button>
          </div>

          <button
            onClick={hasText ? onSend : startRecording}
            disabled={hasText && isLoading}
            className="w-11 h-11 rounded-full bg-rose-500 text-white flex items-center justify-center shadow active:scale-95 disabled:opacity-50"
          >
            {hasText ? <Send className="w-5 h-5" /> : <Mic className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// Room List Item
export function MobileRoomListItem({
  room, currentUserId, onSelect,
}: {
  room: Room;
  currentUserId: number;
  onSelect: () => void;
}) {
  const other = room.type === "direct" && room.participants
    ? room.participants.find((p) => p.id !== currentUserId)
    : null;
  const name = other?.name || room.name || "Chat";
  const time = room.lastMessage?.createdAt ? format(new Date(room.lastMessage.createdAt), "HH:mm") : "";
  const preview = room.lastMessage?.content?.replace(/@\[(.*?)\]\(\d+\)/g, "@$1").slice(0, 40) || "Keine Nachrichten";
  const isOwnLast = room.lastMessage?.senderId === currentUserId;

  return (
    <button onClick={onSelect} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 active:bg-gray-100">
      <div className="relative">
        <Avatar className="h-12 w-12">
          <AvatarImage src={other?.avatarUrl || undefined} />
          <AvatarFallback className="bg-rose-100 text-rose-600 font-semibold">
            {room.type === "group" ? "#" : getInitials(name)}
          </AvatarFallback>
        </Avatar>
        {room.unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {room.unreadCount > 99 ? "99+" : room.unreadCount}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0 text-left">
        <div className="flex justify-between items-center">
          <span className={`font-medium truncate ${room.unreadCount > 0 ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-300"}`}>
            {name}
          </span>
          <span className={`text-xs ${room.unreadCount > 0 ? "text-rose-500 font-medium" : "text-gray-400"}`}>{time}</span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          {isOwnLast && <CheckCheck className="w-4 h-4 text-gray-400 flex-shrink-0" />}
          <p className={`text-sm truncate ${room.unreadCount > 0 ? "text-gray-800 dark:text-gray-200" : "text-gray-500"}`}>
            {preview}
          </p>
        </div>
      </div>
    </button>
  );
}

// Avatar Bar
export function MobileAvatarBar({
  rooms, currentUserId, onRoomSelect, onNewChat,
}: {
  rooms: Room[];
  currentUserId: number;
  onRoomSelect: (roomId: number) => void;
  onNewChat: () => void;
}) {
  const directRooms = rooms.filter((r) => r.type === "direct").slice(0, 8);

  return (
    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-x-auto scrollbar-hide">
      <div className="flex gap-4">
        <button onClick={onNewChat} className="flex flex-col items-center gap-1.5 flex-shrink-0">
          <div className="h-14 w-14 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center border-2 border-dashed border-rose-200 dark:border-rose-800">
            <Plus className="h-6 w-6 text-rose-400" />
          </div>
          <span className="text-[11px] text-gray-500 font-medium">Neu</span>
        </button>

        {directRooms.map((room) => {
          const other = room.participants?.find((p) => p.id !== currentUserId);
          const firstName = (other?.name || "?").split(" ")[0];

          return (
            <button key={room.id} onClick={() => onRoomSelect(room.id)} className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div className={`p-0.5 rounded-full ${room.unreadCount > 0 ? "bg-rose-500" : "bg-transparent"}`}>
                <Avatar className="h-13 w-13 ring-2 ring-white dark:ring-gray-900">
                  <AvatarImage src={other?.avatarUrl || undefined} />
                  <AvatarFallback className="bg-rose-100 text-rose-600 font-semibold">
                    {getInitials(other?.name || "?")}
                  </AvatarFallback>
                </Avatar>
              </div>
              <span className="text-[11px] text-gray-600 dark:text-gray-400 max-w-[56px] truncate font-medium">{firstName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
