import { useEffect, useRef, useState, useCallback } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPull?: number;
  enableHaptics?: boolean;
}

// Haptic feedback utility
function triggerHapticFeedback(type: "light" | "medium" | "heavy" = "medium") {
  // Check if the Vibration API is available
  if ("vibrate" in navigator) {
    const patterns: Record<string, number | number[]> = {
      light: 10,
      medium: 20,
      heavy: [30, 10, 30],
    };
    navigator.vibrate(patterns[type]);
  }
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 120,
  enableHaptics = true,
}: UsePullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasTriggeredHaptic = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
      hasTriggeredHaptic.current = false;
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isPulling || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;

      if (diff > 0 && containerRef.current?.scrollTop === 0) {
        e.preventDefault();
        // Apply resistance to pull
        const resistance = 0.5;
        const distance = Math.min(diff * resistance, maxPull);
        setPullDistance(distance);

        // Trigger haptic when crossing threshold
        if (enableHaptics && distance >= threshold && !hasTriggeredHaptic.current) {
          triggerHapticFeedback("medium");
          hasTriggeredHaptic.current = true;
        } else if (distance < threshold) {
          hasTriggeredHaptic.current = false;
        }
      }
    },
    [isPulling, isRefreshing, maxPull, threshold, enableHaptics]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;

    if (pullDistance >= threshold && !isRefreshing) {
      // Trigger haptic on release
      if (enableHaptics) {
        triggerHapticFeedback("heavy");
      }
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        // Success haptic
        if (enableHaptics) {
          triggerHapticFeedback("light");
        }
      }
    }

    setIsPulling(false);
    setPullDistance(0);
    hasTriggeredHaptic.current = false;
  }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh, enableHaptics]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(pullDistance / threshold, 1);
  const shouldTrigger = pullDistance >= threshold;

  return {
    containerRef,
    pullDistance,
    isRefreshing,
    progress,
    shouldTrigger,
  };
}
