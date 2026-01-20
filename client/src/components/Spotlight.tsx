import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Search,
  FileText,
  ClipboardList,
  MessageSquare,
  User,
  Plus,
  ArrowRight,
  Command,
  Loader2,
} from "lucide-react";

interface SpotlightProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ResultType = "article" | "sop" | "ohweee" | "room" | "user" | "action";

interface SearchResult {
  type: ResultType;
  id: number;
  title: string;
  subtitle?: string;
  description?: string;
  url: string;
  icon?: string;
  avatarUrl?: string;
}

interface QuickAction {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  url?: string;
  shortcut?: string;
}

const iconMap: Record<string, React.ElementType> = {
  FileText,
  ClipboardList,
  MessageSquare,
  User,
  Plus,
  ArrowRight,
};

export function Spotlight({ open, onOpenChange }: SpotlightProps) {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch search results
  const { data: searchResults, isLoading: isSearching } = trpc.search.spotlight.useQuery(
    { query, limit: 15 },
    { enabled: query.length > 0 }
  );

  // Fetch quick actions
  const { data: quickActions } = trpc.search.quickActions.useQuery(undefined, {
    enabled: query.length === 0,
  });

  // All items to display
  const items: (SearchResult | QuickAction)[] = query.length > 0 
    ? (searchResults || []) 
    : (quickActions || []);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, searchResults]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (items[selectedIndex] && items[selectedIndex].url) {
            navigate(items[selectedIndex].url!);
            onOpenChange(false);
          }
          break;
        case "Escape":
          e.preventDefault();
          onOpenChange(false);
          break;
      }
    },
    [items, selectedIndex, navigate, onOpenChange]
  );

  const handleItemClick = (item: SearchResult | QuickAction) => {
    if (item.url) {
      navigate(item.url);
    }
    onOpenChange(false);
  };

  const getIcon = (iconName: string | undefined) => {
    const IconComponent = iconName ? (iconMap[iconName] || FileText) : FileText;
    return IconComponent;
  };

  const getTypeLabel = (type: ResultType) => {
    switch (type) {
      case "article": return "Wiki";
      case "sop": return "SOP";
      case "ohweee": return "Chat";
      case "room": return "Raum";
      case "user": return "Person";
      case "action": return "Aktion";
      default: return "";
    }
  };

  const getTypeColor = (type: ResultType) => {
    switch (type) {
      case "article": return "bg-blue-500/10 text-blue-500";
      case "sop": return "bg-purple-500/10 text-purple-500";
      case "ohweee": return "bg-green-500/10 text-green-500";
      case "room": return "bg-orange-500/10 text-orange-500";
      case "user": return "bg-pink-500/10 text-pink-500";
      case "action": return "bg-gray-500/10 text-gray-500";
      default: return "bg-gray-500/10 text-gray-500";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Suche nach Artikeln, SOPs, Chats, Personen..."
            className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base placeholder:text-muted-foreground/60"
          />
          {isSearching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded bg-muted px-2 font-mono text-xs text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} className="max-h-[400px] overflow-y-auto py-2">
          {items.length === 0 && query.length > 0 && !isSearching && (
            <div className="px-4 py-8 text-center text-muted-foreground">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Keine Ergebnisse für "{query}"</p>
            </div>
          )}

          {items.length === 0 && query.length === 0 && (
            <div className="px-4 py-4 text-center text-muted-foreground">
              <p className="text-sm">Tippe, um zu suchen oder wähle eine Schnellaktion</p>
            </div>
          )}

          {items.map((item, index) => {
            const isSearchResult = "type" in item && item.type !== undefined;
            const Icon = getIcon(item.icon);
            const type = isSearchResult ? (item as SearchResult).type : "action";

            return (
              <button
                key={`${type}-${item.id || index}`}
                onClick={() => handleItemClick(item)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                  index === selectedIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                )}
              >
                {/* Icon or Avatar */}
                {"avatarUrl" in item && item.avatarUrl ? (
                  <img
                    src={item.avatarUrl}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                    getTypeColor(type)
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{item.title}</span>
                    {isSearchResult && (
                      <span className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded uppercase",
                        getTypeColor(type)
                      )}>
                        {getTypeLabel(type)}
                      </span>
                    )}
                  </div>
                  {item.subtitle && (
                    <p className="text-sm text-muted-foreground truncate">
                      {item.subtitle}
                    </p>
                  )}
                  {"description" in item && item.description && (
                    <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Shortcut or Arrow */}
                {"shortcut" in item && item.shortcut ? (
                  <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded bg-muted px-2 font-mono text-xs text-muted-foreground">
                    {item.shortcut}
                  </kbd>
                ) : (
                  <ArrowRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border/50 bg-muted/30 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-muted">↓</kbd>
              <span className="ml-1">Navigieren</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted">↵</kbd>
              <span className="ml-1">Öffnen</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Command className="h-3 w-3" />
            <span>K zum Öffnen</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to use Spotlight with keyboard shortcut
export function useSpotlight() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { open, setOpen };
}
