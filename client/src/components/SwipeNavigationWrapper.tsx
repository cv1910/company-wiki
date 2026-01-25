import { ReactNode } from "react";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SwipeNavigationWrapperProps {
  children: ReactNode;
  enabled?: boolean;
}

export function SwipeNavigationWrapper({ children, enabled = true }: SwipeNavigationWrapperProps) {
  const {
    containerRef,
    swipeOffset,
    isAnimating,
    isSwiping,
    direction,
    prevRoute,
    nextRoute,
  } = useSwipeNavigation({ enabled });

  // Only show on mobile
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  if (!enabled || !isMobile) {
    return <>{children}</>;
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      style={{ touchAction: "pan-y" }}
    >
      {/* Previous route indicator */}
      {prevRoute && isSwiping && direction === "right" && (
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 z-50 pointer-events-none transition-opacity"
          style={{
            opacity: Math.min(Math.abs(swipeOffset) / 80, 1),
          }}
        >
          <div className="flex items-center gap-1 bg-primary/90 text-primary-foreground px-3 py-2 rounded-r-full shadow-lg">
            <ChevronLeft className="h-4 w-4" />
            <span className="text-sm font-medium">{prevRoute.label}</span>
          </div>
        </div>
      )}

      {/* Next route indicator */}
      {nextRoute && isSwiping && direction === "left" && (
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 z-50 pointer-events-none transition-opacity"
          style={{
            opacity: Math.min(Math.abs(swipeOffset) / 80, 1),
          }}
        >
          <div className="flex items-center gap-1 bg-primary/90 text-primary-foreground px-3 py-2 rounded-l-full shadow-lg">
            <span className="text-sm font-medium">{nextRoute.label}</span>
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
      )}

      {/* Content with swipe offset */}
      <div
        className={`${isAnimating ? "transition-transform duration-200 ease-out" : ""}`}
        style={{
          transform: `translateX(${swipeOffset}px)`,
        }}
      >
        {children}
      </div>

      {/* Edge indicators (subtle visual hint) */}
      {prevRoute && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-r from-primary/20 to-transparent pointer-events-none md:hidden" />
      )}
      {nextRoute && (
        <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-l from-primary/20 to-transparent pointer-events-none md:hidden" />
      )}
    </div>
  );
}
