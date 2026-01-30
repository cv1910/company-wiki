import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export default function OhweeesPage() {
  const { roomId } = useParams<{ roomId?: string }>();
  const { user } = useAuth();

  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(
    roomId ? parseInt(roomId) : null
  );
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Single query - no refetchInterval
  const { data: rooms, isLoading } = trpc.ohweees.rooms.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Ohweees Test</h1>
      <p>Mobile: {isMobile ? "Ja" : "Nein"}</p>
      <p>User: {user?.name || "Nicht eingeloggt"}</p>
      <p>Räume: {rooms?.length || 0}</p>
      <ul className="mt-4 space-y-2">
        {rooms?.map((room) => (
          <li
            key={room.id}
            className="p-2 bg-gray-100 rounded cursor-pointer"
            onClick={() => setSelectedRoomId(room.id)}
          >
            {room.name || `Room ${room.id}`}
            {selectedRoomId === room.id && " ✓"}
          </li>
        ))}
      </ul>
    </div>
  );
}
