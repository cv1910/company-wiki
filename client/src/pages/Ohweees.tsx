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
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Minimal Test</h1>
      <p>Wenn dieser Text ohne Fehler erscheint, liegt das Problem in den Ohweees-Hooks/Queries.</p>
    </div>
  );
}
