import { useState, useRef, useEffect } from "react";
import { Check, X, Clock, Trash2 } from "lucide-react";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";

interface SwipeableTaskCardProps {
  children: React.ReactNode;
  onComplete?: () => void;
  onPostpone?: () => void;
  onDelete?: () => void;
  disabled?: boolean;
}

export function SwipeableTaskCard({
  children,
  onComplete,
  onPostpone,
  onDelete,
  disabled = false,
}: SwipeableTaskCardProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [actionTriggered, setActionTriggered] = useState<string | null>(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const haptic = useHapticFeedback();

  const SWIPE_THRESHOLD = 80;
  const MAX_SWIPE = 120;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    startX.current = e.touches[0].clientX;
    currentX.current = e.touches[0].clientX;
    setIsDragging(true);
    setActionTriggered(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || disabled) return;
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    
    // Limit swipe distance
    const limitedDiff = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, diff));
    setTranslateX(limitedDiff);

    // Trigger haptic feedback when crossing threshold
    if (Math.abs(limitedDiff) >= SWIPE_THRESHOLD && !actionTriggered) {
      haptic.lightTap();
      setActionTriggered(limitedDiff > 0 ? "complete" : "postpone");
    } else if (Math.abs(limitedDiff) < SWIPE_THRESHOLD && actionTriggered) {
      setActionTriggered(null);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging || disabled) return;
    setIsDragging(false);

    const diff = currentX.current - startX.current;

    if (diff > SWIPE_THRESHOLD && onComplete) {
      // Swipe right - complete task
      haptic.success();
      setTranslateX(MAX_SWIPE);
      setTimeout(() => {
        onComplete();
        setTranslateX(0);
      }, 200);
    } else if (diff < -SWIPE_THRESHOLD && onPostpone) {
      // Swipe left - postpone task
      haptic.mediumTap();
      setTranslateX(-MAX_SWIPE);
      setTimeout(() => {
        onPostpone();
        setTranslateX(0);
      }, 200);
    } else {
      // Reset position
      setTranslateX(0);
    }
    setActionTriggered(null);
  };

  // Mouse events for desktop testing
  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    startX.current = e.clientX;
    currentX.current = e.clientX;
    setIsDragging(true);
    setActionTriggered(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || disabled) return;
    currentX.current = e.clientX;
    const diff = currentX.current - startX.current;
    const limitedDiff = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, diff));
    setTranslateX(limitedDiff);

    if (Math.abs(limitedDiff) >= SWIPE_THRESHOLD && !actionTriggered) {
      setActionTriggered(limitedDiff > 0 ? "complete" : "postpone");
    } else if (Math.abs(limitedDiff) < SWIPE_THRESHOLD && actionTriggered) {
      setActionTriggered(null);
    }
  };

  const handleMouseUp = () => {
    if (!isDragging || disabled) return;
    handleTouchEnd();
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      setTranslateX(0);
      setActionTriggered(null);
    }
  };

  // Calculate background colors based on swipe direction
  const getBackgroundStyle = () => {
    if (translateX > 0) {
      // Swiping right - green for complete
      const opacity = Math.min(translateX / SWIPE_THRESHOLD, 1);
      return {
        background: `rgba(34, 197, 94, ${opacity * 0.3})`,
      };
    } else if (translateX < 0) {
      // Swiping left - orange for postpone
      const opacity = Math.min(Math.abs(translateX) / SWIPE_THRESHOLD, 1);
      return {
        background: `rgba(249, 115, 22, ${opacity * 0.3})`,
      };
    }
    return {};
  };

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden touch-pan-y"
      onMouseLeave={handleMouseLeave}
    >
      {/* Background action indicators */}
      <div
        className="absolute inset-0 flex items-center justify-between px-4 transition-colors"
        style={getBackgroundStyle()}
      >
        {/* Left side - Complete action */}
        <div
          className={`flex items-center gap-2 transition-opacity ${
            translateX > SWIPE_THRESHOLD / 2 ? "opacity-100" : "opacity-40"
          }`}
        >
          <div className="p-2 rounded-full bg-green-500 text-white">
            <Check className="h-5 w-5" />
          </div>
          <span className="text-sm font-medium text-green-600 dark:text-green-400">
            Erledigt
          </span>
        </div>

        {/* Right side - Postpone action */}
        <div
          className={`flex items-center gap-2 transition-opacity ${
            translateX < -SWIPE_THRESHOLD / 2 ? "opacity-100" : "opacity-40"
          }`}
        >
          <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
            Verschieben
          </span>
          <div className="p-2 rounded-full bg-orange-500 text-white">
            <Clock className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Swipeable content */}
      <div
        className={`relative bg-background transition-transform ${
          isDragging ? "" : "duration-200"
        }`}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {children}
      </div>
    </div>
  );
}
