import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { format, isSameDay } from "date-fns";
import {
  MobileChatHeader,
  MobileChatInput,
  MobileRoomListItem,
  MobileAvatarBar,
  MobileDateSeparator,
  MobileMessage,
} from "@/components/MobileChatView";

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

  // Queries - NO refetchInterval
  const { data: rooms, isLoading: roomsLoading } = trpc.ohweees.rooms.useQuery();

  const { data: currentRoom } = trpc.ohweees.getRoom.useQuery(
    { id: selectedRoomId! },
    { enabled: !!selectedRoomId }
  );

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentRoom?.messages]);

  // Send message mutation
  const sendMessage = trpc.ohweees.send.useMutation({
    onSuccess: () => {
      utils.ohweees.getRoom.invalidate({ id: selectedRoomId! });
      utils.ohweees.rooms.invalidate();
      setMessageInput("");
    },
  });

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedRoomId) return;
    sendMessage.mutate({
      roomId: selectedRoomId,
      content: messageInput.trim(),
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
        <div className="flex flex-col h-[calc(100dvh-56px-56px)] overflow-hidden bg-white dark:bg-gray-900">
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

    // Chat view
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

            return (
              <div key={message.ohweee.id}>
                {showDateSeparator && (
                  <MobileDateSeparator date={new Date(message.ohweee.createdAt)} />
                )}
                <MobileMessage
                  message={message}
                  isOwn={isOwn}
                  currentUserId={user?.id || 0}
                  reactions={[]}
                  onReply={() => {}}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  onPin={() => {}}
                  onAddReaction={() => {}}
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
        />
      </div>
    );
  }

  // Desktop - minimal
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Ohweees (Desktop)</h1>
      <p>Räume: {rooms?.length || 0}</p>
      <p>Ausgewählt: {selectedRoomId || "Keiner"}</p>
    </div>
  );
}
