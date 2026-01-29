import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export default function OhweeesPage() {
  const { roomId } = useParams<{ roomId?: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(
    roomId ? parseInt(roomId) : null
  );

  // Mobile detection
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Basic queries
  const { data: rooms } = trpc.ohweees.rooms.useQuery();

  if (isMobile) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold">Mobile Test mit Queries</h1>
        <p>Rooms geladen: {rooms?.length || 0}</p>
        <p>User: {user?.name || "nicht eingeloggt"}</p>
      </div>
    );
  }

  // Desktop - minimal
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Desktop Test</h1>
      <p>Rooms: {rooms?.length || 0}</p>
    </div>
  );
}
