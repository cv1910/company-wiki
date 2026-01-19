import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { FileText, BookOpen, Search, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchAutocompleteProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  className?: string;
  autoFocus?: boolean;
}

export function SearchAutocomplete({
  placeholder = "Suchen...",
  onSearch,
  className = "",
  autoFocus = false,
}: SearchAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 200);

  const { data: suggestions, isLoading } = trpc.search.suggestions.useQuery(
    { query: debouncedQuery, limit: 6 },
    { enabled: debouncedQuery.length >= 2 }
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [suggestions]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || !suggestions?.length) {
      if (e.key === "Enter" && query.trim()) {
        onSearch?.(query);
        setIsOpen(false);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          const item = suggestions[selectedIndex];
          navigateToItem(item);
        } else if (query.trim()) {
          onSearch?.(query);
          setIsOpen(false);
        }
        break;
      case "Escape":
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const navigateToItem = (item: { type: string; slug: string }) => {
    setIsOpen(false);
    setQuery("");
    if (item.type === "article") {
      setLocation(`/wiki/article/${item.slug}`);
    } else {
      setLocation(`/sops/${item.slug}`);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(e.target.value.length >= 2);
          }}
          onFocus={() => {
            if (query.length >= 2) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10"
          autoFocus={autoFocus}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {suggestions && suggestions.length > 0 ? (
            <div className="py-1">
              {suggestions.map((item, index) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                    index === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => navigateToItem(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div
                    className={`p-1.5 rounded ${
                      item.type === "article"
                        ? "bg-blue-100 dark:bg-blue-900/30"
                        : "bg-green-100 dark:bg-green-900/30"
                    }`}
                  >
                    {item.type === "article" ? (
                      <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <BookOpen className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.type === "article" ? "Wiki-Artikel" : "SOP"}
                    </p>
                  </div>
                </div>
              ))}
              {onSearch && (
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer border-t transition-colors ${
                    selectedIndex === suggestions.length
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => {
                    onSearch(query);
                    setIsOpen(false);
                  }}
                >
                  <div className="p-1.5 rounded bg-muted">
                    <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <p className="text-sm">
                    Alle Ergebnisse für "<span className="font-medium">{query}</span>" anzeigen
                  </p>
                </div>
              )}
            </div>
          ) : !isLoading ? (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              Keine Vorschläge gefunden
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
