import { useState, useRef, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
}

interface UserSuggestion {
  id: number;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
}

export function MentionTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
  className,
  disabled,
}: MentionTextareaProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const { data: suggestions = [] } = trpc.mentions.searchUsers.useQuery(
    { query: mentionQuery, limit: 5 },
    { enabled: mentionQuery.length >= 1 }
  );

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const cursor = e.target.selectionStart;
      onChange(newValue);
      setCursorPosition(cursor);

      // Check if we're in a mention context
      const textBeforeCursor = newValue.substring(0, cursor);
      const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

      if (mentionMatch) {
        setMentionQuery(mentionMatch[1]);
        setShowSuggestions(true);
        setSelectedIndex(0);
      } else {
        setShowSuggestions(false);
        setMentionQuery("");
      }
    },
    [onChange]
  );

  const insertMention = useCallback(
    (user: UserSuggestion) => {
      const textBeforeCursor = value.substring(0, cursorPosition);
      const textAfterCursor = value.substring(cursorPosition);

      // Find the @ symbol position
      const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
      if (mentionMatch) {
        const mentionStart = textBeforeCursor.lastIndexOf("@");
        const beforeMention = value.substring(0, mentionStart);
        const displayName = user.name || user.email?.split("@")[0] || "Benutzer";
        const newValue = `${beforeMention}@${displayName} ${textAfterCursor}`;
        onChange(newValue);

        // Move cursor after the inserted mention
        const newCursorPos = mentionStart + displayName.length + 2; // +2 for @ and space
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = newCursorPos;
            textareaRef.current.selectionEnd = newCursorPos;
            textareaRef.current.focus();
          }
        }, 0);
      }

      setShowSuggestions(false);
      setMentionQuery("");
    },
    [value, cursorPosition, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!showSuggestions || suggestions.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % suggestions.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
          break;
        case "Enter":
          if (showSuggestions && suggestions[selectedIndex]) {
            e.preventDefault();
            insertMention(suggestions[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setShowSuggestions(false);
          break;
        case "Tab":
          if (showSuggestions && suggestions[selectedIndex]) {
            e.preventDefault();
            insertMention(suggestions[selectedIndex]);
          }
          break;
      }
    },
    [showSuggestions, suggestions, selectedIndex, insertMention]
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

  // Render value with highlighted mentions
  const renderHighlightedValue = () => {
    return value.replace(/@(\w+(?:\s+\w+)?)/g, '<span class="text-primary font-medium">@$1</span>');
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={className}
        disabled={disabled}
      />

      {/* Mention Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 mt-1 w-64 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
        >
          <div className="p-1">
            <div className="text-xs text-muted-foreground px-2 py-1">
              Benutzer erwähnen
            </div>
            {suggestions.map((user, index) => (
              <button
                key={user.id}
                type="button"
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${
                  index === selectedIndex
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted"
                }`}
                onClick={() => insertMention(user)}
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {user.name || "Unbekannt"}
                  </div>
                  {user.email && (
                    <div className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hint text */}
      {!showSuggestions && value.length === 0 && (
        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground pointer-events-none">
          Tippe @ um jemanden zu erwähnen
        </div>
      )}
    </div>
  );
}
