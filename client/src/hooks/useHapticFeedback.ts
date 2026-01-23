import { useCallback } from "react";
import { useIsMobile } from "./useMobile";

type HapticType = "light" | "medium" | "heavy" | "success" | "warning" | "error" | "selection";

// Vibration patterns in milliseconds
const HAPTIC_PATTERNS: Record<HapticType, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [10, 50, 20],
  warning: [20, 100, 20],
  error: [30, 100, 30, 100, 30],
  selection: 5,
};

export function useHapticFeedback() {
  const isMobile = useIsMobile();

  const vibrate = useCallback((type: HapticType = "light") => {
    if (!isMobile) return;
    
    // Check if Vibration API is supported
    if (!("vibrate" in navigator)) return;
    
    try {
      const pattern = HAPTIC_PATTERNS[type];
      navigator.vibrate(pattern);
    } catch {
      // Silently fail if vibration is not available
    }
  }, [isMobile]);

  const lightTap = useCallback(() => vibrate("light"), [vibrate]);
  const mediumTap = useCallback(() => vibrate("medium"), [vibrate]);
  const heavyTap = useCallback(() => vibrate("heavy"), [vibrate]);
  const success = useCallback(() => vibrate("success"), [vibrate]);
  const warning = useCallback(() => vibrate("warning"), [vibrate]);
  const error = useCallback(() => vibrate("error"), [vibrate]);
  const selection = useCallback(() => vibrate("selection"), [vibrate]);

  return {
    vibrate,
    lightTap,
    mediumTap,
    heavyTap,
    success,
    warning,
    error,
    selection,
  };
}

// Utility function for one-off haptic feedback without hook
export function triggerHaptic(type: HapticType = "light") {
  if (typeof window === "undefined") return;
  if (!("vibrate" in navigator)) return;
  
  // Only on mobile devices
  const isMobile = window.innerWidth < 768 || 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (!isMobile) return;
  
  try {
    const pattern = HAPTIC_PATTERNS[type];
    navigator.vibrate(pattern);
  } catch {
    // Silently fail
  }
}
