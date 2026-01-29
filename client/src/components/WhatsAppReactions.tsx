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
  const [animationPhase, setAnimationPhase] = useState<"enter" | "visible" | "exit" | "hidden">("hidden");

  useEffect(() => {
    if (isVisible) {
      setAnimationPhase("enter");
      const timer = setTimeout(() => setAnimationPhase("visible"), 50);
      return () => clearTimeout(timer);
    } else {
      setAnimationPhase("exit");
      const timer = setTimeout(() => setAnimationPhase("hidden"), 150);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Small delay to prevent immediate close on touch
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isVisible, onClose]);

  if (animationPhase === "hidden") return null;

  const alignmentClass = {
    left: "left-0",
    right: "right-0",
    center: "left-1/2 -translate-x-1/2",
  }[align];

  const positionClass = position === "top" ? "bottom-full mb-2" : "top-full mt-2";

  const isAnimating = animationPhase === "enter" || animationPhase === "exit";
  const isVisible_ = animationPhase === "visible" || animationPhase === "enter";

  return (
    <div
      ref={containerRef}
      className={`absolute ${positionClass} ${alignmentClass} z-50 transition-all duration-150 ${
        isVisible_ ? "opacity-100 scale-100" : "opacity-0 scale-95"
      }`}
      style={{
        transformOrigin: position === "top" ? "bottom center" : "top center",
      }}
    >
      <div className="flex items-center gap-0.5 bg-white dark:bg-gray-800 rounded-full shadow-2xl border border-gray-100 dark:border-gray-700 p-1">
        {QUICK_REACTIONS.map((emoji, index) => (
          <button
            key={emoji}
            onClick={() => {
              onReaction(emoji);
              onClose();
            }}
            className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-150 hover:scale-125 active:scale-100"
            style={{
              animationDelay: `${index * 25}ms`,
              transform: isAnimating ? `scale(${0.5 + index * 0.1})` : undefined,
            }}
          >
            <span className="text-[26px] select-none">{emoji}</span>
          </button>
        ))}
        <div className="w-px h-7 bg-gray-200 dark:bg-gray-600 mx-0.5" />
        <button
          onClick={() => {
            onShowMore();
            onClose();
          }}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-150"
        >
          <Plus className="w-5 h-5 text-gray-400" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// REACTIONS DISPLAY (Under message bubble) - WhatsApp Style
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

  // WhatsApp shows reactions in a pill that overlaps the bubble slightly
  return (
    <div className={`flex flex-wrap gap-1 -mt-1.5 relative z-10 ${isOwn ? "justify-end pr-2" : "justify-start pl-2"}`}>
      {visibleReactions.map(({ emoji, users, hasReacted }) => (
        <button
          key={emoji}
          onClick={() => onReactionClick(emoji)}
          className={`
            inline-flex items-center gap-0.5 pl-1.5 pr-2 py-0.5 rounded-full text-sm
            transition-all duration-150 active:scale-95 shadow-md
            ${hasReacted
              ? "bg-rose-100 dark:bg-rose-900/60 ring-2 ring-rose-300 dark:ring-rose-700"
              : "bg-white dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700"
            }
            hover:shadow-lg
          `}
        >
          <span className="text-base">{emoji}</span>
          {users.length > 1 && (
            <span className={`text-[11px] font-semibold ${hasReacted ? "text-rose-600 dark:text-rose-400" : "text-gray-500"}`}>
              {users.length}
            </span>
          )}
        </button>
      ))}
      {!showAll && hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[11px] font-semibold text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-sm"
        >
          +{hiddenCount}
        </button>
      )}
    </div>
  );
}

// ============================================================================
// LONG PRESS HOOK - Improved for touch devices
// ============================================================================

interface UseLongPressOptions {
  onLongPress: () => void;
  onClick?: () => void;
  delay?: number;
}

export function useLongPress({ onLongPress, onClick, delay = 400 }: UseLongPressOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const isMovedRef = useRef(false);

  const start = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      isLongPressRef.current = false;
      isMovedRef.current = false;

      const pos = "touches" in e ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
      startPosRef.current = pos;

      timeoutRef.current = setTimeout(() => {
        if (!isMovedRef.current) {
          isLongPressRef.current = true;
          // Haptic feedback
          if (navigator.vibrate) {
            navigator.vibrate(20);
          }
          onLongPress();
        }
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
      isMovedRef.current = true;
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

      // Only trigger click if not a long press and not moved
      if (!isLongPressRef.current && !isMovedRef.current && onClick) {
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
// SWIPE TO REPLY WRAPPER - WhatsApp Style
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
  const startYRef = useRef(0);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);
  const hasTriggeredRef = useRef(false);

  const SWIPE_THRESHOLD = 60;
  const MAX_SWIPE = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!enabled) return;
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    isHorizontalSwipeRef.current = null;
    hasTriggeredRef.current = false;
    setIsActive(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!enabled || !isActive) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = isOwn
      ? startXRef.current - currentX // Swipe left for own messages
      : currentX - startXRef.current; // Swipe right for others
    const diffY = Math.abs(currentY - startYRef.current);

    // Determine if this is a horizontal swipe (only once per gesture)
    if (isHorizontalSwipeRef.current === null && (Math.abs(diffX) > 10 || diffY > 10)) {
      isHorizontalSwipeRef.current = Math.abs(diffX) > diffY;
    }

    // Only handle horizontal swipes
    if (isHorizontalSwipeRef.current && diffX > 0) {
      setSwipeOffset(Math.min(diffX, MAX_SWIPE));

      // Trigger when threshold is reached (only once)
      if (diffX >= SWIPE_THRESHOLD && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        if (navigator.vibrate) {
          navigator.vibrate(15);
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (!enabled) return;

    if (swipeOffset >= SWIPE_THRESHOLD) {
      onReply();
    }

    setSwipeOffset(0);
    setIsActive(false);
    isHorizontalSwipeRef.current = null;
  };

  const progress = Math.min(swipeOffset / SWIPE_THRESHOLD, 1);
  const showIndicator = swipeOffset > 8;
  const isTriggered = progress >= 1;

  return (
    <div
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Reply indicator */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-100 ${
          isOwn ? "right-full mr-3" : "left-full ml-3"
        }`}
        style={{
          opacity: showIndicator ? progress : 0,
          transform: `translateY(-50%) scale(${0.6 + progress * 0.4})`,
        }}
      >
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 shadow-lg ${
            isTriggered
              ? "bg-rose-500 scale-110"
              : "bg-gray-200 dark:bg-gray-700"
          }`}
        >
          <svg
            className={`w-5 h-5 transition-colors ${isTriggered ? "text-white" : "text-gray-500 dark:text-gray-400"}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 10h10a5 5 0 0 1 5 5v6" />
            <path d="m7 6-4 4 4 4" />
          </svg>
        </div>
      </div>

      {/* Message content */}
      <div
        style={{
          transform: `translateX(${isOwn ? -swipeOffset : swipeOffset}px)`,
          transition: isActive ? "none" : "transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
