import { useEffect, useRef, useCallback } from "react";
import { triggerHaptic } from "./useHapticFeedback";

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  edgeWidth?: number;
  enabled?: boolean;
  hapticFeedback?: boolean;
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  edgeWidth = 30,
  enabled = true,
  hapticFeedback = true,
}: SwipeGestureOptions) {
  const startX = useRef(0);
  const startY = useRef(0);
  const startedFromEdge = useRef(false);
  const isSwiping = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    
    // Check if swipe started from left or right edge
    const windowWidth = window.innerWidth;
    startedFromEdge.current = 
      touch.clientX < edgeWidth || 
      touch.clientX > windowWidth - edgeWidth;
    
    isSwiping.current = true;
  }, [enabled, edgeWidth]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || !isSwiping.current) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - startX.current;
    const deltaY = touch.clientY - startY.current;
    
    // If vertical scroll is more prominent, cancel swipe detection
    if (Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
      isSwiping.current = false;
    }
  }, [enabled]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!enabled || !isSwiping.current) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - startX.current;
    const deltaY = touch.clientY - startY.current;
    
    // Only trigger if horizontal movement is dominant
    if (Math.abs(deltaX) > threshold && Math.abs(deltaX) > Math.abs(deltaY)) {
      // Swipe right (open sidebar) - must start from left edge
      if (deltaX > 0 && startX.current < edgeWidth) {
        if (hapticFeedback) triggerHaptic("light");
        onSwipeRight?.();
      }
      // Swipe left (close sidebar) - can start from anywhere when sidebar is open
      else if (deltaX < 0 && startedFromEdge.current) {
        if (hapticFeedback) triggerHaptic("light");
        onSwipeLeft?.();
      }
    }
    
    isSwiping.current = false;
    startedFromEdge.current = false;
  }, [enabled, threshold, edgeWidth, onSwipeLeft, onSwipeRight, hapticFeedback]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);
}
