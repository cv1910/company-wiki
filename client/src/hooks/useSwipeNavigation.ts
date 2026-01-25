import { useRef, useEffect, useCallback, useState } from "react";
import { useLocation } from "wouter";
import { useHapticFeedback } from "./useHapticFeedback";

// Navigation routes in order (for swipe navigation)
const NAVIGATION_ROUTES = [
  { path: "/", label: "Home" },
  { path: "/search", label: "AI Suche" },
  { path: "/ohweees", label: "Taps" },
  { path: "/aufgaben", label: "Aufgaben" },
];

interface SwipeState {
  startX: number;
  startY: number;
  currentX: number;
  isSwiping: boolean;
  direction: "left" | "right" | null;
}

interface UseSwipeNavigationOptions {
  enabled?: boolean;
  threshold?: number; // Minimum distance to trigger navigation
  edgeWidth?: number; // Width of edge zone for swipe detection
}

export function useSwipeNavigation(options: UseSwipeNavigationOptions = {}) {
  const { enabled = true, threshold = 80, edgeWidth = 30 } = options;
  const [location, setLocation] = useLocation();
  const haptic = useHapticFeedback();
  
  const [swipeState, setSwipeState] = useState<SwipeState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    isSwiping: false,
    direction: null,
  });
  
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartedFromEdge = useRef(false);

  // Get current route index
  const currentIndex = NAVIGATION_ROUTES.findIndex(
    (route) => route.path === location || 
    (route.path !== "/" && location.startsWith(route.path))
  );

  // Get previous and next routes
  const prevRoute = currentIndex > 0 ? NAVIGATION_ROUTES[currentIndex - 1] : null;
  const nextRoute = currentIndex < NAVIGATION_ROUTES.length - 1 ? NAVIGATION_ROUTES[currentIndex + 1] : null;

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    
    const touch = e.touches[0];
    const screenWidth = window.innerWidth;
    
    // Check if touch started from edge (for back gesture)
    const isFromLeftEdge = touch.clientX < edgeWidth;
    const isFromRightEdge = touch.clientX > screenWidth - edgeWidth;
    
    touchStartedFromEdge.current = isFromLeftEdge || isFromRightEdge;
    
    // Only allow swipe from edges on mobile
    if (!touchStartedFromEdge.current && screenWidth < 768) {
      return;
    }
    
    setSwipeState({
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      isSwiping: true,
      direction: null,
    });
  }, [enabled, edgeWidth]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!swipeState.isSwiping || !enabled) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - swipeState.startX;
    const deltaY = touch.clientY - swipeState.startY;
    
    // If vertical scroll is dominant, cancel swipe
    if (Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
      setSwipeState(prev => ({ ...prev, isSwiping: false }));
      setSwipeOffset(0);
      return;
    }
    
    // Determine direction
    const direction = deltaX > 0 ? "right" : "left";
    
    // Check if navigation is possible in this direction
    const canNavigate = (direction === "right" && prevRoute) || (direction === "left" && nextRoute);
    
    if (!canNavigate) {
      // Add resistance when can't navigate
      setSwipeOffset(deltaX * 0.2);
    } else {
      // Normal swipe with slight resistance
      setSwipeOffset(deltaX * 0.6);
      
      // Trigger haptic when crossing threshold
      if (Math.abs(deltaX) > threshold && swipeState.direction !== direction) {
        haptic.impact();
      }
    }
    
    setSwipeState(prev => ({
      ...prev,
      currentX: touch.clientX,
      direction,
    }));
    
    // Prevent default to avoid scroll during swipe
    if (Math.abs(deltaX) > 10) {
      e.preventDefault();
    }
  }, [swipeState, enabled, prevRoute, nextRoute, threshold, haptic]);

  const handleTouchEnd = useCallback(() => {
    if (!swipeState.isSwiping || !enabled) return;
    
    const deltaX = swipeState.currentX - swipeState.startX;
    const shouldNavigate = Math.abs(deltaX) > threshold;
    
    if (shouldNavigate) {
      const direction = deltaX > 0 ? "right" : "left";
      const targetRoute = direction === "right" ? prevRoute : nextRoute;
      
      if (targetRoute) {
        setIsAnimating(true);
        haptic.notification();
        
        // Animate out
        const animationOffset = direction === "right" ? window.innerWidth : -window.innerWidth;
        setSwipeOffset(animationOffset);
        
        // Navigate after animation
        setTimeout(() => {
          setLocation(targetRoute.path);
          setSwipeOffset(0);
          setIsAnimating(false);
        }, 200);
      } else {
        // Bounce back
        setSwipeOffset(0);
      }
    } else {
      // Bounce back
      setSwipeOffset(0);
    }
    
    setSwipeState({
      startX: 0,
      startY: 0,
      currentX: 0,
      isSwiping: false,
      direction: null,
    });
  }, [swipeState, enabled, threshold, prevRoute, nextRoute, setLocation, haptic]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;
    
    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });
    
    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, enabled]);

  return {
    containerRef,
    swipeOffset,
    isAnimating,
    isSwiping: swipeState.isSwiping,
    direction: swipeState.direction,
    prevRoute,
    nextRoute,
    currentRoute: NAVIGATION_ROUTES[currentIndex],
  };
}
