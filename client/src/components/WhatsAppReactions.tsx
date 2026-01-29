import { useState, useRef, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";

// Quick reaction emojis (WhatsApp style)
const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

interface QuickReactionsProps {
  isVisible: boolean;
  onReaction: (emoji: string) => void;
  onShowMore: () => void;
  onClose: () => void;
  position?: "top" | "bottom";
  align?: "left" | "right" | "center";
}

export function QuickReactions({
  isVisible,
  onReaction,
  onShowMore,
  onClose,
  position = "top",
  align = "center",
}: QuickReactionsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const alignmentClass = {
    left: "left-0",
    right: "right-0",
    center: "left-1/2 -translate-x-1/2",
  }[align];

  const positionClass = position === "top" ? "bottom-full mb-2" : "top-full mt-2";

  return (
    <div
      ref={containerRef}
      className={`absolute ${positionClass} ${alignmentClass} z-50 animate-in fade-in zoom-in-95 duration-150`}
    >
      <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-full shadow-xl border border-gray-200 dark:border-gray-700 p-1.5">
        {QUICK_REACTIONS.map((emoji, index) => (
          <button
            key={emoji}
            onClick={() => {
              onReaction(emoji);
              onClose();
            }}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all hover:scale-110 active:scale-95"
            style={{ animationDelay: `${index * 30}ms` }}
          >
            <span className="text-2xl">{emoji}</span>
          </button>
        ))}
        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
        <button
          onClick={() => {
            onShowMore();
            onClose();
          }}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
        >
          <Plus className="w-5 h-5 text-gray-500" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// REACTIONS DISPLAY (Under message bubble)
// ============================================================================

interface ReactionData {
  emoji: string;
  users: { id: number; name: string | null }[];
  hasReacted: boolean;
}

interface ReactionsDisplayProps {
  reactions: ReactionData[];
  onReactionClick: (emoji: string) => void;
  isOwn?: boolean;
  maxVisible?: number;
}

export function ReactionsDisplay({
  reactions,
  onReactionClick,
  isOwn = false,
  maxVisible = 5,
}: ReactionsDisplayProps) {
  const [showAll, setShowAll] = useState(false);

  if (reactions.length === 0) return null;

  const visibleReactions = showAll ? reactions : reactions.slice(0, maxVisible);
  const hiddenCount = reactions.length - maxVisible;

  return (
    <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
      {visibleReactions.map(({ emoji, users, hasReacted }) => (
        <button
          key={emoji}
          onClick={() => onReactionClick(emoji)}
          className={`
            inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm
            transition-all active:scale-95
            ${hasReacted
              ? "bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700"
              : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            }
            border shadow-sm hover:shadow-md
          `}
        >
          <span>{emoji}</span>
          {users.length > 1 && (
            <span className={`text-xs font-medium ${hasReacted ? "text-blue-600 dark:text-blue-400" : "text-gray-500"}`}>
              {users.length}
            </span>
          )}
        </button>
      ))}
      {!showAll && hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          +{hiddenCount}
        </button>
      )}
    </div>
  );
}

// ============================================================================
// LONG PRESS HOOK
// ============================================================================

interface UseLongPressOptions {
  onLongPress: () => void;
  onClick?: () => void;
  delay?: number;
}

export function useLongPress({ onLongPress, onClick, delay = 500 }: UseLongPressOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  const start = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      isLongPressRef.current = false;

      const pos = "touches" in e ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
      startPosRef.current = pos;

      timeoutRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        onLongPress();
      }, delay);
    },
    [onLongPress, delay]
  );

  const move = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!timeoutRef.current) return;

    const pos = "touches" in e ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
    const distance = Math.sqrt(
      Math.pow(pos.x - startPosRef.current.x, 2) + Math.pow(pos.y - startPosRef.current.y, 2)
    );

    // Cancel if moved more than 10px
    if (distance > 10) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const end = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (!isLongPressRef.current && onClick) {
        onClick();
      }
    },
    [onClick]
  );

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    onMouseDown: start,
    onMouseMove: move,
    onMouseUp: end,
    onMouseLeave: cancel,
    onTouchStart: start,
    onTouchMove: move,
    onTouchEnd: end,
  };
}

// ============================================================================
// SWIPE TO REPLY WRAPPER
// ============================================================================

interface SwipeToReplyProps {
  children: React.ReactNode;
  onReply: () => void;
  enabled?: boolean;
  isOwn?: boolean;
}

export function SwipeToReply({ children, onReply, enabled = true, isOwn = false }: SwipeToReplyProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const startXRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 60;
  const MAX_SWIPE = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!enabled) return;
    startXRef.current = e.touches[0].clientX;
    setIsActive(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!enabled || !isActive) return;

    const currentX = e.touches[0].clientX;
    const diff = isOwn
      ? startXRef.current - currentX // Swipe left for own messages
      : currentX - startXRef.current; // Swipe right for others

    if (diff > 0) {
      setSwipeOffset(Math.min(diff, MAX_SWIPE));
    }
  };

  const handleTouchEnd = () => {
    if (!enabled) return;

    if (swipeOffset >= SWIPE_THRESHOLD) {
      onReply();
      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    }

    setSwipeOffset(0);
    setIsActive(false);
  };

  const progress = Math.min(swipeOffset / SWIPE_THRESHOLD, 1);
  const showIndicator = swipeOffset > 10;

  return (
    <div
      ref={containerRef}
      className="relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Reply indicator */}
      {showIndicator && (
        <div
          className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center transition-opacity ${
            isOwn ? "right-full mr-2" : "left-full ml-2"
          }`}
          style={{ opacity: progress }}
        >
          <div
            className={`w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center transition-transform ${
              progress >= 1 ? "scale-110 bg-emerald-500 dark:bg-emerald-600" : ""
            }`}
            style={{ transform: `scale(${0.5 + progress * 0.5})` }}
          >
            <svg
              className={`w-4 h-4 ${progress >= 1 ? "text-white" : "text-gray-500"}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 10h10a5 5 0 0 1 5 5v6" />
              <path d="m7 6-4 4 4 4" />
            </svg>
          </div>
        </div>
      )}

      {/* Message content */}
      <div
        style={{
          transform: `translateX(${isOwn ? -swipeOffset : swipeOffset}px)`,
          transition: isActive ? "none" : "transform 0.2s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}
