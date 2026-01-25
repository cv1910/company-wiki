import { ReactNode } from "react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { Loader2, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
  threshold?: number;
  skeleton?: ReactNode;
  enableHaptics?: boolean;
}

// Default skeleton component
function DefaultSkeleton() {
  return (
    <div className="space-y-4 p-4 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-muted/60" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-32 rounded bg-muted/60" />
          <div className="h-3 w-48 rounded bg-muted/40" />
        </div>
      </div>
      
      {/* Content skeletons */}
      <div className="space-y-3">
        <div className="h-24 rounded-xl bg-muted/50" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 rounded-xl bg-muted/40" />
          <div className="h-20 rounded-xl bg-muted/40" />
        </div>
        <div className="h-16 rounded-xl bg-muted/30" />
      </div>
      
      {/* List skeletons */}
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
            <div className="h-10 w-10 rounded-full bg-muted/50" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 rounded bg-muted/40" />
              <div className="h-2 w-1/2 rounded bg-muted/30" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PullToRefresh({
  onRefresh,
  children,
  className,
  threshold = 80,
  skeleton,
  enableHaptics = true,
}: PullToRefreshProps) {
  const { containerRef, pullDistance, isRefreshing, progress, shouldTrigger } =
    usePullToRefresh({
      onRefresh,
      threshold,
      enableHaptics,
    });

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto overflow-x-hidden", className)}
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

      {/* Content with pull offset - schnellere Animation */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pullDistance === 0 ? "transform 0.15s ease-out" : "none",
        }}
      >
        {isRefreshing ? (
          <div className="relative">
            {/* Schnellere Skeleton-Animation */}
            <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-[2px] animate-in fade-in duration-100">
              {skeleton || <DefaultSkeleton />}
            </div>
            {/* Keep children rendered but hidden for layout */}
            <div className="opacity-0 pointer-events-none">
              {children}
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
