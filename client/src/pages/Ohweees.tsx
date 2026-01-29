import { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/lib/hapticToast";
import {
  MessageCircle,
  Send,
  Search,
  Plus,
  Users,
  User,
  Pin,
  MoreHorizontal,
  Pencil,
  Trash2,
  Reply,
  X,
  Paperclip,
  Smile,
  Hash,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  Download,
  BookmarkMinus,
  BookmarkPlus,
  Volume2,
  VolumeX,
  CheckSquare,
  Square,
  ListTodo,
  Calendar,
  Flag,
  UserPlus,
  Clock,
  Mic,
  BarChart3,
  AtSign,
  Check,
  CheckCheck,
  Loader2,
  BookOpen,
} from "lucide-react";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { de } from "date-fns/locale";
import { EmojiPicker } from "@/components/EmojiPicker";
import { MessageContent } from "@/components/MessageContent";
import { ImageLightbox } from "@/components/ImageLightbox";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { WhatsAppVoicePlayer } from "@/components/WhatsAppVoicePlayer";
import { PollDisplay } from "@/components/PollDisplay";
import { ChatSearch, ChatSearchBar } from "@/components/ChatSearch";
import {
  MobileChatHeader,
  MobileChatInput,
  MobileRoomListItem,
  MobileAvatarBar,
  MobileDateSeparator,
  MobileMessage,
} from "@/components/MobileChatView";

// Date separator component
function DateSeparator({ date }: { date: Date }) {
  let label = format(date, "EEEE, d. MMMM", { locale: de });
  if (isToday(date)) {
    label = "Heute";
  } else if (isYesterday(date)) {
    label = "Gestern";
  }

  return (
    <div className="flex items-center justify-center my-4">
      <div className="bg-amber-500 text-white text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}

// Message component (Basecamp style)
// Standard emoji reactions
const REACTION_EMOJIS = ["👍", "❤️", "😄", "😮", "😢", "🎉"];

type ReactionData = {
  reaction: { id: number; ohweeeId: number; userId: number; emoji: string };
  user: { id: number; name: string | null; avatarUrl: string | null };
};

function OhweeeMessage({
  message,
  isOwn,
  onReply,
  onEdit,
  onDelete,
  onTogglePin,
  onShowThread,
  onAddReaction,
  onRemoveReaction,
  onMarkAsUnread,
  onRemoveUnreadMarker,
  currentUserId,
  reactions,
  replyCount,
  showReactionPicker,
  onToggleReactionPicker,
  readReceipts,
  isMarkedUnread,
  deliveryStatus,
  roomParticipantCount,
  onShowReadDetails,
  onCreateTask,
  onPin,
  onUnpin,
  isHighlighted,
}: {
  message: {
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
  isOwn: boolean;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onShowThread: () => void;
  onAddReaction: (emoji: string) => void;
  onRemoveReaction: (emoji: string) => void;
  currentUserId: number;
  reactions: ReactionData[];
  replyCount: number;
  showReactionPicker: boolean;
  onToggleReactionPicker: () => void;
  readReceipts?: { userId: number; userName: string | null; userAvatar: string | null }[];
  isMarkedUnread?: boolean;
  onMarkAsUnread: () => void;
  onRemoveUnreadMarker: () => void;
  deliveryStatus?: { deliveredTo: number[]; readBy: number[] };
  roomParticipantCount?: number;
  onShowReadDetails?: () => void;
  onCreateTask?: () => void;
  onPin?: () => void;
  onUnpin?: () => void;
  isHighlighted?: boolean;
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

  // Render content with highlighted mentions
  const renderContentWithMentions = (content: string) => {
    const mentionRegex = /@\[(.*?)\]\((\d+)\)/g;
    const parts: (string | React.ReactElement)[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }
      
      const userName = match[1];
      const userId = parseInt(match[2], 10);
      const isSelfMention = userId === currentUserId;
      
      parts.push(
        <span
          key={`mention-${match.index}`}
          className={`inline-flex items-center px-1.5 py-0.5 rounded font-medium ${
            isSelfMention
              ? "bg-primary/20 text-primary"
              : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
          }`}
        >
          @{userName}
        </span>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : content;
  };

  // Parse attachments
  const attachments = (message.ohweee.attachments as { url: string; filename: string; mimeType: string; size: number }[] | null) || [];
  
  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  
  // Get all images from attachments
  const imageAttachments = attachments.filter(a => a.mimeType.startsWith("image/"));

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return FileImage;
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return FileSpreadsheet;
    if (mimeType.includes("document") || mimeType.includes("word") || mimeType === "application/pdf") return FileText;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div 
      id={`message-${message.ohweee.id}`}
      className={`flex gap-3 group ${isOwn ? "flex-row-reverse" : ""} ${isHighlighted ? "animate-pulse bg-amber-100/50 dark:bg-amber-900/20 -mx-2 px-2 py-1 rounded-lg" : ""}`}
    >
      {!isOwn && (
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={message.sender.avatarUrl || undefined} />
          <AvatarFallback>
            {getInitials(message.sender.name || message.sender.email || "")}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-[70%]`}>
        {!isOwn && (
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{message.sender.name}</span>
            <span className="text-xs text-muted-foreground">{time}</span>
          </div>
        )}

        <div className="relative">
          <div
            className={`px-4 py-2.5 rounded-2xl ${
              isOwn
                ? "bg-amber-100 dark:bg-amber-900/30 text-foreground rounded-br-md"
                : "bg-muted rounded-bl-md"
            }`}
          >
            {message.ohweee.isPinned && (
              <Pin className="h-3 w-3 text-amber-500 absolute -top-1 -right-1" />
            )}

            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="space-y-2 mb-2">
                {attachments.map((attachment, index) => (
                  <div key={index}>
                    {attachment.mimeType.startsWith("image/") ? (
                      <button
                        onClick={() => {
                          const imgIndex = imageAttachments.findIndex(a => a.url === attachment.url);
                          setLightboxIndex(imgIndex >= 0 ? imgIndex : 0);
                          setLightboxOpen(true);
                        }}
                        className="block text-left"
                      >
                        <img
                          src={attachment.url}
                          alt={attachment.filename}
                          className="max-w-full max-h-64 rounded-lg object-contain cursor-zoom-in hover:opacity-90 transition-opacity"
                        />
                        <p className="text-xs text-muted-foreground mt-1">{attachment.filename}</p>
                      </button>
                    ) : attachment.mimeType.startsWith("audio/") ? (
                      <WhatsAppVoicePlayer url={attachment.url} isOwn={isOwn} />
                    ) : attachment.mimeType === "application/pdf" ? (
                      <div className={`rounded-lg overflow-hidden border ${isOwn ? "border-amber-300/50" : "border-border"}`}>
                        <div className="bg-gradient-to-r from-red-500 to-red-600 p-3 flex items-center gap-3">
                          <FileText className="h-8 w-8 text-white" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-white truncate">{attachment.filename}</p>
                            <p className="text-xs text-white/80">
                              PDF · {formatFileSize(attachment.size)}
                            </p>
                          </div>
                        </div>
                        <div className="p-2 bg-muted/30 flex gap-2">
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 text-center py-2 px-3 rounded bg-background hover:bg-muted text-sm font-medium transition-colors"
                          >
                            Öffnen
                          </a>
                          <a
                            href={attachment.url}
                            download={attachment.filename}
                            className="flex items-center justify-center py-2 px-3 rounded bg-background hover:bg-muted transition-colors"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    ) : (
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                          isOwn
                            ? "bg-amber-200/50 dark:bg-amber-800/30 hover:bg-amber-200/70"
                            : "bg-background/50 hover:bg-background/70"
                        }`}
                      >
                        {(() => {
                          const IconComponent = getFileIcon(attachment.mimeType);
                          return <IconComponent className="h-8 w-8 text-muted-foreground shrink-0" />;
                        })()}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{attachment.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.size)}
                          </p>
                        </div>
                        <Download className="h-4 w-4 text-muted-foreground shrink-0" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {message.ohweee.content && message.ohweee.content !== "[Datei]" && !message.ohweee.content.startsWith("📊 Umfrage:") && (
              <MessageContent content={message.ohweee.content} currentUserId={currentUserId} />
            )}
            
            {/* Poll Display */}
            {message.ohweee.content?.startsWith("📊 Umfrage:") && (
              <PollDisplay
                ohweeeId={message.ohweee.id}
                isOwn={isOwn}
                currentUserId={currentUserId}
              />
            )}
            
            {message.ohweee.isEdited && (
              <span className="text-xs text-muted-foreground ml-1">(bearbeitet)</span>
            )}
            
            {/* Delivery/Read status for own messages */}
            {isOwn && deliveryStatus && (
              <div 
                className="flex items-center justify-end gap-1 mt-1 cursor-pointer"
                onClick={onShowReadDetails}
                title="Klicken für Details"
              >
                {deliveryStatus.readBy.length > 0 ? (
                  // All read - double blue check
                  <span className="text-blue-500 text-xs font-medium">✓✓</span>
                ) : deliveryStatus.deliveredTo.length > 0 ? (
                  // Delivered but not read - double gray check
                  <span className="text-muted-foreground text-xs">✓✓</span>
                ) : (
                  // Sent but not delivered - single gray check
                  <span className="text-muted-foreground text-xs">✓</span>
                )}
                {roomParticipantCount && roomParticipantCount > 2 && deliveryStatus.readBy.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {deliveryStatus.readBy.length}/{roomParticipantCount - 1}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div
            className={`absolute top-0 ${
              isOwn ? "left-0 -translate-x-full pr-2" : "right-0 translate-x-full pl-2"
            } opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1`}
          >
            {/* Reaction button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onToggleReactionPicker}
            >
              <Smile className="h-4 w-4" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isOwn ? "start" : "end"}>
                <DropdownMenuItem onClick={onReply}>
                  <Reply className="h-4 w-4 mr-2" />
                  Antworten
                </DropdownMenuItem>
                {replyCount > 0 && (
                  <DropdownMenuItem onClick={onShowThread}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Thread anzeigen ({replyCount})
                  </DropdownMenuItem>
                )}
                {message.ohweee.isPinned ? (
                  <DropdownMenuItem onClick={onUnpin}>
                    <Pin className="h-4 w-4 mr-2" />
                    Loslösen
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={onPin}>
                    <Pin className="h-4 w-4 mr-2" />
                    Anpinnen
                  </DropdownMenuItem>
                )}
                {isMarkedUnread ? (
                  <DropdownMenuItem onClick={onRemoveUnreadMarker}>
                    <BookmarkMinus className="h-4 w-4 mr-2" />
                    Gelesen-Markierung entfernen
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={onMarkAsUnread}>
                    <BookmarkPlus className="h-4 w-4 mr-2" />
                    Als ungelesen markieren
                  </DropdownMenuItem>
                )}
                {onCreateTask && (
                  <DropdownMenuItem onClick={onCreateTask}>
                    <ListTodo className="h-4 w-4 mr-2" />
                    Aufgabe erstellen
                  </DropdownMenuItem>
                )}
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

          {/* Reaction picker popup */}
          {showReactionPicker && (
            <div
              className={`absolute top-full mt-1 ${
                isOwn ? "right-0" : "left-0"
              } z-50`}
            >
              <EmojiPicker
                onSelect={(emoji) => onAddReaction(emoji)}
                onClose={onToggleReactionPicker}
              />
            </div>
          )}
        </div>

        {/* Reactions display */}
        {reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(
              reactions.reduce((acc, r) => {
                if (!acc[r.reaction.emoji]) {
                  acc[r.reaction.emoji] = { count: 0, users: [], hasOwn: false };
                }
                acc[r.reaction.emoji].count++;
                acc[r.reaction.emoji].users.push(r.user.name || "Unbekannt");
                if (r.user.id === currentUserId) {
                  acc[r.reaction.emoji].hasOwn = true;
                }
                return acc;
              }, {} as Record<string, { count: number; users: string[]; hasOwn: boolean }>)
            ).map(([emoji, data]) => (
              <button
                key={emoji}
                onClick={() => {
                  if (data.hasOwn) {
                    onRemoveReaction(emoji);
                  } else {
                    onAddReaction(emoji);
                  }
                }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-sm transition-colors ${
                  data.hasOwn
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "bg-muted hover:bg-muted/80"
                }`}
                title={data.users.join(", ")}
              >
                <span>{emoji}</span>
                <span className="text-xs font-medium">{data.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Reply count indicator */}
        {replyCount > 0 && (
          <button
            onClick={onShowThread}
            className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
          >
            <MessageCircle className="h-3 w-3" />
            {replyCount} {replyCount === 1 ? "Antwort" : "Antworten"}
          </button>
        )}

        {/* Read receipts - only show for own messages */}
        {isOwn && readReceipts && readReceipts.length > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs text-muted-foreground">Gelesen von</span>
            <div className="flex -space-x-1">
              {readReceipts.slice(0, 5).map((receipt: { userId: number; userName: string | null; userAvatar: string | null }, idx: number) => (
                <Avatar key={idx} className="h-4 w-4 border border-background">
                  <AvatarImage src={receipt.userAvatar || undefined} />
                  <AvatarFallback className="text-[8px]">
                    {(receipt.userName || "?")[0]}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            {readReceipts.length > 5 && (
              <span className="text-xs text-muted-foreground">+{readReceipts.length - 5}</span>
            )}
          </div>
        )}

        {isOwn && (
          <span className="text-xs text-muted-foreground mt-1">{time}</span>
        )}
      </div>

      {isOwn && (
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={message.sender.avatarUrl || undefined} />
          <AvatarFallback>
            {getInitials(message.sender.name || message.sender.email || "")}
          </AvatarFallback>
        </Avatar>
      )}
      
      {/* Image Lightbox */}
      {lightboxOpen && imageAttachments.length > 0 && (
        <ImageLightbox
          images={imageAttachments}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}

export default function OhweeesPage() {
  const { roomId } = useParams<{ roomId?: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(
    roomId ? parseInt(roomId) : null
  );
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [showNewGroupDialog, setShowNewGroupDialog] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<
    { url: string; filename: string; mimeType: string; size: number }[]
  >([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // @Mention state
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  
  // Thread state
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [showThreadDialog, setShowThreadDialog] = useState(false);
  const [threadParentId, setThreadParentId] = useState<number | null>(null);

  // Mobile quote-reply state (WhatsApp style)
  const [replyToMessage, setReplyToMessage] = useState<{id: number, senderName: string, content: string} | null>(null);

  // Mobile message menu state (only one open at a time)
  const [activeMessageMenu, setActiveMessageMenu] = useState<number | null>(null);

  // Reaction picker state
  const [showReactionPicker, setShowReactionPicker] = useState<number | null>(null);
  
  // Typing indicator state
  const [lastTypingTime, setLastTypingTime] = useState<number>(0);
  
  // Search state
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  
  // Emoji picker state for input field
  const [showInputEmojiPicker, setShowInputEmojiPicker] = useState(false);
  
  // Sound notification state
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem("ohweees-sound-enabled");
    return saved !== null ? saved === "true" : true;
  });
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null);
  
  // Voice recording state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  
  // Room-specific search state
  const [showRoomSearchDialog, setShowRoomSearchDialog] = useState(false);
  const [roomSearchInput, setRoomSearchInput] = useState("");
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  
  // Pinned messages state
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  
  // Chat search state
  const [showChatSearch, setShowChatSearch] = useState(false);
  
  // Poll creation state
  const [showCreatePollDialog, setShowCreatePollDialog] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
  const [pollIsAnonymous, setPollIsAnonymous] = useState(false);
  
  // Tasks state
  const [showTasksPanel, setShowTasksPanel] = useState(false);
  const [showCreateTaskDialog, setShowCreateTaskDialog] = useState(false);
  const [taskFromMessageId, setTaskFromMessageId] = useState<number | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>("");
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState<number | null>(null);
  
  // Mobile detection
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Reset to list view when switching to mobile without a selected room
      if (mobile && !selectedRoomId) {
        setMobileView("list");
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [selectedRoomId]);
  
  // When room is selected on mobile, switch to chat view
  useEffect(() => {
    if (isMobile && selectedRoomId) {
      setMobileView("chat");
    }
  }, [isMobile, selectedRoomId]);

  // Prevent iOS Safari overscroll/bounce effect on mobile
  useEffect(() => {
    if (!isMobile) return;

    // Find scrollable element (custom data attribute or Radix ScrollArea viewport)
    const findScrollable = (target: HTMLElement): HTMLElement | null => {
      return target.closest('[data-scrollable="true"], [data-radix-scroll-area-viewport]') as HTMLElement | null;
    };

    // Prevent touchmove on document to stop iOS overscroll
    const preventOverscroll = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const scrollable = findScrollable(target);

      if (!scrollable) {
        e.preventDefault();
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = scrollable;
      const atTop = scrollTop <= 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1;

      const touch = e.touches[0];
      const startY = (scrollable as any)._touchStartY || touch.clientY;
      const deltaY = touch.clientY - startY;

      if ((atTop && deltaY > 0) || (atBottom && deltaY < 0)) {
        e.preventDefault();
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const scrollable = findScrollable(target);
      if (scrollable && e.touches.length === 1) {
        (scrollable as any)._touchStartY = e.touches[0].clientY;
      }
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", preventOverscroll, { passive: false });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", preventOverscroll);
    };
  }, [isMobile]);

  // Initialize notification sound
  useEffect(() => {
    notificationSoundRef.current = new Audio("/notification.mp3");
    notificationSoundRef.current.volume = 0.5;
  }, []);
  
  // Save sound preference
  useEffect(() => {
    localStorage.setItem("ohweees-sound-enabled", String(soundEnabled));
  }, [soundEnabled]);
  
  // Query for due tasks (today and overdue)
  const { data: dueTasks } = trpc.ohweees.getDueTasks.useQuery(undefined, {
    refetchInterval: 60000, // Check every minute
  });
  
  // Mentions query
  const { data: mentions = [], isLoading: mentionsLoading } = trpc.mentions.list.useQuery(
    { limit: 50 },
    { enabled: !!user }
  );
  
  const markMentionRead = trpc.mentions.markRead.useMutation({
    onSuccess: () => {
      utils.mentions.list.invalidate();
      utils.mentions.unreadCount.invalidate();
    },
  });
  
  const unreadMentionsCount = mentions.filter((m) => !m.isRead).length;
  
  // Tab state for mobile
  const [activeTab, setActiveTab] = useState<"chats" | "mentions">("chats");
  
  // Show notification for due tasks on initial load
  const [hasShownDueTasksNotification, setHasShownDueTasksNotification] = useState(false);
  
  useEffect(() => {
    if (dueTasks && dueTasks.length > 0 && !hasShownDueTasksNotification) {
      setHasShownDueTasksNotification(true);
      
      // Count overdue vs today
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const overdueTasks = dueTasks.filter(t => t.task.dueDate && new Date(t.task.dueDate) < startOfDay);
      const todayTasks = dueTasks.filter(t => t.task.dueDate && new Date(t.task.dueDate) >= startOfDay);
      
      // Show toast notification
      if (overdueTasks.length > 0) {
        toast.warning(
          `${overdueTasks.length} überfällige Aufgabe${overdueTasks.length > 1 ? "n" : ""}!`,
          {
            description: "Klicke auf das Aufgaben-Icon um sie anzuzeigen.",
            duration: 8000,
          }
        );
      } else if (todayTasks.length > 0) {
        toast.info(
          `${todayTasks.length} Aufgabe${todayTasks.length > 1 ? "n" : ""} heute fällig`,
          {
            description: "Klicke auf das Aufgaben-Icon um sie anzuzeigen.",
            duration: 5000,
          }
        );
      }
      
      // Show browser notification if permission granted
      if (Notification.permission === "granted" && overdueTasks.length > 0) {
        const notification = new Notification("⚠️ Überfällige Aufgaben", {
          body: `Du hast ${overdueTasks.length} überfällige Aufgabe${overdueTasks.length > 1 ? "n" : ""}.`,
          icon: "/favicon.ico",
        });
        notification.onclick = () => {
          window.focus();
          setShowTasksPanel(true);
        };
        setTimeout(() => notification.close(), 10000);
      }
    }
  }, [dueTasks, hasShownDueTasksNotification]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Queries with real-time polling
  const { data: rooms, isLoading: roomsLoading } = trpc.ohweees.rooms.useQuery(undefined, {
    refetchInterval: 5000, // Refresh room list every 5 seconds
  });
  const { data: currentRoom } = trpc.ohweees.getRoom.useQuery(
    { id: selectedRoomId! },
    { 
      enabled: !!selectedRoomId, 
      refetchInterval: 2000, // Refresh messages every 2 seconds for near real-time
    }
  );
  const { data: allUsers } = trpc.ohweees.getUsers.useQuery();
  const { data: unreadCount } = trpc.ohweees.unreadCount.useQuery(undefined, {
    refetchInterval: 5000, // Refresh unread count every 5 seconds
  });
  
  // Search query
  const { data: searchResults, refetch: searchRefetch } = trpc.ohweees.search.useQuery(
    { query: searchInput },
    { enabled: false }
  );
  
  const handleSearch = async () => {
    if (!searchInput.trim()) return;
    setIsSearching(true);
    await searchRefetch();
    setIsSearching(false);
  };
  
  // Room-specific search query
  const { data: roomSearchResults, refetch: roomSearchRefetch, isFetching: isRoomSearching } = trpc.ohweees.searchMessages.useQuery(
    { roomId: selectedRoomId!, query: roomSearchInput },
    { enabled: false }
  );
  
  const handleRoomSearch = async () => {
    if (!roomSearchInput.trim() || !selectedRoomId) return;
    await roomSearchRefetch();
  };
  
  // Pinned messages query
  const { data: pinnedMessages, refetch: refetchPinnedMessages } = trpc.ohweees.getPinnedMessages.useQuery(
    { roomId: selectedRoomId! },
    { enabled: !!selectedRoomId }
  );
  
  // Pin/Unpin mutations
  const pinMessage = trpc.ohweees.pinMessage.useMutation({
    onSuccess: () => {
      refetchPinnedMessages();
      utils.ohweees.getRoom.invalidate({ id: selectedRoomId! });
      toast.success("Nachricht angepinnt");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const unpinMessage = trpc.ohweees.unpinMessage.useMutation({
    onSuccess: () => {
      refetchPinnedMessages();
      utils.ohweees.getRoom.invalidate({ id: selectedRoomId! });
      toast.success("Nachricht losgelöst");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Mutations
  const sendMessage = trpc.ohweees.send.useMutation({
    onSuccess: () => {
      setMessageInput("");
      utils.ohweees.getRoom.invalidate({ id: selectedRoomId! });
      utils.ohweees.rooms.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const editMessage = trpc.ohweees.edit.useMutation({
    onSuccess: () => {
      setEditingMessageId(null);
      setEditContent("");
      utils.ohweees.getRoom.invalidate({ id: selectedRoomId! });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMessage = trpc.ohweees.delete.useMutation({
    onSuccess: () => {
      utils.ohweees.getRoom.invalidate({ id: selectedRoomId! });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const togglePin = trpc.ohweees.togglePin.useMutation({
    onSuccess: () => {
      utils.ohweees.getRoom.invalidate({ id: selectedRoomId! });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const startDM = trpc.ohweees.startDM.useMutation({
    onSuccess: (room) => {
      setSelectedRoomId(room.id);
      setLocation(`/taps/${room.id}`);
      setShowNewChatDialog(false);
      utils.ohweees.rooms.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const createGroup = trpc.ohweees.createGroup.useMutation({
    onSuccess: (room) => {
      setSelectedRoomId(room.id);
      setLocation(`/taps/${room.id}`);
      setShowNewGroupDialog(false);
      setGroupName("");
      setSelectedUserIds([]);
      utils.ohweees.rooms.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const uploadFile = trpc.ohweees.uploadFile.useMutation({
    onSuccess: (file) => {
      setPendingAttachments((prev) => [...prev, file]);
      setIsUploading(false);
      toast.success(`${file.filename} hochgeladen`);
    },
    onError: (error) => {
      setIsUploading(false);
      toast.error(error.message);
    },
  });

  // Reaction mutations
  const addReaction = trpc.ohweees.addReaction.useMutation({
    onSuccess: () => {
      utils.ohweees.getReactionsBatch.invalidate();
      setShowReactionPicker(null);
    },
  });

  const removeReaction = trpc.ohweees.removeReaction.useMutation({
    onSuccess: () => {
      utils.ohweees.getReactionsBatch.invalidate();
    },
  });

  // Thread queries
  const { data: threadReplies } = trpc.ohweees.getReplies.useQuery(
    { parentId: threadParentId! },
    { enabled: !!threadParentId && showThreadDialog }
  );

  // Batch queries for reactions and reply counts
  const messageIds = useMemo(
    () => currentRoom?.messages?.map((m) => m.ohweee.id) || [],
    [currentRoom?.messages]
  );
  const { data: reactionsData } = trpc.ohweees.getReactionsBatch.useQuery(
    { ohweeeIds: messageIds },
    { enabled: messageIds.length > 0 }
  );
  const { data: replyCountsData } = trpc.ohweees.getReplyCountsBatch.useQuery(
    { ohweeeIds: messageIds },
    { enabled: messageIds.length > 0 }
  );
  const { data: readReceiptsData } = trpc.ohweees.getReadReceiptsBatch.useQuery(
    { ohweeeIds: messageIds },
    { enabled: messageIds.length > 0 }
  );
  
  // Message status query (delivery/read receipts)
  const { data: messageStatusData } = trpc.ohweees.getMessageStatus.useQuery(
    { ohweeeIds: messageIds },
    { 
      enabled: messageIds.length > 0,
      refetchInterval: 5000,
    }
  );
  
  // Convert to lookup object
  const messageStatusMap = useMemo(() => {
    const map: Record<number, { deliveredTo: number[]; readBy: number[] }> = {};
    messageStatusData?.forEach(status => {
      map[status.ohweeeId] = { deliveredTo: status.deliveredTo, readBy: status.readBy };
    });
    return map;
  }, [messageStatusData]);

  // Mark messages as read when viewing
  const markAsRead = trpc.ohweees.markAsRead.useMutation();
  
  // Unread markers
  const { data: unreadMarkers } = trpc.ohweees.getUnreadMarkersBatch.useQuery(
    { ohweeeIds: messageIds },
    { enabled: messageIds.length > 0 }
  );
  
  // Rooms with unread markers for sidebar
  const { data: roomsWithUnreadMarkers } = trpc.ohweees.getRoomsWithUnreadMarkers.useQuery(undefined, {
    refetchInterval: 5000, // Refresh every 5 seconds
  });
  
  const markAsUnread = trpc.ohweees.markAsUnread.useMutation({
    onSuccess: () => {
      utils.ohweees.getUnreadMarkersBatch.invalidate();
      utils.ohweees.getRoomsWithUnreadMarkers.invalidate();
      toast.success("Als ungelesen markiert");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const removeUnreadMarker = trpc.ohweees.removeUnreadMarker.useMutation({
    onSuccess: () => {
      utils.ohweees.getUnreadMarkersBatch.invalidate();
      utils.ohweees.getRoomsWithUnreadMarkers.invalidate();
      toast.success("Markierung entfernt");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  // Tasks
  const { data: tasks } = trpc.ohweees.getTasks.useQuery(
    { roomId: selectedRoomId! },
    { enabled: !!selectedRoomId }
  );
  
  const createTask = trpc.ohweees.createTask.useMutation({
    onSuccess: () => {
      // ONLY close dialog - nothing else
      setShowCreateTaskDialog(false);
    },
  });
  
  const toggleTask = trpc.ohweees.toggleTask.useMutation({
    onSuccess: () => {
      utils.ohweees.getTasks.invalidate({ roomId: selectedRoomId! });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const deleteTask = trpc.ohweees.deleteTask.useMutation({
    onSuccess: () => {
      utils.ohweees.getTasks.invalidate({ roomId: selectedRoomId! });
      toast.success("Aufgabe gelöscht");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  // Poll creation
  const createPoll = trpc.ohweees.createPoll.useMutation({
    onSuccess: () => {
      utils.ohweees.rooms.invalidate();
      setShowCreatePollDialog(false);
      setPollQuestion("");
      setPollOptions(["", ""]);
      setPollAllowMultiple(false);
      setPollIsAnonymous(false);
      toast.success("Umfrage erstellt");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  // Typing indicator
  const { data: typingUsers } = trpc.ohweees.getTypingUsers.useQuery(
    { roomId: selectedRoomId! },
    { 
      enabled: !!selectedRoomId,
      refetchInterval: 2000, // Check every 2 seconds
    }
  );
  
  const setTyping = trpc.ohweees.setTyping.useMutation();
  const clearTyping = trpc.ohweees.clearTyping.useMutation();
  
  // Disabled for debugging - potential render loop source
  // useEffect(() => {
  //   if (messageIds.length > 0 && user?.id) {
  //     // Mark all visible messages as read
  //     markAsRead.mutate({ ohweeeIds: messageIds });
  //   }
  // }, [messageIds, user?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentRoom?.messages]);

  // Update URL when room changes
  useEffect(() => {
    if (selectedRoomId && !roomId) {
      setLocation(`/taps/${selectedRoomId}`, { replace: true });
    }
  }, [selectedRoomId, roomId, setLocation]);

  // Set initial room from URL
  useEffect(() => {
    if (roomId) {
      setSelectedRoomId(parseInt(roomId));
    }
  }, [roomId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} ist zu groß (max. 10MB)`);
        continue;
      }

      setIsUploading(true);
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        uploadFile.mutate({
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          base64Data: base64,
        });
      };
      reader.readAsDataURL(file);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = () => {
    if ((!messageInput.trim() && pendingAttachments.length === 0) || !selectedRoomId) return;

    // Clear typing status when sending
    clearTyping.mutate({ roomId: selectedRoomId });

    sendMessage.mutate({
      roomId: selectedRoomId,
      content: messageInput.trim() || (pendingAttachments.length > 0 ? "[Datei]" : ""),
      attachments: pendingAttachments.length > 0 ? pendingAttachments : undefined,
      parentId: replyToMessage?.id, // Include parentId for quote-reply
    });
    setPendingAttachments([]);
    setReplyToMessage(null); // Clear reply after sending
  };

  const handleEditMessage = () => {
    if (!editContent.trim() || !editingMessageId) return;
    editMessage.mutate({
      id: editingMessageId,
      content: editContent.trim(),
    });
  };

  // Filter users for @mention suggestions
  const filteredMentionUsers = allUsers?.filter((u) =>
    u.name?.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(mentionQuery.toLowerCase())
  ).slice(0, 5) || [];

  const handleMentionSelect = (selectedUser: { id: number; name: string | null }) => {
    const currentValue = editingMessageId ? editContent : messageInput;
    const beforeMention = currentValue.substring(0, mentionStartIndex);
    const afterMention = currentValue.substring(
      mentionStartIndex + mentionQuery.length + 1
    );
    const mentionText = `@[${selectedUser.name || "Benutzer"}](${selectedUser.id}) `;
    const newValue = beforeMention + mentionText + afterMention;
    
    if (editingMessageId) {
      setEditContent(newValue);
    } else {
      setMessageInput(newValue);
    }
    
    setShowMentionSuggestions(false);
    setMentionQuery("");
    setMentionStartIndex(-1);
    setSelectedMentionIndex(0);
    textareaRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    if (editingMessageId) {
      setEditContent(value);
    } else {
      setMessageInput(value);
    }
    
    // Send typing indicator (throttled to every 3 seconds)
    const now = Date.now();
    if (selectedRoomId && now - lastTypingTime > 3000) {
      setLastTypingTime(now);
      setTyping.mutate({ roomId: selectedRoomId });
    }
    
    // Check for @ trigger
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Check if there's no space after @ (still typing mention)
      if (!textAfterAt.includes(" ") && !textAfterAt.includes("]")) {
        setShowMentionSuggestions(true);
        setMentionQuery(textAfterAt);
        setMentionStartIndex(lastAtIndex);
        setSelectedMentionIndex(0);
        return;
      }
    }
    
    setShowMentionSuggestions(false);
    setMentionQuery("");
    setMentionStartIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle mention suggestions navigation
    if (showMentionSuggestions && filteredMentionUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev < filteredMentionUsers.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev > 0 ? prev - 1 : filteredMentionUsers.length - 1
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        handleMentionSelect(filteredMentionUsers[selectedMentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowMentionSuggestions(false);
        return;
      }
    }
    
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (editingMessageId) {
        handleEditMessage();
      } else {
        handleSendMessage();
      }
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoomDisplayName = (room: NonNullable<typeof rooms>[0]) => {
    if (room.name) return room.name;
    if (room.type === "direct" && room.participants) {
      const otherUser = room.participants.find((p) => p.id !== user?.id);
      return otherUser?.name || otherUser?.email || "Direktnachricht";
    }
    return "Chat";
  };

  const getRoomAvatar = (room: NonNullable<typeof rooms>[0]) => {
    if (room.type === "direct" && room.participants) {
      const otherUser = room.participants.find((p) => p.id !== user?.id);
      return otherUser?.avatarUrl;
    }
    return null;
  };

  // Format message time for room list
  const formatMessageTime = (date: Date) => {
    if (isToday(date)) {
      return format(date, "HH:mm");
    } else if (isYesterday(date)) {
      return "Gestern";
    } else {
      return format(date, "dd.MM.");
    }
  };

  // Group messages by date for separators
  const groupMessagesByDate = (messages: NonNullable<typeof currentRoom>["messages"]) => {
    const groups: { date: Date; messages: typeof messages }[] = [];
    let currentGroup: typeof messages = [];
    let currentDate: Date | null = null;

    messages.forEach((msg) => {
      const msgDate = new Date(msg.ohweee.createdAt);
      if (!currentDate || !isSameDay(currentDate, msgDate)) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate!, messages: currentGroup });
        }
        currentDate = msgDate;
        currentGroup = [msg];
      } else {
        currentGroup.push(msg);
      }
    });

    if (currentGroup.length > 0 && currentDate) {
      groups.push({ date: currentDate, messages: currentGroup });
    }

    return groups;
  };

  // Request notification permission and show browser notifications for new messages
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Show browser notification for new messages when tab is not focused
  const prevMessagesRef = useRef<number>(0);
  useEffect(() => {
    if (!currentRoom?.messages || document.hasFocus()) return;
    
    const currentCount = currentRoom.messages.length;
    if (prevMessagesRef.current > 0 && currentCount > prevMessagesRef.current) {
      const newMessages = currentRoom.messages.slice(prevMessagesRef.current);
      const latestMsg = newMessages[newMessages.length - 1];
      
      if (latestMsg && latestMsg.sender.id !== user?.id) {
        // Play notification sound if enabled
        if (soundEnabled && notificationSoundRef.current) {
          notificationSoundRef.current.currentTime = 0;
          notificationSoundRef.current.play().catch(() => {
            // Ignore autoplay errors
          });
        }
        
        // Show browser notification if permission granted
        if (Notification.permission === "granted") {
          const notification = new Notification(`Neues Ohweee von ${latestMsg.sender.name || "Unbekannt"}`, {
            body: latestMsg.ohweee.content.substring(0, 100),
            icon: latestMsg.sender.avatarUrl || "/icon-192.svg",
            tag: `ohweee-${latestMsg.ohweee.id}`,
          });
          
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
          
          // Auto-close after 5 seconds
          setTimeout(() => notification.close(), 5000);
        }
      }
    }
    prevMessagesRef.current = currentCount;
  }, [currentRoom?.messages, user?.id, soundEnabled]);

  if (roomsLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Mobile View
  if (isMobile) {
    if (mobileView === "list") {
      return (
        <div className="flex flex-col h-[calc(100dvh-56px)] bg-background">
          {/* Header */}
          <div className="p-4 border-b">
            <h1 className="text-xl font-bold">Ohweees</h1>
          </div>

          {/* Room List */}
          <div className="flex-1 overflow-y-auto" data-scrollable="true">
            {rooms?.map((room) => (
              <MobileRoomListItem
                key={room.id}
                room={room}
                isSelected={selectedRoomId === room.id}
                onClick={() => setSelectedRoomId(room.id)}
                currentUserId={user?.id || 0}
              />
            ))}
          </div>
        </div>
      );
    }

    // Chat View - wait for room to load
    if (!currentRoom) {
      return (
        <div className="flex items-center justify-center h-[calc(100dvh-56px-56px)]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-[calc(100dvh-56px-56px)] overflow-hidden">
        {/* Header */}
        <MobileChatHeader
          room={currentRoom}
          onBack={() => setMobileView("list")}
          currentUserId={user?.id || 0}
        />

        {/* Messages */}
        <div
          ref={messagesEndRef as any}
          className="flex-1 overflow-y-auto p-2"
          data-scrollable="true"
        >
          {currentRoom?.messages?.map((message, index) => {
            const prevMessage = currentRoom.messages?.[index - 1];
            const showDateSeparator = !prevMessage ||
              !isSameDay(new Date(message.ohweee.createdAt), new Date(prevMessage.ohweee.createdAt));
            const isOwn = message.sender.id === user?.id;
            const messageReactions = reactionsData?.[message.ohweee.id] || [];

            return (
              <div key={message.ohweee.id}>
                {showDateSeparator && (
                  <MobileDateSeparator date={new Date(message.ohweee.createdAt)} />
                )}
                <MobileMessage
                  message={message}
                  isOwn={isOwn}
                  currentUserId={user?.id || 0}
                  reactions={messageReactions}
                  isMenuOpen={activeMessageMenu === message.ohweee.id}
                  onMenuOpen={() => setActiveMessageMenu(message.ohweee.id)}
                  onMenuClose={() => setActiveMessageMenu(null)}
                  onReply={() => {
                    setActiveMessageMenu(null);
                    setReplyToMessage({
                      id: message.ohweee.id,
                      senderName: message.sender.name || "Unbekannt",
                      content: message.ohweee.content,
                    });
                  }}
                  onEdit={() => {
                    setActiveMessageMenu(null);
                    setEditingMessageId(message.ohweee.id);
                    setEditContent(message.ohweee.content);
                  }}
                  onDelete={() => {
                    setActiveMessageMenu(null);
                    deleteMessage.mutate({ id: message.ohweee.id });
                  }}
                  onPin={() => {
                    setActiveMessageMenu(null);
                    togglePin.mutate({ id: message.ohweee.id });
                  }}
                  onAddReaction={(emoji) => {
                    addReaction.mutate({ ohweeeId: message.ohweee.id, emoji });
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Input */}
        <MobileChatInput
          value={messageInput}
          onChange={setMessageInput}
          onSend={handleSendMessage}
          replyTo={replyToMessage}
          onCancelReply={() => setReplyToMessage(null)}
        />
      </div>
    );
  }

  // Desktop View
  return (
    <div className="flex h-[calc(100vh-120px)] -m-6">
      {/* Sidebar - Chat List */}
      <div className="w-80 border-r bg-muted/20 flex flex-col">
        {/* Header - Premium Design */}
        <div className="p-4 border-b bg-gradient-to-b from-primary/5 to-transparent">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold">Ohweees</h1>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl hover:bg-primary/10"
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? "Benachrichtigungston deaktivieren" : "Benachrichtigungston aktivieren"}
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl hover:bg-primary/10 relative"
                onClick={() => setShowTasksPanel(true)}
                title={dueTasks && dueTasks.length > 0 ? `${dueTasks.length} fällige Aufgabe${dueTasks.length > 1 ? "n" : ""}` : "Aufgaben anzeigen"}
              >
                <ListTodo className={`h-4 w-4 ${dueTasks && dueTasks.length > 0 ? "text-red-500" : ""}`} />
                {(tasks && tasks.filter(t => !t.task.isCompleted).length > 0) || (dueTasks && dueTasks.length > 0) ? (
                  <span className={`absolute -top-0.5 -right-0.5 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center ring-2 ring-background ${dueTasks && dueTasks.length > 0 ? "bg-red-500 animate-pulse" : "bg-amber-500"}`}>
                    {dueTasks && dueTasks.length > 0 ? dueTasks.length : tasks?.filter(t => !t.task.isCompleted).length}
                  </span>
                ) : null}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl hover:bg-primary/10"
                onClick={() => setShowSearchDialog(true)}
                title="Nachrichten durchsuchen"
              >
                <Search className="h-4 w-4" />
              </Button>
              {unreadCount && unreadCount > 0 && (
                <Badge className="bg-gradient-to-r from-destructive to-destructive/80 text-destructive-foreground shadow-md">{unreadCount}</Badge>
              )}
            </div>
          </div>

          {/* Search - Premium Style */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Privaten Chat starten mit..."
              className="pl-9 h-10 rounded-xl bg-background/80 border-border/50 focus:bg-background transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowNewChatDialog(true)}
            />
          </div>
        </div>

        {/* Quick Actions - Premium Style */}
        <div className="p-3 border-b flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-10 rounded-xl hover:bg-primary/10 hover:border-primary/30 transition-all"
            onClick={() => setShowNewChatDialog(true)}
          >
            <User className="h-4 w-4 mr-2" />
            Direkt
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-10 rounded-xl hover:bg-primary/10 hover:border-primary/30 transition-all"
            onClick={() => setShowNewGroupDialog(true)}
          >
            <Users className="h-4 w-4 mr-2" />
            Gruppe
          </Button>
        </div>

        {/* Chat List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {rooms?.map((room) => (
              <button
                key={room.id}
                onClick={() => {
                  setSelectedRoomId(room.id);
                  setLocation(`/taps/${room.id}`);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                  selectedRoomId === room.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted"
                }`}
              >
                <div className="relative">
                  {room.type === "direct" ? (
                    <Avatar>
                      <AvatarImage src={getRoomAvatar(room) || undefined} />
                      <AvatarFallback>
                        {getInitials(getRoomDisplayName(room))}
                      </AvatarFallback>
                    </Avatar>
                  ) : room.type === "team" ? (
                    <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                      <Hash className="h-5 w-5 text-white" />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                  )}
                  {room.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                      {room.unreadCount > 9 ? "9+" : room.unreadCount}
                    </span>
                  )}
                  {/* Unread marker indicator (manually marked) */}
                  {roomsWithUnreadMarkers?.some(r => r.roomId === room.id) && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-amber-500 rounded-full border-2 border-background" title="Ungelesene Markierung" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium truncate">{getRoomDisplayName(room)}</p>
                    {room.lastMessage && (
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatMessageTime(new Date(room.lastMessage.createdAt))}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {room.lastMessage ? (
                      <>
                        {room.lastMessage.senderId === user?.id ? (
                          <span className="text-muted-foreground/70">Du: </span>
                        ) : room.type !== "direct" && (
                          <span className="text-muted-foreground/70">{room.lastMessage.senderName?.split(" ")[0]}: </span>
                        )}
                        {room.lastMessage.content.replace(/@\[.*?\]\(\d+\)/g, (match: string) => {
                          const nameMatch = match.match(/@\[(.*?)\]/);
                          return nameMatch ? `@${nameMatch[1]}` : match;
                        }).substring(0, 50)}
                      </>
                    ) : (
                      room.type === "direct"
                        ? "Direktnachricht"
                        : room.type === "team"
                        ? "Team-Chat"
                        : `${room.participants?.length || 0} Mitglieder`
                    )}
                  </p>
                </div>
              </button>
            ))}

            {(!rooms || rooms.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Noch keine Chats</p>
                <p className="text-sm">Starte einen neuen Chat!</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedRoomId && currentRoom ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                {currentRoom.type === "direct" ? (
                  <Avatar>
                    <AvatarImage
                      src={
                        currentRoom.participants?.find((p) => p.id !== user?.id)
                          ?.avatarUrl || undefined
                      }
                    />
                    <AvatarFallback>
                      {getInitials(
                        currentRoom.participants?.find((p) => p.id !== user?.id)
                          ?.name || ""
                      )}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div
                    className={`h-10 w-10 rounded-full ${
                      currentRoom.type === "team" ? "bg-blue-500" : "bg-purple-500"
                    } flex items-center justify-center`}
                  >
                    {currentRoom.type === "team" ? (
                      <Hash className="h-5 w-5 text-white" />
                    ) : (
                      <Users className="h-5 w-5 text-white" />
                    )}
                  </div>
                )}
                <div>
                  <h2 className="font-semibold">
                    {currentRoom.name ||
                      currentRoom.participants?.find((p) => p.id !== user?.id)?.name ||
                      "Chat"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {currentRoom.participants?.length || 0} Teilnehmer
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Room Search */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowRoomSearchDialog(true)}
                  title="In diesem Chat suchen"
                >
                  <Search className="h-4 w-4" />
                </Button>
                
                {/* Pinned Messages */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 relative"
                  onClick={() => setShowPinnedMessages(true)}
                  title="Angepinnte Nachrichten"
                >
                  <Pin className="h-4 w-4" />
                  {pinnedMessages && pinnedMessages.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                      {pinnedMessages.length}
                    </span>
                  )}
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-3xl mx-auto">
                {groupMessagesByDate(currentRoom.messages || []).map((group, groupIndex) => (
                  <div key={groupIndex}>
                    <DateSeparator date={group.date} />
                    <div className="space-y-3">
                      {group.messages.map((message) => {
                        const msgReactions = reactionsData?.[message.ohweee.id] || [];
                        const msgReplyCount = replyCountsData?.[message.ohweee.id] || 0;
                        const msgReadReceipts = readReceiptsData?.[message.ohweee.id] || [];
                        return (
                          <OhweeeMessage
                            key={message.ohweee.id}
                            message={message}
                            isOwn={message.sender.id === user?.id}
                            currentUserId={user?.id || 0}
                            reactions={msgReactions}
                            replyCount={msgReplyCount}
                            readReceipts={msgReadReceipts}
                            showReactionPicker={showReactionPicker === message.ohweee.id}
                            onToggleReactionPicker={() => {
                              setShowReactionPicker(
                                showReactionPicker === message.ohweee.id ? null : message.ohweee.id
                              );
                            }}
                            onAddReaction={(emoji) => {
                              addReaction.mutate({ ohweeeId: message.ohweee.id, emoji });
                            }}
                            onRemoveReaction={(emoji) => {
                              removeReaction.mutate({ ohweeeId: message.ohweee.id, emoji });
                            }}
                            onReply={() => {
                              setReplyingToId(message.ohweee.id);
                            }}
                            onShowThread={() => {
                              setThreadParentId(message.ohweee.id);
                              setShowThreadDialog(true);
                            }}
                            onEdit={() => {
                              setEditingMessageId(message.ohweee.id);
                              setEditContent(message.ohweee.content);
                            }}
                            onDelete={() => {
                              if (confirm("Nachricht wirklich löschen?")) {
                                deleteMessage.mutate({ id: message.ohweee.id });
                              }
                            }}
                            onTogglePin={() => {
                              togglePin.mutate({ id: message.ohweee.id });
                            }}
                            onPin={() => {
                              pinMessage.mutate({ ohweeeId: message.ohweee.id });
                            }}
                            onUnpin={() => {
                              unpinMessage.mutate({ ohweeeId: message.ohweee.id });
                            }}
                            isHighlighted={highlightedMessageId === message.ohweee.id}
                            isMarkedUnread={unreadMarkers?.includes(message.ohweee.id)}
                            onMarkAsUnread={() => {
                              markAsUnread.mutate({ ohweeeId: message.ohweee.id });
                            }}
                            onRemoveUnreadMarker={() => {
                              removeUnreadMarker.mutate({ ohweeeId: message.ohweee.id });
                            }}
                            deliveryStatus={messageStatusMap[message.ohweee.id]}
                            roomParticipantCount={currentRoom?.participants?.length}
                            onShowReadDetails={() => {
                              // Could open a dialog showing who read the message
                              toast.info("Lesedetails werden geladen...");
                            }}
                            onCreateTask={() => {
                              setTaskFromMessageId(message.ohweee.id);
                              setNewTaskTitle(message.ohweee.content.slice(0, 100));
                              setShowCreateTaskDialog(true);
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Typing Indicator */}
            {typingUsers && typingUsers.length > 0 && (
              <div className="px-4 py-2 text-sm text-muted-foreground animate-pulse">
                <span className="inline-flex items-center gap-1">
                  <span className="flex gap-0.5">
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                  <span className="ml-1">
                    {typingUsers.length === 1 
                      ? `${typingUsers[0].userName || 'Jemand'} schreibt...`
                      : typingUsers.length === 2
                        ? `${typingUsers[0].userName} und ${typingUsers[1].userName} schreiben...`
                        : `${typingUsers[0].userName} und ${typingUsers.length - 1} weitere schreiben...`
                    }
                  </span>
                </span>
              </div>
            )}

            {/* Message Input */}
            <div className="p-4 border-t">
              {editingMessageId && (
                <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                  <Pencil className="h-4 w-4" />
                  <span>Nachricht bearbeiten</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 ml-auto"
                    onClick={() => {
                      setEditingMessageId(null);
                      setEditContent("");
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* Pending Attachments Preview */}
              {pendingAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 max-w-3xl mx-auto">
                  {pendingAttachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="relative group bg-muted rounded-lg overflow-hidden"
                    >
                      {attachment.mimeType.startsWith("image/") ? (
                        <img
                          src={attachment.url}
                          alt={attachment.filename}
                          className="h-20 w-20 object-cover"
                        />
                      ) : (
                        <div className="h-20 w-20 flex flex-col items-center justify-center p-2">
                          <Paperclip className="h-6 w-6 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground truncate w-full text-center mt-1">
                            {attachment.filename.slice(0, 10)}...
                          </span>
                        </div>
                      )}
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveAttachment(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Progress */}
              {isUploading && (
                <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground max-w-3xl mx-auto">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  <span>Datei wird hochgeladen...</span>
                </div>
              )}

              {/* Voice Recorder */}
              {isRecordingVoice && (
                <div className="max-w-3xl mx-auto mb-2">
                  <VoiceRecorder
                    onRecordingComplete={async (blob, duration) => {
                      setIsRecordingVoice(false);
                      if (!selectedRoomId) return;

                      // Determine correct mimeType and extension (iOS uses audio/mp4, others use audio/webm)
                      const blobMimeType = blob.type || "audio/mp4";
                      const extension = blobMimeType.includes("webm") ? "webm" : "m4a";

                      // Upload the audio file
                      const formData = new FormData();
                      formData.append("file", blob, `voice-${Date.now()}.${extension}`);
                      
                      try {
                        const response = await fetch("/api/upload", {
                          method: "POST",
                          body: formData,
                        });
                        
                        if (response.ok) {
                          const { url, filename, mimeType, size } = await response.json();
                          
                          // Send as message with attachment
                          sendMessage.mutate({
                            roomId: selectedRoomId,
                            content: `🎙️ Sprachnachricht (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, "0")})`,
                            attachments: [{ url, filename, mimeType, size }],
                          });
                        } else {
                          toast.error("Fehler beim Hochladen der Sprachnachricht");
                        }
                      } catch (error) {
                        console.error("Upload error:", error);
                        toast.error("Fehler beim Hochladen der Sprachnachricht");
                      }
                    }}
                    onCancel={() => setIsRecordingVoice(false)}
                  />
                </div>
              )}

              <div className="flex gap-2 items-end max-w-3xl mx-auto">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.webm,.mp3,.wav,.ogg"
                />
                <div className="flex-1 relative">
                  {/* @Mention Suggestions Popup */}
                  {showMentionSuggestions && filteredMentionUsers.length > 0 && (
                    <div className="absolute bottom-full left-0 mb-2 w-64 bg-popover border rounded-lg shadow-lg z-50 overflow-hidden">
                      <div className="py-1">
                        {filteredMentionUsers.map((mentionUser, index) => (
                          <button
                            key={mentionUser.id}
                            className={`w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-muted transition-colors ${
                              index === selectedMentionIndex ? "bg-muted" : ""
                            }`}
                            onClick={() => handleMentionSelect(mentionUser)}
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={mentionUser.avatarUrl || undefined} />
                              <AvatarFallback className="text-xs">
                                {getInitials(mentionUser.name || mentionUser.email || "?")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {mentionUser.name || mentionUser.email}
                              </p>
                              {mentionUser.name && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {mentionUser.email}
                                </p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                      <div className="px-3 py-1.5 text-xs text-muted-foreground border-t bg-muted/50">
                        ↑↓ zum Navigieren, Enter zum Auswählen
                      </div>
                    </div>
                  )}
                  <Textarea
                    ref={textareaRef}
                    placeholder="Schreibe ein Tap... (@ für Erwähnung)"
                    value={editingMessageId ? editContent : messageInput}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    className="min-h-[44px] max-h-32 resize-none pr-20"
                    rows={1}
                  />
                  <div className="absolute right-2 bottom-2 flex gap-1">
                    <div className="relative">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => setShowInputEmojiPicker(!showInputEmojiPicker)}
                      >
                        <Smile className="h-4 w-4" />
                      </Button>
                      {showInputEmojiPicker && (
                        <div className="absolute bottom-full right-0 mb-2 z-50">
                          <EmojiPicker
                            onSelect={(emoji) => {
                              if (editingMessageId) {
                                setEditContent(prev => prev + emoji);
                              } else {
                                setMessageInput(prev => prev + emoji);
                              }
                              textareaRef.current?.focus();
                            }}
                            onClose={() => setShowInputEmojiPicker(false)}
                          />
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setIsRecordingVoice(true)}
                      disabled={isUploading || isRecordingVoice}
                      title="Sprachnachricht aufnehmen"
                    >
                      <Mic className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setShowCreateTaskDialog(true)}
                      title="Aufgabe erstellen"
                    >
                      <ListTodo className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={editingMessageId ? handleEditMessage : handleSendMessage}
                  disabled={
                    editingMessageId
                      ? !editContent.trim() || editMessage.isPending
                      : (!messageInput.trim() && pendingAttachments.length === 0) ||
                        sendMessage.isPending ||
                        isUploading
                  }
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <h2 className="text-xl font-medium mb-2">Willkommen bei Ohweees</h2>
              <p>Wähle einen Chat aus oder starte einen neuen</p>
            </div>
          </div>
        )}
      </div>

      {/* New Direct Chat Dialog */}
      <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Privaten Chat starten mit...</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <Input
              placeholder="Suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-4"
            />

            <div className="grid grid-cols-3 gap-4 max-h-64 overflow-y-auto">
              {allUsers
                ?.filter(
                  (u) =>
                    u.id !== user?.id &&
                    (searchQuery === "" ||
                      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
                )
                .slice(0, 12)
                .map((u) => (
                  <button
                    key={u.id}
                    onClick={() => startDM.mutate({ userId: u.id })}
                    className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={u.avatarUrl || undefined} />
                      <AvatarFallback>
                        {getInitials(u.name || u.email || "")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-center line-clamp-2">
                      {u.name || u.email}
                    </span>
                  </button>
                ))}
            </div>

            {allUsers && allUsers.length > 12 && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                Alle Ohweees anzeigen...
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* New Group Dialog */}
      <Dialog open={showNewGroupDialog} onOpenChange={setShowNewGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Gruppe erstellen</DialogTitle>
            <DialogDescription>
              Erstelle einen Gruppen-Chat mit mehreren Personen
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Gruppenname</label>
              <Input
                placeholder="z.B. Projekt Alpha"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mitglieder auswählen</label>
              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                {allUsers
                  ?.filter((u) => u.id !== user?.id)
                  .map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setSelectedUserIds((prev) =>
                          prev.includes(u.id)
                            ? prev.filter((id) => id !== u.id)
                            : [...prev, u.id]
                        );
                      }}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                        selectedUserIds.includes(u.id)
                          ? "bg-primary/10 ring-2 ring-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={u.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(u.name || u.email || "")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-center line-clamp-1">
                        {u.name?.split(" ")[0] || u.email}
                      </span>
                    </button>
                  ))}
              </div>
              {selectedUserIds.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {selectedUserIds.length} ausgewählt
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewGroupDialog(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={() =>
                createGroup.mutate({
                  name: groupName,
                  memberIds: selectedUserIds,
                })
              }
              disabled={!groupName.trim() || selectedUserIds.length === 0 || createGroup.isPending}
            >
              {createGroup.isPending ? "Erstelle..." : "Gruppe erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Thread Dialog */}
      <Dialog open={showThreadDialog} onOpenChange={setShowThreadDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Thread</DialogTitle>
            <DialogDescription>
              Antworten auf diese Nachricht
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {/* Parent message */}
            {threadParentId && currentRoom?.messages && (() => {
              const parentMsg = currentRoom.messages.find(
                (m) => m.ohweee.id === threadParentId
              );
              if (!parentMsg) return null;
              return (
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={parentMsg.sender.avatarUrl || undefined} />
                      <AvatarFallback>
                        {getInitials(parentMsg.sender.name || parentMsg.sender.email || "")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm">{parentMsg.sender.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(parentMsg.ohweee.createdAt), "dd.MM.yyyy HH:mm")}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{parentMsg.ohweee.content}</p>
                </div>
              );
            })()}

            <Separator />

            {/* Replies */}
            <div className="space-y-3">
              {threadReplies?.map((reply) => (
                <div
                  key={reply.ohweee.id}
                  className={`flex gap-3 ${reply.sender.id === user?.id ? "flex-row-reverse" : ""}`}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={reply.sender.avatarUrl || undefined} />
                    <AvatarFallback>
                      {getInitials(reply.sender.name || reply.sender.email || "")}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex flex-col ${reply.sender.id === user?.id ? "items-end" : "items-start"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{reply.sender.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(reply.ohweee.createdAt), "HH:mm")}
                      </span>
                    </div>
                    <div
                      className={`px-3 py-2 rounded-2xl max-w-[80%] ${
                        reply.sender.id === user?.id
                          ? "bg-amber-100 dark:bg-amber-900/30 rounded-br-md"
                          : "bg-muted rounded-bl-md"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{reply.ohweee.content}</p>
                    </div>
                  </div>
                </div>
              ))}
              {(!threadReplies || threadReplies.length === 0) && (
                <p className="text-center text-muted-foreground text-sm py-8">
                  Noch keine Antworten. Sei der Erste!
                </p>
              )}
            </div>
          </div>

          {/* Reply input */}
          <div className="border-t pt-4">
            <div className="flex gap-2">
              <Textarea
                placeholder="Antwort schreiben..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                className="min-h-[60px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (messageInput.trim() && threadParentId) {
                      sendMessage.mutate(
                        {
                          roomId: selectedRoomId!,
                          content: messageInput.trim(),
                          parentId: threadParentId,
                        },
                        {
                          onSuccess: () => {
                            setMessageInput("");
                            utils.ohweees.getReplies.invalidate({ parentId: threadParentId });
                            utils.ohweees.getReplyCountsBatch.invalidate();
                          },
                        }
                      );
                    }
                  }
                }}
              />
              <Button
                onClick={() => {
                  if (messageInput.trim() && threadParentId) {
                    sendMessage.mutate(
                      {
                        roomId: selectedRoomId!,
                        content: messageInput.trim(),
                        parentId: threadParentId,
                      },
                      {
                        onSuccess: () => {
                          setMessageInput("");
                          utils.ohweees.getReplies.invalidate({ parentId: threadParentId });
                          utils.ohweees.getReplyCountsBatch.invalidate();
                        },
                      }
                    );
                  }
                }}
                disabled={!messageInput.trim() || sendMessage.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Search Dialog */}
      <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Ohweees durchsuchen</DialogTitle>
            <DialogDescription>
              Suche nach Nachrichten in allen deinen Chats
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Suchbegriff eingeben..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
              />
              <Button onClick={handleSearch} disabled={isSearching || !searchInput.trim()}>
                {isSearching ? "Suche..." : "Suchen"}
              </Button>
            </div>

            <ScrollArea className="h-[400px]">
              {searchResults && searchResults.length > 0 ? (
                <div className="space-y-3">
                  {searchResults.map((result: { ohweee: { id: number; content: string; createdAt: Date }; sender: { id: number; name: string | null; avatarUrl: string | null }; room: { id: number; name: string | null; type: string } }) => (
                    <button
                      key={result.ohweee.id}
                      className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        setSelectedRoomId(result.room.id);
                        setShowSearchDialog(false);
                        setSearchInput("");
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={result.sender.avatarUrl || undefined} />
                          <AvatarFallback className="text-xs">
                            {(result.sender.name || "?")[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{result.sender.name}</span>
                        <span className="text-xs text-muted-foreground">
                          in {result.room.name || "Direktnachricht"}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {format(new Date(result.ohweee.createdAt), "dd.MM.yyyy HH:mm")}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {result.ohweee.content}
                      </p>
                    </button>
                  ))}
                </div>
              ) : searchResults && searchResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>Keine Ergebnisse für "{searchInput}"</p>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>Gib einen Suchbegriff ein</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Task Dialog */}
      <Dialog open={showCreateTaskDialog} onOpenChange={setShowCreateTaskDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Aufgabe erstellen</DialogTitle>
            <DialogDescription>
              Erstelle eine Aufgabe für diesen Chat.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Titel</label>
              <Input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Was soll erledigt werden?"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Beschreibung (optional)</label>
              <Textarea
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                placeholder="Weitere Details..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Priorität</label>
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as "low" | "medium" | "high")}
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="low">Niedrig</option>
                  <option value="medium">Mittel</option>
                  <option value="high">Hoch</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Zuweisen an (optional)</label>
                <select
                  value={newTaskAssigneeId || ""}
                  onChange={(e) => setNewTaskAssigneeId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Niemand</option>
                  {currentRoom?.participants?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name || p.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Fällig am (optional)</label>
                <Input
                  type="date"
                  value={newTaskDueDate.split("T")[0] || ""}
                  onChange={(e) => {
                    const time = newTaskDueDate.split("T")[1] || "";
                    setNewTaskDueDate(e.target.value + (time ? "T" + time : ""));
                  }}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Uhrzeit</label>
                <Input
                  type="time"
                  value={newTaskDueDate.split("T")[1] || ""}
                  onChange={(e) => {
                    const date = newTaskDueDate.split("T")[0] || "";
                    if (date) {
                      setNewTaskDueDate(date + "T" + e.target.value);
                    }
                  }}
                  className="mt-1"
                  disabled={!newTaskDueDate.split("T")[0]}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTaskDialog(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={() => {
                if (!newTaskTitle.trim() || !selectedRoomId) return;
                createTask.mutate({
                  roomId: selectedRoomId,
                  title: newTaskTitle.trim(),
                  description: newTaskDescription.trim() || undefined,
                  priority: newTaskPriority,
                  dueDate: newTaskDueDate ? new Date(newTaskDueDate) : undefined,
                  assigneeId: newTaskAssigneeId || undefined,
                  sourceOhweeeId: taskFromMessageId || undefined,
                });
              }}
              disabled={!newTaskTitle.trim() || createTask.isPending}
            >
              {createTask.isPending ? "Erstelle..." : "Erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tasks Panel Dialog */}
      <Dialog open={showTasksPanel} onOpenChange={setShowTasksPanel}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5" />
              Aufgaben
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2">
              {tasks && tasks.length > 0 ? (
                tasks.map((t) => (
                  <div
                    key={t.task.id}
                    className={`p-3 rounded-lg border ${t.task.isCompleted ? "bg-muted/50" : "bg-card"}`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleTask.mutate({ taskId: t.task.id })}
                        className="mt-0.5 shrink-0"
                      >
                        {t.task.isCompleted ? (
                          <CheckSquare className="h-5 w-5 text-green-500" />
                        ) : (
                          <Square className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${t.task.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                          {t.task.title}
                        </p>
                        {t.task.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {t.task.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                          {t.task.priority !== "medium" && (
                            <Badge variant={t.task.priority === "high" ? "destructive" : "secondary"}>
                              <Flag className="h-3 w-3 mr-1" />
                              {t.task.priority === "high" ? "Hoch" : "Niedrig"}
                            </Badge>
                          )}
                          {t.task.dueDate && (
                            <Badge variant="outline">
                              <Calendar className="h-3 w-3 mr-1" />
                              {format(new Date(t.task.dueDate), "dd.MM.yyyy")}
                            </Badge>
                          )}
                          {t.assignee && (
                            <Badge variant="outline">
                              <User className="h-3 w-3 mr-1" />
                              {t.assignee.name}
                            </Badge>
                          )}
                          <span className="text-muted-foreground">
                            von {t.creator.name}
                          </span>
                        </div>
                      </div>
                      {t.task.createdById === user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => {
                            if (confirm("Aufgabe wirklich löschen?")) {
                              deleteTask.mutate({ taskId: t.task.id });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ListTodo className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>Keine Aufgaben in diesem Chat</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setShowTasksPanel(false);
                      setShowCreateTaskDialog(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Aufgabe erstellen
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
          {tasks && tasks.length > 0 && (
            <DialogFooter>
              <Button
                onClick={() => {
                  setShowTasksPanel(false);
                  setShowCreateTaskDialog(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Neue Aufgabe
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Poll Dialog */}
      <Dialog open={showCreatePollDialog} onOpenChange={setShowCreatePollDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Umfrage erstellen
            </DialogTitle>
            <DialogDescription>
              Erstelle eine Umfrage für diesen Chat
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Frage</label>
              <Input
                placeholder="Was möchtest du fragen?"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Optionen</label>
              <div className="space-y-2 mt-1">
                {pollOptions.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...pollOptions];
                        newOptions[index] = e.target.value;
                        setPollOptions(newOptions);
                      }}
                    />
                    {pollOptions.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setPollOptions(pollOptions.filter((_, i) => i !== index));
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 10 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPollOptions([...pollOptions, ""])}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Option hinzufügen
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={pollAllowMultiple}
                  onChange={(e) => setPollAllowMultiple(e.target.checked)}
                  className="rounded"
                />
                Mehrfachauswahl
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={pollIsAnonymous}
                  onChange={(e) => setPollIsAnonymous(e.target.checked)}
                  className="rounded"
                />
                Anonym
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreatePollDialog(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={() => {
                if (!pollQuestion.trim()) {
                  toast.error("Bitte gib eine Frage ein");
                  return;
                }
                const validOptions = pollOptions.filter(o => o.trim());
                if (validOptions.length < 2) {
                  toast.error("Mindestens 2 Optionen erforderlich");
                  return;
                }
                if (!selectedRoomId) return;
                
                createPoll.mutate({
                  roomId: selectedRoomId,
                  question: pollQuestion.trim(),
                  options: validOptions,
                  allowMultiple: pollAllowMultiple,
                  isAnonymous: pollIsAnonymous,
                });
              }}
              disabled={createPoll.isPending}
            >
              {createPoll.isPending ? "Erstelle..." : "Umfrage erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Room Search Dialog */}
      <Dialog open={showRoomSearchDialog} onOpenChange={(open) => {
        setShowRoomSearchDialog(open);
        if (!open) {
          setRoomSearchInput("");
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>In diesem Chat suchen</DialogTitle>
            <DialogDescription>
              Suche nach Nachrichten in diesem Raum
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Suchbegriff eingeben..."
                value={roomSearchInput}
                onChange={(e) => setRoomSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRoomSearch();
                }}
              />
              <Button onClick={handleRoomSearch} disabled={isRoomSearching || !roomSearchInput.trim()}>
                {isRoomSearching ? "Suche..." : "Suchen"}
              </Button>
            </div>

            <ScrollArea className="h-[400px]">
              {roomSearchResults && roomSearchResults.length > 0 ? (
                <div className="space-y-3">
                  {roomSearchResults.map((result) => (
                    <button
                      key={result.id}
                      className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        setShowRoomSearchDialog(false);
                        setRoomSearchInput("");
                        setHighlightedMessageId(result.id);
                        // Scroll to message
                        setTimeout(() => {
                          const element = document.getElementById(`message-${result.id}`);
                          if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                          }
                          // Remove highlight after 3 seconds
                          setTimeout(() => setHighlightedMessageId(null), 3000);
                        }, 100);
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={result.senderAvatar || undefined} />
                          <AvatarFallback className="text-xs">
                            {(result.senderName || "?")[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{result.senderName}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {format(new Date(result.createdAt), "dd.MM.yyyy HH:mm")}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {result.content.split(new RegExp(`(${roomSearchInput})`, 'gi')).map((part, i) => 
                          part.toLowerCase() === roomSearchInput.toLowerCase() 
                            ? <mark key={i} className="bg-amber-200 dark:bg-amber-800 px-0.5 rounded">{part}</mark>
                            : part
                        )}
                      </p>
                    </button>
                  ))}
                </div>
              ) : roomSearchResults && roomSearchResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>Keine Ergebnisse für "{roomSearchInput}"</p>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>Gib einen Suchbegriff ein</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pinned Messages Dialog */}
      <Dialog open={showPinnedMessages} onOpenChange={setShowPinnedMessages}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pin className="h-5 w-5" />
              Angepinnte Nachrichten
            </DialogTitle>
            <DialogDescription>
              {pinnedMessages?.length || 0} Nachricht{pinnedMessages?.length !== 1 ? "en" : ""} angepinnt
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[400px] py-4">
            {pinnedMessages && pinnedMessages.length > 0 ? (
              <div className="space-y-3">
                {pinnedMessages.map((pinned) => (
                  <div
                    key={pinned.ohweee.id}
                    className="p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={pinned.sender.avatarUrl || undefined} />
                          <AvatarFallback className="text-xs">
                            {(pinned.sender.name || "?")[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{pinned.sender.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(pinned.ohweee.createdAt), "dd.MM.yyyy HH:mm")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowPinnedMessages(false);
                            setHighlightedMessageId(pinned.ohweee.id);
                            setTimeout(() => {
                              const element = document.getElementById(`message-${pinned.ohweee.id}`);
                              if (element) {
                                element.scrollIntoView({ behavior: "smooth", block: "center" });
                              }
                              setTimeout(() => setHighlightedMessageId(null), 3000);
                            }, 100);
                          }}
                        >
                          Zur Nachricht
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            unpinMessage.mutate({ ohweeeId: pinned.ohweee.id });
                          }}
                          title="Loslösen"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {pinned.ohweee.content}
                    </p>
                    {pinned.pinnedBy && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Angepinnt von {pinned.pinnedBy.name}
                        {pinned.ohweee.pinnedAt && ` am ${format(new Date(pinned.ohweee.pinnedAt), "dd.MM.yyyy")}`}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Pin className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>Keine angepinnten Nachrichten</p>
                <p className="text-xs mt-1">Klicke auf das Menü einer Nachricht um sie anzupinnen</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
