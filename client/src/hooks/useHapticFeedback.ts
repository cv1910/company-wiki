import { useCallback } from "react";
import { useIsMobile } from "./useMobile";

type HapticType = 
  | "light" 
  | "medium" 
  | "heavy" 
  | "success" 
  | "warning" 
  | "error" 
  | "selection"
  | "impact"
  | "notification"
  | "rigid"
  | "soft";

// Vibration patterns in milliseconds
const HAPTIC_PATTERNS: Record<HapticType, number | number[]> = {
  // Basic taps
  light: 10,
  medium: 20,
  heavy: 30,
  
  // Feedback types
  success: [10, 50, 20],
  warning: [20, 100, 20],
  error: [30, 100, 30, 100, 30],
  
  // UI interactions
  selection: 5,
  impact: 15,
  notification: [15, 80, 15],
  
  // Material feel
  rigid: 25,
  soft: 8,
};

// Check if iOS device
function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// iOS Taptic Engine via AudioContext (workaround)
function triggerIOSHaptic(intensity: "light" | "medium" | "heavy" = "medium") {
  if (!isIOS()) return false;
  
  try {
    // Create a very short, inaudible audio burst that triggers haptic
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Set frequency based on intensity
    const frequencies = { light: 50, medium: 100, heavy: 150 };
    oscillator.frequency.value = frequencies[intensity];
    
    // Very short duration, inaudible volume
    gainNode.gain.value = 0.001;
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.001);
    
    return true;
  } catch {
    return false;
  }
}

export function useHapticFeedback() {
  const isMobile = useIsMobile();

  const vibrate = useCallback((type: HapticType = "light") => {
    if (!isMobile) return;
    
    // Try iOS haptic first
    if (isIOS()) {
      const intensity = type === "heavy" || type === "error" ? "heavy" 
        : type === "medium" || type === "warning" || type === "impact" ? "medium" 
        : "light";
      triggerIOSHaptic(intensity);
      return;
    }
    
    // Check if Vibration API is supported (Android)
    if (!("vibrate" in navigator)) return;
    
    try {
      const pattern = HAPTIC_PATTERNS[type];
      navigator.vibrate(pattern);
    } catch {
      // Silently fail if vibration is not available
    }
  }, [isMobile]);

  // Basic taps
  const lightTap = useCallback(() => vibrate("light"), [vibrate]);
  const mediumTap = useCallback(() => vibrate("medium"), [vibrate]);
  const heavyTap = useCallback(() => vibrate("heavy"), [vibrate]);
  
  // Feedback types
  const success = useCallback(() => vibrate("success"), [vibrate]);
  const warning = useCallback(() => vibrate("warning"), [vibrate]);
  const error = useCallback(() => vibrate("error"), [vibrate]);
  
  // UI interactions
  const selection = useCallback(() => vibrate("selection"), [vibrate]);
  const impact = useCallback(() => vibrate("impact"), [vibrate]);
  const notification = useCallback(() => vibrate("notification"), [vibrate]);
  
  // Material feel
  const rigid = useCallback(() => vibrate("rigid"), [vibrate]);
  const soft = useCallback(() => vibrate("soft"), [vibrate]);

  return {
    vibrate,
    // Basic
    lightTap,
    mediumTap,
    heavyTap,
    // Feedback
    success,
    warning,
    error,
    // UI
    selection,
    impact,
    notification,
    // Material
    rigid,
    soft,
  };
}

// Utility function for one-off haptic feedback without hook
export function triggerHaptic(type: HapticType = "light") {
  if (typeof window === "undefined") return;
  
  // Only on mobile devices
  const isMobile = window.innerWidth < 768 || 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (!isMobile) return;
  
  // Try iOS haptic first
  if (isIOS()) {
    const intensity = type === "heavy" || type === "error" ? "heavy" 
      : type === "medium" || type === "warning" || type === "impact" ? "medium" 
      : "light";
    triggerIOSHaptic(intensity);
    return;
  }
  
  // Android Vibration API
  if (!("vibrate" in navigator)) return;
  
  try {
    const pattern = HAPTIC_PATTERNS[type];
    navigator.vibrate(pattern);
  } catch {
    // Silently fail
  }
}

// Hook for automatic haptic on component mount (e.g., page transitions)
export function useHapticOnMount(type: HapticType = "soft") {
  const { vibrate } = useHapticFeedback();
  
  // Trigger haptic on mount
  useCallback(() => {
    vibrate(type);
  }, [vibrate, type])();
}
