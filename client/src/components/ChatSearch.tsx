import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, X, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { trpc } from "@/lib/trpc";

interface ChatSearchProps {
  roomId: number;
  isOpen: boolean;
  onClose: () => void;
  onJumpToMessage: (messageId: number) => void;
}

export function ChatSearch({ roomId, isOpen, onClose, onJumpToMessage }: ChatSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [debouncedQuery]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const { data: results, isLoading } = trpc.ohweees.searchMessages.useQuery(
    { roomId, query: debouncedQuery },
    { enabled: debouncedQuery.length >= 2 }
  );

  const handlePrev = () => {
    if (results && results.length > 0) {
      setCurrentIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    }
  };

  const handleNext = () => {
    if (results && results.length > 0) {
      setCurrentIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    }
  };

  const handleJump = (messageId: number) => {
    onJumpToMessage(messageId);
    onClose();
  };

  const highlightText = (text: string, searchQuery: string) => {
    if (!searchQuery) return text;
    const parts = text.split(new RegExp(`(${searchQuery})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-warning/40 text-foreground rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Nachrichten durchsuchen
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Suchbegriff eingeben..."
              className="pl-10 pr-10"
            />
            {query && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && results && results.length > 0 && (
            <>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{results.length} Ergebnisse</span>
                <div className="flex items-center gap-1">
                  <span>
                    {currentIndex + 1} / {results.length}
                  </span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePrev}>
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNext}>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {results.map((result, index) => (
                    <button
                      key={result.id}
                      onClick={() => handleJump(result.id)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        index === currentIndex
                          ? "bg-primary/10 border border-primary/30"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={result.senderAvatar || undefined} />
                          <AvatarFallback className="text-xs">
                            {(result.senderName || "?")[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">
                              {result.senderName || "Unbekannt"}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {format(new Date(result.createdAt), "dd.MM.yyyy HH:mm", { locale: de })}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {highlightText(result.content, debouncedQuery)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}

          {!isLoading && debouncedQuery.length >= 2 && (!results || results.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>Keine Nachrichten gefunden</p>
            </div>
          )}

          {!isLoading && debouncedQuery.length < 2 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Mindestens 2 Zeichen eingeben</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Inline search bar for mobile chat header
export function ChatSearchBar({
  roomId,
  onJumpToMessage,
  onClose,
}: {
  roomId: number;
  onJumpToMessage: (messageId: number) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [debouncedQuery]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const { data: results, isLoading } = trpc.ohweees.searchMessages.useQuery(
    { roomId, query: debouncedQuery },
    { enabled: debouncedQuery.length >= 2 }
  );

  const handlePrev = () => {
    if (results && results.length > 0) {
      const newIndex = currentIndex > 0 ? currentIndex - 1 : results.length - 1;
      setCurrentIndex(newIndex);
      onJumpToMessage(results[newIndex].id);
    }
  };

  const handleNext = () => {
    if (results && results.length > 0) {
      const newIndex = currentIndex < results.length - 1 ? currentIndex + 1 : 0;
      setCurrentIndex(newIndex);
      onJumpToMessage(results[newIndex].id);
    }
  };

  return (
    <div className="flex items-center gap-2 px-2 py-2 border-b bg-background">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suchen..."
          className="pl-9 pr-4 h-9"
        />
      </div>

      {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}

      {!isLoading && results && results.length > 0 && (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span className="tabular-nums">
            {currentIndex + 1}/{results.length}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrev}>
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNext}>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
