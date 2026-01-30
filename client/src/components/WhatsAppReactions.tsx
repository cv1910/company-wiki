import { useState, useRef, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";

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
  align = "left",
}: QuickReactionsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const alignClass = align === "right" ? "right-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "left-0";
  const posClass = position === "top" ? "bottom-full mb-2" : "top-full mt-2";

  return (
    <div
      ref={containerRef}
      className={`absolute ${posClass} ${alignClass} z-50 animate-in fade-in zoom-in-95 duration-100`}
    >
      <div className="flex items-center bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 p-1">
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => {
              onReaction(emoji);
              onClose();
            }}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-90 transition-transform"
          >
            <span className="text-2xl leading-none">{emoji}</span>
          </button>
        ))}
        <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-0.5" />
        <button
          onClick={() => {
            onShowMore();
            onClose();
          }}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Plus className="w-5 h-5 text-gray-400" />
        </button>
      </div>
    </div>
  );
}

// Reactions under message
interface ReactionData {
  emoji: string;
  users: { id: number; name: string | null }[];
  hasReacted: boolean;
}

interface ReactionsDisplayProps {
  reactions: ReactionData[];
  onReactionClick: (emoji: string) => void;
  isOwn?: boolean;
}

export function ReactionsDisplay({
  reactions,
  onReactionClick,
  isOwn = false,
}: ReactionsDisplayProps) {
  if (reactions.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
      {reactions.slice(0, 5).map(({ emoji, users, hasReacted }) => (
        <button
          key={emoji}
          onClick={() => onReactionClick(emoji)}
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-sm shadow-sm active:scale-95 ${
            hasReacted
              ? "bg-rose-100 dark:bg-rose-900/50"
              : "bg-white dark:bg-gray-800"
          } border border-gray-200 dark:border-gray-700`}
        >
          <span className="leading-none">{emoji}</span>
          {users.length > 1 && (
            <span className="text-[11px] text-gray-500">{users.length}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// Long press hook with double-tap support
interface UseLongPressOptions {
  onLongPress: () => void;
  onDoubleTap?: () => void;
  delay?: number;
}

export function useLongPress({ onLongPress, onDoubleTap, delay = 400 }: UseLongPressOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const lastTapTimeRef = useRef(0);
  const preventMouseRef = useRef(false);

  const start = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      // Prevent mouse events after touch
      if ("touches" in e) {
        preventMouseRef.current = true;
      } else if (preventMouseRef.current) {
        return;
      }

      isLongPressRef.current = false;
      const pos = "touches" in e ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
      startPosRef.current = pos;

      timeoutRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        if (navigator.vibrate) navigator.vibrate(20);
        onLongPress();
      }, delay);
    },
    [onLongPress, delay]
  );

  const move = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!timeoutRef.current) return;
    const pos = "touches" in e ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
    const distance = Math.sqrt(Math.pow(pos.x - startPosRef.current.x, 2) + Math.pow(pos.y - startPosRef.current.y, 2));
    if (distance > 10) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const end = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Prevent mouse events after touch
    if (!("touches" in e) && preventMouseRef.current) {
      preventMouseRef.current = false;
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Check for double-tap (only if it wasn't a long press)
    if (!isLongPressRef.current && onDoubleTap) {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapTimeRef.current;

      if (timeSinceLastTap < 350 && timeSinceLastTap > 50) {
        // Double tap detected
        onDoubleTap();
        lastTapTimeRef.current = 0;
      } else {
        lastTapTimeRef.current = now;
      }
    }
  }, [onDoubleTap]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
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

// Swipe to reply (WhatsApp style)
interface SwipeToReplyProps {
  children: React.ReactNode;
  onReply: () => void;
  isOwn?: boolean;
}

export function SwipeToReply({ children, onReply, isOwn = false }: SwipeToReplyProps) {
  const [offset, setOffset] = useState(0);
  const [active, setActive] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const directionRef = useRef<"h" | "v" | null>(null);

  const THRESHOLD = 60;

  const onTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    directionRef.current = null;
    setActive(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!active) return;

    const dx = isOwn ? startXRef.current - e.touches[0].clientX : e.touches[0].clientX - startXRef.current;
    const dy = Math.abs(e.touches[0].clientY - startYRef.current);

    if (directionRef.current === null && (Math.abs(dx) > 5 || dy > 5)) {
      directionRef.current = Math.abs(dx) > dy ? "h" : "v";
    }

    if (directionRef.current === "h" && dx > 0) {
      setOffset(Math.min(dx, 80));
    }
  };

  const onTouchEnd = () => {
    if (offset >= THRESHOLD) {
      onReply();
      if (navigator.vibrate) navigator.vibrate(10);
    }
    setOffset(0);
    setActive(false);
  };

  const progress = Math.min(offset / THRESHOLD, 1);

  return (
    <div className="relative" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      {offset > 10 && (
        <div
          className={`absolute top-1/2 -translate-y-1/2 ${isOwn ? "right-full mr-2" : "left-full ml-2"}`}
          style={{ opacity: progress }}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${progress >= 1 ? "bg-rose-500" : "bg-gray-200 dark:bg-gray-700"}`}>
            <svg className={`w-4 h-4 ${progress >= 1 ? "text-white" : "text-gray-500"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 10h10a5 5 0 0 1 5 5v6" />
              <path d="m7 6-4 4 4 4" />
            </svg>
          </div>
        </div>
      )}
      <div style={{ transform: `translateX(${isOwn ? -offset : offset}px)`, transition: active ? "none" : "transform 0.2s" }}>
        {children}
      </div>
    </div>
  );
}
