import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { de } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send } from "lucide-react";
import {
  MobileChatHeader,
  MobileChatInput,
  MobileRoomListItem,
  MobileAvatarBar,
  MobileDateSeparator,
  MobileMessage,
} from "@/components/MobileChatView";

// Desktop date separator
function DateSeparator({ date }: { date: Date }) {
  let label = format(date, "EEEE, d. MMMM", { locale: de });
  if (isToday(date)) label = "Heute";
  else if (isYesterday(date)) label = "Gestern";

  return (
    <div className="flex items-center justify-center my-4">
      <div className="bg-amber-500 text-white text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}

export default function OhweeesPage() {
  const { roomId } = useParams<{ roomId?: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(
    roomId ? parseInt(roomId) : null
  );
  const [messageInput, setMessageInput] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [replyToMessage, setReplyToMessage] = useState<{id: number, senderName: string, content: string} | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskAssignee, setTaskAssignee] = useState<number | null>(null);
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskDueTime, setTaskDueTime] = useState("");
  const [taskAttachment, setTaskAttachment] = useState<{url: string, name: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const taskFileInputRef = useRef<HTMLInputElement>(null);

  // Resize handler
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Switch to chat view when room selected on mobile
  useEffect(() => {
    if (isMobile && selectedRoomId) {
      setMobileView("chat");
    }
  }, [isMobile, selectedRoomId]);

  // iOS overscroll prevention - touch event based
  useEffect(() => {
    if (!isMobile) return;

    let startY = 0;
    let startX = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Find if we're inside a scrollable container
      const target = e.target as HTMLElement;
      const scrollable = target.closest('[data-scrollable="true"]') as HTMLElement;

      // If not in scrollable area, prevent all scroll
      if (!scrollable) {
        e.preventDefault();
        return;
      }

      const deltaY = e.touches[0].clientY - startY;
      const deltaX = e.touches[0].clientX - startX;

      // If horizontal swipe, allow it
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = scrollable;
      const atTop = scrollTop <= 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1;

      // Prevent overscroll at boundaries
      if ((atTop && deltaY > 0) || (atBottom && deltaY < 0)) {
        e.preventDefault();
      }
    };

    // Must be non-passive to allow preventDefault
    document.addEventListener("touchstart", handleTouchStart, { passive: false });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
    };
  }, [isMobile]);

  // Queries - NO refetchInterval
  const { data: rooms, isLoading: roomsLoading } = trpc.ohweees.rooms.useQuery();
  const { data: allUsers } = trpc.users.list.useQuery();

  const { data: currentRoom } = trpc.ohweees.getRoom.useQuery(
    { id: selectedRoomId! },
    { enabled: !!selectedRoomId }
  );

  // Get message IDs for reactions query
  const messageIds = useMemo(
    () => currentRoom?.messages?.map((m) => m.ohweee.id) || [],
    [currentRoom?.messages]
  );

  // Reactions query
  const { data: reactionsData } = trpc.ohweees.getReactionsBatch.useQuery(
    { ohweeeIds: messageIds },
    { enabled: messageIds.length > 0 }
  );

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentRoom?.messages]);

  // Mutations
  const sendMessage = trpc.ohweees.send.useMutation({
    onSuccess: () => {
      utils.ohweees.getRoom.invalidate({ id: selectedRoomId! });
      utils.ohweees.rooms.invalidate();
      setMessageInput("");
      setReplyToMessage(null);
    },
  });

  const deleteMessage = trpc.ohweees.delete.useMutation({
    onSuccess: () => utils.ohweees.getRoom.invalidate({ id: selectedRoomId! }),
  });

  const editMessage = trpc.ohweees.edit.useMutation({
    onSuccess: () => {
      utils.ohweees.getRoom.invalidate({ id: selectedRoomId! });
      setEditingMessageId(null);
      setMessageInput("");
    },
  });

  const togglePin = trpc.ohweees.togglePin.useMutation({
    onSuccess: () => utils.ohweees.getRoom.invalidate({ id: selectedRoomId! }),
  });

  const addReaction = trpc.ohweees.addReaction.useMutation({
    onSuccess: () => utils.ohweees.getReactionsBatch.invalidate(),
  });

  const uploadFile = trpc.ohweees.uploadFile.useMutation();

  // Handle voice message
  const handleSendVoice = async (blob: Blob, duration: number) => {
    if (!selectedRoomId) return;

    // Convert blob to base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      const filename = `voice-${Date.now()}.webm`;

      uploadFile.mutate(
        {
          filename,
          mimeType: blob.type || "audio/webm",
          base64Data: base64,
        },
        {
          onSuccess: (data) => {
            // Send message with voice attachment
            sendMessage.mutate({
              roomId: selectedRoomId,
              content: `🎤 Sprachnachricht (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, "0")})`,
              attachments: [{ url: data.url, mimeType: blob.type || "audio/webm" }],
            });
          },
        }
      );
    };
    reader.readAsDataURL(blob);
  };

  // Task creation mutation
  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      resetTaskDialog();
      utils.tasks.list.invalidate();
    },
  });

  // Reset task dialog state
  const resetTaskDialog = () => {
    setShowTaskDialog(false);
    setTaskTitle("");
    setTaskDescription("");
    setTaskAssignee(null);
    setTaskDueDate("");
    setTaskDueTime("");
    setTaskAttachment(null);
  };

  // Handle task creation - show dialog
  const handleCreateTask = () => {
    setShowTaskDialog(true);
  };

  // Handle task attachment
  const handleTaskAttachment = () => {
    taskFileInputRef.current?.click();
  };

  const handleTaskFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadFile.mutate(
        {
          filename: file.name,
          mimeType: file.type,
          base64Data: base64,
        },
        {
          onSuccess: (data) => {
            setTaskAttachment({ url: data.url, name: file.name });
          },
        }
      );
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Submit task from dialog
  const handleSubmitTask = () => {
    if (!taskTitle.trim()) return;

    let dueDate: Date | null = null;
    if (taskDueDate) {
      dueDate = new Date(taskDueDate);
      if (taskDueTime) {
        const [hours, minutes] = taskDueTime.split(":").map(Number);
        dueDate.setHours(hours, minutes, 0, 0);
      }
    }

    createTask.mutate({
      title: taskTitle.trim(),
      description: taskDescription.trim() || undefined,
      assignedToId: taskAssignee,
      dueDate: dueDate,
    });
  };

  // Handle file attachment
  const handleAttach = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRoomId) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadFile.mutate(
        {
          filename: file.name,
          mimeType: file.type,
          base64Data: base64,
        },
        {
          onSuccess: (data) => {
            sendMessage.mutate({
              roomId: selectedRoomId,
              content: file.type.startsWith("image/") ? `📷 Bild` : `📎 ${file.name}`,
              attachments: [{ url: data.url, mimeType: file.type }],
            });
          },
        }
      );
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedRoomId) return;

    if (editingMessageId) {
      editMessage.mutate({
        id: editingMessageId,
        content: messageInput.trim(),
      });
      return;
    }

    sendMessage.mutate({
      roomId: selectedRoomId,
      content: messageInput.trim(),
      parentId: replyToMessage?.id,
    });
  };

  if (roomsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Mobile View
  if (isMobile) {
    // Room list
    if (mobileView === "list") {
      return (
        <div className="flex flex-col overflow-hidden bg-white dark:bg-gray-900 touch-none" style={{ height: 'calc(100dvh - 56px - 56px - env(safe-area-inset-bottom, 0px))' }}>
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h1 className="text-xl font-bold">Ohweees</h1>
          </div>
          <MobileAvatarBar
            rooms={rooms?.map(r => ({
              id: r.id,
              name: r.name,
              type: r.type as "direct" | "group" | "team",
              participants: r.participants?.map(p => ({ id: p.id, name: p.name, avatarUrl: p.avatarUrl })),
              unreadCount: r.unreadCount,
              lastMessage: r.lastMessage ? { content: r.lastMessage.content, createdAt: r.lastMessage.createdAt, senderId: r.lastMessage.senderId, senderName: r.lastMessage.senderName } : undefined,
            })) || []}
            currentUserId={user?.id || 0}
            onRoomSelect={(id) => setSelectedRoomId(id)}
            onNewChat={() => {}}
          />
          <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y" data-scrollable="true">
            {rooms?.map((room) => (
              <MobileRoomListItem
                key={room.id}
                room={{
                  id: room.id,
                  name: room.name,
                  type: room.type as "direct" | "group" | "team",
                  participants: room.participants?.map(p => ({ id: p.id, name: p.name, avatarUrl: p.avatarUrl })),
                  unreadCount: room.unreadCount,
                  lastMessage: room.lastMessage ? { content: room.lastMessage.content, createdAt: room.lastMessage.createdAt, senderId: room.lastMessage.senderId, senderName: room.lastMessage.senderName } : undefined,
                }}
                currentUserId={user?.id || 0}
                onSelect={() => setSelectedRoomId(room.id)}
              />
            ))}
          </div>
        </div>
      );
    }

    // Chat view
    if (!currentRoom) {
      return (
        <div className="flex items-center justify-center" style={{ height: 'calc(100dvh - 56px - 56px - env(safe-area-inset-bottom, 0px))' }}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    return (
      <>
        <MobileChatHeader
          room={{
            id: currentRoom.id,
            name: currentRoom.name,
            type: currentRoom.type as "direct" | "group" | "team",
            participants: currentRoom.participants?.map(p => ({ id: p.id, name: p.name, avatarUrl: p.avatarUrl })),
            unreadCount: 0,
          }}
          currentUserId={user?.id || 0}
          onBack={() => setMobileView("list")}
        />

        <div
          className="fixed left-0 right-0 overflow-y-auto overscroll-contain touch-pan-y p-2 bg-[#FAFAF8] dark:bg-gray-900"
          style={{
            top: '112px',
            bottom: 'calc(56px + 60px + env(safe-area-inset-bottom, 0px))'
          }}
          data-scrollable="true"
        >
          {currentRoom?.messages?.map((message, index) => {
            const prevMessage = currentRoom.messages?.[index - 1];
            const showDateSeparator = !prevMessage ||
              !isSameDay(new Date(message.ohweee.createdAt), new Date(prevMessage.ohweee.createdAt));
            const isOwn = message.sender.id === user?.id;

            return (
              <div key={message.ohweee.id}>
                {showDateSeparator && (
                  <MobileDateSeparator date={new Date(message.ohweee.createdAt)} />
                )}
                <MobileMessage
                  message={message}
                  isOwn={isOwn}
                  currentUserId={user?.id || 0}
                  reactions={reactionsData?.[message.ohweee.id] || []}
                  onReply={() => {
                    setReplyToMessage({
                      id: message.ohweee.id,
                      senderName: message.sender.name || "Unbekannt",
                      content: message.ohweee.content,
                    });
                  }}
                  onEdit={() => {
                    setEditingMessageId(message.ohweee.id);
                    setMessageInput(message.ohweee.content);
                  }}
                  onDelete={() => {
                    deleteMessage.mutate({ id: message.ohweee.id });
                  }}
                  onPin={() => {
                    togglePin.mutate({ id: message.ohweee.id });
                  }}
                  onAddReaction={(emoji) => {
                    addReaction.mutate({ ohweeeId: message.ohweee.id, emoji });
                  }}
                />
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Fixed input above bottom nav */}
        <div className="fixed left-0 right-0 bg-white dark:bg-gray-900 z-40" style={{ bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))' }}>
          <MobileChatInput
            value={messageInput}
            onChange={setMessageInput}
            onSend={handleSendMessage}
            onSendVoice={handleSendVoice}
            onAttach={handleAttach}
            onCreateTask={handleCreateTask}
            replyTo={replyToMessage}
            onCancelReply={() => setReplyToMessage(null)}
            isEditing={!!editingMessageId}
            onCancelEdit={() => {
              setEditingMessageId(null);
              setMessageInput("");
            }}
          />
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Hidden task file input */}
        <input
          ref={taskFileInputRef}
          type="file"
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
          className="hidden"
          onChange={handleTaskFileChange}
        />

        {/* Task Creation Dialog */}
        {showTaskDialog && (
          <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={resetTaskDialog} />
            <div className="fixed inset-x-0 bottom-0 bg-white dark:bg-gray-800 rounded-t-3xl z-50 shadow-xl max-h-[85vh] overflow-y-auto" data-scrollable="true">
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
              </div>

              <div className="px-5 pb-6">
                <h3 className="text-lg font-semibold mb-5">Neue Aufgabe</h3>

                {/* Title */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">Titel</label>
                  <input
                    type="text"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="Was muss erledigt werden?"
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-base"
                    autoFocus
                  />
                </div>

                {/* Description */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">Beschreibung</label>
                  <textarea
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    placeholder="Details zur Aufgabe..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-base resize-none"
                  />
                </div>

                {/* Assignee */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">Zuweisen an</label>
                  <select
                    value={taskAssignee || ""}
                    onChange={(e) => setTaskAssignee(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-base appearance-none"
                  >
                    <option value="">Nicht zugewiesen</option>
                    {allUsers?.map((u) => (
                      <option key={u.id} value={u.id}>{u.name || u.email}</option>
                    ))}
                  </select>
                </div>

                {/* Due Date & Time */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">Fällig am</label>
                    <input
                      type="date"
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">Uhrzeit</label>
                    <input
                      type="time"
                      value={taskDueTime}
                      onChange={(e) => setTaskDueTime(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-base"
                    />
                  </div>
                </div>

                {/* Attachment */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">Anhang</label>
                  {taskAttachment ? (
                    <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                      <span className="flex-1 text-sm truncate">{taskAttachment.name}</span>
                      <button
                        onClick={() => setTaskAttachment(null)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleTaskAttachment}
                      disabled={uploadFile.isPending}
                      className="w-full px-4 py-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 text-sm"
                    >
                      {uploadFile.isPending ? "Wird hochgeladen..." : "+ Datei hinzufügen"}
                    </button>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={resetTaskDialog}
                    className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-medium"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleSubmitTask}
                    disabled={!taskTitle.trim() || createTask.isPending}
                    className="flex-1 py-3 rounded-xl bg-rose-500 text-white font-medium disabled:opacity-50"
                  >
                    {createTask.isPending ? "..." : "Erstellen"}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  // Helper functions
  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const getRoomDisplayName = (room: NonNullable<typeof rooms>[0]) => {
    if (room.name) return room.name;
    if (room.type === "direct" && room.participants) {
      const otherUser = room.participants.find((p) => p.id !== user?.id);
      return otherUser?.name || otherUser?.email || "Direktnachricht";
    }
    return "Chat";
  };

  // Desktop View
  return (
    <div className="flex h-[calc(100vh-120px)] -m-6">
      {/* Sidebar */}
      <div className="w-80 border-r bg-muted/20 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold">Ohweees</h1>
          </div>
        </div>

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
                  selectedRoomId === room.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                }`}
              >
                <Avatar>
                  <AvatarFallback>{getInitials(getRoomDisplayName(room))}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{getRoomDisplayName(room)}</p>
                  {room.lastMessage && (
                    <p className="text-sm text-muted-foreground truncate">{room.lastMessage.content}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col">
        {selectedRoomId && currentRoom ? (
          <>
            <div className="p-4 border-b">
              <h2 className="font-semibold">{getRoomDisplayName(currentRoom as any)}</h2>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-3xl mx-auto">
                {currentRoom.messages?.map((message, index) => {
                  const prevMessage = currentRoom.messages?.[index - 1];
                  const showDateSeparator = !prevMessage ||
                    !isSameDay(new Date(message.ohweee.createdAt), new Date(prevMessage.ohweee.createdAt));
                  const isOwn = message.sender.id === user?.id;

                  return (
                    <div key={message.ohweee.id}>
                      {showDateSeparator && <DateSeparator date={new Date(message.ohweee.createdAt)} />}
                      <div className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={message.sender.avatarUrl || undefined} />
                          <AvatarFallback>{getInitials(message.sender.name || "")}</AvatarFallback>
                        </Avatar>
                        <div className={`max-w-[70%] ${isOwn ? "text-right" : ""}`}>
                          <div className={`inline-block px-4 py-2 rounded-2xl ${
                            isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                          }`}>
                            {message.ohweee.content}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {format(new Date(message.ohweee.createdAt), "HH:mm")}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-4 border-t">
              <div className="flex gap-2 max-w-3xl mx-auto">
                <Textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Nachricht schreiben..."
                  className="flex-1 min-h-[44px] max-h-32 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button onClick={handleSendMessage} disabled={!messageInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Wähle einen Chat aus</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
