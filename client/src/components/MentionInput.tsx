import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface User {
  id: number;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMentionsChange?: (mentions: { userId: number; name: string }[]) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export function MentionInput({
  value,
  onChange,
  onMentionsChange,
  placeholder = "Schreiben Sie hier... Verwenden Sie @ um jemanden zu erwähnen",
  className,
  minHeight = "100px",
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [detectedMentions, setDetectedMentions] = useState<{ userId: number; name: string }[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const { data: users = [] } = trpc.mentions.searchUsers.useQuery(
    { query: searchQuery, limit: 5 },
    { enabled: searchQuery.length > 0 && showSuggestions }
  );

  // Detect @ symbol and start searching
  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const position = e.target.selectionStart || 0;
      onChange(newValue);
      setCursorPosition(position);

      // Check if we're in a mention context
      const textBeforeCursor = newValue.substring(0, position);
      const lastAtIndex = textBeforeCursor.lastIndexOf("@");

      if (lastAtIndex !== -1) {
        const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
        // Check if there's no space after @ (still typing mention)
        if (!textAfterAt.includes(" ") && !textAfterAt.includes("\n")) {
          setMentionStartIndex(lastAtIndex);
          setSearchQuery(textAfterAt);
          setShowSuggestions(true);
          setSelectedIndex(0);
          return;
        }
      }

      setShowSuggestions(false);
      setSearchQuery("");
      setMentionStartIndex(-1);
    },
    [onChange]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!showSuggestions || users.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % users.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + users.length) % users.length);
          break;
        case "Enter":
        case "Tab":
          if (showSuggestions && users[selectedIndex]) {
            e.preventDefault();
            insertMention(users[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setShowSuggestions(false);
          break;
      }
    },
    [showSuggestions, users, selectedIndex]
  );

  // Insert selected mention
  const insertMention = useCallback(
    (user: User) => {
      if (mentionStartIndex === -1) return;

      const beforeMention = value.substring(0, mentionStartIndex);
      const afterMention = value.substring(cursorPosition);
      const mentionText = `@${user.name || user.email} `;
      const newValue = beforeMention + mentionText + afterMention;

      onChange(newValue);
      setShowSuggestions(false);
      setSearchQuery("");
      setMentionStartIndex(-1);

      // Track mention
      const newMentions = [...detectedMentions, { userId: user.id, name: user.name || user.email || "" }];
      setDetectedMentions(newMentions);
      onMentionsChange?.(newMentions);

      // Focus back on textarea
      setTimeout(() => {
        if (textareaRef.current) {
          const newPosition = mentionStartIndex + mentionText.length;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newPosition, newPosition);
        }
      }, 0);
    },
    [value, mentionStartIndex, cursorPosition, onChange, detectedMentions, onMentionsChange]
  );

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-xl border border-border/50 bg-background/50 px-4 py-3",
          "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50",
          "resize-none transition-all duration-200",
          "placeholder:text-muted-foreground/60",
          className
        )}
        style={{ minHeight }}
      />

      {/* Suggestions dropdown */}
      {showSuggestions && users.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 mt-1 w-64 rounded-xl border border-border/50 bg-background/95 backdrop-blur-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="p-1">
            {users.map((user, index) => (
              <button
                key={user.id}
                onClick={() => insertMention(user)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                  index === selectedIndex
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted/50"
                )}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs">
                    {(user.name || user.email || "?").substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name || "Unbekannt"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hint */}
      <p className="mt-1 text-xs text-muted-foreground">
        Tipp: Verwenden Sie <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">@</kbd> um Kollegen zu erwähnen
      </p>
    </div>
  );
}

export default MentionInput;
