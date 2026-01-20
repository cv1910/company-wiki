import { useState, useEffect, useRef } from "react";
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
import { toast } from "sonner";
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
} from "lucide-react";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { de } from "date-fns/locale";

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
function OhweeeMessage({
  message,
  isOwn,
  onReply,
  onEdit,
  onDelete,
  onTogglePin,
  currentUserId,
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
  currentUserId: number;
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

  return (
    <div className={`flex gap-3 group ${isOwn ? "flex-row-reverse" : ""}`}>
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
            <p className="whitespace-pre-wrap break-words">{message.ohweee.content}</p>
            {message.ohweee.isEdited && (
              <span className="text-xs text-muted-foreground ml-1">(bearbeitet)</span>
            )}
          </div>

          {/* Actions */}
          <div
            className={`absolute top-0 ${
              isOwn ? "left-0 -translate-x-full pr-2" : "right-0 translate-x-full pl-2"
            } opacity-0 group-hover:opacity-100 transition-opacity`}
          >
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
                <DropdownMenuItem onClick={onTogglePin}>
                  <Pin className="h-4 w-4 mr-2" />
                  {message.ohweee.isPinned ? "Lösen" : "Anpinnen"}
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
        </div>

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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: rooms, isLoading: roomsLoading } = trpc.ohweees.rooms.useQuery();
  const { data: currentRoom } = trpc.ohweees.getRoom.useQuery(
    { id: selectedRoomId! },
    { enabled: !!selectedRoomId, refetchInterval: 3000 }
  );
  const { data: allUsers } = trpc.ohweees.getUsers.useQuery();
  const { data: unreadCount } = trpc.ohweees.unreadCount.useQuery(undefined, {
    refetchInterval: 10000,
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
      setLocation(`/ohweees/${room.id}`);
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
      setLocation(`/ohweees/${room.id}`);
      setShowNewGroupDialog(false);
      setGroupName("");
      setSelectedUserIds([]);
      utils.ohweees.rooms.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentRoom?.messages]);

  // Update URL when room changes
  useEffect(() => {
    if (selectedRoomId && !roomId) {
      setLocation(`/ohweees/${selectedRoomId}`, { replace: true });
    }
  }, [selectedRoomId, roomId, setLocation]);

  // Set initial room from URL
  useEffect(() => {
    if (roomId) {
      setSelectedRoomId(parseInt(roomId));
    }
  }, [roomId]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedRoomId) return;
    sendMessage.mutate({
      roomId: selectedRoomId,
      content: messageInput.trim(),
    });
  };

  const handleEditMessage = () => {
    if (!editContent.trim() || !editingMessageId) return;
    editMessage.mutate({
      id: editingMessageId,
      content: editContent.trim(),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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

  if (roomsLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] -m-6">
      {/* Sidebar - Chat List */}
      <div className="w-80 border-r bg-muted/30 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-semibold">Ohweees</h1>
            {unreadCount && unreadCount > 0 && (
              <Badge variant="destructive">{unreadCount}</Badge>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Privaten Chat starten mit..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowNewChatDialog(true)}
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-2 border-b flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => setShowNewChatDialog(true)}
          >
            <User className="h-4 w-4 mr-2" />
            Direkt
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
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
                  setLocation(`/ohweees/${room.id}`);
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
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{getRoomDisplayName(room)}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {room.type === "direct"
                      ? "Direktnachricht"
                      : room.type === "team"
                      ? "Team-Chat"
                      : `${room.participants?.length || 0} Mitglieder`}
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

              {/* Pinned Messages */}
              {currentRoom.pinnedMessages && currentRoom.pinnedMessages.length > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Pin className="h-3 w-3" />
                  {currentRoom.pinnedMessages.length} angepinnt
                </Badge>
              )}
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-3xl mx-auto">
                {groupMessagesByDate(currentRoom.messages || []).map((group, groupIndex) => (
                  <div key={groupIndex}>
                    <DateSeparator date={group.date} />
                    <div className="space-y-3">
                      {group.messages.map((message) => (
                        <OhweeeMessage
                          key={message.ohweee.id}
                          message={message}
                          isOwn={message.sender.id === user?.id}
                          currentUserId={user?.id || 0}
                          onReply={() => {
                            // TODO: Implement reply
                            toast.info("Antworten kommt bald!");
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
                        />
                      ))}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

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
              <div className="flex gap-2 items-end max-w-3xl mx-auto">
                <div className="flex-1 relative">
                  <Textarea
                    placeholder="Schreibe ein Ohweee..."
                    value={editingMessageId ? editContent : messageInput}
                    onChange={(e) =>
                      editingMessageId
                        ? setEditContent(e.target.value)
                        : setMessageInput(e.target.value)
                    }
                    onKeyDown={handleKeyDown}
                    className="min-h-[44px] max-h-32 resize-none pr-20"
                    rows={1}
                  />
                  <div className="absolute right-2 bottom-2 flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Smile className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={editingMessageId ? handleEditMessage : handleSendMessage}
                  disabled={
                    editingMessageId
                      ? !editContent.trim() || editMessage.isPending
                      : !messageInput.trim() || sendMessage.isPending
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
    </div>
  );
}
