import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageCircle,
  Send,
  Users,
  Hash,
} from "lucide-react";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { de } from "date-fns/locale";
import {
  MobileChatInput,
  MobileChatHeader,
  MobileRoomListItem,
  MobileAvatarBar,
  MobileDateSeparator,
  MobileMessage,
} from "@/components/MobileChatView";

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

  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(
    roomId ? parseInt(roomId) : null
  );
  const [messageInput, setMessageInput] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [activeMessageMenu, setActiveMessageMenu] = useState<number | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<{id: number, senderName: string, content: string} | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isMobile && selectedRoomId) setMobileView("chat");
  }, [isMobile, selectedRoomId]);

  // iOS overscroll prevention
  useEffect(() => {
    if (!isMobile) return;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.height = "100%";
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.height = "";
    };
  }, [isMobile]);

  // Queries
  const { data: rooms, isLoading: roomsLoading } = trpc.ohweees.rooms.useQuery();
  const { data: currentRoom } = trpc.ohweees.getRoom.useQuery(
    { id: selectedRoomId! },
    { enabled: !!selectedRoomId }
  );

  const messageIds = useMemo(
    () => currentRoom?.messages?.map((m) => m.ohweee.id) || [],
    [currentRoom?.messages]
  );

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

  const togglePin = trpc.ohweees.togglePin.useMutation({
    onSuccess: () => utils.ohweees.getRoom.invalidate({ id: selectedRoomId! }),
  });

  const addReaction = trpc.ohweees.addReaction.useMutation({
    onSuccess: () => utils.ohweees.getReactionsBatch.invalidate(),
  });

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedRoomId) return;
    sendMessage.mutate({
      roomId: selectedRoomId,
      content: messageInput.trim(),
      parentId: replyToMessage?.id,
    });
  };

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const getRoomDisplayName = (room: NonNullable<typeof rooms>[0]) => {
    if (room.name) return room.name;
    if (room.type === "direct" && room.participants) {
      const otherUser = room.participants.find((p) => p.id !== user?.id);
      return otherUser?.name || otherUser?.email || "Direktnachricht";
    }
    return "Chat";
  };

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
        <div className="flex flex-col h-[calc(100dvh-56px)] overflow-hidden bg-white dark:bg-gray-900">
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
            onRoomSelect={(roomId) => setSelectedRoomId(roomId)}
            onNewChat={() => {}}
          />
          <div className="flex-1 overflow-y-auto" data-scrollable="true">
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

    if (!currentRoom) {
      return (
        <div className="flex items-center justify-center h-[calc(100dvh-56px-56px)]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-[calc(100dvh-56px-56px)] overflow-hidden bg-[#FAFAF8] dark:bg-gray-900">
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

        <div className="flex-1 overflow-y-auto p-2" data-scrollable="true">
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
          <div ref={messagesEndRef} />
        </div>

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
