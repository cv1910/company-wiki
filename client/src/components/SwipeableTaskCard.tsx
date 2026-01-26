import { useState, useRef } from "react";
import { Check, Clock, Archive } from "lucide-react";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SwipeableTaskCardProps {
  children: React.ReactNode;
  onComplete?: () => void;
  onArchive?: () => void;
  onPostpone?: (option: PostponeOption) => void;
  disabled?: boolean;
}

export type PostponeOption = "1hour" | "afternoon" | "evening" | "tomorrow";

const POSTPONE_OPTIONS: { value: PostponeOption; label: string; description: string }[] = [
  { value: "1hour", label: "In einer Stunde", description: "Erinnerung in 60 Minuten" },
  { value: "afternoon", label: "Heute Nachmittag", description: "Erinnerung um 14:00 Uhr" },
  { value: "evening", label: "Heute Abend", description: "Erinnerung um 18:00 Uhr" },
  { value: "tomorrow", label: "Morgen früh", description: "Erinnerung um 09:00 Uhr" },
];

export function SwipeableTaskCard({
  children,
  onComplete,
  onArchive,
  onPostpone,
  disabled = false,
}: SwipeableTaskCardProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [actionTriggered, setActionTriggered] = useState<string | null>(null);
  const [postponeDialogOpen, setPostponeDialogOpen] = useState(false);
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
      setActionTriggered(limitedDiff > 0 ? "postpone" : "archive");
    } else if (Math.abs(limitedDiff) < SWIPE_THRESHOLD && actionTriggered) {
      setActionTriggered(null);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging || disabled) return;
    setIsDragging(false);

    const diff = currentX.current - startX.current;

    if (diff > SWIPE_THRESHOLD && onPostpone) {
      // Swipe right - show postpone dialog
      haptic.mediumTap();
      setTranslateX(0);
      setPostponeDialogOpen(true);
    } else if (diff < -SWIPE_THRESHOLD && onArchive) {
      // Swipe left - archive task
      haptic.success();
      setTranslateX(-MAX_SWIPE);
      setTimeout(() => {
        onArchive();
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
      setActionTriggered(limitedDiff > 0 ? "postpone" : "archive");
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

  const handlePostponeSelect = (option: PostponeOption) => {
    setPostponeDialogOpen(false);
    if (onPostpone) {
      haptic.success();
      onPostpone(option);
    }
  };

  // Calculate background colors based on swipe direction
  const getBackgroundStyle = () => {
    if (translateX > 0) {
      // Swiping right - blue for postpone
      const opacity = Math.min(translateX / SWIPE_THRESHOLD, 1);
      return {
        background: `rgba(59, 130, 246, ${opacity * 0.3})`,
      };
    } else if (translateX < 0) {
      // Swiping left - gray for archive
      const opacity = Math.min(Math.abs(translateX) / SWIPE_THRESHOLD, 1);
      return {
        background: `rgba(107, 114, 128, ${opacity * 0.3})`,
      };
    }
    return {};
  };

  return (
    <>
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
          {/* Left side - Postpone action (swipe right) */}
          <div
            className={`flex items-center gap-2 transition-opacity ${
              translateX > SWIPE_THRESHOLD / 2 ? "opacity-100" : "opacity-40"
            }`}
          >
            <div className="p-2 rounded-full bg-blue-500 text-white">
              <Clock className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              Verschieben
            </span>
          </div>

          {/* Right side - Archive action (swipe left) */}
          <div
            className={`flex items-center gap-2 transition-opacity ${
              translateX < -SWIPE_THRESHOLD / 2 ? "opacity-100" : "opacity-40"
            }`}
          >
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Archivieren
            </span>
            <div className="p-2 rounded-full bg-gray-500 text-white">
              <Archive className="h-5 w-5" />
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

      {/* Postpone Dialog */}
      <Dialog open={postponeDialogOpen} onOpenChange={setPostponeDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Wann erinnern?
            </DialogTitle>
            <DialogDescription>
              Wähle aus, wann du an diese Aufgabe erinnert werden möchtest.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            {POSTPONE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant="outline"
                className="w-full justify-start h-auto py-3 px-4"
                onClick={() => handlePostponeSelect(option.value)}
              >
                <div className="text-left">
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground">{option.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
