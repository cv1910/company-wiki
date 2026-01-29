import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  MobileChatInput,
  MobileRoomListItem,
  MobileAvatarBar,
  MobileDateSeparator,
  MobileMessage,
} from "@/components/MobileChatView";
import { isSameDay } from "date-fns";

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

  const scrollRef = useRef<HTMLDivElement>(null);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isMobile && selectedRoomId) {
      setMobileView("chat");
    }
  }, [isMobile, selectedRoomId]);

  // Prevent iOS Safari overscroll/bounce effect on mobile
  useEffect(() => {
    if (!isMobile) return;

    const findScrollable = (target: HTMLElement): HTMLElement | null => {
      return target.closest('[data-scrollable="true"], [data-radix-scroll-area-viewport]') as HTMLElement | null;
    };

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

  // Queries
  const { data: rooms } = trpc.ohweees.rooms.useQuery();
  const { data: currentRoom } = trpc.ohweees.getRoom.useQuery(
    { roomId: selectedRoomId! },
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

  const { data: readReceiptsData } = trpc.ohweees.getReadReceiptsBatch.useQuery(
    { ohweeeIds: messageIds },
    { enabled: messageIds.length > 0 }
  );

  // Mutations
  const sendMessage = trpc.ohweees.send.useMutation({
    onSuccess: () => {
      utils.ohweees.getRoom.invalidate({ roomId: selectedRoomId! });
      setMessageInput("");
      setReplyToMessage(null);
    },
  });

  const deleteMessage = trpc.ohweees.delete.useMutation({
    onSuccess: () => {
      utils.ohweees.getRoom.invalidate({ roomId: selectedRoomId! });
    },
  });

  const togglePin = trpc.ohweees.togglePin.useMutation({
    onSuccess: () => {
      utils.ohweees.getRoom.invalidate({ roomId: selectedRoomId! });
    },
  });

  const addReaction = trpc.ohweees.addReaction.useMutation({
    onSuccess: () => {
      utils.ohweees.getReactionsBatch.invalidate();
    },
  });

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedRoomId) return;
    sendMessage.mutate({
      roomId: selectedRoomId,
      content: messageInput.trim(),
      parentId: replyToMessage?.id,
    });
  };

  if (isMobile) {
    if (mobileView === "list") {
      return (
        <div className="p-4">
          <h1 className="text-xl font-bold">Mobile Room List</h1>
          <p>Rooms: {rooms?.length || 0}</p>
          {rooms?.map((room) => (
            <div
              key={room.id}
              className="p-2 border-b cursor-pointer"
              onClick={() => setSelectedRoomId(room.id)}
            >
              {room.name || "Chat"}
            </div>
          ))}
        </div>
      );
    }

    // Chat View
    return (
      <div className="flex flex-col h-[calc(100dvh-56px-56px)] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b flex items-center gap-2">
          <button onClick={() => setMobileView("list")}>← Zurück</button>
          <span className="font-bold">{currentRoom?.name || "Chat"}</span>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-2">
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

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Desktop Test</h1>
      <p>Rooms: {rooms?.length || 0}</p>
    </div>
  );
}
