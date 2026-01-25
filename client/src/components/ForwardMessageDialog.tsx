import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Forward, Loader2, Check, Users, User } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "@/lib/hapticToast";

interface ForwardMessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  messageId: number;
  messageContent: string;
  senderName: string;
}

export function ForwardMessageDialog({
  isOpen,
  onClose,
  messageId,
  messageContent,
  senderName,
}: ForwardMessageDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoomIds, setSelectedRoomIds] = useState<number[]>([]);

  const { data: rooms, isLoading: roomsLoading } = trpc.ohweees.rooms.useQuery(
    undefined,
    { enabled: isOpen }
  );

  const forwardMutation = trpc.ohweees.forwardMessage.useMutation({
    onSuccess: () => {
      toast.success(`Nachricht an ${selectedRoomIds.length} Chat(s) weitergeleitet`);
      setSelectedRoomIds([]);
      onClose();
    },
    onError: (error) => {
      toast.error("Weiterleitung fehlgeschlagen: " + error.message);
    },
  });

  const filteredRooms = rooms?.filter((room: { name: string | null; participants?: { name: string | null }[] }) =>
    room.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.participants?.some((p: { name: string | null }) =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const toggleRoom = (roomId: number) => {
    setSelectedRoomIds((prev) =>
      prev.includes(roomId)
        ? prev.filter((id) => id !== roomId)
        : [...prev, roomId]
    );
  };

  const handleForward = () => {
    if (selectedRoomIds.length === 0) {
      toast.error("Bitte mindestens einen Chat auswählen");
      return;
    }
    forwardMutation.mutate({
      ohweeeId: messageId,
      targetRoomIds: selectedRoomIds,
    });
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Forward className="h-5 w-5" />
            Nachricht weiterleiten
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted/50 rounded-lg border">
            <p className="text-xs text-muted-foreground mb-1">
              Von {senderName}:
            </p>
            <p className="text-sm">{truncateContent(messageContent)}</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Chat suchen..."
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[250px]">
            {roomsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredRooms && filteredRooms.length > 0 ? (
              <div className="space-y-1">
                {filteredRooms.map((room: { id: number; name: string | null; type: string; participants?: { name: string | null; avatarUrl: string | null }[] }) => {
                  const isSelected = selectedRoomIds.includes(room.id);
                  const isGroup = room.type === "group" || room.type === "team";

                  return (
                    <button
                      key={room.id}
                      onClick={() => toggleRoom(room.id)}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                        isSelected
                          ? "bg-primary/10 border border-primary/30"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="relative">
                        {isGroup ? (
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <Users className="h-5 w-5 text-muted-foreground" />
                          </div>
                        ) : (
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={room.participants?.[0]?.avatarUrl || undefined}
                            />
                            <AvatarFallback>
                              {(room.name || "?")[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        {isSelected && (
                          <div className="absolute -right-1 -bottom-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium truncate">
                          {room.name || room.participants?.map((p: { name: string | null }) => p.name).join(", ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isGroup
                            ? `${room.participants?.length || 0} Teilnehmer`
                            : "Direktnachricht"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Keine Chats gefunden</p>
              </div>
            )}
          </ScrollArea>

          <div className="flex items-center justify-between pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              {selectedRoomIds.length} ausgewählt
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Abbrechen
              </Button>
              <Button
                onClick={handleForward}
                disabled={selectedRoomIds.length === 0 || forwardMutation.isPending}
              >
                {forwardMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Forward className="h-4 w-4 mr-2" />
                )}
                Weiterleiten
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
