import { useRef, useState, useCallback, useEffect } from "react";

interface SwipeAction {
  icon: React.ReactNode;
  color: string;
  onAction: () => void;
}

interface UseSwipeActionOptions {
  leftAction?: SwipeAction;
  rightAction?: SwipeAction;
  threshold?: number;
}

export function useSwipeAction({
  leftAction,
  rightAction,
  threshold = 80,
}: UseSwipeActionOptions) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isHorizontalSwipe.current = null;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const diffX = currentX - startX.current;
      const diffY = currentY - startY.current;

      // Determine swipe direction on first significant movement
      if (isHorizontalSwipe.current === null) {
        if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
          isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY);
        }
      }

      if (!isHorizontalSwipe.current) return;

      e.preventDefault();

      // Apply resistance at edges
      let newTranslateX = diffX;
      const maxSwipe = 120;

      if (diffX > 0 && !leftAction) {
        newTranslateX = 0;
      } else if (diffX < 0 && !rightAction) {
        newTranslateX = 0;
      } else {
        // Apply resistance
        const resistance = 0.6;
        if (Math.abs(diffX) > maxSwipe) {
          const overflow = Math.abs(diffX) - maxSwipe;
          newTranslateX =
            Math.sign(diffX) * (maxSwipe + overflow * (1 - resistance));
        }
      }

      setTranslateX(newTranslateX);
    },
    [isDragging, leftAction, rightAction]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;

    if (translateX > threshold && leftAction) {
      leftAction.onAction();
    } else if (translateX < -threshold && rightAction) {
      rightAction.onAction();
    }

    setIsDragging(false);
    setTranslateX(0);
    isHorizontalSwipe.current = null;
  }, [isDragging, translateX, threshold, leftAction, rightAction]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener("touchstart", handleTouchStart, { passive: true });
    element.addEventListener("touchmove", handleTouchMove, { passive: false });
    element.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const leftProgress = leftAction ? Math.min(translateX / threshold, 1) : 0;
  const rightProgress = rightAction ? Math.min(-translateX / threshold, 1) : 0;

  return {
    elementRef,
    translateX,
    isDragging,
    leftProgress,
    rightProgress,
    leftAction,
    rightAction,
  };
}
