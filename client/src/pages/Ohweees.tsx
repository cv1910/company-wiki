import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

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

  // Mobile detection
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // When room is selected on mobile, switch to chat view
  useEffect(() => {
    if (isMobile && selectedRoomId) {
      setMobileView("chat");
    }
  }, [isMobile, selectedRoomId]);

  // Queries
  const { data: rooms } = trpc.ohweees.rooms.useQuery();
  const { data: currentRoom } = trpc.ohweees.getRoom.useQuery(
    { roomId: selectedRoomId! },
    { enabled: !!selectedRoomId }
  );
  const { data: users } = trpc.ohweees.getUsers.useQuery();

  // Message IDs for batch queries
  const messageIds = useMemo(
    () => currentRoom?.messages?.map((m) => m.ohweee.id) || [],
    [currentRoom?.messages]
  );

  // Batch queries
  const { data: reactionsData } = trpc.ohweees.getReactionsBatch.useQuery(
    { ohweeeIds: messageIds },
    { enabled: messageIds.length > 0 }
  );

  if (isMobile) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold">Mobile Test - Mehr Queries</h1>
        <p>Rooms: {rooms?.length || 0}</p>
        <p>Users: {users?.length || 0}</p>
        <p>Selected Room: {selectedRoomId || "keine"}</p>
        <p>Messages: {currentRoom?.messages?.length || 0}</p>
        <p>Reactions loaded: {reactionsData ? "ja" : "nein"}</p>
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
