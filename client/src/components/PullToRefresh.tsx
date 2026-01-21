import { ReactNode } from "react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { Loader2, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
  threshold?: number;
}

export function PullToRefresh({
  onRefresh,
  children,
  className,
  threshold = 80,
}: PullToRefreshProps) {
  const { containerRef, pullDistance, isRefreshing, progress, shouldTrigger } =
    usePullToRefresh({
      onRefresh,
      threshold,
    });

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
      style={{
        // Add overscroll behavior for native feel
        overscrollBehavior: "contain",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {/* Pull Indicator */}
      <div
        className={cn(
          "absolute left-0 right-0 flex items-center justify-center transition-opacity duration-200 z-10",
          pullDistance > 0 || isRefreshing ? "opacity-100" : "opacity-0"
        )}
        style={{
          top: 0,
          height: `${Math.max(pullDistance, isRefreshing ? threshold : 0)}px`,
          transform: `translateY(${-threshold + Math.min(pullDistance, threshold)}px)`,
        }}
      >
        <div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full bg-background shadow-lg border border-border/50 transition-all duration-200",
            shouldTrigger && "bg-primary/10 border-primary/30"
          )}
        >
          {isRefreshing ? (
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          ) : (
            <ArrowDown
              className={cn(
                "h-5 w-5 text-muted-foreground transition-all duration-200",
                shouldTrigger && "text-primary"
              )}
              style={{
                transform: `rotate(${shouldTrigger ? 180 : 0}deg)`,
              }}
            />
          )}
        </div>
      </div>

      {/* Content with pull offset */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pullDistance === 0 && !isRefreshing ? "transform 0.3s ease-out" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
